// AbilityRow — shared row for Perks / Skills / Spells panels.
//
// Renders:
//   - selection checkbox
//   - name with desc-tooltip on hover (+ tier pill if present, +
//     optional "granted" pill for spells made available via grantsSpells)
//   - optional stacking control. When the ability's stacking block
//     carries `desc`, the string is both the input's hover tooltip and
//     rendered as an italic sub-line beneath the row.
//
// Spec rule: every human-readable display string is authored as `desc`.
// One field name, one rule (applies here via ability.desc and
// ability.stacking.desc).

import { HoverTip } from '../ui/HoverTip.jsx';

export function AbilityRow({ ability, selected, onToggle, stacks, setStacks, grantedLabel }) {
  const stacking = ability.stacking;
  const showStacking = setStacks && selected && stacking;
  const stackDesc = stacking?.desc;
  return (
    <div style={{
      padding: "4px 6px", borderBottom: "1px solid var(--sim-border-whisper)",
      fontSize: 11,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <span style={{ flex: 1, color: selected ? "var(--sim-text-primary)" : "var(--sim-text-muted)" }}>
          <HoverTip title={ability.name} text={ability.desc}>
            <span style={{ cursor: ability.desc ? "help" : "default" }}>
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
          </HoverTip>
        </span>
        {showStacking && (
          <StackControl
            max={stacking.maxStacks}
            value={stacks}
            onChange={setStacks}
            desc={stackDesc}
          />
        )}
      </div>
      {showStacking && stackDesc && (
        <div style={{
          fontSize: 9, color: "var(--sim-text-whisper)",
          marginLeft: 24, marginTop: 2, fontStyle: "italic",
        }}>
          {stackDesc}
        </div>
      )}
    </div>
  );
}

function StackControl({ max, value, onChange, desc }) {
  return (
    <input type="number" min={0} max={max} step={1}
      value={value}
      onChange={(e) => onChange(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))}
      // TODO(Phase 2): Warlock darkness-shard sources (Soul Collector,
      // Spell Predation, Blood Pact) share an in-game 3-shard cap across
      // all sources; the engine tracks each independently.
      title={desc ?? `Stacks (0–${max})`}
      style={{
        width: 36, fontSize: 10, background: "var(--sim-surface-input)",
        border: "1px solid var(--sim-border-hairline)", color: "var(--sim-text-primary)",
        borderRadius: 2, textAlign: "center",
      }}
    />
  );
}
