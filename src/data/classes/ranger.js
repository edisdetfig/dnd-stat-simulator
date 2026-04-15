// Ranger — v3 class definition.
// Authored from docs/classes/ranger.csv.

export const ranger = ({
  id: "ranger",
  name: "Ranger",
  desc: "Precision ranged combat and traps.",

  baseAttributes: { str: 12, vig: 10, agi: 20, dex: 18, wil: 10, kno: 12, res: 23 },
  baseHealth: 116,

  maxPerks: 4,
  maxSkills: 2,

  armorRestrictions: ["cloth", "leather", "plate"],
  spellCost: { type: "none" },

  perks: [
    {
      id: "campfire_mastery",
      type: "perk",
      name: "Campfire Mastery",
      desc: "Instant place a campfire and increase its duration by 100%.",
      activation: "passive",
      abilityModifiers: [
        { target: { tags: ["campfire"] }, modify: "duration", value: 1.00, mode: "multiply" },
        { target: { tags: ["campfire"] }, modify: "castTime", value: -1.00, mode: "multiply" },
      ],
    },

    {
      id: "chase",
      type: "perk",
      name: "Chase",
      desc: "Detect recent enemy footsteps and can hear enemy footstep sounds from farther away.",
      activation: "passive",
      passives: { footstepDetection: true, footstepAudibleRangeBonus: true },
    },

    {
      id: "crippling_shot",
      type: "perk",
      name: "Crippling Shot",
      desc: "Hitting the target's leg reduces their move speed bonus by 40% for 1 second.",
      activation: "passive",
      duration: { base: 1, type: "debuff" },
      triggers: [
        {
          desc: "Fires on a leg hit — slows the target.",
          effects: [
            { stat: "moveSpeedBonus", value: -0.40, phase: "post_curve", target: "enemy" },
          ],
        },
      ],
    },

    {
      id: "crossbow_mastery",
      type: "perk",
      name: "Crossbow Mastery",
      desc: "While using a crossbow, gain 5% physical damage bonus and an additional 50% action speed while reloading.",
      activation: "passive",
      effects: [
        {
          stat: "physicalDamageBonus", value: 0.05, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "crossbow" },
        },
        {
          stat: "actionSpeed", value: 0.50, phase: "post_curve",
          condition: { type: "player_state", state: "reloading" },
        },
      ],
    },

    {
      id: "kinesthesia",
      type: "perk",
      name: "Kinesthesia",
      desc: "When moving with the bowstring drawn, move speed bonus increases by 15%.",
      activation: "passive",
      effects: [
        {
          stat: "moveSpeedBonus", value: 0.15, phase: "post_curve",
          condition: { type: "player_state", state: "bow_drawn" },
        },
      ],
    },

    {
      id: "nimble_hands",
      type: "perk",
      name: "Nimble Hands",
      desc: "When using a bow, increases your draw speed by 15%.",
      activation: "passive",
      effects: [
        {
          stat: "drawSpeed", value: 0.15, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "bow" },
        },
      ],
    },

    {
      id: "purge_shot",
      type: "perk",
      name: "Purge Shot",
      desc: "Each time you hit a target with a ranged weapon, remove one random magical buff and deal 3(1.0) true magical damage. The damage only triggers if the target has a buff that is removed.",
      activation: "passive",
      triggers: [
        {
          desc: "Fires on ranged hit when a magical buff is stripped from the target.",
          condition: { type: "weapon_type", weaponType: "ranged" },
          damage: [
            { base: 3, scaling: 1.0, damageType: "magical", trueDamage: true, target: "enemy" },
          ],
        },
      ],
      passives: { stripMagicalBuff: true },
    },

    {
      id: "quick_reload",
      type: "perk",
      name: "Quick Reload",
      desc: "When reloading a bow-type or firearm-type weapon, gain 50% action speed.",
      activation: "passive",
      effects: [
        {
          stat: "actionSpeed", value: 0.50, phase: "post_curve",
          condition: { type: "player_state", state: "reloading" },
        },
      ],
    },

    {
      id: "ranged_weapons_mastery",
      type: "perk",
      name: "Ranged Weapons Mastery",
      desc: "When attacking with a ranged weapon, gain 5% physical damage bonus.",
      activation: "passive",
      effects: [
        {
          stat: "physicalDamageBonus", value: 0.05, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "ranged" },
        },
      ],
    },

    {
      id: "sharpshooter",
      type: "perk",
      name: "Sharpshooter",
      desc: "When attacking with a ranged weapon, gain 15% headshot power.",
      activation: "passive",
      effects: [
        {
          stat: "headshotPower", value: 0.15, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "ranged" },
        },
      ],
    },

    {
      id: "spear_proficiency",
      type: "perk",
      name: "Spear Proficiency",
      desc: "Gain the ability to equip spears.",
      activation: "passive",
      grantsWeapon: "spear",
    },

    {
      id: "trap_mastery",
      type: "perk",
      name: "Trap Mastery",
      desc: "Instantly place trap items and recover them when disarmed.",
      activation: "passive",
      passives: { instantTrap: true, trapRecoverable: true },
    },
  ],

  skills: [
    {
      id: "penetrating_shot",
      type: "skill",
      name: "Penetrating Shot",
      desc: "Gain 50% headshot penetration and 25% armor penetration for 8 seconds. Bows and Crossbow attacks pierce targets.",
      activation: "toggle",
      targeting: "self",
      duration: { base: 8, type: "buff" },
      effects: [
        { stat: "headshotPenetration", value: 0.50, phase: "post_curve" },
        { stat: "armorPenetration", value: 0.25, phase: "post_curve" },
      ],
      passives: { projectilesPierce: true },
    },

    {
      id: "quick_fire",
      type: "skill",
      name: "Quick Fire",
      desc: "Gain an additional 50% action speed for 8 seconds while using bow-type weapons.",
      activation: "toggle",
      targeting: "self",
      duration: { base: 8, type: "buff" },
      effects: [
        {
          stat: "actionSpeed", value: 0.50, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "bow" },
        },
      ],
    },

    {
      id: "backstep",
      type: "skill",
      name: "Backstep",
      desc: "Quickly retreats a short distance. It can also be used in the air.",
      activation: "cast",
      targeting: "self",
      // Movement ability — no stat effects.
    },

    {
      id: "field_ration",
      type: "skill",
      name: "Field Ration",
      desc: "Forage food and recover 40(1.0) health.",
      activation: "cast",
      targeting: "self",
      heal: {
        baseHeal: 40,
        scaling: 1.0,
        healType: "physical",
        target: "self",
      },
    },

    {
      id: "forceful_shot",
      type: "skill",
      name: "Forceful Shot",
      desc: "When using a bow-type weapon, gain the ability to knock targets back for 10 seconds.",
      activation: "toggle",
      targeting: "self",
      condition: { type: "weapon_type", weaponType: "bow" },
      duration: { base: 10, type: "buff" },
      cc: { type: "knockback", duration: { base: 0.5, type: "other" } },
    },

    {
      id: "multishot",
      type: "skill",
      name: "Multishot",
      desc: "Fire 5 arrows at once in a cone shaped dispersion.",
      activation: "cast",
      targeting: "enemy",
      condition: { type: "weapon_type", weaponType: "bow" },
      passives: { projectileCount: 5 },
    },

    {
      id: "true_shot",
      type: "skill",
      name: "True Shot",
      desc: "Projectile flight speed is greatly increased, also increasing physical damage bonus by 8% for 8 seconds.",
      activation: "toggle",
      targeting: "self",
      duration: { base: 8, type: "buff" },
      effects: [
        { stat: "projectileSpeed", value: 0.50, phase: "post_curve" },
        { stat: "physicalDamageBonus", value: 0.08, phase: "post_curve" },
      ],
    },

    {
      id: "quickshot",
      type: "skill",
      name: "Quickshot",
      desc: "Fire arrows in quick succession. Each bow-type will fire a different amount of arrows. Survival Bow: 4 arrows. Recurve Bow: 3 arrows. Longbow: 2 arrows.",
      activation: "cast",
      targeting: "enemy",
      condition: { type: "weapon_type", weaponType: "bow" },
      passives: { bowSpecificProjectileCount: true },
    },
  ],

  spells: [],
  transformations: [],
});

export default ranger;
