// Class-shape examples.
//
// Concrete examples drawn from actual class data, expressed in the
// consolidated shape defined in class-shape.js. Each example demonstrates
// one pattern (simple stat contribution, stacking, after-effect, etc.).
//
// These are reference examples for authors — NOT the actual class data.
// The real class data lives in barbarian.js, warlock.js, etc. and is still
// being migrated to this shape.

// ─────────────────────────────────────────────────────────────────────
// ATOMS — basic shapes
// ─────────────────────────────────────────────────────────────────────

// Simple passive stat contribution — conditional on weapon type.
export const axeSpecialization = {
  id: "axe_specialization",
  type: "perk",
  name: "Axe Specialization",
  desc: "While using axes, gain 3 weapon damage.",
  activation: "passive",
  effects: [
    { stat: "weaponDamage", value: 3, phase: "post_curve",
      condition: { type: "weapon_type", weaponType: "axe" } },
  ],
};

// HP-scaling stat contribution — value scales with missing HP.
export const berserker = {
  id: "berserker",
  type: "perk",
  name: "Berserker",
  desc: "Gain 2% physical damage bonus and 0.5% move speed bonus for every 10% of your maximum health missing, up to 20% and 5% respectively.",
  activation: "passive",
  effects: [
    { stat: "physicalDamageBonus", value: 0, phase: "post_curve",
      scalesWith: { type: "hp_missing", per: 10, valuePerStep: 0.02, maxValue: 0.20 } },
    { stat: "moveSpeedBonus", value: 0, phase: "post_curve",
      scalesWith: { type: "hp_missing", per: 10, valuePerStep: 0.005, maxValue: 0.05 } },
  ],
};

// Direct damage projection — instant cast, no persistent state.
export const boltOfDarkness = {
  id: "bolt_of_darkness",
  type: "spell",
  name: "Bolt of Darkness",
  desc: "Fires a bolt that deals 20(1.0) dark magical damage to the target.",
  activation: "cast",
  cost: { type: "health", value: 4 },
  targeting: "enemy",
  tags: ["dark", "projectile"],
  damage: [
    { base: 20, scaling: 1.0, damageType: "dark_magical", target: "enemy" },
  ],
};

// Direct heal — one-shot on ally or self.
export const lesserHeal = {
  id: "lesser_heal",
  type: "spell",
  name: "Lesser Heal",
  desc: "Heals the target for 20(0.8) health. Self cast if no target is found.",
  activation: "cast",
  cost: { type: "charges", value: 4 },
  targeting: "ally_or_self",
  heal: { baseHeal: 20, scaling: 0.8, healType: "magical", target: "self" },
};

// Heal-over-time + stat contribution.
export const naturesTouch = {
  id: "natures_touch",
  type: "spell",
  name: "Nature's Touch",
  desc: "The target gains 15 additional recoverable health. Also heals 15(0.25) health over 12 seconds. Casts on yourself if no target is found.",
  activation: "cast",
  cost: { type: "charges", value: 4 },
  targeting: "ally_or_self",
  tags: ["nature"],
  heal: { baseHeal: 15, scaling: 0.25, healType: "physical", target: "self",
          isHot: true, tickRate: 1, duration: 12 },
  effects: [
    { stat: "recoverableHealth", value: 15, phase: "post_curve", target: "self",
      duration: 12 },
  ],
};

// Shield — damage-absorb layer, filtered by damage type.
export const protection = {
  id: "protection",
  type: "spell",
  name: "Protection",
  desc: "Grants the target a shield that blocks 20 physical damage for 8 seconds.",
  activation: "cast",
  cost: { type: "charges", value: 5 },
  targeting: "ally_or_self",
  shield: { base: 20, scaling: 0, damageFilter: "physical", target: "self", duration: 8 },
};


// ─────────────────────────────────────────────────────────────────────
// CC AND STATUS — named atoms with tags / duration
// ─────────────────────────────────────────────────────────────────────

// Bare CC atom (no stat payload) + stat debuffs on target, all grouped
// under one visible ability. Atoms are display-only markers except where
// they carry `stat`/`value`/`phase`.
export const savageRoar = {
  id: "savage_roar",
  type: "skill",
  name: "Savage Roar",
  desc: "Frightens all enemies within a 7.5m range radius for 6 seconds, reducing their physical damage bonus by 30% and reducing their move speed bonus by 2.5%.",
  activation: "cast",
  targeting: "enemy",
  tags: ["shout"],
  effects: [
    // Bare CC — just tags + duration + target. No stat payload.
    { tags: ["fear"], target: "nearby_enemies", duration: 6 },
    // Stat debuffs on target, same duration.
    { stat: "physicalDamageBonus", value: -0.30, phase: "post_curve",
      target: "nearby_enemies", duration: 6 },
    { stat: "moveSpeedBonus", value: -0.025, phase: "post_curve",
      target: "nearby_enemies", duration: 6 },
  ],
};

// CC with stat payload — "frostbite" is a named group of stat atoms on target.
// The atoms share `tags: ["frostbite"]` so the UI groups them under that label.
export const iceBolt = {
  id: "ice_bolt",
  type: "spell",
  name: "Ice Bolt",
  desc: "Deal 30(1.0) ice magical damage to the target, inflicting frostbite for 1 second. Frostbite: target loses 20% move speed bonus and 20% action speed.",
  activation: "cast",
  cost: { type: "charges", value: 5 },
  targeting: "enemy",
  damage: [
    { base: 30, scaling: 1.0, damageType: "ice_magical", target: "enemy" },
  ],
  effects: [
    { stat: "moveSpeedBonus", value: -0.20, phase: "post_curve", target: "enemy",
      tags: ["frostbite"], duration: 1 },
    { stat: "actionSpeed", value: -0.20, phase: "post_curve", target: "enemy",
      tags: ["frostbite"], duration: 1 },
  ],
};

// Multi-atom named status with stacking — "poison" is a group of one damage
// atom + two stat atoms, all sharing `tags: ["poison"]` and `maxStacks: 5`.
// Each stack contributes independently; with 5 stacks, 5× DoT and 5× healing debuff.
export const poisonedWeapon = {
  id: "poisoned_weapon",
  type: "perk",
  name: "Poisoned Weapon",
  desc: "A successful attack applies poison that deals 4(0.5) magical damage and reduces their incoming physical healing by 10% and incoming magical healing by 10% over 4 seconds. The poison can stack up to 5 times.",
  activation: "passive",
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
};

// Combined: direct damage + splash damage + CC + named status on target.
// Each damage entry has its own scope (direct/splash/DoT); the burn atom
// groups under `tags: ["burn"]` with its own DoT duration.
export const fireball = {
  id: "fireball",
  type: "spell",
  name: "Fireball",
  desc: "Shoot a burning fireball, dealing 20(1.0) direct fire magical damage to a target and 10(1.0) splash fire magical damage, knocking back nearby targets and inflicting burn over 2 seconds. Burn: target takes 3(0.5) fire magical damage per tick.",
  activation: "cast",
  cost: { type: "charges", value: 4 },
  targeting: "enemy",
  damage: [
    { base: 20, scaling: 1.0, damageType: "fire_magical", target: "enemy",           desc: "direct" },
    { base: 10, scaling: 1.0, damageType: "fire_magical", target: "nearby_enemies",  desc: "splash" },
    { base: 3,  scaling: 0.5, damageType: "fire_magical", target: "enemy",
      isDot: true, tickRate: 1, duration: 2, tags: ["burn"] },
  ],
  effects: [
    // Instant knockback on nearby enemies — bare CC atom.
    { tags: ["knockback"], target: "nearby_enemies" },
  ],
};


// ─────────────────────────────────────────────────────────────────────
// STACKING — four patterns
// ─────────────────────────────────────────────────────────────────────
//
// Shared / grouped stacking references a classResources entry declared at
// the class root. Below is a fake class-root fragment showing the resources
// used by the stacking examples in this file.
//
// In warlock.js (real data), the class root would include:
//
// classResources: {
//   darkness_shards: {
//     maxStacks: 3,
//     desc: "Shared pool. Accumulated by Soul Collector and Spell Predation; consumed on dealing dark magical damage.",
//     // condition: { ... }   ← pending `ability_selected` decision
//   },
//   dark_offering_stacks: {
//     maxStacks: 10,
//     desc: "Stacks gained per second while channeling Dark Offering.",
//     condition: { type: "effect_active", effectId: "dark_offering" },
//   },
//   blood_pact_locked_shards: {
//     maxStacks: 3,
//     desc: "Shards locked in at Blood Pact activation. Independent of the live darkness_shards pool.",
//     condition: { type: "form_active", form: "blood_pact" },
//     // Full condition will include `AND has-a-shard-generator-selected`
//     // once the `ability_selected` decision lands.
//   },
// }

// Single-atom local stacking — no classResources entry needed.
// Stack count lives in ctx.stackCounts[abilityId]. Contribution = value × count.
export const comboAttack = {
  id: "combo_attack",
  type: "perk",
  name: "Combo Attack",
  desc: "When you successfully land consecutive melee attacks within 2 seconds, gain 10% physical damage bonus per stack, up to 2 stacks.",
  activation: "passive",
  effects: [
    { stat: "physicalDamageBonus", value: 0.10, phase: "post_curve", maxStacks: 2 },
  ],
};

// Cross-ability shared pool — atoms reference `darkness_shards`.
// Contribution = atom.value × ctx.classResources.darkness_shards count.
export const soulCollector = {
  id: "soul_collector",
  type: "perk",
  name: "Soul Collector",
  desc: "When you deal the final blow to an enemy, one darkness shard is collected. Gain 1 all attributes and 33% dark magical damage bonus per shard, up to 3 shards. Consumed when you deal dark magic damage.",
  activation: "passive",
  tags: ["dark"],
  effects: [
    { stat: "all_attributes",  value: 1,    phase: "pre_curve_flat",
      resource: "darkness_shards" },
    { stat: "typeDamageBonus", value: 0.33, phase: "type_damage_bonus",
      damageType: "dark_magical", resource: "darkness_shards" },
  ],
};

// Multi-atom grouped stacks — two atoms share `dark_offering_stacks`.
// Both rise together as the user sets the stack count.
export const darkOffering = {
  id: "dark_offering",
  type: "skill",
  name: "Dark Offering",
  desc: "Channel your mind, sacrificing 10% of your max health per second to gain 5% magical damage bonus and 5% physical damage bonus per stack. This bonus lasts for 60 seconds.",
  activation: "toggle",
  targeting: "self",
  tags: ["channel"],
  effects: [
    { stat: "physicalDamageBonus", value: 0.05, phase: "post_curve",
      resource: "dark_offering_stacks" },
    { stat: "magicalDamageBonus",  value: 0.05, phase: "post_curve",
      resource: "dark_offering_stacks" },
  ],
  passives: { selfDamagePerSecond: 0.10 },
};

// Toggle skill that reshapes the Warlock's loadout while active:
// - grants[] makes Bolt of Darkness, Exploitation Strike, Exit Demon Form
//   available while Blood Pact is active (with conditions per grant atom)
// - classResources.blood_pact_locked_shards is a user-set counter
//   representing the shard bonus locked in for this form session
export const bloodPact = {
  id: "blood_pact",
  type: "skill",
  name: "Blood Pact",
  desc: "Take the form of your contracted demon. +30 max HP, +50 armor rating, +50 magic resistance. On activation, consumes existing Darkness Shards, locking in +1 all attributes and +33% dark magical damage bonus per shard for the full duration. Abyssal Flame: 1% self-damage per second, 2(0.25) magical per second to nearby enemies. While active, Bolt of Darkness is castable bare-handed; Exploitation Strike and Exit Demon Form become available.",
  activation: "toggle",
  targeting: "self",
  tags: ["demon", "blood"],
  grants: [
    { type: "ability", abilityId: "bolt_of_darkness", costSource: "granted",
      condition: { type: "all", conditions: [
        { type: "effect_active", effectId: "blood_pact" },
        { type: "weapon_type", weaponType: "unarmed" },
      ]}},
    { type: "ability", abilityId: "exploitation_strike", costSource: "granted",
      condition: { type: "effect_active", effectId: "blood_pact" } },
    { type: "ability", abilityId: "exit_demon_form", costSource: "granted",
      condition: { type: "effect_active", effectId: "blood_pact" } },
  ],
  effects: [
    // Toggle-active stat contributions
    { stat: "maxHealth",       value: 30, phase: "post_curve",
      condition: { type: "effect_active", effectId: "blood_pact" } },
    { stat: "armorRating",     value: 50, phase: "pre_curve_flat",
      condition: { type: "effect_active", effectId: "blood_pact" } },
    { stat: "magicResistance", value: 50, phase: "pre_curve_flat",
      condition: { type: "effect_active", effectId: "blood_pact" } },
    // Locked-shard scaling contributions
    { stat: "all_attributes",  value: 1,    phase: "pre_curve_flat",
      resource: "blood_pact_locked_shards",
      condition: { type: "effect_active", effectId: "blood_pact" } },
    { stat: "typeDamageBonus", value: 0.33, phase: "type_damage_bonus",
      damageType: "dark_magical", resource: "blood_pact_locked_shards",
      condition: { type: "effect_active", effectId: "blood_pact" } },
  ],
  damage: [
    // Abyssal Flame — toggle-active DoT aura.
    { base: 2, scaling: 0.25, damageType: "magical", target: "nearby_enemies",
      isDot: true, tickRate: 1,
      condition: { type: "effect_active", effectId: "blood_pact" } },
    // Abyssal Flame self-damage — 1% of max HP per second.
    // OPEN: damage-atom grammar doesn't yet express %maxHP formulas.
  ],
};

// Cast spell granting Nature's Touch via grants[]. costSource: "granter"
// means Orb's per-cast cost governs delivery count; Nature's Touch's own
// cost is not consumed. If the Druid also selects Nature's Touch
// independently, those add on top as a separate access path with its own
// cost. In-game causal prose ("delivered to allies on hit") lives in `desc`.
export const orbOfNature = {
  id: "orb_of_nature",
  type: "spell",
  name: "Orb of Nature",
  desc: "Fire an orb that deals 15(1.0) spirit magical damage on contact with an enemy, or grants Nature's Touch to allies hit by the orb.",
  activation: "cast",
  cost: { type: "charges", value: 4 },
  targeting: "enemy_or_self",
  tags: ["spirit", "nature", "projectile"],
  damage: [
    { base: 15, scaling: 1.0, damageType: "spirit_magical", target: "enemy" },
  ],
  grants: [
    { type: "ability", abilityId: "natures_touch", costSource: "granter" },
  ],
};


// ─────────────────────────────────────────────────────────────────────
// SUMMON — dissolved into standard ability fields
// ─────────────────────────────────────────────────────────────────────

// Summon with caster-side stat buff. summon.casterEffects → effects[],
// summon.damage → damage[], summon.duration → duration, entity name → desc.
export const summonEarthElemental = {
  id: "summon_earth_elemental",
  type: "spell",
  name: "Summon Earth Elemental",
  desc: "Summon an Earth Elemental for 18 seconds. Grants +50 armor rating. Hurls rocks at nearby enemies dealing 40(1.0) physical damage.",
  activation: "cast",
  cost: { type: "cooldown", value: 24 },
  targeting: "self",
  tags: ["earth", "summon"],
  duration: { base: 18, type: "other" },
  effects: [
    { stat: "armorRating", value: 50, phase: "pre_curve_flat" },
  ],
  damage: [
    { base: 40, scaling: 1.0, damageType: "physical", target: "enemy" },
  ],
};

// Summon with a boolean capability as a bare tagged atom.
// detectsHidden follows the same pattern as bare CC markers (no stat/value/phase).
export const summonHydra = {
  id: "summon_hydra",
  type: "spell",
  name: "Summon Hydra",
  desc: "Summons a Hydra that spits fireballs dealing 10(1.0) fire magical damage to enemy target for 10 seconds. The hydra can also detect hidden targets.",
  activation: "cast",
  cost: { type: "health", value: 12 },
  targeting: "self",
  tags: ["fire", "summon"],
  duration: { base: 10, type: "other" },
  effects: [
    { tags: ["detects_hidden"], desc: "Hydra detects hidden targets." },
  ],
  damage: [
    { base: 10, scaling: 1.0, damageType: "fire_magical", target: "enemy" },
  ],
};


// ─────────────────────────────────────────────────────────────────────
// PERFORMANCE TIERS — via `tier` condition
// ─────────────────────────────────────────────────────────────────────

// Bard performance tier variants expressed as tier-conditioned atoms.
// User selects the performance quality in the UI (ctx.selectedTiers[abilityId]);
// only atoms whose `tier` matches light up.
export const balladOfCourage = {
  id: "ballad_of_courage",
  type: "spell",
  name: "Ballad of Courage",
  desc: "Grants the performer 5/7/10 physical power for 60/120/240 seconds. Song does not stack on itself.",
  activation: "cast",
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
};


// ─────────────────────────────────────────────────────────────────────
// COST — percentMaxHealth type
// ─────────────────────────────────────────────────────────────────────

// Skill with a percentage-of-max-HP activation cost. Skills declare their
// own cost fully (no class-level spellCost inheritance).
export const bloodExchange = {
  id: "blood_exchange",
  type: "skill",
  name: "Blood Exchange",
  desc: "Lose 10% of maximum health, but gain 15% action speed for 8 seconds and heal for 10% of damage dealt while active.",
  activation: "toggle",
  targeting: "self",
  cost: { type: "percentMaxHealth", value: 0.10 },
  duration: { base: 8, type: "buff" },
  effects: [
    { stat: "actionSpeed", value: 0.15, phase: "post_curve" },
  ],
};


// ─────────────────────────────────────────────────────────────────────
// AFTER-EFFECT — explicit wrapper for trailing penalty phase
// ─────────────────────────────────────────────────────────────────────

// Main-phase atoms in `effects[]`. Penalty phase in `afterEffect.effects[]`.
// Cancellation is expressed per-atom with the `not` compound condition.
export const adrenalineRush = {
  id: "adrenaline_rush",
  type: "skill",
  name: "Adrenaline Rush",
  desc: "Gain 15% action speed, 5% move speed bonus for 8 seconds. After the duration ends, lose 8% action speed and 4% move speed bonus for 2 seconds. Penalty canceled by Adrenaline Spike or Second Wind.",
  activation: "toggle",
  targeting: "self",
  effects: [
    { stat: "actionSpeed",    value: 0.15, phase: "post_curve", duration: 8 },
    { stat: "moveSpeedBonus", value: 0.05, phase: "post_curve", duration: 8 },
  ],
  afterEffect: {
    duration: { base: 2, type: "debuff" },
    effects: [
      { stat: "actionSpeed", value: -0.08, phase: "post_curve",
        condition: { type: "not", conditions: [
          { type: "effect_active", effectId: "adrenaline_spike" },
          { type: "effect_active", effectId: "second_wind" },
        ]} },
      { stat: "moveSpeedBonus", value: -0.04, phase: "post_curve",
        condition: { type: "not", conditions: [
          { type: "effect_active", effectId: "adrenaline_spike" },
          { type: "effect_active", effectId: "second_wind" },
        ]} },
    ],
    desc: "Penalty phase: -8% action speed, -4% move speed bonus for 2s.",
  },
};


// ─────────────────────────────────────────────────────────────────────
// ABILITY-MODIFIER AS STAT — tag-scoped ability properties via STAT_META
// ─────────────────────────────────────────────────────────────────────

// Cross-ability property modifications (duration/cooldown/castTime/cost/etc.
// of other abilities) are expressed as contributions to tag-scoped stats in
// STAT_META. Here Treacherous Lungs contributes to `shoutDurationBonus` and
// `shoutCooldownBonus`; any ability tagged `shout` reads those stats when
// computing its displayed duration/cooldown.
export const treacherousLungs = {
  id: "treacherous_lungs",
  type: "perk",
  name: "Treacherous Lungs",
  desc: "Increases the duration of all shouting abilities by 50% and reduces their cooldown by 10%.",
  activation: "passive",
  effects: [
    { stat: "shoutDurationBonus", value: 0.50,  phase: "post_curve" },
    { stat: "shoutCooldownBonus", value: -0.10, phase: "post_curve" },
  ],
};
