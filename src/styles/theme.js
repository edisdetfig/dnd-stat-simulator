// Theme module — semantic design tokens for the simulator.
//
// Authoring: nested JS object grouped by role (surface, border, text, tier,
// stat, damageType, accent, classIdentity, rarity, glow, veil, shadow).
// Distribution: every leaf flattens to a dash-joined CSS variable name
// (theme.surface.inkRaised → --sim-surface-ink-raised) so inline JSX styles
// and <style> blocks both consume tokens via var() at runtime.
//
// The default theme is the canonical v0.5.0 palette — every value is the same
// hex that lived in inline styles before the refactor. A theme variant ships
// as a self-contained file exporting the same shape with different leaf values.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Convert any hex (#rgb, #rrggbb, #rrggbbaa) to rgba(r, g, b, alpha).
// Used by buildTheme to pre-compute tier badge alpha variants at module load
// instead of doing `${color}15` string math at render time.
export function withAlpha(color, alpha) {
  let hex = String(color).replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6) {
    throw new Error(`withAlpha: cannot parse color "${color}"`);
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Walk a nested theme object and produce a flat { "--sim-key-path": value }
// map. camelCase keys become kebab-case segments; every path is prefixed
// with --sim- so it can't collide with library-injected vars on :root.
export function flattenTokens(theme) {
  const out = {};
  const walk = (obj, path) => {
    for (const [key, value] of Object.entries(obj)) {
      const segment = key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
      const nextPath = path ? `${path}-${segment}` : segment;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        walk(value, nextPath);
      } else {
        out[`--sim-${nextPath}`] = value;
      }
    }
  };
  walk(theme, "");
  return out;
}

// ---------------------------------------------------------------------------
// Base palette — section B/C of docs/theme_refactor_context.md
// ---------------------------------------------------------------------------

const baseTheme = {
  surface: {
    abyss:    "#07070c",   // ClassPicker body; darkest possible
    void:     "#0a0a0f",   // App body background
    ink:      "#0d0d14",   // Panel body, input bg, inner wells
    inkRaised: "#10101c",  // Toggle pills, trigger buttons
    shadow:   "#1a1a28",   // Raised elements, active buttons
    stone:    "#2a2a3e",   // Strong-emphasis raised surface
    iron:     "#3a3a5e",   // Selected/pressed affordance
  },

  border: {
    whisper:  "#111118",   // Stat-row dividers (near-invisible)
    hairline: "#1e1e2e",   // Default panel/input border
    seam:     "#2a2a3e",   // Expanded/raised border
    edge:     "#3a3a5e",   // Active/selected border
    focus:    "#6366f1",   // Focused input, accent emphasis
  },

  text: {
    primary: "#e0e0ec",    // Stat values, headings
    body:    "#c8c8d4",    // Tooltip body, main prose
    muted:   "#888",       // Stat labels, secondary info
    dim:     "#666",       // Metadata, version strings
    whisper: "#555",       // Empty-state captions
    ghost:   "#444",       // Barely-visible hints
  },

  // Tier — curve efficiency badges. Only .fill is authored; the alpha
  // variants (.glow, .glowActive, .border) are computed by buildTheme().
  tier: {
    peak:     { fill: "#fbbf24" },
    good:     { fill: "#4ade80" },
    tapering: { fill: "#f97316" },
    dim:      { fill: "#555" },
  },

  stat: {
    physical:   "#f59e0b",
    magical:    "#a78bfa",
    healing:    "#4ade80",
    build:      "#6366f1",
    weapon:     "#60a5fa",
    spellcraft: "#a855f7",
    headshot:   "#f87171",
  },

  damageType: {
    physical: {
      body:       "#f59e0b",
      head:       "#f87171",
      bodyLabel:  "#8a7a3a",
      headLabel:  "#8a4a4a",
      bodyWell:   "#1a180a",
      headWell:   "#1a0e0e",
      wellFrame:  "#1a150d",
      wellBorder: "#3a3020",
    },
    magical: { value: "#c8a8ff" },
    heal:    { value: "#4ade80" },
  },

  accent: {
    arcane: {
      core:  "#a855f7",
      soft:  "#c8a8ff",
      pale:  "#c8b4ff",
      frost: "#d4baff",
      muted: "#a78bfa",
      glow:  "#8b5cf6",
    },
    flame: {
      hot:    "#f59e0b",
      glow:   "#fbbf24",
      rust:   "#a86b32",
      dim:    "#6a6a4e",
      scorch: "#3a3020",
      ember:  "#1a150d",
    },
    verdant: {
      life:     "#4ade80",
      bright:   "#6bff6b",
      moss:     "#4a6a4a",
      loam:     "#1a3a1a",
      forest:   "#0a1a10",
      jade:     "#22c55e",
      pass:     "#4a8",
      uncommon: "#56b455",
    },
    blood: {
      wound:   "#f87171",
      peril:   "#ef4444",
      crimson: "#dc2626",
      bruise:  "#8a4a4a",
      scab:    "#664444",
      clotted: "#1a0e0e",
      murmur:  "#a44",
      whisper: "#a66",
      ember:   "#f66",
    },
    azure: {
      steel:  "#60a5fa",
      cobalt: "#3b82f6",
      pulse:  "#6b8aff",
      ice:    "#22d3ee",
    },
    arcanum: {
      core: "#6366f1",
    },
  },

  classIdentity: {
    warlock:   "#a855f7",
    fighter:   "#94a3b8",
    barbarian: "#dc2626",
    bard:      "#ec4899",
    cleric:    "#fbbf24",
    druid:     "#84cc16",
    ranger:    "#22c55e",
    rogue:     "#6b7280",
    sorcerer:  "#8b5cf6",
    wizard:    "#3b82f6",
  },

  rarity: {
    poor:      "#808080",
    common:    "#c8c8c8",
    uncommon:  "#56b455",
    rare:      "#3b82f6",
    epic:      "#a855f7",
    legendary: "#f59e0b",
    unique:    "#ef4444",
  },

  glow: {
    torch: {
      inner: "rgba(245, 158, 11, 0.16)",
      mid:   "rgba(245, 158, 11, 0.07)",
      outer: "rgba(245, 158, 11, 0.03)",
      edge:  "rgba(10, 10, 15, 0)",
    },
    torchText: {
      near: "rgba(245, 158, 11, 0.55)",
      far:  "rgba(245, 158, 11, 0.22)",
    },
    arcane: {
      corner:  "rgba(168, 85, 247, 0.07)",
      hover:   "rgba(168, 85, 247, 0.08)",
      ring:    "rgba(168, 85, 247, 0.06)",
      ambient: "rgba(168, 85, 247, 0.05)",
    },
    blood: {
      corner: "rgba(239, 68, 68, 0.06)",
    },
  },

  veil: {
    transparent: "rgba(0, 0, 0, 0)",
    dim:         "rgba(0, 0, 0, 0.45)",
    deep:        "rgba(0, 0, 0, 0.82)",
    voidEdge:    "rgba(10, 10, 15, 0)",
  },

  shadow: {
    card:        "0 2px 8px rgba(0, 0, 0, 0.4)",
    cardHover:   "0 6px 18px rgba(0, 0, 0, 0.5)",
    tooltip:     "0 8px 24px rgba(0, 0, 0, 0.6)",
    tooltipSoft: "0 6px 20px rgba(0, 0, 0, 0.5)",
    panel:       "0 12px 32px rgba(0, 0, 0, 0.65)",
  },
};

// ---------------------------------------------------------------------------
// buildTheme — derive pre-computed alpha variants for tier badges
// ---------------------------------------------------------------------------

function buildTheme(base) {
  const theme = structuredClone(base);
  for (const tier of Object.keys(theme.tier)) {
    const fill = theme.tier[tier].fill;
    theme.tier[tier].glow       = withAlpha(fill, 0.15);
    theme.tier[tier].glowActive = withAlpha(fill, 0.30);
    theme.tier[tier].border     = withAlpha(fill, 0.30);
  }
  return theme;
}

export const defaultTheme = buildTheme(baseTheme);

// ---------------------------------------------------------------------------
// Legacy style objects — hex values migrate to var() in step 3.
// ---------------------------------------------------------------------------

export const styles = {
  select: {
    background: "#0d0d14",
    border: "1px solid #1e1e2e",
    color: "#c8c8d4",
    padding: "4px 6px",
    borderRadius: 3,
    fontFamily: "inherit",
    fontSize: 11,
    minWidth: 140,
    cursor: "pointer",
  },
  numInput: {
    background: "#0d0d14",
    border: "1px solid #1e1e2e",
    color: "#e0e0ec",
    padding: "4px 8px",
    borderRadius: 3,
    fontFamily: "inherit",
    fontSize: 11,
    width: 80,
    textAlign: "right",
  },
  textInput: {
    background: "#0d0d14",
    border: "1px solid #1e1e2e",
    color: "#e0e0ec",
    padding: "4px 8px",
    borderRadius: 3,
    fontFamily: "inherit",
    fontSize: 11,
    flex: 1,
    minWidth: 120,
  },
  addBtn: {
    background: "none",
    border: "1px solid #1e1e2e",
    color: "#556",
    padding: "2px 8px",
    borderRadius: 3,
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 9,
    letterSpacing: "0.05em",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#664444",
    cursor: "pointer",
    fontFamily: "inherit",
    fontSize: 14,
    padding: "0 4px",
    lineHeight: 1,
    width: 20,
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 10,
    color: "#555",
    whiteSpace: "nowrap",
  },
  // Row used by damage lines (renderDmgLine) and healing lines (allHealLines)
  // in App.jsx. Previously inlined 3× inside .map() callbacks — hoisted here
  // so the object is allocated once at module load, not per-row per-render.
  dmgHealRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "4px 8px",
    background: "#0d0d14",
    borderRadius: 4,
    marginBottom: 2,
  },
  dmgHealLabel: { fontSize: 10, color: "#888" },
};

export const TIER_LABELS = {
  gold: "Peak efficiency",
  green: "Good returns",
  amber: "Tapering off",
  gray: "Diminishing returns",
};
