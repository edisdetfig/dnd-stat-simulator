// AbilityRow — shared row for Perks / Skills / Spells panels.
//
// Renders:
//   - selection checkbox
//   - name (+ tier pill if present, + optional "granted" pill for
//     spells made available via grantsSpells)
//   - optional stacking control with authored label + per-stack summary
//
// The per-ability "on/off" toggle (activation: "toggle") and the
// "either"-target self/enemy checkboxes live in the Active Buffs panel.

export function AbilityRow({ ability, selected, onToggle, stacks, setStacks, grantedLabel }) {
  const stacking = ability.stacking;
  const showStacking = setStacks && selected && stacking;
  return (
    <div style={{
      padding: "4px 6px", borderBottom: "1px solid var(--sim-border-whisper)",
      fontSize: 11,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <span style={{ flex: 1, color: selected ? "var(--sim-text-primary)" : "var(--sim-text-muted)" }}>
          {ability.name}
          {ability.tier != null && (
            <span style={{ fontSize: 9, marginLeft: 6, color: "var(--sim-text-whisper)" }}>T{ability.tier}</span>
          )}
          {grantedLabel && (
            <span style={{ fontSize: 9, marginLeft: 6, color: "var(--sim-accent-arcane-pale)", fontStyle: "italic" }}>
              {grantedLabel}
            </span>
          )}
        </span>
        {showStacking && (
          <StackControl
            label={stacking.label ?? "Stacks"}
            max={stacking.maxStacks}
            value={stacks}
            onChange={setStacks}
          />
        )}
      </div>
      {showStacking && stacking.effectSummary && (
        <div style={{
          fontSize: 9, color: "var(--sim-text-whisper)",
          marginLeft: 24, marginTop: 2, fontStyle: "italic",
        }}>
          per stack: {stacking.effectSummary}
        </div>
      )}
    </div>
  );
}

function StackControl({ label, max, value, onChange }) {
  return (
    <label style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 9, color: "var(--sim-text-whisper)",
      letterSpacing: "0.05em", textTransform: "uppercase",
    }}>
      {label}
      <input type="number" min={0} max={max} step={1}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))}
        // TODO(Phase 2): Warlock darkness-shard sources (Soul Collector,
        // Spell Predation, Blood Pact) share an in-game 3-shard cap
        // across all sources; the engine tracks each independently.
        title={`${label} (0–${max})`}
        style={{
          width: 36, fontSize: 10, background: "var(--sim-surface-input)",
          border: "1px solid var(--sim-border-hairline)", color: "var(--sim-text-primary)",
          borderRadius: 2, textAlign: "center", textTransform: "none", letterSpacing: "normal",
        }}
      />
    </label>
  );
}
