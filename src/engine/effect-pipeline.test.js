import { describe, it, expect } from 'vitest';
import { buildEngineContext } from './context.js';
import { runEffectPipeline } from './effect-pipeline.js';
import { makeMockClass } from './__test-fixtures__/mockClass.js';
import { emptyGear } from './__test-fixtures__/mockGear.js';

function pipelineFor(classOverrides = {}, stateOverrides = {}) {
  const ctx = buildEngineContext({
    classData: makeMockClass(classOverrides),
    gear: emptyGear(),
    weaponHeldState: "none",
    ...stateOverrides,
  });
  return runEffectPipeline(ctx);
}

describe('runEffectPipeline — empty state', () => {
  it('returns gear-baseline attrs/bonuses unchanged', () => {
    const result = pipelineFor();
    expect(result.finalAttrs).toEqual({
      str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10,
    });
    expect(result.finalBonuses).toEqual({});
    expect(result.capOverrides).toEqual({});
    expect(result.trace).toEqual([]);
  });
});

describe('runEffectPipeline — pre_curve_flat routing', () => {
  it('CORE_ATTRS stat → finalAttrs', () => {
    const result = pipelineFor(
      { perks: [{ id: "a", type: "perk", name: "A",
        effects: [{ stat: "str", value: 5, phase: "pre_curve_flat" }] }] },
      { selectedPerks: ["a"] },
    );
    expect(result.finalAttrs.str).toBe(15);
    expect(result.finalBonuses.str).toBeUndefined();
  });

  it('non-core stat → finalBonuses', () => {
    const result = pipelineFor(
      { perks: [{ id: "a", type: "perk", name: "A",
        effects: [{ stat: "armorRating", value: 50, phase: "pre_curve_flat" }] }] },
      { selectedPerks: ["a"] },
    );
    expect(result.finalBonuses.armorRating).toBe(50);
    expect(result.finalAttrs.armorRating).toBeUndefined();
  });
});

describe('runEffectPipeline — attribute_multiplier', () => {
  it('Malice: +15% WIL bonus multiplies attrs.wil after pre_curve_flat', () => {
    const result = pipelineFor(
      { perks: [{ id: "malice", type: "perk", name: "Malice",
        effects: [{ stat: "wil", value: 0.15, phase: "attribute_multiplier" }] }] },
      { selectedPerks: ["malice"] },
    );
    expect(result.finalAttrs.wil).toBeCloseTo(11.5, 6);
  });

  it('all_attributes applies to all 7 core attrs', () => {
    const result = pipelineFor(
      { perks: [{ id: "curse", type: "perk", name: "Curse",
        effects: [{ stat: "all_attributes", value: -0.10, phase: "attribute_multiplier" }] }] },
      { selectedPerks: ["curse"] },
    );
    for (const a of ["str","vig","agi","dex","wil","kno","res"]) {
      expect(result.finalAttrs[a]).toBeCloseTo(9, 6);
    }
  });

  it('pre_curve_flat runs BEFORE attribute_multiplier (+5 STR, then ×1.15)', () => {
    const result = pipelineFor(
      { perks: [{ id: "a", type: "perk", name: "A",
        effects: [
          { stat: "str", value: 5, phase: "pre_curve_flat" },
          { stat: "str", value: 0.15, phase: "attribute_multiplier" },
        ] }] },
      { selectedPerks: ["a"] },
    );
    // 10 (base) + 5 (flat) = 15 → × 1.15 = 17.25
    expect(result.finalAttrs.str).toBeCloseTo(17.25, 6);
  });
});

describe('runEffectPipeline — post_curve, multiplicative_layer, type, healing', () => {
  it('post_curve accumulates to finalBonuses', () => {
    const result = pipelineFor(
      { perks: [{ id: "a", type: "perk", name: "A",
        effects: [
          { stat: "physicalDamageBonus", value: 0.10, phase: "post_curve" },
          { stat: "physicalDamageBonus", value: 0.05, phase: "post_curve" },
        ] }] },
      { selectedPerks: ["a"] },
    );
    expect(result.finalBonuses.physicalDamageBonus).toBeCloseTo(0.15, 6);
  });

  it('multiplicative_layer stacks multiplicatively (Antimagic × Antimagic)', () => {
    const result = pipelineFor(
      { perks: [{ id: "a", type: "perk", name: "A",
        effects: [
          { stat: "magicDamageTaken", value: 0.80, phase: "multiplicative_layer" },
          { stat: "magicDamageTaken", value: 0.80, phase: "multiplicative_layer" },
        ] }] },
      { selectedPerks: ["a"] },
    );
    // 0.80 × 0.80 = 0.64 (36% reduction)
    expect(result.multiplicativeLayers.magicDamageTaken).toBeCloseTo(0.64, 6);
  });

  it('type_damage_bonus keyed by damageType (additive)', () => {
    const result = pipelineFor(
      { perks: [
        { id: "a", type: "perk", name: "A", effects: [
          { stat: "typeDamageBonus", value: 0.20, phase: "type_damage_bonus", damageType: "dark_magical" } ]},
        { id: "b", type: "perk", name: "B", effects: [
          { stat: "typeDamageBonus", value: 0.10, phase: "type_damage_bonus", damageType: "dark_magical" } ]},
      ]},
      { selectedPerks: ["a", "b"] },
    );
    expect(result.typeDamageBonuses.dark_magical).toBeCloseTo(0.30, 6);
  });

  it('healing_modifier buckets by healType (additive within bucket)', () => {
    const result = pipelineFor(
      { perks: [{ id: "a", type: "perk", name: "A",
        effects: [
          { stat: "healingMod", value: 0.20, phase: "healing_modifier" },                    // "all"
          { stat: "healingMod", value: 1.00, phase: "healing_modifier", healType: "magical" },
        ] }] },
      { selectedPerks: ["a"] },
    );
    expect(result.healingMods.all).toBeCloseTo(0.20, 6);
    expect(result.healingMods.magical).toBeCloseTo(1.00, 6);
  });
});

describe('runEffectPipeline — cap_override', () => {
  it('Math.max wins; higher override replaces lower', () => {
    const result = pipelineFor(
      { perks: [
        { id: "iron_will", type: "perk", name: "Iron Will", effects: [
          { stat: "mdr", value: 0.75, phase: "cap_override" } ]},
        { id: "old_perk", type: "perk", name: "Old", effects: [
          { stat: "mdr", value: 0.72, phase: "cap_override" } ]},
      ]},
      { selectedPerks: ["iron_will", "old_perk"] },
    );
    expect(result.capOverrides.mdr).toBe(0.75);
  });
});

describe('runEffectPipeline — condition filtering', () => {
  it('skips effects whose ability condition fails', () => {
    const result = pipelineFor(
      { perks: [{ id: "form_perk", type: "perk", name: "FP",
        condition: { type: "form_active" },
        effects: [{ stat: "str", value: 5, phase: "pre_curve_flat" }] }] },
      { selectedPerks: ["form_perk"], activeForm: null },
    );
    expect(result.finalAttrs.str).toBe(10); // effect filtered out
  });

  it('skips effects whose effect-level condition fails', () => {
    const result = pipelineFor(
      { perks: [{ id: "lament", type: "perk", name: "Lament",
        effects: [{
          stat: "healingMod", value: 1.0, phase: "healing_modifier",
          healType: "magical",
          condition: { type: "hp_below", threshold: 0.05 },
        }] }] },
      { selectedPerks: ["lament"], hpPercent: 50 },
    );
    expect(result.healingMods.magical).toBe(0);
  });

  it('applies the effect when condition passes', () => {
    const result = pipelineFor(
      { perks: [{ id: "lament", type: "perk", name: "Lament",
        effects: [{
          stat: "healingMod", value: 1.0, phase: "healing_modifier",
          healType: "magical",
          condition: { type: "hp_below", threshold: 0.05 },
        }] }] },
      { selectedPerks: ["lament"], hpPercent: 3 },
    );
    expect(result.healingMods.magical).toBeCloseTo(1.0, 6);
  });
});

describe('runEffectPipeline — trace', () => {
  it('records source, ability, phase, and appliedValue per entry', () => {
    const result = pipelineFor(
      { perks: [{ id: "robust", type: "perk", name: "Robust",
        effects: [{ stat: "maxHealthBonus", value: 0.075, phase: "pre_curve_flat" }] }] },
      { selectedPerks: ["robust"] },
    );
    expect(result.trace).toEqual([{
      source: "perk", ability: "robust",
      stat: "maxHealthBonus", phase: "pre_curve_flat",
      appliedValue: 0.075, damageType: undefined, healType: undefined,
    }]);
  });
});
