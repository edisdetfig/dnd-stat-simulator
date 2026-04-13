// Class registry.
// Classes register here as their v3 definition files land in src/data/classes/.

import { fighter } from './fighter.js';
import { barbarian } from './barbarian.js';
import { ranger } from './ranger.js';
import { rogue } from './rogue.js';
import { cleric } from './cleric.js';
import { wizard } from './wizard.js';

export const CLASSES = {
  fighter,
  barbarian,
  ranger,
  rogue,
  cleric,
  wizard,
};

export const CLASS_LIST = Object.values(CLASSES);

export function getClass(id) {
  return CLASSES[id] ?? null;
}

// ── ClassPicker roster ──
//
// Decoupled from CLASSES so the landing page can still render class tiles
// during authoring. All classes are "coming_soon" until their v3 data file
// lands during Phase 1.2.
export const CLASS_ROSTER = [
  { id: "fighter",   name: "Fighter",   tagline: "Weapon mastery and defensive stance.",                 color: "var(--sim-class-identity-fighter)",   status: "active" },
  { id: "barbarian", name: "Barbarian", tagline: "Rage, carnage, and two-handed devastation.",           color: "var(--sim-class-identity-barbarian)", status: "active" },
  { id: "ranger",    name: "Ranger",    tagline: "Precision ranged combat and traps.",                   color: "var(--sim-class-identity-ranger)",    status: "active" },
  { id: "rogue",     name: "Rogue",     tagline: "Stealth, backstabs, and poisoned weapons.",            color: "var(--sim-class-identity-rogue)",     status: "active" },
  { id: "wizard",    name: "Wizard",    tagline: "Arcane devastation and elemental mastery.",            color: "var(--sim-class-identity-wizard)",    status: "active" },
  { id: "warlock",   name: "Warlock",   tagline: "Blood magic, curses, and demonic pacts.",              color: "var(--sim-class-identity-warlock)",   status: "coming_soon" },
  { id: "cleric",    name: "Cleric",    tagline: "Divine healing, shields, and holy damage.",            color: "var(--sim-class-identity-cleric)",    status: "active" },
  { id: "druid",     name: "Druid",     tagline: "Shapeshift into beasts; nature's fury and healing.",   color: "var(--sim-class-identity-druid)",     status: "coming_soon" },
  { id: "sorcerer",  name: "Sorcerer",  tagline: "Merged elemental spells and summoned elementals.",     color: "var(--sim-class-identity-sorcerer)",  status: "coming_soon" },
  { id: "bard",      name: "Bard",      tagline: "Musical performance buffs and inspirational play.",    color: "var(--sim-class-identity-bard)",      status: "coming_soon" },
];
