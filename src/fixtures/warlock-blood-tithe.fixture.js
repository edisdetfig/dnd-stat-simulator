// Phase 7 anchor fixture — Warlock "Blood Tithe" build.
//
// Authored in CharacterBuild shape (Phase 6.5c.1):
//   { character, session, loadout, itemInstances, itemDefinitions }
//
// Run through `normalizeBuild` (Phase 6.5c.2) → flat Build → `runSnapshot`
// (Phase 6) → Snapshot that Phase 7's App.jsx renders.
//
// Selection set is chosen to exercise every data-derived UI surface
// that Phase 7 must render per perspective.md principle 6:
//   - Immortal Lament → `hp_below` condition → HP-fraction slider surfaces.
//   - Power of Sacrifice → `target: "either"` atoms → apply-to-self/enemy
//     toggles surface.
//   - Eldritch Shield → non-trivial `afterEffect` → viewing-afterEffect
//     checkbox surfaces.
//   - Soul Collector + Spell Predation → `darkness_shards` counter surfaces.
//   - Blood Pact → `blood_pact_locked_shards` counter + grants
//     (exploitation_strike, exit_demon_form, bolt_of_darkness) surface.
//   - Vampirism → `healingMod: 0.20` → Life Drain heal displays Scenario B
//     (×1.20 lifesteal per docs/healing_verification.md).
//   - Demon Armor → `grants: { armorType: "plate" }` → validator accepts
//     Spiked Gauntlet (plate hands) for an otherwise leather/cloth class.
//
// Gear is the 4 currently-authored anchor items (see Phase 7 Plan Report
// Decision #2). Remaining slots are intentionally empty — magnitudes will
// be smaller than a full 10-piece loadout. Phase 7 acceptance gate is flow
// (no regression through the normalizer seam), not magnitude.
//
// Weapon variants (via session.weaponHeldState):
//   - "slot1"   → Frostlight Crystal Sword (sword + magicStuff, 2H, 13 weap
//                 dmg + 18 magic weap dmg; exercises the dual-type weapon
//                 normalization path).
//   - "slot2"   → Spectral Blade (sword, 2H, 40 weap dmg; primary combo
//                 VERIFIED per damage_formulas.md:211).
//   - "unarmed" → no weapon payload; exercises the `isUnarmed` flag that
//                 gates Blood Pact's bare-hand grant of Bolt of Darkness.

import { warlockLoadout } from "../data/character/character-shape-examples.js";
import {
  spectralBladeInstance,
  frostlightCrystalSwordInstance,
  foulBootsInstance,
  spikedGauntletInstance,
  ITEM_DEFINITIONS,
} from "../data/gear/gear-shape-examples.js";

// ── Character: Warlock with the Phase 7 anchor selections ─────────

export const warlockBloodTitheCharacter = {
  characterId: "char_warlock_blood_tithe",
  name:        "Blood Tithe",
  religion:    "none",
  className:   "warlock",

  // Class baseAttributes (warlock.new.js:15) are added inside the engine
  // via the class's own baseAttributes field. `character.attributes` is
  // the *gear-overlaid* attribute pool for the Character — here we start
  // identical to baseAttributes, letting the gear modifiers drive the
  // delta during normalization.
  attributes: {
    str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14,
  },

  persistentSelections: {
    // maxPerks: 4 (warlock.new.js:19)
    //   demon_armor       → plate grant (lets Spiked Gauntlet validate)
    //   immortal_lament   → hp_below condition (drives HP-fraction slider)
    //   vampirism         → healingMod +0.20 (drives Life Drain heal × 1.20)
    //   soul_collector    → darkness_shards resource consumer
    selectedPerks:  ["demon_armor", "immortal_lament", "vampirism", "soul_collector"],

    // maxSkills: 2 (warlock.new.js:20)
    //   blood_pact       → toggle form; grants exploitation_strike /
    //                      exit_demon_form / (unarmed-gated) bolt_of_darkness;
    //                      locks blood_pact_locked_shards.
    //   spell_memory_1   → +5 spell-pool memory (abilityType: "spell"). Needed
    //                      because the spell set below sums to 13 memoryCost
    //                      and base Warlock memoryCapacity is ~9 — without
    //                      this skill, Life Drain locks out of the spell
    //                      pool and the Phase 6.5d lifesteal heal demo
    //                      cannot fire. Deviation from the signed-off plan
    //                      (originally `blow_of_corruption`) — flagged in
    //                      Completion Report §Deviations.
    selectedSkills: ["blood_pact", "spell_memory_1"],

    // Spells (memoryCost sum = 1+5+3+4 = 13). Whether all fit in the live
    // memory pool depends on the kno-driven memoryCapacity recipe; any
    // overflow routes into snapshot.memoryBudget.spell.lockedOut[] and
    // renders grayed in AvailableAbilitiesPanel — which is itself a Phase 7
    // demonstration surface.
    //   power_of_sacrifice → target:"either" atom anchor
    //   eldritch_shield    → non-trivial afterEffect anchor
    //   spell_predation    → darkness_shards second consumer
    //   life_drain         → lifestealRatio: 1.0 anchor (Phase 6.5d)
    selectedSpells: ["power_of_sacrifice", "eldritch_shield", "spell_predation", "life_drain"],

    equippedLoadoutId: warlockLoadout.id,
  },
};

// ── Session: Training-Dummy target, no buffs active, HP 100% ──────

export const warlockBloodTitheSession = {
  activeBuffs:           [],
  classResourceCounters: { darkness_shards: 0, blood_pact_locked_shards: 0 },
  stackCounts:           {},
  selectedTiers:         {},
  playerStates:          [],
  viewingAfterEffect:    [],

  // Default weapon: Frostlight Crystal Sword in slot1. User can toggle to
  // slot2 (Spectral Blade) or "unarmed" via the WeaponHeldSwitcher.
  weaponHeldState: "slot1",
  hpFraction:      1.0,

  // Training Dummy per Phase 7 prompt nuance §6:
  //   pdr: -22%, mdr: 6%, headshotDR: 0.
  //   creatureType: null (not demon/undead).
  //   maxHealth defaults to 100 inside buildContext when undefined.
  target: {
    pdr:          -0.22,
    mdr:           0.06,
    headshotDR:    0,
    creatureType:  null,
  },
  environment:  {},
  applyToSelf:  {},
  applyToEnemy: {},
};

// ── CHARACTER_BUILD composition — the object normalizeBuild consumes ──

export const warlockBloodTitheBuild = {
  character:       warlockBloodTitheCharacter,
  session:         warlockBloodTitheSession,
  loadout:         warlockLoadout,
  itemInstances: {
    [spectralBladeInstance.definitionId]:          spectralBladeInstance,
    [frostlightCrystalSwordInstance.definitionId]: frostlightCrystalSwordInstance,
    [foulBootsInstance.definitionId]:              foulBootsInstance,
    [spikedGauntletInstance.definitionId]:         spikedGauntletInstance,
  },
  itemDefinitions: ITEM_DEFINITIONS,
};
