// HP-scaling post-processor — stub for Phase 1.
//
// Per spec: effects can carry `hpScaling: { per, valuePerStep, maxValue }`
// which, at render time, expands into a dynamic value based on
// ctx.hpPercent. No Warlock ability uses this (it's Barbarian Berserker /
// Sorcerer Elemental Fury territory). Phase 3 fleshes this out.
//
// This module exists now so the pipeline can call `expandHpScaling(entries, ctx)`
// without a branch. For Phase 1 it passes entries through unchanged.

export function expandHpScaling(entries, _ctx) {
  // TODO(Phase 3): for each entry whose effect.hpScaling is set, compute
  // effective value from ctx.hpPercent and emit a cloned effect with the
  // computed value. For now, effects without hpScaling pass through as-is.
  return entries;
}
