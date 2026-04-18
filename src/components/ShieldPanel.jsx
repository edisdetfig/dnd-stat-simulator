// ShieldPanel — one row per ShieldProjection.

import { findAbilityById } from "../ui/uiSurfaceRules.js";

function fmt(v) {
  if (v == null) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function abilityName(classData, abilityId) {
  const a = findAbilityById(classData, abilityId);
  return a?.name ?? abilityId;
}

export function ShieldPanel({ snapshot, classData }) {
  const projections = snapshot.shieldProjections ?? [];

  return (
    <div className="p7-panel">
      <h2>Shield · {projections.length}</h2>
      {projections.length === 0 && (
        <div className="p7-mini">No shield projections.</div>
      )}
      {projections.map((p) => {
        const { atomId, source, damageFilter, absorbAmount, duration } = p;
        return (
          <div key={atomId} className="p7-proj">
            <div className="p7-proj-head">
              <span className="p7-proj-ability">{abilityName(classData, source.abilityId)}</span>
              <span className="p7-proj-type">{damageFilter ?? "all damage"}</span>
            </div>
            <div className="p7-proj-numbers">
              <span>Absorb <b>{fmt(absorbAmount)}</b></span>
              {duration != null && <span>· {duration}s</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
