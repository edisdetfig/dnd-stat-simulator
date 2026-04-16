// Class shape — reference object.
//
// Maps every field authored across the 10 class data files, organized by
// where it appears (class root, ability, atoms, sub-shapes).
//
// Folds into engine_architecture.md §2 once stable.

export const CLASS_SHAPE = {
  // ─────────────────────────────────────────────────────────────────────
  // CLASS ROOT
  // ─────────────────────────────────────────────────────────────────────
  id: "string",
  name: "string",
  desc: "string",
  baseAttributes: { str:0, vig:0, agi:0, dex:0, wil:0, kno:0, res:0 },
  baseHealth: 0,
  maxPerks: 0,
  maxSkills: 0,

  armorProficiency: ["cloth | leather | plate"],               // see constants.js::ARMOR_TYPES. Base armor types the class can equip; modified by grants[]/removes[] on perks

  // Class-level resource pool declarations. Atoms reference an entry by name
  // via the atom's `resource` field. Live stack count maintained in
  // ctx.classResources[resourceId] at runtime. Contribution math per atom:
  //   atom.value × currentStackCount
  //
  // Required for:
  //   - cross-ability shared pools (atoms from multiple abilities share one count)
  //   - multi-atom grouped stacks (atoms within one ability share one count)
  // NOT required for single-atom local stacks — use per-atom `maxStacks` instead.
  classResources: {
    // [resourceId]: {
    //   maxStacks: 0,
    //   desc: "string",
    //   condition: { /* CONDITION */ },   // optional — absent = persistent.
    //                                     //   When present, UI shows the counter only when condition is true.
    // },

    // Example — cross-ability shared pool:
    // darkness_shards: {
    //   maxStacks: 3,
    //   desc: "Shared pool. Accumulated by Soul Collector and Spell Predation; consumed on dealing dark magical damage.",
    // },

    // Example — multi-atom grouped stacks, scoped to one ability:
    // dark_offering_stacks: {
    //   maxStacks: 10,
    //   desc: "Stacks gained per second while channeling Dark Offering.",
    //   condition: { type: "effect_active", effectId: "dark_offering" },
    // },

    // Example — user-set counter, scoped to Blood Pact:
    // blood_pact_locked_shards: {
    //   maxStacks: 3,
    //   desc: "Shards locked in at Blood Pact activation. In-game, populated by snapshotting darkness_shards at form entry; independent thereafter. Counter set directly by the user here.",
    //   condition: { type: "effect_active", effectId: "blood_pact" },
    // },
  },

  perks:           [/* ABILITY */],
  skills:          [/* ABILITY */],
  spells:          [/* ABILITY — type: spell | transformation | music */],
  mergedSpells:    [/* ABILITY — Sorcerer only; uses ability-level `condition` with `ability_selected` for prerequisites; auto-derived (never in selectedSpells); no memoryCost */],
};

// ─────────────────────────────────────────────────────────────────────
// ABILITY — every entry in perks/skills/spells/mergedSpells
// ─────────────────────────────────────────────────────────────────────
const ABILITY = {
  // Identity
  id: "string",
  name: "string",
  type: "perk | skill | spell | transformation | music",  // see constants.js::ABILITY_TYPES
  desc: "string",                    // human-readable description; absorbs all flavor with no engine role
  activation: "passive | cast | cast_buff | toggle",       // see constants.js::ACTIVATIONS
  // passive   → selected = active (perks, passive skills)
  // cast      → instant projection, no caster-side state (Dark Bolt, Fireball, Slow)
  // cast_buff → cast that produces caster-side buff (Haste, Ignite, Bloodstained Blade)
  // toggle    → user-flipped on/off, produces caster-side state (Blood Pact, Druid forms)

  // Functional anchor — present only when referenced by selectors (condition
  // dispatchers, targeting filters, etc.). Flavor labels belong in `desc`.
  tags: ["shout | arcane | curse | potion | spirit | campfire | ..."],

  // Atoms — the fundamental units the ability produces. Each list below
  // holds atoms of one kind. See the *_ATOM shapes below.
  effects: [/* STAT_EFFECT_ATOM */],      // stat contributions
  damage:  [/* DAMAGE_ATOM */],           // damage projections
  heal:    { /* HEAL_ATOM */ },           // heal projection (singular — most abilities author one)
  shield:  { /* SHIELD_ATOM */ },         // damage-absorb layer

  // Trailing penalty phase. Atoms inside gate on their own `condition`;
  // the wrapper structurally separates them from the main-phase atoms above.
  afterEffect: { /* AFTER_EFFECT */ },

  // Cost to use. Fully declared per ability — no class-level default.
  cost:       { /* COST */ },
  memoryCost: 0,                     // how many memory slots this ability occupies when equipped (CSV "Tier")

  // Display projections — computed against character modifiers + stats.
  // Not engine-gating.
  duration: { base: 0, type: "buff | debuff | other", tags: ["string"] },
  cooldown: 0,
  castTime: 0,

  // SUMMON — dissolved. Summon spells are regular spells; summon.damage → damage[],
  // summon.casterEffects → effects[], summon.duration → duration, entity name → desc.
  // Boolean capabilities (e.g. detects_hidden) become bare tagged atoms in effects[].

  // PASSIVES — dissolved. Former flag bag contents are split across existing
  // atoms and fields: stat-like numerics → effects[] (STAT_EFFECT_ATOM);
  // self-damage DoTs → damage[] (DAMAGE_ATOM); engine-recognized booleans →
  // bare tagged atoms in effects[]; pure flavor → desc; structural misfiles
  // (castTime, radius, etc.) → ability-level fields or tags. See
  // class-shape-progress.md item 5 for the full audit.

  // Availability changes — sibling containers for granting and removing
  // access to abilities, weapons, and armor. Each atom carries an explicit
  // `type` discriminator + id field + optional `condition` (ctx-gating).
  // `costSource` on ability grants controls cost display: "granted" (default,
  // granted ability pays its own cost) or "granter" (granter's cost governs).
  grants:  [/* GRANT_ATOM */],
  removes: [/* REMOVE_ATOM */],

  // Ability-level gating — gates the entire ability (e.g. requires axe)
  condition: { /* CONDITION */ },

  // Display-only targeting metadata
  targeting: "self | enemy | ally | ally_or_self | enemy_or_self",

  // Annotation; kept as-is
  _unverified: {},
};

// ─────────────────────────────────────────────────────────────────────
// ATOMS — the fundamental units that produce snapshot output.
// Each atom is self-contained: carries its own condition, target, duration,
// and optional grouping metadata.
// ─────────────────────────────────────────────────────────────────────

// ATOM — statEffect
// Contributes to a stat via the aggregator pipeline. When `stat` / `value` /
// `phase` are all absent, the atom is a display-only marker (bare CC —
// knockback, fear, bind, lift, trap, root, immobilize, and silence variants
// with no stat impact).
const STAT_EFFECT_ATOM = {
  stat:      "string",     // optional — STAT_META key, or RECIPE_IDS entry (cap_override phase only)
  value:     0,            // optional — numeric contribution
  phase:     "string",     // optional — see constants.js::EFFECT_PHASE_VALUES
  target:    "string",     // see constants.js::EFFECT_TARGETS — default "self"
  duration:  0,            // optional — lifetime in seconds; absent = lives while parent ability is active
  condition: {},           // optional — see constants.js::CONDITION_TYPES
  scalesWith:  {},          // optional — atom value derived from ctx input. Polymorphic via `type` (see constants.js::SCALES_WITH_TYPES):
                            //   { type: "hp_missing", per: 10, valuePerStep: 0.02, maxValue: 0.20 } (Barb Berserker)
                            //   { type: "attribute", curve: "shapeshiftPrimitive", attribute: "str" } (shapeshift)
  abilityType: "string",    // optional — see constants.js::ABILITY_TYPES. Discriminator linking stat to an ability type (e.g. memorySlots + abilityType: "spell")
  tags:        ["string"],  // optional — see constants.js::ATOM_TAGS. Named grouping labels; UI groups atoms with matching tags.

  // Stacking — use ONE of these (not both). Contribution = atom.value × currentStackCount.
  //   maxStacks  — single-atom local stacking; count lives in ctx.stackCounts[abilityId]
  //   resource   — shared/grouped stacking; count lives in ctx.classResources[resourceId]
  maxStacks: 0,            // optional — Fighter Combo Attack, Sorcerer Mana Flow, Druid Spirit Magic Mastery
  resource:  "string",     // optional — Warlock Soul Collector (shared), Dark Offering (grouped), Blood Pact (user-set counter)

  // ENGINE-POPULATED — not authored in class data.
  // Filled in at Stage 1 by collectors so the engine can trace which ability
  // produced each effect. Used for debug display and `effect_active` condition.
  source: { kind: "string", abilityId: "string", className: "string" },
};

// ATOM — damage
// A damage projection. Runs through applyDamage using current derived stats.
const DAMAGE_ATOM = {
  base:              0,
  scaling:           0,
  damageType:        "string",   // see constants.js::DAMAGE_TYPES
  target:            "string",   // see constants.js::EFFECT_TARGETS
  isDot:             false,      // optional — damage-over-time
  tickRate:          0,          // optional — seconds per tick (DoT only)
  duration:          0,          // optional — total DoT lifetime in seconds
  trueDamage:        false,      // optional — bypasses DR
  weaponDamageScale: 0,          // optional — scales against weapon damage (Barb Hurl Weapon, Whirlwind)
  percentMaxHealth:  0,          // optional — % of max HP as damage
  scalesWith:        {},         // optional — see constants.js::SCALES_WITH_TYPES. Same polymorphism as STAT_EFFECT_ATOM.scalesWith.
  count:             1,          // optional — number of hits this atom produces per cast (missiles, chains, etc.)
  desc:              "string",   // optional — display sub-label
  condition:         {},         // optional — see constants.js::CONDITION_TYPES
  tags:              ["string"], // optional — see constants.js::ATOM_TAGS (same vocabulary as STAT_EFFECT_ATOM.tags).

  // Stacking — use ONE of these (not both). Contribution = atom.value × currentStackCount.
  //   maxStacks  — single-atom local stacking; count lives in ctx.stackCounts[abilityId]
  //   resource   — shared/grouped stacking; count lives in ctx.classResources[resourceId]
  maxStacks:         0,          // optional — single-atom local stack cap
  resource:          "string",   // optional — references a classResources entry (e.g. per-stack DoT scaling)
};

// ATOM — heal
// A heal projection. Runs through calcHealing.
const HEAL_ATOM = {
  baseHeal:         0,
  scaling:          0,
  healType:         "string",    // "physical" | "magical"
  target:           "string",    // see constants.js::EFFECT_TARGETS
  isHot:            false,       // optional — heal-over-time
  tickRate:         0,           // optional — seconds per tick (HoT only)
  duration:         0,           // optional — total HoT lifetime in seconds
  percentMaxHealth: 0,           // optional — % of target's max HP as heal
  desc:             "string",    // optional — display sub-label
  condition:        {},          // optional gating
};

// ATOM — shield
// A damage-absorb layer.
const SHIELD_ATOM = {
  base:         0,
  scaling:      0,
  damageFilter: "string",        // "physical" | "magical" | null (absorbs all damage)
  target:       "string",        // see constants.js::EFFECT_TARGETS — typically "self"
  duration:     0,               // optional — how long the shield lasts
  condition:    {},              // optional gating
};

// ─────────────────────────────────────────────────────────────────────
// CONDITION — per engine_architecture.md §2.3 (variants mirrored + local extensions)
// ─────────────────────────────────────────────────────────────────────
const CONDITION_VARIANTS = [
  { type: "hp_below",        threshold: 0 },           // 0–1
  { type: "ability_selected", abilityId: "string" },   // true iff abilityId ∈ selectedPerks ∪ selectedSkills ∪ selectedSpells
  { type: "effect_active",   effectId: "string" },     // dispatched by ability.activation (see §effect_active rule)
  { type: "environment",     env: "string" },
  { type: "weapon_type",     weaponType: "string" },
  { type: "player_state",    state: "string" },
  { type: "equipment",       slot: "string", equipped: true },
  { type: "creature_type",   creatureType: "string" },
  { type: "damage_type",     damageType: "string | string[]", exclude: ["string"] },
  { type: "tier",            tier: "poor | good | perfect" },        // Bard performance tier selector — reads ctx.selectedTiers[abilityId]
  { type: "all",             conditions: [/* CONDITION[] */] },
  { type: "any",             conditions: [/* CONDITION[] */] },
  { type: "not",             conditions: [/* CONDITION[] */] },
];

// ─────────────────────────────────────────────────────────────────────
// OPEN sub-shapes
// ─────────────────────────────────────────────────────────────────────

const COST = {
  type: "charges | health | cooldown | percentMaxHealth | none",   // see constants.js::COST_TYPES
  value: 0,
};

// SUMMON — dissolved. Summon.damage → parent damage[], summon.casterEffects →
// parent effects[], summon.duration → parent duration, entity name → desc.
// See class-shape-progress.md "SUMMON dissolution".

// FORM — dissolved. Replacement attacks and wild skills become regular skills
// in skills[], granted via grants[] on the transformation. scalesWith moves
// to DAMAGE_ATOM.scalesWith. See class-shape-progress.md "Transformations
// fold into spells[]".

const AFTER_EFFECT = {
  duration: { base: 0, type: "debuff" },
  effects:  [/* STAT_EFFECT_ATOM */],
  desc:     "string",
};

// ATOM — grant
// Adds availability: abilities, weapons, or armor become accessible while
// the bearer is active. `condition` gates on ctx (WHEN). `costSource`
// controls cost display for ability grants.
const GRANT_ATOM = {
  type:       "ability | weapon | armor",   // see constants.js::GRANT_REMOVE_TYPES
  abilityId:  "string",              // when type = "ability"
  weaponType: "string",              // when type = "weapon" — see constants.js::WEAPON_TYPES
  armorType:  "string",              // when type = "armor" — see constants.js::ARMOR_TYPES
  condition:  {},                    // optional — ctx-gating (e.g. effect_active + weapon_type)
  costSource: "granted | granter",   // optional — default "granted" (see constants.js::COST_SOURCE)
};

// ATOM — remove
// Removes availability: abilities, weapons, or armor become inaccessible
// while the bearer is active. `condition` gates on ctx (WHEN). `tags`
// filters within the abilityType category (WHAT to remove).
const REMOVE_ATOM = {
  type:        "ability | weapon | armor",   // see constants.js::GRANT_REMOVE_TYPES
  abilityType: "string",             // when type = "ability" — see constants.js::ABILITY_TYPES
  armorType:   "string",             // when type = "armor" — see constants.js::ARMOR_TYPES
  tags:        ["string"],           // optional — see constants.js::ATOM_TAGS (filter by target ability's tags)
  condition:   {},                   // optional — ctx-gating
};
