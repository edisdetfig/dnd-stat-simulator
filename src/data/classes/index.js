// Class definitions aggregator
// Import all class files and export unified CLASSES object

import { warlock } from './warlock.js';
import { fighter } from './fighter.js';
import { druid } from './druid.js';

// Aggregate all classes into a single lookup object
export const CLASSES = {
  warlock,
  fighter,
  druid,
};

// Export individual classes for direct import if needed
export { warlock, fighter, druid };

// Display metadata for the class picker landing page.
// Order: playable (active / wip) first, then coming_soon alphabetically.
// Status legend:
//   active      — fully implemented, clickable
//   wip         — clickable but marked as a work-in-progress stub
//   coming_soon — greyed out, not clickable
export const CLASS_ROSTER = [
  {
    id: "warlock",
    name: "Warlock",
    tagline: "Curse-spamming bald dome in plate armor that shouldn't be his",
    status: "active",
    color: "#a855f7",
  },
  {
    id: "fighter",
    name: "Fighter",
    tagline: "Vanilla Mario main — does nothing special, dies to everything special",
    status: "wip",
    color: "#94a3b8",
  },
  {
    id: "barbarian",
    name: "Barbarian",
    tagline: "Shirtless 80-IQ W key — hold left click and collect loot",
    status: "coming_soon",
    color: "#dc2626",
  },
  {
    id: "bard",
    name: "Bard",
    tagline: "Shreds lute so hard the whole dungeon comes to shut him up",
    status: "coming_soon",
    color: "#ec4899",
  },
  {
    id: "cleric",
    name: "Cleric",
    tagline: "Beer-chugging bonk stick that forgot it was a healer",
    status: "coming_soon",
    color: "#fbbf24",
  },
  {
    id: "druid",
    name: "Druid",
    tagline: "A whole zoo in a trenchcoat with a get-out-of-jail-free card",
    status: "wip",
    color: "#84cc16",
  },
  {
    id: "ranger",
    name: "Ranger",
    tagline: "Backpedals into the shadow realm while arrows ruin your day",
    status: "coming_soon",
    color: "#22c55e",
  },
  {
    id: "rogue",
    name: "Rogue",
    tagline: "Worst class in the game (coping) — dies if someone looks at him",
    status: "coming_soon",
    color: "#6b7280",
  },
  {
    id: "sorcerer",
    name: "Sorcerer",
    tagline: "Walking natural disaster that wombo combos you before you learn what she does",
    status: "coming_soon",
    color: "#8b5cf6",
  },
  {
    id: "wizard",
    name: "Wizard",
    tagline: "Will fireball himself, his team, and then die to a naked barbarian",
    status: "coming_soon",
    color: "#3b82f6",
  },
];

// Safe stub used when no class is selected yet. Lets the main App hooks run
// without null checks everywhere — we render the ClassPicker overlay before
// any of the stub's computed values reach the DOM.
export const EMPTY_CLASS_STUB = {
  id: "_empty",
  name: "—",
  baseStats: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 },
  perks: [],
  skills: [],
  spells: [],
  maxPerks: 4,
  maxSkills: 2,
  majorDerivedStats: [],
  spellCostType: "none",
  equippableArmor: [],
};
