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

// ── Condition types (spec §3 Condition shape) ──

export const CONDITION_TYPES = new Set([
  "form_active",
  "hp_below",
  "effect_active",
  "environment",
  "frenzy_active",
  "weapon_type",
  "dual_wield",
  "player_state",
  "equipment",
]);

// ── Trigger events (spec §3 triggers[].event + plan §13.4 on_successful_block) ──

export const TRIGGER_EVENTS = new Set([
  "on_melee_hit",
  "on_hit_received",
  "on_damage_taken",
  "on_damage_dealt",
  "on_heal_cast",
  "on_kill",
  "on_shield_break",
  "on_curse_tick",
  "on_successful_block",
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
]);

// ── Player states (spec §3 condition `player_state` values) ──

export const PLAYER_STATES = new Set([
  "hiding",
  "crouching",
  "blocking",
  "defensive_stance",
  "casting",
  "reloading",
  "bow_drawn",
  "playing_music",
  "drunk",
  "dual_casting",
]);

// ── Weapon types (spec §3 condition `weapon_type` values) ──
//
// Includes specific weapon kinds AND virtual categories (two_handed, ranged,
// unarmed). Specific kinds are matched against the equipped item's
// `weaponType`. Virtual categories are resolved by the engine: `ranged` via
// WEAPON_TYPE_CATEGORIES below; `two_handed` / `unarmed` / `instrument` via
// gear properties (handed-ness, presence of weapon, instrument tag).

export const WEAPON_TYPES = new Set([
  "axe", "sword", "dagger", "bow", "crossbow", "staff", "blunt",
  "rapier", "spear", "two_handed", "ranged", "instrument", "unarmed",
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
  ALLY_OR_SELF:  "ally_or_self",
  ENEMY:         "enemy",
  ENEMY_OR_SELF: "enemy_or_self",
});

// Effect-level `target` values (spec §3 effects[].target).
//   "self"     — applies to caster stats (runEffectPipeline)
//   "enemy"    — applies to target stats (runTargetPipeline)
//   "either"   — ability exposes per-ability applyToSelf / applyToEnemy
//                checkboxes; user picks one/both/neither. Both → the
//                entry routes to both pipelines simultaneously
//   "party" / "nearby_allies" / "nearby_enemies" — display-only in
//                snapshot mode; engine treats them as self
// Distinct from ability-level TARGETING (which gates what the ability
// can be cast on).
export const EFFECT_TARGETS = new Set([
  "self", "enemy", "either", "party", "nearby_allies", "nearby_enemies",
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
