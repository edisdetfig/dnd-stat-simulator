// AbilityRow — shared row for Perks / Skills / Spells panels.
//
// Renders:
//   - selection checkbox
//   - name (+ tier pill if present, + optional "granted" pill for
//     spells made available via grantsSpells)
//   - optional stack count input for stacking abilities
//
// The per-ability "on/off" toggle (activation: "toggle") and the
// "either"-target self/enemy checkboxes live in the Active Buffs panel
// — not here — to keep selection vs activation visually distinct.

export function AbilityRow({ ability, selected, onToggle, stacks, setStacks, grantedLabel }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "4px 6px", borderBottom: "1px solid var(--sim-border-whisper)", fontSize: 11,
    }}>
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
      {setStacks && selected && (
        <input type="number" min={0} max={ability.stacking.maxStacks} step={1}
          value={stacks}
          onChange={(e) => setStacks(Math.max(0, Math.min(ability.stacking.maxStacks, parseInt(e.target.value) || 0)))}
          // TODO(Phase 2): Warlock darkness-shard sources (Soul Collector,
          // Spell Predation, Blood Pact) share an in-game 3-shard cap
          // across all sources, but the engine tracks each independently.
          // Add a tooltip here noting the shared cap so users don't
          // silently over-allocate.
          title={`Stacks (0–${ability.stacking.maxStacks})`}
          style={{ width: 36, fontSize: 10, background: "var(--sim-surface-input)",
            border: "1px solid var(--sim-border-hairline)", color: "var(--sim-text-primary)",
            borderRadius: 2, textAlign: "center" }}
        />
      )}
    </div>
  );
}
