// Druid class definition
// Season 8, Hotfix 112-1

import { EFFECT_PHASES, TARGETING } from '../constants.js';

const { PRE_CURVE_FLAT, POST_CURVE } = EFFECT_PHASES;
const { SELF_ONLY, ALLY_OR_SELF, ENEMY_ONLY } = TARGETING;

export const druid = {
  id: "druid",
  name: "Druid",

  // Base attributes (naked, no gear)
  baseStats: {
    str: 12,
    vig: 13,
    agi: 12,
    dex: 12,
    wil: 18,
    kno: 20,
    res: 18,
  },

  // Class configuration
  maxPerks: 4,
  maxSkills: 2,
  spellCostType: "charges",  // Spells have limited casts (maxCasts), recovered via rest/potions
  equippableArmor: ["cloth", "leather"],

  // Stats to prominently display for this class
  majorDerivedStats: [
    "hp", "ppb", "mpb", "pdr", "mdr",
    "moveSpeed", "actionSpeed", "spellCastingSpeed", "magicalHealing",
  ],

  // ── Perks ──
  perks: [
    {
      id: "dreamwalk",
      name: "Dreamwalk",
      desc: "+5 magical power for 2s when hit. Become spiritual (no collision, can cast, can't attack). 18s CD.",
      passiveEffects: {
        onDamageTaken: {
          stat: "magicalPower",
          value: 5,
          duration: 2,
          cooldown: 18,
          becomesSpiritual: true,
        },
      },
    },
    {
      id: "enhanced_wildness",
      name: "Enhanced Wildness",
      desc: "While in animal form, gain 5% physical damage bonus and 20 armor rating.",
      shapeshiftOnly: true,
      statEffects: [
        { stat: "physicalDamageBonus", value: 0.05 },
        { stat: "armorRating", value: 20 },
      ],
    },
    {
      id: "force_of_nature",
      name: "Force of Nature",
      desc: "When you heal a target (including self), the target gains 5 physical power for 3 seconds.",
      passiveEffects: {
        onHeal: {
          stat: "physicalPower",
          value: 5,
          duration: 3,
        },
      },
    },
    {
      id: "herbal_sensing",
      name: "Herbal Sensing",
      desc: "Detects nearby herbs and increases the chance of gathering higher-grade herbs.",
      // Utility only — no stat effects for the simulator
    },
    {
      id: "lifebloom_aura",
      name: "Lifebloom Aura",
      desc: "Restores an additional 1 health to target when caster heals self or allies within aura range. Disables shapeshift.",
      disablesShapeshift: true,
      passiveEffects: {
        healBonus: 1,  // Flat +1 to all outgoing heals
      },
    },
    {
      id: "natural_healing",
      name: "Natural Healing",
      desc: "Recover yourself and nearby allies 1(0.1) health every 3 seconds.",
      healEffects: [
        { label: "Tick (3s)", baseHeal: 1, scaling: 0.1 },
      ],
    },
    {
      id: "shapeshift_mastery",
      name: "Shapeshift Mastery",
      desc: "Reduces shapeshifting time by 25% and reduces Wild skill CD by 25%, but prevents spirit spells.",
      disablesSpiritSpells: true,
      passiveEffects: {
        shapeshiftTimeReduction: 0.25,
        wildSkillCooldownReduction: 0.25,
      },
    },
    {
      id: "spirit_bond",
      name: "Spirit Bond",
      desc: "Once every 1s, receive 20% of damage received by party members instead. Max 20 damage.",
      // Party utility — no solo stat effect for the simulator
      passiveEffects: {
        partyDamageShare: { percent: 0.20, maxDamage: 20, interval: 1 },
      },
    },
    {
      id: "spirit_magic_mastery",
      name: "Spirit Magic Mastery",
      desc: "When you cast spirit magic, gain 10 magical power permanently.",
      // Permanent buff after first spirit spell cast — modeled as a stat effect
      // since the druid will always cast at least one spirit spell.
      statEffects: [
        { stat: "magicalPower", value: 10 },
      ],
    },
    {
      id: "sun_and_moon",
      name: "Sun and Moon",
      desc: "Nearby allies (including self) gain 3 vigor and 5 magical power.",
      statEffects: [
        { stat: "vig", value: 3 },
        { stat: "magicalPower", value: 5 },
      ],
    },
    {
      id: "thorn_coat",
      name: "Thorn Coat",
      desc: "When melee attacked, return 5 true physical damage to the attacker.",
      onHitReceived: [
        { damageType: "true_physical", damage: 5, trueDamage: true },
      ],
    },
  ],

  // ── Skills ──
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
      id: "shapeshift_memory",
      name: "Shapeshift Memory",
      type: "shapeshift_memory",
      desc: "Transforms into the selected creature. Tools cannot be used in a non-human state.",
      shapeshiftSlots: 5,
    },
  ],

  // ── Spells ──
  // TODO: Transcribe from screenshots (10 spells)
  spells: [],

  // ── Transformations ──
  // Forms equipped into Shapeshift Memory. Each form has stat modifiers,
  // attacks (using the primitive curve formula), and a Wild skill.
  // Damage formula: (primitiveCurve(attr) × multiplier + add) × (1 + PowerBonus)
  // Status: WIKI-SOURCED, damage formula NOT YET VERIFIED in-game.
  transformations: [
    {
      id: "bear",
      name: "Bear",
      primitiveAttr: "str",
      statModifiers: [
        { stat: "physicalDamageReduction", value: 0.50 },
        { stat: "projectileDamageReduction", value: 0.10 },
        { stat: "maxHealthBonus", value: 0.50 },
        { stat: "moveSpeedBonus", value: -0.20 },
        { stat: "actionSpeed", value: -0.30 },
        { stat: "jumpHeight", value: -0.30 },
      ],
      attacks: [
        {
          id: "swipe",
          name: "Swipe",
          desc: "Claws the target with your right hand, pushing the target away.",
          primitiveMultiplier: 1.0,
          primitiveAdd: 27,
          scaling: 1.0,
          damageType: "physical",
        },
        {
          id: "bash",
          name: "Bash",
          desc: "Raise your body and deal damage with both hands. Can push targets and destroy unreinforced doors/containers.",
          primitiveMultiplier: 1.0,
          primitiveAdd: 41,
          scaling: 1.0,
          damageType: "physical",
        },
      ],
      wildSkill: {
        id: "wild_fury",
        name: "Wild Fury",
        desc: "For 8 seconds, Physical Damage Reduction increases by 20% and Magical Damage Reduction increases by 20%.",
        duration: 8,
        effects: [
          { stat: "physicalDamageReduction", value: 0.20 },
          { stat: "magicalDamageReduction", value: 0.20 },
        ],
      },
    },
    {
      id: "panther",
      name: "Panther",
      primitiveAttr: "agi",
      statModifiers: [
        { stat: "physicalDamageReduction", value: -0.30 },
        { stat: "incomingPhysicalHealing", value: -0.10 },
        { stat: "incomingMagicalHealing", value: -0.10 },
        { stat: "moveSpeed", value: 5 },
        { stat: "jumpHeight", value: 0.20 },
      ],
      passiveNotes: "Panther has its own fixed attack speed, independent of Action Speed stat.",
      fixedAttackSpeed: true,  // Ignores character Action Speed — exact value UNRESOLVED
      attacks: [
        {
          id: "scratch",
          name: "Scratch",
          desc: "Claws the target, causing bleed.",
          primitiveMultiplier: 1.0,
          primitiveAdd: 23,
          scaling: 1.0,
          damageType: "physical",
          bleed: { damage: 5, scaling: 0.5, duration: 3, damageType: "physical" },
        },
        {
          id: "neckbite",
          name: "Neckbite",
          desc: "Bite the target's neck. While frenzied, silences the target for 0.1 seconds.",
          primitiveMultiplier: 1.0,
          primitiveAdd: 25,
          scaling: 1.0,
          damageType: "physical",
          frenziedEffect: { silence: 0.1 },
        },
      ],
      wildSkill: {
        id: "wild_rush",
        name: "Rush",
        desc: "Enter a frenzy state. Neckbite silences while frenzied.",
        grantsFrenzy: true,
      },
    },
    {
      id: "chicken",
      name: "Chicken",
      primitiveAttr: "res",
      statModifiers: [
        { stat: "maxHealthBonus", value: -0.60 },
        { stat: "incomingPhysicalHealing", value: -0.60 },
        { stat: "incomingMagicalHealing", value: -0.60 },
      ],
      attacks: [
        {
          id: "pecking",
          name: "Pecking",
          desc: "Pecks the target with its beak. Penetrates 30(1.0)% of target's armor.",
          primitiveMultiplier: 1.0,
          primitiveAdd: 23,
          scaling: 1.0,
          damageType: "physical",
          armorPenetration: { base: 0.30, scaling: 1.0 },
        },
      ],
      wildSkill: {
        id: "insect_predation",
        name: "Insect Predation",
        desc: "Eats crawling insects and heals.",
        heal: { primitiveMultiplier: 4.0, scaling: 1.0 },
      },
    },
    {
      id: "rat",
      name: "Rat",
      primitiveAttr: null,  // Rat attacks don't use a primitive curve
      statModifiers: [
        { stat: "maxHealthBonus", value: -0.95 },
        { stat: "physicalDamageReduction", value: -1.00 },
        { stat: "magicalDamageReduction", value: -1.00 },
        { stat: "incomingPhysicalHealing", value: -0.95 },
        { stat: "incomingMagicalHealing", value: -0.95 },
        { stat: "jumpHeight", value: 0.10 },
      ],
      attacks: [
        {
          id: "infected_fangs",
          name: "Infected Fangs",
          desc: "Bites the target, inflicting 1(1.0) physical damage and spreading a plague that deals 3(0.5) magical damage for 3 seconds.",
          primitiveMultiplier: 0,
          primitiveAdd: 1,
          scaling: 1.0,
          damageType: "physical",
          plague: { damage: 3, scaling: 0.5, duration: 3, damageType: "magical" },
        },
      ],
      wildSkill: {
        id: "survival_instinct",
        name: "Survival Instinct",
        desc: "Gain 10 max health, 20 additional move speed for 4 seconds. Then lose 20% move speed bonus for 3 seconds.",
        duration: 4,
        effects: [
          { stat: "maxHealth", value: 10 },
          { stat: "moveSpeed", value: 20 },
        ],
        afterEffect: {
          duration: 3,
          effects: [
            { stat: "moveSpeedBonus", value: -0.20 },
          ],
        },
      },
    },
    {
      id: "penguin",
      name: "Penguin",
      primitiveAttr: "wil",
      statModifiers: [
        { stat: "maxHealthBonus", value: -0.40 },
        { stat: "incomingPhysicalHealing", value: -0.40 },
        { stat: "incomingMagicalHealing", value: -0.40 },
      ],
      attacks: [
        {
          id: "sharp_beak",
          name: "Sharp Beak",
          desc: "Bites the target, causing bleeding.",
          primitiveMultiplier: 1.0,
          primitiveAdd: 17,
          scaling: 1.0,
          damageType: "physical",
          bleed: { damage: 3, scaling: 0.5, duration: 3, damageType: "physical" },
        },
        {
          id: "water_cannon",
          name: "Water Cannon",
          desc: "Spit a stream of water forward dealing ice magical damage.",
          primitiveMultiplier: 1.0,
          primitiveAdd: 15,
          scaling: 1.0,
          damageType: "ice_magical",
        },
      ],
      wildSkill: {
        id: "penguin_dash",
        name: "Penguin Dash",
        desc: "Gain 15% move speed bonus while in water for 3 seconds.",
        duration: 3,
        effects: [
          { stat: "moveSpeedBonus", value: 0.15 },
        ],
        condition: "in_water",
      },
    },
    {
      id: "human",
      name: "Human",
      primitiveAttr: null,
      statModifiers: [],
      attacks: [],
      wildSkill: null,
    },
  ],
};
