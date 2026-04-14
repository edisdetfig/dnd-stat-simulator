// Cleric — v3 class definition.
// Authored from docs/classes/cleric.csv against docs/shape_examples.md patterns
// and docs/vocabulary.md enums. See docs/engine_requirements_phase_1_3.md for
// engine capabilities this data depends on but that aren't yet implemented.

export const cleric = ({
  id: "cleric",
  name: "Cleric",
  desc: "Divine healing, shields, and holy damage.",

  baseAttributes: { str: 11, vig: 13, agi: 12, dex: 14, wil: 23, kno: 20, res: 12 },
  baseHealth: 120,

  maxPerks: 4,
  maxSkills: 2,

  armorRestrictions: ["cloth", "leather", "plate"],
  spellCost: { type: "charges" },

  perks: [
    {
      id: "advanced_healer",
      type: "perk",
      name: "Advanced Healer",
      desc: "Gain 5 magical healing.",
      activation: "passive",
      effects: [
        { stat: "magicalHealing", value: 5, phase: "post_curve" },
      ],
    },

    {
      id: "blunt_weapon_mastery",
      type: "perk",
      name: "Blunt Weapon Mastery",
      desc: "While using a blunt weapon, gain 10% physical damage bonus.",
      activation: "passive",
      effects: [
        {
          stat: "physicalDamageBonus", value: 0.10, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "blunt" },
        },
      ],
    },

    {
      id: "brewmaster",
      type: "perk",
      name: "Brewmaster",
      desc: "When you drink alcohol, you no longer exhibit the detrimental drunk effects and gain 10 strength. The duration of the drunk effect is increased by 50%.",
      activation: "passive",
      tags: ["drunk"],
      effects: [
        {
          stat: "str", value: 10, phase: "pre_curve_flat",
          condition: { type: "player_state", state: "alcohol_consumed" },
        },
        { stat: "drunkDurationBonus", value: 0.50, phase: "post_curve" },
      ],
    },

    {
      id: "faithfulness",
      type: "perk",
      name: "Faithfulness",
      desc: "Gain 15% divine magical damage bonus. When a divine attack is successful, reduce their move speed bonus by 15% for 1 second. Does not inflict while on cooldown.",
      activation: "passive",
      effects: [
        { stat: "typeDamageBonus", value: 0.15, phase: "type_damage_bonus", damageType: "divine_magical" },
      ],
      triggers: [
        {
          desc: "Fires on successful divine-magical hit (CD-gated) — 1s −15% move speed bonus on target.",
          effects: [
            { stat: "moveSpeedBonus", value: -0.15, phase: "post_curve", target: "enemy" },
          ],
        },
      ],
      passives: { cooldownGated: true },
    },

    {
      id: "holy_aura",
      type: "perk",
      name: "Holy Aura",
      desc: "Gain 15 armor rating and 15 magic resistance. This affects both yourself and allies.",
      activation: "passive",
      tags: ["aura"],
      effects: [
        { stat: "armorRating", value: 15, phase: "pre_curve_flat", target: "nearby_allies" },
        { stat: "magicResistance", value: 15, phase: "pre_curve_flat", target: "nearby_allies" },
      ],
    },

    {
      id: "holy_water",
      type: "perk",
      name: "Holy Water",
      desc: "Drinking any drink removes all removable curses and harmful magic effects, and grants the Bless effect.",
      activation: "passive",
      passives: {
        drinkRemovesCurses: true,
        drinkRemovesHarmfulMagic: true,
        drinkGrantsBless: true,
      },
    },

    {
      id: "kindness",
      type: "perk",
      name: "Kindness",
      desc: "Heal yourself for 30% of the spell's total heal amount when healing another target.",
      activation: "passive",
      passives: { healingReflection: 0.30 },
    },

    {
      id: "over_healing",
      type: "perk",
      name: "Over Healing",
      desc: "Even if the target's health is at full health, additional healing can be done by 20% of the target's maximum health. Bonus health degenerates at 2% per second.",
      activation: "passive",
      passives: { overhealCap: 0.20, overhealDegenPerSecond: 0.02 },
    },

    {
      id: "perseverance",
      type: "perk",
      name: "Perseverance",
      desc: "Reduces all types of incoming damage by 2.",
      activation: "passive",
      effects: [
        { stat: "flatDamageReduction", value: 2, phase: "post_curve" },
      ],
    },

    {
      id: "protection_from_evil",
      type: "perk",
      name: "Protection from Evil",
      desc: "Reduce the duration of all harmful effects by 30%.",
      activation: "passive",
      // Receiver-side duration modifier on incoming debuffs.
      effects: [
        { stat: "debuffDurationBonus", value: -0.30, phase: "post_curve" },
      ],
    },

    {
      id: "requiem",
      type: "perk",
      name: "Requiem",
      desc: "Resurrecting an ally revives them with 50% HP instead of a sliver of life. When reviving an ally at the Altar of Sacrifice, you do not need to sacrifice any of your own health. Using the Resurrection spell also grants 100% spell casting speed.",
      activation: "passive",
      abilityModifiers: [
        // +100% SCS is authored via scs boost on the Resurrection spell cast; engine
        // may convert this to castTime reduction. Simplest faithful author below.
        { target: { id: "resurrection" }, modify: "castTime", value: -0.50, mode: "multiply" },
      ],
      passives: {
        resurrectHealthFraction: 0.50,
        altarNoSelfCost: true,
      },
    },

    {
      id: "undead_slaying",
      type: "perk",
      name: "Undead Slaying",
      desc: "Gain 20% undead damage bonus against undead monsters.",
      activation: "passive",
      effects: [
        {
          stat: "undeadDamageBonus", value: 0.20, phase: "post_curve",
          condition: { type: "creature_type", creatureType: "undead" },
        },
      ],
    },
  ],

  skills: [
    {
      id: "judgement",
      type: "skill",
      name: "Judgement",
      desc: "After channeling for 1 second, deal 25(1.0) divine magical damage to a target and reduce their move speed bonus by 30% for 2 seconds. Once the channel begins on a target, the crosshair targeting is no longer required. This spell has a 5m range and will break if the target goes out of range.",
      activation: "cast",
      targeting: "enemy",
      castTime: 1,
      tags: ["channel"],
      duration: { base: 2, type: "debuff" },
      damage: [
        { base: 25, scaling: 1.0, damageType: "divine_magical", target: "enemy" },
      ],
      effects: [
        { stat: "moveSpeedBonus", value: -0.30, phase: "post_curve", target: "enemy" },
      ],
      passives: { channeledAbility: true, range: 5 },
    },

    {
      id: "divine_protection",
      type: "skill",
      name: "Divine Protection",
      desc: "Gain 30% physical damage reduction for 6 seconds.",
      activation: "cast",
      targeting: "self",
      duration: { base: 6, type: "buff" },
      effects: [
        { stat: "physicalDamageReduction", value: 0.30, phase: "post_curve" },
      ],
    },

    {
      id: "holy_purification",
      type: "skill",
      name: "Holy Purification",
      desc: "After channeling for 1.5 seconds, deal 100(1.0) divine magical damage to all undead monsters within a 7.5m radius around you.",
      activation: "cast",
      targeting: "self",
      castTime: 1.5,
      tags: ["channel"],
      damage: [
        {
          base: 100, scaling: 1.0, damageType: "divine_magical", target: "nearby_enemies",
          condition: { type: "creature_type", creatureType: "undead" },
        },
      ],
      passives: { channeledAbility: true, radius: 7.5, pveOnly: true },
    },

    {
      id: "smite",
      type: "skill",
      name: "Smite",
      desc: "Deal an additional 10(1.0) divine magical damage to all enemies you hit within 7 seconds. Only when melee attacking.",
      activation: "cast",
      targeting: "self",
      duration: { base: 7, type: "buff" },
      tags: ["judgment"],
      triggers: [
        {
          desc: "Fires on each successful melee hit during Smite window — +10(1.0) divine magical damage.",
          damage: [
            { base: 10, scaling: 1.0, damageType: "divine_magical", target: "enemy" },
          ],
        },
      ],
    },

    {
      id: "spell_memory_1",
      type: "skill",
      name: "Spell Memory 1",
      desc: "Can hold up to 5 spells.",
      activation: "passive",
      slots: { type: "spell", count: 5 },
    },

    {
      id: "spell_memory_2",
      type: "skill",
      name: "Spell Memory 2",
      desc: "Can hold up to 5 spells.",
      activation: "passive",
      slots: { type: "spell", count: 5 },
    },
  ],

  spells: [
    {
      id: "protection",
      type: "spell",
      name: "Protection",
      desc: "Grants the target a shield that blocks 20 physical damage for 8 seconds.",
      activation: "cast",
      cost: { type: "charges", value: 5 },
      targeting: "ally_or_self",
      duration: { base: 8, type: "buff" },
      shield: { base: 20, scaling: 0, damageFilter: "physical" },
    },

    {
      id: "cleanse",
      type: "spell",
      name: "Cleanse",
      desc: "Removes poison and curse effects from the target. Self cast if no target is found.",
      activation: "cast",
      cost: { type: "charges", value: 5 },
      targeting: "ally_or_self",
      passives: { removesPoison: true, removesCurse: true, removesHarmfulMagic: true },
    },

    {
      id: "bless",
      type: "spell",
      name: "Bless",
      desc: "Grants the target 2 all attributes for 30 seconds. Self cast if no target is found.",
      activation: "cast",
      cost: { type: "charges", value: 5 },
      targeting: "ally_or_self",
      duration: { base: 30, type: "buff", tags: ["blessing"] },
      effects: [
        { stat: "all_attributes", value: 2, phase: "pre_curve_flat", target: "ally_or_self" },
      ],
    },

    {
      id: "lesser_heal",
      type: "spell",
      name: "Lesser Heal",
      desc: "Heals the target for 20(0.8) health. Self cast if no target is found.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "ally_or_self",
      heal: { baseHeal: 20, scaling: 0.8, healType: "magical", target: "ally_or_self" },
    },

    {
      id: "divine_strike",
      type: "spell",
      name: "Divine Strike",
      desc: "Grants the target 5 weapon damage for 12 seconds. Self cast if no target is found.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "ally_or_self",
      duration: { base: 12, type: "buff" },
      effects: [
        { stat: "buffWeaponDamage", value: 5, phase: "post_curve", target: "ally_or_self" },
      ],
    },

    {
      id: "bind",
      type: "spell",
      name: "Bind",
      desc: "Binds the target for 0.75 seconds.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "enemy",
      cc: { type: "bind", duration: { base: 0.75, type: "debuff" } },
    },

    {
      id: "holy_strike",
      type: "spell",
      name: "Holy Strike",
      desc: "Deal 20(1.0) divine magical damage to all targets in area, blinding them for 4 seconds.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "enemy",
      damage: [
        { base: 20, scaling: 1.0, damageType: "divine_magical", target: "nearby_enemies" },
      ],
      appliesStatus: [
        {
          type: "blind",
          duration: { base: 4, type: "debuff" },
          desc: "Blind — vision impairment.",
        },
      ],
    },

    {
      id: "holy_light",
      type: "spell",
      name: "Holy Light",
      desc: "Heals a target for 35(0.8) health or deals 100(0.8) divine magical damage to an undead target.",
      activation: "cast",
      cost: { type: "charges", value: 3 },
      // Dual-mode spell — heals ally/self, or damages undead. Engine resolves by
      // target creature type. Author both blocks with creature-type condition on
      // the damage entry.
      targeting: "ally_or_self",
      heal: { baseHeal: 35, scaling: 0.8, healType: "magical", target: "ally_or_self" },
      damage: [
        {
          base: 100, scaling: 0.8, damageType: "divine_magical", target: "enemy",
          condition: { type: "creature_type", creatureType: "undead" },
        },
      ],
    },

    {
      id: "sanctuary",
      type: "spell",
      name: "Sanctuary",
      desc: "Channel for 5 seconds, healing all targets within 3.5m for 5(0.5) per second and deals 14(0.5) divine magical damage per second to the undead.",
      activation: "cast",
      cost: { type: "charges", value: 2 },
      targeting: "self",
      duration: { base: 5, type: "other" },
      tags: ["channel"],
      heal: {
        baseHeal: 5, scaling: 0.5, healType: "magical", isHot: true, tickRate: 1,
        target: "nearby_allies",
      },
      damage: [
        {
          base: 14, scaling: 0.5, damageType: "divine_magical", isDot: true, tickRate: 1,
          target: "enemy",
          condition: { type: "creature_type", creatureType: "undead" },
        },
      ],
      passives: { channeledAbility: true, radius: 3.5 },
    },

    {
      id: "locust_swarm",
      type: "spell",
      name: "Locust Swarm",
      desc: "Channel a swarm of locusts in 3m radius over 6 seconds. Any target within the area is dealt 13(1.0) divine magical damage per 1 second. The target also suffers reduced incoming magical healing by 50% and reduces incoming physical healing by 50%.",
      activation: "cast",
      cost: { type: "charges", value: 2 },
      targeting: "enemy",
      duration: { base: 6, type: "other" },
      tags: ["channel"],
      damage: [
        {
          base: 13, scaling: 1.0, damageType: "divine_magical", isDot: true, tickRate: 1,
          target: "nearby_enemies",
        },
      ],
      effects: [
        { stat: "incomingPhysicalHealing", value: -0.50, phase: "post_curve", target: "nearby_enemies" },
        { stat: "incomingMagicalHealing", value: -0.50, phase: "post_curve", target: "nearby_enemies" },
      ],
      passives: { channeledAbility: true, radius: 3 },
    },

    {
      id: "earthquake",
      type: "spell",
      name: "Earthquake",
      desc: "Channel an earthquake in a 2.5m radius over 6 seconds. Any target within the area is dealt 7(0.5) magical damage per step and receives 50% move speed bonus reduction.",
      activation: "cast",
      cost: { type: "charges", value: 2 },
      targeting: "enemy",
      duration: { base: 6, type: "other" },
      tags: ["channel"],
      damage: [
        {
          base: 7, scaling: 0.5, damageType: "magical", isDot: true, tickRate: 1,
          target: "nearby_enemies",
        },
      ],
      effects: [
        { stat: "moveSpeedBonus", value: -0.50, phase: "post_curve", target: "nearby_enemies" },
      ],
      passives: { channeledAbility: true, radius: 2.5 },
    },

    {
      id: "resurrection",
      type: "spell",
      name: "Resurrection",
      desc: "Target an ally to resurrect them from the dead (the corpse must have a soul heart).",
      activation: "cast",
      cost: { type: "charges", value: 1 },
      targeting: "ally_or_self",
      tags: ["prayer"],
      castTime: 3,
      passives: { resurrect: true, requiresSoulHeart: true },
    },
  ],

  transformations: [],
});

export default cleric;
