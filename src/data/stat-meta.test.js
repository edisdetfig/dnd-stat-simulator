import { describe, it, expect } from 'vitest';
import { STAT_META } from './stat-meta.js';

const VALID_UNITS = new Set(["flat", "percent"]);
const VALID_CATS = new Set(["attr", "offense", "defense", "utility", "weapon"]);

describe('STAT_META integrity', () => {
  it('every entry has a label and valid unit/category', () => {
    for (const [id, meta] of Object.entries(STAT_META)) {
      expect(meta.label, `${id} missing label`).toBeTypeOf("string");
      expect(meta.label.length, `${id} empty label`).toBeGreaterThan(0);
      expect(VALID_UNITS.has(meta.unit), `${id} bad unit "${meta.unit}"`).toBe(true);
      expect(VALID_CATS.has(meta.cat), `${id} bad cat "${meta.cat}"`).toBe(true);
    }
  });

  it('has no duplicate labels', () => {
    const seen = new Map();
    for (const [id, meta] of Object.entries(STAT_META)) {
      const prior = seen.get(meta.label);
      if (prior) throw new Error(`Duplicate label "${meta.label}": ${prior} and ${id}`);
      seen.set(meta.label, id);
    }
  });
});

describe('STAT_META v3 additions (spec §5)', () => {
  // Spec §5 lists 21 stat keys. additionalWeaponDamage and armorPenetration
  // already existed pre-v3; the remaining 19 must be present.
  const v3Keys = [
    "healingMod", "healingAdd", "magicDamageTaken", "curseDurationBonus",
    "shapeshiftCastTime", "wildSkillCooldown", "recoverableHealth",
    "typeDamageBonus", "buffWeaponDamage", "headshotPower", "backstabPower",
    "headPenetration", "impactPower", "impactResistance",
    "equippedArmorRatingBonus", "spellChargeMultiplier", "spellCooldownMultiplier",
    "flatDamageReduction", "drawSpeed",
  ];

  for (const key of v3Keys) {
    it(`includes "${key}"`, () => {
      expect(STAT_META[key], `missing v3 stat "${key}"`).toBeDefined();
    });
  }

  it('preserves pre-v3 entries that the spec also references', () => {
    expect(STAT_META.additionalWeaponDamage).toBeDefined();
    expect(STAT_META.armorPenetration).toBeDefined();
  });
});
