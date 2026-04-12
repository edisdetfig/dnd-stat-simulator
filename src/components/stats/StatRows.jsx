// Stat row display primitives — SR, CapSR, SubSR, StatDivider

import { fmtPct } from '../../utils/format.js';
import { InfoTip } from '../ui/InfoTip.jsx';

export function SR({ label, value, base, detail, badge }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0", borderBottom: "1px solid var(--sim-border-whisper)" }}>
    <span style={{ color: "var(--sim-text-muted)", fontSize: 12, display: "flex", alignItems: "baseline", gap: 0 }}>{label}{badge}{base != null && <span style={{ color: "var(--sim-text-ghost)", fontSize: 10 }}> ({base})</span>}</span>
    <span style={{ color: "var(--sim-text-primary)", fontSize: 12, fontWeight: 500 }}>
      {value}
      {detail && (() => {
        const isRating = typeof detail === "string" && detail.startsWith("rating");
        return <span title={isRating ? "Intermediate value before curve" : undefined}
          style={{ color: "var(--sim-text-whisper)", fontSize: 10, marginLeft: 6, ...(isRating ? { cursor: "help", borderBottom: "1px dotted var(--sim-text-ghost)" } : {}) }}>{detail}</span>;
      })()}
    </span>
  </div>;
}

export function CapSR({ label, value, cap, curve, bonus, badge }) {
  const capped = value >= cap - 0.0001;
  const parts = [];
  if (capped) {
    parts.push("capped");
    if (bonus > 0.0001) {
      const eff = Math.max(0, cap - curve);
      parts.push(`${fmtPct(bonus)} from bonuses (${fmtPct(eff)} applied)`);
      if (bonus - eff > 0.0001) parts.push(`${fmtPct(bonus - eff)} over cap`);
    }
  } else if (bonus > 0.0001) parts.push(`${fmtPct(bonus)} from bonuses`);
  return <SR label={label} value={fmtPct(value)} detail={parts.length ? parts.join(" · ") : null} badge={badge} />;
}

export function SubSR({ label, value, info }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "2px 0 2px 12px", borderBottom: "1px solid var(--sim-border-whisper)" }}>
    <span style={{ color: "var(--sim-text-whisper)", fontSize: 11 }}>{label}{info && <InfoTip text={info} />}</span>
    <span style={{ color: "var(--sim-text-muted)", fontSize: 11 }}>{value}</span>
  </div>;
}

export function StatDivider() {
  return <div style={{ borderBottom: "1px solid var(--sim-surface-shadow)", margin: "6px 0" }} />;
}
