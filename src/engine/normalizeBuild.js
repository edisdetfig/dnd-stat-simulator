// normalizeBuild — upstream flattener that turns a CharacterBuild (the
// rich Character + Session + Loadout + item-instance/definition bundle
// per `src/data/character/character-shape.js`) into the flat engine
// `Build` consumed by `buildContext`. OQ-D3 decision — engine contract
// (`buildContext(build) → ctx`) remains unchanged; normalizer lives
// adjacent to the engine but outside it.
//
// Scope (6.5c.2):
//   - Pick held loadout per `session.weaponHeldState` (OQ-D7 path a: L6
//     dormancy enforced upstream; off-loadout drops).
//   - Flatten inherent + modifier numeric contributions from each equipped
//     item into `gear.bonuses`, resolving §4.3 bare names → STAT_META
//     canonical via `MODIFIER_POOL_STAT_ALIASES`. Percent stats converted
//     display → internal (÷ 100) so the engine sees decimals.
//   - Extract weapon-level fields: `weaponType`, `handType`,
//     `baseWeaponDmg`, `gearWeaponDmg`, `magicalDamage`. `magicalDamage`
//     is hydrated from either `magicWeaponDamage` inherent (Frostlight
//     Crystal Sword) or `magicalDamage` inherent.
//   - Collect `onHitEffects[]` across all equipped items (annotated with
//     `sourceItemId`) per OQ-D6.
//   - Pre-sum attributes: `character.attributes` + gear core-attr
//     contributions → `Build.attributes`.
//   - Passthrough: session-live fields (activeBuffs, counters, playerStates,
//     weaponHeldState-derived unarmed flag, target, environment, hpFraction).
//
// Out of scope (deferred to Phase 11):
//   - `ctx.comboMultiplier / ctx.impactZone` population from
//     `inherentWeaponProperties`. Current fixtures set those top-level ctx
//     fields directly; normalizer does not populate them from definitions
//     this phase. Full item catalog + per-weapon inherent data lands with
//     Phase 11 gear authoring.

import { STAT_META, displayToInternal } from "../data/stat-meta.js";
import {
  MODIFIER_POOL_STAT_ALIASES,
  resolveCanonicalStat,
} from "../data/gear/modifier-pools.js";
import { CORE_ATTRS } from "../data/constants.js";

// Stats that are weapon-equipment-level and do NOT flow through
// `gear.bonuses`. Extracted onto `gear.weapon` instead.
const WEAPON_INHERENT_TO_WEAPON_FIELD = Object.freeze({
  weaponDamage:      "baseWeaponDmg",
  magicWeaponDamage: "magicalDamage",
  magicalDamage:     "magicalDamage",
});

// Stats that flow onto `gear.weapon.gearWeaponDmg` (weapon modifier, not a
// general `bonuses` contribution).
const GEAR_WEAPON_DMG_STATS = new Set(["additionalWeaponDamage"]);

/**
 * Main entry. Returns an engine-shaped `Build` object. Caller feeds the
 * result into `buildContext()`.
 *
 * @param {Object} input
 *   @param {Object} input.character         - character-shape.js CHARACTER_SHAPE
 *   @param {Object} input.session           - character-shape.js SESSION_SHAPE
 *   @param {Object} input.loadout           - gear-shape.js LOADOUT
 *   @param {Object} input.itemInstances     - Record<id, GEAR_ITEM_INSTANCE>
 *   @param {Object} input.itemDefinitions   - Record<id, GEAR_ITEM_DEFINITION>
 *   @param {Object} input.classData         - resolved class object (v3 shape)
 */
export function normalizeBuild(input) {
  const { character, session, loadout, itemDefinitions, classData } = input;

  if (!classData) {
    throw new Error("normalizeBuild: `classData` is required (resolve via CLASSES/getClass before calling)");
  }

  const weaponHeldState = session?.weaponHeldState ?? "unarmed";

  // ── Held-loadout pick (OQ-D7 path a: dormancy upstream) ───────
  const heldWeaponSlot = pickHeldWeaponSlot(loadout, weaponHeldState);

  // ── gear.weapon / gear.offhand ──────────────────────────────
  const weaponData = buildWeaponPayload(heldWeaponSlot?.primary, itemDefinitions);
  const offhandData = buildOffhandPayload(heldWeaponSlot?.secondary, itemDefinitions);

  // ── Walk equipped items; accumulate bonuses / onHitEffects / attrs ──
  const bonuses = Object.create(null);
  const onHitEffects = [];
  const gearAttrContributions = Object.fromEntries(
    [...CORE_ATTRS].map(attr => [attr, 0])
  );

  for (const { instance, definition } of iterEquippedItems(loadout, itemInstances(input), itemDefinitions, weaponHeldState)) {
    accumulateItem(instance, definition, bonuses, gearAttrContributions, onHitEffects, weaponData);
  }

  // ── Attribute totals: character + gear contributions ─────────
  const attributes = { ...(character?.attributes ?? {}) };
  for (const attr of CORE_ATTRS) {
    attributes[attr] = (attributes[attr] ?? 0) + (gearAttrContributions[attr] ?? 0);
  }

  // ── Assemble engine-contract Build ──────────────────────────
  const isUnarmed = weaponHeldState === "unarmed" || !weaponData;
  const isDualWielding = Boolean(heldWeaponSlot?.secondary) && !isUnarmed;

  return {
    klass: classData,
    attributes,

    gear: {
      weapon: weaponData,
      offhand: offhandData,
      bonuses,
      onHitEffects,
    },

    selectedPerks:  [...(character?.persistentSelections?.selectedPerks  ?? [])],
    selectedSkills: [...(character?.persistentSelections?.selectedSkills ?? [])],
    selectedSpells: [...(character?.persistentSelections?.selectedSpells ?? [])],

    activeBuffs:           [...(session?.activeBuffs           ?? [])],
    classResourceCounters: { ...(session?.classResourceCounters ?? {}) },
    stackCounts:           { ...(session?.stackCounts           ?? {}) },
    selectedTiers:         { ...(session?.selectedTiers         ?? {}) },
    playerStates:          [...(session?.playerStates           ?? [])],
    viewingAfterEffect:    [...(session?.viewingAfterEffect     ?? [])],
    applyToSelf:           { ...(session?.applyToSelf           ?? {}) },
    applyToEnemy:          { ...(session?.applyToEnemy          ?? {}) },

    target:      session?.target ?? {},
    environment: session?.environment,
    hpFraction:  session?.hpFraction ?? 1.0,

    // Weapon-state flag overrides. `weaponHeldState: "unarmed"` forces
    // `isUnarmed: true` regardless of per-slot contents. Otherwise
    // `deriveWeaponState` derives from gear.weapon.handType naturally.
    isUnarmed:      isUnarmed,
    isDualWielding: isDualWielding,
  };
}

// ── Helpers ─────────────────────────────────────────────────

function pickHeldWeaponSlot(loadout, heldState) {
  if (heldState === "slot1") return loadout?.slots?.weaponSlot1 ?? null;
  if (heldState === "slot2") return loadout?.slots?.weaponSlot2 ?? null;
  return null;  // unarmed
}

function buildWeaponPayload(primaryInstance, itemDefinitions) {
  if (!primaryInstance) return null;
  const def = itemDefinitions?.[primaryInstance.definitionId];
  if (!def) return null;

  const payload = {
    weaponType: def.weaponType,
    handType:   def.handType,
    baseWeaponDmg: 0,
    gearWeaponDmg: 0,
  };

  // Inherent weapon-damage fields.
  for (const inherent of iterInherents(def, primaryInstance.rarity, primaryInstance.rolledInherents)) {
    const field = WEAPON_INHERENT_TO_WEAPON_FIELD[inherent.stat];
    if (!field) continue;
    const value = resolveInherentValue(inherent, primaryInstance.rolledInherents);
    if (typeof value === "number") {
      payload[field] = (payload[field] ?? 0) + value;
    }
  }

  // Weapon-side modifiers (additionalWeaponDamage → gearWeaponDmg).
  if (Array.isArray(primaryInstance.modifiers)) {
    for (const mod of primaryInstance.modifiers) {
      if (!GEAR_WEAPON_DMG_STATS.has(resolveCanonicalStat(mod.stat))) continue;
      if (typeof mod.value === "number") {
        payload.gearWeaponDmg += mod.value;
      }
    }
  }

  return payload;
}

function buildOffhandPayload(secondaryInstance, itemDefinitions) {
  if (!secondaryInstance) return null;
  const def = itemDefinitions?.[secondaryInstance.definitionId];
  if (!def) return null;
  return { weaponType: def.weaponType };
}

// Generator over (instance, definition) pairs for every equipped item in
// the held-context, per L6 dormancy.
function* iterEquippedItems(loadout, itemInstances, itemDefinitions, heldState) {
  if (!loadout?.slots) return;
  for (const slotKey of Object.keys(loadout.slots)) {
    if (slotKey === "weaponSlot1" || slotKey === "weaponSlot2") {
      // Only emit held loadout's weapons; off-loadout dormant (L6).
      const isHeld = (slotKey === "weaponSlot1" && heldState === "slot1")
                  || (slotKey === "weaponSlot2" && heldState === "slot2");
      if (!isHeld) continue;
      const env = loadout.slots[slotKey] ?? {};
      for (const sub of ["primary", "secondary"]) {
        const instance = env[sub];
        if (!instance) continue;
        const def = itemDefinitions?.[instance.definitionId];
        if (!def) continue;
        yield { instance, definition: def };
      }
    } else {
      const instance = loadout.slots[slotKey];
      if (!instance) continue;
      const def = itemDefinitions?.[instance.definitionId];
      if (!def) continue;
      yield { instance, definition: def };
    }
  }
}

// Normalizer input signature allows either a callable `itemInstances` or
// a Record. Accept both for ergonomics; both reduce to a Record<id, instance>.
function itemInstances(input) {
  if (typeof input.itemInstances === "function") return input.itemInstances();
  return input.itemInstances ?? {};
}

function* iterInherents(definition, rarity, rolledInherents) {
  if (definition.inherentsByRarity && definition.inherentsByRarity[rarity]) {
    yield* definition.inherentsByRarity[rarity];
    return;
  }
  if (Array.isArray(definition.inherentStats)) yield* definition.inherentStats;
}

function resolveInherentValue(inherent, rolledInherents) {
  if (typeof inherent.value === "number") return inherent.value;
  // Ranged inherent: rolledInherents[stat] must be present (instance
  // validator enforces).
  return rolledInherents?.[inherent.stat];
}

function accumulateItem(instance, definition, bonuses, attrContributions, onHitEffects, weaponData) {
  const isWeapon = definition.slotType === "primaryWeapon" || definition.slotType === "secondaryWeapon";

  // ── Inherent stats → bonuses / attrContributions ──
  for (const inherent of iterInherents(definition, instance.rarity, instance.rolledInherents)) {
    const raw = resolveInherentValue(inherent, instance.rolledInherents);
    if (typeof raw !== "number") continue;
    const canonical = resolveCanonicalStat(inherent.stat);

    // Weapon-only inherents hydrate gear.weapon fields, not bonuses.
    if (isWeapon && WEAPON_INHERENT_TO_WEAPON_FIELD[canonical]) continue;

    addStatContribution(bonuses, attrContributions, canonical, raw, inherent.unit);
  }

  // ── Modifiers → bonuses / attrContributions ──
  if (Array.isArray(instance.modifiers)) {
    for (const mod of instance.modifiers) {
      if (typeof mod.value !== "number") continue;
      const canonical = resolveCanonicalStat(mod.stat);

      // Weapon-specific damage modifiers bypass bonuses (fed to gear.weapon.gearWeaponDmg).
      if (isWeapon && GEAR_WEAPON_DMG_STATS.has(canonical)) continue;

      addStatContribution(bonuses, attrContributions, canonical, mod.value, mod.unit);
    }
  }

  // ── On-hit effects ──
  if (Array.isArray(definition.onHitEffects) && definition.onHitEffects.length > 0) {
    for (const eff of definition.onHitEffects) {
      onHitEffects.push({
        ...eff,
        sourceItemId: definition.id,
      });
    }
  }
}

function addStatContribution(bonuses, attrContributions, canonicalStat, rawValue, authoredUnit) {
  // Core attributes → attrContributions (pre-sum upstream per buildContext
  // contract). Do not route through bonuses.
  if (CORE_ATTRS.has(canonicalStat)) {
    attrContributions[canonicalStat] = (attrContributions[canonicalStat] ?? 0) + rawValue;
    return;
  }

  const meta = STAT_META[canonicalStat];
  // Percent-stat display→internal conversion. If STAT_META unit is percent,
  // the normalizer emits decimal (÷100). Flat passes through.
  const authoredIsPercent = authoredUnit === "percent" || (meta && meta.unit === "percent");
  const value = authoredIsPercent ? displayToInternal(canonicalStat, rawValue) : rawValue;

  bonuses[canonicalStat] = (bonuses[canonicalStat] ?? 0) + value;
}
