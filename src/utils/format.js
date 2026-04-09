// Display formatters used throughout the UI

export const fmtPct = (v) => {
  const p = v * 100;
  const rounded = Math.round(Math.abs(p) * 10) / 10;
  return `${p < -0.0001 ? "-" : ""}${rounded}%`;
};

export const fmtFlat = (v) =>
  typeof v === "number" ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : v;

export function fmtSlope(slope, unit) {
  if (unit === "percent") {
    const v = Math.abs(slope) * 100;
    // Use 2 decimal places below 0.1, 1 above — but always strip trailing zeros for consistency
    const raw = v < 0.1 ? v.toFixed(2) : v.toFixed(1);
    return raw.replace(/\.?0+$/, '') + "%";
  }
  const v = Math.abs(slope);
  const raw = v < 0.1 ? v.toFixed(2) : v.toFixed(1);
  return raw.replace(/\.?0+$/, '');
}
