// Phase 7 cross-validator probe — calls all four validators on the
// anchor fixture in a single test, asserting [] from each. Makes the
// "every validator returns clean on the Warlock anchor fixture" claim
// visible and catchable in CI, not just via the per-validator tests.

import { describe, it, expect } from "vitest";
import { warlockBloodTitheBuild } from "./warlock-blood-tithe.fixture.js";
import { getClass } from "../data/classes/index.js";
import { validateCharacter }      from "../data/character/character-shape-validator.js";
import { validateCharacterGear }  from "../data/character/character-gear-validator.js";
import { validateGearDefinition } from "../data/gear/gear-definition-validator.js";
import { validateGearInstance }   from "../data/gear/gear-instance-validator.js";

describe("Phase 7 validator probe", () => {
  it("all four validators return [] on the anchor fixture", () => {
    const { character, session, loadout, itemInstances, itemDefinitions } = warlockBloodTitheBuild;
    const classData = getClass(character.className);

    const characterErrors     = validateCharacter(character);
    const characterGearErrors = validateCharacterGear({
      character, session, loadout, itemInstances, itemDefinitions, classData,
    });
    const definitionErrors = Object.fromEntries(
      Object.entries(itemDefinitions).map(([id, def]) => [id, validateGearDefinition(def)]),
    );
    const instanceErrors = Object.fromEntries(
      Object.entries(itemInstances).map(([id, inst]) => [
        id, validateGearInstance(inst, itemDefinitions[inst.definitionId]),
      ]),
    );

    expect({
      characterErrors,
      characterGearErrors,
      definitionErrors,
      instanceErrors,
    }).toEqual({
      characterErrors: [],
      characterGearErrors: [],
      definitionErrors: Object.fromEntries(Object.keys(itemDefinitions).map((id) => [id, []])),
      instanceErrors:   Object.fromEntries(Object.keys(itemInstances).map((id) => [id, []])),
    });
  });
});
