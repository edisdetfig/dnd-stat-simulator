// StatRowEditor — single editable stat row (stat select + value input + remove button)
// Source: index.old.html lines 1281-1309

import { STAT_META, STAT_OPTIONS } from '../../data/stat-meta.js';
import { styles } from '../../styles/theme.js';

export function StatRowEditor({ stat, value, onChange, onRemove }) {
  const meta = STAT_META[stat];
  const displayVal = meta && meta.unit === "percent" ? (value * 100) : value;
  const displayStr = displayVal === 0 ? "0" : (Number.isInteger(displayVal) ? String(displayVal) : displayVal.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
      <select value={stat} onChange={(e) => onChange({ stat: e.target.value, value })} style={styles.select}>
        <option value="">— select —</option>
        {STAT_OPTIONS.map(o => (
          <option key={o.id} value={o.id} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input type="number" step="any" value={displayStr}
          onChange={(e) => {
            const raw = parseFloat(e.target.value);
            if (isNaN(raw)) return;
            onChange({ stat, value: meta && meta.unit === "percent" ? raw / 100 : raw });
          }}
          style={{ ...styles.numInput, paddingRight: meta?.unit === "percent" ? 20 : 8 }} />
        {meta?.unit === "percent" && (
          <span style={{ position: "absolute", right: 6, color: "var(--sim-text-whisper)", fontSize: 10, pointerEvents: "none" }}>%</span>
        )}
      </div>
      <button onClick={onRemove} style={styles.removeBtn} title="Remove">×</button>
    </div>
  );
}
