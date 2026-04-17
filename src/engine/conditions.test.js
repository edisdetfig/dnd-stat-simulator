import { describe, it, expect } from 'vitest';
import {
  evaluateCondition,
  CONDITION_EVALUATORS,
  evalAll, evalAny, evalNot,
} from './conditions.js';

// Minimal klass shape for lookupAbility.
const klassFixture = {
  id: "test",
  perks: [
    { id: "p_passive", type: "perk", activation: "passive" },
  ],
  skills: [
    { id: "s_toggle",  type: "skill", activation: "toggle" },
    { id: "s_cast",    type: "skill", activation: "cast" },
  ],
  spells: [
    { id: "sp_buff",   type: "spell", activation: "cast_buff" },
    { id: "sp_cast",   type: "spell", activation: "cast" },
  ],
};

const BASE_CTX = {
  klass: klassFixture,
  selectedPerks:  ["p_passive"],
  selectedSkills: ["s_toggle"],
  selectedSpells: ["sp_buff"],
  activeBuffs:    [],
  // activeAbilityIds: passive perk is always active; toggle/cast_buff only
  // when in activeBuffs (matches buildContext §6.1 rule).
  activeAbilityIds: ["p_passive"],
  availableAbilityIds: ["p_passive", "s_toggle", "s_cast", "sp_buff", "sp_cast"],
  classResourceCounters: {},
  stackCounts:    {},
  selectedTiers:  {},
  playerStates:   [],
  viewingAfterEffect: new Set(),
  environment:    "dungeon",
  target:         { pdr: 0, mdr: 0, headshotDR: 0, creatureType: "beast" },
  attributes:     { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 },
  hpFraction:     1.0,
  weaponType:     "axe",
  isTwoHanded:    false,
  isOneHanded:    true,
  isUnarmed:      false,
  isInstrument:   false,
  isDualWielding: false,
};

// ─────────────────────────────────────────────────────────────────────
// hp_below
// ─────────────────────────────────────────────────────────────────────

describe('hp_below', () => {
  it('true when hpFraction < threshold', () => {
    expect(evaluateCondition({ type: "hp_below", threshold: 0.5 },
      { ...BASE_CTX, hpFraction: 0.3 })).toBe(true);
  });
  it('false when hpFraction >= threshold', () => {
    expect(evaluateCondition({ type: "hp_below", threshold: 0.5 },
      { ...BASE_CTX, hpFraction: 0.5 })).toBe(false);
  });
  it('default hpFraction=1.0 falls through when ctx omits it', () => {
    const { hpFraction, ...ctxNoHp } = BASE_CTX;
    expect(evaluateCondition({ type: "hp_below", threshold: 0.5 }, ctxNoHp)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// ability_selected
// ─────────────────────────────────────────────────────────────────────

describe('ability_selected', () => {
  it('true when in selectedPerks', () => {
    expect(evaluateCondition({ type: "ability_selected", abilityId: "p_passive" }, BASE_CTX)).toBe(true);
  });
  it('true when in selectedSkills', () => {
    expect(evaluateCondition({ type: "ability_selected", abilityId: "s_toggle" }, BASE_CTX)).toBe(true);
  });
  it('true when in selectedSpells', () => {
    expect(evaluateCondition({ type: "ability_selected", abilityId: "sp_buff" }, BASE_CTX)).toBe(true);
  });
  it('false when not in any selected set', () => {
    expect(evaluateCondition({ type: "ability_selected", abilityId: "unknown" }, BASE_CTX)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// effect_active — dispatched by target ability's activation
// ─────────────────────────────────────────────────────────────────────

describe('effect_active (reads activeAbilityIds)', () => {
  it('passive in activeAbilityIds → true', () => {
    expect(evaluateCondition({ type: "effect_active", effectId: "p_passive" }, BASE_CTX)).toBe(true);
  });
  it('passive NOT in activeAbilityIds → false', () => {
    const ctx = { ...BASE_CTX, activeAbilityIds: [] };
    expect(evaluateCondition({ type: "effect_active", effectId: "p_passive" }, ctx)).toBe(false);
  });
  it('toggle in activeAbilityIds → true (granted case handled)', () => {
    const ctx = { ...BASE_CTX, activeAbilityIds: ["p_passive", "s_toggle"] };
    expect(evaluateCondition({ type: "effect_active", effectId: "s_toggle" }, ctx)).toBe(true);
  });
  it('toggle NOT in activeAbilityIds → false', () => {
    expect(evaluateCondition({ type: "effect_active", effectId: "s_toggle" }, BASE_CTX)).toBe(false);
  });
  it('cast_buff in activeAbilityIds → true', () => {
    const ctx = { ...BASE_CTX, activeAbilityIds: ["p_passive", "sp_buff"] };
    expect(evaluateCondition({ type: "effect_active", effectId: "sp_buff" }, ctx)).toBe(true);
  });
  it('cast is never in activeAbilityIds → false even when forced', () => {
    // cast abilities are never in activeAbilityIds by buildContext contract.
    expect(evaluateCondition({ type: "effect_active", effectId: "s_cast" }, BASE_CTX)).toBe(false);
  });
  it('stale effectId (not in activeAbilityIds): false', () => {
    expect(evaluateCondition({ type: "effect_active", effectId: "ghost" }, BASE_CTX)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// environment
// ─────────────────────────────────────────────────────────────────────

describe('environment', () => {
  it('true on match', () => {
    expect(evaluateCondition({ type: "environment", env: "dungeon" }, BASE_CTX)).toBe(true);
  });
  it('false on mismatch', () => {
    expect(evaluateCondition({ type: "environment", env: "forest" }, BASE_CTX)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// weapon_type — specific + virtual categories
// ─────────────────────────────────────────────────────────────────────

describe('weapon_type', () => {
  it('specific kind: true on match', () => {
    expect(evaluateCondition({ type: "weapon_type", weaponType: "axe" }, BASE_CTX)).toBe(true);
  });
  it('specific kind: false on mismatch', () => {
    expect(evaluateCondition({ type: "weapon_type", weaponType: "bow" }, BASE_CTX)).toBe(false);
  });
  it('virtual ranged: true when weapon in WEAPON_TYPE_CATEGORIES.ranged', () => {
    expect(evaluateCondition({ type: "weapon_type", weaponType: "ranged" },
      { ...BASE_CTX, weaponType: "bow" })).toBe(true);
  });
  it('virtual ranged: false when not in categories', () => {
    expect(evaluateCondition({ type: "weapon_type", weaponType: "ranged" }, BASE_CTX)).toBe(false);
  });
  it('virtual unarmed: reads ctx.isUnarmed', () => {
    expect(evaluateCondition({ type: "weapon_type", weaponType: "unarmed" },
      { ...BASE_CTX, isUnarmed: true })).toBe(true);
    expect(evaluateCondition({ type: "weapon_type", weaponType: "unarmed" }, BASE_CTX)).toBe(false);
  });
  it('virtual two_handed: reads ctx.isTwoHanded', () => {
    expect(evaluateCondition({ type: "weapon_type", weaponType: "two_handed" },
      { ...BASE_CTX, isTwoHanded: true })).toBe(true);
    expect(evaluateCondition({ type: "weapon_type", weaponType: "two_handed" }, BASE_CTX)).toBe(false);
  });
  it('virtual instrument: reads ctx.isInstrument', () => {
    expect(evaluateCondition({ type: "weapon_type", weaponType: "instrument" },
      { ...BASE_CTX, isInstrument: true })).toBe(true);
  });
  it('virtual dual_wield: reads ctx.isDualWielding', () => {
    expect(evaluateCondition({ type: "weapon_type", weaponType: "dual_wield" },
      { ...BASE_CTX, isDualWielding: true })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// player_state
// ─────────────────────────────────────────────────────────────────────

describe('player_state', () => {
  it('true when state in playerStates', () => {
    expect(evaluateCondition({ type: "player_state", state: "hiding" },
      { ...BASE_CTX, playerStates: ["hiding"] })).toBe(true);
  });
  it('false when state not in playerStates', () => {
    expect(evaluateCondition({ type: "player_state", state: "hiding" }, BASE_CTX)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// equipment
// ─────────────────────────────────────────────────────────────────────

describe('equipment', () => {
  it('true when slot matches', () => {
    const ctx = { ...BASE_CTX, equipment: { head: true } };
    expect(evaluateCondition({ type: "equipment", slot: "head", equipped: true }, ctx)).toBe(true);
  });
  it('false when slot missing or mismatched', () => {
    expect(evaluateCondition({ type: "equipment", slot: "head", equipped: true }, BASE_CTX)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// creature_type
// ─────────────────────────────────────────────────────────────────────

describe('creature_type', () => {
  it('true when target creatureType matches', () => {
    expect(evaluateCondition({ type: "creature_type", creatureType: "beast" }, BASE_CTX)).toBe(true);
  });
  it('false when target creatureType differs', () => {
    expect(evaluateCondition({ type: "creature_type", creatureType: "undead" }, BASE_CTX)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// damage_type — Stage 2 pass-through + Stage 6 eval
// ─────────────────────────────────────────────────────────────────────

describe('damage_type', () => {
  it('Stage 2 (no damageType arg): pass-through TRUE', () => {
    expect(evaluateCondition({ type: "damage_type", damageType: "dark_magical" }, BASE_CTX)).toBe(true);
  });
  it('Stage 6 match (damageType arg): TRUE on match', () => {
    expect(evaluateCondition({ type: "damage_type", damageType: "dark_magical" },
      BASE_CTX, undefined, "dark_magical")).toBe(true);
  });
  it('Stage 6 match: FALSE on mismatch', () => {
    expect(evaluateCondition({ type: "damage_type", damageType: "dark_magical" },
      BASE_CTX, undefined, "fire_magical")).toBe(false);
  });
  it('Stage 6 with damageType array: membership check', () => {
    expect(evaluateCondition({ type: "damage_type", damageType: ["dark_magical", "fire_magical"] },
      BASE_CTX, undefined, "fire_magical")).toBe(true);
    expect(evaluateCondition({ type: "damage_type", damageType: ["dark_magical"] },
      BASE_CTX, undefined, "ice_magical")).toBe(false);
  });
  it('Stage 6 with exclude array: excluded damageType returns FALSE', () => {
    expect(evaluateCondition({ type: "damage_type", damageType: "dark_magical",
      exclude: ["divine_magical"] },
      BASE_CTX, undefined, "divine_magical")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// tier
// ─────────────────────────────────────────────────────────────────────

describe('tier', () => {
  it('reads ctx.selectedTiers[abilityShape.id]', () => {
    const ctx = { ...BASE_CTX, selectedTiers: { bard_song: "perfect" } };
    expect(evaluateCondition({ type: "tier", tier: "perfect" }, ctx, { id: "bard_song" })).toBe(true);
    expect(evaluateCondition({ type: "tier", tier: "good"    }, ctx, { id: "bard_song" })).toBe(false);
  });
  it('false when abilityShape missing', () => {
    expect(evaluateCondition({ type: "tier", tier: "perfect" }, BASE_CTX)).toBe(false);
  });
  it('false when no tier set for that ability', () => {
    expect(evaluateCondition({ type: "tier", tier: "good" }, BASE_CTX, { id: "unscored" })).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Compound combinators
// ─────────────────────────────────────────────────────────────────────

describe('all', () => {
  it('empty conditions: TRUE (vacuous)', () => {
    expect(evalAll({ type: "all", conditions: [] }, BASE_CTX)).toBe(true);
  });
  it('all sub-conditions true → true', () => {
    const ctx = { ...BASE_CTX,
      activeBuffs: ["s_toggle"],
      activeAbilityIds: ["p_passive", "s_toggle"] };
    expect(evaluateCondition({ type: "all", conditions: [
      { type: "effect_active", effectId: "s_toggle" },
      { type: "environment", env: "dungeon" },
    ]}, ctx)).toBe(true);
  });
  it('any sub-condition false → false', () => {
    expect(evaluateCondition({ type: "all", conditions: [
      { type: "environment", env: "dungeon" },
      { type: "environment", env: "forest" },   // false
    ]}, BASE_CTX)).toBe(false);
  });
});

describe('any', () => {
  it('empty conditions: FALSE (vacuous-existence)', () => {
    expect(evalAny({ type: "any", conditions: [] }, BASE_CTX)).toBe(false);
  });
  it('at least one true → true', () => {
    expect(evaluateCondition({ type: "any", conditions: [
      { type: "environment", env: "forest" },   // false
      { type: "environment", env: "dungeon" },  // true
    ]}, BASE_CTX)).toBe(true);
  });
  it('all false → false', () => {
    expect(evaluateCondition({ type: "any", conditions: [
      { type: "environment", env: "forest" },
      { type: "environment", env: "sky" },
    ]}, BASE_CTX)).toBe(false);
  });
});

describe('not', () => {
  it('empty conditions: TRUE', () => {
    expect(evalNot({ type: "not", conditions: [] }, BASE_CTX)).toBe(true);
  });
  it('no sub-condition true → true', () => {
    expect(evaluateCondition({ type: "not", conditions: [
      { type: "environment", env: "forest" },
    ]}, BASE_CTX)).toBe(true);
  });
  it('any sub-condition true → false', () => {
    expect(evaluateCondition({ type: "not", conditions: [
      { type: "environment", env: "dungeon" },
    ]}, BASE_CTX)).toBe(false);
  });
  it('Antimagic-like: not(damage_type: divine_magical) — Stage 6 false vs divine', () => {
    expect(evaluateCondition({ type: "not", conditions: [
      { type: "damage_type", damageType: "divine_magical" },
    ]}, BASE_CTX, undefined, "divine_magical")).toBe(false);
  });
  it('Antimagic-like: Stage 6 true vs non-divine', () => {
    expect(evaluateCondition({ type: "not", conditions: [
      { type: "damage_type", damageType: "divine_magical" },
    ]}, BASE_CTX, undefined, "dark_magical")).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Top-level behavior
// ─────────────────────────────────────────────────────────────────────

describe('evaluateCondition edge cases', () => {
  it('null condition: TRUE (no-op)', () => {
    expect(evaluateCondition(null, BASE_CTX)).toBe(true);
  });
  it('undefined condition: TRUE (no-op)', () => {
    expect(evaluateCondition(undefined, BASE_CTX)).toBe(true);
  });
  it('unknown type: FALSE', () => {
    expect(evaluateCondition({ type: "unknown_type" }, BASE_CTX)).toBe(false);
  });
});

describe('CONDITION_EVALUATORS dispatch table', () => {
  it('has entries for all 13 condition variants', () => {
    expect(Object.keys(CONDITION_EVALUATORS).sort()).toEqual([
      "ability_selected", "all", "any", "creature_type", "damage_type",
      "effect_active", "environment", "equipment", "hp_below", "not",
      "player_state", "tier", "weapon_type",
    ]);
  });
});
