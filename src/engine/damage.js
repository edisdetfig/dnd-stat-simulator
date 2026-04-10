// Damage and healing calculators

import { COMBAT } from '../data/constants.js';

// Physical melee damage calculation
export function calcPhysicalMeleeDamage({
  baseWeaponDmg,
  buffWeaponDmg = 0,
  comboMultiplier = 1.0,
  impactZone = 1.0,
  gearWeaponDmg = 0,
  ppb,
  additionalPhysicalDmg = 0,
  hitLocation = "body",
  headshotBonus = 0,
  targetHeadshotDR = 0,
  targetPDR,
  attackerPen = 0,
  projectileReduction = 0,
  truePhysicalDmg = 0
}) {
  let hlm = 1.0;
  if (hitLocation === "head") {
    hlm = 1.0 + COMBAT.HS_BASE_MULT + headshotBonus - targetHeadshotDR;
  } else if (hitLocation === "limb") {
    hlm = COMBAT.LIMB_MULT;
  }
  const dr = Math.max(1 - targetPDR * (1 - attackerPen), 1 - targetPDR);
  const base = (baseWeaponDmg + buffWeaponDmg) * comboMultiplier * impactZone + gearWeaponDmg;
  return Math.floor((base * (1 + ppb) + additionalPhysicalDmg) * hlm * dr * (1 - projectileReduction) + truePhysicalDmg);
}

// Spell/magic damage calculation
export function calcSpellDamage({
  baseDamage,
  scaling,
  mpb,
  hitLocation = "body",
  affectedByHitLocation = true,
  headshotBonus = 0,
  targetHeadshotDR = 0,
  targetMDR,
  attackerMagicPen = 0,
  typeBonuses = 0
}) {
  let hlm = 1.0;
  if (affectedByHitLocation) {
    if (hitLocation === "head") {
      hlm = 1.0 + COMBAT.HS_BASE_MULT + headshotBonus - targetHeadshotDR;
    } else if (hitLocation === "limb") {
      hlm = COMBAT.LIMB_MULT;
    }
  }
  const dr = Math.max(1 - targetMDR * (1 - attackerMagicPen), 1 - targetMDR);
  return Math.floor(baseDamage * (1 + mpb * scaling + typeBonuses) * hlm * dr);
}

// Healing calculation (wiki-sourced formula from spellsandguns.com/Healing)
// Instant: (BaseHeal + HealingAdd × Scaling) × (1 + MPB × Scaling) × (1 + HealingMod)
// HoT:     ... × (floor(BaseDuration × (1 + BuffDuration)) / BaseDuration)
export function calcHealing({
  baseHeal,
  scaling,
  mpb = 0,
  healingAdd = 0,
  healingMod = 0,
  isHoT = false,
  baseDuration = 0,
  buffDuration = 0
}) {
  const base = baseHeal + healingAdd * scaling;
  const powerMult = 1 + mpb * scaling;
  const modMult = 1 + healingMod;
  let total = base * powerMult * modMult;
  if (isHoT && baseDuration > 0) {
    const effectiveTicks = Math.floor(baseDuration * (1 + buffDuration));
    total = total * effectiveTicks / baseDuration;
  }
  return total;
}

// Form (shapeshift) attack damage — primitive curve formula.
// baseDamage is pre-computed by the caller: primitiveCurve(attr) × multiplier + add.
// Status: WIKI-SOURCED, not yet verified in-game.
export function calcFormAttackDamage({
  baseDamage,
  scaling = 1.0,
  damageType = "physical",
  ppb = 0,
  mpb = 0,
  targetPDR = 0,
  targetMDR = 0,
  attackerArmorPen = 0,
  attackerMagicPen = 0,
}) {
  const isPhysical = damageType === "physical";
  const powerBonus = isPhysical ? ppb : mpb;
  const rawDmg = baseDamage * (1 + powerBonus * scaling);

  const targetDR = isPhysical ? targetPDR : targetMDR;
  const pen = isPhysical ? attackerArmorPen : attackerMagicPen;
  const dr = Math.max(1 - targetDR * (1 - pen), 1 - targetDR);
  return Math.floor(rawDmg * dr);
}

// Reference healing items for display
export const HEALING_ITEMS = [
  {
    id: "potion_healing",
    name: "Healing Potion",
    baseHeal: 20,
    scaling: 0.50,
    healType: "magical",
    isHoT: true,
    baseDuration: 20,
    label: "over duration"
  },
  {
    id: "trolls_blood",
    name: "Troll's Blood",
    baseHeal: 30,
    scaling: 0.50,
    healType: "magical",
    isHoT: true,
    baseDuration: 12,
    label: "over duration"
  },
];
