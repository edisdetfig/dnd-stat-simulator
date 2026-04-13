// Barbarian — v3 class definition.
// Authored from docs/classes/barbarian.csv. See engine_requirements_phase_1_3.md.

export const barbarian = ({
  id: "barbarian",
  name: "Barbarian",
  desc: "Rage, carnage, and two-handed devastation.",

  baseAttributes: { str: 20, vig: 25, agi: 13, dex: 12, wil: 18, kno: 5, res: 12 },
  baseHealth: 140,

  maxPerks: 4,
  maxSkills: 2,

  armorRestrictions: ["cloth", "leather", "plate"],
  spellCost: { type: "none" },

  perks: [
    {
      id: "axe_specialization",
      type: "perk",
      name: "Axe Specialization",
      desc: "While using axes, gain 3 weapon damage.",
      activation: "passive",
      effects: [
        {
          stat: "weaponDamage", value: 3, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "axe" },
        },
      ],
    },

    {
      id: "berserker",
      type: "perk",
      name: "Berserker",
      desc: "Gain 2% physical damage bonus and 0.5% move speed bonus for every 10% of your maximum health missing, up to 20% and 5% respectively.",
      activation: "passive",
      effects: [
        {
          stat: "physicalDamageBonus", value: 0, phase: "post_curve",
          hpScaling: { per: 10, valuePerStep: 0.02, maxValue: 0.20 },
        },
        {
          stat: "moveSpeedBonus", value: 0, phase: "post_curve",
          hpScaling: { per: 10, valuePerStep: 0.005, maxValue: 0.05 },
        },
      ],
    },

    {
      id: "carnage",
      type: "perk",
      name: "Carnage",
      desc: "When you hit 2 or more players with a melee weapon within 1.5 seconds, gain 40% physical damage bonus for 3 seconds.",
      activation: "passive",
      duration: { base: 3, type: "buff" },
      triggers: [
        {
          desc: "Fires when you hit 2 or more players with a melee weapon within 1.5 seconds.",
          effects: [
            { stat: "physicalDamageBonus", value: 0.40, phase: "post_curve", target: "self" },
          ],
        },
      ],
    },

    {
      id: "crush",
      type: "perk",
      name: "Crush",
      desc: "While equipped with a two-handed weapon, gain the ability to destroy unreinforced containers. Also gain 1 impact power on your two-handed weapon attacks, making it easier to break blocks and parries.",
      activation: "passive",
      effects: [
        {
          stat: "impactPower", value: 1, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "two_handed" },
        },
      ],
      passives: { destroyContainers: true },
    },

    {
      id: "executioner",
      type: "perk",
      name: "Executioner",
      desc: "While using axes, gain 20% headshot power.",
      activation: "passive",
      effects: [
        {
          stat: "headshotPower", value: 0.20, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "axe" },
        },
      ],
    },

    {
      id: "heavy_swing",
      type: "perk",
      name: "Heavy Swing",
      desc: "Hitting a target with a two-handed weapon reduces their move speed by 10%.",
      activation: "passive",
      triggers: [
        {
          desc: "Fires on hit with a two-handed weapon.",
          condition: { type: "weapon_type", weaponType: "two_handed" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.10, phase: "post_curve", target: "enemy" },
          ],
        },
      ],
    },

    {
      id: "iron_will",
      type: "perk",
      name: "Iron Will",
      desc: "Gain 75 magic resistance and ignore knockback effects. The maximum magical damage reduction limit is increased to 75%.",
      activation: "passive",
      effects: [
        { stat: "magicResistance", value: 75, phase: "pre_curve_flat" },
        { stat: "mdr", value: 0.75, phase: "cap_override" },
        { stat: "knockbackResistance", value: 1.0, phase: "post_curve" },
      ],
    },

    {
      id: "morale_boost",
      type: "perk",
      name: "Morale Boost",
      desc: "Recover 25% maximum health after killing a player.",
      activation: "passive",
      triggers: [
        {
          desc: "Fires on player kill — heals 25% max HP.",
          heal: {
            baseHeal: 0,
            scaling: 0,
            healType: "physical",
            target: "self",
            percentMaxHealth: 0.25,
          },
        },
      ],
    },

    {
      id: "potion_chugger",
      type: "perk",
      name: "Potion Chugger",
      desc: "Gain 20% increased potency towards all drinks, while reducing the duration by 50%.",
      activation: "passive",
      effects: [
        { stat: "potionPotency", value: 0.20, phase: "post_curve" },
      ],
      abilityModifiers: [
        {
          target: { tags: ["potion"] },
          modify: "duration",
          value: -0.50,
          mode: "multiply",
        },
      ],
    },

    {
      id: "robust",
      type: "perk",
      name: "Robust",
      // CSV sim-note: tooltip says 8%; actual in-game is ~7.5%. Author to verified value.
      desc: "Gain 8% max health bonus (actual: 7.5%).",
      activation: "passive",
      effects: [
        { stat: "maxHealthBonus", value: 0.075, phase: "pre_curve_flat" },
      ],
    },

    {
      id: "savage",
      type: "perk",
      name: "Savage",
      desc: "While not wearing any chest armor, gain 10% physical damage bonus and 1 impact power.",
      activation: "passive",
      effects: [
        {
          stat: "physicalDamageBonus", value: 0.10, phase: "post_curve",
          condition: { type: "equipment", slot: "chest", equipped: false },
        },
        {
          stat: "impactPower", value: 1, phase: "post_curve",
          condition: { type: "equipment", slot: "chest", equipped: false },
        },
      ],
    },

    {
      id: "skull_splitter",
      type: "perk",
      name: "Skull Splitter",
      desc: "Targets hit by a headshot are inflicted with Bleed. Bleed: Deals a total of 12 physical damage over 4 seconds.",
      activation: "passive",
      triggers: [
        {
          desc: "Fires on headshot — applies Bleed status.",
          appliesStatus: [
            {
              type: "bleed",
              duration: { base: 4, type: "debuff" },
              damage: {
                base: 3,
                scaling: 0,
                damageType: "physical",
                isDot: true,
                tickRate: 1,
              },
              desc: "12 total physical damage over 4s (3/s × 4 ticks).",
            },
          ],
        },
      ],
    },

    {
      id: "treacherous_lungs",
      type: "perk",
      name: "Treacherous Lungs",
      desc: "Increases the duration of all shouting abilities by 50% and reduces their cooldown by 10%.",
      activation: "passive",
      effects: [
        { stat: "shoutDurationBonus", value: 0.50, phase: "post_curve" },
      ],
      abilityModifiers: [
        { target: { tags: ["shout"] }, modify: "cooldown", value: -0.10, mode: "multiply" },
      ],
    },

    {
      id: "two_hander",
      type: "perk",
      name: "Two-Hander",
      desc: "When attacking with a two-handed weapon, gain 5% physical damage bonus and 10% armor penetration.",
      activation: "passive",
      effects: [
        {
          stat: "physicalDamageBonus", value: 0.05, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "two_handed" },
        },
        {
          stat: "armorPenetration", value: 0.10, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "two_handed" },
        },
      ],
    },
  ],

  skills: [
    {
      id: "achilles_strike",
      type: "skill",
      name: "Achilles Strike",
      desc: "Strike a target, reducing their move speed bonus by 30% for 2 seconds. While debuffed, each time the target moves they receive 1(0.5) physical damage.",
      activation: "cast",
      targeting: "enemy",
      duration: { base: 2, type: "debuff" },
      effects: [
        { stat: "moveSpeedBonus", value: -0.30, phase: "post_curve", target: "enemy" },
      ],
      triggers: [
        {
          desc: "Fires each time the debuffed target moves — 1(0.5) physical damage.",
          damage: [
            { base: 1, scaling: 0.5, damageType: "physical", target: "enemy" },
          ],
        },
      ],
    },

    {
      id: "blood_exchange",
      type: "skill",
      name: "Blood Exchange",
      desc: "Lose 10% of maximum health, but gain 15% action speed for 8 seconds and heal for 10% of damage dealt while active.",
      activation: "toggle",
      targeting: "self",
      cost: { type: "health", value: 0, percentMaxHealth: 0.10 },
      duration: { base: 8, type: "buff" },
      effects: [
        { stat: "actionSpeed", value: 0.15, phase: "post_curve" },
        { stat: "healingMod", value: 0.10, phase: "healing_modifier" },
      ],
      passives: { lifestealOnDamage: 0.10 },
    },

    {
      id: "finishing_blow",
      type: "skill",
      name: "Finishing Blow",
      desc: "Your next attack deals an additional 5 true physical damage. If the target's health is 5% or lower after the attack, they are instantly killed.",
      activation: "cast",
      targeting: "enemy",
      damage: [
        { base: 5, scaling: 0, damageType: "physical", trueDamage: true, target: "enemy" },
      ],
      passives: { executeThreshold: 0.05 },
    },

    {
      id: "grappling_hook",
      type: "skill",
      name: "Grappling Hook",
      desc: "Throws a grappling rope at a target up to 4m away, pulling them toward you.",
      activation: "cast",
      targeting: "enemy",
      // Movement ability — no stat effects.
    },

    {
      id: "hurl_weapon",
      type: "skill",
      name: "Hurl Weapon",
      desc: "Throws an axe to deal 120% weapon damage. Can only be used when an axe is equipped as your primary weapon.",
      activation: "cast",
      targeting: "enemy",
      condition: { type: "weapon_type", weaponType: "axe" },
      damage: [
        // 120% weapon damage — represented as scaling on weapon damage (engine will resolve).
        { base: 0, scaling: 0, damageType: "physical", weaponDamageScale: 1.20, target: "enemy" },
      ],
    },

    {
      id: "rage",
      type: "skill",
      name: "Rage",
      desc: "Gain 10 strength, 7% move speed bonus. While active, lose 5% physical damage reduction for 6 seconds.",
      activation: "toggle",
      targeting: "self",
      duration: { base: 6, type: "buff" },
      effects: [
        { stat: "str", value: 10, phase: "pre_curve_flat" },
        { stat: "moveSpeedBonus", value: 0.07, phase: "post_curve" },
        { stat: "physicalDamageReduction", value: -0.05, phase: "post_curve" },
      ],
    },

    {
      id: "reckless_attack",
      type: "skill",
      name: "Reckless Attack",
      desc: "Grants an additional 50% armor penetration on your next attack, but reduces your armor rating by 100 while active. The effect is consumed when you hit a target or object with a melee attack.",
      activation: "toggle",
      targeting: "self",
      effects: [
        { stat: "armorPenetration", value: 0.50, phase: "post_curve" },
        { stat: "armorRating", value: -100, phase: "pre_curve_flat" },
      ],
    },

    {
      id: "savage_roar",
      type: "skill",
      name: "Savage Roar",
      desc: "Frightens all enemies within a 7.5m range radius for 6 seconds reducing their physical damage bonus by 30% and reducing their move speed bonus by 2.5%.",
      activation: "cast",
      targeting: "enemy",
      duration: { base: 6, type: "other", tags: ["shout"] },
      cc: { type: "fear", duration: { base: 6, type: "other" } },
      effects: [
        { stat: "physicalDamageBonus", value: -0.30, phase: "post_curve", target: "nearby_enemies" },
        { stat: "moveSpeedBonus", value: -0.025, phase: "post_curve", target: "nearby_enemies" },
      ],
    },

    {
      id: "war_cry",
      type: "skill",
      name: "War Cry",
      desc: "Gain 20% max health bonus for 10 seconds. This effect applies to yourself and allies within a 7.5m radius.",
      activation: "cast",
      targeting: "ally_or_self",
      duration: { base: 10, type: "buff", tags: ["shout"] },
      tags: ["shout", "aura"],
      effects: [
        { stat: "maxHealthBonus", value: 0.20, phase: "pre_curve_flat", target: "nearby_allies" },
      ],
    },

    {
      id: "war_sacrifice",
      type: "skill",
      name: "War Sacrifice",
      desc: "While active, gain 8 all attributes. In exchange, lose 10(1.0)% of your maximum health over 8 seconds.",
      activation: "toggle",
      targeting: "self",
      duration: { base: 8, type: "buff" },
      effects: [
        { stat: "all_attributes", value: 8, phase: "pre_curve_flat" },
      ],
      // Self-damage DoT — 10% max HP over 8s (tick at 1s).
      passives: { selfDamagePerSecondMaxHp: 0.0125 },
    },

    {
      id: "whirlwind",
      type: "skill",
      name: "Whirlwind",
      desc: "Spin rapidly with a two-handed weapon, dealing 80% of weapon damage to all nearby enemies. While spinning, your weapon cannot be interrupted by any impact.",
      activation: "cast",
      targeting: "enemy",
      condition: { type: "weapon_type", weaponType: "two_handed" },
      damage: [
        { base: 0, scaling: 0, damageType: "physical", weaponDamageScale: 0.80, target: "nearby_enemies" },
      ],
      passives: { uninterruptibleByImpact: true },
    },
  ],

  spells: [],
  transformations: [],
});

export default barbarian;
