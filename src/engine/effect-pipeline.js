// runEffectPipeline — partitions collected effects by phase and applies
// each phase in the documented order.
//
// Flow (per plan §1.5):
//   1. Collect effects from all sources (via collectors)
//   2. Filter by ability-level + effect-level conditions
//   3. Partition by phase
//   4. Apply phases:
//      cap_override          → capOverrides[stat] = max(current, value)
//      pre_curve_flat        → CORE_ATTRS: finalAttrs[stat] += value
//                              otherwise:  finalBonuses[stat] += value
//      attribute_multiplier  → "all_attributes": each of 7 attrs ×= (1+v)
//                              single attr:    finalAttrs[stat] ×= (1+v)
//      post_curve            → finalBonuses[stat] += value
//      multiplicative_layer  → layers[stat] *= value  (init 1)
//      type_damage_bonus     → typeDamageBonuses[damageType] += value
//      healing_modifier      → healingMods[healType|"all"] += value
//
// Returns:
//   { finalAttrs, finalBonuses, capOverrides, typeDamageBonuses,
//     healingMods, multiplicativeLayers, trace }

import { CORE_ATTRS, EFFECT_PHASES } from '../data/constants.js';
import { collectAllEffects } from './collectors/index.js';
import { passesConditions } from './conditions.js';

const CORE_ATTR_LIST = ["str", "vig", "agi", "dex", "wil", "kno", "res"];

export function runEffectPipeline(ctx) {
  // 1–2. Collect and filter by conditions.
  const entries = collectAllEffects(ctx)
    .filter(({ ability, effect }) => passesConditions(ability, effect, ctx));

  // Accumulators seeded from gear-baseline attrs/bonuses.
  const finalAttrs = { ...ctx.attrs };
  const finalBonuses = { ...ctx.bonuses };
  const capOverrides = {};
  const typeDamageBonuses = {};
  const healingMods = { all: 0, physical: 0, magical: 0 };
  const multiplicativeLayers = {};
  const trace = [];

  // 3–4. Phase partitioning. We iterate in a fixed order so dependent
  // phases (attribute_multiplier after pre_curve_flat attrs adds) see
  // the right inputs.
  const byPhase = partition(entries);

  // cap_override — max-wins per stat.
  for (const entry of byPhase[EFFECT_PHASES.CAP_OVERRIDE]) {
    const { effect } = entry;
    const prev = capOverrides[effect.stat];
    capOverrides[effect.stat] = prev == null ? effect.value : Math.max(prev, effect.value);
    traceEntry(trace, entry, effect.value);
  }

  // pre_curve_flat — core attrs into attrs, rest into bonuses.
  // "all_attributes" fans out to each of the 7 CORE_ATTRS using effect.value
  // (the literal authored value, not a hardcoded +1). Used by Soul Collector's
  // shard bonus, Barbarian War Sacrifice, etc. When any data carries
  // "+N to all attributes" as a flat addition, authoring it once via
  // all_attributes is cheaper than 7 explicit entries and keeps class data
  // terse.
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

function partition(entries) {
  const buckets = {};
  for (const phase of Object.values(EFFECT_PHASES)) buckets[phase] = [];
  for (const entry of entries) {
    const phase = entry.effect?.phase;
    if (buckets[phase]) buckets[phase].push(entry);
    // Unknown phases are silently dropped. defineClass catches these at
    // class load, so a bad phase reaching the pipeline means someone
    // bypassed defineClass — the silent drop is safe.
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
  });
}
