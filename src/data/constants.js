// Core constants and v3 enums.
//
// Source of truth for membership: docs/ability_data_map_v2.md (the spec).
// Enum keys are UPPER_CASE for IDE autocomplete; values are the canonical
// snake_case strings used in data files and serialization.

// ── Attribute & gear primitives (consumed by aggregator.js) ──

export const CORE_ATTRS = new Set(["str", "vig", "agi", "dex", "wil", "kno", "res"]);

export const ARMOR_SLOTS = [
  "head", "chest", "back", "hands", "legs", "feet", "ring1", "ring2", "necklace",
];

// ── Gear-shape vocabulary (gear-shape-design.md § 4.1 / § 4.4) ──

// Item-definition `slotType` — 10 distinct types (ring1 and ring2 both map
// to slotType "ring"; §4.5 treats them as sharing the `ring` pool per L9).
// Used by gear-definition-validator to type-check items; used by
// character-gear-validator to match item.slotType against loadout slot key.
export const SLOT_TYPES = new Set([
  "primaryWeapon", "secondaryWeapon",
  "head", "chest", "back", "hands", "legs", "feet",
  "ring", "necklace",
]);

// Loadout slot keys — the 11 keys on `gear.loadout.slots` (§4.1). Distinct
// from SLOT_TYPES because ring1/ring2 are separate equip slots both of
// slotType "ring", and weapon loadouts are {primary, secondary} envelopes.
export const ITEM_SLOT_KEYS = new Set([
  "weaponSlot1", "weaponSlot2",
  "head", "chest", "back", "hands", "legs", "feet",
  "ring1", "ring2", "necklace",
]);

// Weapon handedness (§4.4 `item.handType`). Canonical camelCase per L2 +
// OQ-D12 resolution. Distinct from WEAPON_TYPES virtual categories
// "one_handed"/"two_handed" used in condition dispatch (those rename in
// 6.5c.2 alongside the engine-side `handed` → `handType` field rename).
export const HAND_TYPES = new Set([
  "oneHanded", "twoHanded",
]);

// ── Combat multipliers (consumed by src/engine/damage.js) ──
//
// Restored during Phase 0. Only the fields damage.js references today —
// speculative restoration of BASE_MOVE_SPEED / MOVE_SPEED_CAP /
// ANTIMAGIC_REDUCTION deferred to whichever phase first needs them.
export const COMBAT = Object.freeze({
  HS_BASE_MULT: 0.5,   // VERIFIED — docs/season8_constants.md:22
  LIMB_MULT:    0.5,   // VERIFIED — docs/season8_constants.md:23
});

// ── Patch-derived constants ──

// Verified via docs/health_formula.md.
// PATCH_HEALTH_BONUS: every character's HP gets +10 from the season patch
//   baseline, applied after curve evaluation, never scaled by MHB%.
// HR_STR_WEIGHT / HR_VIG_WEIGHT: weights for healthRating = STR×0.25 + VIG×0.75.
export const PATCH_HEALTH_BONUS = 10;
export const HR_STR_WEIGHT = 0.25;
export const HR_VIG_WEIGHT = 0.75;

// ── Effect pipeline phases (spec §3 Phase enum) ──

export const EFFECT_PHASES = Object.freeze({
  PRE_CURVE_FLAT:              "pre_curve_flat",
  ATTRIBUTE_MULTIPLIER:        "attribute_multiplier",
  POST_CURVE:                  "post_curve",
  POST_CURVE_MULTIPLICATIVE:   "post_curve_multiplicative",
  MULTIPLICATIVE_LAYER:        "multiplicative_layer",
  POST_CAP_MULTIPLICATIVE_LAYER: "post_cap_multiplicative_layer",
  TYPE_DAMAGE_BONUS:           "type_damage_bonus",
  HEALING_MODIFIER:            "healing_modifier",
  CAP_OVERRIDE:                "cap_override",
});

// Phase-value membership set — consumers check `atom.phase` membership against this.
export const EFFECT_PHASE_VALUES = new Set(Object.values(EFFECT_PHASES));

// ── Condition types (class-shape.js CONDITION_VARIANTS) ──
//
// `form_active` removed; replaced by uniform `effect_active` (dispatched by
// ability.activation). `ability_selected` and `tier` added per class-shape-progress.md.

export const CONDITION_TYPES = new Set([
  "hp_below",
  "ability_selected",
  "effect_active",
  "environment",
  "weapon_type",
  "player_state",
  "equipment",
  "creature_type",
  "damage_type",
  "tier",
  "all",
  "any",
  "not",
]);

// ── Ability shape vocabularies (class-shape.js § ABILITY) ──

// Ability `type` — also the memory-pool discriminator (spell/transformation/music).
export const ABILITY_TYPES = new Set([
  "perk", "skill", "spell", "transformation", "music",
]);

// Ability `activation` — sim-behavior distinction (see class-shape-progress.md open-item-1).
export const ACTIVATIONS = new Set([
  "passive", "cast", "cast_buff", "toggle",
]);

// ── Atom vocabularies (class-shape.js § STAT_EFFECT_ATOM / DAMAGE_ATOM) ──

// Named grouping labels on atoms. Superset of STATUS_TYPES (adds CC markers).
// No engine math depends on these values — purely UI grouping.
export const ATOM_TAGS = new Set([
  // Status (damage/debuff over time) — mirrors STATUS_TYPES
  "burn", "frostbite", "wet", "electrified", "poison", "bleed", "silence",
  "plague", "blind", "freeze",
  // CC markers (no stat payload)
  "root", "stun", "slow", "bind", "disarm", "fear", "knockback", "lift",
  "trap", "immobilize",
]);

// Polymorphic `scalesWith.type` discriminator.
//   hp_missing — stat atom value scales with % of max HP missing (Barb Berserker)
//   attribute  — damage atom value derived from attribute curve (shapeshift)
export const SCALES_WITH_TYPES = new Set([
  "hp_missing", "attribute",
]);

// Damage-type vocabulary (DAMAGE_ATOM.damageType). Physical + one generic magical
// + eleven specific magical types.
export const DAMAGE_TYPES = new Set([
  "physical",
  "magical",
  "divine_magical", "dark_magical", "evil_magical",
  "fire_magical", "ice_magical", "lightning_magical", "air_magical",
  "earth_magical", "arcane_magical", "spirit_magical", "light_magical",
]);

// Armor-proficiency vocabulary (class.armorProficiency + grant/remove armor type).
export const ARMOR_TYPES = new Set([
  "cloth", "leather", "plate",
]);

// grant/remove discriminator.
export const GRANT_REMOVE_TYPES = new Set([
  "ability", "weapon", "armor",
]);

// Cost vocabularies (COST shape).
export const COST_TYPES = new Set([
  "charges", "health", "cooldown", "percentMaxHealth", "none",
]);

// grant.costSource — who pays for the granted ability's cast.
export const COST_SOURCE = new Set([
  "granted", "granter",
]);

// Bard performance-tier values — condition { type: "tier", tier }.
export const TIER_VALUES = new Set([
  "poor", "good", "perfect",
]);

// ── Gear triggers (spec §3 gear items — separate vocabulary from ability triggers) ──
//
// Gear items carry a top-level triggers[] array whose shape mirrors ability
// triggers but uses bare event names (no "on_" prefix) and `damage[]` arrays
// (not a single damage object). First Phase 1 anchor: Spiked Gauntlet's
// 1 true_physical on melee hit.
//
// Seed vocabulary below — agent4's CSV survey across all 10 class CSVs and
// gear references will refine this; flagged in docs/unresolved_questions.md.
export const GEAR_TRIGGER_EVENTS = new Set([
  "melee_hit",
  "melee_hit_received",
  "ranged_hit",
  "spell_hit",
  "kill",
  "successful_block",
  "successful_dodge",
]);

// ── Status effect types (spec §3 appliesStatus[].type) ──

export const STATUS_TYPES = new Set([
  "burn",
  "frostbite",
  "wet",
  "electrified",
  "poison",
  "bleed",
  "silence",
  "plague",
  "blind",
  "freeze",
]);

// ── Player states (spec §3 condition `player_state` values) ──

export const PLAYER_STATES = new Set([
  "hiding",
  "crouching",
  "defensive_stance",
  "casting",
  "reloading",
  "bow_drawn",
  "playing_music",
  "drunk",
  "dual_casting",
  "in_combat",
  "behind_target",
  "frenzy",
]);

// ── Weapon types (spec §3 condition `weapon_type` values) ──
//
// Includes specific weapon kinds AND virtual categories (two_handed, ranged,
// unarmed, dual_wield). Specific kinds are matched against the equipped item's
// `weaponType`. Virtual categories are resolved by the engine: `ranged` via
// WEAPON_TYPE_CATEGORIES below; `two_handed` / `unarmed` / `instrument` /
// `dual_wield` via gear properties (handed-ness, presence of weapon, instrument
// tag, presence of weapons in both hands).

export const WEAPON_TYPES = new Set([
  "axe", "sword", "dagger", "bow", "crossbow", "staff", "blunt",
  "rapier", "spear", "two_handed", "one_handed", "ranged", "instrument",
  "unarmed", "shield", "spellbook", "firearm", "dual_wield",
  // "magicStuff" per L2.1 — weapons that also count as magic items (crystal
  // swords, spellbooks). Real vocabulary entry, not placeholder. Authored
  // as a secondary entry in multi-type weaponType arrays, e.g. Frostlight
  // Crystal Sword: ["sword", "magicStuff"].
  "magicStuff",
]);

// Map of category → list of specific weapon types that satisfy the category.
// Only `ranged` is purely weapon-type-derivable. `two_handed`, `unarmed`, and
// `instrument` depend on gear properties beyond `weaponType` and are resolved
// by the engine, not by this map.
export const WEAPON_TYPE_CATEGORIES = Object.freeze({
  ranged: ["bow", "crossbow"],
});

// ── Ability targeting (spec §3 ability-level `targeting`) ──

export const TARGETING = Object.freeze({
  SELF:          "self",
  ALLY:          "ally",
  ALLY_OR_SELF:  "ally_or_self",
  ENEMY:         "enemy",
  ENEMY_OR_SELF: "enemy_or_self",
});

// Effect-level `target` values (spec §3 effects[].target).
//   "self"          — applies to caster stats (runEffectPipeline)
//   "ally"          — applies to an ally target (display-only in snapshot;
//                     engine projection deferred to Phase 11 ally-buff panel
//                     via the atomsByTarget query API)
//   "self_or_ally"  — self-cast or ally-cast; display-only in snapshot
//   "enemy"         — applies to target stats (runTargetPipeline)
//   "either"        — ability exposes per-ability applyToSelf / applyToEnemy
//                     checkboxes; user picks one/both/neither. Both → the
//                     entry routes to both pipelines simultaneously
//   "party" / "nearby_allies" / "nearby_enemies" — display-only in snapshot
//                     mode; engine treats them as self
// Distinct from ability-level TARGETING (which gates what the ability can
// be cast on).
export const EFFECT_TARGETS = new Set([
  "self", "ally", "self_or_ally", "enemy", "either",
  "party", "nearby_allies", "nearby_enemies",
]);

// Display-only atom `tags` vocabulary for engine-observable capabilities
// carried by bare atoms (no stat/value/phase). Canonicalized Phase 3 from
// Warlock authoring patterns. Extension policy: adding a tag is a
// vocabulary update (edit this Set + vocabulary.md), not a quiet add or
// pre-allocated placeholder.
export const CAPABILITY_TAGS = new Set([
  "cooldown_gated",
  "phase_through",
  "spells_cannot_kill",
  "detects_hidden",
  "possessable",
  "can_move_while_channeling",
  "irreversible_until_contract_ends",
]);

// ── UI-oriented constants consumed by existing components ──

export const GAME_VERSION = Object.freeze({
  season: "Season 8",
  hotfix: "Hotfix 112-1",
  build: "0.15.134.8480",
});

// Rarity modifier counts + display metadata.
// modCount follows the poor=0/common=0/uncommon=1/rare=2/epic=3/legendary=4
// mapping from docs/gear_reference.md §1.
export const RARITY_CONFIG = Object.freeze({
  poor:      { label: "Poor",      modCount: 0, color: "var(--sim-rarity-poor)" },
  common:    { label: "Common",    modCount: 0, color: "var(--sim-rarity-common)" },
  uncommon:  { label: "Uncommon",  modCount: 1, color: "var(--sim-rarity-uncommon)" },
  rare:      { label: "Rare",      modCount: 2, color: "var(--sim-rarity-rare)" },
  epic:      { label: "Epic",      modCount: 3, color: "var(--sim-rarity-epic)" },
  legendary: { label: "Legendary", modCount: 4, color: "var(--sim-rarity-legendary)" },
  unique:    { label: "Unique",    modCount: 1, color: "var(--sim-rarity-unique)" },
});
export const RARITY_ORDER = ["poor", "common", "uncommon", "rare", "epic", "legendary", "unique"];

// Pre-set target profiles for the TargetEditor. PDR/MDR/headshotDR are
// stored as decimals (0.40 = 40%).
export const TARGET_PRESETS = Object.freeze([
  { id: "naked",     name: "Naked",      pdr: -0.22, mdr:  0.00, headshotDR: 0.00,
    verification: "VERIFIED",
    description: "Unarmored baseline — AR 0 produces -22% PDR per curve." },
  { id: "cloth",     name: "Cloth",      pdr:  0.15, mdr:  0.10, headshotDR: 0.00,
    verification: "ESTIMATED",
    description: "Typical cloth-wearer (Wizard, Warlock bare)." },
  { id: "leather",   name: "Leather",    pdr:  0.30, mdr:  0.15, headshotDR: 0.05,
    verification: "ESTIMATED" },
  { id: "plate",     name: "Plate",      pdr:  0.50, mdr:  0.20, headshotDR: 0.10,
    verification: "ESTIMATED",
    description: "Heavy armor (Fighter, Barbarian, Cleric, Warlock w/ Demon Armor)." },
  { id: "tank",      name: "Tank",       pdr:  0.65, mdr:  0.45, headshotDR: 0.20,
    verification: "ESTIMATED",
    description: "High-DR target with iron will or defense mastery." },
]);
