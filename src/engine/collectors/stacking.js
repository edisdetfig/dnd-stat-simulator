// Yields stacking effects — one entry per stack level selected.
//
// An ability with `stacking: { maxStacks, perStack: Effect[] }` yields
// `perStack.length × selectedStacks[abilityId]` entries, provided the
// ability is **selected / equipped** (in selectedPerks, selectedSkills,
// or selectedSpells).
//
// Active-toggle state is NOT required. Stacks are user-declared resource
// state per the snapshot principle: the engine trusts the declared count.
// This matters for cast-activation abilities (e.g., Spell Predation)
// which never appear in activeAbilityIds — they're one-shot casts that
// leave behind shard state. Previously gating on isAbilityActive silently
// dropped their contributions.
//
// Independent-pool note: Warlock has multiple abilities that track
// "darkness shards" (Soul Collector, Spell Predation, Blood Pact shard
// lock-in). The in-game cap is 3 shards shared across all sources, but
// this engine tracks each ability's stack count independently — the
// user is responsible for respecting the shared cap (snapshot principle).
// A future "class-level resource pool" primitive is planned once a
// second class demonstrates the same pattern.

export function collectStackingEffects(ctx) {
  const out = [];
  const selected = ctx.selectedStacks ?? {};

  for (const ability of enumerateEquippedStackables(ctx)) {
    const count = selected[ability.id] ?? 0;
    if (count <= 0) continue;

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

function enumerateEquippedStackables(ctx) {
  const selectedPerks  = new Set(ctx.selectedPerks  ?? []);
  const selectedSkills = new Set(ctx.selectedSkills ?? []);
  const selectedSpells = new Set(ctx.selectedSpells ?? []);

  const out = [];
  const visit = (list, selectedSet) => {
    if (!Array.isArray(list)) return;
    for (const ability of list) {
      if (ability?.stacking?.maxStacks > 0 && selectedSet.has(ability.id)) {
        out.push(ability);
      }
    }
  };
  visit(ctx.classData?.perks,  selectedPerks);
  visit(ctx.classData?.skills, selectedSkills);
  visit(ctx.classData?.spells, selectedSpells);
  return out;
}
