// AttributesPanel — shows the 7 CORE_ATTRS from the post-effects finalAttrs
// and highlights deltas from the class baseStats.

// TODO(Phase 2): hover-over each attribute to see the full breakdown
// ("base 11, gear inherent +3, gear mods +2, Power of Sacrifice +15").
// Pipeline emits the trace that feeds this (see effect-pipeline.js).

import { STAT_META } from '../../data/stat-meta.js';
import { Panel } from '../ui/Panel.jsx';

const ORDER = ["str", "vig", "agi", "dex", "wil", "kno", "res"];

export function AttributesPanel({ attrs, base }) {
  return (
    <Panel title="Attributes">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
        {ORDER.map(key => (
          <AttrCell key={key} label={STAT_META[key].label} value={attrs[key]} base={base[key]} />
        ))}
      </div>
    </Panel>
  );
}

function AttrCell({ label, value, base }) {
  const delta = value - base;
  const isDecimal = Math.abs(value - Math.round(value)) > 0.001;
  return (
    <div style={{
      padding: "6px 8px", background: "var(--sim-surface-ink-raised)",
      border: "1px solid var(--sim-border-hairline)", borderRadius: 3,
    }}>
      <div style={{ fontSize: 9, color: "var(--sim-text-whisper)", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--sim-text-primary)" }}>
        {isDecimal ? value.toFixed(2) : value}
        {Math.abs(delta) > 0.01 && (
          <span style={{ fontSize: 9, marginLeft: 5, color: delta > 0 ? "var(--sim-accent-verdant-life)" : "var(--sim-accent-blood-wound)" }}>
            ({base})
          </span>
        )}
      </div>
    </div>
  );
}
