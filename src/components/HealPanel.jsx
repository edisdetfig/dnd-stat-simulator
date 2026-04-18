// HealPanel — one row per HealProjection. Includes lifesteal-derived
// heals (same projections as DamagePanel's inlined derivedHeal, surfaced
// standalone here so a user looking at "everything that heals me" sees
// them in one place).

import { findAbilityById } from "../ui/uiSurfaceRules.js";

function fmt(v) {
  if (v == null) return "—";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function abilityName(classData, abilityId) {
  const a = findAbilityById(classData, abilityId);
  return a?.name ?? abilityId;
}

export function HealPanel({ snapshot, classData }) {
  const projections = snapshot.healProjections ?? [];

  return (
    <div className="p7-panel">
      <h2>Heal · {projections.length}</h2>
      {projections.length === 0 && (
        <div className="p7-mini">No heal projections.</div>
      )}
      {projections.map((p) => {
        const { atomId, source, healType, amount, isHot, tickRate, duration, derivedFrom } = p;
        return (
          <div key={atomId + (derivedFrom?.kind ?? "")} className="p7-proj">
            <div className="p7-proj-head">
              <span className="p7-proj-ability">{abilityName(classData, source.abilityId)}</span>
              <span className="p7-proj-type">{healType}{derivedFrom ? " · " + derivedFrom.kind : ""}</span>
            </div>
            <div className="p7-proj-numbers">
              <span>Amount <b>{fmt(amount)}</b></span>
            </div>
            {isHot && (
              <div className="p7-mini">
                HoT · {tickRate ? `${tickRate}s tick` : ""} {duration ? ` · ${duration}s total` : ""}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
