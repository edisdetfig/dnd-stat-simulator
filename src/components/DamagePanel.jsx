// DamagePanel — one row per DamageProjection. Groups locations (body /
// head / limb) in-row; inlines any `derivedHeal` (lifesteal or
// targetMaxHp-derived) under the damage for visual correlation.
//
// Per LOCK J, no class-specific branching — everything is data-driven
// off the DamageProjection shape (engine_architecture.md §4).

import { findAbilityById } from "../ui/uiSurfaceRules.js";

function fmt(v) {
  if (v == null) return null;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function abilityName(classData, abilityId) {
  const a = findAbilityById(classData, abilityId);
  return a?.name ?? abilityId;
}

export function DamagePanel({ snapshot, classData }) {
  const projections = snapshot.damageProjections ?? [];

  return (
    <div className="p7-panel">
      <h2>Damage · {projections.length}</h2>
      {projections.length === 0 && (
        <div className="p7-mini">No damage projections. Select a damage-producing ability.</div>
      )}
      {projections.map((p) => {
        const { atomId, source, damageType, hit, derivedHeal, isDot, tickRate, duration, count } = p;
        const { body, head, limb } = hit ?? {};
        return (
          <div key={atomId} className="p7-proj">
            <div className="p7-proj-head">
              <span className="p7-proj-ability">{abilityName(classData, source.abilityId)}</span>
              <span className="p7-proj-type">{damageType}</span>
            </div>
            <div className="p7-proj-numbers">
              {body != null && <span>Body <b>{fmt(body)}</b>{isDot && "/tick"}</span>}
              {head != null && <span>Head <b>{fmt(head)}</b>{isDot && "/tick"}</span>}
              {limb != null && <span>Limb <b>{fmt(limb)}</b>{isDot && "/tick"}</span>}
              {count != null && count > 1 && <span>×{count}</span>}
            </div>
            {isDot && (
              <div className="p7-mini">
                DoT · {tickRate ? `${tickRate}s tick` : ""} {duration ? ` · ${duration}s total` : ""}
              </div>
            )}
            {derivedHeal && (
              <div className="p7-proj-derived">
                ↪ {derivedHeal.derivedFrom?.kind === "lifesteal" ? "Lifesteal" : "Heal"}
                {" "}<b>{fmt(derivedHeal.amount)}</b> {derivedHeal.healType}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
