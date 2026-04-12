// TargetEditor — target PDR/MDR/HSDR editor with preset buttons

import { TARGET_PRESETS } from '../data/constants.js';
import { styles } from '../styles/theme.js';
import { InfoTip } from './ui/InfoTip.jsx';

export function TargetEditor({ target, onChange }) {
  const handlePreset = (preset) => {
    onChange({ pdr: preset.pdr, mdr: preset.mdr, headshotDR: preset.headshotDR });
  };
  const handleFieldChange = (field, displayVal) => {
    const raw = parseFloat(displayVal);
    if (isNaN(raw)) return;
    onChange({ ...target, [field]: raw / 100 });
  };
  const matchedPreset = TARGET_PRESETS.find(p =>
    Math.abs(target.pdr - p.pdr) < 0.001 &&
    Math.abs(target.mdr - p.mdr) < 0.001 &&
    Math.abs(target.headshotDR - p.headshotDR) < 0.001
  );
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
        {TARGET_PRESETS.map(preset => {
          const isActive = matchedPreset && matchedPreset.id === preset.id;
          return (
            <button key={preset.id} onClick={() => handlePreset(preset)}
              style={{ flex: "1 1 0", minWidth: 90, background: isActive ? "var(--sim-surface-shadow)" : "transparent",
                border: `1px solid ${isActive ? "var(--sim-border-focus)" : "var(--sim-border-hairline)"}`, color: isActive ? "var(--sim-accent-arcane-pale)" : "var(--sim-text-whisper)",
                padding: "6px 8px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: 10,
                fontWeight: isActive ? 600 : 400, transition: "all 0.15s" }}>
              {preset.name}
              {preset.verification === "VERIFIED" && <span style={{ marginLeft: 3, fontSize: 8, color: "var(--sim-accent-verdant-life)" }}>{"\u2713"}</span>}
            </button>
          );
        })}
      </div>
      {matchedPreset && matchedPreset.description && (
        <div style={{ fontSize: 9, color: "var(--sim-text-whisper)", marginBottom: 8, fontStyle: "italic" }}>
          {matchedPreset.description}
          {matchedPreset.verification === "ESTIMATED" && <span style={{ color: "var(--sim-accent-flame-rust)", marginLeft: 6 }}>ESTIMATED</span>}
        </div>
      )}
      {!matchedPreset && <div style={{ fontSize: 9, color: "var(--sim-text-whisper)", marginBottom: 8 }}>Custom target values</div>}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { key: "pdr", label: "PDR", color: "var(--sim-stat-defensive-physical)", softColor: "var(--sim-stat-defensive-physical-soft)", info: "Target Physical Damage Reduction. Negative = amplifies damage. Pen has no effect when negative." },
          { key: "mdr", label: "MDR", color: "var(--sim-stat-defensive-magical)", softColor: "var(--sim-stat-defensive-magical-soft)", info: "Target Magical Damage Reduction. Your Magic Pen reduces this." },
          { key: "headshotDR", label: "HS DR", color: "var(--sim-stat-defensive-headshot)", softColor: "var(--sim-stat-defensive-headshot-soft)", info: "Target Headshot Damage Reduction. Subtracted from headshot multiplier." },
        ].map(field => {
          const displayVal = (target[field.key] * 100);
          const displayStr = displayVal === 0 ? "0" : (Number.isInteger(displayVal) ? String(displayVal) : displayVal.toFixed(1).replace(/\.0$/, ''));
          return (
            <div key={field.key} style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: field.color, fontWeight: 600, marginBottom: 3, display: "flex", alignItems: "center" }}>
                {field.label}<InfoTip text={field.info} color={field.softColor} />
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input type="number" step="0.5" value={displayStr}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  style={{ ...styles.numInput, width: "100%", fontSize: 14, fontWeight: 600,
                    textAlign: "center", padding: "8px 32px 8px 10px",
                    color: target[field.key] < 0 ? "var(--sim-accent-blood-wound)" : "var(--sim-text-primary)", background: "var(--sim-surface-input)",
                    border: `1px solid ${!matchedPreset ? "var(--sim-border-edge)" : "var(--sim-border-hairline)"}` }} />
                <span style={{ position: "absolute", right: 22, color: "var(--sim-text-whisper)", fontSize: 11, pointerEvents: "none" }}>%</span>
              </div>
            </div>
          );
        })}
      </div>
      {target.pdr > 0 && (
        <div style={{ marginTop: 8, padding: "5px 8px", background: "var(--sim-surface-void)", border: "1px solid var(--sim-surface-shadow)", borderRadius: 4, fontSize: 9, color: "var(--sim-text-ghost)" }}>
          DR formula: max(1 {"\u2212"} DR{"\u00d7"}(1{"\u2212"}Pen), 1{"\u2212"}DR). Pen cannot push DR below 0%.
        </div>
      )}
    </div>
  );
}
