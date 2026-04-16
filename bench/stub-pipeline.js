// THROWAWAY — this file measures Stages 5+6 against the real verified-math
// modules only. It is NOT a design template for the Phase 5/6 engine modules.
// Phase 6 replaces the import `runSnapshotStub` with the real `runSnapshot`;
// the engine architecture lives in docs/engine_architecture.md (Phase 3),
// not here.
//
// The stub's Stages 0–4 approximate just enough to hand Stages 5 and 6
// realistic inputs. It is intentionally terse and class-agnostic-unfriendly
// because a better implementation would be engine code, not fixture glue.
//
// The stub honors the pinned Snapshot signature in
// docs/performance-budget.md § 6.1 (including the atomId derivation rule
// in § 6.2) so Phase 6's real `runSnapshot` can replace this file with a
// one-line import rename in bench/snapshot.bench.js.

import { computeDerivedStats } from '../src/engine/recipes.js';
import {
  calcPhysicalMeleeDamage,
  calcSpellDamage,
  calcHealing,
} from '../src/engine/damage.js';

// ── Stage 0+1: stub ability resolution + atom collection ─────────────────

function isAbilityActive(ability, build) {
  switch (ability.activation) {
    case "passive":
      return build.selectedPerks.includes(ability.id)
          || build.selectedSkills.includes(ability.id)
          || build.selectedSpells.includes(ability.id);
    case "cast":
      // Cast spells are available-for-projection when selected; they don't
      // contribute persistent stat effects. The stub uses selection for
      // damage/heal collection and activeBuffs for stat-effect collection
      // (see collectAtomsStub).
      return build.selectedSpells.includes(ability.id);
    case "cast_buff":
    case "toggle":
      return build.activeBuffs.includes(ability.id);
    default:
      return false;
  }
}

// Deterministic atomId per docs/performance-budget.md § 6.2.
const atomId = (abilityId, container, index) =>
  `${abilityId}:${container}:${index}`;

function walkContainer(ability, container, list, klassId, out) {
  if (!list) return;
  const items = Array.isArray(list) ? list : [list];
  for (let i = 0; i < items.length; i++) {
    const atom = items[i];
    if (!atom) continue;
    out.push({
      ...atom,
      atomId: atomId(ability.id, container, i),
      source: { kind: ability.type, abilityId: ability.id, className: klassId },
    });
  }
}

function collectAtomsStub(build) {
  const klass = build.klass;
  const byKind = { effects: [], damage: [], heal: [], shield: [], afterEffects: [], grants: [], removes: [] };

  const allAbilities = [...klass.perks, ...klass.skills, ...klass.spells];
  for (const ability of allAbilities) {
    const active = isAbilityActive(ability, build);
    if (!active) continue;

    // Stat-effect / heal / shield / after-effect atoms only contribute when
    // persistently active (passive selected OR in activeBuffs).
    const contributesState = ability.activation === "passive"
                          || build.activeBuffs.includes(ability.id);

    if (contributesState) {
      walkContainer(ability, "effects", ability.effects, klass.id, byKind.effects);
      walkContainer(ability, "heal",    ability.heal,    klass.id, byKind.heal);
      walkContainer(ability, "shield",  ability.shield,  klass.id, byKind.shield);
      if (ability.afterEffect) {
        walkContainer(ability, "afterEffect.effects", ability.afterEffect.effects, klass.id, byKind.afterEffects);
      }
    }

    // Damage atoms collect for any selected ability — snapshot shows
    // "what would this spell do if cast now" for every selected ability.
    walkContainer(ability, "damage", ability.damage, klass.id, byKind.damage);

    walkContainer(ability, "grants",  ability.grants,  klass.id, byKind.grants);
    walkContainer(ability, "removes", ability.removes, klass.id, byKind.removes);
  }

  return byKind;
}

// ── Stage 2: stub condition evaluator ────────────────────────────────────

function evalCondition(cond, build) {
  if (!cond) return true;
  switch (cond.type) {
    case "effect_active":
      return build.activeBuffs.includes(cond.effectId);
    case "ability_selected":
      return build.selectedPerks.includes(cond.abilityId)
          || build.selectedSkills.includes(cond.abilityId)
          || build.selectedSpells.includes(cond.abilityId);
    case "weapon_type":
      return build.weaponType === cond.weaponType
          || (cond.weaponType === "ranged" && ["bow", "crossbow"].includes(build.weaponType));
    case "player_state":
      return build.playerStates.includes(cond.state);
    case "tier":
      // Caller passes ability context in build._currentAbilityId during eval.
      return build.selectedTiers[build._currentAbilityId] === cond.tier;
    case "hp_below":
      return build.hpFraction < cond.threshold;
    case "all":
      return cond.conditions.every(c => evalCondition(c, build));
    case "any":
      return cond.conditions.some(c => evalCondition(c, build));
    case "not":
      return !cond.conditions.some(c => evalCondition(c, build));
    default:
      return true; // environment, equipment, creature_type, damage_type — not modeled in stub
  }
}

function filterByConditions(atoms, build) {
  const out = {};
  for (const kind of Object.keys(atoms)) {
    out[kind] = atoms[kind].filter(atom => {
      build._currentAbilityId = atom.source.abilityId;
      return evalCondition(atom.condition, build);
    });
  }
  build._currentAbilityId = undefined;
  return out;
}

// ── Stage 3: stub stacking materialization ───────────────────────────────

function stackMultiplier(atom, build) {
  if (atom.maxStacks) {
    const count = build.stackCounts[atom.source.abilityId] ?? 0;
    return Math.min(count, atom.maxStacks);
  }
  if (atom.resource) {
    return build.classResourceCounters[atom.resource] ?? 0;
  }
  return 1;
}

function materializeValue(atom, build) {
  const mult = stackMultiplier(atom, build);
  if (mult === 1) return atom.value ?? 0;
  return (atom.value ?? 0) * mult;
}

function materializeScalesWith(atom, build) {
  const sw = atom.scalesWith;
  if (!sw) return 0;
  if (sw.type === "hp_missing") {
    const missingPct = (1 - build.hpFraction) * 100;
    const steps = Math.floor(missingPct / sw.per);
    return Math.min(steps * sw.valuePerStep, sw.maxValue);
  }
  if (sw.type === "attribute") {
    return build.attributes[sw.attribute] ?? 0;
  }
  return 0;
}

// ── Stage 4: stub aggregation (flat + phased) ────────────────────────────

function aggregateBonuses(atoms, build) {
  const phased = {};                 // Record<StatId, Record<Phase, number>>
  const flat   = {};                 // Record<StatId, number>

  const pushContribution = (stat, phase, value) => {
    if (!phased[stat]) phased[stat] = {};
    phased[stat][phase] = (phased[stat][phase] ?? 0) + value;
    flat[stat] = (flat[stat] ?? 0) + value;
  };

  // Combine effects[] with afterEffect.effects[] so both feed bonuses.
  const effectAtoms = [...atoms.effects, ...atoms.afterEffects];

  for (const atom of effectAtoms) {
    // Bare CC atoms (no stat/value/phase) are display-only; skip contribution.
    if (!atom.stat || atom.phase === undefined) continue;

    const baseValue = (atom.value ?? 0) + materializeScalesWith(atom, build);
    const withStacks = atom.maxStacks || atom.resource
      ? baseValue * stackMultiplier(atom, build) || 0
      : baseValue;

    pushContribution(atom.stat, atom.phase, withStacks);
  }

  // Feed gear bonuses in too — they arrive as flat bonuses on the build.
  for (const [stat, value] of Object.entries(build.gear.bonuses ?? {})) {
    pushContribution(stat, "gear", value);
  }

  return { phased, flat };
}

// Stage 5 wrapper — thin pass-through to real computeDerivedStats.
function deriveStatsStage(attributes, bonusesFlat) {
  return computeDerivedStats(attributes, bonusesFlat, /* capOverrides */ {});
}

// Stage 6 wrapper — per-atom projection through real damage/heal functions.
function projectStage(atoms, derivedStats, target, build) {
  const ppb = derivedStats.ppb?.value ?? 0;
  const mpb = derivedStats.mpb?.value ?? 0;
  const armorPen = derivedStats.armorPenetration?.value ?? 0;
  const magicPen = derivedStats.magicPenetration?.value ?? 0;
  const headshotBonus = derivedStats.headshotDamageBonus?.value ?? 0;

  const damageProjections = [];
  for (const atom of atoms.damage) {
    const isPhys = atom.damageType === "physical";
    const projectHit = (hitLocation) => {
      if (isPhys) {
        return calcPhysicalMeleeDamage({
          baseWeaponDmg: build.gear.weapon.baseWeaponDmg,
          gearWeaponDmg: build.gear.weapon.gearWeaponDmg,
          ppb,
          additionalPhysicalDmg: atom.base,
          hitLocation,
          headshotBonus,
          targetHeadshotDR: target.headshotDR,
          targetPDR: target.pdr,
          attackerPen: armorPen,
        });
      }
      return calcSpellDamage({
        baseDamage: atom.base,
        scaling: atom.scaling,
        mpb,
        hitLocation,
        headshotBonus,
        targetHeadshotDR: target.headshotDR,
        targetMDR: target.mdr,
        attackerMagicPen: magicPen,
      });
    };
    damageProjections.push({
      atomId: atom.atomId,
      source: atom.source,
      hit: {
        body: projectHit("body"),
        head: projectHit("head"),
        limb: projectHit("limb"),
      },
    });
  }

  const healProjections = [];
  for (const atom of atoms.heal) {
    const amount = calcHealing({
      baseHeal: atom.baseHeal,
      scaling: atom.scaling,
      mpb,
      isHoT: !!atom.isHot,
      baseDuration: atom.duration ?? 0,
      buffDuration: derivedStats.buffDuration?.value ?? 0,
    });
    healProjections.push({
      atomId: atom.atomId,
      source: atom.source,
      amount,
      isHot: !!atom.isHot,
      duration: atom.duration,
    });
  }

  return { damageProjections, healProjections };
}

// ── Stage 0 sub-stub: availability + memory budget ───────────────────────

function computeAvailableAbilityIds(build) {
  const all = new Set([
    ...build.selectedPerks,
    ...build.selectedSkills,
    ...build.selectedSpells,
  ]);
  // Walk grants; include granted ability ids whose conditions evaluate true.
  for (const ability of [...build.klass.perks, ...build.klass.skills, ...build.klass.spells]) {
    if (!isAbilityActive(ability, build)) continue;
    for (const grant of ability.grants ?? []) {
      if (grant.type !== "ability") continue;
      if (evalCondition(grant.condition, build)) all.add(grant.abilityId);
    }
  }
  return [...all].sort();
}

function computeMemoryBudget(build, derivedStats) {
  const capacity = derivedStats.memoryCapacity?.value ?? 0;
  let used = 0;
  const lockedOut = [];
  for (const id of build.selectedSpells) {
    const ability = build.klass.spells.find(s => s.id === id);
    const cost = ability?.memoryCost ?? 0;
    if (used + cost <= capacity) used += cost;
    else lockedOut.push(id);
  }
  return { used, capacity, lockedOut };
}

// ── Public API (matches docs/performance-budget.md § 6.1) ────────────────

export function prepareBonuses(build) {
  const atomsRaw = collectAtomsStub(build);
  const atomsFiltered = filterByConditions(atomsRaw, build);
  const { phased, flat } = aggregateBonuses(atomsFiltered, build);
  return { atoms: atomsFiltered, bonusesPhased: phased, bonusesFlat: flat };
}

// Timed by Stage 5 sub-bench.
export { deriveStatsStage };

// Timed by Stage 6 sub-bench.
export { projectStage };

// Full stub Snapshot. Timed by the end-to-end bench ONLY for the Stage 5+6
// slice — see bench/snapshot.bench.js for the actual timing boundaries.
export function runSnapshotStub(build) {
  const { atoms, bonusesPhased, bonusesFlat } = prepareBonuses(build);
  const derivedStats = deriveStatsStage(build.attributes, bonusesFlat);
  const { damageProjections, healProjections } = projectStage(atoms, derivedStats, build.target, build);

  return {
    bonuses:           bonusesPhased,
    derivedStats,
    damageProjections,
    healProjections,
    availableAbilityIds: computeAvailableAbilityIds(build),
    memoryBudget:        computeMemoryBudget(build, derivedStats),
  };
}
