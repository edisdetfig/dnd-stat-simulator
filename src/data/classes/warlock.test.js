import { describe, it, expect } from 'vitest';
import { warlock } from './warlock.js';
import { defineClass } from './define-class.js';

describe.skip('warlock smoke — unskip after Phase 1.3 engine support lands', () => {
  it('defineClass validation passes', () => {
    expect(() => defineClass(warlock)).not.toThrow();
    expect(warlock.id).toBe('warlock');
  });

  it('baseline attributes & HP', () => {
    expect(warlock.baseAttributes).toEqual({
      str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14,
    });
    // CSV asserts HP=122 (HR = 11×0.25 + 14×0.75 = 13.25).
    expect(warlock.baseHealth).toBe(122);
  });

  it('class config', () => {
    expect(warlock.maxPerks).toBe(4);
    expect(warlock.maxSkills).toBe(2);
    expect(warlock.armorRestrictions).toEqual(['cloth', 'leather']);
    expect(warlock.spellCost.type).toBe('health');
  });

  it('ability census — 12 perks, 5 skills, 13 spells, 1 transformation', () => {
    expect(warlock.perks).toHaveLength(12);
    expect(warlock.skills).toHaveLength(5);
    expect(warlock.spells).toHaveLength(13);
    expect(warlock.transformations).toHaveLength(1);
  });
});
