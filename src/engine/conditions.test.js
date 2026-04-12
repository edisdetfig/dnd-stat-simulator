import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluateCondition, passesConditions, isAbilityActive, __INTERNAL__,
} from './conditions.js';
import { CONDITION_TYPES } from '../data/constants.js';

const ctx = (overrides = {}) => ({
  activeAbilityIds: new Set(),
  hpPercent: 100,
  activeForm: null,
  environment: null,
  weaponType: null,
  isDualWield: false,
  isUnarmed: false,
  isTwoHanded: false,
  gearEquipment: {},
  playerStates: {},
  frenzyActive: false,
  ...overrides,
});

describe('dispatch table coverage', () => {
  it('EVALUATORS has exactly one entry per CONDITION_TYPES member', () => {
    const evalTypes = new Set(Object.keys(__INTERNAL__.EVALUATORS));
    expect(evalTypes).toEqual(CONDITION_TYPES);
  });
});

describe('evaluateCondition — known types', () => {
  it('form_active (any form) — true iff a form is active', () => {
    expect(evaluateCondition({ type: "form_active" }, ctx({ activeForm: "bear" }))).toBe(true);
    expect(evaluateCondition({ type: "form_active" }, ctx({ activeForm: null }))).toBe(false);
  });

  it('form_active (specific form) — true only for that form', () => {
    const cond = { type: "form_active", form: "bear" };
    expect(evaluateCondition(cond, ctx({ activeForm: "bear" }))).toBe(true);
    expect(evaluateCondition(cond, ctx({ activeForm: "panther" }))).toBe(false);
    expect(evaluateCondition(cond, ctx({ activeForm: null }))).toBe(false);
  });

  it('hp_below — threshold is a fraction (0..1)', () => {
    const cond = { type: "hp_below", threshold: 0.40 };
    expect(evaluateCondition(cond, ctx({ hpPercent: 100 }))).toBe(false);
    expect(evaluateCondition(cond, ctx({ hpPercent: 41 }))).toBe(false);
    expect(evaluateCondition(cond, ctx({ hpPercent: 39 }))).toBe(true);
  });

  it('effect_active — true when ability ID is in ctx.activeAbilityIds', () => {
    const cond = { type: "effect_active", effectId: "blood_pact" };
    expect(evaluateCondition(cond, ctx({ activeAbilityIds: new Set(["blood_pact"]) }))).toBe(true);
    expect(evaluateCondition(cond, ctx({ activeAbilityIds: new Set() }))).toBe(false);
  });

  it('environment — matches ctx.environment', () => {
    const cond = { type: "environment", env: "water" };
    expect(evaluateCondition(cond, ctx({ environment: "water" }))).toBe(true);
    expect(evaluateCondition(cond, ctx({ environment: "fire" }))).toBe(false);
  });

  it('frenzy_active — reads ctx.frenzyActive', () => {
    const cond = { type: "frenzy_active" };
    expect(evaluateCondition(cond, ctx({ frenzyActive: true }))).toBe(true);
    expect(evaluateCondition(cond, ctx({ frenzyActive: false }))).toBe(false);
  });

  it('weapon_type specific — equality on ctx.weaponType', () => {
    const cond = { type: "weapon_type", weaponType: "axe" };
    expect(evaluateCondition(cond, ctx({ weaponType: "axe" }))).toBe(true);
    expect(evaluateCondition(cond, ctx({ weaponType: "sword" }))).toBe(false);
  });

  it('weapon_type category — ranged covers bow and crossbow', () => {
    const cond = { type: "weapon_type", weaponType: "ranged" };
    expect(evaluateCondition(cond, ctx({ weaponType: "bow" }))).toBe(true);
    expect(evaluateCondition(cond, ctx({ weaponType: "crossbow" }))).toBe(true);
    expect(evaluateCondition(cond, ctx({ weaponType: "sword" }))).toBe(false);
  });

  it('weapon_type unarmed — reads ctx.isUnarmed', () => {
    const cond = { type: "weapon_type", weaponType: "unarmed" };
    expect(evaluateCondition(cond, ctx({ isUnarmed: true }))).toBe(true);
    expect(evaluateCondition(cond, ctx({ isUnarmed: false }))).toBe(false);
  });

  it('weapon_type two_handed — reads ctx.isTwoHanded', () => {
    const cond = { type: "weapon_type", weaponType: "two_handed" };
    expect(evaluateCondition(cond, ctx({ isTwoHanded: true }))).toBe(true);
    expect(evaluateCondition(cond, ctx({ isTwoHanded: false }))).toBe(false);
  });

  it('dual_wield — reads ctx.isDualWield', () => {
    expect(evaluateCondition({ type: "dual_wield" }, ctx({ isDualWield: true }))).toBe(true);
    expect(evaluateCondition({ type: "dual_wield" }, ctx({ isDualWield: false }))).toBe(false);
  });

  it('player_state — reads ctx.playerStates[state]', () => {
    const cond = { type: "player_state", state: "defensive_stance" };
    expect(evaluateCondition(cond, ctx({ playerStates: { defensive_stance: true } }))).toBe(true);
    expect(evaluateCondition(cond, ctx({ playerStates: { defensive_stance: false } }))).toBe(false);
    expect(evaluateCondition(cond, ctx({ playerStates: {} }))).toBe(false);
  });

  it('equipment — checks presence/absence of a gear slot', () => {
    const needChest = { type: "equipment", slot: "chest", equipped: true };
    const noChest = { type: "equipment", slot: "chest", equipped: false };
    expect(evaluateCondition(needChest, ctx({ gearEquipment: { chest: {} } }))).toBe(true);
    expect(evaluateCondition(needChest, ctx({ gearEquipment: {} }))).toBe(false);
    expect(evaluateCondition(noChest, ctx({ gearEquipment: {} }))).toBe(true);
    expect(evaluateCondition(noChest, ctx({ gearEquipment: { chest: {} } }))).toBe(false);
  });
});

describe('evaluateCondition — fail-closed behaviour', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns false and warns once for unknown condition types', () => {
    const cond = { type: "moon_phase" };
    expect(evaluateCondition(cond, ctx())).toBe(false);
    expect(evaluateCondition(cond, ctx())).toBe(false);
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('absent condition is satisfied', () => {
    expect(evaluateCondition(null, ctx())).toBe(true);
    expect(evaluateCondition(undefined, ctx())).toBe(true);
  });
});

describe('passesConditions — AND across ability + effect', () => {
  it('both absent = pass', () => {
    expect(passesConditions({}, {}, ctx())).toBe(true);
  });

  it('ability-level condition fails → false even if effect passes', () => {
    const ability = { condition: { type: "form_active" } };
    expect(passesConditions(ability, {}, ctx({ activeForm: null }))).toBe(false);
  });

  it('effect-level condition fails → false even if ability passes', () => {
    const effect = { condition: { type: "hp_below", threshold: 0.40 } };
    expect(passesConditions({}, effect, ctx({ hpPercent: 100 }))).toBe(false);
  });

  it('both satisfied = true', () => {
    const ability = { condition: { type: "form_active", form: "bear" } };
    const effect = { condition: { type: "hp_below", threshold: 0.40 } };
    expect(passesConditions(ability, effect, ctx({ activeForm: "bear", hpPercent: 30 }))).toBe(true);
  });
});

describe('isAbilityActive', () => {
  it('true when id is in ctx.activeAbilityIds', () => {
    expect(isAbilityActive("robust", ctx({ activeAbilityIds: new Set(["robust"]) }))).toBe(true);
    expect(isAbilityActive("robust", ctx({ activeAbilityIds: new Set() }))).toBe(false);
  });

  it('false when ctx is empty/nullish', () => {
    expect(isAbilityActive("any", {})).toBe(false);
    expect(isAbilityActive("any", null)).toBe(false);
  });
});
