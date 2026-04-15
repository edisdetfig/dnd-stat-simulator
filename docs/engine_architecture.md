# Engine Architecture

Source of truth for the engine's design. Defines contracts, stages, module boundaries, and public API. Deviations require coordinator authorization.

---

## 1 · Purpose and principles

The engine is a snapshot stat-sheet evaluator for Dark and Darker character builds. It takes a build plus UI toggles and produces derived stats, damage estimates, and available abilities.

### Principles

| Principle | Enforcement |
|---|---|
| Data-driven extensibility | Adding content is a data change. Engine changes only when a new *mechanic type* appears. |
| Class-agnostic | No engine code references a specific class, ability, status, or stat by hardcoded string. Dispatch is enum-driven or data-driven. |
| Pure functions at stage boundaries | Each stage takes inputs + ctx and returns new state. `ctx` is immutable after Stage 0. |
| Dispatch tables over if-chains | Every categorical axis (phase, condition type, damage layer, recipe) uses a lookup map. |
| Explicit contracts | `Effect`, `ctx`, `Attack`, `DerivedStat`, `Bonuses` shapes defined in this doc. Validator and tests enforce. |
| Single source of truth per concern | One place for duration math, one for damage layers, one for curve evaluation. |
| Accuracy first | Every formula traces to a verified source. In-game discrepancies halt development on that path. |

---

## 2 · Data contracts

Ordered by pipeline production. Each contract notes where it is produced and where it is consumed.

### 2.1 · `ctx`

**Produced** at Stage 0. **Consumed** by every subsequent stage. Read-only after Stage 0.

```js
{
  className: string,
  classData: ClassData,
  religion: string | null,
  selectedPerks: string[],
  selectedSkills: string[],
  selectedSpells: string[],

  equipment: {
    // Armor slots — single loadout, independent of active weapon slot
    head, chest, legs, feet, hands, back, ring1, ring2, necklace,
    // Two weapon loadouts; user configures both, one is active at a time
    weaponSlots: {
      slot1: { primary: Weapon | null, offhand: Weapon | Shield | null },
      slot2: { primary: Weapon | null, offhand: Weapon | Shield | null },
    },
  },
  activeWeaponSlot: "slot1" | "slot2",    // user toggle — which loadout is currently held

  activeBuffs: Set<string>,        // includes wild-skill IDs when toggled — the wild-skill collector reads from here
  activeForm: string | null,
  activeSummons: Set<string>,
  activeAfterEffects: Set<string>,

  grantedSpells: Set<string>,      // DERIVED at Stage 0 — unified from active grantsSpells + merged-spell `requires` satisfied

  stackCounts: { [abilityId]: number },
  classResources: { [resourceId]: number },
  abilityTargetMode: { [abilityId]: "self" | "enemy" | "both" },

  playerStates: Set<string>,        // scenario toggles: in_combat, defensive_stance, behind_target, drunk, frenzy, casting, reloading, bow_drawn, playing_music, dual_casting, hiding, crouching

  selectedTiers: { [abilityId]: "poor" | "good" | "perfect" },
  targetStatuses: Set<string>,
  targetStatusSource: { [statusType]: abilityId },

  hpPercent: number,
  // Weapon-state fields DERIVED at Stage 0 from equipment.weaponSlots[activeWeaponSlot]:
  weaponType: string | null,              // specific weapon kind: "sword" | "axe" | "spellbook" | "shield" | ...
  weaponCategory:                         // mutually-exclusive state of the active weapon slot
      "unarmed"
    | "one_handed"
    | "one_handed_shield"
    | "two_handed"
    | "two_handed_shield"
    | "dual_wield",
  environment: string | null,

  activeAbilityIds: Set<string>,  // populated at Stage 0's end

  // Set only when simulating an incoming attack for the incoming-damage panel
  incomingDamageType?: string,
  incomingTags?: string[],
  incomingTrueDamage?: boolean,
  incomingSource?: { className, abilityId },
}
```

**Weapon-category derivation** (Stage 0 computes from the active slot's contents):

| Active slot contents | `weaponCategory` | `weaponType` |
|---|---|---|
| primary = null, offhand = null | `unarmed` | `null` |
| primary.handedness = two_handed, is weapon | `two_handed` | primary's type |
| primary.handedness = two_handed, is shield | `two_handed_shield` | `"shield"` |
| primary = weapon, offhand = shield | `one_handed_shield` | primary's type |
| primary = weapon, offhand = weapon | `dual_wield` | primary's type |
| primary = weapon, offhand = null | `one_handed` | primary's type |

**Condition dispatch** for the `weapon_type` virtual categories (evaluator maps each virtual value to a set of `weaponCategory` matches):

| `weapon_type` value | Matches if `weaponCategory` ∈ |
|---|---|
| `"unarmed"` | `{ "unarmed" }` |
| `"one_handed"` | `{ "one_handed", "one_handed_shield" }` |
| `"two_handed"` | `{ "two_handed" }` (strict — 2h weapon only, not 2h shield) |
| `"dual_wield"` | `{ "dual_wield" }` |
| `"shield"` | `{ "one_handed_shield", "two_handed_shield" }` |
| specific weapon type (`"sword"`, `"axe"`, etc.) | checked against `weaponType` directly |

### 2.2 · `Effect`

**Produced** at Stage 1. **Consumed** by Stages 2–4. Flat.

```js
{
  source: {
    kind: "perk" | "skill" | "spell" | "transformation" |
          "form_attack" | "buff" | "religion" | "gear" | "class_root",
    abilityId: string | null,
    className: string | null,
  },
  stat: string,              // STAT_META key OR RECIPE_IDS entry (cap_override phase only)
  value: number,
  phase: EFFECT_PHASES,      // see §2.4
  condition?: Condition,     // see §2.3
  target?: EFFECT_TARGETS,   // default "self"
  damageType?: string,       // for type_damage_bonus phase
  tags?: string[],
}
```

When both ability-level and effect-level conditions exist in the source data, collectors merge them at emission time into a single `condition` using the `{ type: "all", conditions: [...] }` compound. Downstream consumes one condition field.

### 2.3 · `Condition`

**Authored** in class data on ability-level or effect-level fields. **Consumed** at Stage 2 by the condition evaluator. Every `condition.type` value has an evaluator function `(condition, ctx) → boolean`. Compound `all` / `any` recurse through the dispatcher.

```js
{ type: "form_active", form?: string }
{ type: "hp_below", threshold: number }       // 0–1
{ type: "effect_active", effectId: string }
{ type: "environment", env: string }
{ type: "weapon_type", weaponType: string }
{ type: "player_state", state: string }
{ type: "equipment", slot: string, equipped: boolean }
{ type: "creature_type", creature: string }
{ type: "damage_type", damageType?: string | string[], exclude?: string[] }
{ type: "all", conditions: Condition[] }
{ type: "any", conditions: Condition[] }
```

Canonical set lives in `src/data/constants.js` as `CONDITION_TYPES`.

### 2.4 · `EFFECT_PHASES`

**Authored** on every `Effect` as the `phase` field. **Consumed** at Stage 4 (bucketing) and Stage 5 (application order).

| Phase | Applies to | When |
|---|---|---|
| `pre_curve_flat` | Stat input (pre-curve) | Added to curve inputs before curve eval |
| `attribute_multiplier` | Attrs | Scales raw attr values pre-curve |
| `post_curve` | Stat output | Additive to recipe output, pre-cap |
| `post_curve_multiplicative` | Stat output | Multiplicative, applied AFTER all `post_curve` additives |
| `cap_override` | Recipe cap | Max-wins; raises or lowers the recipe's cap ceiling |
| `post_cap_multiplicative_layer` | Damage value | Multiplicative damage layer applied AFTER capped DR |
| `type_damage_bonus` | Damage value | Additive bonus to a specific damage type |
| `healing_modifier` | Healing value | Healing multiplier at damage layer |

### 2.5 · `Bonuses` and aggregated outputs

**Produced** at Stage 4. **Consumed** at Stage 5 (recipes) and Stage 6 (damage layers).

```js
{
  bonuses: { [statMetaKey]: number },
  capOverrides: { [recipeId]: number },
  postCurveMultipliers: { [recipeId]: number },
  typeDamageBonuses: { [damageType]: number },
  healingMods: { all: number, physical: number, magical: number },
}
```

`capOverrides` and `postCurveMultipliers` target recipe output IDs — parallel axes. `bonuses` is keyed by STAT_META canonical names.

### 2.6 · `DerivedStat`

**Produced** at Stage 5 per recipe. **Consumed** by the UI and by Stage 6 (damage projection reads attacker / defender derived stats).

```js
{
  value: number,        // final computed, capped
  rawValue?: number,    // pre-cap; for UI overflow display
  cap?: number,         // cap that was applied
}
```

### 2.7 · `Attack`

**Provided** by the caller when invoking Stage 6 (typically from authored class data via a panel or the `computeSnapshot` orchestrator). **Consumed** by `applyDamage` and its layers.

```js
{
  base: number,
  scaling: number,
  damageType: string,
  tags: string[],
  isDot?: boolean,
  tickRate?: number,
  trueDamage?: boolean,
  primitiveMultiplier?: number,  // form-attack only
  primitiveAdd?: number,          // form-attack only
}
```

### 2.8 · `Layer`

**Defined** in `src/engine/damage/layers.js`. **Consumed** by `applyDamage` at Stage 6, which composes them in order.

```js
type Layer = (value: number, context: LayerContext) => number
```

Where `LayerContext` carries everything a layer needs to make its decision:

```js
{
  attack: Attack,
  attacker: DerivedStats,
  defender: DerivedStats,
  ctx: Ctx,
  // Populated / mutated by preceding layers as needed
  typeBonusApplied?: number,
  hitLocation?: "body" | "head" | "limb",
  // ...
}
```

The current layer set — `applyPowerBonus`, `applyTypeBonus`, `applyHitLocation`, `applyResistance`, `applyPostCapMultiplicativeLayer`, `applyFlatReduction`, `floor` — is the extension point for new damage mechanics. Adding a new layer means writing a new pure function of this shape and inserting it into the appropriate pipeline's layer list.

### 2.9 · `DamageResult`

**Produced** by `applyDamage` at Stage 6. **Consumed** by the UI's damage panels.

```js
{
  value: number,            // final displayable value (post-floor)
  breakdown?: {             // optional layer-by-layer trace for debug / tooltip
    [layerName: string]: { input: number, output: number },
  },
}
```

Convenience wrappers (`calcPhysicalMeleeDamage`, `calcSpellDamage`, `calcFormAttackDamage`) return `DamageResult`. `calcHealing` returns a richer object (§2.9).

### 2.10 · `HealingResult`

**Produced** by `calcHealing` at Stage 6. **Consumed** by the UI's healing panels.

```js
{
  perTick: number,            // heal per tick (post-modifier, post-floor)
  totalOverDuration: number,  // cumulative heal across the full modified duration
  totalTicks: number,
  effectiveDuration: number,  // duration after buffDurationBonus applied
}
```

### 2.11 · `Recipe`

**Stored** in `DERIVED_STAT_RECIPES` keyed by recipe ID. **Consumed** at Stage 5 by `runRecipe`.

```js
{
  cap?: number,                         // default cap; may be overridden via capOverrides[recipeId]

  // Curve-based recipes fill these four:
  curveKey?: string,                    // references STAT_CURVES
  inputFormula?: (attrs, bonuses) => number,  // computes the curve input
  curveOutputScale?: number,             // per-recipe static scalar on curve output, pre-additive-adds
  postCurveAdds?: (bonuses) => number,   // flat additive to the curve output

  // OR escape-hatch recipes fill this (for multi-stage compute like hp, pdr, mdr):
  compute?: (attrs, bonuses) => number,

  // Display metadata for UI panels and charts
  display: {
    unit: "percent" | "flat" | "integer" | "seconds",
    formula: string,                    // human-readable formula string
    attrs: { [attrKey]: number },       // weight map for curve-contribution charts
  },
}
```

Recipes are either curve-based (the four `curve*` fields) OR escape-hatch (`compute`), never both. `display` is always present.

### 2.12 · `Snapshot`

**Produced** by `computeSnapshot`. **Consumed** by App.jsx and UI panels.

```js
{
  ctx: Ctx,                                         // read-only build state; every panel references for toggles + selections
  selfDerivedStats: { [recipeId]: DerivedStat },    // AttributesPanel, DerivedStatsPanel, outgoing-damage attacker side
  targetDerivedStats: { [recipeId]: DerivedStat },  // damage calc defender side; TargetPanel and future incoming-damage panel
  finalAttrs: Attrs,                                // AttributesPanel — attribute display after attribute_multiplier phase
}
```

Each field is a stable reference when its inputs haven't changed (see §5.1). Panels memoize against just the slice they render.

Damage estimates are NOT pre-computed in `Snapshot`. Panels call `applyDamage` (or a convenience wrapper) per-attack on demand, passing the relevant derived stats.

Spell availability (selected + granted + merged-derived) is already unified in `ctx.grantedSpells` + `ctx.selectedSpells` — panels query those directly rather than duplicating on Snapshot.

### 2.13 · Two-namespace stat model

Cross-cutting. **Referenced** by Stage 1 (effect authoring), Stage 4 (aggregation keys), Stage 5 (recipe outputs and cap targets), and the validator.

- **STAT_META keys** = additive gear / perk contributions. Named with `Bonus` suffix where the concept is "contribution to an output stat" (e.g., `physicalDamageReductionBonus`, `maxHealthBonus`, `physicalDamageBonus`).
- **RECIPE_IDS** = recipe outputs (final computed stats). Short names (`pdr`, `mdr`, `hp`, `ppb`, `mpb`, `cdr`, …). Valid under `effect.stat` only when `phase === "cap_override"`. Validator enforces.

`RECIPE_IDS` is exported from `src/engine/recipes.js` as `new Set(Object.keys(DERIVED_STAT_RECIPES))` — auto-synced with the recipe registry.

---

## 3 · Stage pipeline

```
UI build state
     ↓
Stage 0: Build ctx                              → ctx (immutable)
     ↓
Stage 1: Collect effects                        → Effect[]
     ↓
Stage 2: Filter by conditions                   → Effect[] (live)
     ↓
Stage 3: Materialize stacking                   → Effect[] (flat)
     ↓
Stage 4: Aggregate by phase (self + target)     → { bonuses, capOverrides, postCurveMultipliers, typeDamageBonuses, healingMods }
     ↓
Stage 5: Derive stats                           → DerivedStats
     ↓
Stage 6: Project damage / healing               → DamageResult
     ↓
Snapshot → UI
```

### Stage 0 — Build ctx

Parse UI state into `ctx`. Populates `activeAbilityIds` as the last step by unioning selected and active toggles.

### Stage 1 — Collect effects

Each collector walks `ctx.classData` plus active toggles for one source type and yields `Effect[]`. Collectors run independently; results concatenate.

Emission rules:
- `effect.condition` is the merged condition from ability-level + effect-level sources per §2.1.
- `effect.target` carries through verbatim from authoring; default `"self"` if omitted.
- `source.kind` must be one of the closed enum values in §2.1.

### Stage 2 — Filter by conditions

Evaluate `effect.condition` against ctx via the dispatcher in `src/engine/conditions.js`. Drop effects whose conditions fail.

### Stage 3 — Materialize stacking

Expand per-ability and per-status stacking markers into concrete per-stack contributions using `ctx.stackCounts` and `ctx.classResources`.

Supports per-ability stacking, per-status stacking, shared resource pools, and tier-nested stacking.

### Stage 4 — Aggregate

Runs twice. The first call filters effects routed to the caster (`target ∈ {self, party, nearby_allies, nearby_enemies}` under snapshot-collapse rules) and produces the self-bucket. The second call filters effects with `target === "enemy"` and produces the target-bucket. `target: "either"` dispatches via `ctx.abilityTargetMode[abilityId]`.

Snapshot-collapse rule: `nearby_allies`, `party`, and `nearby_enemies` route to the caster because the simulator renders the caster's own build, not an ally's stat sheet.

### Stage 5 — Derive stats

Apply `attribute_multiplier` phase contributions to `attrs` pre-curve. Then for each entry in `DERIVED_STAT_RECIPES`:

```
raw = recipe.compute(attrs, bonuses)
           OR
       evaluateCurve(recipe.curveKey, recipe.inputFormula(attrs, bonuses))
         * recipe.curveOutputScale
         + recipe.postCurveAdds(bonuses)

multiplied = raw × (1 + (postCurveMultipliers[recipeId] || 0))
cap = capOverrides[recipeId] ?? recipe.cap
final = cap ? min(multiplied, cap) : multiplied
```

Each recipe entry carries:
- Execution metadata: `curveKey`, `inputFormula`, `curveOutputScale`, `postCurveAdds`, or `compute` (escape-hatch for multi-stage recipes like `pdr` / `mdr` / `hp`).
- Display metadata in a `display` sub-object: `{ unit, formula, attrs }` for UI panels and charts.
- `cap` where applicable.

### Stage 6 — Project damage and healing

Unified `applyDamage(attack, attacker, defender, ctx, layers)` entrypoint. `layers` is an ordered array of pure layer functions, each `(value, context) → newValue`.

Standard layers:

| Layer | Purpose |
|---|---|
| `applyPowerBonus` | PPB or MPB based on `attack.damageType` |
| `applyTypeBonus` | `type_damage_bonus` contributions for matching types; honors `damage_type` condition exclusion |
| `applyHitLocation` | Head = `1.0 + 0.5 + HDB% − HDR%` (additive), Body = 1.0, Limb = 0.5. AoE / DoT attacks opt out via tags. |
| `applyResistance` | PDR or MDR with cap and penetration. Pen clamp: `max(1 − DR×(1−pen), 1−DR)`. |
| `applyPostCapMultiplicativeLayer` | Multiplicative layer applied after capped DR |
| `applyFlatReduction` | Final flat subtraction (e.g., Perseverance), floor at 0 |
| `floor` | `Math.floor` for final display value |

Hit-location constants exported from `src/data/constants.js` as `COMBAT.HS_BASE_MULT` (1.5) and `COMBAT.LIMB_MULT` (0.5). The head formula is additive, not multiplicative.

Convenience wrappers:
- `calcPhysicalMeleeDamage` — `[PowerBonus, HitLocation, Resistance, FlatReduction, floor]`
- `calcSpellDamage` — `[PowerBonus, TypeBonus, HitLocation, Resistance, PostCapMult, FlatReduction, floor]`
- `calcFormAttackDamage` — evaluates the `shapeshiftPrimitive` curve internally, then calls `applyDamage` with the same layer stack as physical melee. Form attacks use identical HLM to physical/spell melee.
- `calcHealing` — `[HealingMod, floor]`. Returns `{ perTick, totalOverDuration, totalTicks, effectiveDuration }`; the UI panel surfaces both the per-tick rate and the cumulative total.

Form-attack formula:

```js
function calcFormAttackDamage(formAttack, attrValue, attacker, defender, ctx) {
  const primitive = evaluateCurve(STAT_CURVES.shapeshiftPrimitive, attrValue);
  const base = primitive * formAttack.primitiveMultiplier + formAttack.primitiveAdd;
  const attack = { base, scaling: 0, damageType: formAttack.damageType, tags: formAttack.tags };
  return applyDamage(attack, attacker, defender, ctx, FORM_ATTACK_LAYERS);
}
```

Damage = `(primitiveCurve(attr) × primitiveMultiplier + primitiveAdd) × (1 + PowerBonus)`.

**Incoming-damage panel:** same `applyDamage`, same layer lists, with `attacker` and `defender` roles filled by the enemy's stats and the player's defenses respectively. Set the incoming-damage ctx fields (§2.2) and call the pipeline. No code fork.

---

## 4 · Module map

```
src/engine/
  index.js                         # public API exports

  context.js                       # Stage 0 — ctx shape + builders

  collectors/                      # Stage 1
    index.js                       # orchestrator
    perks.js
    skills.js
    spells.js
    musics.js
    buffs.js
    transformations.js
    form-attacks.js
    summons.js
    religion.js
    hp-scaling.js
    ability-modifiers.js
    class-resources.js
    disables.js
    stacking.js                    # emits stacking markers for Stage 3

  conditions.js                    # Stage 2

  stacking.js                      # Stage 3

  duration-modifiers.js            # Duration-direction math

  aggregator.js                    # Stage 4

  curves.js                        # Stage 5 (part 1) — piecewise curve evaluation
  recipes.js                       # Stage 5 (part 2) — DERIVED_STAT_RECIPES + RECIPE_IDS

  damage/                          # Stage 6
    index.js                       # applyDamage + convenience wrappers
    layers.js                      # layer function registry
    formulas.js                    # primitive-curve evaluation + specialized math

  spell-availability.js            # grantsSpells resolver + merged-spell availability

  __integration-tests__/
  __test-fixtures__/
```

---

## 5 · Public API

Exposed from `src/engine/index.js`:

```js
export function computeSnapshot(buildState: BuildState): Snapshot

export function buildCtx(buildState: BuildState): Ctx
export function collectEffects(ctx: Ctx): Effect[]
export function filterByConditions(effects: Effect[], ctx: Ctx): Effect[]
export function materializeStacking(effects: Effect[], ctx: Ctx): Effect[]
export function aggregate(effects: Effect[], target: "self" | "enemy", ctx: Ctx): AggregatedBonuses
export function derive(attrs: Attrs, aggregated: AggregatedBonuses): DerivedStats
export function applyDamage(attack: Attack, attacker: DerivedStats, defender: DerivedStats, ctx: Ctx, layers?: Layer[]): DamageResult

export function calcPhysicalMeleeDamage(...)
export function calcSpellDamage(...)
export function calcFormAttackDamage(...)
export function calcHealing(...)

export function getAvailableSpells(ctx: Ctx): string[]

export { STAT_CURVES, evaluateCurve, getMarginalSlope } from './curves.js'
export { DERIVED_STAT_RECIPES, RECIPE_IDS } from './recipes.js'
```

`computeSnapshot` is the primary entrypoint. Stage-level entrypoints are exposed for tests and for the incoming-damage panel's role-swap call pattern.

### 5.1 · Consumer patterns

UI panels consume `Snapshot` and memoize per-panel on just the slice they render. Snapshot fields are stable references — when a field's inputs have not changed, the field returns the same reference across snapshot rebuilds (structural sharing). Panels depending only on that slice do not re-derive.

Pattern:

```jsx
// In DamagePanel
const damageAbilities = useMemo(
  () => filterByShape(snapshot.ctx.classData, "damage"),
  [snapshot.ctx.classData]
);

// In ActiveBuffsPanel
const activeBuffEffects = useMemo(
  () => filterActiveBuffs(snapshot.ctx.activeBuffs, snapshot.ctx.classData),
  [snapshot.ctx.activeBuffs, snapshot.ctx.classData]
);
```

Each panel depends on the narrowest slice it needs. Unrelated state changes do not retrigger the filter.

**Implication for Stage 0 / Stage 5 / `computeSnapshot` implementations:** when rebuilding `ctx` or `Snapshot`, preserve array / Set references for sub-fields whose inputs did not change. Avoid spreading (`{ ...ctx, X: newX }`) in ways that break reference equality on untouched fields. React's `useMemo` dependency checks are reference-based; losing reference equality defeats the memoization.

### 5.2 · Consumer map

Authoritative contract for which `Snapshot` / `ctx` slice each consumer reads. When a new panel or consumer is added, its row is appended here. When a new Snapshot field is added, the author fills in its consumers.

| Consumer | Slices depended on |
|---|---|
| `AttributesPanel` | `snapshot.finalAttrs`, `snapshot.ctx.classData.baseAttributes` |
| `DerivedStatsPanel` | `snapshot.selfDerivedStats`, `snapshot.ctx.classData` (for display labels) |
| `DamagePanel` | `snapshot.selfDerivedStats`, `snapshot.targetDerivedStats`, `snapshot.ctx.classData`, `snapshot.ctx.selectedSpells`, `snapshot.ctx.grantedSpells` |
| `ActiveBuffsPanel` | `snapshot.ctx.activeBuffs`, `snapshot.ctx.classData` |
| `PerksPanel` | `snapshot.ctx.selectedPerks`, `snapshot.ctx.classData.perks` |
| `SkillsPanel` | `snapshot.ctx.selectedSkills`, `snapshot.ctx.classData.skills` |
| `SpellsPanel` | `snapshot.ctx.selectedSpells`, `snapshot.ctx.grantedSpells`, `snapshot.ctx.classData.spells`, `snapshot.ctx.classData.mergedSpells` |
| `GearPanel` | `snapshot.ctx.equipment`, `snapshot.ctx.activeWeaponSlot`, `snapshot.ctx.weaponType`, `snapshot.ctx.weaponCategory` |
| `TargetPanel` | `snapshot.targetDerivedStats`, `snapshot.ctx.targetStatuses`, `snapshot.ctx.targetStatusSource` |
| `LiveStatePanel` | `snapshot.ctx.playerStates`, `snapshot.ctx.stackCounts`, `snapshot.ctx.classResources`, `snapshot.ctx.abilityTargetMode`, `snapshot.ctx.activeForm`, `snapshot.ctx.activeSummons` |
| `ReligionPanel` | `snapshot.ctx.religion`, `snapshot.ctx.classData` |

Panels render subsets of these slices. Each panel's top-level `useMemo` should depend on exactly the slices listed. This table is added to during D.0.4 panel rebuild and maintained as the panel set evolves.

---

## 6 · §D row assignment

| # | Feature | Module |
|---|---|---|
| D.1 | Duration-direction math | `duration-modifiers.js` |
| D.2 | HP-scaling continuous | `collectors/hp-scaling.js` |
| D.3 | Form pipeline | `collectors/transformations.js` |
| D.4 | `abilityModifiers.modify: "cost"` | `collectors/ability-modifiers.js` |
| D.5 | `cost.type: "cooldown"` dispatch | `collectors/ability-modifiers.js` |
| D.6 | Merged-spell availability | `spell-availability.js` |
| D.7 | `post_cap_multiplicative_layer` | `damage/layers.js` |
| D.8 | `damage_type` evaluator | `conditions.js` |
| D.9 | Status stacking | `stacking.js` |
| D.10 | Primitive curve formula | `damage/formulas.js` |
| D.11 | Shared resource pool | `collectors/class-resources.js` + `stacking.js` |
| D.12 | Self-damage DoT | `collectors/hp-scaling.js` or `aggregator.js` |
| D.13 | Any-form gating | `conditions.js` (`form_active`) |
| D.14 | Trigger duration | `duration-modifiers.js` |
| D.15 | Merged-spell cooldown | `spell-availability.js` or `collectors/ability-modifiers.js` |
| D.16 | Multi-CC array | data shape + walker |
| D.17 | Tier stacking | `stacking.js` |
| D.18 | `memoryCost` | validator + ctx |
| D.19 | Music slot count | validator + ctx |
| D.20 | `disables[]` walker | `collectors/disables.js` |
| D.21 | `form.attacks[i].appliesStatus` walker | `collectors/form-attacks.js` |
| D.22 | `form.attacks[i].frenziedEffect` | `collectors/form-attacks.js` |
| D.23 | `effect_active` resolver | `conditions.js` |
| D.24 | Compound `all` / `any` | `conditions.js` |
| D.25 | `post_curve_multiplicative` | `aggregator.js` + `recipes.js` |
| D.26 | `flatDamageReduction` | `damage/layers.js` |

---

## 7 · Test strategy

- **Unit per module.** Colocated `module.js` + `module.test.js`. Pure functions make this cheap.
- **Integration at stage boundaries.** `__integration-tests__/` verifies stage N output matches stage N+1 input expectations.
- **Fixture-driven damage tests.** `src/engine/damage/damage.test.js` seeds from the 16 verified test points in `docs/damage_formulas.md:229-255`. The full suite passes before any damage-layer changes are committed.
- **Per-class smoke tests.** One per class, loads full class data and runs `computeSnapshot` over a canonical build. Asserts no exceptions plus key invariants.
- **Negative-case tests.** Every layer, collector, and condition evaluator has at least one rejection fixture.
- **Registry-symmetry tests.** `conditions.js` asserts `EVALUATORS` keys exactly equal `CONDITION_TYPES`. `recipes.js` asserts `RECIPE_IDS` keys exactly equal `DERIVED_STAT_RECIPES` keys.

---

## 8 · Open items

| Item | Action needed |
|---|---|
| `ability.targeting` field and TARGETING enum | Decide whether to keep as display-only metadata (engine ignores) or retire entirely (engine routes purely on `effect.target` + `ctx.abilityTargetMode`). Either choice is stable; picking one removes ambiguity. |
| Mending Grove duration | Authored 5s, awaits in-game timing. Single-value update when measured. |

---

## 9 · Deferred features

Tracked in project memory; not part of the core engine contract:

- `passives` schema cleanup (split into stat-like + flags[] + desc-only)
- `passives.radius` consistent authoring audit
- Form-attack `id:` convention (triggered-on-need per D.21/D.22 tracker note)
- `grantsSpells` auto-display rule (UI behavior)
- Ale / consumable modeling
- Incoming-damage panel UI (engine pipeline supports it; panel itself is a discrete task)
- Bard Din of Darkness targeting semantic (ability-level `targeting` vs. self-centered AoE)

---

## 10 · Non-goals

- Real-time combat simulation
- DPS or rotation optimization
- Cross-class interaction modeling (one build at a time)
- Multiplayer or party composition
- Ability cooldown tracking across time
- Animation or wind-up frame data
