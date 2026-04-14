// Sorcerer — v3 class definition.
// Authored from docs/classes/sorcerer.csv against docs/shape_examples.md
// patterns and docs/vocabulary.md enums. See
// docs/engine_requirements_phase_1_3.md for engine capabilities this data
// depends on but that aren't yet implemented.

export const sorcerer = ({
  id: "sorcerer",
  name: "Sorcerer",
  desc: "Merged elemental spells and summoned elementals.",

  baseAttributes: { str: 10, vig: 10, agi: 10, dex: 18, wil: 25, kno: 20, res: 12 },
  baseHealth: 115,

  maxPerks: 4,
  maxSkills: 2,

  armorRestrictions: ["cloth", "leather"],
  // Per-spell cooldown acts as the cost. Engine dispatches via cost.type: "cooldown".
  spellCost: { type: "cooldown" },

  perks: [
    {
      id: "air_mastery",
      type: "perk",
      name: "Air Mastery",
      desc: "Gain 25% air magic knockback power bonus and 50% air magical damage bonus.",
      activation: "passive",
      effects: [
        { stat: "knockbackPowerBonus", value: 0.25, phase: "post_curve" },
        { stat: "typeDamageBonus", value: 0.50, phase: "type_damage_bonus", damageType: "air_magical" },
      ],
    },

    {
      id: "apex_of_sorcery",
      type: "perk",
      name: "Apex of Sorcery",
      desc: "While casting spells, reduce movement speed by 99%, but gain 50% magical damage bonus and 50% spell casting speed.",
      activation: "passive",
      effects: [
        {
          stat: "moveSpeedBonus", value: -0.99, phase: "post_curve",
          condition: { type: "player_state", state: "casting" },
        },
        {
          stat: "magicalDamageBonus", value: 0.50, phase: "post_curve",
          condition: { type: "player_state", state: "casting" },
        },
        {
          stat: "spellCastingSpeed", value: 0.50, phase: "post_curve",
          condition: { type: "player_state", state: "casting" },
        },
      ],
    },

    {
      id: "elemental_fury",
      type: "perk",
      name: "Elemental Fury",
      desc: "For every 1% of health lost, gain a 0.5% cooldown reduction bonus and 0.25% magical damage bonus.",
      activation: "passive",
      effects: [
        {
          stat: "cooldownReductionBonus", value: 0, phase: "post_curve",
          hpScaling: { per: 1, valuePerStep: 0.005 },
        },
        {
          stat: "magicalDamageBonus", value: 0, phase: "post_curve",
          hpScaling: { per: 1, valuePerStep: 0.0025 },
        },
      ],
    },

    {
      id: "innate_talent",
      type: "perk",
      name: "Innate Talent",
      desc: "When casting spells with bare hands, gain 5 magical power and 10% spell casting speed.",
      activation: "passive",
      effects: [
        {
          stat: "magicalPower", value: 5, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "unarmed" },
        },
        {
          stat: "spellCastingSpeed", value: 0.10, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "unarmed" },
        },
      ],
    },

    {
      id: "lightning_mastery",
      type: "perk",
      name: "Lightning Mastery",
      desc: "Gain 25% lightning magical damage bonus. Once every 2 seconds while dealing lightning magical damage, inflict electric shock for 1 second, transferring 5 lightning magical damage to the closest target within 2m of the primary target.",
      activation: "passive",
      effects: [
        { stat: "typeDamageBonus", value: 0.25, phase: "type_damage_bonus", damageType: "lightning_magical" },
      ],
      triggers: [
        {
          desc: "Fires every 2s on lightning-magical damage — transfers 5 lightning_magical to the closest target within 2m.",
          damage: [
            { base: 5, scaling: 0, damageType: "lightning_magical", target: "enemy" },
          ],
          appliesStatus: [
            {
              type: "electrified",
              duration: { base: 1, type: "debuff" },
              effects: [
                { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
              ],
              desc: "Electrified — −20% MS bonus.",
            },
          ],
        },
      ],
      passives: { cooldownGated: true },
    },

    {
      id: "mana_flow",
      type: "perk",
      name: "Mana Flow",
      desc: "For each successful spell cast, gain 5% magical damage bonus. This effect stacks up to 3 times, and resets on the next successful cast.",
      activation: "passive",
      stacking: {
        maxStacks: 3,
        perStack: [
          { stat: "magicalDamageBonus", value: 0.05, phase: "post_curve" },
        ],
        desc: "Stacks on each successful spell cast; resets on next cast.",
      },
    },

    {
      id: "mana_fold",
      type: "perk",
      name: "Mana Fold",
      desc: "Reduce all spell cooldowns by 25% but lose 15% spell casting speed.",
      activation: "passive",
      effects: [
        { stat: "spellCastingSpeed", value: -0.15, phase: "post_curve" },
      ],
      abilityModifiers: [
        { target: { type: "spell" }, modify: "cooldown", value: -0.25, mode: "multiply" },
      ],
    },

    {
      id: "merged_might",
      type: "perk",
      name: "Merged Might",
      desc: "When casting a merge spell, gain 5 magical power. After casting, gain a 5% move speed bonus for 2 seconds.",
      activation: "passive",
      triggers: [
        {
          desc: "Fires on merge-spell cast — +5 magical power (on-cast) and +5% MS bonus for 2s after.",
          effects: [
            { stat: "magicalPower", value: 5, phase: "post_curve" },
            { stat: "moveSpeedBonus", value: 0.05, phase: "post_curve" },
          ],
        },
      ],
    },

    {
      id: "spell_sculpting",
      type: "perk",
      name: "Spell Sculpting",
      desc: "Increases the range of all spells by 25% and the area of effect by 25%, but increases the cooldown time by 25%.",
      activation: "passive",
      abilityModifiers: [
        { target: { type: "spell" }, modify: "range", value: 0.25, mode: "multiply" },
        { target: { type: "spell" }, modify: "aoeRadius", value: 0.25, mode: "multiply" },
        { target: { type: "spell" }, modify: "cooldown", value: 0.25, mode: "multiply" },
      ],
    },

    {
      id: "spell_stride",
      type: "perk",
      name: "Spell Stride",
      desc: "Gain 30% move speed bonus while casting two spells simultaneously.",
      activation: "passive",
      effects: [
        {
          stat: "moveSpeedBonus", value: 0.30, phase: "post_curve",
          condition: { type: "player_state", state: "dual_casting" },
        },
      ],
    },

    {
      id: "time_distortion",
      type: "perk",
      name: "Time Distortion",
      desc: "Reduces cast time of all spells by 50%, but increases the cooldown time for all spells by 200%.",
      activation: "passive",
      abilityModifiers: [
        { target: { type: "spell" }, modify: "castTime", value: -0.50, mode: "multiply" },
        { target: { type: "spell" }, modify: "cooldown", value: 2.00, mode: "multiply" },
      ],
    },
  ],

  skills: [
    {
      id: "spell_memory_1",
      type: "skill",
      name: "Spell Memory 1",
      desc: "Allows 5 spells to be equipped.",
      activation: "passive",
      slots: { type: "spell", count: 5 },
    },

    {
      id: "spell_memory_2",
      type: "skill",
      name: "Spell Memory 2",
      desc: "Allows 5 spells to be equipped.",
      activation: "passive",
      slots: { type: "spell", count: 5 },
    },
  ],

  spells: [
    {
      id: "water_bolt",
      type: "spell",
      name: "Water Bolt",
      desc: "Launch a condensed water orb, dealing 15(1.0) ice magical damage to targets it touches and inflicting Wet for 2 seconds. The orb stops upon hitting an object or reaching its maximum range and lasts for 12 seconds. Up to 3 water orbs can exist simultaneously.",
      activation: "cast",
      cost: { type: "cooldown", value: 12 },
      targeting: "enemy",
      tags: ["water", "projectile"],
      duration: { base: 12, type: "other" },
      damage: [
        { base: 15, scaling: 1.0, damageType: "ice_magical", target: "enemy" },
      ],
      appliesStatus: [
        {
          type: "wet",
          duration: { base: 2, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
            { stat: "jumpHeight", value: -0.30, phase: "post_curve", target: "enemy" },
          ],
          desc: "Wet — −20% MS bonus and −30% jump height.",
        },
      ],
      passives: { maxActive: 3 },
    },

    {
      id: "stone_skin",
      type: "spell",
      name: "Stone Skin",
      desc: "Surround yourself with stone for 12 seconds, gaining 10% physical damage reduction and 10% physical damage bonus, but losing 5 additional move speed.",
      activation: "cast",
      cost: { type: "cooldown", value: 12 },
      targeting: "self",
      tags: ["earth"],
      duration: { base: 12, type: "buff" },
      effects: [
        { stat: "physicalDamageReductionBonus", value: 0.10, phase: "post_curve" },
        { stat: "physicalDamageBonus", value: 0.10, phase: "post_curve" },
        { stat: "moveSpeed", value: -5, phase: "post_curve" },
      ],
    },

    {
      id: "glaciate",
      type: "spell",
      name: "Glaciate",
      desc: "Envelop your weapon in ice for 12 seconds. While active, you deal 3(0.5) ice magical damage and inflict Frostbite for 1 second on hit. Frostbite: The target loses 5% move speed bonus and 20% action speed.",
      activation: "cast",
      cost: { type: "cooldown", value: 12 },
      targeting: "self",
      tags: ["frost"],
      duration: { base: 12, type: "buff" },
      triggers: [
        {
          desc: "Fires on each weapon hit while Glaciate active — 3(0.5) ice_magical + applies 1s Frostbite.",
          damage: [
            { base: 3, scaling: 0.5, damageType: "ice_magical", target: "enemy" },
          ],
          appliesStatus: [
            {
              type: "frostbite",
              duration: { base: 1, type: "debuff" },
              effects: [
                { stat: "moveSpeedBonus", value: -0.05, phase: "post_curve", target: "enemy" },
                { stat: "actionSpeed", value: -0.20, phase: "post_curve", target: "enemy" },
              ],
              desc: "Frostbite — −5% MS bonus and −20% AS.",
            },
          ],
        },
      ],
    },

    {
      id: "fire_arrow",
      type: "spell",
      name: "Fire Arrow",
      desc: "Fire 3 homing arrows in a radial pattern, each dealing 7(1.0) fire magical damage and inflicting burn over 3 seconds. Burn: the target takes 3(0.5) fire magical damage.",
      activation: "cast",
      cost: { type: "cooldown", value: 12 },
      targeting: "enemy",
      tags: ["fire", "projectile"],
      damage: [
        { base: 7, scaling: 1.0, damageType: "fire_magical", target: "enemy", label: "per arrow (×3)" },
      ],
      appliesStatus: [
        {
          type: "burn",
          duration: { base: 3, type: "debuff", tags: ["burn"] },
          damage: { base: 3, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
          desc: "Burn — 3(0.5) fire magical per tick for 3s.",
        },
      ],
      passives: { projectileCount: 3, homing: true },
    },

    {
      id: "windblast",
      type: "spell",
      name: "Windblast",
      desc: "Deal 10(1.0) air magical damage to the target and push them back.",
      activation: "cast",
      cost: { type: "cooldown", value: 15 },
      targeting: "enemy",
      tags: ["air"],
      damage: [
        { base: 10, scaling: 1.0, damageType: "air_magical", target: "enemy" },
      ],
      cc: { type: "knockback", duration: { base: 0, type: "debuff" } },
    },

    {
      id: "ice_spear",
      type: "spell",
      name: "Ice Spear",
      desc: "Fire an ice spear that deals 30(1.0) ice magical damage, piercing and damaging all targets in its path, inflicting Frostbite for 2 seconds. Frostbite: The target loses 20% move speed bonus and 20% action speed.",
      activation: "cast",
      cost: { type: "cooldown", value: 15 },
      targeting: "enemy",
      tags: ["frost", "projectile"],
      damage: [
        { base: 30, scaling: 1.0, damageType: "ice_magical", target: "enemy" },
      ],
      appliesStatus: [
        {
          type: "frostbite",
          duration: { base: 2, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
            { stat: "actionSpeed", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Frostbite — −20% MS bonus and −20% AS.",
        },
      ],
      passives: { piercing: true },
    },

    {
      id: "flamestrike",
      type: "spell",
      name: "Flamestrike",
      desc: "Create a fire pillar lasting 3 seconds and dealing 25(1.0) fire magical damage on creation and 10(0.5) fire magical damage per second to enemies inside while inflicting burn over 3 seconds. Burn: the target takes 3(0.5) fire magical damage.",
      activation: "cast",
      cost: { type: "cooldown", value: 15 },
      targeting: "enemy",
      tags: ["fire"],
      duration: { base: 3, type: "other" },
      damage: [
        { base: 25, scaling: 1.0, damageType: "fire_magical", target: "enemy", label: "on creation" },
        { base: 10, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1, target: "enemy", label: "pillar DoT" },
      ],
      appliesStatus: [
        {
          type: "burn",
          duration: { base: 3, type: "debuff", tags: ["burn"] },
          damage: { base: 3, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
          desc: "Burn — 3(0.5) fire magical per tick for 3s.",
        },
      ],
    },

    {
      id: "eruption",
      type: "spell",
      name: "Eruption",
      desc: "Cause a ground explosion, dealing 20(1.0) earth magical damage and lifting all targets within the area into the air.",
      activation: "cast",
      cost: { type: "cooldown", value: 15 },
      targeting: "enemy",
      tags: ["earth"],
      damage: [
        { base: 20, scaling: 1.0, damageType: "earth_magical", target: "nearby_enemies" },
      ],
      cc: { type: "lift", duration: { base: 1, type: "debuff" } },
    },

    {
      id: "lightning_bolt",
      type: "spell",
      name: "Lightning Bolt",
      desc: "Fire a lightning beam for 5 seconds, electrifying the target and dealing 7(0.05) lightning magical damage per second. Electrified: The target loses 20% move speed bonus.",
      activation: "cast",
      cost: { type: "cooldown", value: 18 },
      targeting: "enemy",
      tags: ["lightning", "beam"],
      duration: { base: 5, type: "other" },
      damage: [
        { base: 7, scaling: 0.05, damageType: "lightning_magical", isDot: true, tickRate: 1, target: "enemy" },
      ],
      appliesStatus: [
        {
          type: "electrified",
          duration: { base: 1, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Electrified — −20% MS bonus.",
        },
      ],
      passives: { channeledAbility: true },
    },

    {
      id: "fire_orb",
      type: "spell",
      name: "Fire Orb",
      desc: "Launch a fire orb forward, dealing 5(0.5) fire magical damage per second to nearby targets. The orb lasts for 6 seconds and deals 30(1.0) fire magical damage to targets it touches. Upon contact, it explodes, dealing 10(1.0) fire magical damage to nearby targets and inflicting burn over 3 seconds. Burn: the target takes 5(0.5) fire magical damage.",
      activation: "cast",
      cost: { type: "cooldown", value: 18 },
      targeting: "enemy",
      tags: ["fire"],
      duration: { base: 6, type: "other" },
      damage: [
        { base: 5, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1, target: "nearby_enemies", label: "aura DoT" },
        { base: 30, scaling: 1.0, damageType: "fire_magical", target: "enemy", label: "direct hit" },
        { base: 10, scaling: 1.0, damageType: "fire_magical", target: "nearby_enemies", label: "explosion" },
      ],
      appliesStatus: [
        {
          type: "burn",
          duration: { base: 3, type: "debuff", tags: ["burn"] },
          damage: { base: 5, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
          desc: "Burn — 5(0.5) fire magical per tick for 3s.",
        },
      ],
    },

    {
      id: "vortex",
      type: "spell",
      name: "Vortex",
      desc: "Create a vortex centered on the caster. Targets touching the vortex take 15(1.0) air magical damage and are pushed back.",
      activation: "cast",
      cost: { type: "cooldown", value: 21 },
      targeting: "self",
      tags: ["air"],
      damage: [
        { base: 15, scaling: 1.0, damageType: "air_magical", target: "nearby_enemies" },
      ],
      cc: { type: "knockback", duration: { base: 0, type: "debuff" } },
    },

    {
      id: "lightning_sphere",
      type: "spell",
      name: "Lightning Sphere",
      desc: "Surround yourself with an electromagnetic field for 5 seconds, shocking all nearby targets for 5(0.5) lightning magical damage per second. In this case, shocking applies Electrified: The target loses 20% move speed bonus.",
      activation: "cast",
      cost: { type: "cooldown", value: 21 },
      targeting: "self",
      tags: ["lightning", "aura"],
      duration: { base: 5, type: "buff" },
      damage: [
        { base: 5, scaling: 0.5, damageType: "lightning_magical", isDot: true, tickRate: 1, target: "nearby_enemies" },
      ],
      appliesStatus: [
        {
          type: "electrified",
          duration: { base: 1, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Electrified — −20% MS bonus.",
        },
      ],
    },

    {
      id: "levitation",
      type: "spell",
      name: "Levitation",
      desc: "Lift the target into the air and gently lower them back down.",
      activation: "cast",
      cost: { type: "cooldown", value: 21 },
      targeting: "enemy",
      tags: ["air"],
      cc: { type: "lift", duration: { base: 2, type: "debuff" } },
    },

    {
      id: "summon_earth_elemental",
      type: "spell",
      name: "Summon Earth Elemental",
      desc: "Summon an Earth Elemental for 18 seconds. The Earth Elemental increases the caster's armor rating by 50 and hurls rocks at nearby enemies, dealing 40(1.0) physical damage.",
      activation: "cast",
      cost: { type: "cooldown", value: 24 },
      targeting: "self",
      tags: ["earth", "summon"],
      summon: {
        type: "earth_elemental",
        duration: { base: 18, type: "other" },
        damage: [
          { base: 40, scaling: 1.0, damageType: "physical", target: "enemy" },
        ],
        casterEffects: [
          { stat: "armorRating", value: 50, phase: "pre_curve_flat" },
        ],
        desc: "Earth Elemental — grants +50 AR to caster; hurls rocks at nearby enemies.",
      },
    },
  ],

  mergedSpells: [
    {
      id: "aqua_prison",
      type: "merged_spell",
      name: "Aqua Prison",
      desc: "Launch a water orb that engulfs the target, dealing 15(1.0) ice magical damage, trapping them, and lifting them into the air for 3 seconds. The orb bursts instantly upon taking physical damage, inflicting wet for 2 seconds. Wet: The target loses 20% move speed bonus and jump height is reduced by 30%.",
      activation: "cast",
      components: ["water_bolt", "levitation"],
      targeting: "enemy",
      tags: ["water"],
      damage: [
        { base: 15, scaling: 1.0, damageType: "ice_magical", target: "enemy" },
      ],
      // Aqua Prison applies BOTH trap (for 3s) AND lift — current shape allows a
      // single `cc` block. Authored as trap; lift captured in desc. Engine-req
      // delta: multi-cc array.
      cc: { type: "trap", duration: { base: 3, type: "debuff" } },
      appliesStatus: [
        {
          type: "wet",
          duration: { base: 2, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
            { stat: "jumpHeight", value: -0.30, phase: "post_curve", target: "enemy" },
          ],
          desc: "Wet — applied on orb burst; −20% MS bonus, −30% jump height.",
        },
      ],
    },

    {
      id: "electric_dash",
      type: "merged_spell",
      name: "Electric Dash",
      desc: "Transform into a lightning orb and quickly move to the selected location, electrifying all targets along the path and dealing 10(1.0) lightning magical damage. Upon reaching the destination, unleash a lightning strike, dealing 15(1.0) lightning magical damage to nearby targets. The caster is immune to physical attacks while moving but remains affected by area magic.",
      activation: "cast",
      components: ["lightning_bolt", "vortex"],
      targeting: "self",
      tags: ["lightning"],
      damage: [
        { base: 10, scaling: 1.0, damageType: "lightning_magical", target: "nearby_enemies", label: "path" },
        { base: 15, scaling: 1.0, damageType: "lightning_magical", target: "nearby_enemies", label: "on arrival" },
      ],
      appliesStatus: [
        {
          type: "electrified",
          duration: { base: 1, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Electrified — −20% MS bonus.",
        },
      ],
      passives: { immuneToPhysicalWhileMoving: true },
    },

    {
      id: "elemental_bolt",
      type: "merged_spell",
      name: "Elemental Bolt",
      desc: "Deal 50(1.0) Fire/Ice magical damage to the target, inflicting burn over 3 seconds and frostbite for 2 seconds.",
      activation: "cast",
      components: ["water_bolt", "fire_arrow"],
      targeting: "enemy",
      tags: ["fire", "frost"],
      damage: [
        { base: 25, scaling: 1.0, damageType: "fire_magical", target: "enemy", label: "fire half" },
        { base: 25, scaling: 1.0, damageType: "ice_magical", target: "enemy", label: "ice half" },
      ],
      appliesStatus: [
        {
          type: "burn",
          duration: { base: 3, type: "debuff", tags: ["burn"] },
          damage: { base: 3, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
          desc: "Burn — 3(0.5) fire magical per tick for 3s.",
        },
        {
          type: "frostbite",
          duration: { base: 2, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
            { stat: "actionSpeed", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Frostbite — −20% MS bonus and −20% AS.",
        },
      ],
    },

    {
      id: "flamefrost_spear",
      type: "merged_spell",
      name: "Flamefrost Spear",
      desc: "Throw a Flamefrost Spear, dealing 30(1.0) fire magical damage and 30(1.0) ice magical damage to the target, inflicting burn over 3 seconds and frostbite for 3 seconds. The spear pierces through targets, dealing damage to all it hits.",
      activation: "cast",
      components: ["ice_spear", "flamestrike"],
      targeting: "enemy",
      tags: ["fire", "frost", "projectile"],
      damage: [
        { base: 30, scaling: 1.0, damageType: "fire_magical", target: "enemy" },
        { base: 30, scaling: 1.0, damageType: "ice_magical", target: "enemy" },
      ],
      appliesStatus: [
        {
          type: "burn",
          duration: { base: 3, type: "debuff", tags: ["burn"] },
          damage: { base: 3, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
          desc: "Burn — 3(0.5) fire magical per tick for 3s.",
        },
        {
          type: "frostbite",
          duration: { base: 3, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
            { stat: "actionSpeed", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Frostbite — −20% MS bonus and −20% AS.",
        },
      ],
      passives: { piercing: true },
    },

    {
      id: "flamethrower",
      type: "merged_spell",
      name: "Flamethrower",
      desc: "Blast radial flames forward for 5 seconds, dealing 25(1.0) fire magical damage per second and inflicting burn over 3 seconds on targets.",
      activation: "cast",
      components: ["fire_arrow", "windblast"],
      targeting: "enemy",
      tags: ["fire", "beam"],
      duration: { base: 5, type: "other" },
      damage: [
        { base: 25, scaling: 1.0, damageType: "fire_magical", isDot: true, tickRate: 1, target: "nearby_enemies" },
      ],
      appliesStatus: [
        {
          type: "burn",
          duration: { base: 3, type: "debuff", tags: ["burn"] },
          damage: { base: 3, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
          desc: "Burn — 3(0.5) fire magical per tick for 3s.",
        },
      ],
      passives: { channeledAbility: true },
    },

    {
      id: "frost_breath",
      type: "merged_spell",
      name: "Frost Breath",
      desc: "Exhale an icy gust of breath forward, dealing 20(1.0) ice magical damage to all targets and inflicting frostbite for 2 seconds. The affected area remains frozen for 3 seconds, causing targets on the ice to lose 10% move speed bonus.",
      activation: "cast",
      components: ["glaciate", "windblast"],
      targeting: "enemy",
      tags: ["frost"],
      damage: [
        { base: 20, scaling: 1.0, damageType: "ice_magical", target: "nearby_enemies" },
      ],
      appliesStatus: [
        {
          type: "frostbite",
          duration: { base: 2, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
            { stat: "actionSpeed", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Frostbite — −20% MS bonus and −20% AS.",
        },
        {
          type: "freeze",
          duration: { base: 3, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.10, phase: "post_curve", target: "enemy" },
          ],
          desc: "Frozen ground — lingers 3s; targets on the ice lose 10% MS bonus.",
        },
      ],
    },

    {
      id: "frost_lightning",
      type: "merged_spell",
      name: "Frost Lightning",
      desc: "Fires a lightning bolt, dealing 15(1.0) lightning magical damage and electrifying for 1 second. The bolt freezes shortly after, inflicting 15(1.0) ice magical damage and immobilizing the target for 1.5 seconds.",
      activation: "cast",
      components: ["lightning_bolt", "ice_spear"],
      targeting: "enemy",
      tags: ["lightning", "frost"],
      damage: [
        { base: 15, scaling: 1.0, damageType: "lightning_magical", target: "enemy" },
        { base: 15, scaling: 1.0, damageType: "ice_magical", target: "enemy" },
      ],
      appliesStatus: [
        {
          type: "electrified",
          duration: { base: 1, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Electrified — −20% MS bonus.",
        },
      ],
      cc: { type: "immobilize", duration: { base: 1.5, type: "debuff" } },
    },

    {
      id: "icebound",
      type: "merged_spell",
      name: "Icebound",
      desc: "Upon casting, become frozen for 6 seconds, becoming immune to all damage and gaining a 50% cooldown reduction bonus. The ice can be shattered by a powerful impact.",
      activation: "cast",
      components: ["stone_skin", "glaciate"],
      targeting: "self",
      tags: ["frost"],
      duration: { base: 6, type: "buff" },
      effects: [
        { stat: "cooldownReductionBonus", value: 0.50, phase: "post_curve" },
      ],
      passives: { damageImmunity: true, cannotMove: true, shatterable: true },
    },

    {
      id: "lightning_storm",
      type: "merged_spell",
      name: "Lightning Storm",
      desc: "Channel for 6 seconds to summon a lightning storm, dealing 10(1.0) lightning magical damage per second and electrifying all targets within the area.",
      activation: "cast",
      components: ["lightning_sphere", "levitation"],
      targeting: "enemy",
      tags: ["lightning", "channel"],
      duration: { base: 6, type: "other" },
      damage: [
        { base: 10, scaling: 1.0, damageType: "lightning_magical", isDot: true, tickRate: 1, target: "nearby_enemies" },
      ],
      appliesStatus: [
        {
          type: "electrified",
          duration: { base: 1, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Electrified — −20% MS bonus.",
        },
      ],
      passives: { channeledAbility: true },
    },

    {
      id: "lightning_vortex",
      type: "merged_spell",
      name: "Lightning Vortex",
      desc: "Deal 20(1.0) lightning/air magical damage to all targets within the area, push them back, and electrify them for 2 seconds.",
      activation: "cast",
      components: ["lightning_sphere", "vortex"],
      targeting: "enemy",
      tags: ["lightning", "air"],
      damage: [
        { base: 20, scaling: 1.0, damageType: "lightning_magical", target: "nearby_enemies" },
        { base: 20, scaling: 1.0, damageType: "air_magical", target: "nearby_enemies" },
      ],
      cc: { type: "knockback", duration: { base: 0, type: "debuff" } },
      appliesStatus: [
        {
          type: "electrified",
          duration: { base: 2, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Electrified — −20% MS bonus.",
        },
      ],
    },

    {
      id: "mud_shield",
      type: "merged_spell",
      name: "Mud Shield",
      desc: "Create a mud shield in front of the caster for 7 seconds, blocking all damage. The shield remains fixed in its initial direction.",
      activation: "cast",
      components: ["water_bolt", "stone_skin"],
      targeting: "self",
      tags: ["water", "earth"],
      duration: { base: 7, type: "other" },
      // Directional shield that blocks all damage that hits it — absorb cap modeled as a very large value.
      shield: { base: 99999, scaling: 0, damageFilter: null },
      passives: { directionalShield: true },
    },

    {
      id: "plasma_blast",
      type: "merged_spell",
      name: "Plasma Blast",
      desc: "After 4 seconds, the caster explodes, inflicting 50(1.0) fire/lightning magical damage to all nearby targets, inflicting burn for 3 seconds, and electrocuting them for 2 seconds.",
      activation: "cast",
      components: ["fire_orb", "lightning_sphere"],
      targeting: "enemy",
      tags: ["fire", "lightning"],
      castTime: 4,
      damage: [
        { base: 25, scaling: 1.0, damageType: "fire_magical", target: "nearby_enemies" },
        { base: 25, scaling: 1.0, damageType: "lightning_magical", target: "nearby_enemies" },
      ],
      appliesStatus: [
        {
          type: "burn",
          duration: { base: 3, type: "debuff", tags: ["burn"] },
          damage: { base: 3, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
          desc: "Burn — 3(0.5) fire magical per tick for 3s.",
        },
        {
          type: "electrified",
          duration: { base: 2, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Electrified — −20% MS bonus.",
        },
      ],
    },

    {
      id: "summon_lava_elemental",
      type: "merged_spell",
      name: "Summon Lava Elemental",
      desc: "Summon a Lava Elemental for 18 seconds. The Lava Elemental deals 10(0.5) fire magical damage per second to nearby enemies and leaves a trail of lava that deals 10(0.5) fire magical damage per second.",
      activation: "cast",
      components: ["fire_orb", "summon_earth_elemental"],
      targeting: "self",
      tags: ["fire", "summon"],
      summon: {
        type: "lava_elemental",
        duration: { base: 18, type: "other" },
        damage: [
          { base: 10, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1, target: "nearby_enemies", label: "aura DoT" },
          { base: 10, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1, target: "nearby_enemies", label: "lava trail" },
        ],
        desc: "Lava Elemental — aura DoT + persistent lava trail.",
      },
    },

    {
      id: "thorn_of_earth",
      type: "merged_spell",
      name: "Thorn of Earth",
      desc: "Erupts a thorn of earth, dealing 30(1.0) earth magical damage to all targets within the area.",
      activation: "cast",
      components: ["eruption", "levitation"],
      targeting: "enemy",
      tags: ["earth"],
      damage: [
        { base: 30, scaling: 1.0, damageType: "earth_magical", target: "nearby_enemies" },
      ],
    },

    {
      id: "wall_of_fire",
      type: "merged_spell",
      name: "Wall of Fire",
      desc: "Erupt a wall of fire for 8 seconds, dealing 10(1.0) earth/fire magical damage instantly and 20(1.0) fire magical damage per second to all targets it touches and inflicting burn over 3 seconds.",
      activation: "cast",
      components: ["flamestrike", "eruption"],
      targeting: "enemy",
      tags: ["fire", "earth"],
      duration: { base: 8, type: "other" },
      damage: [
        { base: 5, scaling: 1.0, damageType: "earth_magical", target: "nearby_enemies", label: "instant earth half" },
        { base: 5, scaling: 1.0, damageType: "fire_magical", target: "nearby_enemies", label: "instant fire half" },
        { base: 20, scaling: 1.0, damageType: "fire_magical", isDot: true, tickRate: 1, target: "nearby_enemies", label: "wall DoT" },
      ],
      appliesStatus: [
        {
          type: "burn",
          duration: { base: 3, type: "debuff", tags: ["burn"] },
          damage: { base: 3, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
          desc: "Burn — 3(0.5) fire magical per tick for 3s.",
        },
      ],
    },
  ],

  transformations: [],
});

export default sorcerer;
