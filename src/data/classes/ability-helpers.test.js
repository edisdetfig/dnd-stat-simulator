// Unit tests for findAbility + getAllAbilities. Covers the bug-class
// scenarios that the class of private lookupAbility implementations
// collectively exposed: null classData, missing containers,
// multi-container resolution, duplicate-id precedence, not-found.

import { describe, it, expect } from "vitest";
import { findAbility, getAllAbilities, ABILITY_CONTAINERS } from "./ability-helpers.js";

describe("findAbility", () => {
  it("returns null when classData is null or undefined", () => {
    expect(findAbility(null, "x")).toBeNull();
    expect(findAbility(undefined, "x")).toBeNull();
  });

  it("returns null when abilityId is null or empty", () => {
    expect(findAbility({ perks: [{ id: "a" }] }, null)).toBeNull();
    expect(findAbility({ perks: [{ id: "a" }] }, "")).toBeNull();
  });

  it("finds an ability in perks", () => {
    const cd = { perks: [{ id: "demon_armor", name: "Demon Armor" }] };
    expect(findAbility(cd, "demon_armor")).toEqual({ id: "demon_armor", name: "Demon Armor" });
  });

  it("finds an ability in skills when not in perks", () => {
    const cd = {
      perks: [{ id: "a" }],
      skills: [{ id: "blood_pact", name: "Blood Pact" }],
    };
    expect(findAbility(cd, "blood_pact")?.name).toBe("Blood Pact");
  });

  it("finds an ability in spells", () => {
    const cd = { spells: [{ id: "life_drain", name: "Life Drain" }] };
    expect(findAbility(cd, "life_drain")?.name).toBe("Life Drain");
  });

  it("finds an ability in mergedSpells", () => {
    const cd = { mergedSpells: [{ id: "fireball_merge", name: "Fireball Merge" }] };
    expect(findAbility(cd, "fireball_merge")?.name).toBe("Fireball Merge");
  });

  it("tolerates missing container keys (no throw)", () => {
    // Only skills present; perks / spells / mergedSpells are undefined.
    const cd = { skills: [{ id: "x" }] };
    expect(findAbility(cd, "x")?.id).toBe("x");
    expect(findAbility(cd, "unknown")).toBeNull();
  });

  it("tolerates non-array container values (no throw)", () => {
    const cd = { perks: null, skills: "oops", spells: [{ id: "y" }], mergedSpells: undefined };
    expect(findAbility(cd, "y")?.id).toBe("y");
  });

  it("resolves duplicate ids by container order: perks → skills → spells → mergedSpells", () => {
    const cd = {
      perks:   [{ id: "shared", source: "perks" }],
      skills:  [{ id: "shared", source: "skills" }],
      spells:  [{ id: "shared", source: "spells" }],
      mergedSpells: [{ id: "shared", source: "mergedSpells" }],
    };
    expect(findAbility(cd, "shared")?.source).toBe("perks");

    const cd2 = {
      skills: [{ id: "shared", source: "skills" }],
      spells: [{ id: "shared", source: "spells" }],
    };
    expect(findAbility(cd2, "shared")?.source).toBe("skills");
  });

  it("returns null for not-found ids", () => {
    const cd = { perks: [{ id: "a" }], skills: [{ id: "b" }] };
    expect(findAbility(cd, "nope")).toBeNull();
  });

  it("does NOT look at a `classData.abilities` flat field (fictional under class-shape)", () => {
    // Ensures the bug class can't silently "work" if someone adds an
    // `abilities` field: the helper deliberately ignores it.
    const cd = { abilities: [{ id: "mystery" }] };
    expect(findAbility(cd, "mystery")).toBeNull();
  });
});

describe("getAllAbilities", () => {
  it("returns [] for null classData", () => {
    expect(getAllAbilities(null)).toEqual([]);
    expect(getAllAbilities(undefined)).toEqual([]);
  });

  it("returns [] for a class with no containers", () => {
    expect(getAllAbilities({ id: "x" })).toEqual([]);
  });

  it("concatenates abilities in container order", () => {
    const cd = {
      perks:   [{ id: "p1" }, { id: "p2" }],
      skills:  [{ id: "s1" }],
      spells:  [{ id: "sp1" }],
      mergedSpells: [{ id: "m1" }],
    };
    expect(getAllAbilities(cd).map((a) => a.id))
      .toEqual(["p1", "p2", "s1", "sp1", "m1"]);
  });

  it("skips null entries inside a container", () => {
    const cd = { perks: [{ id: "p1" }, null, { id: "p2" }] };
    expect(getAllAbilities(cd).map((a) => a.id)).toEqual(["p1", "p2"]);
  });

  it("skips non-array containers gracefully", () => {
    const cd = { perks: [{ id: "a" }], skills: null, spells: "not an array" };
    expect(getAllAbilities(cd).map((a) => a.id)).toEqual(["a"]);
  });

  it("ignores a fictional flat `abilities` field", () => {
    const cd = { abilities: [{ id: "ghost" }], perks: [{ id: "real" }] };
    expect(getAllAbilities(cd).map((a) => a.id)).toEqual(["real"]);
  });
});

describe("ABILITY_CONTAINERS", () => {
  it("is the canonical container list, frozen and ordered", () => {
    expect(ABILITY_CONTAINERS).toEqual(["perks", "skills", "spells", "mergedSpells"]);
    expect(Object.isFrozen(ABILITY_CONTAINERS)).toBe(true);
  });
});
