# Engine Architecture

The contract the simulator's snapshot engine builds against. This document is the single source an implementer needs to construct the engine from scratch — every structural rule, every pipeline invariant, every projection formula, every forward-spec pattern is specified here, grounded in real Warlock data (`src/data/classes/warlock.new.js`) wherever possible.

Read `docs/perspective.md` (mental model) and `docs/rebuild-plan.md § Phase 3` first. Read `docs/performance-budget.md` for the < 50 ms budget and the pinned API surface. Read `docs/vocabulary.md` for the controlled-vocabulary glossary. This document defines how the engine moves data from `Build` to `Snapshot` in a way that respects both.

---

## 1. Purpose and priority hierarchy

This engine takes a `Build` (class + selected abilities + gear + toggles) and produces a `Snapshot` (derived stats + damage/heal/shield projections + available abilities) in under 50 ms. No time passes; no events fire. Every atom in the class data is a self-contained fragment of contribution that the pipeline routes, gates, and aggregates.

The three-priority hierarchy governs every design tradeoff (see `docs/rebuild-plan.md § Constraints`):

1. **Performance first.** Snapshot recompute < 50 ms for the largest realistic build. Stage boundaries enable memoization without restructuring.
2. **Class-agnostic, second.** Adding a class is a data change only. Engine code never branches on class, ability, or stat identity. Dispatch is enum-driven or data-driven.
3. **Engine-mechanic extension ease, third.** New mechanic types extend dispatch tables; they do not rewrite pipelines.

When priorities conflict, top of list wins.

Plus the project's **accuracy-first doctrine**: every numeric claim in this doc traces to a verified source (`docs/damage_formulas.md` / `docs/healing_verification.md` / `docs/season8_constants.md`). Line numbers are cited inline.

---

## 2. Mental model in one paragraph

A snapshot is the answer to "what do my stats look like given these settings?" — nothing more. Duration, cooldown, cast time are display projections, not engine gates. The data never models cause-and-effect: if drinking ale makes you drunk in-game, the simulator exposes a `drunk` toggle; the data carries no "ale causes drunk" edge. Atoms are the unit of contribution — each one carries its own `target`, `condition`, `duration`, and optional grouping metadata. An ability is a thin bag of atoms plus identity. Conditions gate; no separate event system exists. UI surfaces (toggles, counters) emerge from the data: if no selected ability references `hiding`, no hiding toggle renders. The engine evaluates the data; the UI reflects what the engine returns. See `docs/perspective.md § Core principles`.

---

## 3. Stage pipeline (0–6)

The pipeline is six stages plus a Stage 0 pre-pass. Stages 0–4 are pure JS computations; Stages 5 and 6 call into the verified-math modules (`src/engine/recipes.js`, `src/engine/damage.js`). Each stage's output is deterministic given its inputs; memoization is added at stage boundaries when Phase 6 measurement shows a hotspot.

Pipeline shape (per `docs/performance-budget.md § 6`, reproduced with Phase 3 additions):

| Stage | Purpose | Principal inputs | Principal outputs | Purity |
|---|---|---|---|---|
| 0 — `buildContext` | Turn `Build` into `ctx`. Availability resolver, memory-budget validator, derived weapon-state. | All `Build` fields | `ctx` (read-only), `availableAbilityIds`, `activeAbilityIds`, `lockedAbilityIds`, `memoryBudget` | Pure (reads `Build`; writes `ctx`) |
| 1 — `collectAtoms` | Walk available abilities' atom containers; populate `source` + `atomId`. **Damage atoms** collect for every available ability (cast spells project damage even when not state-active — *"what would this spell do if cast now?"*). **Effects / heal / shield / grants / removes** collect only for state-contributing abilities (in `activeAbilityIds`). `afterEffect` short-circuit (LOCK 5) applies inside the state-contributing path. | `ctx.availableAbilityIds` + `ctx.activeAbilityIds` + class data | Flat atom lists per category: `effects`, `damage`, `heal`, `shield`, `grants`, `removes` | Pure |
| 2 — `filterByConditions` | Evaluate each atom's `condition`; drop false ones. | Stage 1 lists, condition-input subset of `ctx` | Filtered atom lists | Pure |
| 3 — `materializeStacking` | Apply `maxStacks` / `resource` count; apply `scalesWith` to derive the atom value from ctx. | Stage 2 lists, `ctx.stackCounts`, `ctx.classResourceCounters`, `ctx.attributes`, `ctx.hpFraction` | Atoms with materialized `value` | Pure |
| 4 — `aggregate` | Bucket stat-effect atoms by `(stat, phase)`. Route typed-damage-bonus atoms into `perTypeBonuses`. Route `post_cap_multiplicative_layer` atoms into `postCapMultiplicativeLayers`. | Stage 3 `effects` atoms | `bonuses` (per-stat per-phase), `perTypeBonuses` (damage-type → list), `postCapMultiplicativeLayers` (list) | Pure |
| 5 — `deriveStats` | Run `DERIVED_STAT_RECIPES(attrs, bonuses, capOverrides)`. | `bonuses` (flat), `ctx.attributes`, `ctx.capOverrides` | `derivedStats` (every recipe output, with `{ value, rawValue?, cap? }`) | Pure (calls into `recipes.js`) |
| 6 — `projectDamage` / `projectHealing` / `projectShield` | Per-atom projections through `applyDamage` / `calcHealing`. Derive HEAL projections from DAMAGE_ATOMs carrying `lifestealRatio` (§16.2) or `targetMaxHpRatio` (§16.4). | Stage 3 damage/heal/shield atoms, `derivedStats`, `perTypeBonuses`, `postCapMultiplicativeLayers`, `ctx.target`, `ctx.viewingAfterEffect` | `damageProjections[]`, `healProjections[]`, `shieldProjections[]` | Pure (calls into `damage.js`) |

The availability resolver runs inside Stage 0 and counts within the budget.

Stage-boundary dependency declarations (for memoization):

| Stage | Reads | Invalidates on |
|---|---|---|
| 0 | Full `Build` | Any `Build` field changes |
| 1 | `ctx.availableAbilityIds` + `ctx.activeAbilityIds` + class data (static) | Either set changes |
| 2 | Stage 1 output + selected sets + `ctx.activeBuffs`, `weaponType`, `playerStates`, `equipment`, `target.creatureType`, `environment`, `selectedTiers`, `hpFraction` | Stage 1 out, OR any condition source changes |
| 3 | Stage 2 output + `ctx.stackCounts` + `ctx.classResourceCounters` + `ctx.attributes` + `ctx.hpFraction` | Stage 2 out, OR any materialization source changes |
| 4 | Stage 3 output (effects + afterEffects routed into bonuses when `viewingAfterEffect` applies) | Stage 3 out, OR `viewingAfterEffect` changes |
| 5 | `bonuses` (flat form), `ctx.attributes`, `ctx.capOverrides`, class `baseAttributes` / `baseHealth` | `bonuses`, `attributes`, `capOverrides` |
| 6 | `derivedStats`, Stage 3 damage/heal/shield atoms, `perTypeBonuses`, `postCapMultiplicativeLayers`, `ctx.target`, `ctx.viewingAfterEffect` | Any of the above |

Stage 2 cache-key layout (fine-grained dependency-declared vs coarse whole-ctx) is a Phase 5 implementation choice driven by measurement; the dependency set is the load-bearing claim.

---

## 4. Snapshot data shape

Phase 3 extends the pinned Phase 0 Snapshot signature (`docs/performance-budget.md § 6.1`). Existing keys are stable; additions are new keys (the pin disallows key removal or shape change on existing keys, permits additions).

```
Snapshot = {
  // Phase 0 pinned
  bonuses:              Record<StatId, Record<Phase, number>>,
  derivedStats:         Record<DerivedId, { value, rawValue?, cap? }>,
  damageProjections:    DamageProjection[],
  healProjections:      HealProjection[],
  availableAbilityIds:  string[],
  memoryBudget:         { used, capacity, lockedOut: string[] },

  // Phase 3 additions (permitted by "additions are extensions" rule)
  shieldProjections:    ShieldProjection[],
  perTypeBonuses:       Record<DamageType, number>,           // summed typed-damage-bonus contributions, per damage type
  postCapMultiplicativeLayers: Array<{ stat: "magicDamageTaken" | ..., multiplier: number, condition?: Condition }>,
  activeAbilityIds:     string[],       // subset of availableAbilityIds whose activation marks the ability as contributing state
  viewingAfterEffect:   string[],       // abilityIds currently in "view post-effect state" mode (from ctx; reflected back for UI)
  classResourceCounters: Record<ResourceId, number>,  // reflected back for UI; sourced from ctx
  stackCounts:          Record<AbilityId, number>,    // reflected back for UI; sourced from ctx
  debug?:               SnapshotDebug,                // optional trace output (Phase 6 / 11)
}

DamageProjection = {
  atomId:       string,                // "<abilityId>:damage:<index>" per § 6.2 atomId derivation
  source:       { kind, abilityId, className },
  damageType:   DamageType,
  hit:          { body?: number, head?: number, limb?: number },   // shape per Phase 5 pin; see § 4.1
  derivedHeal?: HealProjection,        // present iff source atom has lifestealRatio (§16.2) or targetMaxHpRatio (§16.4)
  derivedPercentMaxHealthDamage?: number,  // present iff source atom has percentMaxHealth
}

HealProjection = {
  atomId:     string,                  // "<abilityId>:heal:0" or "<abilityId>:damage:<N>" for lifesteal-derived
  source:     { kind, abilityId, className },
  healType:   "physical" | "magical",
  amount:     number,
  isHot?:     boolean,
  tickRate?:  number,
  duration?:  number,
  derivedFrom?: { kind: "lifesteal", damageAtomId: string },   // provenance for lifesteal-derived heals
}

ShieldProjection = {
  atomId:       string,                // "<abilityId>:shield:0"
  source:       { kind, abilityId, className },
  damageFilter: "physical" | "magical" | null,
  absorbAmount: number,
  duration?:    number,
}
```

### 4.1 `hit` shape

Per Phase 0 pin (`docs/performance-budget.md § 6.1 (1)`): the inner structure of `hit` is the one field that may change shape during Phase 5 implementation. Architecture doc commits to: **object with optional `body` / `head` / `limb` numeric fields**, chosen per-atom by the spell/skill's in-game behavior (AoE/DoT emit only `body`; weapon/direct-target spells emit all three). `affectedByHitLocation: false` on damage atoms (future extension) would mean only `body` is produced.

---

## 5. Context (`ctx`) shape

Stage 0's output. Read-only from Stage 1 onward.

```
ctx = {
  // Class + selection
  klass:                Class,
  selectedPerks:        string[],
  selectedSkills:       string[],
  selectedSpells:       string[],
  activeBuffs:          string[],                    // ability ids whose cast_buff or toggle state is on
  activeForm?:          string | null,               // singleton — at most one "form" ability active (Druid mutual exclusion; see § 10)

  // Toggles
  classResourceCounters: Record<ResourceId, number>,
  stackCounts:           Record<AbilityId, number>,
  selectedTiers:         Record<AbilityId, "poor" | "good" | "perfect">,
  playerStates:          string[],                   // subset of PLAYER_STATES
  viewingAfterEffect:    Set<string>,                // abilityIds in "view post-effect state" mode

  // Environment / target
  environment?:          string,
  target:                { pdr, mdr, headshotDR, creatureType?, maxHealth? },

  // Gear + attributes
  //
  // Gear sub-shape (Phase 6.5c.2):
  //   weapon: { weaponType, handType, baseWeaponDmg, gearWeaponDmg, magicalDamage? } | null
  //     handType ∈ {"oneHanded", "twoHanded"} — canonical per OQ-D12.
  //   offhand: { weaponType } | null
  //   bonuses: Record<StatId, number>
  //   onHitEffects: Array<{ damage, damageType, trueDamage, scaling, separateInstance, sourceItemId }>
  //     Per-hit riders on weapon-primary-hits (OQ-D6). Consumed by
  //     projectDamage at the post-floor true-physical additive position
  //     (docs/damage_formulas.md:235-240). Gated on
  //     `atom.isWeaponPrimary === true`.
  gear:                  { weapon, offhand, bonuses: Record<StatId, number>, onHitEffects: OnHitEffect[] },
  weaponType?:           string,                     // resolved from gear (see WEAPON_TYPES in vocabulary.md § 7.2)
  attributes:            { str, vig, agi, dex, wil, kno, res },   // base + gear contribution summed

  // HP-snapshot for hp_below (no Stage 5 cycle — see § 19)
  hpFraction:            number,                     // user-set [0, 1]; default 1.0

  // Stage 0-derived
  availableAbilityIds:   string[],
  activeAbilityIds:      string[],
  lockedAbilityIds:      string[],
  memoryBudget:          { used, capacity, lockedOut: string[] },
  capOverrides:          Record<string, number>,
}
```

---

## 6. Atom contracts

Every atom is self-contained: carries its own `target`, `condition`, `duration`, and optional stacking metadata (`maxStacks` XOR `resource`).

The `source` + `atomId` fields on every atom are **engine-populated at Stage 1**, not authored. Authoring either field is a validator error (`K.atom_source`).

**Ability-level `duration` / `cooldown` / `castTime`** are display projections per §2 — not engine-gating. They render in tooltips, modified by Convention-13 tag-scoped stat modifiers (see §7). Atom-level `duration` (per-atom lifetime) is a separate concept and is also not engine-gating; see §6.1.

### 6.1 `STAT_EFFECT_ATOM`

```
STAT_EFFECT_ATOM = {
  stat?:        StatId,                 // STAT_META key, OR RECIPE_IDS entry (only when phase === "cap_override")
  value?:       number,
  phase?:       Phase,                  // EFFECT_PHASES membership
  target?:      EffectTarget,           // default "self"
  duration?:    number,                 // seconds; absent = lives while parent ability is active
  condition?:   Condition,
  scalesWith?:  ScalesWith,             // { type: "hp_missing", ... } | { type: "attribute", ... }
  abilityType?: AbilityType,            // e.g. memorySlots + abilityType: "spell"
  tags?:        string[],               // semantic: ATOM_TAGS; display-only: ATOM_TAGS ∪ CAPABILITY_TAGS (§ 6.1.1)
  maxStacks?:   number,                 // XOR with resource
  resource?:    ResourceId,             // XOR with maxStacks
  // engine-populated:
  source:       { kind, abilityId, className },
  atomId:       string,
}
```

**Display-only rule (§ 6.1.1).** If none of `stat` / `value` / `phase` is present, the atom is display-only. `tags[]` must be present and non-empty, and every tag must be in `ATOM_TAGS` (bare CC markers like `fear`, `knockback`) or `CAPABILITY_TAGS` (engine-observable capabilities like `detects_hidden`, `phase_through`).

Validator rule codes: `C.stat` / `C.phase` / `C.target` / `C.namespace` (RECIPE_ID outside `cap_override`) / `C.tags` / `C.capability_tags` / `C.display_only` / `C.stacking` / `C.resource` / `C.scalesWith` / `C.abilityType`.

Warlock ground cases:
- Simple conditional: `demon_armor.effects[0]:61` (`spellCastingSpeed: -0.10`, `post_curve`, no condition).
- Attribute multiplier: `malice.effects[0]:72` (`wil: 0.15`, `attribute_multiplier`).
- Resource-scaled: `soul_collector.effects[1]:217` (`darkDamageBonus: 0.33`, `type_damage_bonus`, `resource: "darkness_shards"`).
- `effect_active`-gated: `blood_pact.effects:290–301` (5 atoms, `phase: pre_curve_flat | post_curve | type_damage_bonus`, all `effect_active: "blood_pact"`).
- Display-only capability: `phantomize.effects[2]:334` (`tags: ["phase_through"]`).
- Display-only CC: `summonHydra.effects[0]:667` (`tags: ["detects_hidden"]`).
- Compound `not`: `antimagic.effects[0]:121` (`magicDamageTaken: 0.80`, `post_cap_multiplicative_layer`, `not → damage_type: divine_magical`).
- `cap_override`: forward-spec (Fighter Defense Mastery raises `pdr` cap to 0.75; stat ID is the recipe ID `pdr`).
- `scalesWith: hp_missing`: forward-spec (Barbarian Berserker).
- `scalesWith: attribute`: forward-spec (Druid shapeshift damage atoms).

**Target routing: `"either"`.** Atoms authored with `target: "either"` expose per-ability `applyToSelf` / `applyToEnemy` user toggles (per `constants.js:231–234`). When both toggles are on, a single `"either"` atom routes **simultaneously** into both the self projection (summed into caster's `bonuses`) and the enemy projection (summed into target's `bonuses`) at Stages 4 and 6; the UI surfaces either or both at user discretion. When only one toggle is on, only the matching projection fires. When neither is on, the atom contributes nothing. Warlock ground case: Power of Sacrifice (`warlock.new.js:425, 429, 430` — damage + 2 attribute buffs all `target: "either"`).

### 6.2 `DAMAGE_ATOM`

```
DAMAGE_ATOM = {
  base:              number,
  scaling:           number,
  damageType:        DamageType,
  target:            EffectTarget,
  isDot?:            boolean,
  tickRate?:         number,             // seconds per tick (DoT only)
  duration?:         number,              // total DoT lifetime (seconds)
  trueDamage?:       boolean,             // bypasses DR
  weaponDamageScale?: number,             // scales against weapon damage
  percentMaxHealth?: number,              // % of (target's) max HP as damage
  lifestealRatio?:   number,              // [0, 1] — see § 16.2 engine rule (derived heal from damage dealt)
  targetMaxHpRatio?: number,              // [0, 1] — see § 16.4 engine rule (derived heal from target max HP)
  scalesWith?:       ScalesWith,
  count?:            number,              // number of hits this atom produces per cast (missiles, chains)
  desc?:             string,
  condition?:        Condition,
  tags?:             string[],            // ATOM_TAGS
  maxStacks?:        number,              // XOR with resource
  resource?:         ResourceId,          // XOR with maxStacks
  source, atomId,                          // engine-populated
}
```

Validator rule codes: `D.required` (base/scaling/damageType/target) / `D.damageType` / `D.target` / `D.count` / `D.lifestealRatio` / `D.targetMaxHpRatio`.

Warlock ground cases:
- Direct: `bolt_of_darkness.damage[0]:467` (`base: 20, scaling: 1.0, dark_magical, enemy`).
- True damage: `shadow_touch.damage[0]:84` (`trueDamage: true`).
- DoT: `life_drain.damage[0]:582` (`isDot: true, tickRate: 1`, `evil_magical`, `lifestealRatio: 1.0`).
- percentMaxHealth (self): `blood_pact.damage[1]:310` (`percentMaxHealth: 0.01`, Abyssal Flame self-damage).
- Conditional weapon_type + `targetMaxHpRatio`: `exploitation_strike.damage[0]:377` (`condition: all(effect_active + weapon_type: unarmed)`, `targetMaxHpRatio: 0.10` — engine derives a 10%-of-enemy-max-HP heal per hit).
- `count ≥ 2` (forward-spec — Ranger multi-shot).
- `scalesWith: attribute` (forward-spec — Druid shapeshift).

### 6.3 `HEAL_ATOM`

```
HEAL_ATOM = {
  baseHeal:         number,
  scaling:          number,
  healType:         "physical" | "magical",
  target:           EffectTarget,
  isHot?:           boolean,
  tickRate?:        number,
  duration?:        number,
  percentMaxHealth?: number,              // % of heal target's max HP (single-context — see § 16.3)
  desc?:            string,
  condition?:       Condition,
  source, atomId,                          // engine-populated (atomId = "<abilityId>:heal:0" — singular)
}
```

Warlock ground cases: `shadow_touch.heal:87` (`baseHeal: 2, scaling: 0`, flat 2 per melee hit), `torture_mastery.heal:146` (`baseHeal: 2, scaling: 0.15`, per curse tick). Both `healType: "magical"`, `target: "self"`.

`percentMaxHealth` semantic: single-context — `% × heal target's max HP`. For heals that scale from a damage target's max HP per hit, see `targetMaxHpRatio` on DAMAGE_ATOM (§16.4) — Exploitation Strike's authoring lives there, not here.

HoT is forward-spec: Druid Nature's Touch (`isHot: true, tickRate: 1, duration: 12`).

### 6.4 `SHIELD_ATOM`

```
SHIELD_ATOM = {
  base:          number,
  scaling:       number,
  damageFilter?: "physical" | "magical" | null,   // null absorbs all
  target:        EffectTarget,
  duration?:     number,
  condition?:    Condition,
  source, atomId,                           // engine-populated (atomId = "<abilityId>:shield:0")
}
```

Warlock ground case: `eldritch_shield.shield:618` (`base: 25, scaling: 0, damageFilter: "magical", target: "self", duration: 15`).

### 6.5 `GRANT_ATOM` / `REMOVE_ATOM`

```
GRANT_ATOM = {
  type:       "ability" | "weapon" | "armor",
  abilityId?: string,                    // when type = "ability"
  weaponType?: string,                    // when type = "weapon"
  armorType?: string,                     // when type = "armor"
  condition?: Condition,                  // WHEN the grant applies
  costSource?: "granted" | "granter",     // default "granted"; ability grants only
  source, atomId,                         // engine-populated (atomId = "<abilityId>:grants:<index>")
}

REMOVE_ATOM = {
  type:        "ability" | "weapon" | "armor",
  abilityType?: AbilityType,              // when type = "ability"
  armorType?: string,
  tags?:      string[],                   // filter by target ability's ability-level tags (free-form)
  condition?: Condition,                  // WHEN the removal applies
  source, atomId,                         // engine-populated (atomId = "<abilityId>:removes:<index>")
}
```

Warlock ground cases:
- `demon_armor.grants[0]:58` — `{ type: "armor", armorType: "plate" }` (unconditional).
- `blood_pact.grants[0–2]:279–287` — three ability grants with conditions (first gates on `effect_active + weapon_type: unarmed`; others gate on `effect_active`).

Forward-spec:
- Druid Orb of Nature with `costSource: "granter"`.
- Fighter Slayer: `removes: [{ type: "armor", armorType: "plate" }]`.
- Druid Shapeshift Mastery: `removes: [{ type: "ability", abilityType: "spell", tags: ["spirit"] }]`.

### 6.6 `AFTER_EFFECT`

```
AFTER_EFFECT = {
  duration:  { base: number, type: "buff" | "debuff" | "other" } | number,
  effects:   STAT_EFFECT_ATOM[],
  desc?:     string,
}
```

Engine semantics: see § 14. The validator currently permits `duration` as either a numeric or a `{ base, type }` object; authors should prefer the object form for consistency with ability-level `duration`.

Warlock ground case: `eldritch_shield.afterEffect:619–634` — 2 atoms (`darkDamageBonus: 0.30` typed-damage; `spellCastingSpeed: 0.50`), both currently gated on `effect_active: "eldritch_shield"`. Phase 4 re-authors these to the LOCK 5 engine flow (remove `effect_active` gate; rely on `viewingAfterEffect` toggle instead).

Forward-spec: Adrenaline Rush (`class-shape-examples.js:444`) uses `afterEffect` with `not → effect_active` cancellation — the canonical multi-atom penalty-phase pattern.

---

## 7. Per-phase contract table (all 9 `EFFECT_PHASES`)

Every `STAT_EFFECT_ATOM.phase` names the pipeline bucket the atom contributes into. The table below specifies (a) operation, (b) value semantic, (c) pipeline order, (d) an example. **Additive within a phase. Multiplicative across phases when the math calls for multiplication** — e.g., the spell damage formula multiplies `(1 + MPB × Scaling + TypeBonus)` where MPB and TypeBonus are each within-phase additive sums. See `docs/damage_formulas.md:130–143` for the verified additive-stacking rule.

| Order | Phase | Operation | Value semantic | Example |
|---|---|---|---|---|
| 1 | `pre_curve_flat` | Additive flat | Added to the input of the attribute → derived-stat curve (before curve evaluation) | Blood Pact's `armorRating: +50` at pre_curve_flat (`warlock.new.js:292`). |
| 2 | `attribute_multiplier` | Multiplicative on attribute | `attribute_final = attribute × (1 + sum(values at this phase))` | Malice's `wil: 0.15` (`warlock.new.js:72`). Curse of Weakness's `allAttributes: -0.25`. |
| 3 | `post_curve` | Additive post-curve | Added to the curve output; flat or percent per stat's `unit` | Demon Armor's `spellCastingSpeed: -0.10`; Dark Offering's `physicalDamageBonus: 0.05 × stacks`. |
| 4 | `post_curve_multiplicative` | Multiplicative on post-curve value | `value_final = value × (1 + sum(values at this phase))` | Forward-spec (no Warlock consumer). |
| 5 | `multiplicative_layer` | Generic multiplicative scalar | `value_final *= (1 + value)` per atom | Forward-spec (no Warlock consumer). |
| 6 | `post_cap_multiplicative_layer` | Multiplicative after DR cap | Applied to effective damage taken, AFTER cap clamping | Antimagic's `magicDamageTaken: 0.80` — worked example below. |
| 7 | `type_damage_bonus` | Typed-damage-bonus accumulator | Routes into `perTypeBonuses[implied damage type]`; damage projections at Stage 6 apply matching typed bonus additively with MPB × Scaling | Dark Enhancement's `darkDamageBonus: 0.20`. |
| 8 | `healing_modifier` | Healing multiplier accumulator | Feeds `calcHealing`'s `healingMod` term (see `docs/healing_verification.md:8–17`) | Vampirism's `healingMod: 0.20`; Immortal Lament's `healingMod: 1.00` proc (`warlock.new.js:175`). |
| 9 | `cap_override` | Override a recipe's cap | `atom.stat ∈ RECIPE_IDS`. `ctx.capOverrides[stat] = value`. Applied by `recipes.runRecipe`. | Fighter Defense Mastery: `{ stat: "pdr", phase: "cap_override", value: 0.75 }`. |

**Antimagic worked example** (the canonical `post_cap_multiplicative_layer` case):

Per `docs/damage_formulas.md:180–188`:
```
Effective_magic_damage_taken = (1 - min(MDR, MDR_cap)) × (1 - 0.20)
```
At Stage 4, Antimagic's atom routes into `postCapMultiplicativeLayers` with `{ stat: "magicDamageTaken", multiplier: 0.80, condition: not(damage_type: divine_magical) }`. At Stage 6, the damage projection re-evaluates the condition per outgoing damage type; if true, the post-MDR damage is multiplied by 0.80. The stat screen's MDR value is unchanged (Antimagic does not feed `bonuses.magicalDamageReductionBonus`); the effect applies only inside the damage-projection formula.

**Convention-13 tag-scoped duration modifiers.** Certain `post_curve` stats (`curseDurationBonus`, `shoutDurationBonus`, `burnDurationAdd`, `drunkDurationBonus`, `spellCostBonus`, ...) are tag-scoped: they carry `direction: "caster" | "receiver"` and `tag: <string>` metadata in `STAT_META` and modify the **ability-level displayed** `duration` / `cooldown` / `cost` when the consuming ability's free-form `tags[]` or `duration.tags[]` intersects. See `vocabulary.md §10` + `src/data/stat-meta.js` Convention 13 for the full rule. Engine consumption is display-only (ability-level display projections per §6 opening) — no Stage-4 aggregation special-case.

---

## 8. Availability resolver (Stage 0)

`availableAbilityIds = selectedAbilityIds + grants[] − removes[]`, filtered by each ability's ability-level `condition`.

Algorithm:

1. Start with the union of `ctx.selectedPerks`, `ctx.selectedSkills`, `ctx.selectedSpells` → **selected set**.
2. Partition into `activeAbilityIds` (those whose activation marks persistent state: passive, or `cast_buff`/`toggle` in `activeBuffs`) and cast-selected (in selected set but not contributing state — activation `cast`).
3. For each ability in `activeAbilityIds`, walk `grants[]`; for each grant whose `condition` evaluates true in `ctx`, add its `abilityId` (when `type === "ability"`) to the selected set.
4. For each ability in `activeAbilityIds`, walk `removes[]`; for each remove whose `condition` evaluates true, subtract matching abilities (by `abilityType` + `tags[]` filter) from the set.
5. Filter remaining set by each candidate ability's ability-level `condition` (gates the whole ability; e.g., "requires axe equipped").
6. Result: `availableAbilityIds`.

Grants can chain (a granted ability can itself grant more) — resolve iteratively until fixpoint, capped at depth 3 (grants that cycle indicate an authoring error).

---

## 9. Memory-budget validator (Stage 0)

Per-`abilityType` memory pool. Each ability with `type ∈ { "spell", "transformation", "music" }` consumes its `memoryCost` slots from the corresponding pool.

Pool capacities come from `derivedStats.memoryCapacity` at Stage 5 — but Stage 0 runs first. Two-pass resolution:

1. Stage 0 computes `memoryBudget` with a **preliminary** capacity derived from base attributes alone (ignoring gear bonuses and `+memorySlots` atoms). This establishes an initial activeAbilityIds set.
2. Stage 5 computes the final `memoryCapacity` (incl. gear + `memorySlots` atoms).
3. Stage 6 receives the final capacity; if different, re-runs the memory-budget check and updates `lockedOut[]`.

Consumption order: selected abilities are consumed in the order they appear in the build's selected arrays. Abilities past the capacity cap go to `lockedOut[]` and are excluded from `activeAbilityIds`.

Warlock ground case: Spell Memory I / II add `+5` spell-slot memory each (`{ stat: "memorySlots", value: 5, phase: "post_curve", abilityType: "spell" }`, `warlock.new.js:234/245`).

---

## 10. Mutual exclusion (forward-spec — Druid forms)

Druid forms (bear, panther, chicken, etc.) are all `type: "transformation"` and `activation: "toggle"`. In-game, only one form is active at a time. The engine enforces this via:

- `ctx.activeForm`: a singleton field (at most one form ability id).
- UI enforcement: toggling form B while form A is active atomically replaces `activeForm` and removes `A` from `activeBuffs`.
- Condition dispatch: `effect_active` conditions continue to work (one form is "in activeBuffs" at a time).

Warlock does not exercise this pattern; first anticipated consumer is Druid in Phase 10.

---

## 11. Condition dispatcher

Stage 2 (`filterByConditions`) runs a dispatch table keyed on `condition.type`. Per-variant evaluators:

| Variant | Evaluator |
|---|---|
| `hp_below` | `ctx.hpFraction < cond.threshold` (see § 19) |
| `ability_selected` | `cond.abilityId ∈ (ctx.selectedPerks ∪ ctx.selectedSkills ∪ ctx.selectedSpells)` |
| `effect_active` | `cond.effectId ∈ ctx.activeAbilityIds`. The `activeAbilityIds` set is composed in Stage 0 (§ 5) as: passive abilities that are selected, plus `cast_buff` / `toggle` abilities that are available (selected OR granted) AND in `activeBuffs`. Cast abilities are never in `activeAbilityIds` (no persistent state). This handles **granted abilities** correctly — e.g., Warlock Exploitation Strike is granted by Blood Pact (not directly in selected sets) but enters `activeAbilityIds` when in `activeBuffs`. |
| `environment` | `ctx.environment === cond.env` |
| `weapon_type` | `ctx.weaponType === cond.weaponType` OR virtual-category resolution (`ranged` via `WEAPON_TYPE_CATEGORIES.ranged`; `two_handed` / `unarmed` / `instrument` / `dual_wield` via gear properties) |
| `player_state` | `cond.state ∈ ctx.playerStates` |
| `equipment` | `ctx.equipment[cond.slot] === cond.equipped` |
| `creature_type` | `ctx.target.creatureType === cond.creatureType` (damage-projection context) |
| `damage_type` | Evaluated per-damage-projection at Stage 6; accepts `damageType: string | string[]` and optional `exclude: string[]` |
| `tier` | `ctx.selectedTiers[currentAbilityId] === cond.tier` — requires ability-scope context (see note below) |
| `all` | Every member of `cond.conditions` evaluates true |
| `any` | At least one member evaluates true |
| `not` | No member evaluates true (equivalent to `!any`) |

**`tier` ability-scope context.** The `tier` evaluator needs to know which ability the atom belongs to — the ability-id comes from `atom.source.abilityId`. Stage 2 passes it through per-atom evaluation.

**`damage_type` deferred evaluation.** Conditions of type `damage_type` gate an atom against the **outgoing damage type of a particular projection**, not against a ctx field. Stage 2 passes these through as-is (atom stays in the filtered list); Stage 6 re-evaluates per damage projection and drops the atom's contribution if the condition is false.

---

## 12. `scalesWith` polymorphism

`SCALES_WITH_TYPES = { "hp_missing", "attribute" }` (no lifesteal variant — lifesteal uses a flat `lifestealRatio` field on DAMAGE_ATOM per LOCK 3; see § 16).

| `scalesWith.type` | Required fields | Atom value derivation |
|---|---|---|
| `hp_missing` | `per`, `valuePerStep`, `maxValue` | `min(floor((1 - ctx.hpFraction) × 100 / per) × valuePerStep, maxValue)`. Per Barbarian Berserker: `{ per: 10, valuePerStep: 0.02, maxValue: 0.20 }` = 2% physical damage per 10% HP missing, capped at 20%. |
| `attribute` | `curve` (∈ `STAT_CURVES` keys), `attribute` (∈ `CORE_ATTRS`) | `evaluateCurve(STAT_CURVES[sw.curve], ctx.attributes[sw.attribute])`. Per Druid shapeshift: `{ curve: "shapeshiftPrimitive", attribute: "str" }`. |

Stage 3 (`materializeStacking`) evaluates `scalesWith` and sets the atom's effective value before Stage 4 buckets into `bonuses`.

---

## 13. Stacking — `maxStacks` XOR `resource`

Contribution = `atom.value × currentStackCount`. XOR invariant: authoring both `maxStacks` and `resource` is a validator error (`C.stacking`).

- `maxStacks` — single-atom local stacking. Count lives in `ctx.stackCounts[atom.source.abilityId]`. Per Dark Offering (`warlock.new.js:351/353`): per-stack contributions, up to 10 stacks.
- `resource` — shared/grouped stacking via a `classResources` entry. Count lives in `ctx.classResourceCounters[resourceId]`. Per Soul Collector (`warlock.new.js:217`): `resource: "darkness_shards"`, 3-stack cap.

Resource entries are class-root declarations. Each entry has `maxStacks`, `desc`, and an optional `condition` (absent = persistent visibility; present = UI shows the counter only when the condition is true). Warlock's two resources:

- `darkness_shards` (`warlock.new.js:25`): `condition: any(ability_selected: soul_collector, ability_selected: spell_predation)`.
- `blood_pact_locked_shards` (`warlock.new.js:33`): `condition: all(effect_active: blood_pact, any(...))`.

---

## 14. `afterEffect` engine semantics (LOCK 5)

`afterEffect` holds the trailing post-main-effect phase for an ability. The engine treats afterEffect atoms two ways:

1. **Always-display informational metadata.** When the parent ability is selected, afterEffect atoms are surfaced in tooltips and panels for discovery — but are NOT summed into snapshot stats.
2. **Conditionally applied via `ctx.viewingAfterEffect` toggle.** The snapshot ctx carries `viewingAfterEffect: Set<string>` (ability ids in "view post-effect state" mode). When `abilityId ∈ ctx.viewingAfterEffect`:
   - The parent ability's main-state atoms (`effects[]`, `damage[]`, `heal`, `shield`) are **dropped** from Stage 1's collection.
   - The parent ability's `afterEffect.effects[]` atoms are **included** in Stage 1's `effects` collection in place of the main-state atoms.
   - Subsequent stages proceed normally.

Exclusivity: `viewingAfterEffect[abilityId]` and `activeBuffs ∋ abilityId` are independent; a user can be in "viewing after state" regardless of whether the buff would be active. The toggle's effect is purely a stat-sheet projection — see the snapshot-model no-causation principle.

UI surface: each ability with a non-trivial `afterEffect` surfaces a "view post-effect state" checkbox. Toggling it modifies `ctx.viewingAfterEffect`; the snapshot recomputes.

Cancellation inside the afterEffect is expressed via `not` compound conditions on individual afterEffect atoms — per Adrenaline Rush (`class-shape-examples.js:458–468`), the penalty atoms' `condition: not(effect_active: adrenaline_spike, effect_active: second_wind)` drops the penalty when either canceler is in `activeBuffs`.

Phase 4 follow-up: re-author Warlock Eldritch Shield's afterEffect atoms to drop the redundant `effect_active: "eldritch_shield"` gate inside `effects` (since LOCK 5's `viewingAfterEffect` flow replaces that gating).

---

## 15. Damage projection math (Stage 6)

Per-atom projection. Physical and magical dispatch per `atom.damageType`.

### 15.1 Physical

Per `docs/damage_formulas.md:7–61`:

```
Physical Damage = floor(
  ((((Base Weapon Damage + Buff Weapon Damage) × Combo Multiplier × Impact Zone)
    + Gear Weapon Damage) × (1 + Physical Power Bonus))
    + Additional Physical Damage)
  × Hit Location Multiplier
  × DR Multiplier
  × (1 - Projectile Reduction))
  + True Physical Damage
)
```

Implemented by `src/engine/damage.js::calcPhysicalMeleeDamage`.

**Gear on-hit riders (Phase 6.5c.2 / OQ-D6).** `ctx.gear.onHitEffects[]` entries whose `damageType === "physical"`, `trueDamage === true`, and `separateInstance === false` contribute into the `True Physical Damage` term above — summed as `sum(rider.damage × (rider.scaling ?? 1))`. The rider is gated on `atom.isWeaponPrimary === true` (so skills / AoEs / DoTs do not pick it up). Spiked Gauntlet +1 is the anchor case (`docs/damage_formulas.md:235-240`). Addition lands inside `Math.floor()` as the final term — for integer riders the end-state is identical to `floor(X)+1`.

DR formula (per `docs/damage_formulas.md:47–55`):

```
DR_Multiplier = max(1 - Target_DR × (1 - Attacker_Pen), 1 - Target_DR)
```

The `max()` prevents pen from reducing amplification on negative-DR targets.

### 15.2 Magical

Per `docs/damage_formulas.md:63–82`:

```
Spell Damage = floor(
  (Base Damage + Weapon Magical Damage)
  × (1 + MPB × Scaling + Type Bonuses)
  × Hit Location Multiplier
  × MDR Multiplier
)
```

Implemented by `src/engine/damage.js::calcSpellDamage`.

**Universal vs typed bonuses** (`docs/damage_formulas.md:122`): `magicalDamageBonus` (universal) is additive into MPB. `magicalDamageBonus` applies to all magical subtypes (including `dark_magical`, `fire_magical`, etc.). Typed bonuses (`darkDamageBonus`, `fireDamageBonus`, ...) apply only to matching damage subtype.

**Typed-bonus dispatch at Stage 6.** For a damage atom with `damageType: T`:
- `typeBonuses = perTypeBonuses[T] ?? 0` — sum of all stage-4-accumulated typed-damage-bonus contributions whose stat matches `T`.
- Stat-to-type mapping is authored as the stat identity: `darkDamageBonus` → `dark_magical`, `fireDamageBonus` → `fire_magical`, etc. A simple lookup table in Stage 4 converts typed-stat contributions into `perTypeBonuses[T]` entries.
- Worked example (per `docs/damage_formulas.md:138–143`): BoD with MPB 23% + Dark Enhancement +20% (dark): `damage = 20 × (1 + 0.23 × 1.0 + 0.20) = 28.6 → floor 28` (bare hands).

**Antimagic / post-cap multiplicative layers.** After the MDR cap clamps (at `min(MDR, MDR_cap)`), apply each entry in `postCapMultiplicativeLayers` whose condition evaluates true for the current projection. Per `docs/damage_formulas.md:185`: `effective_taken = (1 - min(MDR, MDR_cap)) × (1 - 0.20)` for Antimagic.

### 15.3 Separate damage instances

Per `docs/damage_formulas.md:100–113`: multiple damage sources on a single hit are calculated separately. Shadow Touch's 2 dark magic is a separate floater; BoC's magic damage is a separate floater; Spiked Gauntlet's true physical is rolled into main physical. The engine produces one `DamageProjection` per damage atom; the UI composes the display.

### 15.4 Hit location

Body: 1.0. Head: `1.0 + 0.5 + headshotBonus - targetHeadshotDR`. Limb: 0.5. Per `docs/season8_constants.md:22–23` (verified constants) and `docs/damage_formulas.md:37–43`.

AoE and DoT are NOT affected by hit location — the projection emits only `hit.body`.

### 15.5 Global caps referenced

Per `docs/season8_constants.md:7–14`: PDR cap 65% (75% with Defense Mastery); MDR cap 65% (75% with Iron Will); Move Speed cap 330; CDR cap 65%.

---

## 16. Heal projection math (Stage 6)

### 16.1 Direct heals

Per `docs/healing_verification.md:8–17`:

**Instant:**
```
Total Healing = (BaseHeal + HealingAdd × Scaling) × (1 + MPB × Scaling) × (1 + HealingMod)
```

**HoT:**
```
Total Healing = (above) × (floor(BaseDuration × (1 + BuffDuration)) / BaseDuration)
```

Implemented by `src/engine/damage.js::calcHealing`.

`MPB` — applied only to `healType: "magical"` heals. `HealingMod` — applied to all heal types; accumulates via `healing_modifier` phase atoms (Vampirism `+0.20`, Immortal Lament `+1.00` under hp_below proc).

### 16.2 Lifesteal engine rule (LOCK 3)

For every DAMAGE_ATOM with a present `lifestealRatio ∈ [0, 1]`, the engine derives a HEAL projection:

```
heal_amount = lifestealRatio × damage_atom_projection
target      = "self"
healType    = damageTypeToHealType(damage_atom.damageType)
atomId      = damage_atom's atomId   // Reuse the source atom's id; provenance in derivedFrom.
derivedFrom = { kind: "lifesteal", damageAtomId: damage_atom.atomId }
```

The derived HEAL is appended to `healProjections[]`. The `DamageProjection` for the source atom carries `derivedHeal` as a back-reference so UI can co-locate damage and lifesteal in a single visual row.

**Damage-type → heal-type family collapse** (`damageTypeToHealType`):

| DAMAGE_ATOM.damageType | Derived HEAL_ATOM.healType |
|---|---|
| `physical` | `physical` |
| Any magical subtype (`magical`, `dark_magical`, `fire_magical`, `evil_magical`, ...) | `magical` |

The collapse is a small utility shipped with the engine. Lifesteal routes through `calcHealing` with `baseHeal = heal_amount`, `scaling = 0` (since the amount is already derived), `healingMod = bonuses.healingMod` (Vampirism still applies; per `docs/healing_verification.md:18–21`, Life Drain has "Only HealingMod applies").

First anticipated consumer (Phase 4): Warlock Life Drain's damage atom, re-authored with `lifestealRatio: 1.0`. Verified test point: `docs/unresolved_questions.md:270–278` — Life Drain heals 100% of pre-MDR damage dealt.

### 16.3 `percentMaxHealth` on HEAL_ATOM

Single-context semantic: `heal_amount = atom.percentMaxHealth × heal_target's max HP`. The percentage is always taken from the heal atom's own `target`'s max HP — `derivedStats.health.value` when `target === "self"`, `ctx.target.maxHealth` when `target === "enemy"`, etc.

```
heal_amount = atom.percentMaxHealth × resolveTargetMaxHealth(atom.target);
```

Use `percentMaxHealth` for self-restoration patterns (e.g., Cleric "heal 10% of your max HP") and ally-restoration patterns. For heals that scale from the **damage target's** max HP per hit (Exploitation Strike pattern), use `targetMaxHpRatio` on the corresponding DAMAGE_ATOM (§16.4) — that field is causally tight (heal lives on the atom that produces the hit) and avoids the inference complexity of cross-context resolution.

### 16.4 `targetMaxHpRatio` engine rule

For every DAMAGE_ATOM with a present `targetMaxHpRatio ∈ [0, 1]`, the engine derives a HEAL projection symmetric with the lifesteal rule (§16.2):

```
heal_amount = targetMaxHpRatio × damage_atom_target's max HP
target      = "self"
healType    = damageTypeToHealType(damage_atom.damageType)
atomId      = damage_atom's atomId
derivedFrom = { kind: "targetMaxHp", damageAtomId: damage_atom.atomId }
```

Same family-collapse `damageTypeToHealType` as §16.2. Same routing through `calcHealing` with `baseHeal = heal_amount`, `scaling = 0`. The derived HEAL is appended to `healProjections[]`; the source `DamageProjection` carries `derivedHeal` as a back-reference.

**Worked example — Exploitation Strike.** Damage atom: `{ base: 20, scaling: 1.0, damageType: "evil_magical", target: "enemy", targetMaxHpRatio: 0.10, condition: all(effect_active: exploitation_strike + weapon_type: unarmed) }`. On hitting a 100-HP enemy, the engine emits two projections from this single atom:
- Damage projection: 20 (+ MPB scaling) evil-magical to the enemy.
- Derived heal: `0.10 × 100 = 10` HP to the caster, healType `magical` (family-collapse from `evil_magical`).

Consumer: Warlock Exploitation Strike's damage atom — `targetMaxHpRatio: 0.10`.

---

## 17. Shield projection math (Stage 6)

```
Shield absorb amount = base + (scaling × MPB)
```

`damageFilter` determines which damage types the shield absorbs:
- `"physical"` — only physical damage routes through.
- `"magical"` — only magical (any subtype) routes through.
- `null` (or absent) — all damage routes through.

The projection produces a `ShieldProjection` per SHIELD_ATOM. The engine does not model shield-vs-damage ordering in Phase 3/6; UI shows shield amount alongside expected damage for user inference.

Warlock ground case: `eldritch_shield.shield:618` — `base: 25, scaling: 0, damageFilter: "magical", target: "self"` → absorbs 25 magical damage.

---

## 18. Class-resource mechanics

`classResources` is a class-root declaration of per-class stack pools. Live counts live in `ctx.classResourceCounters[resourceId]`.

Shape:

```
classResources: {
  [resourceId]: {
    maxStacks:  number,
    desc:       string,
    condition?: Condition,      // absent = persistent; present = counter UI hidden when false
  }
}
```

Contribution rule (when an atom carries `resource: resourceId`): `atom.value × ctx.classResourceCounters[resourceId]`.

UI consumption:
- If a resource entry has a `condition` and it evaluates false → no counter shown.
- If any selected ability has an atom with `resource: R` → R's counter is surfaced.

Warlock patterns:
- `darkness_shards` (shared pool; cross-ability accumulated by Soul Collector + Spell Predation).
- `blood_pact_locked_shards` (user-set counter; snapshot-model scoped to Blood Pact activation).

Forward-spec (Phase 10): Cleric's holy power, Druid's shapeshift charges, Sorcerer's mana, Bard's performance state. All follow the same shape.

---

## 19. HP-fraction handling (resolves engine open Q1)

`hp_below` reads `ctx.hpFraction` — a user-settable fraction in [0, 1]. Default 1.0.

**Rationale.** The alternative (compute HP-before-conditions at Stage 0) creates a Stage 2 ↔ Stage 5 cycle: Stage 2 needs HP, Stage 5 produces HP, Stage 2 runs first. The user-set approach aligns with the snapshot-no-causation principle (`docs/perspective.md § 2`): just as the user toggles `drunk` rather than drinking ale, the user sets HP% rather than taking damage.

UI consequence: when any selected ability has an atom with an `hp_below` condition (in any nesting depth), the UI surfaces an "HP fraction" slider. If no atom references `hp_below`, no slider renders.

Warlock ground case: Immortal Lament (`warlock.new.js:176`) — `{ type: "hp_below", threshold: 0.05 }` gates the `healingMod: 1.00` proc.

Closes engine open question 1 from `docs/class-shape-progress.md § Engine architecture open questions`.

---

## 20. Engine query API for Phase 11 UI

The engine exposes a small set of queries over the `Snapshot` and the source atoms (post-Stage-2). These support the Phase 11 UI without exposing internal pipeline state.

Minimum API surface (Phase 3 commits the signatures; Phase 6 implements):

```
atomsByTarget(target: EffectTarget): Atom[]
  // Returns every filtered atom whose `target` matches or contains `target`.
  // Semantics: `self_or_ally` matches both `"self"` and `"ally"` queries.
  // Used by Phase 11's ally-buff panel (query target: "ally").

atomsBySourceAbility(abilityId: string): {
  effects: StatEffectAtom[],
  damage:  DamageAtom[],
  heal:    HealAtom | null,
  shield:  ShieldAtom | null,
  grants:  GrantAtom[],
  removes: RemoveAtom[],
  afterEffect: AfterEffect | null,
}
  // Returns every atom the named ability contributed, post-filter. For
  // ability-detail tooltips.

activeConditions(): Array<{ atom, condition, evaluation }>
  // Returns every atom that was DROPPED at Stage 2 and the condition that
  // dropped it. For UI debug ("why isn't my perk firing?").

atomsByStat(statId: StatId): StatEffectAtom[]
  // Returns every effect atom contributing to `statId`, post-filter. For
  // breakdown tooltips ("where does my +30% dark damage come from?").
```

Reserved for Phase 11 implementation (not yet promised in API signatures): `typedBonusBreakdown`, `postCapLayerBreakdown`, `afterEffectPreview`.

---

## 21. Performance checkpoints

Per `docs/performance-budget.md § 6`, stage-boundary checkpoints are forward-declared for memoization. Phase 3 does not implement memoization (Phase 6 does, driven by measurement). The dependency-set declarations from § 3 are the load-bearing claim.

Budget: snapshot recompute < 50 ms for the largest realistic build (anchor: `bench/fixtures/max-loadout.fixture.js`). See `docs/performance-budget.md § 4` for the rationale.

Phase 6 will add memoization at stages where measurement shows a hotspot. Phase 5 commits the cache-key layout (fine-grained dependency-declared vs coarse whole-ctx) based on measurement.

---

## 22. Forward-spec patterns

Patterns Warlock does not exercise but the engine must support. Each is specified above in its home section; this index lists them explicitly so Phase 4 verification can confirm coverage, and Phase 10 class migration knows which class first exercises each.

| Pattern | Section | First anticipated consumer |
|---|---|---|
| Druid form mutual exclusion (singleton `ctx.activeForm`) | § 10 | Druid |
| Bard music memory pool (`abilityType: "music"` discriminator) | § 9 | Bard |
| Sorcerer `mergedSpells` (auto-derived spells, `condition: ability_selected` prerequisites) | (class-shape-progress.md) | Sorcerer |
| `transformation` ability type + its memory-pool discriminator | § 9 | Druid |
| `tier` condition variant | § 11 | Bard |
| `equipment` condition variant | § 11 | Ranger / Rogue |
| `environment` condition variant | § 11 | Warlock (none exercised) — anticipated Druid / Ranger environmental bonuses |
| Player states Warlock doesn't reference (`hiding`, `crouching`, `bow_drawn`, `playing_music`, `drunk`, ...) | § 11 (dispatcher) + vocabulary.md § 8 | Rogue (`hiding`), Ranger (`bow_drawn`), Bard (`playing_music`), Fighter (`defensive_stance`) |
| Weapon types Warlock doesn't reference (bow, spear, spellbook, shield, dual_wield, ...) | vocabulary.md § 7.2 | Ranger (bow), Cleric (blunt), Fighter (shield / one_handed / two_handed), Rogue (rapier / dual_wield) |
| REMOVE_ATOM with `tags[]` filter | § 6.5 | Druid Shapeshift Mastery |
| REMOVE_ATOM with armor type | § 6.5 | Fighter Slayer |
| GRANT_ATOM with `costSource: "granter"` | § 6.5 | Druid Orb of Nature |
| `scalesWith: hp_missing` | § 12 | Barbarian Berserker |
| `scalesWith: attribute` | § 12 | Druid shapeshift |
| `count ≥ 2` on DAMAGE_ATOM | § 6.2 | Ranger multi-shot |
| `cap_override` phase | § 7 | Fighter Defense Mastery (PDR), Barbarian Iron Will (MDR) |
| `afterEffect` with LOCK 5 `viewingAfterEffect` flow (additional consumers) | § 14 | Barbarian Adrenaline Rush pattern (Warlock Eldritch Shield is the anchor) |

---

## Appendix A — Glossary

- **Atom** — a self-contained fragment of ability contribution (STAT_EFFECT_ATOM, DAMAGE_ATOM, HEAL_ATOM, SHIELD_ATOM, GRANT_ATOM, REMOVE_ATOM, or the STAT_EFFECT_ATOMs inside AFTER_EFFECT.effects).
- **Ability** — `perks[] | skills[] | spells[] | mergedSpells[]` entry with `id`, `name`, `type`, `desc`, `activation`, atom containers, cost.
- **Bonuses** — the Stage 4 output object: `Record<StatId, Record<Phase, number>>`. Feeds Stage 5's recipes and Stage 6's projections.
- **Ctx** — the Stage 0 output: read-only engine state for Stages 1–6.
- **Snapshot** — the engine's public return value (§ 4).
- **Recipe** — an entry in `DERIVED_STAT_RECIPES` (`src/engine/recipes.js`) that turns `(attrs, bonuses, capOverrides)` into a derived stat value (hp, pdr, mpb, moveSpeed, ...).
- **Stage** — one of the 6 phases (0–6) in the recompute pipeline.
- **Phase** — one of the 9 `EFFECT_PHASES` values. The bucket a `STAT_EFFECT_ATOM` routes into at Stage 4.
- **Two-namespace discipline** — `STAT_META` keys are gear/perk additive contributions; `RECIPE_IDS` are recipe output identifiers. `stat: <RECIPE_ID>` is valid only under `phase: "cap_override"`.
