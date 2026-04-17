// gear-definition-validator.js — build-time validator for item definitions.
//
// Pure-ESM; no test-framework imports. Mirrors the style of
// `src/data/classes/class-shape-validator.js`: accumulate errors via
// `errors.push(errAt(...))`, return a flat ValidationError[]; never throw.
// The sibling Vitest file (gear-definition-validator.test.js) drives
// validation over the anchor items in gear-shape-examples.js and runs
// per-rule negative fixtures.
//
// Public API:
//   validateGearDefinition(definition) -> ValidationError[]
//   validateAllGearDefinitions(defs)   -> { byId: {id: Err[]} }
//
// ValidationError:
//   { itemId, path, message, rule }
//
// Rule code prefix: D.* (definition-structural). Instance-level rules
// (I.*) live in gear-instance-validator.js.
//
// Canonical sources: all enum / registry membership delegates to imports.
// Vocabulary not available here → rule not enforced (per three-priority
// hierarchy, mirroring class-shape-validator convention).

import {
  ARMOR_TYPES,
  WEAPON_TYPES,
  DAMAGE_TYPES,
  SLOT_TYPES,
  HAND_TYPES,
  RARITY_ORDER,
} from "../constants.js";
import { STAT_META } from "../stat-meta.js";
import { MODIFIER_POOL_STAT_ALIASES } from "./modifier-pools.js";
import { NEVER_SOCKETABLE_STATS, EXCLUSION_GROUPS } from "./exclusion-groups.js";

const DEFINITION_REQUIRED = [
  "id", "name", "slotType", "availableRarities", "inherentStats",
  "modifierCountOverrides", "socketExclusionOverrides", "onHitEffects",
  "requiredClasses",
];

const WEAPON_SLOT_TYPES = new Set(["primaryWeapon", "secondaryWeapon"]);
const ARMOR_SLOT_TYPES  = new Set(["head", "chest", "back", "hands", "legs", "feet"]);
const JEWELRY_SLOT_TYPES = new Set(["ring", "necklace"]);

const EXCLUSION_GROUP_IDS = new Set(Object.keys(EXCLUSION_GROUPS));

export function validateGearDefinition(def) {
  const errors = [];
  const id = def?.id ?? "<unknown>";

  if (!def || typeof def !== "object") {
    errors.push(errAt(id, "", "definition is not an object", "D.required"));
    return errors;
  }

  for (const key of DEFINITION_REQUIRED) {
    if (def[key] === undefined) {
      errors.push(errAt(id, key, `missing required field "${key}"`, "D.required"));
    }
  }

  // ── Taxonomy ────────────────────────────────────────────────
  if (def.slotType != null && !SLOT_TYPES.has(def.slotType)) {
    errors.push(errAt(id, "slotType", `unknown slotType "${def.slotType}"`, "D.slotType"));
  }
  if (def.armorType != null && !ARMOR_TYPES.has(def.armorType)) {
    errors.push(errAt(id, "armorType", `unknown armorType "${def.armorType}"`, "D.armorType"));
  }
  if (def.handType != null && !HAND_TYPES.has(def.handType)) {
    errors.push(errAt(id, "handType", `unknown handType "${def.handType}"`, "D.handType"));
  }
  if (def.weaponType != null) {
    const types = Array.isArray(def.weaponType) ? def.weaponType : [def.weaponType];
    types.forEach((wt, i) => {
      if (typeof wt !== "string" || !WEAPON_TYPES.has(wt)) {
        errors.push(errAt(id, `weaponType[${i}]`, `unknown weaponType "${wt}"`, "D.weaponType"));
      }
    });
  }

  // ── Axis consistency: weapon-only vs non-weapon-only fields ──
  const isWeaponSlot  = WEAPON_SLOT_TYPES.has(def.slotType);
  const isArmorSlot   = ARMOR_SLOT_TYPES.has(def.slotType);
  const isJewelrySlot = JEWELRY_SLOT_TYPES.has(def.slotType);

  if (isWeaponSlot) {
    if (def.weaponType == null) {
      errors.push(errAt(id, "weaponType", "weapon items must author weaponType", "D.weaponTypeOnWeaponOnly"));
    }
    if (def.handType == null) {
      errors.push(errAt(id, "handType", "weapon items must author handType", "D.handTypeOnWeaponOnly"));
    }
    if (def.armorType != null) {
      errors.push(errAt(id, "armorType", "weapon items must have armorType: null", "D.armorTypeOnArmorOnly"));
    }
  } else if (isArmorSlot) {
    if (def.armorType == null) {
      errors.push(errAt(id, "armorType", "armor items must author armorType", "D.armorTypeOnArmorOnly"));
    }
    if (def.weaponType != null) {
      errors.push(errAt(id, "weaponType", "armor items must have weaponType: null", "D.weaponTypeOnWeaponOnly"));
    }
    if (def.handType != null) {
      errors.push(errAt(id, "handType", "armor items must have handType: null", "D.handTypeOnWeaponOnly"));
    }
  } else if (isJewelrySlot) {
    if (def.weaponType != null) {
      errors.push(errAt(id, "weaponType", "jewelry items must have weaponType: null", "D.weaponTypeOnWeaponOnly"));
    }
    if (def.handType != null) {
      errors.push(errAt(id, "handType", "jewelry items must have handType: null", "D.handTypeOnWeaponOnly"));
    }
    if (def.armorType != null) {
      errors.push(errAt(id, "armorType", "jewelry items must have armorType: null", "D.armorTypeOnArmorOnly"));
    }
    // L9: jewelry has no class gating.
    if (Array.isArray(def.requiredClasses) && def.requiredClasses.length > 0) {
      errors.push(errAt(id, "requiredClasses", "jewelry items cannot author requiredClasses (L9 — no class gating)", "D.jewelryNoRequiredClasses"));
    }
  }

  // ── Rarity + modifier-count bookkeeping ─────────────────────
  if (Array.isArray(def.availableRarities)) {
    if (def.availableRarities.length === 0) {
      errors.push(errAt(id, "availableRarities", "availableRarities must be non-empty", "D.availableRarities"));
    }
    def.availableRarities.forEach((r, i) => {
      if (!RARITY_ORDER.includes(r)) {
        errors.push(errAt(id, `availableRarities[${i}]`, `unknown rarity "${r}"`, "D.availableRarities"));
      }
    });
  } else if (def.availableRarities !== undefined) {
    errors.push(errAt(id, "availableRarities", "availableRarities must be an array", "D.availableRarities"));
  }

  if (def.modifierCountOverrides && typeof def.modifierCountOverrides === "object") {
    for (const key of Object.keys(def.modifierCountOverrides)) {
      if (!RARITY_ORDER.includes(key)) {
        errors.push(errAt(id, `modifierCountOverrides.${key}`, `override rarity "${key}" not in RARITY_ORDER`, "D.modifierCountOverridesKey"));
      } else if (Array.isArray(def.availableRarities) && !def.availableRarities.includes(key)) {
        errors.push(errAt(id, `modifierCountOverrides.${key}`, `override references rarity "${key}" not in availableRarities`, "D.modifierCountOverridesKey"));
      }
      const val = def.modifierCountOverrides[key];
      if (typeof val !== "number" || val < 0 || !Number.isInteger(val)) {
        errors.push(errAt(id, `modifierCountOverrides.${key}`, "override value must be non-negative integer", "D.modifierCountOverridesKey"));
      }
    }
  }

  if (def.craftable !== undefined && typeof def.craftable !== "boolean") {
    errors.push(errAt(id, "craftable", "craftable must be boolean or omitted", "D.craftableFlag"));
  }

  // ── Inherent stats ──────────────────────────────────────────
  if (Array.isArray(def.inherentStats)) {
    def.inherentStats.forEach((ih, i) => validateInherent(id, ih, `inherentStats[${i}]`, errors));
  }
  if (def.inherentsByRarity && typeof def.inherentsByRarity === "object") {
    for (const rarity of Object.keys(def.inherentsByRarity)) {
      if (!RARITY_ORDER.includes(rarity)) {
        errors.push(errAt(id, `inherentsByRarity.${rarity}`, `unknown rarity "${rarity}"`, "D.availableRarities"));
      }
      const list = def.inherentsByRarity[rarity];
      if (!Array.isArray(list)) {
        errors.push(errAt(id, `inherentsByRarity.${rarity}`, "must be an array", "D.inherentStat"));
        continue;
      }
      list.forEach((ih, i) => validateInherent(id, ih, `inherentsByRarity.${rarity}[${i}]`, errors));
    }
  }

  // ── Inherent weapon properties (L4) ─────────────────────────
  if (def.inherentWeaponProperties != null) {
    if (!isWeaponSlot) {
      errors.push(errAt(id, "inherentWeaponProperties", "inherentWeaponProperties only allowed on weapon items", "D.inherentWeaponPropsOnWeapon"));
    }
    // Structural shape is under-specified in 6.5c.1; validate basic types.
    const iwp = def.inherentWeaponProperties;
    if (iwp.combos != null && !Array.isArray(iwp.combos)) {
      errors.push(errAt(id, "inherentWeaponProperties.combos", "combos must be an array", "D.inherentWeaponPropsShape"));
    }
    if (iwp.impactZones != null && !Array.isArray(iwp.impactZones)) {
      errors.push(errAt(id, "inherentWeaponProperties.impactZones", "impactZones must be an array", "D.inherentWeaponPropsShape"));
    }
    if (iwp.swingTiming != null && !Array.isArray(iwp.swingTiming)) {
      errors.push(errAt(id, "inherentWeaponProperties.swingTiming", "swingTiming must be an array", "D.inherentWeaponPropsShape"));
    }
  }

  // ── socketExclusionOverrides ────────────────────────────────
  if (Array.isArray(def.socketExclusionOverrides)) {
    def.socketExclusionOverrides.forEach((stat, i) => {
      const canonical = MODIFIER_POOL_STAT_ALIASES[stat] ?? stat;
      if (typeof stat !== "string") {
        errors.push(errAt(id, `socketExclusionOverrides[${i}]`, "must be a stat id string", "D.socketExclusionOverrides"));
        return;
      }
      if (!STAT_META[canonical]) {
        errors.push(errAt(id, `socketExclusionOverrides[${i}]`, `unknown stat "${stat}"`, "D.socketExclusionOverrides"));
      }
      if (NEVER_SOCKETABLE_STATS.has(stat)) {
        errors.push(errAt(id, `socketExclusionOverrides[${i}]`, `"${stat}" is never-socketable; cannot override`, "D.neverSocketable"));
      }
    });
  }

  // ── onHitEffects (OQ-D6) ────────────────────────────────────
  if (Array.isArray(def.onHitEffects)) {
    def.onHitEffects.forEach((eff, i) => validateOnHitEffect(id, eff, `onHitEffects[${i}]`, errors));
  }

  // ── requiredClasses ────────────────────────────────────────
  if (def.requiredClasses !== undefined) {
    if (!Array.isArray(def.requiredClasses)) {
      errors.push(errAt(id, "requiredClasses", "requiredClasses must be an array", "D.requiredClassesMembership"));
    } else {
      def.requiredClasses.forEach((c, i) => {
        if (typeof c !== "string" || c.length === 0) {
          errors.push(errAt(id, `requiredClasses[${i}]`, "class id must be non-empty string", "D.requiredClassesMembership"));
        }
      });
    }
  }

  return errors;
}

export function validateAllGearDefinitions(defs) {
  const byId = {};
  const defList = Array.isArray(defs) ? defs : Object.values(defs);
  for (const def of defList) {
    const errs = validateGearDefinition(def);
    byId[def?.id ?? "<unknown>"] = errs;
  }
  return { byId };
}

// ── Sub-validators ───────────────────────────────────────────

function validateInherent(itemId, ih, path, errors) {
  if (!ih || typeof ih !== "object") {
    errors.push(errAt(itemId, path, "inherent entry is not an object", "D.inherentStat"));
    return;
  }
  if (typeof ih.stat !== "string") {
    errors.push(errAt(itemId, `${path}.stat`, "missing or non-string stat", "D.inherentStat"));
    return;
  }
  const canonical = MODIFIER_POOL_STAT_ALIASES[ih.stat] ?? ih.stat;
  const meta = STAT_META[canonical];
  if (!meta) {
    errors.push(errAt(itemId, `${path}.stat`, `unknown stat "${ih.stat}"`, "D.inherentStat"));
    return;
  }

  // Form: fixed `value` XOR ranged `{min, max}`.
  const hasValue = ih.value !== undefined;
  const hasMin   = ih.min   !== undefined;
  const hasMax   = ih.max   !== undefined;
  if (hasValue && (hasMin || hasMax)) {
    errors.push(errAt(itemId, path, "inherent must author either `value` or `{min,max}`, not both", "D.inherentFormExclusive"));
  } else if (!hasValue && !(hasMin && hasMax)) {
    errors.push(errAt(itemId, path, "inherent must author `value` (fixed) or `{min,max}` (ranged)", "D.inherentFormExclusive"));
  }
  if (hasMin && hasMax && ih.min > ih.max) {
    errors.push(errAt(itemId, path, `range {min:${ih.min},max:${ih.max}} — min must be ≤ max`, "D.inherentRange"));
  }
  if (hasValue && typeof ih.value !== "number") {
    errors.push(errAt(itemId, `${path}.value`, "value must be a number", "D.inherentRange"));
  }

  // Unit must match STAT_META[stat].unit.
  if (typeof ih.unit !== "string" || (ih.unit !== "flat" && ih.unit !== "percent")) {
    errors.push(errAt(itemId, `${path}.unit`, `unit must be "flat" or "percent"`, "D.inherentUnit"));
  } else if (ih.unit !== meta.unit) {
    errors.push(errAt(itemId, `${path}.unit`, `unit "${ih.unit}" does not match STAT_META.unit "${meta.unit}" for stat "${ih.stat}"`, "D.inherentUnit"));
  }
}

function validateOnHitEffect(itemId, eff, path, errors) {
  if (!eff || typeof eff !== "object") {
    errors.push(errAt(itemId, path, "on-hit effect is not an object", "D.onHitEffectShape"));
    return;
  }
  if (typeof eff.damage !== "number" || eff.damage < 0) {
    errors.push(errAt(itemId, `${path}.damage`, "damage must be non-negative number", "D.onHitEffectShape"));
  }
  if (typeof eff.damageType !== "string" || !DAMAGE_TYPES.has(eff.damageType)) {
    errors.push(errAt(itemId, `${path}.damageType`, `unknown damageType "${eff.damageType}"`, "D.onHitDamageType"));
  }
  if (typeof eff.trueDamage !== "boolean") {
    errors.push(errAt(itemId, `${path}.trueDamage`, "trueDamage must be boolean", "D.onHitEffectShape"));
  }
  if (eff.scaling != null) {
    if (typeof eff.scaling !== "number" || eff.scaling < 0 || eff.scaling > 1) {
      errors.push(errAt(itemId, `${path}.scaling`, "scaling must be null or number in [0, 1]", "D.onHitScaling"));
    }
  }
  if (typeof eff.separateInstance !== "boolean") {
    errors.push(errAt(itemId, `${path}.separateInstance`, "separateInstance must be boolean", "D.onHitEffectShape"));
  }
}

function errAt(itemId, path, message, rule) {
  return { itemId, path, message, rule };
}

// Re-export for convenient access in the instance validator.
export { EXCLUSION_GROUP_IDS };
