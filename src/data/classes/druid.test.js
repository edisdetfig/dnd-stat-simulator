import { describe, it, expect } from 'vitest';
import { druid } from './druid.js';
import { defineClass } from './define-class.js';

describe.skip('druid smoke — unskip after Phase 1.3 engine support lands', () => {
  it('defineClass validation passes', () => {
    expect(() => defineClass(druid)).not.toThrow();
    expect(druid.id).toBe('druid');
  });

  it('baseline attributes & HP', () => {
    expect(druid.baseAttributes).toEqual({
      str: 12, vig: 13, agi: 12, dex: 12, wil: 18, kno: 20, res: 18,
    });
    // HP interpolated from HR=12.75; pending in-game verification (_unverified).
    expect(druid.baseHealth).toBe(120);
  });

  it('class config', () => {
    expect(druid.maxPerks).toBe(4);
    expect(druid.maxSkills).toBe(2);
    expect(druid.armorRestrictions).toEqual(['cloth', 'leather']);
    expect(druid.spellCost.type).toBe('charges');
  });

  it('ability census — 11 perks, 3 skills, 10 spells, 5 transformations', () => {
    expect(druid.perks).toHaveLength(11);
    expect(druid.skills).toHaveLength(3);
    expect(druid.spells).toHaveLength(10);
    expect(druid.transformations).toHaveLength(5);
  });
});
