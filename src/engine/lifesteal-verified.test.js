// Life Drain lifesteal — VERIFIED formula (2026-04-17).
//
// Grounded in the in-game test scenarios captured in:
//   docs/healing_verification.md §"Verification Data — Life Drain Lifesteal"
//   docs/unresolved_questions.md §"RESOLVED: Life Drain Heal Basis = Post-DR
//     Damage Dealt"
//
// LOCK B data (Warlock, 7% MPB, +5 magical spellbook):
//   A. Baseline                    → 5/5/4/5 damage → 5/5/4/5 heal (1:1)
//   B. Vampirism +0.20             → 5/5/4 damage → 6/6/5 heal (ceil(dmg × 1.20))
//   C. Magical Healing +6          → 5/5/4 damage → 5/5/4 heal (MH inert)
//
// These integers are *in-game display* values — ceil is applied at the
// display-surface (UI, Phase 7+) per healing_verification.md:49. The engine
// returns floating-point heal amounts; these tests assert the floats.
// LOCK B's integer observations are the reference for Phase 7+ UI ceil tests.
//
// This suite does not attempt to reproduce LOCK B's specific per-tick
// damage numbers (that would require the unknown target MDR + tick-cadence
// modeling). Instead it tests the *formula relationship* at arbitrary
// magnitudes:
//   (1) descriptor.healAmount === hit.body × lifestealRatio
//   (2) projectHealing(descriptor, HealingMod) === healAmount × (1 + HealingMod)
//   (3) Magical Healing (healingAdd) is inert for lifesteal-derived heals.

import { describe, it, expect } from 'vitest';
import { projectDamage } from './projectDamage.js';
import { projectHealing } from './projectHealing.js';

// ── helpers ──────────────────────────────────────────────────────────

function lifeDrainAtom(overrides = {}) {
  return {
    base: 5, scaling: 0.25, damageType: "evil_magical",
    target: "enemy", isDot: true, tickRate: 1, lifestealRatio: 1.0,
    source: { kind: "spell", abilityId: "life_drain", className: "warlock" },
    atomId: "life_drain:damage:0",
    stackMultiplier: 1,
    ...overrides,
  };
}

const ds = (overrides = {}) => ({
  mpb: { value: 0 }, ppb: { value: 0 },
  armorPenetration: { value: 0 }, magicPenetration: { value: 0 },
  headshotDamageBonus: { value: 0 },
  magicalHealing: { value: 0 }, physicalHealing: { value: 0 },
  health: { value: 100 },
  buffDuration: { value: 0 },
  ...overrides,
});

const target = (overrides = {}) => ({
  pdr: 0, mdr: 0, headshotDR: 0, maxHealth: 100, ...overrides,
});

const baseCtx = { comboMultiplier: 1.0, impactZone: 1.0, target: target() };

function deriveLifesteal({ atomOverrides = {}, dsOverrides = {}, mdr = 0, healingMod = 0 } = {}) {
  const tgt = target({ mdr });
  const ctx = { ...baseCtx, target: tgt };
  const { damageProjections, derivedHealDescriptors } = projectDamage(
    [lifeDrainAtom(atomOverrides)],
    ds(dsOverrides),
    {},
    [],
    tgt,
    null,
    ctx
  );
  const healProjections = projectHealing(
    [],
    derivedHealDescriptors,
    ds(dsOverrides),
    healingMod,
    0,
    ctx
  );
  return {
    hitBody: damageProjections[0].hit.body,
    descriptor: derivedHealDescriptors[0],
    heal: healProjections[0],
  };
}

// ── Scenario A — Baseline: 1:1 relationship ─────────────────────────

describe('Life Drain lifesteal — Scenario A baseline (no HealingMod, no MH)', () => {
  it('descriptor.healAmount === hit.body × lifestealRatio (1.0)', () => {
    const { hitBody, descriptor } = deriveLifesteal({
      dsOverrides: { mpb: { value: 0.23 } },
      mdr: 0.075,
    });
    expect(descriptor.healAmount).toBe(hitBody * 1.0);
  });

  it('heal.amount === descriptor.healAmount (HealingMod = 0)', () => {
    const { descriptor, heal } = deriveLifesteal({
      dsOverrides: { mpb: { value: 0.23 } },
      mdr: 0.075,
      healingMod: 0,
    });
    expect(heal.amount).toBeCloseTo(descriptor.healAmount);
  });

  it('relationship holds across damage magnitudes (small atom)', () => {
    const { hitBody, descriptor, heal } = deriveLifesteal({
      atomOverrides: { base: 3, scaling: 0.5 },
      dsOverrides: { mpb: { value: 0.10 } },
      mdr: 0,
    });
    expect(descriptor.healAmount).toBe(hitBody * 1.0);
    expect(heal.amount).toBeCloseTo(hitBody);
  });

  it('relationship holds across damage magnitudes (large atom)', () => {
    const { hitBody, descriptor, heal } = deriveLifesteal({
      atomOverrides: { base: 50, scaling: 1.0 },
      dsOverrides: { mpb: { value: 0.40 } },
      mdr: 0.15,
    });
    expect(descriptor.healAmount).toBe(hitBody * 1.0);
    expect(heal.amount).toBeCloseTo(hitBody);
  });
});

// ── Scenario B — Vampirism ON (HealingMod = 0.20) ───────────────────

describe('Life Drain lifesteal — Scenario B Vampirism (HealingMod 0.20)', () => {
  it('heal.amount === healAmount × 1.20', () => {
    const { descriptor, heal } = deriveLifesteal({
      dsOverrides: { mpb: { value: 0.23 } },
      mdr: 0.075,
      healingMod: 0.20,
    });
    expect(heal.amount).toBeCloseTo(descriptor.healAmount * 1.20);
  });

  it('multiplicative at the end (independent of damage magnitude)', () => {
    const { descriptor, heal } = deriveLifesteal({
      atomOverrides: { base: 50, scaling: 1.0 },
      dsOverrides: { mpb: { value: 0.40 } },
      mdr: 0.15,
      healingMod: 0.20,
    });
    expect(heal.amount).toBeCloseTo(descriptor.healAmount * 1.20);
  });

  it('anchored sanity check: hit.body = 4 → heal.amount ≈ 4.8', () => {
    // Reproduces the existing warlock-life-drain fixture numbers to keep
    // the in-game→engine mapping legible: base 5, scaling 0.25, MPB 0.23,
    // MDR 0.075 gives hit.body = 4; 4 × 1.20 = 4.8.
    const { hitBody, heal } = deriveLifesteal({
      dsOverrides: { mpb: { value: 0.23 } },
      mdr: 0.075,
      healingMod: 0.20,
    });
    expect(hitBody).toBe(4);
    expect(heal.amount).toBeCloseTo(4.8);
  });
});

// ── Scenario C — Magical Healing inert ──────────────────────────────

describe('Life Drain lifesteal — Scenario C Magical Healing inert', () => {
  it('MH +6 does not change lifesteal heal amount (HealingMod = 0)', () => {
    const { heal: healNoMH } = deriveLifesteal({
      dsOverrides: { mpb: { value: 0.23 } },
      mdr: 0.075,
      healingMod: 0,
    });
    const { heal: healWithMH } = deriveLifesteal({
      dsOverrides: { mpb: { value: 0.23 }, magicalHealing: { value: 6 } },
      mdr: 0.075,
      healingMod: 0,
    });
    expect(healWithMH.amount).toBeCloseTo(healNoMH.amount);
  });

  it('MH is inert even when HealingMod is non-zero (multiplicative chain unaffected)', () => {
    const { heal: healNoMH } = deriveLifesteal({
      dsOverrides: { mpb: { value: 0.23 } },
      mdr: 0.075,
      healingMod: 0.20,
    });
    const { heal: healWithMH } = deriveLifesteal({
      dsOverrides: { mpb: { value: 0.23 }, magicalHealing: { value: 6 } },
      mdr: 0.075,
      healingMod: 0.20,
    });
    expect(healWithMH.amount).toBeCloseTo(healNoMH.amount);
  });
});
