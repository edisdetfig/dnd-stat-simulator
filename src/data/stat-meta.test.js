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
  // Spec §5 v3 additions. additionalWeaponDamage and armorPenetration already
  // existed pre-v3; the list below tracks the v3-introduced keys still live
  // after the Phase 1.3 §B retirements and the Phase 3 typed-damage-stat
  // migration (typeDamageBonus removed; superseded by typed stats — see
  // the "Phase 3 typed-damage-stat migration" describe block below).
  const v3Keys = [
    "healingMod", "healingAdd", "magicDamageTaken", "curseDurationBonus",
    "recoverableHealth",
    "buffWeaponDamage", "headshotPower",
    "headPenetration", "impactPower", "impactResistance",
    "equippedArmorRatingBonus", "spellChargeBonus", "spellCooldownMultiplier",
    "flatDamageReduction", "drawSpeed", "memorySlots",
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

describe('STAT_META Phase 3 typed-damage-stat migration', () => {
  // Phase 3 (LOCK 2): `typeDamageBonus + damageType` discriminator replaced
  // by one typed stat per magical subtype. Stats are class-data-authored
  // only (gearStat: false — gear rolls physicalDamageBonus / magicalDamageBonus
  // only; the universal magicalDamageBonus applies to ALL magic types per
  // docs/damage_formulas.md:122). Typed stats apply only to matching subtype.
  const typedDamageStats = [
    "divineDamageBonus", "darkDamageBonus", "evilDamageBonus",
    "fireDamageBonus", "iceDamageBonus", "lightningDamageBonus",
    "airDamageBonus", "earthDamageBonus", "arcaneDamageBonus",
    "spiritDamageBonus", "lightDamageBonus",
  ];

  for (const key of typedDamageStats) {
    it(`includes "${key}"`, () => {
      expect(STAT_META[key], `missing typed-damage stat "${key}"`).toBeDefined();
    });

    it(`"${key}" is class-data-only (gearStat: false)`, () => {
      expect(STAT_META[key].gearStat).toBeFalsy();
    });

    it(`"${key}" is percent-unit offense`, () => {
      expect(STAT_META[key].unit).toBe("percent");
      expect(STAT_META[key].cat).toBe("offense");
    });
  }

  it('legacy typeDamageBonus removed', () => {
    expect(STAT_META.typeDamageBonus).toBeUndefined();
  });
});

describe('STAT_META Phase 1.3 §B additions', () => {
  // 13 stat keys added to support class-data effects that were already
  // authored (fighter.swift, ranger, bard, druid, wizard, cleric, etc.).
  // See docs/engine_requirements_phase_1_3.md rows 62–78.
  const phase13bKeys = [
    "armorMovePenaltyReduction", "knockbackResistance", "shoutDurationBonus",
    "potionPotency", "headshotPenetration", "projectileSpeed", "switchingSpeed",
    "burnDurationAdd", "drunkDurationBonus", "knockbackPowerBonus",
    "shapeshiftTimeReduction", "wildSkillCooldownReduction", "spellMemoryRecovery",
  ];

  for (const key of phase13bKeys) {
    it(`includes "${key}"`, () => {
      expect(STAT_META[key], `missing Phase 1.3 §B stat "${key}"`).toBeDefined();
    });
  }

  // Convention 13: duration-modifier stats carry `direction` and `tag`.
  const durationModifiers = [
    { key: "curseDurationBonus", direction: "caster", tag: "curse" },
    { key: "shoutDurationBonus", direction: "caster", tag: "shout" },
    { key: "burnDurationAdd", direction: "caster", tag: "burn" },
    { key: "drunkDurationBonus", direction: "receiver", tag: "drunk" },
  ];

  for (const { key, direction, tag } of durationModifiers) {
    it(`"${key}" carries direction="${direction}" and tag="${tag}"`, () => {
      expect(STAT_META[key].direction).toBe(direction);
      expect(STAT_META[key].tag).toBe(tag);
    });
  }
});
