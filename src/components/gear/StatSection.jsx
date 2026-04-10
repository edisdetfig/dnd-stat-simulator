// StatSection — collapsible group of StatRowEditor rows with add/remove
// Source: index.old.html lines 1311-1337

import { STAT_META } from '../../data/stat-meta.js';
import { styles } from '../../styles/theme.js';
import { StatRowEditor } from './StatRowEditor.jsx';

export function StatSection({ title, stats, onChange, color }) {
  const addStat = () => onChange([...stats, { stat: "", value: 0 }]);
  const removeStat = (idx) => onChange(stats.filter((_, i) => i !== idx));
  const updateStat = (idx, updated) => {
    const newStats = [...stats];
    if (updated.stat !== newStats[idx].stat) {
      const oldMeta = STAT_META[newStats[idx].stat];
      const newMeta = STAT_META[updated.stat];
      if (oldMeta?.unit !== newMeta?.unit) updated.value = 0;
    }
    newStats[idx] = updated;
    onChange(newStats);
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: color || "var(--sim-text-dim)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>{title}</span>
        <button onClick={addStat} style={styles.addBtn}>+ Add</button>
      </div>
      {stats.length === 0 && <div style={{ fontSize: 10, color: "var(--sim-text-ghost)", fontStyle: "italic", padding: "2px 0" }}>None</div>}
      {stats.map((s, i) => (
        <StatRowEditor key={i} stat={s.stat} value={s.value} onChange={(u) => updateStat(i, u)} onRemove={() => removeStat(i)} />
      ))}
    </div>
  );
}
