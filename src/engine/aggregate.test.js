import { describe, it, expect } from 'vitest';
import { aggregate, TYPED_STAT_TO_DAMAGE_TYPE } from './aggregate.js';

function ctx(overrides = {}) {
  return { applyToSelf: {}, applyToEnemy: {}, ...overrides };
}

function effect(fields) {
  return {
    materializedValue: fields.value ?? 0,
    source: { kind: "perk", abilityId: "a", className: "t" },
    atomId: "a:effects:0",
    ...fields,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Default per-phase routing
// ─────────────────────────────────────────────────────────────────────

describe('aggregate — default per-phase routing', () => {
  const phases = [
    "pre_curve_flat",
    "attribute_multiplier",
    "post_curve",
    "post_curve_multiplicative",
    "multiplicative_layer",
    "healing_modifier",
  ];

  for (const phase of phases) {
    it(`${phase}: bonuses[stat][phase] = sum of materialized values`, () => {
      const { bonuses } = aggregate([
        effect({ stat: "luck", value: 2, phase }),
        effect({ stat: "luck", value: 3, phase }),
      ], {}, ctx());
      expect(bonuses.luck[phase]).toBe(5);
    });
  }

  it('multiple atoms at different phases on the same stat stay bucketed', () => {
    const { bonuses } = aggregate([
      effect({ stat: "wil", value: 0.15, phase: "attribute_multiplier" }),
      effect({ stat: "wil", value: 5,    phase: "pre_curve_flat" }),
    ], {}, ctx());
    expect(bonuses.wil.attribute_multiplier).toBeCloseTo(0.15);
    expect(bonuses.wil.pre_curve_flat).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────
// type_damage_bonus → perTypeBonuses
// ─────────────────────────────────────────────────────────────────────

describe('aggregate — type_damage_bonus routing', () => {
  it('darkDamageBonus → perTypeBonuses.dark_magical', () => {
    const { perTypeBonuses, bonuses } = aggregate([
      effect({ stat: "darkDamageBonus", value: 0.20, phase: "type_damage_bonus" }),
    ], {}, ctx());
    expect(perTypeBonuses.dark_magical).toBeCloseTo(0.20);
    expect(bonuses.darkDamageBonus).toBeUndefined();   // not routed to bonuses
  });

  it('accumulates across atoms: Dark Enhancement 0.20 + Soul Collector × 3 shards 0.99', () => {
    const { perTypeBonuses } = aggregate([
      effect({ stat: "darkDamageBonus", value: 0.20, phase: "type_damage_bonus" }),
      effect({ stat: "darkDamageBonus", value: 0.99, phase: "type_damage_bonus" }),
    ], {}, ctx());
    expect(perTypeBonuses.dark_magical).toBeCloseTo(1.19);
  });

  it('all 11 typed-stat mappings are present in the dispatch table', () => {
    expect(Object.keys(TYPED_STAT_TO_DAMAGE_TYPE).sort()).toEqual([
      "airDamageBonus", "arcaneDamageBonus", "darkDamageBonus",
      "divineDamageBonus", "earthDamageBonus", "evilDamageBonus",
      "fireDamageBonus", "iceDamageBonus", "lightDamageBonus",
      "lightningDamageBonus", "spiritDamageBonus",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// post_cap_multiplicative_layer — condition preserved
// ─────────────────────────────────────────────────────────────────────

describe('aggregate — post_cap_multiplicative_layer routing', () => {
  it('preserves the atom condition for Stage 6 re-eval', () => {
    const cond = { type: "not", conditions: [
      { type: "damage_type", damageType: "divine_magical" },
    ]};
    const { postCapMultiplicativeLayers, bonuses } = aggregate([
      effect({ stat: "magicDamageTaken", value: 0.80,
        phase: "post_cap_multiplicative_layer", condition: cond }),
    ], {}, ctx());
    expect(postCapMultiplicativeLayers).toHaveLength(1);
    expect(postCapMultiplicativeLayers[0]).toMatchObject({
      stat: "magicDamageTaken",
      multiplier: 0.80,
      condition: cond,
    });
    // Should not also appear in bonuses.
    expect(bonuses.magicDamageTaken).toBeUndefined();
  });

  it('multiple post-cap layers accumulate as list entries', () => {
    const { postCapMultiplicativeLayers } = aggregate([
      effect({ stat: "magicDamageTaken", value: 0.80, phase: "post_cap_multiplicative_layer" }),
      effect({ stat: "magicDamageTaken", value: 0.90, phase: "post_cap_multiplicative_layer" }),
    ], {}, ctx());
    expect(postCapMultiplicativeLayers).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────────
// cap_override — capOverrides map (RECIPE_IDS)
// ─────────────────────────────────────────────────────────────────────

describe('aggregate — cap_override routing', () => {
  it('capOverrides[stat] = materializedValue; last write wins', () => {
    const { capOverrides, bonuses } = aggregate([
      effect({ stat: "pdr", value: 0.75, phase: "cap_override" }),
    ], {}, ctx());
    expect(capOverrides.pdr).toBe(0.75);
    expect(bonuses.pdr).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Gear bonuses → synthetic "gear" phase
// ─────────────────────────────────────────────────────────────────────

describe('aggregate — gear bonuses', () => {
  it('gear bonuses fold into bonuses[stat].gear', () => {
    const { bonuses } = aggregate([], {
      luck: 5, physicalDamageBonus: 0.10,
    }, ctx());
    expect(bonuses.luck.gear).toBe(5);
    expect(bonuses.physicalDamageBonus.gear).toBeCloseTo(0.10);
  });

  it('gear bonuses coexist with atom phases on same stat', () => {
    const { bonuses } = aggregate(
      [effect({ stat: "luck", value: 3, phase: "post_curve" })],
      { luck: 2 },
      ctx()
    );
    expect(bonuses.luck.post_curve).toBe(3);
    expect(bonuses.luck.gear).toBe(2);
  });

  it('skips zero-valued gear entries', () => {
    const { bonuses } = aggregate([], { luck: 0, physicalDamageBonus: 0.05 }, ctx());
    expect(bonuses.luck).toBeUndefined();
    expect(bonuses.physicalDamageBonus.gear).toBeCloseTo(0.05);
  });
});

// ─────────────────────────────────────────────────────────────────────
// target: "either" — dual-route
// ─────────────────────────────────────────────────────────────────────

describe('aggregate — target: "either" dual-routing', () => {
  it('default (applySelf=true, applyEnemy=false): routes to self only', () => {
    const { bonuses, enemyBonuses } = aggregate([
      effect({ stat: "luck", value: 2, phase: "post_curve", target: "either" }),
    ], {}, ctx());
    expect(bonuses.luck.post_curve).toBe(2);
    expect(enemyBonuses.luck).toBeUndefined();
  });

  it('applyToEnemy: true → routes to enemy bucket', () => {
    const { bonuses, enemyBonuses } = aggregate([
      effect({ stat: "luck", value: 2, phase: "post_curve", target: "either" }),
    ], {}, ctx({ applyToSelf: { a: false }, applyToEnemy: { a: true } }));
    expect(bonuses.luck).toBeUndefined();
    expect(enemyBonuses.luck.post_curve).toBe(2);
  });

  it('applyToSelf AND applyToEnemy both true → dual-route', () => {
    const { bonuses, enemyBonuses } = aggregate([
      effect({ stat: "luck", value: 2, phase: "post_curve", target: "either" }),
    ], {}, ctx({ applyToSelf: { a: true }, applyToEnemy: { a: true } }));
    expect(bonuses.luck.post_curve).toBe(2);
    expect(enemyBonuses.luck.post_curve).toBe(2);
  });

  it('both false → atom contributes nothing', () => {
    const { bonuses, enemyBonuses } = aggregate([
      effect({ stat: "luck", value: 2, phase: "post_curve", target: "either" }),
    ], {}, ctx({ applyToSelf: { a: false }, applyToEnemy: { a: false } }));
    expect(bonuses.luck).toBeUndefined();
    expect(enemyBonuses.luck).toBeUndefined();
  });

  it('enemy target routes to enemy bucket directly', () => {
    const { bonuses, enemyBonuses } = aggregate([
      effect({ stat: "physicalDamageReductionBonus", value: -0.15,
        phase: "post_curve", target: "enemy" }),
    ], {}, ctx());
    expect(enemyBonuses.physicalDamageReductionBonus.post_curve).toBeCloseTo(-0.15);
    expect(bonuses.physicalDamageReductionBonus).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Display-only atoms contribute nothing
// ─────────────────────────────────────────────────────────────────────

describe('aggregate — display-only atoms', () => {
  it('atom without stat/phase contributes nothing', () => {
    const { bonuses } = aggregate([
      { tags: ["detects_hidden"], source: { abilityId: "a" }, atomId: "a:effects:0" },
    ], {}, ctx());
    expect(Object.keys(bonuses)).toEqual([]);
  });
});
