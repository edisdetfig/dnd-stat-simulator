// Unit tests for uiSurfaceRules — verify the Warlock anchor fixture
// surfaces the expected data-derived UI rules.

import { describe, it, expect } from "vitest";
import {
  findAbilityById,
  abilityReferencesHpBelow,
  abilityResourceRefs,
  abilityHasEitherTarget,
  abilityHasNonTrivialAfterEffect,
  buildReferencesHpBelow,
  buildResourceRefs,
  buildConditionCtxForUi,
  classResourceConditionPasses,
} from "./uiSurfaceRules.js";
import { warlockBloodTitheBuild } from "../fixtures/warlock-blood-tithe.fixture.js";
import { getClass } from "../data/classes/index.js";
import { normalizeBuild } from "../engine/normalizeBuild.js";
import { runSnapshot } from "../engine/runSnapshot.js";

const classData = getClass(warlockBloodTitheBuild.character.className);

describe("per-ability predicates (Warlock anchors)", () => {
  it("immortal_lament references hp_below", () => {
    const a = findAbilityById(classData, "immortal_lament");
    expect(abilityReferencesHpBelow(a)).toBe(true);
  });

  it("demon_armor does not reference hp_below", () => {
    const a = findAbilityById(classData, "demon_armor");
    expect(abilityReferencesHpBelow(a)).toBe(false);
  });

  it("soul_collector references darkness_shards", () => {
    const a = findAbilityById(classData, "soul_collector");
    expect(abilityResourceRefs(a).has("darkness_shards")).toBe(true);
  });

  it("blood_pact references blood_pact_locked_shards", () => {
    const a = findAbilityById(classData, "blood_pact");
    expect(abilityResourceRefs(a).has("blood_pact_locked_shards")).toBe(true);
  });

  it("power_of_sacrifice has a target:'either' atom", () => {
    const a = findAbilityById(classData, "power_of_sacrifice");
    expect(abilityHasEitherTarget(a)).toBe(true);
  });

  it("eldritch_shield has a non-trivial afterEffect", () => {
    const a = findAbilityById(classData, "eldritch_shield");
    expect(abilityHasNonTrivialAfterEffect(a)).toBe(true);
  });

  it("demon_armor has no afterEffect", () => {
    const a = findAbilityById(classData, "demon_armor");
    expect(abilityHasNonTrivialAfterEffect(a)).toBe(false);
  });
});

describe("build-level aggregates on anchor fixture", () => {
  const classData = getClass(warlockBloodTitheBuild.character.className);
  const flat = normalizeBuild({ ...warlockBloodTitheBuild, classData });
  const snap = runSnapshot(flat);

  it("anchor build references hp_below (via immortal_lament)", () => {
    expect(buildReferencesHpBelow(classData, snap.availableAbilityIds)).toBe(true);
  });

  it("anchor build references darkness_shards + blood_pact_locked_shards", () => {
    const refs = buildResourceRefs(classData, snap.availableAbilityIds);
    expect(refs.has("darkness_shards")).toBe(true);
    expect(refs.has("blood_pact_locked_shards")).toBe(true);
  });
});

describe("classResource condition evaluation via minimal UI ctx", () => {
  const classData = getClass(warlockBloodTitheBuild.character.className);
  const flat = normalizeBuild({ ...warlockBloodTitheBuild, classData });
  const snap = runSnapshot(flat);
  const uiCtx = buildConditionCtxForUi({
    character: warlockBloodTitheBuild.character,
    session:   warlockBloodTitheBuild.session,
    snapshot:  snap,
    classData,
  });

  it("darkness_shards is visible (soul_collector is selected)", () => {
    const def = classData.classResources.darkness_shards;
    expect(classResourceConditionPasses(def, uiCtx)).toBe(true);
  });

  it("blood_pact_locked_shards is hidden when blood_pact is not in activeBuffs", () => {
    const def = classData.classResources.blood_pact_locked_shards;
    expect(classResourceConditionPasses(def, uiCtx)).toBe(false);
  });

  it("blood_pact_locked_shards becomes visible when blood_pact is in activeBuffs", () => {
    // Simulate toggling blood_pact on, re-running the snapshot.
    const liveBuild = {
      ...warlockBloodTitheBuild,
      session: {
        ...warlockBloodTitheBuild.session,
        activeBuffs: ["blood_pact"],
      },
    };
    const liveFlat = normalizeBuild({ ...liveBuild, classData });
    const liveSnap = runSnapshot(liveFlat);
    const liveCtx = buildConditionCtxForUi({
      character: liveBuild.character,
      session:   liveBuild.session,
      snapshot:  liveSnap,
      classData,
    });
    const def = classData.classResources.blood_pact_locked_shards;
    expect(classResourceConditionPasses(def, liveCtx)).toBe(true);
  });
});
