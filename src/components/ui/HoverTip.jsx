// HoverTip — hover tooltip wrapper for any child element.
// Shows a fixed-position tooltip with arbitrary content on hover.
// Used for perk descriptions, spell tooltips, and any element needing
// a hover reveal without cluttering the layout.

import { useState } from 'react';

export function HoverTip({ children, title, text, maxWidth = 280 }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const handleEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({
      x: Math.min(r.left, window.innerWidth - maxWidth - 20),
      y: r.bottom + 4,
    });
    setShow(true);
  };
  return (
    <div onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      {children}
      {show && text && (
        <div style={{
          position: "fixed", left: pos.x, top: pos.y, zIndex: 999,
          background: "var(--sim-surface-shadow)", border: "1px solid var(--sim-border-info)",
          borderRadius: 6, padding: "8px 12px", maxWidth,
          boxShadow: "var(--sim-shadow-tooltip)", pointerEvents: "none",
          fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1.5, whiteSpace: "normal",
        }}>
          {title && (
            <div style={{
              fontWeight: 700, fontSize: 11, color: "var(--sim-text-primary)",
              marginBottom: 4, borderBottom: "1px solid var(--sim-border-hairline)",
              paddingBottom: 3,
            }}>{title}</div>
          )}
          <div style={{ color: "var(--sim-text-body)" }}>{text}</div>
        </div>
      )}
    </div>
  );
}
