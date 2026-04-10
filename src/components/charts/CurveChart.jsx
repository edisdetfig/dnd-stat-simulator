// CurveChart — expandable inline SVG showing full piecewise curve with current position
// Source: index.old.html lines 1568-1742
//
// Exported as a React.memo wrapper. The three props (statId string, ds object,
// attrs object) come from App.jsx's `computed` useMemo so their references are
// stable across re-renders until the underlying gear/perks/buffs change — which
// is exactly when we *want* the chart to recompute. Shallow comparison is enough;
// no custom equality fn needed.

import { memo } from 'react';
import {
  STAT_CURVES,
  evaluateCurve,
  getCurveContext,
  getMarginalSlope,
  DERIVED_CURVE_MAP,
} from '../../engine/curves.js';
import { TIER_COLORS } from '../../styles/theme.js';
import { fmtPct } from '../../utils/format.js';

function CurveChartImpl({ statId, ds, attrs }) {
  const mapping = DERIVED_CURVE_MAP[statId];
  if (!mapping) return null;
  const curveDef = STAT_CURVES[mapping.curveKey];
  if (!curveDef) return null;
  const { segments } = curveDef;
  const inputVal = mapping.getInput(ds, attrs);
  const currentOutput = evaluateCurve(curveDef, inputVal);
  const isPct = mapping.unit === "percent";

  // Determine visible range — center on current value with context
  const allStart = segments[0].start;
  const allEnd = segments[segments.length - 1].end;
  // Show a useful window: from first segment to a bit past current, or full range if small
  const range = allEnd - allStart;
  let viewStart, viewEnd;
  if (range <= 120) {
    viewStart = allStart;
    viewEnd = allEnd;
  } else {
    // For large ranges (like AR -300 to 600), show a useful window
    viewStart = Math.max(allStart, Math.min(inputVal - 50, segments.find(s => s.start >= 0)?.start || 0) - 20);
    viewEnd = Math.min(allEnd, Math.max(inputVal + 80, inputVal * 1.5 + 50));
  }

  // SVG dimensions
  const W = 480, H = 130;
  const pad = { top: 12, right: 16, bottom: 28, left: 48 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  // Sample the curve for the visible range
  const steps = 200;
  const points = [];
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i <= steps; i++) {
    const x = viewStart + (viewEnd - viewStart) * i / steps;
    const y = evaluateCurve(curveDef, x);
    points.push({ x, y });
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  // Add padding to Y range
  const yPad = (maxY - minY) * 0.1 || 0.01;
  minY -= yPad;
  maxY += yPad;

  const toSvgX = (v) => pad.left + ((v - viewStart) / (viewEnd - viewStart)) * cw;
  const toSvgY = (v) => pad.top + (1 - (v - minY) / (maxY - minY)) * ch;

  // Build polyline segments colored by tier
  const segPaths = [];
  for (let si = 0; si < segments.length; si++) {
    const seg = segments[si];
    if (seg.end <= viewStart || seg.start >= viewEnd) continue;
    const s = Math.max(seg.start, viewStart);
    const e = Math.min(seg.end, viewEnd);
    const ctx = getCurveContext(curveDef, (s + e) / 2);
    const color = TIER_COLORS[ctx.tier];
    // Sample this segment
    const pts = [];
    const segSteps = Math.max(2, Math.round((e - s) / (viewEnd - viewStart) * 60));
    for (let i = 0; i <= segSteps; i++) {
      const x = s + (e - s) * i / segSteps;
      const y = evaluateCurve(curveDef, x);
      pts.push(`${toSvgX(x).toFixed(1)},${toSvgY(y).toFixed(1)}`);
    }
    segPaths.push({ points: pts.join(" "), color, start: s, end: e });
  }

  // Segment boundary lines
  const boundaries = segments
    .map(s => s.start)
    .filter(v => v > viewStart && v < viewEnd);

  // Y axis labels
  const yTicks = 5;
  const yLabels = [];
  for (let i = 0; i <= yTicks; i++) {
    const v = minY + (maxY - minY) * i / yTicks;
    yLabels.push({ v, y: toSvgY(v), label: isPct ? `${(v * 100).toFixed(0)}%` : v.toFixed(0) });
  }

  // X axis labels
  const xTicks = 6;
  const xLabels = [];
  for (let i = 0; i <= xTicks; i++) {
    const v = viewStart + (viewEnd - viewStart) * i / xTicks;
    xLabels.push({ v, x: toSvgX(v), label: v.toFixed(0) });
  }

  // Current position
  const curX = toSvgX(inputVal);
  const curY = toSvgY(currentOutput);
  const curLabel = isPct ? fmtPct(currentOutput) : currentOutput.toFixed(1);

  // Zero line
  const zeroInRange = minY <= 0 && maxY >= 0;
  const zeroY = zeroInRange ? toSvgY(0) : null;

  return (
    <div style={{ margin: "6px 0 8px 0", background: "var(--sim-surface-void)", border: "1px solid var(--sim-border-hairline)", borderRadius: 6, padding: "8px 4px 4px 4px" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {/* Grid */}
        {yLabels.map((t, i) => (
          <g key={`y${i}`}>
            <line x1={pad.left} y1={t.y} x2={W - pad.right} y2={t.y} stroke="var(--sim-surface-shadow)" strokeWidth="0.5" />
            <text x={pad.left - 4} y={t.y + 3} textAnchor="end" fill="var(--sim-text-ghost)" fontSize="8" fontFamily="monospace">{t.label}</text>
          </g>
        ))}
        {xLabels.map((t, i) => (
          <text key={`x${i}`} x={t.x} y={H - 4} textAnchor="middle" fill="var(--sim-text-ghost)" fontSize="8" fontFamily="monospace">{t.label}</text>
        ))}

        {/* Zero line */}
        {zeroY != null && <line x1={pad.left} y1={zeroY} x2={W - pad.right} y2={zeroY} stroke="var(--sim-text-ghost)" strokeWidth="1" strokeDasharray="4,3" />}

        {/* Segment boundaries */}
        {boundaries.map((v, i) => (
          <line key={`b${i}`} x1={toSvgX(v)} y1={pad.top} x2={toSvgX(v)} y2={H - pad.bottom} stroke="var(--sim-border-hairline)" strokeWidth="1" strokeDasharray="2,2" />
        ))}

        {/* Curve segments */}
        {segPaths.map((sp, i) => (
          <polyline key={i} points={sp.points} fill="none" stroke={sp.color} strokeWidth="2" strokeLinecap="round" />
        ))}

        {/* Current position marker */}
        <line x1={curX} y1={pad.top} x2={curX} y2={H - pad.bottom} stroke="var(--sim-text-primary)" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
        <circle cx={curX} cy={curY} r="4" fill="var(--sim-text-primary)" stroke="var(--sim-surface-void)" strokeWidth="1.5" />
        <text x={curX + 6} y={curY - 6} fill="var(--sim-text-primary)" fontSize="9" fontFamily="monospace" fontWeight="600">{curLabel}</text>
        <text x={curX} y={H - pad.bottom + 12} textAnchor="middle" fill="var(--sim-text-primary)" fontSize="8" fontFamily="monospace" fontWeight="600">
          {Number.isInteger(inputVal) ? inputVal : inputVal.toFixed(1)}
        </text>
      </svg>
      {/* Formula and per-attribute breakdown */}
      <div style={{ padding: "6px 10px 4px 10px", borderTop: "1px solid var(--sim-surface-shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 10, marginBottom: 4 }}>
          <span style={{ color: "var(--sim-text-muted)" }}>
            Input = <span style={{ color: "var(--sim-text-primary)", fontWeight: 600 }}>{mapping.formula}</span>
            <span style={{ color: "var(--sim-text-whisper)", marginLeft: 6 }}>= {Number.isInteger(inputVal) ? inputVal : inputVal.toFixed(1)}</span>
          </span>
          <span style={{ color: "var(--sim-text-ghost)", fontSize: 9 }}>{segments.length} segments</span>
        </div>
        {mapping.attrs && mapping.attrs.length > 0 && (() => {
          const slope = getMarginalSlope(curveDef, inputVal);
          const unitLabel = isPct ? "" : (statId === "hp" ? " HP" : statId === "moveSpeed" ? " spd" : "");
          return (
            <div style={{ display: "flex", gap: 16, fontSize: 10 }}>
              {mapping.attrs.map(({ attr, weight }) => {
                const perAttr = slope * weight;
                const display = isPct
                  ? `${(Math.abs(perAttr) * 100).toFixed(2)}%`
                  : `${Math.abs(perAttr).toFixed(2)}${unitLabel}`;
                const ctx = getCurveContext(curveDef, inputVal);
                const color = TIER_COLORS[ctx.tier];
                return (
                  <span key={attr} style={{ color }}>
                    <span style={{ color: "var(--sim-text-muted)" }}>+1 {attr} →</span> {perAttr < 0 ? "-" : "+"}{display}
                  </span>
                );
              })}
              {mapping.attrs.length > 1 && (
                <span style={{ color: "var(--sim-text-ghost)", fontSize: 9, fontStyle: "italic" }}>
                  (slope {isPct ? `${(Math.abs(slope)*100).toFixed(1)}%` : slope.toFixed(2)}/{mapping.inputLabel || "pt"}, split by weight)
                </span>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export const CurveChart = memo(CurveChartImpl);
