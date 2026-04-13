import { describe, it, expect } from 'vitest';
import { bard } from './bard.js';
import { defineClass } from './define-class.js';

describe.skip('bard smoke — unskip after Phase 1.3 engine support lands', () => {
  it('defineClass validation passes', () => {
    expect(() => defineClass(bard)).not.toThrow();
    expect(bard.id).toBe('bard');
  });

  it('baseline attributes & HP', () => {
    expect(bard.baseAttributes).toEqual({
      str: 13, vig: 13, agi: 13, dex: 20, wil: 11, kno: 20, res: 15,
    });
    expect(bard.baseHealth).toBe(121);
  });

  it('class config', () => {
    expect(bard.maxPerks).toBe(4);
    expect(bard.maxSkills).toBe(2);
    expect(bard.armorRestrictions).toEqual(['cloth', 'leather', 'plate']);
    expect(bard.spellCost.type).toBe('none');
  });

  it('ability census — 12 perks, 5 skills, 19 musics', () => {
    expect(bard.perks).toHaveLength(12);
    expect(bard.skills).toHaveLength(5);
    expect(bard.spells).toHaveLength(0);
    expect(bard.musics).toHaveLength(19);
    expect(bard.transformations).toHaveLength(0);
  });
});
