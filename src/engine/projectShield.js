// projectShield — Stage 6 of the engine pipeline (shield branch).
//
// For each SHIELD_ATOM: absorb = base + scaling × MPB.
// Per arch-doc §17 + plan §3.10.

export function projectShield(shieldAtoms, derivedStats) {
  const mpb = derivedStats.mpb?.value ?? 0;
  const out = [];
  for (const atom of shieldAtoms) {
    const absorb = (atom.base ?? 0) + (atom.scaling ?? 0) * mpb;
    out.push({
      atomId:       atom.atomId,
      source:       atom.source,
      damageFilter: atom.damageFilter ?? null,
      absorbAmount: absorb,
      duration:     atom.duration,
    });
  }
  return out;
}
