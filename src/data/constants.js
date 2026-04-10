// Game constants and configuration

// Patch / app version — shown in the main app header and on the class picker
// landing page. Update these when a new Dark and Darker hotfix drops or the
// simulator version bumps; both callers read from here so they never drift.
export const GAME_VERSION = {
  season: "Season 8",
  hotfix: "Hotfix 112-1",
};
export const APP_VERSION = "v0.5.0";

// Base stat caps - perks can override these via capOverrides
export const CAPS = {
  pdr: 0.65,
  mdr: 0.65,
  cdr: 0.65,
  manualDexterity: 0.55,
  buffDuration: 1.0,  // 100%
};

// Combat constants
export const COMBAT = {
  BASE_MOVE_SPEED: 300,
  MOVE_SPEED_CAP: 330,
  HS_BASE_MULT: 0.5,
  LIMB_MULT: 0.5,
  ANTIMAGIC_REDUCTION: 0.20,
};

// Core attribute keys
export const CORE_ATTRS = new Set(["str", "vig", "agi", "dex", "wil", "kno", "res"]);

// Rarities - array preserves order, single source of truth
export const RARITIES = [
  { id: "poor",      label: "Poor",      color: "#808080", modCount: 0 },
  { id: "common",    label: "Common",    color: "#c8c8c8", modCount: 0 },
  { id: "uncommon",  label: "Uncommon",  color: "#56b455", modCount: 1 },
  { id: "rare",      label: "Rare",      color: "#3b82f6", modCount: 2 },
  { id: "epic",      label: "Epic",      color: "#a855f7", modCount: 3 },
  { id: "legendary", label: "Legendary", color: "#f59e0b", modCount: 4 },
  { id: "unique",    label: "Unique",    color: "#ef4444", modCount: 1 },
];

// Derived helpers for rarity
export const RARITY_BY_ID = Object.fromEntries(RARITIES.map(r => [r.id, r]));
export const RARITY_ORDER = RARITIES.map(r => r.id);

// Character equipment slots
export const CHARACTER_SLOTS = [
  // Weapons (2 loadouts, each with primary + optional secondary)
  { id: "weaponSlot1Primary",   slotType: "primaryWeapon",   label: "Weapon 1",       category: "weapon" },
  { id: "weaponSlot1Secondary", slotType: "secondaryWeapon", label: "Weapon 1 Off",   category: "weapon" },
  { id: "weaponSlot2Primary",   slotType: "primaryWeapon",   label: "Weapon 2",       category: "weapon" },
  { id: "weaponSlot2Secondary", slotType: "secondaryWeapon", label: "Weapon 2 Off",   category: "weapon" },

  // Armor
  { id: "head",  slotType: "head",  label: "Head",  category: "armor" },
  { id: "chest", slotType: "chest", label: "Chest", category: "armor" },
  { id: "hands", slotType: "hands", label: "Hands", category: "armor" },
  { id: "legs",  slotType: "legs",  label: "Legs",  category: "armor" },
  { id: "feet",  slotType: "feet",  label: "Feet",  category: "armor" },
  { id: "back",  slotType: "back",  label: "Back",  category: "armor" },

  // Accessories
  { id: "ring1",    slotType: "ring",     label: "Ring 1",   category: "accessory" },
  { id: "ring2",    slotType: "ring",     label: "Ring 2",   category: "accessory" },
  { id: "necklace", slotType: "necklace", label: "Necklace", category: "accessory" },
];

// Derived helpers for slots
export const SLOT_BY_ID = Object.fromEntries(CHARACTER_SLOTS.map(s => [s.id, s]));
export const SLOTS_BY_CATEGORY = CHARACTER_SLOTS.reduce((acc, slot) => {
  if (!acc[slot.category]) acc[slot.category] = [];
  acc[slot.category].push(slot);
  return acc;
}, {});

// Target presets for damage calculations
export const TARGET_PRESETS = [
  {
    id: "training_dummy",
    name: "Training Dummy",
    pdr: -0.22,
    mdr: 0.075,
    headshotDR: 0,
    description: "Ruins dummy. Negative PDR amplifies physical damage.",
    verification: "VERIFIED"
  },
  {
    id: "naked_fighter",
    name: "Naked Fighter",
    pdr: 0,
    mdr: 0.03,
    headshotDR: 0,
    description: "All 15 stats, no gear. ~0% PDR, ~3% MDR.",
    verification: "ESTIMATED"
  },
  {
    id: "plate_fighter",
    name: "Plate Fighter",
    pdr: 0.42,
    mdr: 0.15,
    headshotDR: 0.15,
    description: "Geared plate Fighter. ~297 AR, helm HS DR.",
    verification: "ESTIMATED"
  },
  {
    id: "cloth_wizard",
    name: "Cloth Wizard",
    pdr: 0.05,
    mdr: 0.45,
    headshotDR: 0,
    description: "Geared cloth caster. High WIL + MR stacking.",
    verification: "ESTIMATED"
  },
];

// Effect phases for spells/buffs/debuffs
export const EFFECT_PHASES = {
  PRE_CURVE_FLAT: "pre_curve_flat",           // Before curves, flat additions
  ATTRIBUTE_MULTIPLIER: "attribute_multiplier", // After attribute sum, before curves
  POST_CURVE: "post_curve",                    // After curves, derived stat mods
  TYPE_DAMAGE_BONUS: "type_damage_bonus",      // Damage-type-specific bonus (e.g. +30% dark)
  DAMAGE_OVER_TIME: "damage_over_time",        // Ongoing damage ticks
};

// Spell targeting types
export const TARGETING = {
  SELF_ONLY: "self_only",
  ALLY_OR_SELF: "ally_or_self",
  ENEMY_OR_SELF: "enemy_or_self",
  ENEMY_ONLY: "enemy_only",
};

// Fallback major stats for classes that don't define their own
export const FALLBACK_MAJOR_STATS = [
  "hp", "ppb", "mpb", "pdr", "mdr", "moveSpeed", "actionSpeed", "spellCastingSpeed"
];

// All worn (non-weapon) gear slot ids. Name kept as "ARMOR_SLOTS" for
// legacy reasons — includes accessories so the aggregator counts rings/necklace.
export const ARMOR_SLOTS = CHARACTER_SLOTS
  .filter(s => s.category !== "weapon")
  .map(s => s.id);

export const WEAPON_ONLY = new Set([
  "weaponDamage", "attackSpeed", "attackPower"
]);

export const RARITY_CONFIG = RARITY_BY_ID;
