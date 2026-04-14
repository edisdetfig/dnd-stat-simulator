# Controlled Vocabulary Master Table

> **Purpose.** Single source of truth for every controlled-vocabulary string used in the v3 unified ability shape (`docs/ability_data_map_v2.md` §3). Produced from a holistic survey of all 10 class CSVs (`docs/classes/*.csv`) on 2026-04-12.
>
> **Status.** Proposal for coordinator approval. Implementation — code changes to `src/data/constants.js`, class data authoring, validator updates — is a follow-up session. This file does not author any values beyond the ones cited from CSV prose.
>
> **Citation grammar.** Every value below carries at least one citation of the form `class.csv:Lnn (ability name)`. Lnn = line number in the class CSV at survey time. Values with zero CSV citations are marked `[DEAD]` and flagged separately. Values that exist in code enums but have zero CSV citations are flagged `[DEAD in code]`.
>
> **Scope.** Vocabulary only — membership of enum-valued fields. Does NOT cover: numeric value semantics, calculation formulas, verification levels, or ability-ID cross-references (e.g., `grantsSpells` spell IDs, `abilityModifiers.target` ability IDs). Those are authored or referential data, not vocabulary.

---

## Conventions

Rules that govern every vocabulary decision below.

1. **Class-agnostic, school-agnostic naming.** No class names, no damage schools, no ability names embedded in event strings, player states, or condition values. Events describe *what happened*; ability-specific nuance goes in the owning ability's `desc`. Example: `on_curse_tick` is acceptable because "curse" is a tag that any class can use; a hypothetical `on_warlock_curse_tick` would not be. Example counter: `on_divine_attack_hit` (Cleric) is school-specific and rejected in favor of `on_damage_dealt` + `condition.tags: ["divine"]`.

2. **`on_*` prefix for all event strings.** Both `TRIGGER_EVENTS` (ability-level `triggers[].event`) and stacking `triggerOn`/`consumedOn` values use the `on_*` prefix. This is a naming convention only; gear-level `triggers[].on` values use bare names per `GEAR_TRIGGER_EVENTS` comment in `src/data/constants.js` and are a separate vocabulary out of scope for this table.

3. **`desc` is the only human-readable display field.** Every human-readable string — on the ability root, on `stacking`, on `appliesStatus[]`, on `afterEffect`, on any future block — is named `desc`. This rule supersedes any legacy naming (`tooltip`, `description`, `notes`). Ability-specific nuance that doesn't fit an enum lives in `desc` as prose, not in a new field.

4. **Snapshot principle governs temporal vocabulary.** `duration`, `cooldown`, `consumedOn`, `triggerOn`, `tickRate` are display metadata. Their vocabulary is validated for spelling, but the engine does not dispatch on these strings — it treats every ability as a toggle. Do not invent new trigger events just to drive real-time simulation; model as display strings.

5. **One enum per concept.** If a concept (e.g., `silence`) appears in two fields (e.g., `appliesStatus[].type` and `cc.type`), it shares one canonical spelling. Cross-field membership is allowed; duplicate spellings are not.

6. **Snake_case for all enum values.** Multi-word values separated by `_`. `dark_magical`, not `darkMagical` or `dark-magical` or `dark magical`.

7. **`<element>_magical` for elemental damage types.** `fire_magical`, `ice_magical`, `lightning_magical`, `arcane_magical`, `earth_magical`, `air_magical`, `dark_magical`, `evil_magical`, `divine_magical`, `spirit_magical`. The element is the school; `magical` is the damage family. Bare element names (`fire`, `frost`) are used only as `tags`.

8. **True damage = damage type + flag.** `true_physical` is a canonical damage type in its own right (Spiked Gauntlet anchor uses it). For "true" variants of magical types (Warlock Shadow Touch, Ranger Purge Shot), two encodings are possible: (a) a standalone type (`true_dark_magical`, `true_magical`), or (b) the base type plus `trueDamage: true` on the damage source. **Pending coordinator decision** — see `[COORD-DMG-TRUE]` in Coordinator Questions.

9. **Status vs. CC partition.** STATUS_TYPES are stat-mutating over-time effects (burn DoT, frostbite debuff, poison DoT, silence-as-debuff). CC_TYPES are instantaneous-or-duration control effects that prevent actions (stun, root, fear, disarm, knockback, lift). When a concept straddles (e.g., `silence`), it is defined in STATUS_TYPES only; `cc.type` does not duplicate.

10. **Openness rules.** `tags`, `passives` map keys, `triggerOn`/`consumedOn` strings, `summon.type`, and `stateChange` keys are explicitly **open-ended**. This table records every observed value with a citation. Additions in future classes are expected; this table is the seed list, not the closed set. Every other category is **closed** — additions require a PR updating this file plus `src/data/constants.js`.

11. **`plural_ambiguity` drift**: `immobilize` vs `immobilized`, `trap` vs `trapped` — canonical form is the verb infinitive (`immobilize`, `trap`). Pending confirmation.

12. **Ability IDs and spell IDs are referential.** `grantsSpells`, `abilityModifiers.target` (string form), `healEffects.source`, `afterEffect.removedBy`, `merged_spell.components`, `condition.effectId` carry string identifiers that must resolve to a real ability's `id`. They are not controlled vocabulary; this document does not enumerate them.

---

## Coverage Matrix

Per-class × per-category count of contributing values. Numbers are counts of distinct values (not occurrences). `—` means zero contribution. `·` means the class has no abilities of the relevant kind (e.g., Fighter has no spells so contributes nothing to damage types beyond melee).

| Category                        | barb | bard | cler | drud | figh | rang | rogu | sorc | warl | wizd |
|---------------------------------|------|------|------|------|------|------|------|------|------|------|
| 1  `type`                       | 2    | 4    | 3    | 4    | 2    | 2    | 2    | 4    | 3    | 3    |
| 2  `activation`                 | 3    | 3    | 3    | 3    | 2    | 2    | 2    | 3    | 3    | 3    |
| 3  `targeting`                  | 4    | 4    | 4    | 2    | 2    | 2    | 1    | 2    | 3    | 2    |
| 4  `consumedOn`                 | 1    | —    | 1    | —    | 3    | 1    | 2    | 1    | 3    | 1    |
| 5  `tags` (open)                | 3    | 10   | 8    | 2    | 6    | 8    | 10   | 5    | 4    | 6    |
| 6  `condition.type`             | 3    | 3    | 4    | 2    | 6    | 2    | 2    | 2    | 4    | 2    |
| 7  `condition.form`             | —    | —    | —    | 5    | —    | —    | —    | —    | 1    | —    |
| 8  `condition.env`              | —    | —    | —    | 2    | —    | —    | —    | —    | —    | —    |
| 9  `condition.weaponType`       | 2    | 2    | 1    | —    | 5    | 4    | 1    | 3    | 3    | 1    |
| 10 `condition.state`            | 1    | 2    | 2    | —    | 4    | 2    | 2    | 3    | —    | —    |
| 11 `condition.slot`+equipped    | 1    | —    | —    | —    | —    | —    | —    | —    | —    | —    |
| 12 `cost.type`                  | 1    | —    | 1    | 1    | —    | —    | —    | 1    | 1    | 1    |
| 13 `slots.type`                 | —    | 1    | 1    | 2    | —    | —    | —    | 1    | 1    | 1    |
| 14 `effects[].stat`             | 14   | 11   | 10   | 8    | 11   | 7    | 9    | 11   | 20   | 8    |
| 15 `effects[].phase`            | 2    | 1    | 4    | 3    | 3    | 2    | 4    | 3    | 6    | 3    |
| 16 `effects[].target`           | 3    | 2    | 4    | 3    | 2    | 2    | 3    | 2    | 3    | 2    |
| 17 damage type                  | 2    | 2    | 4    | 5    | 2    | 2    | 2    | 6    | 5    | 5    |
| 18 `healType`                   | 1    | —    | 1    | 2    | —    | 1    | —    | —    | 1    | —    |
| 19 `appliesStatus[].type`       | 1    | 1    | 3    | 2    | 3    | —    | 3    | 5    | 0    | 3    |
| 20 `triggers[].event`           | 3    | 2    | 4    | 2    | 5    | 1    | 2    | 2    | 6    | 2    |
| 21 `triggers[].stateChange`     | —    | 2    | 1    | 2    | 3    | 2    | 2    | —    | 1    | —    |
| 22 `disables[].type`+filter     | —    | —    | —    | 2    | —    | —    | —    | —    | —    | —    |
| 23 `abilityModifiers[].modify`  | 2    | —    | 3    | —    | —    | —    | 2    | 4    | 2    | —    |
| 24 `grantsArmor`/`removesArmor` | —    | —    | —    | —    | 1    | —    | —    | —    | 1    | —    |
| 25 `grantsWeapon`               | —    | —    | —    | —    | —    | 1    | —    | —    | —    | —    |
| 26 `grantsSpells`               | —    | —    | —    | 1    | —    | —    | —    | —    | 1    | —    |
| 27 `passives` keys              | 2    | 1    | 7    | 2    | 1    | 1    | 4    | —    | 4    | 3    |
| 28 `cc.type`                    | 1    | 1    | 4    | 1    | 3    | 1    | 1    | 5    | —    | 3    |
| 29 `stacking.triggerOn/consumed`| 2    | 1    | —    | —    | 3    | —    | 2    | 2    | 4    | 1    |
| 30 `shield.damageFilter`        | —    | —    | 1    | —    | —    | —    | —    | 2    | 1    | 1    |
| 31 `summon.type`                | —    | —    | —    | 1    | —    | —    | —    | 2    | 2    | —    |
| 32 `summon.environmentBonus`    | —    | —    | —    | 1    | —    | —    | —    | —    | —    | —    |
| 33 `form.attacks[].damageType`  | —    | —    | —    | 3    | —    | —    | —    | —    | 1    | —    |
| 33 `form.attacks[].frenziedEff` | —    | —    | —    | 1    | —    | —    | —    | —    | —    | —    |
| 34 `performanceTiers` names     | —    | 3    | —    | —    | —    | —    | —    | —    | —    | —    |
| 35 `merged_spell.components`    | —    | —    | —    | —    | —    | —    | —    | 15   | —    | —    |

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
| `music`          | `bard.csv:L46..L64` (all 19 Bard musics — Rousing Rhythms, Din of Darkness, Beats of Alacrity, Allegro, Accelerando, Unchained Harmony, Shriek of Weakness, Piercing Shrill, Banshees Howl, Song of Silence, Peacemaking, Lament of Languor, Chaotic Discord, Aria of Alacrity, Tranquility, Song of Shadow, Harmonic Shield, Chorale of Clarity, Ballad of Courage) |
| `merged_spell`   | `sorcerer.csv:L95..L155` (Aqua Prison, Electric Dash, Elemental Bolt, Flamefrost Spear, Flamethrower, Frost Breath, Frost Lightning, Icebound, Lightning Storm, Lightning Vortex, Mud Shield, Plasma Blast, Summon Lava Elemental, Thorn of Earth, Wall of Fire) |

**Rejected candidates.** None — set is closed and every value is cited.

---

## Category 2: `activation`

**Closed set.** Values from §3 line 265.

| Value     | Cited |
|-----------|-------|
| `passive` | every perk row across every class — e.g. `barbarian.csv:L22 (Axe Specialization)`, `warlock.csv:L26 (Antimagic)` |
| `toggle`  | `warlock.csv:L25 (Dark Reflection)`, `warlock.csv:L41 (Phantomize)`, `warlock.csv:L42 (Dark Offering)`, `fighter.csv:L25 (Barricade — defensive_stance)`, `wizard.csv:L31 (Reactive Shield)`, `wizard.csv:L38 (Intense Focus)` |
| `cast`    | damage spells and one-shots — e.g. `warlock.csv:L48 (Bolt of Darkness)`, `fighter.csv:L50 (Victory Strike)`, `sorcerer.csv:L46 (Water Bolt)`, `cleric.csv:L40 (Smite)` |

**Rejected candidates.**

- `channel` — prose verb appears in `warlock.csv:L42 (Dark Offering "Channel your mind")`, `L52 (Evil Eye "Channel for 1 second")`, `L53 (Ray of Darkness)`, `L54 (Life Drain)`; `wizard.csv:L39 (Meditation "meditative state")`. Reason for rejection: all channel behaviors collapse to `toggle` or `cast` under the Snapshot principle. A "channeled" ability either stays on for its duration (toggle) or delivers a one-shot burst of damage while channeling (cast). No gameplay distinction at snapshot time justifies a fourth activation mode.
- `charged`, `instant` — not observed in any CSV.

---

## Category 3: `targeting`

**Closed set.** Values from §3 line 236.

| Value            | Cited |
|------------------|-------|
| `self`           | every perk defaulting to self — e.g. `warlock.csv:L22 (Demon Armor)`, `fighter.csv:L25 (Barricade)`, `bard.csv:L22..L33` |
| `ally_or_self`   | `bard.csv:L30 (Story Teller "nearby party members... applies to yourself")`, `bard.csv:L33 (War Song)`, `warlock.csv:L49 (Bloodstained Blade "Self cast if no target")`, `warlock.csv:L56 (Eldritch Shield "Grants the target a shield")`, `cleric.csv:L46 (Protection)`, `cleric.csv:L47 (Cleanse)`, `cleric.csv:L48 (Bless)`, `cleric.csv:L49 (Lesser Heal)`, `cleric.csv:L50 (Divine Strike)`, `cleric.csv:L53 (Holy Light)`, `cleric.csv:L57 (Resurrection)`, `barbarian.csv:L47 (War Cry)` |
| `enemy`          | all damage spells — e.g. `warlock.csv:L48 (Bolt of Darkness)`, `sorcerer.csv:L46 (Water Bolt)`, `wizard.csv:L56 (Fireball)`, `cleric.csv:L52 (Holy Strike)`, `barbarian.csv:L39 (Achilles Strike)` |
| `enemy_or_self`  | `warlock.csv:L46 (Power of Sacrifice "Self casts if no target is found")`, `bard.csv:L56 (Lament of Languor)`, `bard.csv:L59 (Chaotic Discord)` |

**Rejected candidates.** None. `either` exists as an **effect-level** target (Category 16), not ability-level.

---

## Category 4: `consumedOn` (ability-level display metadata)

**Open set** (display strings, per Snapshot principle). `on_*` prefix applied during canonicalization of CSV prose.

| Value                 | Cited |
|-----------------------|-------|
| `on_next_attack`      | `warlock.csv:L39 (Blow of Corruption "Your next physical attack")`, `barbarian.csv:L41 (Finishing Blow)`, `barbarian.csv:L45 (Reckless Attack)`, `fighter.csv:L50 (Victory Strike "Your next attack")`, `rogue.csv:L38 (Rupture "next successful attack")`, `ranger.csv:L28 (Purge Shot)` |
| `on_next_spell`       | `fighter.csv:L47 (Spell Reflection "persists until triggered")` |
| `on_dark_spell_cast`  | `warlock.csv:L33 (Soul Collector)`, `warlock.csv:L51 (Spell Predation "consumed when casting a dark spell")` |
| `on_duration_expire`  | `warlock.csv:L42 (Dark Offering 60s)` — display-only per Snapshot principle |
| `on_melee_block`      | `fighter.csv:L41 (Disarm "If you block a melee attack with your weapon within 8 seconds")` |
| `on_shield_absorb_full` | `warlock.csv:L56 (Eldritch Shield "When the shield absorbs its maximum damage")` — referenced both as trigger (Cat 20) and as consumption marker on the shield |

**Rejected candidates.**

- `on_heal` — Cleric Kindness and Bard Fermata are trigger-driven, not consumption-driven. No CSV uses `consumedOn` for a heal event.
- `on_poisoned_weapon_attack` (Rogue) — this is a *trigger* for poison application, not a consumedOn value. Modeled under Category 20 / Category 29.

---

## Category 5: `tags` (open)

**Open set.** The richest vocabulary in the survey; seeded below. Adding a tag in a new class does not require updating a closed enum, but authors SHOULD update this list to preserve discoverability. Values appear verbatim across multiple fields — damage-type prefixes (Cat 17), `disables[].filter`, `abilityModifiers[].target`, `condition.tags`.

### Spell-school / element tags

| Value      | Cited |
|------------|-------|
| `fire`     | `sorcerer.csv:L55 (Fire Arrow)`, `sorcerer.csv:L66 (Flamestrike)`, `sorcerer.csv:L75 (Fire Orb)`, `wizard.csv:L23 (Fire Mastery)`, `wizard.csv:L50 (Ignite)`, `wizard.csv:L56 (Fireball)` |
| `frost`    | `sorcerer.csv:L50 (Glaciate)`, `sorcerer.csv:L61 (Ice Spear)`, `wizard.csv:L28 (Ice Mastery)`, `wizard.csv:L51 (Ice Bolt)` |
| `lightning`| `sorcerer.csv:L26 (Lightning Mastery)`, `sorcerer.csv:L72 (Lightning Bolt)`, `sorcerer.csv:L81 (Lightning Sphere)`, `wizard.csv:L54 (Lightning Strike)`, `wizard.csv:L58 (Chain Lightning)` |
| `air`      | `sorcerer.csv:L22 (Air Mastery)`, `sorcerer.csv:L60 (Windblast)`, `sorcerer.csv:L80 (Vortex)` |
| `earth`    | `sorcerer.csv:L49 (Stone Skin)`, `sorcerer.csv:L71 (Eruption)`, `sorcerer.csv:L154 (Thorn of Earth)` |
| `water`    | `sorcerer.csv:L46 (Water Bolt)`, `sorcerer.csv:L95 (Aqua Prison)` |
| `arcane`   | `wizard.csv:L26 (Arcane Feedback)`, `wizard.csv:L27 (Arcane Mastery)`, `wizard.csv:L37 (Arcane Shield)`, `wizard.csv:L52 (Magic Missile)` |
| `dark`     | `warlock.csv:L24 (Shadow Touch)`, `warlock.csv:L25 (Dark Reflection)`, `warlock.csv:L27 (Dark Enhancement)`, `warlock.csv:L48 (Bolt of Darkness)`, `warlock.csv:L53 (Ray of Darkness)` |
| `evil`     | `warlock.csv:L39 (Blow of Corruption "evil magical")`, `warlock.csv:L50 (Curse of Pain)`, `warlock.csv:L54 (Life Drain)` — (see `[COORD-TAG-EVIL]`; may merge with `dark`) |
| `holy`     | `cleric.csv:L26 (Holy Aura)`, `cleric.csv:L27 (Holy Water)`, `cleric.csv:L39 (Holy Purification)`, `cleric.csv:L52 (Holy Strike)`, `cleric.csv:L53 (Holy Light)` |
| `divine`   | `cleric.csv:L25 (Faithfulness)`, `cleric.csv:L32 (Requiem)`, `cleric.csv:L37 (Judgement)` — (see `[COORD-TAG-HOLY-DIVINE]`; possible merge with `holy`) |
| `spirit`   | `druid.csv:L42 (Orb of Nature "spirit magical")`, `druid.csv:L43 (Dreamfire "spirit magical")`, `druid.csv:L26 (Shapeshift Mastery "Prevents the use of spirit spells")` |
| `nature`   | `druid.csv:L22 (Force of Nature)`, `druid.csv:L40 (Nature's Touch)`, `druid.csv:L42 (Orb of Nature)`, `druid.csv:L48 (Mending Grove)` |
| `light`    | `wizard.csv:L46 (Zap "light magical")`, `wizard.csv:L47 (Light Orb)` — see `[COORD-DMG-LIGHT]` |
| `curse`    | `warlock.csv:L28 (Torture Mastery)`, `warlock.csv:L29 (Curse Mastery)`, `warlock.csv:L47 (Curse of Weakness)`, `warlock.csv:L50 (Curse of Pain)` |
| `undead`   | `cleric.csv:L33 (Undead Slaying)`, `cleric.csv:L39 (Holy Purification "to undead")`, `warlock.csv:L31 (Infernal Pledge "undead and demons")` |
| `demon`    | `warlock.csv:L22 (Demon Armor)`, `warlock.csv:L40 (Blood Pact)`, `warlock.csv:L31 (Infernal Pledge)` |
| `blood`    | `warlock.csv:L40 (Blood Pact)`, `warlock.csv:L49 (Bloodstained Blade)` |

### Mechanic-kind tags

| Value        | Cited |
|--------------|-------|
| `shout`      | `barbarian.csv:L34 (Treacherous Lungs "shouting abilities")`, `barbarian.csv:L46 (Savage Roar)`, `barbarian.csv:L47 (War Cry)`, `fighter.csv:L49 (Taunt)` |
| `stance`     | `fighter.csv:L25 (Barricade — defensive stance)`, `fighter.csv:L29 (Projectile Resistance)`, `fighter.csv:L30 (Shield Mastery)`, `fighter.csv:L33 (Sword Mastery)` |
| `roar`       | `barbarian.csv:L46 (Savage Roar)` |
| `aura`       | `cleric.csv:L26 (Holy Aura)`, `druid.csv:L24 (Lifebloom Aura)`, `barbarian.csv:L47 (War Cry — allies in radius)` |
| `channel`    | `warlock.csv:L42 (Dark Offering)`, `warlock.csv:L52 (Evil Eye)`, `warlock.csv:L53 (Ray of Darkness)`, `warlock.csv:L54 (Life Drain)`, `wizard.csv:L39 (Meditation)` |
| `projectile` | `warlock.csv:L48 (Bolt of Darkness)`, `sorcerer.csv:L46 (Water Bolt)`, `ranger.csv:L43 (True Shot "projectile flight speed")` |
| `beam`       | `warlock.csv:L53 (Ray of Darkness)`, `sorcerer.csv:L123 (Flamethrower)` |
| `trap`       | `ranger.csv:L33 (Trap Mastery)`, `rogue.csv:L39 (Caltrops)`, `rogue.csv:L33 (Traps and Locks)`, `sorcerer.csv:L95 (Aqua Prison)` |
| `song`       | `bard.csv:L46..L64` |
| `dance`      | `bard.csv:L23 (Dancing Feet)` — weaker signal; display only |
| `stealth`    | `rogue.csv:L22 (Ambush)`, `rogue.csv:L27 (Hide Mastery)`, `rogue.csv:L31 (Stealth)`, `rogue.csv:L41 (Hide)` |
| `backstab`   | `rogue.csv:L22 (Ambush)`, `rogue.csv:L23 (Back Attack)` |
| `poison`     | `rogue.csv:L30 (Poisoned Weapon)` |
| `bleed`      | `rogue.csv:L38 (Rupture)`, `druid.csv:L54 (Panther Scratch)`, `druid.csv:L57 (Penguin Sharp Beak)`, `barbarian.csv:L33 (Skull Splitter)` |
| `shot`       | `ranger.csv:L24 (Crippling Shot)`, `ranger.csv:L28 (Purge Shot)`, `ranger.csv:L37 (Penetrating Shot)`, `ranger.csv:L43 (True Shot)`, `ranger.csv:L44 (Quickshot)` |
| `judgment`   | `cleric.csv:L37 (Judgement)` — see `[COORD-TAG-JUDGMENT]` |
| `prayer`     | `cleric.csv:L25 (Faithfulness)`, `cleric.csv:L32 (Requiem)` — see `[COORD-TAG-PRAYER]` |
| `blessing`   | `cleric.csv:L27 (Holy Water grants Bless)`, `cleric.csv:L48 (Bless)` |

### Instrument-family tags (Bard)

| Value   | Cited |
|---------|-------|
| `drum`  | `bard.csv:L46 (Rousing Rhythms)`, `bard.csv:L47 (Din of Darkness)`, `bard.csv:L48 (Beats of Alacrity)`, `bard.csv:L49 (Allegro)`, `bard.csv:L50 (Accelerando)` |
| `flute` | `bard.csv:L51 (Unchained Harmony)`, `bard.csv:L52 (Shriek of Weakness)`, `bard.csv:L53 (Piercing Shrill)`, `bard.csv:L54 (Banshees Howl)` |
| `lute`  | `bard.csv:L55 (Song of Silence)`, `bard.csv:L56 (Peacemaking)`, `bard.csv:L57 (Lament of Languor)`, `bard.csv:L58 (Chaotic Discord)`, `bard.csv:L59 (Aria of Alacrity)` |
| `lyre`  | `bard.csv:L60 (Tranquility)`, `bard.csv:L61 (Song of Shadow)`, `bard.csv:L62 (Harmonic Shield)`, `bard.csv:L63 (Chorale of Clarity)`, `bard.csv:L64 (Ballad of Courage)` |

**Rejected candidates.**

- `music`, `buff`, `debuff`, `utility`, `movement`, `heal`, `protection`, `silent` (Bard survey) — these are categorizations a human reader applies, not tags the engine filters on. Rejected in favor of concrete mechanic tags (`song`, `shout`, `stance`) and leaving classification implicit in `type`/`activation`.
- `throw` — anticipated for Rogue throwing daggers; no CSV uses it.

---

## Category 6: `condition.type`

**Closed set.** Current enum: `form_active, hp_below, effect_active, environment, frenzy_active, weapon_type, dual_wield, player_state, equipment`.

| Value           | Cited |
|-----------------|-------|
| `form_active`   | `druid.csv:L53..L57` (all 5 forms), `warlock.csv:L40 (Blood Pact — demon form)` |
| `hp_below`      | `warlock.csv:L30 (Immortal Lament — 5%)`, `fighter.csv:L24 (Adrenaline Spike — 40%)`, `fighter.csv:L28 (Last Bastion — 33%)`, `wizard.csv:L31 (Reactive Shield — on damage taken; threshold inferred)` |
| `effect_active` | `warlock.csv:L25 (Dark Reflection "While active")`, `warlock.csv:L41 (Phantomize "While active")`, `bard.csv:L27 (Melodic Protection "While playing music")`, `cleric.csv:L27 (Holy Water grants Bless)`, `fighter.csv:L39 (Adrenaline Rush + Adrenaline Spike interaction)` |
| `environment`   | `druid.csv:L47 (Summon Treant — underwater)`, `druid.csv:L57 (Penguin Dash — water)` |
| `frenzy_active` | `druid.csv:L54 (Panther Neckbite "while frenzied")` — single contributor; retained |
| `weapon_type`   | see Category 9; many contributors |
| `dual_wield`    | `fighter.csv:L27 (Dual Wield)`, `fighter.csv:L31 (Slayer)` |
| `player_state`  | see Category 10; many contributors |
| `equipment`     | `barbarian.csv:L32 (Savage "while not wearing any chest armor")` |

**Proposed additions** (CSV-driven, require coordinator decision before codifying):

| Value          | Cited | Rationale |
|----------------|-------|-----------|
| `creature_type`| `cleric.csv:L33 (Undead Slaying)`, `cleric.csv:L39 (Holy Purification)`, `cleric.csv:L53 (Holy Light)`, `cleric.csv:L54 (Sanctuary)`, `warlock.csv:L31 (Infernal Pledge "undead and demons")` | Gates bonuses against enemy creature category. Not representable via existing types. See `[COORD-COND-CREATURE]`. |

**Rejected candidates.**

- `debuffed` (Barbarian Achilles Strike "while debuffed") — not a new type; collapses to `effect_active` with the Achilles Strike debuff as the effectId.
- `attacking` (Cleric Smite) — this is a trigger-event context (`on_melee_hit`), not a persistent condition. Rejected.

---

## Category 7: `condition.form` (open, form-scoped)

| Value     | Cited |
|-----------|-------|
| `bear`    | `druid.csv:L53` |
| `panther` | `druid.csv:L54` |
| `chicken` | `druid.csv:L55` |
| `rat`     | `druid.csv:L56` |
| `penguin` | `druid.csv:L57` |
| `demon`   | `warlock.csv:L40 (Blood Pact "Take the form of your contracted demon")` — see `[COORD-FORM-DEMON]`; hidden-in-prose |

---

## Category 8: `condition.env` (open)

| Value        | Cited |
|--------------|-------|
| `water`      | `druid.csv:L57 (Penguin Dash "in water")` |
| `underwater` | `druid.csv:L47 (Summon Treant "when summoned underwater")` |

**Ambiguity.** `water` and `underwater` appear to describe different states (player in water vs. summoned into water). See `[COORD-ENV-WATER]`.

---

## Category 9: `condition.weaponType`

**Closed set.** Current enum: `axe, sword, dagger, bow, crossbow, staff, blunt, rapier, spear, two_handed, ranged, instrument, unarmed`.

| Value         | Cited |
|---------------|-------|
| `axe`         | `barbarian.csv:L22 (Axe Specialization)`, `barbarian.csv:L26 (Heavy Swing)` |
| `sword`       | `fighter.csv:L33 (Sword Mastery)` |
| `dagger`      | `rogue.csv:L25 (Dagger Mastery)`, `rogue.csv:L32 (Thrust)` |
| `bow`         | `ranger.csv:L27 (Nimble Hands)`, `ranger.csv:L38 (Quick Fire)`, `ranger.csv:L41 (Forceful Shot)`, `ranger.csv:L44 (Quickshot)`, `bard.csv` — none; see `[COORD-WEAP-BARD]` |
| `crossbow`    | `ranger.csv:L25 (Crossbow Mastery)` |
| `staff`       | `wizard.csv:L24 (Staff Mastery)`, `sorcerer` Class Notes L8 |
| `blunt`       | `cleric.csv:L23 (Blunt Weapon Mastery)` |
| `rapier`      | `bard.csv:L28 (Rapier Mastery)` |
| `spear`       | `ranger.csv:L32 (Spear Proficiency)` — grantsWeapon |
| `two_handed`  | `barbarian.csv:L25 (Crush)`, `barbarian.csv:L27 (Heavy Swing impact)`, `barbarian.csv:L35 (Two-Hander)`, `barbarian.csv:L49 (Whirlwind)` |
| `ranged`      | `ranger.csv:L28 (Purge Shot)`, `ranger.csv:L30 (Ranged Weapons Mastery)`, `ranger.csv:L31 (Sharpshooter)` |
| `instrument`  | `bard.csv:L23 (Dancing Feet)`, `bard.csv:L29 (Reinforced Instruments)` |
| `unarmed`     | `warlock.csv:L40 (Blood Pact "bare-handed")`, `sorcerer` Class Notes L8 ("bare hands") |

**Proposed addition.**

| Value         | Cited | Rationale |
|---------------|-------|-----------|
| `one_handed`  | `fighter.csv:L27 (Dual Wield)`, `fighter.csv:L41 (Disarm "one-handed")`, `fighter.csv:L44 (Pommel Strike)` | Companion to existing `two_handed`. Multiple contributors. See `[COORD-WEAP-ONEHANDED]`. |

**Rejected candidates.**

- `shield` (Fighter Shield Mastery) — shield is not a weapon; modeled as `equipment { slot: "offhand" or ...shield... }` or a separate `has_shield` condition. See `[COORD-EQUIP-SHIELD]`.
- `melee` — appears in Warlock Shadow Touch prose ("melee weapon"); too broad, and inverse of `ranged`. Prefer explicit weapon lists when needed; reject as a type.
- `spellbook` (Sorcerer Class Notes) — no ability gates on it; not surveyed as a real condition. Dead unless later used.
- `firearm` (Ranger Quick Reload "bow-type or firearm-type") — firearms aren't a class weapon type in the game; rejected.

---

## Category 10: `condition.state` (player states)

**Closed set.** Current enum: `hiding, crouching, blocking, defensive_stance, casting, reloading, bow_drawn, playing_music, drunk, dual_casting`.

| Value              | Cited |
|--------------------|-------|
| `hiding`           | `rogue.csv:L31 (Stealth "while hiding")`, `rogue.csv:L41 (Hide)` |
| `crouching`        | `rogue.csv:L24 (Creep "crouch walking")`, `rogue.csv:L31 (Stealth "crouching or slow walking")` |
| `blocking`         | `fighter.csv:L26 (Counterattack)`, `fighter.csv:L30 (Shield Mastery)`, `fighter.csv:L35 (Weapon Guard)`, `fighter.csv:L41 (Disarm "block a melee attack")`, `fighter.csv:L47 (Spell Reflection "While blocking")` |
| `defensive_stance` | `fighter.csv:L25 (Barricade)`, `fighter.csv:L29 (Projectile Resistance)`, `fighter.csv:L30 (Shield Mastery)`, `fighter.csv:L33 (Sword Mastery)` |
| `casting`          | `sorcerer` Class Notes L8, `sorcerer.csv:L23 (Apex of Sorcery "While casting spells")` |
| `reloading`        | `ranger.csv:L25 (Crossbow Mastery "while reloading")` |
| `bow_drawn`        | `ranger.csv:L26 (Kinesthesia "bowstring drawn")` |
| `playing_music`    | `bard.csv:L27 (Melodic Protection "While playing music")`, `bard.csv:L37 (Encore)`, `bard.csv:L33 (War Song implicit)` |
| `drunk`            | `bard.csv:L25 (Jolly Time)` |
| `dual_casting`     | `sorcerer` Class Notes L8, `sorcerer.csv:L31 (Spell Stride "casting two spells simultaneously")` |

**Proposed addition.**

| Value        | Cited | Rationale |
|--------------|-------|-----------|
| `sprinting`  | `fighter.csv:L48 (Sprint)` | Movement state distinct from moving/not-moving. See `[COORD-STATE-SPRINT]`. |

**Ambiguity.** `defensive_stance` vs `blocking` — Fighter sim note at L25 says the in-game defensive stance activates *when* blocking, suggesting these are the same state. See `[COORD-STATE-STANCE]`.

**Rejected candidates.**

- `weapon_equipped` (Fighter Disarm "while a weapon is equipped") — this is an equipment condition, not a player state. Collapse to `{ type: "equipment", slot: "mainhand", equipped: true }` if ever needed.
- `attacking` (Cleric Smite) — trigger-event context, not a state.
- `summoned` (Sorcerer "has active summon") — only appears implicitly; not a state the user toggles. Collapse to `effect_active` against the summon ability.
- `debuffed` (Barbarian Achilles Strike) — collapses to `effect_active`.
- `invisible` / `stealthed` — duplicates `hiding`.

---

## Category 11: `condition.slot` + `equipped`

**Closed set.** `slot` values reuse `ARMOR_SLOTS` plus weapon slot names.

| slot/equipped combo | Cited |
|---------------------|-------|
| `chest`, `equipped: false` | `barbarian.csv:L32 (Savage "while not wearing any chest armor")` |

**Rejected candidates.**

- `mainhand`, `offhand` — no ability currently conditions on these slots being empty/full. Anticipated for shield conditions but not cited.

---

## Category 12: `cost.type`

**Closed set.**

| Value      | Cited |
|------------|-------|
| `health`   | `warlock.csv:L6 (Spell Cost: health)` and every Warlock spell L46..L58 |
| `charges`  | `cleric.csv:L6`, every Cleric spell L46..L57; `wizard.csv:L6`, every Wizard spell L46..L58; `druid.csv:L4`, every Druid spell L40..L49 |
| `cooldown` | `sorcerer.csv:L8` + every Sorcerer spell L46..L87 (Tier 1-5 cooldowns 12s–24s) |

**Rejected candidates.** `mana`, `rage`, `soul`, `stamina`, `spirit` — no CSV uses. `none` appears as a config-level value for cost-less classes (Barbarian, Bard, Fighter, Ranger, Rogue) but is not itself a `cost.type` value; it means the ability has no `cost` block.

---

## Category 13: `slots.type`

**Closed set.**

| Value        | Cited |
|--------------|-------|
| `spell`      | `warlock.csv:L37 (Spell Memory I)`, `warlock.csv:L38 (Spell Memory II)`, `cleric.csv:L41..L42`, `wizard.csv:L40..L41`, `sorcerer.csv:L37..L38`, `druid.csv:L34..L35` |
| `shapeshift` | `druid.csv:L36 (Shapeshift Memory)` |
| `music`      | `bard.csv:L40 (Music Memory 1)`, `bard.csv:L41 (Music Memory 2)` |

**Rejected candidates.** `rune`, `totem`, `trap_slot` — no CSV uses.

---

## Category 14: `effects[].stat`

**Open relative to STAT_META** (the simulator's stat registry), but authoring SHOULD NOT invent new stats without updating STAT_META. The survey harvested 60+ distinct stat references; below is the full list with one citation each. Stats already present in STAT_META are unmarked; stats that appear to be missing from STAT_META are flagged `[NEW]`.

Attributes (CORE_ATTRS):
- `str`, `vig`, `agi`, `dex`, `wil`, `kno`, `res` — e.g. `warlock.csv:L23 (Malice +15% wil)`, `barbarian.csv:L44 (Rage +10 str)`, `bard.csv:L24 (Fermata +5 res)`, `wizard.csv:L32 (Sage +15% kno)`
- `all_attributes` — `barbarian.csv:L48 (War Sacrifice +8)`, `warlock.csv:L33 (Soul Collector +1/shard)`, `warlock.csv:L40 (Blood Pact +1/shard)`, `warlock.csv:L51 (Spell Predation +1/shard)`, `cleric.csv:L48 (Bless +2)`, `druid.csv:L49 (Tree of Life +3)`

Offensive:
- `weaponDamage` (aka buffWeaponDamage) — `fighter.csv:L33 (Sword Mastery +2)`, `cleric.csv:L50 (Divine Strike +5)`, `bard.csv:L28 (Rapier Mastery +3)`, `bard.csv:L33 (War Song +3)`, `warlock.csv:L49 (Bloodstained Blade +5)`, `barbarian.csv:L22 (Axe Specialization +3)`, `barbarian.csv:L43 (Hurl Weapon)`
- `physicalDamageBonus` — `barbarian.csv:L23 (Berserker)`, `barbarian.csv:L24 (Carnage)`, `fighter.csv:L23 (Combo Attack)`, `fighter.csv:L50 (Victory Strike)`, `rogue.csv:L22 (Ambush +25%)`, `rogue.csv:L25 (Dagger Mastery +10%)`, `cleric.csv:L23 (Blunt Mastery +10%)`, `ranger.csv:L30 (Ranged Weapons Mastery +5%)`
- `magicalDamageBonus` — `sorcerer.csv:L27 (Mana Flow +5%/stack)`, `warlock.csv` via typeDamageBonus
- `typeDamageBonus` (sentinel; paired with damageType) — `warlock.csv:L27 (Dark Enhancement +20% dark)`, `warlock.csv:L33 (Soul Collector +33% dark/shard)`, `warlock.csv:L51 (Spell Predation)`, `cleric.csv:L25 (Faithfulness +15% divine)`, `wizard.csv:L23 (Fire Mastery +5%)`, `wizard.csv:L27 (Arcane Mastery +5%)`, `sorcerer.csv:L22 (Air Mastery)`, `sorcerer.csv:L26 (Lightning Mastery)`
- `headshotPower` — `barbarian.csv:L26 (Executioner +20%)`, `ranger.csv:L31 (Sharpshooter +15%)`
- `backstabPower` `[NEW]` — `rogue.csv:L23 (Back Attack +30%)`. See `[COORD-STAT-BACKSTAB]`.
- `armorPenetration` — `barbarian.csv:L35 (Two-Hander +10%)`, `barbarian.csv:L45 (Reckless Attack +50%)`, `rogue.csv:L32 (Thrust +20%)`, `ranger.csv:L37 (Penetrating Shot +25%)`
- `headshotPenetration` `[NEW]` — `ranger.csv:L37 (Penetrating Shot +50% headshot pen)`
- `impactPower` `[NEW]` — `barbarian.csv:L25 (Crush)`, `barbarian.csv:L32 (Savage)`
- `projectileSpeed` `[NEW]` — `ranger.csv:L43 (True Shot)`
- `drawSpeed` `[NEW]` — `ranger.csv:L27 (Nimble Hands +15%)`

Defensive:
- `armorRating` — `ice/earth, warlock.csv:L40 (Blood Pact +50)`, `cleric.csv:L26 (Holy Aura +15)`, `fighter.csv:L25 (Barricade +75)`, `fighter.csv:L28 (Last Bastion +150)`, `druid.csv:L21 (Thorn Coat +20)`, `sorcerer.csv:L49 (Stone Skin)`, `sorcerer.csv:L87 (Earth Elemental +50)`, `wizard.csv:L25 (Ice Shield +20)`
- `magicResistance` — `warlock.csv:L40 (+50)`, `barbarian.csv:L28 (Iron Will +75)`, `cleric.csv:L26 (+15)`, `fighter.csv:L25 (+75)`, `fighter.csv:L28 (+50)`, `fighter.csv:L49 (Taunt +12%)`
- `physicalDamageReduction` — `warlock.csv:L47 (Curse of Weakness enemy -15%)`, `fighter.csv:L22 (Defense Mastery)`, `bard.csv:L27 (Melodic Protection +25%)`, `sorcerer.csv:L49 (Stone Skin +10%)`
- `magicalDamageReduction` — `warlock.csv:L26 (Antimagic 20% mult)`, `warlock.csv:L41 (Phantomize -50%)`, `fighter.csv:L49 (Taunt +12%)`, `bard.csv:L27 (+25%)`
- `projectileDamageReduction` — `fighter.csv:L28 (Last Bastion +30%)`, `fighter.csv:L29 (Projectile Resistance +10% base +10% stance)`
- `knockbackResistance` `[NEW]` — `barbarian.csv:L28 (Iron Will "ignore knockback")` — hidden in prose
- `noArmorMovePenalty` `[NEW]` (or: `armorMovePenaltyReduction`) — `fighter.csv:L32 (Swift -30%)`

Speed / timing:
- `moveSpeed` (flat) — `barbarian.csv:L44 (Rage)`, `fighter.csv:L31 (Slayer +10)`, `bard.csv:L23 (Dancing Feet +10)`
- `moveSpeedBonus` (percent) — `warlock.csv:L41 (Phantomize +5%)`, `barbarian.csv:L23 (Berserker)`, `fighter.csv:L40 (Breakthrough)`, `rogue.csv:L22 (Ambush +10%)`
- `actionSpeed` — `fighter.csv:L23 (Combo Attack +10%)`, `bard.csv:L28 (Rapier Mastery +5%)`, `ranger.csv:L25 (Crossbow Mastery +50% reload)`, `ranger.csv:L29 (Quick Reload +50%)`
- `spellCastingSpeed` — `warlock.csv:L22 (Demon Armor -10%)`, `wizard.csv:L30 (Quick Chant +15%)`, `sorcerer.csv:L23 (Apex of Sorcery +50%)`, `sorcerer.csv:L25 (Innate Talent +10%)`, `sorcerer.csv:L28 (Mana Fold -15%)`
- `switchingSpeed` `[NEW]` — `bard.csv:L31 (Superior Dexterity +50%)`
- `interactionSpeed` `[NEW]` — `bard.csv:L26 (Lore Mastery +30%)`

Resource / healing:
- `maxHealth` — `warlock.csv:L40 (+30)`, `barbarian.csv:L29 (Morale Boost recover 25%)`, `barbarian.csv:L47 (War Cry +20%)`
- `maxHealthBonus` — `barbarian.csv:L31 (Robust +8%)`
- `healingMod` / `healingAdd` — `warlock.csv:L30 (Immortal Lament +100% magical)`, `warlock.csv:L32 (Vampirism +20% magical)`, `cleric.csv:L22 (Advanced Healer +5 magical)`, `bard.csv:L25 (Jolly Time heal)`
- `curseDurationBonus` — `warlock.csv:L29 (Curse Mastery +30%)`
- `incomingPhysicalHealing` — `warlock.csv:L39 (Blow of Corruption -80% on target)`, `rogue.csv:L30 (Poisoned Weapon -10% on target)`, `cleric.csv:L55 (Locust Swarm -50%)`
- `incomingMagicalHealing` — mirror of incomingPhysicalHealing at same citations
- `burnDuration` `[NEW]` — `wizard.csv:L23 (Fire Mastery +2s)`

Utility:
- `potionPotency` `[NEW]` — `barbarian.csv:L30 (Potion Chugger +20%)`
- `potionDuration` `[NEW]` — `barbarian.csv:L30 (Potion Chugger -50%)`
- `luck` — `bard.csv:L32 (Wanderer's Luck +100)`
- `memoryCapacity` `[NEW]` — `bard.csv:L26 (Lore Mastery +5)`
- `shapeshiftTimeReduction` `[NEW]` — `druid.csv:L26 (Shapeshift Mastery -25%)`
- `wildSkillCooldownReduction` `[NEW]` — `druid.csv:L26 (Shapeshift Mastery -25%)`
- `cooldownReductionBonus` — `sorcerer.csv:L24 (Elemental Fury 0.5%/1% HP lost)`
- `spellCostMultiplier` — `warlock.csv:L28 (Torture Mastery 2.0×)`
- `knockbackPowerBonus` `[NEW]` — `sorcerer.csv:L22 (Air Mastery +25%)`
- `jumpHeight` `[NEW]` — `sorcerer.csv:L46 (Wet -30% reduction)`

**Coordinator action.** All `[NEW]` entries need STAT_META rows. See `[COORD-STAT-REGISTRY]`.

---

## Category 15: `effects[].phase`

**Closed set.** Per §3 Phase enum (lines 625–661 of spec).

| Value                  | Cited (one per phase — plausibility survey, not exhaustive) |
|------------------------|-------------------------------------------------------------|
| `pre_curve_flat`       | `warlock.csv:L40 (Blood Pact +50 armor rating)`, `warlock.csv:L33 (Soul Collector +1 all_attributes/shard)` |
| `attribute_multiplier` | `warlock.csv:L23 (Malice +15% wil)`, `wizard.csv:L32 (Sage +15% kno)`, `cleric.csv:L48 (Bless +2 all)` |
| `post_curve`           | `warlock.csv:L22 (Demon Armor -10% SCS)`, `barbarian.csv:L27 (Heavy Swing -move speed)`, `fighter.csv:L23 (Combo Attack +10% AS)` |
| `multiplicative_layer` | `warlock.csv:L26 (Antimagic ×0.80)` — anchor citation; see `[DEAD-PHASE-MULT]` |
| `type_damage_bonus`    | `warlock.csv:L27 (Dark Enhancement)`, `warlock.csv:L33 (Soul Collector)`, `wizard.csv:L23 (Fire Mastery)`, `cleric.csv:L25 (Faithfulness)` |
| `healing_modifier`     | `warlock.csv:L30 (Immortal Lament +100% magical heal)`, `warlock.csv:L32 (Vampirism)`, `cleric.csv:L22 (Advanced Healer)` |
| `cap_override`         | `fighter.csv:L22 (Defense Mastery "PDR limit to 75%")` |

**Dead-vocabulary note.** Only one class (Warlock Antimagic) is conventionally modeled as `multiplicative_layer`. See `[COORD-PHASE-MULT]`.

---

## Category 16: `effects[].target`

**Closed set.** Per §3 line 335.

| Value              | Cited |
|--------------------|-------|
| `self`             | majority of perks and self-buffs across all classes |
| `enemy`            | `warlock.csv:L47 (Curse of Weakness)`, `barbarian.csv:L39 (Achilles Strike)`, `cleric.csv:L25 (Faithfulness enemy move speed)`, `rogue.csv:L37 (Weakpoint Attack enemy armor)` |
| `either`           | `cleric.csv:L53 (Holy Light — heal self OR damage undead)`, `cleric.csv:L54 (Sanctuary)`, `warlock.csv:L46 (Power of Sacrifice "self casts if no target")` |
| `party`            | `warlock.csv:L40 (Blood Pact "nearby characters")` — see `[COORD-TARGET-PARTY-NEARBY]`, `bard.csv:L30 (Story Teller)`, `barbarian.csv:L29 (Morale Boost)` |
| `nearby_allies`    | `bard.csv:L33 (War Song)`, `barbarian.csv:L47 (War Cry)`, `cleric.csv:L54 (Sanctuary allies)`, `druid.csv:L24 (Lifebloom Aura)`, `druid.csv:L29 (Sun and Moon)` |
| `nearby_enemies`   | `barbarian.csv:L46 (Savage Roar "within 7.5m")`, `warlock.csv:L40 (Blood Pact Abyssal Flame)` |

**Rejected candidates.** None — existing set covers all observations.

---

## Category 17: damage type (damage[].damageType, effects[].damageType, form.attacks[].damageType)

**Open set — CRITICAL.** No prior enum existed; this section seeds `DAMAGE_TYPES` for the first time.

**Canonical form:** `<element>_magical` for elemental magic; `physical`, `true_physical` for non-magical.

| Value              | Cited |
|--------------------|-------|
| `physical`         | `barbarian.csv:L33 (Skull Splitter)`, `barbarian.csv:L43 (Hurl Weapon)`, `barbarian.csv:L49 (Whirlwind)`, `fighter.csv:L44 (Pommel Strike)`, `fighter.csv:L46 (Shield Slam)`, `rogue.csv:L22 (Ambush)`, `rogue.csv:L38 (Rupture status damage)`, `cleric.csv:L52 (Holy Strike)`, `druid.csv:L53..L57 (form attacks)`, `sorcerer.csv:L87 (Earth Elemental rocks)`, `ranger.csv:L30 (Ranged Weapons Mastery)` |
| `true_physical`    | `barbarian.csv:L41 (Finishing Blow "true physical")`, `druid.csv:L21 (Thorn Coat)` |
| `dark_magical`     | `warlock.csv:L25 (Dark Reflection 15(0.75))`, `warlock.csv:L27 (Dark Enhancement)`, `warlock.csv:L33 (Soul Collector bonus)`, `warlock.csv:L48 (Bolt of Darkness)`, `warlock.csv:L53 (Ray of Darkness)`, `bard.csv:L47 (Din of Darkness)` |
| `evil_magical`     | `warlock.csv:L39 (Blow of Corruption 12(1.0))`, `warlock.csv:L46 (Power of Sacrifice 3/s)`, `warlock.csv:L49 (Bloodstained Blade on-swing)`, `warlock.csv:L50 (Curse of Pain)`, `warlock.csv:L54 (Life Drain)` |
| `fire_magical`     | `warlock.csv:L55 (Hellfire)`, `warlock.csv:L57 (Flame Walker)`, `warlock.csv:L58 (Summon Hydra)`, `wizard.csv:L50 (Ignite)`, `wizard.csv:L56 (Fireball)`, `wizard.csv:L57 (Explosion)`, `sorcerer.csv:L55 (Fire Arrow)`, `sorcerer.csv:L66 (Flamestrike)`, `sorcerer.csv:L75 (Fire Orb)`, `sorcerer.csv:L123 (Flamethrower)`, `sorcerer.csv:L144 (Plasma Blast)`, `sorcerer.csv:L153 (Lava Elemental)`, `sorcerer.csv:L155 (Wall of Fire)` |
| `ice_magical`      | `wizard.csv:L51 (Ice Bolt)`, `sorcerer.csv:L46 (Water Bolt)`, `sorcerer.csv:L61 (Ice Spear)`, `sorcerer.csv:L128 (Frost Breath)`, `druid.csv:L57 (Penguin Water Cannon)` |
| `lightning_magical`| `wizard.csv:L54 (Lightning Strike)`, `wizard.csv:L58 (Chain Lightning)`, `sorcerer.csv:L26 (Lightning Mastery shock 5 dmg)`, `sorcerer.csv:L72 (Lightning Bolt)`, `sorcerer.csv:L81 (Lightning Sphere)`, `sorcerer.csv:L98 (Electric Dash)`, `sorcerer.csv:L133 (Frost Lightning)`, `sorcerer.csv:L137 (Lightning Storm)`, `sorcerer.csv:L140 (Lightning Vortex)`, `sorcerer.csv:L144 (Plasma Blast)` |
| `arcane_magical`   | `wizard.csv:L37 (Arcane Shield Explosion 5(1.0))`, `wizard.csv:L52 (Magic Missile)`, `wizard.csv:L26 (Arcane Feedback)` |
| `air_magical`      | `sorcerer.csv:L60 (Windblast)`, `sorcerer.csv:L80 (Vortex)`, `sorcerer.csv:L140 (Lightning Vortex)` |
| `earth_magical`    | `sorcerer.csv:L71 (Eruption)`, `sorcerer.csv:L154 (Thorn of Earth)` |
| `divine_magical`   | `cleric.csv:L25 (Faithfulness bonus)`, `cleric.csv:L37 (Judgement)`, `cleric.csv:L39 (Holy Purification)`, `cleric.csv:L52 (Holy Strike)`, `cleric.csv:L53 (Holy Light)`, `cleric.csv:L54 (Sanctuary)`, `cleric.csv:L55 (Locust Swarm)` |
| `spirit_magical`   | `druid.csv:L42 (Orb of Nature)`, `druid.csv:L43 (Dreamfire)` |

**Ambiguous / pending coordinator (see also `[COORD-DMG-*]` items):**

- `true_dark_magical` — `warlock.csv:L24 (Shadow Touch "true dark magical")`. Candidate value OR encoding as `dark_magical` + `trueDamage: true`. Deferred.
- `true_magical` — `ranger.csv:L28 (Purge Shot "3(1.0) true magical damage")`. Same ambiguity. Deferred.
- `light_magical` — `wizard.csv:L46 (Zap "light magical damage")`. One-off. May be a typo for `lightning_magical` or a distinct type. See `[COORD-DMG-LIGHT]`.
- `magical` (unqualified) — `warlock.csv:L40 (Blood Pact Abyssal Flame "2(0.25) magical damage")`. Missing prefix; unclear if `dark_magical`, `evil_magical`, or "generic" magical. See `[COORD-DMG-MAGICAL]`.
- Hybrid damage on merged spells: `sorcerer.csv:L101 (Elemental Bolt fire/ice)`, `L112 (Flamefrost Spear)`, `L144 (Plasma Blast fire/lightning)`, `L155 (Wall of Fire earth/fire)`. Encoding: two damage entries in `damage[]`, each with its own damageType. No new vocabulary needed; flagged for implementers. See `[COORD-DMG-HYBRID]`.

**Rejected candidates.**

- `sonic` — anticipated for Bard; no CSV uses it.
- `poison` as a damage type — Rogue Poisoned Weapon's damage is `magical` (`rogue.csv:L30`), and poison is a *status* (Category 19). Rejected.
- `bleed` as a damage type — same rationale; bleed is a status with `damage.damageType: "physical"` inside.
- `undead_damage` (Cleric) — this is a stat name (`undeadDamageReduction`-adjacent), not a damage type. Modeled via `condition: { type: "creature_type", creatureType: "undead" }` + a normal damage type.

---

## Category 18: `healType`

**Closed set: `physical`, `magical`.**

| Value      | Cited |
|------------|-------|
| `physical` | `ranger.csv:L40 (Field Ration 40(1.0))`, `druid.csv:L40 (Nature's Touch)`, `druid.csv:L41 (Barkskin Armor)`, `druid.csv:L44 (Restore)` |
| `magical`  | `warlock.csv:L24 (Shadow Touch self-heal)`, `warlock.csv:L28 (Torture Mastery 2(0.15))`, `warlock.csv:L30 (Immortal Lament bonus)`, `warlock.csv:L32 (Vampirism)`, `cleric.csv:L22 (Advanced Healer)`, `cleric.csv:L28 (Kindness)`, `cleric.csv:L29 (Over Healing)`, `cleric.csv:L49 (Lesser Heal)`, `cleric.csv:L53 (Holy Light)`, `druid.csv:L43 (Dreamfire)` |

**Rejected candidates.** `holy`, `divine`, `nature`, `spirit` — no CSV treats heal type as a third option; holy heals are `magical` with a divine tag on the ability, not a heal-type split.

---

## Category 19: `appliesStatus[].type`

**Closed set.** Existing enum: `burn, frostbite, wet, electrified, poison, bleed, silence`.

| Value         | Cited |
|---------------|-------|
| `burn`        | `wizard.csv:L46 (Zap)`, `wizard.csv:L50 (Ignite)`, `wizard.csv:L56 (Fireball)`, `wizard.csv:L57 (Explosion)`, `sorcerer.csv:L55 (Fire Arrow)`, `sorcerer.csv:L66 (Flamestrike)`, `sorcerer.csv:L75 (Fire Orb)`, `sorcerer.csv:L101 (Elemental Bolt)`, `sorcerer.csv:L112 (Flamefrost Spear)`, `sorcerer.csv:L123 (Flamethrower)`, `sorcerer.csv:L144 (Plasma Blast)`, `sorcerer.csv:L155 (Wall of Fire)` |
| `frostbite`   | `wizard.csv:L25 (Ice Shield)`, `wizard.csv:L28 (Ice Mastery)`, `wizard.csv:L51 (Ice Bolt)`, `sorcerer.csv:L50 (Glaciate)`, `sorcerer.csv:L61 (Ice Spear)`, `sorcerer.csv:L101 (Elemental Bolt)`, `sorcerer.csv:L112 (Flamefrost Spear)`, `sorcerer.csv:L128 (Frost Breath)`, `sorcerer.csv:L133 (Frost Lightning)`, `sorcerer.csv:L136 (Icebound)` |
| `wet`         | `sorcerer.csv:L46 (Water Bolt 2s)`, `sorcerer.csv:L95 (Aqua Prison)` |
| `electrified` | `wizard.csv:L54 (Lightning Strike)`, `wizard.csv:L58 (Chain Lightning)`, `sorcerer.csv:L26 (Lightning Mastery shock)`, `sorcerer.csv:L72 (Lightning Bolt)`, `sorcerer.csv:L81 (Lightning Sphere)`, `sorcerer.csv:L98 (Electric Dash)`, `sorcerer.csv:L133 (Frost Lightning)`, `sorcerer.csv:L137 (Lightning Storm)`, `sorcerer.csv:L140 (Lightning Vortex)`, `sorcerer.csv:L144 (Plasma Blast)` |
| `poison`      | `rogue.csv:L30 (Poisoned Weapon maxStacks=5)` |
| `bleed`       | `rogue.csv:L38 (Rupture 20(0.5) physical 5s)`, `barbarian.csv:L33 (Skull Splitter 12 physical 4s)`, `druid.csv:L54 (Panther Scratch bleed)`, `druid.csv:L57 (Penguin Sharp Beak bleed)` |
| `silence`     | `bard.csv:L38 (Dissonance 2s)`, `cleric.csv` (implicit via several anti-cast debuffs — see `[COORD-STATUS-SILENCE-COMPOUND]`), `fighter.csv:L44 (Pommel Strike)`, `rogue.csv:L40 (Cut Throat 2s)`, `druid.csv:L54 (Panther Neckbite frenziedEffect silence)` |

**Proposed addition.**

| Value     | Cited | Rationale |
|-----------|-------|-----------|
| `plague`  | `druid.csv:L56 (Rat Infected Fangs "plague that deals 3(0.5) magical damage for 3s")` | Novel status, DoT with stat decay. Not covered by `poison` or `bleed`. See `[COORD-STATUS-PLAGUE]`. |

**Rejected candidates (belong to Category 28 `cc.type`, not status).**

- `disarm` — Fighter Disarm is a CC, not a stat-mutating status.
- `blind` — Cleric Holy Strike — could be status (vision debuff) OR cc (cannot target). See `[COORD-STATUS-BLIND]`.
- `bind` / `root` — Cleric Bind, Druid Entangling Vines — movement-control CC.
- `fear` — Barbarian Savage Roar "Frightens" — CC.
- `trapped`, `immobilize`, `knockback`, `lift`, `stun` — CC.

**Hidden-in-prose status (ambiguous).**

- `antiheal` / compound healing debuff — `cleric.csv:L55 (Locust Swarm "reduced incoming magical healing by 50% and reduces incoming physical healing by 50%")`. Currently representable via `effects: [{ stat: "incomingPhysicalHealing", value: -0.5 }, { stat: "incomingMagicalHealing", value: -0.5 }]` on a nameless debuff — no new status required. See `[COORD-STATUS-ANTIHEAL]`.
- Bard Silence compound disable of skills + spells + performance — expressed via `silence` status; whether one status blocks all three or whether three separate effects are needed is a coordinator question. See `[COORD-STATUS-SILENCE-COMPOUND]`.

---

## Category 20: `triggers[].event`

**Closed set.** Current enum: `on_melee_hit, on_hit_received, on_damage_taken, on_damage_dealt, on_heal_cast, on_kill, on_shield_break, on_curse_tick, on_successful_block`.

| Value                 | Cited |
|-----------------------|-------|
| `on_melee_hit`        | `warlock.csv:L24 (Shadow Touch)`, `warlock.csv:L39 (Blow of Corruption)`, `barbarian.csv:L24 (Carnage)`, `rogue.csv:L30 (Poisoned Weapon)`, `rogue.csv:L37 (Weakpoint Attack)`, `druid.csv:L21 (Thorn Coat — on attacker)`, `wizard.csv:L25 (Ice Shield)` |
| `on_hit_received`     | `warlock.csv:L25 (Dark Reflection)`, `druid.csv:L20 (Dreamwalk)` |
| `on_damage_taken`     | `wizard.csv:L31 (Reactive Shield)` — see `[COORD-TRIG-DAMAGE-TAKEN]` re: overlap with on_hit_received |
| `on_damage_dealt`     | `warlock.csv:L54 (Life Drain)`, `druid.csv:L43 (Dreamfire per-target heal)`, `sorcerer.csv:L27 (Mana Flow)` |
| `on_heal_cast`        | `cleric.csv:L28 (Kindness)`, `druid.csv:L22 (Force of Nature)`, `druid.csv:L24 (Lifebloom Aura)` |
| `on_kill`             | `warlock.csv:L33 (Soul Collector)`, `barbarian.csv:L29 (Morale Boost)`, `fighter.csv:L50 (Victory Strike)` |
| `on_shield_break`     | `warlock.csv:L56 (Eldritch Shield)`, `wizard.csv:L37 (Arcane Shield Explosion)`, `wizard.csv:L31 (Reactive Shield Arcane Explosion)` |
| `on_curse_tick`       | `warlock.csv:L28 (Torture Mastery)` |
| `on_successful_block` | `fighter.csv:L26 (Counterattack)`, `fighter.csv:L30 (Shield Mastery)`, `fighter.csv:L35 (Weapon Guard)`, `fighter.csv:L41 (Disarm)` |

**Proposed additions** (require coordinator decision).

| Value                   | Cited | Rationale |
|-------------------------|-------|-----------|
| `on_spell_cast`         | `sorcerer.csv:L27 (Mana Flow "each successful spell cast")`, `wizard.csv:L26 (Arcane Feedback "deal damage with an arcane spell")` | Distinct from `on_damage_dealt`. See `[COORD-TRIG-SPELL-CAST]`. |
| `on_stealth_exit`       | `rogue.csv:L22 (Ambush "coming out of hide")` | State-exit event; currently unrepresentable. See `[COORD-TRIG-STEALTH]`. |
| `on_combat_enter`       | `fighter.csv:L34 (Veteran Instinct "When you enter combat")` | Distinct state transition. See `[COORD-TRIG-COMBAT]`. |
| `on_successful_performance` | `bard.csv:L33 (War Song)` | Novel. See `[COORD-TRIG-PERF]`. |

**Rejected candidates.**

- `on_movement` (Barbarian Achilles Strike "each time the target moves") — this is the *target's* movement, not the caster's. Models better as a DoT on the debuff itself (tickRate correlated with movement) or as a condition. See `[COORD-TRIG-MOVEMENT]`.
- `on_divine_attack_hit` (Cleric Faithfulness "When a divine attack is successful") — collapses to `on_damage_dealt` + `condition: { type: "tag_match", tag: "divine" }`. School-specific event violates class-agnostic naming rule (Convention 1).
- `on_drink_alcohol` / `drinking` (Bard Jolly Time, Cleric Brewmaster) — describes a game action, not a combat event. Collapse to `on_item_use` with a filter, or keep display-only in the Snapshot model.
- `on_duration_reset` / `skill_reset` (Bard Encore) — this is an ABILITY OUTCOME (Encore's effect is to reset durations), not a trigger event that OTHER abilities key off of. Should be modeled under `abilityModifiers` or a bespoke effect, not a trigger.
- `on_buff_strip` (Warlock Spell Predation) — the buff-strip action is part of the spell's damage resolution, not a trigger event that other abilities watch for. No current CSV references it as an observer. Reject as a trigger event.
- `on_channel_tick` (Warlock Dark Offering) — this is a `stacking.triggerOn` string (Category 29), not an ability-level trigger event.

---

## Category 21: `triggers[].stateChange` keys (open)

Keys flipped by a trigger, e.g. `{ spiritual: true }`. Open-ended by design.

| Key                  | Cited |
|----------------------|-------|
| `spiritual`          | `druid.csv:L20 (Dreamwalk "you become spiritual")` |
| `frenzy`             | `druid.csv:L54 (Panther Rush — grantsFrenzy)` |
| `drunk`              | `bard.csv:L25 (Jolly Time — entering)`, `bard.csv:L39 (Party Maker — immunity) ` |
| `defensive_stance`   | `fighter.csv:L25 (Barricade)` — toggles the stance state |
| `blocking`           | `fighter.csv:L26 (Counterattack)` — observed on block events |
| `momentum_stacks`    | `fighter.csv:L48 (Sprint gains 3 stacks; decays 1/2s)` — see also Category 29 |
| `hiding`             | `rogue.csv:L41 (Hide)` — entering; exits automatically on action |

**Rejected candidates.** `berserk`, `enraged`, `invisible`, `stealthed`, `charging` — not observed. Anticipated but no CSV contributes.

---

## Category 22: `disables[].type` + filter keys

**Closed set.**

| Value            | Cited |
|------------------|-------|
| `transformation` | `druid.csv:L24 (Lifebloom Aura "Disabled shapeshift")` |
| `spell`          | `druid.csv:L26 (Shapeshift Mastery "Prevents the use of spirit spells")` → `filter: { tags: ["spirit"] }` |

**Filter keys observed.** `tags` (Druid). No other filter keys observed. `tier`, `id`, `school` anticipated but not cited.

**Rejected candidates.** `perk`, `skill` — no ability disables other perks/skills; reject.

---

## Category 23: `abilityModifiers[].modify` and `.mode`

**Closed set.** `.modify`: `duration, cooldown, castTime, charges`. `.mode`: `multiply, add` (default `multiply`).

| Value        | Cited |
|--------------|-------|
| `duration`   | `barbarian.csv:L34 (Treacherous Lungs +50% duration of shouts)`, `warlock.csv:L29 (Curse Mastery +30% curse durations)`, `rogue.csv:L27 (Hide Mastery duration modifier)` |
| `cooldown`   | `barbarian.csv:L34 (Treacherous Lungs -10% shout CD)`, `rogue.csv:L27 (Hide Mastery cooldown reduction)`, `sorcerer.csv:L28 (Mana Fold -25%)`, `sorcerer.csv:L32 (Time Distortion +200%)`, `sorcerer.csv:L30 (Spell Sculpting +25%)` |
| `castTime`   | `cleric.csv:L32 (Requiem "100% spell casting speed on Resurrection")` — re-interpret as castTime modifier on a specific spell; `sorcerer.csv:L32 (Time Distortion -50% cast time)` |
| `charges`    | — not cited; `[DEAD in code]` pending. See `[COORD-ABMOD-CHARGES]`. |

**Proposed additions** (coordinator).

| Value           | Cited | Rationale |
|-----------------|-------|-----------|
| `range`         | `sorcerer.csv:L30 (Spell Sculpting +25% range)` | |
| `aoeRadius`     | `sorcerer.csv:L30 (Spell Sculpting +25% AoE)` | |
| `cost`          | `warlock.csv:L28 (Torture Mastery ×2 spell costs)` — currently `spellCostMultiplier` at ability level, but coord may prefer unification under abilityModifiers | See `[COORD-ABMOD-COST]`. |

---

## Category 24: `grantsArmor` / `removesArmor`

**Open but finite.**

| Value     | Cited |
|-----------|-------|
| `plate`   | `warlock.csv:L22 (Demon Armor — grantsArmor)`, `fighter.csv:L31 (Slayer — removesArmor)` |
| `cloth`   | `[DEAD]` — appears only in class-level `Equippable Armor` config rows; no ability grants cloth |
| `leather` | `[DEAD]` — same |

**Rejected candidates.** `chain` — not in any CSV; likely not a player-armor tier in-game. `[DEAD in code]` if added to future enums.

---

## Category 25: `grantsWeapon`

**Open but finite.**

| Value   | Cited |
|---------|-------|
| `spear` | `ranger.csv:L32 (Spear Proficiency "Gain the ability to equip spears")` |

---

## Category 26: `grantsSpells`

**Open; ability-ID references.** Listed for completeness; values resolve to spell `id`s elsewhere.

| Value                | Cited |
|----------------------|-------|
| `bolt_of_darkness`   | `warlock.csv:L40 (Blood Pact "Bolt of Darkness becomes castable bare-handed")` |
| `natures_touch`      | `druid.csv:L42 (Orb of Nature "grants Nature's Touch on contact with an ally")` — see `[COORD-GRANT-ALLYEFFECT]`; this may belong under `allyEffect` rather than `grantsSpells` |

---

## Category 27: `passives` map keys (open)

Display-only flags. Authors should prefer `effects[]` where possible; `passives` is the escape hatch.

| Key                      | Cited |
|--------------------------|-------|
| `antimagic`              | `warlock.csv:L26 (Antimagic 20% — but per spec this IS a multiplicative_layer effect, not a passive)` — see `[DEAD-PASSIVE-ANTIMAGIC]` |
| `spellsCannotKill`       | `warlock.csv:L30 (Immortal Lament)` |
| `phaseThrough`           | `warlock.csv:L41 (Phantomize)` |
| `selfDamagePerSecond`    | `warlock.csv:L40 (Blood Pact Abyssal Flame 1%/s)` — display-only |
| `altSkills`              | `warlock.csv:L40 (Blood Pact — Exploitation Strike, Exit Demon Form)` |
| `overheal`               | `cleric.csv:L29 (Over Healing +20% above max HP, decays 2%/s)` |
| `healingReflection`      | `cleric.csv:L28 (Kindness 30% of heals back to self)` |
| `debuffImmunity`         | `cleric.csv:L24 (Brewmaster "no detrimental drunk effects")` |
| `channeledAbility`       | `cleric.csv:L37,L39,L54,L55,L56` — display flag |
| `cooldownGated`          | `cleric.csv:L25 (Faithfulness "Does not inflict while on cooldown")` |
| `hideRevealmentOnBump`   | `rogue.csv:L29 (Pickpocket "hide will not be revealed when bumped")` |
| `stealItems`             | `rogue.csv:L29 (Pickpocket)` |
| `moveWhileHiding`        | `rogue.csv:L31 (Stealth 10 steps budget)` |
| `moveSpeedPerStep`       | `rogue.csv:L31` |
| `unlockWithoutPicklock`  | `rogue.csv:L33 (Traps and Locks)` |
| `detectTrapsInRange`     | `rogue.csv:L33` |
| `noArmorMovePenalty`     | `fighter.csv:L32 (Swift)` — may be better as a stat (see Cat 14) |
| `memoryRequiresSkill`    | `bard.csv:L40,L41` — inherent to slots mechanic; likely redundant |
| `impactResistance`       | `barbarian.csv:L25 (Crush "impact resistance")` |
| `altShoutMechanic`       | `barbarian.csv:L34 (Treacherous Lungs)` — modeled better as `abilityModifiers`; see `[DEAD-PASSIVE-SHOUTMOD]` |

Most of these are the "display only" mechanics the Snapshot simulator cannot compute. Coordinator should audit: entries like `antimagic` and `noArmorMovePenalty` should probably move to `effects[]`.

---

## Category 28: `cc.type`

**Open set.** No prior enum existed.

| Value            | Cited |
|------------------|-------|
| `root`           | `druid.csv:L45 (Entangling Vines "frozen in place for 1 second")` |
| `stun`           | `wizard.csv:L49 (Slow "2 seconds")` — see `[COORD-CC-STUN]`; ambiguous mapping |
| `slow`           | `cleric.csv:L25 (Faithfulness)`, `cleric.csv:L37 (Judgement)`, `cleric.csv:L56 (Earthquake)`, `ranger.csv:L24 (Crippling Shot)`, `fighter.csv:L44 (Pommel Strike -50% MS)`, `fighter.csv:L46 (Shield Slam -20% MS)`, `wizard.csv:L49 (Slow -40%)` |
| `bind`           | `cleric.csv:L51 (Bind "Binds the target for 0.75s")` |
| `blind`          | `cleric.csv:L52 (Holy Strike "blinding them for 4s")` |
| `silence`        | `cleric` (see `[COORD-STATUS-SILENCE-COMPOUND]`), `fighter.csv:L44 (Pommel Strike)`, `rogue.csv:L40 (Cut Throat)`, `bard.csv:L38 (Dissonance)` |
| `disarm`         | `fighter.csv:L41 (Disarm)` |
| `fear`           | `barbarian.csv:L46 (Savage Roar "Frightens")` |
| `knockback`      | `sorcerer.csv:L22 (Air Mastery)`, `sorcerer.csv:L60 (Windblast)`, `sorcerer.csv:L80 (Vortex)`, `wizard.csv:L56 (Fireball knockback)` |
| `lift`           | `sorcerer.csv:L86 (Levitation)`, `sorcerer.csv:L95 (Aqua Prison)`, `sorcerer.csv:L71 (Eruption)`, `sorcerer.csv:L154 (Thorn of Earth)` |
| `trap`           | `sorcerer.csv:L95 (Aqua Prison "water orb engulfs")` |
| `immobilize`     | `sorcerer.csv:L133 (Frost Lightning 1.5s)`, `wizard.csv:L28 (Ice Mastery "freezes feet prevents moving")` — see `[COORD-CC-IMMOBILIZE]` |

**Rejected candidates.**

- `bind` vs `root` — these are two spellings of the same concept. Canonical: pending `[COORD-CC-BIND-ROOT]`. Both retained in seed list.
- `frozen` / `freeze` (Ice Mastery) — overlaps with `frostbite` status AND `immobilize` CC. See `[COORD-CC-FREEZE]`.
- `trapped` vs `trap` — convention 11 says infinitive; canonical is `trap`.

---

## Category 29: `stacking.triggerOn` / `consumedOn` (open)

`on_*` prefix applied; often shares vocabulary with Category 20 events.

### `triggerOn`

| Value                        | Cited |
|------------------------------|-------|
| `on_kill`                    | `warlock.csv:L33 (Soul Collector)` |
| `on_dark_spell_cast` (alias `on_dark_magic_damage_dealt`) | `warlock.csv:L33 (Soul Collector consumption), L51 (Spell Predation consumption)` — see `[COORD-STACK-DARK]` |
| `on_spell_cast`              | `wizard.csv:L26 (Arcane Feedback)`, `sorcerer.csv:L27 (Mana Flow "each successful spell cast")` |
| `on_melee_hit` (consecutive) | `barbarian.csv:L24 (Carnage "2+ within 1.5s")`, `fighter.csv:L23 (Combo Attack "within 2s")` |
| `on_hp_threshold`            | `fighter.csv:L24 (Adrenaline Spike)`, `fighter.csv:L28 (Last Bastion)`, `barbarian.csv:L23 (Berserker HP%)` — see `[COORD-STACK-HP]`; these are hpScaling, not classical stacking |
| `on_sprint`                  | `fighter.csv:L48 (Sprint +3 stacks)` |
| `on_channel_tick`            | `warlock.csv:L42 (Dark Offering)` |
| `on_buff_strip`              | `warlock.csv:L51 (Spell Predation +1 shard per buff)` |
| `on_poison_hit`              | `rogue.csv:L30 (Poisoned Weapon maxStacks=5)` |
| `on_drink_alcohol`           | `bard.csv:L25 (Jolly Time)` — borderline; display only |

### `consumedOn`

| Value                   | Cited |
|-------------------------|-------|
| `on_dark_spell_cast`    | `warlock.csv:L33 (Soul Collector), L51 (Spell Predation)` |
| `on_blood_pact_activation` | `warlock.csv:L40 (Blood Pact consumes shards at activation)` |
| `on_duration_expire`    | `warlock.csv:L42 (Dark Offering 60s)`, `wizard.csv:L26 (Arcane Feedback 7s per stack)` |
| `on_next_attack`        | `rogue.csv:L38 (Rupture)` |
| `on_stack_decay_timer`  | `fighter.csv:L48 (Sprint "Lose 1 stack every 2s")` |

**Rejected candidates.** `on_heal`, `on_dodge`, `on_parry` — not observed for stacking.

---

## Category 30: `shield.damageFilter`

**Closed set.**

| Value              | Cited |
|--------------------|-------|
| `magical`          | `warlock.csv:L56 (Eldritch Shield "25 magical damage")` |
| `physical`         | `cleric.csv:L46 (Protection "20 physical damage")` |
| `null` / all types | `wizard.csv:L37 (Arcane Shield "all damage sources")`, `sorcerer.csv:L143 (Mud Shield)` |

---

## Category 31: `summon.type` (open)

| Value             | Cited |
|-------------------|-------|
| `hydra`           | `warlock.csv:L58 (Summon Hydra)` |
| `evil_eye`        | `warlock.csv:L52 (Evil Eye)` |
| `treant`          | `druid.csv:L47 (Summon Treant)` |
| `earth_elemental` | `sorcerer.csv:L87 (Summon Earth Elemental)` |
| `lava_elemental`  | `sorcerer.csv:L153 (Summon Lava Elemental)` |

---

## Category 32: `summon.environmentBonus` (open; subset of Cat 8 env values)

| Value   | Cited |
|---------|-------|
| `water` | `druid.csv:L47 (Summon Treant "become more powerful when summoned underwater")` |

---

## Category 33: `form.attacks[].damageType` and `frenziedEffect` keys

### damageType — subset of Category 17

| Value         | Cited |
|---------------|-------|
| `physical`    | `druid.csv:L53 (Bear Swipe, Bash)`, `druid.csv:L54 (Panther Scratch, Neckbite)`, `druid.csv:L55 (Chicken Pecking)`, `druid.csv:L56 (Rat Infected Fangs)`, `druid.csv:L57 (Penguin Sharp Beak)` |
| `ice_magical` | `druid.csv:L57 (Penguin Water Cannon)` |
| `evil_magical`| `warlock.csv:L40 (Blood Pact — Exploitation Strike bare-hand)` |

### `frenziedEffect` keys (open)

| Key       | Cited |
|-----------|-------|
| `silence` | `druid.csv:L54 (Panther Neckbite "while frenzied you silence the target")` |

**Note.** Druid's Panther Scratch (bleed) and Rat Infected Fangs (plague) are NOT frenziedEffect keys; they are `attacks[].bleed` / `.plague` objects (per spec §3 line 596). Keep distinct from `frenziedEffect`.

---

## Category 34: `performanceTiers` tier names

**Closed set: `poor`, `good`, `perfect`.**

| Value     | Cited |
|-----------|-------|
| `poor`    | `bard.csv:L8 ("poor or good or perfect")` and all 19 musics L46..L64 |
| `good`    | same |
| `perfect` | same |

**Rejected candidates.** `masterpiece`, `flawless`, `amazing`, `novice`, `journeyman`, `master` — no CSV uses. Explicitly confirmed in Bard CSV notes at L8.

---

## Category 35: `merged_spell.components` (reference, not vocabulary)

15 pairs recorded from `sorcerer.csv:L95..L155`. Each component is a spell ID. Not vocabulary; listed once to confirm coverage. Pairs:

- `aqua_prison = [water_bolt, levitation]` (L95)
- `electric_dash = [lightning_bolt, vortex]` (L98)
- `elemental_bolt = [water_bolt, fire_arrow]` (L101)
- `flamefrost_spear = [ice_spear, flamestrike]` (L112)
- `flamethrower = [fire_arrow, windblast]` (L123)
- `frost_breath = [glaciate, windblast]` (L128)
- `frost_lightning = [lightning_bolt, ice_spear]` (L133)
- `icebound = [stone_skin, glaciate]` (L136)
- `lightning_storm = [lightning_sphere, levitation]` (L137)
- `lightning_vortex = [lightning_sphere, vortex]` (L140)
- `mud_shield = [water_bolt, stone_skin]` (L143)
- `plasma_blast = [fire_orb, lightning_sphere]` (L144)
- `summon_lava_elemental = [fire_orb, summon_earth_elemental]` (L153)
- `thorn_of_earth = [eruption, levitation]` (L154)
- `wall_of_fire = [flamestrike, eruption]` (L155)

---

## Coordinator Questions

Items requiring human judgment before implementation can proceed. Each carries a stable tag for reference.

### Naming and canonicalization

- `[COORD-DMG-TRUE]` — Encoding for "true" magical damage. Warlock Shadow Touch says "true dark magical damage"; Ranger Purge Shot says "true magical damage". Options: (a) distinct types `true_dark_magical`, `true_magical`; (b) regular `dark_magical`/`magical` damage source with `trueDamage: true` flag. The v1 inventory treats Druid Thorn Coat's "true physical" as its own damage type (`true_physical`). For consistency, option (a) or option (b) should be chosen for ALL true damage, not just magical.
- `[COORD-DMG-LIGHT]` — Is Zap's "light magical damage" (`wizard.csv:L46`) a real damage type, or should it be `lightning_magical`? It's the only citation. In-game verification requested.
- `[COORD-DMG-MAGICAL]` — Blood Pact's Abyssal Flame says "magical damage" without prefix (`warlock.csv:L40`). Is "magical" a valid generic type, or should this be classified as `dark_magical` or `evil_magical`?
- `[COORD-DMG-HYBRID]` — Sorcerer merged spells apply two damage types (e.g., Elemental Bolt fire/ice). Encoding rule: two entries in `damage[]` each with a distinct damageType. Confirm this is the intended shape.
- `[COORD-TAG-HOLY-DIVINE]` — Cleric uses both `holy` (ability names) and `divine` (damage type, perk names). Are these two tags or one? Recommended: `holy` for school, `divine` for damage type prefix. Needs confirmation.
- `[COORD-TAG-EVIL]` — Warlock uses `dark_magical` (Bolt of Darkness, Dark Reflection) and `evil_magical` (Blow of Corruption, Curse of Pain) as distinct damage types. Are they mechanically different in-game, or cosmetic variations that could be unified?
- `[COORD-TAG-JUDGMENT]` / `[COORD-TAG-PRAYER]` — Are `judgment` and `prayer` real Cleric tags (used by filters or other abilities), or just flavor? If the filter set never uses them, they shouldn't be tags.

### Status vs. CC

- `[COORD-STATUS-PLAGUE]` — Add `plague` to STATUS_TYPES? Druid Rat Infected Fangs is the only citation, but it's a clear status (DoT + damage type).
- `[COORD-STATUS-BLIND]` — Cleric Holy Strike "blinds". Is this a status (vision debuff with stat effects) or a CC (cannot-target)?
- `[COORD-STATUS-SILENCE-COMPOUND]` — Bard CSV L38 says silence "Disables skills/spells/performance abilities". Does one status model all three, or do we need separate `silence_skill`, `silence_spell`, `silence_performance`, or per-type effects arrays within the silence status?
- `[COORD-STATUS-ANTIHEAL]` — Cleric Locust Swarm reduces both incoming physical AND magical healing by 50%. Represent as (a) two effects on a nameless debuff, (b) a new `antiheal` status, (c) extend `silence` to include healing? Currently (a) requires no vocabulary addition.
- `[COORD-CC-BIND-ROOT]` — `bind` (Cleric) and `root` (Druid) are the same concept. Pick canonical — recommended `root`.
- `[COORD-CC-FREEZE]` — Ice Mastery "freezes feet for 0.5s preventing movement". Is this `immobilize`, `frostbite` with extreme AS, or a new `freeze` cc?
- `[COORD-CC-STUN]` — Wizard Slow says target is "slowed for 2 seconds" but applies an immobilization-like effect. Is this `slow` or `stun`? Depends on in-game behavior.
- `[COORD-CC-IMMOBILIZE]` — Spelling: `immobilize` (infinitive, preferred) vs `immobilized` (participle). Canonicalize to infinitive per convention 11.

### Triggers

- `[COORD-TRIG-SPELL-CAST]` — Add `on_spell_cast` to TRIGGER_EVENTS? Two classes cite (Sorcerer Mana Flow, Wizard Arcane Feedback).
- `[COORD-TRIG-STEALTH]` — Add `on_stealth_exit` (or generic `on_state_exit` with state argument)? Only Rogue cites; needed for Ambush.
- `[COORD-TRIG-COMBAT]` — Add `on_combat_enter`? Only Fighter Veteran Instinct cites. Alternative: model as condition with no trigger.
- `[COORD-TRIG-PERF]` — Add `on_successful_performance` (or similar)? Only Bard War Song cites.
- `[COORD-TRIG-MOVEMENT]` — Barbarian Achilles Strike ticks damage "each time the target moves". Model as a trigger event on the target, as a DoT with movement-gated tickRate, or as a compound condition? Recommend DoT representation with a note.
- `[COORD-TRIG-DAMAGE-TAKEN]` — Is `on_damage_taken` distinct from `on_hit_received`? Wizard Reactive Shield uses the damage-taken phrasing. Possible merger.

### Conditions

- `[COORD-COND-CREATURE]` — Add `creature_type` to CONDITION_TYPES. Cleric uses `undead` gating repeatedly; Warlock references `undead` and `demon`. Enum would be open (enemy creature categories).
- `[COORD-ENV-WATER]` — Disambiguate `water` (Penguin Dash, player in water) and `underwater` (Summon Treant, summon in water). One canonical value or two?
- `[COORD-STATE-STANCE]` — Fighter sim note says `defensive_stance` and `blocking` are the same in-game state. If confirmed, merge into one enum member (recommend `defensive_stance`, since it's more specific).
- `[COORD-STATE-SPRINT]` — Add `sprinting` to PLAYER_STATES? Fighter Sprint is a skill that grants a state — observable.
- `[COORD-FORM-DEMON]` — Warlock Blood Pact's form is named in prose as "demon". Canonical form ID for Category 7 — add `demon`?

### Weapon / equipment

- `[COORD-WEAP-ONEHANDED]` — Add `one_handed` to WEAPON_TYPES. Three Fighter abilities cite.
- `[COORD-WEAP-BARD]` — Bard "rapier mastery" vs weapon gates (`rapier` in existing enum). No conflict, just confirm.
- `[COORD-EQUIP-SHIELD]` — Shield-held conditions (Fighter Shield Mastery) — is shield a weapon type, an equipment slot, or a new `has_shield` condition?

### Stats

- `[COORD-STAT-REGISTRY]` — `[NEW]` stats in Category 14 need STAT_META entries before authoring: `backstabPower`, `impactPower`, `projectileSpeed`, `drawSpeed`, `headshotPenetration`, `knockbackResistance`, `noArmorMovePenalty`, `switchingSpeed`, `interactionSpeed`, `burnDuration`, `potionPotency`, `potionDuration`, `memoryCapacity`, `shapeshiftTimeReduction`, `wildSkillCooldownReduction`, `knockbackPowerBonus`, `jumpHeight`.
- `[COORD-STAT-BACKSTAB]` — Is `backstabPower` an effects[] stat, or a trigger-level damage multiplier (damage inside triggers[].damage)? Both encodings possible.

### Abilities / modifiers

- `[COORD-ABMOD-CHARGES]` — `.modify = "charges"` has zero CSV citations. Either the enum member is dead (and should be dropped) or a Cleric/Wizard/Druid ability grants extra charges and the survey missed it.
- `[COORD-ABMOD-COST]` — Warlock Torture Mastery doubles spell costs; modeled as a top-level `spellCostMultiplier` today. Should we unify under `abilityModifiers` with `.modify = "cost"`?
- `[COORD-GRANT-ALLYEFFECT]` — Druid Orb of Nature "grants Nature's Touch on ally contact" — is this `grantsSpells` or `allyEffect` (spec §3 L561)? Category 26 currently lists it under `grantsSpells`; may be incorrect.

### Stacking

- `[COORD-STACK-DARK]` — `on_dark_spell_cast` vs `on_dark_magic_damage_dealt` — Warlock Soul Collector's prose uses both phrasings. Canonicalize one.
- `[COORD-STACK-HP]` — Barbarian Berserker scales per 10% HP missing; Sorcerer Elemental Fury per 1% HP lost. These are `hpScaling` on the effect, NOT classical stacking. Clarify in vocabulary notes that HP-scaling does not use `stacking.triggerOn: "on_hp_threshold"`.
- `[COORD-STACK-SHARED]` — Warlock's Darkness Shards are a SHARED pool across three abilities (Soul Collector, Blood Pact, Spell Predation). Current `stacking` shape is per-ability. How is the shared pool modeled?

### Dead / orphaned

- `[DEAD-PHASE-MULT]` — `multiplicative_layer` phase has only one tenuous citation (Warlock Antimagic, if modeled that way). Dead in practice? Or is this the canonical phase for all DR-like layers?
- `[DEAD-TRIG-DAMAGE-TAKEN]` — `on_damage_taken` may be redundant with `on_hit_received`; see `[COORD-TRIG-DAMAGE-TAKEN]`.
- `[DEAD-ACTIVATION-CHANNEL]` — no "channel" activation exists; confirm `passive|toggle|cast` is the final set.
- `[DEAD-STATE-DUALCASTING]` — `dual_casting` in PLAYER_STATES is referenced only in Sorcerer Class Notes, never in a condition. Confirm it's a valid state the player can toggle.
- `[DEAD-PASSIVE-ANTIMAGIC]` / `[DEAD-PASSIVE-SHOUTMOD]` — some `passives` keys should probably become `effects[]` or `abilityModifiers[]`, not passives.

### Cross-cutting

- `[COORD-CURSE-MEANING]` — Warlock's `curse` appears as: (a) `tag` (Curse Mastery, spell names), (b) trigger event stem (`on_curse_tick`), (c) potentially a status (the "cursed" state). Disambiguate: `curse` is a TAG only; abilities tagged `curse` apply stat debuffs and trigger `on_curse_tick` when they DoT. No `curse` status or damage type.
- `[COORD-DEAD-GEAR-TRIGGERS]` — `GEAR_TRIGGER_EVENTS` in `constants.js` is explicitly gear-scoped and not referenced by any class CSV. Confirmed. Leave enum as-is; it's not dead, just out of scope for this survey.

---

## Audit Trail

### Step 1 — Plan (Plan sub-agent)

Produced an exhaustive mapping of v3 ability-shape fields to 35 survey categories (C1–C35), walking `docs/ability_data_map_v2.md` §3 (lines 207–760). Flagged 11 OPEN-ended fields (`tags`, `passives`, `stacking.triggerOn/consumedOn`, `consumedOn`, `stateChange` keys, `summon.type`, `cc.type`, etc.). Recommended walk order anchored on reference class (Warlock) and ending on the largest CSV (Sorcerer).

### Step 2 — Per-class survey (10 parallel Explore sub-agents)

One sub-agent per class CSV, each executing the 35-category checklist verbatim. Outputs were coverage matrices with verbatim string extraction + line citations + `hidden/ambiguous/novel` markers. Aggregate volume: ~700 unique (value, class, line) triples across all classes. All 10 matrices complete; every class contributed to ≥1 category.

Summary of per-class novelty counts (novel values flagged by sub-agents):
- barbarian: 6 (impactPower, knockbackResistance, on_movement, fear, hp-scaling, step-budget)
- bard: 5 (memoryCapacity, switchingSpeed, interactionSpeed, duration_reset trigger, 4 instrument tags)
- cleric: 9 (creature_type cond, divine_magical, blind, bind, antiheal, prayer, judgment, on_divine_attack_hit, SCS-as-castTime)
- druid: 6 (5 form names, 2 novel stats, plague status, spirit_magical, ice_magical, environment.water vs underwater)
- fighter: 8 (dual_wield condition, one_handed, defensive_stance, momentum_stacks, disarm, on_combat_enter, on_successful_block, capOverride pdr)
- ranger: 6 (bow_drawn, reloading states, projectileSpeed, drawSpeed, headshotPenetration, true_magical)
- rogue: 8 (backstabPower, armorRatingBonus, step-budget, on_stealth_exit, maxStacks=5 poison, compound healing-reduction, hiding dual-state, Pickpocket passives)
- sorcerer: 11 (merged_spell type, cooldown cost, dual_casting state, 6 elemental damage types, hybrid damages, hpScaling, lift/trap/immobilize cc, 3 abilityModifiers)
- warlock: 7 (grantsSpells, darkness shards shared-pool, true_dark_magical, curse multi-meaning, demon form, on_curse_tick, buff_strip)
- wizard: 5 (Sage attr mult, Arcane Shield filter, light_magical, compound frostbite, stacking consumedOn)

### Step 3 — Self-audit (review sub-agent)

Audit sub-agent checked (1) coverage of every v3 field — identified 7 missing/implicit categories (phase enum coverage, effect.target, stateChange, creature_type, frenzy_active, primitiveAttr, afterEffect.removedBy) and noted all are addressed via the matrix structure or folded into coordinator questions; (2) every-class contribution — confirmed; (3) naming drift — identified 20+ drift candidates, all raised as coordinator questions; (4) missing categories — no silent misses; (5) hidden vocabulary in prose — surfaced 8 items, all listed in appropriate categories with `[COORD]` tags; (6) dead vocabulary in code enums — flagged `on_damage_taken`, `multiplicative_layer`, `dual_casting`, `charges` modifier, and `chain` armor as possibly dead.

Final aggregated matrix has no known silent gaps. Every value below the "Rejected candidates" fold is cited; every value in a canonical table has at least one CSV citation. Values that exist in code enums but have zero CSV citations are flagged `[DEAD in code]` and raised as coordinator questions.

### Step 4 — This document

Drafted from the audited matrix. Structure: Conventions → Coverage Matrix → 35 categories → Coordinator Questions → Audit Trail. Every canonical value cites ≥ 1 CSV source; every rejected value cites reasoning that is not class-specific.

### Step 5 — Coordinator review (pending)

Awaiting coordinator approval. Implementation (code changes to `constants.js`, new STAT_META entries, validator updates, per-class data authoring) is deferred to a follow-up session and will reference this document as the authoritative vocabulary source.
