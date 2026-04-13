import { describe, it, expect } from 'vitest';
import { barbarian } from './barbarian.js';
import { defineClass } from './define-class.js';

describe.skip('barbarian smoke — unskip after Phase 1.3 engine support lands', () => {
  it('defineClass validation passes', () => {
    expect(() => defineClass(barbarian)).not.toThrow();
    expect(barbarian.id).toBe('barbarian');
  });

  it('baseline attributes & HP', () => {
    expect(barbarian.baseAttributes).toEqual({
      str: 20, vig: 25, agi: 13, dex: 12, wil: 18, kno: 5, res: 12,
    });
    expect(barbarian.baseHealth).toBe(140);
  });

  it('class config', () => {
    expect(barbarian.maxPerks).toBe(4);
    expect(barbarian.maxSkills).toBe(2);
    expect(barbarian.armorRestrictions).toEqual(['cloth', 'leather', 'plate']);
    expect(barbarian.spellCost.type).toBe('none');
  });

  it('ability census — 14 perks, 11 skills, 0 spells', () => {
    expect(barbarian.perks).toHaveLength(14);
    expect(barbarian.skills).toHaveLength(11);
    expect(barbarian.spells).toHaveLength(0);
  });
});
