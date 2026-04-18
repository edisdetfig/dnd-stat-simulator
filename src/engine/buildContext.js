// buildContext — Stage 0 of the engine pipeline.
//
// Turns a user-facing Build into the immutable Ctx consumed by Stages 1–6.
// Per docs/engine_architecture.md §5/§8/§9/§10 and plan §3.1/§6.
//
// Responsibilities (four sub-behaviors per plan §6):
//   1. Populate ctx fields straight from Build (klass, selections, toggles,
//      environment, target, gear, attributes, hpFraction).
//   2. Derive weapon-state booleans (ctx.isUnarmed / isTwoHanded / ... used
//      by the `weapon_type` condition evaluator; §6.4).
//   3. Run the availability resolver: selected ∪ grants − removes, iterative
//      fixpoint capped at depth 3 with cycle-drop debug flag (§6.1 / §6.2).
//   4. Run the memory-budget preliminary pass per pool (spell / transformation
//      / music). Each pool starts from the KNO-curve capacity; memorySlots
//      atoms add only to the pool named by their abilityType discriminator
//      (§6.3). Final pass runs in runSnapshot after Stage 5.
//
// Ctx is a fresh object; Build fields are shallow-copied (no mutation of Build).
//
// Memoization (plan §3.1): no caching in Phase 6 default. A whole-Build-digest
// key is spec'd; Phase 6 recommendation is "measure first" (LOCK K).

import { evaluateCurve, STAT_CURVES } from './curves.js';
import { evaluateCondition } from './conditions.js';
import { WEAPON_TYPE_CATEGORIES } from '../data/constants.js';
import { findAbility } from '../data/classes/ability-helpers.js';

// Per OQ3 sign-off: default target.maxHealth when Build omits it. Documented
// here so downstream modules can rely on the field always being present.
const DEFAULT_TARGET_MAX_HEALTH = 100;

const GRANT_FIXPOINT_MAX_ITERATIONS = 3;

// Memory pools per plan §6.3.
const MEMORY_POOLS = ["spell", "transformation", "music"];

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

export function buildContext(build) {
  const klass = build.klass;
  if (!klass) {
    throw new Error("buildContext: Build missing `klass`");
  }

  const debug = {};

  // Attribute totals (Build is assumed to have already summed base + gear;
  // UI / Phase 7 wiring is responsible for the summation upstream).
  const attributes = { ...build.attributes };

  // Weapon-state derivation (§6.4).
  const weaponState = deriveWeaponState(build);

  // Shallow normalization of selection / state fields.
  const selectedPerks  = [...(build.selectedPerks ?? [])];
  const selectedSkills = [...(build.selectedSkills ?? [])];
  const selectedSpells = [...(build.selectedSpells ?? [])];
  const activeBuffs    = [...(build.activeBuffs ?? [])];

  // Target normalization with defaults.
  const target = {
    pdr:           build.target?.pdr ?? 0,
    mdr:           build.target?.mdr ?? 0,
    headshotDR:    build.target?.headshotDR ?? 0,
    maxHealth:     build.target?.maxHealth ?? DEFAULT_TARGET_MAX_HEALTH,
    creatureType:  build.target?.creatureType,
    projectileDR:  build.target?.projectileDR ?? 0,
  };

  // Scaffold ctx early — passed to condition evaluators during availability +
  // memory-budget resolution.
  const ctx = {
    klass,
    selectedPerks,
    selectedSkills,
    selectedSpells,
    activeBuffs,
    activeForm:            build.activeForm ?? null,

    classResourceCounters: { ...(build.classResourceCounters ?? {}) },
    stackCounts:           { ...(build.stackCounts ?? {}) },
    selectedTiers:         { ...(build.selectedTiers ?? {}) },
    playerStates:          [...(build.playerStates ?? [])],
    viewingAfterEffect:    new Set(build.viewingAfterEffect ?? []),

    // Per-ability target-routing toggles for atoms with target: "either".
    // Defaults per arch-doc §6.1 + plan §3.6 rule 7.
    applyToSelf:           { ...(build.applyToSelf ?? {}) },
    applyToEnemy:          { ...(build.applyToEnemy ?? {}) },

    environment:           build.environment,
    target,

    gear: normalizeGearPayload(build.gear),
    weaponType:            weaponState.weaponType,
    isRanged:              weaponState.isRanged,
    isTwoHanded:           weaponState.isTwoHanded,
    isOneHanded:           weaponState.isOneHanded,
    isUnarmed:             weaponState.isUnarmed,
    isInstrument:          weaponState.isInstrument,
    isDualWielding:        weaponState.isDualWielding,

    attributes,
    hpFraction:            build.hpFraction ?? 1.0,

    // Populated below.
    availableAbilityIds:   [],
    activeAbilityIds:      [],
    lockedAbilityIds:      [],
    memoryBudget:          null,
    capOverrides:          {},
    debug,
  };

  // Availability resolver (§6.1 / §6.2).
  const { available, active, locked } = resolveAvailability(ctx);
  ctx.availableAbilityIds = [...available].sort();
  ctx.activeAbilityIds    = [...active].sort();
  ctx.lockedAbilityIds    = [...locked].sort();

  // Memory-budget preliminary pass (§6.3).
  ctx.memoryBudget = preliminaryMemoryBudget(ctx);

  return ctx;
}

// ─────────────────────────────────────────────────────────────────────
// Gear payload normalization — guarantees ctx.gear shape fields present
// ─────────────────────────────────────────────────────────────────────

function normalizeGearPayload(gear) {
  if (!gear) {
    return { weapon: null, bonuses: {}, onHitEffects: [] };
  }
  return {
    ...gear,
    weapon:       gear.weapon       ?? null,
    bonuses:      gear.bonuses      ?? {},
    onHitEffects: gear.onHitEffects ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────
// §6.4 — weapon-state derivation
// ─────────────────────────────────────────────────────────────────────

function deriveWeaponState(build) {
  // Prefer build.weaponType (pre-resolved by Phase 0 fixture pattern); fall
  // back to build.gear.weapon.weaponType.
  const weapon = build.gear?.weapon ?? null;
  const weaponType = build.weaponType ?? weapon?.weaponType ?? null;

  const isRanged = WEAPON_TYPE_CATEGORIES.ranged.includes(weaponType);
  const handType = weapon?.handType ?? null;   // canonical per OQ-D12 (Phase 6.5c.2)
  const isTwoHanded = build.isTwoHanded ?? handType === "twoHanded";
  const isOneHanded = build.isOneHanded ?? handType === "oneHanded";
  const isUnarmed   = build.isUnarmed   ?? (weapon == null || weaponType === "unarmed");
  const isInstrument = build.isInstrument
    ?? (Array.isArray(weapon?.tags) && weapon.tags.includes("instrument"));
  const isDualWielding = build.isDualWielding ?? (build.gear?.offhand?.weaponType != null);

  return {
    weaponType,
    isRanged, isTwoHanded, isOneHanded, isUnarmed, isInstrument, isDualWielding,
  };
}

// ─────────────────────────────────────────────────────────────────────
// §6.1 / §6.2 — availability resolver
// ─────────────────────────────────────────────────────────────────────

function resolveAvailability(ctx) {
  const selectedIds = new Set([
    ...ctx.selectedPerks,
    ...ctx.selectedSkills,
    ...ctx.selectedSpells,
  ]);

  // Compute initial active set: passive abilities are always-active when
  // selected; cast_buff/toggle are active only when in activeBuffs; cast is
  // never active (no persistent state).
  const computeActive = () => {
    const out = new Set();
    for (const id of selectedIds) {
      const ability = lookupAbility(ctx.klass, id);
      if (!ability) continue;
      if (ability.activation === "passive") out.add(id);
      else if (ability.activation === "cast_buff" || ability.activation === "toggle") {
        if (ctx.activeBuffs.includes(id)) out.add(id);
      }
    }
    // Active ids that have been subsequently granted get added too.
    for (const id of availableSnapshot) {
      if (out.has(id)) continue;
      const ability = lookupAbility(ctx.klass, id);
      if (!ability) continue;
      if (ability.activation === "passive") out.add(id);
      else if (ability.activation === "cast_buff" || ability.activation === "toggle") {
        if (ctx.activeBuffs.includes(id)) out.add(id);
      }
    }
    return out;
  };

  const availableSnapshot = new Set(selectedIds);
  let active = computeActive();

  let iterations = 0;
  let changed = true;

  // Helper to build a ctx snapshot whose activeAbilityIds reflects the
  // current mid-fixpoint active set. Used by `effect_active` evaluation on
  // grants/removes conditions (whose target ability might be the granter
  // itself — e.g., blood_pact.grants[0].condition → effect_active: blood_pact).
  const ctxWithActive = () => ({
    ...ctx,
    activeAbilityIds: [...active],
  });

  // Grants/removes fixpoint — cap at GRANT_FIXPOINT_MAX_ITERATIONS.
  while (changed && iterations < GRANT_FIXPOINT_MAX_ITERATIONS) {
    changed = false;
    iterations += 1;

    const ctxForEval = ctxWithActive();

    // Grants.
    for (const id of active) {
      const ability = lookupAbility(ctx.klass, id);
      if (!ability?.grants) continue;
      for (const grant of ability.grants) {
        if (grant.type !== "ability") continue;
        if (!grant.abilityId) continue;
        if (!evaluateCondition(grant.condition, ctxForEval, ability)) continue;
        if (!availableSnapshot.has(grant.abilityId)) {
          availableSnapshot.add(grant.abilityId);
          changed = true;
        }
      }
    }

    // Removes — filter by abilityType + tags.
    for (const id of active) {
      const ability = lookupAbility(ctx.klass, id);
      if (!ability?.removes) continue;
      for (const remove of ability.removes) {
        if (remove.type !== "ability") continue;
        if (!evaluateCondition(remove.condition, ctxForEval, ability)) continue;
        const matchIds = findRemovalTargets(ctx.klass, availableSnapshot, remove);
        for (const target of matchIds) {
          if (availableSnapshot.delete(target)) changed = true;
        }
      }
    }

    if (changed) active = computeActive();
  }

  if (changed && iterations >= GRANT_FIXPOINT_MAX_ITERATIONS) {
    ctx.debug.grantsCycleDropped = true;
  }

  // Ability-level condition filter — gates each ability as a whole.
  // Use the finalized active set for effect_active condition lookups here too.
  const ctxForAbilityCond = { ...ctx, activeAbilityIds: [...active] };
  const finalAvailable = new Set();
  for (const id of availableSnapshot) {
    const ability = lookupAbility(ctx.klass, id);
    if (!ability) {
      // Grants can reference unknown ids; surface via debug.
      ctx.debug.unresolvedGrants = ctx.debug.unresolvedGrants ?? [];
      ctx.debug.unresolvedGrants.push(id);
      continue;
    }
    if (ability.condition != null
        && !evaluateCondition(ability.condition, ctxForAbilityCond, ability)) {
      continue;
    }
    finalAvailable.add(id);
  }

  // Active ⋂ available.
  const finalActive = new Set();
  for (const id of active) {
    if (finalAvailable.has(id)) finalActive.add(id);
  }

  // Locked = selected \ available.
  const finalLocked = new Set();
  for (const id of selectedIds) {
    if (!finalAvailable.has(id)) finalLocked.add(id);
  }

  return {
    available: finalAvailable,
    active:    finalActive,
    locked:    finalLocked,
  };
}

function findRemovalTargets(klass, available, remove) {
  const targetType = remove.abilityType;
  const filterTags = Array.isArray(remove.tags) ? remove.tags : null;
  const matches = [];
  for (const id of available) {
    const ability = lookupAbility(klass, id);
    if (!ability) continue;
    if (targetType && ability.type !== targetType) continue;
    if (filterTags
        && !(Array.isArray(ability.tags)
             && filterTags.some(t => ability.tags.includes(t)))) continue;
    matches.push(id);
  }
  return matches;
}

// ─────────────────────────────────────────────────────────────────────
// §6.3 — memory-budget preliminary pass (per pool)
// ─────────────────────────────────────────────────────────────────────

function preliminaryMemoryBudget(ctx) {
  const prelimCapacity = evaluateCurve(
    STAT_CURVES.memoryCapacity,
    ctx.attributes?.kno ?? 0
  );

  // Each pool starts from the KNO-curve capacity (plan §6.3 committed rule).
  const capacityByPool = Object.fromEntries(
    MEMORY_POOLS.map(p => [p, prelimCapacity])
  );

  // Scan active passive perks + passive skills for memorySlots effects with
  // an abilityType discriminator. Validator C.memorySlots_abilityType_required
  // guarantees the discriminator is authored.
  for (const id of ctx.activeAbilityIds) {
    const ability = lookupAbility(ctx.klass, id);
    if (!ability?.effects) continue;
    for (const atom of ability.effects) {
      if (atom.stat !== "memorySlots") continue;
      if (!atom.abilityType) continue;
      if (!(atom.abilityType in capacityByPool)) continue;
      // Optional ability-scoped condition on the atom — honor it using the
      // owning ability as abilityShape.
      if (atom.condition != null
          && !evaluateCondition(atom.condition, ctx, ability)) continue;
      capacityByPool[atom.abilityType] += atom.value ?? 0;
    }
  }

  // Consume selectedSpells by pool in the order they appear in
  // ctx.selectedSpells (plan §6.3).
  const budget = Object.fromEntries(
    MEMORY_POOLS.map(p => [p, {
      used:      0,
      capacity:  capacityByPool[p],
      lockedOut: [],
    }])
  );

  for (const id of ctx.selectedSpells) {
    const ability = lookupAbility(ctx.klass, id);
    if (!ability) continue;
    const pool = ability.type;
    if (!MEMORY_POOLS.includes(pool)) continue;
    const cost = ability.memoryCost ?? 0;
    const slot = budget[pool];
    if (slot.used + cost <= slot.capacity) {
      slot.used += cost;
    } else {
      slot.lockedOut.push(id);
    }
  }

  return budget;
}

// Ability lookup now delegates to `findAbility` in data/classes/ability-helpers.
// Kept as a local alias so existing call sites read unchanged.
const lookupAbility = findAbility;
