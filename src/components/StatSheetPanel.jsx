// StatSheetPanel — renders the Snapshot's derived stats + the
// post-gear attributes. Purely a presentation of engine output; no
// class-aware logic. Class-agnostic per LOCK J.
//
// Attributes:
//   - `flatBuild.attributes` holds the normalizer's post-gear additive
//     base (character + gear). The `attribute_multiplier` phase (engine
//     §7) — e.g. Malice's `wil: +0.15` — lives in
//     `snapshot.bonuses[attr].attribute_multiplier` and is applied here
//     so the user sees the post-multiplier effective value.
//
// Derived stats:
//   - Rendered in the Snapshot's natural key order (no hand-curated
//     ordering list; Phase 11 can impose one if desired).
//   - Each row shows { label, value, (cap if present), (raw if capped) }.
//   - `moveSpeed` is special-cased per `docs/season8_constants.md:59`:
//     the engine outputs a delta, display surfaces `300 + delta` against
//     the cap of 330.

import { DERIVED_DISPLAY, STAT_META } from "../data/stat-meta.js";
import {
  PERCENT_DERIVED,
  formatValue,
  formatMoveSpeed,
  effectiveAttribute,
} from "../ui/statSheetCompute.js";

const ATTR_ORDER = ["str", "vig", "agi", "dex", "wil", "kno", "res"];

function labelFor(id) {
  return DERIVED_DISPLAY[id]?.short ?? id;
}

export function StatSheetPanel({ snapshot, flatBuild }) {
  // flatBuild.klass is the resolved class object (normalizeBuild populates it
  // from classData); baseAttributes lives there directly.
  const baseAttrs = flatBuild.klass?.baseAttributes ?? {};

  const derivedIds = Object.keys(snapshot.derivedStats).sort();

  return (
    <div className="p7-panel">
      <h2>Stat Sheet</h2>

      <div style={{ marginBottom: 10 }}>
        <div className="p7-mini" style={{ marginBottom: 4 }}>Attributes</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {ATTR_ORDER.map((a) => {
            const flatBase = flatBuild.attributes[a] ?? 0;
            const base = baseAttrs[a] ?? 0;
            const gearDelta = flatBase - base;

            const { value: effective, multiplier } = effectiveAttribute(
              flatBase,
              snapshot.bonuses?.[a],
            );

            const meta = STAT_META[a];
            const displayValue = multiplier !== 0
              ? effective.toFixed(1)
              : String(flatBase);

            return (
              <div
                key={a}
                title={
                  multiplier !== 0
                    ? `base ${flatBase} × (1 + ${(multiplier * 100).toFixed(0)}%) = ${effective.toFixed(2)}`
                    : undefined
                }
                style={{ textAlign: "center", padding: "4px 2px", background: "#0b0b11", border: "1px solid var(--hairline)", borderRadius: 3 }}
              >
                <div className="p7-mini">{meta?.label ?? a.toUpperCase()}</div>
                <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{displayValue}</div>
                {gearDelta !== 0 && (
                  <div className={gearDelta > 0 ? "p7-positive" : "p7-negative"} style={{ fontSize: 10 }}>
                    {gearDelta > 0 ? "+" : ""}{gearDelta}
                  </div>
                )}
                {multiplier !== 0 && (
                  <div className="p7-positive" style={{ fontSize: 10 }}>
                    ×{(1 + multiplier).toFixed(2)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="p7-mini" style={{ marginBottom: 4 }}>Derived</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 10px" }}>
        {derivedIds.map((id) => {
          const entry = snapshot.derivedStats[id];
          if (!entry) return null;

          // moveSpeed special case: display 300 + delta with cap 330.
          if (id === "moveSpeed") {
            const { final, cap, delta } = formatMoveSpeed(entry);
            return (
              <div key={id} className="p7-row">
                <span className="p7-label" title="300 + curve + gear mods (docs/season8_constants.md)">{labelFor(id)}</span>
                <span className="p7-value" title={`delta ${delta >= 0 ? "+" : ""}${delta}`}>
                  {final}{cap != null && <span className="p7-mini"> / {cap}</span>}
                </span>
              </div>
            );
          }

          const { value, rawValue, cap } = entry;
          const atCap = cap != null && rawValue != null && rawValue > cap;
          return (
            <div key={id} className="p7-row">
              <span className="p7-label" title={DERIVED_DISPLAY[id]?.full ?? id}>{labelFor(id)}</span>
              <span className="p7-value">
                {formatValue(id, value)}
                {atCap && (
                  <span className="p7-mini" title={`raw ${formatValue(id, rawValue)} / cap ${formatValue(id, cap)}`}> *</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
