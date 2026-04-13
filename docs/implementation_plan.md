# Implementation Plan — Unified Abilities (v3)

> **Scope**: End-to-end implementation plan for rebuilding the Dark and Darker simulator's ability system against the v3 data map. Covers engine refactor, UI redesign, all 10 class creations, URL schema, and testing.
>
> **Source of truth for data shape**: `docs/ability_data_map_v2.md` (the v3 data map). This plan references it as "the spec."
>
> **Core principle (foundational constraint)**: The simulator is a **stat snapshot tool**, not real-time. Every temporal field (`duration`, `cooldown`, `consumedOn`, `stackDecay`, `tickRate`, `afterEffect.duration`) is display metadata. The engine never reads it. **Users control what's active via toggles, sliders, and selectors.** The engine treats everything as "toggle on/off."

---

## 1. Why this plan exists

The current simulator is built for 3 classes (Warlock, Druid, Fighter-stub) with tech debt:
- Perk effects silently dropped (pipeline only reads hardcoded keys)
- Skill effects never processed
- Hardcoded per-stat logic in `computeDerivedStats`
- No phase awareness for perk/transformation effects
- Health formula uses `ceil` (should be conditional)

The v3 data map unifies all ability types (perk, skill, spell, transformation, music, merged_spell) into one `effects[]` pipeline with phase-aware processing. Adding new content (perks, classes) becomes a data change, not a code change.

This plan is the road from here to there.

---

## 2. Architecture: Three Layers + One Seam

```
┌────────────────────────────────────────────────────────────────┐
│  UI LAYER                                                       │
│  App.jsx state: selectedPerks, activeBuffs, hpPercent,          │
│                 selectedStacks, playerStates, targetStatuses... │
│  Panels: ContextBar, BodyPanel, StatesPanel, ActiveEffectsHub,  │
│          TargetPanel, ShapeshiftPanel, BuildPanel               │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
           ┌──────────────────────────────────────┐
           │  buildEngineContext(state)           │  ← THE SEAM
           │  Pure function. Single input         │
           │  contract between UI and engine.     │
           └──────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  ENGINE LAYER (pure, React-free)                                │
│  collectors/* → effect-pipeline → recipes (derived stats)       │
│  conditions.js, merged-spells.js, ability-modifiers.js          │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                     │
│  defineClass()-wrapped class definitions matching v3 shape      │
│  src/data/classes/{warlock,druid,fighter,...}.js                │
│  src/data/constants.js (phases, conditions, status, states)     │
│  src/data/stat-meta.js (STAT_META with v3 additions)            │
└────────────────────────────────────────────────────────────────┘
```

**The Seam principle:** The engine consumes one normalized `EngineContext` object. The UI produces it. This means:
- UI can restructure state freely without breaking the engine
- Engine can be tested in isolation (vitest, no React)
- A single `useMemo` in `App.jsx` is the only React↔engine touchpoint

---

## 3. Phase Overview

Phases are ordered by dependency. Within a phase, items marked **parallel** can run concurrently.

**Guiding principle:** No backwards compatibility shims, no legacy-capture fixtures, no "mirror current behavior" stages. Every phase lands fresh v3 code. Breaking changes to shared URLs are acceptable.

**Class-first principle:** The engine is NOT built in isolation. Phase 1 creates Warlock to v3 shape AS PART of building the engine. Engine modules are tested against real v3 class data from day one.

| # | Phase | Output | Unblocks |
|---|---|---|---|
| 0 | **Foundation** | vitest, STAT_META additions, constants, `defineClass` validator, fresh expected-value tests (not legacy capture) | Everything |
| 1 | **Warlock + Engine Core** (atomic) | Warlock class built fresh from CSV + recipes/conditions/pipeline/core collectors + App.jsx rewrite. Warlock works in v3. Druid/Fighter temporarily absent from the app. | Phase 1.5, 2 |
| 1.5 | **Druid + Fighter creation** | Druid + Fighter classes built fresh from CSVs. All 3 initial classes functional. | Phase 2, 3 |
| 2 | **UI: foundations** | State scaffolding, `buildEngineContext`, ToggleRow/ConditionBadge primitives, ContextBar | Phase 3 |
| 3 | **Engine + UI: v3 systems (parallel)** | Stacking, HP-scaling, status effects, afterEffect, summon casterEffects, merged spells, ability modifiers. UI: HpSlider, StackPicker, TierSelector, StatesPanel, TargetPanel statuses, ActiveEffectsHub redesign | Phase 4 |
| 4 | **Remaining class creation waves** | Classes 4-10 (Barbarian/Ranger/Rogue/Cleric/Wizard/Sorcerer/Bard) | Phase 5 |
| 5 | **Persistence: fresh URL Schema** | Shareable builds preserve all v3 state (no V1 compat) | — |
| 6 | **Polish** | Baseline/delta mode, creative visualizations, mobile, cleanup | Ship |

Detailed breakdown below.

---

## 4. Phase 0 — Foundation

**Goal:** Test infrastructure and data plumbing. Nothing shipped to users yet.

### 0.1 Test framework setup (vitest)
- Add `vitest` + `@vitest/ui` to devDependencies
- Add `"test": "vitest"` script
- Tests live in `src/**/*.test.js` alongside source
- Port existing `src/engine/tests.js` assertions to vitest format

### 0.2 Fresh expected-value tests (NOT legacy capture)
Write tests with expected values computed from **CSVs + verified formulas + curves**, not captured from current (possibly buggy) output. Examples:
- Warlock naked: STR 11, VIG 14, expected HP from `floor(evaluateCurve(health, 11*0.25 + 14*0.75) × (1 + 0)) + 10 + 0 = X`
- Warlock + Robust: `floor(healthCurve × 1.075) + 10`
- Druid bear form: +50% MHB, -30% AS, etc. → compute from CSV values

These tests pin **correct** behavior, not current. If current code produces different values, current code is wrong — the test catches it. Fixtures live in `src/engine/__tests__/` as code, not JSON snapshots.

### 0.3 STAT_META expansion
Add v3 stat keys to `src/data/stat-meta.js`:
```
healingMod, healingAdd, typeDamageBonus, magicDamageTaken,
curseDurationBonus, shapeshiftCastTime, wildSkillCooldown,
recoverableHealth, buffWeaponDamage, additionalWeaponDamage,
headshotPower, backstabPower, armorPenetration, headPenetration,
impactPower, impactResistance, armorRatingMultiplier,
spellChargeMultiplier, spellCooldownMultiplier,
flatDamageReduction, drawSpeed
```

### 0.4 Create `src/data/constants.js` (currently deleted)

Must export pre-existing names that `aggregator.js` still imports:
- `CORE_ATTRS` — Set of `"str" "vig" "agi" "dex" "wil" "kno" "res"`
- `ARMOR_SLOTS` — ordered array `["head","chest","back","hands","legs","feet","ring1","ring2","necklace"]`

Plus new v3 content:
```js
export const EFFECT_PHASES = {
  PRE_CURVE_FLAT, ATTRIBUTE_MULTIPLIER, POST_CURVE,
  MULTIPLICATIVE_LAYER, TYPE_DAMAGE_BONUS, HEALING_MODIFIER, CAP_OVERRIDE,
  // DAMAGE_OVER_TIME REMOVED
};
export const PATCH_HEALTH_BONUS = 10;
export const CONDITION_TYPES = new Set([...]);
export const TRIGGER_EVENTS = new Set([...]);
export const STATUS_TYPES = new Set([...]);
export const PLAYER_STATES = new Set([...]);
export const WEAPON_TYPE_CATEGORIES = { ranged: ["bow", "crossbow"], two_handed: [...] };
export const TARGETING = { SELF_ONLY, ALLY_OR_SELF, ENEMY_ONLY, ENEMY_OR_SELF };
```

### 0.5 `defineClass()` validation wrapper
New `src/data/classes/define-class.js`. Validates at class-load time:
- Every `effects[].stat` ∈ STAT_META ∪ CORE_ATTRS ∪ {"all_attributes", "typeDamageBonus"}
- Every `phase` ∈ EFFECT_PHASES
- Every `condition.type` ∈ CONDITION_TYPES (with required companion fields)
- Every `appliesStatus[].type` ∈ STATUS_TYPES
- Merged spell `components[]` reference extant spells
- `abilityModifiers[].target` resolves
- No duplicate ability IDs within a class
- Dev: `console.warn`. Tests: throws. Prod: silent log.

**Acceptance:** `npm test` passes. Warlock regression fixture locked. STAT_META has all v3 keys. `defineClass` wraps existing classes without warnings.

---

## 5. Phase 1 — Warlock Creation + Engine Core (ATOMIC)

**Goal:** Create Warlock from scratch AS PART of building the engine. Engine modules are tested against real v3 Warlock data from day one. No engine-in-a-vacuum. No reference to old warlock.js.

**At end of Phase 1:** Warlock fully works in v3. Druid and Fighter are temporarily absent from the app (Phase 1.5 creates them).

### 1.1 Create Warlock class (fresh from CSV)
- Delete old `src/data/classes/warlock.js`
- Delete old `src/data/classes/index.js` (old registry)
- Create NEW `src/data/classes/warlock.js` using ONLY `docs/classes/warlock.csv` as reference
- Every perk/skill/spell authored in v3 shape: `effects[]` with phases, `condition`, `stacking`, `triggers`, `shield`, `appliesStatus`, etc.
- All abilities present per CSV (Malice, Dark Offering, etc. — everything the CSV lists)
- Values from CSV are canonical: Eldritch Shield 25 shield / 15s duration / dark-spell-only buff, Flame Walker 6s, Summon Hydra 10s, Bloodstained Blade on-swing damage, Soul Collector stacking, Immortal Lament 5s duration, etc.
- Blood Pact as skill-with-toggle (not transformation) — see §13.6
- `defineClass()` validates the whole thing at import
- Do NOT open old warlock.js for reference at any point
- IDs are chosen by the new class (following CSV naming), NOT constrained by what the old warlock.js used. The example build must adapt to the new IDs, not the other way around.

### 1.1a Update `src/data/example-builds.js` to new Warlock IDs
- Update Blood Tithe example build to reference whatever IDs the new Warlock uses
- Populate missing gear fields: `weaponType` on weapons (e.g., `weaponType: "sword"` on Spectral Blade), `armorType` on armor items (e.g., `armorType: "plate"` on Dark Plate Armor). These are required by v3 `weapon_type` / armor-type conditions.
- If v3 state shape adds new fields (e.g., `selectedStacks`, `hpPercent`, `playerStates`), Blood Tithe build's `build()` factory sets reasonable defaults.

### 1.2 Recipe registry (`src/engine/recipes.js`)
`DERIVED_STAT_RECIPES` as the execution authority. Each recipe declares: curve, input formula, pre-input bonuses, input multipliers, output multipliers, rounding, gear flat bonuses, cap.

**Key recipes:**
- **`health`**: custom path (conditional rounding + PATCH_HEALTH_BONUS + maxHealth flat add, per verified formula)
- **`mdr`**: two-stage input expressed inline — `inputFormula` calls `evaluateCurve(willToMagicResistance, wil) + bonuses.magicResistance`
- **`pdr`**: applies `armorRatingMultiplier` to gear AR before PDR curve (Fighter Defense Mastery, later)

Write recipes to produce **correct** v3 values — no "mirror current behavior" intermediate step. Delete `src/engine/derived-stats.js` in this phase.

### 1.3 Condition evaluator (`src/engine/conditions.js`)
```js
evaluateCondition(condition, ctx): boolean
passesConditions(ability, effect, ctx): boolean  // ANDs ability.condition + effect.condition
isAbilityActive(id, ctx): boolean                // checks activeBuffs, activeForm, activeSummons, etc.
```

Dispatch table over all 9 condition types. Fail closed on unknown types with one-shot `console.warn`.

### 1.4 EngineContext (`src/engine/context.js`)
Single input shape for all engine operations. `buildEngineContext(state) → EngineContext`. Fields listed in the engine plan; every new v3 concept gets a field here.

### 1.5 Effect pipeline (`src/engine/effect-pipeline.js`)
```js
runEffectPipeline(ctx): PipelineResult       // caster-side
runTargetPipeline(ctx): TargetPipelineResult // enemy-side
resolveApplyMode(ability, ctx): { applyToSelf, applyToEnemy }
```

Both pipelines are **Phase 1 scope** (target routing is a correctness
requirement, not a Phase 3 add-on). They share collectors and apply
identical phase semantics on different seed data — caster seeds from
gear-baseline attrs/bonuses; enemy seeds from `ctx.target` DR values.

Per-entry routing:
- `effect.target === "self"`   → self pipeline only
- `effect.target === "enemy"`  → enemy pipeline only
- `effect.target === "either"` → per-ability `applyToSelf` /
   `applyToEnemy` toggles (`ctx.abilityTargetMode[id]` override, else
   ability defaults). Both true routes to both pipelines simultaneously
- Missing target / party / nearby_* → treated as self (snapshot principle)

Flow:
1. Collect effects from all sources (1.6 collectors)
2. Filter by conditions (ability-level AND effect-level)
3. Partition entries by target into self-queue and enemy-queue
4. Resolve `hpScaling` → static value
5. Partition each queue by phase:
   - `cap_override` → `Math.max` per stat
   - `pre_curve_flat` → CORE_ATTR → attrs, `all_attributes` fans out to
     all 7 CORE_ATTRS with `effect.value`, else → bonuses
   - `attribute_multiplier` → expands `all_attributes` to 7 per-attr ops
   - `post_curve` → accumulate
   - `multiplicative_layer` → **stacks multiplicatively** (0.80 × 0.80 = 0.64)
   - `type_damage_bonus` → keyed by damageType
   - `healing_modifier` → routed by healType

### 1.6 Core collectors (for Warlock's needs)
- `collectors/perks.js`
- `collectors/buffs.js`
- `collectors/transformations.js` (minimal — Warlock has no forms; supports Blood Pact toggle)
- `collectors/religion.js`
- `collectors/stacking.js` (Dark Offering, Soul Collector)
- `collectors/hp-scaling.js` (no Warlock ability uses it, but infrastructure is ready)
- `collectors/status.js` (Hellfire burn, if applicable)
- `collectors/index.js` (barrel)

### 1.6a Gear triggers spec + `defineGear()`
Gear items can carry a top-level `triggers[]` array (spec §3 extension).
Seed vocabulary in `GEAR_TRIGGER_EVENTS`: `melee_hit`, `melee_hit_received`,
`ranged_hit`, `spell_hit`, `kill`, `successful_block`, `successful_dodge`.
Bare names, distinct from ability-level `TRIGGER_EVENTS` (prefixed with
`on_`). First anchor: Spiked Gauntlet's 1 true_physical on melee_hit.

`defineGear()` (parallel to `defineClass`) validates shape at authoring
time. Phase 1 validates structure; Phase 3 wires trigger damage into the
damage-output UI.

### 1.7 Build fresh App.jsx
Delete old `src/App.jsx`. Build new `src/App.jsx` from scratch:
```js
// Sketch only — full state list in Phase 2
const ctx = buildEngineContext(state);
const self = runEffectPipeline(ctx);
const ds = computeDerivedStats(self.attrs, self.bonuses, self.capOverrides);
// + postCurve, multiplicative layers, damage type bonuses, healing modifiers applied
```

Existing layout patterns (two-column grid, panel structure) can be referenced conceptually for the new App.jsx structure, but no logic is copied from the old file.

**Acceptance:** Warlock CSV-derived expected-value tests pass. Warlock renders correctly for all known builds. Druid and Fighter are intentionally absent from the app at this point (Phase 1.5 creates them).

---

## 6. Phase 1.5 — Druid + Fighter Creation

**Goal:** Create Druid and Fighter fresh from their CSVs. No reference to existing druid.js or fighter.js files (both are deleted).

### 1.5.1 Druid creation (fresh from CSV)
- Delete old `src/data/classes/druid.js`
- Create NEW `src/data/classes/druid.js` from `docs/classes/druid.csv` only
- Features exercised: ability-level `condition: { type: "form_active" }` on transformations, `tags: ["spirit"]` on spirit spells, generalized `afterEffect` on wild skills, `triggers[on_damage_dealt]` with `effect_active` condition (Dreamfire + Nature's Touch), environment condition (Penguin Dash water bonus), `allyEffect`/`impliedHealEffects` (Orb of Nature → Nature's Touch)
- All 5 transformations + Human form, all perks/skills/spells from CSV
- `defineClass()` validates

### 1.5.2 Fighter creation (fresh from CSV)
- Delete old `src/data/classes/fighter.js`
- Create NEW `src/data/classes/fighter.js` from `docs/classes/fighter.csv` only
- Features exercised: `weapon_type` condition (sword, ranged, two-handed, blunt), `dual_wield`, `player_state: "defensive_stance"`, `afterEffect` with `removedBy` (Adrenaline Rush), `abilityModifiers` (Requiem-style), `armorRatingMultiplier` (Defense Mastery), `impactResistance`, `removesArmor` (Slayer)
- New collectors needed in engine: `after-effects.js`, `ability-modifiers.js`

### 1.5.3 Expanded engine features
As Fighter requires them, add:
- `collectors/after-effects.js`
- `ability-modifiers.js` module
- `weapon_type` / `dual_wield` / `player_state` / `equipment` condition handlers

**Acceptance:** Druid CSV-derived tests pass. Fighter CSV-derived tests pass. All 3 existing classes in v3 shape. `defineClass` validates all three without warnings.

---

## 7. Phase 2 — UI: Foundations

**Goal:** Expose new state and primitive components. Unblocks v3 systems.

**UI preservation:** The current app's look and feel stay. v3 additions are **additive**, not restructuring. Two-column layout unchanged. Existing panels (Attributes, Key Stats, Gear, Build) unchanged. The existing theme system (`src/styles/theme.js` + `themes/blood-tithe.js`) is leveraged as-is; new components consume existing tokens and we add a handful of new tokens (status-effect colors: sickly-green for poison, frost-cyan for frostbite, silence-gray) — no theme refactor.

### 3.1 State scaffolding (App.jsx)
Add `useState` hooks, default-off:
```js
hpPercent:              100
playerStates:           {}
selectedStacks:         {}    // { [abilityId]: number }
selectedTiers:          {}    // { [musicId]: "poor"|"good"|"perfect" }
activeSummons:          {}
activeAfterEffects:     {}
targetStatuses:         {}
targetStatusSource:     {}    // disambiguates when multiple abilities apply same status
activeWildSkill:        null
expandedAbility:        null  // card expansion state
equippedWeapon:         (derived from gear, user-overridable for unarmed)
```

### 3.2 `buildEngineContext(state)` as THE seam
One memoized function in App.jsx. Engine consumes it. This is the boundary — the engine never reaches into individual state slices.

### 3.3 `evaluateCondition(cond, ctx) → { satisfied, reason }` UI helper
Returns structured result so UI can display **why** an effect is/isn't active. "Needs AXE (have SWORD)" amber pill vs "AXE equipped ✓" green pill.

### 3.4 Primitive components
- **`<ToggleRow>`** — unified ability-row grammar (toggle dot, name, meta-right, gate badges, expand chevron). Used across Active Effects, States, Target Statuses.
- **`<ConditionBadge>`** — gate pill (amber/green, with padlock icon for unsatisfied).

### 3.5 ContextBar panel (NEW, top of left column)
Replaces current "Weapon Held" panel. Three cells:
- Weapon picker (slot 1/2/none) with weapon-type chip
- Dual Wield pill (active if both slots have compatible weapons)
- Chest armor readout (drives `equipment` conditions)

Drives: `weaponType`, `isDualWield`, `isUnarmed`, `gear.chest.equipped` for condition evaluation.

**Acceptance:** App.jsx renders with new state. ContextBar visible. Engine still gets correct data. No user-facing behavior change yet (new state has no effect without v3 systems).

---

## 8. Phase 3 — v3 Systems (Engine + UI in parallel)

**Goal:** Implement every new v3 concept. Engine work (new collectors) and UI work (new panels/controls) can run in parallel.

### Engine side (parallelizable within itself)

#### 4.E.1 Stacking (`src/engine/collectors/stacking.js`)
Expands `ability.stacking.perStack` × `ctx.selectedStacks[abilityId]` into effects. Skip if count is 0 or parent ability isn't active.

#### 4.E.2 HP-scaling (`src/engine/collectors/hp-scaling.js`)
Not a standalone collector — a post-processor called after all collection:
```js
const steps = Math.floor((100 - ctx.hpPercent) / effect.hpScaling.per);
const effValue = Math.min(steps * valuePerStep, maxValue);
```

#### 4.E.3 Summon casterEffects (`src/engine/collectors/summons.js`)
If `activeSummons[abilityId]`, yield `ability.summon.casterEffects[]`.

#### 4.E.4 After-effects (`src/engine/collectors/after-effects.js`)
Mutual exclusion: if `activeAfterEffects[id]` AND parent NOT active AND no `removedBy` ability is active.

#### 4.E.5 Status effects on target (`src/engine/collectors/status.js`)
When user toggles a status in Target Editor, the engine looks up which equipped ability applies it (`ability.appliesStatus[].type === ...`) and uses that ability's specific values. For stackable statuses (poison), multiplies by `activeStatuses[type].stacks`.

#### 4.E.6 Merged spells (`src/engine/merged-spells.js`)
```js
deriveAvailableMergedSpells(classData, selectedSpells): Ability[]
computeMergedSpellCooldown(mergedAbility, comps, spellCooldownMultiplier): number
```

#### 4.E.7 Ability modifiers (`src/engine/ability-modifiers.js`)
```js
applyAbilityModifiers(ability, activeModifierSources): Ability  // shallow-clone, decorate duration/cooldown/castTime/charges
```
Order: all `multiply` first, then all `add`. Pure — display-only, never feeds stat pipeline.

### UI side (parallelizable within itself)

#### 4.U.1 ActiveEffectsHub redesign
Single panel with three stacked sections (not tabs):
- **Toggles** — all `activation: "toggle"` abilities, summons, onBreak sub-toggles
- **Stacks** — stacking abilities with `<StackPicker>`
- **Afterglow** — `afterEffect` toggles under their parents

Badge counts on section headers. Empty sub-sections hidden.

#### 4.U.2 `<StackPicker>` + `<StackBreakdown>`
Pip row (0..maxStacks). Expanded card shows per-stack effect table with cumulative total.

#### 4.U.3 `<HpSlider>` + BodyPanel
Shared slider drives all `hpScaling` effects. Legend below shows live contributions ("Berserker: +8% · Elemental Fury: +20%"). Hidden when no hpScaling abilities are active.

#### 4.U.4 `<TierSelector>`
Three-segment (poor/good/perfect) control. Expanded shows all three tiers with selected highlighted.

#### 4.U.5 StatesPanel
Chip row, derived from equipped abilities' `player_state` conditions. Hidden when no player_state abilities equipped. Mutually exclusive groups where relevant.

#### 4.U.6 TargetPanel statuses
Row below existing PDR/MDR editor. Chips grouped by category (DoT / Debuff / Control). Per-source selector when multiple abilities apply same status with different values.

#### 4.U.7 Specialized components
- `<AfterEffectToggle>` — indented under parent, disabled+struck-through when `removedBy` active
- `<SummonCard>` — toggle + stats + damage lines in DamageOutputPanel
- `<MergedSpellCard>` — Venn-diagram visual, derived availability display
- `<AbilityModifierBadge>` — "+50% dur" pill on modified abilities

**Acceptance:** All v3 systems functional with Warlock/Druid data (even if class-specific abilities haven't been authored yet, the infrastructure works on test fixtures). Stacking count drives stat changes. HP slider drives derived stats. Target statuses modify damage.

---

## 9. Phase 4 — Remaining Class Creation (Waves)

**Goal:** Create classes 4-10 (Barbarian onward). Warlock, Druid, Fighter are already in v3 from Phases 1 and 1.5.

### Conversion workflow (per class)
1. Open `docs/classes/<class>.csv` alongside class JS file
2. Hand-author ability objects matching v3 shape
3. Inline `// CSV: <class>.csv L<row>` comment per ability for traceability
4. `_unverified: "..."` for values needing in-game testing
5. `passives: {}` escape hatch for non-computable mechanics only
6. Run per-class acceptance test

### File structure
- Single file per class for 8 classes: `src/data/classes/<class>.js`
- **Sorcerer and Bard split into directories** (many merged spells / musics):
  ```
  src/data/classes/sorcerer/{index,perks,skills,spells,merged-spells}.js
  src/data/classes/bard/{index,perks,skills,musics/{drum,flute,lute,lyre}}.js
  ```

### Wave order (validated with prerequisites)

> Waves A (Warlock) and B-partial (Druid + Fighter) completed in Phase 1 / 1.5.

**Wave B — Barbarian (parallelizable with Wave C)**
- hpScaling (Berserker), stacking (Combo Attack, Carnage, Sprint), weapon_type (axe, two_handed), equipment condition (Savage), impactPower, Robust 7.5% note

**Wave C — Ranger + Rogue (2-way parallel)**
- Ranger: weapon_type (bow, crossbow, ranged, spear), player_state (reloading, bow_drawn), grantsWeapon, drawSpeed
- Rogue: player_state (hiding, crouching), stackable status (Poisoned Weapon maxStacks=5), backstabPower, armorPenetration

**Wave D — Cleric + Wizard (2-way parallel)**
- Cleric: charges cost, shield with damageFilter (Protection), party target, flatDamageReduction (Perseverance), abilityModifiers (Requiem → Resurrection), undead damage bonus
- Wizard: status effects (burn, frostbite, electrified), spellChargeMultiplier (Spell Overload), scaling shield (Arcane Shield 15(0.5)), stacking (Arcane Feedback)

**Wave E — Sorcerer (serial)**
- cost: { type: "cooldown" }, 16 merged spells with `components[]`, spellCooldownMultiplier, casterEffects on Summon (Earth Elemental), unarmed weapon_type, dual_casting state
- Icebound: explicit passives (`damageImmune`, `movementDisabled`, `actionsDisabled`, `shatterableByImpact`)

**Wave F — Bard (serial)**
- type: "music", performanceTiers, music slots, playing_music/drunk states, instrument-as-weapon (Reinforced Instruments), party AoE
- Charismatic Performance: `abilityModifiers.modify: "performanceTier", value: "promote"` — uniform one-tier promotion (poor→good, good→perfect, perfect→perfect). Effectively removes "poor" as an outcome.

### Per-class acceptance criteria
- Class loads without `defineClass` warnings
- Every CSV row has a corresponding JS ability (CSV acceptance test)
- Class-specific regression test passes
- No typos in STAT_META references (defineClass catches these)

---

## 10. Phase 5 — Persistence (Fresh URL Schema)

**Goal:** Shareable builds preserve all v3 state. **No backwards compat** — existing shared URLs break on refactor, which is acceptable for a WIP simulator.

### Fresh schema (single version, no V1 compat)
```js
{
  v: 1,  // v3 project, but URL schema starts fresh at v:1
  class, weapon, religion, gear, theme,
  selectedPerks, selectedSkills, selectedSpells,
  selectedTransformations, selectedMusics,
  activeBuffs, activeForm, activeWildSkill,
  activeSummons, activeAfterEffects,
  selectedStacks,           // { [abilityId]: number }
  hpPercent,                // 0..100
  selectedPerformanceTier,  // { [abilityId]: "poor"|"good"|"perfect" }
  playerStates,             // { [state]: boolean }
  targetStatuses,           // { [statusType]: boolean }
  targetStatusSource,       // { [statusType]: abilityId }
  equippedWeapon,           // derived from gear but user-overridable (for unarmed)
  activeMergedSpells,       // [abilityId]
  target,                   // { pdr, mdr, headshotDR }
}
```

### No migration path
- No `migrateV1ToV2` function. No V1 decode. No compat layer.
- Rewrite `src/utils/build-url.js` from scratch to v3 schema
- `src/schemas/build.js` — single fresh schema, no legacy kept around
- Existing V1 URLs return `null` on decode → user sees the default empty build, fine

### Zod schemas
- `BuildSchemaV3` with enums: `PlayerStateKeySchema`, `PerformanceTierSchema`, `StatusTypeSchema`, `WeaponTypeSchema`
- Unknown values stripped (Zod default)
- Values out of range clamped or rejected

### Tests (`src/utils/build-url.test.js`)
- Round-trip matrix: `encode(decode(encode(x))) === encode(x)`
- Every new field populated round-trips exactly
- Malformed inputs return null silently
- Old V1 URLs return null (no migration attempted)

---

## 11. Phase 6 — Polish

### 7.1 Baseline/delta comparison mode
Header button: "Pin Baseline" freezes current stats. Subsequent changes show delta indicators on affected rows (`ppb: 48% → 62% (+14%)`). Unpin to clear.

### 7.2 Creative visualizations (theme-aligned)
- HP slider as bleeding wound (drip pattern at low HP, ember outline with Berserker)
- Stack pips themed per-class (Warlock candles, Barbarian axe notches, Sorcerer arcane glyphs)
- Tier selector as musical staff with ornaments
- Merged spell cards as Venn-diagram of component tints
- Status chips per category (amber DoTs, azure debuffs, crimson CC)

### 7.3 Mobile breakpoint (<900px)
Two-column → single column. ContextBar stacks. HP slider becomes larger touch target. Stack pips → segmented buttons.

### 7.4 Cleanup
- Delete `src/engine/derived-stats.js` (legacy)
- Delete `COMBAT.ANTIMAGIC_REDUCTION` (Antimagic now data)
- Delete `passiveEffects` branches (superseded by `effects[]`)
- Delete `computeAttrBreakdown` (replaced by pipeline trace)

---

## 12. Testing Strategy (Cross-Cutting)

### Categories
1. **Engine unit tests** — per-recipe, per-condition-type, per-collector
2. **Pinned regression** — Warlock + Druid known builds (frozen snapshots)
3. **Per-class smoke** — each class loads, defineClass passes, all stats compute finite
4. **URL round-trip** — encode↔decode symmetry, malformed rejection (no V1 compat)
5. **CSV acceptance** — parse CSV, verify every row has matching JS ability

### Coverage goals
- Every pipeline phase exercised
- Every condition type tested
- Every trigger event evaluated
- Warlock + Druid regression locked
- Every URL schema field round-tripped

---

## 13. Open Questions & Flags

### Resolved decisions
1. **Music memory capacity** — Shared pool with spell memory. `ds.memoryCapacity` covers both.
2. **`multiplicative_layer` stacking** — RESOLVED: stacks multiplicatively (0.80 × 0.80 = 0.64 = 36% reduction).
3. **`afterEffect.removedBy`** — RESOLVED: checks if the listed perk is EQUIPPED (`selectedPerks`), not "toggled on." The perk's mere presence prevents the penalty.
4. **`defensive_stance` / `blocking`** — RESOLVED: single state `player_state: "defensive_stance"`. Successful-block effects become `triggers: [{ event: "on_successful_block", ... }]` with a user-toggleable "just blocked" state.
5. **Charismatic Performance** — RESOLVED: `abilityModifiers.modify: "performanceTier", value: "promote"`. Uniform one-tier promotion (poor→good, good→perfect, perfect→perfect). UI can filter "poor" from the tier selector when this perk is equipped.
6. **Sorcerer Icebound** — RESOLVED: explicit passives (`damageImmune`, `movementDisabled`, `actionsDisabled`, `shatterableByImpact`) for reusability.
7. **Blood Pact** — Modeled as skill-with-toggle (complex effect bundle), not transformation. Skill replacement ("fist-heal", "bare-hand Dark Bolt") deferred as `_unverified` / `passives.altSkills` for v1.
8. **Trace for breakdown UI** — Every effect carries `{ source, ability, effect, phase, appliedValue }` through the pipeline. Enables "where did this +20 AR come from?" display. Replaces `computeAttrBreakdown`.
9. **No backwards compat** — No V1 URL migration path, no legacy shape adapters, no "mirror current behavior" intermediate stages. Fresh v3 code everywhere.
10. **Class-first engine** — Warlock is created fresh from CSV AS PART of building the engine (Phase 1 atomic). No engine-in-isolation.
11. **Gear system** — Keep. `aggregateGear` and gear shape are clean. Two data-completeness gaps to address when building/updating example items: weapon items need `weaponType` field populated (for `weapon_type` conditions), armor items need `armorType` field (for armor conditions). UI gear editors should expose these as dropdowns in Phase 2 if not already.
12. **Example build IDs** — The example build adapts to the new Warlock's IDs, not the other way around. Old IDs have no authority.

### Future considerations (no action needed)
- **Lower cap overrides** — Current `Math.max` rule assumes caps only get raised. If Season 9 adds cap-lowering debuffs, revisit.
- **Cross-ability stacking reads** — Blood Pact consuming Soul Collector stacks is treated as independent composed toggles for v1 simplicity.

### Parallelization
Phase 3 engine work and UI work are fully parallelizable with each other. Waves in Phase 4 allow parallel class implementation.

---

## 14. Critical Files

### Engine (new)
- `src/engine/context.js`
- `src/engine/conditions.js`
- `src/engine/recipes.js`
- `src/engine/effect-pipeline.js`
- `src/engine/collectors/{perks,buffs,transformations,religion,stacking,hp-scaling,summons,after-effects,status,index}.js`
- `src/engine/merged-spells.js`
- `src/engine/ability-modifiers.js`
- `src/engine/validation.js`
- `src/engine/index.js` (barrel)

### Engine (refactor)
- `src/engine/derived-stats.js` — gutted, eventually deleted
- `src/engine/aggregator.js` — keep `aggregateGear` only
- `src/data/constants.js` — new enums/sets, PATCH_HEALTH_BONUS
- `src/data/stat-meta.js` — 20+ new stat entries

### Data (rewrite)
- `src/data/classes/define-class.js` (new)
- `src/data/classes/{warlock,druid,fighter,barbarian,ranger,rogue,cleric,wizard}.js`
- `src/data/classes/sorcerer/` (directory)
- `src/data/classes/bard/` (directory)
- `src/data/classes/index.js` (registry)

### UI (new)
- `src/components/ContextBar.jsx`
- `src/components/BodyPanel.jsx`
- `src/components/StatesPanel.jsx`
- `src/components/ActiveEffectsHub.jsx` (redesign)
- `src/components/ui/{ToggleRow,ConditionBadge,StackPicker,StackBreakdown,HpSlider,TierSelector,StatusChip,SummonCard,AfterEffectToggle,MergedSpellCard,AbilityModifierBadge,ChargeMeter}.jsx`

### UI (refactor)
- `src/App.jsx` — state scaffolding, `buildEngineContext` seam
- `src/components/TargetEditor.jsx` — add status panel

### Persistence
- `src/schemas/build.js` — fresh v3 schema (no legacy)
- `src/utils/build-url.js` — fresh encode/decode (no compat)

### Tests
- `src/**/*.test.js` (vitest-native)
- `src/engine/__tests__/` (expected-value tests from CSVs + formulas, not snapshots of old behavior)

---

## 15. File Lists: Archive vs Reference

### Files ALREADY DELETED (scorched earth, pre-Phase 0)

The following were deleted pre-session so there is no "old code" to accidentally reference. The app does not run in this state — Phase 0 + 1 restore it.

| File | Rebuilt in |
|---|---|
| `src/App.jsx` | Phase 1 |
| `src/data/classes/warlock.js` | Phase 1 |
| `src/data/classes/druid.js` | Phase 1.5 |
| `src/data/classes/fighter.js` | Phase 1.5 |
| `src/data/classes/index.js` | Phase 1 (new registry) |
| `src/data/constants.js` | Phase 0 |
| `src/data/index.js` | Phase 1 (new barrel) |
| `src/data/example-builds.js` | Phase 1 (fresh Blood Tithe with new IDs) |
| `src/engine/derived-stats.js` | Phase 1 (recipes.js replaces) |
| `src/engine/index.js` | Phase 1 (new barrel) |
| `src/engine/tests.js` | Phase 0 (vitest replaces) |
| `src/schemas/build.js` (& `src/schemas/` dir) | Phase 5 |
| `src/utils/build-url.js` | Phase 5 |

### Files still pending deletion (require replacement first)

_(None at this point — all scheduled deletions complete.)_

### Files KEPT (reusable; no delete planned)

| File | Notes |
|---|---|
| `src/main.jsx` | Vite entry |
| `src/engine/curves.js` | Pure curve math |
| `src/engine/damage.js` | Verified damage formulas |
| `src/engine/aggregator.js` — `aggregateGear` | Clean gear aggregation |
| `src/utils/format.js` | Display formatters |
| `src/data/gear-defaults.js` | Empty gear factory |
| `src/data/stat-meta.js` | **Expanded** (Phase 0) with v3 stat keys — not rewritten |
| `src/data/religions.js` | **Updated to v3 shape** (done: effects have `phase`, `cdr` → `cooldownReductionBonus`, `label` dropped) |
| `src/data/index.js` | Barrel — updates naturally as imports shift |
| `src/components/gear/slots.js` | Slot definitions |
| `src/components/ui/*` | UI primitives (Panel, Collapsible, InfoTip, HoverTip, AttrTooltip) |
| `src/components/charts/*` | CurveChart, MarginalBadge |
| `src/components/stats/StatRows.jsx` | Stat row renderer |
| `src/components/gear/*` | Gear editors (GearSlot, WeaponEditor, ArmorEditor, StatRowEditor, StatSection) |
| `src/components/TargetEditor.jsx` | Extended in Phase 3 with status panel row |
| `src/components/ClassPicker.jsx` | Landing page (updates as classes come online) |
| `src/components/ExampleBuildPicker.jsx` | Example picker |
| `src/styles/*` | Theme system (theme.js, themes/, ThemeProvider, fonts.css) |

### Files UPDATED (Phase 1 data changes, not rewrites)

| File | Change |
|---|---|
| `src/data/example-builds.js` | Blood Tithe example updated to new Warlock IDs. Weapons gain `weaponType` field, armor gains `armorType` field. `build()` factory returns v3 state defaults (hpPercent: 100, selectedStacks: {}, etc.) |

### Resources to REFERENCE when building new

| Resource | Purpose |
|---|---|
| `docs/ability_data_map_v2.md` | **Data shape spec** — the v3 data map |
| `docs/classes/*.csv` | **Source of truth for all 10 classes** |
| `docs/health_formula.md` | Verified health formula (22 test points) |
| `docs/damage_formulas.md` | Verified physical/magical damage math |
| `docs/healing_verification.md` | Verified healing formula |
| `docs/season8_constants.md` | Global caps, derived stat formulas |
| `docs/unresolved_questions.md` | Open questions + testing protocols |
| `docs/gear_reference.md` | Gear item schema, slot pools, exclusion rules (reference only — not authoritative) |
| `docs/implementation_plan.md` | This plan |
| `data/stat_curves.json` | Verified piecewise curves (17 total) |
| `src/engine/curves.js` | Pure curve math — reused |
| `src/engine/damage.js` | Verified damage formulas — reused |
| `src/engine/aggregator.js` — `aggregateGear` only | Clean gear aggregation — reused |
| `src/styles/theme.js` + `themes/blood-tithe.js` | Theme tokens — extended with new status colors |
| `CLAUDE.md` | Project context |
| Zod (npm) | Schema validation |
| vitest (npm) | Test framework |

**Principle:** When creating any new class/module, the only allowed references are from List B. Opening a file from List A defeats the purpose of "no legacy."

---

## 16. Guiding Principles (recap)

1. **Snapshot principle** — engine is a pure function of toggle state; temporal fields are display metadata
2. **The Seam** — `buildEngineContext()` is the only UI↔engine boundary
3. **Data-driven** — new abilities should be a data change, not a code change
4. **Fail loud, fail closed** — unknown stats/phases/conditions are warnings at class load, not silent runtime bugs
5. **Conditions are visible** — gated effects show their gate state, not silently hidden
6. **Every toggle-able thing is explicit** — stacks, HP%, tiers, statuses, after-effects, summons all have user-controllable inputs
7. **Requirements-driven tests** — tests derived from CSVs + verified formulas, never from current code output

This plan is the contract. The v3 data map is the shape. The CSVs are the source of truth for game mechanics.
