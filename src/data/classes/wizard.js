// Wizard — v3 class definition.
// Authored from docs/classes/wizard.csv against docs/shape_examples.md patterns
// and docs/vocabulary.md enums. See docs/engine_requirements_phase_1_3.md for
// engine capabilities this data depends on but that aren't yet implemented.

export const wizard = ({
  id: "wizard",
  name: "Wizard",
  desc: "Arcane devastation and elemental mastery.",

  baseAttributes: { str: 6, vig: 7, agi: 15, dex: 17, wil: 20, kno: 25, res: 15 },
  baseHealth: 109,

  maxPerks: 4,
  maxSkills: 2,

  armorRestrictions: ["cloth", "leather"],
  spellCost: { type: "charges" },

  perks: [
    {
      id: "melt",
      type: "perk",
      name: "Melt",
      desc: "When you deal magical fire damage to a target, the target loses 15% physical damage reduction and 10% projectile damage reduction for 2 seconds.",
      activation: "passive",
      triggers: [
        {
          desc: "Fires on dealing fire-magical damage — applies 2s debuff on target (-15% PDR, -10% projDR).",
          effects: [
            { stat: "physicalDamageReductionBonus", value: -0.15, phase: "post_curve", target: "enemy" },
            { stat: "projectileDamageReduction", value: -0.10, phase: "post_curve", target: "enemy" },
          ],
        },
      ],
    },

    {
      id: "fire_mastery",
      type: "perk",
      name: "Fire Mastery",
      desc: "Gain 5% fire magical damage bonus. The duration of applied burns is increased by 2 seconds, and a burned target reduces incoming physical healing by 50% and reduces incoming magical healing by 50% for 4 seconds.",
      activation: "passive",
      effects: [
        { stat: "typeDamageBonus", value: 0.05, phase: "type_damage_bonus", damageType: "fire_magical" },
        { stat: "burnDurationAdd", value: 2, phase: "post_curve" },
      ],
      triggers: [
        {
          desc: "While target is burning, applies 4s −50% incoming physical/magical healing debuff.",
          effects: [
            { stat: "incomingPhysicalHealing", value: -0.50, phase: "post_curve", target: "enemy" },
            { stat: "incomingMagicalHealing", value: -0.50, phase: "post_curve", target: "enemy" },
          ],
        },
      ],
    },

    {
      id: "staff_mastery",
      type: "perk",
      name: "Staff Mastery",
      desc: "When using a staff-type weapon, you gain 2 magic weapon damage.",
      activation: "passive",
      effects: [
        {
          stat: "magicWeaponDamage", value: 2, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "staff" },
        },
      ],
    },

    {
      id: "ice_shield",
      type: "perk",
      name: "Ice Shield",
      desc: "Gain 20 armor rating. Inflict frostbite for 0.5 seconds on melee attack. Does not inflict while on cooldown. Frostbite: The target loses 20% move speed bonus and 20% action speed.",
      activation: "passive",
      effects: [
        { stat: "armorRating", value: 20, phase: "pre_curve_flat" },
      ],
      triggers: [
        {
          desc: "Fires on melee attack (CD-gated) — applies 0.5s Frostbite.",
          appliesStatus: [
            {
              type: "frostbite",
              duration: { base: 0.5, type: "debuff" },
              effects: [
                { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
                { stat: "actionSpeed", value: -0.20, phase: "post_curve", target: "enemy" },
              ],
              desc: "Frostbite — −20% MS bonus and −20% AS.",
            },
          ],
        },
      ],
      passives: { cooldownGated: true },
    },

    {
      id: "arcane_feedback",
      type: "perk",
      name: "Arcane Feedback",
      desc: "When you deal damage with an arcane spell, gain a stacking bonus granting 3% spell casting speed and 3% arcane magical damage bonus per stack for 7 seconds. This skill can stack up to 5 times and the duration resets with each successful stack.",
      activation: "passive",
      duration: { base: 7, type: "buff" },
      stacking: {
        maxStacks: 5,
        perStack: [
          { stat: "spellCastingSpeed", value: 0.03, phase: "post_curve" },
          { stat: "typeDamageBonus", value: 0.03, phase: "type_damage_bonus", damageType: "arcane_magical" },
        ],
        desc: "Stacks on dealing arcane-spell damage; duration resets per stack.",
      },
    },

    {
      id: "arcane_mastery",
      type: "perk",
      name: "Arcane Mastery",
      desc: "Gain 5% arcane magical damage bonus and reduce the cast time of arcane spells by 0.5 seconds.",
      activation: "passive",
      effects: [
        { stat: "typeDamageBonus", value: 0.05, phase: "type_damage_bonus", damageType: "arcane_magical" },
      ],
      abilityModifiers: [
        { target: { tags: ["arcane"] }, modify: "castTime", value: -0.5, mode: "add" },
      ],
    },

    {
      id: "ice_mastery",
      type: "perk",
      name: "Ice Mastery",
      desc: "Dealing damage with ice magic freezes the target's feet and prevents them from moving for 0.5 seconds.",
      activation: "passive",
      triggers: [
        {
          desc: "Fires on dealing ice-magical damage — applies 0.5s Freeze.",
          appliesStatus: [
            {
              type: "freeze",
              duration: { base: 0.5, type: "debuff" },
              desc: "Freeze — immobilizes target's movement.",
            },
          ],
        },
      ],
    },

    {
      id: "mana_surge",
      type: "perk",
      name: "Mana Surge",
      desc: "Gain 10% magical damage bonus.",
      activation: "passive",
      effects: [
        { stat: "magicalDamageBonus", value: 0.10, phase: "post_curve" },
      ],
    },

    {
      id: "quick_chant",
      type: "perk",
      name: "Quick Chant",
      desc: "Gain 15% spell casting speed.",
      activation: "passive",
      effects: [
        { stat: "spellCastingSpeed", value: 0.15, phase: "post_curve" },
      ],
    },

    {
      id: "reactive_shield",
      type: "perk",
      name: "Reactive Shield",
      desc: "When you take damage, gain an arcane shield that lasts for 3 seconds. The shield can absorb 15 total damage and will only reactivate after a cooldown period.",
      activation: "passive",
      duration: { base: 3, type: "buff" },
      shield: { base: 15, scaling: 0, damageFilter: null },
      passives: { cooldownGated: true, reactiveOnDamageTaken: true },
    },

    {
      id: "sage",
      type: "perk",
      name: "Sage",
      desc: "Gain 15% knowledge bonus.",
      activation: "passive",
      effects: [
        { stat: "kno", value: 0.15, phase: "attribute_multiplier" },
      ],
    },

    {
      id: "spell_overload",
      type: "perk",
      name: "Spell Overload",
      desc: "Reduces knowledge bonus by 20% and increases all spells counts by 60%.",
      activation: "passive",
      effects: [
        { stat: "kno", value: -0.20, phase: "attribute_multiplier" },
      ],
      // Multiplies max charges per spell by 1.60. No `modify: "maxCharges"` in
      // vocab (Cat 21 closed). Authored as passive display-only; Phase 1.3 to
      // decide between maxCharges modifier or keep this shape.
      passives: { maxChargeMultiplier: 1.60 },
    },
  ],

  skills: [
    {
      id: "arcane_shield",
      type: "skill",
      name: "Arcane Shield",
      desc: "Gain a shield around you that absorbs 15(0.5) damage from all damage sources for 12 seconds. When the maximum amount of absorb has been reached, the shield unleashes an Arcane Explosion, dealing 5(1.0) magical damage to enemy targets in a 2m radius around you.",
      activation: "cast",
      targeting: "self",
      duration: { base: 12, type: "buff" },
      shield: { base: 15, scaling: 0.5, damageFilter: null },
      triggers: [
        {
          desc: "Fires on shield break (max absorb reached) — 2m AoE Arcane Explosion.",
          damage: [
            { base: 5, scaling: 1.0, damageType: "arcane_magical", target: "nearby_enemies" },
          ],
        },
      ],
    },

    {
      id: "intense_focus",
      type: "skill",
      name: "Intense Focus",
      desc: "Reduces the cast time of your next spell to 0.1 seconds.",
      activation: "toggle",
      targeting: "self",
      // "Sets next spell cast time to 0.1s" — no `mode: "set"` in vocab Cat 21.
      // Authored as passive; Phase 1.3 decides final shape.
      passives: { nextSpellCastTime: 0.1 },
    },

    {
      id: "meditation",
      type: "skill",
      name: "Meditation",
      desc: "Enter a meditative state and recover spells at a rate of 34 spells costs over 24 seconds.",
      activation: "cast",
      targeting: "self",
      duration: { base: 24, type: "other" },
      tags: ["channel"],
      effects: [
        { stat: "spellMemoryRecovery", value: 34 / 24, phase: "post_curve" },
      ],
      passives: { channeledAbility: true },
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
      id: "zap",
      type: "spell",
      name: "Zap",
      desc: "Deal 18(1.0) light magical damage and burns the target over 1 second. Burn: The target takes 1(0.5) fire magical damage.",
      activation: "cast",
      cost: { type: "charges", value: 5 },
      targeting: "enemy",
      tags: ["arcane"],
      damage: [
        { base: 18, scaling: 1.0, damageType: "light_magical", target: "enemy" },
      ],
      appliesStatus: [
        {
          type: "burn",
          duration: { base: 1, type: "debuff", tags: ["burn"] },
          damage: { base: 1, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
          desc: "Burn — 1(0.5) fire magical per tick for 1s.",
        },
      ],
    },

    {
      id: "light_orb",
      type: "spell",
      name: "Light Orb",
      desc: "Cast spheres of floating light to brightly illuminate your surroundings. Can force rogues out of hiding.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "self",
      passives: { illuminate: true, forceRoguesOutOfHiding: true },
    },

    {
      id: "magic_lock",
      type: "spell",
      name: "Magic Lock",
      desc: "Lockable objects such as doors or boxes will be locked for 10 seconds.",
      activation: "cast",
      cost: { type: "charges", value: 5 },
      targeting: "self",
      duration: { base: 10, type: "other" },
      passives: { locksObjects: true },
    },

    {
      id: "slow",
      type: "spell",
      name: "Slow",
      desc: "Slows the target's move speed bonus by 40% for 2 seconds.",
      activation: "cast",
      cost: { type: "charges", value: 3 },
      targeting: "enemy",
      duration: { base: 2, type: "debuff" },
      effects: [
        { stat: "moveSpeedBonus", value: -0.40, phase: "post_curve", target: "enemy" },
      ],
    },

    {
      id: "ignite",
      type: "spell",
      name: "Ignite",
      desc: "Set the target's weapon on fire for 12 seconds. While active, deal 5(0.5) fire magical damage and inflict burn over 1 second on successful attacks. Burn: The target takes 1(0.5) fire magical damage.",
      activation: "cast",
      cost: { type: "charges", value: 10 },
      targeting: "ally_or_self",
      duration: { base: 12, type: "buff" },
      triggers: [
        {
          desc: "Fires on each successful weapon attack — 5(0.5) fire_magical + applies Burn.",
          damage: [
            { base: 5, scaling: 0.5, damageType: "fire_magical", target: "enemy" },
          ],
          appliesStatus: [
            {
              type: "burn",
              duration: { base: 1, type: "debuff", tags: ["burn"] },
              damage: { base: 1, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
              desc: "Burn — 1(0.5) fire magical per tick for 1s.",
            },
          ],
        },
      ],
    },

    {
      id: "ice_bolt",
      type: "spell",
      name: "Ice Bolt",
      desc: "Deal 30(1.0) ice magical damage to the target, inflicting frostbite for 1 second. Frostbite: The target loses 20% move speed bonus and 20% action speed.",
      activation: "cast",
      cost: { type: "charges", value: 5 },
      targeting: "enemy",
      damage: [
        { base: 30, scaling: 1.0, damageType: "ice_magical", target: "enemy" },
      ],
      appliesStatus: [
        {
          type: "frostbite",
          duration: { base: 1, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
            { stat: "actionSpeed", value: -0.20, phase: "post_curve", target: "enemy" },
          ],
          desc: "Frostbite — −20% MS bonus and −20% AS.",
        },
      ],
    },

    {
      id: "magic_missile",
      type: "spell",
      name: "Magic Missile",
      desc: "Fire up to 10 homing missiles that each deal 10(0.5) arcane magical damage. Stops firing when you move.",
      activation: "cast",
      cost: { type: "charges", value: 10 },
      targeting: "enemy",
      tags: ["arcane"],
      damage: [
        { base: 10, scaling: 0.5, damageType: "arcane_magical", target: "enemy", label: "per missile (up to 10)" },
      ],
      passives: { missileCount: 10, homing: true, interruptOnMove: true },
    },

    {
      id: "haste",
      type: "spell",
      name: "Haste",
      desc: "Grants the target 5% move speed bonus, 10% action speed, 10% spell casting speed for 6 seconds. Self cast if no target is found.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "ally_or_self",
      duration: { base: 6, type: "buff" },
      effects: [
        { stat: "moveSpeedBonus", value: 0.05, phase: "post_curve", target: "self" },
        { stat: "actionSpeed", value: 0.10, phase: "post_curve", target: "self" },
        { stat: "spellCastingSpeed", value: 0.10, phase: "post_curve", target: "self" },
      ],
    },

    {
      id: "lightning_strike",
      type: "spell",
      name: "Lightning Strike",
      desc: "When cast, a bolt of lightning strikes the targeted area, Electrocuting enemies for 1 second and dealing 30(1.0) lightning magical damage. Electrified: The target loses 20% move speed bonus.",
      activation: "cast",
      cost: { type: "charges", value: 5 },
      targeting: "enemy",
      damage: [
        { base: 30, scaling: 1.0, damageType: "lightning_magical", target: "enemy" },
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
      id: "invisibility",
      type: "spell",
      name: "Invisibility",
      desc: "Grants the target invisibility for 4 seconds. While active, the target also gains 5% move speed bonus. Self cast if no target is found.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "ally_or_self",
      duration: { base: 4, type: "buff" },
      effects: [
        { stat: "moveSpeedBonus", value: 0.05, phase: "post_curve", target: "self" },
      ],
      passives: { invisibility: true },
    },

    {
      id: "fireball",
      type: "spell",
      name: "Fireball",
      desc: "Shoot a burning fireball, dealing 20(1.0) direct fire magical damage to a target and 10(1.0) splash fire magical damage, knocking back nearby targets and inflicting burn over 2 seconds. Burn: The target takes 3(0.5) fire magical damage.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "enemy",
      damage: [
        { base: 20, scaling: 1.0, damageType: "fire_magical", target: "enemy", label: "direct" },
        { base: 10, scaling: 1.0, damageType: "fire_magical", target: "nearby_enemies", label: "splash" },
      ],
      cc: { type: "knockback", duration: { base: 0, type: "debuff" } },
      appliesStatus: [
        {
          type: "burn",
          duration: { base: 2, type: "debuff", tags: ["burn"] },
          damage: { base: 3, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
          desc: "Burn — 3(0.5) fire magical per tick for 2s.",
        },
      ],
    },

    {
      id: "explosion",
      type: "spell",
      name: "Explosion",
      desc: "When cast, an explosion occurs in the targeted area after 3 seconds, dealing 23(1.0) fire magical damage and inflicting burn over 2 seconds within a 1m area. Burn: The target takes 3(0.5) fire magical damage.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "enemy",
      castTime: 3,
      damage: [
        { base: 23, scaling: 1.0, damageType: "fire_magical", target: "nearby_enemies" },
      ],
      appliesStatus: [
        {
          type: "burn",
          duration: { base: 2, type: "debuff", tags: ["burn"] },
          damage: { base: 3, scaling: 0.5, damageType: "fire_magical", isDot: true, tickRate: 1 },
          desc: "Burn — 3(0.5) fire magical per tick for 2s.",
        },
      ],
      passives: { radius: 1 },
    },

    {
      id: "chain_lightning",
      type: "spell",
      name: "Chain Lightning",
      desc: "Electrocute the target for 1 second, dealing 30(1.0) lightning magical damage, and fires lightning that is transferred to targets within an 8m area up to 3 times. It does not transfer to a target it was transferred previously, and it transfers to the caster if you are nearby. Electrified: The target loses 20% move speed bonus.",
      activation: "cast",
      cost: { type: "charges", value: 2 },
      targeting: "enemy",
      damage: [
        { base: 30, scaling: 1.0, damageType: "lightning_magical", target: "enemy" },
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
      passives: { chains: 3, chainRange: 8 },
    },
  ],

  transformations: [],
});

export default wizard;
