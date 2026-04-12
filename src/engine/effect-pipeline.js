// Effect pipeline — routes collected effects to self-side or enemy-side
// accumulators and applies them in phase order.
//
// Two public entrypoints, both consuming the same collected entries:
//   runEffectPipeline(ctx) — accumulates effects routing to the caster
//   runTargetPipeline(ctx) — accumulates effects routing to the enemy
//
// Per-entry routing (see resolveTarget below):
//   effect.target === "self"   → self pipeline
//   effect.target === "enemy"  → enemy pipeline
//   effect.target === "either" → per-ability applyToSelf / applyToEnemy
//                                toggles (ctx.abilityTargetMode, with
//                                ability defaults as fallback) decide —
//                                BOTH can be true, routing to both
//   target unset or party/nearby_* → treated as "self" (snapshot principle)
//
// Phase application order inside applyEntries (per plan §1.5):
//   cap_override          → capOverrides[stat] = max(current, value)
//   pre_curve_flat        → CORE_ATTRS: finalAttrs[stat] += value
//                           all_attributes: fans out to all 7 CORE_ATTRS
//                           otherwise:      finalBonuses[stat] += value
//   attribute_multiplier  → "all_attributes": each of 7 attrs ×= (1+v)
//                           single attr:      finalAttrs[stat] ×= (1+v)
//   post_curve            → finalBonuses[stat] += value
//   multiplicative_layer  → layers[stat] *= value  (init 1)
//   type_damage_bonus     → typeDamageBonuses[damageType] += value
//   healing_modifier      → healingMods[healType|"all"] += value

import { CORE_ATTRS, EFFECT_PHASES } from '../data/constants.js';
import { collectAllEffects } from './collectors/index.js';
import { passesConditions } from './conditions.js';

const CORE_ATTR_LIST = ["str", "vig", "agi", "dex", "wil", "kno", "res"];

// ── Public entrypoints ──

export function runEffectPipeline(ctx) {
  const { self } = partitionEntries(ctx);
  return applyEntries(self, ctx.attrs, ctx.bonuses);
}

export function runTargetPipeline(ctx) {
  const { enemy } = partitionEntries(ctx);
  // Enemy baseline: Phase 1 doesn't model enemy attributes (no enemy
  // baseStats in the sim). Seed finalBonuses from the Target editor's
  // DR values so self-pipeline and enemy-pipeline both land on concrete
  // numbers Phase 3 damage calcs can consume.
  const seedBonuses = {};
  if (ctx.target) {
    if (ctx.target.pdr)        seedBonuses.physicalDamageReduction = ctx.target.pdr;
    if (ctx.target.mdr)        seedBonuses.magicalDamageReduction  = ctx.target.mdr;
    if (ctx.target.headshotDR) seedBonuses.headshotDamageReduction = ctx.target.headshotDR;
  }
  return applyEntries(enemy, {}, seedBonuses);
}

// ── Routing ──

function partitionEntries(ctx) {
  const raw = collectAllEffects(ctx)
    .filter(({ ability, effect }) => passesConditions(ability, effect, ctx));

  const self = [];
  const enemy = [];
  for (const entry of raw) {
    for (const route of resolveTargets(entry, ctx)) {
      if (route === "self") self.push(entry);
      else if (route === "enemy") enemy.push(entry);
    }
  }
  return { self, enemy };
}

function resolveTargets(entry, ctx) {
  const t = entry.effect?.target ?? "self";
  if (t === "self" || t === "enemy") return [t];
  if (t === "either") {
    const mode = resolveApplyMode(entry.ability, ctx);
    const out = [];
    if (mode.applyToSelf)  out.push("self");
    if (mode.applyToEnemy) out.push("enemy");
    return out;
  }
  // party / nearby_allies / nearby_enemies — display-only, routed as self.
  return ["self"];
}

// Per-ability apply mode for "either" entries. State override (from the
// user's toggle) beats the ability's authored defaults. Unset falls back
// to { applyToSelf: true, applyToEnemy: false } — the most common Warlock
// pattern (self-buff + optional enemy debuff).
export function resolveApplyMode(ability, ctx) {
  const override = ctx?.abilityTargetMode?.[ability.id];
  if (override) return override;
  return {
    applyToSelf:  ability.defaultApplyToSelf  ?? true,
    applyToEnemy: ability.defaultApplyToEnemy ?? false,
  };
}

// ── Shared accumulator ──

function applyEntries(entries, seedAttrs, seedBonuses) {
  const finalAttrs = { ...seedAttrs };
  const finalBonuses = { ...seedBonuses };
  const capOverrides = {};
  const typeDamageBonuses = {};
  const healingMods = { all: 0, physical: 0, magical: 0 };
  const multiplicativeLayers = {};
  const trace = [];

  const byPhase = partitionByPhase(entries);

  // cap_override — max-wins per stat.
  for (const entry of byPhase[EFFECT_PHASES.CAP_OVERRIDE]) {
    const { effect } = entry;
    const prev = capOverrides[effect.stat];
    capOverrides[effect.stat] = prev == null ? effect.value : Math.max(prev, effect.value);
    traceEntry(trace, entry, effect.value);
  }

  // pre_curve_flat — core attrs into attrs, rest into bonuses.
  // "all_attributes" fans out to each of the 7 CORE_ATTRS using effect.value.
  for (const entry of byPhase[EFFECT_PHASES.PRE_CURVE_FLAT]) {
    const { effect } = entry;
    if (effect.stat === "all_attributes") {
      for (const a of CORE_ATTR_LIST) {
        finalAttrs[a] = (finalAttrs[a] || 0) + effect.value;
      }
    } else if (CORE_ATTRS.has(effect.stat)) {
      finalAttrs[effect.stat] = (finalAttrs[effect.stat] || 0) + effect.value;
    } else {
      finalBonuses[effect.stat] = (finalBonuses[effect.stat] || 0) + effect.value;
    }
    traceEntry(trace, entry, effect.value);
  }

  // attribute_multiplier — on CURRENT attrs (seeded with pre-curve-flat adds).
  for (const entry of byPhase[EFFECT_PHASES.ATTRIBUTE_MULTIPLIER]) {
    const { effect } = entry;
    const factor = 1 + effect.value;
    if (effect.stat === "all_attributes") {
      for (const a of CORE_ATTR_LIST) {
        finalAttrs[a] = (finalAttrs[a] || 0) * factor;
      }
    } else if (CORE_ATTRS.has(effect.stat)) {
      finalAttrs[effect.stat] = (finalAttrs[effect.stat] || 0) * factor;
    }
    traceEntry(trace, entry, effect.value);
  }

  // post_curve — flat additions to bonuses.
  for (const entry of byPhase[EFFECT_PHASES.POST_CURVE]) {
    const { effect } = entry;
    finalBonuses[effect.stat] = (finalBonuses[effect.stat] || 0) + effect.value;
    traceEntry(trace, entry, effect.value);
  }

  // multiplicative_layer — factors stack multiplicatively per stat.
  for (const entry of byPhase[EFFECT_PHASES.MULTIPLICATIVE_LAYER]) {
    const { effect } = entry;
    multiplicativeLayers[effect.stat] = (multiplicativeLayers[effect.stat] ?? 1) * effect.value;
    traceEntry(trace, entry, effect.value);
  }

  // type_damage_bonus — keyed by damageType (sentinel stat).
  for (const entry of byPhase[EFFECT_PHASES.TYPE_DAMAGE_BONUS]) {
    const { effect } = entry;
    const key = effect.damageType ?? "_untyped";
    typeDamageBonuses[key] = (typeDamageBonuses[key] || 0) + effect.value;
    traceEntry(trace, entry, effect.value);
  }

  // healing_modifier — additive per healType bucket (or "all").
  for (const entry of byPhase[EFFECT_PHASES.HEALING_MODIFIER]) {
    const { effect } = entry;
    const key = effect.healType ?? "all";
    healingMods[key] = (healingMods[key] || 0) + effect.value;
    traceEntry(trace, entry, effect.value);
  }

  return {
    finalAttrs, finalBonuses,
    capOverrides, typeDamageBonuses, healingMods, multiplicativeLayers,
    trace,
  };
}

function partitionByPhase(entries) {
  const buckets = {};
  for (const phase of Object.values(EFFECT_PHASES)) buckets[phase] = [];
  for (const entry of entries) {
    const phase = entry.effect?.phase;
    if (buckets[phase]) buckets[phase].push(entry);
    // Unknown phases silently dropped — defineClass catches them at load time.
  }
  return buckets;
}

function traceEntry(trace, { source, ability, effect }, appliedValue) {
  trace.push({
    source,
    ability: ability?.id ?? "<unknown>",
    stat: effect.stat,
    phase: effect.phase,
    appliedValue,
    damageType: effect.damageType,
    healType: effect.healType,
    target: effect.target ?? "self",
  });
}
