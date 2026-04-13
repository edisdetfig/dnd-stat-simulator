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

### CONDITION_TYPES

| Add | Rationale | First use |
|---|---|---|
| `creature_type` | Condition gates effect on target's creature category (`undead`, `demon`). Reads `ctx.target.creatureType`. | `cleric.undead_slaying`, `warlock.infernal_pledge` |

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
8. **Condition exclusion semantics** — e.g., Warlock Antimagic applies to all magic damage *except divine*. Simplest authoring: desc prose only (no structural exclusion). Phase 1.3 may choose to add a `condition.type: "damageType_exclude"` or keep display-only.
9. **Status stacking** within `appliesStatus[]` — e.g., Rogue Poisoned Weapon maxStacks=5 per-hit stacking on the poison status. Currently shape supports ability-level `stacking`, not status-level. Phase 1.3 decides: author-level `stacking` block, or per-status `stacking`.
10. **Primitive curve damage formula** for Druid form attacks (`druid.unresolved_questions.md:Druid Form Attack Damage Formula`). Engine math gap — author data best-faith, flag `_unverified`.
11. **Shared resource pool** across multiple abilities (Warlock Darkness Shards: Soul Collector, Spell Predation, Blood Pact share a 3-cap). Current shape is per-ability `stacking`. Phase 1.3 decides between (a) class-root `classResources` block vs. (b) per-ability stacking with cross-ability consume semantics in desc only.
12. **Self-damage DoT** — Warlock Dark Offering (10%/s), Warlock Blood Pact Abyssal Flame (1%/s). Author via `passives.selfDamagePerSecond` (display-only) OR via negative-heal HoT targeting self.
13. **Any-form gating** — Druid Enhanced Wildness "while in any form." Author as `condition: { type: "form_active" }` with no specific `form` value → "any form active." Engine must interpret omitted `form` field as "any."
14. **Trigger-block own-duration for on-hit debuffs** — Wizard Melt and Cleric Faithfulness apply a timed debuff to a target through a trigger; trigger.effects have no duration field in current shape. Phase 1.3 decides between (a) allow `triggers[i].duration`, or (b) always author via `appliesStatus` with a generic "nameless debuff" status. Currently authored as trigger.effects + desc-prose window.
15. **Merged-spell cooldown derivation** — `deriveMergedSpellCooldown(mergedSpell, components)`: per CSV Sorcerer Class Notes, a merged spell cannot re-cast until both components are off cooldown. Effective CD ≈ max of components' CDs (gated on both being available). Tracker D.6 covers availability; this row covers derived cooldown surfacing in UI.
16. **Multi-CC per ability** — Sorcerer Aqua Prison applies BOTH trap (3s) AND lift (3s); current shape is singleton `cc: { type, duration }`. Authored trap-only with lift in desc. Phase 1.3 decides array shape `cc: [{...}, {...}]` or keep singleton + desc.
17. **Stacking nested within performanceTiers** — Bard Allegro/Accelerando carry per-tier `stacking.perStack` (tier-specific stack values). Current validator walks only ability-level `stacking.perStack`. Validator must also walk `performanceTiers.{poor,good,perfect}.stacking.perStack`.
18. **`memoryCost` field on music abilities** — Bard musics carry `memoryCost: N` (Cat 30). Validator accepts field; runtime enforces against equipped Music Memory slot count (Convention: music memory ≠ spell memory).
19. **`music` slot count validation** — VALID_SLOT_TYPES already includes "music"; ensure the Music Memory skill wiring is end-to-end in the engine/UI (not just validated).
20. **`disables[]` walker** — Druid Lifebloom Aura disables transformation; Shapeshift Mastery disables spirit-tagged spells. Validator must walk `ability.disables[]` and the runtime selection UI must respect `filter.tags` / `filter.id` / `filter.type`.
21. **`form.attacks[i].appliesStatus` walker** — Druid Panther Scratch bleed, Rat Infected Fangs plague, Penguin Sharp Beak bleed. Validator currently only walks wildSkill.effects. Add form.attacks[i].appliesStatus to validator traversal.
22. **`form.attacks[i].frenziedEffect`** — Druid Panther Neckbite silence triggered only while frenzy_active. Validator must walk frenziedEffect.appliesStatus / frenziedEffect.damage / frenziedEffect.effects, gated by `frenzy_active` condition at runtime.
23. **`condition.type: "effect_active"` resolver** — already in CONDITION_TYPES, but engine must resolve `effectId` lookup at runtime (per-target effect presence). First use: Druid Dreamfire conditional heal for allies with Nature's Touch active.

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

## F. Unresolved (carry from CSV / vocab)

| Ref | Note |
|---|---|
| V1 | Druid form attack damage formula — engine math gap. Author data best-faith; flag `_unverified`. |
| V10/V30 | Warlock Darkness Shards shared-pool architecture — coordinator must decide between class-root resource vs. per-ability stacking. Current author uses per-ability `stacking` block on Soul Collector; Blood Pact and Spell Predation reference shard consumption in `desc` only. |
| V36 | Druid Rat form has no primary scaling attribute (CSV omits). Authored with `scalesWith: null`. |
| Mending Grove duration | CSV omits. Flagged `_unverified`. |
| Sorcerer baseline HP | CSV says 117; formula gives 115. Authored to CSV value; flagged `_unverified`. |
| Brewmaster drunk-extension | Coordinator noted in-game verification pending — does it extend duration or only remove detrimental parts? Authored as extension. |
| Blow of Corruption curse tag | Flagged for in-game verification — may or may not be curse-tagged for Curse Mastery. Authored without curse tag (simplest faithful to CSV). |
| Zap damage type | `light_magical` vs `lightning_magical` — authored as `light_magical` per verified distinct type. |
| Life Drain lifesteal percentage | Unresolved in csv. Authored with `healingMod`-driven lifesteal in desc prose; numeric value left as best-faith. |
| Veteran Instinct "+10% of current value" | Simplest faithful author: +10% flat `physicalDamageReduction` (`post_curve`). Multiplicative-of-current semantics flagged `_unverified`. |
