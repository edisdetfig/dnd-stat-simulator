// Warlock — v3 class definition.
// Authored from docs/classes/warlock.csv against docs/shape_examples.md
// patterns and docs/vocabulary.md enums. See
// docs/engine_requirements_phase_1_3.md for engine capabilities this data
// depends on but that aren't yet implemented.

export const warlock = ({
  id: "warlock",
  name: "Warlock",
  desc: "Blood magic, curses, and demonic pacts.",

  baseAttributes: { str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 },
  // CSV asserts HP=122. HR = 11×0.25 + 14×0.75 = 13.25.
  baseHealth: 122,

  maxPerks: 4,
  maxSkills: 2,

  armorRestrictions: ["cloth", "leather"],
  // Warlock pays spell cost in health (HP:N per CSV).
  spellCost: { type: "health" },

  classResources: {
    darkness_shards: {
      maxStacks: 3,
      desc: "Shared pool of Darkness Shards. Produced by Soul Collector (on final blow) and Spell Predation (per removable magical buff consumed). Consumed on dealing dark magical damage. At Blood Pact activation, current shard count is snapshotted and locks in per-shard bonuses for the full demon form duration (independent from this live pool).",
    },
  },

  perks: [
    {
      id: "demon_armor",
      type: "perk",
      name: "Demon Armor",
      desc: "Gain the ability to equip plate armor, but lose 10% spell casting speed.",
      activation: "passive",
      tags: ["demon"],
      grantsArmor: "plate",
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
      desc: "Dealing physical damage to an enemy with a melee weapon deals 2 true dark magical damage and heals you for 2 health. The true damage and healing do not scale.",
      activation: "passive",
      tags: ["dark"],
      triggers: [
        {
          desc: "Fires on melee physical hit — +2 true dark_magical to target, heal self 2.",
          damage: [
            { base: 2, scaling: 0, damageType: "dark_magical", trueDamage: true, target: "enemy" },
          ],
          heal: {
            baseHeal: 2, scaling: 0, healType: "magical", target: "self",
          },
        },
      ],
    },

    {
      id: "dark_reflection",
      type: "perk",
      name: "Dark Reflection",
      desc: "While active, reflect 15(0.75) dark magical damage to the melee attacker. Does not reflect while on cooldown.",
      activation: "toggle",
      targeting: "self",
      tags: ["dark"],
      triggers: [
        {
          desc: "Fires on melee hit taken (while active, off cooldown) — reflect 15(0.75) dark_magical.",
          damage: [
            { base: 15, scaling: 0.75, damageType: "dark_magical", target: "enemy" },
          ],
        },
      ],
      passives: { cooldownGated: true },
    },

    {
      id: "antimagic",
      type: "perk",
      name: "Antimagic",
      desc: "Gain 20% magical damage reduction except against divine magic. Applied as a separate multiplicative layer after capped MDR.",
      activation: "passive",
      effects: [
        {
          stat: "magicDamageTaken",
          value: 0.80,
          phase: "post_cap_multiplicative_layer",
          condition: { type: "damage_type", exclude: ["divine_magical"] },
        },
      ],
    },

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

    {
      id: "torture_mastery",
      type: "perk",
      name: "Torture Mastery",
      desc: "All curses inflicted upon enemies restore 2(0.15) recoverable health to the caster with each instance of damage dealt. All Warlock spell costs are doubled when this perk is equipped.",
      activation: "passive",
      triggers: [
        {
          desc: "Fires on each curse-tag damage tick — caster gains 2(0.15) recoverable health.",
          heal: {
            baseHeal: 2, scaling: 0.15, healType: "magical", target: "self",
          },
          // Gating on curse-tagged outgoing damage — desc-only per Convention 4.
        },
      ],
      // ×2 spell costs — abilityModifiers.modify: "cost" per tracker D (A and D.2).
      abilityModifiers: [
        { target: { type: "spell" }, modify: "cost", value: 1.0, mode: "multiply" },
      ],
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
        {
          stat: "healingMod", value: 1.00, phase: "healing_modifier",
          condition: { type: "hp_below", threshold: 0.05 },
        },
      ],
      passives: { spellsCannotKill: true },
    },

    {
      id: "infernal_pledge",
      type: "perk",
      name: "Infernal Pledge",
      desc: "Reduces damage taken from undead and demons by 40%.",
      activation: "passive",
      effects: [
        {
          stat: "undeadDamageReduction", value: 0.40, phase: "post_curve",
          condition: { type: "creature_type", creatureType: "undead" },
        },
        {
          stat: "demonDamageReduction", value: 0.40, phase: "post_curve",
          condition: { type: "creature_type", creatureType: "demon" },
        },
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
      stacking: {
        resource: "darkness_shards",
        perStack: [
          { stat: "all_attributes", value: 1, phase: "pre_curve_flat" },
          { stat: "typeDamageBonus", value: 0.33, phase: "type_damage_bonus", damageType: "dark_magical" },
        ],
        desc: "Darkness Shards — +1 all attributes and +33% dark_magical typeDamageBonus per shard from the live shared pool.",
      },
    },
  ],

  skills: [
    {
      id: "spell_memory_1",
      type: "skill",
      name: "Spell Memory I",
      desc: "5 spell slots.",
      activation: "passive",
      slots: { type: "spell", count: 5 },
    },

    {
      id: "spell_memory_2",
      type: "skill",
      name: "Spell Memory II",
      desc: "5 spell slots.",
      activation: "passive",
      slots: { type: "spell", count: 5 },
    },

    {
      id: "blow_of_corruption",
      type: "skill",
      name: "Blow of Corruption",
      desc: "Your next physical attack deals 12(1.0) evil magical damage to the target and reduces their incoming physical and magical healing by 80% for 12 seconds.",
      activation: "cast",
      targeting: "enemy",
      duration: { base: 12, type: "debuff" },
      damage: [
        { base: 12, scaling: 1.0, damageType: "evil_magical", target: "enemy" },
      ],
      effects: [
        { stat: "incomingPhysicalHealing", value: -0.80, phase: "post_curve", target: "enemy" },
        { stat: "incomingMagicalHealing", value: -0.80, phase: "post_curve", target: "enemy" },
      ],
    },

    {
      id: "phantomize",
      type: "skill",
      name: "Phantomize",
      desc: "Phase through melee attacks and projectiles for 4 seconds. While active, you gain 5% move speed bonus and lose 50% magical damage reduction. During this period you can only move and do not collide with other players or monsters.",
      activation: "toggle",
      targeting: "self",
      duration: { base: 4, type: "buff" },
      effects: [
        { stat: "moveSpeedBonus", value: 0.05, phase: "post_curve" },
        { stat: "magicalDamageReduction", value: -0.50, phase: "post_curve" },
      ],
      passives: { phaseThrough: true },
    },

    {
      id: "dark_offering",
      type: "skill",
      name: "Dark Offering",
      desc: "Channel your mind, sacrificing 10% of your max health per second to gain 5% magical damage bonus and 5% physical damage bonus per stack. This bonus lasts for 60 seconds.",
      activation: "toggle",
      targeting: "self",
      tags: ["channel"],
      duration: { base: 60, type: "buff" },
      stacking: {
        maxStacks: 10,
        perStack: [
          { stat: "physicalDamageBonus", value: 0.05, phase: "post_curve" },
          { stat: "magicalDamageBonus", value: 0.05, phase: "post_curve" },
        ],
        desc: "Stacks — +5% physical and +5% magical damage bonus per stack. Gained per second while channeling at the cost of 10% max HP/s.",
      },
      passives: { selfDamagePerSecond: 0.10 },
    },

    {
      id: "exploitation_strike",
      type: "skill",
      name: "Exploitation Strike",
      desc: "Cast to gain the Exploitation Strike buff (tooltip: 2s; in-game base ~15s). While active, your unarmed attacks deal +20(1.0) evil magical damage and heal you for 10% of the target's maximum health.",
      activation: "cast",
      targeting: "self",
      tags: ["demon", "buff"],
      condition: { type: "form_active", form: "demon" },
      duration: { base: 15, type: "buff" },
      triggers: [
        {
          event: "on_melee_hit",
          condition: {
            type: "all",
            conditions: [
              { type: "effect_active", effectId: "exploitation_strike" },
              { type: "weaponType", weaponType: "unarmed" },
            ],
          },
          damage: [
            { base: 20, scaling: 1.0, damageType: "evil_magical", target: "enemy" },
          ],
          passives: { lifestealOfTargetMaxHp: 0.10 },
          desc: "Per unarmed hit while buff active — +20(1.0) evil magical + heal 10% of target's max HP.",
        },
      ],
      _unverified: {
        tooltipMismatch: "Tooltip says 2s; in-game base is ~15s (measured 18s with +20% buffDurationBonus). Authored to the in-game base.",
      },
    },

    {
      id: "exit_demon_form",
      type: "skill",
      name: "Exit Demon Form",
      desc: "Return to human form. No stat changes.",
      activation: "cast",
      targeting: "self",
      tags: ["demon"],
      condition: { type: "form_active", form: "demon" },
      // State-change action — exits the Blood Pact transformation. No stat
      // effects; the form removal is the full mechanic.
    },
  ],

  spells: [
    {
      id: "power_of_sacrifice",
      type: "spell",
      name: "Power of Sacrifice",
      desc: "Deal 3 evil magical damage per second to the target while increasing the target's strength and vigor by 15 for 12 seconds. Self casts if no target is found.",
      activation: "cast",
      cost: { type: "health", value: 4 },
      targeting: "enemy_or_self",
      tags: ["evil"],
      duration: { base: 12, type: "buff" },
      damage: [
        { base: 3, scaling: 0, damageType: "evil_magical", isDot: true, tickRate: 1, target: "either" },
      ],
      effects: [
        { stat: "str", value: 15, phase: "pre_curve_flat", target: "either" },
        { stat: "vig", value: 15, phase: "pre_curve_flat", target: "either" },
      ],
    },

    {
      id: "curse_of_weakness",
      type: "spell",
      name: "Curse of Weakness",
      desc: "Reduces the target's all attributes by 25% and reduces physical damage reduction by 15% and reduces magical damage reduction by 15% for 12 seconds.",
      activation: "cast",
      cost: { type: "health", value: 4 },
      targeting: "enemy",
      tags: ["curse"],
      duration: { base: 12, type: "debuff", tags: ["curse"] },
      effects: [
        { stat: "all_attributes", value: -0.25, phase: "attribute_multiplier", target: "enemy" },
        { stat: "physicalDamageReduction", value: -0.15, phase: "post_curve", target: "enemy" },
        { stat: "magicalDamageReduction", value: -0.15, phase: "post_curve", target: "enemy" },
      ],
    },

    {
      id: "bolt_of_darkness",
      type: "spell",
      name: "Bolt of Darkness",
      desc: "Fires a bolt that deals 20(1.0) dark magical damage to the target.",
      activation: "cast",
      cost: { type: "health", value: 4 },
      targeting: "enemy",
      tags: ["dark", "projectile"],
      damage: [
        { base: 20, scaling: 1.0, damageType: "dark_magical", target: "enemy" },
      ],
    },

    {
      id: "bloodstained_blade",
      type: "spell",
      name: "Bloodstained Blade",
      desc: "While active, the target gains 5 weapon damage for 20 seconds. When the target swings their weapon, they take 3 evil magical damage. Self cast if no target is found.",
      activation: "cast",
      cost: { type: "health", value: 4 },
      targeting: "ally_or_self",
      tags: ["blood"],
      duration: { base: 20, type: "buff" },
      effects: [
        { stat: "buffWeaponDamage", value: 5, phase: "post_curve", target: "self" },
      ],
      triggers: [
        {
          desc: "Fires each weapon swing by the buffed target — 3 evil_magical self-damage.",
          damage: [
            { base: 3, scaling: 0, damageType: "evil_magical", target: "self" },
          ],
        },
      ],
    },

    {
      id: "curse_of_pain",
      type: "spell",
      name: "Curse of Pain",
      desc: "Deal 15(1.0) evil magical damage to the target instantly. Additionally deal 15(0.5) evil magical damage distributed over 8 seconds.",
      activation: "cast",
      cost: { type: "health", value: 4 },
      targeting: "enemy",
      tags: ["curse", "evil"],
      duration: { base: 8, type: "debuff", tags: ["curse"] },
      damage: [
        { base: 15, scaling: 1.0, damageType: "evil_magical", target: "enemy", label: "instant" },
        { base: 15, scaling: 0.5, damageType: "evil_magical", isDot: true, tickRate: 1, target: "enemy", label: "DoT (8s total)" },
      ],
    },

    {
      id: "spell_predation",
      type: "spell",
      name: "Spell Predation",
      desc: "Consume up to all removable magical buffs from the enemy and gain 1 Darkness Shard per effect. Inflict 3(1.0) evil magical damage per effect.",
      activation: "cast",
      cost: { type: "health", value: 4 },
      targeting: "enemy",
      tags: ["dark"],
      damage: [
        { base: 3, scaling: 1.0, damageType: "evil_magical", target: "enemy", label: "per buff consumed" },
      ],
      // Shard gain is cross-ability shared-pool semantics — desc-only per
      // tracker F V10/V30 until Phase 1.3 decides architecture.
    },

    {
      id: "evil_eye",
      type: "spell",
      name: "Evil Eye",
      desc: "Channel for 1 second and summon an evil eye that can be possessed by the caster for 30 seconds.",
      activation: "cast",
      cost: { type: "health", value: 5 },
      targeting: "self",
      tags: ["dark", "channel"],
      summon: {
        type: "evil_eye",
        duration: { base: 30, type: "other" },
        desc: "Evil Eye — possessable by caster for vision/scouting; 1s cast time.",
      },
      passives: { castTime: 1, possessable: true },
    },

    {
      id: "ray_of_darkness",
      type: "spell",
      name: "Ray of Darkness",
      desc: "Channel a dark beam dealing 12(1.0) dark magical damage per second to any target the beam touches. Moving and aiming are possible while channeling.",
      activation: "cast",
      cost: { type: "health", value: 5 },
      targeting: "enemy",
      tags: ["dark", "beam", "channel"],
      duration: { base: 5, type: "other" },
      damage: [
        { base: 12, scaling: 1.0, damageType: "dark_magical", isDot: true, tickRate: 1, target: "enemy", label: "per second" },
      ],
      passives: { canMoveWhileChanneling: true },
    },

    {
      id: "life_drain",
      type: "spell",
      name: "Life Drain",
      desc: "Channel for 7.5 seconds, dealing 5(0.25) evil magical damage to the target per second. Convert a portion of the damage dealt into health for the caster.",
      activation: "cast",
      cost: { type: "health", value: 5 },
      targeting: "enemy",
      tags: ["evil", "channel"],
      duration: { base: 7.5, type: "other" },
      damage: [
        { base: 5, scaling: 0.25, damageType: "evil_magical", isDot: true, tickRate: 1, target: "enemy", label: "per second" },
      ],
      // Heals caster for 100% of pre-MDR damage dealt. Derived from single
      // in-game data point (2026-04-13): 6 damage post-Ruins-MDR-7.5% ≈ 7
      // pre-MDR, 7 HP healed → 100%. Confirm at higher MPB levels if needed.
      passives: { lifestealOnDamage: 1.0 },
    },

    {
      id: "hellfire",
      type: "spell",
      name: "Hellfire",
      desc: "Cast eternal hellfire and blast it towards the targets. Deal 60(0.5) fire magical damage per second to any target within the area of effect. The hellfire does not dissipate when it reaches the target.",
      activation: "cast",
      cost: { type: "health", value: 6 },
      targeting: "enemy",
      tags: ["fire"],
      damage: [
        { base: 60, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1, target: "nearby_enemies", label: "per second (AoE)" },
      ],
    },

    {
      id: "eldritch_shield",
      type: "spell",
      name: "Eldritch Shield",
      desc: "Grants the target a shield that protects against 25 magical damage for 15 seconds. When the shield absorbs its maximum damage, gain 30% dark magical damage bonus and 50% spell casting speed towards the next dark spell cast within 6 seconds.",
      activation: "cast",
      cost: { type: "health", value: 6 },
      targeting: "ally_or_self",
      tags: ["dark"],
      duration: { base: 15, type: "buff" },
      shield: { base: 25, scaling: 0, damageFilter: "magical" },
      triggers: [
        {
          desc: "Fires on shield break (max absorb reached) — +30% dark_magical typeDamageBonus and +50% SCS for next dark spell within 6s (window desc-only).",
          effects: [
            { stat: "typeDamageBonus", value: 0.30, phase: "type_damage_bonus", damageType: "dark_magical", target: "self" },
            { stat: "spellCastingSpeed", value: 0.50, phase: "post_curve", target: "self" },
          ],
        },
      ],
    },

    {
      id: "flame_walker",
      type: "spell",
      name: "Flame Walker",
      desc: "While active, gain the ability to leave a trail of Hellfire for 6 seconds. Each step leaves a trail that lasts for 4 seconds. Targets that enter the flame area will burn, taking 5(1.0) fire magical damage per 0.2 seconds.",
      activation: "toggle",
      cost: { type: "health", value: 6 },
      targeting: "self",
      tags: ["fire"],
      duration: { base: 6, type: "buff" },
      // Trail damage — 5(1.0) per 0.2s tick. Target: nearby_enemies that enter
      // the trail. Trail itself persists 4s per step; authored per-tick with
      // isDot at tickRate 0.2.
      damage: [
        { base: 5, scaling: 1.0, damageType: "fire_magical", isDot: true, tickRate: 0.2, target: "nearby_enemies", label: "per 0.2s (trail)" },
      ],
      passives: { trailDuration: 4 },
    },

    {
      id: "summon_hydra",
      type: "spell",
      name: "Summon Hydra",
      desc: "Summons a Hydra that spits fireballs dealing 10(1.0) fire magical damage to enemy target for 10 seconds. The hydra can also detect hidden targets.",
      activation: "cast",
      cost: { type: "health", value: 12 },
      targeting: "self",
      tags: ["fire", "summon"],
      summon: {
        type: "hydra",
        duration: { base: 10, type: "other" },
        damage: [
          { base: 10, scaling: 1.0, damageType: "fire_magical", target: "enemy", label: "hydra fireball" },
        ],
        desc: "Hydra — spits fireballs at enemies; detects hidden targets.",
      },
      passives: { detectsHidden: true },
    },
  ],

  transformations: [
    {
      id: "blood_pact",
      type: "transformation",
      name: "Blood Pact",
      // Blood Pact is presented in the CSV as a Skill but is mechanically a
      // demon-form transformation (own form, replacement skills, irreversible
      // until contract ends, Darkness Shard consumption locks in bonuses).
      // Placed in `transformations` per vocab Cat 1 + tracker D.3.
      desc: "Take the form of your contracted demon. +30 max HP, +50 armor rating, +50 magic resistance. Abyssal Flame: 1% self-damage per second, 2(0.25) magical damage per second to nearby enemies. Irreversible until contract ends. On activation, consumes existing Darkness Shards, locking in +1 all attributes and +33% dark magical damage bonus per shard for the full duration. Skills change to demon-only: Exploitation Strike + Exit Demon Form. Bolt of Darkness becomes castable bare-handed while in demon form.",
      activation: "toggle",
      targeting: "self",
      tags: ["demon", "blood"],
      // While in demon form, Bolt of Darkness is castable bare-handed.
      grantsSpells: ["bolt_of_darkness"],
      form: {
        formId: "demon",
        scalesWith: "wil",
        // No form-unique attacks — regular unarmed melee applies. Form-gated
        // skills (exploitation_strike, exit_demon_form) live in skills[] and
        // are referenced via passives.altSkills.
        attacks: [],
      },
      effects: [
        { stat: "maxHealth", value: 30, phase: "pre_curve_flat", condition: { type: "form_active", form: "demon" } },
        { stat: "armorRating", value: 50, phase: "pre_curve_flat", condition: { type: "form_active", form: "demon" } },
        { stat: "magicResistance", value: 50, phase: "pre_curve_flat", condition: { type: "form_active", form: "demon" } },
      ],
      // Abyssal Flame AoE to nearby enemies while in form.
      triggers: [
        {
          desc: "Fires each second while in demon form — 2(0.25) magical damage to nearby enemies (Abyssal Flame AoE).",
          damage: [
            { base: 2, scaling: 0.25, damageType: "magical", isDot: true, tickRate: 1, target: "nearby_enemies" },
          ],
          condition: { type: "form_active", form: "demon" },
        },
      ],
      // Ability-local stacking (no `resource` pointer) per D.11: this is a
      // snapshot taken at activation from the live darkness_shards pool,
      // independent of subsequent pool changes. Locks in +1 all attributes
      // and +33% dark_magical typeDamageBonus per shard for the full form.
      stacking: {
        maxStacks: 3,
        perStack: [
          { stat: "all_attributes", value: 1, phase: "pre_curve_flat" },
          { stat: "typeDamageBonus", value: 0.33, phase: "type_damage_bonus", damageType: "dark_magical" },
        ],
        desc: "Darkness Shards consumed at activation — locks in +1 all attributes and +33% dark_magical typeDamageBonus per shard for the entire demon form duration.",
      },
      passives: {
        selfDamagePerSecond: 0.01,
        altSkills: ["exploitation_strike", "exit_demon_form"],
        irreversibleUntilContractEnds: true,
      },
    },
  ],
});

export default warlock;
