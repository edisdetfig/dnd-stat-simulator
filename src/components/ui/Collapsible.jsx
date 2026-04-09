// Collapsible — expandable section with title, optional badge
// Source: index.old.html lines 1481-1493

import { useState } from 'react';

export function Collapsible({ title, color, defaultOpen, badge, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "5px 0", userSelect: "none" }}>
        <span style={{ fontSize: 10, color: "#555", width: 12, textAlign: "center" }}>{open ? "▾" : "▸"}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: color || "#e0e0ec" }}>{title}</span>
        {badge != null && <span style={{ fontSize: 9, background: `${color || "#555"}25`, color: color || "#555", padding: "1px 6px", borderRadius: 10, marginLeft: "auto" }}>{badge}</span>}
      </div>
      {open && <div style={{ paddingLeft: 18 }}>{children}</div>}
    </div>
  );
}
