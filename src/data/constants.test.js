import { describe, it, expect } from 'vitest';
import {
  CORE_ATTRS, ARMOR_SLOTS, PATCH_HEALTH_BONUS,
  EFFECT_PHASES, EFFECT_PHASE_VALUES, CONDITION_TYPES,
  STATUS_TYPES, PLAYER_STATES, WEAPON_TYPES,
  WEAPON_TYPE_CATEGORIES, TARGETING, EFFECT_TARGETS,
  ABILITY_TYPES, ACTIVATIONS, ATOM_TAGS, CAPABILITY_TAGS, SCALES_WITH_TYPES,
  DAMAGE_TYPES, ARMOR_TYPES, GRANT_REMOVE_TYPES,
  COST_TYPES, COST_SOURCE, TIER_VALUES,
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
    expect(TARGETING.ALLY).toBe("ally");
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
  it('CONDITION_TYPES contains the 13 locked variants', () => {
    for (const t of [
      "hp_below", "ability_selected", "effect_active", "environment",
      "weapon_type", "player_state", "equipment",
      "creature_type", "damage_type", "tier", "all", "any", "not",
    ]) expect(CONDITION_TYPES.has(t)).toBe(true);
    expect(CONDITION_TYPES.has("form_active")).toBe(false);
    expect(CONDITION_TYPES.size).toBe(13);
  });

  it('EFFECT_PHASE_VALUES mirrors Object.values(EFFECT_PHASES)', () => {
    expect(EFFECT_PHASE_VALUES).toEqual(new Set(Object.values(EFFECT_PHASES)));
    expect(EFFECT_PHASE_VALUES.size).toBe(9);
  });

  it('ABILITY_TYPES contains the five locked types', () => {
    for (const t of ["perk", "skill", "spell", "transformation", "music"]) {
      expect(ABILITY_TYPES.has(t)).toBe(true);
    }
    expect(ABILITY_TYPES.size).toBe(5);
  });

  it('ACTIVATIONS contains the four locked values', () => {
    for (const a of ["passive", "cast", "cast_buff", "toggle"]) {
      expect(ACTIVATIONS.has(a)).toBe(true);
    }
    expect(ACTIVATIONS.size).toBe(4);
  });

  it('ATOM_TAGS is a superset of STATUS_TYPES and adds CC markers', () => {
    for (const s of STATUS_TYPES) expect(ATOM_TAGS.has(s)).toBe(true);
    for (const cc of [
      "root", "stun", "slow", "bind", "disarm", "fear",
      "knockback", "lift", "trap", "immobilize",
    ]) expect(ATOM_TAGS.has(cc)).toBe(true);
    expect(ATOM_TAGS.size).toBe(20);
  });

  it('SCALES_WITH_TYPES contains hp_missing and attribute', () => {
    expect(SCALES_WITH_TYPES.has("hp_missing")).toBe(true);
    expect(SCALES_WITH_TYPES.has("attribute")).toBe(true);
    expect(SCALES_WITH_TYPES.size).toBe(2);
  });

  it('DAMAGE_TYPES contains physical + magical + 11 specific magical kinds', () => {
    expect(DAMAGE_TYPES.has("physical")).toBe(true);
    expect(DAMAGE_TYPES.has("magical")).toBe(true);
    for (const m of [
      "divine_magical", "dark_magical", "evil_magical",
      "fire_magical", "ice_magical", "lightning_magical", "air_magical",
      "earth_magical", "arcane_magical", "spirit_magical", "light_magical",
    ]) expect(DAMAGE_TYPES.has(m)).toBe(true);
    expect(DAMAGE_TYPES.size).toBe(13);
  });

  it('ARMOR_TYPES contains cloth, leather, plate', () => {
    for (const a of ["cloth", "leather", "plate"]) {
      expect(ARMOR_TYPES.has(a)).toBe(true);
    }
    expect(ARMOR_TYPES.size).toBe(3);
  });

  it('GRANT_REMOVE_TYPES contains ability, weapon, armor', () => {
    for (const t of ["ability", "weapon", "armor"]) {
      expect(GRANT_REMOVE_TYPES.has(t)).toBe(true);
    }
    expect(GRANT_REMOVE_TYPES.size).toBe(3);
  });

  it('COST_TYPES contains the five locked cost types', () => {
    for (const t of ["charges", "health", "cooldown", "percentMaxHealth", "none"]) {
      expect(COST_TYPES.has(t)).toBe(true);
    }
    expect(COST_TYPES.size).toBe(5);
  });

  it('COST_SOURCE contains granted and granter', () => {
    expect(COST_SOURCE.has("granted")).toBe(true);
    expect(COST_SOURCE.has("granter")).toBe(true);
    expect(COST_SOURCE.size).toBe(2);
  });

  it('TIER_VALUES contains poor, good, perfect', () => {
    for (const t of ["poor", "good", "perfect"]) {
      expect(TIER_VALUES.has(t)).toBe(true);
    }
    expect(TIER_VALUES.size).toBe(3);
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

  it('PLAYER_STATES contains all twelve spec states', () => {
    for (const s of [
      "hiding", "crouching", "defensive_stance", "casting",
      "reloading", "bow_drawn", "playing_music",
      "drunk", "dual_casting",
      "in_combat", "behind_target", "frenzy",
    ]) expect(PLAYER_STATES.has(s)).toBe(true);
    expect(PLAYER_STATES.size).toBe(12);
  });

  it('WEAPON_TYPES contains all 18 weapon kinds and virtual categories', () => {
    for (const w of [
      "axe", "sword", "dagger", "bow", "crossbow", "staff", "blunt",
      "rapier", "spear", "two_handed", "one_handed", "ranged", "instrument",
      "unarmed", "shield", "spellbook", "firearm", "dual_wield",
    ]) expect(WEAPON_TYPES.has(w)).toBe(true);
    expect(WEAPON_TYPES.size).toBe(18);
  });

  it('CAPABILITY_TAGS contains the seven Phase-3-locked display-only-atom capabilities', () => {
    for (const t of [
      "cooldown_gated", "phase_through", "spells_cannot_kill",
      "detects_hidden", "possessable", "can_move_while_channeling",
      "irreversible_until_contract_ends",
    ]) {
      expect(CAPABILITY_TAGS.has(t)).toBe(true);
    }
    expect(CAPABILITY_TAGS.size).toBe(7);
  });

  it('EFFECT_TARGETS contains the eight effect-level target values (incl. ally + self_or_ally)', () => {
    for (const t of [
      "self", "ally", "self_or_ally",
      "enemy", "either",
      "party", "nearby_allies", "nearby_enemies",
    ]) {
      expect(EFFECT_TARGETS.has(t)).toBe(true);
    }
    expect(EFFECT_TARGETS.size).toBe(8);
  });
});
