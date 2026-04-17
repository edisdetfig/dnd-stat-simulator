// warlock-bolt-of-darkness — integration fixture for Stage 1-6 end-to-end.
//
// Exercises: cast spell with perks (Dark Enhancement type_damage_bonus, Malice
// attribute_multiplier on wil). BoD damage projection end-to-end.
//
// Verified-source assertions this fixture can back (plan §11.4):
//   V7: BoD body spellbook + Dark Enhancement → 33 (damage_formulas.md:254)
//   V8: BoD head spellbook + Dark Enhancement → 49 (damage_formulas.md:255)

import { warlock } from '../../src/data/classes/warlock.new.js';

export const WARLOCK_BOD_BUILD = {
  klass: warlock,
  attributes: { str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 },
  selectedPerks:  ["dark_enhancement", "malice"],
  selectedSkills: [],
  selectedSpells: ["bolt_of_darkness"],
  activeBuffs:    [],
  classResourceCounters: {},
  stackCounts:    {},
  selectedTiers:  {},
  playerStates:   [],
  // Target: mdr 0.075 per Ruins Dummy test conditions; Warlock MPB 0.23 assumed
  // delivered via the wil=22 + Malice +15% attribute path (verified via deriveStats test).
  target:         { pdr: 0, mdr: 0.075, headshotDR: 0, maxHealth: 100 },
  weaponType:     "spellbook",
  gear:           { weapon: { weaponType: "spellbook" }, bonuses: {} },
  hpFraction:     1.0,
  // Spellbook adds +5 magical damage and 5% magic pen to gearWeapon.
  // These are threaded as private ctx fields consumed by projectDamage.
  _weaponMagicalDamageFlat: 5,
};

// Expected results for assertions (damage_formulas.md:254-255).
export const WARLOCK_BOD_EXPECTED = {
  V7_body: 33,
  V8_head: 49,
};
