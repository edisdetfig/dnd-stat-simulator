// damageTypeToHealType — family-collapse from DAMAGE_ATOM.damageType to
// HEAL_ATOM.healType. Used by projectDamage when emitting derived-heal
// descriptors for lifestealRatio / targetMaxHpRatio (engine_architecture.md
// §16.2 + §16.4; vocabulary.md §3.2; implementation plan §3.12).
//
// Rule: "physical" → "physical"; any magical subtype → "magical".
// The 12 magical subtypes collapse to a single "magical" healType because
// HEAL_ATOM.healType only distinguishes physical vs magical (the magical
// subtypes matter for damage dispatch, not for heal routing).
//
// An unknown damageType is a runtime engine bug (validator D.damageType
// enforces DAMAGE_TYPES membership at authoring time). Fail loudly.

import { DAMAGE_TYPES } from '../data/constants.js';

export function damageTypeToHealType(damageType) {
  if (damageType === "physical") return "physical";
  if (DAMAGE_TYPES.has(damageType)) return "magical";
  throw new Error(
    `damageTypeToHealType: unknown damageType ${JSON.stringify(damageType)} — not in DAMAGE_TYPES`
  );
}
