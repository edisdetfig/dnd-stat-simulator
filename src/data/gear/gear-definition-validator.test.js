// gear-definition-validator.test.js — drives validateGearDefinition over
// the anchor items + exercises per-rule negative fixtures. Parallels
// `src/data/classes/class-shape-validator.test.js`.

import { describe, it, expect } from "vitest";
import { validateGearDefinition, validateAllGearDefinitions } from "./gear-definition-validator.js";
import {
  spectralBlade,
  frostlightCrystalSword,
  foulBoots,
  spikedGauntlet,
  ITEM_DEFINITIONS,
} from "./gear-shape-examples.js";

// ── Happy-path (anchor items, all 4 should validate clean) ─────────

describe("gear-definition-validator — anchor items", () => {
  it("Spectral Blade validates with zero errors", () => {
    expect(validateGearDefinition(spectralBlade)).toEqual([]);
  });
  it("Frostlight Crystal Sword validates with zero errors", () => {
    expect(validateGearDefinition(frostlightCrystalSword)).toEqual([]);
  });
  it("Foul Boots validates with zero errors", () => {
    expect(validateGearDefinition(foulBoots)).toEqual([]);
  });
  it("Spiked Gauntlet validates with zero errors", () => {
    expect(validateGearDefinition(spikedGauntlet)).toEqual([]);
  });
  it("validateAllGearDefinitions returns clean byId map", () => {
    const { byId } = validateAllGearDefinitions(ITEM_DEFINITIONS);
    for (const [itemId, errs] of Object.entries(byId)) {
      expect(errs, `${itemId} should have no errors`).toEqual([]);
    }
  });
});

// ── Per-rule failure fixtures ─────────────────────────────────────

function rulesOf(errs) {
  return errs.map(e => e.rule);
}

describe("gear-definition-validator — D.required", () => {
  it("flags missing id / name / slotType / availableRarities", () => {
    const bad = {};
    const errs = validateGearDefinition(bad);
    expect(rulesOf(errs)).toContain("D.required");
  });
});

describe("gear-definition-validator — D.slotType", () => {
  it("flags unknown slotType", () => {
    const bad = { ...foulBoots, slotType: "unknownSlot" };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.slotType");
  });
});

describe("gear-definition-validator — D.armorType / D.weaponType / D.handType", () => {
  it("flags unknown armorType", () => {
    const bad = { ...foulBoots, armorType: "mithril" };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.armorType");
  });
  it("flags unknown weaponType in array", () => {
    const bad = { ...frostlightCrystalSword, weaponType: ["sword", "bogusType"] };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.weaponType");
  });
  it("flags unknown handType", () => {
    const bad = { ...spectralBlade, handType: "threeHanded" };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.handType");
  });
});

describe("gear-definition-validator — axis consistency", () => {
  it("flags missing weaponType on a weapon slot", () => {
    const bad = { ...spectralBlade, weaponType: null };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.weaponTypeOnWeaponOnly");
  });
  it("flags armorType set on a weapon slot", () => {
    const bad = { ...spectralBlade, armorType: "plate" };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.armorTypeOnArmorOnly");
  });
  it("flags weaponType set on an armor slot", () => {
    const bad = { ...foulBoots, weaponType: "sword" };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.weaponTypeOnWeaponOnly");
  });
  it("flags requiredClasses on jewelry (L9)", () => {
    const badRing = {
      id: "bad_ring",
      name: "Bad Ring",
      slotType: "ring",
      armorType: null,
      weaponType: null,
      handType: null,
      requiredClasses: ["wizard"],
      availableRarities: ["rare"],
      modifierCountOverrides: {},
      inherentStats: [],
      socketExclusionOverrides: [],
      onHitEffects: [],
    };
    expect(rulesOf(validateGearDefinition(badRing))).toContain("D.jewelryNoRequiredClasses");
  });
});

describe("gear-definition-validator — rarity / modCountOverrides", () => {
  it("flags empty availableRarities", () => {
    const bad = { ...foulBoots, availableRarities: [] };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.availableRarities");
  });
  it("flags unknown rarity in availableRarities", () => {
    const bad = { ...foulBoots, availableRarities: ["mythic"] };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.availableRarities");
  });
  it("flags modifierCountOverrides referencing a rarity not in availableRarities", () => {
    const bad = { ...foulBoots, modifierCountOverrides: { epic: 4 } };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.modifierCountOverridesKey");
  });
  it("flags craftable non-boolean", () => {
    const bad = { ...foulBoots, craftable: "yes" };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.craftableFlag");
  });
});

describe("gear-definition-validator — inherent stats", () => {
  it("flags unknown inherent stat", () => {
    const bad = { ...foulBoots, inherentStats: [{ stat: "bogusStat", value: 1, unit: "flat" }] };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.inherentStat");
  });
  it("flags both `value` and `{min,max}` authored on same inherent", () => {
    const bad = { ...foulBoots, inherentStats: [{ stat: "moveSpeed", value: 6, min: 5, max: 7, unit: "flat" }] };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.inherentFormExclusive");
  });
  it("flags unit mismatch with STAT_META", () => {
    // moveSpeed is STAT_META unit "flat"; author as "percent" -> mismatch
    const bad = { ...foulBoots, inherentStats: [{ stat: "moveSpeed", value: 6, unit: "percent" }] };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.inherentUnit");
  });
  it("flags min > max on ranged inherent", () => {
    const bad = { ...foulBoots, inherentStats: [{ stat: "moveSpeed", min: 10, max: 5, unit: "flat" }] };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.inherentRange");
  });
});

describe("gear-definition-validator — inherentWeaponProperties", () => {
  it("flags weapon properties on a non-weapon item", () => {
    const bad = { ...foulBoots, inherentWeaponProperties: { combos: [] } };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.inherentWeaponPropsOnWeapon");
  });
  it("flags non-array `combos`", () => {
    const bad = { ...spectralBlade, inherentWeaponProperties: { ...spectralBlade.inherentWeaponProperties, combos: "not-an-array" } };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.inherentWeaponPropsShape");
  });
});

describe("gear-definition-validator — socketExclusionOverrides", () => {
  it("flags unknown stat in overrides", () => {
    const bad = { ...foulBoots, socketExclusionOverrides: ["bogusStat"] };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.socketExclusionOverrides");
  });
  it("flags a never-socketable stat attempted as override", () => {
    const bad = { ...foulBoots, socketExclusionOverrides: ["moveSpeed"] };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.neverSocketable");
  });
});

describe("gear-definition-validator — onHitEffects", () => {
  it("flags unknown damageType", () => {
    const bad = {
      ...spikedGauntlet,
      onHitEffects: [{ damage: 1, damageType: "true_physical", trueDamage: true, scaling: 1, separateInstance: false }],
    };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.onHitDamageType");
  });
  it("flags scaling out of [0, 1]", () => {
    const bad = {
      ...spikedGauntlet,
      onHitEffects: [{ damage: 1, damageType: "physical", trueDamage: true, scaling: 2.0, separateInstance: false }],
    };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.onHitScaling");
  });
  it("flags missing trueDamage boolean", () => {
    const bad = {
      ...spikedGauntlet,
      onHitEffects: [{ damage: 1, damageType: "physical", scaling: 1, separateInstance: false }],
    };
    expect(rulesOf(validateGearDefinition(bad))).toContain("D.onHitEffectShape");
  });
});
