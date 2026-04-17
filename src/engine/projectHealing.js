// projectHealing — Stage 6 of the engine pipeline (heal branch).
//
// Per arch-doc §16 + plan §3.9.
//
// Two input streams:
//   1. Authored HEAL_ATOMs from Stage 3.
//   2. Derived-heal descriptors emitted by projectDamage (lifesteal + targetMaxHp).
//
// Authored algorithm (plan §3.9):
//   healingAdd = magical → derivedStats.magicalHealing, else derivedStats.physicalHealing
//   mpb        = magical → derivedStats.mpb, else 0 (physical heal doesn't scale with MPB
//                — per docs/healing_verification.md:47)
//   amount     = calcHealing({baseHeal, scaling, mpb, healingAdd, healingMod,
//                             isHoT, baseDuration, buffDuration})
//   percentMaxHealth: amount = percentMaxHealth × heal-target's max HP (single-context).
//
// Derived algorithm (plan §9.5, §3.9 per-descriptor):
//   amount = calcHealing({baseHeal: descriptor.healAmount, scaling: 0, mpb: 0,
//                         healingAdd: 0, healingMod, isHoT: false, ...})
//   This preserves the HealingMod multiplier but bypasses scaling/MPB (the
//   descriptor's healAmount is already a computed number).

import { calcHealing } from './damage.js';

export function projectHealing(
  healAtoms,
  derivedHealDescriptors,
  derivedStats,
  healingModFlat = 0,
  derivedBuffDuration = 0,
  ctx = {}
) {
  const out = [];

  // Authored HEAL_ATOMs.
  for (const atom of healAtoms) {
    out.push(projectAuthoredHeal(atom, derivedStats, healingModFlat, derivedBuffDuration, ctx));
  }

  // Derived-heal descriptors (source damage atom's id is reused as the
  // resulting HealProjection.atomId — per arch-doc §16.2).
  for (const desc of derivedHealDescriptors ?? []) {
    const amount = calcHealing({
      baseHeal:     desc.healAmount,
      scaling:      0,
      mpb:          0,
      healingAdd:   0,
      healingMod:   healingModFlat,
      isHoT:        false,
      baseDuration: 0,
      buffDuration: 0,
    });
    out.push({
      atomId:      desc.damageAtomId,
      source:      desc.source,
      healType:    desc.healType,
      amount,
      derivedFrom: { kind: desc.kind, damageAtomId: desc.damageAtomId },
    });
  }

  return out;
}

function projectAuthoredHeal(atom, derivedStats, healingModFlat, derivedBuffDuration, ctx) {
  const isMagical = atom.healType === "magical";
  const healingAdd = isMagical
    ? (derivedStats.magicalHealing?.value ?? 0)
    : (derivedStats.physicalHealing?.value ?? 0);
  const mpb = isMagical ? (derivedStats.mpb?.value ?? 0) : 0;

  let amount;
  if (atom.percentMaxHealth != null) {
    // Single-context percentMaxHealth (arch-doc §16.3). Heal = % × heal
    // target's max HP. Vampirism (HealingMod) still multiplies per
    // healing_verification.md:27.
    const targetMaxHp = resolveHealTargetMaxHealth(atom.target, ctx, derivedStats);
    const base = atom.percentMaxHealth * targetMaxHp;
    amount = base * (1 + healingModFlat);
  } else {
    amount = calcHealing({
      baseHeal:     atom.baseHeal ?? 0,
      scaling:      atom.scaling  ?? 0,
      mpb,
      healingAdd,
      healingMod:   healingModFlat,
      isHoT:        !!atom.isHot,
      baseDuration: atom.duration ?? 0,
      buffDuration: derivedBuffDuration,
    });
  }

  const out = {
    atomId:   atom.atomId,
    source:   atom.source,
    healType: atom.healType,
    amount,
  };
  if (atom.isHot)    out.isHot    = true;
  if (atom.tickRate) out.tickRate = atom.tickRate;
  if (atom.duration) out.duration = atom.duration;
  return out;
}

function resolveHealTargetMaxHealth(target, ctx, derivedStats) {
  const selfMax = derivedStats.health?.value ?? 0;
  if (target === "enemy" || target === "nearby_enemies") {
    return ctx.target?.maxHealth ?? 0;
  }
  // self / ally / self_or_ally / party / nearby_allies → caster proxy (Phase 3).
  return selfMax;
}
