// AttrTooltip — hover tooltip showing per-attribute breakdown
// Source: index.old.html lines 1453-1479

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
        <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 999, background: "#16162a", border: "1px solid #4a4a6e", borderRadius: 6, padding: "8px 12px", minWidth: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.6)", pointerEvents: "none", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
          <div style={{ fontWeight: 700, color: "#e0e0ec", marginBottom: 4, borderBottom: "1px solid #1e1e2e", paddingBottom: 3 }}>{attrKey.toUpperCase()} Breakdown</div>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#555" }}><span>Base ({className})</span><span>{bd.base}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", color: bd.gearInherent > 0 ? "#c8c8d4" : "#555" }}><span>Gear (inherent)</span><span style={{ color: bd.gearInherent > 0 ? "#4ade80" : "#555" }}>{bd.gearInherent > 0 ? `+${bd.gearInherent}` : "0"}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", color: bd.gearMods > 0 ? "#22d3ee" : "#555" }}><span>Gear (mods)</span><span style={{ color: bd.gearMods > 0 ? "#22d3ee" : "#555" }}>{bd.gearMods > 0 ? `+${bd.gearMods}` : "0"}</span></div>
          {bd.buffs.map((b, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", color: "#a78bfa" }}><span>{b.name}</span><span>+{b.value}</span></div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#e0e0ec", borderTop: "1px solid #1e1e2e", marginTop: 3, paddingTop: 3 }}><span>Total</span><span>{bd.total}</span></div>
        </div>
      )}
    </div>
  );
}
