// ArmorEditor — edits a single armor item (name, rarity, stats)
// Source: index.old.html lines 1374-1394

import { RARITY_CONFIG, RARITY_ORDER } from '../../data/constants.js';
import { styles } from '../../styles/theme.js';
import { StatSection } from './StatSection.jsx';

export function ArmorEditor({ item, onChange }) {
  if (!item) return null;
  const updateField = (field, value) => onChange({ ...item, [field]: value });
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" value={item.name || ""} onChange={(e) => updateField("name", e.target.value)} placeholder="Item name" style={styles.textInput} />
        <select value={item.rarity || "epic"} onChange={(e) => {
          const rarity = e.target.value;
          const maxMods = RARITY_CONFIG[rarity]?.modCount || 0;
          onChange({ ...item, rarity, modifiers: (item.modifiers || []).slice(0, maxMods) });
        }} style={{ ...styles.select, color: RARITY_CONFIG[item.rarity]?.color || "var(--sim-text-body)" }}>
          {RARITY_ORDER.map(r => <option key={r} value={r} style={{ color: RARITY_CONFIG[r].color }}>{RARITY_CONFIG[r].label}</option>)}
        </select>
      </div>
      <StatSection title="Inherent Stats" stats={item.inherentStats || []} onChange={(s) => updateField("inherentStats", s)} color="var(--sim-text-dim)" />
      <StatSection title={`Modifiers (${(item.modifiers || []).length}/${RARITY_CONFIG[item.rarity]?.modCount || 0})`}
        stats={item.modifiers || []} onChange={(s) => updateField("modifiers", s.slice(0, RARITY_CONFIG[item.rarity]?.modCount || 0))} color="var(--sim-accent-arcane-core)" />
    </div>
  );
}
