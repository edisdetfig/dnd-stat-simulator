// Warlock — class data authored against class-shape.js (Phase 2 rebuild).
//
// Source of truth for numerics: docs/classes/warlock.csv (memoryCost = CSV Tier).
// Verified mechanics cross-checked against docs/damage_formulas.md,
// docs/healing_verification.md, docs/unresolved_questions.md.
//
// Old src/data/classes/warlock.js is the v3 reference and stays on disk until
// Phase 8 end-to-end verification clears the rename.

export const warlock = {
  id: "warlock",
  name: "Warlock",
  desc: "Blood magic, curses, and demonic pacts.",

  baseAttributes: { str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 },
  // CSV HP = 122. HR = 11×0.25 + 14×0.75 = 13.25.
  baseHealth: 122,

  maxPerks: 4,
  maxSkills: 2,

  armorProficiency: ["cloth", "leather"],

  classResources: {
    darkness_shards: {
      maxStacks: 3,
      desc: "Shared pool. Produced by Soul Collector (on final blow) and Spell Predation (per removable magical buff consumed). Consumed on dealing dark magical damage. UI counter visible only when a shard-generating ability is selected.",
      condition: { type: "any", conditions: [
        { type: "ability_selected", abilityId: "soul_collector" },
        { type: "ability_selected", abilityId: "spell_predation" },
      ]},
    },
    blood_pact_locked_shards: {
      maxStacks: 3,
      desc: "Shards locked in at Blood Pact activation. In-game, populated by snapshotting darkness_shards at form entry; independent thereafter. Counter set directly by the user here.",
      condition: { type: "all", conditions: [
        { type: "effect_active", effectId: "blood_pact" },
        { type: "any", conditions: [
          { type: "ability_selected", abilityId: "soul_collector" },
          { type: "ability_selected", abilityId: "spell_predation" },
        ]},
      ]},
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // PERKS
  // ─────────────────────────────────────────────────────────────────────
  perks: [
    {
      id: "demon_armor",
      type: "perk",
      name: "Demon Armor",
      desc: "Gain the ability to equip plate armor, but lose 10% spell casting speed.",
      activation: "passive",
      tags: ["demon"],
      grants: [
        { type: "armor", armorType: "plate" },
      ],
      effects: [
        { stat: "spellCastingSpeed", value: -0.10, phase: "post_curve" },
      ],
    },

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

    {
      id: "shadow_touch",
      type: "perk",
      name: "Shadow Touch",
      desc: "Dealing physical damage to an enemy via melee attack (any weapon or bare hands) deals 2 true dark magical damage and heals you for 2 health. The true damage and healing do not scale.",
      activation: "passive",
      tags: ["dark"],
      damage: [
        { base: 2, scaling: 0, damageType: "dark_magical", trueDamage: true, target: "enemy",
          desc: "per melee physical hit" },
      ],
      heal: { baseHeal: 2, scaling: 0, healType: "magical", target: "self",
        desc: "per melee physical hit" },
    },

    {
      id: "dark_reflection",
      type: "perk",
      name: "Dark Reflection",
      desc: "While active, reflect 15(0.75) dark magical damage to the melee attacker. Does not reflect while on cooldown.",
      activation: "toggle",
      targeting: "self",
      tags: ["dark"],
      damage: [
        { base: 15, scaling: 0.75, damageType: "dark_magical", target: "enemy",
          desc: "reflected per melee hit taken while active (cooldown-gated)",
          condition: { type: "effect_active", effectId: "dark_reflection" } },
      ],
      effects: [
        { tags: ["cooldown_gated"],
          desc: "Does not reflect while on cooldown.",
          condition: { type: "effect_active", effectId: "dark_reflection" } },
      ],
      _unverified: {
        darkEnhancementInteraction: "Dark Enhancement +20% interaction with Dark Reflection's reflected damage is untested in-game per docs/unresolved_questions.md.",
      },
    },

    {
      id: "antimagic",
      type: "perk",
      name: "Antimagic",
      desc: "Gain 20% magical damage reduction except against divine magic. Applied as a separate multiplicative layer after capped MDR (see docs/damage_formulas.md § Antimagic).",
      activation: "passive",
      effects: [
        { stat: "magicDamageTaken", value: 0.80, phase: "post_cap_multiplicative_layer",
          condition: { type: "not", conditions: [
            { type: "damage_type", damageType: "divine_magical" },
          ]} },
      ],
    },

    {
      id: "dark_enhancement",
      type: "perk",
      name: "Dark Enhancement",
      desc: "Gain 20% dark magical damage bonus towards dark magic spells.",
      activation: "passive",
      effects: [
        { stat: "darkDamageBonus", value: 0.20, phase: "type_damage_bonus" },
      ],
    },

    {
      id: "torture_mastery",
      type: "perk",
      name: "Torture Mastery",
      desc: "All curses inflicted upon enemies restore 2(0.15) recoverable health to the caster with each instance of damage dealt. All Warlock spell costs are doubled when this perk is equipped. Heal fires per tick of curse-tagged damage dealt.",
      activation: "passive",
      heal: { baseHeal: 2, scaling: 0.15, healType: "magical", target: "self",
        desc: "per tick of curse-tagged damage dealt" },
      effects: [
        { stat: "spellCostBonus", value: 1.0, phase: "post_curve" },
      ],
      _unverified: {
        healScaling: "0.15 scaling is wiki-sourced only; not independently verified in-game per docs/unresolved_questions.md.",
      },
    },

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

    {
      id: "immortal_lament",
      type: "perk",
      name: "Immortal Lament",
      desc: "Casting spells will no longer take you below 1 health. When your health falls below 5%, gain 100% increased magical healing bonus for 5 seconds.",
      activation: "passive",
      duration: { base: 5, type: "buff" },
      effects: [
        { stat: "healingMod", value: 1.00, phase: "healing_modifier", duration: 5,
          condition: { type: "hp_below", threshold: 0.05 } },
        { tags: ["spells_cannot_kill"],
          desc: "Casting spells cannot reduce HP below 1." },
      ],
    },

    {
      id: "infernal_pledge",
      type: "perk",
      name: "Infernal Pledge",
      desc: "Reduces damage taken from undead and demons by 40%.",
      activation: "passive",
      effects: [
        { stat: "undeadDamageReduction", value: 0.40, phase: "post_curve",
          condition: { type: "creature_type", creatureType: "undead" } },
        { stat: "demonDamageReduction", value: 0.40, phase: "post_curve",
          condition: { type: "creature_type", creatureType: "demon" } },
      ],
    },

    {
      id: "vampirism",
      type: "perk",
      name: "Vampirism",
      desc: "Gain 20% magical healing bonus.",
      activation: "passive",
      effects: [
        { stat: "healingMod", value: 0.20, phase: "healing_modifier" },
      ],
    },

    {
      id: "soul_collector",
      type: "perk",
      name: "Soul Collector",
      desc: "When you deal the final blow to an enemy, one darkness shard is collected. Gain 1 all attributes and 33% dark magical damage bonus per shard, up to 3 shards. Consumed when you deal dark magic damage.",
      activation: "passive",
      tags: ["dark"],
      effects: [
        { stat: "allAttributes", value: 1, phase: "pre_curve_flat",
          resource: "darkness_shards" },
        { stat: "darkDamageBonus", value: 0.33, phase: "type_damage_bonus",
          resource: "darkness_shards" },
      ],
    },
  ],

  // ─────────────────────────────────────────────────────────────────────
  // SKILLS
  // ─────────────────────────────────────────────────────────────────────
  skills: [
    {
      id: "spell_memory_1",
      type: "skill",
      name: "Spell Memory I",
      desc: "+5 spell memory slots.",
      activation: "passive",
      effects: [
        { stat: "memorySlots", value: 5, phase: "post_curve", abilityType: "spell" },
      ],
    },

    {
      id: "spell_memory_2",
      type: "skill",
      name: "Spell Memory II",
      desc: "+5 spell memory slots.",
      activation: "passive",
      effects: [
        { stat: "memorySlots", value: 5, phase: "post_curve", abilityType: "spell" },
      ],
    },

    {
      id: "blow_of_corruption",
      type: "skill",
      name: "Blow of Corruption",
      desc: "Your next physical attack deals 12(1.0) evil magical damage to the target and reduces their incoming physical and magical healing by 80% for 12 seconds.",
      activation: "cast",
      cost: { type: "none", value: 0 },
      targeting: "enemy",
      duration: { base: 12, type: "debuff" },
      damage: [
        { base: 12, scaling: 1.0, damageType: "evil_magical", target: "enemy" },
      ],
      effects: [
        { stat: "incomingPhysicalHealing", value: -0.80, phase: "post_curve",
          target: "enemy", duration: 12 },
        { stat: "incomingMagicalHealing", value: -0.80, phase: "post_curve",
          target: "enemy", duration: 12 },
      ],
    },

    {
      id: "blood_pact",
      type: "skill",
      name: "Blood Pact",
      desc: "Take the form of your contracted demon. +30 max HP, +50 armor rating, +50 magic resistance. Abyssal Flame: 1% self-damage per second, 2(0.25) magical per second to nearby enemies. On activation, consumes existing Darkness Shards, locking in +1 all attributes and +33% dark magical damage bonus per shard for the full duration. While active, Bolt of Darkness is castable bare-handed; Exploitation Strike and Exit Demon Form become available. Irreversible until contract ends.",
      activation: "toggle",
      targeting: "self",
      tags: ["demon", "blood"],
      cost: { type: "none", value: 0 },
      grants: [
        { type: "ability", abilityId: "bolt_of_darkness", costSource: "granted",
          condition: { type: "all", conditions: [
            { type: "effect_active", effectId: "blood_pact" },
            { type: "weapon_type", weaponType: "unarmed" },
          ]} },
        { type: "ability", abilityId: "exploitation_strike", costSource: "granted",
          condition: { type: "effect_active", effectId: "blood_pact" } },
        { type: "ability", abilityId: "exit_demon_form", costSource: "granted",
          condition: { type: "effect_active", effectId: "blood_pact" } },
      ],
      effects: [
        { stat: "maxHealth", value: 30, phase: "post_curve",
          condition: { type: "effect_active", effectId: "blood_pact" } },
        { stat: "armorRating", value: 50, phase: "pre_curve_flat",
          condition: { type: "effect_active", effectId: "blood_pact" } },
        { stat: "magicResistance", value: 50, phase: "pre_curve_flat",
          condition: { type: "effect_active", effectId: "blood_pact" } },
        { stat: "allAttributes", value: 1, phase: "pre_curve_flat",
          resource: "blood_pact_locked_shards",
          condition: { type: "effect_active", effectId: "blood_pact" } },
        { stat: "darkDamageBonus", value: 0.33, phase: "type_damage_bonus",
          resource: "blood_pact_locked_shards",
          condition: { type: "effect_active", effectId: "blood_pact" } },
        { tags: ["irreversible_until_contract_ends"],
          desc: "Cannot be stopped until the contract ends.",
          condition: { type: "effect_active", effectId: "blood_pact" } },
      ],
      damage: [
        { base: 2, scaling: 0.25, damageType: "magical", target: "nearby_enemies",
          isDot: true, tickRate: 1, desc: "Abyssal Flame AoE",
          condition: { type: "effect_active", effectId: "blood_pact" } },
        { base: 0, scaling: 0, damageType: "magical", target: "self",
          percentMaxHealth: 0.01, isDot: true, tickRate: 1,
          desc: "Abyssal Flame self-damage (1% max HP/s)",
          condition: { type: "effect_active", effectId: "blood_pact" } },
      ],
      _unverified: {
        abyssalFlameSelfDamageType: "damageType authored as 'magical' to match Abyssal Flame AoE per CSV; the self-tick's in-game damage type is not independently verified.",
      },
    },

    {
      id: "phantomize",
      type: "skill",
      name: "Phantomize",
      desc: "Phase through melee attacks and projectiles for 4 seconds. While active, you gain 5% move speed bonus and lose 50% magical damage reduction. During this period you can only move and do not collide with other players or monsters.",
      activation: "cast_buff",
      cost: { type: "none", value: 0 },
      targeting: "self",
      duration: { base: 4, type: "buff" },
      effects: [
        { stat: "moveSpeedBonus", value: 0.05, phase: "post_curve", duration: 4,
          condition: { type: "effect_active", effectId: "phantomize" } },
        { stat: "magicalDamageReductionBonus", value: -0.50, phase: "post_curve", duration: 4,
          condition: { type: "effect_active", effectId: "phantomize" } },
        { tags: ["phase_through"],
          desc: "Phases through melee attacks and projectiles; movement-only, no collision.",
          condition: { type: "effect_active", effectId: "phantomize" } },
      ],
    },

    {
      id: "dark_offering",
      type: "skill",
      name: "Dark Offering",
      desc: "Channel your mind, sacrificing 10% of your max health per second to gain 5% magical damage bonus and 5% physical damage bonus per stack. This bonus lasts for 60 seconds. Stacks gained per second while channeling, up to 10 stacks.",
      activation: "toggle",
      cost: { type: "none", value: 0 },
      targeting: "self",
      tags: ["channel"],
      duration: { base: 60, type: "buff" },
      effects: [
        { stat: "physicalDamageBonus", value: 0.05, phase: "post_curve", maxStacks: 10,
          condition: { type: "effect_active", effectId: "dark_offering" } },
        { stat: "magicalDamageBonus", value: 0.05, phase: "post_curve", maxStacks: 10,
          condition: { type: "effect_active", effectId: "dark_offering" } },
      ],
      damage: [
        { base: 0, scaling: 0, damageType: "magical", target: "self",
          percentMaxHealth: 0.10, isDot: true, tickRate: 1,
          desc: "Channel cost: 10% max HP per second while active",
          condition: { type: "effect_active", effectId: "dark_offering" } },
      ],
      _unverified: {
        channelDamageType: "damageType on the 10%/s channel cost is not verified in-game; authored as 'magical' placeholder.",
      },
    },

    {
      id: "exploitation_strike",
      type: "skill",
      name: "Exploitation Strike",
      desc: "Cast to gain the Exploitation Strike buff. While active, your unarmed attacks deal +20(1.0) evil magical damage and heal you for 10% of the target's maximum health. Accessible while Blood Pact is active (granted via grants[]).",
      activation: "cast_buff",
      cost: { type: "none", value: 0 },
      targeting: "self",
      tags: ["demon", "buff"],
      duration: { base: 15, type: "buff" },
      damage: [
        { base: 20, scaling: 1.0, damageType: "evil_magical", target: "enemy",
          targetMaxHpRatio: 0.10,
          desc: "per unarmed hit while Exploitation Strike buff is active; derived heal = 10% of enemy's max HP",
          condition: { type: "all", conditions: [
            { type: "effect_active", effectId: "exploitation_strike" },
            { type: "weapon_type", weaponType: "unarmed" },
          ]} },
      ],
      _unverified: {
        tooltipMismatch: "Tooltip says 2s; in-game base is ~15s (measured 18s with +20% buffDurationBonus). Authored to the in-game base.",
      },
    },

    {
      id: "exit_demon_form",
      type: "skill",
      name: "Exit Demon Form",
      desc: "Return to human form. No stat changes; the form removal is the full mechanic. Accessible only while Blood Pact is active (granted via grants[]).",
      activation: "cast",
      cost: { type: "none", value: 0 },
      targeting: "self",
      tags: ["demon"],
    },
  ],

  // ─────────────────────────────────────────────────────────────────────
  // SPELLS — memoryCost = CSV Tier
  // ─────────────────────────────────────────────────────────────────────
  spells: [
    // Tier 1
    {
      id: "power_of_sacrifice",
      type: "spell",
      name: "Power of Sacrifice",
      desc: "Deal 3 evil magical damage per second to the target while increasing the target's strength and vigor by 15 for 12 seconds. Self casts if no target is found. Does not scale. (In-game targeting also supports ally cast — captured in desc; snapshot models self/enemy via target: either.)",
      activation: "cast",
      cost: { type: "health", value: 4 },
      memoryCost: 1,
      targeting: "enemy_or_self",
      tags: ["evil"],
      duration: { base: 12, type: "buff" },
      damage: [
        { base: 3, scaling: 0, damageType: "evil_magical", isDot: true, tickRate: 1,
          target: "either" },
      ],
      effects: [
        { stat: "str", value: 15, phase: "pre_curve_flat", target: "either", duration: 12 },
        { stat: "vig", value: 15, phase: "pre_curve_flat", target: "either", duration: 12 },
      ],
    },

    {
      id: "curse_of_weakness",
      type: "spell",
      name: "Curse of Weakness",
      desc: "Reduces the target's all attributes by 25% and reduces physical damage reduction by 15% and reduces magical damage reduction by 15% for 12 seconds. Does not scale.",
      activation: "cast",
      cost: { type: "health", value: 4 },
      memoryCost: 1,
      targeting: "enemy",
      tags: ["curse"],
      duration: { base: 12, type: "debuff", tags: ["curse"] },
      effects: [
        { stat: "allAttributes", value: -0.25, phase: "attribute_multiplier",
          target: "enemy", duration: 12 },
        { stat: "physicalDamageReductionBonus", value: -0.15, phase: "post_curve",
          target: "enemy", duration: 12 },
        { stat: "magicalDamageReductionBonus", value: -0.15, phase: "post_curve",
          target: "enemy", duration: 12 },
      ],
    },

    {
      id: "bolt_of_darkness",
      type: "spell",
      name: "Bolt of Darkness",
      desc: "Fires a bolt that deals 20(1.0) dark magical damage to the target. Castable bare-handed while Blood Pact is active (granted via Blood Pact).",
      activation: "cast",
      cost: { type: "health", value: 4 },
      memoryCost: 1,
      targeting: "enemy",
      tags: ["dark", "projectile"],
      damage: [
        { base: 20, scaling: 1.0, damageType: "dark_magical", target: "enemy" },
      ],
    },

    // Tier 2
    {
      id: "bloodstained_blade",
      type: "spell",
      name: "Bloodstained Blade",
      desc: "While active, the target gains 5 weapon damage for 20 seconds. When the target swings their weapon, they take 3 evil magical damage. Self cast if no target is found. Does not scale.",
      activation: "cast_buff",
      cost: { type: "health", value: 4 },
      memoryCost: 2,
      targeting: "ally_or_self",
      tags: ["blood"],
      duration: { base: 20, type: "buff" },
      effects: [
        { stat: "buffWeaponDamage", value: 5, phase: "post_curve", target: "self_or_ally", duration: 20,
          condition: { type: "effect_active", effectId: "bloodstained_blade" } },
      ],
      damage: [
        { base: 3, scaling: 0, damageType: "evil_magical", target: "self_or_ally",
          desc: "per weapon swing while Bloodstained Blade is active",
          condition: { type: "effect_active", effectId: "bloodstained_blade" } },
      ],
    },

    {
      id: "curse_of_pain",
      type: "spell",
      name: "Curse of Pain",
      desc: "Deal 15(1.0) evil magical damage to the target instantly. Additionally deal 15(0.5) evil magical damage distributed over 8 seconds.",
      activation: "cast",
      cost: { type: "health", value: 4 },
      memoryCost: 2,
      targeting: "enemy",
      tags: ["curse", "evil"],
      duration: { base: 8, type: "debuff", tags: ["curse"] },
      damage: [
        { base: 15, scaling: 1.0, damageType: "evil_magical", target: "enemy",
          desc: "instant" },
        { base: 15, scaling: 0.5, damageType: "evil_magical", isDot: true, tickRate: 1,
          target: "enemy", desc: "DoT (8s total)" },
      ],
    },

    // Tier 3
    {
      id: "spell_predation",
      type: "spell",
      name: "Spell Predation",
      desc: "Consume up to all removable magical buffs from the enemy and gain 1 Darkness Shard per effect. Inflict 3(1.0) evil magical damage per effect. (Shard generation is snapshot-model desc-only — user manages the darkness_shards counter directly.)",
      activation: "cast",
      cost: { type: "health", value: 4 },
      memoryCost: 3,
      targeting: "enemy",
      tags: ["dark"],
      damage: [
        { base: 3, scaling: 1.0, damageType: "evil_magical", target: "enemy",
          desc: "per removable magical buff consumed" },
      ],
    },

    {
      id: "evil_eye",
      type: "spell",
      name: "Evil Eye",
      desc: "Channel for 1 second and summon an evil eye that can be possessed by the caster for 30 seconds. The evil eye serves as a scouting tool while possessed.",
      activation: "cast",
      cost: { type: "health", value: 5 },
      memoryCost: 3,
      targeting: "self",
      tags: ["dark", "channel"],
      duration: { base: 30, type: "other" },
      castTime: 1,
      effects: [
        { tags: ["possessable"],
          desc: "Summoned Evil Eye is possessable by the caster for vision/scouting." },
      ],
    },

    // Tier 4
    {
      id: "ray_of_darkness",
      type: "spell",
      name: "Ray of Darkness",
      desc: "Channel a dark beam dealing 12(1.0) dark magical damage per second to any target the beam touches. Moving and aiming are possible while channeling.",
      activation: "cast",
      cost: { type: "health", value: 5 },
      memoryCost: 4,
      targeting: "enemy",
      tags: ["dark", "beam", "channel"],
      duration: { base: 5, type: "other" },
      damage: [
        { base: 12, scaling: 1.0, damageType: "dark_magical", isDot: true, tickRate: 1,
          target: "enemy", desc: "per second" },
      ],
      effects: [
        { tags: ["can_move_while_channeling"],
          desc: "Moving and aiming are possible while channeling this beam." },
      ],
    },

    {
      id: "life_drain",
      type: "spell",
      name: "Life Drain",
      desc: "Channel for 7.5 seconds, dealing 5(0.25) evil magical damage to the target per second. Heals the caster for 100% of pre-MDR damage dealt (VERIFIED 2026-04-13, single data point at observed MPB).",
      activation: "cast",
      cost: { type: "health", value: 5 },
      memoryCost: 4,
      targeting: "enemy",
      tags: ["evil", "channel"],
      duration: { base: 7.5, type: "other" },
      damage: [
        { base: 5, scaling: 0.25, damageType: "evil_magical", isDot: true, tickRate: 1,
          target: "enemy", lifestealRatio: 1.0, desc: "per second" },
      ],
    },

    {
      id: "hellfire",
      type: "spell",
      name: "Hellfire",
      desc: "Cast eternal hellfire and blast it towards the targets. Deal 60(0.5) fire magical damage per second to any target within the area of effect. The hellfire does not dissipate when it reaches the target.",
      activation: "cast",
      cost: { type: "health", value: 6 },
      memoryCost: 4,
      targeting: "enemy",
      tags: ["fire"],
      damage: [
        { base: 60, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1,
          target: "nearby_enemies", desc: "per second (persistent AoE)" },
      ],
    },

    // Tier 5
    {
      id: "eldritch_shield",
      type: "spell",
      name: "Eldritch Shield",
      desc: "Grants the target a shield that protects against 25 magical damage for 15 seconds. When the shield absorbs its maximum damage, gain 30% dark magical damage bonus and 50% spell casting speed towards the next dark spell cast within 6 seconds. (Shield-break proc window is modeled as effects active while the eldritch_shield buff is toggled; user manages the window via the whole-ability toggle.)",
      activation: "cast_buff",
      cost: { type: "health", value: 6 },
      memoryCost: 5,
      targeting: "ally_or_self",
      tags: ["dark"],
      duration: { base: 15, type: "buff" },
      shield: { base: 25, scaling: 0, damageFilter: "magical", target: "self", duration: 15 },
      afterEffect: {
        duration: 6,
        effects: [
          { stat: "darkDamageBonus", value: 0.30, phase: "type_damage_bonus",
            target: "self" },
          { stat: "spellCastingSpeed", value: 0.50, phase: "post_curve",
            target: "self" },
        ],
        desc: "Shield-break proc: next dark spell within 6s",
      },
    },
    {
      id: "flame_walker",
      type: "spell",
      name: "Flame Walker",
      desc: "While active, gain the ability to leave a trail of Hellfire for 6 seconds. Each step leaves a trail that lasts for 4 seconds. Targets that enter the flame area will burn, taking 5(1.0) fire magical damage per 0.2 seconds.",
      activation: "cast_buff",
      cost: { type: "health", value: 6 },
      memoryCost: 5,
      targeting: "self",
      tags: ["fire"],
      duration: { base: 6, type: "buff" },
      damage: [
        { base: 5, scaling: 1.0, damageType: "fire_magical", isDot: true, tickRate: 0.2,
          target: "nearby_enemies",
          desc: "per 0.2s, 4s per trail tile",
          condition: { type: "effect_active", effectId: "flame_walker" } },
      ],
    },

    // Tier 6
    {
      id: "summon_hydra",
      type: "spell",
      name: "Summon Hydra",
      desc: "Summons a Hydra that spits fireballs dealing 10(1.0) fire magical damage to enemy target for 10 seconds. The hydra can also detect hidden targets.",
      activation: "cast",
      cost: { type: "health", value: 12 },
      memoryCost: 6,
      targeting: "self",
      tags: ["fire", "summon"],
      duration: { base: 10, type: "other" },
      damage: [
        { base: 10, scaling: 1.0, damageType: "fire_magical", target: "enemy",
          desc: "Hydra fireball per attack" },
      ],
      effects: [
        { tags: ["detects_hidden"],
          desc: "Hydra detects hidden targets." },
      ],
    },
  ],
};

export default warlock;
