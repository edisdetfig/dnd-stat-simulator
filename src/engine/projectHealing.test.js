import { describe, it, expect } from 'vitest';
import { projectHealing } from './projectHealing.js';

function healAtom(fields) {
  return {
    baseHeal: 2, scaling: 0, healType: "magical", target: "self",
    source: { kind: "perk", abilityId: "test", className: "t" },
    atomId: "test:heal:0",
    ...fields,
  };
}

const ds = (overrides = {}) => ({
  mpb: { value: 0 },
  magicalHealing: { value: 0 },
  physicalHealing: { value: 0 },
  health: { value: 100 },
  buffDuration: { value: 0 },
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────
// Authored instant heal — Shadow Touch pattern
// ─────────────────────────────────────────────────────────────────────

describe('projectHealing — instant authored', () => {
  it('Shadow Touch: baseHeal 2, scaling 0 → amount 2 regardless of MPB', () => {
    const [out] = projectHealing(
      [healAtom({ baseHeal: 2, scaling: 0 })],
      [],
      ds({ mpb: { value: 0.23 } }),
      0, 0
    );
    expect(out.amount).toBe(2);
  });

  it('Magical heal with MH + MPB + scaling: amount matches healing_verification formula', () => {
    // (2 + 8 × 0.15) × (1 + 0.23 × 0.15) × 1 = 3.2 × 1.0345 = 3.3104
    const [out] = projectHealing(
      [healAtom({ baseHeal: 2, scaling: 0.15 })],
      [],
      ds({ magicalHealing: { value: 8 }, mpb: { value: 0.23 } }),
      0, 0
    );
    expect(out.amount).toBeCloseTo(3.3104);
  });

  it('HealingMod (Vampirism): multiplies final heal', () => {
    // (2 + 0) × (1 + 0 × 0) × (1 + 0.20) = 2.4
    const [out] = projectHealing(
      [healAtom({ baseHeal: 2, scaling: 0 })],
      [],
      ds(),
      0.20, 0
    );
    expect(out.amount).toBeCloseTo(2.4);
  });
});

// ─────────────────────────────────────────────────────────────────────
// V13 — Healing Potion 6 test points (healing_verification.md:59–64)
// ─────────────────────────────────────────────────────────────────────

describe('projectHealing — V13 Poor Healing Potion (20 HP / 20s base, scaling 0.50)', () => {
  const potionAtom = healAtom({
    baseHeal: 20, scaling: 0.50, healType: "magical",
    isHot: true, duration: 20, tickRate: 1,
  });

  it('Naked Fighter — MH 0, MPB 0, BuffDur 0 → 20.00', () => {
    const [out] = projectHealing([potionAtom], [], ds(), 0, 0);
    expect(out.amount).toBeCloseTo(20.00);
  });

  it('Fighter + 8 MH — MH 8, MPB 0, BuffDur 0 → 24.00', () => {
    const [out] = projectHealing([potionAtom], [],
      ds({ magicalHealing: { value: 8 } }), 0, 0);
    expect(out.amount).toBeCloseTo(24.00);
  });

  it('Warlock kit no MH — MH 0, MPB 0.23, BuffDur 0.23 → 26.76', () => {
    const [out] = projectHealing([potionAtom], [],
      ds({ mpb: { value: 0.23 } }), 0, 0.23);
    // (20 + 0 × 0.50) × (1 + 0.23 × 0.50) × 1 × (floor(20 × 1.23) / 20)
    // = 20 × 1.115 × (24 / 20) = 20 × 1.115 × 1.2 = 26.76
    expect(out.amount).toBeCloseTo(26.76, 2);
  });

  it('Warlock kit + 8 MH — MH 8, MPB 0.23, BuffDur 0.23 → 32.116', () => {
    const [out] = projectHealing([potionAtom], [],
      ds({ magicalHealing: { value: 8 }, mpb: { value: 0.23 } }), 0, 0.23);
    // (20 + 8 × 0.50) × (1 + 0.23 × 0.50) × 1 × (24 / 20)
    // = 24 × 1.115 × 1.2 = 32.112
    expect(out.amount).toBeCloseTo(32.112, 2);
  });

  it('Fighter geared no MH — MH 0, MPB 0, BuffDur 0.145 → 22.00', () => {
    const [out] = projectHealing([potionAtom], [],
      ds(), 0, 0.145);
    // 20 × 1 × 1 × (floor(20 × 1.145) / 20) = 20 × (22 / 20) = 22
    expect(out.amount).toBeCloseTo(22.00);
  });

  it('Fighter geared + 8 MH — MH 8, MPB 0, BuffDur 0.145 → 26.40', () => {
    const [out] = projectHealing([potionAtom], [],
      ds({ magicalHealing: { value: 8 } }), 0, 0.145);
    // (20 + 8 × 0.50) × 1 × 1 × (22 / 20) = 24 × 1.1 = 26.4
    expect(out.amount).toBeCloseTo(26.40);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Physical heal — MPB does NOT apply
// ─────────────────────────────────────────────────────────────────────

describe('projectHealing — physical heal does not scale with MPB', () => {
  it('physical heal: MPB ignored even if derivedStats.mpb > 0', () => {
    const [out] = projectHealing(
      [healAtom({ healType: "physical", baseHeal: 10, scaling: 1.0 })],
      [],
      ds({ mpb: { value: 0.50 }, physicalHealing: { value: 5 } }),
      0, 0
    );
    // (10 + 5 × 1.0) × (1 + 0 × 1.0) × 1 = 15
    expect(out.amount).toBeCloseTo(15);
  });
});

// ─────────────────────────────────────────────────────────────────────
// percentMaxHealth on HEAL_ATOM (arch-doc §16.3)
// ─────────────────────────────────────────────────────────────────────

describe('projectHealing — percentMaxHealth on HEAL_ATOM', () => {
  it('target: "self" → % × caster max HP', () => {
    const [out] = projectHealing(
      [healAtom({ baseHeal: 0, scaling: 0, percentMaxHealth: 0.10, target: "self" })],
      [],
      ds({ health: { value: 250 } }),
      0, 0
    );
    expect(out.amount).toBeCloseTo(25);
  });

  it('HealingMod still applies on percentMaxHealth path', () => {
    const [out] = projectHealing(
      [healAtom({ baseHeal: 0, scaling: 0, percentMaxHealth: 0.10 })],
      [],
      ds({ health: { value: 100 } }),
      0.20, 0
    );
    // 0.10 × 100 × 1.20 = 12
    expect(out.amount).toBeCloseTo(12);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Derived-heal descriptor consumption
// ─────────────────────────────────────────────────────────────────────

describe('projectHealing — derived-heal descriptors', () => {
  it('lifesteal descriptor: amount = healAmount × (1 + HealingMod)', () => {
    const descriptors = [{
      kind: "lifesteal", damageAtomId: "life_drain:damage:0",
      healAmount: 10, healType: "magical", target: "self",
      source: { kind: "spell", abilityId: "life_drain", className: "warlock" },
    }];
    const out = projectHealing([], descriptors, ds(), 0.20, 0);
    expect(out).toHaveLength(1);
    expect(out[0].atomId).toBe("life_drain:damage:0");
    expect(out[0].amount).toBeCloseTo(12);
    expect(out[0].derivedFrom).toEqual({ kind: "lifesteal", damageAtomId: "life_drain:damage:0" });
  });

  it('targetMaxHp descriptor: amount = healAmount × (1 + HealingMod)', () => {
    const descriptors = [{
      kind: "targetMaxHp", damageAtomId: "exploitation_strike:damage:0",
      healAmount: 10, healType: "magical", target: "self",
      source: { kind: "skill", abilityId: "exploitation_strike", className: "warlock" },
    }];
    const out = projectHealing([], descriptors, ds(), 0, 0);
    expect(out[0].amount).toBeCloseTo(10);
    expect(out[0].derivedFrom.kind).toBe("targetMaxHp");
  });

  it('derived descriptor does not use MPB or scaling', () => {
    // Even with MPB 0.50, derived heal should match healAmount × (1 + HealingMod).
    const descriptors = [{
      kind: "lifesteal", damageAtomId: "x:damage:0",
      healAmount: 20, healType: "magical", target: "self",
      source: { kind: "spell", abilityId: "x", className: "w" },
    }];
    const out = projectHealing([], descriptors, ds({ mpb: { value: 0.50 } }), 0, 0);
    expect(out[0].amount).toBeCloseTo(20);
  });

  it('authored + derived: both project into combined list', () => {
    const authored = [healAtom({ baseHeal: 2, scaling: 0 })];
    const descriptors = [{
      kind: "lifesteal", damageAtomId: "x:damage:0",
      healAmount: 5, healType: "magical", target: "self",
      source: { kind: "spell", abilityId: "x", className: "w" },
    }];
    const out = projectHealing(authored, descriptors, ds(), 0, 0);
    expect(out).toHaveLength(2);
    expect(out[0].atomId).toBe("test:heal:0");
    expect(out[1].atomId).toBe("x:damage:0");
  });
});
