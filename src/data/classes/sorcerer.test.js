import { describe, it, expect } from 'vitest';
import { sorcerer } from './sorcerer.js';
import { defineClass } from './define-class.js';

describe.skip('sorcerer smoke — unskip after Phase 1.3 engine support lands', () => {
  it('defineClass validation passes', () => {
    expect(() => defineClass(sorcerer)).not.toThrow();
    expect(sorcerer.id).toBe('sorcerer');
  });

  it('baseline attributes & HP', () => {
    expect(sorcerer.baseAttributes).toEqual({
      str: 10, vig: 10, agi: 10, dex: 18, wil: 25, kno: 20, res: 12,
    });
    // CSV-asserted HP (canonical curve gives 115; flagged in _unverified).
    expect(sorcerer.baseHealth).toBe(117);
  });

  it('class config', () => {
    expect(sorcerer.maxPerks).toBe(4);
    expect(sorcerer.maxSkills).toBe(2);
    expect(sorcerer.armorRestrictions).toEqual(['cloth', 'leather']);
    expect(sorcerer.spellCost.type).toBe('cooldown');
  });

  it('ability census — 11 perks, 2 skills, 14 spells, 15 merged spells', () => {
    expect(sorcerer.perks).toHaveLength(11);
    expect(sorcerer.skills).toHaveLength(2);
    expect(sorcerer.spells).toHaveLength(14);
    expect(sorcerer.mergedSpells).toHaveLength(15);
    expect(sorcerer.transformations).toHaveLength(0);
  });
});
