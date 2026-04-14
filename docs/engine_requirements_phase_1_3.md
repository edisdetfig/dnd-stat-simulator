# Engine Requirements — Phase 1.3

> Tracking every engine / validator / stat-meta / UI capability that v3 class data
> depends on but isn't yet in code. Populated live during Phase 1.2 authoring.
> Phase 1.3 implements these and un-skips the per-class smoke tests.

---

## A. `src/data/constants.js` — enum additions

### EFFECT_PHASES

| Add | Rationale | First use |
|---|---|---|
| `post_cap_multiplicative_layer` | Locked per coordinator; replaces retired `antimagic_layer`. Applies multiplicatively AFTER capped DR (see docs/damage_formulas.md:182-188). | `warlock.antimagic` |
| `post_curve_multiplicative` | **LOCKED (D.25)** — in-game verified. Multiplies a derived stat's own value by `(1 + value)` AFTER all `post_curve` additives. Distinct from `post_cap_multiplicative_layer` (which multiplies final damage): this scales the STAT itself. Used for "X% of current" CSV phrasings. | `fighter.veteran_instinct` (PDR) |

### CONDITION_TYPES

| Add | Rationale | First use |
|---|---|---|
| `creature_type` | Condition gates effect on target's creature category (`undead`, `demon`). Reads `ctx.target.creatureType`. | `cleric.undead_slaying`, `warlock.infernal_pledge` |
| `damageType` | **LOCKED (D.8)**. Accepts `damageType: <value>` or `damageType: [<values>]` with optional `exclude: [<values>]`. Anchor: Antimagic "magic except divine". | `warlock.antimagic` |
| `all` | **LOCKED (D.24)**. Compound — `{ type: "all", conditions: [...] }`. Logical AND, evaluated recursively. | `fighter.sword_mastery` (sword + defensive_stance) |
| `any` | **LOCKED (D.24)**. Compound — `{ type: "any", conditions: [...] }`. Logical OR, evaluated recursively. Reserved; no current anchor. | — |

### STATUS_TYPES

| Add | Rationale | First use |
|---|---|---|
| `plague` | New status. 3(0.5) magical DoT. | `druid.rat` (form attack Infected Fangs) |
| `blind` | Moved from CC to status per vocab lock. Vision debuff. | `cleric.holy_strike` |
| `freeze` | Moved from CC to status per vocab lock. Immobilize-like with AS/MS debuffs. | `wizard.ice_mastery`, `sorcerer.frost_breath`, `sorcerer.icebound` |

### PLAYER_STATES

| Change | Rationale | First use |
|---|---|---|
| Add `in_combat` | New state. | `fighter.veteran_instinct` |
| Add `performing` | New state; distinct from `playing_music` (performing = mid-performance with tier resolution). | `bard.war_song`, `bard.encore` |
| Add `behind_target` | Replaces proposed `backstabPower` stat per vocab lock. | `rogue.back_attack` |
| Remove `blocking` | Collapsed into `defensive_stance`. | Fighter perks reference `defensive_stance`. |

### WEAPON_TYPES

| Add | Rationale | First use |
|---|---|---|
| `one_handed` | Weapon-type gating for one-handed-only abilities. | `fighter.dual_wield`, `fighter.pommel_strike` |
| `shield` | Held shield as a gated item. | `fighter.shield_mastery` |
| `spellbook` | Held spellbook for casters (completeness per locked WEAPON_TYPES). | future caster gating |
| `firearm` | Completeness per locked WEAPON_TYPES. | future |

### TRIGGER_EVENTS

Per Convention 4, trigger event labels are desc prose — no validated event field. The existing `TRIGGER_EVENTS` set and the `!TRIGGER_EVENTS.has(tr?.event)` check in `define-class.js:L60` should be dropped. Each `triggers[i]` block carries `desc` only (no `event` field).

---

## B. `src/data/stat-meta.js` — STAT_META additions

All additions come from CSV values that don't yet have a STAT_META entry. Duration-modifier stats carry `direction` and `tag` per Convention 13.

| Stat | Unit | Category | Direction / Tag | First use |
|---|---|---|---|---|
| `armorMovePenaltyReduction` | percent | utility | — | `fighter.swift` |
| `knockbackResistance` | percent | defense | — | `barbarian.iron_will` |
| `shoutDurationBonus` | percent | utility | caster / shout | `barbarian.treacherous_lungs` |
| `potionPotency` | percent | utility | — | `barbarian.potion_chugger` |
| `headshotPenetration` | percent | offense | — | `ranger.penetrating_shot` |
| `projectileSpeed` | percent | utility | — | `ranger.true_shot` |
| `switchingSpeed` | percent | utility | — | `bard.superior_dexterity` |
| `burnDurationAdd` | flat (seconds) | utility | caster / burn | `wizard.fire_mastery` |
| `drunkDurationBonus` | percent | utility | receiver / drunk | `cleric.brewmaster` |
| `knockbackPowerBonus` | percent | offense | — | `sorcerer.air_mastery` |
| `shapeshiftTimeReduction` | percent | utility | — | `druid.shapeshift_mastery` |
| `wildSkillCooldownReduction` | percent | utility | — | `druid.shapeshift_mastery` |
| `spellMemoryRecovery` | flat (per second) | utility | — | `bard.chorale_of_clarity` |

Reconcile: existing `curseDurationBonus` — add `direction: "caster", tag: "curse"` metadata (vocab Convention 13). Existing `wildSkillCooldown`, `shapeshiftCastTime` — either retire or alias to new entries; author path prefers `wildSkillCooldownReduction` / `shapeshiftTimeReduction` to reflect "reduction" semantics.

Retire: `backstabPower` (replaced by conditional `physicalDamageBonus` + `player_state: behind_target`).

Rename (completed 2026-04-13): `armorRatingMultiplier` → `equippedArmorRatingBonus`. The previous name implied a general AR multiplier (Reading A); the stat is actually source-scoped to gear-contributed AR only (Reading B, confirmed in-game). Rename applied to `stat-meta.js`, `stat-meta.test.js`, `recipes.js`, `recipes.test.js`, and Fighter Defense Mastery authoring. Defense Mastery phase also corrected `post_curve` → `pre_curve_flat` (matches engine routing — the stat lives in `bonuses`, populated by pre_curve_flat). First use: `fighter.defense_mastery`.

---

## C. `src/data/classes/define-class.js` — validator updates

**Display-only passive keys to accept (no stat-pipeline semantics):**
- `passives.maxChargeMultiplier` — Wizard Spell Overload (numeric).
- `passives.nextSpellCastTime` — Wizard Intense Focus (numeric).

---

1. **Drop `TRIGGER_EVENTS.has(tr.event)` check** (line 60). Per Convention 4, trigger events are desc prose — no enum enforcement.
2. **Accept `abilityModifiers[]`** — validate `modify ∈ {duration, cooldown, castTime, range, aoeRadius, cost}`, `mode ∈ {multiply, add}`, `target.tags | target.type | target.id` shape.
3. **Accept expanded STATUS_TYPES** (plague, blind, freeze) once constants.js updated.
4. **Accept `creature_type` condition** once CONDITION_TYPES updated.
5. **Validate `cost` shape** — `{ type ∈ {health, charges, cooldown}, value: number }`.
6. **Validate `duration` shape** — `{ base: number, type ∈ {buff, debuff, other}, tags?: string[] }`.
7. **Walk `form.attacks[].damage[]` and `form.attacks[].frenziedEffect.damage`** — currently not walked.
8. **Walk `summon.damage[]`** — currently not walked (casterEffects are).
9. **Walk `shield.*`** if any fields later carry effects (currently none).
10. **Class-root schema** — validate `baseAttributes` keys match CORE_ATTRS, `baseHealth` numeric, `maxPerks`, `maxSkills`, `armorRestrictions[]`, `spellCost.type`, optional `classResources`.

---

## D. Engine features

1. **Duration-direction math** (Convention 13 + Cat 33): apply caster-side flat adds → caster-side multipliers → receiver-side type multipliers + receiver-side tag multipliers → tick derivation. Anchor: Wizard Fire Mastery burn +2s flat add; Warlock Curse Mastery +30% curse mult; Cleric Brewmaster +50% drunk receiver-side.
2. **HP-scaling continuous** (`hpScaling.{per, valuePerStep, maxValue}`): engine reads `ctx.hpPercent`, steps through. Anchor: `barbarian.berserker`, `sorcerer.elemental_fury`.
3. **Form pipeline** (`collectTransformationEffects`): reads `ctx.activeForm`, routes `condition.form_active` effects and form attacks. Anchor: 5 Druid forms, Warlock `blood_pact`.
4. **`abilityModifiers.modify: "cost"`**: multiplies `cost.value` regardless of cost.type. Anchor: `warlock.torture_mastery`.
5. **`cost.type: "cooldown"` dispatcher**: Sorcerer's per-spell cooldown model as the unified cost path.
6. **Merged spell availability derivation** (`deriveAvailableMergedSpells`): cross-references `merged_spell.components` against `selectedSpells`.
7. **`post_cap_multiplicative_layer`** in damage pipeline: multiplies AFTER capped DR. Anchor: `warlock.antimagic`.
8. **Condition exclusion semantics** — e.g., Warlock Antimagic applies to all magic damage *except divine*. **LOCKED (D.8):** extend existing `condition.type: "damageType"` to accept `exclude: string[]` (or array-valued `damageType` with inversion). No new condition type. Evaluator takes optional `ctx.incomingDamageType`: when present, condition resolves precisely (per-attack use case); when absent, aggregate stat-panel display still credits the layer and surfaces the exclusion via tooltip qualifier generated mechanically from the `exclude` list. Same data shape serves both the aggregate stat panel and the future per-attack incoming-damage panel (see Section G).
9. **Status stacking** within `appliesStatus[]` — e.g., Rogue Poisoned Weapon maxStacks=5 per-hit stacking on the poison status. **LOCKED (D.9):** per-status stacking. `appliesStatus[i]` accepts `maxStacks: number` (already authored in Rogue Poisoned Weapon) and optionally a full `stacking: { maxStacks, triggerOn, consumedOn, perStack }` block with the same schema as ability-level stacking. Absence of `maxStacks` is the signal for maxStacks=1 (single-application, no stack slider). Engine: status-level ctx provides `stackCount` to damage scaling and effects within that status, independent of ability-level `ctx.stackCount`. Validator walks `appliesStatus[i].stacking` and `appliesStatus[i].maxStacks`. UI: LiveStatePanel surfaces a per-status stack slider when `maxStacks > 1`, distinct from ability-level sliders.

Inter-source stacking (e.g., same status type from two same-class, same-form abilities) is a render-time question, not an authoring-shape question. Default: each `appliesStatus[i]` is a source-scoped independent instance; display sums contributions. Cross-class / cross-form combinations are out of scope per build (one class, one form at a time).
10. **Primitive curve damage formula** for Druid form attacks (`druid.unresolved_questions.md:Druid Form Attack Damage Formula`). Engine math gap — author data best-faith, flag `_unverified`.
11. **Shared resource pool** across multiple abilities (Warlock Darkness Shards: Soul Collector, Spell Predation, Blood Pact share a 3-cap). **LOCKED (D.11):** split by nature of the value.

    - **Live pools** → new class-root `classResources: { [id]: { maxStacks, desc } }` block. Abilities that read the live pool use `stacking: { resource: "<id>", perStack: [...] }` (replaces inline `maxStacks`).
    - **Ability-local snapshots / per-ability accumulators** → existing ability-local `stacking: { maxStacks, perStack: [...] }` shape, unchanged. No `resource` pointer.

    Presence/absence of `stacking.resource` is the switch. Warlock migration: add `classResources.darkness_shards { maxStacks: 3 }` to class root; Soul Collector migrates to `stacking.resource: "darkness_shards"`; Blood Pact keeps ability-local `stacking` (snapshot-on-activation semantic emerges naturally from the snapshot model — no engine concept of "freeze" needed); Spell Predation remains desc-only producer reference.

    Validator: walks `classResources`; validates `stacking.resource` resolves. Engine: `ctx.classResources[id].count` populated from a single shared slider per resource; per-ability `ctx.stackCount` independent (unchanged). UI: LiveStatePanel renders "Class Resources" section with one slider per defined resource (always visible for that class); ability-local stack sliders remain under their abilities.

    Rationale: the Blood-Pact-plus-Soul-Collector scenario requires two independent counters (live pool 0–3 AND locked-in snapshot 0–3, up to +6 all attrs / +198% dark at full stack). One shared slider cannot represent this. Two sliders (one resource + one ability-local) match the distinct game-state values exactly.
12. **Self-damage DoT** — Warlock Dark Offering (10%/s), Warlock Blood Pact demon form (1%/s). **LOCKED (D.12):** distinguish by mechanic nature.

    - **Costs** (unmitigated flat % max HP drain): author as `passives.selfDamagePerSecond: number` on the ability. Engine aggregator sums across active abilities; derived stats expose `selfHpDrainRate` (percent) and `selfHpDrainPerSecond` (flat = rate × maxHealth). Stat panel renders a "Self HP Drain /s" row when nonzero; tooltip lists contributing abilities.
    - **Mitigated self-damage** (future — damage that respects DR/resistances/type bonuses): author as `damage[{ ..., target: "self", isDot: true }]`. Same damage pipeline as outgoing, just self-targeted.

    Warlock's existing `passives.selfDamagePerSecond` entries (Dark Offering 0.10, Blood Pact 0.01) are correct as-is under the "cost" shape; no migration. Author picks which shape based on whether defenses apply in-game.
13. **Any-form gating** — Druid Enhanced Wildness "while in any form." Author as `condition: { type: "form_active" }` with no specific `form` value → "any form active." Engine must interpret omitted `form` field as "any."
14. **Trigger-block own-duration for on-hit debuffs** — Wizard Melt and Cleric Faithfulness apply a timed debuff to a target through a trigger; trigger.effects have no duration field in current shape. **LOCKED (D.14):** allow `triggers[i].duration: { base, type, tags? }` — same schema as ability-level `duration` and `appliesStatus[i].duration`.

    Authoring rule (falls out of data, no memo needed): **named in-game status → `appliesStatus[]`; nameless timed trigger effect → `triggers[i].duration + effects[]`.**

    Migration: Wizard Melt gets `duration: { base: 2, type: "debuff" }`; Cleric Faithfulness gets `duration: { base: 1, type: "debuff" }`. Warlock Exploitation Strike (F-item — Blood Pact form attack "2s bleed-like debuff") also authored via this shape — resolves the `passives.debuffDuration` placeholder.

    Validator walks `triggers[i].duration`. Effect evaluator treats trigger-scoped effects as target-applied debuffs with the trigger's duration; direction-modifier math (Convention 13) applies per standard rules. Snapshot semantics: toggle on = effects applied indefinitely; duration is display metadata for tooltip + modifier math only.
15. **Merged-spell cooldown derivation** — `deriveMergedSpellCooldown(mergedSpell, components)`: per CSV Sorcerer Class Notes, a merged spell cannot re-cast until both components are off cooldown. Effective CD ≈ max of components' CDs (gated on both being available). Tracker D.6 covers availability; this row covers derived cooldown surfacing in UI.
16. **Multi-CC per ability** — Sorcerer Aqua Prison applies BOTH trap (3s) AND lift (3s); current shape is singleton `cc: { type, duration }`. **LOCKED (D.16):** `cc` becomes an array — `cc: [{ type, duration, tags? }, ...]`. Single-CC abilities author as `cc: [{...}]`.

    Rationale: consistency with other multi-entry blocks (`damage[]`, `appliesStatus[]`, `effects[]`, `triggers[]`); accurate tooltip rendering per-entry; duration-modifier math (e.g., `trapDurationBonus`) surfaces correctly per-entry; future target-CC conditions read `ctx.target.cc[]` as an array without migration; future stat-functional CCs can carry their own `effects[]` per entry.

    Migration scope: one-pass authoring sweep wrapping all existing singleton `cc:` usages in `[...]` plus authoring Aqua Prison's lift. Validator walks `cc[]` as an array. Current-simulator impact: primarily display/tooltip fidelity — CC doesn't modify caster stats today, but the shape is future-proofed.
17. **Stacking nested within performanceTiers** — Bard Allegro/Accelerando carry per-tier `stacking.perStack` (tier-specific stack values). Current validator walks only ability-level `stacking.perStack`. Validator must also walk `performanceTiers.{poor,good,perfect}.stacking.perStack`.
18. **`memoryCost` field on music abilities** — Bard musics carry `memoryCost: N` (Cat 30). Validator accepts field; runtime enforces against equipped Music Memory slot count (Convention: music memory ≠ spell memory).
19. **`music` slot count validation** — VALID_SLOT_TYPES already includes "music"; ensure the Music Memory skill wiring is end-to-end in the engine/UI (not just validated).
20. **`disables[]` walker** — Druid Lifebloom Aura disables transformation; Shapeshift Mastery disables spirit-tagged spells. Validator must walk `ability.disables[]` and the runtime selection UI must respect `filter.tags` / `filter.id` / `filter.type`.
21. **`form.attacks[i].appliesStatus` walker** — Druid Panther Scratch bleed, Rat Infected Fangs plague, Penguin Sharp Beak bleed. Validator currently only walks wildSkill.effects. Add form.attacks[i].appliesStatus to validator traversal.
22. **`form.attacks[i].frenziedEffect`** — Druid Panther Neckbite silence triggered only while frenzy_active. Validator must walk frenziedEffect.appliesStatus / frenziedEffect.damage / frenziedEffect.effects, gated by `frenzy_active` condition at runtime.
23. **`condition.type: "effect_active"` resolver** — already in CONDITION_TYPES, but engine must resolve `effectId` lookup at runtime (per-target effect presence). First use: Druid Dreamfire conditional heal for allies with Nature's Touch active.
24. **Compound conditions `all` / `any`** (LOCKED D.24). Condition evaluator recursively evaluates `condition.conditions[]` and combines via AND (`all`) or OR (`any`). Leaves resolve via existing condition dispatch. No depth limit; authors keep depth shallow for readability. Retires the prior workaround of authoring parallel effects each gated by one leg of the intended conjunction. First use: Fighter Sword Mastery (`weapon_type: sword` + `player_state: defensive_stance`). Validator walks inner conditions identically to top-level. UI: no new controls — existing state/weapon/equipment toggles cover all leaves.
25. **`post_curve_multiplicative` phase** (LOCKED D.25). Applies after all `post_curve` additives on a given stat: `stat_final = (base + Σ post_curve additives) × Π (1 + post_curve_multiplicative values)`. In-game verified on Fighter Veteran Instinct PDR (`+10% of current value` = ×1.10). Aggregator needs to track per-stat multiplicative bucket separately from additive `post_curve` bucket. Order: curve → pre_curve_flat → attribute_multiplier (applied to attrs pre-curve) → curve eval → post_curve adds → post_curve_multiplicatives → `cap_override` / cap clamp → used by damage formulas. Distinct from `post_cap_multiplicative_layer` (damage-side). Existing `multiplicative_layer` (pre-cap damage-side) remains in constants for Phase 1.3 cleanup review — verify whether to retire in favor of the three clearly-named phases.
26. **`flatDamageReduction` damage-pipeline consumption** — stat aggregates via `post_curve` phase from perks (Cleric Perseverance +2 flat). Damage pipeline must subtract `defender.flatDamageReduction` as the final step of every incoming damage calculation, after all percent layers (capped MDR/PDR, `post_cap_multiplicative_layer`, type resistances). Floor at 0. STAT_META already defines `flatDamageReduction` (unit: flat, cat: defense); authoring shape already in use on Cleric Perseverance. Anchor: `cleric.perseverance`. Feeds Section G incoming-damage panel — every enemy attack row renders through this final subtraction. No aggregate-stat-panel display change (it's a flat defender stat, already surfaced via STAT_META).

---

## E. UI plumbing (LiveStatePanel / TargetEditor)

- Live State toggles for new player states: `in_combat`, `performing`, `behind_target`.
- Target Editor creature-type selector (undead / demon).
- Form toggle for each transformation (+1 "no form" default).
- Frenzy toggle (Druid Panther Rush sets frenzy state).
- Environment selector (`water`).
- Performance-tier selector per Bard music (poor/good/perfect, default perfect).
- Stack sliders per ability with a `stacking` block.
- Shield-broken toggle per ability with a break-triggered effect (Wizard Arcane Shield, Warlock Eldritch Shield).
- "In afterEffect phase" toggle per ability with `afterEffect`.
- Active-summon toggles (Warlock Hydra, Evil Eye; Sorcerer Earth Elemental, Lava Elemental; Druid Treant).
- `capOverrides` visualization — e.g., PDR overflow beyond 75% when Fighter Defense Mastery selected.
- Weapon-held selector must surface new WEAPON_TYPES (one_handed, shield, spellbook, firearm).

---

## G. Deferred feature — Incoming-damage panel (new, separate from Target)

Context: Target Panel is for *outgoing* damage (damage we deal). A new, separate panel will render *incoming* damage — "how much damage will class X / build Y do to me" — rendering each enemy attack row through our defenses.

Architectural constraint for Phase 1.3: **the data shape and engine pipeline must support this panel with zero rework when the panel is built later.** Only the panel UI is deferred.

Requirements:
- **Enemy-attack evaluation contract.** Engine accepts `ctx.incomingDamageType`, `ctx.incomingTrueDamage`, `ctx.incomingTags[]`, `ctx.incomingSource` (class/ability id for future filtering) and evaluates every defensive condition against those. Defensive `post_curve` / `post_cap_multiplicative_layer` / type-resistance effects resolve per-attack.
- **Default enemy-build presets.** Per-class default attacks (melee + key abilities with typical damage numbers). Later, users point at a specific shareable-build URL.
- **Same damage formulas, attacker POV.** `damage.js` must be callable with roles swapped — the enemy's attacker-side scaling + our defender-side mitigation. Formula purity keeps this cheap.
- **No new condition types for per-type exclusions.** `damageType` condition with `exclude` (D.8) is the canonical pattern.
- **Authoring continues unchanged.** Class authors already write attacks with `damageType`, `tags`, `trueDamage` — no new fields needed on the attacker side.

Deferred (build with the panel, not now): the panel component, default-build presets, shareable-build pointer plumbing.

Litmus test: when the panel is built, it should be "list enemy attacks → for each, set ctx → call existing damage pipeline → render result." No new engine paths.

---

## F. Unresolved (carry from CSV / vocab)

| Ref | Note |
|---|---|
| Warlock.BloodPact.ExploitationStrike | CSV phrases the 2s window as "additional evil magical damage for 2 seconds" without naming a status — authored as `passives.debuffDuration` metadata. Phase 1.3 may formalize as a nameless debuff with `appliesStatus`. |
| Warlock.BlowOfCorruption | Curse tag unverified in CSV — authored without `curse` tag (simplest faithful). Curse Mastery extension TBD in-game. |
| Warlock.RayOfDarkness | CSV omits channel duration. Authored 5s placeholder; flagged `_unverified`. |
| Warlock.LifeDrain | "Portion of damage" lifesteal % unresolved in CSV. Authored as `passives.lifestealPortion: true` (flag), numeric TBD. |
| Warlock.DarkOffering | CSV doesn't cap stack count; authored maxStacks=10 best-faith (HP budget caps realistic usage well below). |
| V1 | Druid form attack damage formula — engine math gap. Author data best-faith; flag `_unverified`. |
| V10/V30 | Warlock Darkness Shards shared-pool architecture — coordinator must decide between class-root resource vs. per-ability stacking. Current author uses per-ability `stacking` block on Soul Collector; Blood Pact and Spell Predation reference shard consumption in `desc` only. |
| V36 | Druid Rat form has no primary scaling attribute (CSV omits). Authored with `scalesWith: null`. |
| Mending Grove duration | CSV omits. Flagged `_unverified`. |
| Sorcerer baseline HP | CSV says 117; formula gives 115. Authored to CSV value; flagged `_unverified`. |
| Blow of Corruption curse tag | Flagged for in-game verification — may or may not be curse-tagged for Curse Mastery. Authored without curse tag (simplest faithful to CSV). |
| Life Drain lifesteal percentage | Unresolved in csv. Authored with `healingMod`-driven lifesteal in desc prose; numeric value left as best-faith. |
