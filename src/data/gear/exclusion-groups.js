// exclusion-groups.js
//
// Modifier exclusion rules — verbatim transcription of
// `docs/session-prompts/gear-shape-design.md § 4.6`, extended with commentary
// on the other modifier "families" the wiki lists (gear-wiki-facts.md § 9.6).
//
// Three rules stacked:
//   1. `generalRule: "inherent_blocks_self"` — default for every stat.
//      Inherent stat S → S cannot be socketed on the same item, unless the
//      item's `socketExclusionOverrides[]` lists S (per-item override).
//   2. Exclusion groups — at most one group member per item (across inherent
//      + modifiers). Members compete for one slot.
//   3. Dominant-blocker within a group — if the item's inherent is the
//      group's `dominantBlocker`, the entire group is blocked (no member may
//      be socketed). If the item's inherent is a non-dominant member, the
//      group stays available for socketing the other member.
//
// Stat-name namespace note. Per OQ-D4, exclusion-group member names follow
// §4.3 bare-name forms (`physicalDamageReduction`, not `...Bonus`). Validators
// consult `MODIFIER_POOL_STAT_ALIASES` from modifier-pools.js when needed.

export const EXCLUSION_GROUPS = Object.freeze({
  ar_pdr: Object.freeze({
    id: "ar_pdr",
    members: Object.freeze(["additionalArmorRating", "physicalDamageReduction"]),
    dominantBlocker: "physicalDamageReduction",
    description:
      "Armor Rating Add vs Physical Damage Reduction — at most one per item. " +
      "Inherent PDR blocks the entire group; inherent AR leaves PDR-socket available.",
  }),
});

// ── Wiki families (gear-wiki-facts.md § 9.6) — commentary only ────────
//
// The wiki enumerates 4 "modifier families" (mutually-exclusive socketing
// pairs). Only `ar_pdr` is authored above as a live Season-8 group. Others:
//
//   - `additionalPhysicalDamage` / True Physical Damage — True Physical
//     Damage affixes removed in Season 8 (season8_constants.md:78-80), so
//     this family is currently defunct on gear. Spiked Gauntlet's inherent
//     +1 true physical uses `onHitEffects[]` routing (OQ-D6), not the
//     affix pool; no exclusion concern for it.
//
//   - `maxHealth` / `maxHealthBonus` — `maxHealthBonus` removed from
//     equipment pools in Season 8 (season8_constants.md:76). Currently a
//     single-member family on gear; no active exclusion required.
//
//   - `moveSpeed` / `moveSpeedBonus` — family member socketability
//     UNRESOLVED per gear-wiki-facts.md § 15 item 7 / § 9.6. Wiki-sourced
//     family; neither appears in the reviewed §4.5 per-slot pools; safe
//     treatment is never-socketable (see never-socketable list below).
//     Promote to a live exclusion group only if either becomes socketable
//     in a future hotfix.
//
// If any of the above become live affix pairs in a future season, add them
// as additional entries to EXCLUSION_GROUPS.

// ── Never-socketable stats (§4.6 observation + wiki confirmation) ─────
//
// Stats that appear only as inherents (or not at all as user-rolled), never
// in any socket pool. Validator rule `D.neverSocketable` prevents any
// `socketExclusionOverrides[]` from attempting to expose these for socketing.

export const NEVER_SOCKETABLE_STATS = Object.freeze(new Set([
  "headshotDamageReduction",  // inherent-only on head (§4.6)
  "moveSpeed",                // inherent-only (§4.6)
  "moveSpeedBonus",           // wiki family partner; never in any reviewed pool
  "maxHealth",                // inherent-only on necklace (§4.6)
  "maxHealthBonus",           // removed from equipment pools in Season 8
]));

/**
 * Resolve an exclusion group by one of its member stat ids. Returns the
 * group record, or `null` if the stat is not part of any exclusion group.
 */
export function findExclusionGroupForStat(statId) {
  for (const group of Object.values(EXCLUSION_GROUPS)) {
    if (group.members.includes(statId)) return group;
  }
  return null;
}
