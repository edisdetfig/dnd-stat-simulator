// Max-loadout benchmarking fixture.
//
// SYNTHETIC — NOT A REAL CLASS. Calibrated to exercise every pattern from
// src/data/classes/class-shape-examples.js at Warlock-scale density, so the
// Phase 0 benchmark has realistic atom churn to measure. Phase 2 migrates
// the real Warlock class; this fixture stays as the forward-declared
// max-density anchor so we can compare the two numbers.
//
// Every ability id, stat id, condition variant, atom shape, grant/remove
// shape, cost type, and activation type used here is present in
// class-shape.js / class-shape-examples.js / stat-meta.js / constants.js.
// Pattern coverage is enforced by max-loadout.fixture.test.js.

// ─────────────────────────────────────────────────────────────────────
// CLASS ROOT
// ─────────────────────────────────────────────────────────────────────

export const MAX_LOADOUT_CLASS = {
  id: "max_loadout",
  name: "Max-Loadout Benchmark",
  desc: "Synthetic benchmarking fixture — not a real class.",

  baseAttributes: { str: 15, vig: 20, agi: 10, dex: 12, wil: 25, kno: 30, res: 15 },
  baseHealth: 110,
  maxPerks: 3,
  maxSkills: 3,
  armorProficiency: ["cloth", "leather"],

  classResources: {
    // Cross-ability shared pool (darkness_shards analog).
    shared_pool: {
      maxStacks: 3,
      desc: "Shared-pool resource; accumulated by shared_accumulator perk and poisoned_strike spell; consumed on dark-magical damage.",
      condition: { type: "any", conditions: [
        { type: "ability_selected", abilityId: "shared_accumulator" },
        { type: "ability_selected", abilityId: "poisoned_strike" },
      ]},
    },
    // Grouped multi-atom, scoped to one ability (dark_offering_stacks analog).
    channel_stacks: {
      maxStacks: 10,
      desc: "Stacks gained per second while channel_form is toggled on.",
      condition: { type: "effect_active", effectId: "channel_form" },
    },
    // User-set counter, gated by effect_active AND any-of ability_selected
    // (blood_pact_locked_shards analog — the all/any/ability_selected mix).
    form_locked_shards: {
      maxStacks: 3,
      desc: "Shards locked in at demon_form activation; set directly by the user here.",
      condition: { type: "all", conditions: [
        { type: "effect_active", effectId: "demon_form" },
        { type: "any", conditions: [
          { type: "ability_selected", abilityId: "shared_accumulator" },
        ]},
      ]},
    },
  },

  // ───────────────────────────────────────────────────────────────────
  // PERKS (3 — full cap)
  // ───────────────────────────────────────────────────────────────────
  perks: [
    // P1 — passive + weapon_type condition + grants weapon + tag-scoped stat.
    {
      id: "axe_mastery",
      type: "perk",
      name: "Axe Mastery",
      desc: "While using axes, +3 weapon damage. Also grants spear proficiency and boosts shout durations.",
      activation: "passive",
      effects: [
        { stat: "weaponDamage", value: 3, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "axe" } },
        { stat: "shoutDurationBonus", value: 0.50, phase: "post_curve" },
      ],
      grants: [
        { type: "weapon", weaponType: "spear" },
      ],
    },

    // P2 — passive + hp_missing scalesWith + removes with tags filter.
    {
      id: "berserker_mode",
      type: "perk",
      name: "Berserker Mode",
      desc: "Gain physical damage bonus per 10% max HP missing. Prevents casting spirit-tagged spells.",
      activation: "passive",
      effects: [
        { stat: "physicalDamageBonus", value: 0, phase: "post_curve",
          scalesWith: { type: "hp_missing", per: 10, valuePerStep: 0.02, maxValue: 0.20 } },
        { stat: "moveSpeedBonus", value: 0, phase: "post_curve",
          scalesWith: { type: "hp_missing", per: 10, valuePerStep: 0.005, maxValue: 0.05 } },
      ],
      removes: [
        { type: "ability", abilityType: "spell", tags: ["spirit"] },
      ],
    },

    // P3 — passive + shared-pool resource accumulator + tag-scoped stat.
    {
      id: "shared_accumulator",
      type: "perk",
      name: "Shared Accumulator",
      desc: "Accumulates shared_pool shards on final blows. Per shard, +1 all physical power and +33% dark damage bonus.",
      activation: "passive",
      tags: ["dark"],
      effects: [
        { stat: "physicalPower",   value: 1,    phase: "pre_curve_flat",
          resource: "shared_pool" },
        { stat: "darkDamageBonus", value: 0.33, phase: "type_damage_bonus",
          resource: "shared_pool" },
      ],
    },
  ],

  // ───────────────────────────────────────────────────────────────────
  // SKILLS (3 — full cap)
  // ───────────────────────────────────────────────────────────────────
  skills: [
    // S1 — toggle form skill (blood_pact analog).
    //   grants[] for abilities + armor
    //   effect_active-gated stat contributions
    //   effect_active-gated DoT damage aura
    //   form_locked_shards user-set counter contributions
    {
      id: "demon_form",
      type: "skill",
      name: "Demon Form",
      desc: "Take demon form. +30 max HP, +50 armor rating, +50 magic resistance while active. Grants demon_bolt (bare-handed), dark_strike, exit_form. Grants plate armor proficiency.",
      activation: "toggle",
      targeting: "self",
      tags: ["demon", "blood"],
      grants: [
        { type: "ability", abilityId: "demon_bolt", costSource: "granted",
          condition: { type: "all", conditions: [
            { type: "effect_active", effectId: "demon_form" },
            { type: "weapon_type", weaponType: "unarmed" },
          ]}},
        { type: "ability", abilityId: "dark_strike", costSource: "granted",
          condition: { type: "effect_active", effectId: "demon_form" } },
        { type: "ability", abilityId: "exit_form", costSource: "granted",
          condition: { type: "effect_active", effectId: "demon_form" } },
        { type: "armor", armorType: "plate",
          condition: { type: "effect_active", effectId: "demon_form" } },
      ],
      effects: [
        { stat: "maxHealth", value: 30, phase: "post_curve",
          condition: { type: "effect_active", effectId: "demon_form" } },
        { stat: "armorRating", value: 50, phase: "pre_curve_flat",
          condition: { type: "effect_active", effectId: "demon_form" } },
        { stat: "magicResistance", value: 50, phase: "pre_curve_flat",
          condition: { type: "effect_active", effectId: "demon_form" } },
        // User-set locked-shard scaling.
        { stat: "physicalPower",   value: 1,    phase: "pre_curve_flat",
          resource: "form_locked_shards",
          condition: { type: "effect_active", effectId: "demon_form" } },
        { stat: "darkDamageBonus", value: 0.33, phase: "type_damage_bonus",
          resource: "form_locked_shards",
          condition: { type: "effect_active", effectId: "demon_form" } },
      ],
      damage: [
        // DoT aura while active.
        { base: 2, scaling: 0.25, damageType: "dark_magical", target: "nearby_enemies",
          isDot: true, tickRate: 1, duration: 8,
          condition: { type: "effect_active", effectId: "demon_form" } },
      ],
    },

    // S2 — channel toggle with grouped multi-atom stacking + percentMaxHealth cost.
    {
      id: "channel_form",
      type: "skill",
      name: "Channel Form",
      desc: "Channel your spirit. Per stack, +5% physical damage bonus and +5% magical damage bonus. Costs 10% max HP on activation.",
      activation: "toggle",
      targeting: "self",
      cost: { type: "percentMaxHealth", value: 0.10 },
      tags: ["channel"],
      effects: [
        { stat: "physicalDamageBonus", value: 0.05, phase: "post_curve",
          resource: "channel_stacks" },
        { stat: "magicalDamageBonus", value: 0.05, phase: "post_curve",
          resource: "channel_stacks" },
      ],
    },

    // S3 — toggle w/ afterEffect wrapper + `not` compound condition.
    {
      id: "adrenaline_surge",
      type: "skill",
      name: "Adrenaline Surge",
      desc: "Gain 15% action speed, 5% move speed bonus for 8s. Penalty: lose 8% action speed, 4% move speed bonus for 2s after. Canceled by second_wind.",
      activation: "toggle",
      targeting: "self",
      effects: [
        { stat: "actionSpeed", value: 0.15, phase: "post_curve", duration: 8 },
        { stat: "moveSpeedBonus", value: 0.05, phase: "post_curve", duration: 8 },
      ],
      afterEffect: {
        duration: { base: 2, type: "debuff" },
        effects: [
          { stat: "actionSpeed", value: -0.08, phase: "post_curve",
            condition: { type: "not", conditions: [
              { type: "effect_active", effectId: "second_wind" },
            ]}},
          { stat: "moveSpeedBonus", value: -0.04, phase: "post_curve",
            condition: { type: "not", conditions: [
              { type: "effect_active", effectId: "second_wind" },
            ]}},
        ],
        desc: "Penalty phase.",
      },
      removes: [
        { type: "ability", abilityType: "spell", tags: ["song"],
          condition: { type: "effect_active", effectId: "adrenaline_surge" } },
      ],
    },
  ],

  // ───────────────────────────────────────────────────────────────────
  // SPELLS (12 — several over memory budget to exercise lock-out path)
  // Memory costs sum to 19; capacity at KNO 30 is ~12, so 5-ish locked out.
  // ───────────────────────────────────────────────────────────────────
  spells: [
    // Sp1 — direct damage, health cost, player_state condition.
    {
      id: "bolt_of_darkness",
      type: "spell",
      name: "Bolt of Darkness",
      desc: "20(1.0) dark magical damage. Bonus damage while hiding.",
      activation: "cast",
      cost: { type: "health", value: 4 },
      memoryCost: 1,
      targeting: "enemy",
      tags: ["dark", "projectile"],
      damage: [
        { base: 20, scaling: 1.0, damageType: "dark_magical", target: "enemy" },
      ],
      effects: [
        // Bonus damage-bonus contribution gated on player_state.
        { stat: "darkDamageBonus", value: 0.15, phase: "type_damage_bonus",
          condition: { type: "player_state", state: "hiding" } },
      ],
    },

    // Sp2 — instant heal, charges cost.
    {
      id: "lesser_heal",
      type: "spell",
      name: "Lesser Heal",
      desc: "Heals 20(0.8). Self cast if no target.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      memoryCost: 1,
      targeting: "ally_or_self",
      heal: { baseHeal: 20, scaling: 0.8, healType: "magical", target: "self" },
    },

    // Sp3 — HoT heal + recoverableHealth effect with duration.
    {
      id: "natures_touch",
      type: "spell",
      name: "Nature's Touch",
      desc: "Target gains 15 recoverable HP and heals 15(0.25) over 12s.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      memoryCost: 2,
      targeting: "ally_or_self",
      tags: ["nature"],
      heal: { baseHeal: 15, scaling: 0.25, healType: "physical", target: "self",
              isHot: true, tickRate: 1, duration: 12 },
      effects: [
        { stat: "recoverableHealth", value: 15, phase: "post_curve", target: "self",
          duration: 12 },
      ],
    },

    // Sp4 — shield with damageFilter.
    {
      id: "protection",
      type: "spell",
      name: "Protection",
      desc: "Shield for 20 physical damage, 8s.",
      activation: "cast",
      cost: { type: "charges", value: 5 },
      memoryCost: 1,
      targeting: "ally_or_self",
      shield: { base: 20, scaling: 0, damageFilter: "physical", target: "self", duration: 8 },
    },

    // Sp5 — frostbite named status via shared tags.
    {
      id: "ice_bolt",
      type: "spell",
      name: "Ice Bolt",
      desc: "30(1.0) ice magical damage + frostbite 1s.",
      activation: "cast",
      cost: { type: "charges", value: 5 },
      memoryCost: 2,
      targeting: "enemy",
      tags: ["ice", "projectile"],
      damage: [
        { base: 30, scaling: 1.0, damageType: "ice_magical", target: "enemy" },
      ],
      effects: [
        { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy",
          tags: ["frostbite"], duration: 1 },
        { stat: "actionSpeed", value: -0.20, phase: "post_curve", target: "enemy",
          tags: ["frostbite"], duration: 1 },
      ],
    },

    // Sp6 — cast_buff with multi-atom named status + maxStacks (poisoned_weapon pattern).
    {
      id: "poisoned_strike",
      type: "spell",
      name: "Poisoned Strike",
      desc: "Next successful attack applies poison: 4(0.5) magical DoT over 4s + heal debuffs. Stacks up to 5.",
      activation: "cast_buff",
      cost: { type: "charges", value: 3 },
      memoryCost: 1,
      targeting: "self",
      tags: ["poison"],
      damage: [
        { base: 4, scaling: 0.5, damageType: "magical", target: "enemy",
          isDot: true, tickRate: 1, duration: 4, maxStacks: 5, tags: ["poison"] },
      ],
      effects: [
        { stat: "incomingPhysicalHealing", value: -0.10, phase: "post_curve", target: "enemy",
          duration: 4, maxStacks: 5, tags: ["poison"] },
        { stat: "incomingMagicalHealing", value: -0.10, phase: "post_curve", target: "enemy",
          duration: 4, maxStacks: 5, tags: ["poison"] },
      ],
    },

    // Sp7 — fireball: multi-damage (direct/splash/DoT) + bare-CC knockback.
    {
      id: "fireball",
      type: "spell",
      name: "Fireball",
      desc: "20(1.0) direct + 10(1.0) splash fire magical damage. Knocks back; burns 3(0.5)/tick for 2s.",
      activation: "cast",
      cost: { type: "charges", value: 4 },
      memoryCost: 2,
      targeting: "enemy",
      tags: ["fire", "projectile"],
      damage: [
        { base: 20, scaling: 1.0, damageType: "fire_magical", target: "enemy",           desc: "direct" },
        { base: 10, scaling: 1.0, damageType: "fire_magical", target: "nearby_enemies",  desc: "splash" },
        { base: 3,  scaling: 0.5, damageType: "fire_magical", target: "enemy",
          isDot: true, tickRate: 1, duration: 2, tags: ["burn"] },
      ],
      effects: [
        // Bare CC atom — no stat/value/phase.
        { tags: ["knockback"], target: "nearby_enemies" },
      ],
    },

    // Sp8 — tier-conditioned stat contributions.
    {
      id: "ballad_of_courage",
      type: "spell",
      name: "Ballad of Courage",
      desc: "5/7/10 physical power for 60/120/240s.",
      activation: "cast_buff",
      cost: { type: "charges", value: 3 },
      memoryCost: 1,
      targeting: "self",
      tags: ["song", "lyre"],
      effects: [
        { stat: "physicalPower", value: 5,  phase: "post_curve", duration: 60,
          condition: { type: "tier", tier: "poor" } },
        { stat: "physicalPower", value: 7,  phase: "post_curve", duration: 120,
          condition: { type: "tier", tier: "good" } },
        { stat: "physicalPower", value: 10, phase: "post_curve", duration: 240,
          condition: { type: "tier", tier: "perfect" } },
      ],
    },

    // Sp9 — summon with stat buff + damage, cooldown cost.
    {
      id: "summon_earth_elemental",
      type: "spell",
      name: "Summon Earth Elemental",
      desc: "Summon an Earth Elemental for 18s. +50 armor rating. Elemental hurls rocks for 40(1.0) physical.",
      activation: "cast",
      cost: { type: "cooldown", value: 24 },
      memoryCost: 3,
      targeting: "self",
      tags: ["earth", "summon"],
      duration: { base: 18, type: "other" },
      effects: [
        { stat: "armorRating", value: 50, phase: "pre_curve_flat" },
      ],
      damage: [
        { base: 40, scaling: 1.0, damageType: "physical", target: "enemy" },
      ],
    },

    // Sp10 — summon with bare tagged atom (display-only capability).
    {
      id: "summon_hydra",
      type: "spell",
      name: "Summon Hydra",
      desc: "Hydra spits 10(1.0) fire magical damage for 10s. Detects hidden.",
      activation: "cast",
      cost: { type: "health", value: 12 },
      memoryCost: 2,
      targeting: "self",
      tags: ["fire", "summon"],
      duration: { base: 10, type: "other" },
      effects: [
        { tags: ["detects_hidden"], desc: "Hydra detects hidden targets." },
      ],
      damage: [
        { base: 10, scaling: 1.0, damageType: "fire_magical", target: "enemy" },
      ],
    },

    // Sp11 — cast_buff with GRANT costSource: "granter" pattern (orb_of_nature).
    {
      id: "orb_of_nature",
      type: "spell",
      name: "Orb of Nature",
      desc: "Fire an orb: 15(1.0) spirit magical on enemies, grants Nature's Touch to allies.",
      activation: "cast_buff",
      cost: { type: "charges", value: 4 },
      memoryCost: 2,
      targeting: "enemy_or_self",
      tags: ["spirit", "nature", "projectile"],
      damage: [
        { base: 15, scaling: 1.0, damageType: "spirit_magical", target: "enemy" },
      ],
      grants: [
        { type: "ability", abilityId: "natures_touch", costSource: "granter" },
      ],
    },

    // Sp12 — cast_buff with maxStacks single-atom + cost: none.
    {
      id: "combo_step",
      type: "spell",
      name: "Combo Step",
      desc: "Consecutive melee hits grant +10% physical damage bonus per stack, up to 2 stacks.",
      activation: "cast_buff",
      cost: { type: "none", value: 0 },
      memoryCost: 1,
      targeting: "self",
      effects: [
        { stat: "physicalDamageBonus", value: 0.10, phase: "post_curve", maxStacks: 2 },
      ],
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────
// GEAR STACK — full legendary-ish loadout
// ─────────────────────────────────────────────────────────────────────

export const MAX_LOADOUT_GEAR = {
  // Modeled as flat bonuses — a real gear aggregator would produce these
  // from individual slot items. The fixture only cares that meaningful
  // gear-magnitude numbers reach Stage 5.
  weapon: {
    weaponType: "axe",
    baseWeaponDmg: 40,
    gearWeaponDmg: 8,
  },
  bonuses: {
    // attributes (attribute totals are ctx.attributes, not bonuses here)
    physicalPower: 15,
    magicalPower: 18,
    physicalDamageBonus: 0.10,
    magicalDamageBonus: 0.12,
    armorPenetration: 0.05,
    magicPenetration: 0.05,
    headshotDamageBonus: 0.05,

    armorRating: 80,
    additionalArmorRating: 12,
    magicResistance: 25,
    physicalDamageReductionBonus: 0.03,
    magicalDamageReductionBonus: 0.02,
    projectileDamageReduction: 0.04,
    headshotDamageReduction: 0.05,

    maxHealthBonus: 0.10,
    maxHealth: 20,
    moveSpeedBonus: 0.03,
    actionSpeed: 0.05,
    spellCastingSpeed: 0.08,
    cooldownReductionBonus: 0.05,
    buffDurationBonus: 0.10,
    debuffDurationBonus: 0.10,
    memoryCapacityBonus: 0.05,
    additionalMemoryCapacity: 2,
    physicalHealing: 3,
    magicalHealing: 4,
    luck: 5,
  },
};

// ─────────────────────────────────────────────────────────────────────
// BUILD — what the user has "picked" plus the ctx-level toggles
// ─────────────────────────────────────────────────────────────────────

export const MAX_LOADOUT_BUILD = {
  klass: MAX_LOADOUT_CLASS,
  gear: MAX_LOADOUT_GEAR,

  // Attribute totals (base + gear). Real ctx.buildContext does this
  // computation; fixture just pre-sums.
  attributes: {
    str: 15 + 3,   // gear adds a few
    vig: 20 + 5,
    agi: 10 + 4,
    dex: 12 + 4,
    wil: 25 + 6,
    kno: 30 + 6,
    res: 15 + 4,
  },

  selectedPerks:  ["axe_mastery", "berserker_mode", "shared_accumulator"],
  selectedSkills: ["demon_form", "channel_form", "adrenaline_surge"],
  // 12 spells selected; memory capacity lock-out is a downstream ctx concern.
  selectedSpells: [
    "bolt_of_darkness", "lesser_heal", "natures_touch", "protection",
    "ice_bolt", "poisoned_strike", "fireball", "ballad_of_courage",
    "summon_earth_elemental", "summon_hydra", "orb_of_nature", "combo_step",
  ],

  activeBuffs: ["demon_form", "channel_form", "poisoned_strike", "combo_step", "ballad_of_courage"],

  classResourceCounters: {
    shared_pool: 3,
    channel_stacks: 7,
    form_locked_shards: 2,
  },

  stackCounts: {
    combo_step: 2,
    poisoned_strike: 4,
  },

  selectedTiers: {
    ballad_of_courage: "perfect",
  },

  playerStates: ["hiding"],
  weaponType: "axe",

  // Target profile for Stage 6 projections (plate-wearer).
  target: {
    pdr: 0.50,
    mdr: 0.20,
    headshotDR: 0.10,
    pen: 0,       // attacker-side pen comes from derivedStats
  },

  // HP fraction for hp_missing scalesWith (snapshot-model: user-set).
  hpFraction: 0.60,  // 40% missing → berserker_mode tops out
};
