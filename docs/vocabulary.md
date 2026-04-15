# Controlled Vocabulary Master Table

> **Purpose.** Single source of truth for every controlled-vocabulary string used in the v3 unified ability shape (`docs/ability_data_map_v2.md` §3). Produced from a holistic survey of all 10 class CSVs (`docs/classes/*.csv`) on 2026-04-12; revised 2026-04-13 with coordinator decisions.
>
> **Status.** Locked per coordinator review. Implementation — code changes to `src/data/constants.js`, STAT_META additions, validator updates, class data authoring — is deferred to the class-definition session and will reference this document.
>
> **Citation grammar.** Every value below carries at least one citation of the form `class.csv:Lnn (ability name)`. Lnn = line number in the class CSV at survey time. Values flagged for in-game verification sit in `docs/unresolved_questions.md` under the "Vocabulary verifications" section.
>
> **Scope.** Vocabulary only — membership of enum-valued fields. Does NOT cover: numeric value semantics, calculation formulas, verification levels, or ability-ID cross-references (e.g., `grantsSpells` spell IDs, `abilityModifiers.target` ability IDs). Those are authored or referential data, not vocabulary.

---

## Conventions

Rules that govern every vocabulary decision below.

1. **Class-agnostic, school-agnostic naming.** No class names, no damage schools, no ability names embedded in event strings, player states, or condition values. Events describe *what happened*; ability-specific nuance goes in the owning ability's `desc`.

   Example: `on_status_tick` is acceptable because it describes a DoT tick regardless of status class; `on_curse_tick` would be tag-specific and is rejected. Curse-specific behavior (e.g., Torture Mastery firing only on curse ticks) is expressed via `{ type: "tag_match", tag: "curse" }` conditions, not via tag-specific event names.

   Counter-example: `on_divine_attack_hit` (Cleric) is school-specific and rejected in favor of `on_damage_dealt` + `condition: { type: "tag_match", tag: "divine" }`.

2. **`on_*` prefix / single trigger vocabulary.** `on_*` prefix for all event strings. `TRIGGER_EVENTS` is a single vocabulary shared by ability-level `triggers[].event`, `stacking.triggerOn`/`consumedOn`, and gear-level `triggers[].on`. No separate gear enum.

   Note: per Convention 4, event *label strings themselves* are display-only prose inside `desc`. The structural `triggers[]` / `stacking` blocks remain authored for damage/effect definitions, but their event-label fields are not enforced against a vocabulary enum.

3. **`desc` is the only human-readable display field on any block** — ability root, `stacking`, `appliesStatus`, `afterEffect`, `triggers`, `summon`, `form`, `performanceTiers`, and any future block. Authors apply human-readable comments only as `desc`. Legacy names (`tooltip`, `description`, `notes`) are not used; any such field is renamed to `desc` on contact.

4. **Temporal metadata splits by whether the engine needs the value for math.**

   - **Structural** (engine computes modified effective values for display): `duration`, `cooldown`, `castTime`, `tickRate`, `cost`.
   - **Display-only prose in `desc`**: `triggers[].event` strings, `stacking.triggerOn`/`consumedOn`, `appliesStatus[].consumedOn`, `afterEffect.consumedOn`, ability-level `consumedOn`/`triggerOn` strings.

   The engine does not dispatch on event strings; each ability is a toggle that the user enables. `TRIGGER_EVENTS` and `CONSUMED_ON_EVENTS` enums are eliminated from vocabulary entirely — they become freeform prose. Structural trigger/stacking blocks stay (damage, effect, heal definitions live inside them), but the string labels those blocks carry are authored into `desc`, not validated against an enum.

5. **One enum per concept.** If a concept (e.g., `silence`) appears in two fields (e.g., `appliesStatus[].type` and `cc.type`), it shares one canonical spelling. Cross-field membership is allowed; duplicate spellings are not.

6. **Snake_case for all enum values.** Multi-word values separated by `_`. `dark_magical`, not `darkMagical` or `dark-magical` or `dark magical`.

7. **`<element>_magical` for elemental damage types.** `fire_magical`, `ice_magical`, `lightning_magical`, `arcane_magical`, `earth_magical`, `air_magical`, `dark_magical`, `evil_magical`, `divine_magical`, `spirit_magical`, `light_magical`. The element is the school; `magical` is the damage family. Bare element names (`fire`, `frost`) are used only as `tags`.

8. **True damage is a property of the damage instance, not a distinct damage type.** Authored as `{ damageType: <base>, trueDamage: true, ... }` where `<base>` is one of `DAMAGE_TYPES` (`physical`, `dark_magical`, `magical`, etc.). The `trueDamage` flag signals the engine to bypass DR; `damageType` still governs which type bonuses apply. Consequently `true_physical` is NOT a member of `DAMAGE_TYPES` — it is authored as `physical` with `trueDamage: true` (Spiked Gauntlet, Barbarian Finishing Blow, Druid Thorn Coat).

9. **Status vs. CC partition.** `STATUS_TYPES` are stat-mutating over-time effects (burn DoT, frostbite debuff, poison DoT, silence-as-debuff, blind vision debuff, freeze movement-lock with AS debuff). `CC_TYPES` are instantaneous-or-duration control effects that prevent actions (stun, root, fear, disarm, knockback, lift, trap, immobilize, slow, bind). When a concept straddles, it is defined in `STATUS_TYPES` only; `cc.type` does not duplicate.

10. **Openness rules.** `tags`, `passives` map keys, `summon.type`, and `stateChange` keys are explicitly **open-ended**. This table records every observed value with a citation; additions in future classes are expected. Every other category is **closed** — additions require a PR updating this file plus `src/data/constants.js`.

11. **Plural/verb-form canonicalization.** Canonical form for verb-stem enum members is the infinitive: `immobilize` (not `immobilized`), `trap` (not `trapped`). Status names that are in-game nouns keep their noun form (`burn`, `frostbite`, `poison`).

12. **Ability IDs and spell IDs are referential.** `grantsSpells`, `abilityModifiers.target` (string form), `healEffects.source`, `afterEffect.removedBy`, `requires` (on merged spells), `condition.effectId` carry string identifiers that must resolve to a real ability's `id`. They are not controlled vocabulary; this document does not enumerate them.

13. **Two-direction modifier framework.** Stat modifiers that scale temporal values are labeled by direction:

    - **caster-side** — stat belongs to the caster; applies when the caster casts a tagged ability. Examples: `curseDurationBonus`, `shoutDurationBonus`, `burnDurationAdd`. For self-cast abilities, caster-side modifiers still apply (the caster's own stat extends their own effect).
    - **receiver-side** — stat belongs to the receiver; applies when the effect lands on them. Examples: `drunkDurationBonus`, `buffDurationBonus`, `debuffDurationBonus`. For self-cast abilities, the caster is also the receiver, so receiver-side modifiers look up the caster's own stat.

    STAT_META entries for these stats record `direction: "caster" | "receiver"`. The engine routes accordingly. A single ability's duration chain visits the caster's caster-side tag modifiers first, then the receiver's receiver-side modifiers (tag-specific and type-generic).

14. **Duration is optional.** Omission of the `duration` block on an ability signals a toggle / permanent / until-event effect. The engine treats these as user-controlled toggles per the Snapshot principle. Do not invent sentinel values — absence is the signal.

---

## Coverage Matrix

Per-class × per-category count of distinct values contributed. `—` = zero contribution.

| Category                          | barb | bard | cler | drud | figh | rang | rogu | sorc | warl | wizd |
|-----------------------------------|------|------|------|------|------|------|------|------|------|------|
| 1  `type`                         | 2    | 4    | 3    | 4    | 2    | 2    | 2    | 4    | 3    | 3    |
| 2  `activation`                   | 3    | 3    | 3    | 3    | 2    | 2    | 2    | 3    | 3    | 3    |
| 3  `targeting`                    | 4    | 4    | 4    | 2    | 2    | 2    | 1    | 2    | 3    | 2    |
| 4  `tags` (open)                  | 3    | 10   | 7    | 2    | 6    | 8    | 10   | 5    | 4    | 6    |
| 5  `condition.type`               | 3    | 3    | 5    | 2    | 6    | 2    | 2    | 2    | 4    | 2    |
| 6  `condition.form`               | —    | —    | —    | 5    | —    | —    | —    | —    | 1    | —    |
| 7  `ENVIRONMENTS`                 | —    | —    | —    | 1    | —    | —    | —    | —    | —    | —    |
| 8  `condition.weaponType`         | 2    | 2    | 1    | —    | 6    | 4    | 1    | 3    | 3    | 1    |
| 9  `condition.state`              | 1    | 3    | 2    | —    | 4    | 2    | 3    | 3    | —    | —    |
| 10 `condition.slot`+equipped      | 1    | —    | —    | —    | —    | —    | —    | —    | —    | —    |
| 11 `cost.type`                    | 1    | —    | 1    | 1    | —    | —    | —    | 1    | 1    | 1    |
| 12 `slots.type`                   | —    | 1    | 1    | 2    | —    | —    | —    | 1    | 1    | 1    |
| 13 `effects[].stat`               | 14   | 11   | 10   | 8    | 11   | 7    | 9    | 11   | 20   | 8    |
| 14 `effects[].phase`              | 2    | 1    | 4    | 3    | 3    | 2    | 4    | 3    | 6    | 3    |
| 15 `effects[].target`             | 3    | 2    | 4    | 3    | 2    | 2    | 3    | 2    | 3    | 2    |
| 16 `DAMAGE_TYPES`                 | 1    | 2    | 2    | 3    | 1    | 2    | 2    | 6    | 4    | 5    |
| 17 `healType`                     | 1    | —    | 1    | 2    | —    | 1    | —    | —    | 1    | —    |
| 18 `STATUS_TYPES`                 | 1    | 1    | 4    | 3    | 3    | —    | 3    | 5    | —    | 4    |
| 19 `triggers[].stateChange`       | —    | 2    | 1    | 2    | 3    | 2    | 2    | —    | 1    | —    |
| 20 `disables[].type`+filter       | —    | —    | —    | 2    | —    | —    | —    | —    | —    | —    |
| 21 `abilityModifiers[].modify`    | 2    | —    | 3    | —    | —    | —    | 2    | 4    | 3    | —    |
| 22 `grantsArmor`/`removesArmor`   | —    | —    | —    | —    | 1    | —    | —    | —    | 1    | —    |
| 23 `grantsWeapon`                 | —    | —    | —    | —    | —    | 1    | —    | —    | —    | —    |
| 24 `grantsSpells`                 | —    | —    | —    | 1    | —    | —    | —    | —    | 1    | —    |
| 25 `passives` keys (open)         | 2    | 1    | 7    | 2    | 1    | 1    | 4    | —    | 4    | 3    |
| 26 `CC_TYPES`                     | 1    | 1    | 3    | 1    | 3    | 1    | 1    | 5    | —    | 1    |
| 27 `shield.damageFilter`          | —    | —    | 1    | —    | —    | —    | —    | 2    | 1    | 1    |
| 28 `summon.type`                  | —    | —    | —    | 1    | —    | —    | —    | 2    | 2    | —    |
| 29 `form.attacks[]`               | —    | —    | —    | 3    | —    | —    | —    | —    | 1    | —    |
| 30 `performanceTiers` names       | —    | 3    | —    | —    | —    | —    | —    | —    | —    | —    |
| 31 merged spell `requires`        | —    | —    | —    | —    | —    | —    | —    | 15   | —    | —    |
| 32 `duration.type`                | 3    | 2    | 3    | 3    | 3    | 1    | 3    | 3    | 3    | 2    |
| 33 `duration.tags` (open)         | 1    | 1    | 1    | 2    | 0    | 0    | 2    | 4    | 3    | 3    |

All 10 classes contribute to ≥ 1 category. No class is silent. 

---

## Category 1: Ability `type`

**Closed set.** Values come from §3 line 213 of the v3 spec.

| Value            | Cited |
|------------------|-------|
| `perk`           | every class — e.g. `barbarian.csv:L22 (Axe Specialization)`, `warlock.csv:L22 (Demon Armor)` |
| `skill`          | every class — e.g. `fighter.csv:L39 (Adrenaline Rush)`, `warlock.csv:L39 (Blow of Corruption)` |
| `spell`          | casters — e.g. `warlock.csv:L48 (Bolt of Darkness)`, `cleric.csv:L46 (Protection)`, `wizard.csv:L46 (Zap)`, `sorcerer.csv:L46 (Water Bolt)`, `druid.csv:L40 (Nature's Touch)` |
| `transformation` | `druid.csv:L53 (Bear)`, `druid.csv:L54 (Panther)`, `druid.csv:L55 (Chicken)`, `druid.csv:L56 (Rat)`, `druid.csv:L57 (Penguin)` |
| `music`          | `bard.csv:L46..L64` (all 19 Bard musics) |

---

## Category 2: `activation`

**Closed set.** Values from §3 line 265.

| Value     | Cited |
|-----------|-------|
| `passive` | every perk row across every class — e.g. `barbarian.csv:L22 (Axe Specialization)`, `warlock.csv:L26 (Antimagic)` |
| `toggle`  | `warlock.csv:L25 (Dark Reflection)`, `warlock.csv:L41 (Phantomize)`, `warlock.csv:L42 (Dark Offering)`, `fighter.csv:L25 (Barricade)`, `wizard.csv:L31 (Reactive Shield)`, `wizard.csv:L38 (Intense Focus)` |
| `cast`    | damage spells and one-shots — e.g. `warlock.csv:L48 (Bolt of Darkness)`, `fighter.csv:L50 (Victory Strike)`, `sorcerer.csv:L46 (Water Bolt)`, `cleric.csv:L40 (Smite)` |

---

## Category 3: `targeting`

**Closed set.** Values from §3 line 236.

| Value            | Cited |
|------------------|-------|
| `self`           | every perk defaulting to self — e.g. `warlock.csv:L22 (Demon Armor)`, `fighter.csv:L25 (Barricade)`, `bard.csv:L22..L33` |
| `ally_or_self`   | `cleric.csv:L46..L57` (most Cleric support spells), `warlock.csv:L49 (Bloodstained Blade)`, `warlock.csv:L56 (Eldritch Shield)`, `barbarian.csv:L47 (War Cry)`, `bard.csv:L30 (Story Teller)`, `bard.csv:L33 (War Song)` |
| `enemy`          | all damage spells — e.g. `warlock.csv:L48 (Bolt of Darkness)`, `sorcerer.csv:L46 (Water Bolt)`, `wizard.csv:L56 (Fireball)`, `cleric.csv:L52 (Holy Strike)` |
| `enemy_or_self`  | `warlock.csv:L46 (Power of Sacrifice "Self casts if no target is found")`, `bard.csv:L56 (Lament of Languor)`, `bard.csv:L59 (Chaotic Discord)` |

---

## Category 4: `tags` (open)

**Open set.** The richest vocabulary in the survey. Values appear verbatim across multiple fields — damage-type prefixes (Cat 16), `disables[].filter`, `abilityModifiers[].target`, `condition.tags`, and `duration.tags` (Cat 33).

### Spell-school / element tags

| Value      | Cited |
|------------|-------|
| `fire`     | `sorcerer.csv:L55 (Fire Arrow)`, `sorcerer.csv:L66 (Flamestrike)`, `sorcerer.csv:L75 (Fire Orb)`, `wizard.csv:L23 (Fire Mastery)`, `wizard.csv:L50 (Ignite)`, `wizard.csv:L56 (Fireball)` |
| `frost`    | `sorcerer.csv:L50 (Glaciate)`, `sorcerer.csv:L61 (Ice Spear)`, `wizard.csv:L28 (Ice Mastery)`, `wizard.csv:L51 (Ice Bolt)` |
| `lightning`| `sorcerer.csv:L26 (Lightning Mastery)`, `sorcerer.csv:L72 (Lightning Bolt)`, `wizard.csv:L54 (Lightning Strike)`, `wizard.csv:L58 (Chain Lightning)` |
| `air`      | `sorcerer.csv:L22 (Air Mastery)`, `sorcerer.csv:L60 (Windblast)`, `sorcerer.csv:L80 (Vortex)` |
| `earth`    | `sorcerer.csv:L49 (Stone Skin)`, `sorcerer.csv:L71 (Eruption)`, `sorcerer.csv:L154 (Thorn of Earth)` |
| `water`    | `sorcerer.csv:L46 (Water Bolt)`, `sorcerer.csv:L95 (Aqua Prison)` |
| `arcane`   | `wizard.csv:L26 (Arcane Feedback)`, `wizard.csv:L27 (Arcane Mastery)`, `wizard.csv:L37 (Arcane Shield)`, `wizard.csv:L52 (Magic Missile)` |
| `dark`     | `warlock.csv:L24 (Shadow Touch)`, `warlock.csv:L25 (Dark Reflection)`, `warlock.csv:L27 (Dark Enhancement)`, `warlock.csv:L48 (Bolt of Darkness)`, `warlock.csv:L53 (Ray of Darkness)` |
| `evil`     | `warlock.csv:L39 (Blow of Corruption "evil magical")`, `warlock.csv:L50 (Curse of Pain)`, `warlock.csv:L54 (Life Drain)` |
| `divine`   | `cleric.csv:L25 (Faithfulness)`, `cleric.csv:L32 (Requiem)`, `cleric.csv:L37 (Judgement)` |
| `spirit`   | `druid.csv:L42 (Orb of Nature)`, `druid.csv:L43 (Dreamfire)`, `druid.csv:L26 (Shapeshift Mastery)` |
| `nature`   | `druid.csv:L22 (Force of Nature)`, `druid.csv:L40 (Nature's Touch)`, `druid.csv:L42 (Orb of Nature)`, `druid.csv:L48 (Mending Grove)` |
| `light`    | `wizard.csv:L46 (Zap "light magical")`, `wizard.csv:L47 (Light Orb)` |
| **`curse`**| `warlock.csv:L28 (Torture Mastery)`, `warlock.csv:L29 (Curse Mastery)`, `warlock.csv:L47 (Curse of Weakness)`, `warlock.csv:L50 (Curse of Pain)` — **duration-modifier tag; see Category 33** |
| `undead`   | `cleric.csv:L33 (Undead Slaying)`, `cleric.csv:L39 (Holy Purification)`, `warlock.csv:L31 (Infernal Pledge)` |
| `demon`    | `warlock.csv:L22 (Demon Armor)`, `warlock.csv:L40 (Blood Pact)`, `warlock.csv:L31 (Infernal Pledge)` |
| `blood`    | `warlock.csv:L40 (Blood Pact)`, `warlock.csv:L49 (Bloodstained Blade)` |

### Mechanic-kind tags

| Value        | Cited |
|--------------|-------|
| **`shout`**  | `barbarian.csv:L34 (Treacherous Lungs)`, `barbarian.csv:L46 (Savage Roar)`, `barbarian.csv:L47 (War Cry)`, `fighter.csv:L49 (Taunt — "scream at nearby enemies")` — **duration-modifier tag; see Category 33** |
| `stance`     | `fighter.csv:L25 (Barricade)`, `fighter.csv:L29 (Projectile Resistance)`, `fighter.csv:L30 (Shield Mastery)`, `fighter.csv:L33 (Sword Mastery)` |
| `roar`       | `barbarian.csv:L46 (Savage Roar)` |
| `aura`       | `cleric.csv:L26 (Holy Aura)`, `druid.csv:L24 (Lifebloom Aura)`, `barbarian.csv:L47 (War Cry)` |
| `channel`    | `warlock.csv:L42 (Dark Offering)`, `warlock.csv:L52 (Evil Eye)`, `warlock.csv:L53 (Ray of Darkness)`, `warlock.csv:L54 (Life Drain)`, `wizard.csv:L39 (Meditation)` |
| `projectile` | `warlock.csv:L48 (Bolt of Darkness)`, `sorcerer.csv:L46 (Water Bolt)`, `ranger.csv:L43 (True Shot)` |
| `beam`       | `warlock.csv:L53 (Ray of Darkness)`, `sorcerer.csv:L123 (Flamethrower)` |
| `trap`       | `ranger.csv:L33 (Trap Mastery)`, `rogue.csv:L39 (Caltrops)`, `sorcerer.csv:L95 (Aqua Prison)` |
| `song`       | `bard.csv:L46..L64` |
| `stealth`    | `rogue.csv:L22 (Ambush)`, `rogue.csv:L27 (Hide Mastery)`, `rogue.csv:L31 (Stealth)`, `rogue.csv:L41 (Hide)` |
| `backstab`   | `rogue.csv:L22 (Ambush)`, `rogue.csv:L23 (Back Attack)` |
| `poison`     | `rogue.csv:L30 (Poisoned Weapon)` |
| `bleed`      | `rogue.csv:L38 (Rupture)`, `druid.csv:L54,L57 (form attacks)`, `barbarian.csv:L33 (Skull Splitter)` |
| **`burn`**   | applied by every Wizard/Sorcerer/Warlock fire-tagged ability — see Category 18 citations — **duration-modifier tag; see Category 33** |
| **`drunk`**  | `bard.csv:L25 (Jolly Time)`, `cleric.csv:L24 (Brewmaster)` — **duration-modifier tag; see Category 33** |
| `potion`     | `barbarian.csv:L30 (Potion Chugger)` — applied to drink/potion items so `abilityModifiers[].target: { tags: ["potion"] }` can match |
| `shot`       | `ranger.csv:L24,L28,L37,L43,L44` |
| `judgment`   | `cleric.csv:L37 (Judgement)` |
| `prayer`     | `cleric.csv:L25 (Faithfulness)`, `cleric.csv:L32 (Requiem)` |
| `blessing`   | `cleric.csv:L27 (Holy Water)`, `cleric.csv:L48 (Bless)` |

### Instrument-family tags (Bard)

| Value   | Cited |
|---------|-------|
| `drum`  | `bard.csv:L46..L50` |
| `flute` | `bard.csv:L51..L54` |
| `lute`  | `bard.csv:L55..L59` |
| `lyre`  | `bard.csv:L60..L64` |

**Removed from prior draft.**
- `holy` — removed. Not mechanically used; Cleric heals are plain `magical`, not holy-typed. `divine` remains (damage-type prefix for `divine_magical` and a valid tag).

**Rejected (other).**
- `music`, `buff`, `debuff`, `utility`, `movement`, `heal`, `protection` — human reader categorizations, not engine tags. Reject.
- `throw` — no CSV uses it.

---

## Category 5: `condition.type`

**Closed set.** `form_active, hp_below, effect_active, environment, frenzy_active, weapon_type, dual_wield, player_state, equipment, creature_type, damageType, all, any`.

| Value           | Cited |
|-----------------|-------|
| `form_active`   | `druid.csv:L53..L57`, `warlock.csv:L40 (Blood Pact — demon form)` |
| `hp_below`      | `warlock.csv:L30 (Immortal Lament — 5%)`, `fighter.csv:L24 (Adrenaline Spike — 40%)`, `fighter.csv:L28 (Last Bastion — 33%)`, `wizard.csv:L31 (Reactive Shield)` |
| `effect_active` | `warlock.csv:L25 (Dark Reflection)`, `warlock.csv:L41 (Phantomize)`, `bard.csv:L27 (Melodic Protection)`, `fighter.csv:L39 (Adrenaline Rush + Adrenaline Spike)` |
| `environment`   | `druid.csv:L47 (Summon Treant)`, `druid.csv:L57 (Penguin Dash)` |
| `frenzy_active` | `druid.csv:L54 (Panther Neckbite)` |
| `weapon_type`   | see Category 8 |
| `dual_wield`    | `fighter.csv:L27 (Dual Wield)`, `fighter.csv:L31 (Slayer)` |
| `player_state`  | see Category 9 |
| `equipment`     | `barbarian.csv:L32 (Savage)` |
| `creature_type` | `cleric.csv:L33 (Undead Slaying)`, `cleric.csv:L39 (Holy Purification)`, `cleric.csv:L53 (Holy Light)`, `cleric.csv:L54 (Sanctuary)`, `warlock.csv:L31 (Infernal Pledge — undead and demons)` |
| `damageType`    | Accepts scalar `damageType: <value>`, array `damageType: [<values>]`, and exclusion `exclude: [<values>]`. Anchor: `warlock.csv:L26 (Antimagic — "all magic damage except divine")` per tracker D.8. Evaluator consumes `ctx.incomingDamageType` when present; stat-panel aggregate tooltip surfaces `exclude` as qualifier when absent. |
| `all`           | Compound: `{ type: "all", conditions: [...] }` — logical AND of inner conditions. Anchor: `fighter.csv (Sword Mastery — "defensive stance with your sword")` per tracker D.24. |
| `any`           | Compound: `{ type: "any", conditions: [...] }` — logical OR of inner conditions. Reserved for future patterns (no anchor in committed data today). |

Creature-type sub-values observed: `undead`, `demon`.

**Compound conditions.** `all` and `any` nest inner conditions (including other compounds) recursively. Engine evaluator resolves leaves normally (`form_active`, `player_state`, etc.) and combines via AND/OR. No depth limit; authors keep depth shallow for readability. Compound conditions eliminate the previous workaround of authoring two parallel effects each with one leg of the compound.

**Rejected.**
- `debuffed` (Barbarian Achilles Strike) — collapses to `effect_active`.
- `attacking` (Cleric Smite) — trigger-event context, not a persistent condition.

---

## Category 6: `condition.form` (open)

| Value     | Cited |
|-----------|-------|
| `bear`    | `druid.csv:L53` |
| `panther` | `druid.csv:L54` |
| `chicken` | `druid.csv:L55` |
| `rat`     | `druid.csv:L56` |
| `penguin` | `druid.csv:L57` |
| `demon`   | `warlock.csv:L40 (Blood Pact)` |

---

## Category 7: `ENVIRONMENTS` (closed)

Used by `condition.env` (gating conditions) and `summon.environmentBonus` (summon scaling).

| Value   | Cited |
|---------|-------|
| `water` | `druid.csv:L47 (Summon Treant — summon.environmentBonus; "more powerful when summoned underwater")`, `druid.csv:L57 (Penguin Dash — condition.env; "in water")` |

Per coordinator, `water` and `underwater` collapse to a single `water` value. The underlying check is "caster/target in water-like environment"; author `desc` text distinguishes "summoned underwater" vs "player in water" where it matters for display.

---

## Category 8: `condition.weaponType`

**Closed set.** `axe, sword, dagger, bow, crossbow, staff, blunt, rapier, spear, two_handed, one_handed, ranged, instrument, unarmed, shield, spellbook, firearm`.

| Value         | Cited |
|---------------|-------|
| `axe`         | `barbarian.csv:L22 (Axe Specialization)`, `barbarian.csv:L26 (Heavy Swing)` |
| `sword`       | `fighter.csv:L33 (Sword Mastery)` |
| `dagger`      | `rogue.csv:L25 (Dagger Mastery)`, `rogue.csv:L32 (Thrust)` |
| `bow`         | `ranger.csv:L27,L38,L41,L44` |
| `crossbow`    | `ranger.csv:L25 (Crossbow Mastery)` |
| `staff`       | `wizard.csv:L24 (Staff Mastery)`, `sorcerer` Class Notes L8 |
| `blunt`       | `cleric.csv:L23 (Blunt Weapon Mastery)` |
| `rapier`      | `bard.csv:L28 (Rapier Mastery)` |
| `spear`       | `ranger.csv:L32 (Spear Proficiency)` |
| `two_handed`  | `barbarian.csv:L25,L27,L35,L49` |
| `one_handed`  | `fighter.csv:L27 (Dual Wield)`, `fighter.csv:L44 (Pommel Strike)` |
| `ranged`      | `ranger.csv:L28,L30,L31` |
| `instrument`  | `bard.csv:L23,L29` |
| `unarmed`     | `warlock.csv:L40 (Blood Pact "bare-handed")`, `sorcerer` Class Notes L8 |
| `shield`      | in-game weapon type; Fighter Shield Mastery gates on shield-held state |
| `spellbook`   | in-game held item for casters; kept for vocabulary completeness |
| `firearm`     | in-game weapon type; kept for vocabulary completeness |

---

## Category 9: `condition.state` (player states)

**Closed set.** `hiding, crouching, defensive_stance, casting, reloading, bow_drawn, playing_music, drunk, dual_casting, in_combat, performing, behind_target`.

| Value              | Cited |
|--------------------|-------|
| `hiding`           | `rogue.csv:L31 (Stealth)`, `rogue.csv:L41 (Hide)` |
| `crouching`        | `rogue.csv:L24 (Creep)`, `rogue.csv:L31 (Stealth)` |
| `defensive_stance` | `fighter.csv:L25 (Barricade)`, `fighter.csv:L29 (Projectile Resistance)`, `fighter.csv:L30 (Shield Mastery)`, `fighter.csv:L33 (Sword Mastery)`, `fighter.csv:L47 (Spell Reflection)` — collapses prior `blocking` per sim-note equivalence at `fighter.csv:L25` |
| `casting`          | `sorcerer` Class Notes L8, `sorcerer.csv:L23 (Apex of Sorcery)` |
| `reloading`        | `ranger.csv:L25 (Crossbow Mastery)` |
| `bow_drawn`        | `ranger.csv:L26 (Kinesthesia)` |
| `playing_music`    | `bard.csv:L27 (Melodic Protection)`, `bard.csv:L37 (Encore)` |
| `drunk`            | `bard.csv:L25 (Jolly Time)` |
| `dual_casting`     | `sorcerer` Class Notes L8, `sorcerer.csv:L31 (Spell Stride)` |
| `in_combat`        | `fighter.csv:L34 (Veteran Instinct)` |
| `performing`       | `bard.csv:L33 (War Song "A successful performance")`, `bard.csv:L37 (Encore "active music buffs")` |
| `behind_target`    | `rogue.csv:L23 (Back Attack "When attacking a target from behind")` |

**Removed.**
- `blocking` — collapsed into `defensive_stance` per Fighter sim note at `fighter.csv:L25` ("defensive stance... is when you are blocking").

**Rejected.**
- `sprinting` — Sprint is a skill, not a player state; toggle via skill activation.
- `weapon_equipped` — belongs under `equipment` condition, not player_state.
- `attacking` — trigger-event context, not a persistent state.
- `summoned` — collapse to `effect_active` against the summon ability.
- `debuffed` — collapse to `effect_active`.

**Note on `behind_target`.** Used by `rogue.csv:L23 (Back Attack)` which grants 30% physical damage bonus when true. Authored as a `physicalDamageBonus` effect with `condition: { type: "player_state", state: "behind_target" }`. The former proposed `backstabPower` stat is dropped.

---

## Category 10: `condition.slot` + `equipped`

**Closed set.** `slot` values reuse `ARMOR_SLOTS` plus weapon slot names (future).

| slot/equipped combo | Cited |
|---------------------|-------|
| `chest`, `equipped: false` | `barbarian.csv:L32 (Savage "while not wearing any chest armor")` |

---

## Category 11: `cost.type`

**Closed set.**

| Value      | Cited |
|------------|-------|
| `health`   | `warlock.csv:L6` + every Warlock spell |
| `charges`  | `cleric.csv:L6`, `wizard.csv:L6`, `druid.csv:L4` + all their spells |
| `cooldown` | `sorcerer.csv:L8` + every Sorcerer spell |

---

## Category 12: `slots.type`

**Closed set.**

| Value        | Cited |
|--------------|-------|
| `spell`      | all memory-slot skills across casters |
| `shapeshift` | `druid.csv:L36` |
| `music`      | `bard.csv:L40,L41` |

---

## Category 13: `effects[].stat`

**Open relative to STAT_META.** 60+ distinct stats observed. Stats not already in `STAT_META` are approved for addition during the class-definition session. Duration-modifier stats additionally carry a `direction` field per Convention 13.

Attributes (CORE_ATTRS): `str, vig, agi, dex, wil, kno, res`, plus `all_attributes`.

Offensive: `weaponDamage` (buffWeaponDamage), `physicalDamageBonus`, `magicalDamageBonus`, `typeDamageBonus` (sentinel), `headshotPower`, `armorPenetration`, `magicPenetration`, `headshotDamageBonus`.

Offensive additions:
- `impactPower` — `barbarian.csv:L25,L32`
- `headshotPenetration` — `ranger.csv:L37`
- `projectileSpeed` — `ranger.csv:L43`
- `drawSpeed` — `ranger.csv:L27`

Defensive: `armorRating`, `magicResistance`, `physicalDamageReductionBonus`, `magicalDamageReductionBonus`, `projectileDamageReduction`, `headshotDamageReduction`.

Note: `physicalDamageReductionBonus` / `magicalDamageReductionBonus` are *additive contributions* summed into the `pdr`/`mdr` recipe inputs — not the final computed values. The computed outputs live under recipe IDs `pdr` / `mdr`, and are only addressable via `phase: "cap_override"` (see Fighter Defense Mastery, Barbarian Iron Will).

Defensive additions:
- `knockbackResistance` — `barbarian.csv:L28 (Iron Will "ignore knockback")`
- `armorMovePenaltyReduction` — percent; `fighter.csv:L32 (Swift "Reduces the armor move speed penalty by 30%")`

Speed / timing: `moveSpeed` (flat), `moveSpeedBonus` (percent), `actionSpeed`, `spellCastingSpeed`.

Speed additions:
- `switchingSpeed` — `bard.csv:L31 (Superior Dexterity)`
- `regularInteractionSpeed` (already in STAT_META)

Resource / healing: `maxHealth`, `maxHealthBonus`, `healingMod`, `healingAdd`, `curseDurationBonus`, `buffDurationBonus`, `debuffDurationBonus`, `incomingPhysicalHealing`, `incomingMagicalHealing`.

Resource additions:
- `burnDurationAdd` — flat seconds, **direction: caster, tag: burn** — `wizard.csv:L23 (Fire Mastery +2s)`

Utility additions:
- `potionPotency`, `potionDuration` — `barbarian.csv:L30 (Potion Chugger)` — note: Potion Chugger's duration reduction is alternately authored via `abilityModifiers[].modify: "duration"` targeting `tags: ["potion"]`; keep `potionPotency` as the stat for magnitude, drop `potionDuration` in favor of the abilityModifier path
- `memoryCapacity` — `bard.csv:L26 (Lore Mastery)`
- `shapeshiftTimeReduction`, `wildSkillCooldownReduction` — `druid.csv:L26 (Shapeshift Mastery)`
- `knockbackPowerBonus` — `sorcerer.csv:L22 (Air Mastery)`
- `jumpHeight` — `sorcerer.csv:L46 (Wet status)` (already in STAT_META)

**Duration-modifier stats with `direction` annotation (Convention 13):**

| Stat                  | Unit    | Direction | Tag     | Source                                           |
|-----------------------|---------|-----------|---------|--------------------------------------------------|
| `curseDurationBonus`  | percent | caster    | `curse` | `warlock.csv:L29 (Curse Mastery)` |
| `shoutDurationBonus`  | percent | caster    | `shout` | `barbarian.csv:L34 (Treacherous Lungs)` |
| `burnDurationAdd`     | flat    | caster    | `burn`  | `wizard.csv:L23 (Fire Mastery +2s)` |
| `drunkDurationBonus`  | percent | receiver  | `drunk` | `cleric.csv:L24 (Brewmaster +50%)` — receiver-side because the stat belongs to the receiver of drunk. For Brewmaster specifically, the Cleric always drinks themselves (caster = receiver), so the direction distinction is moot in-practice — but the framework needs receiver-side to correctly handle any cross-caster scenario (e.g., Bard Jolly Time applying drunk to the Cleric). |
| `buffDurationBonus`   | percent | receiver  | —       | existing stat; applies on type=buff effects received by self |
| `debuffDurationBonus` | percent | receiver  | —       | existing stat; applies on type=debuff effects received by self |

**Retired.**
- `spellCostMultiplier` — replaced by `abilityModifiers[].modify: "cost"` with `target: { type: "spell" }` and `mode: "multiply"`. See Category 21.

**Rejected (no new stat).**
- `backstabPower` — `rogue.csv:L23 (Back Attack)` is authored as a `physicalDamageBonus` effect gated by `condition: { type: "player_state", state: "behind_target" }`. No new stat.

---

## Category 14: `effects[].phase`

**Closed set.** Per §3 Phase enum (spec lines 625–661), with one addition.

| Value                  | Cited |
|------------------------|-------|
| `pre_curve_flat`       | `warlock.csv:L40 (Blood Pact +50 AR)`, `warlock.csv:L33 (Soul Collector +1 all_attributes/shard)` |
| `attribute_multiplier` | `warlock.csv:L23 (Malice +15% wil)`, `wizard.csv:L32 (Sage +15% kno)`, `cleric.csv:L48 (Bless +2 all)` |
| `post_curve`           | `warlock.csv:L22 (Demon Armor -10% SCS)`, `barbarian.csv:L27 (Heavy Swing)`, `fighter.csv:L23 (Combo Attack)` |
| `multiplicative_layer` | generic multiplicative DR-like effects (future-extensible) |
| `post_cap_multiplicative_layer` | Multiplicative damage-taken modifier that applies AFTER capped DR. Distinct from `multiplicative_layer` (which operates before the cap). Anchor case: `warlock.csv:L26 (Antimagic)` — verified in `docs/damage_formulas.md:182-188`. Generalizes to any future mechanic that stacks a separate multiplier on incoming damage after the capped DR step. |
| `post_curve_multiplicative` | Multiplies a derived stat's own value by `(1 + value)` AFTER all `post_curve` additive modifiers are folded in. Distinct from `post_cap_multiplicative_layer` (which multiplies final incoming damage) — this scales the STAT itself before it enters any damage formula. Anchor case: `fighter.csv (Veteran Instinct — "PDR increased by 10% of its current value")` per tracker D.25. Used for any CSV phrasing of "X% of current" / "scale your current X by Y%" / "add Y% to your existing X". |
| `type_damage_bonus`    | `warlock.csv:L27 (Dark Enhancement)`, `wizard.csv:L23 (Fire Mastery)`, `cleric.csv:L25 (Faithfulness)` |
| `healing_modifier`     | `warlock.csv:L30 (Immortal Lament)`, `warlock.csv:L32 (Vampirism)`, `cleric.csv:L22 (Advanced Healer)` |
| `cap_override`         | `fighter.csv:L22 (Defense Mastery — PDR cap to 75%)` |

---

## Category 15: `effects[].target`

**Closed set.** Per §3 line 335.

| Value              | Cited |
|--------------------|-------|
| `self`             | majority of self-buffs |
| `enemy`            | `warlock.csv:L47 (Curse of Weakness)`, `cleric.csv:L25 (Faithfulness)`, `rogue.csv:L37 (Weakpoint Attack)` |
| `either`           | `cleric.csv:L53 (Holy Light — heal self OR damage undead)`, `cleric.csv:L54 (Sanctuary)`, `warlock.csv:L46 (Power of Sacrifice)` |
| `party`            | `warlock.csv:L40 (Blood Pact "nearby characters")`, `bard.csv:L30 (Story Teller)`, `barbarian.csv:L29 (Morale Boost)` |
| `nearby_allies`    | `bard.csv:L33 (War Song)`, `barbarian.csv:L47 (War Cry)`, `cleric.csv:L54 (Sanctuary)`, `druid.csv:L24 (Lifebloom Aura)` |
| `nearby_enemies`   | `barbarian.csv:L46 (Savage Roar)`, `warlock.csv:L40 (Blood Pact Abyssal Flame)` |

---

## Category 16: `DAMAGE_TYPES` (locked — 13 values)

**Closed set.** `physical, magical, dark_magical, evil_magical, fire_magical, ice_magical, lightning_magical, arcane_magical, divine_magical, spirit_magical, air_magical, earth_magical, light_magical`.

| Value              | Cited |
|--------------------|-------|
| `physical`         | all melee damage across all classes — e.g. `barbarian.csv:L33,L43,L49`, `rogue.csv:L22,L38`, `fighter.csv:L44,L46`, `druid.csv:L53..L57`, `sorcerer.csv:L87` |
| `magical`          | `warlock.csv:L40 (Blood Pact Abyssal Flame "2(0.25) magical damage")` — valid generic, unprefixed |
| `dark_magical`     | `warlock.csv:L25,L27,L33,L48,L53`, `bard.csv:L47 (Din of Darkness)` |
| `evil_magical`     | `warlock.csv:L39,L46,L49,L50,L54` — distinct from `dark_magical` (mechanically different in-game) |
| `fire_magical`     | `warlock.csv:L55,L57,L58`, `wizard.csv:L50,L56,L57`, `sorcerer.csv:L55,L66,L75,L123,L144,L153,L155` |
| `ice_magical`      | `wizard.csv:L51`, `sorcerer.csv:L46,L61,L128`, `druid.csv:L57 (Penguin Water Cannon)` |
| `lightning_magical`| `wizard.csv:L54,L58`, `sorcerer.csv:L26,L72,L81,L98,L133,L137,L140,L144` |
| `arcane_magical`   | `wizard.csv:L37,L52,L26` |
| `divine_magical`   | `cleric.csv:L25,L37,L39,L52,L53,L54,L55` |
| `spirit_magical`   | `druid.csv:L42,L43` |
| `air_magical`      | `sorcerer.csv:L60,L80,L140` |
| `earth_magical`    | `sorcerer.csv:L71,L154` |
| `light_magical`    | `wizard.csv:L46 (Zap)` — confirmed distinct per coordinator verification |

**Rules (per Conventions 7, 8).**
- True damage is a flag on the damage source (`trueDamage: true`), NOT a distinct type. `true_physical` is dropped; Spiked Gauntlet, Barbarian Finishing Blow, Druid Thorn Coat, Warlock Shadow Touch (`dark_magical` + `trueDamage: true`), Ranger Purge Shot (`magical` + `trueDamage: true`) all use the base type plus the flag.
- Merged spells (Sorcerer) carry **two** entries in `damage[]`, each with its own `damageType`. Both scale on MPB; each scales on its own type bonus independently.

**Rejected.**
- `true_physical`, `true_magical`, `true_dark_magical` — no longer valid types; encoded via `trueDamage: true` flag.

---

## Category 17: `healType`

**Closed set.** `physical`, `magical`.

| Value      | Cited |
|------------|-------|
| `physical` | `ranger.csv:L40 (Field Ration)`, `druid.csv:L40,L41,L44` (nature heals) |
| `magical`  | `warlock.csv:L24,L28,L30,L32`, `cleric.csv:L22,L28,L29,L49,L53,L54`, `druid.csv:L43` |

---

## Category 18: `STATUS_TYPES` (locked — 10 values)

**Closed set.** `burn, frostbite, wet, electrified, poison, bleed, silence, plague, blind, freeze`.

| Value         | Cited |
|---------------|-------|
| `burn`        | `wizard.csv:L46,L50,L56,L57`, `sorcerer.csv:L55,L66,L75,L101,L112,L123,L144,L155` |
| `frostbite`   | `wizard.csv:L25,L28,L51`, `sorcerer.csv:L50,L61,L101,L112,L128,L133,L136` |
| `wet`         | `sorcerer.csv:L46,L95` |
| `electrified` | `wizard.csv:L54,L58`, `sorcerer.csv:L26,L72,L81,L98,L133,L137,L140,L144` |
| `poison`      | `rogue.csv:L30 (Poisoned Weapon, maxStacks=5)` |
| `bleed`       | `rogue.csv:L38 (Rupture)`, `barbarian.csv:L33 (Skull Splitter)`, `druid.csv:L54,L57 (form attacks)` |
| `silence`     | `bard.csv:L38 (Dissonance)`, `fighter.csv:L44 (Pommel Strike)`, `rogue.csv:L40 (Cut Throat)`, `druid.csv:L54 (Panther Neckbite frenziedEffect)` — the in-game disable list (skills/spells/performance) is captured in `desc` prose, not split into separate statuses |
| `plague`      | `druid.csv:L56 (Rat Infected Fangs — 3(0.5) magical damage over 3s)` |
| `blind`       | `cleric.csv:L52 (Holy Strike "blinding them for 4 seconds")` — vision debuff with stat effects; not pure CC |
| `freeze`      | `wizard.csv:L28 (Ice Mastery "freezes feet and prevents them from moving for 0.5 seconds")`, `sorcerer.csv:L128 (Frost Breath "affected area remains frozen")`, `sorcerer.csv:L136 (Icebound "become frozen for 6 seconds")` — immobilize-like stat effects expressed within the status (action-speed and move-speed components) |

**Hidden-in-prose status (compound).**
- Cleric Locust Swarm "reduced incoming magical healing by 50% and reduces incoming physical healing by 50%" — authored as `effects: [{ stat: "incomingPhysicalHealing", value: -0.5 }, { stat: "incomingMagicalHealing", value: -0.5 }]` on a nameless debuff. No `antiheal` status required.

**Rejected.**
- `fear`, `disarm`, `bind`, `root`, `stun`, `slow`, `knockback`, `lift`, `trap`, `immobilize` — these are CC (Category 26), not stat-mutating over-time statuses.

---

## Category 19: `triggers[].stateChange` keys (open)

Keys flipped by a trigger, e.g. `{ spiritual: true }`. Open-ended by design.

| Key                  | Cited |
|----------------------|-------|
| `spiritual`          | `druid.csv:L20 (Dreamwalk)` |
| `frenzy`             | `druid.csv:L54 (Panther Rush)` |
| `drunk`              | `bard.csv:L25 (Jolly Time)`, `bard.csv:L39 (Party Maker — immunity)` |
| `defensive_stance`   | `fighter.csv:L25 (Barricade)` |
| `momentum_stacks`    | `fighter.csv:L48 (Sprint)` |
| `hiding`             | `rogue.csv:L41 (Hide)` |

---

## Category 20: `disables[].type` + filter keys

**Closed set.**

| Value            | Cited |
|------------------|-------|
| `transformation` | `druid.csv:L24 (Lifebloom Aura)` |
| `spell`          | `druid.csv:L26 (Shapeshift Mastery)` → `filter: { tags: ["spirit"] }` |

Filter keys observed: `tags`. `tier`, `id`, `school` anticipated but not cited.

---

## Category 21: `abilityModifiers[].modify` and `.mode`

**Closed set.** `.modify`: `duration, cooldown, castTime, range, aoeRadius, cost`. `.mode`: `multiply, add` (default `multiply`).

| Value        | Cited |
|--------------|-------|
| `duration`   | `barbarian.csv:L34 (Treacherous Lungs +50%)`, `warlock.csv:L29 (Curse Mastery +30%)`, `rogue.csv:L27 (Hide Mastery ×1.5)`, `barbarian.csv:L30 (Potion Chugger -50%, target: { tags: ["potion"] })`, `ranger.csv:L22 (Campfire Mastery +100%)` |
| `cooldown`   | `barbarian.csv:L34 (Treacherous Lungs -10%)`, `rogue.csv:L27 (Hide Mastery -30s add)`, `sorcerer.csv:L28 (Mana Fold -25%)`, `sorcerer.csv:L30 (Spell Sculpting +25%)`, `sorcerer.csv:L32 (Time Distortion +200%)` |
| `castTime`   | `cleric.csv:L32 (Requiem "100% spell casting speed on Resurrection")`, `sorcerer.csv:L32 (Time Distortion -50%)` |
| `range`      | `sorcerer.csv:L30 (Spell Sculpting +25%)` |
| `aoeRadius`  | `sorcerer.csv:L30 (Spell Sculpting +25%)` |
| `cost`       | `warlock.csv:L28 (Torture Mastery)` — authored as `{ target: { type: "spell" }, modify: "cost", value: 2.0, mode: "multiply" }`. Multiplies `cost.value` regardless of `cost.type`. Replaces retired `spellCostMultiplier` stat. |

**Dropped.**
- `charges` — zero CSV citations. Re-add if a future class surfaces it.

---

## Category 22: `grantsArmor` / `removesArmor`

**Open but finite.**

| Value     | Cited |
|-----------|-------|
| `plate`   | `warlock.csv:L22 (Demon Armor — grantsArmor)`, `fighter.csv:L31 (Slayer — removesArmor)` |

`cloth`, `leather` appear only in class-level `Equippable Armor` config rows, not in ability grants. `chain` not referenced by any class.

---

## Category 23: `grantsWeapon`

| Value   | Cited |
|---------|-------|
| `spear` | `ranger.csv:L32 (Spear Proficiency)` |

---

## Category 24: `grantsSpells`

Per coordinator, stays as-is. Druid Orb of Nature's `nature's_touch` grant remains under `grantsSpells` (not `allyEffect`).

| Value                | Cited |
|----------------------|-------|
| `bolt_of_darkness`   | `warlock.csv:L40 (Blood Pact)` |
| `natures_touch`      | `druid.csv:L42 (Orb of Nature)` |

---

## Category 25: `passives` map keys (open)

Display-only flags. Authors should prefer `effects[]` where possible; `passives` is the escape hatch.

| Key                      | Cited |
|--------------------------|-------|
| `spellsCannotKill`       | `warlock.csv:L30 (Immortal Lament)` |
| `phaseThrough`           | `warlock.csv:L41 (Phantomize)` |
| `selfDamagePerSecond`    | `warlock.csv:L40 (Blood Pact Abyssal Flame)` |
| `altSkills`              | `warlock.csv:L40 (Blood Pact)` |
| `overheal`               | `cleric.csv:L29 (Over Healing)` |
| `healingReflection`      | `cleric.csv:L28 (Kindness)` |
| `debuffImmunity`         | `cleric.csv:L24 (Brewmaster)` |
| `channeledAbility`       | `cleric.csv:L37,L39,L54,L55,L56` |
| `cooldownGated`          | `cleric.csv:L25 (Faithfulness)` |
| `hideRevealmentOnBump`   | `rogue.csv:L29 (Pickpocket)` |
| `stealItems`             | `rogue.csv:L29 (Pickpocket)` |
| `moveWhileHiding`        | `rogue.csv:L31 (Stealth)` |
| `moveSpeedPerStep`       | `rogue.csv:L31` |
| `unlockWithoutPicklock`  | `rogue.csv:L33 (Traps and Locks)` |
| `detectTrapsInRange`     | `rogue.csv:L33` |
| `impactResistance`       | `barbarian.csv:L25 (Crush)` |
| `memoryRequiresSkill`    | `bard.csv:L40,L41` |

---

## Category 26: `CC_TYPES`

**Closed set.** `root, stun, slow, bind, silence, disarm, fear, knockback, lift, trap, immobilize`.

| Value            | Cited |
|------------------|-------|
| `root`           | `druid.csv:L45 (Entangling Vines)` |
| `stun`           | `wizard.csv:L49 (Slow "2 seconds")` — ambiguous in prose; in-game behavior is stun-like |
| `slow`           | `cleric.csv:L25,L37,L56`, `ranger.csv:L24`, `fighter.csv:L44,L46`, `wizard.csv:L49 (Slow -40% MS)` |
| `bind`           | `cleric.csv:L51 (Bind)` — stays separate from `root` per coordinator |
| `silence`        | see Category 18 (status); also usable as cc.type citation (same spelling, shared across fields per Convention 5) |
| `disarm`         | `fighter.csv:L41 (Disarm)` |
| `fear`           | `barbarian.csv:L46 (Savage Roar "Frightens")` |
| `knockback`      | `sorcerer.csv:L22 (Air Mastery)`, `sorcerer.csv:L60 (Windblast)`, `sorcerer.csv:L80 (Vortex)`, `wizard.csv:L56 (Fireball)` |
| `lift`           | `sorcerer.csv:L86 (Levitation)`, `sorcerer.csv:L95 (Aqua Prison)`, `sorcerer.csv:L71 (Eruption)`, `sorcerer.csv:L154 (Thorn of Earth)` |
| `trap`           | `sorcerer.csv:L95 (Aqua Prison "water orb engulfs")` |
| `immobilize`     | `sorcerer.csv:L133 (Frost Lightning 1.5s)` |

**Removed from prior draft.**
- `blind` — moved to `STATUS_TYPES` (Cleric Holy Strike applies it as a status, not pure CC).
- `freeze` — moved to `STATUS_TYPES` (Ice Mastery "freezes feet" is immobilize-like stat effects encoded within the status).

---

## Category 27: `shield.damageFilter`

**Closed set.**

| Value              | Cited |
|--------------------|-------|
| `magical`          | `warlock.csv:L56 (Eldritch Shield)` |
| `physical`         | `cleric.csv:L46 (Protection "20 physical damage")` |
| `null` / all types | `wizard.csv:L37 (Arcane Shield)`, `sorcerer.csv:L143 (Mud Shield)` |

---

## Category 28: `summon.type` (open)

| Value             | Cited |
|-------------------|-------|
| `hydra`           | `warlock.csv:L58` |
| `evil_eye`        | `warlock.csv:L52` |
| `treant`          | `druid.csv:L47` |
| `earth_elemental` | `sorcerer.csv:L87` |
| `lava_elemental`  | `sorcerer.csv:L153` |

---

## Category 29: `form.attacks[].damageType` and `frenziedEffect` keys

### damageType — subset of Category 16

| Value         | Cited |
|---------------|-------|
| `physical`    | `druid.csv:L53..L57` |
| `ice_magical` | `druid.csv:L57 (Penguin Water Cannon)` |
| `evil_magical`| `warlock.csv:L40 (Blood Pact — Exploitation Strike bare-hand)` |

### `frenziedEffect` keys (open)

| Key       | Cited |
|-----------|-------|
| `silence` | `druid.csv:L54 (Panther Neckbite)` |

---

## Category 30: `performanceTiers` tier names

**Closed set.** `poor`, `good`, `perfect`.

| Value     | Cited |
|-----------|-------|
| `poor`    | `bard.csv:L8` + all 19 musics L46..L64 |
| `good`    | same |
| `perfect` | same |

---

## Category 31: merged spell `requires` (reference — not vocabulary)

15 pairs recorded from `sorcerer.csv:L95..L155`. Each entry in `requires[]` is a spell ID. A merged spell becomes available when every ID in its `requires[]` is in `selectedSpells`. Pairs:

```
aqua_prison = [water_bolt, levitation]
electric_dash = [lightning_bolt, vortex]
elemental_bolt = [water_bolt, fire_arrow]
flamefrost_spear = [ice_spear, flamestrike]
flamethrower = [fire_arrow, windblast]
frost_breath = [glaciate, windblast]
frost_lightning = [lightning_bolt, ice_spear]
icebound = [stone_skin, glaciate]
lightning_storm = [lightning_sphere, levitation]
lightning_vortex = [lightning_sphere, vortex]
mud_shield = [water_bolt, stone_skin]
plasma_blast = [fire_orb, lightning_sphere]
summon_lava_elemental = [fire_orb, summon_earth_elemental]
thorn_of_earth = [eruption, levitation]
wall_of_fire = [flamestrike, eruption]
```

---

## Category 32: `duration.type` (closed)

**Closed set: `buff`, `debuff`, `other`.**

Duration is an **optional** block on any ability/stacking/afterEffect/appliesStatus/performanceTiers entry. Shape:

```
duration?: {
  base: number,
  type: "buff" | "debuff" | "other",
  tags?: string[]
}
```

Omission signals toggle/permanent/until-event per Convention 14.

| Value    | Cited examples (abbreviated — full per-class inventory below) |
|----------|----------------------------------------------------------------|
| `buff`   | `barbarian.csv:L24 (Carnage 3s)`, `fighter.csv:L34 (Veteran Instinct 4s)`, `warlock.csv:L42 (Dark Offering 60s)`, `bard.csv:L46 (Rousing Rhythms 60/120/240s)`, `druid.csv:L40 (Nature's Touch 12s)`, `cleric.csv:L48 (Bless 30s)`, `wizard.csv:L53 (Haste 6s)`, `sorcerer.csv:L49 (Stone Skin 12s)`, `ranger.csv:L37 (Penetrating Shot 8s)`, `rogue.csv:L22 (Ambush 3s)` |
| `debuff` | `barbarian.csv:L39 (Achilles Strike 2s)`, `fighter.csv:L44 (Pommel Strike 2s)`, `warlock.csv:L47 (Curse of Weakness 12s)`, `bard.csv:L54 (Banshees Howl 20s)`, `druid.csv:L54 (Panther Scratch bleed 3s)`, `cleric.csv:L25 (Faithfulness 1s)`, `wizard.csv:L22 (Melt 2s)`, `sorcerer.csv:L50 (Frostbite 1s)`, `rogue.csv:L38 (Rupture 5s)` |
| `other`  | `barbarian.csv:L46 (Savage Roar 6s — fear, "other" per wiki)`, `fighter.csv:L42 (Fortified Ground 45s banner)`, `warlock.csv:L58 (Summon Hydra 10s)`, `cleric.csv:L54 (Sanctuary 5s channel)`, `druid.csv:L45 (Entangling Vines zone 3s)`, `druid.csv:L47 (Summon Treant 24s)`, `sorcerer.csv:L87 (Summon Earth Elemental 18s)`, `sorcerer.csv:L46 (Water Bolt orb 12s)`, `wizard.csv:L48 (Magic Lock 10s)`, `rogue.csv:L39 (Caltrops zone 3s)` |

**Per-class duration inventory.**

- **barbarian** — buff (Carnage, Rage, War Cry, War Sacrifice, Blood Exchange, Adrenaline Rush-like bundles), debuff (Achilles Strike, Skull Splitter bleed), other (Savage Roar fear)
- **bard** — buff (Rousing Rhythms tiered, War Song, Harmonic Shield, Aria of Alacrity, Ballad of Courage, Tranquility HoT, Song of Shadow invis, Chorale of Clarity, Beats of Alacrity, Allegro, Accelerando, Party Maker immunity), debuff (Dissonance silence, Shriek of Weakness, Banshees Howl, Song of Silence, Lament of Languor, Piercing Shrill echo)
- **cleric** — buff (Divine Protection, Smite window, Protection shield, Bless, Divine Strike), debuff (Faithfulness slow, Judgement slow, Bind, Holy Strike blind, Holy Strike status, Locust Swarm antiheal), other (Sanctuary channel, Locust Swarm channel, Earthquake channel)
- **druid** — buff (Dreamwalk spiritual, Force of Nature, Nature's Touch HoT, Barkskin Armor, Restore HoT, Tree of Life HoT, Enhanced Wildness form-gated, Bear Wild Fury, Rat Survival Instinct, Penguin Dash), debuff (Panther Scratch bleed, Rat Infected Fangs plague, Penguin Sharp Beak bleed, Rat Survival Instinct afterEffect), other (Entangling Vines zone, Thorn Barrier zone, Summon Treant, Mending Grove TBD)
- **fighter** — buff (Adrenaline Spike, Counterattack, Last Bastion, Veteran Instinct, Weapon Guard, Adrenaline Rush main, Breakthrough, Disarm window, Perfect Block, Second Wind HoT, Spell Reflection, Taunt, Sprint momentum decay), debuff (Adrenaline Rush afterEffect, Disarm applied, Pommel Strike slow, Shield Slam slow), other (Fortified Ground banner)
- **ranger** — buff (Penetrating Shot, Quick Fire, Forceful Shot, True Shot), debuff (Crippling Shot)
- **rogue** — buff (Ambush, Creep, Hide invisibility), debuff (Poisoned Weapon, Weakpoint Attack, Rupture bleed, Caltrops slow, Cut Throat silence, Smoke Pot slow), other (Caltrops zone, Smoke Pot zone)
- **sorcerer** — buff (Merged Might, Stone Skin, Glaciate self-weapon, Lightning Sphere aura, Mud Shield, Icebound), debuff (Wet, Frostbite, Burn, Electrified, Immobilize, Aqua Prison trap/lift, Frost Lightning immobilize), other (orb/beam/zone/summon durations throughout)
- **warlock** — buff (Immortal Lament heal bonus, Phantomize, Dark Offering, Power of Sacrifice self-cast bundle, Bloodstained Blade, Flame Walker self, Eldritch Shield on-break), debuff (Blow of Corruption healing debuff, Curse of Weakness, Curse of Pain DoT), other (Evil Eye summon, Life Drain channel, Hellfire, Flame Walker trail, Summon Hydra, Eldritch Shield itself)
- **wizard** — buff (Arcane Feedback, Reactive Shield, Arcane Shield, Ignite weapon, Haste, Invisibility), debuff (Melt, Ice Shield Frostbite, Zap Burn, Slow, Ice Bolt Frostbite, Lightning Strike Electrified, Fireball Burn, Explosion Burn, Chain Lightning Electrified), other (Magic Lock, Explosion cast delay)

**Classification rules (locked per coordinator).**

- **Channels / beams / zone lifetimes / summon lifetimes** are `type: "other"`. Duration-modifier stats (buffDuration, debuffDuration) do NOT apply.
- **Racial skins and monster-fear analogs (e.g., Savage Roar)** are `type: "other"` with `tags: ["shout"]` — caster-side shout modifier still applies; target debuffDuration does not.
- **Multirole self-bundles** (Rage, War Sacrifice, Phantomize, Icebound, Adrenaline Rush main) use ability-level `type: "buff"` governing both buff and self-debuff effects sharing the same duration.
- **afterEffect** blocks typically use `type: "debuff"` with `target: "self"`. Self debuffDuration (negative) shortens the penalty — correct player-benefit outcome.
- **Duration is optional.** Omit for Blood Pact, Dark Reflection, Reckless Attack, Victory Strike, War Sacrifice (toggle), Spirit Magic Mastery, Hellfire, and similar toggle/permanent abilities.

---

## Category 33: `duration.tags` (open; seeded with modifier-bearing tags)

**Open set.** Tags on a `duration` block opt the duration into directional modifiers. Seed vocabulary below. Each tag binds to a STAT_META entry with a `direction` field (Convention 13) and an operator.

| Tag     | Operator | Direction       | Modifier stat         | Seed citation                                     |
|---------|----------|-----------------|-----------------------|---------------------------------------------------|
| `curse` | multiply | caster   | `curseDurationBonus`  | `warlock.csv:L29 (Curse Mastery +30%)`            |
| `shout` | multiply | caster   | `shoutDurationBonus`  | `barbarian.csv:L34 (Treacherous Lungs +50%)`      |
| `burn`  | add (s)  | caster   | `burnDurationAdd`     | `wizard.csv:L23 (Fire Mastery +2s)`               |
| `drunk` | multiply | receiver | `drunkDurationBonus`  | `cleric.csv:L24 (Brewmaster +50%)`                |

**Abilities that opt in (seed bindings).**

- `curse` — `warlock.csv:L47 (Curse of Weakness)`, `warlock.csv:L50 (Curse of Pain DoT)`, `warlock.csv:L39 (Blow of Corruption healing debuff — curse-tagged by default, flagged for in-game verification in unresolved_questions.md)`
- `shout` — `barbarian.csv:L47 (War Cry)`, `barbarian.csv:L46 (Savage Roar)`, `fighter.csv:L49 (Taunt)`
- `burn` — every burn status application (Category 18 burn citations). Fire Mastery's +2s is a flat-add step before the multiplicative chain.
- `drunk` — `bard.csv:L25 (Jolly Time)`; Brewmaster's extension flagged for in-game verification (it may only remove detrimental parts, not extend duration)

**Application order (four steps, locked per coordinator).**

1. **Caster-side FLAT adds** by tag (seconds). Example: `burn` → `+burnDurationAdd` seconds.
2. **Caster-side MULTIPLIERS** by tag. Example: `curse` → `× (1 + curseDurationBonus)`; `shout` → `× (1 + shoutDurationBonus)`.
3. **Receiver-side multiplier** by `type` + effect target, with receiver-side tag modifiers (e.g., `drunk` on self) applied in the same step:
   - `type: "buff"` + target self/ally → `× (1 + self.buffDurationBonus)`
   - `type: "buff"` + target enemy (rare) → `× (1 + target.buffDurationBonus)`
   - `type: "debuff"` + target enemy → `× (1 + target.debuffDurationBonus)`
   - `type: "debuff"` + target self (e.g., afterEffects) → `× (1 + self.debuffDurationBonus)`
   - `type: "other"` → no type-based receiver modifier
   - `tags: ["drunk"]` + target self → additionally `× (1 + self.drunkDurationBonus)` (receiver-side tag modifier applies regardless of type)
4. **Tick derivation** for DoT status (when duration drives tick math):
   - `effectiveTicks = max(0, floor(effectiveDuration / tickRate))`, default `tickRate = 1s`
   - Preserves wiki rule: Zap's 1s burn can yield 0 ticks with sufficient target debuffDurationBonus

**Open-set note.** Future classes may surface additional tags (e.g., `blessing`, `hex`, `stance`). New tags require a PR updating this file with the binding table row (tag, operator, direction, stat).

---

## Coordinator Follow-ups (deferred to class-definition session)

Not in scope for this PR; tracked here and in `docs/unresolved_questions.md` as appropriate.

1. **In-game verifications** flagged in `docs/unresolved_questions.md`:
   - Brewmaster drunk-extension: does it actually extend duration, or only remove detrimental parts?
   - Blow of Corruption: is it curse-tagged for Curse Mastery extension?
   - Mending Grove duration: CSV omits it.
   - `light_magical` vs `lightning_magical`: confirm Zap's damage type per Zap's floater color.
   - Multirole self-bundle classification (Rage, Phantomize, Icebound): confirm `type: "buff"` matches in-game buff/debuff UI classification.

2. **Warlock Darkness Shard shared-pool stacking** — current `stacking` shape is per-ability; the shared 3-cap pool across Soul Collector, Blood Pact, Spell Predation needs a cross-ability model. Design in the class-implementation session.
