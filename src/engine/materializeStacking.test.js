import { describe, it, expect } from 'vitest';
import { materializeStacking } from './materializeStacking.js';

function ctx(overrides = {}) {
  return {
    stackCounts: {},
    classResourceCounters: {},
    hpFraction: 1.0,
    attributes: { str: 15, vig: 10, agi: 10, dex: 10, wil: 22, kno: 10, res: 10 },
    ...overrides,
  };
}

function atoms(effects = [], damage = []) {
  return { effects, damage, heal: [], shield: [], grants: [], removes: [] };
}

function makeEffect(fields) {
  return {
    stat: "luck", value: 1, phase: "post_curve",
    source: { kind: "perk", abilityId: "test_ability", className: "t" },
    atomId: "test_ability:effects:0",
    ...fields,
  };
}

function makeDamage(fields) {
  return {
    base: 20, scaling: 1.0, damageType: "physical", target: "enemy",
    source: { kind: "spell", abilityId: "test_spell", className: "t" },
    atomId: "test_spell:damage:0",
    ...fields,
  };
}

// ─────────────────────────────────────────────────────────────────────
// maxStacks
// ─────────────────────────────────────────────────────────────────────

describe('materializeStacking — maxStacks', () => {
  it('uncapped count within maxStacks', () => {
    const out = materializeStacking(
      atoms([makeEffect({ maxStacks: 10, value: 2 })]),
      ctx({ stackCounts: { test_ability: 3 } })
    );
    expect(out.effects[0].materializedValue).toBe(6);
  });

  it('capped count >= maxStacks', () => {
    const out = materializeStacking(
      atoms([makeEffect({ maxStacks: 3, value: 0.05 })]),
      ctx({ stackCounts: { test_ability: 15 } })
    );
    expect(out.effects[0].materializedValue).toBeCloseTo(0.15);
  });

  it('stackCount absent → 0', () => {
    const out = materializeStacking(
      atoms([makeEffect({ maxStacks: 10, value: 2 })]),
      ctx()
    );
    expect(out.effects[0].materializedValue).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// resource
// ─────────────────────────────────────────────────────────────────────

describe('materializeStacking — resource', () => {
  it('reads classResourceCounters[resource]', () => {
    const out = materializeStacking(
      atoms([makeEffect({ resource: "darkness_shards", value: 0.33, stat: "darkDamageBonus",
        phase: "type_damage_bonus" })]),
      ctx({ classResourceCounters: { darkness_shards: 3 } })
    );
    expect(out.effects[0].materializedValue).toBeCloseTo(0.99);
  });

  it('resource counter unset → 0', () => {
    const out = materializeStacking(
      atoms([makeEffect({ resource: "darkness_shards", value: 0.33 })]),
      ctx()
    );
    expect(out.effects[0].materializedValue).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// No stacking — plain atoms
// ─────────────────────────────────────────────────────────────────────

describe('materializeStacking — plain atoms', () => {
  it('plain atom: materializedValue = value', () => {
    const out = materializeStacking(
      atoms([makeEffect({ value: 15 })]),
      ctx()
    );
    expect(out.effects[0].materializedValue).toBe(15);
  });

  it('plain atom: original value preserved', () => {
    const atomIn = makeEffect({ value: 15 });
    const out = materializeStacking(atoms([atomIn]), ctx());
    expect(out.effects[0].value).toBe(15);
    expect(atomIn.materializedValue).toBeUndefined();   // original not mutated
  });
});

// ─────────────────────────────────────────────────────────────────────
// scalesWith: hp_missing
// ─────────────────────────────────────────────────────────────────────

describe('materializeStacking — scalesWith: hp_missing', () => {
  it('Barbarian Berserker pattern: 0.60 hp → 4 steps × 0.02 = 0.08', () => {
    const out = materializeStacking(
      atoms([makeEffect({ value: 0,
        scalesWith: { type: "hp_missing", per: 10, valuePerStep: 0.02, maxValue: 0.20 } })]),
      ctx({ hpFraction: 0.60 })
    );
    expect(out.effects[0].materializedValue).toBeCloseTo(0.08);
  });

  it('caps at maxValue when missing exceeds step cap', () => {
    const out = materializeStacking(
      atoms([makeEffect({ value: 0,
        scalesWith: { type: "hp_missing", per: 10, valuePerStep: 0.02, maxValue: 0.20 } })]),
      ctx({ hpFraction: 0.0 })
    );
    expect(out.effects[0].materializedValue).toBeCloseTo(0.20);
  });

  it('0.10 hpFraction → 9 steps × 0.02 = 0.18 (under maxValue)', () => {
    const out = materializeStacking(
      atoms([makeEffect({ value: 0,
        scalesWith: { type: "hp_missing", per: 10, valuePerStep: 0.02, maxValue: 0.20 } })]),
      ctx({ hpFraction: 0.10 })
    );
    expect(out.effects[0].materializedValue).toBeCloseTo(0.18);
  });

  it('hpFraction 1.0 → no missing → 0', () => {
    const out = materializeStacking(
      atoms([makeEffect({ value: 0,
        scalesWith: { type: "hp_missing", per: 10, valuePerStep: 0.02, maxValue: 0.20 } })]),
      ctx({ hpFraction: 1.0 })
    );
    expect(out.effects[0].materializedValue).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// scalesWith: attribute (real curve)
// ─────────────────────────────────────────────────────────────────────

describe('materializeStacking — scalesWith: attribute', () => {
  it('Druid shapeshift: reads STAT_CURVES[shapeshiftPrimitive] at ctx.attributes.str', () => {
    const out = materializeStacking(
      atoms([], [makeDamage({
        base: 0, scaling: 0,
        scalesWith: { type: "attribute", curve: "shapeshiftPrimitive", attribute: "str" },
      })]),
      ctx({ attributes: { str: 15, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 } })
    );
    // effectiveBase is set (value from curve); doesn't matter what the exact
    // number is as long as it's a number (the curve is deep-structured).
    expect(typeof out.damage[0].effectiveBase).toBe("number");
    expect(out.damage[0].effectiveBase).not.toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// DAMAGE_ATOM: stackMultiplier
// ─────────────────────────────────────────────────────────────────────

describe('materializeStacking — damage atom stackMultiplier', () => {
  it('plain damage atom: stackMultiplier = 1', () => {
    const out = materializeStacking(atoms([], [makeDamage({})]), ctx());
    expect(out.damage[0].stackMultiplier).toBe(1);
  });

  it('maxStacks damage atom: stackMultiplier = stackCount', () => {
    const out = materializeStacking(
      atoms([], [makeDamage({ maxStacks: 10 })]),
      ctx({ stackCounts: { test_spell: 3 } })
    );
    expect(out.damage[0].stackMultiplier).toBe(3);
  });
});
