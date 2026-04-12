// Yields effects from toggled-on buffs (skills/spells with activation:
// "toggle" that the user has turned on via activeBuffs[id] === true).
//
// Walks classData.skills and classData.spells for items whose id is in
// ctx.activeBuffs. Emits top-level effects[]. Stacking effects come from
// a separate collector; summons/afterEffects have their own collectors.

export function collectBuffEffects(ctx) {
  const out = [];
  const active = ctx.activeBuffs ?? {};
  const containers = [
    ["skill", ctx.classData?.skills ?? []],
    ["spell", ctx.classData?.spells ?? []],
  ];
  for (const [source, list] of containers) {
    for (const ability of list) {
      if (!active[ability.id]) continue;
      if (!Array.isArray(ability.effects)) continue;
      for (const effect of ability.effects) {
        out.push({ source, ability, effect });
      }
    }
  }
  return out;
}
