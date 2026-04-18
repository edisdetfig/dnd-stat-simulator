// gear-instance-validator.test.js — drives validateGearInstance over the
// anchor instances + per-rule negative fixtures.

import { describe, it, expect } from "vitest";
import { validateGearInstance, resolveModCount } from "./gear-instance-validator.js";
import {
  spectralBlade,
  frostlightCrystalSword,
  foulBoots,
  spikedGauntlet,
  spectralBladeInstance,
  frostlightCrystalSwordInstance,
  foulBootsInstance,
  spikedGauntletInstance,
} from "./gear-shape-examples.js";

function rulesOf(errs) { return errs.map(e => e.rule); }

// ── Happy-path ────────────────────────────────────────────────────

describe("gear-instance-validator — anchor instances", () => {
  it("Spectral Blade instance validates clean", () => {
    expect(validateGearInstance(spectralBladeInstance, spectralBlade)).toEqual([]);
  });
  it("Frostlight Crystal Sword instance validates clean", () => {
    expect(validateGearInstance(frostlightCrystalSwordInstance, frostlightCrystalSword)).toEqual([]);
  });
  it("Foul Boots instance validates clean (rare modCount=3 per override)", () => {
    expect(validateGearInstance(foulBootsInstance, foulBoots)).toEqual([]);
  });

  // Phase 7 anchor-fixture integration gate.
  it("validates every instance in the Phase 7 anchor fixture against its definition with zero errors", async () => {
    const { warlockBloodTitheBuild } = await import("../../fixtures/warlock-blood-tithe.fixture.js");
    const { itemInstances, itemDefinitions } = warlockBloodTitheBuild;
    for (const [id, inst] of Object.entries(itemInstances)) {
      const def = itemDefinitions[inst.definitionId];
      expect({ id, errors: validateGearInstance(inst, def) }).toEqual({ id, errors: [] });
    }
  });
  it("Spiked Gauntlet instance validates clean (epic + craftable → 4 modifiers)", () => {
    expect(validateGearInstance(spikedGauntletInstance, spikedGauntlet)).toEqual([]);
  });
});

// ── resolveModCount (OQ-D11) ─────────────────────────────────────

describe("resolveModCount — craftable + override rules", () => {
  it("override wins over craftable", () => {
    expect(resolveModCount(foulBoots, "rare")).toBe(3);
  });
  it("craftable adds +1 when no override", () => {
    // Spiked Gauntlet: epic (default 3) + craftable -> 4
    expect(resolveModCount(spikedGauntlet, "epic")).toBe(4);
  });
  it("no craftable, no override -> RARITY_CONFIG.modCount", () => {
    expect(resolveModCount(spectralBlade, "epic")).toBe(3);
  });
});

// ── Failure fixtures ─────────────────────────────────────────────

describe("gear-instance-validator — I.rarity", () => {
  it("flags rarity not in availableRarities", () => {
    const bad = { ...spectralBladeInstance, rarity: "legendary" };
    expect(rulesOf(validateGearInstance(bad, spectralBlade))).toContain("I.rarity");
  });
  it("flags unknown rarity string", () => {
    const bad = { ...spectralBladeInstance, rarity: "mythic" };
    expect(rulesOf(validateGearInstance(bad, spectralBlade))).toContain("I.rarity");
  });
});

describe("gear-instance-validator — I.definitionId", () => {
  it("flags mismatched definition id", () => {
    const errs = validateGearInstance(spectralBladeInstance, foulBoots);
    expect(rulesOf(errs)).toContain("I.definitionId");
  });
});

describe("gear-instance-validator — I.modCountMatch", () => {
  it("flags wrong modifier count", () => {
    const bad = { ...spectralBladeInstance, modifiers: spectralBladeInstance.modifiers.slice(0, 2) };
    expect(rulesOf(validateGearInstance(bad, spectralBlade))).toContain("I.modCountMatch");
  });
});

describe("gear-instance-validator — I.modifierPoolMembership", () => {
  it("flags stat not in weapon_twoHanded pool", () => {
    const bad = {
      ...spectralBladeInstance,
      modifiers: [
        { stat: "str", value: 2, unit: "flat", source: "natural" },     // not in 2H weapon pool
        ...spectralBladeInstance.modifiers.slice(1),
      ],
    };
    expect(rulesOf(validateGearInstance(bad, spectralBlade))).toContain("I.modifierPoolMembership");
  });
});

describe("gear-instance-validator — I.modifierSource", () => {
  it("flags invalid source", () => {
    const bad = {
      ...spectralBladeInstance,
      modifiers: [
        { stat: "physicalDamageBonus", value: 3, unit: "percent", source: "crafted" },
        spectralBladeInstance.modifiers[1],
        spectralBladeInstance.modifiers[2],
      ],
    };
    expect(rulesOf(validateGearInstance(bad, spectralBlade))).toContain("I.modifierSource");
  });
});

describe("gear-instance-validator — I.modifierValueRange", () => {
  it("flags natural-source value exceeding naturalRange.max", () => {
    const bad = {
      ...spectralBladeInstance,
      modifiers: [
        { stat: "physicalDamageBonus", value: 10, unit: "percent", source: "natural" }, // natural max 4
        spectralBladeInstance.modifiers[1],
        spectralBladeInstance.modifiers[2],
      ],
    };
    expect(rulesOf(validateGearInstance(bad, spectralBlade))).toContain("I.modifierValueRange");
  });
  it("flags socketed-source value exceeding socketRange.max", () => {
    const bad = {
      ...spectralBladeInstance,
      modifiers: [
        { stat: "actionSpeed", value: 5, unit: "percent", source: "socketed" }, // socket max 3.2
        { stat: "armorPenetration", value: 5, unit: "percent", source: "socketed" }, // in [3, 4.8]
        { stat: "physicalDamageBonus", value: 3, unit: "percent", source: "socketed" }, // in [2, 3.2]
      ],
    };
    expect(rulesOf(validateGearInstance(bad, spectralBlade))).toContain("I.modifierValueRange");
  });
});

describe("gear-instance-validator — I.modifierUniqueStat", () => {
  it("flags duplicate modifier stats", () => {
    const bad = {
      ...spectralBladeInstance,
      modifiers: [
        { stat: "physicalDamageBonus", value: 3, unit: "percent", source: "natural" },
        { stat: "physicalDamageBonus", value: 2, unit: "percent", source: "socketed" },
        { stat: "actionSpeed",         value: 3, unit: "percent", source: "socketed" },
      ],
    };
    expect(rulesOf(validateGearInstance(bad, spectralBlade))).toContain("I.modifierUniqueStat");
  });
});

describe("gear-instance-validator — I.exclusionGroup (ar_pdr)", () => {
  it("flags socketing both ar_pdr members", () => {
    const bad = {
      ...foulBootsInstance,
      modifiers: [
        { stat: "additionalArmorRating", value: 12, unit: "flat",    source: "socketed" },
        { stat: "physicalDamageReduction", value: 1, unit: "percent", source: "socketed" },
        { stat: "agi",                    value: 2, unit: "flat",    source: "natural"  },
      ],
    };
    expect(rulesOf(validateGearInstance(bad, foulBoots))).toContain("I.exclusionGroup");
  });
});

describe("gear-instance-validator — I.neverSocketable", () => {
  it("flags attempt to author moveSpeed as a modifier", () => {
    const bad = {
      ...foulBootsInstance,
      modifiers: [
        { stat: "moveSpeed", value: 2, unit: "flat", source: "socketed" },
        { stat: "agi",       value: 2, unit: "flat", source: "natural"  },
        { stat: "dex",       value: 2, unit: "flat", source: "natural"  },
      ],
    };
    expect(rulesOf(validateGearInstance(bad, foulBoots))).toContain("I.neverSocketable");
  });
});

describe("gear-instance-validator — I.uniqueRange3x", () => {
  it("applies 3× multiplier to natural range for unique rarity", () => {
    // Fabricate a unique-compatible item from Foul Boots by extending rarities.
    const uniqueCompatibleDef = { ...foulBoots, availableRarities: ["rare", "unique"], modifierCountOverrides: {} };
    const instance = {
      definitionId: "foul_boots",
      rarity: "unique",
      modifiers: [
        // agi pool feet naturalRange {1,3}; 3× → [3, 9]. 7 is legal.
        { stat: "agi", value: 7, unit: "flat", source: "natural" },
      ],
    };
    expect(rulesOf(validateGearInstance(instance, uniqueCompatibleDef))).not.toContain("I.uniqueRange3x");
  });
  it("flags unique-range value beyond 3× max", () => {
    const uniqueCompatibleDef = { ...foulBoots, availableRarities: ["rare", "unique"], modifierCountOverrides: {} };
    const instance = {
      definitionId: "foul_boots",
      rarity: "unique",
      modifiers: [
        // natural {1,3} → unique [3, 9]; value 20 is out.
        { stat: "agi", value: 20, unit: "flat", source: "natural" },
      ],
    };
    expect(rulesOf(validateGearInstance(instance, uniqueCompatibleDef))).toContain("I.uniqueRange3x");
  });
});
