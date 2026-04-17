// Class-shape validator — Phase 1 deliverable.
//
// Pure-ESM; no test-framework imports. Runs against a class-data object and
// returns a flat list of structured errors. A sibling Vitest file
// (class-shape-validator.test.js) drives it over every class in CLASSES and
// runs the self-test suite.
//
// Public API:
//   validateClass(classData) -> ValidationError[]
//   validateAllClasses(classList) -> { byClass: {id: Err[]}, crossClassErrors: Err[] }
//
// ValidationError:
//   { classId, path, message, rule }
//
// Rule codes mirror the Phase 1 spec items (A–L) with sub-codes for multi-
// rule items (e.g. "C.stat", "K.forbidden", "F.type"). See docs/rebuild-plan.md
// § Phase 1 for the authoritative enumeration.
//
// Canonical sources are imported; this file defines NO enum lists itself.
// If a rule needs a vocabulary that doesn't exist as a canonical export, the
// rule is not enforced here — by design, per the three-priority hierarchy.

import {
  CORE_ATTRS,
  EFFECT_PHASE_VALUES,
  EFFECT_TARGETS,
  CONDITION_TYPES,
  PLAYER_STATES,
  WEAPON_TYPES,
  ABILITY_TYPES,
  ACTIVATIONS,
  ATOM_TAGS,
  CAPABILITY_TAGS,
  SCALES_WITH_TYPES,
  DAMAGE_TYPES,
  ARMOR_TYPES,
  GRANT_REMOVE_TYPES,
  COST_TYPES,
  COST_SOURCE,
  TIER_VALUES,
} from '../constants.js';
import { STAT_META } from '../stat-meta.js';
import { RECIPE_IDS } from '../../engine/recipes.js';

// Required class-root keys per Phase 1 item A.
const CLASS_ROOT_REQUIRED = [
  "id", "name", "baseAttributes", "baseHealth",
  "maxPerks", "maxSkills", "armorProficiency",
];

// Required keys per ability per Phase 1 item B.
const ABILITY_REQUIRED = ["id", "name", "type", "desc", "activation"];

// Required keys per condition variant (Phase 1 item F).
const CONDITION_FIELD_SPECS = {
  hp_below:         ["threshold"],
  ability_selected: ["abilityId"],
  effect_active:    ["effectId"],
  environment:      ["env"],
  weapon_type:      ["weaponType"],
  player_state:     ["state"],
  equipment:        ["slot"],
  creature_type:    ["creatureType"],
  damage_type:      ["damageType"],
  tier:             ["tier"],
  all:              ["conditions"],
  any:              ["conditions"],
  not:              ["conditions"],
};

// Phase 1 item K — forbidden-field tables by scope.

const FORBIDDEN_AT_CLASS_ROOT = new Set([
  "spellCost",          // per-ability cost{} replaces class-level default
  "armorRestrictions",  // renamed to armorProficiency per class-shape-progress.md
]);

const FORBIDDEN_AT_ABILITY = new Set([
  "passives",
  "form",
  "summon",
  "requires",
  "triggers",
  "appliesStatus",
  "cc",
  "stateChange",
  "stacking",
  "performanceTiers",
  "abilityModifiers",
  "slots",
  "grantsSpells", "grantsSkills", "grantsWeapon", "grantsArmor",
  "removesArmor", "disables",
  "altSkills",
]);

// Merged spells inherit all ability-level prohibitions AND additionally
// forbid memoryCost (merged spells don't consume memory).
const FORBIDDEN_AT_MERGED_SPELL = new Set([
  ...FORBIDDEN_AT_ABILITY,
  "memoryCost",
]);

const FORBIDDEN_AT_ATOM = new Set([
  "hpScaling",   // unified into scalesWith: { type: "hp_missing", … }
  "source",      // engine-populated at Stage 1; authoring it is a bug
]);

// The full set of atom containers on an ability we walk to validate atoms.
const ATOM_CONTAINERS = ["effects", "damage", "heal", "shield"];

// Ability types that require memoryCost (item I).
const MEMORY_POOL_TYPES = new Set(["spell", "transformation", "music"]);


// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

export function validateClass(classData) {
  const errors = [];
  if (!classData || typeof classData !== "object") {
    return [err("", "<root>", "class data is not an object", "A.shape", classData)];
  }
  const classId = classData.id ?? "<unknown>";

  // Index the class's ability IDs for cross-ref resolution (item F + G).
  const { abilityIds, classResourceIds } = indexClass(classData);

  validateClassRoot(classData, errors);
  validateClassResources(classData, errors);

  const sections = [
    ["perks",        classData.perks,        false],
    ["skills",       classData.skills,       false],
    ["spells",       classData.spells,       false],
    ["mergedSpells", classData.mergedSpells, true],
  ];
  for (const [section, list, isMerged] of sections) {
    if (list == null) continue;
    if (!Array.isArray(list)) {
      errors.push(err(classId, `${section}`, `${section} is not an array`, "A.shape"));
      continue;
    }
    list.forEach((ab, idx) => {
      validateAbility(ab, classId, section, idx, isMerged,
        abilityIds, classResourceIds, errors);
    });
  }

  const dupIds = findDuplicateIdsInClass(classData);
  for (const dupId of dupIds) {
    errors.push(errAt(`<duplicate>`,
      `ability id '${dupId}' appears more than once in this class`,
      "B.id_unique"));
  }

  return errors.map(e => ({ ...e, classId }));
}

export function validateAllClasses(classList) {
  const byClass = {};
  for (const c of classList) {
    const id = c?.id ?? "<unknown>";
    byClass[id] = validateClass(c);
  }

  // Cross-class ability-id collision (item L).
  const idToLocations = new Map();
  for (const c of classList) {
    if (!c) continue;
    for (const section of ["perks", "skills", "spells", "mergedSpells"]) {
      const list = c[section];
      if (!Array.isArray(list)) continue;
      for (const ab of list) {
        const abId = ab?.id;
        if (!abId || typeof abId !== "string") continue;
        const loc = `${c.id}.${section}`;
        if (!idToLocations.has(abId)) idToLocations.set(abId, new Set());
        idToLocations.get(abId).add(loc);
      }
    }
  }
  const crossClassErrors = [];
  for (const [abId, locSet] of idToLocations) {
    const locs = [...locSet];
    const classes = new Set(locs.map(l => l.split(".")[0]));
    if (classes.size > 1) {
      crossClassErrors.push({
        classId: "<cross-class>",
        path: "cross-class",
        message: `ability id '${abId}' appears in ${locs.sort().join(", ")}`,
        rule: "L",
      });
    }
  }

  return { byClass, crossClassErrors };
}


// ─────────────────────────────────────────────────────────────────────
// Class-root and indexing
// ─────────────────────────────────────────────────────────────────────

function indexClass(classData) {
  const abilityIds = new Set();
  const classResourceIds = new Set(Object.keys(classData.classResources ?? {}));
  for (const section of ["perks", "skills", "spells", "mergedSpells"]) {
    const list = classData[section];
    if (!Array.isArray(list)) continue;
    for (const ab of list) {
      if (ab?.id && typeof ab.id === "string") abilityIds.add(ab.id);
    }
  }
  return { abilityIds, classResourceIds };
}

function validateClassRoot(c, errors) {
  // A: required keys
  for (const k of CLASS_ROOT_REQUIRED) {
    if (!(k in c)) {
      errors.push(errAt("root", `missing required field '${k}'`, "A.required"));
    }
  }

  // A: baseAttributes keys
  const ba = c.baseAttributes;
  if (ba && typeof ba === "object") {
    for (const attr of CORE_ATTRS) {
      if (!(attr in ba)) {
        errors.push(errAt(`root.baseAttributes`, `missing attribute '${attr}'`, "A.baseAttributes"));
      }
    }
    for (const k of Object.keys(ba)) {
      if (!CORE_ATTRS.has(k)) {
        errors.push(errAt(`root.baseAttributes.${k}`, `'${k}' is not a core attribute`, "A.baseAttributes"));
      }
    }
  } else if ("baseAttributes" in c) {
    errors.push(errAt(`root.baseAttributes`, "is not an object", "A.baseAttributes"));
  }

  // A: armorProficiency values
  if (Array.isArray(c.armorProficiency)) {
    c.armorProficiency.forEach((t, i) => {
      if (!ARMOR_TYPES.has(t)) {
        errors.push(errAt(`root.armorProficiency[${i}]`,
          `'${t}' is not in ARMOR_TYPES`, "A.armorType"));
      }
    });
  }

  // K: class-root forbidden fields
  for (const k of Object.keys(c)) {
    if (FORBIDDEN_AT_CLASS_ROOT.has(k)) {
      errors.push(errAt(`root.${k}`,
        `'${k}' is a forbidden class-root field — see class-shape.js + rebuild-plan.md § Phase 1 item K`,
        "K.forbidden"));
    }
  }
}

function validateClassResources(c, errors) {
  const cr = c.classResources;
  if (cr == null) return;
  if (typeof cr !== "object" || Array.isArray(cr)) {
    errors.push(errAt("root.classResources", "is not an object", "J.shape"));
    return;
  }
  for (const [rid, entry] of Object.entries(cr)) {
    const path = `root.classResources.${rid}`;
    if (!entry || typeof entry !== "object") {
      errors.push(errAt(path, "entry is not an object", "J.shape"));
      continue;
    }
    if (!("maxStacks" in entry)) {
      errors.push(errAt(`${path}.maxStacks`, "missing required field", "J.required"));
    } else if (typeof entry.maxStacks !== "number" || entry.maxStacks < 1) {
      errors.push(errAt(`${path}.maxStacks`, "must be a positive number", "J.shape"));
    }
    if (!("desc" in entry)) {
      errors.push(errAt(`${path}.desc`, "missing required field", "J.required"));
    }
    if (entry.condition != null) {
      // Nested condition — reuses condition validator; cross-refs within class.
      const ctx = {
        abilityIds: indexAbilityIdsOnly(c),
        classResourceIds: new Set(Object.keys(cr)),
      };
      validateCondition(entry.condition, `${path}.condition`, ctx, errors);
    }
  }
}

function indexAbilityIdsOnly(c) {
  const ids = new Set();
  for (const section of ["perks", "skills", "spells", "mergedSpells"]) {
    const list = c[section];
    if (!Array.isArray(list)) continue;
    for (const ab of list) {
      if (ab?.id && typeof ab.id === "string") ids.add(ab.id);
    }
  }
  return ids;
}


// ─────────────────────────────────────────────────────────────────────
// Ability
// ─────────────────────────────────────────────────────────────────────

function validateAbility(ab, classId, section, idx, isMerged,
                         abilityIds, classResourceIds, errors) {
  const abId = ab?.id ?? "<unknown>";
  const base = `${section}[${idx}] (id: ${abId})`;

  if (!ab || typeof ab !== "object") {
    errors.push(errAt(`${section}[${idx}]`, "ability is not an object", "B.shape"));
    return;
  }

  // B: required keys
  for (const k of ABILITY_REQUIRED) {
    if (!(k in ab)) {
      errors.push(errAt(base, `missing required field '${k}'`, "B.required"));
    }
  }

  // B: type ∈ ABILITY_TYPES
  if (ab.type != null && !ABILITY_TYPES.has(ab.type)) {
    errors.push(errAt(`${base}.type`, `'${ab.type}' is not in ABILITY_TYPES`, "B.type"));
  }

  // B: activation ∈ ACTIVATIONS
  if (ab.activation != null && !ACTIVATIONS.has(ab.activation)) {
    errors.push(errAt(`${base}.activation`,
      `'${ab.activation}' is not in ACTIVATIONS`, "B.activation"));
  }

  // I: memoryCost for spell / transformation / music (top-level only; merged
  // spells never consume memory and are checked via the merged-spell forbidden
  // table below).
  if (!isMerged && MEMORY_POOL_TYPES.has(ab.type)) {
    if (!("memoryCost" in ab)) {
      errors.push(errAt(`${base}.memoryCost`,
        `missing required field for ability type '${ab.type}'`, "I.required"));
    } else if (typeof ab.memoryCost !== "number" || ab.memoryCost < 0) {
      errors.push(errAt(`${base}.memoryCost`,
        "must be a non-negative number", "I.shape"));
    }
  }

  // H: cost shape
  if (ab.cost != null) validateCost(ab.cost, `${base}.cost`, errors);

  // K: ability-level forbidden fields.
  const forbiddenSet = isMerged ? FORBIDDEN_AT_MERGED_SPELL : FORBIDDEN_AT_ABILITY;
  for (const k of Object.keys(ab)) {
    if (forbiddenSet.has(k)) {
      const subcode = (isMerged && k === "memoryCost")
        ? "K.merged_memoryCost"
        : "K.forbidden";
      errors.push(errAt(`${base}.${k}`,
        `'${k}' is a forbidden ${isMerged ? "merged-spell" : "ability"} field — see rebuild-plan.md § Phase 1 item K`,
        subcode));
    }
  }

  // Ability-level condition (gates the whole ability).
  const condCtx = { abilityIds, classResourceIds };
  if (ab.condition != null) {
    validateCondition(ab.condition, `${base}.condition`, condCtx, errors);
  }

  // Atom containers.
  validateAtomContainers(ab, base, condCtx, errors);

  // grants[] / removes[] (item G).
  if (ab.grants != null) {
    if (!Array.isArray(ab.grants)) {
      errors.push(errAt(`${base}.grants`, "is not an array", "G.shape"));
    } else {
      ab.grants.forEach((g, i) => validateGrant(g, `${base}.grants[${i}]`, condCtx, errors));
    }
  }
  if (ab.removes != null) {
    if (!Array.isArray(ab.removes)) {
      errors.push(errAt(`${base}.removes`, "is not an array", "G.shape"));
    } else {
      ab.removes.forEach((r, i) => validateRemove(r, `${base}.removes[${i}]`, condCtx, errors));
    }
  }

  // tags[] at ability level — same vocab as atom tags.
  if (ab.tags != null) {
    if (!Array.isArray(ab.tags)) {
      errors.push(errAt(`${base}.tags`, "is not an array", "B.shape"));
    }
    // Ability-level tags overlap functional atom tags AND include free-form
    // flavor tags used by targeting filters (e.g. "demon", "blood",
    // "projectile"). We do NOT enforce ATOM_TAGS membership here — that's
    // only for atom-level `tags`.
  }
}

function rebuildIdFrequency(classData) {
  const counts = new Map();
  for (const section of ["perks", "skills", "spells", "mergedSpells"]) {
    const list = classData[section];
    if (!Array.isArray(list)) continue;
    for (const ab of list) {
      const id = ab?.id;
      if (!id || typeof id !== "string") continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

// ─────────────────────────────────────────────────────────────────────
// Atoms
// ─────────────────────────────────────────────────────────────────────

function validateAtomContainers(ab, base, condCtx, errors) {
  // effects[], damage[] — arrays of atoms.
  for (const container of ["effects", "damage"]) {
    const v = ab[container];
    if (v == null) continue;
    if (!Array.isArray(v)) {
      errors.push(errAt(`${base}.${container}`, "is not an array", "C.shape"));
      continue;
    }
    v.forEach((atom, i) => {
      const p = `${base}.${container}[${i}]`;
      if (container === "effects") validateStatEffectAtom(atom, p, condCtx, errors);
      else validateDamageAtom(atom, p, condCtx, errors);
    });
  }

  // heal, shield — singular atoms (objects).
  if (ab.heal != null) validateHealAtom(ab.heal, `${base}.heal`, condCtx, errors);
  if (ab.shield != null) validateShieldAtom(ab.shield, `${base}.shield`, condCtx, errors);

  // afterEffect — wrapper with its own effects[].
  if (ab.afterEffect != null) {
    const ae = ab.afterEffect;
    const p = `${base}.afterEffect`;
    if (typeof ae !== "object" || Array.isArray(ae)) {
      errors.push(errAt(p, "is not an object", "C.shape"));
    } else {
      if (Array.isArray(ae.effects)) {
        ae.effects.forEach((atom, i) => {
          validateStatEffectAtom(atom, `${p}.effects[${i}]`, condCtx, errors);
        });
      }
      // K.afterEffect_forbidden — per docs/engine_architecture.md §14 + plan §8:
      // afterEffect carries only `effects[]`. grants[] / removes[] represent
      // availability facts that are state-independent and must live on the
      // ability itself, not inside the afterEffect wrapper.
      for (const k of ["grants", "removes"]) {
        if (k in ae) {
          errors.push(errAt(`${p}.${k}`,
            `'${k}' is forbidden inside afterEffect — availability facts live on the ability, not the post-effect wrapper (see docs/engine_architecture.md §14)`,
            "K.afterEffect_forbidden"));
        }
      }
    }
  }
}

function validateStatEffectAtom(atom, path, condCtx, errors) {
  if (!atom || typeof atom !== "object") {
    errors.push(errAt(path, "atom is not an object", "C.shape"));
    return;
  }

  forbiddenAtomKeys(atom, path, errors);

  // Determine whether this is a display-only atom (no stat/value/phase).
  const hasStat = "stat" in atom;
  const hasValue = "value" in atom;
  const hasPhase = "phase" in atom;
  const displayOnly = !hasStat && !hasValue && !hasPhase;

  // Two-namespace check (C.stat, C.namespace).
  if (hasStat) {
    const statId = atom.stat;
    const inStatMeta = statId in STAT_META;
    const inRecipe = RECIPE_IDS.has(statId);
    if (!inStatMeta && !inRecipe) {
      errors.push(errAt(`${path}.stat`,
        `'${statId}' is not in STAT_META`, "C.stat"));
    } else if (!inStatMeta && inRecipe && atom.phase !== "cap_override") {
      errors.push(errAt(`${path}.stat`,
        `'${statId}' is a RECIPE_IDS entry and is only allowed when phase === "cap_override" (got ${JSON.stringify(atom.phase)})`,
        "C.namespace"));
    }
  }

  if (hasPhase && !EFFECT_PHASE_VALUES.has(atom.phase)) {
    errors.push(errAt(`${path}.phase`,
      `'${atom.phase}' is not in EFFECT_PHASE_VALUES`, "C.phase"));
  }

  if ("target" in atom && !EFFECT_TARGETS.has(atom.target)) {
    errors.push(errAt(`${path}.target`,
      `'${atom.target}' is not in EFFECT_TARGETS`, "C.target"));
  }

  // Atom-tag vocabulary check.
  //   - Semantic atoms (stat/value/phase present): tags must be in ATOM_TAGS
  //     (status + CC grouping labels).
  //   - Display-only "bare tagged" atoms (no stat/value/phase): tags must be
  //     in ATOM_TAGS (bare CC markers — fear, knockback, etc.) OR in
  //     CAPABILITY_TAGS (engine-observable capabilities — detects_hidden,
  //     phase_through, etc.). Both are locked Phase 3; extension is a
  //     vocabulary update, not a quiet add.
  if (!displayOnly) {
    validateTagsField(atom.tags, `${path}.tags`, errors);
  } else if (atom.tags != null) {
    if (!Array.isArray(atom.tags)) {
      errors.push(errAt(`${path}.tags`, "is not an array", "C.tags"));
    } else {
      atom.tags.forEach((t, i) => {
        if (!ATOM_TAGS.has(t) && !CAPABILITY_TAGS.has(t)) {
          errors.push(errAt(`${path}.tags[${i}]`,
            `'${t}' is not in ATOM_TAGS or CAPABILITY_TAGS`,
            "C.capability_tags"));
        }
      });
    }
  }

  // Display-only atoms need non-empty tags to identify themselves.
  if (displayOnly) {
    const tagsEmpty = !Array.isArray(atom.tags) || atom.tags.length === 0;
    if (tagsEmpty) {
      errors.push(errAt(path,
        "display-only atom (no stat/value/phase) must carry non-empty `tags`",
        "C.display_only"));
    }
  }

  if ("abilityType" in atom && !ABILITY_TYPES.has(atom.abilityType)) {
    errors.push(errAt(`${path}.abilityType`,
      `'${atom.abilityType}' is not in ABILITY_TYPES`, "C.abilityType"));
  }

  // C.memorySlots_abilityType_required — per plan §6.3: `memorySlots` atoms
  // add only to the pool named by their `abilityType` discriminator. Without
  // it, the engine can't route the capacity contribution to a pool.
  if (atom.stat === "memorySlots" && !("abilityType" in atom)) {
    errors.push(errAt(path,
      "memorySlots atom missing required `abilityType` discriminator (must name the pool: 'spell' | 'transformation' | 'music')",
      "C.memorySlots_abilityType_required"));
  }

  // C.damage_type_phase_invariant — per plan §3.6 rule 5: a damage_type-
  // conditioned atom can only live at phase 'post_cap_multiplicative_layer'.
  // At any other phase, Stage 4 would silently sum it into bonuses/
  // perTypeBonuses with the condition dropped (Antimagic is the canonical
  // post-cap consumer). A damage_type condition at any depth of the tree
  // trips this check.
  if (conditionTreeContainsDamageType(atom.condition)
      && atom.phase !== "post_cap_multiplicative_layer") {
    errors.push(errAt(path,
      `atom has a damage_type condition but phase is ${JSON.stringify(atom.phase)} — damage_type conditions only make sense at phase 'post_cap_multiplicative_layer' (Antimagic pattern); at any other phase the condition is silently dropped by aggregate`,
      "C.damage_type_phase_invariant"));
  }

  validateScalesWith(atom.scalesWith, `${path}.scalesWith`, errors);
  validateStackingXor(atom, path, condCtx, errors);

  if (atom.condition != null) {
    validateCondition(atom.condition, `${path}.condition`, condCtx, errors);
  }
}

// Recursively walks a condition tree looking for a `damage_type` node.
// Used by C.damage_type_phase_invariant.
function conditionTreeContainsDamageType(cond) {
  if (!cond || typeof cond !== "object") return false;
  if (cond.type === "damage_type") return true;
  if (Array.isArray(cond.conditions)) {
    return cond.conditions.some(conditionTreeContainsDamageType);
  }
  return false;
}

function validateDamageAtom(atom, path, condCtx, errors) {
  if (!atom || typeof atom !== "object") {
    errors.push(errAt(path, "atom is not an object", "D.shape"));
    return;
  }

  forbiddenAtomKeys(atom, path, errors);

  // D: required keys (base, scaling, damageType, target).
  for (const k of ["base", "scaling", "damageType", "target"]) {
    if (!(k in atom)) {
      errors.push(errAt(`${path}.${k}`, `missing required field '${k}'`, "D.required"));
    }
  }
  if ("damageType" in atom && !DAMAGE_TYPES.has(atom.damageType)) {
    errors.push(errAt(`${path}.damageType`,
      `'${atom.damageType}' is not in DAMAGE_TYPES`, "D.damageType"));
  }
  if ("target" in atom && !EFFECT_TARGETS.has(atom.target)) {
    errors.push(errAt(`${path}.target`,
      `'${atom.target}' is not in EFFECT_TARGETS`, "D.target"));
  }

  if ("count" in atom) {
    if (!Number.isInteger(atom.count) || atom.count < 1) {
      errors.push(errAt(`${path}.count`,
        "must be a positive integer", "D.count"));
    }
  }

  // D: lifestealRatio optional numeric 0..1 (LOCK 3 — flat-field lifesteal).
  // Engine rule: derived heal = lifestealRatio × damage_atom_projection,
  // target: "self", healType via family-collapse (physical → physical;
  // any magical subtype → magical). See docs/engine_architecture.md §16.
  if ("lifestealRatio" in atom && atom.lifestealRatio != null) {
    const v = atom.lifestealRatio;
    if (typeof v !== "number" || v < 0 || v > 1) {
      errors.push(errAt(`${path}.lifestealRatio`,
        "must be a number in [0, 1]", "D.lifestealRatio"));
    }
  }

  // D: targetMaxHpRatio optional numeric 0..1.
  // Engine rule: derived heal = targetMaxHpRatio × damage_atom_target's max HP,
  // target: "self", healType via family-collapse. Symmetric with lifestealRatio.
  // See docs/engine_architecture.md §16.
  if ("targetMaxHpRatio" in atom && atom.targetMaxHpRatio != null) {
    const v = atom.targetMaxHpRatio;
    if (typeof v !== "number" || v < 0 || v > 1) {
      errors.push(errAt(`${path}.targetMaxHpRatio`,
        "must be a number in [0, 1]", "D.targetMaxHpRatio"));
    }
  }

  validateTagsField(atom.tags, `${path}.tags`, errors);
  validateScalesWith(atom.scalesWith, `${path}.scalesWith`, errors);
  validateStackingXor(atom, path, condCtx, errors);

  if (atom.condition != null) {
    validateCondition(atom.condition, `${path}.condition`, condCtx, errors);
  }
}

function validateHealAtom(atom, path, condCtx, errors) {
  if (!atom || typeof atom !== "object") {
    errors.push(errAt(path, "atom is not an object", "E.shape"));
    return;
  }
  forbiddenAtomKeys(atom, path, errors);
  if ("healType" in atom && atom.healType !== "physical" && atom.healType !== "magical") {
    errors.push(errAt(`${path}.healType`,
      `'${atom.healType}' must be "physical" or "magical"`, "E.healType"));
  }
  if ("target" in atom && !EFFECT_TARGETS.has(atom.target)) {
    errors.push(errAt(`${path}.target`,
      `'${atom.target}' is not in EFFECT_TARGETS`, "E.target"));
  }
  if (atom.condition != null) {
    validateCondition(atom.condition, `${path}.condition`, condCtx, errors);
  }
}

function validateShieldAtom(atom, path, condCtx, errors) {
  if (!atom || typeof atom !== "object") {
    errors.push(errAt(path, "atom is not an object", "E.shape"));
    return;
  }
  forbiddenAtomKeys(atom, path, errors);
  if ("damageFilter" in atom) {
    const v = atom.damageFilter;
    if (v !== null && v !== "physical" && v !== "magical") {
      errors.push(errAt(`${path}.damageFilter`,
        `'${String(v)}' must be "physical", "magical", or null`, "E.damageFilter"));
    }
  }
  if ("target" in atom && !EFFECT_TARGETS.has(atom.target)) {
    errors.push(errAt(`${path}.target`,
      `'${atom.target}' is not in EFFECT_TARGETS`, "E.target"));
  }
  if (atom.condition != null) {
    validateCondition(atom.condition, `${path}.condition`, condCtx, errors);
  }
}

function forbiddenAtomKeys(atom, path, errors) {
  for (const k of Object.keys(atom)) {
    if (FORBIDDEN_AT_ATOM.has(k)) {
      errors.push(errAt(`${path}.${k}`,
        `'${k}' is a forbidden atom field — see rebuild-plan.md § Phase 1 item K`,
        k === "source" ? "K.atom_source" : "K.atom_forbidden"));
    }
  }
}

function validateTagsField(tags, path, errors) {
  if (tags == null) return;
  if (!Array.isArray(tags)) {
    errors.push(errAt(path, "is not an array", "C.tags"));
    return;
  }
  tags.forEach((t, i) => {
    if (!ATOM_TAGS.has(t)) {
      errors.push(errAt(`${path}[${i}]`,
        `'${t}' is not in ATOM_TAGS`, "C.tags"));
    }
  });
}

function validateScalesWith(sw, path, errors) {
  if (sw == null) return;
  if (typeof sw !== "object" || Array.isArray(sw)) {
    errors.push(errAt(path, "is not an object", "C.scalesWith"));
    return;
  }
  if (!("type" in sw)) {
    errors.push(errAt(`${path}.type`,
      "missing required field 'type'", "C.scalesWith"));
    return;
  }
  if (!SCALES_WITH_TYPES.has(sw.type)) {
    errors.push(errAt(`${path}.type`,
      `'${sw.type}' is not in SCALES_WITH_TYPES`, "C.scalesWith"));
    return;
  }
  // Per-variant required fields.
  if (sw.type === "hp_missing") {
    for (const k of ["per", "valuePerStep", "maxValue"]) {
      if (!(k in sw)) {
        errors.push(errAt(`${path}.${k}`,
          `missing required field '${k}' for scalesWith.type 'hp_missing'`,
          "C.scalesWith"));
      }
    }
  } else if (sw.type === "attribute") {
    for (const k of ["curve", "attribute"]) {
      if (!(k in sw)) {
        errors.push(errAt(`${path}.${k}`,
          `missing required field '${k}' for scalesWith.type 'attribute'`,
          "C.scalesWith"));
      }
    }
  }
}

function validateStackingXor(atom, path, condCtx, errors) {
  const hasMax = "maxStacks" in atom && atom.maxStacks != null;
  const hasResource = "resource" in atom && atom.resource != null;
  if (hasMax && hasResource) {
    errors.push(errAt(path,
      "atom has both `maxStacks` and `resource` — use exactly one",
      "C.stacking"));
  }
  if (hasResource) {
    if (!condCtx.classResourceIds.has(atom.resource)) {
      errors.push(errAt(`${path}.resource`,
        `'${atom.resource}' not declared in classResources`, "C.resource"));
    }
  }
}


// ─────────────────────────────────────────────────────────────────────
// Conditions
// ─────────────────────────────────────────────────────────────────────

function validateCondition(cond, path, ctx, errors) {
  if (!cond || typeof cond !== "object" || Array.isArray(cond)) {
    errors.push(errAt(path, "condition is not an object", "F.shape"));
    return;
  }
  const { type } = cond;
  if (!type) {
    errors.push(errAt(`${path}.type`, "missing required field 'type'", "F.type"));
    return;
  }
  if (!CONDITION_TYPES.has(type)) {
    errors.push(errAt(`${path}.type`,
      `'${type}' is not in CONDITION_TYPES`, "F.type"));
    return;
  }
  const required = CONDITION_FIELD_SPECS[type];
  if (required) {
    for (const k of required) {
      if (!(k in cond)) {
        errors.push(errAt(`${path}.${k}`,
          `missing required field '${k}' for condition type '${type}'`,
          "F.required"));
      }
    }
  }

  // Per-variant value checks.
  switch (type) {
    case "ability_selected": {
      if (cond.abilityId && !ctx.abilityIds.has(cond.abilityId)) {
        errors.push(errAt(`${path}.abilityId`,
          `'${cond.abilityId}' does not resolve to an ability in this class`,
          "F.abilityId"));
      }
      break;
    }
    case "effect_active": {
      if (cond.effectId && !ctx.abilityIds.has(cond.effectId)) {
        errors.push(errAt(`${path}.effectId`,
          `'${cond.effectId}' does not resolve to an ability in this class`,
          "F.effectId"));
      }
      break;
    }
    case "weapon_type": {
      if (cond.weaponType != null && !WEAPON_TYPES.has(cond.weaponType)) {
        errors.push(errAt(`${path}.weaponType`,
          `'${cond.weaponType}' is not in WEAPON_TYPES`, "F.weaponType"));
      }
      break;
    }
    case "player_state": {
      if (cond.state != null && !PLAYER_STATES.has(cond.state)) {
        errors.push(errAt(`${path}.state`,
          `'${cond.state}' is not in PLAYER_STATES`, "F.state"));
      }
      break;
    }
    case "tier": {
      if (cond.tier != null && !TIER_VALUES.has(cond.tier)) {
        errors.push(errAt(`${path}.tier`,
          `'${cond.tier}' is not in TIER_VALUES`, "F.tier"));
      }
      break;
    }
    case "hp_below": {
      if (cond.threshold != null) {
        if (typeof cond.threshold !== "number" || cond.threshold < 0 || cond.threshold > 1) {
          errors.push(errAt(`${path}.threshold`,
            "must be a number in [0, 1]", "F.threshold"));
        }
      }
      break;
    }
    case "all":
    case "any":
    case "not": {
      if (!Array.isArray(cond.conditions)) {
        errors.push(errAt(`${path}.conditions`,
          "must be an array", "F.compound"));
      } else {
        cond.conditions.forEach((sub, i) => {
          validateCondition(sub, `${path}.conditions[${i}]`, ctx, errors);
        });
      }
      break;
    }
    // environment / equipment / creature_type / damage_type — no canonical
    // vocabulary available; presence of the discriminator field is enforced
    // above. Phase 3 can extend value checks when the vocabularies lock.
    default: break;
  }
}


// ─────────────────────────────────────────────────────────────────────
// Grants / Removes (item G)
// ─────────────────────────────────────────────────────────────────────

function validateGrant(g, path, ctx, errors) {
  if (!g || typeof g !== "object") {
    errors.push(errAt(path, "grant atom is not an object", "G.shape"));
    return;
  }
  if (!("type" in g)) {
    errors.push(errAt(`${path}.type`, "missing required field 'type'", "G.required"));
    return;
  }
  if (!GRANT_REMOVE_TYPES.has(g.type)) {
    errors.push(errAt(`${path}.type`,
      `'${g.type}' is not in GRANT_REMOVE_TYPES`, "G.type"));
  }
  if (g.type === "ability") {
    if (!("abilityId" in g)) {
      errors.push(errAt(`${path}.abilityId`,
        "missing for type: 'ability'", "G.required"));
    } else if (!ctx.abilityIds.has(g.abilityId)) {
      errors.push(errAt(`${path}.abilityId`,
        `'${g.abilityId}' does not resolve to an ability in this class`,
        "G.abilityId"));
    }
  }
  if (g.type === "weapon") {
    if (!("weaponType" in g)) {
      errors.push(errAt(`${path}.weaponType`,
        "missing for type: 'weapon'", "G.required"));
    } else if (!WEAPON_TYPES.has(g.weaponType)) {
      errors.push(errAt(`${path}.weaponType`,
        `'${g.weaponType}' is not in WEAPON_TYPES`, "G.weaponType"));
    }
  }
  if (g.type === "armor") {
    if (!("armorType" in g)) {
      errors.push(errAt(`${path}.armorType`,
        "missing for type: 'armor'", "G.required"));
    } else if (!ARMOR_TYPES.has(g.armorType)) {
      errors.push(errAt(`${path}.armorType`,
        `'${g.armorType}' is not in ARMOR_TYPES`, "G.armorType"));
    }
  }
  if ("costSource" in g && !COST_SOURCE.has(g.costSource)) {
    errors.push(errAt(`${path}.costSource`,
      `'${g.costSource}' is not in COST_SOURCE`, "G.costSource"));
  }
  if (g.condition != null) {
    validateCondition(g.condition, `${path}.condition`, ctx, errors);
  }
}

function validateRemove(r, path, ctx, errors) {
  if (!r || typeof r !== "object") {
    errors.push(errAt(path, "remove atom is not an object", "G.shape"));
    return;
  }
  if (!("type" in r)) {
    errors.push(errAt(`${path}.type`, "missing required field 'type'", "G.required"));
    return;
  }
  if (!GRANT_REMOVE_TYPES.has(r.type)) {
    errors.push(errAt(`${path}.type`,
      `'${r.type}' is not in GRANT_REMOVE_TYPES`, "G.type"));
  }
  if (r.type === "ability") {
    if ("abilityType" in r && !ABILITY_TYPES.has(r.abilityType)) {
      errors.push(errAt(`${path}.abilityType`,
        `'${r.abilityType}' is not in ABILITY_TYPES`, "G.abilityType"));
    }
  }
  if (r.type === "armor") {
    if ("armorType" in r && !ARMOR_TYPES.has(r.armorType)) {
      errors.push(errAt(`${path}.armorType`,
        `'${r.armorType}' is not in ARMOR_TYPES`, "G.armorType"));
    }
  }
  if ("tags" in r) {
    // remove.tags filters target abilities' ability-level `tags` — a broader,
    // informal vocabulary (spirit, song, demon, etc.) that isn't locked to
    // ATOM_TAGS. Shape-check only: array of strings.
    if (!Array.isArray(r.tags)) {
      errors.push(errAt(`${path}.tags`, "is not an array", "G.shape"));
    } else {
      r.tags.forEach((t, i) => {
        if (typeof t !== "string") {
          errors.push(errAt(`${path}.tags[${i}]`,
            "tag must be a string", "G.tags"));
        }
      });
    }
  }
  if (r.condition != null) {
    validateCondition(r.condition, `${path}.condition`, ctx, errors);
  }
}


// ─────────────────────────────────────────────────────────────────────
// Cost (item H)
// ─────────────────────────────────────────────────────────────────────

function validateCost(cost, path, errors) {
  if (typeof cost !== "object" || Array.isArray(cost)) {
    errors.push(errAt(path, "is not an object", "H.shape"));
    return;
  }
  if (!("type" in cost)) {
    errors.push(errAt(`${path}.type`, "missing required field 'type'", "H.required"));
  } else if (!COST_TYPES.has(cost.type)) {
    errors.push(errAt(`${path}.type`,
      `'${cost.type}' is not in COST_TYPES`, "H.type"));
  }
  if ("value" in cost) {
    if (typeof cost.value !== "number" || cost.value < 0) {
      errors.push(errAt(`${path}.value`,
        "must be a non-negative number", "H.value"));
    }
  }
}


// ─────────────────────────────────────────────────────────────────────
// Error helpers
// ─────────────────────────────────────────────────────────────────────

function err(classId, path, message, rule) {
  return { classId, path, message, rule };
}
function errAt(path, message, rule) {
  return { classId: undefined, path, message, rule };
}

// Duplicate-id detector — pulled out of validateAbilityIdUniqueness stub.
// Called during validateClass right after iterating sections.
export function findDuplicateIdsInClass(classData) {
  const counts = rebuildIdFrequency(classData);
  const dups = [];
  for (const [id, n] of counts) {
    if (n > 1) dups.push(id);
  }
  return dups;
}
