// getAvailableSpells — pure helper for the `grantsSpells` v3 field.
//
// A spell is "available" (castable and displayed) when either:
//   1. It is equipped in spell memory (ctx.selectedSpells includes its id), OR
//   2. Some active ability grants it via `grantsSpells: [spellId, ...]`.
//
// Used by UI (spell picker / available-spells list) and by engine cost /
// damage display (only available spells cast costs and damage).
//
// First Warlock use case: Blood Pact (toggle skill). While active, its
// `grantsSpells: ["bolt_of_darkness"]` makes Bolt of Darkness castable
// bare-handed without being in spell memory.

import { isAbilityActive } from './conditions.js';

export function getAvailableSpells(ctx) {
  const spells = ctx.classData?.spells ?? [];
  const byId = new Map(spells.map(s => [s.id, s]));

  const availableIds = new Set();

  for (const id of ctx.selectedSpells ?? []) {
    if (byId.has(id)) availableIds.add(id);
  }

  for (const ability of enumerateGranters(ctx)) {
    if (!isAbilityActive(ability.id, ctx)) continue;
    for (const spellId of ability.grantsSpells) {
      if (byId.has(spellId)) availableIds.add(spellId);
    }
  }

  return [...availableIds].map(id => byId.get(id));
}

function enumerateGranters(ctx) {
  const out = [];
  const visit = (list) => {
    if (!Array.isArray(list)) return;
    for (const ability of list) {
      if (Array.isArray(ability?.grantsSpells) && ability.grantsSpells.length > 0) {
        out.push(ability);
      }
    }
  };
  visit(ctx.classData?.perks);
  visit(ctx.classData?.skills);
  visit(ctx.classData?.spells);
  visit(ctx.classData?.transformations);
  return out;
}
