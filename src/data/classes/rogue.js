// Rogue — v3 class definition.
// Authored from docs/classes/rogue.csv. See engine_requirements_phase_1_3.md.

export const rogue = ({
  id: "rogue",
  name: "Rogue",
  desc: "Stealth, backstabs, and poisoned weapons.",

  baseAttributes: { str: 9, vig: 6, agi: 25, dex: 20, wil: 10, kno: 10, res: 25 },
  baseHealth: 109,

  maxPerks: 4,
  maxSkills: 2,

  armorRestrictions: ["cloth", "leather"],
  spellCost: { type: "none" },

  perks: [
    {
      id: "ambush",
      type: "perk",
      name: "Ambush",
      desc: "When coming out of hide, you gain an additional 10% move speed bonus and 25% physical damage bonus for 3 seconds. If the melee attack is successful, the effect disappears.",
      activation: "passive",
      duration: { base: 3, type: "buff" },
      tags: ["stealth"],
      triggers: [
        {
          desc: "Fires on exit from Hide. Buff consumed on first successful melee hit within 3s.",
          effects: [
            { stat: "moveSpeedBonus", value: 0.10, phase: "post_curve", target: "self" },
            { stat: "physicalDamageBonus", value: 0.25, phase: "post_curve", target: "self" },
          ],
        },
      ],
    },

    {
      id: "back_attack",
      type: "perk",
      name: "Back Attack",
      desc: "When attacking a target from behind, gain 30% physical damage bonus.",
      activation: "passive",
      tags: ["backstab"],
      // Per vocab lock (Cat 9): backstabPower retired; authored as conditional physicalDamageBonus.
      effects: [
        {
          stat: "physicalDamageBonus", value: 0.30, phase: "post_curve",
          condition: { type: "player_state", state: "behind_target" },
        },
      ],
    },

    {
      id: "creep",
      type: "perk",
      name: "Creep",
      desc: "While crouch walking, reduce the volume of footsteps significantly and gain 10% move speed bonus.",
      activation: "passive",
      effects: [
        {
          stat: "moveSpeedBonus", value: 0.10, phase: "post_curve",
          condition: { type: "player_state", state: "crouching" },
        },
      ],
      passives: { reducedFootstepVolume: true },
    },

    {
      id: "dagger_mastery",
      type: "perk",
      name: "Dagger Mastery",
      desc: "When using a dagger, gain 10% physical damage bonus and 1 true physical damage.",
      activation: "passive",
      effects: [
        {
          stat: "physicalDamageBonus", value: 0.10, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "dagger" },
        },
      ],
      triggers: [
        {
          desc: "Fires on each dagger hit — +1 true physical damage.",
          condition: { type: "weapon_type", weaponType: "dagger" },
          damage: [
            { base: 1, scaling: 0, damageType: "physical", trueDamage: true, target: "enemy" },
          ],
        },
      ],
    },

    {
      id: "double_jump",
      type: "perk",
      name: "Double Jump",
      desc: "You gain the ability to jump an additional time in the air.",
      activation: "passive",
      passives: { doubleJump: true },
    },

    {
      id: "hide_mastery",
      type: "perk",
      name: "Hide Mastery",
      desc: "Increases the duration of the Hide skill by 1.5 times and reduces its cooldown time by 30 seconds.",
      activation: "passive",
      abilityModifiers: [
        { target: { id: "hide" }, modify: "duration", value: 0.50, mode: "multiply" },
        { target: { id: "hide" }, modify: "cooldown", value: -30, mode: "add" },
      ],
    },

    {
      id: "jokester",
      type: "perk",
      name: "Jokester",
      desc: "Give all party members 2 all attributes. Also applies to self.",
      activation: "passive",
      effects: [
        { stat: "all_attributes", value: 2, phase: "pre_curve_flat", target: "party" },
      ],
    },

    {
      id: "pickpocket",
      type: "perk",
      name: "Pickpocket",
      desc: "Steal items from nearby enemies. Additionally, your hide will not be revealed when you are bumped into. Items worn in utility slots do not appear on the waist.",
      activation: "passive",
      passives: { stealItems: true, hideRevealmentOnBump: false, utilityHidden: true },
    },

    {
      id: "poisoned_weapon",
      type: "perk",
      name: "Poisoned Weapon",
      desc: "A successful attack applies poison that deals 4(0.5) magical damage and reduces their incoming physical healing by 10% and incoming magical healing by 10% over 4 seconds. The poison can stack up to 5 times.",
      activation: "passive",
      triggers: [
        {
          desc: "Fires on melee hit — applies Poison status (stacks up to 5).",
          appliesStatus: [
            {
              type: "poison",
              duration: { base: 4, type: "debuff" },
              maxStacks: 5,
              damage: {
                base: 4,
                scaling: 0.5,
                damageType: "magical",
                isDot: true,
                tickRate: 1,
              },
              effects: [
                { stat: "incomingPhysicalHealing", value: -0.10, phase: "post_curve", target: "enemy" },
                { stat: "incomingMagicalHealing", value: -0.10, phase: "post_curve", target: "enemy" },
              ],
              desc: "Poison DoT — stacks up to 5; each stack contributes its own DoT + healing debuff.",
            },
          ],
        },
      ],
    },

    {
      id: "stealth",
      type: "perk",
      name: "Stealth",
      desc: "While hiding, gain the ability to move 10 steps while crouching or slow walking. Also gain 3 additional move speed per remaining step.",
      activation: "passive",
      effects: [
        {
          stat: "moveSpeed", value: 0, phase: "post_curve",
          condition: { type: "player_state", state: "hiding" },
        },
      ],
      passives: { moveWhileHiding: true, moveSpeedPerStep: 3, stepAllowance: 10 },
    },

    {
      id: "thrust",
      type: "perk",
      name: "Thrust",
      desc: "While using dagger, gain an additional 20% armor penetration.",
      activation: "passive",
      effects: [
        {
          stat: "armorPenetration", value: 0.20, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "dagger" },
        },
      ],
    },

    {
      id: "traps_and_locks",
      type: "perk",
      name: "Traps and Locks",
      desc: "You can unlock locked locks without a lockpick and detect traps within a certain range to disarm them.",
      activation: "passive",
      passives: { unlockWithoutPicklock: true, detectTrapsInRange: true },
    },
  ],

  skills: [
    {
      id: "weakpoint_attack",
      type: "skill",
      name: "Weakpoint Attack",
      desc: "When you successfully hit a target, reduce their armor rating bonus by 40% for 3 seconds. Only when melee attack.",
      activation: "cast",
      targeting: "enemy",
      duration: { base: 3, type: "debuff" },
      triggers: [
        {
          desc: "Fires on a successful melee hit.",
          effects: [
            { stat: "armorRating", value: -0.40, phase: "post_curve", target: "enemy" },
          ],
        },
      ],
    },

    {
      id: "rupture",
      type: "skill",
      name: "Rupture",
      desc: "The next successful attack causes the target to bleed for 20(0.5) physical damage over 5 seconds. The buff is consumed when attack hits an object or target.",
      activation: "cast",
      targeting: "enemy",
      appliesStatus: [
        {
          type: "bleed",
          duration: { base: 5, type: "debuff" },
          damage: {
            base: 4,
            scaling: 0.1,
            damageType: "physical",
            isDot: true,
            tickRate: 1,
          },
          desc: "Bleed — 20(0.5) total physical damage over 5s (4 per tick × 5 ticks).",
        },
      ],
    },

    {
      id: "caltrops",
      type: "skill",
      name: "Caltrops",
      desc: "Drops Caltrops at your feet that deal 10(1.0) physical damage and slow the move speed bonus by 50% of anything that steps on them for 3 seconds.",
      activation: "cast",
      targeting: "enemy",
      tags: ["trap"],
      duration: { base: 3, type: "other" },
      damage: [
        { base: 10, scaling: 1.0, damageType: "physical", target: "enemy" },
      ],
      effects: [
        { stat: "moveSpeedBonus", value: -0.50, phase: "post_curve", target: "enemy" },
      ],
    },

    {
      id: "cut_throat",
      type: "skill",
      name: "Cut Throat",
      desc: "When you successfully hit a target, silence them for 2 seconds, disabling the target's skills/spells/performance abilities.",
      activation: "cast",
      targeting: "enemy",
      triggers: [
        {
          desc: "Fires on a successful melee hit — applies Silence.",
          appliesStatus: [
            {
              type: "silence",
              duration: { base: 2, type: "debuff" },
              desc: "Silence — disables skills/spells/performance abilities.",
            },
          ],
        },
      ],
    },

    {
      id: "hide",
      type: "skill",
      name: "Hide",
      desc: "Becomes invisible for 8 seconds. It is possible to change your equipment in this state. You are revealed when you attempt an action, such as moving, attacking, or using a skill.",
      activation: "toggle",
      targeting: "self",
      tags: ["stealth"],
      duration: { base: 8, type: "buff" },
      triggers: [
        {
          desc: "Activates Hide — sets hiding state.",
          stateChange: { hiding: true },
        },
      ],
      passives: { invisibility: true },
    },

    {
      id: "smoke_pot",
      type: "skill",
      name: "Smoke Pot",
      desc: "A smoke pot is deployed creating a smoke screen. The smoke screen lasts 8 seconds and covers a 6m area. When an enemy target enters the smoke screen, reduces their move speed bonus by 5%.",
      activation: "cast",
      targeting: "enemy",
      duration: { base: 8, type: "other" },
      effects: [
        { stat: "moveSpeedBonus", value: -0.05, phase: "post_curve", target: "enemy" },
      ],
    },

    {
      id: "tumbling",
      type: "skill",
      name: "Tumbling",
      desc: "When used, backtumbles in the opposite direction the player is facing.",
      activation: "cast",
      targeting: "self",
      // Movement ability — no stat effects.
    },
  ],

  spells: [],
  transformations: [],
});

export default rogue;
