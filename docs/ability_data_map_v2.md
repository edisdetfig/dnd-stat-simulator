# Ability Data Map (v2)

> **Purpose**: Single source of truth for data structure design. Maps every current mechanic pattern to its unified representation. Read this before touching class data or the effect pipeline.
>
> **Design goal**: Adding new content (classes, perks, skills, spells) should be a data change, not a code change. When a genuinely new mechanic type appears, make one small localized engine addition — then all subsequent abilities using that pattern are purely data.
>
> **Changes from v1**: Resolved all open questions. Eliminated `isPercent`. Removed `DAMAGE_OVER_TIME` as a phase. Moved computable passives to `effects[]`. Resolved `maxHealthBonus` routing (Option C). Added `stateChange` to triggers. Unified trigger damage shape. Replaced `activatable` with `activation` enum (supersedes plan's `activatable: boolean`). Fixed constraint filters to use `tags`. Defined Summon/CrowdControl shapes. Added `affectedByHitLocation` to form attacks. Added `spellCostMultiplier` field. Added data-driven litmus test. Added `healOnDamage` as top-level field. 20 migration examples.
>
> **Changes from v2 review**: Added explicit `pre_curve_flat` routing rule (C4). Added `healOnDamage` field (C1). Added `buffWeaponDamage` to STAT_META (C2). Audited religion effects per-stat (C3). Added `healType` to healing_modifier effects (I2). Added `impliedHealEffects` migration (I4). Added class-level constraints note (I5). Fixed Dreamwalk phase (I7). Added migration examples: Mending Grove, Sun and Moon, Eldritch Shield, religion blessings. Documented wild skill scoping rule (m5). Updated health formula to verified spec (conditional rounding, +10 patch bonus).
>
> **Changes from architecture review**: (1) `type_damage_bonus` stat field now uses sentinel `"typeDamageBonus"` so `stat` is always a STAT_META key — `damageType` carries the actual type. (2) Trigger damage field renamed `value` → `base` to match `damage[]` array shape. (3) Added ability-level `condition` field — applies to all effects, ANDs with per-effect conditions; eliminates repetition on transformations. (4) Specified `disables[].filter` matching semantics: scalar = equality, array = any-overlap, multiple keys = AND. (5) Specified `cap_override` conflict resolution: highest value wins. (6) Merged `has_buff` into `effect_active` condition type — simulator approximates "target has buff" as "I've cast this buff." (7) Moved `healOnDamage` into `triggers[]` with new `on_damage_dealt` event; `equalToDamage` and `healRadius` added to trigger heal shape.
>
> **Changes from v3 (10-class expansion)**: v2 designed against 3 classes; v3 incorporates all 10 from CSV definitions in `docs/classes/`. Added Snapshot Principle (Section 1.5). Added `type: "music"` with `performanceTiers` (Bard). Added `type: "merged_spell"` with `components[]` (Sorcerer). Added `"cooldown"` to `cost.type` enum. Added `weapon_type`, `player_state`, `equipment`, `dual_wield` condition types. Added `stacking` shape with `maxStacks`/`perStack`. Added `hpScaling` on effects for continuous HP-based scaling. Added `appliesStatus[]` and status effect shape. Extended `attribute_multiplier` to per-attribute (not just all_attributes). Added `abilityModifiers[]` for cross-ability modifications. Generalized `afterEffect` from wild skills to all abilities. Expanded `target` to include "party"/"nearby_allies"/"nearby_enemies". Added `casterEffects` on Summon. Replaced `shieldAmount` with `shield: { base, scaling?, damageFilter? }`. Added combat stats to STAT_META (`headshotPower`, `backstabPower`, `armorPenetration`, `impactPower`, etc.). Added `armorRatingMultiplier` for gear-multiplicative effects. Added `consumedOn` display metadata. Added `spellChargeMultiplier` stat. Added `grantsWeapon`/`removesArmor`. Added `castTime`/`range`/`aoeRadius` display metadata. Added `"music"` to slots type. 8 new migration examples.

---

## 1. Current Mechanic Inventory

Every distinct field across all class abilities, grouped by what it represents.

### Identity & metadata
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `id` | all | `"demon_armor"` | Unique identifier |
| `name` | all | `"Demon Armor"` | Display name |
| `desc` | perks, skills | `"Equip plate armor..."` | Short description |
| `tooltip` | spells | `"Deal 3 evil magical..."` | Full tooltip text |
| `tier` | spells | `1` | Spell tier level |
| `type` | skills | `"combat"`, `"spell_memory"`, `"shapeshift_memory"` | Skill subtype |
| `_unverified` | any | `"Duration not specified..."` | Data verification note |

### Resource costs
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `memoryCost` | spells | `1` | Spell memory slot cost |
| `healthCost` | warlock spells | `4` | HP cost to cast |
| `maxCasts` | druid spells | `4` | Limited charges per fight |
| `cooldown` | skills | `24` | Recharge time (seconds) |
| `spellCostMultiplier` | perks | `2.0` | Multiplies spell costs |

### Targeting & duration
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `targeting` | spells | `ENEMY_OR_SELF` | Who can be targeted |
| `canTargetSelf` | spells | `false` | Restricts self-targeting |
| `duration` | spells, skills | `12` | Effect duration (seconds) |
| `isSpirit` | druid spells | `true` | Spirit magic classification |
| `damageType` | warlock spells | `"curse"` | Spell classification tag |

### Stat-modifying effects (feed into stat pipeline)
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `statEffects` | perks | `[{ stat: "armorRating", value: 20 }]` | Flat stat changes (NO phase) |
| `effects` | spells, skills | `[{ phase: "PRE_CURVE_FLAT", stat: "str", value: 15 }]` | Phase-aware stat changes |
| `statModifiers` | transformations | `[{ stat: "maxHealthBonus", value: 0.50 }]` | Form stat changes (NO phase) |
| `passiveEffects` | perks | `{ antimagic: true }` | Grab-bag of passive flags |
| `typeDamageBonus` | perks | `{ dark_magical: 0.20 }` | Per-type damage % |
| `healingMod` | perks | `0.20` | Multiplicative healing bonus |
| `capOverrides` | perks | `{ pdr: 0.75 }` | Raise stat caps |
| `curseDurationBonus` | perks | `0.30` | Extend curse duration |
| `damageReduction` | perks | `{ undead: 0.40 }` | Reduce damage from type |

### Damage sources
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `damage` | spells, skills | `[{ base: 20, scaling: 1.0, damageType: "dark_magical", label: "Projectile" }]` | Direct damage |
| `damage[].isDot` | spells | `true` | Marks DoT component |
| `damage[].isChannel` | spells | `true` | Marks channeled ability |
| `damage[].perBuff` | spells | `true` | Scales with buff count |
| `damage[].tickRate` | spells | `0.2` | Tick interval (seconds) |
| `damage[].affectedByHitLocation` | spells, skills | `true` | Can headshot |
| `attacks` | transformations | `[{ primitiveMultiplier, primitiveAdd, scaling, damageType }]` | Form attack damage |
| `attacks[].bleed` | form attacks | `{ damage: 5, scaling: 0.5, duration: 3, damageType }` | Bleed on hit |
| `attacks[].plague` | form attacks | `{ damage: 3, scaling: 0.5, duration: 3, damageType }` | Plague on hit |
| `attacks[].armorPenetration` | form attacks | `{ base: 0.30, scaling: 1.0 }` | Per-attack armor pen |
| `attacks[].frenziedEffect` | form attacks | `{ silence: 0.1 }` | Effect during frenzy |

### Healing sources
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `healEffects` | spells, perks | `[{ label, baseHeal: 15, scaling: 0.25, isHoT: true, baseDuration: 12 }]` | Healing output |
| `impliedHealEffects` | spells | `[{ ..., source: "natures_touch" }]` | Healing from linked spell |
| `healOnDamage` | spells | `true` or `{ baseHeal, scaling, requiresBuff, healRadius }` | Heal when dealing damage (migrates to `triggers[]` with `on_damage_dealt` event) |
| `healOnHit` | perks | `{ baseHeal: 2, scaling: 0, healType, trigger }` | Heal on melee hit |
| `healOnCurseTick` | perks | `{ baseHeal: 2, scaling: 0.15, healType }` | Heal per curse tick |

### Triggered / on-event mechanics
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `onHitEffects` | perks | `[{ damageType: "dark_magical", damage: 2 }]` | Damage on melee hit |
| `onHitReceived` (warlock) | perks | `[{ damageType: "dark_magical", base: 15, scaling: 0.75 }]` | Counter-damage (scaled) |
| `onHitReceived` (druid) | perks | `[{ damageType: "true_physical", damage: 5, trueDamage: true }]` | Counter-damage (true) |
| `debuffOnHit` | skills | `{ stat, value: -0.80, duration: 12 }` | Debuff applied to target |
| `onBreak` | spells | `{ duration: 6, effects: [...] }` | Effects when shield breaks |
| `shieldAmount` | spells | `15` | Absorb pool value |
| `passiveEffects.onDamageTaken` | perks | `{ stat, value, duration, cooldown, becomesSpiritual }` | Trigger on taking damage |
| `passiveEffects.onHeal` | perks | `{ stat, value, duration }` | Trigger on healing |
| `passiveEffects.darknessShardOnKill` | perks | `true` | Trigger on kill |

### Constraint flags
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `shapeshiftOnly` | perks | `true` | Only active in animal form |
| `disablesShapeshift` | perks | `true` | Prevents transformations |
| `disablesSpiritSpells` | perks | `true` | Prevents spirit spells |
| `grantsArmor` | perks | `["plate"]` | Unlocks armor types |

### Boolean passive flags (in `passiveEffects`)
| Field | Example | Purpose |
|---|---|---|
| `antimagic` | `true` | Multiplicative magic DR layer |
| `spellsCannotKill` | `true` | Spells reduce to 1HP, not 0 |
| `phasethrough` | `true` | Pass through attacks |
| `healBonus` | `1` | Flat healing addition |
| `partyDamageShare` | `{ percent, maxDamage, interval }` | Share damage with party |
| `lowHpHealingBonus` | `{ threshold, bonus, healType }` | Heal boost below HP % |
| `shapeshiftTimeReduction` | `0.25` | Faster shapeshift cast |
| `wildSkillCooldownReduction` | `0.25` | Reduced wild skill CD |

### Transformation-specific
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `primitiveAttr` | transformations | `"str"`, `null` | Attribute for damage curve |
| `fixedAttackSpeed` | transformations | `true` | Ignores Action Speed stat |
| `passiveNotes` | transformations | `"Panther has its own..."` | Display-only description |
| `wildSkill` | transformations | `{ id, name, effects, duration, ... }` | Active ability in form |
| `wildSkill.grantsFrenzy` | wild skills | `true` | Enables frenzy state |
| `wildSkill.heal` | wild skills | `{ primitiveMultiplier, scaling }` | Wild skill healing |
| `wildSkill.condition` | wild skills | `"in_water"` | Activation requirement (raw string — migrate to Condition object) |
| `wildSkill.afterEffect` | wild skills | `{ duration, effects }` | Debuff after skill expires |

### Summons
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `summon` | spells | `{ type: "hydra", damage: [...] }` | Summoned creature |
| `summon.duration` | spells | `24` | Summon lifetime |
| `summon.underwaterBonus` | spells | `true` | Environmental bonus |

### Spell linking
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `allyEffect` | spells | `"natures_touch"` | Cast different spell on ally |
| `cc` | spells | `{ type: "root", duration, areaRadius, areaDuration, immunityAfter }` | Crowd control data |

### Skill containers
| Field | Found on | Example | Purpose |
|---|---|---|---|
| `spellSlots` | skills | `5` | Spell memory capacity |
| `shapeshiftSlots` | skills | `5` | Form memory capacity |

---

## 1.5. The Snapshot Principle

This simulator computes a **point-in-time stat snapshot**, not a real-time combat simulation. Every temporal mechanic — duration, cooldown, tick rate, consumed-on-use, stack decay — is **display metadata**, not engine input.

**What this means in practice:**

| Temporal field | Displayed as | Engine behavior |
|---|---|---|
| `duration: 12` | "12s" in tooltip | Does NOT auto-expire |
| `cooldown: 24` | "24s CD" in tooltip | Does NOT prevent re-toggling |
| `stacking.maxStacks: 3` | Stack selector (0–3) | Multiplies perStack × selected count |
| `consumedOn: "next_attack"` | "consumed on next attack" | Buff stays until user toggles off |
| `hpScaling` | HP% slider | Engine reads slider, computes scaled value |
| `performanceTiers` | Tier selector (poor/good/perfect) | Engine reads selected tier's effects |
| `afterEffect.duration: 2` | "then -8% AS for 2s" | Separate toggle, not auto-triggered |
| `castTime: 1.5` | "1.5s cast" | No sim impact |

**The engine treats everything as "toggle on/off."** Users control what's active via UI toggles, sliders, and selectors. The engine collects all active effects and computes derived stats. Temporal fields inform the UI what to display alongside the toggle, nothing more.

**UI controls derived from data shapes:**

| Data shape | UI control |
|---|---|
| `activation: "toggle"` | On/off toggle in Active Effects panel |
| `activation: "passive"` | Always on when selected (no control) |
| `activation: "cast"` | Damage/heal output only, no stat toggle |
| `stacking.maxStacks: N` | Stack count selector (0–N) |
| `hpScaling` on any effect | HP% slider (shared across all HP-scaling abilities) |
| `performanceTiers` | Tier selector: poor / good / perfect |
| `appliesStatus` on equipped ability | Status toggle in Target Editor |
| `condition: { type: "form_active" }` | Gated by form selection |
| `condition: { type: "weapon_type" }` | Gated by equipped weapon |
| `condition: { type: "player_state" }` | State toggle in States panel |

---

## 2. Problem: Why the Current Shape Doesn't Work

Three field names for the same concept:
- `statEffects` (perks) — no phase, no conditions
- `effects` (spells/skills) — has phase, but only spells are processed
- `statModifiers` (transformations) — no phase, special-cased in App.jsx

Five different places store "bonus to stat":
- `statEffects[].value` — perk flat bonus
- `passiveEffects.antimagic` — boolean flag for multiplicative layer
- `typeDamageBonus.dark_magical` — nested object for type bonus
- `healingMod` — top-level number for healing multiplier
- `capOverrides.pdr` — nested object for cap raises

Result: the engine has to know about every individual field name. Adding a new perk with a new field name requires engine code changes. The plan collapses all of these into `effects[]` with `{ stat, value, phase }`.

---

## 3. Unified Ability Shape

```
Ability {
  // ── Identity ──
  id:             string
  type:           "perk" | "skill" | "spell" | "transformation" | "music" | "merged_spell"
  name:           string
  desc:           string                          // tooltip or description
  tier:           number?                         // spell tier

  // ── Resource cost ──
  memoryCost:     number?                         // spell memory slot cost
  cost:           { type: "health" | "charges" | "cooldown", value: number }?
                                                  // "health" — Warlock (HP cost per cast)
                                                  // "charges" — Cleric, Wizard, Druid (limited casts)
                                                  // "cooldown" — Sorcerer (base cooldown in seconds)
  cooldown:       number?                         // seconds (for skills; Sorcerer spells use cost.type "cooldown" instead)
  spellCostMultiplier: number?                    // multiplies all spell costs (e.g., Torture Mastery 2.0)

  // ── Targeting & timing ──
  //
  // `targeting` = who the ABILITY can be cast on (ability-level).
  // `effects[].target` = whose stats THIS EFFECT modifies (effect-level).
  //
  // These are independent. An enemy-targeted spell can have self-buffing
  // effects (e.g., lifesteal). An ally-targeted spell can debuff the caster
  // (e.g., health cost DoT).
  //
  targeting:      "self" | "ally_or_self" | "enemy" | "enemy_or_self"?
  canTargetSelf:  boolean?                        // default true
  duration:       number?                         // seconds (display metadata per Snapshot Principle)

  // ── Display metadata (Snapshot Principle — informational, not engine input) ──
  castTime:       number?                         // seconds to cast
  range:          number?                         // ability range in meters
  aoeRadius:      number?                         // AoE radius in meters
  consumedOn:     string?                         // "next_attack" | "next_spell" — informational only

  // ── Classification tags ──
  //
  // Replaces boolean flags like `isSpirit`, `damageType: "curse"`.
  // Used by `disables[].filter` for constraint matching.
  //
  tags:           string[]?                       // ["spirit", "curse", etc.]

  // ── Activation ──
  //
  // Determines whether this ability appears in the Active Effects panel
  // and how it's toggled.
  //
  //   "passive"  — always active when selected (perks, aura-style)
  //   "toggle"   — user toggles on/off in Active Effects (buff spells, Phantomize)
  //   "cast"     — one-shot, not toggled (damage spells, heals)
  //
  // Perks default to "passive". Spells/skills with effects[] and duration
  // default to "toggle". Damage-only spells default to "cast".
  //
  activation:     "passive" | "toggle" | "cast"?

  // ── Ability-level condition ──
  //
  // Optional. When present, applies to ALL effects in this ability.
  // If an effect also has its own condition, both must be true (AND).
  // Primary use: transformations — all effects share the same form_active
  // condition, so specify it once here instead of repeating on every effect.
  //
  condition:      Condition?

  // ── Performance tiers (type: "music" only) ──
  //
  // Bard musics have three performance quality levels. The UI presents a tier
  // selector (poor/good/perfect). The engine reads the selected tier's data.
  // Each tier can have different effects, damage, duration, and healEffects.
  //
  // When present, REPLACES top-level effects/damage/duration for this ability.
  // Identity and cost fields (name, memoryCost, tags) stay at the top level.
  // UI defaults to showing "perfect" tier effects on the main stat sheet.
  //
  // Instrument type via tags: `tags: ["drum"]` — no separate field needed.
  //
  performanceTiers: {
    poor:    { effects?: Effect[], damage?: DamageSource[], healEffects?: HealEffect[],
               duration?: number, appliesStatus?: AppliedStatus[] }
    good:    { effects?: Effect[], damage?: DamageSource[], healEffects?: HealEffect[],
               duration?: number, appliesStatus?: AppliedStatus[] }
    perfect: { effects?: Effect[], damage?: DamageSource[], healEffects?: HealEffect[],
               duration?: number, appliesStatus?: AppliedStatus[] }
  }?

  // ── Merge components (type: "merged_spell" only) ──
  //
  // Sorcerer merged spells. Availability is DERIVED: the merged spell appears
  // automatically when BOTH component spells are equipped in spell memory.
  // No separate memoryCost — merged spells don't consume additional slots.
  // Cooldown = Math.max(component1.cooldown, component2.cooldown),
  // modified by cooldown perks (Mana Fold, Time Distortion, Spell Sculpting).
  //
  components:     [string, string]?               // [spellId, spellId]

  // ── Stat-modifying effects (THE CORE) ──
  //
  // Every stat modification from any source uses this shape.
  // The engine collects all active effects, evaluates conditions,
  // and routes each effect to the correct pipeline step by phase.
  //
  effects: [
    {
      stat:       string                          // key from STAT_META, "all_attributes", or a recipe bonus key
                                                  // For type_damage_bonus: always "typeDamageBonus" (sentinel — damageType carries the actual type)
      value:      number                          // static value (set to 0 when hpScaling is present)
      phase:      Phase                           // see Phase enum below
      target:     "self" | "enemy" | "party" | "nearby_allies" | "nearby_enemies"?
                                                  // default "self"
                                                  // Snapshot sim: "party"/"nearby_allies" treated as "self"
                                                  // (you are your own nearest ally). Distinction for display.
      condition:  Condition?                      // when this effect applies (omit = always)
      damageType: string?                         // for type_damage_bonus phase only — the actual damage type key
      healType:   "physical" | "magical"?         // for healing_modifier phase only — filter by heal type

      // ── HP-based continuous scaling (Barbarian Berserker, Sorcerer Elemental Fury) ──
      //
      // When present, replaces static `value` (set value to 0).
      // Engine: effectiveValue = floor((100 - hpPercent) / per) * valuePerStep
      // Capped at maxValue. UI provides a shared HP% slider.
      //
      hpScaling: {
        per:          number                      // "for every N% HP missing"
        valuePerStep: number                      // bonus per step
        maxValue:     number?                     // cap on total bonus
      }?
    }
  ]?

  // ── Stacking system ──
  //
  // For abilities that stack (Mana Flow, Combo Attack, Dark Offering,
  // Poisoned Weapon, Sprint Momentum, Arcane Feedback, Soul Collector).
  //
  // UI shows a stack count selector (0–maxStacks). A breakdown panel shows
  // each stack level. The engine multiplies perStack effects × selected count.
  //
  // triggerOn/consumedOn/duration are display metadata per Snapshot Principle.
  //
  stacking: {
    maxStacks:    number                          // UI: stack selector (0–max)
    perStack:     Effect[]                        // effects per single stack; engine multiplies × count
    triggerOn:    string?                         // display: what adds a stack (e.g., "spell_cast", "melee_hit", "kill")
    consumedOn:   string?                         // display: what resets/consumes stacks (e.g., "dark_spell_cast")
    duration:     number?                         // display: stack lifetime before decay
  }?

  // ── Damage sources (computed from derived stats, displayed as output) ──
  //
  // NOT stat modifications. These are output values computed using
  // derived stats (PPB, MPB, target DR, etc.) and displayed in the UI.
  // DoT damage goes here, not in effects[].
  //
  damage: [
    {
      base:       number                          // base damage value
      scaling:    number                          // power bonus scaling factor
      damageType: string                          // "dark_magical", "physical", etc.
      label:      string                          // UI label
      isDot:                boolean?              // damage over time
      isChannel:            boolean?              // channeled ability
      perBuff:              boolean?              // scales with buff count
      affectedByHitLocation: boolean?             // can headshot
      tickRate:             number?               // seconds per tick
    }
  ]?

  // ── Applied status effects ──
  //
  // Status effects applied to targets by this ability's damage or on-hit.
  // Compound debuffs (e.g., Frostbite = move speed + action speed loss).
  //
  // In the Target Editor, statuses are toggleable when the character has
  // equipped abilities that can apply them. Each ability carries its SPECIFIC
  // values — Frostbite from Water Bolt (-5% MS, -20% AS) differs from
  // Frostbite from Ice Spear (-20% MS, -20% AS).
  //
  // No global StatusEffect registry. The Target Editor collects all
  // appliesStatus entries from equipped abilities and presents them as toggles.
  //
  appliesStatus: [
    {
      type:       string                          // "burn" | "frostbite" | "wet" | "electrified"
                                                  // | "poison" | "bleed" | "silence"
      duration:   number?                         // display only (Snapshot Principle)
      damage:     DamageSource?                   // DoT component (burn, poison, bleed)
      effects:    Effect[]?                       // stat debuffs on target (frostbite: moveSpeed, actionSpeed)
      stackable:  boolean?                        // e.g., Poison stacks up to 5
      maxStacks:  number?                         // max stack count for stackable statuses
    }
  ]?

  // ── Healing sources ──
  //
  // Separate from effects[] because healing uses a fundamentally
  // different calculation (calcHealing) with its own parameters.
  //
  healEffects: [
    {
      label:        string
      baseHeal:     number
      scaling:      number
      healType:     "physical" | "magical"?
      isHoT:        boolean?
      baseDuration: number?                       // seconds, for HoT
      source:       string?                       // linked ability ID (impliedHealEffects)
      requiresBuff: string?                       // conditional: target must have this buff
      healRadius:   number?                       // AoE range
    }
  ]?

  // ── Triggered mechanics ──
  //
  // Event-driven effects: damage/heal/stat changes that fire when
  // a specific game event occurs. Currently display + future sim.
  //
  triggers: [
    {
      event:      "on_melee_hit"                  // attacker lands melee hit
                | "on_hit_received"               // defender is hit
                | "on_damage_taken"               // any damage received
                | "on_damage_dealt"               // caster deals damage (for heal-on-damage)
                | "on_heal_cast"                  // caster heals someone
                | "on_kill"                       // target dies
                | "on_shield_break"               // absorb shield expires
                | "on_curse_tick"                 // curse DoT ticks

      // ── What happens (at least one required) ──
      damage:     { damageType: string, base: number, scaling?: number, trueDamage?: boolean }?
      heal:       { baseHeal?: number, scaling?: number, healType?: string,
                    equalToDamage?: boolean,       // heals equal to damage dealt (Life Drain)
                    healRadius?: number }?          // AoE heal range (Dreamfire)
      effects:    Effect[]?                       // stat effects applied on trigger
      debuff:     { stat: string, value: number, duration: number }?
      stateChange: { [key: string]: any }?        // state transitions (e.g., { spiritual: true })

      // ── Constraints ──
      cooldown:   number?                         // internal CD (seconds)
      duration:   number?                         // how long trigger effects last
      condition:  Condition?
    }
  ]?

  // ── Constraints (what this ability restricts) ──
  //
  // Filter matching semantics:
  //   - Scalar values: equality (e.g., { tier: 1 } matches spells where tier === 1)
  //   - Array values: any-overlap / OR within key (e.g., { tags: ["spirit"] }
  //     matches any spell whose tags array includes "spirit")
  //   - Multiple keys: AND across keys (e.g., { tags: ["spirit"], tier: 1 }
  //     matches spells that are BOTH spirit-tagged AND tier 1)
  //   - Omit filter to match all abilities of that type
  //
  // Valid filter keys: any property on the target ability (tags, tier, etc.)
  //
  disables: [
    {
      type:   "transformation" | "spell"
      filter: { [key: string]: any }?
    }
  ]?

  // ── After-effect (penalty/debuff phase after ability expires) ──
  //
  // Generalized from form.wildSkill.afterEffect to all abilities.
  // Display metadata per Snapshot Principle — shown as a separate toggle
  // when the user wants to simulate the penalty phase.
  //
  // Example: Fighter Adrenaline Rush — main effect is +15% AS/+5% MS,
  // afterEffect is -8% AS/-4% MS for 2s. User toggles main ON to see
  // the buff, or toggles afterEffect ON to see the penalty.
  //
  afterEffect: {
    duration:     number                          // display only
    effects:      Effect[]
    removedBy:    string[]?                       // ability IDs that cancel the penalty
                                                  // (e.g., ["adrenaline_spike", "second_wind"])
  }?

  // ── Ability modifiers (perks that modify other abilities) ──
  //
  // Perks like Treacherous Lungs (+50% shout duration, -10% CD),
  // Cleric Requiem (+100% SCS on Resurrection), Bard Hide Mastery.
  // These modify specific abilities' display metadata or parameters.
  //
  abilityModifiers: [
    {
      target:     string | { tags: string[] }     // ability ID or tag filter
      modify:     string                          // "duration" | "cooldown" | "castTime" | "charges"
      value:      number                          // +0.50 = +50%, -0.10 = -10%
      mode:       "multiply" | "add"?             // default "multiply"
    }
  ]?

  // ── Grants ──
  grantsArmor:    string[]?                       // ["plate"] — Demon Armor
  grantsWeapon:   string[]?                       // ["spear"] — Ranger Spear Proficiency
  removesArmor:   string[]?                       // ["plate"] — Fighter Slayer

  // ── Passive flags (display-only, not computed by stat pipeline) ──
  //
  // ONLY for mechanics the simulator cannot compute and displays as text.
  // If a value feeds into any calculation, it belongs in effects[] instead.
  //
  passives: {
    [key: string]: any
  }?

  // ── Spell linking ──
  allyEffect:     string?                         // cast different ability on ally hit
  cc:             CrowdControl?                   // root/stun data

  // ── Shield / absorb ──
  //
  // Replaces flat `shieldAmount`. Supports scaling (Wizard Arcane Shield
  // 15(0.5)), damage type filtering, and on-break triggers (in triggers[]).
  //
  shield: {
    base:           number                        // base absorb value
    scaling:        number?                       // power bonus scaling (0.5 = 50% of MPB)
    damageFilter:   string?                       // "physical" | "magical" | null (all)
  }?

  // ── Summon ──
  summon:         Summon?                          // summoned creature data

  // ── Container (skill memory) ──
  slots:          { type: "spell" | "shapeshift" | "music", count: number }?

  // ── Transformation-specific ──
  form: {
    primitiveAttr:    string?                     // "str", "agi", etc.
    fixedAttackSpeed: boolean?
    passiveNotes:     string?
    attacks: [
      {
        id:                 string
        name:               string
        desc:               string
        primitiveMultiplier: number
        primitiveAdd:       number
        scaling:            number
        damageType:         string
        affectedByHitLocation: boolean?           // can headshot (form attacks)
        bleed:              { damage: number, scaling: number, duration: number, damageType: string }?
        plague:             { damage: number, scaling: number, duration: number, damageType: string }?
        armorPenetration:   { base: number, scaling: number }?
        frenziedEffect:     { [key: string]: any }?
      }
    ]
    wildSkill: {
      id:           string
      name:         string
      desc:         string
      duration:     number?
      effects:      Effect[]?                     // uses same { stat, value, phase } shape
      grantsFrenzy: boolean?
      heal:         { primitiveMultiplier: number, scaling: number }?
      condition:    Condition?                     // e.g., { type: "environment", env: "water" }
      afterEffect:  { duration: number, effects: Effect[] }?
    }?
  }?

  // ── Verification ──
  _unverified:    string?
}
```

### Phase enum

Phases are grouped by how the engine consumes them:

```
Phase =
  // ── Pipeline phases (processed in sequence by stat derivation) ──
  | "pre_curve_flat"          // Adds to attrs (core attributes) OR to recipe bonus keys
                              // (e.g., armorRating, maxHealthBonus, physicalPower).
                              // Consumed BEFORE computeDerivedStats runs.
  | "attribute_multiplier"    // Multiplies attribute values.
                              // stat: "all_attributes" → multiplies ALL 7 core attrs (Curse of Weakness).
                              // stat: "kno" (etc.) → multiplies SINGLE attribute (Wizard Sage +15%).
                              // Consumed BEFORE computeDerivedStats runs.
  | "post_curve"              // Flat addition to derived stat output.
                              // Consumed AFTER computeDerivedStats returns.
  | "multiplicative_layer"    // Separate multiplicative factor (e.g., Antimagic x0.80).
                              // Consumed AFTER post_curve, operates on capped value.

  // ── Formula inputs (collected and passed to calculation functions) ──
  | "type_damage_bonus"       // Per-damage-type % bonus. Requires damageType field.
                              // stat is always "typeDamageBonus" (sentinel); damageType carries the type key.
                              // Collected into a map keyed by damageType, passed to calcSpellDamage.
  | "healing_modifier"        // Multiplicative bonus to healing received.
                              // Collected and passed to calcHealing.
                              // Optional healType qualifier: if present, only applies
                              // to healing of that type ("physical" or "magical").
                              // If omitted, applies to all healing.

  // ── Pre-extracted metadata (extracted before pipeline, passed as config) ──
  | "cap_override"            // Modifies the cap ceiling for a specific stat.
                              // Value is the NEW cap (absolute), not a delta.
                              // Extracted before computeDerivedStats, passed as config.
                              // Conflict resolution: if multiple cap_override effects target
                              // the same stat, the highest value wins (Math.max).
                              // Currently one perk per stat cap in-game, but future-proofed.
```

**Key insight: `pre_curve_flat` serves double duty.** It adds to core attributes (str, vig, etc.) when the stat is in CORE_ATTRS, but it also adds to recipe bonus keys (armorRating, maxHealthBonus, physicalPower, etc.) when the stat is not a core attribute. The recipe registry knows which bonus keys are curve inputs vs. multipliers vs. flat additions — the phase doesn't need to distinguish these. See Section 5 for details.

**Explicit routing rule for `pre_curve_flat`:** When the effect pipeline collects `pre_curve_flat` effects: if `stat in CORE_ATTRS` (str, vig, agi, dex, wil, kno, res), add to `attrs[stat]`. Otherwise, add to `bonuses[stat]`. The recipe registry consumes bonus keys according to its own configuration (curve input, multiplier, or flat addition). The effect pipeline does not need to know which — it just routes.

**Removed from v1:** `damage_over_time` is NOT a phase. DoT is a damage source, not a stat modification. It belongs in `damage[]` with `isDot: true`.

### Condition shape

```
Condition =
  | { type: "form_active", form?: string }        // any form, or specific form
  | { type: "hp_below", threshold: number }       // HP < threshold %
  | { type: "effect_active", effectId: string }   // ability/buff is active in Active Effects panel
                                                  // Also used for "target has buff" scenarios —
                                                  // simulator approximates as "I've cast this buff"
  | { type: "environment", env: string }          // "water", etc.
  | { type: "frenzy_active" }                     // during frenzy state

  // ── v3 additions (10-class expansion) ──

  | { type: "weapon_type", weaponType: string }   // "axe" | "sword" | "dagger" | "bow" | "crossbow"
                                                  // | "staff" | "blunt" | "rapier" | "spear"
                                                  // | "two_handed" | "ranged" | "instrument" | "unarmed"
                                                  // Derived from equipped weapon. Barbarian, Bard, Cleric,
                                                  // Fighter, Ranger, Rogue, Wizard all use this.
  | { type: "dual_wield" }                        // weapons in both hands (Fighter Dual Wield, Slayer)
  | { type: "player_state", state: string }       // "hiding" | "crouching" | "blocking"
                                                  // | "defensive_stance" | "casting" | "reloading"
                                                  // | "bow_drawn" | "playing_music" | "drunk"
                                                  // | "dual_casting"
                                                  // Binary states the user toggles in a States panel.
                                                  // Engine checks: is the state toggled on?
  | { type: "equipment", slot: string,            // { slot: "chest", equipped: false }
      equipped: boolean }                         // Barbarian Savage: "while not wearing chest armor"
```

New condition _instances_ (new forms, new weapon types, new states, new environments) are just data. New structural _types_ (a fundamentally new category of game state) require a small, localized evaluator addition.

### Summon shape

```
Summon {
  type:             string                        // "hydra", "treant", "earth_elemental"
  duration:         number?                       // lifetime in seconds (display only)
  damage:           DamageSource[]?               // attack damage (same shape as ability damage[])
  environmentBonus: string?                       // "water" — bonus in this environment
  casterEffects:    Effect[]?                     // effects applied to CASTER while summon is active
                                                  // e.g., Earth Elemental: +50 armorRating
                                                  // Toggled with the summon — when summon is "active",
                                                  // casterEffects feed into the stat pipeline.
}
```

### CrowdControl shape

```
CrowdControl {
  type:           string                          // "root", "stun", "slow"
  duration:       number                          // CC duration
  areaRadius:     number?                         // AoE size
  areaDuration:   number?                         // how long area persists
  immunityAfter:  number?                         // immunity window after CC ends
}
```

---

## 4. Migration Map: Current Field → Unified Field

### Stat effects → `effects[]`

| Current | Unified | Notes |
|---|---|---|
| `perk.statEffects: [{ stat, value }]` | `effects: [{ stat, value, phase }]` | Must assign correct phase per stat — see Section 5 |
| `perk.typeDamageBonus: { type: val }` | `effects: [{ stat: "typeDamageBonus", value: val, phase: "type_damage_bonus", damageType: type }]` | One effect per damage type. `stat` is a sentinel — `damageType` carries the actual type |
| `perk.healingMod: 0.20` | `effects: [{ stat: "healingMod", value: 0.20, phase: "healing_modifier" }]` | Add `healingMod` to STAT_META |
| `perk.capOverrides: { pdr: 0.75 }` | `effects: [{ stat: "pdr", value: 0.75, phase: "cap_override" }]` | Value is the new cap, not delta |
| `perk.passiveEffects.antimagic` | `effects: [{ stat: "magicDamageTaken", value: 0.80, phase: "multiplicative_layer" }]` | Add `magicDamageTaken` to STAT_META |
| `perk.curseDurationBonus: 0.30` | `effects: [{ stat: "curseDurationBonus", value: 0.30, phase: "post_curve" }]` | Add `curseDurationBonus` to STAT_META |
| `perk.damageReduction: { undead: 0.40 }` | `effects: [{ stat: "undeadDamageReduction", value: 0.40, phase: "post_curve" }]` | Already in STAT_META |
| `perk.shapeshiftOnly` + `statEffects` | `effects: [{ ..., condition: { type: "form_active" } }]` | Flag removed, condition on each effect |
| `perk.passiveEffects.lowHpHealingBonus` | `effects: [{ stat: "healingMod", value: 1.0, phase: "healing_modifier", healType: "magical", condition: { type: "hp_below", threshold: 0.05 } }]` | Moved from passives — computable. `healType` preserves type-specific filtering |
| `perk.passiveEffects.healBonus: 1` | `effects: [{ stat: "healingAdd", value: 1, phase: "post_curve" }]` | Moved from passives — computable |
| `perk.passiveEffects.shapeshiftTimeReduction` | `effects: [{ stat: "shapeshiftCastTime", value: -0.25, phase: "post_curve" }]` | Moved from passives — computable. Add to STAT_META |
| `perk.passiveEffects.wildSkillCooldownReduction` | `effects: [{ stat: "wildSkillCooldown", value: -0.25, phase: "post_curve" }]` | Moved from passives — computable. Add to STAT_META |
| `spell.effects: [{ phase, stat, value }]` | `effects: [{ phase, stat, value }]` | Unchanged (already phase-aware) |
| `skill.effects: [{ phase, stat, value }]` | `effects: [{ phase, stat, value }]` | Unchanged (already phase-aware) |
| `transformation.statModifiers: [{ stat, value }]` | Ability-level `condition: { type: "form_active", form: id }` + `effects: [{ stat, value, phase }]` | Must assign correct phase — see Section 5. Condition on ability, not repeated per effect |
| `wildSkill.effects: [{ stat, value }]` | `form.wildSkill.effects: [{ stat, value, phase: "post_curve" }]` | Add phase annotation |
| `religion.effects: [{ stat, value, label }]` | `effects: [{ stat, value, phase }]` | Add phase per stat (see religion audit below), drop `label` (derive from STAT_META), retain `verification` on the blessing object |
| `spell.impliedHealEffects: [{ ..., source }]` | Merged into `healEffects: [{ ..., source }]` | `source` field means "from linked ability, show regardless of that ability's selection status" |
| `spell.healOnDamage: true` (Life Drain) | `triggers: [{ event: "on_damage_dealt", heal: { equalToDamage: true } }]` | `on_damage_dealt` event + `equalToDamage` flag on heal |
| `spell.healOnDamage: { baseHeal, scaling, requiresBuff, healRadius }` (Dreamfire) | `triggers: [{ event: "on_damage_dealt", heal: { baseHeal, scaling, healRadius }, condition: { type: "effect_active", effectId: requiresBuff } }]` | `requiresBuff` becomes a condition; `healRadius` moves to heal shape |

### `isPercent` elimination

Two current effects use `isPercent: true` — both on `moveSpeed`:
- Phantomize: `{ stat: "moveSpeed", value: 0.05, isPercent: true }` → `{ stat: "moveSpeedBonus", value: 0.05, phase: "post_curve" }`
- Evil Eye: `{ stat: "moveSpeed", value: -0.40, isPercent: true }` → `{ stat: "moveSpeedBonus", value: -0.40, phase: "post_curve", target: "enemy" }`

`moveSpeedBonus` already exists in STAT_META and is already used by transformation statModifiers (druid.js). The `isPercent` flag is eliminated entirely. Action speed values (Evil Eye's `-0.40`) are already in percentage terms per STAT_META — no special handling needed.

### DoT migration

`DAMAGE_OVER_TIME` is removed as an effect phase. DoT entries in spell `effects[]` become `damage[]` entries:

| Current | Unified |
|---|---|
| `effects: [{ phase: DAMAGE_OVER_TIME, damageType: "evil_magical", damagePerSecond: 3 }]` | `damage: [{ base: 3, scaling: 0, damageType: "evil_magical", label: "DoT/sec", isDot: true }]` |

### Triggered mechanics → `triggers[]`

| Current | Unified |
|---|---|
| `perk.onHitEffects: [{ damageType, damage }]` | `triggers: [{ event: "on_melee_hit", damage: { damageType, base: damage } }]` |
| `perk.onHitReceived: [{ damageType, base, scaling }]` (warlock) | `triggers: [{ event: "on_hit_received", damage: { damageType, base, scaling } }]` |
| `perk.onHitReceived: [{ damageType, damage, trueDamage }]` (druid) | `triggers: [{ event: "on_hit_received", damage: { damageType, base: damage, trueDamage: true } }]` |
| `perk.healOnHit: { baseHeal, scaling, healType, trigger }` | `triggers: [{ event: "on_melee_hit", heal: { baseHeal, scaling, healType } }]` |
| `perk.healOnCurseTick: { baseHeal, scaling, healType }` | `triggers: [{ event: "on_curse_tick", heal: { baseHeal, scaling, healType } }]` |
| `perk.passiveEffects.onDamageTaken` (with `becomesSpiritual`) | `triggers: [{ event: "on_damage_taken", effects: [...], duration, cooldown, stateChange: { spiritual: true } }]` |
| `perk.passiveEffects.onHeal: { stat, value, duration }` | `triggers: [{ event: "on_heal_cast", effects: [{ stat, value, phase: "post_curve" }], duration }]` |
| `perk.passiveEffects.darknessShardOnKill` | `triggers: [{ event: "on_kill" }]` (display-only) |
| `spell.onBreak: { duration, effects }` | `triggers: [{ event: "on_shield_break", effects, duration }]` |
| `skill.debuffOnHit: { stat, value, duration }` | `triggers: [{ event: "on_melee_hit", debuff: { stat, value, duration } }]` |

### Constraints → `disables[]`

| Current | Unified |
|---|---|
| `perk.disablesShapeshift: true` | `disables: [{ type: "transformation" }]` |
| `perk.disablesSpiritSpells: true` | `disables: [{ type: "spell", filter: { tags: ["spirit"] } }]` |

Filter matching: scalar values use equality, array values use any-overlap (OR within key), multiple keys use AND. `{ tags: ["spirit"] }` matches any spell whose `tags` array includes `"spirit"`. This replaces the old `isSpirit` boolean. See Section 3 for full semantics.

### Passive flags → `passives{}`

**Only truly display-only mechanics belong here.** If a value feeds into any calculation, it's an `effects[]` entry instead.

| Current | Unified | Why it stays |
|---|---|---|
| `passiveEffects.spellsCannotKill` | `passives: { spellsCannotKill: true }` | Game mechanic, not a stat |
| `passiveEffects.phasethrough` | `passives: { phasethrough: true }` | Game mechanic, not a stat |
| `passiveEffects.partyDamageShare` | `passives: { partyDamageShare: { percent, maxDamage, interval } }` | Complex mechanic, display-only for now |

**Moved OUT of passives (v1 → v2 change):**
- `lowHpHealingBonus` → `effects[]` with `condition: { type: "hp_below" }` (computable)
- `healBonus` → `effects[]` as `{ stat: "healingAdd" }` (computable)
- `shapeshiftTimeReduction` → `effects[]` as `{ stat: "shapeshiftCastTime" }` (computable)
- `wildSkillCooldownReduction` → `effects[]` as `{ stat: "wildSkillCooldown" }` (computable)

### v3 additions: Conditions, stacking, HP-scaling, status effects, cost models, shield, equipment

| Current (CSV description) | Unified | Notes |
|---|---|---|
| Perk "while using axes" | `condition: { type: "weapon_type", weaponType: "axe" }` | Ability-level condition |
| Perk "while using a dagger" | `condition: { type: "weapon_type", weaponType: "dagger" }` | Ability-level condition |
| Perk "while using a ranged weapon" | `condition: { type: "weapon_type", weaponType: "ranged" }` | Category, not specific weapon |
| Perk "when casting with bare hands" | `condition: { type: "weapon_type", weaponType: "unarmed" }` | Derived from equipped weapon |
| Perk "while in defensive stance" | `condition: { type: "player_state", state: "defensive_stance" }` | User toggle in States panel |
| Perk "while hiding" | `condition: { type: "player_state", state: "hiding" }` | User toggle |
| Perk "while casting two spells simultaneously" | `condition: { type: "player_state", state: "dual_casting" }` | Sorcerer-specific toggle |
| Perk "while not wearing chest armor" | `condition: { type: "equipment", slot: "chest", equipped: false }` | Equipment condition |
| Perk "weapons in both hands" | `condition: { type: "dual_wield" }` | Fighter Dual Wield, Slayer |
| Warlock Malice "+15% will bonus" | `effects: [{ stat: "wil", value: 0.15, phase: "attribute_multiplier" }]` | Per-attribute multiplier |
| Wizard Sage "+15% knowledge bonus" | `effects: [{ stat: "kno", value: 0.15, phase: "attribute_multiplier" }]` | Per-attribute multiplier |
| Fighter Defense Mastery "+15% AR from armor" | `effects: [{ stat: "armorRatingMultiplier", value: 0.15, phase: "pre_curve_flat" }]` | Multiplicative on gear AR |
| Wizard Spell Overload "+60% charges" | `effects: [{ stat: "spellChargeMultiplier", value: 0.60, phase: "post_curve" }]` | Display metadata |
| `grantsArmor: ["plate"]` | `grantsArmor: ["plate"]` | Unchanged |
| Ranger Spear Proficiency | `grantsWeapon: ["spear"]` | New field |
| Fighter Slayer "-plate" | `removesArmor: ["plate"]` | New field |
| `shieldAmount: 15` | `shield: { base: 15 }` | Structured shield shape |
| Wizard Arcane Shield "15(0.5)" | `shield: { base: 15, scaling: 0.5 }` | Scaling shield |
| Cleric Protection "blocks 20 physical" | `shield: { base: 20, damageFilter: "physical" }` | Type-filtered shield |
| Sorcerer spell with cooldown cost | `cost: { type: "cooldown", value: 12 }` | New cost type |
| Barbarian Berserker "per 10% HP missing" | `effects: [{ ..., hpScaling: { per: 10, valuePerStep: 0.02, maxValue: 0.20 } }]` | HP-scaling on effect |
| Warlock Soul Collector stacking | `stacking: { maxStacks: 3, perStack: [...], consumedOn: "dark_spell_cast" }` | Stacking system |
| Spell applying Frostbite | `appliesStatus: [{ type: "frostbite", duration: 2, effects: [...] }]` | Status effect |
| Spell applying Burn | `appliesStatus: [{ type: "burn", duration: 3, damage: { base: 3, scaling: 0.5, damageType: "fire_magical" } }]` | Status with DoT |

### v3 additions: Music migration

| Current (Bard CSV) | Unified | Notes |
|---|---|---|
| Music with poor/good/perfect tiers | `type: "music"`, `performanceTiers: { poor: {...}, good: {...}, perfect: {...} }` | Effects/damage/duration per tier |
| Music Memory skill | `type: "skill"`, `slots: { type: "music", count: 5 }` | Music slot container |
| Music memoryCost | `memoryCost: 3` | Same pool as spells — shared KNO-based capacity |

### v3 additions: Merged spell migration

| Current (Sorcerer CSV) | Unified | Notes |
|---|---|---|
| Merged spell from Spell1 + Spell2 | `type: "merged_spell"`, `components: [spell1Id, spell2Id]` | Availability derived from equipped spells |
| Merged spell cooldown | Computed: `Math.max(component1.cooldown, component2.cooldown)` | Modified by cooldown perks |
| Merged spell cost | None — no separate memoryCost or cooldown | Consumes component spells |

### v3 additions: Ability modifiers + after-effects

| Current | Unified | Notes |
|---|---|---|
| Barbarian Treacherous Lungs "+50% shout duration" | `abilityModifiers: [{ target: { tags: ["shout"] }, modify: "duration", value: 0.50 }]` | Cross-ability modification |
| Bard Hide Mastery "+1.5x Hide duration, -30s CD" | `abilityModifiers: [{ target: "hide", modify: "duration", value: 0.50 }, { target: "hide", modify: "cooldown", value: -30, mode: "add" }]` | Multiple modifications |
| Fighter Adrenaline Rush penalty | `afterEffect: { duration: 2, effects: [...], removedBy: ["adrenaline_spike", "second_wind"] }` | Generalized from wild skills |

---

## 5. Phase Assignment Guide

### Decision tree

```
Is it a core attribute or a stat that feeds INTO a curve as input?
  (str, vig, agi, dex, wil, kno, res,
   armorRating, physicalPower, magicalPower, magicResistance)
  → pre_curve_flat

Is it a recipe multiplier key?
  (maxHealthBonus — multiplies health curve output,
   memoryCapacityBonus — multiplies memory curve output)
  → pre_curve_flat (the recipe knows it's a multiplier, not an input)

Is it a multiplicative attribute modifier?
  (Curse of Weakness -25% all_attributes,
   Wizard Sage +15% kno, Warlock Malice +15% wil)
  → attribute_multiplier
  (stat: "all_attributes" for all, or a specific CORE_ATTR key for one)

Is it a percentage bonus to armor rating from equipped armor?
  (Fighter Defense Mastery +15% AR from armor)
  → pre_curve_flat (stat: "armorRatingMultiplier"; the engine applies
    gearAR × (1 + value) before the PDR curve runs)

Is it the new cap ceiling for a stat?
  (Defense Mastery PDR cap = 0.75)
  → cap_override

Is it a per-damage-type bonus?
  (Dark Enhancement +20% dark_magical)
  → type_damage_bonus (with damageType field)

Is it a healing multiplier?
  (Vampirism +20% healing)
  → healing_modifier

Is it a separate multiplicative damage reduction layer?
  (Antimagic x0.80)
  → multiplicative_layer

Everything else (flat addition to a derived stat after curve):
  → post_curve
```

### `maxHealthBonus` — RESOLVED (Option C)

All `maxHealthBonus` sources (gear, transformation, spell buff) are summed into `bonuses.maxHealthBonus` before `computeDerivedStats` runs.

**Verified health formula** (see `docs/health_formula.md` for full spec with 22 test points):
```
healthRating = STR × 0.25 + VIG × 0.75
baseHealth = evaluate(healthCurve, healthRating)

if sumMHB = 0:  finalHP = ceil(baseHealth) + PATCH_BONUS + sumMHA
if sumMHB > 0:  finalHP = floor(baseHealth × (1 + sumMHB)) + PATCH_BONUS + sumMHA
```

Key details:
- **Conditional rounding**: `ceil` when no MHB, `floor` when MHB > 0
- **+10 patch bonus** (Hotfix 112): added AFTER rounding, never scaled by MHB%
- **MHA** (flat Max Health Add): added AFTER rounding, never scaled by MHB%
- **Robust perk**: internally 7.5%, not 8% as tooltip states (verified 16 test points)

This works because:
- Gear MHB already flows into `bonuses` via `aggregateGear` — no change needed
- The `pre_curve_flat` phase routes non-CORE_ATTR stats into `bonuses` — MHB from abilities lands in `bonuses.maxHealthBonus` naturally
- The recipe registry's `multiplierBonuses: ["maxHealthBonus"]` consumes it
- The recipe handles conditional rounding internally
- Active buff toggling gates whether the effect is collected — Mending Grove's MHB only enters `bonuses` when the buff is active

All `maxHealthBonus` effects use **phase `"pre_curve_flat"`**, regardless of source.

### `spellCastingSpeed` — RESOLVED

Currently reads from `perkEffects` (derived-stats.js line 65), not `bonuses`. In the unified model, Demon Armor's `-0.10` becomes `{ stat: "spellCastingSpeed", value: -0.10, phase: "post_curve" }` — a flat addition to the derived stat AFTER the curve runs. Gear-sourced spell casting speed bonuses are also post-curve flat additions, routed through the recipe's `gearBonuses: ["spellCastingSpeed"]`. Both gear and ability effects end up as flat additions on the same final stat — no distinction needed. The current special routing through `perkEffects` is eliminated.

### Religion blessing phase audit

All religion effects are `post_curve` flat additions:

| Blessing | Stat | Phase | Reasoning |
|---|---|---|---|
| Noxulon | `regularInteractionSpeed` | `post_curve` | Flat addition after curve |
| Blythar | `luck` | `post_curve` | Purely from bonuses, no curve |
| Solaris | `cooldownReductionBonus` | `post_curve` | Flat addition after CDR curve (derived-stats.js line 61: `evaluateCurve(...) + bonuses.cooldownReductionBonus`) |
| Zorin | `magicPenetration` | `post_curve` | Purely from bonuses, no curve |

### Class-level constraints — scope note

The class-level shape (`maxPerks`, `maxSkills`, `spellCostType`, `equippableArmor`, `majorDerivedStats`, `baseStats`) is defined in `unified_abilities_plan.md` Section 1 as the `constraints` config on `defineClass()`. This document covers the per-ability unified shape only. Class-level fields stay as-is or follow the plan's `constraints` pattern.

### Wild skill effect scoping rule

Wild skill effects (`form.wildSkill.effects[]`) are implicitly gated by the wild skill's activation state. No explicit `condition` is needed on individual effects — the pipeline only collects them when the wild skill is toggled on. This is analogous to how spell buff effects are only collected when `activeBuffs[id]` is true.

### `isPercent` — RESOLVED (eliminated)

The two uses of `isPercent: true` (Phantomize `moveSpeed +0.05`, Evil Eye `moveSpeed -0.40`) are rewritten to use `stat: "moveSpeedBonus"` instead. `moveSpeedBonus` already exists in STAT_META and is used by transformations. No `isPercent` flag needed anywhere. Action speed values are already percentage-denominated per STAT_META.

### Transformation stat phase assignments (all resolved)

| Stat | Phase | Reasoning |
|---|---|---|
| `maxHealthBonus` | `pre_curve_flat` | Recipe multiplier key (see above) |
| `physicalDamageReduction` | `post_curve` | Flat addition after PDR curve |
| `magicalDamageReduction` | `post_curve` | Flat addition after MDR curve |
| `projectileDamageReduction` | `post_curve` | Flat addition, no curve |
| `moveSpeed` | `post_curve` | Flat units added to final move speed |
| `moveSpeedBonus` | `post_curve` | Percentage modifier on move speed |
| `actionSpeed` | `post_curve` | Percentage added to final action speed |
| `jumpHeight` | `post_curve` | Flat/percentage addition, no curve |
| `incomingPhysicalHealing` | `post_curve` | Healing modifier, no curve |
| `incomingMagicalHealing` | `post_curve` | Healing modifier, no curve |
| `maxHealth` (rat wild skill) | `post_curve` | Flat HP addition (NOT the same as maxHealthBonus) |

### Stat names that need adding to STAT_META

| Stat key | Unit | Category | Purpose |
|---|---|---|---|
| `healingMod` | percent | utility | Multiplicative healing bonus |
| `healingAdd` | flat | utility | Flat healing addition |
| `magicDamageTaken` | percent | defense | Multiplicative magic damage factor |
| `curseDurationBonus` | percent | utility | Curse duration extension |
| `shapeshiftCastTime` | percent | utility | Shapeshift cast speed modifier |
| `wildSkillCooldown` | percent | utility | Wild skill cooldown modifier |
| `recoverableHealth` | flat | defense | Recoverable HP (Nature's Touch, Tree of Life) |
| `typeDamageBonus` | percent | offense | Sentinel stat for `type_damage_bonus` phase effects. Not displayed directly — `damageType` field carries the actual type. Exists for uniform validation (every effect's `stat` is a STAT_META key) |
| `buffWeaponDamage` | flat | offense | Weapon damage bonus from buffs (Bloodstained Blade). Consumed by `calcPhysicalMeleeDamage`, not by a curve. Phase: `pre_curve_flat` (collected into bonuses, passed to damage calc) |
| `additionalWeaponDamage` | flat | offense | Weapon damage bonus from perks (Axe Specialization +3, Sword Mastery +2). Conditional on weapon type. Phase: `post_curve` |
| `headshotPower` | percent | offense | Headshot damage multiplier (Barbarian Executioner +20%, Ranger Sharpshooter +15%) |
| `backstabPower` | percent | offense | Backstab damage multiplier (Rogue Back Attack +30%) |
| `armorPenetration` | percent | offense | Armor penetration bonus (Rogue Thrust +20%, Barbarian Two-Hander +10%) |
| `headPenetration` | percent | offense | Headshot penetration (Ranger Penetrating Shot +50%) |
| `impactPower` | flat | offense | Impact power bonus (Barbarian Crush +1, Savage +1) |
| `impactResistance` | flat | defense | Impact resistance (Fighter Perfect Block +5) |
| `armorRatingMultiplier` | percent | defense | Multiplies AR from equipped armor (Fighter Defense Mastery +15%). Engine applies as `gearAR × (1 + value)` before PDR curve. Phase: `pre_curve_flat` |
| `spellChargeMultiplier` | percent | utility | Multiplies spell charge counts (Wizard Spell Overload +60%). Display metadata — engine shows modified charge count |
| `spellCooldownMultiplier` | percent | utility | Multiplies spell cooldowns (Sorcerer Mana Fold -25%, Spell Sculpting +25%, Time Distortion +200%). Applied to base cooldown values |
| `flatDamageReduction` | flat | defense | Flat damage reduction from all sources (Cleric Perseverance -2 per hit) |
| `drawSpeed` | percent | utility | Bow draw speed modifier (Ranger Nimble Hands +15%) |

### v3 resolved: `attribute_multiplier` per individual attribute

When `stat` is a single CORE_ATTR key (e.g., "kno"), the multiplier applies only to that attribute: `attrs[stat] *= (1 + value)`. When `stat` is "all_attributes", it applies to all 7. The engine evaluates `attribute_multiplier` effects: if `stat in CORE_ATTRS`, multiply `attrs[stat]`; if `stat === "all_attributes"`, multiply all. This is a minor extension to the existing handler — first instance requires the per-attribute branch, then all subsequent percentage attribute bonuses are data-only.

### v3 resolved: `armorRatingMultiplier`

Fighter Defense Mastery adds 15% to armor rating from equipped armor. This is NOT a flat addition to PDR. The engine reads `bonuses.armorRatingMultiplier`, applies it as `gearAR × (1 + multiplier)`, then the total AR feeds the PDR curve. Phase: `pre_curve_flat` (collected into bonuses). First instance requires the engine to read and apply this multiplier to gear-sourced AR; subsequent abilities using this pattern are data-only.

### v3 resolved: `spellChargeMultiplier`

Wizard Spell Overload: `{ stat: "spellChargeMultiplier", value: 0.60, phase: "post_curve" }`. Different from `spellCostMultiplier` (Warlock Torture Mastery doubles health cost per cast). `spellChargeMultiplier` multiplies the total available cast count (e.g., 4 charges → 6.4 → floor to 6). This is display metadata — the engine computes and displays the modified charge count for each spell.

---

## 6. Data-Driven Litmus Test

For each mechanic type: "Could a new class add a similar ability with data only?"

### Fully data-driven (no code changes)

| Mechanic | Example |
|---|---|
| Pre-curve stat buff | New perk giving +10 STR |
| Post-curve stat buff | New perk giving +5% PDR |
| Attribute multiplier | New debuff reducing all attributes |
| Cap override | New perk raising MDR cap |
| Type damage bonus | New perk giving +15% fire damage |
| Healing modifier | New perk giving +30% healing |
| Multiplicative DR layer | New ability with x0.90 physical DR |
| Conditional effect | New form-only perk with condition |
| On-hit damage trigger | New perk dealing frost on hit |
| On-hit-received trigger | New perk reflecting true damage |
| Shield + on-break | New spell with shield and break effects |
| Transformation + attacks | New form with different attacks |
| Wild skill + afterEffect | New form skill with aftermath |
| Grants armor type | New perk unlocking a new armor class |
| Weapon-type conditional | New perk: "+5% damage while using maces" |
| Player-state conditional | New perk: "+10% move speed while crouching" |
| Equipment conditional | New perk: "+5 STR while not wearing helm" |
| Dual-wield conditional | New perk: "+10% AS while dual wielding" |
| Per-attribute multiplier | New perk: "+10% STR" (attribute_multiplier phase) |
| Stacking effect | New perk: "+5% damage per hit, max 4 stacks" (stacking system) |
| HP-scaling effect | New perk: "+2% damage per 10% HP missing" (hpScaling on effect) |
| Status effect application | New spell dealing ice damage with Frostbite (appliesStatus) |
| Music with performance tiers | New Bard song with poor/good/perfect effects |
| Merged spell | New Sorcerer combo from two base spells |
| Party-targeted buff | New ability granting +3 all attrs to nearby allies |
| Scaling shield | New spell absorbing 20(0.75) damage (shield with scaling) |
| Ability with afterEffect | New skill: +15% AS for 8s, then -8% for 2s |
| Grants weapon type | New perk unlocking a weapon class |
| Removes armor type | New perk restricting an armor class |

### Require small engine addition (first instance only)

| Mechanic | What's needed | After that |
|---|---|---|
| Spell-linking (`allyEffect`) | Engine code to resolve ability references and render combined output | Data-only |
| State transitions (`stateChange`) | `stateChange` field evaluation in trigger handler | Data-only |
| `spellCostMultiplier` | Engine code to read and apply cost multiplier from active perks | Data-only |
| Frenzy conditional effects | `frenzy_active` condition type in evaluator | Data-only |
| `on_damage_dealt` trigger (complex) | Handler for `on_damage_dealt` event with `equalToDamage`, `healRadius`, conditions | Data-only for similar patterns |
| Performance tier selector | UI component for poor/good/perfect selection + engine reads selected tier | Data-only |
| Merged spell availability | Derivation logic: available when both components equipped | Data-only |
| Stack count selector | UI component for 0–N stack selection + engine multiplies perStack × count | Data-only |
| HP% slider | UI component + engine integration for hpScaling computation | Data-only |
| Status effect toggles in Target Editor | Status panel with toggleable debuffs derived from equipped abilities | Data-only |
| `armorRatingMultiplier` | Engine reads multiplier, applies to gear-sourced AR before curve | Data-only |
| `spellChargeMultiplier` | Engine displays modified charge counts | Data-only |
| `afterEffect` toggle | UI shows afterEffect as separate toggle when relevant | Data-only |
| `abilityModifiers` | Engine applies cross-ability modifications to display values | Data-only |
| `casterEffects` on summon | Engine collects caster effects when summon is active | Data-only |

---

## 7. Migration Examples

### Warlock: Demon Armor (perk with stat effect + armor grant)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "demon_armor",                            id: "demon_armor",
  name: "Demon Armor",                          type: "perk",
  desc: "...",                                   name: "Demon Armor",
  statEffects: [                                 desc: "...",
    { stat: "spellCastingSpeed",                 effects: [
      value: -0.10 }                               { stat: "spellCastingSpeed",
  ],                                                 value: -0.10,
  grantsArmor: ["plate"],                            phase: "post_curve" },
}                                                ],
                                                 grantsArmor: ["plate"],
                                               }
```

### Druid: Enhanced Wildness (form-conditional effects at different phases)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "enhanced_wildness",                      id: "enhanced_wildness",
  shapeshiftOnly: true,                         type: "perk",
  statEffects: [                                name: "Enhanced Wildness",
    { stat: "physicalDamageBonus",               desc: "...",
      value: 0.05 },                             condition: { type: "form_active" },
    { stat: "armorRating",                         effects: [
      value: 20 },                                   { stat: "armorRating", value: 20,
  ],                                                   phase: "pre_curve_flat" },
}                                                  { stat: "physicalDamageBonus", value: 0.05,
                                                     phase: "post_curve" },
                                                 ],
                                               }
// armorRating = pre_curve_flat (feeds PDR curve)
// physicalDamageBonus = post_curve (flat % after PPB curve)
```

### Warlock: Power of Sacrifice (spell with self-buff + DoT damage)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "power_of_sacrifice",                    id: "power_of_sacrifice",
  tier: 1, memoryCost: 1,                      type: "spell",
  healthCost: 4,                                name: "Power of Sacrifice",
  targeting: ENEMY_OR_SELF,                     desc: "...",
  duration: 12,                                 tier: 1, memoryCost: 1,
  effects: [                                    cost: { type: "health", value: 4 },
    { phase: PRE_CURVE_FLAT,                    targeting: "enemy_or_self",
      stat: "str", value: 15 },                 duration: 12,
    { phase: PRE_CURVE_FLAT,                    activation: "toggle",
      stat: "vig", value: 15 },                 effects: [
    { phase: DAMAGE_OVER_TIME,                    { stat: "str", value: 15,
      damageType: "evil_magical",                   phase: "pre_curve_flat",
      damagePerSecond: 3 },                         target: "self" },
  ],                                              { stat: "vig", value: 15,
}                                                   phase: "pre_curve_flat",
                                                    target: "self" },
                                                ],
                                                damage: [
                                                  { base: 3, scaling: 0,
                                                    damageType: "evil_magical",
                                                    label: "DoT/sec", isDot: true },
                                                ],
                                               }
// DoT moved from effects[] to damage[]
```

### Warlock: Shadow Touch (on-hit damage + on-hit heal)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "shadow_touch",                           id: "shadow_touch",
  onHitEffects: [                               type: "perk",
    { damageType: "dark_magical",               name: "Shadow Touch",
      damage: 2 }                               desc: "...",
  ],                                            triggers: [
  healOnHit: {                                    { event: "on_melee_hit",
    baseHeal: 2, scaling: 0,                        damage: { damageType: "dark_magical",
    healType: "magical",                                      base: 2 } },
    trigger: "melee_hit"                          { event: "on_melee_hit",
  },                                                heal: { baseHeal: 2, scaling: 0,
}                                                           healType: "magical" } },
                                                ],
                                               }
```

### Druid: Thorn Coat (true damage on hit received)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "thorn_coat",                             id: "thorn_coat",
  onHitReceived: [                              type: "perk",
    { damageType: "true_physical",              name: "Thorn Coat",
      damage: 5,                                desc: "...",
      trueDamage: true }                        triggers: [
  ],                                              { event: "on_hit_received",
}                                                   damage: { damageType: "true_physical",
                                                              base: 5,
                                                              trueDamage: true } },
                                                ],
                                               }
```

### Warlock: Dark Reflection (scaled counter-damage on hit received)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "dark_reflection",                        id: "dark_reflection",
  onHitReceived: [                              type: "perk",
    { damageType: "dark_magical",               name: "Dark Reflection",
      base: 15,                                 desc: "...",
      scaling: 0.75 }                           triggers: [
  ],                                              { event: "on_hit_received",
}                                                   damage: { damageType: "dark_magical",
                                                              base: 15,
                                                              scaling: 0.75 } },
                                                ],
                                               }
```

### Warlock: Immortal Lament (conditional healing bonus + passive flag)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "immortal_lament",                        id: "immortal_lament",
  passiveEffects: {                             type: "perk",
    spellsCannotKill: true,                     name: "Immortal Lament",
    lowHpHealingBonus: {                        desc: "...",
      threshold: 0.05,                          effects: [
      bonus: 1.0,                                 { stat: "healingMod", value: 1.0,
      healType: "magical"                            phase: "healing_modifier",
    }                                                healType: "magical",
  },                                                 condition: { type: "hp_below",
}                                                                 threshold: 0.05 } },
                                                ],
                                                passives: { spellsCannotKill: true },
                                               }
```

### Warlock: Antimagic (multiplicative damage layer)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "antimagic",                              id: "antimagic",
  passiveEffects: {                             type: "perk",
    antimagic: true                             name: "Antimagic",
  },                                            desc: "...",
}                                               effects: [
                                                  { stat: "magicDamageTaken", value: 0.80,
                                                    phase: "multiplicative_layer" },
                                                ],
                                               }
// 0.80 = multiply magic damage taken by 80% (20% reduction)
// COMBAT.ANTIMAGIC_REDUCTION constant becomes data
```

### Warlock: Dark Enhancement (type damage bonus)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "dark_enhancement",                       id: "dark_enhancement",
  typeDamageBonus: {                            type: "perk",
    dark_magical: 0.20                          name: "Dark Enhancement",
  },                                            desc: "...",
}                                               effects: [
                                                  { stat: "typeDamageBonus", value: 0.20,
                                                    phase: "type_damage_bonus",
                                                    damageType: "dark_magical" },
                                                ],
                                               }
```

### Fighter: Defense Mastery (cap override + AR multiplier)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "defense_mastery",                        id: "defense_mastery",
  capOverrides: { pdr: 0.75 },                  type: "perk",
}                                               name: "Defense Mastery",
                                                desc: "+15% AR from armor. PDR cap 75%.",
                                                effects: [
                                                  { stat: "armorRatingMultiplier", value: 0.15,
                                                    phase: "pre_curve_flat" },
                                                  { stat: "pdr", value: 0.75,
                                                    phase: "cap_override" },
                                                ],
                                               }
// v3 update: added armorRatingMultiplier (15% bonus to gear-sourced AR).
// The v2 example only had the cap_override — the AR bonus was missing.
```

### Druid: Dreamwalk (triggered effect with state change)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "dreamwalk",                              id: "dreamwalk",
  passiveEffects: {                             type: "perk",
    onDamageTaken: {                            name: "Dreamwalk",
      stat: "magicalPower",                     desc: "...",
      value: 5,                                 triggers: [
      duration: 2,                                { event: "on_damage_taken",
      cooldown: 18,                                 effects: [
      becomesSpiritual: true                           { stat: "magicalPower", value: 5,
    }                                                    phase: "pre_curve_flat" }
  },                                               ],
}                                                  duration: 2,
                                                   cooldown: 18,
                                                   stateChange: { spiritual: true } },
                                                ],
                                               }
// magicalPower feeds into the MPB curve → pre_curve_flat per decision tree.
// Trigger effects with phases are aspirational — currently display-only.
// When the sim models real-time effects, the pipeline will re-run with
// triggered effects included. Use the correct phase now so it's ready.
```

### Druid: Lifebloom Aura (computable heal effect + constraint)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "lifebloom_aura",                         id: "lifebloom_aura",
  disablesShapeshift: true,                     type: "perk",
  passiveEffects: {                             name: "Lifebloom Aura",
    healBonus: 1                                desc: "...",
  },                                            effects: [
}                                                 { stat: "healingAdd", value: 1,
                                                    phase: "post_curve" },
                                                ],
                                                disables: [
                                                  { type: "transformation" },
                                                ],
                                               }
```

### Druid: Shapeshift Mastery (computable effects + constraint)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "shapeshift_mastery",                     id: "shapeshift_mastery",
  disablesSpiritSpells: true,                   type: "perk",
  passiveEffects: {                             name: "Shapeshift Mastery",
    shapeshiftTimeReduction: 0.25,              desc: "...",
    wildSkillCooldownReduction: 0.25            effects: [
  },                                              { stat: "shapeshiftCastTime", value: -0.25,
}                                                   phase: "post_curve" },
                                                  { stat: "wildSkillCooldown", value: -0.25,
                                                    phase: "post_curve" },
                                                ],
                                                disables: [
                                                  { type: "spell",
                                                    filter: { tags: ["spirit"] } },
                                                ],
                                               }
```

### Bear Transformation (form with stat mods + attacks + wild skill)

```js
// UNIFIED
{
  id: "bear",
  type: "transformation",
  name: "Bear",
  // Ability-level condition: applies to ALL effects below.
  // No need to repeat on each effect.
  condition: { type: "form_active", form: "bear" },
  effects: [
    { stat: "maxHealthBonus", value: 0.50, phase: "pre_curve_flat" },
    { stat: "physicalDamageReduction", value: 0.50, phase: "post_curve" },
    { stat: "projectileDamageReduction", value: 0.10, phase: "post_curve" },
    { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve" },
    { stat: "actionSpeed", value: -0.30, phase: "post_curve" },
    { stat: "jumpHeight", value: -0.30, phase: "post_curve" },
  ],
  form: {
    primitiveAttr: "str",
    attacks: [
      { id: "swipe", name: "Swipe", desc: "...",
        primitiveMultiplier: 1.0, primitiveAdd: 27,
        scaling: 1.0, damageType: "physical" },
      { id: "bash", name: "Bash", desc: "...",
        primitiveMultiplier: 1.0, primitiveAdd: 41,
        scaling: 1.0, damageType: "physical" },
    ],
    wildSkill: {
      id: "wild_fury",
      name: "Wild Fury",
      desc: "...",
      duration: 8,
      // Wild skill effects are implicitly gated by the wild skill's
      // activation state — no explicit condition needed.
      effects: [
        { stat: "physicalDamageReduction", value: 0.20, phase: "post_curve" },
        { stat: "magicalDamageReduction", value: 0.20, phase: "post_curve" },
      ],
    },
  },
}
```

### Druid: Mending Grove (togglable buff spell with MHB)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "mending_grove",                          id: "mending_grove",
  tier: 6, memoryCost: 6,                       type: "spell",
  maxCasts: 2,                                   name: "Mending Grove",
  targeting: SELF_ONLY,                          desc: "...",
  duration: 5,                                   tier: 6, memoryCost: 6,
  effects: [                                     cost: { type: "charges", value: 2 },
    { phase: POST_CURVE,                         targeting: "self",
      stat: "maxHealthBonus",                    duration: 5,
      value: 0.10 }                              activation: "toggle",
  ],                                             effects: [
  healEffects: [                                   { stat: "maxHealthBonus", value: 0.10,
    { label: "Per second",                             phase: "pre_curve_flat" },
      baseHeal: 10, scaling: 0,                  ],
      isHoT: true }                              healEffects: [
  ],                                               { label: "Per second (3m AoE)",
  _unverified: "Duration not                         baseHeal: 10, scaling: 0,
    specified..."                                     isHoT: true },
}                                                ],
                                                 _unverified: "Duration not specified...",
                                               }
// maxHealthBonus is pre_curve_flat — feeds into the health recipe's
// multiplierBonuses, NOT a post_curve flat add. The current POST_CURVE
// phase in warlock.js is a bug (ds.maxHealthBonus += 0.10 goes nowhere).
```

### Druid: Sun and Moon (perk with pre-curve stats on different routing paths)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "sun_and_moon",                           id: "sun_and_moon",
  statEffects: [                                type: "perk",
    { stat: "vig", value: 3 },                  name: "Sun and Moon",
    { stat: "magicalPower",                     desc: "...",
      value: 5 }                                effects: [
  ],                                              { stat: "vig", value: 3,
}                                                   phase: "pre_curve_flat" },
                                                  { stat: "magicalPower", value: 5,
                                                    phase: "pre_curve_flat" },
                                                ],
                                               }
// Both are pre_curve_flat but route differently:
//   vig → CORE_ATTR → attrs.vig (feeds health + other curves)
//   magicalPower → NOT CORE_ATTR → bonuses.magicalPower (feeds MPB curve)
// The effect pipeline routes by CORE_ATTRS membership. See Section 3.
```

### Warlock: Eldritch Shield (scaling shield + on-break trigger)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "eldritch_shield",                        id: "eldritch_shield",
  tier: 5, memoryCost: 5,                       type: "spell",
  healthCost: 6,                                 name: "Eldritch Shield",
  targeting: SELF_ONLY,                          desc: "...",
  duration: 15,                                  tier: 5, memoryCost: 5,
  shieldAmount: 25,                              cost: { type: "health", value: 6 },
  onBreak: {                                     targeting: "self",
    duration: 6,                                 duration: 15,
    effects: [                                   activation: "toggle",
      { phase: POST_CURVE,                       shield: { base: 25, damageFilter: "magical" },
        stat: "spellCastingSpeed",               triggers: [
        value: 0.50 },                             { event: "on_shield_break",
      { phase: TYPE_DAMAGE_BONUS,                    duration: 6,
        damageType: "dark_magical",                  consumedOn: "next_spell",
        value: 0.30 }                                effects: [
    ]                                                    { stat: "spellCastingSpeed",
  },                                                       value: 0.50,
}                                                          phase: "post_curve" },
                                                         { stat: "typeDamageBonus",
                                                           value: 0.30,
                                                           phase: "type_damage_bonus",
                                                           damageType: "dark_magical" },
                                                       ] },
                                                 ],
                                               }
// v3 update: shieldAmount → shield shape. Values corrected from CSV:
// shield base 25 (was 15), duration 15s (was 8s), magical damage only.
// Break buff is consumed on next dark spell cast (consumedOn: display metadata).
```

### Religion: Solaris (post-curve flat add)

```js
// CURRENT                                    // UNIFIED
{                                             {
  id: "blessing_solaris",                       id: "blessing_solaris",
  name: "Blessing of Solaris",                  name: "Blessing of Solaris",
  cost: 20,                                     cost: 20,
  effects: [                                    effects: [
    { stat: "cdr", value: 0.05,                   { stat: "cooldownReductionBonus",
      label: "CDR" }                                value: 0.05,
  ],                                                phase: "post_curve" },
  verification: "VERIFIED",                     ],
}                                               verification: "VERIFIED",
                                               }
// stat renamed: "cdr" → "cooldownReductionBonus" (the bonus key consumed
// by derived-stats.js as a flat add after the CDR curve).
// label dropped (derive from STAT_META). verification retained on blessing.
```

### v3: Bard Rousing Rhythms (music with performance tiers)

```js
// UNIFIED
{
  id: "rousing_rhythms",
  type: "music",
  name: "Rousing Rhythms",
  desc: "Nearby allies gain all attributes for a duration based on performance.",
  memoryCost: 3,
  tags: ["drum"],
  activation: "toggle",
  performanceTiers: {
    poor:    { effects: [{ stat: "all_attributes", value: 2, phase: "pre_curve_flat",
                           target: "nearby_allies" }], duration: 60 },
    good:    { effects: [{ stat: "all_attributes", value: 2, phase: "pre_curve_flat",
                           target: "nearby_allies" }], duration: 120 },
    perfect: { effects: [{ stat: "all_attributes", value: 2, phase: "pre_curve_flat",
                           target: "nearby_allies" }], duration: 240 },
  },
}
// All tiers give same +2 all attrs — differ only in duration (display metadata).
// UI: performance tier selector. Engine reads selected tier's effects.
// memoryCost deducted from shared KNO-based memory capacity pool.
```

### v3: Sorcerer Elemental Bolt (merged spell + dual-element + status)

```js
// UNIFIED
{
  id: "elemental_bolt",
  type: "merged_spell",
  name: "Elemental Bolt",
  desc: "Deal 50(1.0) Fire/Ice magical damage, inflicting burn and frostbite.",
  components: ["water_bolt", "fire_arrow"],
  activation: "cast",
  damage: [
    { base: 50, scaling: 1.0, damageType: "fire_magical", label: "Fire component" },
    { base: 50, scaling: 1.0, damageType: "ice_magical", label: "Ice component" },
  ],
  appliesStatus: [
    { type: "burn", duration: 3,
      damage: { base: 3, scaling: 0.5, damageType: "fire_magical", label: "Burn DoT" } },
    { type: "frostbite", duration: 2,
      effects: [
        { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
        { stat: "actionSpeed", value: -0.20, phase: "post_curve", target: "enemy" },
      ] },
  ],
}
// Dual-element: two entries in damage[]. No own cost — cooldown derived from
// max(water_bolt.cooldown, fire_arrow.cooldown). Available when both components
// are in spell memory.
```

### v3: Barbarian Berserker (HP-scaling continuous effect)

```js
// UNIFIED
{
  id: "berserker",
  type: "perk",
  name: "Berserker",
  desc: "Gain 2% physical damage bonus and 0.5% move speed bonus per 10% max HP missing.",
  effects: [
    { stat: "physicalDamageBonus", value: 0,
      phase: "post_curve",
      hpScaling: { per: 10, valuePerStep: 0.02, maxValue: 0.20 } },
    { stat: "moveSpeedBonus", value: 0,
      phase: "post_curve",
      hpScaling: { per: 10, valuePerStep: 0.005, maxValue: 0.05 } },
  ],
}
// UI: HP% slider. At 50% HP (50% missing → 5 steps):
//   physicalDamageBonus += 5 × 0.02 = 0.10 (10%)
//   moveSpeedBonus += 5 × 0.005 = 0.025 (2.5%)
// At 100% HP: both are 0 (no missing HP).
```

### v3: Fighter Adrenaline Rush (afterEffect + removedBy)

```js
// UNIFIED
{
  id: "adrenaline_rush",
  type: "skill",
  name: "Adrenaline Rush",
  desc: "+15% AS, +5% MS for 8s. After: -8% AS, -4% MS for 2s.",
  cooldown: 30,
  duration: 8,
  activation: "toggle",
  effects: [
    { stat: "actionSpeed", value: 0.15, phase: "post_curve" },
    { stat: "moveSpeedBonus", value: 0.05, phase: "post_curve" },
  ],
  afterEffect: {
    duration: 2,
    effects: [
      { stat: "actionSpeed", value: -0.08, phase: "post_curve" },
      { stat: "moveSpeedBonus", value: -0.04, phase: "post_curve" },
    ],
    removedBy: ["adrenaline_spike", "second_wind"],
  },
}
// afterEffect shows as a separate toggle in the UI.
// If Adrenaline Spike perk is equipped, afterEffect toggle is hidden/disabled.
// Second Wind skill also removes the penalty (removedBy).
```

### v3: Barbarian Axe Specialization (weapon_type condition)

```js
// UNIFIED
{
  id: "axe_specialization",
  type: "perk",
  name: "Axe Specialization",
  desc: "While using axes, gain 3 weapon damage.",
  condition: { type: "weapon_type", weaponType: "axe" },
  effects: [
    { stat: "additionalWeaponDamage", value: 3, phase: "post_curve" },
  ],
}
// Ability-level condition: all effects gated by weapon type.
// Effects appear/disappear based on equipped weapon.
```

### v3: Warlock Dark Offering (stacking system)

```js
// UNIFIED
{
  id: "dark_offering",
  type: "skill",
  name: "Dark Offering",
  desc: "Channel: sacrifice 10% max HP/s, gain 5% magical/physical damage per stack.",
  cooldown: 60,
  activation: "toggle",
  stacking: {
    maxStacks: 5,
    perStack: [
      { stat: "magicalDamageBonus", value: 0.05, phase: "post_curve" },
      { stat: "physicalDamageBonus", value: 0.05, phase: "post_curve" },
    ],
    triggerOn: "channel_tick",
    duration: 60,
  },
}
// UI: stack selector (0–5). At 3 stacks: +15% magical + 15% physical damage.
// Health cost (10% per second) is display metadata.
```

### v3: Sorcerer Earth Elemental (casterEffects on summon + cooldown cost)

```js
// UNIFIED
{
  id: "summon_earth_elemental",
  type: "spell",
  name: "Summon Earth Elemental",
  desc: "Summon for 18s. Caster gains +50 AR. Elemental hurls rocks for 40(1.0) physical.",
  tier: 5,
  memoryCost: 5,
  cost: { type: "cooldown", value: 24 },
  activation: "toggle",
  summon: {
    type: "earth_elemental",
    duration: 18,
    damage: [
      { base: 40, scaling: 1.0, damageType: "physical", label: "Rock hurl" },
    ],
    casterEffects: [
      { stat: "armorRating", value: 50, phase: "pre_curve_flat" },
    ],
  },
}
// When toggled on, casterEffects feed into the stat pipeline.
// +50 AR flows into PDR curve. cost.type "cooldown" — Sorcerer spell model.
```

### v3: Wizard Arcane Shield (scaling shield + on-break damage)

```js
// UNIFIED
{
  id: "arcane_shield",
  type: "skill",
  name: "Arcane Shield",
  desc: "Absorbs 15(0.5) damage for 12s. On break: 5(1.0) arcane magical AoE.",
  duration: 12,
  activation: "toggle",
  shield: {
    base: 15,
    scaling: 0.5,
  },
  triggers: [
    { event: "on_shield_break",
      damage: { damageType: "arcane_magical", base: 5, scaling: 1.0 } },
  ],
}
// Shield absorb = base + (MPB × scaling) = 15 + (MPB × 0.5).
// Replaces flat shieldAmount from v2.
```
