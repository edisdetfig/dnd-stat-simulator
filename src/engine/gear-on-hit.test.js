// gear-on-hit.test.js — OQ-D6 integration.
//
// Verifies that `ctx.gear.onHitEffects[]` is consumed by projectDamage at
// the post-floor true-physical additive position per
// `docs/damage_formulas.md:235-240`. Gating: the rider applies only to
// physical damage atoms marked `isWeaponPrimary: true`; ability-authored
// skill / AoE / DoT atoms (exploitation_strike, abyssal_flame, etc.) do
// NOT pick up the rider.
//
// Full VERIFIED primary-weapon-attack projection (`floor(69.22)+1=70`)
// awaits Phase 11 weapon-primary-attack synthesis — the current engine
// does not synthesize a primary-weapon DAMAGE atom from `gear.weapon`.
// This file exercises the plumbing deterministically via a synthesized
// atom + projection.

import { describe, it, expect } from "vitest";
import { projectDamage } from "./projectDamage.js";

const SPIKED_GAUNTLET_RIDER = {
  damage:           1,
  damageType:       "physical",
  trueDamage:       true,
  scaling:          1.0,
  separateInstance: false,
  sourceItemId:     "spiked_gauntlet",
};

// Minimal derivedStats / target / ctx enough to exercise projectPhysicalHit.
function baseInputs({ isWeaponPrimary, onHitEffects = [] }) {
  const derivedStats = {
    ppb:                 { value: 0 },
    armorPenetration:    { value: 0 },
    magicPenetration:    { value: 0 },
    headshotDamageBonus: { value: 0 },
  };
  const target = { pdr: 0, mdr: 0, headshotDR: 0, maxHealth: 100, projectileDR: 0 };
  const gearWeapon = { baseWeaponDmg: 10, gearWeaponDmg: 0, weaponType: "sword" };
  const ctx = {
    target,
    gear: { weapon: gearWeapon, bonuses: {}, onHitEffects },
    comboMultiplier: 1.0,
    impactZone:      1.0,
    _buffWeaponDamageFlat:    0,
    _weaponMagicalDamageFlat: 0,
  };
  const atom = {
    atomId:     "primary_hit_test",
    source:     { abilityId: "weapon_primary" },
    damageType: "physical",
    base:       0,
    isWeaponPrimary,
  };
  return { atoms: [atom], derivedStats, target, gearWeapon, ctx };
}

describe("projectDamage — gear.onHitEffects[] rider (OQ-D6)", () => {
  it("applies +1 true-physical to a primary-weapon physical hit (body)", () => {
    const { atoms, derivedStats, target, gearWeapon, ctx } = baseInputs({
      isWeaponPrimary: true,
      onHitEffects:    [SPIKED_GAUNTLET_RIDER],
    });
    const { damageProjections } = projectDamage(atoms, derivedStats, {}, [], target, gearWeapon, ctx);
    // base weapon 10 + (0 PPB, 0 additional) → floor(10) = 10; rider +1 → 11.
    expect(damageProjections[0].hit.body).toBe(11);
  });

  it("does NOT apply rider when atom is not isWeaponPrimary", () => {
    const { atoms, derivedStats, target, gearWeapon, ctx } = baseInputs({
      isWeaponPrimary: false,
      onHitEffects:    [SPIKED_GAUNTLET_RIDER],
    });
    const { damageProjections } = projectDamage(atoms, derivedStats, {}, [], target, gearWeapon, ctx);
    // Rider suppressed → floor(10) = 10.
    expect(damageProjections[0].hit.body).toBe(10);
  });

  it("does NOT apply rider when onHitEffects is empty (no Spiked Gauntlet equipped)", () => {
    const { atoms, derivedStats, target, gearWeapon, ctx } = baseInputs({
      isWeaponPrimary: true,
      onHitEffects:    [],
    });
    const { damageProjections } = projectDamage(atoms, derivedStats, {}, [], target, gearWeapon, ctx);
    expect(damageProjections[0].hit.body).toBe(10);
  });

  it("ignores riders with separateInstance: true (not implemented this phase)", () => {
    const separate = { ...SPIKED_GAUNTLET_RIDER, separateInstance: true };
    const { atoms, derivedStats, target, gearWeapon, ctx } = baseInputs({
      isWeaponPrimary: true,
      onHitEffects:    [separate],
    });
    const { damageProjections } = projectDamage(atoms, derivedStats, {}, [], target, gearWeapon, ctx);
    expect(damageProjections[0].hit.body).toBe(10);
  });

  it("ignores magical on-hit riders (only physical+trueDamage route to truePhysicalDmg)", () => {
    const magical = { ...SPIKED_GAUNTLET_RIDER, damageType: "fire_magical" };
    const { atoms, derivedStats, target, gearWeapon, ctx } = baseInputs({
      isWeaponPrimary: true,
      onHitEffects:    [magical],
    });
    const { damageProjections } = projectDamage(atoms, derivedStats, {}, [], target, gearWeapon, ctx);
    expect(damageProjections[0].hit.body).toBe(10);
  });

  it("sums multiple physical trueDamage riders", () => {
    const twoRiders = [
      SPIKED_GAUNTLET_RIDER,
      { ...SPIKED_GAUNTLET_RIDER, damage: 2, sourceItemId: "hypothetical_item_2" },
    ];
    const { atoms, derivedStats, target, gearWeapon, ctx } = baseInputs({
      isWeaponPrimary: true,
      onHitEffects:    twoRiders,
    });
    const { damageProjections } = projectDamage(atoms, derivedStats, {}, [], target, gearWeapon, ctx);
    expect(damageProjections[0].hit.body).toBe(13);  // 10 + (1 + 2)
  });

  it("scaling multiplies the rider amount before summing", () => {
    const halfScaling = { ...SPIKED_GAUNTLET_RIDER, damage: 4, scaling: 0.5 };
    const { atoms, derivedStats, target, gearWeapon, ctx } = baseInputs({
      isWeaponPrimary: true,
      onHitEffects:    [halfScaling],
    });
    const { damageProjections } = projectDamage(atoms, derivedStats, {}, [], target, gearWeapon, ctx);
    expect(damageProjections[0].hit.body).toBe(12);  // 10 + (4 × 0.5) = 12
  });

  it("VERIFIED `floor(X)+1` shape — rider contributes exactly +1 to the projected body damage", () => {
    // Documents the contract enforced by docs/damage_formulas.md:235-240:
    // Spiked Gauntlet +1 true physical is added inside Math.floor() as the
    // final `+ truePhysicalDmg` term. For an integer rider, the end-state
    // is identical to `floor(X)+1`. Full Warlock VERIFIED numbers
    // (floor(69.22)+1=70 etc.) require driving physicalDamageBonus from
    // gear + additionalPhysicalDamage from gear + attribute-curve PPB
    // through the full aggregate + deriveStats pipeline. Handcrafted
    // derivedStats + ctx short-circuit those contributions. Phase 11+
    // primary-weapon-attack synthesis will enable end-to-end reproduction;
    // this phase asserts the rider-delta contract.
    const derivedStats = {
      ppb:                 { value: 0.351 },
      armorPenetration:    { value: 0.105 },
      magicPenetration:    { value: 0 },
      headshotDamageBonus: { value: 0.05 },
    };
    const target = { pdr: -0.22, mdr: 0, headshotDR: 0, maxHealth: 100, projectileDR: 0 };
    const gearWeapon = { baseWeaponDmg: 40, gearWeaponDmg: 0, weaponType: "sword" };
    const ctxBase = {
      target,
      comboMultiplier: 1.0,
      impactZone:      1.0,
      _buffWeaponDamageFlat:    0,
      _weaponMagicalDamageFlat: 0,
    };
    const atom = {
      atomId: "spectral_blade_hit_1",
      source: { abilityId: "weapon_primary" },
      damageType: "physical",
      base: 0,
      isWeaponPrimary: true,
    };

    const ctxNoRider   = { ...ctxBase, gear: { weapon: gearWeapon, bonuses: {}, onHitEffects: [] } };
    const ctxWithRider = { ...ctxBase, gear: { weapon: gearWeapon, bonuses: {}, onHitEffects: [SPIKED_GAUNTLET_RIDER] } };

    const noRider   = projectDamage([atom], derivedStats, {}, [], target, gearWeapon, ctxNoRider);
    const withRider = projectDamage([atom], derivedStats, {}, [], target, gearWeapon, ctxWithRider);

    expect(withRider.damageProjections[0].hit.body - noRider.damageProjections[0].hit.body).toBe(1);
  });
});
