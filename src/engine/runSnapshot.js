// runSnapshot — public engine API.
//
// Orchestrates Stages 0-6 per docs/engine_implementation_plan.md §3.11 + §4 +
// docs/engine_architecture.md §4. Runs the second memory-budget pass using
// final derivedStats.memoryCapacity. Wires derived-heal back-references on
// DamageProjections. Emits a Snapshot conforming to arch-doc §4 / the
// Phase-0-pinned shape.
//
// Snapshot._internal (non-enumerable per plan §3.11): carries filtered-atom
// store + dropped-atom store + klass for Query API companions. Hidden via
// Object.defineProperty so JSON serialization / shallow iteration skips it.
//
// Query API companions (arch-doc §20): atomsByTarget / atomsBySourceAbility
// / activeConditions / atomsByStat. Each is a free function taking the
// Snapshot; reads Snapshot._internal.

import { buildContext } from './buildContext.js';
import { collectAtoms } from './collectAtoms.js';
import { filterByConditions } from './filterByConditions.js';
import { materializeStacking } from './materializeStacking.js';
import { findAbility } from '../data/classes/ability-helpers.js';
import { aggregate } from './aggregate.js';
import { deriveStats } from './deriveStats.js';
import { projectDamage } from './projectDamage.js';
import { projectHealing } from './projectHealing.js';
import { projectShield } from './projectShield.js';
import { evaluateCondition } from './conditions.js';

const MEMORY_POOLS = ["spell", "transformation", "music"];

// ─────────────────────────────────────────────────────────────────────
// Public entry
// ─────────────────────────────────────────────────────────────────────

export function runSnapshot(build) {
  const ctx = buildContext(build);
  const rawAtoms = collectAtoms(ctx);

  // Stage 2 — record dropped atoms separately for Query API introspection.
  const { filtered, dropped } = filterWithDroppedCapture(rawAtoms, ctx);

  const materialized = materializeStacking(filtered, ctx);

  const { bonuses, perTypeBonuses, postCapMultiplicativeLayers, capOverrides } =
    aggregate(materialized.effects, ctx.gear?.bonuses ?? {}, ctx);

  const derivedStats = deriveStats(ctx.attributes, bonuses, capOverrides);

  // Second memory-budget pass: re-run consumption with final capacity
  // (plan §6.3 / §3.11). If final capacity differs from preliminary, this
  // updates lockedOut[] per pool.
  const memoryBudget = finalizeMemoryBudget(ctx, derivedStats, build);

  // Stage 6 projections.
  const ctxForProjection = {
    ...ctx,
    _weaponMagicalDamageFlat: build._weaponMagicalDamageFlat ?? ctx.gear?.weapon?.magicalDamage ?? 0,
    _buffWeaponDamageFlat:    build._buffWeaponDamageFlat    ?? 0,
  };

  const { damageProjections, derivedHealDescriptors } = projectDamage(
    materialized.damage, derivedStats, perTypeBonuses,
    postCapMultiplicativeLayers, ctx.target, ctx.gear?.weapon, ctxForProjection
  );

  // Flatten healingMod from phased bonuses for projectHealing input.
  const healingModFlat = bonuses.healingMod
    ? Object.values(bonuses.healingMod).reduce((a, b) => a + b, 0)
    : 0;

  const healProjections = projectHealing(
    materialized.heal, derivedHealDescriptors, derivedStats,
    healingModFlat, derivedStats.buffDuration?.value ?? 0, ctx
  );

  const shieldProjections = projectShield(materialized.shield, derivedStats);

  // Wire derived-heal back-references on damage projections.
  wireDerivedHealBackRefs(damageProjections, healProjections);

  // Assemble the Snapshot.
  const snapshot = {
    bonuses,
    derivedStats,
    damageProjections,
    healProjections,
    shieldProjections,
    perTypeBonuses,
    postCapMultiplicativeLayers,
    capOverrides,
    availableAbilityIds:   ctx.availableAbilityIds,
    activeAbilityIds:      ctx.activeAbilityIds,
    viewingAfterEffect:    [...ctx.viewingAfterEffect],
    classResourceCounters: ctx.classResourceCounters,
    stackCounts:           ctx.stackCounts,
    memoryBudget,
  };

  // Non-enumerable _internal for Query API companions.
  Object.defineProperty(snapshot, '_internal', {
    value: {
      filteredAtoms: filtered,
      droppedAtoms:  dropped,
      klass:         ctx.klass,
    },
    enumerable: false,
    writable:   false,
    configurable: false,
  });

  return snapshot;
}

// ─────────────────────────────────────────────────────────────────────
// Stage 2 with dropped-atom capture
// ─────────────────────────────────────────────────────────────────────

function filterWithDroppedCapture(atoms, ctx) {
  // Run the same logic as filterByConditions, but capture drops for the
  // Query API's activeConditions() companion. This is a local fork of
  // filterByConditions; if Phase 6 later adds caching, this fork must stay
  // in sync (or refactor to accept a drop-sink callback).

  const filtered = { effects: [], damage: [], heal: [], shield: [], grants: [], removes: [] };
  const dropped = [];

  for (const category of ["effects", "damage", "heal", "shield", "grants", "removes"]) {
    for (const atom of atoms[category]) {
      const cond = atom.condition;
      if (cond == null) {
        filtered[category].push(atom);
        continue;
      }
      if (conditionTreeContainsDamageType(cond)) {
        filtered[category].push(atom);
        continue;
      }
      const abilityShape = abilityShapeFromSource(atom, ctx);
      const pass = evaluateCondition(cond, ctx, abilityShape);
      if (pass) filtered[category].push(atom);
      else dropped.push({ atom, condition: cond, evaluation: false, category });
    }
  }

  return { filtered, dropped };
}

function conditionTreeContainsDamageType(cond) {
  if (!cond || typeof cond !== "object") return false;
  if (cond.type === "damage_type") return true;
  if (Array.isArray(cond.conditions)) {
    return cond.conditions.some(conditionTreeContainsDamageType);
  }
  return false;
}

function abilityShapeFromSource(atom, ctx) {
  const id = atom.source?.abilityId;
  if (!id || !ctx.klass) return undefined;
  const match = findAbility(ctx.klass, id);
  if (!match) return undefined;
  return { id: match.id, activation: match.activation, type: match.type, tags: match.tags };
}

// ─────────────────────────────────────────────────────────────────────
// Memory-budget second pass
// ─────────────────────────────────────────────────────────────────────

function finalizeMemoryBudget(ctx, derivedStats, build) {
  // Final capacity from recipe output (accounts for gear + memorySlots atoms
  // fully aggregated). If the final capacity differs from preliminary, the
  // consumption loop re-runs.
  const finalCapacityBase = derivedStats.memoryCapacity?.value ?? 0;

  // Per-pool capacity: start from finalCapacityBase, then add memorySlots
  // atoms' per-pool contributions as aggregated in bonuses. But per plan §6.3,
  // memorySlots contributions were already per-pool-discriminated at Stage 0
  // (preliminary pass) — here we use the final memoryCapacity PLUS the same
  // per-pool deltas from active abilities.
  //
  // In practice, for Warlock anchor, both Spell Memory I/II abilities add
  // their +5 each via memorySlots atoms. The preliminary pass already captured
  // these; deriveStats' memoryCapacity is the KNO-only curve value (preliminary
  // arithmetic). Pool overrides from memorySlots atoms remain per-pool.

  const preliminary = ctx.memoryBudget ?? {};
  // If recipe capacity differs from KNO-only curve (e.g., future gear boost),
  // adjust each pool. Default: preserve preliminary (capacities already include
  // memorySlots additions per pool).
  const currentCapacitiesByPool = Object.fromEntries(
    MEMORY_POOLS.map(p => [p, preliminary[p]?.capacity ?? finalCapacityBase])
  );

  const final = Object.fromEntries(
    MEMORY_POOLS.map(p => [p, {
      used: 0, capacity: currentCapacitiesByPool[p], lockedOut: [],
    }])
  );

  for (const id of ctx.selectedSpells) {
    const ability = lookupAbility(ctx.klass, id);
    if (!ability) continue;
    const pool = ability.type;
    if (!MEMORY_POOLS.includes(pool)) continue;
    const cost = ability.memoryCost ?? 0;
    const slot = final[pool];
    if (slot.used + cost <= slot.capacity) slot.used += cost;
    else slot.lockedOut.push(id);
  }

  return final;
}

// ─────────────────────────────────────────────────────────────────────
// Derived-heal back-ref wiring
// ─────────────────────────────────────────────────────────────────────

function wireDerivedHealBackRefs(damageProjections, healProjections) {
  // For each heal projection that's derived (has derivedFrom), find the
  // matching damage projection by atomId and attach derivedHeal as back-ref.
  const healsByDamageAtomId = new Map();
  for (const heal of healProjections) {
    if (heal.derivedFrom?.damageAtomId) {
      healsByDamageAtomId.set(heal.derivedFrom.damageAtomId, heal);
    }
  }
  for (const proj of damageProjections) {
    const heal = healsByDamageAtomId.get(proj.atomId);
    if (heal) proj.derivedHeal = heal;
  }
}

const lookupAbility = findAbility;

// ─────────────────────────────────────────────────────────────────────
// Query API companions (arch-doc §20)
// ─────────────────────────────────────────────────────────────────────

// Returns every filtered atom whose `target` matches or contains `target`.
// Semantics: `self_or_ally` matches both "self" and "ally" queries.
export function atomsByTarget(snapshot, target) {
  const internal = snapshot._internal;
  if (!internal) return [];
  const out = [];
  for (const category of ["effects", "damage", "heal", "shield"]) {
    for (const atom of internal.filteredAtoms[category] ?? []) {
      if (atomMatchesTarget(atom, target)) out.push(atom);
    }
  }
  return out;
}

function atomMatchesTarget(atom, target) {
  const t = atom.target ?? "self";
  if (t === target) return true;
  if (target === "ally" && t === "self_or_ally") return true;
  if (target === "self" && t === "self_or_ally") return true;
  if (target === "ally" && t === "party") return true;
  return false;
}

// Returns every atom the named ability contributed, post-filter.
export function atomsBySourceAbility(snapshot, abilityId) {
  const internal = snapshot._internal;
  if (!internal) {
    return { effects: [], damage: [], heal: null, shield: null, grants: [], removes: [], afterEffect: null };
  }
  const f = internal.filteredAtoms;
  return {
    effects: f.effects.filter(a => a.source?.abilityId === abilityId),
    damage:  f.damage.filter(a  => a.source?.abilityId === abilityId),
    heal:    f.heal.find(a      => a.source?.abilityId === abilityId) ?? null,
    shield:  f.shield.find(a    => a.source?.abilityId === abilityId) ?? null,
    grants:  f.grants.filter(a  => a.source?.abilityId === abilityId),
    removes: f.removes.filter(a => a.source?.abilityId === abilityId),
    afterEffect: null,   // reserved for introspection hook (Phase 11).
  };
}

// Returns every atom DROPPED at Stage 2 with its condition + evaluation.
export function activeConditions(snapshot) {
  const internal = snapshot._internal;
  if (!internal) return [];
  return internal.droppedAtoms.map(d => ({
    atom: d.atom, condition: d.condition, evaluation: d.evaluation,
  }));
}

// Returns every effect atom contributing to statId, post-filter.
export function atomsByStat(snapshot, statId) {
  const internal = snapshot._internal;
  if (!internal) return [];
  return (internal.filteredAtoms.effects ?? []).filter(a => a.stat === statId);
}
