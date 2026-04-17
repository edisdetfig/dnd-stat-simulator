// Class-shape validator harness + self-tests.
//
// Three concerns in this file:
//   1. Run validator against every class in CLASSES (expected to fail during
//      v3 class data migration — the failures are the migration to-do list).
//   2. Assert cross-class ability-id uniqueness (item L).
//   3. Validator self-tests — positive fixtures must pass; negative fixtures
//      must produce the expected rule code. Without these, the validator
//      silently rotting is a real risk.
//
// Positive fixture strategy:
//   - VALID_RICH_CLASS — derived from the Phase 0 bench fixture
//     (bench/fixtures/max-loadout.fixture.js) with four grant-target stubs
//     appended so `ability_selected`/`effect_active`/grant.abilityId refs
//     resolve. Reuse yields consistency: bench drift → validator test fails.
//   - VALID_SUPPLEMENT_CLASS — inline, covers patterns the bench fixture
//     doesn't exercise: mergedSpells, transformation / music types, remaining
//     condition variants, extended DAMAGE_ATOM fields.

import { describe, it, expect } from 'vitest';
import { CLASSES } from './index.js';
import { validateClass, validateAllClasses } from './class-shape-validator.js';
import { MAX_LOADOUT_CLASS } from '../../../bench/fixtures/max-loadout.fixture.js';


// ─────────────────────────────────────────────────────────────────────
// Positive fixtures
// ─────────────────────────────────────────────────────────────────────

// Bench-derived rich fixture + 4 grant-target stubs.
const VALID_RICH_CLASS = {
  ...MAX_LOADOUT_CLASS,
  skills: [
    ...MAX_LOADOUT_CLASS.skills,
    { id: "dark_strike", type: "skill", name: "Dark Strike",
      desc: "Granted while in Demon Form.",
      activation: "cast", cost: { type: "none", value: 0 } },
    { id: "exit_form", type: "skill", name: "Exit Form",
      desc: "Exits Demon Form.",
      activation: "cast", cost: { type: "none", value: 0 } },
  ],
  spells: [
    ...MAX_LOADOUT_CLASS.spells,
    { id: "demon_bolt", type: "spell", name: "Demon Bolt",
      desc: "Bare-handed dark bolt granted by Demon Form.",
      activation: "cast", cost: { type: "none", value: 0 }, memoryCost: 1,
      damage: [{ base: 10, scaling: 0.5, damageType: "dark_magical", target: "enemy" }] },
    { id: "second_wind", type: "spell", name: "Second Wind",
      desc: "Recovery buff referenced by Adrenaline Surge penalty.",
      activation: "cast_buff", cost: { type: "none", value: 0 }, memoryCost: 1 },
  ],
};

// Supplement fixture: covers shape patterns the bench fixture doesn't exercise.
const VALID_SUPPLEMENT_CLASS = {
  id: "supplement",
  name: "Supplement Coverage Class",
  baseAttributes: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 },
  baseHealth: 100,
  maxPerks: 2,
  maxSkills: 2,
  armorProficiency: ["cloth", "leather"],

  perks: [
    // ability_selected condition + hp_below condition.
    {
      id: "keen_senses",
      type: "perk", name: "Keen Senses",
      desc: "While low on HP and while Focus Stance is selected, gain +10 luck.",
      activation: "passive",
      effects: [
        { stat: "luck", value: 10, phase: "post_curve",
          condition: { type: "all", conditions: [
            { type: "hp_below", threshold: 0.5 },
            { type: "ability_selected", abilityId: "focus_stance" },
          ]}},
      ],
    },
    // damage_type + creature_type + environment conditions.
    {
      id: "varied_conditions",
      type: "perk", name: "Varied Conditions",
      desc: "Exercises damage_type, creature_type, environment, equipment condition variants.",
      activation: "passive",
      effects: [
        { stat: "demonDamageBonus", value: 0.10, phase: "post_curve",
          condition: { type: "creature_type", creatureType: "demon" } },
        { stat: "headshotDamageBonus", value: 0.05, phase: "post_curve",
          condition: { type: "equipment", slot: "head", equipped: true } },
        { stat: "luck", value: 5, phase: "post_curve",
          condition: { type: "environment", env: "dungeon" } },
        // damage_type variant coverage — authored at post_cap_multiplicative_layer
        // per C.damage_type_phase_invariant (Antimagic-like pattern).
        { stat: "magicDamageTaken", value: 0.80, phase: "post_cap_multiplicative_layer",
          condition: { type: "not", conditions: [
            { type: "damage_type", damageType: "divine_magical" },
          ]} },
      ],
    },
    // Ally / self_or_ally EFFECT_TARGETS coverage + typed-damage stat +
    // CAPABILITY_TAGS display-only atom.
    {
      id: "ally_targets_coverage",
      type: "perk", name: "Ally Targets Coverage",
      desc: "Exercises ally / self_or_ally EFFECT_TARGETS, typed-damage stat, capability tag.",
      activation: "passive",
      effects: [
        { stat: "luck", value: 2, phase: "post_curve", target: "ally" },
        { stat: "luck", value: 1, phase: "post_curve", target: "self_or_ally" },
        { stat: "darkDamageBonus", value: 0.10, phase: "type_damage_bonus" },
        { tags: ["detects_hidden"], target: "self",
          desc: "Display-only capability atom." },
      ],
    },
  ],

  skills: [
    // Skill referenced by ability_selected condition above.
    {
      id: "focus_stance",
      type: "skill", name: "Focus Stance",
      desc: "Toggle stance.",
      activation: "toggle",
      cost: { type: "none", value: 0 },
    },
    // Transformation — exercises `type: "transformation"` + attribute scalesWith
    // on a DAMAGE_ATOM.
    {
      id: "bear_form",
      type: "transformation", name: "Bear Form",
      desc: "Shapeshift into a bear. Claw attack scales with STR.",
      activation: "toggle",
      memoryCost: 1,
      damage: [
        { base: 20, scaling: 0, damageType: "physical", target: "enemy",
          scalesWith: { type: "attribute", curve: "shapeshiftPrimitive", attribute: "str" },
          count: 2,
          condition: { type: "effect_active", effectId: "bear_form" } },
      ],
    },
  ],

  spells: [
    // Music type — exercises `type: "music"`.
    {
      id: "simple_song",
      type: "music", name: "Simple Song",
      desc: "Basic song.",
      activation: "cast_buff",
      cost: { type: "charges", value: 1 },
      memoryCost: 1,
      tags: ["song"],
      effects: [
        { stat: "actionSpeed", value: 0.05, phase: "post_curve",
          condition: { type: "tier", tier: "good" } },
      ],
    },
    // Extended DAMAGE_ATOM fields: trueDamage, weaponDamageScale, percentMaxHealth, lifestealRatio.
    {
      id: "extended_damage",
      type: "spell", name: "Extended Damage",
      desc: "Exercises trueDamage, weaponDamageScale, percentMaxHealth, lifestealRatio damage fields.",
      activation: "cast",
      cost: { type: "cooldown", value: 10 },
      memoryCost: 2,
      damage: [
        { base: 5, scaling: 0, damageType: "physical", target: "enemy",
          trueDamage: true },
        { base: 0, scaling: 0, damageType: "physical", target: "enemy",
          weaponDamageScale: 1.5 },
        { base: 0, scaling: 0, damageType: "magical", target: "enemy",
          percentMaxHealth: 0.05 },
        { base: 5, scaling: 0.25, damageType: "evil_magical", target: "enemy",
          lifestealRatio: 1.0,
          desc: "Lifesteal channel — derived heal = 100% × damage (LOCK 3)." },
      ],
    },
    // Prerequisite spells for mergedSpells.
    { id: "water_bolt", type: "spell", name: "Water Bolt",
      desc: "Base spell.", activation: "cast", cost: { type: "charges", value: 3 }, memoryCost: 1,
      damage: [{ base: 10, scaling: 1, damageType: "magical", target: "enemy" }] },
    { id: "levitation", type: "spell", name: "Levitation",
      desc: "Base spell.", activation: "cast_buff", cost: { type: "charges", value: 2 }, memoryCost: 1 },
  ],

  // mergedSpells — Sorcerer pattern. No memoryCost, no `requires`; uses condition.
  mergedSpells: [
    {
      id: "aqua_prison",
      type: "spell", name: "Aqua Prison",
      desc: "Auto-derived when Water Bolt and Levitation are both selected.",
      activation: "cast",
      cost: { type: "charges", value: 5 },
      damage: [
        { base: 30, scaling: 1.2, damageType: "ice_magical", target: "enemy" },
      ],
      condition: { type: "all", conditions: [
        { type: "ability_selected", abilityId: "water_bolt" },
        { type: "ability_selected", abilityId: "levitation" },
      ]},
    },
  ],
};


// ─────────────────────────────────────────────────────────────────────
// v3 class data — expected to fail during migration
// ─────────────────────────────────────────────────────────────────────

describe('class-shape validator — current class data (migration to-do list)', () => {
  for (const [id, data] of Object.entries(CLASSES)) {
    it(`${id} passes class-shape validator`, () => {
      const errors = validateClass(data);
      // On failure, print the grouped-by-rule summary to make the to-do list
      // digestible without a 200-line dump per class.
      expect(errors, summarize(id, errors)).toEqual([]);
    });
  }

  it('no cross-class ability id collisions', () => {
    const { crossClassErrors } = validateAllClasses(Object.values(CLASSES));
    expect(crossClassErrors, formatErrors(crossClassErrors)).toEqual([]);
  });
});


// ─────────────────────────────────────────────────────────────────────
// Validator self-tests — positive
// ─────────────────────────────────────────────────────────────────────

describe('validator self-tests — positive', () => {
  it('VALID_RICH_CLASS (bench-derived) produces zero errors', () => {
    const errors = validateClass(VALID_RICH_CLASS);
    expect(errors, formatErrors(errors)).toEqual([]);
  });

  it('VALID_SUPPLEMENT_CLASS produces zero errors', () => {
    const errors = validateClass(VALID_SUPPLEMENT_CLASS);
    expect(errors, formatErrors(errors)).toEqual([]);
  });
});


// ─────────────────────────────────────────────────────────────────────
// Validator self-tests — negative
// ─────────────────────────────────────────────────────────────────────
//
// Each case is a minimal class + one deliberate violation. The test asserts
// that at least one error carries the expected rule code. (`toContain` rather
// than `toEqual` keeps fixtures minimal — incidental extra errors from e.g.
// an unrelated default-check path don't break the one-rule-per-fixture
// assertion.)

const BASE = {
  id: "test",
  name: "Test",
  baseAttributes: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 },
  baseHealth: 100,
  maxPerks: 1,
  maxSkills: 1,
  armorProficiency: ["cloth"],
};

function assertHasRule(fixture, ruleCode) {
  const errors = validateClass(fixture);
  const rules = errors.map(e => e.rule);
  expect(rules, formatErrors(errors)).toContain(ruleCode);
}

describe('validator self-tests — negative', () => {
  // ── A: class root ───────────────────────────────────────────────
  it('A.required — missing class-root field', () => {
    const { id, ...withoutId } = BASE;
    assertHasRule(withoutId, "A.required");
  });

  it('A.baseAttributes — non-CORE_ATTRS key', () => {
    assertHasRule({ ...BASE,
      baseAttributes: { str: 1, vig: 1, agi: 1, dex: 1, wil: 1, kno: 1, res: 1, banana: 5 }
    }, "A.baseAttributes");
  });

  it('A.baseAttributes — missing core attribute', () => {
    assertHasRule({ ...BASE, baseAttributes: { str: 10 } }, "A.baseAttributes");
  });

  it('A.armorType — invalid armorProficiency value', () => {
    assertHasRule({ ...BASE, armorProficiency: ["cloth", "jello"] }, "A.armorType");
  });

  // ── B: ability ──────────────────────────────────────────────────
  it('B.required — missing ability field', () => {
    assertHasRule({ ...BASE, perks: [{ id: "p", type: "perk", activation: "passive" }] },
      "B.required");
  });

  it('B.type — invalid ability type', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "wizardry", desc: "x", activation: "passive" }]
    }, "B.type");
  });

  it('B.activation — invalid activation', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "dance" }]
    }, "B.activation");
  });

  it('B.id_unique — duplicate id within class', () => {
    assertHasRule({ ...BASE,
      perks: [
        { id: "dup", name: "P1", type: "perk", desc: "x", activation: "passive" },
        { id: "dup", name: "P2", type: "perk", desc: "x", activation: "passive" },
      ],
    }, "B.id_unique");
  });

  // ── C: STAT_EFFECT_ATOM ─────────────────────────────────────────
  it('C.stat — stat not in STAT_META', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "notARealStat", value: 1, phase: "post_curve" }] }],
    }, "C.stat");
  });

  it('C.namespace — RECIPE_ID outside cap_override phase', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "pdr", value: 0.1, phase: "post_curve" }] }],
    }, "C.namespace");
  });

  it('C.phase — invalid phase', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "luck", value: 1, phase: "wrong_phase" }] }],
    }, "C.phase");
  });

  it('C.target — invalid effect target', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "luck", value: 1, phase: "post_curve", target: "somewhere_else" }] }],
    }, "C.target");
  });

  it('C.tags — invalid atom tag', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "luck", value: 1, phase: "post_curve", tags: ["not_a_tag"] }] }],
    }, "C.tags");
  });

  it('C.display_only — display-only atom with no tags', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ target: "self", duration: 5 }] }],
    }, "C.display_only");
  });

  it('C.capability_tags — display-only atom with tag not in ATOM_TAGS or CAPABILITY_TAGS', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ tags: ["not_a_capability_or_cc_tag"], target: "self" }] }],
    }, "C.capability_tags");
  });

  it('C.stacking — atom has both maxStacks and resource', () => {
    assertHasRule({ ...BASE,
      classResources: { my_pool: { maxStacks: 3, desc: "x" } },
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "luck", value: 1, phase: "post_curve",
                    maxStacks: 3, resource: "my_pool" }] }],
    }, "C.stacking");
  });

  it('C.resource — resource references undeclared classResources entry', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "luck", value: 1, phase: "post_curve", resource: "ghost_pool" }] }],
    }, "C.resource");
  });

  it('C.scalesWith — invalid scalesWith.type', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "luck", value: 0, phase: "post_curve",
                    scalesWith: { type: "moon_phase" } }] }],
    }, "C.scalesWith");
  });

  // ── D: DAMAGE_ATOM ──────────────────────────────────────────────
  it('D.required — missing damage atom field', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1, cost: { type: "none", value: 0 },
        damage: [{ base: 10, damageType: "physical", target: "enemy" }] }],
    }, "D.required");
  });

  it('D.damageType — invalid damage type', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1, cost: { type: "none", value: 0 },
        damage: [{ base: 10, scaling: 1, damageType: "spicy", target: "enemy" }] }],
    }, "D.damageType");
  });

  it('D.count — non-positive count', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1, cost: { type: "none", value: 0 },
        damage: [{ base: 10, scaling: 1, damageType: "physical", target: "enemy", count: 0 }] }],
    }, "D.count");
  });

  it('D.lifestealRatio — out-of-range lifestealRatio (> 1)', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1, cost: { type: "none", value: 0 },
        damage: [{ base: 10, scaling: 1, damageType: "dark_magical", target: "enemy",
                   lifestealRatio: 1.5 }] }],
    }, "D.lifestealRatio");
  });

  it('D.lifestealRatio — negative lifestealRatio', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1, cost: { type: "none", value: 0 },
        damage: [{ base: 10, scaling: 1, damageType: "evil_magical", target: "enemy",
                   lifestealRatio: -0.2 }] }],
    }, "D.lifestealRatio");
  });

  // ── E: HEAL_ATOM / SHIELD_ATOM ─────────────────────────────────
  it('E.healType — invalid heal type', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1, cost: { type: "none", value: 0 },
        heal: { baseHeal: 10, scaling: 1, healType: "holy", target: "self" } }],
    }, "E.healType");
  });

  it('E.damageFilter — invalid shield damageFilter', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1, cost: { type: "none", value: 0 },
        shield: { base: 10, scaling: 0, damageFilter: "spicy", target: "self" } }],
    }, "E.damageFilter");
  });

  // ── F: conditions ──────────────────────────────────────────────
  it('F.type — invalid condition type', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        condition: { type: "form_active", form: "bear" } }],
    }, "F.type");
  });

  it('F.required — missing condition-variant required field', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        condition: { type: "weapon_type" } }],
    }, "F.required");
  });

  it('F.abilityId — unresolved ability_selected.abilityId', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        condition: { type: "ability_selected", abilityId: "ghost_ability" } }],
    }, "F.abilityId");
  });

  it('F.weaponType — invalid weapon_type value', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        condition: { type: "weapon_type", weaponType: "telescope" } }],
    }, "F.weaponType");
  });

  it('F.tier — invalid tier value', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1, cost: { type: "none", value: 0 },
        effects: [{ stat: "luck", value: 1, phase: "post_curve",
                    condition: { type: "tier", tier: "legendary" } }] }],
    }, "F.tier");
  });

  // ── G: grants / removes ────────────────────────────────────────
  it('G.type — invalid grant type', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        grants: [{ type: "spellbook" }] }],
    }, "G.type");
  });

  it('G.abilityId — grant.abilityId does not resolve', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        grants: [{ type: "ability", abilityId: "ghost_spell" }] }],
    }, "G.abilityId");
  });

  it('G.armorType — invalid armor type', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        grants: [{ type: "armor", armorType: "rubber" }] }],
    }, "G.armorType");
  });

  it('G.costSource — invalid costSource', () => {
    assertHasRule({ ...BASE,
      perks: [{
        id: "granter", name: "Granter", type: "perk", desc: "x", activation: "passive",
        grants: [{ type: "ability", abilityId: "granter", costSource: "moonlight" }],
      }],
    }, "G.costSource");
  });

  // ── H: cost ────────────────────────────────────────────────────
  it('H.type — invalid cost type', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1, cost: { type: "inspiration", value: 1 } }],
    }, "H.type");
  });

  it('H.value — negative cost value', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1, cost: { type: "charges", value: -3 } }],
    }, "H.value");
  });

  // ── I: memoryCost ──────────────────────────────────────────────
  it('I.required — missing memoryCost on type: "spell"', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        cost: { type: "none", value: 0 } }],
    }, "I.required");
  });

  // ── K: forbidden fields ────────────────────────────────────────
  it('K.forbidden — spellCost at class root', () => {
    assertHasRule({ ...BASE, spellCost: { type: "charges" } }, "K.forbidden");
  });

  it('K.forbidden — armorRestrictions at class root (renamed to armorProficiency)', () => {
    assertHasRule({ ...BASE, armorRestrictions: ["cloth"] }, "K.forbidden");
  });

  it('K.forbidden — passives on ability', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        passives: { lifesteal: 0.1 } }],
    }, "K.forbidden");
  });

  it('K.forbidden — summon on ability', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1, cost: { type: "none", value: 0 },
        summon: { name: "Treant", duration: 18 } }],
    }, "K.forbidden");
  });

  it('K.forbidden — mergedSpells[].requires (inherited from ability-level set)', () => {
    assertHasRule({ ...BASE,
      mergedSpells: [{ id: "m", name: "M", type: "spell", desc: "x", activation: "cast",
        requires: ["water_bolt"] }],
    }, "K.forbidden");
  });

  it('K.merged_memoryCost — mergedSpells[].memoryCost', () => {
    assertHasRule({ ...BASE,
      mergedSpells: [{ id: "m", name: "M", type: "spell", desc: "x", activation: "cast",
        memoryCost: 1 }],
    }, "K.merged_memoryCost");
  });

  it('K.atom_forbidden — hpScaling on atom', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "luck", value: 0, phase: "post_curve",
                    hpScaling: { per: 10, valuePerStep: 0.02 } }] }],
    }, "K.atom_forbidden");
  });

  it('K.atom_source — source authored on atom', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "luck", value: 1, phase: "post_curve",
                    source: { kind: "perk", abilityId: "p", className: "test" } }] }],
    }, "K.atom_source");
  });

  // ── Phase 6 LOCK F: three new rules ────────────────────────────

  it('K.afterEffect_forbidden — grants inside afterEffect', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast_buff",
        memoryCost: 1, cost: { type: "none", value: 0 },
        afterEffect: {
          duration: 5,
          effects: [{ stat: "luck", value: 1, phase: "post_curve" }],
          grants: [{ type: "ability", abilityId: "s" }],
        }}],
    }, "K.afterEffect_forbidden");
  });

  it('K.afterEffect_forbidden — removes inside afterEffect', () => {
    assertHasRule({ ...BASE,
      spells: [{ id: "s", name: "S", type: "spell", desc: "x", activation: "cast_buff",
        memoryCost: 1, cost: { type: "none", value: 0 },
        afterEffect: {
          duration: 5,
          effects: [{ stat: "luck", value: 1, phase: "post_curve" }],
          removes: [{ type: "armor", armorType: "plate" }],
        }}],
    }, "K.afterEffect_forbidden");
  });

  it('C.memorySlots_abilityType_required — memorySlots without abilityType', () => {
    assertHasRule({ ...BASE,
      skills: [{ id: "m", name: "Memory", type: "skill", desc: "x", activation: "passive",
        effects: [{ stat: "memorySlots", value: 5, phase: "post_curve" }] }],
    }, "C.memorySlots_abilityType_required");
  });

  it('C.damage_type_phase_invariant — damage_type condition at non-post-cap phase', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "luck", value: 1, phase: "post_curve",
                    condition: { type: "damage_type", damageType: "fire_magical" } }] }],
    }, "C.damage_type_phase_invariant");
  });

  it('C.damage_type_phase_invariant — damage_type nested inside not at non-post-cap phase', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "luck", value: 1, phase: "post_curve",
                    condition: { type: "not", conditions: [
                      { type: "damage_type", damageType: "divine_magical" },
                    ]} }] }],
    }, "C.damage_type_phase_invariant");
  });

  it('C.damage_type_phase_invariant — nested inside all/any at non-post-cap phase', () => {
    assertHasRule({ ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "luck", value: 1, phase: "post_curve",
                    condition: { type: "all", conditions: [
                      { type: "any", conditions: [
                        { type: "damage_type", damageType: "dark_magical" },
                      ]},
                    ]} }] }],
    }, "C.damage_type_phase_invariant");
  });

  it('C.damage_type_phase_invariant — ALLOWED at post_cap_multiplicative_layer (no error)', () => {
    const fixture = { ...BASE,
      perks: [{ id: "p", name: "P", type: "perk", desc: "x", activation: "passive",
        effects: [{ stat: "magicDamageTaken", value: 0.80, phase: "post_cap_multiplicative_layer",
                    condition: { type: "not", conditions: [
                      { type: "damage_type", damageType: "divine_magical" },
                    ]} }] }],
    };
    const errors = validateClass(fixture);
    const rules = errors.map(e => e.rule);
    expect(rules, formatErrors(errors)).not.toContain("C.damage_type_phase_invariant");
  });

  // ── L: cross-class id collision ────────────────────────────────
  it('L — cross-class ability id collision detected', () => {
    const classA = { ...BASE, id: "A",
      perks: [{ id: "shared", name: "A", type: "perk", desc: "x", activation: "passive" }] };
    const classB = { ...BASE, id: "B",
      perks: [{ id: "shared", name: "B", type: "perk", desc: "x", activation: "passive" }] };
    const { crossClassErrors } = validateAllClasses([classA, classB]);
    expect(crossClassErrors.some(e => e.rule === "L")).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────
// Error-formatting helpers (shown on test failure only)
// ─────────────────────────────────────────────────────────────────────

function formatErrors(errors) {
  if (!errors?.length) return "";
  return "\n" + errors.map(e =>
    `  [${e.rule ?? "??"}] ${e.classId ?? ""}${e.classId ? "." : ""}${e.path}: ${e.message}`
  ).join("\n");
}

function summarize(classId, errors) {
  if (!errors?.length) return "";
  const byRule = new Map();
  for (const e of errors) {
    const r = e.rule ?? "??";
    if (!byRule.has(r)) byRule.set(r, 0);
    byRule.set(r, byRule.get(r) + 1);
  }
  const ruleSummary = [...byRule.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([r, n]) => `    ${r}: ${n}`).join("\n");
  const sample = errors.slice(0, 15).map(e =>
    `    [${e.rule ?? "??"}] ${e.path}: ${e.message}`).join("\n");
  const more = errors.length > 15 ? `\n    … and ${errors.length - 15} more` : "";
  return `\n  ${classId}: ${errors.length} shape errors\n  by rule:\n${ruleSummary}\n  sample:\n${sample}${more}\n`;
}
