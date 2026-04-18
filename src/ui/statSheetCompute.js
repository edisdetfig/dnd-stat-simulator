// Pure display-layer helpers for StatSheetPanel. Extracted so they
// can be unit-tested without JSDOM.
//
// All functions are class-agnostic: they read the engine's Snapshot /
// normalized-Build shape and produce display-ready values. They never
// branch on class id, ability id, or specific stat identity (outside
// the narrow move-speed special case, which is a verified-constant
// of the D&D Season 8 patch, not class data).

// Derived-stat ids whose value is a fraction/percent. Phase 7 heuristic —
// Phase 11 should replace with a proper unit metadata on each recipe
// (see DERIVED_DISPLAY which carries no unit info today). Note the
// deliberate exclusion of `moveSpeed`: engine output is a flat delta
// added to a verified base of 300 (docs/season8_constants.md:59).
export const PERCENT_DERIVED = new Set([
  "pdr", "mdr", "ppb", "mpb", "cdr",
  "actionSpeed", "spellCastingSpeed",
  "regularInteractionSpeed", "magicalInteractionSpeed",
  "buffDuration", "debuffDuration",
  "memoryRecovery", "magicalHealing", "physicalHealing",
  "armorPenetration", "magicPenetration",
  "headshotDamageBonus", "headshotDamageReduction",
  "projectileDamageReduction",
]);

// Move Speed baseline — per `docs/season8_constants.md:59`:
//   "Final Move Speed = 300 + MoveSpeed(curve) + gear move mods"
// The engine's `derivedStats.moveSpeed.value` is the delta (curve +
// mods) — the display adds the 300 constant to surface the final value
// the user actually moves at. Cap is 330, enforced by the recipe and
// exposed on the entry as `.cap`.
export const MOVE_SPEED_BASE = 300;

export function formatValue(id, v) {
  if (v == null) return "—";
  if (PERCENT_DERIVED.has(id)) return `${(v * 100).toFixed(1)}%`;
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

// Special-case display for `moveSpeed`. The engine returns a delta; the
// user-visible value is `300 + delta`. `cap` on the derivedStats entry
// remains the absolute 330 and is surfaced directly.
export function formatMoveSpeed(entry) {
  if (!entry) return { final: null, cap: null };
  const delta = entry.value ?? 0;
  const final = MOVE_SPEED_BASE + delta;
  return { final, cap: entry.cap ?? null, delta };
}

// Compute the effective attribute after the engine's Stage 4
// `attribute_multiplier` phase (engine_architecture.md § 7):
//   attribute_final = attribute_flat × (1 + sum(attribute_multiplier contribs))
//
// `flatBase` is the normalizer's post-gear attribute value
// (character + gear additive). `bonusesForAttr` is
// `snapshot.bonuses[attrId]` — a `Record<Phase, number>` per
// `engine/aggregate.js`, where each phase key holds the summed
// contribution. The `attribute_multiplier` phase entry is a scalar;
// we also tolerate an object form (future-proofing).
export function effectiveAttribute(flatBase, bonusesForAttr) {
  const raw = bonusesForAttr?.attribute_multiplier;
  const multSum = typeof raw === "number"
    ? raw
    : raw && typeof raw === "object"
      ? Object.values(raw).reduce((s, v) => s + (Number(v) || 0), 0)
      : 0;
  const value = (flatBase ?? 0) * (1 + multSum);
  return { value, multiplier: multSum };
}
