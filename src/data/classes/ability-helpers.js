// ability-helpers — the single authoritative place that knows which
// fields of a class-data object hold abilities.
//
// The class shape (src/data/classes/class-shape.js) stores abilities in
// four parallel containers: `perks[]`, `skills[]`, `spells[]`, and
// `mergedSpells[]` (the last is Sorcerer-specific forward-spec). There
// is NO flat `abilities[]` field — any consumer that references
// `classData.abilities` is reaching for a field that does not exist.
//
// Before this helper existed, multiple sites (buildContext, conditions,
// collectAtoms, runSnapshot, filterByConditions, uiSurfaceRules) each
// re-invented a private `lookupAbility` that iterated the four
// containers. Consolidating them into this helper eliminates a bug
// class: "a new consumer assumes `classData.abilities` exists and
// silently no-ops against real data".

export const ABILITY_CONTAINERS = Object.freeze([
  "perks",
  "skills",
  "spells",
  "mergedSpells",
]);

/**
 * Look an ability up by id across every container on a class-data
 * object. Returns `null` when `classData` is nullish, when no container
 * is an array, or when no container contains the id.
 *
 * If the same id appears in more than one container (authoring error —
 * the class-shape validator rejects it), the first match wins in
 * container order: perks → skills → spells → mergedSpells.
 */
export function findAbility(classData, abilityId) {
  if (!classData || !abilityId) return null;
  for (const section of ABILITY_CONTAINERS) {
    const list = classData[section];
    if (!Array.isArray(list)) continue;
    const match = list.find((a) => a?.id === abilityId);
    if (match) return match;
  }
  return null;
}

/**
 * Flat, read-only view of every ability across every container. Useful
 * for iteration contexts (e.g., armor-proficiency folding, grants
 * indexing) where the container boundary is irrelevant. Returns an
 * empty array for nullish `classData` and drops any container that
 * is not an array.
 *
 * Order mirrors `ABILITY_CONTAINERS`: perks first, then skills, then
 * spells, then mergedSpells — stable and predictable for diffing.
 */
export function getAllAbilities(classData) {
  if (!classData) return [];
  const out = [];
  for (const section of ABILITY_CONTAINERS) {
    const list = classData[section];
    if (!Array.isArray(list)) continue;
    for (const ab of list) {
      if (ab) out.push(ab);
    }
  }
  return out;
}
