// WeaponEditor — edits a single weapon item (name, rarity, hand type, damage, stats)

import { RARITY_CONFIG, RARITY_ORDER } from '../../data/constants.js';
import { styles } from '../../styles/theme.js';
import { StatSection } from './StatSection.jsx';

export function WeaponEditor({ weapon, onChange }) {
  if (!weapon) return null;
  const updateField = (field, value) => onChange({ ...weapon, [field]: value });
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" value={weapon.name || ""} onChange={(e) => updateField("name", e.target.value)} placeholder="Item name" style={styles.textInput} />
        <select value={weapon.rarity || "epic"} onChange={(e) => {
          const rarity = e.target.value;
          const maxMods = RARITY_CONFIG[rarity]?.modCount || 0;
          onChange({ ...weapon, rarity, modifiers: (weapon.modifiers || []).slice(0, maxMods) });
        }} style={{ ...styles.select, color: RARITY_CONFIG[weapon.rarity]?.color || "var(--sim-text-body)" }}>
          {RARITY_ORDER.map(r => <option key={r} value={r} style={{ color: RARITY_CONFIG[r].color }}>{RARITY_CONFIG[r].label}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        <label style={styles.fieldLabel}>Hand Type</label>
        <select value={weapon.handType || "twoHanded"} onChange={(e) => updateField("handType", e.target.value)} style={styles.select}>
          <option value="oneHanded">One-Handed</option>
          <option value="twoHanded">Two-Handed</option>
        </select>
        <label style={styles.fieldLabel}>Wpn Dmg</label>
        <input type="number" value={weapon.weaponDamage || 0} onChange={(e) => updateField("weaponDamage", parseInt(e.target.value) || 0)} style={{ ...styles.numInput, width: 60 }} />
        <label style={styles.fieldLabel}>Magical Dmg</label>
        <input type="number" value={weapon.magicalDamage || 0} onChange={(e) => updateField("magicalDamage", parseInt(e.target.value) || 0)} style={{ ...styles.numInput, width: 60 }} title="Adds to spell base damage when held (e.g., Spellbook)" />
        <label style={styles.fieldLabel}>Magic Wpn Dmg</label>
        <input type="number" value={weapon.magicWeaponDamage || 0} onChange={(e) => updateField("magicWeaponDamage", parseInt(e.target.value) || 0)} style={{ ...styles.numInput, width: 60 }} title="Magic melee damage, scales with MPB (e.g., Crystal Sword). Does NOT affect spells." />
      </div>
      <StatSection title="Inherent Stats" stats={weapon.inherentStats || []} onChange={(s) => updateField("inherentStats", s)} color="var(--sim-text-dim)" />
      <StatSection title={`Modifiers (${(weapon.modifiers || []).length}/${RARITY_CONFIG[weapon.rarity]?.modCount || 0})`}
        stats={weapon.modifiers || []} onChange={(s) => updateField("modifiers", s.slice(0, RARITY_CONFIG[weapon.rarity]?.modCount || 0))} color="var(--sim-accent-arcane-core)" />
    </div>
  );
}
