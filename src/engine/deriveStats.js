// deriveStats — Stage 5 of the engine pipeline.
//
// Thin wrapper around src/engine/recipes.js::computeDerivedStats that adapts
// Stage 4's phased `bonuses` shape into the flat shape recipes expect, and
// applies attribute-multiplier semantics to `attrs` pre-recipe. Per plan
// §3.7 phase-flattening rule + arch-doc §7 per-phase contract table.
//
// Phase-flattening rule:
//   - Default: bonusesFlat[stat] = sum(Object.values(bonusesPhased[stat]))
//   - attribute_multiplier applied to attrs before recipes:
//       attrsAdjusted[attr] = (attrs[attr] + pre_curve_flat_of_attr)
//                           × (1 + attribute_multiplier_of_attr)
//   - type_damage_bonus / post_cap_multiplicative_layer EXCLUDED from
//     bonusesFlat (they live in perTypeBonuses / postCapMultiplicativeLayers
//     from Stage 4).
//   - healing_modifier: folded into the flat sum normally; Stage 6
//     projectHealing reads bonusesFlat.healingMod.
//   - Gear synthetic "gear" phase: included in the flat sum alongside named
//     phases (recipes don't distinguish).

import { computeDerivedStats } from './recipes.js';
import { CORE_ATTRS } from '../data/constants.js';

// Phases that DO NOT enter bonusesFlat (they live in separate Stage 4 outputs).
const EXCLUDED_PHASES = new Set(["type_damage_bonus", "post_cap_multiplicative_layer"]);

export function deriveStats(attributes, bonusesPhased, capOverrides = {}) {
  const bonusesFlat = flattenBonuses(bonusesPhased);
  const attrsAdjusted = applyAttributeSemantics(attributes, bonusesPhased);
  return computeDerivedStats(attrsAdjusted, bonusesFlat, capOverrides);
}

// ─────────────────────────────────────────────────────────────────────
// Phase-flattening — default: sum all phases except the excluded ones.
// Attributes are special-cased: attribute_multiplier isn't additive, so
// it's excluded here and applied in applyAttributeSemantics instead.
// pre_curve_flat on attributes IS included here for recipes that read
// bonus.<attr> (e.g. the PDR / MDR recipes reading attribute contributions).
// It's also applied to the attribute itself via applyAttributeSemantics —
// but recipes that read bonuses.<attr> (rare) get the flat sum.
// ─────────────────────────────────────────────────────────────────────

function flattenBonuses(phased) {
  const flat = {};
  if (!phased) return flat;
  for (const [stat, phases] of Object.entries(phased)) {
    let sum = 0;
    for (const [phase, value] of Object.entries(phases)) {
      if (EXCLUDED_PHASES.has(phase)) continue;
      // For attributes, attribute_multiplier is multiplicative — applied in
      // applyAttributeSemantics, NOT folded into the additive sum.
      if (CORE_ATTRS.has(stat) && phase === "attribute_multiplier") continue;
      sum += value;
    }
    if (sum !== 0) flat[stat] = sum;
  }
  return flat;
}

// ─────────────────────────────────────────────────────────────────────
// Attribute semantics (arch-doc §7 row 2):
//   attrsAdjusted[attr] = (attrs[attr] + pre_curve_flat(attr))
//                       × (1 + sum(attribute_multiplier(attr)))
//
// Malice (+15% wil): attribute_multiplier phase entry for stat=wil.
// Power of Sacrifice (str +15 pre_curve_flat): pre_curve_flat entry for stat=str.
// ─────────────────────────────────────────────────────────────────────

function applyAttributeSemantics(attributes, phased) {
  const adjusted = { ...(attributes ?? {}) };
  if (!phased) return adjusted;
  for (const attr of CORE_ATTRS) {
    const phases = phased[attr];
    if (!phases) continue;
    const preCurveFlat = phases.pre_curve_flat ?? 0;
    const multiplier = phases.attribute_multiplier ?? 0;
    const base = (adjusted[attr] ?? 0) + preCurveFlat;
    adjusted[attr] = base * (1 + multiplier);
  }
  return adjusted;
}
