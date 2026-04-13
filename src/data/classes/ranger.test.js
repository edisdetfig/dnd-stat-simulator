import { describe, it, expect } from 'vitest';
import { ranger } from './ranger.js';
import { defineClass } from './define-class.js';

describe.skip('ranger smoke — unskip after Phase 1.3 engine support lands', () => {
  it('defineClass validation passes', () => {
    expect(() => defineClass(ranger)).not.toThrow();
    expect(ranger.id).toBe('ranger');
  });

  it('baseline attributes & HP', () => {
    expect(ranger.baseAttributes).toEqual({
      str: 12, vig: 10, agi: 20, dex: 18, wil: 10, kno: 12, res: 23,
    });
    expect(ranger.baseHealth).toBe(116);
  });

  it('class config', () => {
    expect(ranger.maxPerks).toBe(4);
    expect(ranger.maxSkills).toBe(2);
    expect(ranger.armorRestrictions).toEqual(['cloth', 'leather', 'plate']);
    expect(ranger.spellCost.type).toBe('none');
  });

  it('ability census — 12 perks, 8 skills, 0 spells', () => {
    expect(ranger.perks).toHaveLength(12);
    expect(ranger.skills).toHaveLength(8);
    expect(ranger.spells).toHaveLength(0);
  });
});
