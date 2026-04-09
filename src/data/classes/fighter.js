// Fighter class definition
// Season 8, Hotfix 112-1

export const fighter = {
  id: "fighter",
  name: "Fighter",

  // Base attributes (all 15s - balanced)
  baseStats: {
    str: 15,
    vig: 15,
    agi: 15,
    dex: 15,
    wil: 15,
    kno: 15,
    res: 15,
  },

  // Class configuration
  maxPerks: 4,
  maxSkills: 2,
  spellCostType: "none",  // Fighter has no spells
  equippableArmor: ["cloth", "leather", "plate"],

  // Stats to prominently display for this class
  majorDerivedStats: [
    "hp", "ppb", "pdr", "mdr", "moveSpeed", "actionSpeed"
  ],

  // Perks (partial - Defense Mastery as example of capOverride pattern)
  perks: [
    {
      id: "defense_mastery",
      name: "Defense Mastery",
      desc: "PDR cap raised to 75%.",
      capOverrides: {
        pdr: 0.75,
      },
    },
    // TODO: Add remaining Fighter perks
  ],

  // Skills
  skills: [
    // TODO: Add Fighter skills (Second Wind, Sprint, etc.)
  ],

  // Spells (Fighter has none)
  spells: [],
};
