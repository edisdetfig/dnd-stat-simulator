// aggregate — Stage 4 of the engine pipeline.
//
// Bucket Stage 3 `effects` atoms by (stat, phase) into `bonuses`. Route
// `type_damage_bonus` atoms into `perTypeBonuses` (keyed by implied damage
// type). Route `post_cap_multiplicative_layer` atoms into
// `postCapMultiplicativeLayers` (preserving each atom's condition). Route
// `cap_override` atoms into `capOverrides`. Fold gear bonuses as a synthetic
// "gear" phase. Support `target: "either"` dual-routing per arch-doc §6.1 +
// plan §3.6.
//
// Routing rules (plan §3.6, items 1–7):
//   1. Default: bonuses[atom.stat][atom.phase] += atom.materializedValue
//   2. type_damage_bonus: lookup TYPED_STAT_TO_DAMAGE_TYPE[atom.stat]; add
//      to perTypeBonuses[dtype]. A typed-stat with an unknown mapping is
//      an authoring error — silently ignored here; validator catches.
//   3. post_cap_multiplicative_layer: push {stat, multiplier, condition}
//      into postCapMultiplicativeLayers; condition preserved for Stage 6
//      per-projection re-evaluation.
//   4. cap_override: capOverrides[atom.stat] = materializedValue.
//   5. Invariant: damage_type-conditioned atoms should only be at
//      post_cap_multiplicative_layer phase — enforced at authoring time by
//      validator rule C.damage_type_phase_invariant; no engine check here.
//   6. Gear bonuses: folded into bonuses[stat].gear (synthetic phase).
//   7. target: "either": route via ctx.applyToSelf[abilityId] /
//      ctx.applyToEnemy[abilityId] — both can be true (dual-route).
//
// Output shape:
//   bonuses:                     Record<StatId, Record<Phase, number>>
//   perTypeBonuses:              Record<DamageType, number>
//   postCapMultiplicativeLayers: Array<{stat, multiplier, condition?}>
//   capOverrides:                Record<RecipeId, number>

// Typed-stat → damage-type mapping (plan §3.6 rule 2). Adding a damage
// subtype + typed stat requires: DAMAGE_TYPES edit + STAT_META entry +
// one entry here.
const TYPED_STAT_TO_DAMAGE_TYPE = Object.freeze({
  divineDamageBonus:    "divine_magical",
  darkDamageBonus:      "dark_magical",
  evilDamageBonus:      "evil_magical",
  fireDamageBonus:      "fire_magical",
  iceDamageBonus:       "ice_magical",
  lightningDamageBonus: "lightning_magical",
  airDamageBonus:       "air_magical",
  earthDamageBonus:     "earth_magical",
  arcaneDamageBonus:    "arcane_magical",
  spiritDamageBonus:    "spirit_magical",
  lightDamageBonus:     "light_magical",
});

export function aggregate(effects, gearBonuses, ctx) {
  const bonuses = {};
  const enemyBonuses = {};
  const perTypeBonuses = {};
  const postCapMultiplicativeLayers = [];
  const capOverrides = {};

  const addBonus = (bucket, stat, phase, value) => {
    if (!bucket[stat]) bucket[stat] = {};
    bucket[stat][phase] = (bucket[stat][phase] ?? 0) + value;
  };

  for (const atom of effects) {
    // Display-only atom (no stat/value/phase) contributes nothing to bonuses.
    if (atom.stat == null || atom.phase == null) continue;

    const value = atom.materializedValue ?? 0;
    const target = atom.target ?? "self";

    // Routing by phase.
    if (atom.phase === "type_damage_bonus") {
      const dtype = TYPED_STAT_TO_DAMAGE_TYPE[atom.stat];
      if (!dtype) continue;   // unknown typed stat — author error.
      routeByTarget(atom, target, ctx,
        () => { perTypeBonuses[dtype] = (perTypeBonuses[dtype] ?? 0) + value; },
        // Enemy-side typed damage bonus is uncommon; we don't model it as a
        // separate bucket in Phase 6 (no known consumer). If needed later,
        // add enemyPerTypeBonuses symmetric with enemyBonuses.
        () => {});
      continue;
    }

    if (atom.phase === "post_cap_multiplicative_layer") {
      postCapMultiplicativeLayers.push({
        stat: atom.stat,
        multiplier: value,
        condition: atom.condition,
      });
      continue;
    }

    if (atom.phase === "cap_override") {
      // Last write wins (plan §3.6 rule 4; one source per cap is the expected
      // authoring pattern — multiple sources is a data issue not flagged here).
      capOverrides[atom.stat] = value;
      continue;
    }

    // Default path: route into bonuses per target.
    routeByTarget(atom, target, ctx,
      () => addBonus(bonuses,     atom.stat, atom.phase, value),
      () => addBonus(enemyBonuses, atom.stat, atom.phase, value));
  }

  // Gear bonuses fold into synthetic "gear" phase.
  if (gearBonuses) {
    for (const [stat, value] of Object.entries(gearBonuses)) {
      if (typeof value !== "number" || value === 0) continue;
      if (!bonuses[stat]) bonuses[stat] = {};
      bonuses[stat].gear = (bonuses[stat].gear ?? 0) + value;
    }
  }

  return { bonuses, enemyBonuses, perTypeBonuses, postCapMultiplicativeLayers, capOverrides };
}

// routeByTarget — plan §3.6 rule 7. target: "either" consults per-ability
// applyToSelf / applyToEnemy toggles; defaults are { self: true, enemy: false }
// for a fresh build. Simple targets (self, ally, ...) route to self bucket;
// enemy routes to enemy bucket.
function routeByTarget(atom, target, ctx, onSelf, onEnemy) {
  if (target === "either") {
    const abilityId = atom.source?.abilityId;
    const applySelf  = ctx.applyToSelf?.[abilityId]  ?? true;
    const applyEnemy = ctx.applyToEnemy?.[abilityId] ?? false;
    if (applySelf)  onSelf();
    if (applyEnemy) onEnemy();
    return;
  }

  if (target === "enemy" || target === "nearby_enemies") {
    onEnemy();
    return;
  }

  // self / ally / self_or_ally / party / nearby_allies → caster bucket.
  onSelf();
}

export { TYPED_STAT_TO_DAMAGE_TYPE };
