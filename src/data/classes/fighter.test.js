import { describe, it, expect } from 'vitest';
import { fighter } from './fighter.js';
import { defineClass } from './define-class.js';

describe.skip('fighter smoke — unskip after Phase 1.3 engine support lands', () => {
  it('defineClass validation passes', () => {
    expect(() => defineClass(fighter)).not.toThrow();
    expect(fighter.id).toBe('fighter');
    expect(fighter.name).toBe('Fighter');
  });

  it('baseline: no gear, no selections — pinned attributes & HP', () => {
    expect(fighter.baseAttributes).toEqual({
      str: 15, vig: 15, agi: 15, dex: 15, wil: 15, kno: 15, res: 15,
    });
    expect(fighter.baseHealth).toBe(125);
  });

  it('class config — max slots, armor, spell cost', () => {
    expect(fighter.maxPerks).toBe(4);
    expect(fighter.maxSkills).toBe(2);
    expect(fighter.armorRestrictions).toEqual(['cloth', 'leather', 'plate']);
    expect(fighter.spellCost.type).toBe('none');
  });

  it('ability census — 15 perks, 12 skills, 0 spells, 0 transformations', () => {
    expect(fighter.perks).toHaveLength(15);
    expect(fighter.skills).toHaveLength(12);
    expect(fighter.spells).toHaveLength(0);
    expect(fighter.transformations).toHaveLength(0);
  });
});
