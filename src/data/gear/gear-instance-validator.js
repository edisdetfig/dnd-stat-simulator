// gear-instance-validator.js — runtime validator for user-authored item
// instances. Enforces the OQ-D8 materialization order over (instance ×
// definition) pairs. Parallels the definition validator.
//
// Public API:
//   validateGearInstance(instance, definition) -> ValidationError[]
//
// ValidationError:
//   { itemId, path, message, rule }
//
// Rule code prefix: I.* (instance-structural + materialization).

import { RARITY_CONFIG, RARITY_ORDER } from "../constants.js";
import { STAT_META } from "../stat-meta.js";
import {
  MODIFIER_POOLS,
  MODIFIER_POOL_STAT_ALIASES,
  resolvePoolKey,
  resolveCanonicalStat,
} from "./modifier-pools.js";
import {
  EXCLUSION_GROUPS,
  NEVER_SOCKETABLE_STATS,
  findExclusionGroupForStat,
} from "./exclusion-groups.js";

export function validateGearInstance(instance, definition) {
  const errors = [];
  const itemId = definition?.id ?? instance?.definitionId ?? "<unknown>";

  if (!instance || typeof instance !== "object") {
    errors.push(errAt(itemId, "", "instance is not an object", "I.required"));
    return errors;
  }
  if (!definition || typeof definition !== "object") {
    errors.push(errAt(itemId, "", "definition missing; cannot validate instance", "I.definitionMissing"));
    return errors;
  }
  if (instance.definitionId !== definition.id) {
    errors.push(errAt(itemId, "definitionId",
      `instance.definitionId "${instance.definitionId}" does not match definition.id "${definition.id}"`,
      "I.definitionId"));
    return errors;
  }

  // ── Rarity ────────────────────────────────────────────────
  if (!RARITY_ORDER.includes(instance.rarity)) {
    errors.push(errAt(itemId, "rarity", `unknown rarity "${instance.rarity}"`, "I.rarity"));
    return errors;
  }
  if (Array.isArray(definition.availableRarities) && !definition.availableRarities.includes(instance.rarity)) {
    errors.push(errAt(itemId, "rarity",
      `rarity "${instance.rarity}" not in definition.availableRarities`,
      "I.rarity"));
  }

  // ── modCount = override OR (standard + craftable?) ────────
  const expectedModCount = resolveModCount(definition, instance.rarity);
  const actualModifiers = Array.isArray(instance.modifiers) ? instance.modifiers : [];
  if (actualModifiers.length !== expectedModCount) {
    errors.push(errAt(itemId, "modifiers",
      `modifier count ${actualModifiers.length} does not match expected ${expectedModCount} for rarity "${instance.rarity}"`,
      "I.modCountMatch"));
  }

  // ── Resolve pool ────────────────────────────────────────
  const poolKey = resolvePoolKey(definition.slotType, definition.handType);
  if (!poolKey) {
    errors.push(errAt(itemId, "",
      `no modifier pool for slotType="${definition.slotType}" handType="${definition.handType}"`,
      "I.materialization.poolMissing"));
    return errors;
  }
  const pool = MODIFIER_POOLS[poolKey] ?? [];
  const poolByStat = new Map();
  for (const entry of pool) {
    poolByStat.set(entry.stat, entry);
    // Also register the canonical alias so both forms resolve.
    const canonical = resolveCanonicalStat(entry.stat);
    if (canonical !== entry.stat) poolByStat.set(canonical, entry);
  }

  // ── Resolve inherents for this rarity ──────────────────
  const inherents = resolveInherentsForRarity(definition, instance.rarity);

  // Track inherent stat ids (for inherent-blocks-self + group check).
  const inherentStatIds = new Set();
  for (const ih of inherents) inherentStatIds.add(resolveCanonicalStat(ih.stat));

  // Check rolledInherents for ranged entries.
  for (const ih of inherents) {
    const hasRange = ih.min !== undefined && ih.max !== undefined;
    if (!hasRange) continue;
    const rolled = instance.rolledInherents?.[ih.stat];
    if (rolled === undefined) {
      errors.push(errAt(itemId, `rolledInherents.${ih.stat}`,
        `ranged inherent "${ih.stat}" missing rolled value`,
        "I.rolledInherentRange"));
      continue;
    }
    if (typeof rolled !== "number" || rolled < ih.min || rolled > ih.max) {
      errors.push(errAt(itemId, `rolledInherents.${ih.stat}`,
        `rolled value ${rolled} not in [${ih.min}, ${ih.max}]`,
        "I.rolledInherentRange"));
    }
  }

  // ── Precompute override set ────────────────────────────
  const overrides = new Set(Array.isArray(definition.socketExclusionOverrides) ? definition.socketExclusionOverrides : []);

  // Precompute exclusion-group state from inherents.
  const blockedGroups = new Set();     // fully blocked (inherent is dominantBlocker)
  const consumedGroups = new Set();    // partially consumed (non-dominant inherent counts)
  for (const groupId of Object.keys(EXCLUSION_GROUPS)) {
    const group = EXCLUSION_GROUPS[groupId];
    for (const member of group.members) {
      if (inherentStatIds.has(resolveCanonicalStat(member))) {
        if (member === group.dominantBlocker) blockedGroups.add(groupId);
        else consumedGroups.add(groupId);
      }
    }
  }

  // ── Validate each modifier ─────────────────────────────
  const seenStats = new Set();
  actualModifiers.forEach((mod, i) => {
    const path = `modifiers[${i}]`;
    if (!mod || typeof mod !== "object") {
      errors.push(errAt(itemId, path, "modifier is not an object", "I.modifierShape"));
      return;
    }
    const statId = mod.stat;
    if (typeof statId !== "string") {
      errors.push(errAt(itemId, `${path}.stat`, "modifier.stat missing or non-string", "I.modifierShape"));
      return;
    }
    const canonical = resolveCanonicalStat(statId);

    // Source
    if (mod.source !== "natural" && mod.source !== "socketed") {
      errors.push(errAt(itemId, `${path}.source`,
        `source must be "natural" or "socketed" (was ${JSON.stringify(mod.source)})`,
        "I.modifierSource"));
    }

    // Never-socketable stats cannot appear as modifiers at all.
    if (NEVER_SOCKETABLE_STATS.has(statId)) {
      errors.push(errAt(itemId, `${path}.stat`,
        `"${statId}" is never-socketable; cannot appear as a modifier`,
        "I.neverSocketable"));
      return;
    }

    // Pool membership
    const poolEntry = poolByStat.get(statId) ?? poolByStat.get(canonical);
    if (!poolEntry) {
      errors.push(errAt(itemId, `${path}.stat`,
        `stat "${statId}" not in pool "${poolKey}"`,
        "I.modifierPoolMembership"));
      return;
    }

    // Duplicate stats
    if (seenStats.has(canonical)) {
      errors.push(errAt(itemId, `${path}.stat`,
        `duplicate modifier stat "${statId}"`,
        "I.modifierUniqueStat"));
    }
    seenStats.add(canonical);

    // Inherent-blocks-self
    if (inherentStatIds.has(canonical) && !overrides.has(statId) && !overrides.has(canonical)) {
      errors.push(errAt(itemId, `${path}.stat`,
        `"${statId}" is inherent on this item; cannot socket unless in socketExclusionOverrides`,
        "I.inherentBlocksSelf"));
    }

    // Exclusion group
    const group = findExclusionGroupForStat(canonical) ?? findExclusionGroupForStat(statId);
    if (group) {
      if (blockedGroups.has(group.id)) {
        errors.push(errAt(itemId, `${path}.stat`,
          `group "${group.id}" is fully blocked (inherent dominantBlocker present)`,
          "I.exclusionGroup"));
      }
      if (consumedGroups.has(group.id)) {
        errors.push(errAt(itemId, `${path}.stat`,
          `group "${group.id}" already has an inherent member; cannot add another member via modifier`,
          "I.exclusionGroup"));
      }
    }

    // Unit match
    const canonicalMeta = STAT_META[canonical];
    if (canonicalMeta && mod.unit !== canonicalMeta.unit) {
      errors.push(errAt(itemId, `${path}.unit`,
        `unit "${mod.unit}" does not match STAT_META.unit "${canonicalMeta.unit}"`,
        "I.modifierUnit"));
    }

    // Value range per source
    const range = mod.source === "natural" ? poolEntry.naturalRange : poolEntry.socketRange;
    if (range && typeof mod.value === "number") {
      const isUnique = instance.rarity === "unique";
      const uniqueMax = isUnique ? range.max * 3 : range.max;
      const uniqueMin = isUnique ? range.min * 3 : range.min;
      const lo = isUnique ? uniqueMin : range.min;
      const hi = isUnique ? uniqueMax : range.max;
      if (mod.value < lo || mod.value > hi) {
        errors.push(errAt(itemId, `${path}.value`,
          isUnique
            ? `value ${mod.value} not in unique-3× range [${lo}, ${hi}] (base ${range.min}–${range.max})`
            : `value ${mod.value} not in ${mod.source}Range [${range.min}, ${range.max}]`,
          isUnique ? "I.uniqueRange3x" : "I.modifierValueRange"));
      }
    } else if (typeof mod.value !== "number") {
      errors.push(errAt(itemId, `${path}.value`, "value must be a number", "I.modifierValueRange"));
    }

    // Cross-check exclusion across modifiers (two members in modifiers)
    if (group) {
      for (const other of actualModifiers) {
        if (other === mod) continue;
        const otherCanonical = resolveCanonicalStat(other?.stat);
        if (group.members.includes(otherCanonical) && otherCanonical !== canonical) {
          errors.push(errAt(itemId, `${path}.stat`,
            `group "${group.id}" has more than one modifier member (${statId} + ${other.stat})`,
            "I.exclusionGroup"));
          break;
        }
      }
    }
  });

  return errors;
}

// ── Helpers ──────────────────────────────────────────────

export function resolveModCount(definition, rarity) {
  if (definition.modifierCountOverrides && rarity in definition.modifierCountOverrides) {
    return definition.modifierCountOverrides[rarity];
  }
  const base = RARITY_CONFIG[rarity]?.modCount ?? 0;
  return base + (definition.craftable ? 1 : 0);
}

function resolveInherentsForRarity(definition, rarity) {
  if (definition.inherentsByRarity && definition.inherentsByRarity[rarity]) {
    return definition.inherentsByRarity[rarity];
  }
  return Array.isArray(definition.inherentStats) ? definition.inherentStats : [];
}

function errAt(itemId, path, message, rule) {
  return { itemId, path, message, rule };
}
