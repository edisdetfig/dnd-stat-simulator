import { describe, it, expect } from 'vitest';
import { cleric } from './cleric.js';
import { defineClass } from './define-class.js';

describe.skip('cleric smoke — unskip after Phase 1.3 engine support lands', () => {
  it('defineClass validation passes', () => {
    expect(() => defineClass(cleric)).not.toThrow();
    expect(cleric.id).toBe('cleric');
  });

  it('baseline attributes & HP', () => {
    expect(cleric.baseAttributes).toEqual({
      str: 11, vig: 13, agi: 12, dex: 14, wil: 23, kno: 20, res: 12,
    });
    expect(cleric.baseHealth).toBe(120);
  });

  it('class config', () => {
    expect(cleric.maxPerks).toBe(4);
    expect(cleric.maxSkills).toBe(2);
    expect(cleric.armorRestrictions).toEqual(['cloth', 'leather', 'plate']);
    expect(cleric.spellCost.type).toBe('charges');
  });

  it('ability census — 12 perks, 6 skills, 12 spells', () => {
    expect(cleric.perks).toHaveLength(12);
    expect(cleric.skills).toHaveLength(6);
    expect(cleric.spells).toHaveLength(12);
    expect(cleric.transformations).toHaveLength(0);
  });
});
