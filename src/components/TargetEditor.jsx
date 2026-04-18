// TargetEditor — numeric inputs for target.pdr / mdr / headshotDR.
// Display is percent (e.g. "-22"); internal is decimal (-0.22).
// Presets for common Dark and Darker target profiles are kept simple
// for Phase 7 scope — a single Training Dummy preset.

const PRESETS = [
  { label: "Training Dummy", pdr: -0.22, mdr: 0.06, headshotDR: 0 },
  { label: "Unarmored",      pdr: 0,     mdr: 0,    headshotDR: 0 },
  { label: "Plate Squishy",  pdr: 0.50,  mdr: 0.20, headshotDR: 0.10 },
];

function PctInput({ value, onChange }) {
  const display = Math.round((value ?? 0) * 1000) / 10; // 1 decimal place for %.
  return (
    <input
      type="number"
      step={1}
      value={display}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
    />
  );
}

export function TargetEditor({ target, onChange }) {
  return (
    <div className="p7-panel">
      <h2>Target</h2>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              onChange("pdr", p.pdr);
              onChange("mdr", p.mdr);
              onChange("headshotDR", p.headshotDR);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="p7-row">
        <span className="p7-label">PDR %</span>
        <PctInput value={target.pdr} onChange={(v) => onChange("pdr", v)} />
      </div>
      <div className="p7-row">
        <span className="p7-label">MDR %</span>
        <PctInput value={target.mdr} onChange={(v) => onChange("mdr", v)} />
      </div>
      <div className="p7-row">
        <span className="p7-label">HS DR %</span>
        <PctInput value={target.headshotDR} onChange={(v) => onChange("headshotDR", v)} />
      </div>
      <div className="p7-row">
        <span className="p7-label">Max HP</span>
        <input
          type="number"
          step={10}
          value={target.maxHealth ?? 100}
          onChange={(e) => onChange("maxHealth", Number(e.target.value))}
        />
      </div>
    </div>
  );
}
