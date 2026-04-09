// Stat curve evaluation and analysis

// Import stat curves from JSON
// Note: Vite supports JSON imports directly
import statCurvesData from '../../data/stat_curves.json';

// Extract the curves (removing _meta)
const { _meta, ...STAT_CURVES } = statCurvesData;

export { STAT_CURVES };

// Core curve evaluation function
export function evaluateCurve(curveDef, inputValue) {
  const { segments, lowerLimit, upperLimit } = curveDef;
  const v = Math.max(segments[0].start, Math.min(segments[segments.length - 1].end, inputValue));
  let seg = segments[segments.length - 1];
  for (let i = 0; i < segments.length; i++) {
    if (v >= segments[i].start && v < segments[i].end) {
      seg = segments[i];
      break;
    }
    if (i === segments.length - 1 && v === segments[i].end) seg = segments[i];
  }
  let r = seg.startValue + seg.slope * (v - seg.start);
  if (lowerLimit != null) r = Math.max(lowerLimit, r);
  if (upperLimit != null) r = Math.min(upperLimit, r);
  return r;
}

// Get the marginal slope at a given input value
export function getMarginalSlope(curveDef, inputValue) {
  const { segments } = curveDef;
  const v = Math.max(segments[0].start, Math.min(segments[segments.length - 1].end, inputValue));
  for (let i = 0; i < segments.length; i++) {
    if (v >= segments[i].start && v < segments[i].end) return segments[i].slope;
    if (i === segments.length - 1 && v === segments[i].end) return segments[i].slope;
  }
  return segments[segments.length - 1].slope;
}

// Get context about the current position on a curve (for visualization)
export function getCurveContext(curveDef, inputValue) {
  const { segments } = curveDef;
  const v = Math.max(segments[0].start, Math.min(segments[segments.length - 1].end, inputValue));
  let segIdx = segments.length - 1;
  for (let i = 0; i < segments.length; i++) {
    if (v >= segments[i].start && v < segments[i].end) {
      segIdx = i;
      break;
    }
    if (i === segments.length - 1 && v === segments[i].end) segIdx = i;
  }
  const seg = segments[segIdx];
  const slope = seg.slope;
  const absSlope = Math.abs(slope);

  // Find the max absolute slope among "playable" segments (start >= 10)
  // to exclude extreme early catch-up zones from the baseline
  let maxPlayableSlope = 0;
  for (const s of segments) {
    if (s.start >= 10 && Math.abs(s.slope) > maxPlayableSlope) {
      maxPlayableSlope = Math.abs(s.slope);
    }
  }
  // Fallback: if no segments start >= 10, use global max
  if (maxPlayableSlope === 0) {
    for (const s of segments) {
      if (Math.abs(s.slope) > maxPlayableSlope) maxPlayableSlope = Math.abs(s.slope);
    }
  }

  const slopeRatio = maxPlayableSlope > 0 ? absSlope / maxPlayableSlope : 0;

  // Check if next segment has higher absolute slope (acceleration zone ahead)
  const nextSeg = segIdx < segments.length - 1 ? segments[segIdx + 1] : null;
  const isAccelerating = nextSeg && Math.abs(nextSeg.slope) > absSlope * 1.2;
  const distToNextSeg = nextSeg ? nextSeg.start - v : null;

  return {
    slope,
    absSlope,
    maxPlayableSlope,
    slopeRatio,
    segmentStart: seg.start,
    segmentEnd: seg.end,
    isGoldenZone: slopeRatio >= 0.95,
    isAccelerating,
    distToNextSeg,
    nextSegmentSlope: nextSeg ? nextSeg.slope : null,
    // Color tier: gold = peak, green = good, amber = tapering, gray = diminishing
    tier: slopeRatio >= 0.95 ? "gold" : slopeRatio >= 0.5 ? "green" : slopeRatio >= 0.2 ? "amber" : "gray",
  };
}

// Mapping: derived stat ID → { curveKey, getInput(ds, attrs), unit, inputLabel }
export const DERIVED_CURVE_MAP = {
  hp: {
    curveKey: "health",
    getInput: (ds, a) => ds.healthRating,
    unit: "flat",
    formula: "STR × 0.25 + VIG × 0.75",
    attrs: [{ attr: "STR", weight: 0.25 }, { attr: "VIG", weight: 0.75 }]
  },
  ppb: {
    curveKey: "physicalPowerBonus",
    getInput: (ds, a) => ds.physicalPower,
    unit: "percent",
    formula: "STR + Physical Power gear",
    attrs: [{ attr: "STR", weight: 1 }]
  },
  mpb: {
    curveKey: "magicPowerBonus",
    getInput: (ds, a) => ds.magicalPower,
    unit: "percent",
    formula: "WIL + Magical Power gear",
    attrs: [{ attr: "WIL", weight: 1 }]
  },
  pdr: {
    curveKey: "armorRatingToPDR",
    getInput: (ds, a) => ds.armorRating,
    unit: "percent",
    inputLabel: "AR",
    formula: "Armor Rating (gear only)",
    attrs: []
  },
  mdr: {
    curveKey: "magicResistanceToMDR",
    getInput: (ds, a) => ds.magicResistance,
    unit: "percent",
    inputLabel: "MR",
    formula: "WIL → base MR + gear MR",
    attrs: []
  },
  moveSpeed: {
    curveKey: "moveSpeed",
    getInput: (ds, a) => a.agi,
    unit: "flat",
    formula: "AGI",
    attrs: [{ attr: "AGI", weight: 1 }]
  },
  actionSpeed: {
    curveKey: "actionSpeed",
    getInput: (ds, a) => ds.actionSpeedRating,
    unit: "percent",
    formula: "AGI × 0.25 + DEX × 0.75",
    attrs: [{ attr: "AGI", weight: 0.25 }, { attr: "DEX", weight: 0.75 }]
  },
  spellCastingSpeed: {
    curveKey: "spellCastingSpeed",
    getInput: (ds, a) => a.kno,
    unit: "percent",
    formula: "KNO",
    attrs: [{ attr: "KNO", weight: 1 }]
  },
  regularInteractionSpeed: {
    curveKey: "regularInteractionSpeed",
    getInput: (ds, a) => a.dex * 0.25 + a.res * 0.75,
    unit: "percent",
    formula: "DEX × 0.25 + RES × 0.75",
    attrs: [{ attr: "DEX", weight: 0.25 }, { attr: "RES", weight: 0.75 }]
  },
  magicalInteractionSpeed: {
    curveKey: "magicalInteractionSpeed",
    getInput: (ds, a) => a.wil,
    unit: "percent",
    formula: "WIL",
    attrs: [{ attr: "WIL", weight: 1 }]
  },
  cdr: {
    curveKey: "cooldownReduction",
    getInput: (ds, a) => a.res,
    unit: "percent",
    formula: "RES",
    attrs: [{ attr: "RES", weight: 1 }]
  },
  buffDuration: {
    curveKey: "buffDuration",
    getInput: (ds, a) => a.wil,
    unit: "percent",
    formula: "WIL",
    attrs: [{ attr: "WIL", weight: 1 }]
  },
  debuffDuration: {
    curveKey: "debuffDuration",
    getInput: (ds, a) => a.wil,
    unit: "percent",
    formula: "WIL",
    attrs: [{ attr: "WIL", weight: 1 }]
  },
  memoryCapacity: {
    curveKey: "memoryCapacity",
    getInput: (ds, a) => a.kno,
    unit: "flat",
    formula: "KNO",
    attrs: [{ attr: "KNO", weight: 1 }]
  },
  healthRecovery: {
    curveKey: "healthRecovery",
    getInput: (ds, a) => a.vig,
    unit: "percent",
    formula: "VIG",
    attrs: [{ attr: "VIG", weight: 1 }]
  },
  memoryRecovery: {
    curveKey: "memoryRecovery",
    getInput: (ds, a) => a.kno,
    unit: "percent",
    formula: "KNO",
    attrs: [{ attr: "KNO", weight: 1 }]
  },
  manualDexterity: {
    curveKey: "manualDexterity",
    getInput: (ds, a) => a.dex,
    unit: "percent",
    formula: "DEX",
    attrs: [{ attr: "DEX", weight: 1 }]
  },
  equipSpeed: {
    curveKey: "itemEquipSpeed",
    getInput: (ds, a) => a.dex,
    unit: "percent",
    formula: "DEX",
    attrs: [{ attr: "DEX", weight: 1 }]
  },
  persuasiveness: {
    curveKey: "persuasiveness",
    getInput: (ds, a) => a.res,
    unit: "flat",
    formula: "RES",
    attrs: [{ attr: "RES", weight: 1 }]
  },
};

export const TIER_COLORS = {
  gold: "#fbbf24",
  green: "#4ade80",
  amber: "#f97316",
  gray: "#555",
};
