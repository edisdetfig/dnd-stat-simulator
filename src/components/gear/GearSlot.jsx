// GearSlot — collapsible gear slot row that wraps WeaponEditor or ArmorEditor
// Source: index.old.html lines 1396-1447

import { useState } from 'react';
import { RARITY_CONFIG } from '../../data/constants.js';
import { styles } from '../../styles/theme.js';
import { WeaponEditor } from './WeaponEditor.jsx';
import { ArmorEditor } from './ArmorEditor.jsx';

export function GearSlot({ slotDef, gear, onGearChange }) {
  const [expanded, setExpanded] = useState(false);
  const slotData = gear[slotDef.key];
  const item = slotDef.isWeapon ? slotData?.primary : slotData;
  const itemName = item?.name || "(empty)";
  const rarity = item?.rarity || "common";
  const modCount = item?.modifiers?.length || 0;
  const inherentCount = item?.inherentStats?.length || 0;
  const isEmpty = !item;

  const handleChange = (updated) => {
    if (slotDef.isWeapon) onGearChange(slotDef.key, { ...slotData, primary: updated });
    else onGearChange(slotDef.key, updated);
  };
  const handleClear = () => {
    if (slotDef.isWeapon) onGearChange(slotDef.key, { primary: null, secondary: null });
    else onGearChange(slotDef.key, null);
  };
  const handleCreate = () => {
    const newItem = { id: "", name: "", rarity: "epic", inherentStats: [], modifiers: [] };
    if (slotDef.isWeapon) { newItem.handType = "twoHanded"; newItem.weaponDamage = 0; onGearChange(slotDef.key, { primary: newItem, secondary: null }); }
    else onGearChange(slotDef.key, newItem);
    setExpanded(true);
  };

  return (
    <div style={{ border: `1px solid ${expanded ? "var(--sim-border-seam)" : "var(--sim-surface-shadow)"}`, borderRadius: 6, marginBottom: 4, background: expanded ? "var(--sim-surface-ink)" : "var(--sim-surface-void)" }}>
      <div onClick={() => !isEmpty && setExpanded(!expanded)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", cursor: isEmpty ? "default" : "pointer", borderBottom: expanded ? "1px solid var(--sim-surface-shadow)" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "var(--sim-text-ghost)", width: 80, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>{slotDef.label}</span>
          {!isEmpty ? <span style={{ fontSize: 12, color: RARITY_CONFIG[rarity]?.color || "var(--sim-text-body)" }}>{itemName}</span>
            : <button onClick={handleCreate} style={{ ...styles.addBtn, fontSize: 10 }}>+ Equip Item</button>}
        </div>
        {!isEmpty && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, color: "var(--sim-text-ghost)" }}>{inherentCount}inh · {modCount}mod</span>
            <span style={{ fontSize: 10, color: "var(--sim-text-ghost)" }}>{expanded ? "▼" : "▶"}</span>
          </div>
        )}
      </div>
      {expanded && !isEmpty && (
        <div style={{ padding: "8px 12px" }}>
          {slotDef.isWeapon ? <WeaponEditor weapon={item} onChange={handleChange} /> : <ArmorEditor item={item} onChange={handleChange} />}
          <div style={{ borderTop: "1px solid var(--sim-surface-shadow)", paddingTop: 6, marginTop: 6 }}>
            <button onClick={handleClear} style={{ ...styles.removeBtn, fontSize: 10, padding: "2px 8px", width: "auto" }}>Remove Item</button>
          </div>
        </div>
      )}
    </div>
  );
}
