// Religion blessing definitions

export const RELIGION_BLESSINGS = [
  { id: "none", name: "None", cost: 0, effects: [] },
  {
    id: "noxulon",
    name: "Blessing of Noxulon",
    cost: 20,
    description: "+20% Regular Interaction Speed",
    effects: [{ stat: "regularInteractionSpeed", value: 0.20, label: "RIS" }],
    verification: "VERIFIED"
  },
  {
    id: "blythar",
    name: "Blessing of Blythar",
    cost: 20,
    description: "+30 Luck",
    effects: [{ stat: "luck", value: 30, label: "Luck" }],
    verification: "VERIFIED"
  },
  {
    id: "solaris",
    name: "Blessing of Solaris",
    cost: 20,
    description: "+5% Cooldown Reduction",
    effects: [{ stat: "cdr", value: 0.05, label: "CDR" }],
    verification: "VERIFIED"
  },
  {
    id: "zorin",
    name: "Blessing of Zorin",
    cost: 16,
    description: "+8% Magic Penetration",
    effects: [{ stat: "magicPenetration", value: 0.08, label: "Magic Pen" }],
    verification: "VERIFIED"
  },
];
