// Druid — v3 class definition.
// Authored from docs/classes/druid.csv against docs/shape_examples.md patterns
// and docs/vocabulary.md enums. See docs/engine_requirements_phase_1_3.md for
// engine capabilities this data depends on but that aren't yet implemented.

export const druid = ({
  id: "druid",
  name: "Druid",
  desc: "Shapeshift into beasts; nature's fury and healing.",

  baseAttributes: { str: 12, vig: 13, agi: 12, dex: 12, wil: 18, kno: 20, res: 18 },
  // CSV omits HP. HR = 12×0.25 + 13×0.75 = 12.75; interpolated best-faith.
  baseHealth: 120,

  maxPerks: 4,
  maxSkills: 2,

  armorRestrictions: ["cloth", "leather"],
  spellCost: { type: "charges" },

  _unverified: {
    baseHealth: "CSV omits Druid HP; authored 120 by HR interpolation (HR=12.75). Pending in-game verification.",
  },

  perks: [
    {
      id: "dreamwalk",
      type: "perk",
      name: "Dreamwalk",
      desc: "When you take damage, your magical power increases by 5 for 2 seconds and you become spiritual. The player does not collide with other targets and cannot attack or use skills, but can cast spells. This ability triggers once every 18 seconds.",
      activation: "passive",
      duration: { base: 2, type: "buff" },
      triggers: [
        {
          desc: "Fires on damage taken (18s CD) — +5 magical power, enters spiritual state.",
          effects: [
            { stat: "magicalPower", value: 5, phase: "post_curve" },
          ],
          stateChange: { spiritual: true },
        },
      ],
      passives: {
        cooldownGated: true,
        spiritualStateDisablesAttack: true,
        spiritualStateImmunePhysical: true,
      },
    },

    {
      id: "enhanced_wildness",
      type: "perk",
      name: "Enhanced Wildness",
      desc: "While you are in animal form, you gain 5% physical damage bonus and you gain 20 armor rating.",
      activation: "passive",
      effects: [
        {
          stat: "physicalDamageBonus", value: 0.05, phase: "post_curve",
          // Any form: form_active without a specific form = "any active form" per tracker D.13.
          condition: { type: "form_active" },
        },
        {
          stat: "armorRating", value: 20, phase: "pre_curve_flat",
          condition: { type: "form_active" },
        },
      ],
    },

    {
      id: "force_of_nature",
      type: "perk",
      name: "Force of Nature",
      desc: "When you heal a target, the target gains 5 physical power for 3 seconds. Can apply to yourself if you heal yourself.",
      activation: "passive",
      duration: { base: 3, type: "buff" },
      triggers: [
        {
          desc: "Fires on heal landed — target gains +5 physical power for 3s.",
          effects: [
            { stat: "physicalPower", value: 5, phase: "post_curve", target: "ally_or_self" },
          ],
        },
      ],
    },

    {
      id: "herbal_sensing",
      type: "perk",
      name: "Herbal Sensing",
      desc: "Detects nearby herbs and increases the chance of gathering higher-grade herbs.",
      activation: "passive",
      passives: { herbDetection: true, higherGradeHerbs: true },
    },

    {
      id: "lifebloom_aura",
      type: "perk",
      name: "Lifebloom Aura",
      desc: "Restores an additional 1 health to target when caster heals self or allies within aura range. Disables shapeshift.",
      activation: "passive",
      tags: ["aura"],
      effects: [
        { stat: "healingAdd", value: 1, phase: "post_curve", target: "nearby_allies" },
      ],
      disables: [{ type: "transformation" }],
    },

    {
      id: "natural_healing",
      type: "perk",
      name: "Natural Healing",
      desc: "Recover yourself and nearby allies 1(0.1) health every 3 seconds.",
      activation: "passive",
      triggers: [
        {
          desc: "Every 3s — heal 1(0.1) to self and nearby allies.",
          heal: {
            baseHeal: 1, scaling: 0.1, healType: "physical",
            isHot: true, tickRate: 3, target: "nearby_allies",
          },
        },
      ],
    },

    {
      id: "shapeshift_mastery",
      type: "perk",
      name: "Shapeshift Mastery",
      desc: "Reduces shapeshifting time by 25% and reduces the cooldown of Wild skills by 25%. Prevents the use of spirit spells.",
      activation: "passive",
      effects: [
        { stat: "shapeshiftTimeReduction", value: 0.25, phase: "post_curve" },
        { stat: "wildSkillCooldownReduction", value: 0.25, phase: "post_curve" },
      ],
      disables: [{ type: "spell", filter: { tags: ["spirit"] } }],
    },

    {
      id: "spirit_bond",
      type: "perk",
      name: "Spirit Bond",
      desc: "Once every 1 second you will receive 20% of damage received by party members instead. Can receive damage up to 20.",
      activation: "passive",
      passives: { damageTransfer: { rate: 0.20, cap: 20, cooldown: 1 } },
    },

    {
      id: "spirit_magic_mastery",
      type: "perk",
      name: "Spirit Magic Mastery",
      desc: "When you cast spirit magic, you gain 10 magical power, stacks until you die.",
      activation: "passive",
      // Open-ended stacking until death. Author with large maxStacks; runtime
      // tracks accumulation per life.
      stacking: {
        maxStacks: 99,
        perStack: [
          { stat: "magicalPower", value: 10, phase: "post_curve" },
        ],
        desc: "+10 magical power per spirit-spell cast; persists until death.",
      },
    },

    {
      id: "sun_and_moon",
      type: "perk",
      name: "Sun and Moon",
      desc: "Nearby allies +3 VIG, +5 magical power.",
      activation: "passive",
      tags: ["aura"],
      effects: [
        { stat: "vig", value: 3, phase: "pre_curve_flat", target: "nearby_allies" },
        { stat: "magicalPower", value: 5, phase: "post_curve", target: "nearby_allies" },
      ],
    },

    {
      id: "thorn_coat",
      type: "perk",
      name: "Thorn Coat",
      desc: "When you are attacked you return 5 true physical damage to the attacker.",
      activation: "passive",
      triggers: [
        {
          desc: "Fires on being hit — returns 5 true physical damage.",
          damage: [
            { base: 5, scaling: 0, damageType: "physical", trueDamage: true, target: "enemy" },
          ],
        },
      ],
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
      id: "shapeshift_memory",
      type: "skill",
      name: "Shapeshift Memory",
      desc: "5 shapeshift slots. Transform into creatures.",
      activation: "passive",
      slots: { type: "shapeshift", count: 5 },
    },
  ],

  spells: [
    {
      id: "natures_touch",
      type: "spell",
      name: "Nature's Touch",
      desc: "The target gains 15 additional recoverable health. Also heals 15(0.25) health over 12 seconds. Cast instantly and casts on yourself if no target is found.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "ally_or_self",
      tags: ["nature"],
      duration: { base: 12, type: "buff" },
      heal: {
        baseHeal: 15, scaling: 0.25, healType: "physical",
        isHot: true, tickRate: 1, target: "ally_or_self",
      },
      effects: [
        { stat: "recoverableHealth", value: 15, phase: "post_curve", target: "ally_or_self" },
      ],
      passives: { instantCast: true },
    },

    {
      id: "barkskin_armor",
      type: "spell",
      name: "Barkskin Armor",
      desc: "Encloses the target in a protective bark for 10 seconds, increasing armor rating by 50 and increasing headshot damage reduction by 10%.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "ally_or_self",
      tags: ["nature"],
      duration: { base: 10, type: "buff" },
      effects: [
        { stat: "armorRating", value: 50, phase: "pre_curve_flat", target: "ally_or_self" },
        { stat: "headshotDamageReduction", value: 0.10, phase: "post_curve", target: "ally_or_self" },
      ],
    },

    {
      id: "orb_of_nature",
      type: "spell",
      name: "Orb of Nature",
      desc: "Fire an orb that deals 15(1.0) spirit magical damage on contact with an enemy, or grants Nature's Touch on contact with an ally.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "enemy_or_self",
      tags: ["spirit", "nature", "projectile"],
      damage: [
        { base: 15, scaling: 1.0, damageType: "spirit_magical", target: "enemy" },
      ],
      grantsSpells: ["natures_touch"],
    },

    {
      id: "dreamfire",
      type: "spell",
      name: "Dreamfire",
      desc: "Deals 15(1.0) spirit magical damage to all enemies in area. Instantly heals caster and allies currently affected by Nature's Touch for 10(1.0) health per target damaged. This effect applies within a 7m radius of the caster.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      targeting: "enemy",
      tags: ["spirit"],
      damage: [
        { base: 15, scaling: 1.0, damageType: "spirit_magical", target: "nearby_enemies" },
      ],
      triggers: [
        {
          desc: "Per enemy damaged — allies affected by Nature's Touch are healed for 10(1.0) (within 7m).",
          heal: {
            baseHeal: 10, scaling: 1.0, healType: "magical", target: "nearby_allies",
          },
          condition: { type: "effect_active", effectId: "natures_touch" },
        },
      ],
      passives: { radius: 7 },
    },

    {
      id: "restore",
      type: "spell",
      name: "Restore",
      desc: "Restore the health of all allies within 3m radius by 20(0.25) health for 12 seconds.",
      activation: "cast",
      cost: { type: "charges", value: 3 },
      targeting: "nearby_allies",
      tags: ["nature"],
      duration: { base: 12, type: "buff" },
      heal: {
        baseHeal: 20, scaling: 0.25, healType: "magical",
        isHot: true, tickRate: 1, target: "nearby_allies",
      },
      passives: { radius: 3 },
    },

    {
      id: "entangling_vines",
      type: "spell",
      name: "Entangling Vines",
      desc: "Spreads roots across the floor in a 1m radius that lasts for 3 seconds. Any targets that pass through the area of effect are frozen in place for 1 second. After the effect is removed, the target gets immunity to the entangling effects for 1 second.",
      activation: "cast",
      cost: { type: "charges", value: 2 },
      targeting: "enemy",
      tags: ["nature"],
      duration: { base: 3, type: "other" },
      cc: { type: "root", duration: { base: 1, type: "debuff" } },
      passives: { radius: 1, immunityAfter: 1 },
    },

    {
      id: "thorn_barrier",
      type: "spell",
      name: "Thorn Barrier",
      desc: "Creates a thorn barrier that lasts for 4 seconds. Any character standing near the thorn barrier will take 4 physical damage per second.",
      activation: "cast",
      cost: { type: "charges", value: 2 },
      targeting: "enemy",
      tags: ["nature"],
      duration: { base: 4, type: "other" },
      damage: [
        { base: 4, scaling: 0, damageType: "physical", isDot: true, tickRate: 1, target: "nearby_enemies" },
      ],
    },

    {
      id: "summon_treant",
      type: "spell",
      name: "Summon Treant",
      desc: "Summons a treant to fight with you for 24 seconds. Treants become more powerful when summoned underwater.",
      activation: "cast",
      cost: { type: "charges", value: 2 },
      targeting: "self",
      tags: ["nature", "summon"],
      summon: {
        type: "treant",
        duration: { base: 24, type: "other" },
        damage: [
          { base: 0, scaling: 0, damageType: "physical", target: "enemy" },
        ],
        desc: "Treant — fights alongside caster; empowered in water.",
      },
      passives: { environmentBonus: "water" },
      _unverified: { treantDamage: "CSV omits base damage; authored 0/0 placeholder." },
    },

    {
      id: "mending_grove",
      type: "spell",
      name: "Mending Grove",
      desc: "While standing on the ground, create a forest area centered around you within a 3m radius. Targets in the area gain 10% max health bonus and are healed for 10 health per second.",
      activation: "cast",
      cost: { type: "charges", value: 2 },
      targeting: "nearby_allies",
      tags: ["nature"],
      duration: { base: 5, type: "other" },
      heal: {
        baseHeal: 10, scaling: 0, healType: "magical",
        isHot: true, tickRate: 1, target: "nearby_allies",
      },
      effects: [
        { stat: "maxHealthBonus", value: 0.10, phase: "pre_curve_flat", target: "nearby_allies" },
      ],
      passives: { radius: 3 },
      _unverified: { duration: "CSV omits duration; authored 5s best-faith per tracker F." },
    },

    {
      id: "tree_of_life",
      type: "spell",
      name: "Tree of Life",
      desc: "Sprout a tree of life on a target, granting 3 all attributes and granting 20 additional recoverable health over 8 seconds. Also heals the target for 15(0.5) health over 8 seconds. Cannot cast on self.",
      activation: "cast",
      cost: { type: "charges", value: 2 },
      targeting: "ally_or_self",
      tags: ["nature"],
      duration: { base: 8, type: "buff" },
      effects: [
        { stat: "all_attributes", value: 3, phase: "pre_curve_flat", target: "ally_or_self" },
        { stat: "recoverableHealth", value: 20, phase: "post_curve", target: "ally_or_self" },
      ],
      heal: {
        baseHeal: 15, scaling: 0.5, healType: "magical",
        isHot: true, tickRate: 1, target: "ally_or_self",
      },
      passives: { cannotCastOnSelf: true },
    },
  ],

  transformations: [
    {
      id: "bear",
      type: "transformation",
      name: "Bear",
      desc: "Shapeshift into a bear. +50% PDR, +10% projectile DR, +50% max HP, -20% MS, -30% AS, -30% jump. Attacks: Swipe, Bash. Wild Skill: Wild Fury.",
      activation: "toggle",
      targeting: "self",
      tags: ["shapeshift"],
      form: {
        formId: "bear",
        scalesWith: "str",
        attacks: [
          {
            name: "Swipe",
            damage: [
              { base: 27, scaling: 1.0, damageType: "physical", target: "enemy" },
            ],
          },
          {
            name: "Bash",
            damage: [
              { base: 41, scaling: 1.0, damageType: "physical", target: "enemy" },
            ],
          },
        ],
        wildSkill: {
          id: "bear_wild_fury",
          name: "Wild Fury",
          desc: "+20% PDR/MDR for 8 seconds.",
          duration: { base: 8, type: "buff" },
          effects: [
            { stat: "physicalDamageReduction", value: 0.20, phase: "post_curve" },
            { stat: "magicalDamageReduction", value: 0.20, phase: "post_curve" },
          ],
        },
      },
      effects: [
        { stat: "physicalDamageReduction", value: 0.50, phase: "post_curve", condition: { type: "form_active", form: "bear" } },
        { stat: "projectileDamageReduction", value: 0.10, phase: "post_curve", condition: { type: "form_active", form: "bear" } },
        { stat: "maxHealthBonus", value: 0.50, phase: "pre_curve_flat", condition: { type: "form_active", form: "bear" } },
        { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", condition: { type: "form_active", form: "bear" } },
        { stat: "actionSpeed", value: -0.30, phase: "post_curve", condition: { type: "form_active", form: "bear" } },
        { stat: "jumpHeight", value: -0.30, phase: "post_curve", condition: { type: "form_active", form: "bear" } },
      ],
    },

    {
      id: "panther",
      type: "transformation",
      name: "Panther",
      desc: "Shapeshift into a panther. -30% PDR, -10% incoming phys/mag heal, +5 MS, +20% jump. Attacks: Scratch (bleed), Neckbite (silences while frenzied). Wild Skill: Rush (frenzy).",
      activation: "toggle",
      targeting: "self",
      tags: ["shapeshift"],
      form: {
        formId: "panther",
        scalesWith: "agi",
        attacks: [
          {
            name: "Scratch",
            damage: [
              { base: 23, scaling: 1.0, damageType: "physical", target: "enemy" },
            ],
            appliesStatus: [
              {
                type: "bleed",
                duration: { base: 3, type: "debuff" },
                damage: { base: 5, scaling: 0.5, damageType: "physical", isDot: true, tickRate: 1 },
                desc: "Bleed — 5(0.5) physical per tick for 3s.",
              },
            ],
          },
          {
            name: "Neckbite",
            damage: [
              { base: 25, scaling: 1.0, damageType: "physical", target: "enemy" },
            ],
            frenziedEffect: {
              appliesStatus: [
                {
                  type: "silence",
                  duration: { base: 2, type: "debuff" },
                  desc: "Silence — only applied while frenzied.",
                },
              ],
            },
          },
        ],
        wildSkill: {
          id: "panther_rush",
          name: "Rush",
          desc: "Enter frenzy state.",
          effects: [],
          stateChange: { frenzy: true },
        },
      },
      effects: [
        { stat: "physicalDamageReduction", value: -0.30, phase: "post_curve", condition: { type: "form_active", form: "panther" } },
        { stat: "incomingPhysicalHealing", value: -0.10, phase: "post_curve", condition: { type: "form_active", form: "panther" } },
        { stat: "incomingMagicalHealing", value: -0.10, phase: "post_curve", condition: { type: "form_active", form: "panther" } },
        { stat: "moveSpeed", value: 5, phase: "post_curve", condition: { type: "form_active", form: "panther" } },
        { stat: "jumpHeight", value: 0.20, phase: "post_curve", condition: { type: "form_active", form: "panther" } },
      ],
    },

    {
      id: "chicken",
      type: "transformation",
      name: "Chicken",
      desc: "Shapeshift into a chicken. -60% max HP, -60% incoming heals. Attack: Pecking (30% armor pen). Wild Skill: Insect Predation (heal via RES curve × 400%).",
      activation: "toggle",
      targeting: "self",
      tags: ["shapeshift"],
      form: {
        formId: "chicken",
        scalesWith: "res",
        attacks: [
          {
            name: "Pecking",
            damage: [
              { base: 23, scaling: 1.0, damageType: "physical", target: "enemy" },
            ],
            passives: { armorPenetration: 0.30 },
          },
        ],
        wildSkill: {
          id: "chicken_insect_predation",
          name: "Insect Predation",
          desc: "Eat to heal for resourcefulness curve × 400% health.",
          heal: {
            baseHeal: 0, scaling: 4.0, healType: "physical", target: "self",
          },
        },
      },
      effects: [
        { stat: "maxHealthBonus", value: -0.60, phase: "pre_curve_flat", condition: { type: "form_active", form: "chicken" } },
        { stat: "incomingPhysicalHealing", value: -0.60, phase: "post_curve", condition: { type: "form_active", form: "chicken" } },
        { stat: "incomingMagicalHealing", value: -0.60, phase: "post_curve", condition: { type: "form_active", form: "chicken" } },
      ],
    },

    {
      id: "rat",
      type: "transformation",
      name: "Rat",
      desc: "Shapeshift into a rat. -95% max HP, -100% PDR/MDR, -95% incoming heals, +10% jump. Attack: Infected Fangs (plague). Wild Skill: Survival Instinct.",
      activation: "toggle",
      targeting: "self",
      tags: ["shapeshift"],
      form: {
        formId: "rat",
        scalesWith: null,
        attacks: [
          {
            name: "Infected Fangs",
            damage: [
              { base: 1, scaling: 1.0, damageType: "physical", target: "enemy" },
            ],
            appliesStatus: [
              {
                type: "plague",
                duration: { base: 3, type: "debuff" },
                damage: { base: 3, scaling: 0.5, damageType: "magical", isDot: true, tickRate: 1 },
                desc: "Plague — 3(0.5) magical per tick for 3s.",
              },
            ],
          },
        ],
        wildSkill: {
          id: "rat_survival_instinct",
          name: "Survival Instinct",
          desc: "+10 max HP, +20 additional move speed for 4s. When effect ends, you lose 20% move speed bonus for 3 seconds.",
          duration: { base: 4, type: "buff" },
          effects: [
            { stat: "maxHealth", value: 10, phase: "pre_curve_flat" },
            { stat: "moveSpeed", value: 20, phase: "post_curve" },
          ],
          afterEffect: {
            duration: { base: 3, type: "debuff" },
            effects: [
              { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve" },
            ],
          },
        },
      },
      effects: [
        { stat: "maxHealthBonus", value: -0.95, phase: "pre_curve_flat", condition: { type: "form_active", form: "rat" } },
        { stat: "physicalDamageReduction", value: -1.00, phase: "post_curve", condition: { type: "form_active", form: "rat" } },
        { stat: "magicalDamageReduction", value: -1.00, phase: "post_curve", condition: { type: "form_active", form: "rat" } },
        { stat: "incomingPhysicalHealing", value: -0.95, phase: "post_curve", condition: { type: "form_active", form: "rat" } },
        { stat: "incomingMagicalHealing", value: -0.95, phase: "post_curve", condition: { type: "form_active", form: "rat" } },
        { stat: "jumpHeight", value: 0.10, phase: "post_curve", condition: { type: "form_active", form: "rat" } },
      ],
    },

    {
      id: "penguin",
      type: "transformation",
      name: "Penguin",
      desc: "Shapeshift into a penguin. -40% max HP, -40% incoming heals. Attacks: Sharp Beak (bleed), Water Cannon. Wild Skill: Penguin Dash (water bonus).",
      activation: "toggle",
      targeting: "self",
      tags: ["shapeshift"],
      form: {
        formId: "penguin",
        scalesWith: "wil",
        attacks: [
          {
            name: "Sharp Beak",
            damage: [
              { base: 17, scaling: 1.0, damageType: "physical", target: "enemy" },
            ],
            appliesStatus: [
              {
                type: "bleed",
                duration: { base: 3, type: "debuff" },
                damage: { base: 3, scaling: 0.5, damageType: "physical", isDot: true, tickRate: 1 },
                desc: "Bleed — 3(0.5) physical per tick for 3s.",
              },
            ],
          },
          {
            name: "Water Cannon",
            damage: [
              { base: 15, scaling: 1.0, damageType: "ice_magical", target: "enemy" },
            ],
          },
        ],
        wildSkill: {
          id: "penguin_dash",
          name: "Penguin Dash",
          desc: "+15% MS bonus while in water for 3 seconds.",
          duration: { base: 3, type: "buff" },
          effects: [
            {
              stat: "moveSpeedBonus", value: 0.15, phase: "post_curve",
              condition: { type: "environment", env: "water" },
            },
          ],
        },
      },
      effects: [
        { stat: "maxHealthBonus", value: -0.40, phase: "pre_curve_flat", condition: { type: "form_active", form: "penguin" } },
        { stat: "incomingPhysicalHealing", value: -0.40, phase: "post_curve", condition: { type: "form_active", form: "penguin" } },
        { stat: "incomingMagicalHealing", value: -0.40, phase: "post_curve", condition: { type: "form_active", form: "penguin" } },
      ],
    },
  ],
});

export default druid;
