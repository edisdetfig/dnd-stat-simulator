// Warlock class definition
// Season 8, Hotfix 112-1

import { EFFECT_PHASES, TARGETING } from '../constants.js';

const { PRE_CURVE_FLAT, ATTRIBUTE_MULTIPLIER, POST_CURVE, TYPE_DAMAGE_BONUS, DAMAGE_OVER_TIME } = EFFECT_PHASES;
const { SELF_ONLY, ALLY_OR_SELF, ENEMY_OR_SELF, ENEMY_ONLY } = TARGETING;

export const warlock = {
  id: "warlock",
  name: "Warlock",

  // Base attributes
  baseStats: {
    str: 11,
    vig: 14,
    agi: 14,
    dex: 15,
    wil: 22,
    kno: 15,
    res: 14,
  },

  // Class configuration
  maxPerks: 4,
  maxSkills: 2,
  spellCostType: "health",  // Warlock spells cost health to cast
  equippableArmor: ["cloth", "leather"],  // Base armor types (perks can grant more)

  // Stats to prominently display for this class
  majorDerivedStats: [
    "hp", "ppb", "mpb", "pdr", "mdr",
    "moveSpeed", "actionSpeed", "spellCastingSpeed", "magicalHealing"
  ],

  // Perks
  perks: [
    {
      id: "demon_armor",
      name: "Demon Armor",
      desc: "Equip plate armor. -10% Spell Casting Speed.",
      statEffects: [
        { stat: "spellCastingSpeed", value: -0.10 }
      ],
      grantsArmor: ["plate"],
    },
    {
      id: "shadow_touch",
      name: "Shadow Touch",
      desc: "+2 dark magic on melee hit, heal 2 HP.",
      onHitEffects: [
        { damageType: "dark_magical", damage: 2 }
      ],
      healOnHit: {
        baseHeal: 2,
        scaling: 0,  // 0% scaling means flat heal, unaffected by gear
        healType: "magical",
        trigger: "melee_hit",
      },
    },
    {
      id: "dark_reflection",
      name: "Dark Reflection",
      desc: "15(0.75) dark magic when hit by melee.",
      onHitReceived: [
        { damageType: "dark_magical", base: 15, scaling: 0.75 }
      ],
    },
    {
      id: "antimagic",
      name: "Antimagic",
      desc: "20% magic damage reduction (not divine).",
      passiveEffects: {
        antimagic: true,  // Separate multiplicative layer, doesn't affect divine
      },
    },
    {
      id: "dark_enhancement",
      name: "Dark Enhancement",
      desc: "+20% dark magic damage.",
      typeDamageBonus: {
        dark_magical: 0.20,
      },
    },
    {
      id: "torture_mastery",
      name: "Torture Mastery",
      desc: "Heal on curse damage. 2× spell costs.",
      spellCostMultiplier: 2.0,
      healOnCurseTick: {
        baseHeal: 2,
        scaling: 0.15,
        healType: "magical",
      },
    },
    {
      id: "curse_mastery",
      name: "Curse Mastery",
      desc: "+30% curse duration.",
      curseDurationBonus: 0.30,
    },
    {
      id: "immortal_lament",
      name: "Immortal Lament",
      desc: "Spells can't kill you. +100% magic heal below 5% HP.",
      passiveEffects: {
        spellsCannotKill: true,
        lowHpHealingBonus: { threshold: 0.05, bonus: 1.0, healType: "magical" },
      },
    },
    {
      id: "infernal_pledge",
      name: "Infernal Pledge",
      desc: "-40% damage from undead/demons (PvE).",
      damageReduction: {
        undead: 0.40,
        demon: 0.40,
      },
    },
    {
      id: "vampirism",
      name: "Vampirism",
      desc: "+20% magical healing bonus.",
      healingMod: 0.20,  // Multiplicative bonus to all magical healing received
    },
    {
      id: "soul_collector",
      name: "Soul Collector",
      desc: "Gain Darkness Shard on kill.",
      passiveEffects: {
        darknessShardOnKill: true,
      },
    },
  ],

  // Skills
  skills: [
    {
      id: "spell_memory_1",
      name: "Spell Memory I",
      type: "spell_memory",
      spellSlots: 5,
    },
    {
      id: "spell_memory_2",
      name: "Spell Memory II",
      type: "spell_memory",
      spellSlots: 5,
    },
    {
      id: "blow_of_corruption",
      name: "Blow of Corruption",
      type: "combat",
      desc: "12(1.0) evil magic on next attack. -80% healing 12s. CD 24s.",
      cooldown: 24,
      damage: [
        { base: 12, scaling: 1.0, damageType: "evil_magical", label: "Body", affectedByHitLocation: true }
      ],
      debuffOnHit: {
        stat: "healingReceived",
        value: -0.80,
        duration: 12,
      },
    },
    {
      id: "blood_pact",
      name: "Blood Pact",
      type: "combat",
      desc: "Demon form: +30 HP, +50 AR/MR, AoE damage.",
      cooldown: 180,
      // Complex transformation skill - details TBD
    },
    {
      id: "phantomize",
      name: "Phantomize",
      type: "combat",
      desc: "Phase through attacks 4s. +5% MS, -50% MDR.",
      cooldown: 42,
      duration: 4,
      effects: [
        { phase: POST_CURVE, stat: "moveSpeed", value: 0.05, isPercent: true },
        { phase: POST_CURVE, stat: "magicalDamageReduction", value: -0.50 },
      ],
      passiveEffects: {
        phasethrough: true,  // Cannot be hit by physical attacks
      },
    },
  ],

  // Spells
  spells: [
    // Tier 1
    {
      id: "power_of_sacrifice",
      name: "Power of Sacrifice",
      tier: 1,
      memoryCost: 1,
      healthCost: 4,
      targeting: ENEMY_OR_SELF,
      duration: 12,
      tooltip: "Deal 3 evil magical damage per second to the target while increasing their strength by 15 and vigor by 15 for 12 seconds. Self casts if no target is found.",
      effects: [
        { phase: PRE_CURVE_FLAT, stat: "str", value: 15 },
        { phase: PRE_CURVE_FLAT, stat: "vig", value: 15 },
        { phase: DAMAGE_OVER_TIME, damageType: "evil_magical", damagePerSecond: 3 },
      ],
    },
    {
      id: "curse_of_weakness",
      name: "Curse of Weakness",
      tier: 1,
      memoryCost: 1,
      healthCost: 4,
      targeting: ENEMY_ONLY,
      damageType: "curse",
      duration: 12,
      tooltip: "Reduce the target all attributes by 25%, physical damage reduction by 15%, magical damage reduction by 15% for 12 seconds.",
      effects: [
        { phase: ATTRIBUTE_MULTIPLIER, stat: "all_attributes", value: -0.25 },
        { phase: POST_CURVE, stat: "physicalDamageReduction", value: -0.15 },
        { phase: POST_CURVE, stat: "magicalDamageReduction", value: -0.15 },
      ],
    },
    {
      id: "bolt_of_darkness",
      name: "Bolt of Darkness",
      tier: 1,
      memoryCost: 1,
      healthCost: 4,
      targeting: ENEMY_ONLY,
      tooltip: "Fire a bolt that deals 20(1.0) dark magical damage.",
      damage: [
        { base: 20, scaling: 1.0, damageType: "dark_magical", label: "Projectile" }
      ],
    },

    // Tier 2
    {
      id: "bloodstained_blade",
      name: "Bloodstained Blade",
      tier: 2,
      memoryCost: 2,
      healthCost: 4,
      targeting: ALLY_OR_SELF,
      duration: 20,
      tooltip: "Increase the target's weapon damage by 5 for 20 seconds. Self casts if no target is found.",
      effects: [
        { phase: PRE_CURVE_FLAT, stat: "buffWeaponDamage", value: 5 },
      ],
    },
    {
      id: "curse_of_pain",
      name: "Curse of Pain",
      tier: 2,
      memoryCost: 2,
      healthCost: 4,
      targeting: ENEMY_ONLY,
      damageType: "curse",
      duration: 8,
      tooltip: "Deal 15(1.0) evil magical damage and curse the target to take 15(0.5) evil magical damage over 8 seconds.",
      damage: [
        { base: 15, scaling: 1.0, damageType: "evil_magical", label: "Initial hit" },
        { base: 15, scaling: 0.5, damageType: "evil_magical", label: "DoT total (8s)", isDot: true },
      ],
    },

    // Tier 3
    {
      id: "spell_predation",
      name: "Spell Predation",
      tier: 3,
      memoryCost: 3,
      healthCost: 4,
      targeting: ENEMY_ONLY,
      tooltip: "Strip buffs from target and deal 3(1.0) evil magical damage per buff stripped.",
      damage: [
        { base: 3, scaling: 1.0, damageType: "evil_magical", label: "Per buff stripped", perBuff: true }
      ],
    },
    {
      id: "evil_eye",
      name: "Evil Eye",
      tier: 3,
      memoryCost: 3,
      healthCost: 5,
      targeting: ENEMY_ONLY,
      duration: 4,
      tooltip: "Slow the target's move speed and action speed by 40% for 4 seconds.",
      effects: [
        { phase: POST_CURVE, stat: "moveSpeed", value: -0.40, isPercent: true },
        { phase: POST_CURVE, stat: "actionSpeed", value: -0.40 },
      ],
    },

    // Tier 4
    {
      id: "ray_of_darkness",
      name: "Ray of Darkness",
      tier: 4,
      memoryCost: 4,
      healthCost: 5,
      targeting: ENEMY_ONLY,
      tooltip: "Channel a ray dealing 12(1.0) dark magical damage per tick.",
      damage: [
        { base: 12, scaling: 1.0, damageType: "dark_magical", label: "Per tick", isChannel: true }
      ],
    },
    {
      id: "life_drain",
      name: "Life Drain",
      tier: 4,
      memoryCost: 4,
      healthCost: 5,
      targeting: ENEMY_ONLY,
      duration: 7.5,
      tooltip: "Channel a drain dealing 5(0.25) evil magical damage per tick and healing you.",
      damage: [
        { base: 5, scaling: 0.25, damageType: "evil_magical", label: "Per tick (7.5s)", isChannel: true }
      ],
      healOnDamage: true,  // Heals caster based on damage dealt
    },
    {
      id: "hellfire",
      name: "Hellfire",
      tier: 4,
      memoryCost: 4,
      healthCost: 6,
      targeting: ENEMY_ONLY,
      tooltip: "Summon hellfire that deals 60(0.5) fire magical damage in an area.",
      damage: [
        { base: 60, scaling: 0.5, damageType: "fire_magical", label: "AoE hit" }
      ],
    },

    // Tier 5
    {
      id: "eldritch_shield",
      name: "Eldritch Shield",
      tier: 5,
      memoryCost: 5,
      healthCost: 6,
      targeting: SELF_ONLY,
      duration: 8,
      tooltip: "Create a shield that absorbs damage. On break: +50% Spell Casting Speed, +30% dark magic damage for 6s.",
      shieldAmount: 15,  // Base shield HP
      onBreak: {
        duration: 6,
        effects: [
          { phase: POST_CURVE, stat: "spellCastingSpeed", value: 0.50 },
          { phase: TYPE_DAMAGE_BONUS, damageType: "dark_magical", value: 0.30 },
        ],
      },
    },
    {
      id: "flame_walker",
      name: "Flame Walker",
      tier: 5,
      memoryCost: 5,
      healthCost: 6,
      targeting: SELF_ONLY,
      duration: 8,
      tooltip: "Leave a trail of fire that deals 5(1.0) fire magical damage per 0.2s tick to enemies.",
      damage: [
        { base: 5, scaling: 1.0, damageType: "fire_magical", label: "Per 0.2s tick", tickRate: 0.2 }
      ],
    },

    // Tier 6
    {
      id: "summon_hydra",
      name: "Summon Hydra",
      tier: 6,
      memoryCost: 6,
      healthCost: 12,
      targeting: SELF_ONLY,
      duration: 20,
      tooltip: "Summon a hydra that shoots fireballs dealing 10(1.0) fire magical damage.",
      summon: {
        type: "hydra",
        damage: [
          { base: 10, scaling: 1.0, damageType: "fire_magical", label: "Fireball" }
        ],
      },
    },
  ],
};
