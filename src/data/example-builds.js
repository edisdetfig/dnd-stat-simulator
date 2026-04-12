// Example builds — preconfigured loadouts for the ExampleBuildPicker.
// Each entry's `build()` returns a fresh state object so React state
// never shares mutable references with the preset source.

import { makeEmptyGear } from './gear-defaults.js';

// ── Shared defaults: v3 state every build starts from ──
const V3_DEFAULTS = Object.freeze({
  weaponHeldState:      "none",
  selectedPerks:        [],
  selectedSkills:       [],
  selectedSpells:       [],
  activeBuffs:          {},
  activeForm:           null,
  activeSummons:        {},
  activeAfterEffects:   {},
  activeWildSkill:      null,
  activeMergedSpells:   [],
  selectedStacks:       {},
  selectedTiers:        {},
  hpPercent:            100,
  playerStates:         {},
  frenzyActive:         false,
  environment:          null,
  targetStatuses:       {},
  targetStatusSource:   {},
  target:               { pdr: 0, mdr: 0, headshotDR: 0 },
  religionId:           null,
  theme:                "default",
});

// ── Blood Tithe — canonical Warlock dark-plate caster ──
//
// Verification fixture: with PoS + Bloodstained Blade active, Hit 1 body
// ≈ 85, head ≈ 131 vs Training Dummy (matches damage benchmarks once
// Phase 3 damage display lands). weaponType / armorType fields support
// Phase 3 weapon_type / equipment conditions.
function makeBloodTitheGear() {
  const gear = makeEmptyGear();

  gear.weaponSlot1.primary = {
    id: "spectral_blade",
    name: "Spectral Blade",
    rarity: "epic",
    weaponType: "sword",
    handType: "twoHanded",
    inherentStats: [
      { stat: "weaponDamage",        value: 40 },
      { stat: "moveSpeed",           value: -30 },
      { stat: "actionSpeed",         value: 0.05 },
      { stat: "headshotDamageBonus", value: 0.05 },
    ],
    modifiers: [
      { stat: "armorPenetration",     value: 0.045 },
      { stat: "physicalDamageBonus",  value: 0.025 },
      { stat: "additionalWeaponDamage", value: 2 },
    ],
  };

  gear.weaponSlot2.primary = {
    id: "spellbook",
    name: "Spellbook",
    rarity: "epic",
    weaponType: "staff",
    handType: "twoHanded",
    inherentStats: [
      { stat: "weaponDamage",        value: 22 },
      { stat: "magicalDamage",       value: 5 },
      { stat: "moveSpeed",           value: -10 },
      { stat: "magicPenetration",    value: 0.05 },
    ],
    modifiers: [
      { stat: "memoryCapacityBonus",     value: 0.062 },
      { stat: "additionalMemoryCapacity",value: 4 },
      { stat: "buffDurationBonus",       value: 0.06 },
    ],
  };

  gear.head = {
    id: "rubysilver_barbuta_helm",
    name: "Rubysilver Barbuta Helm",
    rarity: "epic",
    armorType: "plate",
    inherentStats: [
      { stat: "armorRating",               value: 32 },
      { stat: "projectileDamageReduction", value: 0.012 },
      { stat: "headshotDamageReduction",   value: 0.15 },
      { stat: "magicResistance",           value: 30 },
      { stat: "moveSpeed",                 value: -4 },
      { stat: "dex",                       value: 4 },
      { stat: "physicalDamageReduction",   value: 0.01 },
    ],
    modifiers: [
      { stat: "str",               value: 3 },
      { stat: "wil",               value: 2 },
      { stat: "armorPenetration",  value: 0.022 },
    ],
  };

  gear.chest = {
    id: "dark_plate_armor",
    name: "Dark Plate Armor",
    rarity: "epic",
    armorType: "plate",
    inherentStats: [
      { stat: "armorRating",                value: 121 },
      { stat: "projectileDamageReduction",  value: 0.035 },
      { stat: "magicResistance",            value: 41 },
      { stat: "moveSpeed",                  value: -11 },
      { stat: "vig",                        value: 2 },
    ],
    modifiers: [
      { stat: "agi",               value: 3 },
      { stat: "wil",               value: 3 },
      { stat: "kno",               value: 3 },
    ],
  };

  gear.back = {
    id: "spectral_cloak",
    name: "Spectral Cloak",
    rarity: "epic",
    armorType: "cloth",
    inherentStats: [
      { stat: "armorRating", value: 19 },
      { stat: "str",         value: 2 },
      { stat: "dex",         value: 2 },
      { stat: "wil",         value: 2 },
    ],
    modifiers: [
      { stat: "magicalDamageReduction", value: 0.028 },
      { stat: "actionSpeed",            value: 0.03 },
      { stat: "magicResistance",        value: 24 },
    ],
  };

  gear.hands = {
    id: "spiked_gauntlet",
    name: "Spiked Gauntlet",
    rarity: "epic",
    armorType: "plate",
    inherentStats: [
      { stat: "armorRating",               value: 43 },
      { stat: "projectileDamageReduction", value: 0.025 },
      { stat: "magicResistance",           value: -5 },
      { stat: "moveSpeed",                 value: -1 },
      { stat: "dex",                       value: 2 },
      { stat: "vig",                       value: 2 },
    ],
    onHitEffects: [{ damage: 1, damageType: "true_physical", trueDamage: true }],
    modifiers: [
      { stat: "wil",            value: 3 },
      { stat: "str",            value: 2 },
      { stat: "physicalPower",  value: 2 },
    ],
  };

  gear.legs = {
    id: "dark_padded_hose",
    name: "Dark Padded Hose",
    rarity: "epic",
    armorType: "plate",
    inherentStats: [
      { stat: "armorRating",     value: 44 },
      { stat: "magicResistance", value: 25 },
      { stat: "moveSpeed",       value: -4 },
      { stat: "vig",             value: 2 },
    ],
    modifiers: [
      { stat: "dex", value: 2 },
      { stat: "wil", value: 3 },
      { stat: "str", value: 3 },
    ],
  };

  gear.feet = {
    id: "golden_boots",
    name: "Golden Boots",
    rarity: "epic",
    armorType: "plate",
    inherentStats: [
      { stat: "armorRating",            value: 38 },
      { stat: "moveSpeed",              value: 5 },
      { stat: "str",                    value: 4 },
      { stat: "luck",                   value: 10 },
      { stat: "magicalDamageReduction", value: 0.02 },
    ],
    modifiers: [
      { stat: "dex",         value: 2 },
      { stat: "wil",         value: 3 },
      { stat: "actionSpeed", value: 0.017 },
    ],
  };

  gear.ring1 = {
    id: "ring_of_courage_1",
    name: "Ring of Courage",
    rarity: "epic",
    inherentStats: [{ stat: "str", value: 3 }],
    modifiers: [
      { stat: "physicalDamageBonus", value: 0.032 },
      { stat: "physicalPower",       value: 4 },
      { stat: "armorPenetration",    value: 0.018 },
    ],
  };

  gear.ring2 = {
    id: "ring_of_courage_2",
    name: "Ring of Courage",
    rarity: "epic",
    inherentStats: [{ stat: "str", value: 3 }],
    modifiers: [
      { stat: "physicalPower",       value: 4 },
      { stat: "physicalDamageBonus", value: 0.034 },
      { stat: "armorPenetration",    value: 0.02 },
    ],
  };

  gear.necklace = {
    id: "necklace_of_peace",
    name: "Necklace of Peace",
    rarity: "epic",
    inherentStats: [{ stat: "maxHealth", value: 6 }],
    modifiers: [
      { stat: "magicResistance",        value: 27 },
      { stat: "magicalDamageReduction", value: 0.029 },
      { stat: "actionSpeed",            value: 0.039 },
    ],
  };

  return gear;
}

function bloodTitheBuild() {
  return {
    ...V3_DEFAULTS,
    id:              "blood_tithe",
    name:            "Blood Tithe",
    subtitle:        "Sacrificial Blade Lock",
    classId:         "warlock",
    theme:           "blood-tithe",
    description:
      "Spectral Blade + dark plate setup used to verify damage formulas. " +
      "With PoS + Bloodstained Blade active, Hit 1 body ≈ 85, head ≈ 131 vs Training Dummy.",
    religionId:      "noxulon",
    gear:            makeBloodTitheGear(),
    weaponHeldState: "weaponSlot1",
    selectedPerks:   ["demon_armor", "shadow_touch", "dark_reflection"],
    selectedSkills:  ["spell_memory_i", "blow_of_corruption"],
    selectedSpells:  [
      "curse_of_weakness", "power_of_sacrifice", "bloodstained_blade",
      "eldritch_shield", "spell_predation",
    ],
    activeBuffs: { power_of_sacrifice: true, bloodstained_blade: true },
  };
}

export const EXAMPLE_BUILDS = [
  {
    id:       "blood_tithe",
    name:     "Blood Tithe",
    subtitle: "Sacrificial Blade Lock",
    classId:  "warlock",
    description:
      "Spectral Blade + dark plate setup used to verify damage formulas. " +
      "With PoS + Bloodstained Blade active, Hit 1 body ≈ 85, head ≈ 131 vs Training Dummy.",
    build: bloodTitheBuild,
  },
];

export function defaultStateForClass(classId) {
  return {
    ...V3_DEFAULTS,
    classId,
    gear: makeEmptyGear(),
    theme: "default",
  };
}

export function getExampleBuildsForClass(classId) {
  return EXAMPLE_BUILDS.filter(b => b.classId === classId);
}
