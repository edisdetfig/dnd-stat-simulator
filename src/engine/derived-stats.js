// Derived stat pipeline - computes all derived stats from attributes and bonuses

import { CAPS, COMBAT } from '../data/constants.js';
import { evaluateCurve, STAT_CURVES } from './curves.js';

export function computeDerivedStats(attrs, bonuses, perkEffects) {
  const s = {};
  const capOverrides = perkEffects.capOverrides || {};

  // Physical Power Bonus
  s.physicalPower = attrs.str + (bonuses.physicalPower || 0);
  s.ppbFromCurve = evaluateCurve(STAT_CURVES.physicalPowerBonus, s.physicalPower);
  s.ppbFromBonuses = bonuses.physicalDamageBonus || 0;
  s.ppb = s.ppbFromCurve + s.ppbFromBonuses;

  // Magical Power Bonus
  s.magicalPower = attrs.wil + (bonuses.magicalPower || 0);
  s.mpbFromCurve = evaluateCurve(STAT_CURVES.magicPowerBonus, s.magicalPower);
  s.mpbFromBonuses = bonuses.magicalDamageBonus || 0;
  s.mpb = s.mpbFromCurve + s.mpbFromBonuses;

  // Health
  s.healthRating = attrs.str * 0.25 + attrs.vig * 0.75;
  s.health = Math.ceil(evaluateCurve(STAT_CURVES.health, s.healthRating)) + (bonuses.maxHealth || 0);

  // Action Speed
  s.actionSpeedRating = attrs.agi * 0.25 + attrs.dex * 0.75;
  s.actionSpeed = evaluateCurve(STAT_CURVES.actionSpeed, s.actionSpeedRating) + (bonuses.actionSpeed || 0);

  // Move Speed
  s.moveSpeed = Math.min(
    COMBAT.MOVE_SPEED_CAP,
    COMBAT.BASE_MOVE_SPEED + evaluateCurve(STAT_CURVES.moveSpeed, attrs.agi) + (bonuses.moveSpeed || 0)
  );

  // Physical Damage Reduction
  s.armorRating = (bonuses.armorRating || 0) + (bonuses.additionalArmorRating || 0);
  s.pdrFromCurve = evaluateCurve(STAT_CURVES.armorRatingToPDR, s.armorRating);
  s.pdrFromBonuses = bonuses.physicalDamageReduction || 0;
  s.pdrCap = capOverrides.pdr ?? CAPS.pdr;
  s.pdr = Math.min(s.pdrCap, s.pdrFromCurve + s.pdrFromBonuses);

  // Magical Damage Reduction
  s.magicResistance = evaluateCurve(STAT_CURVES.willToMagicResistance, attrs.wil) + (bonuses.magicResistance || 0);
  s.mdrFromCurve = evaluateCurve(STAT_CURVES.magicResistanceToMDR, s.magicResistance);
  s.mdrFromBonuses = bonuses.magicalDamageReduction || 0;
  s.mdrCap = capOverrides.mdr ?? CAPS.mdr;
  s.mdr = Math.min(s.mdrCap, s.mdrFromCurve + s.mdrFromBonuses);

  // Antimagic
  s.hasAntimagic = !!perkEffects.antimagic;
  s.effectiveMagicDmgTaken = s.hasAntimagic ? (1 - s.mdr) * (1 - COMBAT.ANTIMAGIC_REDUCTION) : (1 - s.mdr);

  // Buff/Debuff Duration
  s.buffDuration = evaluateCurve(STAT_CURVES.buffDuration, attrs.wil) + (bonuses.buffDurationBonus || 0);
  s.debuffDuration = evaluateCurve(STAT_CURVES.debuffDuration, attrs.wil);

  // Cooldown Reduction
  s.cdr = Math.min(
    capOverrides.cdr ?? CAPS.cdr,
    evaluateCurve(STAT_CURVES.cooldownReduction, attrs.res) + (bonuses.cooldownReductionBonus || 0)
  );

  // Spell Casting Speed
  s.spellCastingSpeed = evaluateCurve(STAT_CURVES.spellCastingSpeed, attrs.kno) + (perkEffects.spellCastingSpeed || 0);

  // Memory Capacity
  const rawMem = evaluateCurve(STAT_CURVES.memoryCapacity, attrs.kno);
  s.memoryCapacity = Math.ceil(rawMem * (1 + (bonuses.memoryCapacityBonus || 0))) + (bonuses.additionalMemoryCapacity || 0);

  // Recovery stats
  s.healthRecovery = evaluateCurve(STAT_CURVES.healthRecovery, attrs.vig);
  s.memoryRecovery = evaluateCurve(STAT_CURVES.memoryRecovery, attrs.kno);
  s.persuasiveness = evaluateCurve(STAT_CURVES.persuasiveness, attrs.res);
  s.luck = bonuses.luck || 0;

  // Interaction speeds
  const risRating = attrs.dex * 0.25 + attrs.res * 0.75;
  s.regularInteractionSpeed = evaluateCurve(STAT_CURVES.regularInteractionSpeed, risRating);
  s.magicalInteractionSpeed = evaluateCurve(STAT_CURVES.magicalInteractionSpeed, attrs.wil);

  // Manual Dexterity & Equip Speed
  s.manualDexterity = Math.min(capOverrides.manualDexterity ?? CAPS.manualDexterity, evaluateCurve(STAT_CURVES.manualDexterity, attrs.dex));
  s.equipSpeed = evaluateCurve(STAT_CURVES.itemEquipSpeed, attrs.dex);

  // Penetration and damage stats
  s.armorPenetration = bonuses.armorPenetration || 0;
  s.magicPenetration = bonuses.magicPenetration || 0;
  s.headshotDamageBonus = bonuses.headshotDamageBonus || 0;
  s.projectileDamageReduction = bonuses.projectileDamageReduction || 0;
  s.headshotDamageReduction = bonuses.headshotDamageReduction || 0;

  return s;
}
