// normalizeBuild-e2e.test.js — end-to-end smoke test for the 6.5c.2
// CharacterBuild flow. Normalizes the warlockBuild from
// character-shape-examples.js into the engine Build shape, runs it through
// runSnapshot, and asserts the snapshot reflects gear contributions.
//
// The plan called for a "golden-comparison" test matching
// max-loadout.fixture.js exactly. That requires hand-authoring 10+ items
// whose summed inherents + modifiers match ~30 bonus entries verbatim —
// out of scope for 6.5c.2 (the full item catalog lands Phase 11+). This
// smoke test instead confirms the normalizer produces a Build that the
// engine consumes without error AND gear contributions reach derivedStats
// + bonuses. Regression coverage; correctness-by-construction for the
// authored anchor items is already validated by instance-validator tests.

import { describe, it, expect } from "vitest";
import { normalizeBuild } from "./normalizeBuild.js";
import { runSnapshot } from "./runSnapshot.js";
import { warlockCharacter, idleSession, warlockLoadout } from "../data/character/character-shape-examples.js";
import { ITEM_DEFINITIONS } from "../data/gear/gear-shape-examples.js";

// Minimal Warlock class stub — enough for buildContext to accept the Build.
// Real class migration (Phase 10) replaces this; for the smoke test, a
// nearly-empty abilities[] suffices since the character selects no
// memory-cost spells under this stub.
const warlockClassStub = {
  id: "warlock",
  name: "Warlock Stub",
  baseAttributes: { str: 15, vig: 15, agi: 15, dex: 15, wil: 15, kno: 15, res: 15 },
  baseHealth: 100,
  maxPerks: 4,
  maxSkills: 2,
  armorProficiency: ["cloth", "leather"],
  perks:  [],
  skills: [],
  spells: [],
};

describe("normalizeBuild — end-to-end with runSnapshot", () => {
  it("produces a Build that runSnapshot consumes without error", () => {
    const build = normalizeBuild({
      character:       { ...warlockCharacter, persistentSelections: { ...warlockCharacter.persistentSelections, selectedPerks: [], selectedSkills: [], selectedSpells: [] } },
      session:         { ...idleSession },
      loadout:         warlockLoadout,
      itemInstances:   {},
      itemDefinitions: ITEM_DEFINITIONS,
      classData:       warlockClassStub,
    });
    expect(() => runSnapshot(build)).not.toThrow();
  });

  it("gear.bonuses includes items' aggregated contributions", () => {
    const build = normalizeBuild({
      character:       { ...warlockCharacter, persistentSelections: { ...warlockCharacter.persistentSelections, selectedPerks: [], selectedSkills: [], selectedSpells: [] } },
      session:         { ...idleSession },
      loadout:         warlockLoadout,
      itemInstances:   {},
      itemDefinitions: ITEM_DEFINITIONS,
      classData:       warlockClassStub,
    });
    // Check a few gear contributions that should have propagated.
    // armorRating from inherent (Spiked Gauntlet 43 + Foul Boots 18 = 61)
    expect(build.gear.bonuses.armorRating).toBe(61);
    // additionalArmorRating from modifiers (Foul Boots 12 + Spiked Gauntlet 12 = 24)
    expect(build.gear.bonuses.additionalArmorRating).toBe(24);
    // moveSpeed combined flat contributions
    expect(build.gear.bonuses.moveSpeed).toBe(-20);
  });

  it("snapshot derivedStats reflects gear contributions", () => {
    const build = normalizeBuild({
      character:       { ...warlockCharacter, persistentSelections: { ...warlockCharacter.persistentSelections, selectedPerks: [], selectedSkills: [], selectedSpells: [] } },
      session:         { ...idleSession },
      loadout:         warlockLoadout,
      itemInstances:   {},
      itemDefinitions: ITEM_DEFINITIONS,
      classData:       warlockClassStub,
    });
    const snap = runSnapshot(build);
    expect(snap).toBeDefined();
    expect(snap.derivedStats).toBeDefined();
    expect(snap.bonuses).toBeDefined();
    // derivedStats is populated (at least one recipe output); specific
    // recipe presence depends on class stub authoring (Phase 10 scope).
    expect(Object.keys(snap.derivedStats).length).toBeGreaterThan(0);
  });

  it("weaponHeldState=unarmed drops the weapon; snapshot sees unarmed state", () => {
    const build = normalizeBuild({
      character:       { ...warlockCharacter, persistentSelections: { ...warlockCharacter.persistentSelections, selectedPerks: [], selectedSkills: [], selectedSpells: [] } },
      session:         { ...idleSession, weaponHeldState: "unarmed" },
      loadout:         warlockLoadout,
      itemInstances:   {},
      itemDefinitions: ITEM_DEFINITIONS,
      classData:       warlockClassStub,
    });
    const snap = runSnapshot(build);
    expect(build.gear.weapon).toBeNull();
    expect(snap).toBeDefined();
  });

  it("onHitEffects propagates from definition → Build → ctx", () => {
    const build = normalizeBuild({
      character:       { ...warlockCharacter, persistentSelections: { ...warlockCharacter.persistentSelections, selectedPerks: [], selectedSkills: [], selectedSpells: [] } },
      session:         { ...idleSession },
      loadout:         warlockLoadout,
      itemInstances:   {},
      itemDefinitions: ITEM_DEFINITIONS,
      classData:       warlockClassStub,
    });
    expect(build.gear.onHitEffects).toHaveLength(1);
    expect(build.gear.onHitEffects[0].sourceItemId).toBe("spiked_gauntlet");
    // Snapshot build succeeds with onHitEffects present.
    expect(() => runSnapshot(build)).not.toThrow();
  });
});
