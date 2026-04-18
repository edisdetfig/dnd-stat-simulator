// conditions — dispatch table evaluating every CONDITION_TYPES variant per
// docs/engine_architecture.md §11 and docs/engine_implementation_plan.md §3.4.
//
// Public API:
//   evaluateCondition(cond, ctx, abilityShape?, damageType?): boolean
//   CONDITION_EVALUATORS   — dispatch table (exported for tests + extension)
//   evalAll / evalAny / evalNot — compound combinators (exported for direct test)
//
// Extension pattern: adding a new CONDITION_TYPES variant requires editing
// constants.js AND adding an evaluator here AND declaring the ctx field it
// reads in filterByConditions' Stage 2 cache key composition
// (engine_implementation_plan.md §7).
//
// abilityShape parameter — required by two evaluators:
//   - effect_active: reads the TARGET ability's activation. Looked up from
//     ctx.klass by effectId. abilityShape is the source atom's parent ability
//     (not the target), passed through for other evaluators (tier).
//   - tier: reads ctx.selectedTiers[abilityShape.id]. The current atom's
//     owning ability identifies the tier target.
// abilityShape is `undefined` when called outside an atom context (e.g., for
// an ability-level condition at Stage 0 availability).
//
// damageType parameter (4th arg) — only used by `damage_type` evaluator at
// Stage 6. At Stage 2 the evaluator is short-circuit-true (pass-through) so
// the atom survives to Stage 4 / Stage 6 for per-projection re-evaluation.

import {
  WEAPON_TYPE_CATEGORIES,
} from '../data/constants.js';
import { findAbility } from '../data/classes/ability-helpers.js';

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function lookupAbility(ctx, abilityId) {
  return findAbility(ctx?.klass, abilityId);
}

function isSelected(ctx, abilityId) {
  return (ctx.selectedPerks?.includes(abilityId) ?? false)
      || (ctx.selectedSkills?.includes(abilityId) ?? false)
      || (ctx.selectedSpells?.includes(abilityId) ?? false);
}

// ─────────────────────────────────────────────────────────────────────
// Variant evaluators
// ─────────────────────────────────────────────────────────────────────

function evalHpBelow(cond, ctx) {
  return (ctx.hpFraction ?? 1.0) < cond.threshold;
}

function evalAbilitySelected(cond, ctx) {
  return isSelected(ctx, cond.abilityId);
}

function evalEffectActive(cond, ctx) {
  // `effect_active` = "is this ability currently contributing state?" This is
  // exactly the activeAbilityIds set (computed in buildContext §6.1):
  //   passive + selected → in activeAbilityIds
  //   cast_buff/toggle + in activeBuffs + available (directly selected OR
  //       granted) → in activeAbilityIds
  //   cast → never in activeAbilityIds (no persistent state)
  // Using activeAbilityIds handles GRANTED abilities correctly (e.g.,
  // exploitation_strike granted by blood_pact + in activeBuffs) — they're
  // in activeAbilityIds even though not in the user's selected sets.
  return (ctx.activeAbilityIds ?? []).includes(cond.effectId);
}

function evalEnvironment(cond, ctx) {
  return ctx.environment === cond.env;
}

function evalWeaponType(cond, ctx) {
  const wt = cond.weaponType;
  // Virtual category: ranged → (weaponType ∈ WEAPON_TYPE_CATEGORIES.ranged).
  if (WEAPON_TYPE_CATEGORIES[wt]) {
    return WEAPON_TYPE_CATEGORIES[wt].includes(ctx.weaponType);
  }
  // Virtual: gear-derived booleans precomputed at Stage 0 (buildContext §6.4).
  if (wt === "two_handed") return !!ctx.isTwoHanded;
  if (wt === "one_handed") return !!ctx.isOneHanded;
  if (wt === "unarmed")    return !!ctx.isUnarmed;
  if (wt === "instrument") return !!ctx.isInstrument;
  if (wt === "dual_wield") return !!ctx.isDualWielding;
  // Specific weapon kind.
  return ctx.weaponType === wt;
}

function evalPlayerState(cond, ctx) {
  return ctx.playerStates?.includes(cond.state) ?? false;
}

function evalEquipment(cond, ctx) {
  return ctx.equipment?.[cond.slot] === cond.equipped;
}

function evalCreatureType(cond, ctx) {
  return ctx.target?.creatureType === cond.creatureType;
}

// damage_type — at Stage 2 (no damageType arg) evaluates true as pass-through;
// at Stage 6 (damageType provided) evaluates against the current projection.
// Accepts `damageType: string | string[]` and optional `exclude: string[]`.
function evalDamageType(cond, ctx, _abilityShape, damageType) {
  if (damageType === undefined) return true;   // Stage 2 pass-through.
  if (Array.isArray(cond.exclude) && cond.exclude.includes(damageType)) return false;
  const want = cond.damageType;
  if (Array.isArray(want)) return want.includes(damageType);
  return want === damageType;
}

function evalTier(cond, ctx, abilityShape) {
  const abilityId = abilityShape?.id;
  if (!abilityId) return false;
  return ctx.selectedTiers?.[abilityId] === cond.tier;
}

// ─────────────────────────────────────────────────────────────────────
// Compound combinators
// ─────────────────────────────────────────────────────────────────────

export function evalAll(cond, ctx, abilityShape, damageType) {
  const list = cond.conditions ?? [];
  return list.every(c => evaluateCondition(c, ctx, abilityShape, damageType));
}

export function evalAny(cond, ctx, abilityShape, damageType) {
  const list = cond.conditions ?? [];
  return list.some(c => evaluateCondition(c, ctx, abilityShape, damageType));
}

export function evalNot(cond, ctx, abilityShape, damageType) {
  const list = cond.conditions ?? [];
  return !list.some(c => evaluateCondition(c, ctx, abilityShape, damageType));
}

// ─────────────────────────────────────────────────────────────────────
// Dispatch table
// ─────────────────────────────────────────────────────────────────────

export const CONDITION_EVALUATORS = Object.freeze({
  hp_below:         evalHpBelow,
  ability_selected: evalAbilitySelected,
  effect_active:    evalEffectActive,
  environment:      evalEnvironment,
  weapon_type:      evalWeaponType,
  player_state:     evalPlayerState,
  equipment:        evalEquipment,
  creature_type:    evalCreatureType,
  damage_type:      evalDamageType,
  tier:             evalTier,
  all:              evalAll,
  any:              evalAny,
  not:              evalNot,
});

// ─────────────────────────────────────────────────────────────────────
// Public entry
// ─────────────────────────────────────────────────────────────────────

export function evaluateCondition(cond, ctx, abilityShape, damageType) {
  if (cond == null) return true;               // no condition → unconditional.
  const evaluator = CONDITION_EVALUATORS[cond.type];
  if (!evaluator) return false;                // unknown type — author error.
  return evaluator(cond, ctx, abilityShape, damageType);
}
