// character-shape-examples.js
//
// Concrete examples of CHARACTER_SHAPE + SESSION_SHAPE + CHARACTER_BUILD
// per the shape in `character-shape.js`. Warlock exemplar — project
// primary test class per CLAUDE.md.
//
// These examples pair with `src/data/gear/gear-shape-examples.js` for a
// full, validator-passing build scenario (Warlock + Spiked Gauntlet +
// Frostlight Crystal Sword, Demon Armor plate-grant active).

import {
  spectralBladeInstance,
  frostlightCrystalSwordInstance,
  foulBootsInstance,
  spikedGauntletInstance,
  ITEM_DEFINITIONS,
} from "../gear/gear-shape-examples.js";

// ── Character: minimal Warlock ────────────────────────────────────

export const warlockCharacter = {
  characterId: "char_warlock_01",
  name:        "Test Warlock",
  religion:    "none",
  className:   "warlock",

  attributes: {
    str: 15, vig: 15, agi: 15, dex: 15, wil: 15, kno: 15, res: 15,
  },

  persistentSelections: {
    selectedPerks:     ["demon_armor", "torture_mastery"],
    selectedSkills:    ["phantomize"],
    selectedSpells:    ["bolt_of_darkness", "hellfire"],
    equippedLoadoutId: "loadout_warlock_01",
  },
};

// ── Session: idle snapshot (no buffs active) ──────────────────────

export const idleSession = {
  activeBuffs:           [],
  classResourceCounters: { soul_shards: 0 },
  stackCounts:           {},
  selectedTiers:         { bolt_of_darkness: "good" },
  playerStates:          [],
  viewingAfterEffect:    [],

  weaponHeldState: "slot1",          // Frostlight Crystal Sword held
  hpFraction:      1.0,

  target: {
    pdr: 0.15, mdr: 0.10, headshotDR: 0,
  },
  environment:  {},
  applyToSelf:  {},
  applyToEnemy: {},
};

// ── Session: active Demon Armor + Blood Pact (plate granted) ──────

export const demonArmorActiveSession = {
  activeBuffs:           ["demon_armor", "blood_pact"],
  classResourceCounters: { soul_shards: 1 },
  stackCounts:           { blood_pact: 1 },
  selectedTiers:         { bolt_of_darkness: "perfect" },
  playerStates:          [],
  viewingAfterEffect:    [],

  weaponHeldState: "slot1",
  hpFraction:      0.75,

  target: {
    pdr: 0.50, mdr: 0.20, headshotDR: 0.10, creatureType: "demon",
  },
  environment:  {},
  applyToSelf:  { demon_armor: true },
  applyToEnemy: {},
};

// ── Loadout: two-loadout Warlock with Frostlight primary + Spiked
// Gauntlet hands + Spectral Blade as slot2 primary alt + Foul Boots.
// Illustrates held-state dormancy (L6) — off-loadout primary contributes
// nothing when normalizer picks slot1. ─────────────────────────────

export const warlockLoadout = {
  id: "loadout_warlock_01",
  slots: {
    weaponSlot1: {
      primary:   frostlightCrystalSwordInstance,  // held when weaponHeldState=slot1
      secondary: null,                             // 2H primary → secondary must be null
    },
    weaponSlot2: {
      primary:   spectralBladeInstance,           // dormant when weaponHeldState=slot1
      secondary: null,
    },
    head:     null,
    chest:    null,
    back:     null,
    hands:    spikedGauntletInstance,             // plate — requires Demon Armor grant for Warlock
    legs:     null,
    feet:     foulBootsInstance,
    ring1:    null,
    ring2:    null,
    necklace: null,
  },
};

// ── Full CHARACTER_BUILD — normalizer input (for 6.5c.2 smoke test) ──

export const warlockBuild = {
  character:       warlockCharacter,
  session:         demonArmorActiveSession,
  loadout:         warlockLoadout,
  itemInstances: {
    [spectralBladeInstance.definitionId]:            spectralBladeInstance,
    [frostlightCrystalSwordInstance.definitionId]:   frostlightCrystalSwordInstance,
    [foulBootsInstance.definitionId]:                foulBootsInstance,
    [spikedGauntletInstance.definitionId]:           spikedGauntletInstance,
  },
  itemDefinitions: ITEM_DEFINITIONS,
};
