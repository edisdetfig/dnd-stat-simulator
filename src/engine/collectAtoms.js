// collectAtoms — Stage 1 of the engine pipeline.
//
// Walks ctx.availableAbilityIds (broader than activeAbilityIds — includes
// cast spells that are available for projection but don't contribute state).
// Per-container gating:
//   - damage atoms: every available ability (casts project "what would this
//     spell do if cast now" per perspective.md §1 snapshot-model).
//   - effects / heal / shield / grants / removes: only state-contributing
//     abilities (in ctx.activeAbilityIds: passive selected, or cast_buff /
//     toggle in activeBuffs).
//
// Per arch-doc §14 + plan §8 + LOCK E, afterEffect short-circuit applies
// only to state-contributing abilities — when abilityId ∈ viewingAfterEffect,
// the ability's main-state atoms drop and afterEffect.effects are collected
// in their place.
//
// Key invariants (plan §5 transition contract 1→2):
//   - Every collected atom carries source: {kind, abilityId, className}.
//   - Every atom carries atomId: "<abilityId>:<container>:<index>" — exact
//     format required by the bench/runSnapshot contract.
//   - Output `heal` / `shield` are 0- or 1-entry arrays (authored as singulars).
//   - Atoms are shallow-cloned; the original authored data is not mutated.

import { findAbility as lookupAbility } from '../data/classes/ability-helpers.js';

export function collectAtoms(ctx) {
  const klass = ctx.klass;
  const out = {
    effects: [],
    damage:  [],
    heal:    [],
    shield:  [],
    grants:  [],
    removes: [],
  };

  if (!klass) return out;

  const activeSet = new Set(ctx.activeAbilityIds ?? []);

  for (const abilityId of ctx.availableAbilityIds ?? []) {
    const ability = lookupAbility(klass, abilityId);
    if (!ability) continue;

    const source = {
      kind:      ability.type,
      abilityId: ability.id,
      className: klass.id,
    };

    const contributesState = activeSet.has(abilityId);
    const viewing = ctx.viewingAfterEffect?.has?.(abilityId) ?? false;

    // Damage atoms collect for every available ability — cast spells project
    // "what would happen if cast now" regardless of active-state.
    walkArray(ability.damage, source, "damage", out.damage);

    // State-contributing paths.
    if (contributesState) {
      if (viewing) {
        // LOCK E short-circuit: afterEffect.effects ONLY, main-state effects/
        // heal/shield dropped. Damage already collected above; afterEffect
        // short-circuit only affects state-contribution atoms.
        walkArray(ability.afterEffect?.effects, source, "afterEffect.effects", out.effects);
      } else {
        walkArray(ability.effects, source, "effects", out.effects);
        walkSingular(ability.heal,   source, "heal",   out.heal);
        walkSingular(ability.shield, source, "shield", out.shield);
      }
      walkArray(ability.grants,  source, "grants",  out.grants);
      walkArray(ability.removes, source, "removes", out.removes);
    }
  }

  return out;
}

function walkArray(list, source, container, target) {
  if (!Array.isArray(list)) return;
  for (let i = 0; i < list.length; i += 1) {
    const atom = list[i];
    if (atom == null) continue;
    target.push({
      ...atom,
      source,
      atomId: `${source.abilityId}:${container}:${i}`,
    });
  }
}

function walkSingular(atom, source, container, target) {
  if (atom == null) return;
  target.push({
    ...atom,
    source,
    atomId: `${source.abilityId}:${container}:0`,
  });
}

