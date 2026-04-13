// Warlock class — authored fresh from docs/classes/warlock.csv.
//
// Season 8, Hotfix 112-1. Every ability carries an inline CSV row pointer
// for traceability. Unknowns are flagged with `_unverified` and tracked
// in docs/unresolved_questions.md.
//
// Validated at import time via defineClass — any shape error throws in
// tests and warns in dev.

import { defineClass } from './define-class.js';

const WARLOCK = defineClass({
  id: "warlock",
  name: "Warlock",
  maxPerks: 4,
  maxSkills: 2,
  spellCostType: "health",
  equippableArmor: ["cloth", "leather"],
  baseStats: { str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 },

  // ── Perks (CSV L20–L33) ──
  perks: [
    // CSV: warlock.csv L22 — Demon Armor
    {
      id: "demon_armor",
      type: "perk",
      name: "Demon Armor",
      desc: "Gain the ability to equip plate armor, but lose 10% spell casting speed.",
      activation: "passive",
      effects: [
        { stat: "spellCastingSpeed", value: -0.10, phase: "post_curve" },
      ],
      grantsArmor: ["plate"],
    },

    // CSV: warlock.csv L23 — Malice
    {
      id: "malice",
      type: "perk",
      name: "Malice",
      desc: "Gain 15% will bonus.",
      activation: "passive",
      effects: [
        { stat: "wil", value: 0.15, phase: "attribute_multiplier" },
      ],
    },

    // CSV: warlock.csv L24 — Shadow Touch
    {
      id: "shadow_touch",
      type: "perk",
      name: "Shadow Touch",
      desc: "Dealing physical damage to an enemy with a melee weapon deals 2 true dark magical damage and heals you for 2 health.",
      activation: "passive",
      triggers: [
        { event: "on_melee_hit",
          damage: { damageType: "dark_magical", base: 2, trueDamage: true } },
        { event: "on_melee_hit",
          heal: { baseHeal: 2, scaling: 0, healType: "magical" } },
      ],
      _unverified: "damage and heal do not scale — confirm with in-game test",
    },

    // CSV: warlock.csv L25 — Dark Reflection
    {
      id: "dark_reflection",
      type: "perk",
      name: "Dark Reflection",
      desc: "While active, reflect 15(0.75) dark magical damage to the melee attacker. Does not reflect while on cooldown.",
      activation: "toggle",
      triggers: [
        { event: "on_hit_received",
          damage: { damageType: "dark_magical", base: 15, scaling: 0.75 } },
      ],
      _unverified: "duration + cooldown not documented in CSV",
    },

    // CSV: warlock.csv L26 — Antimagic
    {
      id: "antimagic",
      type: "perk",
      name: "Antimagic",
      desc: "Gain 20% magical damage reduction except against divine magic.",
      activation: "passive",
      effects: [
        // 0.80 = ×80% magic damage taken (20% reduction). Stacks multiplicatively.
        { stat: "magicDamageTaken", value: 0.80, phase: "multiplicative_layer" },
      ],
      _unverified: "divine-magic exception not modeled — engine applies to all magical damage",
    },

    // CSV: warlock.csv L27 — Dark Enhancement
    {
      id: "dark_enhancement",
      type: "perk",
      name: "Dark Enhancement",
      desc: "Gain 20% dark magical damage bonus towards dark magic spells.",
      activation: "passive",
      effects: [
        { stat: "typeDamageBonus", value: 0.20, phase: "type_damage_bonus", damageType: "dark_magical" },
      ],
    },

    // CSV: warlock.csv L28 — Torture Mastery
    {
      id: "torture_mastery",
      type: "perk",
      name: "Torture Mastery",
      desc: "All curses inflicted upon enemies restore 2(0.15) recoverable health to the caster with each instance of damage dealt. All Warlock spell costs are doubled when this perk is equipped.",
      activation: "passive",
      spellCostMultiplier: 2.0,
      triggers: [
        { event: "on_curse_tick",
          heal: { baseHeal: 2, scaling: 0.15, healType: "magical" },
          // "recoverable health" is conceptually a ghost-health bucket;
          // Phase 1 scope treats this as plain magical healing; when a
          // distinct recoverable-health bucket lands, split it out.
        },
      ],
      _unverified: "recoverable-health restoration not distinguished from normal heal (Phase 1 scope)",
    },

    // CSV: warlock.csv L29 — Curse Mastery
    {
      id: "curse_mastery",
      type: "perk",
      name: "Curse Mastery",
      desc: "Gain 30% duration towards all curses you cast.",
      activation: "passive",
      effects: [
        { stat: "curseDurationBonus", value: 0.30, phase: "post_curve" },
      ],
    },

    // CSV: warlock.csv L30 — Immortal Lament
    {
      id: "immortal_lament",
      type: "perk",
      name: "Immortal Lament",
      desc: "Casting spells will no longer take you below 1 health. When your health falls below 5%, gain 100% increased magical healing bonus for 5 seconds.",
      activation: "passive",
      effects: [
        { stat: "healingMod", value: 1.0, phase: "healing_modifier", healType: "magical",
          condition: { type: "hp_below", threshold: 0.05 } },
      ],
      passives: { spellsCannotKill: true },
    },

    // CSV: warlock.csv L31 — Infernal Pledge
    {
      id: "infernal_pledge",
      type: "perk",
      name: "Infernal Pledge",
      desc: "Reduces damage taken from undead and demons by 40%.",
      activation: "passive",
      effects: [
        { stat: "undeadDamageReduction", value: 0.40, phase: "post_curve" },
        { stat: "demonDamageReduction", value: 0.40, phase: "post_curve" },
      ],
    },

    // CSV: warlock.csv L32 — Vampirism
    {
      id: "vampirism",
      type: "perk",
      name: "Vampirism",
      desc: "Gain 20% magical healing bonus.",
      activation: "passive",
      effects: [
        { stat: "healingMod", value: 0.20, phase: "healing_modifier", healType: "magical" },
      ],
    },

    // CSV: warlock.csv L33 — Soul Collector
    {
      id: "soul_collector",
      type: "perk",
      name: "Soul Collector",
      desc: "When you deal the final blow to an enemy, one darkness shard is collected. Gain 1 all attributes and 33% dark magical damage bonus for each shard collected, up to a maximum of 3 shards. Consumed when you deal dark magic damage.",
      activation: "passive",
      stacking: {
        maxStacks: 3,
        desc: "Darkness Shards — +1 all attributes, +33% dark magical damage bonus per shard",
        perStack: [
          { stat: "all_attributes", value: 1, phase: "pre_curve_flat" },
          { stat: "typeDamageBonus", value: 0.33, phase: "type_damage_bonus", damageType: "dark_magical" },
        ],
        triggerOn: "kill",
        consumedOn: "dark_spell_cast",
      },
    },
  ],

  // ── Skills (CSV L37–L42) ──
  skills: [
    // CSV: warlock.csv L37 — Spell Memory I
    {
      id: "spell_memory_i",
      type: "skill",
      name: "Spell Memory I",
      desc: "5 spell slots.",
      slots: { type: "spell", count: 5 },
    },

    // CSV: warlock.csv L38 — Spell Memory II
    {
      id: "spell_memory_ii",
      type: "skill",
      name: "Spell Memory II",
      desc: "5 spell slots.",
      slots: { type: "spell", count: 5 },
    },

    // CSV: warlock.csv L39 — Blow of Corruption
    {
      id: "blow_of_corruption",
      type: "skill",
      name: "Blow of Corruption",
      desc: "Your next physical attack deals 12(1.0) evil magical damage to the target and reduces their incoming physical and magical healing by 80% for 12 seconds.",
      activation: "cast",
      consumedOn: "next_attack",
      duration: 12,
      damage: [
        { base: 12, scaling: 1.0, damageType: "evil_magical", label: "on next attack",
          affectedByHitLocation: true, target: "enemy" },
      ],
      triggers: [
        { event: "on_melee_hit",
          debuff: { stat: "incomingPhysicalHealing", value: -0.80, duration: 12 } },
        { event: "on_melee_hit",
          debuff: { stat: "incomingMagicalHealing", value: -0.80, duration: 12 } },
      ],
    },

    // CSV: warlock.csv L40 — Blood Pact (full v3 model per session alignment)
    {
      id: "blood_pact",
      type: "skill",
      name: "Blood Pact",
      desc: "Take the form of your contracted demon. See CSV for the full transformation — abyssal flame AoE, alt-skills, grantsSpells, locked-in Darkness Shards.",
      activation: "toggle",
      // Core buffs while active. Toggled-on implies these apply (the buffs
      // collector only yields when activeBuffs[blood_pact] is true).
      effects: [
        { stat: "maxHealth",       value: 30, phase: "post_curve" },
        { stat: "armorRating",     value: 50, phase: "pre_curve_flat" },
        { stat: "magicResistance", value: 50, phase: "pre_curve_flat" },
      ],
      // Abyssal Flame AoE damage ring around the caster.
      damage: [
        { base: 2, scaling: 0.25, damageType: "magical",
          label: "Abyssal Flame (AoE/s)", isDot: true, tickRate: 1, target: "enemy" },
      ],
      // Darkness Shards consumed at activation, locked in for the duration.
      // User picks 0–3 via the stack selector to represent shards banked
      // at activation time. Note: the in-game 3-shard cap is shared across
      // Soul Collector / Spell Predation / Blood Pact; the engine does
      // NOT enforce this — user is responsible (snapshot principle).
      stacking: {
        maxStacks: 3,
        desc: "Darkness Shards — +1 all attributes, +33% dark magical damage bonus per shard",
        perStack: [
          { stat: "all_attributes", value: 1, phase: "pre_curve_flat" },
          { stat: "typeDamageBonus", value: 0.33, phase: "type_damage_bonus", damageType: "dark_magical" },
        ],
        triggerOn: "blood_pact_activation",
        consumedOn: "blood_pact_activation",
      },
      // While in demon form, Bolt of Darkness is castable bare-handed
      // even if not in spell memory.
      grantsSpells: ["bolt_of_darkness"],
      // Display-only ancillary mechanics.
      passives: {
        selfDamagePerSecond: 0.01,
        altSkills: [
          {
            id: "exploitation_strike",
            name: "Exploitation Strike",
            desc: "Bare-hand attack dealing an additional 20(1.0) evil magical damage for 2 seconds, healing the caster for 10% of the target's maximum health.",
            duration: 2,
            damage: [{ base: 20, scaling: 1.0, damageType: "evil_magical", label: "Exploitation Strike" }],
            healPct: 0.10,
          },
          {
            id: "exit_demon_form",
            name: "Exit Demon Form",
            desc: "Return to human form. No stat changes.",
          },
        ],
      },
      _unverified: "shard interaction with in-game 3-cap not enforced by engine; alt-skill slot replacement is display-only (Phase 1 scope)",
    },

    // CSV: warlock.csv L41 — Phantomize
    {
      id: "phantomize",
      type: "skill",
      name: "Phantomize",
      desc: "Phase through melee attacks and projectiles for 4 seconds. While active, gain 5% move speed bonus and lose 50% magical damage reduction.",
      activation: "toggle",
      duration: 4,
      effects: [
        { stat: "moveSpeedBonus",          value:  0.05, phase: "post_curve" },
        { stat: "magicalDamageReduction",  value: -0.50, phase: "post_curve" },
      ],
    },

    // CSV: warlock.csv L42 — Dark Offering
    {
      id: "dark_offering",
      type: "skill",
      name: "Dark Offering",
      desc: "Channel your mind, sacrificing 10% of your max health per second to gain 5% magical damage bonus and 5% physical damage bonus per second. Lasts 60 seconds after channel ends.",
      activation: "toggle",
      duration: 60,
      stacking: {
        maxStacks: 10,
        perStack: [
          { stat: "physicalDamageBonus", value: 0.05, phase: "post_curve" },
          { stat: "magicalDamageBonus", value: 0.05, phase: "post_curve" },
        ],
        triggerOn: "channel_second",
        consumedOn: "duration_expire",
      },
      _unverified: "maxStacks ceiling — 10 inferred from 100%-HP-cap channel at 10%/sec; confirm in-game",
    },
  ],

  // ── Spells (CSV L46–L58) ──
  spells: [
    // CSV: warlock.csv L46 — Power of Sacrifice
    {
      id: "power_of_sacrifice",
      type: "spell",
      name: "Power of Sacrifice",
      desc: "Deal 3 evil magical damage per second to the target while increasing the target's strength and vigor by 15 for 12 seconds. Self-casts if no target is found.",
      tier: 1,
      memoryCost: 1,
      cost: { type: "health", value: 4 },
      targeting: "enemy_or_self",
      duration: 12,
      activation: "toggle",
      // "either": user picks apply-to-self and/or apply-to-enemy per cast.
      // Default is self-cast (Warlock most common pattern). User can flip
      // applyToEnemy on to model casting PoS on a target simultaneously
      // (12s duration overlaps — real in-game scenario).
      defaultApplyToSelf:  true,
      defaultApplyToEnemy: false,
      effects: [
        { stat: "str", value: 15, phase: "pre_curve_flat", target: "either" },
        { stat: "vig", value: 15, phase: "pre_curve_flat", target: "either" },
      ],
      damage: [
        { base: 3, scaling: 0, damageType: "evil_magical", isDot: true, label: "DoT/s", target: "either" },
      ],
      _unverified: "does not scale (DoT scaling is 0)",
    },

    // CSV: warlock.csv L47 — Curse of Weakness
    {
      id: "curse_of_weakness",
      type: "spell",
      name: "Curse of Weakness",
      desc: "Reduces the target's all attributes by 25% and reduces physical damage reduction by 15% and reduces magical damage reduction by 15% for 12 seconds.",
      tier: 1,
      memoryCost: 1,
      cost: { type: "health", value: 4 },
      targeting: "enemy",
      duration: 12,
      activation: "toggle",
      tags: ["curse"],
      effects: [
        { stat: "all_attributes",          value: -0.25, phase: "attribute_multiplier", target: "enemy" },
        { stat: "physicalDamageReduction", value: -0.15, phase: "post_curve",           target: "enemy" },
        { stat: "magicalDamageReduction",  value: -0.15, phase: "post_curve",           target: "enemy" },
      ],
      _unverified: "does not scale",
    },

    // CSV: warlock.csv L48 — Bolt of Darkness
    {
      id: "bolt_of_darkness",
      type: "spell",
      name: "Bolt of Darkness",
      desc: "Fires a bolt that deals 20(1.0) dark magical damage to the target.",
      tier: 1,
      memoryCost: 1,
      cost: { type: "health", value: 4 },
      targeting: "enemy",
      activation: "cast",
      damage: [
        { base: 20, scaling: 1.0, damageType: "dark_magical", label: "bolt", target: "enemy" },
      ],
    },

    // CSV: warlock.csv L49 — Bloodstained Blade
    {
      id: "bloodstained_blade",
      type: "spell",
      name: "Bloodstained Blade",
      desc: "While active, the target gains 5 weapon damage for 20 seconds. When the target swings their weapon, they take 3 evil magical damage. Self-casts if no target is found.",
      tier: 2,
      memoryCost: 2,
      cost: { type: "health", value: 4 },
      targeting: "ally_or_self",
      duration: 20,
      activation: "toggle",
      effects: [
        { stat: "buffWeaponDamage", value: 5, phase: "pre_curve_flat", target: "self" },
      ],
      triggers: [
        { event: "on_melee_hit", damage: { damageType: "evil_magical", base: 3 } },
      ],
      _unverified: "does not scale; triggers fire on wielder's swings",
    },

    // CSV: warlock.csv L50 — Curse of Pain
    {
      id: "curse_of_pain",
      type: "spell",
      name: "Curse of Pain",
      desc: "Deal 15(1.0) evil magical damage to the target instantly. Additionally deal 15(0.5) evil magical damage distributed over 8 seconds.",
      tier: 2,
      memoryCost: 2,
      cost: { type: "health", value: 4 },
      targeting: "enemy",
      activation: "cast",
      tags: ["curse"],
      damage: [
        { base: 15, scaling: 1.0, damageType: "evil_magical", label: "instant",        target: "enemy" },
        { base: 15, scaling: 0.5, damageType: "evil_magical", label: "DoT total (8s)", isDot: true, target: "enemy" },
      ],
    },

    // CSV: warlock.csv L51 — Spell Predation
    {
      id: "spell_predation",
      type: "spell",
      name: "Spell Predation",
      desc: "Consume up to all removable magical buffs from the enemy and gain 1 Darkness Shard per effect. Inflict 3(1.0) evil magical damage per effect.",
      tier: 3,
      memoryCost: 3,
      cost: { type: "health", value: 4 },
      targeting: "enemy",
      activation: "cast",
      damage: [
        { base: 3, scaling: 1.0, damageType: "evil_magical", label: "per buff stripped", perBuff: true, target: "enemy" },
      ],
      stacking: {
        maxStacks: 3,
        desc: "Darkness Shards — +1 all attributes, +33% dark magical damage bonus per shard",
        perStack: [
          { stat: "all_attributes", value: 1, phase: "pre_curve_flat", target: "self" },
          { stat: "typeDamageBonus", value: 0.33, phase: "type_damage_bonus", damageType: "dark_magical", target: "self" },
        ],
        triggerOn: "buff_strip",
        consumedOn: "dark_spell_cast",
      },
    },

    // CSV: warlock.csv L52 — Evil Eye
    {
      id: "evil_eye",
      type: "spell",
      name: "Evil Eye",
      desc: "Channel for 1 second and summon an evil eye that can be possessed by the caster for 30 seconds.",
      tier: 3,
      memoryCost: 3,
      cost: { type: "health", value: 5 },
      castTime: 1,
      activation: "cast",
      summon: { type: "evil_eye", duration: 30 },
    },

    // CSV: warlock.csv L53 — Ray of Darkness
    {
      id: "ray_of_darkness",
      type: "spell",
      name: "Ray of Darkness",
      desc: "Channel a dark beam dealing 12(1.0) dark magical damage per second to any target the beam touches.",
      tier: 4,
      memoryCost: 4,
      cost: { type: "health", value: 5 },
      targeting: "enemy",
      activation: "cast",
      damage: [
        { base: 12, scaling: 1.0, damageType: "dark_magical", isChannel: true, isDot: true, label: "channel/s", target: "enemy" },
      ],
    },

    // CSV: warlock.csv L54 — Life Drain
    {
      id: "life_drain",
      type: "spell",
      name: "Life Drain",
      desc: "Channel for 7.5 seconds, dealing 5(0.25) evil magical damage to the target per second. Convert a portion of the damage dealt into health for the caster.",
      tier: 4,
      memoryCost: 4,
      cost: { type: "health", value: 5 },
      targeting: "enemy",
      duration: 7.5,
      activation: "cast",
      damage: [
        { base: 5, scaling: 0.25, damageType: "evil_magical", isChannel: true, isDot: true, label: "channel/s", target: "enemy" },
      ],
      triggers: [
        { event: "on_damage_dealt", heal: { equalToDamage: true, healType: "magical" } },
      ],
      _unverified: "conversion fraction 'a portion' not quantified; engine treats as equalToDamage pending in-game test",
    },

    // CSV: warlock.csv L55 — Hellfire
    {
      id: "hellfire",
      type: "spell",
      name: "Hellfire",
      desc: "Cast eternal hellfire and blast it towards the targets. Deal 60(0.5) fire magical damage per second to any target within the area of effect.",
      tier: 4,
      memoryCost: 4,
      cost: { type: "health", value: 6 },
      targeting: "enemy",
      activation: "cast",
      damage: [
        { base: 60, scaling: 0.5, damageType: "fire_magical", isDot: true, label: "AoE/s", target: "enemy" },
      ],
    },

    // CSV: warlock.csv L56 — Eldritch Shield
    {
      id: "eldritch_shield",
      type: "spell",
      name: "Eldritch Shield",
      desc: "Grants the target a shield that protects against 25 magical damage for 15 seconds. When the shield absorbs its maximum damage, gain 30% dark magical damage bonus and 50% spell casting speed towards the next dark spell cast within 6 seconds.",
      tier: 5,
      memoryCost: 5,
      cost: { type: "health", value: 6 },
      targeting: "ally_or_self",
      duration: 15,
      activation: "toggle",
      shield: { base: 25, damageFilter: "magical" },
      triggers: [
        { event: "on_shield_break",
          duration: 6,
          effects: [
            { stat: "typeDamageBonus",   value: 0.30, phase: "type_damage_bonus", damageType: "dark_magical" },
            { stat: "spellCastingSpeed", value: 0.50, phase: "post_curve" },
          ] },
      ],
    },

    // CSV: warlock.csv L57 — Flame Walker
    {
      id: "flame_walker",
      type: "spell",
      name: "Flame Walker",
      desc: "While active, gain the ability to leave a trail of Hellfire for 6 seconds. Each step leaves a trail that lasts for 4 seconds. Targets that enter the flame area burn, taking 5(1.0) fire magical damage per 0.2 seconds.",
      tier: 5,
      memoryCost: 5,
      cost: { type: "health", value: 6 },
      activation: "toggle",
      duration: 6,
      damage: [
        { base: 5, scaling: 1.0, damageType: "fire_magical", isDot: true, tickRate: 0.2, label: "trail/0.2s", target: "enemy" },
      ],
    },

    // CSV: warlock.csv L58 — Summon Hydra
    {
      id: "summon_hydra",
      type: "spell",
      name: "Summon Hydra",
      desc: "Summons a Hydra that spits fireballs dealing 10(1.0) fire magical damage for 10 seconds. The hydra can also detect hidden targets.",
      tier: 6,
      memoryCost: 6,
      cost: { type: "health", value: 12 },
      activation: "cast",
      summon: {
        type: "hydra",
        duration: 10,
        damage: [
          { base: 10, scaling: 1.0, damageType: "fire_magical", label: "fireball", target: "enemy" },
        ],
      },
    },
  ],
});

export default WARLOCK;
