// projectDamage — Stage 6 of the engine pipeline (damage branch).
//
// Per arch-doc §15 + §16.2 + §16.4 + plan §3.8 + §9.1/§9.2.
//
// Per-atom algorithm:
//   1. Re-evaluate the atom's own condition if it carries damage_type
//      (Stage 2 pass-through atoms re-check here with the current
//      projection's damageType). Skip atom if condition is false.
//   2. Dispatch: damageType === "physical" → projectPhysical else projectMagical.
//   3. AoE/DoT or target ∈ {nearby_enemies, nearby_allies} → only hit.body.
//   4. percentMaxHealth: compute derivedPercentMaxHealthDamage separately.
//   5. count ≥ 2: carry through on projection for UI.
//   6. Lifesteal/targetMaxHp: emit DerivedHealDescriptor (consumed by
//      projectHealing).
//
// Lifesteal pre-MDR: replicates calcSpellDamage up to but excluding the
// MDR clamp — per healing_verification.md:18-21, lifesteal uses outgoing
// damage BEFORE reductions. We compute pre_mdr_body ourselves and thread
// it into the descriptor.
//
// Post-cap multiplicative layers (Antimagic pattern) applied AFTER the
// MDR-clamped calcSpellDamage output; layers with damage_type-gated
// conditions are re-evaluated per outgoing projection.

import { calcPhysicalMeleeDamage, calcSpellDamage } from './damage.js';
import { evaluateCondition } from './conditions.js';
import { damageTypeToHealType } from './damageTypeToHealType.js';
import { COMBAT } from '../data/constants.js';

const HIT_LOCATIONS = ["body", "head", "limb"];

export function projectDamage(
  damageAtoms,
  derivedStats,
  perTypeBonuses,
  postCapMultiplicativeLayers,
  target,
  gearWeapon,
  ctx
) {
  const damageProjections = [];
  const derivedHealDescriptors = [];

  for (const atom of damageAtoms) {
    // Stage 2 deferred evaluation: if the atom's own condition contains
    // damage_type, re-evaluate now with the outgoing damageType.
    if (atom.condition != null
        && conditionTreeContainsDamageType(atom.condition)
        && !evaluateCondition(atom.condition, ctx, /* abilityShape */ undefined, atom.damageType)) {
      continue;
    }

    const isPhysical = atom.damageType === "physical";
    const isAoEorDot = atom.isDot
                    || atom.target === "nearby_enemies"
                    || atom.target === "nearby_allies";

    const hit = {};
    // AoE/DoT → body only (no head/limb). Otherwise all three.
    const locations = isAoEorDot ? ["body"] : HIT_LOCATIONS;

    for (const loc of locations) {
      let hitDmg;
      if (atom.trueDamage && !isPhysical) {
        // Magical trueDamage: flat atom.base per location; bypasses MDR,
        // hit-location multiplier, and post-cap layers. Matches Shadow Touch
        // "2 dark magical (all hits)" semantics per docs/damage_formulas.md:240.
        hitDmg = Math.floor(atom.base ?? 0);
      } else if (isPhysical) {
        hitDmg = projectPhysicalHit(atom, loc, derivedStats, target, gearWeapon, ctx, postCapMultiplicativeLayers);
      } else {
        hitDmg = projectMagicalHit(atom, loc, derivedStats, perTypeBonuses, target, ctx, postCapMultiplicativeLayers);
      }
      const scaled = applyStackAndScalesWith(hitDmg, atom);
      hit[loc] = scaled;
    }

    const projection = {
      atomId:     atom.atomId,
      source:     atom.source,
      damageType: atom.damageType,
      hit,
    };

    if (atom.isDot)    projection.isDot = true;
    if (atom.tickRate) projection.tickRate = atom.tickRate;
    if (atom.duration) projection.duration = atom.duration;
    if (atom.trueDamage) projection.trueDamage = true;
    if (atom.count && atom.count > 1) projection.count = atom.count;

    // percentMaxHealth — separate derived number, not merged into hit.
    if (atom.percentMaxHealth != null) {
      projection.derivedPercentMaxHealthDamage =
        atom.percentMaxHealth * resolveTargetMaxHealth(atom.target, ctx, derivedStats);
    }

    // Lifesteal (arch-doc §16.2) — heal from pre-MDR damage dealt.
    if (atom.lifestealRatio != null && atom.lifestealRatio > 0) {
      const preMdr = isPhysical
        ? computePhysicalPreDR(atom, derivedStats, target, gearWeapon, ctx)
        : computeMagicalPreMDR(atom, derivedStats, perTypeBonuses, ctx);
      const healAmount = atom.lifestealRatio * preMdr;
      derivedHealDescriptors.push({
        kind:         "lifesteal",
        damageAtomId: atom.atomId,
        healAmount,
        healType:     damageTypeToHealType(atom.damageType),
        target:       "self",
        source:       atom.source,
      });
    }

    // targetMaxHpRatio (arch-doc §16.4) — heal from target max HP.
    if (atom.targetMaxHpRatio != null && atom.targetMaxHpRatio > 0) {
      const targetMaxHp = resolveTargetMaxHealth(atom.target, ctx, derivedStats);
      derivedHealDescriptors.push({
        kind:         "targetMaxHp",
        damageAtomId: atom.atomId,
        healAmount:   atom.targetMaxHpRatio * targetMaxHp,
        healType:     damageTypeToHealType(atom.damageType),
        target:       "self",
        source:       atom.source,
      });
    }

    damageProjections.push(projection);
  }

  return { damageProjections, derivedHealDescriptors };
}

// ─────────────────────────────────────────────────────────────────────
// Physical dispatch
// ─────────────────────────────────────────────────────────────────────

function projectPhysicalHit(atom, hitLocation, derivedStats, target, gearWeapon, ctx, postCapLayers) {
  // Additional physical damage (atom.base) doesn't benefit from PPB per
  // damage_formulas.md:31.
  const baseWeaponDmg = gearWeapon?.baseWeaponDmg ?? 0;
  const gearWeaponDmg = gearWeapon?.gearWeaponDmg ?? 0;
  const ppb = derivedStats.ppb?.value ?? 0;
  const armorPen = derivedStats.armorPenetration?.value ?? 0;
  const headshotBonus = derivedStats.headshotDamageBonus?.value ?? 0;
  const buffWeaponDmg = ctx._buffWeaponDamageFlat ?? 0;

  const gearOnHitTruePhys = sumGearOnHitTruePhysical(atom, ctx);

  return calcPhysicalMeleeDamage({
    baseWeaponDmg,
    buffWeaponDmg,
    comboMultiplier:       ctx.comboMultiplier ?? 1.0,
    impactZone:            ctx.impactZone ?? 1.0,
    gearWeaponDmg,
    ppb,
    additionalPhysicalDmg: atom.base ?? 0,
    hitLocation,
    headshotBonus,
    targetHeadshotDR:      target?.headshotDR ?? 0,
    targetPDR:             target?.pdr ?? 0,
    attackerPen:           armorPen,
    projectileReduction:   (Array.isArray(atom.tags) && atom.tags.includes("projectile"))
                             ? (target?.projectileDR ?? 0)
                             : 0,
    truePhysicalDmg:       (atom.trueDamage ? (atom.base ?? 0) : 0) + gearOnHitTruePhys,
  });
}

// Gear on-hit-effect contribution to the true-physical slot (OQ-D6).
// Applies only to physical primary-weapon-hit atoms — `atom.isWeaponPrimary
// === true` gates the read so ability-authored atoms (skills, AoEs, DoTs)
// never pick up the rider. Matching §4.4 Spiked Gauntlet semantics: +1 true
// physical rolled into the main number per docs/damage_formulas.md:235-240
// (added inside Math.floor as the final `+ truePhysicalDmg` term — for
// integer riders the end-state equals `floor(X)+1`).
//
// Rider filter:
//   - damageType === "physical"
//   - trueDamage === true        (non-true-damage riders would need a
//                                 separate non-trueDamage injection path)
//   - separateInstance === false (true → separate DAMAGE atom; deferred)
// Scaling: rider.scaling ?? 1 is applied multiplicatively to the damage
// value. For flat integer riders (Spiked Gauntlet +1 × 1.0) scaling is a
// passthrough; future riders may vary.
function sumGearOnHitTruePhysical(atom, ctx) {
  // atom.isWeaponPrimary: set by future weapon-primary-atom synthesis
  // (Phase 11+). No pipeline stage populates it today; tests must set it
  // manually. See engine_architecture.md § 15.1 for the contract.
  if (!atom?.isWeaponPrimary) return 0;
  const effs = ctx?.gear?.onHitEffects ?? [];
  if (effs.length === 0) return 0;
  let sum = 0;
  for (const eff of effs) {
    if (eff.damageType !== "physical") continue;
    if (!eff.trueDamage) continue;
    if (eff.separateInstance) continue;
    sum += (eff.damage ?? 0) * (eff.scaling ?? 1);
  }
  return sum;
}

// Physical pre-DR computation for lifesteal — runs calcPhysicalMeleeDamage
// with targetPDR = 0 and projectileReduction = 0 (simulates pre-reduction).
function computePhysicalPreDR(atom, derivedStats, target, gearWeapon, ctx) {
  const baseWeaponDmg = gearWeapon?.baseWeaponDmg ?? 0;
  const gearWeaponDmg = gearWeapon?.gearWeaponDmg ?? 0;
  const ppb = derivedStats.ppb?.value ?? 0;
  const headshotBonus = derivedStats.headshotDamageBonus?.value ?? 0;
  const buffWeaponDmg = ctx._buffWeaponDamageFlat ?? 0;
  return calcPhysicalMeleeDamage({
    baseWeaponDmg,
    buffWeaponDmg,
    comboMultiplier:       ctx.comboMultiplier ?? 1.0,
    impactZone:            ctx.impactZone ?? 1.0,
    gearWeaponDmg,
    ppb,
    additionalPhysicalDmg: atom.base ?? 0,
    hitLocation:           "body",
    headshotBonus,
    targetHeadshotDR:      0,
    targetPDR:             0,
    attackerPen:           0,
    projectileReduction:   0,
    truePhysicalDmg:       atom.trueDamage ? (atom.base ?? 0) : 0,
  });
}

// ─────────────────────────────────────────────────────────────────────
// Magical dispatch
// ─────────────────────────────────────────────────────────────────────

function projectMagicalHit(atom, hitLocation, derivedStats, perTypeBonuses, target, ctx, postCapLayers) {
  const mpb = derivedStats.mpb?.value ?? 0;
  const magicPen = derivedStats.magicPenetration?.value ?? 0;
  const headshotBonus = derivedStats.headshotDamageBonus?.value ?? 0;
  const typeBonus = perTypeBonuses?.[atom.damageType] ?? 0;
  const weaponMagicalDamage = ctx._weaponMagicalDamageFlat ?? 0;
  const isAoEorDot = atom.isDot
                  || atom.target === "nearby_enemies"
                  || atom.target === "nearby_allies";

  let hitDmg = calcSpellDamage({
    baseDamage:             (atom.base ?? 0) + weaponMagicalDamage,
    scaling:                atom.scaling ?? 0,
    mpb,
    hitLocation,
    affectedByHitLocation:  !isAoEorDot,
    headshotBonus,
    targetHeadshotDR:       target?.headshotDR ?? 0,
    targetMDR:              target?.mdr ?? 0,
    attackerMagicPen:       magicPen,
    typeBonuses:            typeBonus,
  });

  // Post-cap multiplicative layers (arch-doc §15.2). Applied after calcSpellDamage
  // returns — calcSpellDamage has already clamped MDR internally.
  for (const layer of postCapLayers ?? []) {
    if (layer.condition != null
        && !evaluateCondition(layer.condition, ctx, /* abilityShape */ undefined, atom.damageType)) {
      continue;
    }
    if (layer.stat === "magicDamageTaken") {
      hitDmg = Math.floor(hitDmg * layer.multiplier);
    }
    // Future: other post-cap stats (physicalDamageTaken, etc.) extend here.
  }

  return hitDmg;
}

// Magical pre-MDR computation for lifesteal. Per healing_verification.md:18-21,
// lifesteal = outgoing × (1 + HealingMod) — the "outgoing" here is body damage
// before MDR/DR clamp. We replicate the calcSpellDamage formula sans the MDR
// multiplier.
function computeMagicalPreMDR(atom, derivedStats, perTypeBonuses, ctx) {
  const mpb = derivedStats.mpb?.value ?? 0;
  const typeBonus = perTypeBonuses?.[atom.damageType] ?? 0;
  const weaponMagicalDamage = ctx._weaponMagicalDamageFlat ?? 0;
  const scaling = atom.scaling ?? 0;
  const baseDamage = (atom.base ?? 0) + weaponMagicalDamage;
  // Body hit location (hlm = 1.0) since lifesteal tracks per-hit pre-reduction
  // at the body location.
  const hlm = 1.0;
  return Math.floor(baseDamage * (1 + mpb * scaling + typeBonus) * hlm);
}

// ─────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────

function applyStackAndScalesWith(hitDmg, atom) {
  let value = hitDmg;
  if (atom.stackMultiplier != null && atom.stackMultiplier !== 1) {
    value *= atom.stackMultiplier;
  }
  if (atom.scalesWithMultiplier != null) {
    value *= (1 + atom.scalesWithMultiplier);
  }
  return Math.floor(value);
}

function resolveTargetMaxHealth(target, ctx, derivedStats) {
  if (target === "self") return derivedStats.health?.value ?? 0;
  if (target === "enemy" || target === "nearby_enemies") {
    return ctx.target?.maxHealth ?? 0;
  }
  // ally / self_or_ally / party / nearby_allies — use caster proxy for Phase 3.
  return derivedStats.health?.value ?? 0;
}

function conditionTreeContainsDamageType(cond) {
  if (!cond || typeof cond !== "object") return false;
  if (cond.type === "damage_type") return true;
  if (Array.isArray(cond.conditions)) {
    return cond.conditions.some(conditionTreeContainsDamageType);
  }
  return false;
}

// Re-export for downstream consumers / tests.
export { COMBAT };
