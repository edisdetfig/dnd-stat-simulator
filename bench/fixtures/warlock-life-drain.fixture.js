// warlock-life-drain — integration fixture for Stage 6 lifesteal pre-MDR +
// projectHealing descriptor consumption.
//
// Exercises: DAMAGE_ATOM with lifestealRatio: 1.0 → DerivedHealDescriptor
// → projectHealing with HealingMod from Vampirism. Family-collapse
// evil_magical → magical.
//
// Verified-source assertion this fixture backs (plan §11.4):
//   V12: Life Drain 100% lifesteal of pre-MDR damage (unresolved_questions.md:270-278).

import { warlock } from '../../src/data/classes/warlock.new.js';

export const WARLOCK_LIFE_DRAIN_BUILD = {
  klass: warlock,
  attributes: { str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 },
  selectedPerks:  ["vampirism"],
  selectedSkills: [],
  selectedSpells: ["life_drain"],
  activeBuffs:    [],
  classResourceCounters: {},
  stackCounts:    {},
  selectedTiers:  {},
  playerStates:   [],
  target:         { pdr: 0, mdr: 0.075, headshotDR: 0, maxHealth: 100 },
  weaponType:     "spellbook",
  gear:           { weapon: { weaponType: "spellbook" }, bonuses: {} },
  hpFraction:     1.0,
};

// Assertions:
//   - derivedHealDescriptors length 1 (lifesteal from life_drain damage atom)
//   - descriptor.healType === "magical" (evil_magical → magical family-collapse)
//   - descriptor.healAmount === pre-MDR body damage (before MDR clamp)
//   - Final heal projection amount = healAmount × (1 + 0.20 Vampirism) (healing_modifier)
