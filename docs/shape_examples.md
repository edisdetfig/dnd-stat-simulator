# v3 Ability Shape — Authoring Examples

> **Purpose.** Class-agnostic worked examples for every major v3 ability-shape pattern. Each example is self-contained: a complete ability object with inline comments explaining what every field does and how the engine pipeline consumes it.
>
> **Companion docs**:
> - `docs/ability_data_map_v2.md` §3 — shape spec (field definitions, types)
> - `docs/vocabulary.md` — controlled vocabulary (enum values, conventions, tags, directions)
> - `docs/damage_formulas.md` / `docs/health_formula.md` / `docs/healing_verification.md` — verified math
>
> **Reading order**: Examples build in complexity. Pattern 1 (`example_passive_stat_perk`) comments every common field exhaustively. Later examples reference earlier ones and focus commentary on pattern-specific fields.

---

## Conventions Recap

Essential rules referenced throughout:

- **`desc` is the only human-readable display field** on any block (ability root, stacking, appliesStatus, afterEffect, triggers, summon, form, performanceTiers). No `tooltip`, `label`, or `notes`.
- **Snapshot principle.** The engine treats every ability as a toggle on/off. Temporal-metadata fields that feed math (`duration`, `cooldown`, `castTime`, `tickRate`, `cost`) stay structural. Event label strings (trigger events, stacking triggers/consumption) live in `desc` prose — not validated enums.
- **Direction semantics.** Duration-modifier stats record `direction: "caster" | "receiver"`. Caster-side applies at cast time from caster's stats; receiver-side applies at landing time from receiver's stats.
- **Class-agnostic naming.** No class names or school specificity in enum values. School/ability-specific nuance lives in `desc` or via tags + condition filters.
- **Snake_case** for all enum values and identifiers.
- **Duration is optional.** Omission signals toggle/permanent/until-event.
- **True damage is a flag**, not a damage type: `{ damageType: "physical", trueDamage: true }`.

---

## Pattern Index

1. [`example_passive_stat_perk`](#1-example_passive_stat_perk) — Flat stat bonus (pre-curve additive)
2. [`example_attribute_multiplier_perk`](#2-example_attribute_multiplier_perk) — Percent attribute scaler
3. [`example_type_damage_bonus_perk`](#3-example_type_damage_bonus_perk) — Type-specific damage bonus
4. [`example_post_cap_layer_perk`](#4-example_post_cap_layer_perk) — Multiplicative layer after capped DR
5. [`example_cap_override_perk`](#5-example_cap_override_perk) — Raises a stat cap
6. [`example_hp_below_conditional`](#6-example_hp_below_conditional) — Condition gated on HP percent
7. [`example_weapon_type_conditional`](#7-example_weapon_type_conditional) — Condition gated on weapon type
8. [`example_player_state_conditional`](#8-example_player_state_conditional) — Condition gated on player state
9. [`example_creature_type_conditional`](#9-example_creature_type_conditional) — Condition gated on enemy creature category
10. [`example_equipment_conditional`](#10-example_equipment_conditional) — Condition gated on slot equipped / dual-wield
11. [`example_on_hit_trigger`](#11-example_on_hit_trigger) — Perk with on-hit damage + self-heal trigger
12. [`example_on_kill_stack_trigger`](#12-example_on_kill_stack_trigger) — Perk that accumulates stacks on kill
13. [`example_toggle_buff_with_duration`](#13-example_toggle_buff_with_duration) — Toggle skill with typed duration + tags
14. [`example_channel_dot_spell`](#14-example_channel_dot_spell) — Channel-type DoT with tickRate
15. [`example_spell_with_status`](#15-example_spell_with_status) — Spell applying a status effect
16. [`example_stacking_ability`](#16-example_stacking_ability) — Stacking block with perStack effects
17. [`example_hp_scaling_continuous`](#17-example_hp_scaling_continuous) — Continuous scaling with missing HP
18. [`example_shield_ability`](#18-example_shield_ability) — Shield block with scaling + damage filter
19. [`example_after_effect_ability`](#19-example_after_effect_ability) — afterEffect penalty + removedBy
20. [`example_ability_modifiers_by_tag`](#20-example_ability_modifiers_by_tag) — abilityModifiers targeting tagged abilities
21. [`example_transformation_with_form`](#21-example_transformation_with_form) — Transformation with form.attacks + wildSkill
22. [`example_music_with_tiers`](#22-example_music_with_tiers) — Music with performanceTiers
23. [`example_merged_spell`](#23-example_merged_spell) — Merged spell with `requires[]` + dual-element damage
24. [`example_summon_with_caster_effects`](#24-example_summon_with_caster_effects) — Summon conferring effects on caster
25. [`example_true_damage_source`](#25-example_true_damage_source) — trueDamage flag on a damage source

---

## 1. `example_passive_stat_perk`

Flat stat bonus applied additively before curve evaluation. The simplest shape.

```js
{
  // Unique snake_case identifier, unique within the class's ability lists.
  // Referenced by selectedPerks/selectedSkills/selectedSpells in engine state,
  // and by grantsSpells, afterEffect.removedBy, abilityModifiers.target, etc.
  id: "example_passive_stat_perk",

  // Ability category. One of: perk | skill | spell | transformation | music.
  // Determines which container list on the class the ability lives in.
  // See vocabulary.md Category 1.
  type: "perk",

  // Display name shown in UI selection lists and tooltips.
  name: "Example Passive Stat Perk",

  // Only human-readable display-string field on any block (Convention 3).
  // Rendered as hover tooltip on the ability name.
  desc: "Gain 10 strength.",

  // Activation mode: passive | toggle | cast (vocabulary.md Category 2).
  // Passives are always active when the ability is selected.
  activation: "passive",

  // Targeting at the ability level: self | enemy | ally_or_self | enemy_or_self.
  // Omitted here (defaults to "self" for passives that only affect the caster).
  // See vocabulary.md Category 3.

  // Stat modifications fed into the engine pipeline.
  // Each entry is processed by runEffectPipeline in collectors/effects.
  effects: [
    {
      // Stat key — must exist in STAT_META (src/data/stat-meta.js).
      // Here "str" is a CORE_ATTRS member. See vocabulary.md Category 13.
      stat: "str",

      // Numeric value added/multiplied by the phase rule.
      value: 10,

      // Phase determines WHEN and HOW the value is applied in the stat pipeline.
      // pre_curve_flat: adds to the attribute BEFORE curve evaluation.
      // Result: +10 STR influences PPB curve input, HP curve input, etc.
      // See vocabulary.md Category 14.
      phase: "pre_curve_flat",

      // target defaults to "self" when omitted. Self here.
    },
  ],
}
```

**Pipeline**: `runEffectPipeline` partitions effects by phase. `pre_curve_flat` entries add to `finalAttrs[stat]` before derived stats (PPB, MPB, HP) evaluate their curves. The +10 STR thus boosts downstream PPB, HP, and any STR-curve-consuming derived stat.

**When to use**: Any perk/passive granting a fixed flat amount of a stat.

---

## 2. `example_attribute_multiplier_perk`

Percent-multiplier applied to a single attribute (or all attributes) after flat additions.

```js
{
  id: "example_attribute_multiplier_perk",
  type: "perk",
  name: "Example Attribute Multiplier Perk",
  desc: "Gain 15% will bonus.",
  activation: "passive",

  effects: [
    {
      // "wil" — WIL attribute. Use "all_attributes" to apply to all 7 core attrs uniformly.
      stat: "wil",

      // 0.15 = +15%. Multiplier value, not additive.
      value: 0.15,

      // attribute_multiplier: multiplies the (already-flat-added) attribute value.
      // Formula: finalAttr = (baseAttr + flatAdds) × (1 + sum(multipliers))
      // Runs AFTER pre_curve_flat, BEFORE curve evaluation.
      // See vocabulary.md Category 14.
      phase: "attribute_multiplier",
    },
  ],
}
```

**Pipeline**: `runEffectPipeline` multiplies the summed attribute value. Multiple `attribute_multiplier` entries on the same stat sum additively (so +15% + +10% = +25%, not 1.15 × 1.10). `all_attributes` fans out to each of the 7 core attrs.

**When to use**: Percent-scaling an attribute, including "+N% all attributes" via `stat: "all_attributes"`.

---

## 3. `example_type_damage_bonus_perk`

Damage bonus restricted to a specific damage type. Uses the sentinel `typeDamageBonus` stat keyed by `damageType`.

```js
{
  id: "example_type_damage_bonus_perk",
  type: "perk",
  name: "Example Type Damage Bonus Perk",
  desc: "Gain 20% fire magical damage bonus towards fire magic spells.",
  activation: "passive",

  effects: [
    {
      // Sentinel stat name — engine recognizes and routes to typeDamageBonuses[damageType].
      stat: "typeDamageBonus",

      // 0.20 = +20%. Applied multiplicatively alongside MPB in spell damage formula.
      value: 0.20,

      // type_damage_bonus phase: adds to typeDamageBonuses[damageType] bucket.
      // Formula (spell): damage = base × (1 + MPB × scaling + typeBonus)
      // Only applies when the damage source's damageType matches.
      // See vocabulary.md Category 14, damage_formulas.md line 116+.
      phase: "type_damage_bonus",

      // damageType scopes the bonus to matching damage instances.
      // Must be a member of DAMAGE_TYPES (vocabulary.md Category 16).
      damageType: "fire_magical",
    },
  ],
}
```

**Pipeline**: `runEffectPipeline` accumulates into `typeDamageBonuses[damageType]`. `damage.js` reads this bucket when evaluating a damage source; only matching types receive the bonus. MPB universally boosts ALL magic types; `typeDamageBonus` is the type-specific overlay.

**When to use**: "+N% <element> magical damage bonus" perks.

---

## 4. `example_post_cap_layer_perk`

Multiplicative damage-taken reduction that applies as a separate layer AFTER the capped DR step. Distinct from `multiplicative_layer` (which applies within the DR calculation) and from flat DR additions.

```js
{
  id: "example_post_cap_layer_perk",
  type: "perk",
  name: "Example Post-Cap Layer Perk",
  desc: "Reduce incoming magic damage by an additional 20%, applied as a separate multiplicative layer after the capped MDR.",
  activation: "passive",

  effects: [
    {
      // Damage-taken multiplier. 0.80 = ×0.80 (take 80%, i.e., -20% damage).
      stat: "magicDamageTaken",

      value: 0.80,

      // post_cap_multiplicative_layer: applied AFTER capped DR as a separate layer.
      // Formula: effectiveDamage = (1 - min(DR, cap)) × postCapMultiplier × incomingDamage
      // Stacks multiplicatively with other entries of the same phase.
      // Generic: any mechanic providing a post-cap multiplier uses this phase.
      // See vocabulary.md Category 14, damage_formulas.md line 182+.
      phase: "post_cap_multiplicative_layer",
    },
  ],
}
```

**Pipeline**: `runEffectPipeline` collects these into a separate layer that `damage.js` applies after the capped DR percentage. Multiple entries stack multiplicatively: two 0.80 multipliers → combined ×0.64.

**When to use**: Any ability that says "reduces damage by N% as a separate / additional layer" (not simple DR). The classic anchor is an antimagic-style perk, but the phase is class-agnostic.

---

## 5. `example_cap_override_perk`

Raises a stat's cap (e.g., PDR 65% → 75%). Does not itself add DR — it lifts the ceiling.

```js
{
  id: "example_cap_override_perk",
  type: "perk",
  name: "Example Cap Override Perk",
  desc: "Raise physical damage reduction cap from 65% to 75%.",
  activation: "passive",

  effects: [
    {
      // The derived stat whose cap is being overridden (not a base attribute).
      // Matches the recipe id in src/engine/recipes.js.
      stat: "pdr",

      // 0.75 = new cap value. Recipe uses max(capOverride, recipe.cap).
      value: 0.75,

      // cap_override phase: writes to capOverrides[stat] rather than to stat totals.
      // Recipe consumes this via `capOverrides[id] ?? recipe.cap`.
      // See vocabulary.md Category 14, recipes.js line 59.
      phase: "cap_override",
    },
  ],
}
```

**Pipeline**: `runEffectPipeline` routes `cap_override` into a separate `capOverrides` object. `runRecipe` picks `capOverrides[id] ?? recipe.cap` when clamping the derived value. UI surfaces the raised cap in overflow indicators.

**When to use**: Perks that explicitly raise a DR cap. Do NOT use `cap_override` to grant DR itself — that's `post_curve` or similar.

---

## 6. `example_hp_below_conditional`

Effect gated on caster's HP being below a threshold. Engine treats the condition as a toggle (user sets hpPercent in state).

```js
{
  id: "example_hp_below_conditional",
  type: "perk",
  name: "Example HP-Below Conditional",
  desc: "While below 40% HP, gain 15% physical damage reduction.",
  activation: "passive",

  effects: [
    {
      stat: "physicalDamageReductionBonus",
      value: 0.15,
      phase: "post_curve",

      // Condition gates whether the effect applies.
      // type: "hp_below" — engine checks ctx.hpPercent against threshold.
      condition: {
        type: "hp_below",
        // Threshold as a fraction (0..1), not a percent.
        // 0.40 → applies when HP% < 40%.
        // Engine: (ctx.hpPercent / 100) < 0.40.
        // See vocabulary.md Category 5.
        threshold: 0.40,
      },
    },
  ],
}
```

**Pipeline**: `runEffectPipeline` calls `evaluateCondition` before routing each effect into finalBonuses. If the condition fails, the effect is skipped for this snapshot. UI provides an HP slider that drives `ctx.hpPercent`.

**When to use**: Any "while HP below N%" conditional.

---

## 7. `example_weapon_type_conditional`

Effect gated on the currently-held weapon's type. Condition consumes the active weapon slot.

```js
{
  id: "example_weapon_type_conditional",
  type: "perk",
  name: "Example Weapon-Type Conditional",
  desc: "When using a sword-type weapon, gain 2 weapon damage.",
  activation: "passive",

  effects: [
    {
      stat: "weaponDamage",
      value: 2,
      phase: "post_curve",

      condition: {
        type: "weapon_type",
        // Must match a value in WEAPON_TYPES (vocabulary.md Category 8).
        // Engine checks ctx.weaponType against the category; multi-weapon
        // categories (e.g., "two_handed") resolve via WEAPON_TYPE_CATEGORIES.
        weaponType: "sword",
      },
    },
  ],
}
```

**Pipeline**: `evaluateCondition` looks up `ctx.weaponType` (derived from the active held weapon) and compares. UI reflects the currently-held weapon from the Weapon Held toggle.

**When to use**: Mastery-style perks gated on specific weapon categories.

---

## 8. `example_player_state_conditional`

Effect gated on a user-toggleable player state. The user declares the state in UI; engine treats it as a snapshot input.

```js
{
  id: "example_player_state_conditional",
  type: "perk",
  name: "Example Player-State Conditional",
  desc: "While hiding, gain 30% move speed bonus.",
  activation: "passive",

  effects: [
    {
      stat: "moveSpeedBonus",
      value: 0.30,
      phase: "post_curve",

      condition: {
        type: "player_state",
        // Must match a PLAYER_STATES member (vocabulary.md Category 9).
        // User toggles this state in the Live State panel.
        state: "hiding",
      },
    },
  ],
}
```

**Pipeline**: `evaluateCondition` reads `ctx.playerStates[state]`. The Live State panel exposes every PLAYER_STATES member as a toggle so authors don't need per-state UI wiring.

**When to use**: Any effect that says "while [crouching|hiding|blocking|in combat|performing|etc.]".

---

## 9. `example_creature_type_conditional`

Effect gated on the enemy target's creature category (e.g., undead, demon).

```js
{
  id: "example_creature_type_conditional",
  type: "perk",
  name: "Example Creature-Type Conditional",
  desc: "Gain 20% damage bonus against undead monsters.",
  activation: "passive",

  effects: [
    {
      // Generic damage bonus — could also be typeDamageBonus with a specific damageType.
      stat: "physicalDamageBonus",
      value: 0.20,
      phase: "post_curve",
      // Applies when damaging an enemy whose creatureType matches.
      target: "enemy",

      condition: {
        type: "creature_type",
        // Free-form creature category. Current known values: "undead", "demon".
        // See vocabulary.md Category 5 proposed addition.
        creatureType: "undead",
      },
    },
  ],
}
```

**Pipeline**: `evaluateCondition` reads `ctx.target.creatureType` (set via the Target Editor). Damage-target effects route into the target pipeline where this check gates them.

**When to use**: "+N% damage to [undead|demon|etc.]" perks.

---

## 10. `example_equipment_conditional`

Effect gated on slot equipment state (equipped/unequipped) and dual-wield. Two common variants combined for illustration.

```js
{
  id: "example_equipment_conditional",
  type: "perk",
  name: "Example Equipment Conditional",
  desc: "While not wearing chest armor AND dual-wielding, gain 5% action speed.",
  activation: "passive",

  effects: [
    {
      stat: "actionSpeed",
      value: 0.05,
      phase: "post_curve",

      // Multiple conditions combine via ability-level `conditions[]` if needed.
      // Single condition here uses `condition`. For multi-conditions use `conditions: [...]`.
      condition: {
        type: "equipment",
        // Slot matches ARMOR_SLOTS (head, chest, back, hands, legs, feet, ring1, ring2, necklace).
        slot: "chest",
        // Boolean. equipped:false → condition passes when slot is empty.
        equipped: false,
      },
    },
    // Second effect with a different condition type to illustrate dual_wield:
    {
      stat: "actionSpeed",
      value: 0.05,
      phase: "post_curve",
      // dual_wield has no sub-fields — it's a pure boolean check on ctx.isDualWield.
      condition: { type: "dual_wield" },
    },
  ],
}
```

**Pipeline**: `evaluateCondition` reads `ctx.gearEquipment[slot]` (from aggregator) and `ctx.isDualWield` (from weapon-held state with two weapons). Both are derived from the same gear state that powers stat aggregation.

**When to use**: "while no chest armor" (Barbarian Savage), "while dual-wielding" (Fighter Dual Wield), or any slot-equipped gating.

---

## 11. `example_on_hit_trigger`

Perk that fires a damage + heal pulse on each successful melee hit. Event label lives in `desc` per Convention 4; the trigger block is structural.

```js
{
  id: "example_on_hit_trigger",
  type: "perk",
  name: "Example On-Hit Trigger",
  desc: "Dealing physical damage with a melee weapon deals 2 true dark magical damage and heals you for 2 HP per hit.",
  activation: "passive",

  // Trigger blocks stay structural for damage/effect/heal definitions.
  // Event-name strings are no longer a validated enum (Convention 4).
  triggers: [
    {
      // desc on the trigger describes WHEN it fires (event label moved here).
      desc: "Fires on each successful physical melee hit against an enemy.",

      // Damage instance applied on trigger.
      // damage[] entries use DamageSource shape — see docs/ability_data_map_v2.md §3.
      damage: [
        {
          // Base flat damage. Scaling 0 means MPB does not apply.
          base: 2,
          scaling: 0,
          // Must be a DAMAGE_TYPES member (vocabulary.md Category 16).
          damageType: "dark_magical",
          // True-damage flag: bypasses target DR. Replaces the retired "true_<type>" type.
          trueDamage: true,
          // target defaults to "enemy" for trigger damage; explicit here.
          target: "enemy",
        },
      ],

      // Healing on trigger. Single heal object (not array) is acceptable for trigger blocks.
      heal: {
        // Flat heal amount.
        baseHeal: 2,
        scaling: 0,
        // healType: "physical" | "magical" — see vocabulary.md Category 17.
        healType: "magical",
        target: "self",
      },

      // Optional trigger conditions (filter when it fires).
      // E.g., require weapon_type: melee-like category.
      // Omitted here for brevity.
    },
  ],
}
```

**Pipeline**: Trigger blocks are collected by `collectors/triggers.js`. When the user toggles the ability active (or it's a passive and selected), the engine tracks the trigger's damage/heal as a conditional damage/heal source. The UI surfaces "fires on X" via the trigger's `desc`.

**When to use**: Any on-hit, on-kill, on-block, on-spell-cast, on-damage-taken, etc. pattern.

---

## 12. `example_on_kill_stack_trigger`

Perk that grants a stack on each kill, capped at a max. Stacking block is inside the ability; trigger event is in the stacking block's `desc`.

```js
{
  id: "example_on_kill_stack_trigger",
  type: "perk",
  name: "Example On-Kill Stack Trigger",
  desc: "When you deal the final blow to an enemy, collect a shard. Each shard grants +1 all attributes, up to 3 shards.",
  activation: "passive",

  // Stacking block defines the per-stack effects and the trigger/consumption semantics.
  // See vocabulary.md Category 32-33 and ability_data_map_v2.md §3.
  stacking: {
    // Integer max stack count. UI shows a stack selector 0..maxStacks.
    maxStacks: 3,

    // Array of Effect objects applied once per selected stack count.
    // Engine duplicates these entries × selectedStacks[ability.id].
    perStack: [
      {
        // "all_attributes" fans out to all 7 CORE_ATTRS under supported phases.
        stat: "all_attributes",
        value: 1,
        phase: "pre_curve_flat",
      },
    ],

    // desc describes both what the stack does and trigger/consumption semantics.
    // Per Convention 4, event labels are prose, not enum validations.
    desc: "Shards — +1 all attributes per shard. Gained on kill; retained until consumed by casting a dark magical spell or activating a shard-consuming ability.",
  },
}
```

**Pipeline**: `collectStackingEffects` enumerates abilities with stacking blocks, multiplies `perStack` × `selectedStacks[ability.id]`, and contributes those effects to the pipeline. Gating: the ability must be selected (in selectedPerks/selectedSkills/selectedSpells) for stacks to contribute — trigger/consumption is display metadata only.

**When to use**: Shard/charge/stack-accumulation perks of any class.

---

## 13. `example_toggle_buff_with_duration`

Toggle skill with a typed duration and a tag that opts into a caster-side outgoing modifier. User toggles the skill active in the Active Buffs panel.

```js
{
  id: "example_toggle_buff_with_duration",
  type: "skill",
  name: "Example Toggle Buff",
  desc: "Reduce the target's all attributes by 25% for 12 seconds.",

  // activation: "toggle" means the skill shows as a toggleable buff in Active Buffs panel.
  activation: "toggle",
  targeting: "enemy",

  // cost: structural. See vocabulary.md Category 11.
  cost: { type: "health", value: 4 },

  // Duration block — OPTIONAL. Omission means toggle/permanent/until-event.
  // When present, shape is { base, type, tags? }.
  // See vocabulary.md Categories 32 and 33.
  duration: {
    // Base duration in seconds, before any modifiers.
    base: 12,

    // DURATION_TYPES: buff | debuff | other.
    // Engine uses type to route receiver-side modifiers:
    //   debuff + enemy target → target's debuffDurationBonus applies.
    type: "debuff",

    // Tags opt into caster-side outgoing modifiers by tag.
    // "curse" tag → caster's curseDurationBonus extends this duration at cast time.
    tags: ["curse"],
  },

  effects: [
    {
      stat: "all_attributes",
      // -0.25 = -25% to all attributes.
      value: -0.25,
      phase: "attribute_multiplier",
      // Enemy target — effect applies in the enemy/target pipeline.
      target: "enemy",
    },
  ],
}
```

**Pipeline**: When toggled active in Active Buffs, `collectBuffEffects` contributes this ability's effects to the pipeline. Duration doesn't drive math for stat-mutating buffs/debuffs (no tick count involved) — but the structural duration fields let UI display the modified effective duration (e.g., "12s → 15.6s with +30% curseDurationBonus").

**When to use**: Any toggleable buff/debuff with a finite duration. Tags opt into outgoing modifiers from perks like "+30% curse duration" or "+50% shout duration."

---

## 14. `example_channel_dot_spell`

Cast-activation spell that deals damage over time via structured tickRate. Duration + tickRate feed effectiveTicks math.

```js
{
  id: "example_channel_dot_spell",
  type: "spell",
  name: "Example Channel DoT Spell",
  desc: "Channel for 7.5 seconds, dealing 5(0.25) evil magical damage to the target per second.",
  tier: 4,
  memoryCost: 3,

  activation: "cast",
  targeting: "enemy",
  cost: { type: "health", value: 5 },

  // Damage sources. Array allows multiple instances (e.g., initial + DoT).
  damage: [
    {
      // base flat damage per tick.
      base: 5,
      // MPB scaling coefficient per tick (0.25 = 25% MPB applies).
      scaling: 0.25,
      damageType: "evil_magical",

      // isDot flag: marks this damage source as over-time.
      // Engine multiplies by effectiveTicks for total-damage display.
      isDot: true,

      // tickRate in seconds. 1 = one tick per second (default).
      // Non-default tickRate (e.g., 0.2) supports high-frequency DoTs.
      // Engine: effectiveTicks = floor(effectiveDuration / tickRate)
      tickRate: 1,

      target: "enemy",

      // Optional display label for breakdown UI.
      label: "per second",
    },
  ],

  // For a DoT, duration is structural — feeds tick count math.
  duration: {
    base: 7.5,
    type: "other",  // Channels are "other" per vocabulary rules.
  },
}
```

**Pipeline**: Damage panel (Phase 3) computes total DoT damage as `(base + MPB × scaling × base) × effectiveTicks`. `effectiveTicks` derives from `duration` and `tickRate` after duration-modifier application. `type: "other"` skips buff/debuff duration modifiers — only caster-side tag modifiers (if any) and tickRate affect the tick count.

**When to use**: Any channel, beam, or multi-tick damage spell.

---

## 15. `example_spell_with_status`

Cast spell that applies a status effect (e.g., burn, frostbite) to the target in addition to direct damage.

```js
{
  id: "example_spell_with_status",
  type: "spell",
  name: "Example Spell With Status",
  desc: "Deal 20(1.0) fire magical damage to the target and apply burn for 3 seconds.",
  tier: 1,
  memoryCost: 2,

  activation: "cast",
  targeting: "enemy",
  cost: { type: "charges", value: 3 },

  damage: [
    {
      base: 20,
      scaling: 1.0,
      damageType: "fire_magical",
      target: "enemy",
    },
  ],

  // appliesStatus[]: list of statuses the spell inflicts on hit.
  // Each entry uses an AppliedStatus shape.
  appliesStatus: [
    {
      // Must be a STATUS_TYPES member (vocabulary.md Category 18).
      type: "burn",

      // Status-specific duration. Same duration shape as ability-level.
      duration: {
        base: 3,
        type: "debuff",
        // burn is a duration-modifier tag (caster-side burnDurationAdd flat-add).
        tags: ["burn"],
      },

      // DoT carried by the status itself. Independent of the spell's direct damage.
      damage: {
        base: 3,
        scaling: 0,
        damageType: "fire_magical",
        isDot: true,
        tickRate: 1,
      },

      // Optional stat effects inflicted alongside the DoT.
      // Omitted here — pure DoT status.
      // effects: [...]

      // Optional desc for the status-specific behavior.
      desc: "Fire DoT on the target.",
    },
  ],
}
```

**Pipeline**: On cast, `damage` applies directly. `appliesStatus[]` entries are collected and applied to the target; each status's own `damage` and `effects` feed the target pipeline and damage readout. Status duration is modified by target's debuffDurationBonus and caster's burnDurationAdd (flat seconds, tag-bound).

**When to use**: Any spell that "deals X damage and burns/frostbites/poisons/bleeds/electrifies/etc." the target.

---

## 16. `example_stacking_ability`

Ability whose effects scale with user-declared stack count. Stacks are resource state, not temporal — user sets count 0..maxStacks regardless of in-game tracking.

```js
{
  id: "example_stacking_ability",
  type: "skill",
  name: "Example Stacking Ability",
  desc: "Channel your mind, sacrificing 10% of max HP per second to gain 5% physical and magical damage bonus per stack, up to 10 stacks.",

  activation: "toggle",

  stacking: {
    maxStacks: 10,

    // Effects applied once per stack. Engine multiplies × selectedStacks[ability.id].
    perStack: [
      {
        stat: "physicalDamageBonus",
        value: 0.05,
        phase: "post_curve",
      },
      {
        stat: "magicalDamageBonus",
        value: 0.05,
        phase: "post_curve",
      },
    ],

    desc: "Stacks — +5% physical and +5% magical damage bonus per stack. Gained while channeling; lost on duration expiry.",
  },

  // Overall ability duration (toggled on). Separate from stacks.
  duration: {
    base: 60,
    type: "buff",
  },
}
```

**Pipeline**: `collectStackingEffects` reads `ctx.selectedStacks[ability.id]` and contributes `perStack × count` entries to the pipeline. UI provides a stack input on any selected ability with a stacking block.

**When to use**: Shard pools, momentum stacks, rage counters, or any "N stacks of X" pattern.

---

## 17. `example_hp_scaling_continuous`

Continuous effect whose magnitude scales with missing HP. Different from `stacking` — there's no discrete count; value derives continuously from HP%.

```js
{
  id: "example_hp_scaling_continuous",
  type: "perk",
  name: "Example HP-Scaling Continuous",
  desc: "Gain 5% physical damage bonus per 10% HP missing, up to 50%.",
  activation: "passive",

  effects: [
    {
      stat: "physicalDamageBonus",
      // Base value is 0 — the real magnitude comes from hpScaling math.
      value: 0,
      phase: "post_curve",

      // hpScaling replaces static `value` with a formula driven by missing HP%.
      // Engine: effectiveValue = floor((100 - hpPercent) / per) × valuePerStep, capped at maxValue.
      // See ability_data_map_v2.md §3.
      hpScaling: {
        // Per N% HP missing (integer).
        per: 10,
        // Bonus added per step.
        valuePerStep: 0.05,
        // Optional maximum total bonus.
        maxValue: 0.50,
      },
    },
  ],
}
```

**Pipeline**: `collectHpScalingEffects` reads `ctx.hpPercent`, computes `effectiveValue` via the formula, and contributes it to the pipeline. UI provides an HP% slider that drives this continuously.

**When to use**: Berserker-style "more damage at lower HP" patterns, or any effect whose magnitude scales with a continuous variable rather than discrete stacks.

---

## 18. `example_shield_ability`

Ability that grants a shield absorbing damage up to a capacity. Shield carries structured base + scaling + optional damage-type filter.

```js
{
  id: "example_shield_ability",
  type: "spell",
  name: "Example Shield Ability",
  desc: "Grants the target a shield that absorbs 25 magical damage for 15 seconds. On break, gain 30% dark magical damage bonus and 50% spell casting speed for 6 seconds.",
  tier: 5,
  memoryCost: 4,

  activation: "cast",
  targeting: "ally_or_self",
  cost: { type: "health", value: 6 },

  // Shield shape — see ability_data_map_v2.md §3.
  shield: {
    // Base flat absorption value.
    base: 25,

    // Optional scaling — added via MPB-like formula.
    // Here omitted (flat-only shield). When present: totalAbsorb = base × (1 + MPB × scaling).
    // scaling: 0.5,

    // Optional filter: "magical" | "physical" | null (all types).
    // Shield only absorbs matching damage.
    // See vocabulary.md Category 27.
    damageFilter: "magical",
  },

  // Duration the shield persists if not consumed.
  duration: {
    base: 15,
    type: "buff",
  },

  // On-break behavior authored as a trigger. Shield-break is an event the trigger describes via desc.
  triggers: [
    {
      desc: "Fires when the shield absorbs its maximum damage capacity.",
      effects: [
        {
          stat: "typeDamageBonus",
          value: 0.30,
          phase: "type_damage_bonus",
          damageType: "dark_magical",
          target: "self",
        },
        {
          stat: "spellCastingSpeed",
          value: 0.50,
          phase: "post_curve",
          target: "self",
        },
      ],
      // The on-break buff lasts 6s — describe via the trigger's effect duration if needed.
      // (Ability-level duration of the shield itself is 15s; the trigger's buff is a separate concern.)
    },
  ],
}
```

**Pipeline**: Shield display (Phase 3) reads the `shield` block for absorb amount and filter. UI renders "Shield: 25 magical damage" in Active Buffs when the spell is toggled. On-break trigger (`triggers[0]`) contributes its effects when the user toggles a "shield-broken" state.

**When to use**: Any ability granting a damage-absorption buffer with optional on-break behavior.

---

## 19. `example_after_effect_ability`

Ability with a main duration followed by a penalty phase (afterEffect). The penalty can be canceled early by other abilities via `removedBy`.

```js
{
  id: "example_after_effect_ability",
  type: "skill",
  name: "Example After-Effect Ability",
  desc: "For 8 seconds, gain 20% action speed and 10 additional move speed. When the effect ends, suffer -8% action speed and -4 move speed for 2 seconds.",

  activation: "toggle",
  cost: { type: "health", value: 3 },

  duration: {
    base: 8,
    type: "buff",
  },

  // Main-phase effects, active while the ability's duration runs.
  effects: [
    {
      stat: "actionSpeed",
      value: 0.20,
      phase: "post_curve",
    },
    {
      stat: "moveSpeed",
      value: 10,
      phase: "post_curve",
    },
  ],

  // afterEffect: a secondary phase activated after duration expiry.
  // Authored as its own { duration, effects, removedBy } block.
  afterEffect: {
    // Duration of the penalty. Typically type: debuff with target: self.
    duration: {
      base: 2,
      type: "debuff",
      // Debuff on self means self.debuffDurationBonus applies
      // (negative values shorten the penalty — player benefit).
    },

    effects: [
      {
        stat: "actionSpeed",
        value: -0.08,
        phase: "post_curve",
        target: "self",
      },
      {
        stat: "moveSpeed",
        value: -4,
        phase: "post_curve",
        target: "self",
      },
    ],

    // removedBy: array of ability IDs that cancel the penalty early.
    // User toggles a referenced ability active to skip the afterEffect.
    // Not validated against ability IDs at define-class time (per vocabulary decisions).
    removedBy: ["example_cancel_after_effect_ability"],

    desc: "Penalty phase after the main buff ends.",
  },
}
```

**Pipeline**: `collectAfterEffects` treats the afterEffect as a separate toggleable state. When the user activates the main buff and toggles "main expired / in afterEffect phase," the afterEffect's effects apply. If any `removedBy` ability is equipped AND toggled, UI surfaces the cancel option.

**When to use**: Any "buff that leaves a debuff" pattern (adrenaline rushes, berserker fatigue, overcharge crashes).

---

## 20. `example_ability_modifiers_by_tag`

Passive perk that modifies other abilities by tag — e.g., "shouts last 50% longer, cost 10% less cooldown."

```js
{
  id: "example_ability_modifiers_by_tag",
  type: "perk",
  name: "Example Ability Modifiers By Tag",
  desc: "Shouts last 50% longer and have 10% reduced cooldown.",
  activation: "passive",

  // abilityModifiers[] targets other abilities by tag, type, or id.
  // See vocabulary.md Category 21.
  abilityModifiers: [
    {
      // Target filter — select which abilities this modifier affects.
      // { tags: [...] } matches abilities whose tags include any of these.
      target: { tags: ["shout"] },

      // modify: which property to change. One of:
      //   "duration" | "cooldown" | "castTime" | "range" | "aoeRadius" | "cost"
      // "duration" is handled as a display multiplier (temporal metadata).
      modify: "duration",

      // Numeric value: interpreted per `mode`.
      value: 0.50,

      // mode: "multiply" (×(1 + value)) or "add" (+value). Default: "multiply".
      mode: "multiply",
    },
    {
      target: { tags: ["shout"] },
      modify: "cooldown",
      // -0.10 = -10% cooldown (makes shouts more frequent).
      value: -0.10,
      mode: "multiply",
    },
  ],
}
```

**Pipeline**: `abilityModifiers` are collected into a display-layer decoration. `applyAbilityModifiers` walks each ability at render time; matching abilities have their displayed duration/cooldown/castTime scaled accordingly. The engine doesn't drive these modifications through the stat pipeline — they're display adjustments that reflect the live modified value for UI.

**When to use**: "My X-tagged abilities have modified Y" perks. For class-wide spell-cost modifications (not targeted by tag), use `target: { type: "spell" }` with `modify: "cost"`.

---

## 21. `example_transformation_with_form`

Transformation ability that shifts the character into a new form with replacement skills and form-specific attacks. Stacking/HP-scaling/frenzy mechanics coexist in the form block.

```js
{
  id: "example_transformation_with_form",
  type: "transformation",
  name: "Example Transformation",
  desc: "Transform into a bear. Gain +50 max HP and +25% physical damage reduction while transformed.",

  // Transformations use activation: "toggle" (entered and exited by user).
  activation: "toggle",
  targeting: "self",

  // Effects active while IN the form. Condition-gated on form_active.
  effects: [
    {
      stat: "maxHealth",
      value: 50,
      phase: "pre_curve_flat",
      condition: { type: "form_active", form: "bear" },
    },
    {
      stat: "physicalDamageReductionBonus",
      value: 0.25,
      phase: "post_curve",
      condition: { type: "form_active", form: "bear" },
    },
  ],

  // form block: attacks unique to this form, optional wildSkill with afterEffect.
  form: {
    // Canonical form identifier. Referenced by condition.form_active.
    // See vocabulary.md Category 6.
    formId: "bear",

    // Attacks available in form. Replaces normal melee attacks.
    attacks: [
      {
        name: "Swipe",
        desc: "A powerful claw swipe.",
        damage: [
          {
            base: 25,
            scaling: 1.0,
            damageType: "physical",
            target: "enemy",
          },
        ],
        // Optional frenziedEffect — applies when ctx.playerStates.frenzy_active is true.
        // See vocabulary.md Category 29.
        frenziedEffect: {
          // Additional bleed status applied only when frenzied.
          type: "bleed",
          duration: { base: 3, type: "debuff" },
          damage: {
            base: 5,
            scaling: 0,
            damageType: "physical",
            isDot: true,
          },
        },
      },
    ],

    // wildSkill: the form's unique one-shot ability, with its own duration + afterEffect.
    wildSkill: {
      id: "example_wild_skill",
      name: "Wild Roar",
      desc: "Roar to buff nearby allies' damage for 6 seconds. Suffer -15% action speed for 4 seconds after.",
      duration: { base: 6, type: "buff" },
      effects: [
        {
          stat: "physicalDamageBonus",
          value: 0.10,
          phase: "post_curve",
          target: "nearby_allies",
        },
      ],
      afterEffect: {
        duration: { base: 4, type: "debuff" },
        effects: [
          {
            stat: "actionSpeed",
            value: -0.15,
            phase: "post_curve",
            target: "self",
          },
        ],
      },
    },
  },
}
```

**Pipeline**: the transformations collector reads `ctx.activeForm`. When the user toggles the transformation active, `activeForm` is set; condition-gated effects (`form_active`) apply. Form attacks and wildSkill surface as replacement ability options in UI. `ctx.playerStates.frenzy_active` separately gates `frenziedEffect` branches on form attacks.

**When to use**: Druid-style shapeshifts, Warlock Blood Pact's demon form, any "replace your skills with form-specific ones" mechanic.

---

## 22. `example_music_with_tiers`

Music ability with performance tiers (poor / good / perfect). Tier-specific effects vary; the UI defaults to perfect for the main stat sheet.

```js
{
  id: "example_music_with_tiers",
  type: "music",
  name: "Example Music",
  desc: "A tiered song that buffs nearby allies' move speed.",
  tier: 1,
  memoryCost: 2,

  activation: "cast",
  targeting: "nearby_allies",

  // Music ability uses `tags` to classify by instrument.
  // Instrument tags (vocabulary.md Category 4) aren't enum-validated, but should
  // follow convention (drum, flute, lute, lyre, etc.).
  tags: ["song", "drum"],

  // performanceTiers: { poor, good, perfect }.
  // Each tier shape is an object with optional: effects, damage, heal, duration, appliesStatus.
  // See vocabulary.md Category 30 and ability_data_map_v2.md §3.
  performanceTiers: {
    poor: {
      duration: { base: 60, type: "buff" },
      effects: [
        {
          stat: "moveSpeed",
          value: 3,
          phase: "post_curve",
          target: "nearby_allies",
        },
      ],
    },
    good: {
      duration: { base: 120, type: "buff" },
      effects: [
        {
          stat: "moveSpeed",
          value: 5,
          phase: "post_curve",
          target: "nearby_allies",
        },
      ],
    },
    perfect: {
      duration: { base: 240, type: "buff" },
      effects: [
        {
          stat: "moveSpeed",
          value: 7,
          phase: "post_curve",
          target: "nearby_allies",
        },
      ],
    },
  },
}
```

**Pipeline**: UI provides a tier selector (poor/good/perfect) on any selected music ability. `ctx.selectedTiers[ability.id]` drives which tier's effects enter the pipeline. Defaults to `"perfect"` for new builds. Tier-bound effects skip the main `effects[]` field entirely when `performanceTiers` is present.

**When to use**: Bard-style music with variable-quality performance outcomes.

---

## 23. `example_merged_spell`

Merged spell that combines two component spells. Availability derives from every entry in `requires[]` being in spell memory; merged spell carries dual-element damage. Authored in the class's `mergedSpells: []` array (separate from `spells: []` for visual clarity), but structurally a regular spell with a `requires[]` availability gate.

```js
{
  id: "example_merged_spell",
  type: "spell",
  name: "Example Merged Spell",
  desc: "Combines two component spells into a dual-element projectile dealing fire + ice damage, applying burn and frostbite.",
  tier: 3,

  // No memoryCost — merged spells don't consume additional slots beyond their requires entries.

  activation: "cast",
  targeting: "enemy",
  // Cost is typically cooldown-type for merged spells (Sorcerer pattern).
  cost: { type: "cooldown", value: 18 },

  // requires: [componentSpellIdA, componentSpellIdB].
  // Merged spell becomes available when EVERY referenced spell is in selectedSpells.
  // See vocabulary.md Category 31.
  requires: ["example_component_fire_spell", "example_component_frost_spell"],

  // Damage array carries TWO entries — one per element. Each scales on MPB
  // (universal) and on its own type bonus (specific).
  damage: [
    {
      base: 18,
      scaling: 1.0,
      damageType: "fire_magical",
      target: "enemy",
      label: "fire component",
    },
    {
      base: 18,
      scaling: 1.0,
      damageType: "ice_magical",
      target: "enemy",
      label: "ice component",
    },
  ],

  // Both statuses apply on hit.
  appliesStatus: [
    {
      type: "burn",
      duration: { base: 3, type: "debuff", tags: ["burn"] },
      damage: {
        base: 3,
        scaling: 0,
        damageType: "fire_magical",
        isDot: true,
        tickRate: 1,
      },
    },
    {
      type: "frostbite",
      duration: { base: 2, type: "debuff" },
      effects: [
        {
          stat: "moveSpeed",
          value: -5,
          phase: "post_curve",
          target: "enemy",
        },
        {
          stat: "actionSpeed",
          value: -0.15,
          phase: "post_curve",
          target: "enemy",
        },
      ],
    },
  ],
}
```

**Pipeline**: Stage 0 walks the class's `mergedSpells[]` array; any merged spell whose `requires[]` are ALL in `selectedSpells` is added to `ctx.grantedSpells` alongside contributions from active abilities' `grantsSpells`. Cooldown comes from the `cost.value` (cooldown-type). Each damage entry and status is applied independently — two separate damage instances per cast.

**When to use**: Sorcerer-style elemental combinations. Any spell authored as "combines X + Y into Z."

---

## 24. `example_summon_with_caster_effects`

Summon ability that spawns a companion and confers effects on the caster while the summon is active.

```js
{
  id: "example_summon_with_caster_effects",
  type: "spell",
  name: "Example Summon With Caster Effects",
  desc: "Summon an earth elemental that fights for 18 seconds. While active, gain 50 armor rating.",
  tier: 3,
  memoryCost: 3,

  activation: "cast",
  targeting: "self",
  cost: { type: "cooldown", value: 30 },

  // summon block: summon descriptor with optional damage, caster effects, environment bonus.
  // See vocabulary.md Categories 28, 29 (summon.type and environment bonus).
  summon: {
    // Summon type (open vocabulary).
    type: "earth_elemental",

    // Base duration of the summon. "other"-typed because summon lifetime is an ability concern,
    // not a buff/debuff on a character.
    duration: { base: 18, type: "other" },

    // Damage the summon deals (to enemies). Applied as a separate damage source.
    damage: [
      {
        base: 10,
        scaling: 1.0,
        damageType: "earth_magical",
        label: "summon attack",
        target: "enemy",
      },
    ],

    // casterEffects: Effects applied to the caster while the summon is active.
    // Gated implicitly on ctx.activeSummons[summon_id] being true.
    casterEffects: [
      {
        stat: "armorRating",
        value: 50,
        phase: "pre_curve_flat",
        target: "self",
      },
    ],

    // environmentBonus: optional environment in which the summon gains a bonus.
    // Value must match a member of ENVIRONMENTS (vocabulary.md Category 7).
    // When present, engine conditionally amplifies summon.damage[] in that environment.
    environmentBonus: "water",
  },
}
```

**Pipeline**: `collectSummonEffects` reads `ctx.activeSummons[ability.id]`. When user toggles the summon active, `casterEffects` enter the caster pipeline. Summon damage enters the target pipeline on a separate damage source. Environment condition (if set) amplifies when ctx.environment matches.

**When to use**: Summoner abilities (elementals, totems, pets) that provide passive benefits to the caster while active.

---

## 25. `example_true_damage_source`

Damage source that bypasses target DR. Encoded via the `trueDamage` flag on a normal-type DamageSource.

```js
{
  id: "example_true_damage_source",
  type: "perk",
  name: "Example True Damage Source",
  desc: "Your melee attacks deal an additional 1 true physical damage per hit.",
  activation: "passive",

  triggers: [
    {
      desc: "Fires on each landed melee hit.",
      damage: [
        {
          // Base damage before scaling. Small flat number for a true-damage drip.
          base: 1,
          scaling: 0,

          // damageType is the NORMAL damage school — not a special "true_*" type.
          // See vocabulary.md Category 16 and Convention 8.
          damageType: "physical",

          // trueDamage flag signals the engine to bypass the target's DR calculation.
          // Applies to both physical and magical damage sources — the flag is orthogonal.
          // Use this instead of a retired "true_physical" / "true_magical" damage type.
          trueDamage: true,

          target: "enemy",

          // Display hint for damage breakdown UI.
          label: "true physical",
        },
      ],
    },
  ],
}
```

**Pipeline**: `damage.js` checks `trueDamage` flag before applying the DR multiplier. When true, the DR step is skipped — the full damage value is applied. Type-specific damage bonuses (typeDamageBonus, MPB scaling) still apply per their normal rules; only the DR step is bypassed.

**When to use**: Any damage labeled "true" in source material — Spiked Gauntlet +1 true physical, Shadow Touch 2 true dark magical, Purge Shot's true magical damage, etc.

---

## 26. `example_compound_condition`

Compound condition combining two leaves via logical AND. `all` nests a `conditions[]` array; each entry is any valid condition, including other compounds. Use `any` for OR. Anchor: Fighter Sword Mastery's "defensive stance WITH a sword" effect.

```js
{
  id: "example_compound_condition",
  type: "perk",
  name: "Example Compound Condition",
  desc: "While holding a sword and in defensive stance, gain 10 move speed.",
  activation: "passive",

  effects: [
    {
      stat: "moveSpeed", value: 10, phase: "post_curve",
      // AND: both leaves must be true. Engine resolves recursively; leaves
      // dispatch through the normal CONDITION_TYPES evaluator.
      condition: {
        type: "all",
        conditions: [
          { type: "weapon_type", weaponType: "sword" },
          { type: "player_state", state: "defensive_stance" },
        ],
      },
    },
  ],
}
```

**Pipeline**: condition evaluator sees `type: "all"` and recursively evaluates each entry in `conditions[]`. All must pass for the effect to apply. `any` combines via OR. Nested compounds allowed (e.g., `all` containing an `any`). No depth limit; keep shallow for readability.

**When to use**: Any ability whose effect requires more than one simultaneous gate. Previously authored as two parallel single-gated effects, which was fragile; the compound form is canonical per tracker D.24.

---

## 27. `example_post_curve_multiplicative`

Multiplies the derived stat's *own value* after all `post_curve` additives. Distinct from `post_cap_multiplicative_layer` (which multiplies final incoming damage) — this scales the STAT itself before it enters any damage formula. Anchor: Fighter Veteran Instinct's "+10% of current PDR" effect (in-game verified multiplicative-on-current).

```js
{
  id: "example_post_curve_multiplicative",
  type: "perk",
  name: "Example Post-Curve Multiplicative",
  desc: "While in combat, physical damage reduction is increased by 10% of its current value.",
  activation: "passive",

  effects: [
    {
      // value 0.10 means ×1.10, applied AFTER all post_curve additives.
      // At 50% PDR baseline → 55% PDR while condition holds.
      stat: "physicalDamageReductionBonus", value: 0.10, phase: "post_curve_multiplicative",
      condition: { type: "player_state", state: "in_combat" },
    },
  ],
}
```

**Pipeline**: `stat_final = (base + Σ post_curve additives) × Π (1 + post_curve_multiplicative values)`, then clamped by any active `cap_override`. Multiple `post_curve_multiplicative` effects on the same stat compose multiplicatively (product of `1 + value`).

**When to use**: Any CSV phrasing of "X% of current" / "scale your current X by Y%" / "add Y% to your existing X" — where the language signals *of current value*, not flat addition. Flat additions stay on `post_curve`.

---

## Meta: patterns this doc does NOT show

For completeness — other shape fields exist but aren't standalone patterns:

- `grantsArmor`, `removesArmor`, `grantsWeapon`, `grantsSpells` — one-line ability-level additions, not shape patterns. See vocabulary.md Categories 22-24.
- `passives: { ... }` — escape-hatch flag map for mechanics with no engine path. Keys are open; prefer `effects[]` when possible. See vocabulary.md Category 25.
- `disables[]` — ability disables another ability by type + filter. Rare; see vocabulary.md Category 20.
- `cc: [{ type, duration, tags? }, ...]` — crowd-control array alongside damage (per tracker D.16). See vocabulary.md Category 26.
- `slots: { type, count }` — on class root, not ability level. See vocabulary.md Category 12.

Each of the above is a single field addition to one of the patterns above; no new shape is required.

---

## Cross-reference summary

| Pattern | Primary vocab categories | Primary spec §3 section |
|---|---|---|
| 1–5 basics | Cat 13, 14, 15, 16 | effects[], phases |
| 6–10 conditions | Cat 5, 6, 7, 8, 9 | Condition shape |
| 11–12 triggers | Cat 4 tags, Conv 4 | triggers[] |
| 13–15 toggles + temporal | Cat 18, 32, 33 | duration, status |
| 16–17 stacking + scaling | Cat 32, 33 (stacking.desc), hpScaling | stacking, hpScaling |
| 18 shield | Cat 27 | shield |
| 19 afterEffect | — | afterEffect |
| 20 modifiers | Cat 21 | abilityModifiers |
| 21 transformation | Cat 6 | form, wildSkill |
| 22 music | Cat 30 | performanceTiers |
| 23 merged spell | Cat 31 | components |
| 24 summon | Cat 28, 29, 7 | summon |
| 25 true damage | Cat 16, Conv 8 | DamageSource.trueDamage |
| 26 compound condition | Cat 5 | Condition shape (nested) |
| 27 post_curve_multiplicative | Cat 14 | effects[].phase |
