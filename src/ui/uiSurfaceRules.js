// uiSurfaceRules — class-agnostic helpers that let UI components decide
// which surfaces to render based purely on the shape of the selected
// build's data. Per `docs/perspective.md` § Core principle 6 (UI emerges
// from data): if nothing in the available abilities references
// `hp_below`, no HP slider appears; if no atom references a class
// resource, no counter appears; etc.
//
// These helpers never branch on class id, ability id, stat id, or any
// other identity constant (LOCK J). They walk the atom shape, looking
// for structural markers: `condition.type === "hp_below"`,
// `atom.target === "either"`, `atom.resource === <any>`, etc.
//
// Companion rule: a minimal `ctx` builder for calling the exported
// `evaluateCondition` from outside the engine pipeline — Phase 7 plan
// Decision #4 Option F. We compose just enough Stage-0-ish state from
// the current Session + Snapshot for `ability_selected`,
// `effect_active`, `hp_below`, `player_state`, `weapon_type`, `any`,
// `all`, `not` to evaluate correctly — the variants that drive the
// data-surface decisions the UI actually asks about.

import { evaluateCondition } from "../engine/conditions.js";
import { findAbility } from "../data/classes/ability-helpers.js";

// ─────────────────────────────────────────────────────────────────
// Atom-tree walkers
// ─────────────────────────────────────────────────────────────────

// Iterate every atom in an ability's containers. Covers effects[],
// damage[], heal (single), shield (single), and afterEffect.effects[].
// Grants/removes are excluded — they are availability-resolver input,
// not stat-contribution atoms that UI surfaces query against.
export function* iterAbilityAtoms(ability) {
  if (!ability) return;
  for (const a of ability.effects ?? [])   yield a;
  for (const a of ability.damage ?? [])    yield a;
  if (ability.heal)                        yield ability.heal;
  if (ability.shield)                      yield ability.shield;
  const ae = ability.afterEffect;
  if (ae) {
    for (const a of ae.effects ?? []) yield a;
  }
}

// Walk every leaf condition node in a condition tree. `all`/`any`/`not`
// recurse via `conditions[]`; other variants are leaves.
export function walkConditions(condition, visitor) {
  if (!condition) return;
  if (condition.type === "all" || condition.type === "any" || condition.type === "not") {
    for (const child of condition.conditions ?? []) walkConditions(child, visitor);
    return;
  }
  visitor(condition);
}

// ─────────────────────────────────────────────────────────────────
// Per-ability rule predicates
// ─────────────────────────────────────────────────────────────────

// True iff any atom's condition-tree contains { type: "hp_below" }.
// Drives the HP-fraction slider surface.
export function abilityReferencesHpBelow(ability) {
  for (const atom of iterAbilityAtoms(ability)) {
    let found = false;
    walkConditions(atom.condition, (leaf) => {
      if (leaf.type === "hp_below") found = true;
    });
    if (found) return true;
  }
  return false;
}

// Set of every resourceId referenced by any atom's `resource` field.
// Drives class-resource counter surfaces.
export function abilityResourceRefs(ability) {
  const out = new Set();
  for (const atom of iterAbilityAtoms(ability)) {
    if (typeof atom.resource === "string") out.add(atom.resource);
  }
  return out;
}

// True iff any atom has `target: "either"`. Drives the per-ability
// applyToSelf / applyToEnemy toggles.
export function abilityHasEitherTarget(ability) {
  for (const atom of iterAbilityAtoms(ability)) {
    if (atom.target === "either") return true;
  }
  return false;
}

// True iff the ability has a non-trivial afterEffect (an effects[] with
// at least one entry). Drives the viewing-afterEffect checkbox surface.
export function abilityHasNonTrivialAfterEffect(ability) {
  const ae = ability?.afterEffect;
  if (!ae) return false;
  return Array.isArray(ae.effects) && ae.effects.length > 0;
}

// ─────────────────────────────────────────────────────────────────
// Build-level aggregation helpers — keyed over the available abilities
// ─────────────────────────────────────────────────────────────────

// Look an ability up by id in a class-data object. Re-exported from
// `findAbility` in `src/data/classes/ability-helpers.js` under the old
// name to avoid churn at UI call sites. Do NOT re-implement locally —
// the helper is the single source of truth (prevents the bug class
// where a consumer invents a fictional `classData.abilities` field).
export const findAbilityById = findAbility;

// Union of the per-ability predicates across a set of ability ids.
// Callers typically pass `snapshot.availableAbilityIds` as `abilityIds`.
export function buildReferencesHpBelow(classData, abilityIds) {
  for (const id of abilityIds) {
    const a = findAbilityById(classData, id);
    if (abilityReferencesHpBelow(a)) return true;
  }
  return false;
}

export function buildResourceRefs(classData, abilityIds) {
  const out = new Set();
  for (const id of abilityIds) {
    const a = findAbilityById(classData, id);
    for (const r of abilityResourceRefs(a)) out.add(r);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────
// Minimal-ctx builder — Phase 7 Decision #4 Option F
// ─────────────────────────────────────────────────────────────────

// Construct a ctx-like object sufficient for `evaluateCondition` to
// handle the condition variants that drive UI-surface decisions. We do
// NOT re-run Stage 0 here — the normalize / runSnapshot pipeline already
// produced `availableAbilityIds` / `activeAbilityIds` / `weaponType`
// (indirectly via snapshot + original build). We feed those through.
//
// Not all variants are supported; variants outside the classResource
// UI-gating use case (`damage_type`, `tier`, `equipment`, `environment`,
// `creature_type`) work if the caller populates the relevant ctx fields,
// but the common case is UI gating of resource counters — for which
// `ability_selected` / `effect_active` / `any` / `all` / `not` suffice.
export function buildConditionCtxForUi({ character, session, snapshot, classData }) {
  const sel = character?.persistentSelections ?? {};
  return {
    klass:              classData,
    selectedPerks:      sel.selectedPerks  ?? [],
    selectedSkills:     sel.selectedSkills ?? [],
    selectedSpells:     sel.selectedSpells ?? [],
    activeBuffs:        session?.activeBuffs ?? [],
    activeAbilityIds:   snapshot?.activeAbilityIds    ?? [],
    availableAbilityIds: snapshot?.availableAbilityIds ?? [],
    hpFraction:         session?.hpFraction ?? 1.0,
    playerStates:       session?.playerStates ?? [],
    environment:        session?.environment,
    selectedTiers:      session?.selectedTiers ?? {},
    target:             session?.target ?? {},
    weaponType:         snapshot?.weaponType,
    isTwoHanded:        !!snapshot?.isTwoHanded,
    isOneHanded:        !!snapshot?.isOneHanded,
    isUnarmed:          !!snapshot?.isUnarmed,
    isInstrument:       !!snapshot?.isInstrument,
    isDualWielding:     !!snapshot?.isDualWielding,
  };
}

// Evaluate a classResource's `condition` against the UI-ctx to decide
// whether the counter should render. Resources with no condition
// (or a null condition) are always surfaced.
export function classResourceConditionPasses(resourceDef, uiCtx) {
  if (!resourceDef?.condition) return true;
  return evaluateCondition(resourceDef.condition, uiCtx);
}
