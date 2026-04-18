// character-shape-validator.test.js — happy + per-rule negative fixtures.

import { describe, it, expect } from "vitest";
import { validateCharacter } from "./character-shape-validator.js";
import { warlockCharacter } from "./character-shape-examples.js";

function rulesOf(errs) { return errs.map(e => e.rule); }

// ── Happy-path ────────────────────────────────────────────────────

describe("character-shape-validator — warlockCharacter", () => {
  it("validates clean", () => {
    expect(validateCharacter(warlockCharacter)).toEqual([]);
  });
});

describe("character-shape-validator — Phase 7 anchor fixture integration", () => {
  it("validates the Phase 7 Warlock anchor character with zero errors", async () => {
    const { warlockBloodTitheBuild } = await import("../../fixtures/warlock-blood-tithe.fixture.js");
    expect(validateCharacter(warlockBloodTitheBuild.character)).toEqual([]);
  });
});

// ── Per-rule failures ─────────────────────────────────────────────

describe("character-shape-validator — CH.required", () => {
  it("flags missing required top-level fields", () => {
    const bad = {};
    expect(rulesOf(validateCharacter(bad))).toContain("CH.required");
  });
  it("flags missing fields inside persistentSelections", () => {
    const bad = { ...warlockCharacter, persistentSelections: {} };
    expect(rulesOf(validateCharacter(bad))).toContain("CH.required");
  });
});

describe("character-shape-validator — CH.religion", () => {
  it("flags unknown religion", () => {
    const bad = { ...warlockCharacter, religion: "cthulhu" };
    expect(rulesOf(validateCharacter(bad))).toContain("CH.religion");
  });
  it("accepts any RELIGION_BLESSINGS id", () => {
    const ok = { ...warlockCharacter, religion: "zorin" };
    expect(validateCharacter(ok)).toEqual([]);
  });
});

describe("character-shape-validator — CH.attributes", () => {
  it("flags missing core attribute", () => {
    const bad = { ...warlockCharacter, attributes: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10 } };
    expect(rulesOf(validateCharacter(bad))).toContain("CH.attributes");
  });
  it("flags non-numeric attribute", () => {
    const bad = { ...warlockCharacter, attributes: { ...warlockCharacter.attributes, str: "strong" } };
    expect(rulesOf(validateCharacter(bad))).toContain("CH.attributes");
  });
  it("flags unknown attribute key", () => {
    const bad = { ...warlockCharacter, attributes: { ...warlockCharacter.attributes, cha: 10 } };
    expect(rulesOf(validateCharacter(bad))).toContain("CH.attributes");
  });
  it("flags negative attribute value", () => {
    const bad = { ...warlockCharacter, attributes: { ...warlockCharacter.attributes, str: -1 } };
    expect(rulesOf(validateCharacter(bad))).toContain("CH.attributeValueRange");
  });
});

describe("character-shape-validator — CH.className / CH.name", () => {
  it("flags empty className", () => {
    const bad = { ...warlockCharacter, className: "" };
    expect(rulesOf(validateCharacter(bad))).toContain("CH.className");
  });
  it("flags empty name", () => {
    const bad = { ...warlockCharacter, name: "" };
    expect(rulesOf(validateCharacter(bad))).toContain("CH.name");
  });
});

describe("character-shape-validator — selection list types", () => {
  it("flags non-array selectedPerks", () => {
    const bad = { ...warlockCharacter, persistentSelections: { ...warlockCharacter.persistentSelections, selectedPerks: "demon_armor" } };
    expect(rulesOf(validateCharacter(bad))).toContain("CH.selectedPerks");
  });
  it("flags non-string entry in selectedSpells", () => {
    const bad = { ...warlockCharacter, persistentSelections: { ...warlockCharacter.persistentSelections, selectedSpells: [42] } };
    expect(rulesOf(validateCharacter(bad))).toContain("CH.selectedSpells");
  });
});

describe("character-shape-validator — CH.equippedLoadoutId", () => {
  it("accepts null", () => {
    const ok = { ...warlockCharacter, persistentSelections: { ...warlockCharacter.persistentSelections, equippedLoadoutId: null } };
    expect(validateCharacter(ok)).toEqual([]);
  });
  it("flags non-string non-null loadoutId", () => {
    const bad = { ...warlockCharacter, persistentSelections: { ...warlockCharacter.persistentSelections, equippedLoadoutId: 42 } };
    expect(rulesOf(validateCharacter(bad))).toContain("CH.equippedLoadoutId");
  });
});
