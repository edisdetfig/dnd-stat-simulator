// Integration tests for six Warlock fixtures — each exercises a full stage
// chain (Stage 0 → 6 as far as the fixture's shape requires).
//
// Per plan §11.2 + LOCK H: fixtures land between Steps 11 and 13. This
// umbrella wires each fixture through the modules manually; Step 13 will
// replace this with runSnapshot() orchestration.

import { describe, it, expect } from 'vitest';
import { buildContext } from '../../src/engine/buildContext.js';
import { collectAtoms } from '../../src/engine/collectAtoms.js';
import { filterByConditions } from '../../src/engine/filterByConditions.js';
import { materializeStacking } from '../../src/engine/materializeStacking.js';
import { aggregate } from '../../src/engine/aggregate.js';
import { deriveStats } from '../../src/engine/deriveStats.js';
import { projectDamage } from '../../src/engine/projectDamage.js';
import { projectHealing } from '../../src/engine/projectHealing.js';
import { projectShield } from '../../src/engine/projectShield.js';

import { WARLOCK_BOD_BUILD, WARLOCK_BOD_EXPECTED }
  from './warlock-bolt-of-darkness.fixture.js';
import { WARLOCK_BLOOD_PACT_BUILD } from './warlock-blood-pact.fixture.js';
import { WARLOCK_LIFE_DRAIN_BUILD } from './warlock-life-drain.fixture.js';
import { WARLOCK_EXPLOITATION_STRIKE_BUILD } from './warlock-exploitation-strike.fixture.js';
import { WARLOCK_ANTIMAGIC_BUILD } from './warlock-antimagic.fixture.js';
import { WARLOCK_ELDRITCH_SHIELD_BUILD } from './warlock-eldritch-shield.fixture.js';

// ─────────────────────────────────────────────────────────────────────
// Helper — orchestrate Stages 0-6 manually (runSnapshot lands at Step 13).
// ─────────────────────────────────────────────────────────────────────

function runPipeline(build) {
  const ctx = buildContext(build);
  const raw = collectAtoms(ctx);
  const filtered = filterByConditions(raw, ctx);
  const materialized = materializeStacking(filtered, ctx);
  const { bonuses, perTypeBonuses, postCapMultiplicativeLayers, capOverrides } =
    aggregate(materialized.effects, ctx.gear?.bonuses ?? {}, ctx);
  const derivedStats = deriveStats(ctx.attributes, bonuses, capOverrides);

  const ctxForProjection = {
    ...ctx,
    _weaponMagicalDamageFlat: build._weaponMagicalDamageFlat ?? 0,
  };
  const { damageProjections, derivedHealDescriptors } = projectDamage(
    materialized.damage, derivedStats, perTypeBonuses,
    postCapMultiplicativeLayers, ctx.target, ctx.gear?.weapon, ctxForProjection
  );

  const healingModFlat = Object.values(bonuses.healingMod ?? {})
    .reduce((a, b) => a + b, 0);
  const buffDuration = derivedStats.buffDuration?.value ?? 0;
  const healProjections = projectHealing(
    materialized.heal, derivedHealDescriptors, derivedStats,
    healingModFlat, buffDuration, ctx
  );
  const shieldProjections = projectShield(materialized.shield, derivedStats);

  return {
    ctx, bonuses, perTypeBonuses, postCapMultiplicativeLayers,
    derivedStats, damageProjections, healProjections, shieldProjections,
    derivedHealDescriptors, filtered, materialized,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Fixture 1 — Bolt of Darkness + Dark Enhancement + Malice
// ─────────────────────────────────────────────────────────────────────

describe('Warlock fixture — bolt-of-darkness', () => {
  // Note: V7/V8 verified-source numbers from damage_formulas.md:254-255 assume
  // MPB 23%, which requires additional gear bonuses beyond the baseline
  // Warlock attribute set (wil=22 + Malice yields mpb ≈ 0.10). The V7/V8
  // assertions at the unit level (projectDamage.test.js) use hardcoded MPB;
  // these fixture assertions verify pipeline integration, not exact docs-numbers.

  it('Malice raises MPB above the no-Malice baseline', () => {
    const result = runPipeline(WARLOCK_BOD_BUILD);
    const noMalice = runPipeline({
      ...WARLOCK_BOD_BUILD,
      selectedPerks: WARLOCK_BOD_BUILD.selectedPerks.filter(p => p !== "malice"),
    });
    expect(result.derivedStats.mpb.value).toBeGreaterThan(noMalice.derivedStats.mpb.value);
  });

  it('perTypeBonuses.dark_magical gets Dark Enhancement 0.20', () => {
    const result = runPipeline(WARLOCK_BOD_BUILD);
    expect(result.perTypeBonuses.dark_magical).toBeCloseTo(0.20);
  });

  it('BoD damage projection fires with all three hit locations', () => {
    const result = runPipeline(WARLOCK_BOD_BUILD);
    const bod = result.damageProjections.find(p => p.atomId === "bolt_of_darkness:damage:0");
    expect(bod).toBeDefined();
    expect(bod.damageType).toBe("dark_magical");
    expect(bod.hit.body).toBeGreaterThan(0);
    expect(bod.hit.head).toBeGreaterThan(bod.hit.body);
    expect(bod.hit.limb).toBeLessThan(bod.hit.body);
  });

  it('Dark Enhancement raises BoD dark_magical damage vs no-Dark-Enhancement baseline', () => {
    const result = runPipeline(WARLOCK_BOD_BUILD);
    const noDE = runPipeline({
      ...WARLOCK_BOD_BUILD,
      selectedPerks: WARLOCK_BOD_BUILD.selectedPerks.filter(p => p !== "dark_enhancement"),
    });
    const bodWith = result.damageProjections.find(p => p.atomId === "bolt_of_darkness:damage:0");
    const bodWithout = noDE.damageProjections.find(p => p.atomId === "bolt_of_darkness:damage:0");
    expect(bodWith.hit.body).toBeGreaterThan(bodWithout.hit.body);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Fixture 2 — Blood Pact grants + locked-shards resource
// ─────────────────────────────────────────────────────────────────────

describe('Warlock fixture — blood-pact', () => {
  it('Blood Pact grants bolt_of_darkness, exploitation_strike, exit_demon_form while unarmed+active', () => {
    const result = runPipeline(WARLOCK_BLOOD_PACT_BUILD);
    expect(result.ctx.availableAbilityIds).toContain("bolt_of_darkness");
    expect(result.ctx.availableAbilityIds).toContain("exploitation_strike");
    expect(result.ctx.availableAbilityIds).toContain("exit_demon_form");
  });

  it('blood_pact_locked_shards = 3 → darkDamageBonus in perTypeBonuses.dark_magical', () => {
    const result = runPipeline(WARLOCK_BLOOD_PACT_BUILD);
    // 3 shards × 0.33 = 0.99 (blood_pact.effects[4] authored with resource)
    expect(result.perTypeBonuses.dark_magical).toBeCloseTo(0.99);
  });

  it('allAttributes +3 from 3 locked shards at pre_curve_flat', () => {
    const result = runPipeline(WARLOCK_BLOOD_PACT_BUILD);
    // blood_pact.effects[3]: allAttributes × resource (3 shards) = 3 at pre_curve_flat.
    expect(result.bonuses.allAttributes?.pre_curve_flat).toBe(3);
  });

  it('Abyssal Flame AoE emits hit.body only', () => {
    const result = runPipeline(WARLOCK_BLOOD_PACT_BUILD);
    const aoe = result.damageProjections.find(p =>
      p.atomId === "blood_pact:damage:0" && p.isDot);
    expect(aoe).toBeDefined();
    expect(aoe.hit.body).toBeDefined();
    expect(aoe.hit.head).toBeUndefined();
  });

  it('Abyssal Flame self-damage: derivedPercentMaxHealthDamage = 1% × caster max HP', () => {
    const result = runPipeline(WARLOCK_BLOOD_PACT_BUILD);
    const selfDmg = result.damageProjections.find(p =>
      p.atomId === "blood_pact:damage:1");
    expect(selfDmg).toBeDefined();
    // Warlock base 122 + Blood Pact maxHealth +30 @ post_curve → 152.
    // 1% × 152 = 1.52.
    expect(selfDmg.derivedPercentMaxHealthDamage).toBeCloseTo(1.52);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Fixture 3 — Life Drain lifesteal
// ─────────────────────────────────────────────────────────────────────

describe('Warlock fixture — life-drain', () => {
  it('V12: life_drain damage atom emits lifesteal descriptor with pre-MDR healAmount', () => {
    const result = runPipeline(WARLOCK_LIFE_DRAIN_BUILD);
    const desc = result.derivedHealDescriptors.find(d =>
      d.damageAtomId === "life_drain:damage:0" && d.kind === "lifesteal");
    expect(desc).toBeDefined();
    // Pre-MDR body damage for life_drain (base 5, scaling 0.25, mpb ~0.23):
    // floor(5 × (1 + 0.23 × 0.25) × 1) = floor(5 × 1.0575) = 5.
    expect(desc.healAmount).toBe(5);
    expect(desc.healType).toBe("magical");   // evil_magical family-collapse
  });

  it('heal projection applies HealingMod (Vampirism 0.20) to lifesteal amount', () => {
    const result = runPipeline(WARLOCK_LIFE_DRAIN_BUILD);
    const heal = result.healProjections.find(h =>
      h.atomId === "life_drain:damage:0" && h.derivedFrom?.kind === "lifesteal");
    expect(heal).toBeDefined();
    // 5 × (1 + 0.20) = 6
    expect(heal.amount).toBeCloseTo(6);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Fixture 4 — Exploitation Strike targetMaxHpRatio
// ─────────────────────────────────────────────────────────────────────

describe('Warlock fixture — exploitation-strike', () => {
  it('exploitation_strike granted by blood_pact → available + active', () => {
    const result = runPipeline(WARLOCK_EXPLOITATION_STRIKE_BUILD);
    expect(result.ctx.availableAbilityIds).toContain("exploitation_strike");
    expect(result.ctx.activeAbilityIds).toContain("exploitation_strike");
  });

  it('exploitation_strike damage atom passes Stage 2 (effect_active + weapon_type:unarmed)', () => {
    const result = runPipeline(WARLOCK_EXPLOITATION_STRIKE_BUILD);
    const atom = result.materialized.damage.find(a =>
      a.atomId === "exploitation_strike:damage:0");
    expect(atom).toBeDefined();
  });

  it('targetMaxHpRatio 0.10 × target.maxHealth 150 → descriptor healAmount 15', () => {
    const result = runPipeline(WARLOCK_EXPLOITATION_STRIKE_BUILD);
    const desc = result.derivedHealDescriptors.find(d =>
      d.kind === "targetMaxHp" && d.damageAtomId === "exploitation_strike:damage:0");
    expect(desc).toBeDefined();
    expect(desc.healAmount).toBe(15);
    expect(desc.healType).toBe("magical");
  });
});

// ─────────────────────────────────────────────────────────────────────
// Fixture 5 — Antimagic post-cap layer
// ─────────────────────────────────────────────────────────────────────

describe('Warlock fixture — antimagic', () => {
  it('Antimagic atom routes to postCapMultiplicativeLayers with condition preserved', () => {
    const result = runPipeline(WARLOCK_ANTIMAGIC_BUILD);
    expect(result.postCapMultiplicativeLayers).toHaveLength(1);
    const layer = result.postCapMultiplicativeLayers[0];
    expect(layer.stat).toBe("magicDamageTaken");
    expect(layer.multiplier).toBe(0.80);
    expect(layer.condition?.type).toBe("not");
  });

  it('Antimagic atom NOT in bonuses (condition would be dropped if it were)', () => {
    const result = runPipeline(WARLOCK_ANTIMAGIC_BUILD);
    expect(result.bonuses.magicDamageTaken).toBeUndefined();
  });

  it('BoD dark_magical projection: Antimagic 0.80 multiplier applied', () => {
    const result = runPipeline(WARLOCK_ANTIMAGIC_BUILD);
    const noAntimagic = runPipeline({
      ...WARLOCK_ANTIMAGIC_BUILD,
      selectedPerks: WARLOCK_ANTIMAGIC_BUILD.selectedPerks.filter(p => p !== "antimagic"),
    });
    const bod       = result.damageProjections.find(p => p.atomId === "bolt_of_darkness:damage:0");
    const bodNoAnti = noAntimagic.damageProjections.find(p => p.atomId === "bolt_of_darkness:damage:0");
    // With Antimagic, BoD body = floor(bodNoAnti × 0.80).
    expect(bod.hit.body).toBe(Math.floor(bodNoAnti.hit.body * 0.80));
    expect(bod.hit.body).toBeLessThan(bodNoAnti.hit.body);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Fixture 6 — Eldritch Shield afterEffect short-circuit (LOCK E)
// ─────────────────────────────────────────────────────────────────────

describe('Warlock fixture — eldritch-shield (afterEffect short-circuit)', () => {
  it('default (viewingAfterEffect empty): shield projects; afterEffect atoms inactive', () => {
    const result = runPipeline(WARLOCK_ELDRITCH_SHIELD_BUILD);
    expect(result.shieldProjections).toHaveLength(1);
    expect(result.shieldProjections[0].absorbAmount).toBe(25);
    expect(result.shieldProjections[0].damageFilter).toBe("magical");
    // afterEffect atoms (darkDamageBonus 0.30, spellCastingSpeed 0.50) do NOT fire.
    expect(result.perTypeBonuses.dark_magical).toBeUndefined();
    expect(result.bonuses.spellCastingSpeed).toBeUndefined();
  });

  it('viewingAfterEffect = ["eldritch_shield"]: shield drops; afterEffect atoms fire', () => {
    const result = runPipeline({
      ...WARLOCK_ELDRITCH_SHIELD_BUILD,
      viewingAfterEffect: ["eldritch_shield"],
    });
    expect(result.shieldProjections).toHaveLength(0);
    expect(result.perTypeBonuses.dark_magical).toBeCloseTo(0.30);
    expect(result.bonuses.spellCastingSpeed?.post_curve).toBeCloseTo(0.50);
  });
});
