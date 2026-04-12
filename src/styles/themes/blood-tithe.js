// Blood Tithe — Warlock UI theme
//
// Warm near-black backgrounds, dusty blood red primary accent, true gold
// trim, hot magenta power highlights. Inspired by the warlock's crimson
// battle-skirt, dark plate armor, and glowing helmet gem.
//
// Design motifs: riveted steel borders with gold at seams, amber/torch
// warmth throughout, visual hierarchy reads like the character itself —
// gold-grounded base, dark armored middle, crimson accents, single
// magenta jewel as focal point.

import { buildTheme } from '../theme.js';

const base = {
  // Surfaces — warm near-black dungeon stone, torchlit.
  // Layers: void (deepest stone) → ink (chamber walls) → shadow (gunmetal
  // plate) → stone (worn leather straps) → iron (plate highlight).
  surface: {
    abyss:    "#0e0c0a",
    void:     "#141210",   // warm near-black (torchlit dungeon stone)
    ink:      "#1E1C1A",   // dark warm grey (chamber walls)
    inkRaised: "#232120",
    shadow:   "#2A2A2E",   // gunmetal steel (plate armor shadow tone)
    stone:    "#4A2828",   // burgundy-brown (worn leather between plates)
    iron:     "#5C5C64",   // mid silver (plate armor catching light)
    input:    "#4A2828",   // burgundy-brown — input fields feel like leather
  },

  // Borders — steel plate seams with gold at joints and rivets.
  border: {
    whisper:  "#1E1C1A",
    hairline: "#2A2A2E",   // gunmetal plate edge
    seam:     "#4A3C20",   // dark gold at joints (gold rivet line)
    edge:     "#6A5C40",   // warm gold-tinted silver (active border rivets)
    info:     "#6A6460",   // warm silver (tooltip border)
    focus:    "#8B2028",   // dusty blood red (selected state)
  },

  text: {
    primary: "#E0D8CC",    // warm parchment
    body:    "#C0B8C0",    // lavender-grey (ashen warlock skin)
    muted:   "#9A9294",    // readable secondary labels
    dim:     "#7A7476",    // metadata, version strings
    whisper: "#605A5C",    // faint captions (raised for warm bg contrast)
    aside:   "#8A8486",    // card taglines
    ghost:   "#504A4C",    // barely visible hints (raised from #383234)
  },

  state: {
    active: { bg: "#201A14", fg: "#B8942C", border: "rgba(184, 148, 44, 0.25)" },
    wip:    { bg: "#2A2014", fg: "#B8942C", border: "rgba(184, 148, 44, 0.25)" },
    locked: { bg: "#1E1C1A", fg: "#484244", border: "#3A3838" },
  },

  // Tier — full warm palette: gold peak, silver good, rust tapering
  tier: {
    peak:     { fill: "#B8942C" },  // true gold
    good:     { fill: "#C0B8C0" },  // silver (warm "good" — distinct from gold)
    tapering: { fill: "#8A7020" },  // aged rust-gold
    dim:      { fill: "#484244" },  // warm gray
  },

  stat: {
    physical:       "#B8942C",   // true gold
    physicalSoft:   "rgba(184, 148, 44, 0.5)",
    magical:        "#8B2028",   // dusty blood red
    magicalSoft:    "rgba(139, 32, 40, 0.5)",
    healing:        "#D4AC38",   // bright gold (warlock heals through sacrifice)
    build:          "#B8942C",   // true gold
    buildBadge:     "rgba(184, 148, 44, 0.145)",
    weapon:         "#5C5C64",   // steel silver
    spellcraft:     "#8B2028",   // blood red
    headshot:       "#D42268",   // hot magenta
    headshotSoft:   "rgba(212, 34, 104, 0.5)",
    shapeshift:     "#8A7020",   // aged rust-gold
    shapeshiftSoft: "rgba(138, 112, 32, 0.5)",
  },

  damageType: {
    physical: {
      body:       "#B8942C",
      head:       "#D42268",   // hot magenta
      bodyLabel:  "#8A7020",
      headLabel:  "#6A2040",
      bodyWell:   "#1A1810",
      headWell:   "#1A0E14",
      wellFrame:  "#1A1510",
      wellBorder: "#3A3020",
    },
    magical: { value: "#A83040" },   // lighter blood
    heal:    { value: "#D4AC38" },   // bright gold
    formAttack: {
      body:       "#8A7020",
      bodyLabel:  "#6A5818",
      bodyWell:   "#1A1810",
      wellFrame:  "#1A1510",
      wellBorder: "#3A3020",
    },
  },

  accent: {
    arcane: {
      core:  "#8B2028",   // dusty blood red (primary accent)
      soft:  "#A83040",
      pale:  "#C04858",
      frost: "#D06068",
      muted: "#6B1820",
      glow:  "#501018",
    },
    flame: {
      hot:    "#B8942C",   // true gold
      glow:   "#D4AC38",
      rust:   "#8A7020",
      dim:    "#5C5030",
      scorch: "#3A3020",
      ember:  "#1A1510",
    },
    verdant: {
      life:     "#D4AC38",   // bright gold (attribute values, buff active)
      bright:   "#E0C050",   // hot gold (buff toggle dot)
      moss:     "#5C5030",   // dark gold (buff toggle track)
      loam:     "#3A3020",   // dark warm (attribute card border)
      forest:   "#1A1510",   // deep warm (attribute card bg)
      jade:     "#B8942C",   // true gold
      pass:     "#B8942C",   // test pass = gold
      uncommon: "#56b455",   // keep — rarity canonical
    },
    blood: {
      wound:   "#D42268",   // hot magenta — ONLY for headshot/crit (the gem)
      peril:   "#C03048",   // bright blood (danger, not magenta)
      crimson: "#8B2028",   // dried blood
      bruise:  "#6A2040",
      scab:    "#4A2828",   // burgundy-brown leather
      clotted: "#1A0E14",
      murmur:  "#8B2028",   // HP cost (dried blood, not magenta)
      whisper: "#6B1820",
      ember:   "#A83040",   // test fail — blood, not magenta (save the gem)
    },
    azure: {
      steel:  "#5C5C64",   // steel silver (no blue in this theme)
      cobalt: "#5C5C64",
      pulse:  "#B8942C",   // gold for active states
      ice:    "#908888",
    },
    arcanum: {
      core: "#B8942C",     // gold
    },
    arcane: {
      core:  "#8B2028",    // blood red
      pale:  "#c98f92",
      frost: "#e6c3c5",
    },
  },

  state: {
    active: { bg: "rgba(139, 32, 40, 0.18)", fg: "#e6c3c5", border: "rgba(139, 32, 40, 0.40)" },
    wip:    { bg: "rgba(184, 148, 44, 0.14)", fg: "#B8942C", border: "rgba(184, 148, 44, 0.38)" },
    locked: { bg: "rgba(58, 40, 36, 0.28)",   fg: "#7a6a6c", border: "#3a2824" },
  },

  stat: {
    physical:     "#b85a5a",
    physicalSoft: "rgba(184, 90, 90, 0.22)",
    magical:      "#B8942C",
    magicalSoft:  "rgba(184, 148, 44, 0.22)",
    headshot:     "#f59e0b",
    headshotSoft: "rgba(245, 158, 11, 0.22)",
  },

  classIdentity: {
    warlock:   "#8B2028",  // blood red in this theme
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

  // Rarity — keep game-canonical for recognition
  rarity: {
    poor:      "#808080",
    common:    "#c8c8c8",
    uncommon:  "#56b455",
    rare:      "#3b82f6",
    epic:      "#a855f7",
    legendary: "#f59e0b",
    unique:    "#ef4444",
  },

  // Atmosphere — warm amber/blood glows instead of cool violet
  glow: {
    torch: {
      inner: "rgba(184, 148, 44, 0.16)",
      mid:   "rgba(184, 148, 44, 0.07)",
      outer: "rgba(184, 148, 44, 0.03)",
      edge:  "rgba(20, 18, 16, 0)",
    },
    torchText: {
      near: "rgba(184, 148, 44, 0.55)",
      far:  "rgba(184, 148, 44, 0.22)",
    },
    arcane: {
      corner:  "rgba(139, 32, 40, 0.07)",   // blood red ambient
      hover:   "rgba(139, 32, 40, 0.08)",
      ring:    "rgba(139, 32, 40, 0.06)",
      ambient: "rgba(139, 32, 40, 0.05)",
    },
    blood: {
      corner: "rgba(212, 34, 104, 0.06)",   // magenta corner hint
    },
  },

  veil: {
    transparent: "rgba(0, 0, 0, 0)",
    dim:         "rgba(0, 0, 0, 0.45)",
    deep:        "rgba(0, 0, 0, 0.82)",
    voidEdge:    "rgba(20, 18, 16, 0)",
  },

  shadow: {
    card:          "0 2px 8px rgba(10, 8, 6, 0.5)",
    cardHover:     "0 6px 18px rgba(10, 8, 6, 0.6)",
    tooltip:       "0 8px 24px rgba(10, 8, 6, 0.7)",
    tooltipSoft:   "0 6px 20px rgba(10, 8, 6, 0.6)",
    panel:         "0 12px 32px rgba(10, 8, 6, 0.75)",
    exPickerPanel: "0 12px 32px rgba(10, 8, 6, 0.75), 0 0 0 1px rgba(139, 32, 40, 0.06), 0 0 24px rgba(139, 32, 40, 0.05)",
  },
};

export const bloodTitheTheme = buildTheme(base);
