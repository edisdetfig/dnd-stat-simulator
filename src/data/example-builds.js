// Example Builds — pre-made loadouts users can load from the main simulator.
// Each entry's `build` function returns a fresh copy of the state so loading
// the same preset twice never shares mutable references with React state.

// Warlock dark plate caster — the loadout used to verify damage formulas.
// Spectral Blade + dark plate. With PoS + Bloodstained Blade active,
// Hit 1 body ≈ 85, head ≈ 131 vs Training Dummy.
// Exported because src/engine/tests.js uses it as the verification fixture
// for aggregator/derived-stats/damage tests — same loadout as the example.
export function makeWarlockDarkPlateGear() {
  return {
    weaponSlot1: {
      primary: {
        id: "spectral_blade",
        name: "Spectral Blade",
        rarity: "epic",
        handType: "twoHanded",
        weaponDamage: 40,
        inherentStats: [
          { stat: "moveSpeed", value: -30 },
          { stat: "actionSpeed", value: 0.05 },
          { stat: "headshotDamageBonus", value: 0.05 },
        ],
        modifiers: [
          { stat: "armorPenetration", value: 0.045 },
          { stat: "physicalDamageBonus", value: 0.025 },
          { stat: "additionalWeaponDamage", value: 2 },
        ],
      },
      secondary: null,
    },
    weaponSlot2: {
      primary: {
        id: "spellbook",
        name: "Spellbook",
        rarity: "epic",
        handType: "twoHanded",
        weaponDamage: 22,
        magicalDamage: 5,
        inherentStats: [
          { stat: "moveSpeed", value: -10 },
          { stat: "magicPenetration", value: 0.05 },
        ],
        modifiers: [
          { stat: "memoryCapacityBonus", value: 0.062 },
          { stat: "additionalMemoryCapacity", value: 4 },
          { stat: "buffDurationBonus", value: 0.06 },
        ],
      },
      secondary: null,
    },
    head: {
      id: "rubysilver_barbuta_helm",
      name: "Rubysilver Barbuta Helm",
      rarity: "epic",
      inherentStats: [
        { stat: "armorRating", value: 32 },
        { stat: "projectileDamageReduction", value: 0.012 },
        { stat: "headshotDamageReduction", value: 0.15 },
        { stat: "magicResistance", value: 30 },
        { stat: "moveSpeed", value: -4 },
        { stat: "dex", value: 4 },
        { stat: "physicalDamageReduction", value: 0.01 },
      ],
      modifiers: [
        { stat: "str", value: 3 },
        { stat: "wil", value: 2 },
        { stat: "armorPenetration", value: 0.022 },
      ],
    },
    chest: {
      id: "dark_plate_armor",
      name: "Dark Plate Armor",
      rarity: "epic",
      inherentStats: [
        { stat: "armorRating", value: 121 },
        { stat: "projectileDamageReduction", value: 0.035 },
        { stat: "magicResistance", value: 41 },
        { stat: "moveSpeed", value: -11 },
        { stat: "vig", value: 2 },
      ],
      modifiers: [
        { stat: "agi", value: 3 },
        { stat: "wil", value: 3 },
        { stat: "kno", value: 3 },
      ],
    },
    back: {
      id: "spectral_cloak",
      name: "Spectral Cloak",
      rarity: "epic",
      inherentStats: [
        { stat: "armorRating", value: 19 },
        { stat: "str", value: 2 },
        { stat: "dex", value: 2 },
        { stat: "wil", value: 2 },
      ],
      modifiers: [
        { stat: "magicalDamageReduction", value: 0.028 },
        { stat: "actionSpeed", value: 0.03 },
        { stat: "magicResistance", value: 24 },
      ],
    },
    hands: {
      id: "spiked_gauntlet",
      name: "Spiked Gauntlet",
      rarity: "epic",
      inherentStats: [
        { stat: "armorRating", value: 43 },
        { stat: "projectileDamageReduction", value: 0.025 },
        { stat: "magicResistance", value: -5 },
        { stat: "moveSpeed", value: -1 },
        { stat: "dex", value: 2 },
        { stat: "vig", value: 2 },
      ],
      onHitEffects: [{ damage: 1, damageType: "true_physical", trueDamage: true }],
      modifiers: [
        { stat: "wil", value: 3 },
        { stat: "str", value: 2 },
        { stat: "physicalPower", value: 2 },
      ],
    },
    legs: {
      id: "dark_padded_hose",
      name: "Dark Padded Hose",
      rarity: "epic",
      inherentStats: [
        { stat: "armorRating", value: 44 },
        { stat: "magicResistance", value: 25 },
        { stat: "moveSpeed", value: -4 },
        { stat: "vig", value: 2 },
      ],
      modifiers: [
        { stat: "dex", value: 2 },
        { stat: "wil", value: 3 },
        { stat: "str", value: 3 },
      ],
    },
    feet: {
      id: "golden_boots",
      name: "Golden Boots",
      rarity: "epic",
      inherentStats: [
        { stat: "armorRating", value: 38 },
        { stat: "moveSpeed", value: 5 },
        { stat: "str", value: 4 },
        { stat: "luck", value: 10 },
        { stat: "magicalDamageReduction", value: 0.02 },
      ],
      modifiers: [
        { stat: "dex", value: 2 },
        { stat: "wil", value: 3 },
        { stat: "actionSpeed", value: 0.017 },
      ],
    },
    ring1: {
      id: "ring_of_courage_1",
      name: "Ring of Courage",
      rarity: "epic",
      inherentStats: [{ stat: "str", value: 3 }],
      modifiers: [
        { stat: "physicalDamageBonus", value: 0.032 },
        { stat: "physicalPower", value: 4 },
        { stat: "armorPenetration", value: 0.018 },
      ],
    },
    ring2: {
      id: "ring_of_courage_2",
      name: "Ring of Courage",
      rarity: "epic",
      inherentStats: [{ stat: "str", value: 3 }],
      modifiers: [
        { stat: "physicalPower", value: 4 },
        { stat: "physicalDamageBonus", value: 0.034 },
        { stat: "armorPenetration", value: 0.02 },
      ],
    },
    necklace: {
      id: "necklace_of_peace",
      name: "Necklace of Peace",
      rarity: "epic",
      inherentStats: [{ stat: "maxHealth", value: 6 }],
      modifiers: [
        { stat: "magicResistance", value: 27 },
        { stat: "magicalDamageReduction", value: 0.029 },
        { stat: "actionSpeed", value: 0.039 },
      ],
    },
  };
}

export const EXAMPLE_BUILDS = [
  {
    id: "blood_tithe",
    name: "Blood Tithe",
    subtitle: "Sacrificial Blade Lock",
    classId: "warlock",
    theme: "blood-tithe",
    description:
      "Spectral Blade + dark plate setup used to verify damage formulas. " +
      "With PoS + Bloodstained Blade active, Hit 1 body ≈ 85, head ≈ 131 vs Training Dummy.",
    build: () => ({
      weapon: "weaponSlot1",
      religion: "none",
      gear: makeWarlockDarkPlateGear(),
      selectedPerks: ["demon_armor", "shadow_touch", "dark_reflection"],
      selectedSkills: ["spell_memory_1", "blow_of_corruption"],
      selectedSpells: [
        "curse_of_weakness",
        "power_of_sacrifice",
        "bloodstained_blade",
        "eldritch_shield",
        "spell_predation",
      ],
      activeBuffs: { power_of_sacrifice: true, bloodstained_blade: true },
    }),
  },
];

// Helper: list example builds for a given class id, or [] if none.
export function getExampleBuildsForClass(classId) {
  return EXAMPLE_BUILDS.filter((b) => b.classId === classId);
}
