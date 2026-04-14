import { describe, it, expect } from 'vitest';
import { buildEngineContext } from './context.js';
import { getAvailableSpells } from './spell-availability.js';
import { makeMockClass } from './__test-fixtures__/mockClass.js';
import { emptyGear } from './__test-fixtures__/mockGear.js';

function ctxOf(classOverrides, stateOverrides = {}) {
  return buildEngineContext({
    classData: makeMockClass(classOverrides),
    gear: emptyGear(),
    weaponHeldState: "none",
    ...stateOverrides,
  });
}

const boltOfDarkness = { id: "bolt_of_darkness", type: "spell", tier: 1, name: "Bolt of Darkness" };
const curseOfWeakness = { id: "curse_of_weakness", type: "spell", tier: 1, name: "Curse of Weakness" };
const fireBolt = { id: "fire_bolt", type: "spell", tier: 1, name: "Fire Bolt" };

describe('getAvailableSpells', () => {
  it('returns empty array when no spells selected and no granters active', () => {
    const ctx = ctxOf({ spells: [boltOfDarkness, curseOfWeakness] });
    expect(getAvailableSpells(ctx)).toEqual([]);
  });

  it('includes spells in selectedSpells', () => {
    const ctx = ctxOf(
      { spells: [boltOfDarkness, curseOfWeakness] },
      { selectedSpells: ["bolt_of_darkness"] },
    );
    const available = getAvailableSpells(ctx);
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe("bolt_of_darkness");
  });

  it('includes spells granted by an active ability (grantsSpells)', () => {
    // Blood Pact — skill whose activation grants bolt_of_darkness bare-handed.
    const bloodPact = {
      id: "blood_pact", type: "skill", name: "Blood Pact",
      activation: "toggle",
      grantsSpells: ["bolt_of_darkness"],
    };
    const ctx = ctxOf(
      { skills: [bloodPact], spells: [boltOfDarkness, curseOfWeakness] },
      { activeBuffs: { blood_pact: true } },
    );
    const available = getAvailableSpells(ctx);
    expect(available.map(s => s.id)).toEqual(["bolt_of_darkness"]);
  });

  it('does NOT include granted spells when the granter is inactive', () => {
    const bloodPact = {
      id: "blood_pact", type: "skill", name: "Blood Pact",
      grantsSpells: ["bolt_of_darkness"],
    };
    const ctx = ctxOf(
      { skills: [bloodPact], spells: [boltOfDarkness] },
      { activeBuffs: { blood_pact: false } },
    );
    expect(getAvailableSpells(ctx)).toEqual([]);
  });

  it('dedupes when a spell is both in memory and granted', () => {
    const bloodPact = {
      id: "blood_pact", type: "skill", name: "Blood Pact",
      grantsSpells: ["bolt_of_darkness"],
    };
    const ctx = ctxOf(
      { skills: [bloodPact], spells: [boltOfDarkness] },
      {
        selectedSpells: ["bolt_of_darkness"],
        activeBuffs: { blood_pact: true },
      },
    );
    const available = getAvailableSpells(ctx);
    expect(available).toHaveLength(1);
  });

  it('ignores grantsSpells entries pointing at unknown ids', () => {
    const granter = {
      id: "granter", type: "perk", name: "G",
      grantsSpells: ["mystery_spell"],
    };
    const ctx = ctxOf(
      { perks: [granter], spells: [fireBolt] },
      { selectedPerks: ["granter"] },
    );
    expect(getAvailableSpells(ctx)).toEqual([]);
  });
});
