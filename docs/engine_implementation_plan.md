# Engine Implementation Plan

Phase 5 deliverable. Decomposes the snapshot engine into modules with clear contracts, test plans, and stage-boundary memoization points. A Phase 6 implementer builds each `src/engine/<module>.js` to the contract specified here — module name, inputs, outputs, dependencies, purity classification, performance budget share, and test approach — without re-deriving architectural decisions.

This doc is the **how** to build the engine. `docs/engine_architecture.md` is the **what** it must do; `docs/perspective.md` is the mental model; `docs/rebuild-plan.md § Phase 5` is the charter. Read those first.

---

## 1. Purpose and priority hierarchy

The engine turns a `Build` (class + selected abilities + gear + toggles) into a `Snapshot` (derived stats + damage/heal/shield projections + available abilities) deterministically, purely, and under 50 ms for the largest realistic build.

Three-priority hierarchy (resolves every tradeoff; from `docs/rebuild-plan.md § Constraints`):

1. **Performance first.** Snapshot recompute < 50 ms for `bench/fixtures/max-loadout.fixture.js`. Module boundaries enable memoization at stage transitions without restructuring. Cache keys are fine-grained dependency-declared where measurement warrants.
2. **Class-agnostic, second.** Adding a class is a data change only. Engine code never branches on class, ability, or stat identity. Dispatch is enum-driven (condition type, damage type, effect phase, activation) or data-driven (atom contents).
3. **Engine-mechanic extension ease, third.** New mechanic types extend dispatch tables; they do not rewrite pipelines. Adding a `scalesWith` variant or condition variant is a constants-set edit + single dispatch-table entry.

Plus the **accuracy-first doctrine**: every numeric claim in projection tests traces to a verified source (`docs/damage_formulas.md` / `docs/healing_verification.md` / `docs/season8_constants.md`) with line citations. See §11.4.

When priorities conflict, top of list wins.

---

## 2. Module list

Twelve modules, all under `src/engine/`. Every module is pure JavaScript; none reads DOM or time. Every module is test-covered in isolation.

| Module | Path | Stage | Responsibility (one-line) |
|---|---|---|---|
| `buildContext` | `src/engine/buildContext.js` | 0 | `Build` → `ctx`. Attribute totals, weapon-state, availability resolver, memory-budget preliminary pass. |
| `collectAtoms` | `src/engine/collectAtoms.js` | 1 | Walk every active ability's atom containers; populate `source` + `atomId`; apply afterEffect short-circuit. |
| `filterByConditions` | `src/engine/filterByConditions.js` | 2 | Per-atom condition evaluation; drop false-condition atoms; pass-through `damage_type` for Stage 6. |
| `conditions` | `src/engine/conditions.js` | 2.5 | Dispatch table: `evaluateCondition(cond, ctx, abilityShape) → boolean`. Used by Stages 0/2/6. |
| `materializeStacking` | `src/engine/materializeStacking.js` | 3 | Apply `maxStacks` / `resource` counts × `scalesWith` derivation → atom `value`. |
| `aggregate` | `src/engine/aggregate.js` | 4 | Bucket effect atoms by `(stat, phase)`; route typed-damage-bonus and post-cap layers. |
| `deriveStats` | `src/engine/deriveStats.js` | 5 | Wrap `recipes.computeDerivedStats(attrs, bonusesFlat, capOverrides)`. Phase-flattening. |
| `projectDamage` | `src/engine/projectDamage.js` | 6 | Per DAMAGE_ATOM: physical vs magical dispatch; typed bonuses; post-cap layers; emit derived-heal descriptors. |
| `projectHealing` | `src/engine/projectHealing.js` | 6 | Per HEAL_ATOM + derived-heal descriptors from projectDamage: run `calcHealing`. |
| `projectShield` | `src/engine/projectShield.js` | 6 | Per SHIELD_ATOM: `absorb = base + scaling × MPB`. |
| `runSnapshot` | `src/engine/runSnapshot.js` | — | Public entry; orchestrates 0→6; exports Query API companions. |
| `damageTypeToHealType` | `src/engine/damageTypeToHealType.js` | utility | `physical → "physical"`; any magical subtype → `"magical"`. Imported by projectDamage. |

Legend for module §3 template fields:

- **Purity.** `pure` (no external reads), `pure-with-constants-read` (reads engine constants / STAT_META / RECIPE_IDS / EFFECT_PHASES), `ctx-reading-only` (reads `ctx` in addition to constants; never writes it), or `impure` (none of the engine modules are impure — listed for completeness).
- **Memoization checkpoint.** Cache key composition + Phase 6 recommendation (implement now vs. measure-first).
- **Budget share.** % of the 50 ms budget per §10.
- **Verified citations.** Line-numbered references for projection-math test assertions per LOCK H.

---

## 3. Per-module contracts

### 3.1 `buildContext`

**Path.** `src/engine/buildContext.js`

**Responsibility.** Turn the user-facing `Build` into the immutable `ctx` consumed by Stages 1–6. Sum base + gear attributes; resolve weapon state from gear; run the availability resolver (selected + grants − removes, with iterative fixpoint and cycle guard); run the memory-budget preliminary pass using base-attribute-only `memoryCapacity`; derive `classResourceCounters` defaults from user input. `ctx` is read-only after this module returns. Per arch-doc §5 and `docs/perspective.md § 1` (snapshot, not real-time).

**Public API.**

```ts
export function buildContext(build: Build): Ctx
```

**Inputs.** `Build` — user-facing shape carrying class data, selected abilities, active buffs, classResourceCounters, stackCounts, selectedTiers, playerStates, viewingAfterEffect set, environment, target profile, gear, attribute base + gear totals, hpFraction. Full shape per `bench/fixtures/max-loadout.fixture.js:506–561` (Phase 0 anchor).

**Outputs.** `Ctx` per arch-doc §5. Key fields: `klass`, selected sets, `activeBuffs`, `activeForm` (singleton, nullable for non-Druid classes), toggles, target, gear, `weaponType`, `attributes` (base + gear summed), `hpFraction`, `availableAbilityIds`, `activeAbilityIds`, `lockedAbilityIds`, `memoryBudget` (preliminary pass only — final pass lives in `runSnapshot` after Stage 5), `capOverrides` (empty at Stage 0; populated by Stage 4 aggregate routing cap_override phase atoms into ctx — the engine flow is: Stage 4 produces cap_overrides map, Stage 5 reads it; Stage 0's `capOverrides` is the empty initial).

**Dependencies.**
- Engine modules: `conditions` (for availability-resolver + memory-budget `condition` evaluation).
- Engine constants: `ABILITY_TYPES`, `ACTIVATIONS`, `WEAPON_TYPES`, `WEAPON_TYPE_CATEGORIES`, `ARMOR_TYPES`, `GRANT_REMOVE_TYPES` (`src/data/constants.js`).
- Verified-math files: none.

**Purity.** `pure-with-constants-read`. Reads `Build` (parameter), reads engine constants. Produces `ctx` as fresh object. No side-effects; `ctx` is returned by value. Per arch-doc §5 "read-only from Stage 1 onward."

**Memoization checkpoint.**
- Cache key composition: the full `Build` object digest. No finer split — every `Build` field influences `ctx`.
- Phase 6 recommendation: measure first. Stage 0 should be ≤ 5% of budget (§10); memoization only pays if repeated calls dominate. Typical UI pattern is one `buildContext` call per user interaction; cache hit rate likely low unless the Stage 0 computation is heavy.

**Budget share.** 5% (2.5 ms). Linear scans over bounded sets (perks/skills/spells ≤ ~25 in max loadout; grants fixpoint ≤ 3 iterations per §6.2; memory-budget preliminary pass is O(selected spells)).

**Test approach.**
- **Unit fixtures** (under `src/engine/buildContext.test.js`):
  - Minimal class (1 perk, 1 cast_buff toggle, 2 spells) — attribute totals + weapon-state derivation.
  - Availability fixpoint — grants chain depth 2 (A grants B; B grants C).
  - Availability cycle — grants chain with cycle (A grants B; B grants A); assert cycling grant dropped + warning in `ctx.debug`.
  - Memory-budget preliminary — 3 spells costing 2/3/4 slots against base KNO-derived capacity of 6; assert third spell in `lockedAbilityIds`.
  - Weapon-state virtual categories — equip bow → `ctx.weaponType === "bow"` and `weapon_type: "ranged"` evaluates true.
- **Integration** (with `collectAtoms`): max-loadout fixture → `ctx.activeAbilityIds` includes granted abilities (demon_bolt, dark_strike, exit_form under demon_form active).

**Verified citations.** None (no projection math); availability + memory-budget semantics are spec, not verified math.

---

### 3.2 `collectAtoms`

**Path.** `src/engine/collectAtoms.js`

**Responsibility.** Walk every `abilityId ∈ ctx.activeAbilityIds`; collect atoms from each ability's containers (`effects`, `damage`, `heal`, `shield`, `grants`, `removes`, and when applicable `afterEffect.effects`); populate each atom's `source` and `atomId` fields per arch-doc §6.2 / `docs/performance-budget.md § 6.2`. Apply the Stage 1 afterEffect short-circuit per arch-doc §14 and LOCK E (see §8 below for the full rule). Output is flat lists per category.

**Public API.**

```ts
export function collectAtoms(ctx: Ctx): CollectedAtoms

CollectedAtoms = {
  effects:     StatEffectAtom[],
  damage:      DamageAtom[],
  heal:        HealAtom[],       // flat list — singular `heal` becomes a 1-entry list
  shield:      ShieldAtom[],     // flat list — singular `shield` becomes a 1-entry list
  grants:      GrantAtom[],
  removes:     RemoveAtom[],
}
```

**Inputs.** `ctx.activeAbilityIds`, `ctx.viewingAfterEffect`, and the class data (via `ctx.klass`).

**Outputs.** `CollectedAtoms`. Every atom is a shallow clone of the authored atom augmented with `source: { kind, abilityId, className }` and `atomId: "<abilityId>:<container>:<index>"`.

**Dependencies.**
- Engine modules: none.
- Engine constants: `ABILITY_TYPES` (to know which containers exist per ability type).
- Verified-math files: none.

**Purity.** `ctx-reading-only`. Reads `ctx`; returns new arrays. No mutation of atoms, no mutation of ctx.

**Memoization checkpoint.**
- Cache key composition: sorted `ctx.activeAbilityIds` + `ctx.viewingAfterEffect` (as a sorted array of ability ids) + `ctx.klass.id` (guard against class swap mid-session). Class data itself is static per module load.
- Phase 6 recommendation: implement. The Stage 1 output is reused by Stages 2+ repeatedly in a single snapshot; across snapshots, it invalidates only when the active-abilities set or the afterEffect-viewing set changes. Gear / attribute changes don't invalidate.

**Budget share.** 5% (2.5 ms). Linear walk; string construction for `atomId`; shallow clone.

**Test approach.**
- **Unit fixtures** (`src/engine/collectAtoms.test.js`):
  - Minimal ability with one atom per container → verify `atomId` format: `<abilityId>:effects:0`, `<abilityId>:damage:0`, `<abilityId>:heal:0`, `<abilityId>:shield:0`, `<abilityId>:grants:0`, `<abilityId>:removes:0`.
  - Ability with `afterEffect.effects[N]` → `atomId` format: `<abilityId>:afterEffect.effects:N` (dotted container per arch-doc §6.2 examples).
  - **afterEffect short-circuit ON** — `ctx.viewingAfterEffect = new Set(["eldritch_shield"])`: expect Eldritch Shield's `afterEffect.effects[0..1]` IN output; Eldritch Shield's `shield`/`effects` NOT in output.
  - **afterEffect short-circuit OFF** — `ctx.viewingAfterEffect = new Set()`: expect Eldritch Shield's main-state atoms IN output; `afterEffect.effects` NOT in output.
  - `source.kind` correctly reflects the ability's `type` field (perk / skill / spell / transformation / music).
- **Integration** (with `buildContext`): max-loadout fixture → verify atom-count matches the sum of authored atoms across `ctx.activeAbilityIds`.

**Verified citations.** None (structural, not projection math).

---

### 3.3 `filterByConditions`

**Path.** `src/engine/filterByConditions.js`

**Responsibility.** For each atom in each category of `CollectedAtoms`, evaluate the atom's `condition` against ctx via `conditions.evaluateCondition`. Drop atoms whose condition evaluates false. Pass through atoms with `damage_type` conditions (at any nesting depth) — those are re-evaluated per-projection at Stage 6 per arch-doc §11.

**Public API.**

```ts
export function filterByConditions(atoms: CollectedAtoms, ctx: Ctx): CollectedAtoms
```

**Inputs.** Stage 1 output + ctx.

**Outputs.** Same shape as input; filtered. Retains `damage_type`-carrying atoms unfiltered (see deferred-evaluation rule below).

**Dependencies.**
- Engine modules: `conditions` (hot path).
- Engine constants: `CONDITION_TYPES` (via conditions module).
- Verified-math files: none.

**Purity.** `ctx-reading-only`. Reads ctx + atom conditions; outputs filtered arrays.

**Memoization checkpoint.**
- Cache key composition (fine-grained, per §7 — engine open Q2 resolution):
  - `stageOneKey` (the Stage 1 cache key above)
  - `ctx.selectedPerks` + `ctx.selectedSkills` + `ctx.selectedSpells` (for `ability_selected`)
  - `ctx.activeBuffs` (for `effect_active`)
  - `ctx.weaponType` (for `weapon_type`)
  - `ctx.playerStates` (for `player_state`)
  - `ctx.equipment` (for `equipment`)
  - `ctx.target.creatureType` (for `creature_type`)
  - `ctx.environment` (for `environment`)
  - `ctx.selectedTiers` (for `tier`)
  - `ctx.hpFraction` (for `hp_below`)
  - `ctx.activeForm` (for Druid future — subset of `activeBuffs` but carried separately for singleton invariant)
- Deliberately excluded: `ctx.attributes` (no condition reads attributes), `ctx.stackCounts` (read at Stage 3), `ctx.classResourceCounters` (read at Stage 3), `ctx.capOverrides` (read at Stage 5), `ctx.target.pdr/mdr/headshotDR` (read at Stage 6), gear bonuses other than those feeding `weaponType`.
- Phase 6 recommendation: implement. Stage 2 is the second-heaviest stage at 25% budget; caching across unrelated ctx changes is the single highest-leverage memoization point.

**`damage_type` deferred-evaluation rule.** An atom whose `condition` tree contains a `damage_type` node at any depth stays in the filtered output regardless of its other condition nodes' truth values. Why: `damage_type` is only meaningful relative to an outgoing damage projection — Stage 2 can't know which damage projection an `effects`-list atom might affect. Rather than short-circuit-drop or short-circuit-keep based on non-`damage_type` branches (which risks wrong behavior on compound conditions), Stage 2 keeps the atom and lets Stage 6 re-evaluate the whole condition tree per projection. The Antimagic pattern (arch-doc §7) is the canonical consumer; its `not → damage_type: divine_magical` is the whole condition. Aggregate (Stage 4) must know to route `damage_type`-conditioned atoms ONLY into `postCapMultiplicativeLayers` (with their condition preserved) — see §3.6.

**Budget share.** 25% (12.5 ms). Condition-tree walk per atom; per-atom work is O(condition depth); max-loadout has ~50 atoms × ~1–3 condition nodes each. Biggest expected hotspot outside Stage 6.

**Test approach.**
- **Unit fixtures** (`src/engine/filterByConditions.test.js`):
  - One fixture per condition variant (13 total) — atom included / excluded as expected.
  - Compound `all` / `any` / `not` combinators.
  - `damage_type` pass-through: atom with `not → damage_type: divine_magical` stays in output even when ctx is silent on damage types.
  - `effect_active` activation dispatch — three sub-cases (passive, cast_buff/toggle, cast) per arch-doc §11.
- **Integration** (with `collectAtoms`): Warlock `blood_pact` active → blood_pact `effects[]` atoms pass (condition: `effect_active: blood_pact`); with blood_pact NOT in `activeBuffs`, the atoms drop.

**Verified citations.** Behavior citations only (no projection math at Stage 2): arch-doc §11 dispatcher table; `warlock.new.js:289–300` (Blood Pact effect_active pattern); `warlock.new.js:121–124` (Antimagic compound not → damage_type).

---

### 3.4 `conditions`

**Path.** `src/engine/conditions.js`

**Responsibility.** Dispatch table + compound combinators evaluating every `CONDITION_TYPES` variant per arch-doc §11. Exported as a table so Phase 6 / Phase 10 can add variants additively (new entry, no pipeline rewrite — the third-priority extension ease principle).

**Public API.**

```ts
export function evaluateCondition(
  cond: Condition | undefined,
  ctx: Ctx,
  abilityShape?: { id: string, activation: Activation, type: AbilityType, tags?: string[] }
): boolean

// Dispatch table exported for test visibility + future extension.
export const CONDITION_EVALUATORS: Record<ConditionType, Evaluator>

// Compound combinators (internal but exported for direct test):
export function evalAll(cond, ctx, abilityShape): boolean
export function evalAny(cond, ctx, abilityShape): boolean
export function evalNot(cond, ctx, abilityShape): boolean
```

**`abilityShape` parameter.** Required by two evaluators:
- `effect_active` — dispatches on the TARGET ability's `activation` per arch-doc §11 / `docs/vocabulary.md § 1.2`. `effect_active` consults `ctx.klass` to find the target ability by `effectId` and reads that ability's `activation`. `abilityShape` is NOT the target; it's the source atom's parent ability (used by `tier` below).
- `tier` — reads `ctx.selectedTiers[abilityShape.id]` per arch-doc §11 "`tier` ability-scope context." The current atom's owning ability is the tier target.

`abilityShape` is `undefined` when `evaluateCondition` is called outside an atom context (e.g., for an ability-level `condition` at Stage 0 availability, or for a `classResources` entry's condition — both of which have access to their owning ability directly).

**Inputs.** Condition tree + ctx + optional ability shape.

**Outputs.** Boolean.

**Dependencies.**
- Engine modules: none.
- Engine constants: `CONDITION_TYPES`, `WEAPON_TYPES`, `WEAPON_TYPE_CATEGORIES`, `PLAYER_STATES`, `TIER_VALUES`, `ABILITY_TYPES`, `ACTIVATIONS` (`src/data/constants.js`).
- Verified-math files: none.

**Purity.** `pure-with-constants-read`. Reads ctx + constants; no mutation.

**Evaluator table (per arch-doc §11 + `docs/vocabulary.md § 6`).**

| Variant | Evaluator body (summary) |
|---|---|
| `hp_below` | `ctx.hpFraction < cond.threshold` |
| `ability_selected` | `cond.abilityId ∈ ctx.selectedPerks ∪ ctx.selectedSkills ∪ ctx.selectedSpells` |
| `effect_active` | Look up target `ability = ctx.klass.*.find(a => a.id === cond.effectId)`; switch on `ability.activation`: `passive → selected`; `cast_buff`/`toggle → selected AND cond.effectId ∈ ctx.activeBuffs`; `cast → false`. If target ability not found (e.g., stale id): `false`. |
| `environment` | `ctx.environment === cond.env` |
| `weapon_type` | `ctx.weaponType === cond.weaponType` OR virtual-category resolution (see below) |
| `player_state` | `cond.state ∈ ctx.playerStates` |
| `equipment` | `ctx.equipment?.[cond.slot] === cond.equipped` |
| `creature_type` | `ctx.target.creatureType === cond.creatureType` |
| `damage_type` | Stage 2 returns `true` as pass-through; Stage 6 evaluates against the current projection's `damageType` (handled inside `projectDamage`, not here). The evaluator in `conditions.js` takes an optional `damageType` third argument for Stage 6 use: `cond.damageType` string or array-membership; `cond.exclude` array for negation. |
| `tier` | `ctx.selectedTiers?.[abilityShape?.id] === cond.tier` |
| `all` | Every `cond.conditions[i]` evaluates true |
| `any` | At least one `cond.conditions[i]` evaluates true |
| `not` | No `cond.conditions[i]` evaluates true (equivalent to `!evalAny`) |

**Virtual `weapon_type` resolution.** For virtual categories listed in `WEAPON_TYPE_CATEGORIES`: `ranged → ctx.weaponType ∈ ["bow", "crossbow"]`. For `two_handed` / `one_handed` / `unarmed` / `instrument` / `dual_wield`: resolved against gear properties threaded onto `ctx` at Stage 0 (e.g., `ctx.weaponHanded === "two_handed"`, `ctx.isUnarmed`, `ctx.isInstrument`, `ctx.isDualWielding`). Stage 0 precomputes these booleans; `conditions` reads them.

**Memoization checkpoint.** Not a stage boundary — functions are short and called many times per snapshot. No caching; inlining/JIT handles it.

**Budget share.** Counted inside Stage 2 (25%) + small fraction of Stages 0 and 6.

**Test approach.**
- **Unit fixtures** (`src/engine/conditions.test.js`):
  - One test per variant (13 variants × at-least-true + at-least-false = 26 cases).
  - `effect_active` with each activation (`passive`, `cast_buff`, `toggle`, `cast`).
  - Compound combinators (`all` empty → true; `any` empty → false; `not` empty → true; nested `all/any/not`).
  - `weapon_type` virtual resolution — all four virtual categories tested.
  - `damage_type` evaluator — as Stage 2 pass-through + as Stage 6 evaluator against a damage-type argument (both branches).

**Verified citations.** Behavior citations only.

---

### 3.5 `materializeStacking`

**Path.** `src/engine/materializeStacking.js`

**Responsibility.** For each atom with `maxStacks` or `resource`: resolve stack count from ctx and multiply the atom's `value` (or `base` + `scaling` on DAMAGE_ATOM). For each atom with `scalesWith`: dispatch on `scalesWith.type` and derive the atom's runtime value. Per arch-doc §12 + §13. Output atoms have a `materializedValue` (effects) or materialized `base`/`scaling` (damage) ready for Stage 4/Stage 6 consumption.

**Public API.**

```ts
export function materializeStacking(
  atoms: CollectedAtoms,
  ctx: Ctx
): CollectedAtoms
```

**Inputs.** Stage 2 output + ctx.

**Outputs.** Same-shape structure with atom values materialized. For STAT_EFFECT_ATOM: a `materializedValue` field is added (original `value` preserved for debug). For DAMAGE_ATOM: `base` / `scaling` unchanged (Stage 6 consumes them alongside the stack multiplier); a `stackMultiplier` field is added so projection can multiply the final damage output. For `scalesWith: hp_missing` on a DAMAGE_ATOM (forward-spec for Barbarian Berserker with `scalesWith` on a damage atom), `scalesWith` produces a scalar multiplier threaded to projection; for `scalesWith: attribute` on a DAMAGE_ATOM (forward-spec Druid shapeshift), the derived attribute-curve value becomes the atom's effective `base` per arch-doc §12.

**Dependencies.**
- Engine modules: `curves` (`evaluateCurve`, `STAT_CURVES`).
- Engine constants: `SCALES_WITH_TYPES`, `CORE_ATTRS`.
- Verified-math files: `src/engine/curves.js` (for `scalesWith: attribute`).

**Purity.** `pure-with-constants-read`. Reads ctx, constants, and curves.

**Stacking rule (arch-doc §13).** Contribution = `atom.value × currentStackCount`. XOR: validator enforces `maxStacks` XOR `resource` (`C.stacking` rule in class-shape-validator.js:712–716).
- `maxStacks`: count = `Math.min(ctx.stackCounts[source.abilityId] ?? 0, atom.maxStacks)`.
- `resource`: count = `ctx.classResourceCounters[atom.resource] ?? 0` (resource's own `maxStacks` gates the counter at the UI; engine reads whatever the user set).

**`scalesWith` rule (arch-doc §12 + `docs/vocabulary.md § 9.1`).**
- `hp_missing`: `value = min(floor((1 - ctx.hpFraction) × 100 / per) × valuePerStep, maxValue)`. Barbarian Berserker anchor: `{per: 10, valuePerStep: 0.02, maxValue: 0.20}`.
- `attribute`: `value = evaluateCurve(STAT_CURVES[sw.curve], ctx.attributes[sw.attribute])`. Druid shapeshift anchor: `{curve: "shapeshiftPrimitive", attribute: "str"}`.

For a STAT_EFFECT_ATOM with BOTH `scalesWith` and a stacking field: derived-value = `scalesWith_value × stack_count`. This combination is not in Warlock but is allowed by the shape; spec is explicit for forward-spec. For a DAMAGE_ATOM: `scalesWith` derives the effective `base`; stacking multiplies the whole projection at Stage 6. No Warlock atom uses both fields on a single atom today.

**Memoization checkpoint.**
- Cache key composition: Stage 2 cache key + `ctx.stackCounts` + `ctx.classResourceCounters` + `ctx.hpFraction` + `ctx.attributes` (for `scalesWith: attribute`).
- Phase 6 recommendation: measure first. Stage 3 is budget 5% — if small in absolute terms, memoization overhead may exceed savings. Measure and decide.

**Budget share.** 5% (2.5 ms). One multiply + one stacking lookup per atom + `scalesWith` dispatch. `evaluateCurve` runs rarely (only for `scalesWith: attribute`).

**Test approach.**
- **Unit fixtures** (`src/engine/materializeStacking.test.js`):
  - `maxStacks` atom — stack count 2, maxStacks 10 → mult 2; stack count 15 → mult 10 (capped).
  - `resource` atom — counter at 3 → mult 3; counter unset → mult 0.
  - `scalesWith: hp_missing` — Berserker pattern. `hpFraction 0.6 → 40% missing → 4 steps × 0.02 = 0.08`; `hpFraction 0.1 → 90% missing → 9 steps × 0.02 = 0.18`; `hpFraction 0.05 → 95% missing → 9 steps × 0.02 = 0.18` (capped at `maxValue: 0.20` — doesn't exceed here; one test at missing ≥ 100% to hit cap).
  - `scalesWith: attribute` — mock `STAT_CURVES` with a known piecewise curve; verify lookup.
- **Integration** (with `filterByConditions` + Warlock): Warlock `soul_collector.effects[0]` with `classResourceCounters.darkness_shards = 3` → materializedValue = `1 × 3 = 3`; `soul_collector.effects[1]` with same count → materializedValue = `0.33 × 3 = 0.99`.

**Verified citations.** No projection math yet; arch-doc §12 + §13 are the semantic spec.

---

### 3.6 `aggregate`

**Path.** `src/engine/aggregate.js`

**Responsibility.** Bucket Stage 3 `effects` atoms by `(stat, phase)` into `bonuses`; route `type_damage_bonus`-phase atoms into `perTypeBonuses` (keyed by implied damage type); route `post_cap_multiplicative_layer`-phase atoms (preserving their `damage_type` conditions) into `postCapMultiplicativeLayers`. Route `cap_override`-phase atoms into `capOverrides`. Fold gear bonuses (from `ctx.gear.bonuses`) into `bonuses` (as a synthetic "gear" phase). Per arch-doc §3 Stage 4 spec + §7 phase table.

**Public API.**

```ts
export function aggregate(
  effects: StatEffectAtom[],
  gearBonuses: Record<StatId, number>,
  ctx: Ctx
): AggregateResult

AggregateResult = {
  bonuses:                     Record<StatId, Record<Phase, number>>,
  perTypeBonuses:              Record<DamageType, number>,          // keyed by magical subtype (dark_magical, fire_magical, ...)
  postCapMultiplicativeLayers: Array<{ stat: StatId, multiplier: number, condition?: Condition }>,
  capOverrides:                Record<RecipeId, number>,
}
```

**Inputs.** Stage 3 materialized `effects` atoms (including afterEffect.effects, both merged at Stage 1 or Stage 4; see below) + gear bonuses + ctx (for `target`-routing on `target: "either"` atoms).

**Outputs.** Four fields per above.

**Dependencies.**
- Engine modules: none.
- Engine constants: `EFFECT_PHASES`, `STAT_META`, `RECIPE_IDS`, `DAMAGE_TYPES`.
- Verified-math files: none.

**Purity.** `pure-with-constants-read`.

**Routing rules.**

1. **Default path** — atom with `stat` + `value` + `phase`, phase in `{pre_curve_flat, attribute_multiplier, post_curve, post_curve_multiplicative, multiplicative_layer, healing_modifier}`: `bonuses[atom.stat][atom.phase] += atom.materializedValue`.

2. **`type_damage_bonus` phase** — Look up stat-to-damage-type mapping (table below). Add atom's materializedValue to `perTypeBonuses[damageType]`. Per arch-doc §15.2 typed-bonus dispatch.

   | Stat (STAT_META key) | Damage type |
   |---|---|
   | `divineDamageBonus` | `divine_magical` |
   | `darkDamageBonus` | `dark_magical` |
   | `evilDamageBonus` | `evil_magical` |
   | `fireDamageBonus` | `fire_magical` |
   | `iceDamageBonus` | `ice_magical` |
   | `lightningDamageBonus` | `lightning_magical` |
   | `airDamageBonus` | `air_magical` |
   | `earthDamageBonus` | `earth_magical` |
   | `arcaneDamageBonus` | `arcane_magical` |
   | `spiritDamageBonus` | `spirit_magical` |
   | `lightDamageBonus` | `light_magical` |

   Table lives in `aggregate.js` as a private const `TYPED_STAT_TO_DAMAGE_TYPE`. Adding a damage subtype + typed stat is a constants-module edit + STAT_META entry + one table entry here.

3. **`post_cap_multiplicative_layer` phase** — Append `{stat: atom.stat, multiplier: atom.materializedValue, condition: atom.condition}` to `postCapMultiplicativeLayers`. Preserve the condition in full — Stage 6 re-evaluates per damage projection. Warlock anchor: Antimagic (`warlock.new.js:121–124`) — the `not → damage_type: divine_magical` condition rides along. Per arch-doc §7 antimagic worked example.

4. **`cap_override` phase** — Validator guarantees `atom.stat ∈ RECIPE_IDS` (`C.namespace` rule, class-shape-validator.js:480–484). `capOverrides[atom.stat] = atom.materializedValue`. Latest write wins (only one source per cap expected; multiple sources on same cap is an authoring issue, not engine-detected). Fighter Defense Mastery: `{stat: "pdr", phase: "cap_override", value: 0.75}`.

5. **`damage_type`-conditioned atoms arriving at Stage 4.** Invariant: `damage_type`-conditioned atoms should ONLY be at `post_cap_multiplicative_layer` phase (the Antimagic pattern). Aggregate checks: if an atom has a `damage_type` condition (at any depth) AND phase ≠ `post_cap_multiplicative_layer`, the atom is silently summed into `bonuses`/`perTypeBonuses` with the condition ignored — this would be a bug. Invariant enforcement: aggregate asserts `damage_type`-conditioned atoms are at `post_cap_multiplicative_layer` phase in dev mode; surfaces via `ctx.debug` in production. Phase 6 adds a validator rule to catch this at authoring time (new rule `C.damage_type_phase_invariant`; see §8's validator-followup note and §11 test plan).

6. **Gear bonuses** — For each `(stat, value)` in `gearBonuses`: `bonuses[stat].gear = (bonuses[stat].gear ?? 0) + value`. The "gear" phase is synthetic — it exists in aggregation but has no entry in `EFFECT_PHASES`. Stage 5 flattens gear alongside every other phase for stats that sum across all phases.

7. **`target: "either"` atoms (arch-doc §6.1).** At Stage 4 (NOT Stage 1), inspect `atom.target`. For `"either"` atoms, check per-ability user toggles (`ctx.applyToSelf[abilityId]`, `ctx.applyToEnemy[abilityId]`): when `applyToSelf` is true, route into self `bonuses`; when `applyToEnemy`, route into an enemy `bonuses` bucket (Stage 6 consumes for enemy-targeted damage); both can be true (dual-route per arch-doc §6.1). `ctx.applyToSelf` / `ctx.applyToEnemy` default to `true` / `false` respectively for a fresh build if not authored.

**Memoization checkpoint.**
- Cache key: Stage 3 cache key + `ctx.gear.bonuses` + `ctx.applyToSelf` + `ctx.applyToEnemy`.
- Phase 6 recommendation: implement. Stage 4 runs per snapshot; cache hit is very high when user toggles a non-related ctx field (e.g., `target.pdr`).

**Budget share.** 10% (5.0 ms).

**Test approach.**
- **Unit fixtures** (`src/engine/aggregate.test.js`):
  - Atoms at each of the 9 phases → correct routing.
  - `type_damage_bonus` atom with `stat: "darkDamageBonus"` → `perTypeBonuses.dark_magical` gets the value.
  - `post_cap_multiplicative_layer` atom with condition → preserved in `postCapMultiplicativeLayers[]`.
  - `cap_override` atom with `stat: "pdr"` → `capOverrides.pdr` set.
  - Gear bonuses folded into `bonuses.<stat>.gear`.
  - Multiple atoms targeting same `(stat, phase)` → additive.
  - `target: "either"` with `applyToSelf: true`, `applyToEnemy: true` → routed to both self and enemy buckets.
- **Integration** (with Warlock): Dark Enhancement + Soul Collector × 3 shards → `perTypeBonuses.dark_magical = 0.20 + 0.99 = 1.19`. Antimagic → `postCapMultiplicativeLayers[0] = {stat: "magicDamageTaken", multiplier: 0.80, condition: not(damage_type: divine_magical)}`.

**Verified citations.** Aggregation semantic is mechanism-only; projections that consume the aggregated output are verified at Stage 6. Phase-stacking rule reference: `docs/damage_formulas.md:130–143` (additive within phase, multiplicative across).

---

### 3.7 `deriveStats`

**Path.** `src/engine/deriveStats.js`

**Responsibility.** Wrap `src/engine/recipes.js::computeDerivedStats(attrs, bonusesFlat, capOverrides)`. Input adaptation: Stage 4 emits `bonuses` as `Record<StatId, Record<Phase, number>>`; `computeDerivedStats` expects flat `Record<StatId, number>` for most stats (per `src/engine/recipes.js:67–73`). Stage 5 flattens per phase semantics: for recipes that read a given stat, sum the phases the recipe's math expects (most sum all phases; a few are phase-specific).

**Public API.**

```ts
export function deriveStats(
  attributes: Attributes,
  bonusesPhased: Record<StatId, Record<Phase, number>>,
  capOverrides: Record<RecipeId, number>
): Record<DerivedId, { value: number, rawValue?: number, cap?: number }>
```

**Inputs.** `ctx.attributes` + Stage 4 `bonuses` (phased) + Stage 4 `capOverrides`.

**Outputs.** Per `src/engine/recipes.js::DERIVED_STAT_RECIPES` — 22 entries (health, ppb, mpb, pdr, mdr, moveSpeed, actionSpeed, spellCastingSpeed, regularInteractionSpeed, magicalInteractionSpeed, cdr, buffDuration, debuffDuration, memoryCapacity, healthRecovery, memoryRecovery, manualDexterity, equipSpeed, persuasiveness, luck, magicalHealing, physicalHealing, armorPenetration, magicPenetration, headshotDamageReduction, projectileDamageReduction, headshotDamageBonus).

**Dependencies.**
- Engine modules: none.
- Engine constants: `PATCH_HEALTH_BONUS`, `HR_STR_WEIGHT`, `HR_VIG_WEIGHT` (transitively via recipes.js).
- Verified-math files: `src/engine/recipes.js` (via `computeDerivedStats`).

**Purity.** `pure-with-constants-read`. Pure function of (attributes, bonuses, capOverrides).

**Phase-flattening rule.** For the flat `bonuses` map that recipes consume:
- Default: sum all phases. `bonusesFlat[stat] = sum(Object.values(bonusesPhased[stat] ?? {}))`.
- **Attribute phase semantics (arch-doc §7).** `attribute_multiplier` is multiplicative on the base attribute, not additive into `bonusesFlat[attr]`. Stage 5's attribute handling: before passing `attrs` to recipes, apply `attribute_multiplier` entries: `attrsAdjusted[attr] = (attrs[attr] + bonusesPhased[attr].pre_curve_flat ?? 0) × (1 + (bonusesPhased[attr].attribute_multiplier ?? 0))`. Malice anchor: `wil × (1 + 0.15)` applied at Stage 5 input.
- **`healing_modifier` phase** — dedicated stat `healingMod` in STAT_META; Stage 5 flattens as usual; Stage 6 `projectHealing` reads it.
- **Gear synthetic phase** — folds into the flat sum for all recipes; recipes don't distinguish.
- `type_damage_bonus` and `post_cap_multiplicative_layer` phases don't enter `bonusesFlat` (they live in `perTypeBonuses` / `postCapMultiplicativeLayers` from Stage 4).

**Memoization checkpoint.**
- Cache key: Stage 4 output + attributes + capOverrides.
- Phase 6 recommendation: measure first. Recipes are already fast per Phase 0 bench; marginal savings depend on recipe count.

**Budget share.** 10% (5.0 ms).

**Test approach.**
- **Unit fixtures** (`src/engine/deriveStats.test.js`, focused on the phase-flattening adapter):
  - Attribute multiplier applied correctly (Malice `wil: +0.15` → attrs_adjusted before recipe).
  - Gear phase folded alongside post_curve for same stat.
  - `type_damage_bonus` + `post_cap_multiplicative_layer` entries DO NOT flow into `bonusesFlat`.
  - Recipe tests (already covered by `src/engine/recipes.test.js`) are not duplicated — deriveStats is a thin wrapper.
- **Integration** (with Warlock): Warlock baseline (`warlock.new.js:15`) — attrs (str=11, vig=14, wil=22) → health 122 (season8_constants.md implicit; HR=13.25 → curve ≈ 112 → ceil + 10 patch = 122). Confirm.

**Verified citations.**
- Health recipe: `docs/season8_constants.md:46` (HP formula), Warlock HP baseline 122.
- PDR cap 65% / Defense Mastery 75%: `docs/season8_constants.md:11`, `docs/damage_formulas.md:56–58` (test V14).
- MDR cap 65% / Iron Will 75%: `docs/season8_constants.md:12` (test V15).
- MPB formula: `docs/damage_formulas.md:69` (component) — recipe tests existing cover.

---

### 3.8 `projectDamage`

**Path.** `src/engine/projectDamage.js`

**Responsibility.** For each DAMAGE_ATOM in Stage 3 materialized output: dispatch to `calcPhysicalMeleeDamage` (if `damageType === "physical"`) or `calcSpellDamage` (any magical subtype); produce per-hit-location projections; apply `perTypeBonuses[damageType]` additively into the typeBonuses term of the spell formula; apply `postCapMultiplicativeLayers` that pass per-projection condition re-evaluation; respect `trueDamage`, `weaponDamageScale`, `percentMaxHealth`, `count` fields; emit a derived-heal descriptor for atoms with `lifestealRatio` or `targetMaxHpRatio` (consumed by `projectHealing`). Per arch-doc §15 + §16.2 + §16.4.

**Public API.**

```ts
export function projectDamage(
  damageAtoms: DamageAtom[],
  derivedStats: DerivedStats,
  perTypeBonuses: Record<DamageType, number>,
  postCapMultiplicativeLayers: Array<{stat, multiplier, condition?}>,
  target: TargetProfile,
  gearWeapon: GearWeapon,
  ctx: Ctx
): {
  damageProjections: DamageProjection[],
  derivedHealDescriptors: DerivedHealDescriptor[],
}

DamageProjection = {
  atomId:        string,
  source:        { kind, abilityId, className },
  damageType:    DamageType,
  hit:           { body?: number, head?: number, limb?: number },  // per arch-doc §4.1
  derivedHeal?:  HealProjection,                                    // back-ref; projectHealing fills this in post
  derivedPercentMaxHealthDamage?: number,                           // iff atom.percentMaxHealth
  count?:        number,                                            // iff atom.count > 1
  isDot?:        boolean,
  tickRate?:     number,
  duration?:     number,
  trueDamage?:   boolean,
}

DerivedHealDescriptor = {
  kind:          "lifesteal" | "targetMaxHp",
  damageAtomId:  string,
  healAmount:    number,
  healType:      "physical" | "magical",
  target:        "self",
}
```

**Inputs.** Stage 3 damage atoms + Stage 5 `derivedStats` + Stage 4 `perTypeBonuses` + Stage 4 `postCapMultiplicativeLayers` + ctx.target + ctx.gear.weapon (for physical damage) + ctx.

**Outputs.** Array of `DamageProjection` + array of `DerivedHealDescriptor` (fed to `projectHealing`).

**Dependencies.**
- Engine modules: `conditions` (for `postCapMultiplicativeLayers` per-projection condition re-eval + for `damage_type`-conditioned atom's own condition re-eval), `damageTypeToHealType` (for derived-heal descriptor).
- Engine constants: `DAMAGE_TYPES`, `COMBAT` (`src/data/constants.js`).
- Verified-math files: `src/engine/damage.js` (`calcPhysicalMeleeDamage`, `calcSpellDamage`).

**Purity.** `pure-with-constants-read`.

**Per-atom algorithm.**

```
for each damageAtom in damageAtoms:
  # Stage 2 deferred evaluation — re-check atom's own condition if it carries damage_type
  if (atomHasDamageTypeCondition(damageAtom))
     and not evaluateCondition(damageAtom.condition, ctx, {damageType: damageAtom.damageType}):
    skip atom

  # Dispatch
  if damageAtom.damageType === "physical":
    projection = projectPhysical(damageAtom, derivedStats, postCapLayers, target, gearWeapon)
  else:
    projection = projectMagical(damageAtom, derivedStats, perTypeBonuses, postCapLayers, target, ctx)

  # AoE / DoT → only body hit (arch-doc §4.1, §15.4)
  if damageAtom.isDot or damageAtom.target ∈ ["nearby_enemies", "nearby_allies"]:
    projection.hit = { body: projection.hit.body }

  # percentMaxHealth — compute separately; UI shows alongside main
  if damageAtom.percentMaxHealth:
    projection.derivedPercentMaxHealthDamage =
      damageAtom.percentMaxHealth × resolveTargetMaxHealth(damageAtom.target, ctx, derivedStats)

  # Count
  if damageAtom.count and damageAtom.count > 1:
    projection.count = damageAtom.count

  # Derived heal
  if damageAtom.lifestealRatio:
    descriptor = {
      kind: "lifesteal",
      damageAtomId: damageAtom.atomId,
      healAmount: damageAtom.lifestealRatio × projection.hit.body,  // pre-MDR source per healing_verification.md:18–21
      healType: damageTypeToHealType(damageAtom.damageType),
      target: "self",
    }
    emit descriptor

  if damageAtom.targetMaxHpRatio:
    descriptor = {
      kind: "targetMaxHp",
      damageAtomId: damageAtom.atomId,
      healAmount: damageAtom.targetMaxHpRatio × target.maxHealth,
      healType: damageTypeToHealType(damageAtom.damageType),
      target: "self",
    }
    emit descriptor

  push projection
```

**`projectPhysical` details** (arch-doc §15.1; `docs/damage_formulas.md:7–61`):

```
for location in ["body", "head", "limb"]:
  hitDmg = calcPhysicalMeleeDamage({
    baseWeaponDmg:         gearWeapon.baseWeaponDmg,
    buffWeaponDmg:         bonuses.buffWeaponDamage?.post_curve + gear bonus ?? 0,
    comboMultiplier:       ctx.comboMultiplier ?? 1.0,    // user-set per-atom via UI (hit 1 = 1.0 default; Phase 6 wires from Build.comboMultiplier or defaults to 1.0 when absent)
    impactZone:            ctx.impactZone ?? 1.0,         // user-set per-atom via UI (center impact = 1.0 default; Phase 6 wires similarly)
    gearWeaponDmg:         gearWeapon.gearWeaponDmg,
    ppb:                   derivedStats.ppb.value,
    additionalPhysicalDmg: damageAtom.base,   // per damage_formulas.md:31 — "Additional Physical Damage: does NOT benefit from PPB"
    hitLocation:           location,
    headshotBonus:         derivedStats.headshotDamageBonus.value,
    targetHeadshotDR:      target.headshotDR,
    targetPDR:             target.pdr,
    attackerPen:           derivedStats.armorPenetration.value,
    projectileReduction:   damageAtom has tags ["projectile"] ? target.projectileDR : 0,
    truePhysicalDmg:       damageAtom.trueDamage ? damageAtom.base : 0,
  })
  projection.hit[location] = hitDmg × scaleFromStacksAndScalesWith(damageAtom, ctx)
```

**`projectMagical` details** (arch-doc §15.2; `docs/damage_formulas.md:63–82`):

```
typeBonus = perTypeBonuses[damageAtom.damageType] ?? 0

for location in ["body", "head", "limb"]:
  hitDmg = calcSpellDamage({
    baseDamage:             damageAtom.base + (gearWeapon.magicalDamage ?? 0),
    scaling:                damageAtom.scaling,
    mpb:                    derivedStats.mpb.value,
    hitLocation:            location,
    affectedByHitLocation:  !damageAtom.isDot and damageAtom.target ∉ ["nearby_enemies", "nearby_allies"],
    headshotBonus:          derivedStats.headshotDamageBonus.value,
    targetHeadshotDR:       target.headshotDR,
    targetMDR:              target.mdr,
    attackerMagicPen:       derivedStats.magicPenetration.value,
    typeBonuses:            typeBonus,
  })

  # Post-cap multiplicative layers (arch-doc §15.2; damage_formulas.md:180–188).
  for layer in postCapMultiplicativeLayers:
    if layer.condition and not evaluateCondition(layer.condition, ctx, abilityShape, damageAtom.damageType):
      continue
    if layer.stat === "magicDamageTaken":
      hitDmg = hitDmg × layer.multiplier

  projection.hit[location] = hitDmg × scaleFromStacksAndScalesWith(damageAtom, ctx)
```

Note: `calcSpellDamage` in `src/engine/damage.js:34–56` applies MDR inside the returned value. The post-cap layer is applied AFTER `calcSpellDamage` returns — the Antimagic layer is not additive to MDR but a separate multiplier. Verified per `docs/damage_formulas.md:180–188`.

**`resolveTargetMaxHealth` utility** (for `percentMaxHealth` on DAMAGE_ATOM):
- `target: "self"` → `derivedStats.health.value` (caster's max HP).
- `target: "enemy"`, `"nearby_enemies"` → `ctx.target.maxHealth` (user-set).
- `target: "ally"`, `"self_or_ally"`, `"party"`, `"nearby_allies"` → Phase 3 display-only per arch-doc §5; fall back to `derivedStats.health.value` as ally-proxy for Phase 6; UI label surfaces the ambiguity.

**Memoization checkpoint.**
- Cache key: Stage 3 damage atoms + `derivedStats` + `perTypeBonuses` + `postCapMultiplicativeLayers` + ctx.target + gear.weapon.
- Phase 6 recommendation: measure first. Stage 6 is the heaviest; memoization may help if user toggles a field that doesn't touch this key.

**Budget share.** ~25% of 50 ms (half the Stage-6 share per §10). Stage 6 overall 40%: projectDamage 25%, projectHealing 10%, projectShield 5%.

**Test approach.**
- **Unit fixtures** (`src/engine/projectDamage.test.js`):
  - Physical atom → three hit locations with verified math per test V1 (damage_formulas.md:234–240).
  - Magical atom (BoD) → bare hands body/head (tests V3/V4).
  - Magical atom + spellbook + pen (tests V5/V6).
  - Magical atom + typed bonus (Dark Enhancement +20% → tests V7/V8).
  - Antimagic post-cap layer — magical damage vs non-divine reduced by 0.80; vs divine unchanged (test V11).
  - True damage atom (Shadow Touch) — scaling 0 → flat 2 (test V2).
  - AoE atom → `hit.body` only, no head/limb.
  - `lifestealRatio: 1.0` atom → emits DerivedHealDescriptor with healType = family-collapsed (test V12).
  - `targetMaxHpRatio: 0.10` atom → emits DerivedHealDescriptor with healAmount = 10% × target.maxHealth.
  - `percentMaxHealth: 0.01` atom on self target → `derivedPercentMaxHealthDamage` = 1% × derivedStats.health.value.
- **Integration** (with Warlock): Warlock build with Spellbook + Dark Enhancement → BoD body = 33, head = 49 (tests V7/V8 verified at `damage_formulas.md:254–255`).

**Verified citations.** Tests V1–V11 (§11.4).

---

### 3.9 `projectHealing`

**Path.** `src/engine/projectHealing.js`

**Responsibility.** For each HEAL_ATOM in Stage 3 + each `DerivedHealDescriptor` from `projectDamage`: call `calcHealing` with appropriate parameters; produce `HealProjection`. Handle `isHot`, single-context `percentMaxHealth` on HEAL_ATOM. Per arch-doc §16.

**Public API.**

```ts
export function projectHealing(
  healAtoms: HealAtom[],
  derivedHealDescriptors: DerivedHealDescriptor[],
  derivedStats: DerivedStats,
  healingModFlat: number,              // pre-flattened bonuses.healingMod sum
  derivedBuffDuration: number,         // derivedStats.buffDuration.value
  ctx: Ctx
): HealProjection[]

HealProjection = {
  atomId:      string,                 // "<abilityId>:heal:0" for authored; damage atomId for derived
  source:      { kind, abilityId, className },
  healType:    "physical" | "magical",
  amount:      number,
  isHot?:      boolean,
  tickRate?:   number,
  duration?:   number,
  derivedFrom?: { kind: "lifesteal" | "targetMaxHp", damageAtomId: string },
}
```

**Inputs.** Stage 3 heal atoms + Stage 6 `derivedHealDescriptors` + Stage 5 `derivedStats` + healingMod + buffDuration + ctx.

**Outputs.** Combined list of authored and derived HealProjections.

**Dependencies.**
- Engine modules: none (damageTypeToHealType already applied in projectDamage).
- Engine constants: none (damage.js handles its own constants).
- Verified-math files: `src/engine/damage.js::calcHealing`.

**Purity.** `pure-with-constants-read`.

**Per-atom algorithm (authored HEAL_ATOM).**

```
for each healAtom:
  healingAdd = healAtom.healType === "magical"
    ? derivedStats.magicalHealing.value
    : derivedStats.physicalHealing.value
  mpb = healAtom.healType === "magical" ? derivedStats.mpb.value : 0

  amount = calcHealing({
    baseHeal:      healAtom.baseHeal,
    scaling:       healAtom.scaling,
    mpb,
    healingAdd,
    healingMod:    healingModFlat,
    isHoT:         !!healAtom.isHot,
    baseDuration:  healAtom.duration ?? 0,
    buffDuration:  derivedBuffDuration,
  })

  # Single-context percentMaxHealth (arch-doc §16.3).
  if healAtom.percentMaxHealth:
    amount = healAtom.percentMaxHealth × resolveHealTargetMaxHealth(healAtom.target, ctx, derivedStats)

  emit HealProjection with amount, isHot, tickRate, duration
```

**Per-descriptor algorithm (derived heal from projectDamage).**

```
for each descriptor:
  healingMod derivation:
    # Per healing_verification.md:18–21: Life Drain "Only HealingMod applies."
    # The descriptor.healAmount is already (ratio × pre-MDR damage) OR (ratio × target.maxHealth).
    # We route through calcHealing with baseHeal = healAmount, scaling = 0, mpb = 0 — preserving
    # the healingMod multiplier, bypassing MPB/scaling (already-computed amount).
  amount = calcHealing({
    baseHeal:     descriptor.healAmount,
    scaling:      0,
    mpb:          0,
    healingAdd:   0,
    healingMod:   healingModFlat,
    isHoT:        false,
    baseDuration: 0,
    buffDuration: 0,
  })

  emit HealProjection {
    atomId:      descriptor.damageAtomId,     # reuse damage atomId per arch-doc §16.2
    source:      <looked up from the source damage atom>,
    healType:    descriptor.healType,
    amount,
    derivedFrom: { kind: descriptor.kind, damageAtomId: descriptor.damageAtomId },
  }
```

**`resolveHealTargetMaxHealth` utility** (single-context, arch-doc §16.3):
- `target: "self"` → `derivedStats.health.value`.
- `target: "ally"`, `"self_or_ally"` → ally-proxy (same as projectDamage's self fallback for Phase 3).
- `target: "enemy"` — unusual for heals but possible via `target: "either"` — route to enemy max HP (`ctx.target.maxHealth`).

**Back-reference wire-up.** After projectHealing completes, `runSnapshot` walks the authored `DamageProjection[]` and for each damage atom with `lifestealRatio`/`targetMaxHpRatio`, attaches `derivedHeal = <matching HealProjection>` by `atomId`. This keeps projectDamage and projectHealing loosely coupled (projectHealing doesn't need to know the shape of DamageProjection's back-ref).

**Memoization checkpoint.**
- Cache key: Stage 3 heal atoms + derivedHealDescriptors + derivedStats + healingMod + buffDuration.
- Phase 6 recommendation: measure first.

**Budget share.** ~10% of 50 ms (quarter of Stage-6 share).

**Test approach.**
- **Unit fixtures** (`src/engine/projectHealing.test.js`):
  - Instant heal (Shadow Touch heal:87 — `baseHeal: 2, scaling: 0`) → amount = 2 regardless of MPB (test V13 analog).
  - HoT heal (Healing Potion) — verified 6 test points (test V13 per `healing_verification.md:59–64`).
  - `isHot: true` with `buffDuration: 0.23` → extension via `floor(20 × 1.23) = 24` ticks / 20 base.
  - Lifesteal descriptor → amount = descriptor.healAmount × (1 + healingMod).
  - Single-context `percentMaxHealth` on HEAL_ATOM → amount = 0.10 × derivedStats.health.value.
- **Integration** (with projectDamage + Warlock): Life Drain — lifesteal derivation from damage projection → heal amount = 1.0 × pre-MDR damage (test V12 per `unresolved_questions.md:270–278`).

**Verified citations.** Tests V12, V13 (§11.4).

---

### 3.10 `projectShield`

**Path.** `src/engine/projectShield.js`

**Responsibility.** For each SHIELD_ATOM in Stage 3: produce `ShieldProjection` with `absorbAmount = base + scaling × MPB`. Per arch-doc §17.

**Public API.**

```ts
export function projectShield(
  shieldAtoms: ShieldAtom[],
  derivedStats: DerivedStats
): ShieldProjection[]

ShieldProjection = {
  atomId:        string,
  source:        { kind, abilityId, className },
  damageFilter:  "physical" | "magical" | null,
  absorbAmount:  number,
  duration?:     number,
}
```

**Inputs.** Stage 3 shield atoms + derivedStats.

**Outputs.** ShieldProjection[].

**Dependencies.**
- Engine modules: none.
- Engine constants: none.
- Verified-math files: none (direct math).

**Purity.** `pure`.

**Per-atom algorithm.**

```
for each shieldAtom:
  mpb = derivedStats.mpb.value
  absorb = shieldAtom.base + shieldAtom.scaling × mpb
  emit ShieldProjection {
    atomId,
    source,
    damageFilter: shieldAtom.damageFilter ?? null,
    absorbAmount: absorb,
    duration:     shieldAtom.duration,
  }
```

**Memoization checkpoint.**
- Cache key: Stage 3 shield atoms + derivedStats.mpb.
- Phase 6 recommendation: skip. Module is tiny; memoization overhead likely exceeds savings.

**Budget share.** ~5% of 50 ms (small fraction of Stage-6 share).

**Test approach.**
- **Unit fixtures** (`src/engine/projectShield.test.js`):
  - Eldritch Shield — `base: 25, scaling: 0, damageFilter: "magical"` → absorb 25.
  - Scaling shield — `base: 0, scaling: 0.5, mpb: 0.23` → absorb 0.115 (or rounded per display rule — UI layer decides).
  - `damageFilter: null` → absorb-all.
- **Integration** (with Warlock): Eldritch Shield shield:608 → ShieldProjection{ absorbAmount: 25, damageFilter: "magical", duration: 15 }.

**Verified citations.** Shield math is mechanism-only; no in-game verification point yet.

---

### 3.11 `runSnapshot`

**Path.** `src/engine/runSnapshot.js`

**Responsibility.** Public entry point. Orchestrate Stages 0–6; run the second memory-budget pass using `derivedStats.memoryCapacity`; wire up derived-heal back-references on DamageProjections; assemble the `Snapshot` shape per arch-doc §4 + Phase 0 pin (`docs/performance-budget.md § 6.1`). Expose Query API companions per arch-doc §20.

**Public API.**

```ts
export function runSnapshot(build: Build): Snapshot
// Snapshot carries a non-enumerable `_internal` property holding the bundle below.
// The property is not part of the Phase-0-pinned Snapshot key surface; it is a
// hidden field for the query-API companions and introspection tooling.

// Query API companions (arch-doc §20). Free functions taking the Snapshot;
// each reads Snapshot._internal for the filtered atom lists + dropped atoms.
export function atomsByTarget(snapshot: Snapshot, target: EffectTarget): Atom[]
export function atomsBySourceAbility(snapshot: Snapshot, abilityId: string): AbilitySnapshotView
export function activeConditions(snapshot: Snapshot): Array<{atom, condition, evaluation}>
export function atomsByStat(snapshot: Snapshot, statId: StatId): StatEffectAtom[]
```

**`Snapshot._internal`** (hidden, non-enumerable) carries:
- `filteredAtoms`: the full Stage 2 output (effects / damage / heal / shield / grants / removes).
- `droppedAtoms`: atoms that failed Stage 2 with their evaluated condition + reason — needed for `activeConditions` introspection ("why isn't my perk firing?").
- `klass`: reference to `ctx.klass` for `atomsBySourceAbility`'s ability-shape lookup.

The property is defined via `Object.defineProperty(snapshot, '_internal', { value, enumerable: false })` so JSON serialization and user-visible iteration skip it. Four query functions are top-level named exports from `runSnapshot.js`; they read `snapshot._internal` and the public Snapshot fields.

**Orchestration.**

```
function runSnapshot(build):
  ctx = buildContext(build)
  atomsRaw = collectAtoms(ctx)
  atomsFiltered = filterByConditions(atomsRaw, ctx)
  atomsMaterialized = materializeStacking(atomsFiltered, ctx)

  { bonuses, perTypeBonuses, postCapMultiplicativeLayers, capOverrides } =
    aggregate(atomsMaterialized.effects, ctx.gear.bonuses, ctx)

  # capOverrides flows forward into ctx for deriveStats; also into the returned Snapshot.
  derivedStats = deriveStats(ctx.attributes, bonuses, capOverrides)

  # Second memory-budget pass: finalize using derivedStats.memoryCapacity.
  memoryBudget = finalizeMemoryBudget(ctx, derivedStats, build.selectedSpells)

  # Stage 6.
  { damageProjections, derivedHealDescriptors } =
    projectDamage(
      atomsMaterialized.damage,
      derivedStats,
      perTypeBonuses,
      postCapMultiplicativeLayers,
      ctx.target,
      ctx.gear.weapon,
      ctx
    )

  healProjections = projectHealing(
    atomsMaterialized.heal,
    derivedHealDescriptors,
    derivedStats,
    flattenHealingMod(bonuses),
    derivedStats.buffDuration.value,
    ctx
  )

  shieldProjections = projectShield(atomsMaterialized.shield, derivedStats)

  # Wire derived-heal back-refs on damage projections.
  wireDerivedHealBackRefs(damageProjections, healProjections)

  return {
    bonuses,
    derivedStats,
    damageProjections,
    healProjections,
    shieldProjections,
    perTypeBonuses,
    postCapMultiplicativeLayers,
    availableAbilityIds: ctx.availableAbilityIds,
    activeAbilityIds:    ctx.activeAbilityIds,
    viewingAfterEffect:  [...ctx.viewingAfterEffect],
    classResourceCounters: ctx.classResourceCounters,
    stackCounts:         ctx.stackCounts,
    memoryBudget,
    debug: <populated in dev mode>,
  }
```

**Second memory-budget pass.** Re-runs the sequential consumption from arch-doc §9 using the final `derivedStats.memoryCapacity.value`. If capacity grew vs Stage 0's preliminary value (e.g., user equipped a `+memorySlots` perk), previously locked-out spells may become active, and vice versa. The final `memoryBudget` replaces the preliminary one in the returned Snapshot.

**Inputs.** `Build`.

**Outputs.** `Snapshot` (arch-doc §4).

**Dependencies.**
- Engine modules: all 11 others.
- Engine constants: transitively via submodules.
- Verified-math files: transitively.

**Purity.** `pure-with-constants-read`. Aggregates Stage 0–6 outputs; no side effects.

**Memoization checkpoint.**
- Cache key: the whole `Build` object digest (top-level entry). This is a last-resort coarse cache; internal module-level caches (§3.1–§3.10) are the fine-grained layer and collectively cover the common invalidation cases.
- Phase 6 recommendation: **skip top-level cache.** Per-stage memoization at §3.2–§3.6 checkpoints provides the cache-hit coverage; a whole-`Build` top-level cache would duplicate the work of the per-stage caches without adding distinct hit cases.

**Budget share.** Overhead negligible (orchestration ≤ 0.1 ms).

**Test approach.**
- **Unit fixtures** (`src/engine/runSnapshot.test.js`):
  - Minimal build smoke test — all Snapshot keys present.
  - Derived-heal back-ref wiring — DamageProjection for Life Drain damage atom has `.derivedHeal` populated.
  - Memory-budget second pass — user adds a `+5 memorySlots` perk → a previously locked-out spell becomes active.
  - Query API — all four queries return non-null structure for max-loadout.
- **Integration** (end-to-end): max-loadout fixture → runSnapshot succeeds; `bench/snapshot.bench.js` → replaces `runSnapshotStub` import with `runSnapshot`; baseline measurement < 50 ms per `docs/performance-budget.md § 5`.

**Verified citations.** None at this level; downstream module tests cite.

---

### 3.12 `damageTypeToHealType`

**Path.** `src/engine/damageTypeToHealType.js`

**Responsibility.** Family-collapse of damage type to heal type per arch-doc §16.2 + `docs/vocabulary.md § 3.2`. Used by `projectDamage` when emitting derived-heal descriptors.

**Public API.**

```ts
export function damageTypeToHealType(damageType: DamageType): "physical" | "magical"
```

**Rule.** `physical → "physical"`; any other damage type → `"magical"` (all 12 magical subtypes collapse per the family-collapse table).

**Inputs.** Damage type string.

**Outputs.** Heal type string.

**Dependencies.**
- Engine modules: none.
- Engine constants: `DAMAGE_TYPES` (for assertion in dev mode).
- Verified-math files: none.

**Purity.** `pure`.

**Memoization checkpoint.** None. Trivial function.

**Budget share.** Negligible.

**Test approach.**
- **Unit fixture** (`src/engine/damageTypeToHealType.test.js`):
  - Each of the 13 `DAMAGE_TYPES` → correct healType (1 physical + 12 magical).
  - Unknown damage type: throw a descriptive error. Validator (`D.damageType` rule) guarantees all authored damage types are in `DAMAGE_TYPES`; an unknown value at runtime is an engine bug, not a data issue — fail loudly rather than fall back silently.

**Verified citations.** None (no in-game math; data-shape utility).

---

## 4. Pipeline orchestration

Stages run in strict order. `runSnapshot` (§3.11) is the only public entry point.

```
Build
  ↓  buildContext (§3.1)
ctx (read-only)
  ↓  collectAtoms (§3.2)         ← ctx.activeAbilityIds, ctx.viewingAfterEffect
CollectedAtoms (with atomId + source)
  ↓  filterByConditions (§3.3)    ← conditions (§3.4), ctx
FilteredAtoms
  ↓  materializeStacking (§3.5)   ← ctx.stackCounts, ctx.classResourceCounters, ctx.hpFraction, ctx.attributes
MaterializedAtoms (with materializedValue / stackMultiplier / scalesWith values)
  ↓  aggregate (§3.6)             ← ctx.gear.bonuses
{bonuses, perTypeBonuses, postCapMultiplicativeLayers, capOverrides}
  ↓  deriveStats (§3.7)            ← ctx.attributes, ctx.capOverrides ⋃ capOverrides
derivedStats
  ↓  finalizeMemoryBudget          ← derivedStats.memoryCapacity
memoryBudget (final)
  ↓  projectDamage (§3.8) ─────┐
  ↓  projectHealing (§3.9)     │  ← derivedHealDescriptors from projectDamage
  ↓  projectShield (§3.10)     │
damageProjections, healProjections, shieldProjections
  ↓  wireDerivedHealBackRefs
Snapshot (assembled, returned)
```

Stage ordering is tight: Stage 5 produces `derivedStats.memoryCapacity`, which enables the second memory-budget pass; Stages 6a/b/c run after Stage 5 and consume `derivedStats` directly. The derived-heal wire-up is a post-Stage-6 fixup pass (damage projections get back-references to the matching heal projections).

---

## 5. Stage transition contracts

Invariants that hold between Stage N output and Stage N+1 input. Implementations assert these in dev mode; production skips for perf.

| Transition | Input invariant | Output invariant |
|---|---|---|
| Build → 0 | `Build` fully populated; top-level keys per `bench/fixtures/max-loadout.fixture.js:506` | `ctx` read-only reference; every atom reference still points to authored class data |
| 0 → 1 | `ctx.activeAbilityIds` is a subset of `ctx.availableAbilityIds`; `ctx.activeAbilityIds` ⊇ all active buffs + passives selected | Every collected atom has `source: {kind, abilityId, className}` and `atomId: "<abilityId>:<container>:<index>"` populated; NO atom is missing these |
| 1 → 2 | Atoms carry `source`/`atomId`; `heal`/`shield` lists are length-0 or length-1 (singular authored containers) | Filtered atoms are a subset of input atoms (no new atoms); atoms with `damage_type`-carrying conditions preserved regardless of ctx state |
| 2 → 3 | No false-condition atoms remain (except `damage_type` deferrals) | Every effect atom has `materializedValue` field (original `value` preserved); every damage atom has `stackMultiplier` field (original `base`/`scaling` preserved); `scalesWith` applied |
| 3 → 4 | Atoms have materialized values ready for consumption | `bonuses[stat][phase]` is per-stat-per-phase additive sum; `perTypeBonuses[damageType]` is per-damage-type additive sum; `postCapMultiplicativeLayers[]` preserves each layer's condition; `capOverrides[recipeId]` is assignment-wins (last write) |
| 4 → 5 | `bonuses` well-formed (all phases in `EFFECT_PHASES` or synthetic "gear"); `damage_type`-conditioned atoms ONLY in `postCapMultiplicativeLayers` (invariant per §3.6 rule 5) | `derivedStats` has entries for all 22 `DERIVED_STAT_RECIPES` IDs; every entry shape `{value, rawValue?, cap?}` |
| 5 → 6 | `derivedStats` complete; `memoryCapacity` finalized | `DamageProjection[]`, `HealProjection[]`, `ShieldProjection[]` per pinned shapes (arch-doc §4); derived-heal descriptors emitted by projectDamage match authored heal atoms by `atomId` at wire-up |
| 6 → Snapshot assembly | Projection lists complete | `Snapshot` conforms to the arch-doc §4 shape; no missing keys; Phase-0-pinned keys present + Phase-3 additions present |

---

## 6. Stage 0 detail

Four sub-behaviors ride inside Stage 0 (`buildContext`). Each is specified here because the algorithms are non-trivial and test plans depend on precise behavior.

### 6.1 Availability resolver (arch-doc §8)

```
selected = union(ctx.selectedPerks, ctx.selectedSkills, ctx.selectedSpells)
active   = { ability ∈ selected : ability.activation === "passive"
             OR (ability.activation ∈ ["cast_buff", "toggle"] AND ability.id ∈ ctx.activeBuffs) }

available = copy(selected)
iterate:
  changed = false
  for ability in active:
    for grant in (ability.grants ?? []):
      if grant.type === "ability"
         AND evaluateCondition(grant.condition, ctx, abilityShape(ability))
         AND grant.abilityId ∉ available:
        available.add(grant.abilityId)
        changed = true
  for ability in active:
    for remove in (ability.removes ?? []):
      if remove.type === "ability"
         AND evaluateCondition(remove.condition, ctx, abilityShape(ability)):
        for target_id in (available filtered by remove.abilityType + remove.tags):
          available.delete(target_id)
          changed = true
  if not changed: break
  if iterations > 3: break (cycle guard — see §6.2)

available = available.filter(ability => evaluateCondition(ability.condition, ctx, abilityShape(ability)))
```

Output: `ctx.availableAbilityIds = sorted(available)`, `ctx.activeAbilityIds = sorted(active ∩ available)`, `ctx.lockedAbilityIds = sorted(selected \ available)` (selected but removed, or availability-condition-gated out).

`grant.abilityId` reference resolution: look up the ability in `ctx.klass` (any of perks/skills/spells/mergedSpells); if not found, the grant is invalid authoring — surface via `ctx.debug.unresolvedGrants[]`, skip.

### 6.2 Grants-chain cycle detection (arch-doc §8 depth-3 limit)

Rule: resolver iterates to fixpoint, capped at depth 3. On iteration 4 without reaching fixpoint, stop + drop unresolved changes + emit warning.

```
visited = new Set()                        # abilityIds visited during grants traversal
iterations = 0
while changed and iterations < 3:
  changed = false
  iterations++
  for ability in active:
    if ability.id ∈ visited: continue      # per-traversal visited set — stops re-expansion of same node
    visited.add(ability.id)
    # ... grants/removes walk as in 6.1 ...
    if changed: continue
if iterations === 3 and changed_at_last_iteration:
  ctx.debug.grantsCycleDropped = true
  # Keep the state as it was at iteration 3; do not apply further.
```

Note: the per-traversal visited set prevents a single ability's grants from being re-walked within one pass; the 3-iteration cap prevents pathological chains that keep adding new abilities. Together they ensure termination without needing full cycle-detection graph walks.

Warlock does not exercise chained grants (Blood Pact grants are depth-1: grant `bolt_of_darkness`, `exploitation_strike`, `exit_demon_form` — none of these grant anything further). Forward-spec: Druid Orb of Nature grants Nature's Touch → Nature's Touch has no further grants → depth 1 still.

### 6.3 Memory-budget two-pass (arch-doc §9)

```
# Pass 1 — preliminary. Runs inside buildContext.
prelimCapacity = evaluateCurve(STAT_CURVES.memoryCapacity, ctx.attributes.kno)
# Per STAT_EFFECT_ATOM with stat: "memorySlots" + abilityType: "spell" | "transformation" | "music",
# sum per pool. Route each pool separately.
preliminaryBudgetPerPool = { spell: prelimCapacity, transformation: prelimCapacity, music: prelimCapacity }
# Rule (committed): the KNO-curve capacity is the INDEPENDENT starting capacity for each pool.
# `memorySlots` atoms add ONLY to the pool named by the atom's `abilityType` discriminator —
# per-pool additive, never cross-pool. Warlock anchor: Spell Memory I/II (warlock.new.js:233, :244)
# carry `abilityType: "spell"` → boost the spell pool only. A `memorySlots` atom authored WITHOUT
# an `abilityType` discriminator is an authoring error — Phase 6 adds a validator rule
# (C.memorySlots_abilityType_required) to catch this at authoring time.

for each abilityId in ctx.selectedPerks ∪ ctx.selectedSkills:
  # Perks and skills can carry memorySlots atoms with an abilityType discriminator.
  if ability has effect with stat: "memorySlots" and abilityType X:
    preliminaryBudgetPerPool[X] += effect.value
# Note: memory-boosting effects typically have activation: "passive", so they contribute
# at Stage 0. Effects gated on effect_active need the ability active — preliminary pass
# reads activeBuffs for abilities that gate memory on buff state.

# Consume by pool.
memoryBudget = { spell: {used: 0, capacity: preliminaryBudgetPerPool.spell, lockedOut: []}, ... }
for id in ctx.selectedSpells:
  ability = lookup(id)
  pool = ability.type  # "spell" | "transformation" | "music"
  if memoryBudget[pool].used + ability.memoryCost <= memoryBudget[pool].capacity:
    memoryBudget[pool].used += ability.memoryCost
  else:
    memoryBudget[pool].lockedOut.push(id)

ctx.memoryBudget = memoryBudget  # preliminary
```

Pass 2 runs in `runSnapshot` after Stage 5 emits final `derivedStats.memoryCapacity`. If the final capacity differs from `preliminaryBudgetPerPool`, the consumption loop re-runs with the new capacity; `memoryBudget.lockedOut[]` updates.

Consumption order: the order of `ctx.selectedSpells`. UI preserves user's chosen ordering.

Warlock anchor: Spell Memory I/II at `warlock.new.js:233, :244` each add `+5` slots via `{stat: "memorySlots", value: 5, phase: "post_curve", abilityType: "spell"}`. Both are passive — they contribute to pass 1.

### 6.4 Weapon-state derivation

`ctx.weaponType` is the specific weapon-kind string from `ctx.gear.weapon.weaponType` (e.g., `"axe"`, `"bow"`, `"staff"`). For virtual-category resolution used by `weapon_type` condition (arch-doc §11), Stage 0 precomputes booleans:

```
ctx.isRanged     = ctx.weaponType ∈ WEAPON_TYPE_CATEGORIES.ranged    # = ["bow", "crossbow"]
ctx.isTwoHanded  = gear.weapon.handed === "two_handed"
ctx.isOneHanded  = gear.weapon.handed === "one_handed"
ctx.isUnarmed    = gear.weapon === null or gear.weapon.weaponType === "unarmed"
ctx.isInstrument = gear.weapon?.tags?.includes("instrument") ?? false
ctx.isDualWielding = gear.offhand?.weaponType != null
```

The `weapon_type` evaluator in `conditions.js` dispatches: specific kind → `ctx.weaponType === cond.weaponType`; virtual → matching precomputed boolean.

Warlock anchor for virtual: `blood_pact.grants[0].condition` (`warlock.new.js:281`) and `exploitation_strike.damage[0].condition` (`warlock.new.js:381`) both use `weapon_type: "unarmed"` — evaluated via `ctx.isUnarmed`.

---

## 7. Stage 2 cache-key layout (engine open Q2 resolution)

**Decision (LOCK F binding): fine-grained dependency-declared.** Engine architecture open question 2 from `docs/class-shape-progress.md § Engine architecture open questions` closes in this phase.

**Cache key for Stage 2 (`filterByConditions`).**

```
stage2Key = hash([
  stage1Key,                       // activeAbilityIds + viewingAfterEffect + classId
  ctx.selectedPerks,
  ctx.selectedSkills,
  ctx.selectedSpells,
  ctx.activeBuffs,
  ctx.activeForm,
  ctx.weaponType,
  ctx.isRanged, ctx.isTwoHanded, ctx.isOneHanded,
  ctx.isUnarmed, ctx.isInstrument, ctx.isDualWielding,
  ctx.playerStates,
  ctx.equipment,
  ctx.target.creatureType,
  ctx.environment,
  ctx.selectedTiers,
  ctx.hpFraction,
])
```

**Deliberately excluded from the key** (these fields are read by later stages, not Stage 2):

- `ctx.attributes` — Stage 5 input
- `ctx.stackCounts` — Stage 3
- `ctx.classResourceCounters` — Stage 3
- `ctx.capOverrides` — Stage 5
- `ctx.target.pdr / mdr / headshotDR / maxHealth` — Stage 6
- `ctx.gear.bonuses` (except insofar as they feed `ctx.weaponType` / `ctx.isX` booleans already in key) — Stages 4/5/6
- `ctx.viewingAfterEffect` — already in Stage 1 key

**Rationale.** The user's most frequent action in the UI is gear editing (attribute sliders, gear-stat toggles). Coarse whole-ctx key would invalidate Stage 2 on every gear tweak — cascading through Stages 3→4→5→6 every time. Stage 2 is 25% of budget; preserving its cache across gear changes is the single highest-leverage memoization point.

**Cost.** The key is ≤ 20 declared fields; hash computation is O(|ctx fields|) ≈ trivial. Compared to Stage 2's per-atom condition-tree walk (O(|atoms| × |condition depth|) ≈ 100s of operations), hash cost is < 1% of stage work.

**Stage 3+ cache keys follow the same pattern.** Each stage declares its ctx dependency set; the cache key is a rollup of (previous stage's key) + (this stage's declared ctx fields). Phase 6 implements the hashing helper once.

**Extension policy.** Adding a new `CONDITION_TYPES` variant requires:
1. Editing the Set in `src/data/constants.js`.
2. Adding an evaluator to `src/engine/conditions.js::CONDITION_EVALUATORS`.
3. **Updating Stage 2's declared dependency set in this §7 key list + in `src/engine/filterByConditions.js`.** If the new variant reads a ctx field not already in the key, the key is stale and the cache produces false-positive hits.

Phase 10 class-migration sessions that introduce new conditions must enforce step 3 as part of their session prompt guardrails.

---

## 8. Stage 1 afterEffect short-circuit

Per arch-doc §14 (LOCK 5) and LOCK E (Phase 5 prompt):

**Rule.** When `abilityId ∈ ctx.viewingAfterEffect`, the ability's `afterEffect.effects[]` atoms are emitted from Stage 1 **in place of** the ability's `effects`/`damage`/`heal`/`shield` atoms. The parent ability's main-state atoms never enter Stages 2–6 for this snapshot.

**Implementation.** In `collectAtoms`:

```
for abilityId in ctx.activeAbilityIds:
  ability = lookupAbility(abilityId)

  if ctx.viewingAfterEffect.has(abilityId):
    # Short-circuit: emit only afterEffect.effects.
    walk(ability.afterEffect?.effects ?? [], container: "afterEffect.effects")
    # SKIP: ability.effects, ability.damage, ability.heal, ability.shield
    # grants[] and removes[] continue to flow (see drop-set decision below).
    walk(ability.grants ?? [], container: "grants")
    walk(ability.removes ?? [], container: "removes")

  else:
    # Normal path.
    walk(ability.effects ?? [], container: "effects")
    walk(ability.damage ?? [], container: "damage")
    walk(ability.heal ?? [], container: "heal")      # singular → 1 entry if present
    walk(ability.shield ?? [], container: "shield")  # singular → 1 entry if present
    walk(ability.grants ?? [], container: "grants")
    walk(ability.removes ?? [], container: "removes")
    # SKIP: ability.afterEffect.effects (not in this state)
```

**Drop set (per Plan Report Decision 7 — approved).** The short-circuit drops `effects`, `damage`, `heal`, `shield` from the parent ability. `grants[]` and `removes[]` continue to flow on both paths — they represent availability facts independent of which state (main vs post-effect) the ability is in.

**Rationale.** The Stage 1 short-circuit is the structural right place for this decision. If Stage 2 filtered these atoms later, they would consume Stage 2 budget only to be dropped. A structural Stage 1 short-circuit also makes the "mutually exclusive state" invariant explicit: the engine never processes an ability's main-state atoms and its afterEffect atoms in the same snapshot.

**Cancellation semantics (arch-doc §14).** Cancellation of an afterEffect (e.g., Adrenaline Rush canceled by Second Wind) is expressed per-atom via `not → effect_active` on each afterEffect atom, not via the Stage 1 short-circuit. The short-circuit decides "which state" (main vs afterEffect); cancellation conditions decide "which afterEffect atoms apply within that state."

**Phase 6 follow-up (coordinator addition to the plan).** A validator rule prevents an authoring error where an author places `grants[]` or `removes[]` inside an `afterEffect` wrapper — which the Stage 1 short-circuit currently treats as data that doesn't exist (dropping `afterEffect.grants`/`afterEffect.removes` silently). The validator rule code is `K.afterEffect_forbidden` (or similar) and lives in the Phase 6 prompt's scope. Until the validator rule lands, the engine behavior is: afterEffect containers other than `effects` are not walked; any such fields produce no engine effect. This is Phase 5's commitment-of-record; the Completion Report carries the follow-up for Phase 6 routing.

Warlock anchor: `eldritch_shield.afterEffect:609–617` — 2 atoms (`darkDamageBonus: 0.30` type_damage_bonus, `spellCastingSpeed: 0.50` post_curve). With `ctx.viewingAfterEffect ∋ "eldritch_shield"`: Eldritch Shield's `shield` atom dropped; `afterEffect.effects[0..1]` included. With empty set: `shield` atom included; afterEffect atoms dropped.

---

## 9. Stage 6 derivation rules

Three damage-atom-adjacent rules produce derived heals or damage numbers. Rule ownership and execution order:

### 9.1 `lifestealRatio` on DAMAGE_ATOM (arch-doc §16.2)

**Module.** `projectDamage` emits descriptor; `projectHealing` consumes.

**Rule.** `heal_amount = lifestealRatio × pre_MDR_damage`. Per `docs/healing_verification.md:18–21`: lifesteal uses **pre-MDR** outgoing damage ("Outgoing Damage Before Reductions × (1 + HealingMod)"). The engine's `src/engine/damage.js::calcSpellDamage` returns post-MDR damage, so projectDamage computes the pre-MDR number explicitly and threads it into the descriptor. Concretely: for each magical damage atom with `lifestealRatio`, projectDamage derives `pre_mdr_body = floor((base + weaponMagicalDamage) × (1 + mpb × scaling + typeBonuses) × hit_location_multiplier)` — i.e., the `calcSpellDamage` formula up to but excluding the MDR clamp. `descriptor.healAmount = lifestealRatio × pre_mdr_body`. Physical-damage lifesteal (if a future class authors one) similarly computes the pre-PDR number. Verification: `docs/unresolved_questions.md:270–278` — Life Drain heals 100% of pre-MDR damage, back-solved via `floor(7 × 0.925) = 6`. Phase 8 re-verifies at higher MPB.

**HealType derivation.** `damageTypeToHealType(damageType)` — `evil_magical → "magical"`.

**AtomId.** Derived heal reuses the source damage atom's `atomId`; `derivedFrom.kind: "lifesteal"`.

**Stacking / DoT.** For DoT atoms (Life Drain `isDot: true, tickRate: 1`), the descriptor produces one derived heal per tick equivalent — but projectDamage emits one `DamageProjection` with `isDot`/`tickRate` fields, and projectHealing emits one derived-heal HealProjection matching. Display at UI composes the per-tick view.

Warlock anchor: `life_drain.damage[0]:575` — `lifestealRatio: 1.0`.

### 9.2 `targetMaxHpRatio` on DAMAGE_ATOM (arch-doc §16.4)

**Module.** `projectDamage` emits descriptor; `projectHealing` consumes. Symmetric with §9.1.

**Rule.** `heal_amount = targetMaxHpRatio × damage_atom_target's max HP`. Target resolution per `resolveTargetMaxHealth(damageAtom.target, ctx, derivedStats)`.

**HealType derivation.** `damageTypeToHealType(damageType)`.

**AtomId.** Source damage atom's `atomId`; `derivedFrom.kind: "targetMaxHp"`.

Warlock anchor: `exploitation_strike.damage[0]:377` — `targetMaxHpRatio: 0.10`, damageType `evil_magical` → derived heal is `magical`.

No in-game verification point yet for targetMaxHpRatio (Phase 8 verification target — carried to Completion Report Findings).

### 9.3 HEAL_ATOM `percentMaxHealth` (arch-doc §16.3)

**Module.** `projectHealing`.

**Rule.** Single-context: `heal_amount = atom.percentMaxHealth × resolveHealTargetMaxHealth(atom.target)`.
- `target: "self"` → `derivedStats.health.value`
- `target: "enemy"` (unusual) → `ctx.target.maxHealth`
- `target: "ally"` / `"self_or_ally"` → ally-proxy = caster health (Phase 3 display-only)

Forward-spec only; no Warlock HEAL_ATOM uses `percentMaxHealth`. Cleric `Lesser Heal` pattern in future might.

### 9.4 `damageTypeToHealType` utility (arch-doc §16.2 table, `docs/vocabulary.md § 3.2`)

Tiny module per §3.12. Called from `projectDamage` when emitting derived-heal descriptors. `projectHealing` does not call this — it forwards the pre-collapsed `healType`.

### 9.5 Module execution order inside Stage 6

```
1. projectDamage runs first. Emits:
   - damageProjections[] with hit (body/head/limb), percentMaxHealth damage, count
   - derivedHealDescriptors[] (for atoms with lifestealRatio or targetMaxHpRatio)

2. projectHealing runs second. Consumes:
   - authored heal atoms from Stage 3
   - derivedHealDescriptors[] from projectDamage
   Emits:
   - healProjections[] (authored + derived, union)

3. projectShield runs independently (no Stage 6 dependencies).

4. runSnapshot's wireDerivedHealBackRefs pass walks damageProjections; for each
   damage atom with derivedHealDescriptor, finds the matching HealProjection by
   atomId + derivedFrom and attaches:
     damageProjection.derivedHeal = <matching HealProjection>
```

This ordering keeps `projectDamage` as the source of truth for damage math (including the pre-MDR value needed for lifesteal); `projectHealing` stays ignorant of damage formula internals.

---

## 10. Performance budget split

Phase 0 baseline (`docs/performance-budget.md § 5`) was PARTIAL — Stages 5 + 6 against stubbed 0–4. Phase 5's budget split is an estimate grounded in: (a) algorithmic work per stage, (b) atom counts in max-loadout fixture (~50 effect atoms, ~15 damage atoms, ~3 heal atoms, ~1 shield atom), (c) arch-doc §11/§15 dispatcher complexity. Phase 6 measurement refines.

| Stage | Module(s) | % of 50 ms | Budget (ms) | Rationale |
|---|---|---|---|---|
| 0 | buildContext | 5% | 2.5 | Linear scans over bounded perks/skills/spells; availability fixpoint ≤ 3 iterations; memory-budget preliminary pass is O(|selectedSpells|). |
| 1 | collectAtoms | 5% | 2.5 | Linear atom walk; string construction for `atomId`; shallow clone per atom. |
| 2 | filterByConditions | 25% | 12.5 | Per-atom condition-tree walk; max-loadout has ~50 atoms × avg 1–3 condition nodes; dispatch-table lookup per node; second-heaviest stage. |
| 3 | materializeStacking | 5% | 2.5 | One multiply + one stack-count lookup per atom; `scalesWith` dispatch occasional; `evaluateCurve` call rare (only `scalesWith: attribute`). |
| 4 | aggregate | 10% | 5.0 | Hash-map routing per atom; typed-stat-to-damage-type table lookup constant-time; post-cap layer append O(1) per atom; gear bonuses folded once. |
| 5 | deriveStats | 10% | 5.0 | 22 recipes; phase-flattening adapter per stat; attribute-multiplier application pre-recipe; 17 `evaluateCurve` calls within recipes. |
| 6 | projectDamage + projectHealing + projectShield | 40% | 20.0 | Heaviest stage: ~15 damage atoms × 3 hit locations × `calcSpellDamage`/`calcPhysicalMeleeDamage` call; per-projection `postCapMultiplicativeLayers` condition re-eval; derived-heal descriptor emission; authored heal projections via `calcHealing`; shield projections (small). |

Sub-split inside Stage 6: `projectDamage` ≈ 25% (12.5 ms), `projectHealing` ≈ 10% (5.0 ms), `projectShield` ≈ 5% (2.5 ms). Budget pressure is concentrated in damage projection because it fires the most function calls (3 hit locations × 15 atoms = 45) and runs condition re-eval per projection for post-cap layers.

**Heavy stages for Phase 6 measurement focus:**
1. Stage 6 projectDamage (40% of whole budget; 50% of Stage 6).
2. Stage 2 filterByConditions (25%).

**Light stages** (cumulative 30%) likely under budget even naively implemented:
- Stage 0 / 1 / 3 at 5% each.

Phase 6 runs `bench/snapshot.bench.js` against real `runSnapshot` (deleting `bench/stub-pipeline.js` per `docs/performance-budget.md § 5`) and measures. Expect initial overshoot on Stage 2 or Stage 6; memoization at those stage boundaries is the primary remediation path.

---

## 11. Test plan summary

Three layers per arch-doc + perspective.md. Every test plan in §3 references this section's taxonomy.

### 11.1 Per-module unit fixtures

Each module's unit tests live in `src/engine/<module>.test.js`. Fixtures are minimal — exercising the module's contract in isolation against synthetic class data:

| Module | Fixture file | Coverage targets |
|---|---|---|
| buildContext | `src/engine/buildContext.test.js` | attribute summation, weapon-state virtual categories, availability resolver fixpoint, grants cycle rejection, memory-budget preliminary per-pool |
| collectAtoms | `src/engine/collectAtoms.test.js` | atomId format; source field populated; afterEffect short-circuit (ON/OFF) per LOCK E |
| filterByConditions | `src/engine/filterByConditions.test.js` | 13 condition variants (included/excluded each = 26+ cases); compound all/any/not; `damage_type` pass-through |
| conditions | `src/engine/conditions.test.js` | Dispatch-table per-variant truth tables; `effect_active` activation dispatch (4 sub-cases per arch-doc §11); virtual `weapon_type` resolution; `damage_type` evaluator against damageType arg |
| materializeStacking | `src/engine/materializeStacking.test.js` | `maxStacks` capped/uncapped, `resource` counter absent, `scalesWith: hp_missing` linear + cap, `scalesWith: attribute` curve lookup |
| aggregate | `src/engine/aggregate.test.js` | 9-phase routing, typed-stat-to-perTypeBonuses mapping (11 typed stats), `post_cap_multiplicative_layer` condition preservation, `cap_override` routing, gear phase fold, `target: "either"` dual-route |
| deriveStats | `src/engine/deriveStats.test.js` | Phase-flattening; attribute-multiplier pre-recipe application; `type_damage_bonus` / `post_cap_multiplicative_layer` excluded from bonusesFlat |
| projectDamage | `src/engine/projectDamage.test.js` | Physical + magical dispatch; hit-location math; typed bonuses; post-cap layer; true damage; AoE/DoT body-only; `lifestealRatio` descriptor emission; `targetMaxHpRatio` descriptor emission; `percentMaxHealth` damage |
| projectHealing | `src/engine/projectHealing.test.js` | Instant heal; HoT buff-duration extension; lifesteal descriptor consumption; targetMaxHp descriptor consumption; single-context `percentMaxHealth` on HEAL_ATOM |
| projectShield | `src/engine/projectShield.test.js` | base+scaling×MPB; damageFilter propagation; scaling 0 passthrough |
| runSnapshot | `src/engine/runSnapshot.test.js` | Full-pipeline smoke; derived-heal back-ref wiring; memory-budget second pass; query API (atomsByTarget, atomsBySourceAbility, activeConditions, atomsByStat) |
| damageTypeToHealType | `src/engine/damageTypeToHealType.test.js` | 13 damage types → heal type (1 physical + 12 magical) |

### 11.2 Integration fixtures (Warlock anchors)

New fixtures under `bench/fixtures/warlock-*.fixture.js` — real Warlock class + scoped build for integration testing.

| Fixture | Test target | Warlock anchor |
|---|---|---|
| `warlock-bolt-of-darkness.fixture.js` | Bolt of Darkness + Dark Enhancement toggled; bare hands vs spellbook | `bolt_of_darkness:460` + `dark_enhancement.effects[0]:135` |
| `warlock-blood-pact.fixture.js` | Blood Pact active + locked shards counter + granted abilities | `blood_pact:269–317` |
| `warlock-life-drain.fixture.js` | Life Drain lifesteal derivation (test V12) | `life_drain.damage[0]:575` |
| `warlock-exploitation-strike.fixture.js` | targetMaxHpRatio derivation + compound condition + granted-by-blood-pact | `exploitation_strike.damage[0]:377` |
| `warlock-antimagic.fixture.js` | `post_cap_multiplicative_layer` + `not → damage_type: divine_magical` | `antimagic.effects[0]:121–124` |
| `warlock-eldritch-shield.fixture.js` | afterEffect short-circuit (viewingAfterEffect toggle) | `eldritch_shield.afterEffect:609–617` |

Each fixture exports a Build that `runSnapshot` consumes; expected-output test assertions are written against verified-source citations in §11.4.

### 11.3 End-to-end fixtures

| Fixture | Purpose |
|---|---|
| `bench/fixtures/max-loadout.fixture.js` | Phase 0 anchor; exercises every atom shape at Warlock-scale density |
| `warlock.new.js` (real class) | Full Warlock build via `runSnapshot`; all per-ability projections must match verified data |

Phase 6 rewrites `bench/snapshot.bench.js` to import `runSnapshot` directly (replacing `runSnapshotStub`) per `docs/performance-budget.md § 5`. New benches: Warlock end-to-end; Warlock damage-only; Warlock heal-only. Scaling signal: compare max-loadout vs Warlock (synthetic vs real).

### 11.4 Verified-source assertion inventory

Every projection-correctness assertion in the test plan cites a verified source by line number. Per LOCK H. Phase 6 implementation writes the tests; Phase 5 inventories them.

| # | Assertion | Source line citation |
|---|---|---|
| V1 | Physical melee 6 test points (Spectral Blade + Warlock build, body/head + hit 1/2/3 + no-BSB + BSB + Shadow Touch dark) | `docs/damage_formulas.md:234–240` |
| V2 | Shadow Touch: 2 flat dark-magical true damage (scaling 0, unchanged across combo hits) | `docs/damage_formulas.md:149–153, :240` |
| V3 | BoD body bare hands: `floor(20 × 1.23 × 0.925) = 22` | `docs/damage_formulas.md:250` |
| V4 | BoD head bare hands: `floor(20 × 1.23 × 1.5 × 0.925) = 34` | `docs/damage_formulas.md:251` |
| V5 | BoD body spellbook (+5 mag dmg, 5% pen): `floor(25 × 1.23 × 0.92875) = 28` | `docs/damage_formulas.md:252` |
| V6 | BoD head spellbook: `floor(25 × 1.23 × 1.5 × 0.92875) = 42` | `docs/damage_formulas.md:253` |
| V7 | BoD + Dark Enhancement body: `floor(25 × 1.43 × 0.92875) = 33` | `docs/damage_formulas.md:254` |
| V8 | BoD + Dark Enhancement head: `floor(25 × 1.43 × 1.5 × 0.92875) = 49` | `docs/damage_formulas.md:255` |
| V9 | BoC body bare hands: `floor(12 × 1.23 × 0.925) = 13` | `docs/damage_formulas.md:248` |
| V10 | BoC head bare hands: `floor(12 × 1.23 × 1.5 × 0.925) = 20` | `docs/damage_formulas.md:249` |
| V11 | Antimagic 0.80 multiplier post-MDR cap; 1.0 vs divine | `docs/damage_formulas.md:180–188` |
| V12 | Life Drain: 100% lifesteal of pre-MDR damage → routed through calcHealing with healingMod multiplier; magical healType (family-collapsed from evil_magical) | `docs/unresolved_questions.md:270–278`; `docs/healing_verification.md:18–21` |
| V13 | Healing 6 test points (Poor Healing Potion HoT) | `docs/healing_verification.md:59–64` |
| V14 | PDR cap 65% / Defense Mastery raises to 75% (cap_override route) | `docs/season8_constants.md:11`; `docs/damage_formulas.md:56–58` |
| V15 | MDR cap 65% / Iron Will raises to 75% (cap_override route) | `docs/season8_constants.md:12`; `docs/damage_formulas.md:56–58` |
| V16 | Headshot multiplier: 1.0 + 0.5 + HSbonus − HSDR | `docs/season8_constants.md:22`; `docs/damage_formulas.md:37–43` |
| V17 | Limb multiplier 0.5 | `docs/season8_constants.md:23`; `docs/damage_formulas.md:37–43` |
| V18 | Warlock baseline HP: baseHealth 122 with HR 13.25, conditional ceil rounding + patch 10 bonus | `docs/season8_constants.md:46`; `src/data/classes/warlock.new.js:15–17` |

Additional mechanism-only assertions (no verified in-game number, arch-doc spec):
- M1: `targetMaxHpRatio: 0.10` derives heal = 10% × target.maxHealth; healType = family-collapsed (Phase 8 verification target — see Completion Report Findings).
- M2: Shield `absorb = base + scaling × MPB`.
- M3: Family-collapse: physical → "physical"; any magical subtype → "magical".
- M4: AfterEffect short-circuit drops parent's main-state atoms.
- M5: Memory-budget consumption order preserves `selectedSpells` array order.

Phase 6 writes unit + integration tests for both the V-series (verified) and M-series (mechanism-only) assertions.

---

## 12. Forward-spec patterns

Patterns Warlock does not exercise but the engine must support. Each is specified in its home section of this plan + in arch-doc. This table is a surface so Phase 6 / Phase 10 don't paint into a corner with Warlock-only assumptions.

| Pattern | Plan section | Participating module | First anticipated consumer |
|---|---|---|---|
| Druid form mutual exclusion (singleton `ctx.activeForm`) | §6.1 availability, §7 cache key | buildContext | Druid |
| `transformation` memory pool discriminator | §6.3 memory-budget two-pass | buildContext | Druid |
| Bard music memory pool (`abilityType: "music"`) | §6.3 | buildContext | Bard |
| Sorcerer `mergedSpells` (auto-derived, `condition: ability_selected`) | §6.1 availability | buildContext | Sorcerer |
| `tier` condition variant | §3.4 conditions | conditions | Bard |
| `equipment` condition variant | §3.4 | conditions | Ranger, Rogue |
| `environment` condition variant | §3.4 | conditions | Druid, Ranger |
| Un-exercised player states (`hiding`, `bow_drawn`, `playing_music`, `drunk`, `defensive_stance`, `behind_target`, `frenzy`, `casting`, `reloading`, `dual_casting`, `in_combat`) | §3.4 (dispatcher) + `docs/vocabulary.md § 8` | conditions | Rogue (hiding), Ranger (bow_drawn), Bard (playing_music), Fighter (defensive_stance), Barbarian (frenzy) |
| Un-exercised weapon types (bow, crossbow, blunt, rapier, spear, shield, spellbook, firearm, instrument; virtual `two_handed`/`one_handed`/`dual_wield`) | §6.4 weapon-state + §3.4 conditions | buildContext + conditions | Ranger (bow/crossbow), Cleric (blunt), Fighter (shield/one_handed/two_handed), Rogue (rapier/dual_wield), Bard (instrument) |
| REMOVE_ATOM with `tags[]` filter | §3.6 aggregate (unused), §6.1 availability | buildContext | Druid Shapeshift Mastery (removes spirit-tagged spells) |
| REMOVE_ATOM with armor type | §6.1 availability (armorProficiency mod) | buildContext | Fighter Slayer (removes plate) |
| GRANT_ATOM `costSource: "granter"` | §6.1 (unused for availability; used for UI cost display only) | buildContext | Druid Orb of Nature |
| `scalesWith: hp_missing` on STAT_EFFECT_ATOM or DAMAGE_ATOM | §3.5, arch-doc §12 | materializeStacking | Barbarian Berserker |
| `scalesWith: attribute` on DAMAGE_ATOM | §3.5 | materializeStacking | Druid shapeshift |
| `count ≥ 2` on DAMAGE_ATOM | §3.8 projectDamage | projectDamage | Ranger multi-shot |
| `cap_override` phase | §3.6 aggregate (routes to capOverrides), §3.7 deriveStats (recipes.js cap handling) | aggregate + deriveStats | Fighter Defense Mastery (pdr → 0.75), Barbarian Iron Will (mdr → 0.75) |
| `afterEffect` with `not → effect_active` cancellation | §8 + arch-doc §14 | collectAtoms (short-circuit) + conditions (cancellation) | Barbarian Adrenaline Rush pattern |
| `type: "music"` ability type (implicit in memory pool) | §6.3 | buildContext | Bard |
| `type: "transformation"` ability type (implicit in memory pool + future form mechanics) | §6.3 | buildContext | Druid |
| Persuasiveness / unmet-gear-requirements / luck (utility recipes) | §3.7 | deriveStats | any class; already recipe-defined |

Phase 6 implementer: for each pattern above, the corresponding module's contract in §3 already accommodates it — no module needs restructuring to support. Phase 10 class-migration sessions add class data that exercises these patterns; no engine code changes are expected.

---

## Appendix A — Module dependency graph

```
runSnapshot ─── buildContext ─── conditions
            ├── collectAtoms ─── (ctx-only)
            ├── filterByConditions ─── conditions
            ├── materializeStacking ─── curves
            ├── aggregate ─── (constants-only)
            ├── deriveStats ─── recipes ─── curves
            ├── projectDamage ─── damage, conditions, damageTypeToHealType
            ├── projectHealing ─── damage
            └── projectShield ─── (derivedStats-only)

External (verified-math, unchanged):
  curves.js, damage.js, recipes.js
```

No engine module imports another peer module cyclically. Top-down dependency only.

---

## Appendix B — Cross-reference to architecture doc

| Plan section | Arch-doc section | Note |
|---|---|---|
| §2 module list | §3 stage pipeline + §22 forward-spec | Module list lines up with stage table |
| §3.1 buildContext | §5 ctx, §8 availability, §9 memory budget, §10 Druid form | Stage 0 surface |
| §3.2 collectAtoms | §6 atom contracts (source/atomId populated), §14 afterEffect | Stage 1 |
| §3.3 filterByConditions | §11 condition dispatcher | Stage 2 |
| §3.4 conditions | §11 | 13 variants |
| §3.5 materializeStacking | §12 scalesWith, §13 stacking | Stage 3 |
| §3.6 aggregate | §7 per-phase contract | Stage 4 |
| §3.7 deriveStats | §7 cap_override, recipe semantics | Stage 5 |
| §3.8 projectDamage | §15 damage projection | Stage 6 |
| §3.9 projectHealing | §16.1 direct, §16.2 lifesteal, §16.3 percentMaxHealth, §16.4 targetMaxHp | Stage 6 |
| §3.10 projectShield | §17 shield | Stage 6 |
| §3.11 runSnapshot | §4 Snapshot shape, §20 query API | Public entry |
| §4 pipeline | §3 stage pipeline | Orchestration |
| §5 transitions | §3 table | Invariants |
| §6 Stage 0 detail | §5 + §8 + §9 + weapon_type in §11 | |
| §7 cache-key | §3 dependency set, §21 checkpoints | Engine Q2 resolution |
| §8 afterEffect | §14 + LOCK 5 | Structural short-circuit |
| §9 Stage 6 rules | §16 | Derivation math |
| §10 budget | §21 performance checkpoints + perf-budget.md | |
| §11 tests | §6 atom contracts (for authoring tests) | Test inventory |
| §12 forward-spec | §22 | Pattern coverage |

---

## Appendix C — Phase 6 execution ordering suggestion (non-binding)

Phase 5 does not prescribe Phase 6's implementation order, but for reviewers wanting a rough sense:

1. `damageTypeToHealType` (§3.12) — tiny, isolated, enables projectDamage.
2. `conditions` (§3.4) — enables filterByConditions + availability + post-cap re-eval.
3. `buildContext` (§3.1) — enables all downstream stages.
4. `collectAtoms` (§3.2) — enables Stage 2.
5. `filterByConditions` (§3.3) — stage 2.
6. `materializeStacking` (§3.5) — stage 3.
7. `aggregate` (§3.6) — stage 4.
8. `deriveStats` (§3.7) — wraps existing recipes.js.
9. `projectShield` (§3.10) — simplest projection.
10. `projectDamage` (§3.8) — heaviest; most test volume.
11. `projectHealing` (§3.9) — consumes projectDamage descriptors.
12. `runSnapshot` (§3.11) — orchestrator; retire `bench/stub-pipeline.js` per `docs/performance-budget.md § 5`.

Phase 6 runs `bench/snapshot.bench.js` against real `runSnapshot` after step 12 — that is the first real baseline measurement against the 50 ms budget.
