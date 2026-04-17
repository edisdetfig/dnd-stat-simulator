// filterByConditions — Stage 2 of the engine pipeline.
//
// For each atom in each category of CollectedAtoms, evaluate the atom's
// condition against ctx via conditions.evaluateCondition. Drop atoms whose
// condition is false. Pass through atoms whose condition tree contains a
// `damage_type` node at any depth — those are re-evaluated per-projection at
// Stage 6 (plan §3.3 deferred-evaluation rule; arch-doc §11).
//
// Stage 2 cache-key composition (plan §7 — LOCK F binding, NOT implemented
// in Phase 6 default per LOCK K):
//
//   stage2Key = hash([
//     stage1Key,              // activeAbilityIds + viewingAfterEffect + classId
//     ctx.selectedPerks,
//     ctx.selectedSkills,
//     ctx.selectedSpells,
//     ctx.activeBuffs,
//     ctx.activeForm,
//     ctx.weaponType,
//     ctx.isRanged, ctx.isTwoHanded, ctx.isOneHanded,
//     ctx.isUnarmed, ctx.isInstrument, ctx.isDualWielding,
//     ctx.playerStates,
//     ctx.equipment,
//     ctx.target.creatureType,
//     ctx.environment,
//     ctx.selectedTiers,
//     ctx.hpFraction,
//   ])
//
//   Deliberately excluded: ctx.attributes (Stage 5), ctx.stackCounts /
//   ctx.classResourceCounters (Stage 3), ctx.capOverrides (Stage 5),
//   ctx.target.pdr/mdr/headshotDR/maxHealth (Stage 6), ctx.gear.bonuses
//   (Stages 4/5/6). Phase 10 class-migration sessions that add new condition
//   variants reading new ctx fields MUST update this list.
//
// If measurement (Step 14 baseline) shows Stage 2 > 12.5 ms budget, memoize
// per the composition above. Adding a new condition variant requires editing
// constants.js + conditions.js AND this key composition.

import { evaluateCondition } from './conditions.js';

export function filterByConditions(atoms, ctx) {
  return {
    effects: atoms.effects.filter(a => keepAtom(a, ctx)),
    damage:  atoms.damage.filter(a  => keepAtom(a, ctx)),
    heal:    atoms.heal.filter(a    => keepAtom(a, ctx)),
    shield:  atoms.shield.filter(a  => keepAtom(a, ctx)),
    grants:  atoms.grants.filter(a  => keepAtom(a, ctx)),
    removes: atoms.removes.filter(a => keepAtom(a, ctx)),
  };
}

function keepAtom(atom, ctx) {
  const cond = atom.condition;
  if (cond == null) return true;

  // Deferred-evaluation rule (plan §3.3): atoms carrying a `damage_type`
  // node at any depth pass through unfiltered. Stage 6 re-evaluates per
  // projection.
  if (conditionTreeContainsDamageType(cond)) return true;

  const abilityShape = abilityShapeFromSource(atom, ctx);
  return evaluateCondition(cond, ctx, abilityShape);
}

function conditionTreeContainsDamageType(cond) {
  if (!cond || typeof cond !== "object") return false;
  if (cond.type === "damage_type") return true;
  if (Array.isArray(cond.conditions)) {
    return cond.conditions.some(conditionTreeContainsDamageType);
  }
  return false;
}

// Build the abilityShape argument for evaluateCondition (used by `tier` and
// forwarded to compound combinators). Only id + activation + type + tags
// are needed; the full ability lookup is cheap.
function abilityShapeFromSource(atom, ctx) {
  const id = atom.source?.abilityId;
  if (!id || !ctx.klass) return undefined;
  for (const section of ["perks", "skills", "spells", "mergedSpells"]) {
    const list = ctx.klass[section];
    if (!Array.isArray(list)) continue;
    const match = list.find(a => a?.id === id);
    if (match) {
      return {
        id: match.id,
        activation: match.activation,
        type: match.type,
        tags: match.tags,
      };
    }
  }
  return undefined;
}
