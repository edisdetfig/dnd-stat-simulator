// ViewingAfterEffectToggles — one checkbox per available ability that
// has a non-trivial `afterEffect`. Checking a box enters
// "view post-effect state" mode for that ability — per engine §14
// LOCK 5, the main-state atoms drop out and the afterEffect atoms
// contribute instead.

import {
  findAbilityById,
  abilityHasNonTrivialAfterEffect,
} from "../ui/uiSurfaceRules.js";
import { toggleViewingAfterEffect } from "../ui/defaultBuildState.js";

export function ViewingAfterEffectToggles({ classData, buildState, setBuildState, snapshot }) {
  if (!classData || !snapshot) return null;

  const candidates = [];
  for (const id of snapshot.availableAbilityIds ?? []) {
    const a = findAbilityById(classData, id);
    if (abilityHasNonTrivialAfterEffect(a)) candidates.push(a);
  }
  if (candidates.length === 0) return null;

  return (
    <div className="p7-panel">
      <h2>After-Effect View</h2>
      <div className="p7-mini" style={{ marginBottom: 6 }}>
        Swap an ability's main-state for its after-effect projection.
      </div>
      {candidates.map((a) => {
        const on = (buildState.session.viewingAfterEffect ?? []).includes(a.id);
        return (
          <label key={a.id} className="p7-ability-row" title={a.desc ?? ""}>
            <input
              type="checkbox"
              checked={on}
              onChange={() => setBuildState((s) => toggleViewingAfterEffect(s, a.id))}
            />
            <span className="p7-name">{a.name}</span>
          </label>
        );
      })}
    </div>
  );
}
