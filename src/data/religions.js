// Religion blessing definitions (v3 shape)
//
// Each blessing's `effects` array uses the unified effect shape:
//   { stat, value, phase }  — no `label` field (derive from STAT_META).
// Per v3 data map religion audit: all blessings are post_curve flat additions.
//
// `verification` is retained on the blessing object itself (not per-effect)
// and tracks the verification status of the blessing's in-game values.

export const RELIGION_BLESSINGS = [
  {
    id: "none",
    name: "None",
    cost: 0,
    effects: [],
  },
  {
    id: "noxulon",
    name: "Blessing of Noxulon",
    cost: 20,
    description: "+20% Regular Interaction Speed",
    effects: [
      { stat: "regularInteractionSpeed", value: 0.20, phase: "post_curve" },
    ],
    verification: "VERIFIED",
  },
  {
    id: "blythar",
    name: "Blessing of Blythar",
    cost: 20,
    description: "+30 Luck",
    effects: [
      { stat: "luck", value: 30, phase: "post_curve" },
    ],
    verification: "VERIFIED",
  },
  {
    id: "solaris",
    name: "Blessing of Solaris",
    cost: 20,
    description: "+5% Cooldown Reduction",
    effects: [
      // stat renamed from "cdr" → "cooldownReductionBonus": this is the bonus
      // key consumed by the cdr recipe as a flat add after the CDR curve.
      { stat: "cooldownReductionBonus", value: 0.05, phase: "post_curve" },
    ],
    verification: "VERIFIED",
  },
  {
    id: "zorin",
    name: "Blessing of Zorin",
    cost: 16,
    description: "+8% Magic Penetration",
    effects: [
      { stat: "magicPenetration", value: 0.08, phase: "post_curve" },
    ],
    verification: "VERIFIED",
  },
];
