# Class-shape consolidation — progress

In-flight state of the class-data shape work. Read `docs/perspective.md` first for the mental model.

---

## The files

- **`src/data/classes/class-shape.js`** — the schema. Every field authored across the 10 class files is mapped here: class root, ability, atoms, sub-shapes. Confirmed fields are present; `OPEN` in a comment means the shape is still under discussion.
- **`src/data/classes/class-shape-examples.js`** — 17 concrete examples drawn from actual class data, expressed in the consolidated shape. Reference for authors, not real class data.

Real class data (`barbarian.js`, `warlock.js`, etc.) has NOT yet been rewritten to this shape. Migration happens after the shape is fully locked.

---

## Locked decisions

### Ability shape — base
- Every ability has: `id`, `name`, `type`, `desc`, `activation`, `tags`, `effects`.
- `type` is `"perk" | "skill" | "spell" | "transformation"`.
- `activation` is `"passive" | "toggle" | "cast"`.
- `desc` absorbs all flavor with no engine role (invisibility, range, radius, most of the former `passives` bag, in-game causation prose).
- `tags` are kept only when referenced by selectors (abilityModifier-style stat groupings, condition dispatchers). Flavor tags belong in `desc`.

### Atoms — the 4 fundamental units
- **`STAT_EFFECT_ATOM`** — stat contribution through the aggregator. `stat`/`value`/`phase` are all optional; absent = display-only marker (bare CC).
- **`DAMAGE_ATOM`** — damage projection; runs through `applyDamage`.
- **`HEAL_ATOM`** — heal projection; runs through `calcHealing`.
- **`SHIELD_ATOM`** — damage-absorb layer.

Each atom carries its own `target`, `condition`, `duration`, optional `tags` (grouping labels), and optional stacking (`maxStacks` OR `resource`, not both).

### Atoms — field semantics
- `duration` — per-atom lifetime in seconds. Absent = lives while parent ability is active.
- `tags` — array of named grouping labels from the atom-tag vocabulary (status + CC names, e.g. `"poison"`, `"frostbite"`, `"fear"`, `"knockback"`). UI groups atoms with any shared tag under that name in tooltips. No engine math depends on `tags`.
- `maxStacks` — single-atom local stacking; count in `ctx.stackCounts[abilityId]`.
- `resource` — shared/grouped stacking via a `classResources` entry; count in `ctx.classResources[resourceId]`. Contribution = `atom.value × currentStackCount`.
- `source` — engine-populated at Stage 1 by collectors; NOT authored.

### Sibling containers (parallel to `effects`)
- `damage: DAMAGE_ATOM[]`
- `heal: HEAL_ATOM` (singular — most abilities author one)
- `shield: SHIELD_ATOM` (singular)
- `afterEffect: AFTER_EFFECT` (wrapper kept — explicit separation of trailing penalty phase)

### Dissolved wrappers (absorbed into atoms)
- **`triggers`** — snapshot model has no event firing; trigger payloads decompose into atoms with conditions.
- **`stateChange`** — player states are user toggles; the UI surfaces a state toggle when conditions reference it.
- **`cc`** — named type + duration is a `STAT_EFFECT_ATOM` with no stat/value/phase payload (display-only marker).
- **`appliesStatus`** — status name becomes a value in the atom's `tags` array; DoT becomes a damage atom; stat debuffs become stat_effect atoms with `target: "enemy"`; maxStacks / condition move onto the atoms.
- **`stacking`** — atoms carry their own `maxStacks` (single-atom) or `resource` (shared/grouped).
- **`performanceTiers`** — atoms gate via `condition: { type: "tier", tier: "poor | good | perfect" }` reading `ctx.selectedTiers[abilityId]`.
- **`abilityModifiers`** — ability-property modifications become tag-scoped stats in STAT_META (e.g. `shoutCooldownBonus`, `arcaneCastTimeBonus`). Standard stat contributions. STAT_META grows; uniformity wins.

### Resource system — `classResources`
- Declared at the class root. Live stack counts in `ctx.classResources[resourceId]`.
- Required when atoms need to share a stack count — either across abilities (shared pool) or within one ability (multi-atom grouped).
- **Not** required for single-atom local stacks; use per-atom `maxStacks` instead.
- Each entry has `maxStacks`, `desc`, and optional `condition` (absent = persistent; present = UI shows the counter only when the condition is true).
- Contribution math per atom: `atom.value × currentStackCount`.
- Snapshot-target resources (e.g. Blood Pact's `blood_pact_locked_shards`) are just another declared resource scoped via `condition`. The in-game snapshot mechanic lives in the resource's `desc`; the engine treats source and snapshot as independent counters.

### Conditions
- `tier` condition variant added (for Bard performance tiers): `{ type: "tier", tier: "poor | good | perfect" }`.
- Cancellation is expressed via the `not` compound condition. No `removedBy` keyword, no cancellation-specific field.

### Availability changes — `grants[]` / `removes[]`
- Two sibling containers parallel to `effects / damage / heal / shield`. Each atom carries an explicit `type` discriminator (`"ability" | "weapon" | "armor"`), an id field, and optional `condition` (ctx-gating).
- `grants[]` adds availability. `costSource: "granted" | "granter"` on ability grants controls cost display: `"granted"` (default) = granted ability pays its own cost; `"granter"` = granter's cost governs delivery.
- `removes[]` removes availability. `tags` field filters within the `abilityType` category (e.g. `tags: ["spirit"]` to remove only spirit-tagged spells). `condition` gates on ctx (WHEN), `tags` filters (WHAT).
- Absorbs the former `grantsSpells`, `grantsSkills`, `grantsWeapon`, `grantsArmor`, `removesArmor`, `disables` fields.
- Known consumers: Blood Pact → grants bolt_of_darkness + exploitation_strike + exit_demon_form; Orb of Nature → grants natures_touch; Ranger Spear Proficiency → grants spear weapon; Warlock Demon Armor → grants plate armor; Fighter Slayer → removes plate armor; Druid Lifebloom → removes all transformations; Druid Shapeshift Mastery → removes spirit-tagged spells.
- In-game causal prose ("castable bare-handed while in demon form", "delivered to allies on hit") lives in `desc`. Structure only carries the availability fact.

### Blood Pact — skill, not transformation
- `type: "skill"`, `activation: "toggle"`, lives in `skills[]`. No `form` block.
- The "demon form" is narrative only — no replacement attacks, no wild skill, no attribute scaling.
- Sub-abilities (Exploitation Strike, Exit Demon Form, Bolt of Darkness) are reached via `grants[]`.
- All its effects and damage atoms gate on `{ type: "effect_active", effectId: "blood_pact" }` — the standard toggle-active check (pending the `isActive` clarification in open item 1).

### Transformations fold into `spells[]`
- `transformations[]` top-level array removed. All transformations move into `spells[]` keeping `type: "transformation"`.
- `ability.type` is the slot-pool discriminator: `"spell"` → spell memory pool, `"transformation"` → shapeshift memory pool, `"music"` → music memory pool.
- `form` block dissolves. Replacement attacks and wild skills become regular skills in `skills[]`, each ability-level-gated on `{ type: "effect_active", effectId: "<form_id>" }`, linked back via `grants[]` on the transformation.
- Shapeshift attack damage atoms carry `scalesWith: { curve: "shapeshiftPrimitive", attribute: "<attr>" }` to direct the engine to the correct curve + attribute instead of the default damage-type dispatch.
- Replacement attacks need to replace the weapons in the "Weapon Held" display (UI concern, separate from data shape).

### `mergedSpells` — Sorcerer auto-derived spells
- Sorcerer-only top-level array `mergedSpells[]` at class root. Stays separate from `spells[]` because of distinct semantics (auto-derived, not user-selectable, no memory cost, separate UI panel).
- Each merged spell uses ability-level `condition` with `ability_selected` for its prerequisites. Example: Aqua Prison has `condition: { type: "all", conditions: [{ type: "ability_selected", abilityId: "water_bolt" }, { type: "ability_selected", abilityId: "levitation" }] }`.
- The dedicated `requires` field is dropped — replaced by the standard `condition` mechanism.
- Engine behavior: when condition is true, the merged spell's atoms project (damage/effects/etc. flow through normal pipeline). When false, atoms don't fire — but UI still renders the spell card in the merged panel (greyed/locked, with prerequisites read from the condition for display hints).
- Never enters `selectedSpells`; doesn't consume memory; array membership is the structural signal for "merged, auto-derived."

### `armorProficiency` — gear selection gating
- Renamed from `armorRestrictions` (misleading name — the array holds what's *allowed*, not what's restricted).
- Class-root field. Base set of armor types the class can equip (`["cloth", "leather"]` for Wizard/Warlock/Druid/Sorcerer/Rogue; `["cloth", "leather", "plate"]` for Fighter/Barbarian/Cleric/Bard/Ranger).
- **Engine role**: gates gear selection for the character. Two cases when validating a gear piece:
  1. Gear names specific classes → wearable iff the character's class is in that list AND the gear's armor type is not in `removes[]`.
  2. Gear names only the armor type (no class list) → wearable iff the armor type is in `armorProficiency` OR in `grants[]`, AND not in `removes[]`.
- Modifiers come from perks via `grants[]` / `removes[]`: Warlock Demon Armor grants `{ type: "armor", armorType: "plate" }`; Fighter Slayer removes `{ type: "armor", armorType: "plate" }`.

### Bard musics retype to `type: "music"`
- Bard's music spells change from `type: "spell"` to `type: "music"` to align with the in-game music book.
- `music_memory_1`/`_2` skills update from `slots: { type: "spell" }` to `slots: { type: "music" }`.
- Same ability-type-as-slot-pool-discriminator pattern as transformations.

### Display projections (not engine-gated)
- `duration`, `cooldown`, `castTime` at the ability level — computed against character modifiers + tag-scoped stats. Shown in tooltips. The engine doesn't evaluate them for gating.
- `targeting` — display-only metadata about in-game target selection.

### Scope calls
- In-game causation (drinking ale → drunk, casting Rush → frenzy, Blood Pact copying Darkness Shards) lives in `desc` prose, not structural data.
- Invisibility, range, radius, doubleJump, peacemaking, and most of the current `passives` flag bag contents are display-only — they live in `desc`.
- `damageType` on `STAT_EFFECT_ATOM` was dropped. Today STAT_META uses `typeDamageBonus` with a `damageType` discriminator; future STAT_META cleanup may collapse this to typed stats (`fireDamageBonus`, etc.) making the field unnecessary.

---

## Open items (in dependency order)

1. **`isActive` / `effect_active` / `ability_selected` — resolved.** `activation` expands from 3 to 4 values to carry sim-behavior distinctions directly; condition variants split loadout-membership from state-activation:

   **`activation` values:**
   - `passive` — always on when selected (perks, passive skills)
   - `cast` — instant projection, no caster-side state (Dark Bolt, Fireball, Slow)
   - `cast_buff` — cast that produces caster-side buff (Haste, Ignite, Bloodstained Blade)
   - `toggle` — user-flipped on/off, persistent caster-side state (Blood Pact, Druid forms)

   **Condition variants:**
   - `{ type: "ability_selected", abilityId }` — true iff `abilityId ∈ selectedPerks ∪ selectedSkills ∪ selectedSpells`. Uniform across ability types.
   - `{ type: "effect_active", effectId }` — dispatched by ability's `activation`:
     - `passive` → selected
     - `cast_buff` / `toggle` → selected AND in `activeBuffs`
     - `cast` → never true (no persistent state; use `ability_selected` if loadout check is what's wanted)

   **`form_active` removed.** Druid forms and Blood Pact are all toggle abilities in `activeBuffs`. Mutual exclusion for Druid forms (only one form at a time) is enforced by UI; the engine's singleton `ctx.activeForm` stays for that purpose, but conditions check via `effect_active` uniformly.

   **Rule derives purely from `activation`** — no inspection of `duration`, which stays "Not engine-gating" per the class-shape.js comment. `duration.type: "buff"` remains pure display/DoT-math/modifier metadata.
2. **`darkness_shards` full condition — resolved.** `any(ability_selected: soul_collector, ability_selected: spell_predation)`.
3. **`blood_pact_locked_shards` second-half condition — resolved.** `all(effect_active: blood_pact, any(ability_selected: soul_collector, ability_selected: spell_predation))`.
4. **`FORM` dissolution — resolved.** Form block dissolves entirely per locked "Transformations fold into spells[]" decision. `formId` redundant with ability id; `scalesWith` moves to `scalesWith` on damage atoms; `attacks[]` and `wildSkill` become regular skills in `skills[]` granted via `grants[]`. Open sub-question: how replacement-weapon attacks interact with the "Weapon Held" display in the UI.
5. **`passives` flag bag split — resolved (shape-side).** Audit of ~90 unique keys across all classes. Every key fits an existing atom or lands in `desc`; only minor DAMAGE_ATOM extensions needed:
   - **Stat-like numerics** (`armorPenetration`, `lifestealOnDamage`, `healingReflection`, `executeThreshold`, `overhealCap`, `overhealDegenPerSecond`, `resurrectHealthFraction`, etc.) → STAT_EFFECT_ATOM contributions.
   - **Self-damage DoTs** (`selfDamagePerSecond`, `selfDamagePerSecondMaxHp`) → DAMAGE_ATOM with `target: "self"`, `isDot: true`, `tickRate`.
   - **Engine-recognized booleans** (`detectsHidden`, `invisibility`, `piercing`, `homing`, `damageImmunity`, `directionalShield`, `doubleJump`, etc.) → bare tagged atoms in `effects[]`.
   - **Pure flavor** (`herbDetection`, `stealItems`, `unlockContainers`, `drinkGrantsBless`, `pveOnly`, etc.) → `desc`.
   - **Structural misfiles** (`castTime`, `radius`, `range`, `cooldownGated`, `channeledAbility`, `altSkills`, `trailDuration`) → move to ability-level fields, `desc`, `tags`, or `grants[]`.
   - **Nested-in-stat** (`damageTransfer.rate/cap/cooldown`) → bare tagged atom with rich `desc`; snapshot doesn't simulate combat-time rerouting.
   - **Display-only toggles** (`nextSpellCastTime`) → bare tagged atom with `desc`.
   - **Resource/stacking** (`stepAllowance + moveSpeedPerStep`, `maxActive`) → existing `classResource` / `maxStacks` patterns.
   - **DAMAGE_ATOM extensions added**: `count` (replaces `projectileCount`, `missileCount`, `chains` — "number of hits per cast"). `chainRange` stays in `desc`.
   - **`maxChargeMultiplier`** → STAT_EFFECT_ATOM with `stat: "spellChargeBonus"`, value as a fractional bonus (e.g., 0.60 for +60%). Engine applies `charges × (1 + spellChargeBonus)`. Matches the `XBonus` multiplicative naming convention (`maxHealthBonus`, `moveSpeedBonus`, etc.). `STAT_META` entry added (renamed from the pre-existing `spellChargeMultiplier`).
   - **`memorySlots`** → STAT_META entry added for the `slots` dissolution. Flat unit; paired with `abilityType` discriminator on the atom.
   - **`hpScaling` unified into `scalesWith`.** `hpScaling` field on STAT_EFFECT_ATOM is removed; its contents move to `scalesWith: { type: "hp_missing", per, valuePerStep, maxValue }`. DAMAGE_ATOM's existing `scalesWith` gains the same `type` discriminator (`type: "attribute"` for shapeshift). Both atoms share a uniform polymorphic `scalesWith` field: "atom value derived from ctx input via type-dispatched formula."
   Actual per-class-data migration of passives into these forms is part of the real-class-data rewrite pass, not yet executed.
6. **`cost` unification — resolved.** COST simplified to `{ type, value }`. `percentMaxHealth` promoted from a separate field to a cost type. Every ability with a cost declares it fully (type + value) — no class-level default, no inheritance. `spellCost` at the class root removed. `memoryCost` is a separate field (memory slot consumption, not per-cast cost). See `class-shape-examples.js` for `bloodExchange` (percentMaxHealth) and `boltOfDarkness` (standard).
7. **`SUMMON` dissolution — resolved.** Summon wrapper dissolves into standard ability fields: `summon.damage[]` → parent `damage[]`, `summon.casterEffects[]` → parent `effects[]`, `summon.duration` → parent `duration`, entity name → `desc`. Boolean capabilities like `detectsHidden` become bare tagged atoms in `effects[]` (same pattern as bare CC markers: no stat/value/phase, just `tags` + optional `desc`). Narrative-only passives like `environmentBonus: "water"` move to `desc`. See `class-shape-examples.js` for concrete examples (`summonEarthElemental`, `summonHydra`).
8. **`engine_architecture.md` §2.3 Spell row refinement — unblocked.** Cleanup pass pending: rewrite §2.3's isActive table and Condition variants to reflect the locked `activation` expansion and `ability_selected` addition. Remove `form_active`.
9. **`memoryCost` backfill.** Non-Bard caster spells (wizard, warlock, cleric, druid, sorcerer) have Tier data in their CSVs that was dropped in the v3 class-data migration. Each spell's tier represents how many memory slots it occupies when equipped. Backfill as `memoryCost: N` during the real-class-data migration pass. Transformations have no per-form tier (uniform 1-slot consumption).
10. **`grants[]` / `removes[]` — resolved.** Locked as sibling containers. See "Availability changes" in locked decisions above.

### Not yet reviewed (fields present in class-shape.js with no explicit decision)
- `spellCost` at class root — removed per (6). Each ability declares its own cost fully.
- `slots` — dissolved. Memory skills now use `{ stat: "memorySlots", value: N, phase: "post_curve", abilityType: "spell | transformation | music" }` in `effects[]`. `abilityType` discriminator explicitly links the capacity to the ability type that consumes it. `slots` field removed from class-shape.js.
- `condition` at ability level (gates the entire ability, e.g. "requires axe") — still authored, no changes proposed.
- `_unverified` — annotation; kept as-is.

---

## Engine architecture open questions

Captured here for whichever phase builds the engine architecture doc. These
questions are about *how the engine evaluates the shape*, not about the
shape itself — so they don't block further class-shape work.

1. **`hp_below` condition creates a Stage 2 ↔ Stage 5 cycle.** RESOLVED by
   Phase 3 (commit `5f99a80`) per option (b): `hp_below` reads `ctx.hpFraction`
   (user-set), per snapshot-no-causation principle. No cycle.

2. **Stage 2 cache-key granularity.** RESOLVED by Phase 5 (commit `b47312d`)
   per `engine_implementation_plan.md` § 7: fine-grained dependency-declared
   key (Stage 2 reads ~20 declared `ctx` fields; gear-edit common case
   doesn't invalidate Stage 2 cache). Implementation deferred until
   measurement warrants per LOCK K; cache key composition spec'd in
   `src/engine/filterByConditions.js` module comment.

3. **Grant + condition interactions under-specified.** RESOLVED by Phase 6
   (commit `0e69523`). Two related findings the spec phases missed:
   - `effect_active` for **granted** abilities (e.g., Warlock Exploitation
     Strike granted by Blood Pact). The arch-doc's "selected AND in
     activeBuffs" wording would have evaluated false for granted abilities
     because they aren't directly in `selectedSkills`. Engine implements the
     rule as `cond.effectId ∈ ctx.activeAbilityIds` (which composes selection
     and grant correctly). Phase 10 awareness: any class whose grants chain
     into condition-gated effects (Druid forms granting form-skills with
     `effect_active: <form>`; Bard music memory granting music abilities;
     etc.) will work without further refinement.
   - **Fixpoint scoped ctx** during availability resolution. Conditions on
     grants/removes (e.g., Blood Pact's grants gated on `effect_active:
     blood_pact`) need a *live partial-resolution* view of `activeAbilityIds`
     during the iterative fixpoint. Engine implements this via a scoped ctx
     override per iteration. Phase 10 awareness: any class authoring grants
     with conditions referencing the granter ability will work without
     further refinement.

   Architecture doc updated to reflect both refinements (§ 3 pipeline table
   collectAtoms entry; § 11 effect_active dispatcher entry). Class-shape
   itself unchanged.

---

## How to continue

1. Read `docs/perspective.md` for the mental model.
2. Skim `src/data/classes/class-shape.js` top to bottom for the shape.
3. Skim `src/data/classes/class-shape-examples.js` for concrete patterns.
4. Pick up with open item 1.
5. After (1) lands, update the two `classResources` conditions in `class-shape.js`, then move on to the remaining open items in dependency order.
