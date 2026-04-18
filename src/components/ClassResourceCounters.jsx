// ClassResourceCounters — data-derived per perspective.md § 6. A
// counter for resource R renders iff BOTH:
//   (a) any available ability references `resource: R` in any atom, AND
//   (b) R's own `condition` evaluates true against the current
//       UI-side ctx (Phase 7 Decision #4 Option F — a minimal ctx
//       composed from Session + Snapshot fed through the engine's
//       exported `evaluateCondition`).
//
// This mirrors the engine's rule that a resource counter is UI-gated
// by both its declaration condition and whether anything actually uses it.

import {
  buildResourceRefs,
  buildConditionCtxForUi,
  classResourceConditionPasses,
} from "../ui/uiSurfaceRules.js";
import { setClassResourceCount } from "../ui/defaultBuildState.js";

export function ClassResourceCounters({ classData, buildState, setBuildState, snapshot }) {
  const resources = classData?.classResources;
  if (!resources || !snapshot) return null;

  const refs = buildResourceRefs(classData, snapshot.availableAbilityIds ?? []);
  if (refs.size === 0) return null;

  const uiCtx = buildConditionCtxForUi({
    character: buildState.character,
    session:   buildState.session,
    snapshot,
    classData,
  });

  const visibleIds = [];
  for (const resId of refs) {
    const def = resources[resId];
    if (!def) continue;
    if (!classResourceConditionPasses(def, uiCtx)) continue;
    visibleIds.push(resId);
  }
  if (visibleIds.length === 0) return null;

  const counters = buildState.session.classResourceCounters ?? {};

  return (
    <div className="p7-panel">
      <h2>Class Resources</h2>
      {visibleIds.map((resId) => {
        const def = resources[resId];
        const value = counters[resId] ?? 0;
        const max = def.maxStacks ?? 0;
        return (
          <div key={resId} style={{ marginBottom: 8 }} title={def.desc ?? ""}>
            <div className="p7-row">
              <span className="p7-label">{resId}</span>
              <span className="p7-value">
                <button
                  type="button"
                  disabled={value <= 0}
                  onClick={() => setBuildState((s) => setClassResourceCount(s, resId, Math.max(0, value - 1)))}
                >
                  −
                </button>
                <span style={{ display: "inline-block", width: 30, textAlign: "center" }}>{value}/{max}</span>
                <button
                  type="button"
                  disabled={value >= max}
                  onClick={() => setBuildState((s) => setClassResourceCount(s, resId, Math.min(max, value + 1)))}
                >
                  +
                </button>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
