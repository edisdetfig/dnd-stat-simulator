// GearPanel — 11-slot gear editor + Weapon Held 3-way toggle.
//
// Phase 2 promotes the toggle into the richer ContextBar (weapon picker +
// armor readout + dual-wield pill) per plan §3.5.

import { GearSlot } from '../gear/GearSlot.jsx';
import { ALL_SLOTS } from '../gear/slots.js';
import { Panel } from '../ui/Panel.jsx';

export function GearPanel({ gear, setGearSlot, weaponHeldState, setWeaponHeld }) {
  return (
    <Panel title="Gear">
      <WeaponHeldToggle held={weaponHeldState} onChange={setWeaponHeld} />
      <div style={{ marginTop: 8 }}>
        {ALL_SLOTS.map(slotDef => (
          <GearSlot
            key={slotDef.key}
            slotDef={slotDef}
            gear={gear}
            onGearChange={setGearSlot}
          />
        ))}
      </div>
    </Panel>
  );
}

function WeaponHeldToggle({ held, onChange }) {
  const options = [
    { key: "none",        label: "None" },
    { key: "weaponSlot1", label: "Slot 1" },
    { key: "weaponSlot2", label: "Slot 2" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 10, color: "var(--sim-text-whisper)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Weapon Held
      </span>
      <div style={{ display: "inline-flex", gap: 2, marginLeft: "auto" }}>
        {options.map(o => {
          const active = held === o.key;
          return (
            <button key={o.key} onClick={() => onChange(o.key)}
              style={{
                background: active ? "var(--sim-surface-shadow)" : "transparent",
                border: `1px solid ${active ? "var(--sim-border-focus)" : "var(--sim-border-hairline)"}`,
                color: active ? "var(--sim-accent-arcane-pale)" : "var(--sim-text-whisper)",
                padding: "3px 10px", borderRadius: 3, cursor: "pointer",
                fontFamily: "inherit", fontSize: 10,
                fontWeight: active ? 600 : 400,
              }}>{o.label}</button>
          );
        })}
      </div>
    </div>
  );
}
