// Minimal-loadout control fixture.
//
// 1 passive perk, 0 skills, 0 spells, no gear. The counterpart to
// max-loadout; gives the bench a scaling signal (max vs min) so Phase 6
// can see whether time scales with atom density or has fixed overhead.

export const MINIMAL_LOADOUT_CLASS = {
  id: "minimal_loadout",
  name: "Minimal-Loadout Control",
  desc: "Synthetic benchmarking control — not a real class.",

  baseAttributes: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 },
  baseHealth: 100,
  maxPerks: 1,
  maxSkills: 0,
  armorProficiency: ["cloth"],

  classResources: {},

  perks: [
    {
      id: "minimal_passive",
      type: "perk",
      name: "Minimal Passive",
      desc: "+1 physical power.",
      activation: "passive",
      effects: [
        { stat: "physicalPower", value: 1, phase: "pre_curve_flat" },
      ],
    },
  ],
  skills: [],
  spells: [],
};

export const MINIMAL_LOADOUT_BUILD = {
  klass: MINIMAL_LOADOUT_CLASS,
  gear: { weapon: { weaponType: "dagger", baseWeaponDmg: 10, gearWeaponDmg: 0 }, bonuses: {} },

  attributes: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 },

  selectedPerks:  ["minimal_passive"],
  selectedSkills: [],
  selectedSpells: [],

  activeBuffs: [],
  classResourceCounters: {},
  stackCounts: {},
  selectedTiers: {},
  playerStates: [],
  weaponType: "dagger",

  target: { pdr: 0, mdr: 0, headshotDR: 0, pen: 0 },
  hpFraction: 1.0,
};
