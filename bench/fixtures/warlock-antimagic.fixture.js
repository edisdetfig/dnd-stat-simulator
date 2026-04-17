// warlock-antimagic — integration fixture for post_cap_multiplicative_layer
// routing + Stage 6 per-projection condition re-evaluation.
//
// Exercises: Antimagic effect atom at post_cap_multiplicative_layer phase
// with `not(damage_type: divine_magical)` condition. Stage 2 passes through
// unfiltered (damage_type deferred). Stage 4 routes into
// postCapMultiplicativeLayers. Stage 6 re-evaluates per damage projection:
// dark_magical → multiplier applies; divine_magical → skipped.
//
// Verified-source assertion this fixture backs (plan §11.4):
//   V11: Antimagic 0.80 × non-divine post-MDR, 1.0 × divine (damage_formulas.md:180-188).

import { warlock } from '../../src/data/classes/warlock.new.js';

export const WARLOCK_ANTIMAGIC_BUILD = {
  klass: warlock,
  attributes: { str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 },
  selectedPerks:  ["antimagic", "malice"],
  selectedSkills: [],
  selectedSpells: ["bolt_of_darkness"],
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
//   - postCapMultiplicativeLayers has 1 entry (Antimagic) preserving the
//     not(damage_type: divine_magical) condition.
//   - BoD dark_magical damage projection has post-cap layer applied.
//   - The same atom against a divine_magical damage atom would NOT be reduced.
