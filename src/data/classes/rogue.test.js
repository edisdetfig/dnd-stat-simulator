import { describe, it, expect } from 'vitest';
import { rogue } from './rogue.js';
import { defineClass } from './define-class.js';

describe.skip('rogue smoke — unskip after Phase 1.3 engine support lands', () => {
  it('defineClass validation passes', () => {
    expect(() => defineClass(rogue)).not.toThrow();
    expect(rogue.id).toBe('rogue');
  });

  it('baseline attributes & HP', () => {
    expect(rogue.baseAttributes).toEqual({
      str: 9, vig: 6, agi: 25, dex: 20, wil: 10, kno: 10, res: 25,
    });
    expect(rogue.baseHealth).toBe(109);
  });

  it('class config', () => {
    expect(rogue.maxPerks).toBe(4);
    expect(rogue.maxSkills).toBe(2);
    expect(rogue.armorRestrictions).toEqual(['cloth', 'leather']);
    expect(rogue.spellCost.type).toBe('none');
  });

  it('ability census — 12 perks, 7 skills, 0 spells', () => {
    expect(rogue.perks).toHaveLength(12);
    expect(rogue.skills).toHaveLength(7);
    expect(rogue.spells).toHaveLength(0);
  });
});
