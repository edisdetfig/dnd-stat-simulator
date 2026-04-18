// Minimal theme stub — Phase 7 retains only the TIER_COLORS export that
// the engine's `src/engine/curves.js` re-exports. The full theme system
// (surface / border / text palettes, buildTheme helper, default theme,
// etc.) was retired with the pre-rebuild UI (Phase 7 LOCK C + LOCK D:
// rebuild, not repair; minimal UI only). Phase 11 will re-introduce
// theming from scratch when the full UI lands.
//
// TIER_COLORS maps the engine's getCurveContext() tier labels
// (gold/green/amber/gray) to CSS custom properties. Values are literal
// `var(...)` strings — they resolve at render time against whatever
// CSS provides them. Engine code (e.g., curves.js re-export) passes them
// through without inspecting their form.

export const TIER_COLORS = Object.freeze({
  gold:  "var(--sim-tier-peak-fill)",
  green: "var(--sim-tier-good-fill)",
  amber: "var(--sim-tier-tapering-fill)",
  gray:  "var(--sim-tier-dim-fill)",
});
