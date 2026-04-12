// MarginalBadge — colored badge showing slope per input point with hover detail
//
// Exported as a React.memo wrapper. App renders one badge per derived stat
// (5-7 per class), and without memo each one re-renders on every App state
// change. Shallow comparison of props is sufficient because ds/attrs come
// from App's `computed` useMemo (stable refs) and `onToggle` is a stable
// useCallback at the App level that takes statId as an argument.

import { memo, useState } from 'react';
import {
  STAT_CURVES,
  getCurveContext,
  DERIVED_CURVE_MAP,
} from '../../engine/curves.js';
import { fmtSlope } from '../../utils/format.js';
import { TIER_LABELS, TIER_COLORS, TIER_KEY_MAP, defaultTheme } from '../../styles/theme.js';

function MarginalBadgeImpl({ statId, ds, attrs, isExpanded, onToggle }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const mapping = DERIVED_CURVE_MAP[statId];
  if (!mapping) return null;
  const curveDef = STAT_CURVES[mapping.curveKey];
  if (!curveDef) return null;
  const inputVal = mapping.getInput(ds, attrs);
  const ctx = getCurveContext(curveDef, inputVal);
  const color = TIER_COLORS[ctx.tier];
  const perLabel = mapping.inputLabel ? `/${mapping.inputLabel}` : "/pt";
  const slopeDisplay = fmtSlope(ctx.slope, mapping.unit);

  // Segment position info
  const segWidth = ctx.segmentEnd - ctx.segmentStart;
  const posInSeg = inputVal - ctx.segmentStart;
  const pctThrough = segWidth > 0 ? Math.min(1, Math.max(0, posInSeg / segWidth)) : 0;
  const remaining = Math.max(0, ctx.segmentEnd - inputVal);

  // Next segment info
  const { segments } = curveDef;
  let segIdx = segments.findIndex(s => inputVal >= s.start && inputVal < s.end);
  if (segIdx === -1) segIdx = segments.length - 1;
  const nextSeg = segIdx < segments.length - 1 ? segments[segIdx + 1] : null;
  const prevSeg = segIdx > 0 ? segments[segIdx - 1] : null;

  const handleEnter = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setPos({ x: r.left, y: r.bottom + 6 });
    setShow(true);
  };

  return (
    <span style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={handleEnter} onMouseLeave={() => setShow(false)}>
      {/* onToggle is called with the statId so a single stable useCallback
          at the App level can serve every badge without needing per-badge
          arrow wrappers (those would defeat React.memo by giving every
          render a new function identity for this prop). */}
      <span onClick={(e) => { e.stopPropagation(); onToggle && onToggle(statId); }} style={{
        display: "inline-flex", alignItems: "center", gap: 2,
        fontSize: 9, fontWeight: 600, color,
        background: isExpanded ? defaultTheme.tier[TIER_KEY_MAP[ctx.tier]].glowActive : defaultTheme.tier[TIER_KEY_MAP[ctx.tier]].glow,
        border: `1px solid ${isExpanded ? color : defaultTheme.tier[TIER_KEY_MAP[ctx.tier]].border}`,
        padding: "1px 5px", borderRadius: 8, marginLeft: 6,
        cursor: "pointer", whiteSpace: "nowrap", lineHeight: 1.4,
      }}>
        {ctx.isGoldenZone && <span style={{ fontSize: 8 }}>★</span>}
        {ctx.isAccelerating && !ctx.isGoldenZone && <span style={{ fontSize: 8 }}>↑</span>}
        {ctx.slope < 0 ? "-" : "+"}{slopeDisplay}{perLabel}
        <span style={{ fontSize: 8, marginLeft: 2, opacity: 0.6 }}>{isExpanded ? "▾" : "▸"}</span>
      </span>
      {show && (
        <div style={{
          position: "fixed", left: Math.min(pos.x, window.innerWidth - 290), top: pos.y, zIndex: 999,
          background: "var(--sim-surface-shadow)", border: "1px solid var(--sim-border-info)", borderRadius: 6,
          padding: "10px 14px", width: 270, boxShadow: "var(--sim-shadow-tooltip)",
          pointerEvents: "none", fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
        }}>
          {/* Header with tier */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, paddingBottom: 4, borderBottom: "1px solid var(--sim-border-hairline)" }}>
            <span style={{ fontWeight: 700, color }}>
              {ctx.isGoldenZone ? "★ " : ""}{TIER_LABELS[ctx.tier]}
            </span>
            <span style={{ fontSize: 10, color: "var(--sim-text-whisper)" }}>{(ctx.slopeRatio * 100).toFixed(0)}% of peak</span>
          </div>

          {/* Current position */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--sim-text-muted)", marginBottom: 3 }}>
              <span>Input: <span style={{ color: "var(--sim-text-primary)" }}>{Number.isInteger(inputVal) ? inputVal : inputVal.toFixed(1)}</span></span>
              <span style={{ color: "var(--sim-text-whisper)" }}>{remaining.toFixed(remaining % 1 === 0 ? 0 : 1)} pts left in zone</span>
            </div>
            {/* Segment position bar */}
            <div style={{ height: 6, background: "var(--sim-surface-shadow)", borderRadius: 3, overflow: "hidden", position: "relative" }}>
              <div style={{ height: "100%", borderRadius: 3, width: `${pctThrough * 100}%`, background: color, opacity: 0.7, transition: "width 0.2s" }} />
              <div style={{ position: "absolute", top: -1, left: `${pctThrough * 100}%`, width: 2, height: 8, background: "var(--sim-text-primary)", borderRadius: 1, transform: "translateX(-1px)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--sim-text-ghost)", marginTop: 2 }}>
              <span>{ctx.segmentStart}</span>
              <span>{ctx.segmentEnd}</span>
            </div>
          </div>

          {/* Current slope */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 10 }}>
            <span style={{ color: "var(--sim-text-muted)" }}>Current gain</span>
            <span style={{ color, fontWeight: 600 }}>{ctx.slope < 0 ? "-" : "+"}{slopeDisplay}{perLabel}</span>
          </div>

          {/* Next segment preview */}
          {nextSeg && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 10 }}>
              <span style={{ color: "var(--sim-text-muted)" }}>Next zone <span style={{ color: "var(--sim-text-whisper)" }}>({nextSeg.start}–{nextSeg.end})</span></span>
              <span style={{
                color: Math.abs(nextSeg.slope) > ctx.absSlope * 1.05 ? TIER_COLORS.gold :
                       Math.abs(nextSeg.slope) < ctx.absSlope * 0.8 ? TIER_COLORS.amber : "var(--sim-text-muted)",
                fontWeight: 500,
              }}>
                {Math.abs(nextSeg.slope) > ctx.absSlope * 1.05 ? "↑ " : Math.abs(nextSeg.slope) < ctx.absSlope * 0.8 ? "↓ " : ""}
                {nextSeg.slope < 0 ? "-" : "+"}{fmtSlope(nextSeg.slope, mapping.unit)}{perLabel}
              </span>
            </div>
          )}

          {/* Previous segment for context */}
          {prevSeg && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 10 }}>
              <span style={{ color: "var(--sim-text-whisper)" }}>Prev zone <span style={{ color: "var(--sim-text-ghost)" }}>({prevSeg.start}–{prevSeg.end})</span></span>
              <span style={{ color: "var(--sim-text-whisper)" }}>
                {prevSeg.slope < 0 ? "-" : "+"}{fmtSlope(prevSeg.slope, mapping.unit)}{perLabel}
              </span>
            </div>
          )}

          {/* Acceleration callout */}
          {ctx.isAccelerating && ctx.distToNextSeg != null && (
            <div style={{ marginTop: 4, padding: "4px 6px", background: defaultTheme.tier.peak.glow, border: `1px solid ${defaultTheme.tier.peak.border}`, borderRadius: 4, fontSize: 10, color: TIER_COLORS.gold }}>
              ↑ Slope jumps {(Math.abs(ctx.nextSegmentSlope) / ctx.absSlope).toFixed(1)}× in {Math.round(ctx.distToNextSeg)} pts
            </div>
          )}

          {segIdx === segments.length - 1 && (
            <div style={{ marginTop: 4, fontSize: 9, color: "var(--sim-text-whisper)", fontStyle: "italic" }}>Final segment — no further changes</div>
          )}
        </div>
      )}
    </span>
  );
}

export const MarginalBadge = memo(MarginalBadgeImpl);
