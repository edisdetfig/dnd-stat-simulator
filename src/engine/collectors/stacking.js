// Yields stacking effects — one entry per stack level selected.
//
// An ability with `stacking: { maxStacks, perStack: Effect[] }` yields
// `perStack.length × selectedStacks[abilityId]` entries. If the parent
// ability isn't active (selectedPerks / activeBuffs / activeForm), its
// stacks are ignored.
//
// Independent-pool note: Warlock has multiple abilities that track
// "darkness shards" (Soul Collector, Spell Predation, Blood Pact shard
// lock-in). The in-game cap is 3 shards shared across all sources, but
// this engine tracks each ability's stack count independently — the
// user is responsible for respecting the shared cap (snapshot principle).
// A future "class-level resource pool" primitive is planned once a
// second class demonstrates the same pattern.

import { isAbilityActive } from '../conditions.js';

export function collectStackingEffects(ctx) {
  const out = [];
  const selected = ctx.selectedStacks ?? {};

  for (const ability of enumerateStackables(ctx)) {
    const count = selected[ability.id] ?? 0;
    if (count <= 0) continue;
    if (!isAbilityActive(ability.id, ctx)) continue;

    const perStack = ability.stacking.perStack;
    if (!Array.isArray(perStack)) continue;

    for (let stack = 0; stack < count; stack++) {
      for (const effect of perStack) {
        out.push({ source: "stacking", ability, effect });
      }
    }
  }
  return out;
}

function enumerateStackables(ctx) {
  const out = [];
  const visit = (list) => {
    if (!Array.isArray(list)) return;
    for (const ability of list) {
      if (ability?.stacking?.maxStacks > 0) out.push(ability);
    }
  };
  visit(ctx.classData?.perks);
  visit(ctx.classData?.skills);
  visit(ctx.classData?.spells);
  return out;
}
