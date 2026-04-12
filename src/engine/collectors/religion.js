// Yields effects from the selected religion blessing.
// Religions live on ctx.religion — the full blessing object or null.

export function collectReligionEffects(ctx) {
  const out = [];
  const r = ctx.religion;
  if (!r || !Array.isArray(r.effects)) return out;
  for (const effect of r.effects) {
    out.push({ source: "religion", ability: r, effect });
  }
  return out;
}
