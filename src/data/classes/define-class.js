// defineClass — import-time validator for class data.
//
// Wraps a class data object and validates that every ability's effects,
// conditions, statuses, triggers, slots, and merged-spell components
// reference known constants. Returns the class data unchanged on success.
//
// Mode dispatch (Vite import.meta.env):
//   - test  → throw Error (vitest catches)
//   - dev   → console.warn (visible during npm run dev)
//   - prod  → console.debug (silent in production)

import { STAT_META } from '../stat-meta.js';
import {
  CORE_ATTRS, EFFECT_PHASES, CONDITION_TYPES,
  STATUS_TYPES, TRIGGER_EVENTS, EFFECT_TARGETS,
} from '../constants.js';

const VALID_PHASES = new Set(Object.values(EFFECT_PHASES));
const VALID_SLOT_TYPES = new Set(["spell", "shapeshift", "music"]);
const ABILITY_CONTAINERS = ["perks", "skills", "spells", "transformations", "musics", "mergedSpells"];

export function defineClass(classData) {
  const issues = [];
  const classId = classData?.id ?? "<unknown>";

  const abilities = collectAbilities(classData);

  // Pass 1: ability IDs must be unique.
  const idIndex = new Map();
  for (const { ability, path } of abilities) {
    if (!ability.id) {
      issues.push(`${path}: missing id`);
      continue;
    }
    if (idIndex.has(ability.id)) {
      issues.push(`${path}: duplicate ability id "${ability.id}" (also at ${idIndex.get(ability.id)})`);
    } else {
      idIndex.set(ability.id, path);
    }
  }

  // Pass 2: per-ability content validation.
  for (const { ability, path } of abilities) {
    if (ability.condition) validateCondition(ability.condition, `${path}.condition`, issues);

    forEachEffectList(ability, path, (eff, effPath) => validateEffect(eff, effPath, issues));

    if (Array.isArray(ability.appliesStatus)) {
      ability.appliesStatus.forEach((status, i) => {
        const sPath = `${path}.appliesStatus[${i}]`;
        if (!STATUS_TYPES.has(status?.type)) {
          issues.push(`${sPath}: unknown status type "${status?.type}"`);
        }
      });
    }

    if (Array.isArray(ability.triggers)) {
      ability.triggers.forEach((tr, i) => {
        const tPath = `${path}.triggers[${i}]`;
        if (!TRIGGER_EVENTS.has(tr?.event)) {
          issues.push(`${tPath}: unknown trigger event "${tr?.event}"`);
        }
        if (tr?.condition) validateCondition(tr.condition, `${tPath}.condition`, issues);
      });
    }

    if (ability.slots && !VALID_SLOT_TYPES.has(ability.slots.type)) {
      issues.push(`${path}.slots: unknown slot type "${ability.slots.type}"`);
    }

    if (ability.type === "merged_spell" && Array.isArray(ability.components)) {
      for (const compId of ability.components) {
        if (!idIndex.has(compId)) {
          issues.push(`${path}.components: unknown component spell id "${compId}"`);
        }
      }
    }
  }

  reportIssues(classId, issues);
  return classData;
}

function collectAbilities(classData) {
  const out = [];
  if (!classData || typeof classData !== "object") return out;
  for (const container of ABILITY_CONTAINERS) {
    const list = classData[container];
    if (!Array.isArray(list)) continue;
    list.forEach((ability, i) => {
      out.push({ ability, path: `${container}[${i}]` });
    });
  }
  return out;
}

// Walks every effects[] array reachable from an ability — top-level effects,
// appliesStatus[].effects, triggers[].effects, afterEffect.effects, summon
// casterEffects, performanceTier effects, form.wildSkill.effects.
function forEachEffectList(ability, path, fn) {
  const visit = (effects, where) => {
    if (!Array.isArray(effects)) return;
    effects.forEach((eff, i) => fn(eff, `${where}[${i}]`));
  };

  visit(ability.effects, `${path}.effects`);

  if (Array.isArray(ability.appliesStatus)) {
    ability.appliesStatus.forEach((st, i) => visit(st?.effects, `${path}.appliesStatus[${i}].effects`));
  }
  if (Array.isArray(ability.triggers)) {
    ability.triggers.forEach((tr, i) => visit(tr?.effects, `${path}.triggers[${i}].effects`));
  }
  if (ability.afterEffect) {
    visit(ability.afterEffect.effects, `${path}.afterEffect.effects`);
  }
  if (ability.summon) {
    visit(ability.summon.casterEffects, `${path}.summon.casterEffects`);
  }
  if (ability.performanceTiers) {
    for (const tier of ["poor", "good", "perfect"]) {
      visit(ability.performanceTiers[tier]?.effects, `${path}.performanceTiers.${tier}.effects`);
    }
  }
  if (ability.form?.wildSkill?.effects) {
    visit(ability.form.wildSkill.effects, `${path}.form.wildSkill.effects`);
    if (ability.form.wildSkill.afterEffect) {
      visit(ability.form.wildSkill.afterEffect.effects, `${path}.form.wildSkill.afterEffect.effects`);
    }
  }
  if (Array.isArray(ability.stacking?.perStack)) {
    visit(ability.stacking.perStack, `${path}.stacking.perStack`);
  }
}

// all_attributes is a sentinel stat meaning "fan out across the 7 CORE_ATTRS."
// Only two phases support the fan-out semantically: pre_curve_flat (flat +N)
// and attribute_multiplier (×(1+N)). Any other phase is almost certainly
// an authoring bug.
const ALL_ATTRS_ALLOWED_PHASES = new Set(["pre_curve_flat", "attribute_multiplier"]);

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
  } else if (eff.stat === "all_attributes" && !ALL_ATTRS_ALLOWED_PHASES.has(eff.phase)) {
    issues.push(`${path}: stat "all_attributes" not valid under phase "${eff.phase}" (only pre_curve_flat / attribute_multiplier)`);
  }
  if (eff.target != null && !EFFECT_TARGETS.has(eff.target)) {
    issues.push(`${path}: unknown target "${eff.target}"`);
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

function reportIssues(classId, issues) {
  if (issues.length === 0) return;
  const message = issues.map(i => `[defineClass:${classId}] ${i}`).join("\n");
  const mode = import.meta.env?.MODE;
  const dev = import.meta.env?.DEV;
  if (mode === "test") throw new Error(message);
  if (dev) console.warn(message);
  else console.debug(message);
}
