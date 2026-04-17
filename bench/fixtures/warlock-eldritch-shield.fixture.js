// warlock-eldritch-shield — integration fixture for afterEffect short-circuit
// (LOCK E).
//
// Exercises: Stage 1 collectAtoms afterEffect toggle. When
// viewingAfterEffect includes "eldritch_shield", main-state atoms (shield,
// effects) drop; afterEffect.effects get collected (darkDamageBonus +0.30,
// spellCastingSpeed +0.50). Otherwise main-state flows normally.

import { warlock } from '../../src/data/classes/warlock.new.js';

export const WARLOCK_ELDRITCH_SHIELD_BUILD = {
  klass: warlock,
  attributes: { str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 },
  selectedPerks:  [],
  selectedSkills: [],
  selectedSpells: ["eldritch_shield"],
  activeBuffs:    ["eldritch_shield"],
  classResourceCounters: {},
  stackCounts:    {},
  selectedTiers:  {},
  playerStates:   [],
  target:         { pdr: 0, mdr: 0.075, headshotDR: 0, maxHealth: 100 },
  weaponType:     "spellbook",
  gear:           { weapon: { weaponType: "spellbook" }, bonuses: {} },
  hpFraction:     1.0,
  viewingAfterEffect: [],   // default — shield side; flip to ["eldritch_shield"] for afterEffect side.
};

// Assertions:
//   - viewingAfterEffect empty: shieldProjections contains Eldritch Shield's
//     25 magical absorb.
//   - viewingAfterEffect = ["eldritch_shield"]: shieldProjections empty;
//     perTypeBonuses.dark_magical += 0.30; bonuses.spellCastingSpeed.post_curve += 0.50.
