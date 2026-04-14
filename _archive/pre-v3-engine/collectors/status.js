// Target-status effect collector — stub for Phase 1.
//
// When the user toggles a target status in the Target Editor (frostbite,
// burn, etc.), the engine looks up which equipped ability applies it and
// yields that ability's appliesStatus[].effects. No Warlock ability applies
// a STATUS_TYPES status in Phase 1 — Hellfire is direct DoT damage in
// damage[], Curse of Pain is a DoT, neither produces a "status" per spec.
// Wizard / Sorcerer / Rogue exercise this later.
//
// Stub returns no entries. The Target Editor still displays the section.

export function collectStatusEffects(_ctx) {
  // TODO(Phase 3): walk ctx.classData abilities for appliesStatus entries;
  // match against ctx.targetStatuses toggled on; yield their effects.
  return [];
}
