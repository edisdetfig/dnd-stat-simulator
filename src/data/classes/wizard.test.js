import { describe, it, expect } from 'vitest';
import { wizard } from './wizard.js';
import { defineClass } from './define-class.js';

describe.skip('wizard smoke — unskip after Phase 1.3 engine support lands', () => {
  it('defineClass validation passes', () => {
    expect(() => defineClass(wizard)).not.toThrow();
    expect(wizard.id).toBe('wizard');
  });

  it('baseline attributes & HP', () => {
    expect(wizard.baseAttributes).toEqual({
      str: 6, vig: 7, agi: 15, dex: 17, wil: 20, kno: 25, res: 15,
    });
    expect(wizard.baseHealth).toBe(109);
  });

  it('class config', () => {
    expect(wizard.maxPerks).toBe(4);
    expect(wizard.maxSkills).toBe(2);
    expect(wizard.armorRestrictions).toEqual(['cloth', 'leather']);
    expect(wizard.spellCost.type).toBe('charges');
  });

  it('ability census — 12 perks, 5 skills, 13 spells', () => {
    expect(wizard.perks).toHaveLength(12);
    expect(wizard.skills).toHaveLength(5);
    expect(wizard.spells).toHaveLength(13);
    expect(wizard.transformations).toHaveLength(0);
  });
});
