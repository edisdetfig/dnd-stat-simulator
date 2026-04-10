// Collapsible — expandable section with title, optional badge
// Source: index.old.html lines 1481-1493

import { useState } from 'react';

export function Collapsible({ title, color, defaultOpen, badge, children }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", padding: "5px 0", userSelect: "none" }}>
        <span style={{ fontSize: 10, color: "var(--sim-text-whisper)", width: 12, textAlign: "center" }}>{open ? "▾" : "▸"}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: color || "var(--sim-text-primary)" }}>{title}</span>
        {badge != null && <span style={{ fontSize: 9, background: `${color || "#555"}25`, color: color || "var(--sim-text-whisper)", padding: "1px 6px", borderRadius: 10, marginLeft: "auto" }}>{badge}</span>}
      </div>
      {open && <div style={{ paddingLeft: 18 }}>{children}</div>}
    </div>
  );
}
