// Yields ability-level effects from selected perks.
//
// Perks default to `activation: "passive"` — always active when selected.
// Some perks have effects gated by ability-level or effect-level conditions
// (e.g., Shadow Touch with weapon_type, Demon Armor always on). The pipeline
// decides whether each yielded effect passes.

export function collectPerkEffects(ctx) {
  const out = [];
  const perks = ctx.classData?.perks ?? [];
  const selected = new Set(ctx.selectedPerks ?? []);
  for (const perk of perks) {
    if (!selected.has(perk.id)) continue;
    if (!Array.isArray(perk.effects)) continue;
    for (const effect of perk.effects) {
      out.push({ source: "perk", ability: perk, effect });
    }
  }
  return out;
}
