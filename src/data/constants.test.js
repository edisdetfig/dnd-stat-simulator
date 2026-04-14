import { describe, it, expect } from 'vitest';
import {
  CORE_ATTRS, ARMOR_SLOTS, PATCH_HEALTH_BONUS,
  EFFECT_PHASES, CONDITION_TYPES, TRIGGER_EVENTS,
  STATUS_TYPES, PLAYER_STATES, WEAPON_TYPES,
  WEAPON_TYPE_CATEGORIES, TARGETING, EFFECT_TARGETS,
} from './constants.js';

describe('constants exports', () => {
  it('CORE_ATTRS contains the seven D&D attributes', () => {
    expect(CORE_ATTRS.size).toBe(7);
    for (const a of ["str", "vig", "agi", "dex", "wil", "kno", "res"]) {
      expect(CORE_ATTRS.has(a)).toBe(true);
    }
  });

  it('ARMOR_SLOTS lists nine slots in canonical order', () => {
    expect(ARMOR_SLOTS).toEqual([
      "head", "chest", "back", "hands", "legs", "feet",
      "ring1", "ring2", "necklace",
    ]);
  });

  it('PATCH_HEALTH_BONUS is 10', () => {
    expect(PATCH_HEALTH_BONUS).toBe(10);
  });
});

describe('frozen enums', () => {
  it('EFFECT_PHASES is frozen and maps UPPER → snake_case literals', () => {
    expect(Object.isFrozen(EFFECT_PHASES)).toBe(true);
    expect(EFFECT_PHASES.PRE_CURVE_FLAT).toBe("pre_curve_flat");
    expect(EFFECT_PHASES.ATTRIBUTE_MULTIPLIER).toBe("attribute_multiplier");
    expect(EFFECT_PHASES.POST_CURVE).toBe("post_curve");
    expect(EFFECT_PHASES.POST_CURVE_MULTIPLICATIVE).toBe("post_curve_multiplicative");
    expect(EFFECT_PHASES.MULTIPLICATIVE_LAYER).toBe("multiplicative_layer");
    expect(EFFECT_PHASES.POST_CAP_MULTIPLICATIVE_LAYER).toBe("post_cap_multiplicative_layer");
    expect(EFFECT_PHASES.TYPE_DAMAGE_BONUS).toBe("type_damage_bonus");
    expect(EFFECT_PHASES.HEALING_MODIFIER).toBe("healing_modifier");
    expect(EFFECT_PHASES.CAP_OVERRIDE).toBe("cap_override");
  });

  it('TARGETING is frozen and maps to spec literals', () => {
    expect(Object.isFrozen(TARGETING)).toBe(true);
    expect(TARGETING.SELF).toBe("self");
    expect(TARGETING.ALLY_OR_SELF).toBe("ally_or_self");
    expect(TARGETING.ENEMY).toBe("enemy");
    expect(TARGETING.ENEMY_OR_SELF).toBe("enemy_or_self");
  });

  it('WEAPON_TYPE_CATEGORIES is frozen and lists ranged weapons', () => {
    expect(Object.isFrozen(WEAPON_TYPE_CATEGORIES)).toBe(true);
    expect(WEAPON_TYPE_CATEGORIES.ranged).toEqual(["bow", "crossbow"]);
  });
});

describe('membership sets', () => {
  it('CONDITION_TYPES contains all thirteen spec types', () => {
    for (const t of [
      "form_active", "hp_below", "effect_active", "environment", "frenzy_active",
      "weapon_type", "dual_wield", "player_state", "equipment",
      "creature_type", "damageType", "all", "any",
    ]) expect(CONDITION_TYPES.has(t)).toBe(true);
    expect(CONDITION_TYPES.size).toBe(13);
  });

  it('TRIGGER_EVENTS contains spec events plus on_successful_block', () => {
    for (const e of [
      "on_melee_hit", "on_hit_received", "on_damage_taken", "on_damage_dealt",
      "on_heal_cast", "on_kill", "on_shield_break", "on_curse_tick",
      "on_successful_block",
    ]) expect(TRIGGER_EVENTS.has(e)).toBe(true);
  });

  it('STATUS_TYPES contains the ten spec statuses', () => {
    for (const s of [
      "burn", "frostbite", "wet", "electrified", "poison", "bleed", "silence",
      "plague", "blind", "freeze",
    ]) {
      expect(STATUS_TYPES.has(s)).toBe(true);
    }
    expect(STATUS_TYPES.size).toBe(10);
  });

  it('PLAYER_STATES contains all ten spec states', () => {
    for (const s of [
      "hiding", "crouching", "blocking", "defensive_stance", "casting",
      "reloading", "bow_drawn", "playing_music", "drunk", "dual_casting",
    ]) expect(PLAYER_STATES.has(s)).toBe(true);
    expect(PLAYER_STATES.size).toBe(10);
  });

  it('WEAPON_TYPES contains all 13 weapon kinds and virtual categories', () => {
    for (const w of [
      "axe", "sword", "dagger", "bow", "crossbow", "staff", "blunt",
      "rapier", "spear", "two_handed", "ranged", "instrument", "unarmed",
    ]) expect(WEAPON_TYPES.has(w)).toBe(true);
    expect(WEAPON_TYPES.size).toBe(13);
  });

  it('EFFECT_TARGETS contains the six effect-level target values', () => {
    for (const t of ["self", "enemy", "either", "party", "nearby_allies", "nearby_enemies"]) {
      expect(EFFECT_TARGETS.has(t)).toBe(true);
    }
    expect(EFFECT_TARGETS.size).toBe(6);
  });
});
