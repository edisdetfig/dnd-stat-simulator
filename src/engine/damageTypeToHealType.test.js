import { describe, it, expect } from 'vitest';
import { damageTypeToHealType } from './damageTypeToHealType.js';

describe('damageTypeToHealType', () => {
  it('physical → "physical"', () => {
    expect(damageTypeToHealType("physical")).toBe("physical");
  });

  // All 12 magical subtypes collapse to "magical".
  const magicalSubtypes = [
    "magical",
    "divine_magical", "dark_magical", "evil_magical",
    "fire_magical", "ice_magical", "lightning_magical", "air_magical",
    "earth_magical", "arcane_magical", "spirit_magical", "light_magical",
  ];

  for (const dt of magicalSubtypes) {
    it(`${dt} → "magical"`, () => {
      expect(damageTypeToHealType(dt)).toBe("magical");
    });
  }

  it('unknown damageType throws a descriptive error', () => {
    expect(() => damageTypeToHealType("spicy_magical"))
      .toThrow(/unknown damageType/);
  });

  it('undefined damageType throws', () => {
    expect(() => damageTypeToHealType(undefined)).toThrow();
  });
});
