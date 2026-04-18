// EitherTargetToggles — per engine §6.1 target routing: atoms with
// `target: "either"` require per-ability applyToSelf / applyToEnemy
// toggles. The UI surfaces these only for abilities whose atom shape
// contains at least one `target: "either"` atom.

import {
  findAbilityById,
  abilityHasEitherTarget,
} from "../ui/uiSurfaceRules.js";
import {
  setApplyToSelf,
  setApplyToEnemy,
} from "../ui/defaultBuildState.js";

export function EitherTargetToggles({ classData, buildState, setBuildState, snapshot }) {
  if (!classData || !snapshot) return null;

  const candidates = [];
  for (const id of snapshot.availableAbilityIds ?? []) {
    const a = findAbilityById(classData, id);
    if (abilityHasEitherTarget(a)) candidates.push(a);
  }
  if (candidates.length === 0) return null;

  const applySelf = buildState.session.applyToSelf ?? {};
  const applyEnemy = buildState.session.applyToEnemy ?? {};

  return (
    <div className="p7-panel">
      <h2>Target · Either</h2>
      <div className="p7-mini" style={{ marginBottom: 6 }}>
        Route an ability's either-target atoms into Self / Enemy / both / neither.
      </div>
      {candidates.map((a) => {
        // Engine default (aggregate.js): applyToSelf=true, applyToEnemy=false
        // when unspecified. The UI reflects that default.
        const sOn = applySelf[a.id] ?? true;
        const eOn = applyEnemy[a.id] ?? false;
        return (
          <div key={a.id} style={{ marginBottom: 6 }}>
            <div style={{ marginBottom: 2 }}>{a.name}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={sOn}
                  onChange={() => setBuildState((st) => setApplyToSelf(st, a.id, !sOn))}
                />
                <span className="p7-mini">Self</span>
              </label>
              <label style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={eOn}
                  onChange={() => setBuildState((st) => setApplyToEnemy(st, a.id, !eOn))}
                />
                <span className="p7-mini">Enemy</span>
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
