// warlock-life-drain — integration fixture for Stage 6 lifesteal (post-DR
// basis) + projectHealing descriptor consumption.
//
// Exercises: DAMAGE_ATOM with lifestealRatio: 1.0 → DerivedHealDescriptor
// (healAmount = post-DR hit.body × lifestealRatio) → projectHealing with
// HealingMod from Vampirism. Family-collapse evil_magical → magical.
//
// Verified-source assertion this fixture backs:
//   Life Drain 100% lifesteal of post-DR damage, verified 2026-04-17.
//   See healing_verification.md §"Verification Data — Life Drain Lifesteal"
//   and unresolved_questions.md §"RESOLVED: Life Drain Heal Basis = Post-DR
//   Damage Dealt".

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
//   - descriptor.healAmount === post-DR body damage (hit.body of source atom)
//   - Final heal projection amount = healAmount × (1 + 0.20 Vampirism)
//     (healing_modifier). Engine surface is float; display-surface ceil is
//     a UI concern (Phase 7+), not this fixture.
