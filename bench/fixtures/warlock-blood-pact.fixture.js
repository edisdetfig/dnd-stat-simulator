// warlock-blood-pact — integration fixture for grants chain + locked-shards
// counter + effect_active + weapon_type compound conditions.
//
// Exercises: Stage 0 availability resolver (Blood Pact grants 3 abilities,
// one gated on weapon_type: unarmed + effect_active); resource-scaled
// darkDamageBonus via blood_pact_locked_shards counter; Abyssal Flame AoE
// body-only; self-damage percentMaxHealth.

import { warlock } from '../../src/data/classes/warlock.new.js';

export const WARLOCK_BLOOD_PACT_BUILD = {
  klass: warlock,
  attributes: { str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 },
  selectedPerks:  ["soul_collector", "spell_predation"],
  selectedSkills: ["blood_pact"],
  selectedSpells: [],
  activeBuffs:    ["blood_pact"],
  classResourceCounters: { blood_pact_locked_shards: 3 },
  stackCounts:    {},
  selectedTiers:  {},
  playerStates:   [],
  target:         { pdr: 0, mdr: 0.075, headshotDR: 0, maxHealth: 100 },
  weaponType:     "unarmed",
  gear:           { weapon: null, bonuses: {} },
  isUnarmed:      true,
  hpFraction:     1.0,
};

// Assertions for the umbrella test:
//   - availableAbilityIds contains bolt_of_darkness, exploitation_strike, exit_demon_form
//     (granted by Blood Pact while unarmed).
//   - darkDamageBonus in perTypeBonuses reflects 3 shards × 0.33 = 0.99.
//   - allAttributes contribution: +3 (1 × 3 shards) from blood_pact_locked_shards.
