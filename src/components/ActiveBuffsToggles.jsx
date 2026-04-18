// ActiveBuffsToggles — renders a toggle for each available ability
// whose activation marks persistent state (`cast_buff` or `toggle`).
// Cast (one-shot) abilities never appear here — they produce damage
// projections but do not contribute state.
//
// Rendering is data-derived per perspective.md § 6: we walk the class
// data, filter by activation + availability, produce rows. No
// class-aware branching.

import { findAbilityById } from "../ui/uiSurfaceRules.js";
import { toggleActiveBuff } from "../ui/defaultBuildState.js";

const STATEFUL_ACTIVATIONS = new Set(["cast_buff", "toggle"]);

export function ActiveBuffsToggles({ classData, buildState, setBuildState }) {
  if (!classData) return null;

  // Ability is a candidate for a live "active-buffs" toggle if it's
  // selected OR currently granted+available. Phase 7 simplification —
  // we walk selectedPerks/Skills/Spells plus anything in activeBuffs
  // that's not in those (covers the granted-via-toggle case).
  const sel = buildState.character.persistentSelections;
  const allSelected = new Set([
    ...(sel.selectedPerks ?? []),
    ...(sel.selectedSkills ?? []),
    ...(sel.selectedSpells ?? []),
    ...(buildState.session.activeBuffs ?? []),
  ]);

  const toggleables = [];
  for (const id of allSelected) {
    const ab = findAbilityById(classData, id);
    if (!ab) continue;
    if (STATEFUL_ACTIVATIONS.has(ab.activation)) toggleables.push(ab);
  }
  toggleables.sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p7-panel">
      <h2>Active Buffs</h2>
      {toggleables.length === 0 && (
        <div className="p7-mini">No toggleable abilities selected.</div>
      )}
      {toggleables.map((ab) => {
        const isActive = buildState.session.activeBuffs.includes(ab.id);
        return (
          <label key={ab.id} className="p7-ability-row" title={ab.desc ?? ""}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={() => setBuildState((s) => toggleActiveBuff(s, ab.id))}
            />
            <span className="p7-name">{ab.name}</span>
            <span className="p7-tag">{ab.activation}</span>
          </label>
        );
      })}
    </div>
  );
}
