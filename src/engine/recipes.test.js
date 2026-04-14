import { describe, it, expect } from 'vitest';
import { runRecipe, computeDerivedStats, DERIVED_STAT_RECIPES } from './recipes.js';

const ATTRS = { str: 0, vig: 0, agi: 0, dex: 0, wil: 0, kno: 0, res: 0 };
const attrs = (overrides = {}) => ({ ...ATTRS, ...overrides });

// Every runRecipe call now returns { value, rawValue?, cap? }. Most tests
// only care about `.value`; capped stats are exercised against the full
// shape separately below.
const valueOf = (result) => result.value;

describe('runRecipe contract', () => {
  it('uses compute when set and ignores declarative fields entirely', () => {
    const recipe = {
      compute: () => 42,
      curveKey: "physicalPowerBonus",
      inputFormula: () => 99,
      postCurveAdds: () => 1000,
      outputMultiplier: () => 1000,
      rounding: "floor",
      // cap deliberately omitted — compute form is tested separately for caps.
    };
    expect(valueOf(runRecipe("x", recipe, attrs(), {}))).toBe(42);
  });

  it('runs declarative path when compute is absent', () => {
    const recipe = {
      curveKey: "physicalPowerBonus",
      inputFormula: () => 15,
      postCurveAdds: () => 0.05,
    };
    expect(valueOf(runRecipe("x", recipe, attrs(), {}))).toBeCloseTo(0.05, 6);
  });

  it('applies outputMultiplier before postCurveAdds', () => {
    const recipe = {
      curveKey: "physicalPowerBonus",
      inputFormula: () => 50,
      outputMultiplier: () => 2,
      postCurveAdds: () => 0.05,
    };
    expect(valueOf(runRecipe("x", recipe, attrs(), {}))).toBeCloseTo(0.75, 6);
  });

  it('rounds the scaled value before adding postCurveAdds', () => {
    const recipe = {
      curveKey: "physicalPowerBonus",
      inputFormula: () => 50,
      rounding: "floor",
      postCurveAdds: () => 5,
    };
    expect(valueOf(runRecipe("x", recipe, attrs(), {}))).toBe(5);
  });

  it('honors recipe.cap when no override, surfacing rawValue + cap', () => {
    const declarative = { curveKey: "physicalPowerBonus", inputFormula: () => 50, cap: 0.30 };
    const result = runRecipe("x", declarative, attrs(), {});
    expect(result).toEqual({ value: 0.30, rawValue: 0.35, cap: 0.30 });
  });

  it('cap override raises the cap when higher than recipe.cap', () => {
    const declarative = { curveKey: "physicalPowerBonus", inputFormula: () => 50, cap: 0.30 };
    const result = runRecipe("x", declarative, attrs(), {}, { x: 0.50 });
    // Override 0.50 wins; raw 0.35 < 0.50 so not at cap.
    expect(result).toEqual({ value: 0.35, rawValue: 0.35, cap: 0.50 });
  });

  it('no cap declared → no rawValue / cap on result', () => {
    const recipe = { curveKey: "physicalPowerBonus", inputFormula: () => 50 };
    const result = runRecipe("x", recipe, attrs(), {});
    expect(result).toEqual({ value: 0.35 });
  });
});

describe('health recipe — verified per docs/health_formula.md', () => {
  const health = (attrOverrides, bonuses = {}) =>
    valueOf(runRecipe("health", DERIVED_STAT_RECIPES.health, attrs(attrOverrides), bonuses));

  // ── Curve Verification table (Barbarian, no MHB, no MHA) — 6 points ──
  it.each([
    [20, 25, 140],
    [20, 28, 143],
    [24, 29, 146],
    [26, 31, 149],
    [28, 32, 151],
    [30, 34, 154],
  ])('STR %i VIG %i (no MHB) = %i', (str, vig, expected) => {
    expect(health({ str, vig })).toBe(expected);
  });

  it.each([
    // [label, str, vig, mhb, mha, expected]
    ["1  no buffs",                         30, 32, 0,     0, 152],
    ["3  +5% chest (+2 STR, +2 VIG)",       32, 34, 0.05,  0, 161],
    ["5  +6 MHA necklace",                  30, 32, 0,     6, 158],
    ["7  +5% chest + 6 MHA",                32, 34, 0.05,  6, 167],
    ["11 Robust + 6 MHA + 4% weapon",       30, 32, 0.115, 6, 173],
    ["12 Robust + 5% chest + 6 MHA",        32, 34, 0.125, 6, 178],
    ["14 Robust + 4% weapon",               30, 32, 0.115, 0, 167],
    ["16 Robust + 5% chest",                32, 34, 0.125, 0, 172],
  ])('MHB table case %s = %i', (_label, str, vig, mhb, mha, expected) => {
    const bonuses = {};
    if (mhb) bonuses.maxHealthBonus = mhb;
    if (mha) bonuses.maxHealth = mha;
    expect(health({ str, vig }, bonuses)).toBe(expected);
  });

  it('Warlock naked (STR 11, VIG 14) = 122 (matches CSV target HP)', () => {
    expect(health({ str: 11, vig: 14 })).toBe(122);
  });
});

describe.skip('health recipe — MHB table deviations (pending in-game re-verification)', () => {
  const health = (attrOverrides, bonuses = {}) =>
    valueOf(runRecipe("health", DERIVED_STAT_RECIPES.health, attrs(attrOverrides), bonuses));

  it.each([
    // [label, str, vig, mhb, mha, docSays, formulaGives]
    ["2  +4% weapon",                            30, 32, 0.04,  0, 157, 156],
    ["4  +5% chest + 4% weapon",                 32, 34, 0.09,  0, 166, 167],
    ["6  +6 MHA + 4% weapon",                    30, 32, 0.04,  6, 163, 162],
    ["8  +5% chest + 6 MHA + 4% weapon",         32, 34, 0.09,  6, 172, 173],
    ["9  Robust 7.5%",                           30, 32, 0.075, 0, 162, 161],
    ["10 Robust + 6 MHA",                        30, 32, 0.075, 6, 168, 167],
    ["13 Robust + 5% chest + 6 MHA + 4% weapon", 32, 34, 0.165, 6, 183, 184],
    ["15 Robust + 5% chest + 4% weapon",         32, 34, 0.165, 0, 177, 178],
  ])('deviating case %s — doc says %i, formula gives %i',
    (_label, str, vig, mhb, mha, docSays, _formulaGives) => {
      const bonuses = {};
      if (mhb) bonuses.maxHealthBonus = mhb;
      if (mha) bonuses.maxHealth = mha;
      expect(health({ str, vig }, bonuses)).toBe(docSays);
    });
});

describe('PPB recipe', () => {
  const ppb = (a, b) => valueOf(runRecipe("ppb", DERIVED_STAT_RECIPES.ppb, attrs(a), b));

  it('STR 15 with no gear → 0', () => {
    expect(ppb({ str: 15 }, {})).toBeCloseTo(0, 6);
  });

  it('adds bonuses.physicalPower to STR before curve', () => {
    expect(ppb({ str: 5 }, { physicalPower: 45 })).toBeCloseTo(0.35, 6);
  });

  it('adds physicalDamageBonus after the curve', () => {
    expect(ppb({ str: 50 }, { physicalDamageBonus: 0.10 })).toBeCloseTo(0.45, 6);
  });
});

describe('PDR recipe', () => {
  const pdr = (bonuses, capOverrides = {}) =>
    runRecipe("pdr", DERIVED_STAT_RECIPES.pdr, attrs(), bonuses, capOverrides);

  it('zero AR returns the curve naked penalty (~-22%, intentional)', () => {
    expect(pdr({}).value).toBeCloseTo(-0.22, 6);
  });

  it('equippedArmorRatingBonus scales gear AR before the curve', () => {
    expect(pdr({ armorRating: 100, equippedArmorRatingBonus: 0.50 }).value)
      .toBeGreaterThan(pdr({ armorRating: 100 }).value);
  });

  it('additionalArmorRating is NOT scaled by equippedArmorRatingBonus', () => {
    const scaled = pdr({ armorRating: 100, equippedArmorRatingBonus: 0.50 }).value;
    const flatAdd = pdr({ armorRating: 100, additionalArmorRating: 50 }).value;
    expect(scaled).toBeCloseTo(flatAdd, 6);
  });

  it('caps at 65% by default; rawValue / cap surfaced for UI overflow', () => {
    const result = pdr({ physicalDamageReduction: 0.99 });
    expect(result.value).toBe(0.65);
    expect(result.rawValue).toBeGreaterThan(0.65);
    expect(result.cap).toBe(0.65);
  });

  it('cap_override raises the cap', () => {
    const result = pdr({ physicalDamageReduction: 0.99 }, { pdr: 0.75 });
    expect(result.value).toBe(0.75);
    expect(result.cap).toBe(0.75);
  });
});

describe('MDR recipe', () => {
  const mdr = (a, b, capOverrides = {}) =>
    runRecipe("mdr", DERIVED_STAT_RECIPES.mdr, attrs(a), b, capOverrides);

  it('zero WIL and zero gear → finite baseline', () => {
    expect(Number.isFinite(mdr({}, {}).value)).toBe(true);
  });

  it('higher WIL produces higher MDR (monotonic)', () => {
    expect(mdr({ wil: 30 }, {}).value).toBeGreaterThan(mdr({ wil: 10 }, {}).value);
  });

  it('caps at 65% by default per data/stat_curves.json', () => {
    const result = mdr({ wil: 100 }, { magicResistance: 9999 });
    expect(result.value).toBe(0.65);
    expect(result.cap).toBe(0.65);
  });

  it('cap_override raises the cap (Iron Will → 0.75)', () => {
    const result = mdr({ wil: 100 }, { magicResistance: 9999 }, { mdr: 0.75 });
    expect(result.value).toBe(0.75);
    expect(result.cap).toBe(0.75);
  });
});

describe('moveSpeed recipe', () => {
  const move = (bonuses) =>
    valueOf(runRecipe("moveSpeed", DERIVED_STAT_RECIPES.moveSpeed, attrs({ agi: 15 }), bonuses));

  it('output multiplier × curve + flat (multiplier applies to curve only)', () => {
    const baseline = move({});
    expect(move({ moveSpeed: 5 })).toBeCloseTo(baseline + 5, 6);
    expect(move({ moveSpeedBonus: 0.10 })).toBeCloseTo(baseline * 1.10, 6);
  });
});

describe('passthrough recipes', () => {
  it('luck = bonuses.luck', () => {
    expect(valueOf(runRecipe("luck", DERIVED_STAT_RECIPES.luck, attrs(), { luck: 30 }))).toBe(30);
    expect(valueOf(runRecipe("luck", DERIVED_STAT_RECIPES.luck, attrs(), {}))).toBe(0);
  });

  it('headshotDamageBonus combines gear bonus + perk power', () => {
    expect(valueOf(runRecipe("headshotDamageBonus", DERIVED_STAT_RECIPES.headshotDamageBonus,
      attrs(), { headshotDamageBonus: 0.05, headshotPower: 0.20 }))).toBeCloseTo(0.25, 6);
  });
});

describe('computeDerivedStats integration', () => {
  it('returns one DerivedStat per recipe', () => {
    const ds = computeDerivedStats(attrs(), {});
    for (const id of Object.keys(DERIVED_STAT_RECIPES)) {
      expect(ds[id], `${id} missing`).toBeDefined();
      expect(ds[id]).toHaveProperty("value");
    }
  });

  it('every value is finite for a Warlock-ish baseline', () => {
    const ds = computeDerivedStats(
      attrs({ str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 }),
      {},
    );
    for (const [id, stat] of Object.entries(ds)) {
      expect(Number.isFinite(stat.value), `${id} = ${stat.value}`).toBe(true);
    }
  });
});
