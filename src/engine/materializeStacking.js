// materializeStacking — Stage 3 of the engine pipeline.
//
// For each filtered atom: apply maxStacks / resource count AND dispatch
// scalesWith to derive the runtime value. Per arch-doc §12/§13 + plan §3.5.
//
// Output invariants (plan §5 transition 3→4):
//   STAT_EFFECT_ATOM: gains `materializedValue` field (original `value` preserved).
//     - maxStacks: materializedValue = (value + scalesWith_value) * stack_count
//     - resource:  same, using resource counter
//     - scalesWith only: materializedValue = scalesWith_value
//     - plain:     materializedValue = value
//   DAMAGE_ATOM: gains `stackMultiplier` field (original base/scaling preserved).
//     - `scalesWith: attribute` on damage atoms sets `effectiveBase` per arch-doc §12
//     - `scalesWith: hp_missing` on damage atoms produces a scalar multiplier
//   Non-stacking atoms receive stackMultiplier = 1 (or materializedValue = value).
//
// Stacking XOR invariant (C.stacking): validator enforces `maxStacks` XOR
// `resource`; engine can assume at most one is present.

import { evaluateCurve, STAT_CURVES } from './curves.js';

export function materializeStacking(atoms, ctx) {
  return {
    effects: atoms.effects.map(a => materializeEffect(a, ctx)),
    damage:  atoms.damage.map(a  => materializeDamage(a, ctx)),
    heal:    atoms.heal,      // heal atoms don't stack or scalesWith in Phase 6
    shield:  atoms.shield,    // shield atoms don't stack (Phase 3 arch-doc)
    grants:  atoms.grants,    // availability atoms never stack
    removes: atoms.removes,
  };
}

// ─────────────────────────────────────────────────────────────────────
// STAT_EFFECT_ATOM
// ─────────────────────────────────────────────────────────────────────

function materializeEffect(atom, ctx) {
  const base = atom.value ?? 0;
  const scalesWithDelta = atom.scalesWith
    ? resolveScalesWith(atom.scalesWith, ctx)
    : 0;
  const stacks = stackCount(atom, ctx);

  // Default: per-stack contribution is (value + scalesWith) × stacks.
  // When no stacking field is present, stacks defaults to 1 below, preserving
  // the plain atom's value.
  const materializedValue = (base + scalesWithDelta) * stacks;

  return { ...atom, materializedValue };
}

// ─────────────────────────────────────────────────────────────────────
// DAMAGE_ATOM
// ─────────────────────────────────────────────────────────────────────

function materializeDamage(atom, ctx) {
  const out = { ...atom };
  out.stackMultiplier = stackCount(atom, ctx);

  // scalesWith on damage atoms (forward-spec for shapeshift / berserker).
  if (atom.scalesWith) {
    const value = resolveScalesWith(atom.scalesWith, ctx);
    if (atom.scalesWith.type === "attribute") {
      // Druid shapeshift — curve output becomes effective base (arch-doc §12).
      out.effectiveBase = value;
    } else if (atom.scalesWith.type === "hp_missing") {
      // Barbarian Berserker — scalesWith produces a scalar multiplier threaded
      // to projection as an additional factor.
      out.scalesWithMultiplier = value;
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// stackCount — maxStacks XOR resource
// ─────────────────────────────────────────────────────────────────────

function stackCount(atom, ctx) {
  if (atom.maxStacks != null) {
    const raw = ctx.stackCounts?.[atom.source?.abilityId] ?? 0;
    return Math.min(raw, atom.maxStacks);
  }
  if (atom.resource != null) {
    return ctx.classResourceCounters?.[atom.resource] ?? 0;
  }
  return 1;
}

// ─────────────────────────────────────────────────────────────────────
// scalesWith dispatch
// ─────────────────────────────────────────────────────────────────────

function resolveScalesWith(sw, ctx) {
  if (sw.type === "hp_missing") {
    const hpFraction = ctx.hpFraction ?? 1.0;
    const missingPct = (1 - hpFraction) * 100;
    const steps = Math.floor(missingPct / sw.per);
    return Math.min(steps * sw.valuePerStep, sw.maxValue);
  }
  if (sw.type === "attribute") {
    const curve = STAT_CURVES[sw.curve];
    if (!curve) return 0;
    const input = ctx.attributes?.[sw.attribute] ?? 0;
    return evaluateCurve(curve, input);
  }
  return 0;
}
