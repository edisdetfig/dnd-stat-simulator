// modifier-pools.js
//
// Per-slot modifier pools — verbatim transcription of
// `docs/session-prompts/gear-shape-design.md § 4.5`. The metadata §4.5 is
// authoritative per LOCK B; do not silently re-author ranges, rename stats,
// or reorder entries. Range deltas ship only via explicit coordinator-signed
// revision-log entries in that doc.
//
// Pool membership by slot: 10 pools cover all 11 loadout slot keys
// (ring1 and ring2 both draw from the single `ring` pool per L9).
// `primaryWeapon` weapons resolve to either `weapon_twoHanded` or
// `weapon_oneHanded` per the item's handType. `secondaryWeapon` weapons
// share the `weapon_oneHanded` pool per L2.2 + coordinator approval
// (§4.5 has no distinct secondary pool; future evidence may reveal one).
//
// Each entry: `{ stat, socketRange, naturalRange, unit, exclusionGroup?, naturalRangeVerified? }`.
// `naturalRangeVerified: false` means the range is estimated from screenshots,
// not a confirmed roll range — accuracy concern flagged for later re-verification.
//
// Stat-name namespace note. Pool entries use the §4.3 bare-name forms
// (`physicalDamageReduction`, `magicalDamageReduction`) rather than the
// STAT_META `…Bonus` canonical forms. MODIFIER_POOL_STAT_ALIASES maps
// bare-name → canonical; validators + the future normalizer consult this
// map. Per OQ-D4 resolution: no engine-wide STAT_META rename; the alias
// map is the single translation point.

// ── Stat-name alias map ──────────────────────────────────────────────
//
// §4.3 registry uses bare names; engine-side STAT_META uses `Bonus` suffixes
// where a Season-8 mechanical distinction once existed (now naming-variant
// per L7). Alias map resolves pool entries to canonical STAT_META keys for
// aggregation. Keys = §4.5 entry `stat` values; values = STAT_META keys.

export const MODIFIER_POOL_STAT_ALIASES = Object.freeze({
  physicalDamageReduction: "physicalDamageReductionBonus",
  magicalDamageReduction:  "magicalDamageReductionBonus",
});

/**
 * Resolve a pool-entry stat id to its canonical STAT_META key.
 * Non-aliased ids pass through unchanged.
 */
export function resolveCanonicalStat(poolStatId) {
  return MODIFIER_POOL_STAT_ALIASES[poolStatId] ?? poolStatId;
}

// ── Pools (verbatim from gear-shape-design.md §4.5) ──────────────────

/**
 * `weapon_twoHanded` — source: §4.5 (verified in-game per revision log
 * entry 2026-04-17 for physicalHealing/magicalHealing pair + the
 * additionalMemoryCapacity 2-4 correction).
 */
const weapon_twoHanded = [
  { stat: "additionalWeaponDamage",   socketRange: { min: 2,   max: 2   }, naturalRange: { min: 2,   max: 2  }, unit: "flat" },
  { stat: "physicalDamageBonus",      socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent" },
  { stat: "demonDamageBonus",         socketRange: { min: 4,   max: 6.4 }, naturalRange: { min: 4,   max: 8  }, unit: "percent" },
  { stat: "armorPenetration",         socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent" },
  { stat: "undeadDamageBonus",        socketRange: { min: 4,   max: 6.4 }, naturalRange: { min: 4,   max: 8  }, unit: "percent" },
  { stat: "magicalDamageBonus",       socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent" },
  { stat: "headshotDamageBonus",      socketRange: { min: 4,   max: 6.4 }, naturalRange: { min: 4,   max: 8  }, unit: "percent" },
  { stat: "physicalPower",            socketRange: { min: 2,   max: 3   }, naturalRange: { min: 2,   max: 3  }, unit: "flat" },
  { stat: "actionSpeed",              socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent" },
  { stat: "luck",                     socketRange: { min: 30,  max: 48  }, naturalRange: { min: 30,  max: 60 }, unit: "flat" },
  { stat: "magicResistance",          socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat" },
  { stat: "magicalPower",             socketRange: { min: 2,   max: 3   }, naturalRange: { min: 2,   max: 3  }, unit: "flat" },
  { stat: "demonDamageReduction",     socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent" },
  { stat: "magicalDamageReduction",   socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent" },
  { stat: "magicPenetration",         socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent" },
  { stat: "spellCastingSpeed",        socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent" },
  { stat: "undeadDamageReduction",    socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent" },
  { stat: "debuffDurationBonus",      socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent" },
  { stat: "physicalHealing",          socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 2  }, unit: "flat" },
  { stat: "magicalHealing",           socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 2  }, unit: "flat" },
  { stat: "memoryCapacityBonus",      socketRange: { min: 5,   max: 8   }, naturalRange: { min: 5,   max: 10 }, unit: "percent" },
  { stat: "buffDurationBonus",        socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent" },
  { stat: "physicalDamageReduction",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", exclusionGroup: "ar_pdr" },
  { stat: "additionalArmorRating",    socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat",    exclusionGroup: "ar_pdr" },
  { stat: "regularInteractionSpeed",  socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent" },
  { stat: "projectileDamageReduction",socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent" },
  { stat: "cooldownReductionBonus",   socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent" },
  { stat: "magicalInteractionSpeed",  socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent" },
  { stat: "additionalMemoryCapacity", socketRange: { min: 2,   max: 3   }, naturalRange: { min: 2,   max: 4  }, unit: "flat" },
];

/**
 * `weapon_oneHanded` — source: Obsidian Cutlass (Sword, 1H, Epic) socket
 * screenshots. Many entries carry `naturalRangeVerified: false`: socket
 * ranges are confirmed; natural ranges are estimated as socket × 5/4.
 * Also shared by `secondaryWeapon` items (see resolvePoolKey).
 */
const weapon_oneHanded = [
  { stat: "additionalWeaponDamage",   socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "physicalDamageBonus",      socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalDamageBonus",       socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageBonus",         socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "armorPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageBonus",        socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalPower",            socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "headshotDamageBonus",      socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "luck",                     socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "actionSpeed",              socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalPower",             socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "magicResistance",          socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalDamageReduction",   socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageReduction",     socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageReduction",    socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "spellCastingSpeed",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "memoryCapacityBonus",      socketRange: { min: 2.5, max: 4   }, naturalRange: { min: 2.5, max: 5  }, unit: "percent", naturalRangeVerified: false },
  { stat: "debuffDurationBonus",      socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "additionalMemoryCapacity", socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "physicalHealing",          socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "cooldownReductionBonus",   socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalHealing",           socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "physicalDamageReduction",  socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "additionalArmorRating",    socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "regularInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "buffDurationBonus",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "projectileDamageReduction",socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
];

/**
 * `chest` — main armor slot → core attributes included.
 * Source: §4.5.
 */
const chest = [
  { stat: "agi",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat" },
  { stat: "wil",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat" },
  { stat: "kno",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat" },
  { stat: "res",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat" },
  { stat: "str",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat" },
  { stat: "dex",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat" },
  { stat: "vig",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat" },
  { stat: "physicalPower",            socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "armorPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent" },
  { stat: "headshotDamageBonus",      socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent" },
  { stat: "physicalDamageBonus",      socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent" },
  { stat: "demonDamageBonus",         socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent" },
  { stat: "undeadDamageBonus",        socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent" },
  { stat: "magicalDamageBonus",       socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent" },
  { stat: "actionSpeed",              socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent" },
  { stat: "magicalPower",             socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "luck",                     socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat" },
  { stat: "magicResistance",          socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat" },
  { stat: "magicalDamageReduction",   socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent" },
  { stat: "demonDamageReduction",     socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent" },
  { stat: "spellCastingSpeed",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent" },
  { stat: "undeadDamageReduction",    socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent" },
  { stat: "magicPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent" },
  { stat: "magicalInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent" },
  { stat: "debuffDurationBonus",      socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent" },
  { stat: "memoryCapacityBonus",      socketRange: { min: 3.7, max: 6   }, naturalRange: { min: 3.7, max: 7.5}, unit: "percent" },
  { stat: "buffDurationBonus",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent" },
  { stat: "physicalDamageReduction",  socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", exclusionGroup: "ar_pdr" },
  { stat: "additionalArmorRating",    socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    exclusionGroup: "ar_pdr" },
  { stat: "regularInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent" },
  { stat: "projectileDamageReduction",socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent" },
  { stat: "cooldownReductionBonus",   socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent" },
  { stat: "additionalMemoryCapacity", socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 2  }, unit: "flat" },
];

/**
 * `hands` — main armor slot. Source: Golden Gloves (Leather, Epic).
 * Uniquely carries `additionalPhysicalDamage` among main armor slots.
 * Natural ranges largely `naturalRangeVerified: false`.
 */
const hands = [
  { stat: "str",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "vig",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "agi",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "dex",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "wil",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "kno",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "res",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "additionalPhysicalDamage", socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "armorPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageBonus",         socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageBonus",        socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalDamageBonus",      socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalDamageBonus",       socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "headshotDamageBonus",      socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalPower",            socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "actionSpeed",              socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalPower",             socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "magicResistance",          socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "luck",                     socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalDamageReduction",   socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageReduction",     socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageReduction",    socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "spellCastingSpeed",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "projectileDamageReduction",socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "regularInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "cooldownReductionBonus",   socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "debuffDurationBonus",      socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "buffDurationBonus",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalDamageReduction",  socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "additionalArmorRating",    socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "memoryCapacityBonus",      socketRange: { min: 3.7, max: 6   }, naturalRange: { min: 3.7, max: 7.5}, unit: "percent", naturalRangeVerified: false },
  { stat: "additionalMemoryCapacity", socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 2  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
];

/**
 * `head` — main armor slot. Source: Barbuta Helm (Plate, Epic).
 * Uniquely carries `additionalMagicalDamage` among main armor slots.
 * Headshot DR + Move Speed never socketable on any slot.
 */
const head = [
  { stat: "str",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "vig",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "agi",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "dex",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "wil",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "kno",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "res",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "physicalDamageBonus",      socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "armorPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageBonus",         socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalPower",            socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "headshotDamageBonus",      socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageBonus",        socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalDamageBonus",       socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "additionalMagicalDamage",  socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "actionSpeed",              socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "luck",                     socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalPower",             socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "magicResistance",          socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalDamageReduction",   socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", naturalRangeVerified: false },
  { stat: "magicPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "spellCastingSpeed",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageReduction",    socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageReduction",     socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "regularInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "debuffDurationBonus",      socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "buffDurationBonus",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalDamageReduction",  socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "additionalArmorRating",    socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "memoryCapacityBonus",      socketRange: { min: 3.7, max: 6   }, naturalRange: { min: 3.7, max: 7.5}, unit: "percent", naturalRangeVerified: false },
  { stat: "additionalMemoryCapacity", socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 2  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "cooldownReductionBonus",   socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "projectileDamageReduction",socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
];

/**
 * `legs` — main armor slot. Source: Dark Leather Leggings (Leather, Epic).
 * No `additionalPhysicalDamage` (hands-only for main armor slots). Move
 * Speed never socketable.
 */
const legs = [
  { stat: "str",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "vig",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "agi",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "dex",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "wil",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "kno",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "res",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "armorPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageBonus",         socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageBonus",        socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalDamageBonus",      socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalDamageBonus",       socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "headshotDamageBonus",      socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalPower",            socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "actionSpeed",              socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalPower",             socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "magicResistance",          socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "luck",                     socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalDamageReduction",   socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageReduction",     socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageReduction",    socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "spellCastingSpeed",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "projectileDamageReduction",socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "regularInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "cooldownReductionBonus",   socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "debuffDurationBonus",      socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "buffDurationBonus",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalDamageReduction",  socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "additionalArmorRating",    socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "memoryCapacityBonus",      socketRange: { min: 3.7, max: 6   }, naturalRange: { min: 3.7, max: 7.5}, unit: "percent", naturalRangeVerified: false },
  { stat: "additionalMemoryCapacity", socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 2  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
];

/**
 * `feet` — main armor slot. Source: Rugged Boots (Leather, Epic).
 * No `additionalPhysicalDamage`.
 */
const feet = [
  { stat: "str",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "vig",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "agi",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "dex",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "wil",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "kno",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "res",                      socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "armorPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalDamageBonus",       socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "headshotDamageBonus",      socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageBonus",         socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageBonus",        socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalDamageBonus",      socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalPower",            socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "luck",                     socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalPower",             socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "magicResistance",          socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "actionSpeed",              socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalDamageReduction",   socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", naturalRangeVerified: false },
  { stat: "magicPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "spellCastingSpeed",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageReduction",     socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageReduction",    socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalDamageReduction",  socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "additionalArmorRating",    socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "additionalMemoryCapacity", socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 2  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "debuffDurationBonus",      socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "buffDurationBonus",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "projectileDamageReduction",socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "memoryCapacityBonus",      socketRange: { min: 3.7, max: 6   }, naturalRange: { min: 3.7, max: 7.5}, unit: "percent", naturalRangeVerified: false },
  { stat: "regularInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "cooldownReductionBonus",   socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
];

/**
 * `back` — NOT a main armor slot — no core attributes. Ranges comparable
 * to weapons. Has `additionalPhysicalDamage`, `additionalMagicalDamage`,
 * `physicalHealing`, `magicalHealing`.
 */
const back = [
  { stat: "demonDamageBonus",         socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageBonus",        socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "headshotDamageBonus",      socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "additionalPhysicalDamage", socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "additionalMagicalDamage",  socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "magicalDamageBonus",       socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalPower",            socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "physicalDamageBonus",      socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "actionSpeed",              socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalPower",             socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "luck",                     socketRange: { min: 30,  max: 48  }, naturalRange: { min: 30,  max: 60 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "armorPenetration",         socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicPenetration",         socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicResistance",          socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalDamageReduction",   socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "spellCastingSpeed",        socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageReduction",    socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageReduction",     socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "debuffDurationBonus",      socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalHealing",          socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "memoryCapacityBonus",      socketRange: { min: 5,   max: 8   }, naturalRange: { min: 5,   max: 10 }, unit: "percent", naturalRangeVerified: false },
  { stat: "additionalMemoryCapacity", socketRange: { min: 2,   max: 3   }, naturalRange: { min: 2,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "buffDurationBonus",        socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "cooldownReductionBonus",   socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalHealing",           socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "physicalDamageReduction",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "additionalArmorRating",    socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat",    exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "regularInteractionSpeed",  socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "projectileDamageReduction",socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalInteractionSpeed",  socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
];

/**
 * `ring` — single pool shared by `ring1` and `ring2` (L9). NOT a main
 * armor slot — no core attributes. Higher `physicalPower` / `magicalPower`
 * / healing (2–4) than main armor.
 */
const ring = [
  { stat: "headshotDamageBonus",      socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalDamageBonus",      socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageBonus",         socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "armorPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageBonus",        socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalDamageBonus",       socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalPower",            socketRange: { min: 2,   max: 3   }, naturalRange: { min: 2,   max: 4  }, unit: "flat",    naturalRangeVerified: true },
  { stat: "additionalPhysicalDamage", socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "additionalMagicalDamage",  socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "actionSpeed",              socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "luck",                     socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicResistance",          socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalPower",             socketRange: { min: 2,   max: 3   }, naturalRange: { min: 2,   max: 4  }, unit: "flat",    naturalRangeVerified: true },
  { stat: "demonDamageReduction",     socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalDamageReduction",   socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", naturalRangeVerified: false },
  { stat: "magicPenetration",         socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "spellCastingSpeed",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageReduction",    socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "buffDurationBonus",        socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "projectileDamageReduction",socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "additionalMemoryCapacity", socketRange: { min: 1,   max: 2   }, naturalRange: { min: 1,   max: 2  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalHealing",           socketRange: { min: 2,   max: 3   }, naturalRange: { min: 2,   max: 4  }, unit: "flat",    naturalRangeVerified: true },
  { stat: "physicalHealing",          socketRange: { min: 2,   max: 3   }, naturalRange: { min: 2,   max: 4  }, unit: "flat",    naturalRangeVerified: true },
  { stat: "debuffDurationBonus",      socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalDamageReduction",  socketRange: { min: 0.7, max: 1.2 }, naturalRange: { min: 0.7, max: 1.5}, unit: "percent", exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "additionalArmorRating",    socketRange: { min: 7,   max: 12  }, naturalRange: { min: 7,   max: 15 }, unit: "flat",    exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "regularInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "memoryCapacityBonus",      socketRange: { min: 3.7, max: 6   }, naturalRange: { min: 3.7, max: 7.5}, unit: "percent", naturalRangeVerified: false },
  { stat: "cooldownReductionBonus",   socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalInteractionSpeed",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
];

/**
 * `necklace` — NOT a main armor slot — no core attributes. Ranges similar
 * to back. `maxHealth` is inherent only (never socketable).
 */
const necklace = [
  { stat: "headshotDamageBonus",      socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalDamageBonus",       socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageBonus",         socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "armorPenetration",         socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "undeadDamageBonus",        socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "additionalPhysicalDamage", socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "additionalMagicalDamage",  socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "physicalPower",            socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "physicalDamageBonus",      socketRange: { min: 1,   max: 1.6 }, naturalRange: { min: 1,   max: 2  }, unit: "percent", naturalRangeVerified: false },
  { stat: "actionSpeed",              socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "luck",                     socketRange: { min: 30,  max: 48  }, naturalRange: { min: 30,  max: 60 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicResistance",          socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalPower",             socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "magicalDamageReduction",   socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", naturalRangeVerified: false },
  { stat: "demonDamageReduction",     socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicPenetration",         socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "spellCastingSpeed",        socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "memoryCapacityBonus",      socketRange: { min: 5,   max: 8   }, naturalRange: { min: 5,   max: 10 }, unit: "percent", naturalRangeVerified: false },
  { stat: "debuffDurationBonus",      socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "additionalMemoryCapacity", socketRange: { min: 2,   max: 3   }, naturalRange: { min: 2,   max: 3  }, unit: "flat",    naturalRangeVerified: false },
  { stat: "magicalInteractionSpeed",  socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "projectileDamageReduction",socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "cooldownReductionBonus",   socketRange: { min: 2,   max: 3.2 }, naturalRange: { min: 2,   max: 4  }, unit: "percent", naturalRangeVerified: false },
  { stat: "magicalHealing",           socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "physicalHealing",          socketRange: { min: 1,   max: 1   }, naturalRange: { min: 1,   max: 1  }, unit: "flat" },
  { stat: "undeadDamageReduction",    socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "physicalDamageReduction",  socketRange: { min: 1.5, max: 2.4 }, naturalRange: { min: 1.5, max: 3  }, unit: "percent", exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "additionalArmorRating",    socketRange: { min: 15,  max: 24  }, naturalRange: { min: 15,  max: 30 }, unit: "flat",    exclusionGroup: "ar_pdr", naturalRangeVerified: false },
  { stat: "regularInteractionSpeed",  socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
  { stat: "buffDurationBonus",        socketRange: { min: 3,   max: 4.8 }, naturalRange: { min: 3,   max: 6  }, unit: "percent", naturalRangeVerified: false },
];

export const MODIFIER_POOLS = Object.freeze({
  weapon_twoHanded,
  weapon_oneHanded,
  chest,
  hands,
  head,
  legs,
  feet,
  back,
  ring,
  necklace,
});

// ── Pool dispatch (slotType, handType → poolKey) ─────────────────────
//
// Deterministic lookup from an item's (slotType, handType) to the pool
// that governs its legal modifiers. Returns `null` when no pool applies
// (e.g., unknown slotType). Validator treats `null` as an error.

const POOL_KEY_BY_SLOT_TYPE = Object.freeze({
  head:     "head",
  chest:    "chest",
  back:     "back",
  hands:    "hands",
  legs:     "legs",
  feet:     "feet",
  ring:     "ring",
  necklace: "necklace",
});

/**
 * Resolve pool key for an item.
 *   primaryWeapon → `weapon_twoHanded` | `weapon_oneHanded` (per handType)
 *   secondaryWeapon → `weapon_oneHanded` (shared per L2.2 + coordinator
 *     approval; future evidence may reveal a distinct secondary pool)
 *   armor / accessory → per-slot pool
 */
export function resolvePoolKey(slotType, handType) {
  if (slotType === "primaryWeapon") {
    return handType === "twoHanded" ? "weapon_twoHanded" : "weapon_oneHanded";
  }
  if (slotType === "secondaryWeapon") {
    return "weapon_oneHanded";
  }
  return POOL_KEY_BY_SLOT_TYPE[slotType] ?? null;
}
