import { describe, it, expect } from 'vitest';
import { filterByConditions } from './filterByConditions.js';

// Minimal klass lookup target (for abilityShape resolution + effect_active).
const klass = {
  id: "t",
  perks: [
    { id: "ref_passive", type: "perk", name: "P", desc: "x", activation: "passive" },
  ],
  skills: [
    { id: "ref_toggle", type: "skill", name: "T", desc: "x", activation: "toggle" },
    { id: "tier_target", type: "skill", name: "TT", desc: "x", activation: "passive" },
    { id: "owner_skill", type: "skill", name: "O", desc: "x", activation: "passive" },
  ],
  spells: [],
};

const BASE_CTX = {
  klass,
  selectedPerks: ["ref_passive"],
  selectedSkills: ["ref_toggle", "tier_target", "owner_skill"],
  selectedSpells: [],
  activeBuffs: [],
  // effect_active reads activeAbilityIds (populated by buildContext): passive
  // perks in-selection → active; toggle/cast_buff need activeBuffs.
  activeAbilityIds: ["ref_passive", "tier_target", "owner_skill"],
  availableAbilityIds: ["ref_passive", "ref_toggle", "tier_target", "owner_skill"],
  classResourceCounters: {},
  stackCounts: {},
  selectedTiers: {},
  playerStates: [],
  viewingAfterEffect: new Set(),
  environment: "dungeon",
  target: { creatureType: "beast" },
  attributes: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 },
  hpFraction: 1.0,
  weaponType: "axe",
  isUnarmed: false,
};

function makeSource(abilityId = "ref_passive", kind = "perk") {
  return { kind, abilityId, className: "t" };
}

function makeAtoms(effects = [], damage = [], heal = [], shield = [], grants = [], removes = []) {
  return { effects, damage, heal, shield, grants, removes };
}

// ─────────────────────────────────────────────────────────────────────
// Unconditional atoms pass through
// ─────────────────────────────────────────────────────────────────────

describe('filterByConditions — no condition', () => {
  it('atom without condition survives', () => {
    const atoms = makeAtoms([
      { stat: "luck", value: 1, phase: "post_curve", source: makeSource(), atomId: "a:effects:0" },
    ]);
    const out = filterByConditions(atoms, BASE_CTX);
    expect(out.effects).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Each condition variant: true vs false
// ─────────────────────────────────────────────────────────────────────

describe('filterByConditions — per-variant in/out', () => {
  it('hp_below: drops when condition false', () => {
    const atom = { stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "hp_below", threshold: 0.2 },
      source: makeSource(), atomId: "a:effects:0" };
    expect(filterByConditions(makeAtoms([atom]), BASE_CTX).effects).toHaveLength(0);
    expect(filterByConditions(makeAtoms([atom]), { ...BASE_CTX, hpFraction: 0.1 }).effects).toHaveLength(1);
  });

  it('ability_selected: in/out', () => {
    const atom = (id) => ({ stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "ability_selected", abilityId: id },
      source: makeSource(), atomId: "a:effects:0" });
    expect(filterByConditions(makeAtoms([atom("ref_passive")]), BASE_CTX).effects).toHaveLength(1);
    expect(filterByConditions(makeAtoms([atom("unknown_ability")]), BASE_CTX).effects).toHaveLength(0);
  });

  it('effect_active (toggle): out when NOT in activeAbilityIds; in when it is', () => {
    const atom = { stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "effect_active", effectId: "ref_toggle" },
      source: makeSource(), atomId: "a:effects:0" };
    expect(filterByConditions(makeAtoms([atom]), BASE_CTX).effects).toHaveLength(0);
    const withActive = { ...BASE_CTX, activeAbilityIds: [...BASE_CTX.activeAbilityIds, "ref_toggle"] };
    expect(filterByConditions(makeAtoms([atom]), withActive).effects).toHaveLength(1);
  });

  it('effect_active (passive): in when passive is in activeAbilityIds', () => {
    const atom = { stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "effect_active", effectId: "ref_passive" },
      source: makeSource(), atomId: "a:effects:0" };
    expect(filterByConditions(makeAtoms([atom]), BASE_CTX).effects).toHaveLength(1);
  });

  it('environment: in/out', () => {
    const atom = (env) => ({ stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "environment", env },
      source: makeSource(), atomId: "a:effects:0" });
    expect(filterByConditions(makeAtoms([atom("dungeon")]), BASE_CTX).effects).toHaveLength(1);
    expect(filterByConditions(makeAtoms([atom("forest")]),  BASE_CTX).effects).toHaveLength(0);
  });

  it('weapon_type (specific): in/out', () => {
    const atom = (wt) => ({ stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "weapon_type", weaponType: wt },
      source: makeSource(), atomId: "a:effects:0" });
    expect(filterByConditions(makeAtoms([atom("axe")]),  BASE_CTX).effects).toHaveLength(1);
    expect(filterByConditions(makeAtoms([atom("bow")]),  BASE_CTX).effects).toHaveLength(0);
  });

  it('weapon_type (virtual unarmed): reads ctx.isUnarmed', () => {
    const atom = { stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "weapon_type", weaponType: "unarmed" },
      source: makeSource(), atomId: "a:effects:0" };
    expect(filterByConditions(makeAtoms([atom]), BASE_CTX).effects).toHaveLength(0);
    expect(filterByConditions(makeAtoms([atom]),
      { ...BASE_CTX, isUnarmed: true }).effects).toHaveLength(1);
  });

  it('player_state: in/out', () => {
    const atom = { stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "player_state", state: "hiding" },
      source: makeSource(), atomId: "a:effects:0" };
    expect(filterByConditions(makeAtoms([atom]), BASE_CTX).effects).toHaveLength(0);
    expect(filterByConditions(makeAtoms([atom]),
      { ...BASE_CTX, playerStates: ["hiding"] }).effects).toHaveLength(1);
  });

  it('creature_type: in/out', () => {
    const atom = (ct) => ({ stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "creature_type", creatureType: ct },
      source: makeSource(), atomId: "a:effects:0" });
    expect(filterByConditions(makeAtoms([atom("beast")]), BASE_CTX).effects).toHaveLength(1);
    expect(filterByConditions(makeAtoms([atom("undead")]), BASE_CTX).effects).toHaveLength(0);
  });

  it('tier: reads abilityShape from atom.source', () => {
    const atom = (tier) => ({ stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "tier", tier },
      source: makeSource("owner_skill", "skill"), atomId: "owner_skill:effects:0" });
    const ctx = { ...BASE_CTX, selectedTiers: { owner_skill: "perfect" } };
    expect(filterByConditions(makeAtoms([atom("perfect")]), ctx).effects).toHaveLength(1);
    expect(filterByConditions(makeAtoms([atom("good")]),    ctx).effects).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Compound conditions
// ─────────────────────────────────────────────────────────────────────

describe('filterByConditions — compound', () => {
  it('all (intersection)', () => {
    const atom = { stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "all", conditions: [
        { type: "environment", env: "dungeon" },
        { type: "ability_selected", abilityId: "ref_passive" },
      ]},
      source: makeSource(), atomId: "a:effects:0" };
    expect(filterByConditions(makeAtoms([atom]), BASE_CTX).effects).toHaveLength(1);
  });

  it('any (union)', () => {
    const atom = { stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "any", conditions: [
        { type: "environment", env: "forest" },    // false
        { type: "environment", env: "dungeon" },   // true
      ]},
      source: makeSource(), atomId: "a:effects:0" };
    expect(filterByConditions(makeAtoms([atom]), BASE_CTX).effects).toHaveLength(1);
  });

  it('not', () => {
    const atom = { stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "not", conditions: [
        { type: "environment", env: "dungeon" },
      ]},
      source: makeSource(), atomId: "a:effects:0" };
    expect(filterByConditions(makeAtoms([atom]), BASE_CTX).effects).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// damage_type deferred evaluation (plan §3.3)
// ─────────────────────────────────────────────────────────────────────

describe('filterByConditions — damage_type pass-through', () => {
  it('direct damage_type: stays in output regardless of ctx', () => {
    const atom = { stat: "magicDamageTaken", value: 0.80, phase: "post_cap_multiplicative_layer",
      condition: { type: "damage_type", damageType: "divine_magical" },
      source: makeSource(), atomId: "a:effects:0" };
    const out = filterByConditions(makeAtoms([atom]), BASE_CTX);
    expect(out.effects).toHaveLength(1);
  });

  it('damage_type wrapped in not: Antimagic anchor — stays in output', () => {
    const atom = { stat: "magicDamageTaken", value: 0.80, phase: "post_cap_multiplicative_layer",
      condition: { type: "not", conditions: [
        { type: "damage_type", damageType: "divine_magical" },
      ]},
      source: makeSource(), atomId: "a:effects:0" };
    const out = filterByConditions(makeAtoms([atom]), BASE_CTX);
    expect(out.effects).toHaveLength(1);
  });

  it('damage_type nested deep in all/any: still stays', () => {
    const atom = { stat: "magicDamageTaken", value: 0.80, phase: "post_cap_multiplicative_layer",
      condition: { type: "all", conditions: [
        { type: "environment", env: "dungeon" },
        { type: "any", conditions: [
          { type: "damage_type", damageType: "dark_magical" },
        ]},
      ]},
      source: makeSource(), atomId: "a:effects:0" };
    const out = filterByConditions(makeAtoms([atom]), BASE_CTX);
    expect(out.effects).toHaveLength(1);
  });

  it('compound WITHOUT damage_type still filters normally', () => {
    // Same compound shell but the damage_type inner branch replaced with a
    // plain environment — now the atom is fully evaluable at Stage 2, and
    // evaluates false (environment mismatch), so drops.
    const atom = { stat: "luck", value: 1, phase: "post_curve",
      condition: { type: "all", conditions: [
        { type: "environment", env: "dungeon" },
        { type: "any", conditions: [
          { type: "environment", env: "forest" },   // false
        ]},
      ]},
      source: makeSource(), atomId: "a:effects:0" };
    const out = filterByConditions(makeAtoms([atom]), BASE_CTX);
    expect(out.effects).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Filter applies to every container
// ─────────────────────────────────────────────────────────────────────

describe('filterByConditions — container coverage', () => {
  it('filters damage, heal, shield, grants, removes too', () => {
    const falseCond = { type: "environment", env: "forest" };
    const atoms = makeAtoms(
      [{ stat: "luck", value: 1, phase: "post_curve", condition: falseCond,
         source: makeSource(), atomId: "a:effects:0" }],
      [{ base: 5, scaling: 0, damageType: "physical", target: "enemy", condition: falseCond,
         source: makeSource(), atomId: "a:damage:0" }],
      [{ baseHeal: 2, scaling: 0, healType: "magical", target: "self", condition: falseCond,
         source: makeSource(), atomId: "a:heal:0" }],
      [{ base: 10, scaling: 0, damageFilter: "physical", target: "self", condition: falseCond,
         source: makeSource(), atomId: "a:shield:0" }],
      [{ type: "ability", abilityId: "x", condition: falseCond,
         source: makeSource(), atomId: "a:grants:0" }],
      [{ type: "armor", armorType: "plate", condition: falseCond,
         source: makeSource(), atomId: "a:removes:0" }],
    );
    const out = filterByConditions(atoms, BASE_CTX);
    expect(out.effects).toHaveLength(0);
    expect(out.damage).toHaveLength(0);
    expect(out.heal).toHaveLength(0);
    expect(out.shield).toHaveLength(0);
    expect(out.grants).toHaveLength(0);
    expect(out.removes).toHaveLength(0);
  });
});
