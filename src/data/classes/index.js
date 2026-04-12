// Class registry.
// Insertion order = display order in the ClassPicker.

import WARLOCK from './warlock.js';

export const CLASSES = {
  warlock: WARLOCK,
};

export const CLASS_LIST = Object.values(CLASSES);

export function getClass(id) {
  return CLASSES[id] ?? null;
}

// ── ClassPicker roster ──
//
// Decoupled from CLASSES so locked/coming-soon classes can appear in
// the landing page before their data is authored. When a class data file
// lands (Phase 4 waves), flip its status to "active" and remove the
// roster-only placeholder.
export const CLASS_ROSTER = [
  { id: "fighter",   name: "Fighter",   tagline: "Weapon mastery and defensive stance.",             color: "var(--sim-class-identity-fighter)",   status: "coming_soon" },
  { id: "barbarian", name: "Barbarian", tagline: "Rage, carnage, and two-handed devastation.",       color: "var(--sim-class-identity-barbarian)", status: "coming_soon" },
  { id: "ranger",    name: "Ranger",    tagline: "Precision ranged combat and traps.",               color: "var(--sim-class-identity-ranger)",    status: "coming_soon" },
  { id: "rogue",     name: "Rogue",     tagline: "Stealth, backstabs, and poisoned weapons.",        color: "var(--sim-class-identity-rogue)",     status: "coming_soon" },
  { id: "wizard",    name: "Wizard",    tagline: "Arcane devastation and elemental mastery.",        color: "var(--sim-class-identity-wizard)",    status: "coming_soon" },
  { id: "warlock",   name: "Warlock",   tagline: "Blood magic, curses, and demonic pacts.",          color: "var(--sim-class-identity-warlock)",   status: "active" },
  { id: "cleric",    name: "Cleric",    tagline: "Divine healing, shields, and holy damage.",        color: "var(--sim-class-identity-cleric)",    status: "coming_soon" },
  { id: "druid",     name: "Druid",     tagline: "Shapeshift into beasts; nature's fury and healing.", color: "var(--sim-class-identity-druid)",   status: "coming_soon" },
  { id: "sorcerer",  name: "Sorcerer",  tagline: "Merged elemental spells and summoned elementals.", color: "var(--sim-class-identity-sorcerer)",  status: "coming_soon" },
  { id: "bard",      name: "Bard",      tagline: "Musical performance buffs and inspirational play.", color: "var(--sim-class-identity-bard)",     status: "coming_soon" },
];
