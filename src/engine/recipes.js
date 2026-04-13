// DERIVED_STAT_RECIPES — the registry that turns (attrs, bonuses) into
// derived stats (HP, PPB, MPB, PDR, MDR, etc.).
//
// ── Recipe contract (read this once) ──
//
// A recipe is one of two forms — they DO NOT mix:
//
//   1. `compute` form. Single function, full control. Returns either a
//      plain number or `{ value, rawValue?, cap? }`. The runner
//      normalizes. Use for stats with non-standard math (health's
//      conditional rounding, PDR's AR multiplier, MDR's two-stage curve)
//      and for passthrough stats that aren't curve-driven.
//
//   2. Declarative form. Builds from these fields, in this order:
//        rawCurve = curveKey ? evaluateCurve(STAT_CURVES[curveKey],
//                                            inputFormula(attrs, bonuses))
//                            : 0
//        scaled   = rawCurve * outputMultiplier(bonuses)        // default *1
//        rounded  = ROUND[rounding](scaled)                     // default identity
//        raw      = rounded + postCurveAdds(bonuses)            // default +0
//
// Uniform cap step applies AFTER either form: when recipe.cap or
// capOverrides[id] is set, the value is Math.min'd to the cap and the
// result carries `rawValue` and `cap` so UI can render overflow
// indicators.
//
// Cap precedence: `capOverrides[id]` (if set) wins over `recipe.cap`.
//
// ── Return shape ──
//
// runRecipe returns `{ value, rawValue?, cap? }`:
//   • value     — the effective number consumers use in math and display
//   • rawValue  — pre-cap value (only present when a cap applies)
//   • cap       — the cap that applied (may equal value if at or above)
// computeDerivedStats returns `{ [statId]: DerivedStat }` with the same shape.

import { evaluateCurve, STAT_CURVES } from './curves.js';
import { PATCH_HEALTH_BONUS, HR_STR_WEIGHT, HR_VIG_WEIGHT } from '../data/constants.js';

const ROUND = { floor: Math.floor, ceil: Math.ceil, round: Math.round };

export function runRecipe(id, recipe, attrs, bonuses, capOverrides = {}) {
  let result;
  if (recipe.compute) {
    const computed = recipe.compute(attrs, bonuses, { capOverrides });
    result = typeof computed === "number" ? { value: computed } : { ...computed };
  } else {
    const inputVal = recipe.inputFormula ? recipe.inputFormula(attrs, bonuses) : 0;
    const curveVal = recipe.curveKey
      ? evaluateCurve(STAT_CURVES[recipe.curveKey], inputVal)
      : 0;
    const mult = recipe.outputMultiplier ? recipe.outputMultiplier(bonuses) : 1;
    let value = curveVal * mult;
    if (recipe.rounding && ROUND[recipe.rounding]) value = ROUND[recipe.rounding](value);
    if (recipe.postCurveAdds) value += recipe.postCurveAdds(bonuses);
    result = { value };
  }

  const cap = capOverrides[id] ?? recipe.cap;
  if (cap != null) {
    const raw = result.value;
    result = { value: Math.min(raw, cap), rawValue: raw, cap };
  }
  return result;
}

export function computeDerivedStats(attrs, bonuses, capOverrides = {}) {
  const out = {};
  for (const [id, recipe] of Object.entries(DERIVED_STAT_RECIPES)) {
    out[id] = runRecipe(id, recipe, attrs, bonuses, capOverrides);
  }
  return out;
}

export const DERIVED_STAT_RECIPES = {
  // ── Custom-path recipes (compute) ──

  // Verified per docs/health_formula.md (22 test points). Conditional rounding:
  //   sumMHB == 0 → ceil(baseHealth)
  //   sumMHB  > 0 → floor(baseHealth × (1 + sumMHB))
  // Then add +10 patch bonus and flat MHA, both unscaled by MHB.
  health: {
    compute: (attrs, bonuses) => {
      const hr = attrs.str * HR_STR_WEIGHT + attrs.vig * HR_VIG_WEIGHT;
      const base = evaluateCurve(STAT_CURVES.health, hr);
      const mhb = bonuses.maxHealthBonus || 0;
      const mha = bonuses.maxHealth || 0;
      const rounded = mhb === 0 ? Math.ceil(base) : Math.floor(base * (1 + mhb));
      return rounded + PATCH_HEALTH_BONUS + mha;
    },
  },

  // PDR. armorRatingMultiplier (Fighter Defense Mastery +15%) scales gear
  // armorRating before the curve. additionalArmorRating is a flat add to AR
  // that is NOT scaled by the multiplier. Default cap 70% (Fighter Defense
  // Mastery raises to 75% via cap_override). Cap applied by runRecipe.
  pdr: {
    cap: 0.70,
    compute: (attrs, bonuses) => {
      const arMult = 1 + (bonuses.armorRatingMultiplier || 0);
      const totalAR = (bonuses.armorRating || 0) * arMult
                    + (bonuses.additionalArmorRating || 0);
      const raw = evaluateCurve(STAT_CURVES.armorRatingToPDR, totalAR);
      return raw + (bonuses.physicalDamageReduction || 0);
    },
  },

  // MDR. Two-stage curve: WIL → magicResistance, then total MR → MDR.
  // Gear adds flat MR on top of the WIL-derived MR before the second curve.
  // Default cap 65% per data/stat_curves.json source of truth (Barbarian Iron
  // Will raises to 75% via cap_override). Cap applied by runRecipe.
  mdr: {
    cap: 0.65,
    compute: (attrs, bonuses) => {
      const baseMR = evaluateCurve(STAT_CURVES.willToMagicResistance, attrs.wil);
      const totalMR = baseMR + (bonuses.magicResistance || 0);
      const raw = evaluateCurve(STAT_CURVES.magicResistanceToMDR, totalMR);
      return raw + (bonuses.magicalDamageReduction || 0);
    },
  },

  // ── Power bonuses (curve + post-curve flat) ──

  ppb: {
    curveKey: "physicalPowerBonus",
    inputFormula: (attrs, bonuses) => attrs.str + (bonuses.physicalPower || 0),
    postCurveAdds: (bonuses) => bonuses.physicalDamageBonus || 0,
  },
  mpb: {
    curveKey: "magicPowerBonus",
    inputFormula: (attrs, bonuses) => attrs.wil + (bonuses.magicalPower || 0),
    postCurveAdds: (bonuses) => bonuses.magicalDamageBonus || 0,
  },

  // ── Movement ──

  moveSpeed: {
    curveKey: "moveSpeed",
    inputFormula: (attrs) => attrs.agi,
    postCurveAdds: (bonuses) => bonuses.moveSpeed || 0,
    outputMultiplier: (bonuses) => 1 + (bonuses.moveSpeedBonus || 0),
  },
  actionSpeed: {
    curveKey: "actionSpeed",
    inputFormula: (attrs) => attrs.agi * 0.25 + attrs.dex * 0.75,
    postCurveAdds: (bonuses) => bonuses.actionSpeed || 0,
  },

  // ── Single-attribute curves ──

  spellCastingSpeed: {
    curveKey: "spellCastingSpeed",
    inputFormula: (attrs) => attrs.kno,
    postCurveAdds: (bonuses) => bonuses.spellCastingSpeed || 0,
  },
  regularInteractionSpeed: {
    curveKey: "regularInteractionSpeed",
    inputFormula: (attrs) => attrs.dex * 0.25 + attrs.res * 0.75,
    postCurveAdds: (bonuses) => bonuses.regularInteractionSpeed || 0,
  },
  magicalInteractionSpeed: {
    curveKey: "magicalInteractionSpeed",
    inputFormula: (attrs) => attrs.wil,
    postCurveAdds: (bonuses) => bonuses.magicalInteractionSpeed || 0,
  },
  cdr: {
    curveKey: "cooldownReduction",
    inputFormula: (attrs) => attrs.res,
    postCurveAdds: (bonuses) => bonuses.cooldownReductionBonus || 0,
  },
  buffDuration: {
    curveKey: "buffDuration",
    inputFormula: (attrs) => attrs.wil,
    postCurveAdds: (bonuses) => bonuses.buffDurationBonus || 0,
  },
  debuffDuration: {
    curveKey: "debuffDuration",
    inputFormula: (attrs) => attrs.wil,
    postCurveAdds: (bonuses) => bonuses.debuffDurationBonus || 0,
  },
  memoryCapacity: {
    curveKey: "memoryCapacity",
    inputFormula: (attrs) => attrs.kno,
    postCurveAdds: (bonuses) => (bonuses.additionalMemoryCapacity || 0)
                              + (bonuses.memoryCapacityBonus || 0),
  },
  healthRecovery: {
    curveKey: "healthRecovery",
    inputFormula: (attrs) => attrs.vig,
  },
  memoryRecovery: {
    curveKey: "memoryRecovery",
    inputFormula: (attrs) => attrs.kno,
  },
  manualDexterity: {
    curveKey: "manualDexterity",
    inputFormula: (attrs) => attrs.dex,
  },
  equipSpeed: {
    curveKey: "itemEquipSpeed",
    inputFormula: (attrs) => attrs.dex,
  },
  persuasiveness: {
    curveKey: "persuasiveness",
    inputFormula: (attrs) => attrs.res,
  },

  // ── Passthrough (not curve-driven; sum of bonus sources) ──

  luck:                       { compute: (a, b) => b.luck                         || 0 },
  magicalHealing:             { compute: (a, b) => b.magicalHealing               || 0 },
  physicalHealing:            { compute: (a, b) => b.physicalHealing              || 0 },
  armorPenetration:           { compute: (a, b) => b.armorPenetration             || 0 },
  magicPenetration:           { compute: (a, b) => b.magicPenetration             || 0 },
  headshotDamageReduction:    { compute: (a, b) => b.headshotDamageReduction      || 0 },
  projectileDamageReduction:  { compute: (a, b) => b.projectileDamageReduction    || 0 },

  // headshotDamageBonus combines gear `headshotDamageBonus` (e.g., +5% from
  // a helmet) with perk `headshotPower` (Barbarian Executioner +20%, Ranger
  // Sharpshooter +15%). Both are additive multipliers on headshot damage.
  headshotDamageBonus: {
    compute: (a, b) => (b.headshotDamageBonus || 0) + (b.headshotPower || 0),
  },
};
