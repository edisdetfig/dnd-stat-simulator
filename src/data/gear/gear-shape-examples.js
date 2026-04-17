// gear-shape-examples.js
//
// Concrete examples of GEAR_ITEM_DEFINITION and GEAR_ITEM_INSTANCE per
// the shape in `gear-shape.js`. Every fact here is authoritative — sourced
// from `docs/session-prompts/gear-shape-design.md § 4.4` (metadata wins
// per LOCK B). Pairs definition + plausible instance for each of the four
// coordinator-approved anchor items.
//
// Additional items are Phase 11+ scope — this file ships only the four
// validated anchors (coordinator approved, Phase 6.5c scope-clarification #3).

// ──────────────────────────────────────────────────────────────────
// Spectral Blade — two-handed epic sword; class-restricted to Fighter,
// Warlock, Sorcerer. Rarity locked to epic. No on-hit effects.
// Combo multipliers VERIFIED per docs/damage_formulas.md:211 + wiki.
// ──────────────────────────────────────────────────────────────────

export const spectralBlade = {
  id: "spectral_blade",
  name: "Spectral Blade",

  slotType:        "primaryWeapon",
  armorType:       null,
  weaponType:      "sword",
  handType:        "twoHanded",

  requiredClasses: ["fighter", "warlock", "sorcerer"],

  availableRarities:      ["epic"],
  modifierCountOverrides: {},
  // craftable omitted (not craftable per wiki; not flagged).

  inherentStats: [
    { stat: "weaponDamage",        value: 40,  unit: "flat" },
    { stat: "moveSpeed",           value: -30, unit: "flat" },
    { stat: "actionSpeed",         value: 5,   unit: "percent" },
    { stat: "headshotDamageBonus", value: 5,   unit: "percent" },
  ],

  // Per L4: inherent-only weapon properties. VERIFIED (Spectral Blade
  // primary combo 1.0/1.05/1.10 in docs/damage_formulas.md:211). Special
  // (riposte) multipliers WIKI-SOURCED. Impact zones WIKI-SOURCED two-value
  // pair; exact zone-to-region mapping UNRESOLVED (gear-wiki-facts.md § 3.2).
  inherentWeaponProperties: {
    combos: [
      {
        label: "primary",
        stages: [
          { stage: 1, multiplier: 100, damageType: "pierce" },
          { stage: 2, multiplier: 105, damageType: "slash" },
          { stage: 3, multiplier: 110, damageType: "slash" },
        ],
      },
      {
        label: "riposte",
        stages: [
          { stage: 1, multiplier: 135, damageType: "slash" },
          { stage: 2, multiplier: 135, damageType: "slash" },
        ],
      },
    ],
    impactZones: [100, 90],
    impactResistance: 3,  // block-capable weapon per gear-wiki-facts.md § 2.5
    swingTiming: [
      { stage: 1, windup: 0.932, hit: 0.229, recovery: 0.283 },
      // stages 2-3 windup/hit/recovery UNRESOLVED for this phase
      // (gear-wiki-facts.md § 15 item 4)
    ],
  },

  socketExclusionOverrides: [],
  onHitEffects:             [],
};

// ──────────────────────────────────────────────────────────────────
// Frostlight Crystal Sword — two-handed epic sword AND "magicStuff"
// (L2.1 array weaponType). Class-restricted to Wizard, Warlock, Sorcerer.
// `magicWeaponDamage` produces an independent magic-melee damage
// instance scaling with caster MPB (gear-wiki-facts.md § 2.2).
// ──────────────────────────────────────────────────────────────────

export const frostlightCrystalSword = {
  id: "frostlight_crystal_sword",
  name: "Frostlight Crystal Sword",

  slotType:        "primaryWeapon",
  armorType:       null,
  weaponType:      ["sword", "magicStuff"],   // L2.1 array form
  handType:        "twoHanded",

  requiredClasses: ["wizard", "warlock", "sorcerer"],

  availableRarities:      ["epic"],
  modifierCountOverrides: {},

  inherentStats: [
    { stat: "weaponDamage",      value: 13, unit: "flat" },
    { stat: "magicWeaponDamage", value: 18, unit: "flat" },
    { stat: "moveSpeed",         value: -25, unit: "flat" },
    { stat: "actionSpeed",       value: 2,  unit: "percent" },
  ],

  // Crystal-sword family combo data UNRESOLVED for this phase
  // (gear-wiki-facts.md § 15 item 5: magic-stuff family under-sampled).
  // Shape carries a minimal placeholder so the item validates.
  inherentWeaponProperties: {
    // combos: Phase 11+ populates from per-weapon wiki pages.
  },

  socketExclusionOverrides: [],
  onHitEffects:             [],
};

// ──────────────────────────────────────────────────────────────────
// Foul Boots — leather feet, rare, open-class. `modifierCountOverrides`
// overrides the standard rare=2 to rare=3 (matches craftable +1 rule
// per gear-wiki-facts.md § 9.4 — consistent with craftable flag, but
// override is the load-bearing authoring).
// ──────────────────────────────────────────────────────────────────

export const foulBoots = {
  id: "foul_boots",
  name: "Foul Boots",

  slotType:        "feet",
  armorType:       "leather",
  weaponType:      null,
  handType:        null,

  requiredClasses: [],                 // empty = armor-proficiency-gated only

  availableRarities:      ["rare"],
  modifierCountOverrides: { rare: 3 },
  craftable:              true,        // wiki §9.4 + §11.1 craftable catalog

  inherentStats: [
    { stat: "armorRating",   value: 18, unit: "flat" },
    { stat: "moveSpeed",     value: 6,  unit: "flat" },
    { stat: "agi",           value: 3,  unit: "flat" },
    { stat: "physicalPower", value: 2,  unit: "flat" },
  ],

  socketExclusionOverrides: [],
  onHitEffects:             [],
};

// ──────────────────────────────────────────────────────────────────
// Spiked Gauntlet — plate hands, epic, open-class (per §4.4 verbatim;
// wiki lists Fighter/Cleric class restrictions, but §4.4 LOCK B wins).
// The `onHitEffects` entry is the anchor case for OQ-D6 routing: +1 True
// Physical Damage per melee hit, rolled into main damage number (not a
// separate projection). VERIFIED at docs/damage_formulas.md:235-240.
//
// Shape reconciliation: §4.4 authored `damageType: "true_physical"` +
// `trueDamage: true` — the string "true_physical" is not in DAMAGE_TYPES.
// Canonical authoring: `damageType: "physical"` + `trueDamage: true` —
// the pair encodes the concept; validator + normalizer consume both.
//
// scaling UNRESOLVED per gear-wiki-facts.md § 11.2 — authored as 1.0
// by convention; in-game testing would confirm.
// ──────────────────────────────────────────────────────────────────

export const spikedGauntlet = {
  id: "spiked_gauntlet",
  name: "Spiked Gauntlet",

  slotType:        "hands",
  armorType:       "plate",
  weaponType:      null,
  handType:        null,

  requiredClasses: [],
  availableRarities:      ["epic"],
  modifierCountOverrides: {},
  craftable:              true,        // wiki §11.1 + "craftable via Armourer merchant"

  inherentStats: [
    { stat: "armorRating",               value: 43,  unit: "flat" },
    { stat: "projectileDamageReduction", value: 2.5, unit: "percent" },
    { stat: "magicResistance",           value: -5,  unit: "flat" },
    { stat: "moveSpeed",                 value: -1,  unit: "flat" },
    { stat: "dex",                       value: 2,   unit: "flat" },
    { stat: "vig",                       value: 2,   unit: "flat" },
  ],

  socketExclusionOverrides: [],

  onHitEffects: [
    {
      damage:           1,
      damageType:       "physical",      // canonical; trueDamage flag carries the "true_" semantic
      trueDamage:       true,
      scaling:          1.0,             // assumed per convention (gear-wiki-facts.md § 11.2 UNRESOLVED)
      separateInstance: false,           // included in main damage number
      notes:            "Rolled into main physical damage at post-floor true-physical position (docs/damage_formulas.md:235-240)",
    },
  ],
};

// Registry — convenience bundle for validator happy-pass + normalizer tests.
export const ITEM_DEFINITIONS = Object.freeze({
  [spectralBlade.id]:             spectralBlade,
  [frostlightCrystalSword.id]:    frostlightCrystalSword,
  [foulBoots.id]:                 foulBoots,
  [spikedGauntlet.id]:            spikedGauntlet,
});

// ──────────────────────────────────────────────────────────────────
// Item instances — user-selectable overlays. Each references a
// definition + carries a rarity + modifiers[] picked from the pool.
// ──────────────────────────────────────────────────────────────────

// Spectral Blade, epic — 3 modifiers (standard epic count). Modifiers
// drawn from `weapon_twoHanded` pool per resolvePoolKey. Inherent
// `actionSpeed` is blocked-self, so `cooldownReductionBonus` chosen as
// the third modifier instead.
export const spectralBladeInstance = {
  definitionId: "spectral_blade",
  rarity:       "epic",
  modifiers: [
    { stat: "physicalDamageBonus",    value: 4, unit: "percent", source: "natural"  },
    { stat: "armorPenetration",       value: 6, unit: "percent", source: "natural"  },
    { stat: "cooldownReductionBonus", value: 4, unit: "percent", source: "socketed" },
  ],
};

// Frostlight Crystal Sword, epic — 3 modifiers.
export const frostlightCrystalSwordInstance = {
  definitionId: "frostlight_crystal_sword",
  rarity:       "epic",
  modifiers: [
    { stat: "magicalDamageBonus",   value: 4, unit: "percent", source: "natural"  },
    { stat: "spellCastingSpeed",    value: 6, unit: "percent", source: "natural"  },
    { stat: "memoryCapacityBonus",  value: 7, unit: "percent", source: "socketed" },
  ],
};

// Foul Boots, rare — modCount overridden to 3. Modifiers from `feet` pool.
// Inherent `moveSpeed` is never-socketable (NEVER_SOCKETABLE_STATS); inherent
// `agi` + `physicalPower` block themselves — the modifiers below pick stats
// outside the inherent set.
export const foulBootsInstance = {
  definitionId: "foul_boots",
  rarity:       "rare",
  modifiers: [
    { stat: "str",                   value: 2,  unit: "flat", source: "natural"  },
    { stat: "dex",                   value: 2,  unit: "flat", source: "natural"  },
    { stat: "additionalArmorRating", value: 12, unit: "flat", source: "socketed" },
    // note: `additionalArmorRating` is in `ar_pdr` exclusion group. Foul
    // Boots has no inherent group member, so the group remains available
    // and we may socket AR (not PDR, due to group exclusion).
  ],
};

// Spiked Gauntlet, epic — modCount is `craftable` +1 over epic standard
// (3+1=4). No explicit override authored, so the craftable rule wins.
// Note: inherent `armorRating` is not in the `hands` pool at the same
// stat name (pool has `additionalArmorRating` instead, which is
// ar_pdr-grouped). Inherent AR does NOT block AR-Add socket (different
// stat id per L7); it DOES participate in the ar_pdr group evaluation
// because the group is defined on {additionalArmorRating,
// physicalDamageReduction}. Inherent `armorRating` ≠ members, so no
// group interference.
export const spikedGauntletInstance = {
  definitionId: "spiked_gauntlet",
  rarity:       "epic",
  modifiers: [
    { stat: "str",                   value: 3,  unit: "flat",    source: "natural"  },
    { stat: "physicalPower",         value: 1,  unit: "flat",    source: "natural"  },
    { stat: "armorPenetration",      value: 3,  unit: "percent", source: "natural"  },
    { stat: "additionalArmorRating", value: 12, unit: "flat",    source: "socketed" },
  ],
};

export const ITEM_INSTANCES = Object.freeze({
  spectral_blade:             spectralBladeInstance,
  frostlight_crystal_sword:   frostlightCrystalSwordInstance,
  foul_boots:                 foulBootsInstance,
  spiked_gauntlet:            spikedGauntletInstance,
});
