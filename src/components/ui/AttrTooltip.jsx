// AttrTooltip — hover tooltip showing per-attribute breakdown

import { useState } from 'react';

export function AttrTooltip({ children, breakdown, attrKey, className }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const bd = breakdown[attrKey];
  const handleEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: r.left, y: r.bottom + 4 });
    setShow(true);
  };
  return (
    <div onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)} style={{ display: "inline-block" }}>
      {children}
      {show && (
        <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 999, background: "var(--sim-surface-shadow)", border: "1px solid var(--sim-border-info)", borderRadius: 6, padding: "8px 12px", minWidth: 200, boxShadow: "var(--sim-shadow-tooltip)", pointerEvents: "none", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
          <div style={{ fontWeight: 700, color: "var(--sim-text-primary)", marginBottom: 4, borderBottom: "1px solid var(--sim-border-hairline)", paddingBottom: 3 }}>{attrKey.toUpperCase()} Breakdown</div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "var(--sim-text-whisper)" }}><span>Base ({className})</span><span>{bd.base}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", color: bd.gearInherent > 0 ? "var(--sim-text-body)" : "var(--sim-text-whisper)" }}><span>Gear (inherent)</span><span style={{ color: bd.gearInherent > 0 ? "var(--sim-accent-verdant-life)" : "var(--sim-text-whisper)" }}>{bd.gearInherent > 0 ? `+${bd.gearInherent}` : "0"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", color: bd.gearMods > 0 ? "var(--sim-accent-azure-ice)" : "var(--sim-text-whisper)" }}><span>Gear (mods)</span><span style={{ color: bd.gearMods > 0 ? "var(--sim-accent-azure-ice)" : "var(--sim-text-whisper)" }}>{bd.gearMods > 0 ? `+${bd.gearMods}` : "0"}</span></div>
          {bd.buffs.map((b, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "var(--sim-accent-arcane-muted)" }}><span>{b.name}</span><span>+{b.value}</span></div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--sim-text-primary)", borderTop: "1px solid var(--sim-border-hairline)", marginTop: 3, paddingTop: 3 }}><span>Total</span><span>{bd.total}</span></div>
        </div>
      )}
    </div>
  );
}
