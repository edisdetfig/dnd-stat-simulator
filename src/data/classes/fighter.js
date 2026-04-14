// Fighter — v3 class definition.
// Authored from docs/classes/fighter.csv against docs/shape_examples.md patterns
// and docs/vocabulary.md enums. See docs/engine_requirements_phase_1_3.md for
// engine capabilities this data depends on but that aren't yet implemented.
//
// NOTE: defineClass() is NOT invoked at module scope during Phase 1.2 — the
// current validator rejects new vocabulary values that Phase 1.3 will accept.
// The per-class smoke test (describe.skip) calls defineClass explicitly and
// will be un-skipped once Phase 1.3 updates the validator.

export const fighter = ({
  id: "fighter",
  name: "Fighter",
  desc: "Weapon mastery and defensive stance.",

  baseAttributes: { str: 15, vig: 15, agi: 15, dex: 15, wil: 15, kno: 15, res: 15 },
  baseHealth: 125,

  maxPerks: 4,
  maxSkills: 2,

  armorRestrictions: ["cloth", "leather", "plate"],
  spellCost: { type: "none" },

  perks: [
    {
      id: "defense_mastery",
      type: "perk",
      name: "Defense Mastery",
      desc: "Gain an additional 15% armor rating bonus from equipped armor. The maximum Physical Damage Reduction limit is increased to 75%.",
      activation: "passive",
      effects: [
        { stat: "equippedArmorRatingBonus", value: 0.15, phase: "pre_curve_flat" },
        { stat: "pdr", value: 0.75, phase: "cap_override" },
      ],
    },

    {
      id: "combo_attack",
      type: "perk",
      name: "Combo Attack",
      desc: "When you successfully land consecutive melee attacks within 2 seconds, gain 10% physical damage bonus per stack, up to 2 stacks.",
      activation: "passive",
      stacking: {
        maxStacks: 2,
        perStack: [
          { stat: "physicalDamageBonus", value: 0.10, phase: "post_curve" },
        ],
        desc: "Stacks — +10% physical damage bonus per stack. Gained on consecutive melee hits within 2s.",
      },
    },

    {
      id: "adrenaline_spike",
      type: "perk",
      name: "Adrenaline Spike",
      desc: "When your health goes below 40%, gain 15% action speed, 3% move speed bonus, and 30% regular interaction speed for 12 seconds, and suffer no penalty from using the Adrenaline Rush skill.",
      activation: "passive",
      duration: { base: 12, type: "buff" },
      effects: [
        {
          stat: "actionSpeed", value: 0.15, phase: "post_curve",
          condition: { type: "hp_below", threshold: 0.40 },
        },
        {
          stat: "moveSpeedBonus", value: 0.03, phase: "post_curve",
          condition: { type: "hp_below", threshold: 0.40 },
        },
        {
          stat: "regularInteractionSpeed", value: 0.30, phase: "post_curve",
          condition: { type: "hp_below", threshold: 0.40 },
        },
      ],
    },

    {
      id: "barricade",
      type: "perk",
      name: "Barricade",
      desc: "While in defensive stance, gain 75 armor rating and 75 magic resistance.",
      activation: "passive",
      effects: [
        {
          stat: "armorRating", value: 75, phase: "pre_curve_flat",
          condition: { type: "player_state", state: "defensive_stance" },
        },
        {
          stat: "magicResistance", value: 75, phase: "pre_curve_flat",
          condition: { type: "player_state", state: "defensive_stance" },
        },
      ],
    },

    {
      id: "counterattack",
      type: "perk",
      name: "Counterattack",
      desc: "When you successfully block an attack, gain 10% move speed bonus and 10% action speed for 3 seconds.",
      activation: "passive",
      triggers: [
        {
          desc: "Fires on a successful block.",
          effects: [
            { stat: "moveSpeedBonus", value: 0.10, phase: "post_curve", target: "self" },
            { stat: "actionSpeed", value: 0.10, phase: "post_curve", target: "self" },
          ],
        },
      ],
      duration: { base: 3, type: "buff" },
    },

    {
      id: "dual_wield",
      type: "perk",
      name: "Dual Wield",
      desc: "While you have weapons equipped in both hands, gain 10% action speed.",
      activation: "passive",
      effects: [
        {
          stat: "actionSpeed", value: 0.10, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "dual_wield" },
        },
      ],
    },

    {
      id: "last_bastion",
      type: "perk",
      name: "Last Bastion",
      desc: "When your Health falls to 33% or below, you gain 150 armor rating, 50 magic resistance and 30% projectile damage reduction for 8 seconds.",
      activation: "passive",
      duration: { base: 8, type: "buff" },
      effects: [
        {
          stat: "armorRating", value: 150, phase: "pre_curve_flat",
          condition: { type: "hp_below", threshold: 0.33 },
        },
        {
          stat: "magicResistance", value: 50, phase: "pre_curve_flat",
          condition: { type: "hp_below", threshold: 0.33 },
        },
        {
          stat: "projectileDamageReduction", value: 0.30, phase: "post_curve",
          condition: { type: "hp_below", threshold: 0.33 },
        },
      ],
    },

    {
      id: "projectile_resistance",
      type: "perk",
      name: "Projectile Resistance",
      desc: "Gain 10% projectile damage reduction. While in defensive stance, gain an additional 10% projectile damage reduction.",
      activation: "passive",
      tags: ["stance"],
      effects: [
        { stat: "projectileDamageReduction", value: 0.10, phase: "post_curve" },
        {
          stat: "projectileDamageReduction", value: 0.10, phase: "post_curve",
          condition: { type: "player_state", state: "defensive_stance" },
        },
      ],
    },

    {
      id: "shield_mastery",
      type: "perk",
      name: "Shield Mastery",
      desc: "While in defensive stance with a shield, gain 10% move speed bonus. When you successfully block an attack, gain 50% action speed towards your next block.",
      activation: "passive",
      tags: ["stance"],
      effects: [
        {
          stat: "moveSpeedBonus", value: 0.10, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "shield" },
        },
      ],
      triggers: [
        {
          desc: "Fires on a successful block — grants 50% action speed towards the next block.",
          effects: [
            { stat: "actionSpeed", value: 0.50, phase: "post_curve", target: "self" },
          ],
        },
      ],
    },

    {
      id: "slayer",
      type: "perk",
      name: "Slayer",
      desc: "While holding a weapon in each hand, gain 5 weapon damage, 10 additional move speed, but lose the ability to equip plate armor.",
      activation: "passive",
      removesArmor: "plate",
      effects: [
        {
          stat: "weaponDamage", value: 5, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "dual_wield" },
        },
        {
          stat: "moveSpeed", value: 10, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "dual_wield" },
        },
      ],
    },

    {
      id: "swift",
      type: "perk",
      name: "Swift",
      desc: "Reduces the armor move speed penalty by 30%. Only applies to armor-related penalties.",
      activation: "passive",
      effects: [
        { stat: "armorMovePenaltyReduction", value: 0.30, phase: "post_curve" },
      ],
    },

    {
      id: "sword_mastery",
      type: "perk",
      name: "Sword Mastery",
      desc: "When using a sword-type weapon, gain 2 weapon damage and 5% action speed. Also gain 10 additional move speed when taking a defensive stance with your sword.",
      activation: "passive",
      tags: ["stance"],
      effects: [
        {
          stat: "weaponDamage", value: 2, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "sword" },
        },
        {
          stat: "actionSpeed", value: 0.05, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "sword" },
        },
        {
          stat: "moveSpeed", value: 10, phase: "post_curve",
          condition: { type: "all", conditions: [
            { type: "weapon_type", weaponType: "sword" },
            { type: "player_state", state: "defensive_stance" },
          ] },
        },
      ],
    },

    {
      id: "veteran_instinct",
      type: "perk",
      name: "Veteran Instinct",
      desc: "When you enter combat, physical damage reduction is increased by 10% of its current value and physical damage bonus is increased by 10% for 4 seconds.",
      activation: "passive",
      duration: { base: 4, type: "buff" },
      effects: [
        {
          stat: "physicalDamageReductionBonus", value: 0.10, phase: "post_curve_multiplicative",
          condition: { type: "player_state", state: "in_combat" },
        },
        {
          stat: "physicalDamageBonus", value: 0.10, phase: "post_curve",
          condition: { type: "player_state", state: "in_combat" },
        },
      ],
    },

    {
      id: "weapon_guard",
      type: "perk",
      name: "Weapon Guard",
      desc: "While blocking with a weapon, gain 5% physical damage reduction. Upon a successful block, you gain 10% physical damage bonus and 5% action speed for 2 seconds.",
      activation: "passive",
      tags: ["stance"],
      effects: [
        {
          stat: "physicalDamageReductionBonus", value: 0.05, phase: "post_curve",
          condition: { type: "player_state", state: "defensive_stance" },
        },
      ],
      triggers: [
        {
          desc: "Fires on a successful block.",
          effects: [
            { stat: "physicalDamageBonus", value: 0.10, phase: "post_curve", target: "self" },
            { stat: "actionSpeed", value: 0.05, phase: "post_curve", target: "self" },
          ],
        },
      ],
      // On-block buff lasts 2s.
    },

    {
      id: "weapon_mastery",
      type: "perk",
      name: "Weapon Mastery",
      desc: "Gain the ability to use any weapon.",
      activation: "passive",
      // No numeric effect — the weapon-restriction lift is display-only / gear-availability.
      passives: { weaponRestrictionLifted: true },
    },
  ],

  skills: [
    {
      id: "adrenaline_rush",
      type: "skill",
      name: "Adrenaline Rush",
      desc: "Gain 15% action speed, 5% move speed bonus for 8 seconds. After the duration ends, lose 8% action speed and 4% move speed bonus for 2 seconds.",
      activation: "toggle",
      targeting: "self",
      duration: { base: 8, type: "buff" },
      effects: [
        { stat: "actionSpeed", value: 0.15, phase: "post_curve" },
        { stat: "moveSpeedBonus", value: 0.05, phase: "post_curve" },
      ],
      afterEffect: {
        duration: { base: 2, type: "debuff" },
        effects: [
          { stat: "actionSpeed", value: -0.08, phase: "post_curve", target: "self" },
          { stat: "moveSpeedBonus", value: -0.04, phase: "post_curve", target: "self" },
        ],
        removedBy: ["adrenaline_spike", "second_wind"],
        desc: "Penalty phase after the main buff ends. Removed by Adrenaline Spike or Second Wind.",
      },
    },

    {
      id: "breakthrough",
      type: "skill",
      name: "Breakthrough",
      desc: "Removes debuffs that slow move speed, grants 7 additional move speed, and ignores all move speed debuff effects for 8 seconds.",
      activation: "toggle",
      targeting: "self",
      duration: { base: 8, type: "buff" },
      effects: [
        { stat: "moveSpeed", value: 7, phase: "post_curve" },
      ],
      passives: { moveSpeedDebuffImmunity: true },
    },

    {
      id: "disarm",
      type: "skill",
      name: "Disarm",
      desc: "If you block a melee attack with your weapon within 8 seconds, you disarm the attacker for 1 second. Disarmed targets cannot use weapons. This effect can only be applied once and is consumed when you block a melee attack. Can only be used while a weapon is equipped.",
      activation: "toggle",
      targeting: "enemy",
      duration: { base: 8, type: "buff" },
      cc: { type: "disarm", duration: { base: 1, type: "debuff" } },
    },

    {
      id: "fortified_ground",
      type: "skill",
      name: "Fortified Ground",
      desc: "Deploys a rallying banner for 45 seconds. Allies within 33m of the banner have all attributes increased by 3.",
      activation: "cast",
      targeting: "self",
      duration: { base: 45, type: "other" },
      summon: {
        type: "banner",
        duration: { base: 45, type: "other" },
        casterEffects: [
          { stat: "all_attributes", value: 3, phase: "pre_curve_flat", target: "nearby_allies" },
        ],
        desc: "Rallying banner — 33m aura grants +3 all attributes to nearby allies.",
      },
    },

    {
      id: "perfect_block",
      type: "skill",
      name: "Perfect Block",
      desc: "Gain 5 impact resistance for 8 seconds.",
      activation: "toggle",
      targeting: "self",
      duration: { base: 8, type: "buff" },
      effects: [
        { stat: "impactResistance", value: 5, phase: "post_curve" },
      ],
    },

    {
      id: "pommel_strike",
      type: "skill",
      name: "Pommel Strike",
      desc: "When attacking with the hilt while a one-handed weapon is equipped as your main weapon, it deals an additional 15(1.0) physical damage and silences the target. If the silence interrupts the enemy's action, it deals an additional 10(1.0) physical damage and reduces move speed bonus by 50% for 2 seconds.",
      activation: "cast",
      targeting: "enemy",
      condition: { type: "weapon_type", weaponType: "one_handed" },
      damage: [
        { base: 15, scaling: 1.0, damageType: "physical", target: "enemy" },
      ],
      appliesStatus: [
        {
          type: "silence",
          duration: { base: 2, type: "debuff" },
          effects: [
            { stat: "moveSpeedBonus", value: -0.50, phase: "post_curve", target: "enemy" },
          ],
          desc: "Silence — disables skills/spells/performance abilities on the target.",
        },
      ],
      triggers: [
        {
          desc: "Fires when the silence interrupts the enemy's action — deals an additional 10(1.0) physical damage.",
          damage: [
            { base: 10, scaling: 1.0, damageType: "physical", target: "enemy" },
          ],
        },
      ],
    },

    {
      id: "second_wind",
      type: "skill",
      name: "Second Wind",
      desc: "Recover 40% maximum health over 12 seconds. Additionally, Second Wind removes the negative effects of Adrenaline Rush.",
      activation: "cast",
      targeting: "self",
      duration: { base: 12, type: "other" },
      heal: {
        // 40% max HP over 12s → HoT. tickRate default 1s → 12 ticks, baseHeal ~ 0.40/12 of MHP per tick.
        // Authored as a single heal block; engine distributes per tick via HoT semantics.
        baseHeal: 0,
        scaling: 0,
        healType: "physical",
        target: "self",
        isHot: true,
        tickRate: 1,
        percentMaxHealth: 0.40,
        desc: "Heal-over-time — 40% max HP over 12 seconds.",
      },
    },

    {
      id: "shield_slam",
      type: "skill",
      name: "Shield Slam",
      desc: "Inflicts 30(1.0) physical damage on the target, and reduces the target's move speed bonus by 20% for 3 seconds.",
      activation: "cast",
      targeting: "enemy",
      condition: { type: "weapon_type", weaponType: "shield" },
      damage: [
        { base: 30, scaling: 1.0, damageType: "physical", target: "enemy" },
      ],
      duration: { base: 3, type: "debuff" },
      effects: [
        { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy" },
      ],
    },

    {
      id: "spell_reflection",
      type: "skill",
      name: "Spell Reflection",
      desc: "While blocking, gain the ability to reflect spells. This buff persists until triggered, lasting 5 seconds. Before activation, gain 15% magical damage reduction.",
      activation: "toggle",
      targeting: "self",
      duration: { base: 5, type: "buff" },
      effects: [
        {
          stat: "magicalDamageReductionBonus", value: 0.15, phase: "post_curve",
          condition: { type: "player_state", state: "defensive_stance" },
        },
      ],
      passives: { reflectSpells: true },
    },

    {
      id: "sprint",
      type: "skill",
      name: "Sprint",
      desc: "Gain 3 stacks of Momentum, granting 10 additional move speed per stack. Lose 1 stack every 2 seconds.",
      activation: "toggle",
      targeting: "self",
      stacking: {
        maxStacks: 3,
        perStack: [
          { stat: "moveSpeed", value: 10, phase: "post_curve" },
        ],
        desc: "Momentum stacks — +10 move speed per stack. Starts at 3, decays by 1 every 2s.",
      },
      triggers: [
        {
          desc: "Activates Sprint — sets momentum_stacks flag.",
          stateChange: { momentum_stacks: true },
        },
      ],
    },

    {
      id: "taunt",
      type: "skill",
      name: "Taunt",
      desc: "Increases the aggro value to add monsters within a 7.5m area by 300%. Gain 12% physical damage reduction and 12% magical damage reduction for 8 seconds.",
      activation: "toggle",
      targeting: "self",
      duration: { base: 8, type: "buff", tags: ["shout"] },
      effects: [
        { stat: "physicalDamageReductionBonus", value: 0.12, phase: "post_curve" },
        { stat: "magicalDamageReductionBonus", value: 0.12, phase: "post_curve" },
      ],
    },

    {
      id: "victory_strike",
      type: "skill",
      name: "Victory Strike",
      desc: "Your next attack deals an additional 40% physical damage bonus. If this attack kills a player, the skill triggers again with no cooldown.",
      activation: "cast",
      targeting: "enemy",
      effects: [
        { stat: "physicalDamageBonus", value: 0.40, phase: "post_curve" },
      ],
      passives: { chainOnKill: true },
    },
  ],

  spells: [],
  transformations: [],
});

export default fighter;

