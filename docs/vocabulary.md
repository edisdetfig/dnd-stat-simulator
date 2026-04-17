# Vocabulary

The controlled vocabularies the engine and class data share. Values live in `src/data/constants.js` + `src/data/stat-meta.js` + `src/engine/recipes.js`; this doc names each set, its values, its semantic, and the authoring conventions that go with it.

Read `docs/engine_architecture.md` first for the engine contract. Read `src/data/classes/class-shape.js` for the authoring schema. This doc is the glossary both sides use.

Convention: whenever this doc lists values, the source of truth is the constants/STAT_META export. If a value appears here and not in the code, the code is right and this doc is stale — fix this doc. Adding a value to any locked vocabulary below is a **vocabulary update**: edit the Set in the code, edit this doc in the same change. No quiet adds. No pre-allocated placeholders.

---

## 1. Ability vocabularies

### 1.1 `ABILITY_TYPES` — `src/data/constants.js::ABILITY_TYPES`
Every ability's `type` is one of these. Values: `perk`, `skill`, `spell`, `transformation`, `music` (5 total).

| Value | Semantic |
|---|---|
| `perk` | Passive or auxiliary class feature in `perks[]`. Usually `activation: "passive"`. |
| `skill` | Active/passive class skill in `skills[]`. Activation varies. |
| `spell` | Memorized spell in `spells[]`. Consumes the `spell` memory pool (`memoryCost` slots). |
| `transformation` | Shapeshift-style ability in `spells[]` with `type: "transformation"`. Consumes the `transformation` memory pool. |
| `music` | Bard-style music ability in `spells[]` with `type: "music"`. Consumes the `music` memory pool. |

The `type` doubles as the memory-pool discriminator. `STAT_EFFECT_ATOM.abilityType` references this vocabulary on capacity stats (e.g., `{ stat: "memorySlots", value: 5, abilityType: "spell" }`).

### 1.2 `ACTIVATIONS` — `src/data/constants.js::ACTIVATIONS`
Every ability's `activation` is one of these. Values: `passive`, `cast`, `cast_buff`, `toggle` (4 total).

| Value | Semantic |
|---|---|
| `passive` | Selected = active. No caster-side persistent state. Perks; passive skills. |
| `cast` | Instant projection. No caster-side persistent state. Direct damage, curses, utility spells. |
| `cast_buff` | Cast that produces a caster-side persistent state. The caster state is represented as membership in `ctx.activeBuffs`. |
| `toggle` | User-flipped on/off. Persistent caster-side state. Blood Pact, Druid forms, Adrenaline Rush. |

The `effect_active` condition dispatches on `activation`:
- `passive` → true iff ability is selected
- `cast_buff` / `toggle` → true iff ability is selected AND `abilityId ∈ ctx.activeBuffs`
- `cast` → never true (no persistent state; use `ability_selected` for loadout-membership checks)

### 1.3 `TIER_VALUES` — `src/data/constants.js::TIER_VALUES`
Bard performance-tier selector. Values: `poor`, `good`, `perfect` (3 total). Read by the `tier` condition variant against `ctx.selectedTiers[abilityId]`.

---

## 2. Atom tags + capability tags

### 2.1 `ATOM_TAGS` — `src/data/constants.js::ATOM_TAGS`
Named grouping labels on atoms. UI groups atoms with matching tags in tooltips. No engine math depends on tag values.

20 total. Two groups:

**Status (damage/debuff-over-time) — 10**: `burn`, `frostbite`, `wet`, `electrified`, `poison`, `bleed`, `silence`, `plague`, `blind`, `freeze`. (Mirrors `STATUS_TYPES`.)

**CC markers (no stat payload) — 10**: `root`, `stun`, `slow`, `bind`, `disarm`, `fear`, `knockback`, `lift`, `trap`, `immobilize`.

Usage rules:
- **Semantic atoms** (`stat` / `value` / `phase` present): `tags[]` values must be in `ATOM_TAGS`.
- **Display-only atoms** (no `stat` / `value` / `phase`): `tags[]` values must be in `ATOM_TAGS` OR `CAPABILITY_TAGS` (see 2.2).

### 2.2 `CAPABILITY_TAGS` — `src/data/constants.js::CAPABILITY_TAGS`
Phase 3-locked vocabulary for engine-observable capabilities carried by display-only atoms. 7 total:

| Value | Semantic (anchor ability) |
|---|---|
| `cooldown_gated` | Ability has a cooldown-based internal gate that the simulator doesn't model timewise (Dark Reflection). |
| `phase_through` | Character phases through melee attacks / projectiles / collisions (Phantomize). |
| `spells_cannot_kill` | Spell self-damage cannot reduce HP below 1 (Immortal Lament). |
| `detects_hidden` | Character / summon detects hidden targets (Summon Hydra). |
| `possessable` | A summon can be possessed by the caster (Evil Eye). |
| `can_move_while_channeling` | Channeling does not gate movement/aiming (Ray of Darkness). |
| `irreversible_until_contract_ends` | Ability cannot be canceled until a contract ends (Blood Pact). |

Extension policy: adding a tag to `CAPABILITY_TAGS` is a vocabulary update — edit the Set in `constants.js`, document the value here, surface the change at the phase boundary that authors it.

---

## 3. Damage types

### 3.1 `DAMAGE_TYPES` — `src/data/constants.js::DAMAGE_TYPES`
13 total. `DAMAGE_ATOM.damageType` membership.

- `physical` — weapon-damage and skill-damage routed through the physical-damage formula (PPB, armor pen, PDR). See `docs/damage_formulas.md:7–61`.
- `magical` — generic magical damage. Universal magical subtype applied when a specific subtype isn't authored.
- **Magical subtypes (11)**: `divine_magical`, `dark_magical`, `evil_magical`, `fire_magical`, `ice_magical`, `lightning_magical`, `air_magical`, `earth_magical`, `arcane_magical`, `spirit_magical`, `light_magical`.

Bonus semantics (critical — `docs/damage_formulas.md:116–143`):
- `physicalDamageBonus` (universal) applies to every `physical` damage atom.
- `magicalDamageBonus` (universal) applies to every magical-subtype damage atom — **including typed subtypes** (`damage_formulas.md:122`).
- Typed-damage stats (`darkDamageBonus`, `fireDamageBonus`, etc.) apply **only to matching subtype**. `darkDamageBonus` does nothing to `evil_magical` damage.

### 3.2 Damage-type → heal-type family collapse
Used by both `lifestealRatio` and `targetMaxHpRatio` DAMAGE_ATOM fields to derive a HEAL projection's `healType` (see §12).

| DAMAGE_ATOM.damageType | Derived HEAL_ATOM.healType |
|---|---|
| `physical` | `physical` |
| any magical subtype (`magical`, `dark_magical`, `fire_magical`, ...) | `magical` |

Engine utility: `damageTypeToHealType(damageType)`. See `docs/engine_architecture.md §16`.

---

## 4. Effect phases

### 4.1 `EFFECT_PHASES` — `src/data/constants.js::EFFECT_PHASES`
9 total. Every `STAT_EFFECT_ATOM.phase` value names the pipeline bucket the atom contributes into.

See `docs/engine_architecture.md §7` for the full per-phase contract table (operation, value semantic, order). One-line summary here:

| Phase | Role |
|---|---|
| `pre_curve_flat` | Additive flat contribution before the attribute curve. |
| `attribute_multiplier` | Multiplicative attribute scaling (e.g., Malice's +15% WIL, Curse of Weakness's -25% attributes). |
| `post_curve` | Additive flat / percent contribution after the curve (most stat bonuses). |
| `post_curve_multiplicative` | Multiplicative layer applied after the post-curve additive sum. |
| `multiplicative_layer` | Generic multiplicative scalar applied mid-pipeline. |
| `post_cap_multiplicative_layer` | Multiplicative layer applied after DR caps (Antimagic: `magicDamageTaken: 0.80` at this phase). |
| `type_damage_bonus` | Typed-damage bonus accumulator. Typed stats (`darkDamageBonus`, etc.) route into `perTypeBonuses` keyed by damage type. |
| `healing_modifier` | Healing modifier accumulator (Vampirism, Immortal Lament proc). Feeds `calcHealing`'s `healingMod` term. |
| `cap_override` | Override target cap. Valid only when `atom.stat ∈ RECIPE_IDS` (e.g., Fighter Defense Mastery raises `pdr` cap to 0.75). |

---

## 5. Effect targets

### 5.1 `EFFECT_TARGETS` — `src/data/constants.js::EFFECT_TARGETS`
8 total. `STAT_EFFECT_ATOM.target` / `DAMAGE_ATOM.target` / `HEAL_ATOM.target` / `SHIELD_ATOM.target`.

| Value | Semantic |
|---|---|
| `self` | Caster-side. Summed into caster's `bonuses`. |
| `ally` | Display-only in Phase 3. Query surface via `atomsByTarget("ally")` for the Phase 11 ally-buff panel. No projection synthesized yet. |
| `self_or_ally` | Display-only in Phase 3. Same query surface behavior as `ally`. |
| `enemy` | Target-side. Summed into target's `bonuses` (for enemy-targeted atoms). |
| `either` | Per-ability user toggle (applyToSelf / applyToEnemy); routes to self or enemy (or both) per user choice. |
| `party` | Display-only in snapshot; engine treats as self. |
| `nearby_allies` | Display-only in snapshot; engine treats as self. |
| `nearby_enemies` | Display-only in snapshot; engine treats as target. |

Distinct from ability-level `targeting` (which gates in-game cast targeting — `self / ally / ally_or_self / enemy / enemy_or_self`).

---

## 6. Conditions

### 6.1 `CONDITION_TYPES` — `src/data/constants.js::CONDITION_TYPES`
13 total variants.

| Type | Required fields | Semantic |
|---|---|---|
| `hp_below` | `threshold` (0–1) | True iff `ctx.hpFraction < threshold`. User-set HP fraction; no engine cycle. |
| `ability_selected` | `abilityId` | True iff `abilityId` is in any of `ctx.selectedPerks`, `selectedSkills`, `selectedSpells`. |
| `effect_active` | `effectId` | Dispatched by target ability's `activation` (see §1.2). |
| `environment` | `env` | Reads `ctx.environment`. |
| `weapon_type` | `weaponType` (∈ `WEAPON_TYPES`) | Reads `ctx.weaponType`. Virtual categories resolved by engine (`ranged` via `WEAPON_TYPE_CATEGORIES`; `two_handed` / `unarmed` / `instrument` / `dual_wield` via gear properties). |
| `player_state` | `state` (∈ `PLAYER_STATES`) | Reads `ctx.playerStates`. |
| `equipment` | `slot`, `equipped` | Reads `ctx.equipment[slot]`. |
| `creature_type` | `creatureType` | Reads `ctx.target.creatureType`. |
| `damage_type` | `damageType` | Used inside damage projection to gate bonuses by outgoing-damage type (e.g., Antimagic). |
| `tier` | `tier` (∈ `TIER_VALUES`) | Reads `ctx.selectedTiers[abilityId]`. |
| `all` | `conditions` | Compound — all must be true. |
| `any` | `conditions` | Compound — at least one must be true. |
| `not` | `conditions` | Compound — none must be true. |

Cancellation is expressed via `not` — there is no separate `removedBy` field or cancellation-specific variant.

---

## 7. Armor / weapon / grant-remove / cost

### 7.1 `ARMOR_TYPES` — `src/data/constants.js::ARMOR_TYPES`
3 total: `cloth`, `leather`, `plate`.

Used by class-root `armorProficiency` + `GRANT_ATOM.armorType` / `REMOVE_ATOM.armorType`. Warlock Demon Armor grants `plate`; Fighter Slayer removes `plate`.

### 7.2 `WEAPON_TYPES` — `src/data/constants.js::WEAPON_TYPES`
18 total. Mix of specific weapon kinds and virtual categories.

**Specific kinds**: `axe`, `sword`, `dagger`, `bow`, `crossbow`, `staff`, `blunt`, `rapier`, `spear`, `shield`, `spellbook`, `firearm`.

**Virtual categories**: `two_handed`, `one_handed`, `ranged`, `instrument`, `unarmed`, `dual_wield`.

Virtual resolution:
- `ranged` ← `WEAPON_TYPE_CATEGORIES.ranged = ["bow", "crossbow"]`.
- `two_handed` / `unarmed` / `instrument` / `dual_wield` → resolved by engine via gear properties (handed-ness, absence of weapon, instrument tag, both hands holding weapons).

**No `melee` category** (LOCK 4): every weapon can melee. Atoms that fire on "any attack" carry no `weapon_type` condition; their `desc` explains the in-game trigger. Abilities requiring "any equipped weapon" (excluding bare hands) use `{ type: "not", conditions: [{ type: "weapon_type", weaponType: "unarmed" }] }`.

### 7.3 `GRANT_REMOVE_TYPES` — `src/data/constants.js::GRANT_REMOVE_TYPES`
3 total: `ability`, `weapon`, `armor`. Discriminates `GRANT_ATOM` / `REMOVE_ATOM`.

### 7.4 `COST_TYPES` — `src/data/constants.js::COST_TYPES`
5 total: `charges`, `health`, `cooldown`, `percentMaxHealth`, `none`. Every ability's `cost.type`.

### 7.5 `COST_SOURCE` — `src/data/constants.js::COST_SOURCE`
2 total: `granted`, `granter`. Used on `GRANT_ATOM.costSource` (ability grants only). `"granted"` (default) = granted ability pays its own cost. `"granter"` = granter's cost governs delivery count (Druid Orb of Nature).

---

## 8. Player states

### 8.1 `PLAYER_STATES` — `src/data/constants.js::PLAYER_STATES`
12 total. `player_state` condition's `state` value. Reads `ctx.playerStates`.

`hiding`, `crouching`, `defensive_stance`, `casting`, `reloading`, `bow_drawn`, `playing_music`, `drunk`, `dual_casting`, `in_combat`, `behind_target`, `frenzy`.

UI pattern: the engine surfaces a toggle for a state only when some selected ability's condition tree references it ("UI emerges from data" — see `docs/perspective.md §6`).

---

## 9. scalesWith types

### 9.1 `SCALES_WITH_TYPES` — `src/data/constants.js::SCALES_WITH_TYPES`
2 total. Polymorphic discriminator on `STAT_EFFECT_ATOM.scalesWith` and `DAMAGE_ATOM.scalesWith`.

| Type | Required fields | Semantic |
|---|---|---|
| `hp_missing` | `per`, `valuePerStep`, `maxValue` | Atom `value` = `min(floor((1 - hpFraction) × 100 / per) × valuePerStep, maxValue)`. (Barbarian Berserker.) |
| `attribute` | `curve`, `attribute` | Atom `value` = `evaluateCurve(STAT_CURVES[curve], ctx.attributes[attribute])`. (Druid shapeshift damage atoms.) |

Note: `lifestealRatio` and `targetMaxHpRatio` both use **flat fields on DAMAGE_ATOM**, not `scalesWith` variants. See §12 below and `docs/engine_architecture.md §16`.

---

## 10. Ability-level tags (convention only, not locked)

Ability-level `tags[]` is a free-form snake_case vocabulary used by:
- `removes[].tags` filters (e.g., `{ type: "ability", abilityType: "spell", tags: ["spirit"] }`)
- `STAT_META` tag-scoped abilityModifier stats (`shoutDurationBonus.tag: "shout"` — any ability tagged `shout` reads `shoutDurationBonus` for duration modification)
- UI grouping / flavor filters

**Not locked to a Set in constants.js** in Phase 3. Adding a tag is allowed during authoring. Convention: snake_case.

Observed Warlock values (not exhaustive): `demon`, `dark`, `blood`, `projectile`, `evil`, `curse`, `channel`, `beam`, `fire`, `summon`, `buff`.

Phase 9/10 may revisit after all 10 classes migrate and the full vocabulary surfaces.

---

## 11. Atom-level `stat` vocabulary

The `STAT_EFFECT_ATOM.stat` field references **two namespaces**:

1. **`STAT_META` keys** (`src/data/stat-meta.js`) — additive contributions from gear, perks, and ability atoms. Anything the aggregator sums into `bonuses`. The permitted value set at any phase other than `cap_override`.
2. **`RECIPE_IDS` entries** (`src/engine/recipes.js`) — recipe output identifiers (`hp`, `pdr`, `mdr`, `ppb`, `mpb`, `moveSpeed`, etc.). Valid under `atom.stat` only when `atom.phase === "cap_override"` (e.g., Fighter Defense Mastery raises the `pdr` cap to 0.75). The validator enforces this rule as `C.namespace`.

Typed-damage-bonus stats (added Phase 3):
- `divineDamageBonus`, `darkDamageBonus`, `evilDamageBonus`, `fireDamageBonus`, `iceDamageBonus`, `lightningDamageBonus`, `airDamageBonus`, `earthDamageBonus`, `arcaneDamageBonus`, `spiritDamageBonus`, `lightDamageBonus`.
- All have `cat: "offense", unit: "percent", gearStat: false`. Class-data-only; gear rolls `physicalDamageBonus` / `magicalDamageBonus` (universal magic bonus per `docs/damage_formulas.md:122`).
- Authored at `phase: "type_damage_bonus"`. Engine sums each typed stat into `perTypeBonuses` keyed by the stat's implied damage type; damage projections at Stage 6 apply the matching typed bonus additively with MPB × Scaling (`docs/damage_formulas.md:130–143`).

---

## 12. DAMAGE_ATOM field reference

### 12.1 `lifestealRatio` — optional flat field [0, 1]
Engine rule when present on a DAMAGE_ATOM:
- Derive a HEAL projection alongside the damage projection.
- `heal_amount = lifestealRatio × damage_atom_projection`
- `target = "self"`
- `healType = damageTypeToHealType(atom.damageType)` (see §3.2)

Pattern: flat field parallel to `percentMaxHealth`. Per-atom granularity lets multi-damage abilities lifesteal on a subset of their atoms.

Consumer: Warlock Life Drain's damage atom — `lifestealRatio: 1.0`.

### 12.2 `targetMaxHpRatio` — optional flat field [0, 1]
Engine rule when present on a DAMAGE_ATOM:
- Derive a HEAL projection alongside the damage projection.
- `heal_amount = targetMaxHpRatio × damage_atom_target's max HP`
- `target = "self"`
- `healType = damageTypeToHealType(atom.damageType)` (see §3.2)

Pattern: symmetric with `lifestealRatio`. Use when the heal scales from the **damage atom's target's** max HP per hit (rather than from the damage value itself).

Consumer: Warlock Exploitation Strike's damage atom — `targetMaxHpRatio: 0.10` (10% of the enemy's max HP per unarmed hit while the buff is active).

### 12.3 `percentMaxHealth` — HEAL_ATOM + DAMAGE_ATOM
On DAMAGE_ATOM: damage = `percentMaxHealth × target-max-HP` (e.g., Blood Pact Abyssal Flame self-damage 1%/s; the atom's `target` names whose max HP is used).
On HEAL_ATOM: heal = `percentMaxHealth × heal target's max HP` — single-context (the heal atom's `target` names whose max HP is used). For heals that scale from a damage target's max HP per hit (Exploitation Strike pattern), use `targetMaxHpRatio` on the corresponding DAMAGE_ATOM (§12.2) instead.

---

## 13. SHIELD_ATOM field reference

### 13.1 `damageFilter`
Values: `"physical"` | `"magical"` | `null` (absorbs all damage).

When set, the shield absorbs only matching-damage-type hits. Eldritch Shield uses `damageFilter: "magical"`.

---

## 14. Related constants (not controlled vocabularies, referenced for completeness)

- `CORE_ATTRS` — 7 attributes (`str`, `vig`, `agi`, `dex`, `wil`, `kno`, `res`).
- `ARMOR_SLOTS` — 9 slots in canonical order (`head`, `chest`, `back`, `hands`, `legs`, `feet`, `ring1`, `ring2`, `necklace`).
- `STATUS_TYPES` — subset of `ATOM_TAGS` (status group only, 10 values).
- `GEAR_TRIGGER_EVENTS` — Phase 1 seed vocabulary for gear triggers (7 events). Refinement pending; see `docs/unresolved_questions.md`.
- `TARGETING` — display-only ability-level targeting metadata (`self`, `ally`, `ally_or_self`, `enemy`, `enemy_or_self`). Distinct from `EFFECT_TARGETS`.
- `RARITY_CONFIG`, `RARITY_ORDER`, `TARGET_PRESETS`, `GAME_VERSION` — UI-oriented constants consumed by components.
