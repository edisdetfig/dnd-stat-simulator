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

// Verified via docs/health_formula.md: every character's HP gets +10 from
// the season patch baseline, applied after curve evaluation.
export const PATCH_HEALTH_BONUS = 10;

// ── Effect pipeline phases (spec §3 Phase enum) ──

export const EFFECT_PHASES = Object.freeze({
  PRE_CURVE_FLAT:        "pre_curve_flat",
  ATTRIBUTE_MULTIPLIER:  "attribute_multiplier",
  POST_CURVE:            "post_curve",
  MULTIPLICATIVE_LAYER:  "multiplicative_layer",
  TYPE_DAMAGE_BONUS:     "type_damage_bonus",
  HEALING_MODIFIER:      "healing_modifier",
  CAP_OVERRIDE:          "cap_override",
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
// Distinct from ability-level TARGETING; party / nearby_* are display-only
// distinctions in snapshot mode (engine treats them as self).
export const EFFECT_TARGETS = new Set([
  "self", "enemy", "party", "nearby_allies", "nearby_enemies",
]);
