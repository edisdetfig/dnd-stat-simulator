// defineGear — validator for gear item data (parallel to defineClass).
//
// Validates shape at authoring time. Phase 1 scope: triggers[] shape
// (Spiked Gauntlet is the anchor case). Phase 3 consumes trigger damage
// in the damage readout; Phase 1 only validates.
//
// Mode dispatch matches defineClass:
//   test  → throw
//   dev   → console.warn
//   prod  → console.debug

import {
  GEAR_TRIGGER_EVENTS, CONDITION_TYPES, EFFECT_PHASES, EFFECT_TARGETS, CORE_ATTRS,
} from '../constants.js';
import { STAT_META } from '../stat-meta.js';

const VALID_PHASES = new Set(Object.values(EFFECT_PHASES));

export function defineGear(item) {
  const issues = [];
  const id = item?.id ?? "<unknown>";

  if (Array.isArray(item?.triggers)) {
    item.triggers.forEach((tr, i) => {
      const path = `triggers[${i}]`;
      if (!GEAR_TRIGGER_EVENTS.has(tr?.on)) {
        issues.push(`${path}: unknown trigger event "${tr?.on}"`);
      }
      if (Array.isArray(tr?.conditions)) {
        tr.conditions.forEach((cond, j) => validateCondition(cond, `${path}.conditions[${j}]`, issues));
      }
      if (Array.isArray(tr?.effects)) {
        tr.effects.forEach((eff, j) => validateEffect(eff, `${path}.effects[${j}]`, issues));
      }
      // Damage is validated structurally (damageType presence) but damage-
      // type vocabulary isn't enforced yet — we don't have a DAMAGE_TYPES
      // registry. Flagged for a later pass.
      if (Array.isArray(tr?.damage)) {
        tr.damage.forEach((dmg, j) => {
          if (!dmg?.damageType) {
            issues.push(`${path}.damage[${j}]: missing damageType`);
          }
        });
      }
      if (tr?.target != null && !EFFECT_TARGETS.has(tr.target)) {
        issues.push(`${path}: unknown target "${tr.target}"`);
      }
    });
  }

  reportIssues(id, issues);
  return item;
}

function validateEffect(eff, path, issues) {
  if (!eff || typeof eff !== "object") {
    issues.push(`${path}: effect is not an object`);
    return;
  }
  if (eff.stat !== "all_attributes" && !STAT_META[eff.stat] && !CORE_ATTRS.has(eff.stat)) {
    issues.push(`${path}: unknown stat "${eff.stat}"`);
  }
  if (!VALID_PHASES.has(eff.phase)) {
    issues.push(`${path}: unknown phase "${eff.phase}"`);
  }
  if (eff.condition) validateCondition(eff.condition, `${path}.condition`, issues);
}

function validateCondition(cond, path, issues) {
  if (!cond || typeof cond !== "object") {
    issues.push(`${path}: condition is not an object`);
    return;
  }
  if (!CONDITION_TYPES.has(cond.type)) {
    issues.push(`${path}: unknown condition type "${cond.type}"`);
  }
}

function reportIssues(gearId, issues) {
  if (issues.length === 0) return;
  const message = issues.map(i => `[defineGear:${gearId}] ${i}`).join("\n");
  const mode = import.meta.env?.MODE;
  const dev = import.meta.env?.DEV;
  if (mode === "test") throw new Error(message);
  if (dev) console.warn(message);
  else console.debug(message);
}
