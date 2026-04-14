// Engine public surface.

export { aggregateGear } from './aggregator.js';
export { evaluateCurve, getMarginalSlope, getCurveContext, STAT_CURVES, DERIVED_CURVE_MAP, TIER_COLORS } from './curves.js';
export { buildEngineContext } from './context.js';
export { evaluateCondition, passesConditions, isAbilityActive } from './conditions.js';
export { DERIVED_STAT_RECIPES, runRecipe, computeDerivedStats } from './recipes.js';
export { runEffectPipeline, runTargetPipeline, resolveApplyMode } from './effect-pipeline.js';
export { getAvailableSpells } from './spell-availability.js';
export * as collectors from './collectors/index.js';
