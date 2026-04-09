// InfoTip — contextual ⓘ micro-tip, hover for explanation
// Source: index.old.html lines 1503-1529

import { useState } from 'react';

export function InfoTip({ text, color }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const handleEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: Math.min(r.left, window.innerWidth - 260), y: r.bottom + 4 });
    setShow(true);
  };
  return (
    <span onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}
      style={{ cursor: "help", fontSize: 10, color: color || "#4a4a6e", marginLeft: 4, userSelect: "none" }}>
      ⓘ
      {show && (
        <span style={{
          position: "fixed", left: pos.x, top: pos.y, zIndex: 999,
          background: "#1a1a30", border: "1px solid #4a4a6e", borderRadius: 5,
          padding: "6px 10px", maxWidth: 240, fontSize: 10, color: "#c8c8d4",
          boxShadow: "0 6px 20px rgba(0,0,0,0.5)", pointerEvents: "none",
          fontWeight: 400, lineHeight: 1.5, fontStyle: "normal",
          display: "block", whiteSpace: "normal",
        }}>
          {text}
        </span>
      )}
    </span>
  );
}
