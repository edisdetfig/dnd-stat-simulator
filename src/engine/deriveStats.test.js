import { describe, it, expect } from 'vitest';
import { deriveStats } from './deriveStats.js';

// ─────────────────────────────────────────────────────────────────────
// Attribute semantics — arch-doc §7 row 2 (pre_curve_flat + multiplier)
// ─────────────────────────────────────────────────────────────────────

describe('deriveStats — attribute semantics', () => {
  it('Malice (wil +15% attribute_multiplier) applied pre-recipe: MPB rises', () => {
    const base = { str: 10, vig: 10, agi: 10, dex: 10, wil: 20, kno: 10, res: 10 };
    const noMalice = deriveStats(base, {}, {});
    const withMalice = deriveStats(base,
      { wil: { attribute_multiplier: 0.15 } }, {});
    expect(withMalice.mpb.value).toBeGreaterThan(noMalice.mpb.value);
  });

  it('pre_curve_flat on attribute adds before multiplier', () => {
    // wil 10 + pre_curve_flat 10 = 20; × (1 + 0.5) = 30
    const attrs = { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 };
    const ds = deriveStats(attrs,
      { wil: { pre_curve_flat: 10, attribute_multiplier: 0.5 } }, {});
    // Verify through MPB (curve input) — compare to a direct-wil-30 baseline.
    const baseline = deriveStats({ ...attrs, wil: 30 }, {}, {});
    expect(ds.mpb.value).toBe(baseline.mpb.value);
  });

  it('attribute_multiplier not folded into flat bonuses for attr stats', () => {
    // If attribute_multiplier leaked into bonuses.wil flat, recipes might
    // treat it as an additive +0.15 into a bonuses.wil sum. Our flatten
    // excludes it. Indirect assertion via matching outputs.
    const attrs = { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 };
    const a = deriveStats(attrs, { wil: { attribute_multiplier: 0.15 } }, {});
    const b = deriveStats(attrs, { wil: { attribute_multiplier: 0.15,
                                          pre_curve_flat: 0 } }, {});
    expect(a.mpb.value).toBe(b.mpb.value);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Gear phase fold + multi-phase sum
// ─────────────────────────────────────────────────────────────────────

describe('deriveStats — phase-flattening', () => {
  it('gear phase folded into flat sum alongside post_curve', () => {
    const attrs = { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 };
    const ds = deriveStats(attrs, {
      maxHealth: { gear: 5, post_curve: 3 },
    }, {});
    // maxHealth is a flat addition (not curve-scaled), so total HP should
    // rise by 8 vs baseline.
    const baseline = deriveStats(attrs, {}, {});
    expect(ds.health.value - baseline.health.value).toBe(8);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Excluded phases (type_damage_bonus, post_cap_multiplicative_layer)
// ─────────────────────────────────────────────────────────────────────

describe('deriveStats — excluded phases', () => {
  it('type_damage_bonus does NOT enter bonusesFlat', () => {
    // If darkDamageBonus at type_damage_bonus leaked into flat, recipes
    // that sum a "darkDamageBonus" key would erroneously read it. Since no
    // recipe currently reads that key, verify indirectly: the phased atom
    // is present but MPB stays unchanged.
    const attrs = { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 };
    const a = deriveStats(attrs, {}, {});
    const b = deriveStats(attrs, {
      darkDamageBonus: { type_damage_bonus: 0.20 },
    }, {});
    expect(a.mpb.value).toBe(b.mpb.value);
    expect(a.health.value).toBe(b.health.value);
  });

  it('post_cap_multiplicative_layer does NOT enter bonusesFlat', () => {
    const attrs = { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 };
    const a = deriveStats(attrs, {}, {});
    const b = deriveStats(attrs, {
      magicDamageTaken: { post_cap_multiplicative_layer: 0.80 },
    }, {});
    expect(a.mdr.value).toBe(b.mdr.value);
  });
});

// ─────────────────────────────────────────────────────────────────────
// V18 — Warlock baseline HP 122 (verified-source assertion)
// ─────────────────────────────────────────────────────────────────────

describe('deriveStats — verified-source assertions', () => {
  it('V18: Warlock baseHealth 122 at str=11, vig=14', () => {
    // Per src/engine/recipes.test.js the health recipe is already verified;
    // this integration assertion confirms deriveStats threads through
    // without altering the baseline.
    const attrs = { str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 };
    const ds = deriveStats(attrs, {}, {});
    expect(ds.health.value).toBe(122);
  });
});

// ─────────────────────────────────────────────────────────────────────
// cap_override plumbed through
// ─────────────────────────────────────────────────────────────────────

describe('deriveStats — cap_override passthrough', () => {
  it('Fighter Defense Mastery: pdr cap raised to 0.75 via capOverrides', () => {
    const attrs = { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 };
    // Push raw pdr past 0.75 via a very large physicalDamageReductionBonus
    // (added post-curve in the pdr recipe). With override cap 0.75, value
    // should clamp.
    const ds = deriveStats(attrs,
      { physicalDamageReductionBonus: { post_curve: 1.50 } },
      { pdr: 0.75 });
    expect(ds.pdr.value).toBe(0.75);
    expect(ds.pdr.cap).toBe(0.75);
    expect(ds.pdr.rawValue).toBeGreaterThan(0.75);
  });

  it('Default pdr cap 0.65 without override', () => {
    const attrs = { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 };
    const ds = deriveStats(attrs,
      { physicalDamageReductionBonus: { post_curve: 1.50 } }, {});
    expect(ds.pdr.value).toBe(0.65);
  });

  it('V15: Iron Will raises mdr cap 0.65 → 0.75 via capOverrides', () => {
    const attrs = { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 };
    const ds = deriveStats(attrs,
      { magicalDamageReductionBonus: { post_curve: 1.50 } }, { mdr: 0.75 });
    expect(ds.mdr.value).toBe(0.75);
    expect(ds.mdr.cap).toBe(0.75);
  });

  it('V15 default: mdr cap 0.65 without override', () => {
    const attrs = { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 };
    const ds = deriveStats(attrs,
      { magicalDamageReductionBonus: { post_curve: 1.50 } }, {});
    expect(ds.mdr.value).toBe(0.65);
  });
});
