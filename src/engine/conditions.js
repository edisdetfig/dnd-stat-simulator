// Condition evaluator — per spec §3 "Condition shape".
//
// Three public functions:
//   evaluateCondition(condition, ctx): boolean
//     Dispatches on condition.type. Unknown types log once and fail closed.
//
//   passesConditions(ability, effect, ctx): boolean
//     ANDs ability.condition and effect.condition. Either absent = satisfied.
//
//   isAbilityActive(abilityId, ctx): boolean
//     True if the ability is currently "on" in any form — selected perk,
//     toggled buff, active form/summon/after-effect/wildSkill. Used by
//     effect_active conditions and by collectors.
//
// Read contract from ctx:
//   ctx.activeAbilityIds — Set<string> of all currently-active ability IDs.
//   ctx.hpPercent        — number 0..100
//   ctx.activeForm       — string | null
//   ctx.environment      — string | null
//   ctx.weaponType       — string | null (derived from equipped weapon)
//   ctx.isDualWield      — boolean
//   ctx.isUnarmed        — boolean
//   ctx.gearEquipment    — { head?, chest?, ... } — truthy means slot has gear
//   ctx.playerStates     — { [state]: boolean }

import { CONDITION_TYPES, WEAPON_TYPE_CATEGORIES } from '../data/constants.js';

// Module-level dedup so a bad condition type only warns once per process
// rather than flooding logs. Resetable via __INTERNAL__.resetWarnDedup()
// so vitest's beforeEach can guarantee test isolation.
const warnedUnknownTypes = new Set();

export function evaluateCondition(condition, ctx) {
  if (!condition) return true;
  const fn = EVALUATORS[condition.type];
  if (!fn) {
    if (!warnedUnknownTypes.has(condition.type)) {
      warnedUnknownTypes.add(condition.type);
      console.warn(`[conditions] unknown condition type "${condition.type}" — treated as false`);
    }
    return false;
  }
  return fn(condition, ctx);
}

export function passesConditions(ability, effect, ctx) {
  if (ability?.condition && !evaluateCondition(ability.condition, ctx)) return false;
  if (effect?.condition && !evaluateCondition(effect.condition, ctx)) return false;
  return true;
}

export function isAbilityActive(abilityId, ctx) {
  return ctx?.activeAbilityIds?.has(abilityId) ?? false;
}

// ── Dispatch table — one entry per CONDITION_TYPES value ──

const EVALUATORS = {
  form_active: (c, ctx) => {
    if (!ctx.activeForm) return false;
    return c.form ? ctx.activeForm === c.form : true;
  },

  hp_below: (c, ctx) => {
    // spec: threshold is a fraction (0..1). hpPercent is 0..100.
    return (ctx.hpPercent ?? 100) / 100 < c.threshold;
  },

  effect_active: (c, ctx) => isAbilityActive(c.effectId, ctx),

  environment: (c, ctx) => ctx.environment === c.env,

  frenzy_active: (_c, ctx) => !!ctx.frenzyActive,

  weapon_type: (c, ctx) => {
    const { weaponType, isDualWield, isUnarmed } = ctx;
    const want = c.weaponType;
    if (want === "unarmed") return !!isUnarmed;
    if (want === "two_handed") return !!ctx.isTwoHanded;
    if (want === "instrument") return weaponType === "instrument";
    if (Array.isArray(WEAPON_TYPE_CATEGORIES[want])) {
      return WEAPON_TYPE_CATEGORIES[want].includes(weaponType);
    }
    // Also allow matching virtual "dual_wield" treated via its own type,
    // but a weapon_type condition can treat dual_wield as "any two weapons."
    if (want === "dual_wield") return !!isDualWield;
    return weaponType === want;
  },

  dual_wield: (_c, ctx) => !!ctx.isDualWield,

  player_state: (c, ctx) => !!(ctx.playerStates?.[c.state]),

  equipment: (c, ctx) => {
    const slotPresent = !!(ctx.gearEquipment?.[c.slot]);
    return c.equipped ? slotPresent : !slotPresent;
  },

  // TODO(Phase 1.3 §B): real semantics — match ctx.targetCreatureType against c.value.
  creature_type: () => false,

  // TODO(Phase 1.3 §B): evaluate c.damageType (value|array) + c.exclude[]
  // against ctx.incomingDamageType. For now, fail-open on aggregate case
  // per D.8 locked semantics ("when ctx.incomingDamageType absent, aggregate
  // stat-panel display still credits the layer").
  damage_type: (c, ctx) => {
    if (ctx?.incomingDamageType == null) return true;
    return true; // defer strict evaluation until §B
  },

  // TODO(Phase 1.3 §B): compound — AND c.conditions[] via evaluateCondition recursion.
  all: () => false,

  // TODO(Phase 1.3 §B): compound — OR c.conditions[] via evaluateCondition recursion. Reserved.
  any: () => false,
};

// Sanity: dispatch table must match CONDITION_TYPES exactly.
// Enforced by a vitest test, not at runtime.
// resetWarnDedup() lets tests clear the one-shot warn state so fail-closed
// assertions aren't masked by prior-test seeding.
export const __INTERNAL__ = {
  EVALUATORS,
  CONDITION_TYPES,
  resetWarnDedup: () => warnedUnknownTypes.clear(),
};
