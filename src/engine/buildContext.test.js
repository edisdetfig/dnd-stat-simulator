import { describe, it, expect } from 'vitest';
import { buildContext } from './buildContext.js';

// ─────────────────────────────────────────────────────────────────────
// Minimal class fixture — used across tests
// ─────────────────────────────────────────────────────────────────────

const minimalKlass = {
  id: "mini",
  name: "Mini",
  baseAttributes: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 15, res: 10 },
  baseHealth: 100,
  armorProficiency: ["cloth"],
  perks: [
    { id: "passive_perk", type: "perk", name: "PP", desc: "x", activation: "passive" },
  ],
  skills: [
    { id: "toggle_skill", type: "skill", name: "TS", desc: "x", activation: "toggle",
      cost: { type: "none", value: 0 } },
    { id: "cast_skill", type: "skill", name: "CS", desc: "x", activation: "cast",
      cost: { type: "none", value: 0 } },
  ],
  spells: [
    { id: "spell_a", type: "spell", name: "A", desc: "x", activation: "cast",
      cost: { type: "health", value: 4 }, memoryCost: 1 },
    { id: "spell_b", type: "spell", name: "B", desc: "x", activation: "cast",
      cost: { type: "health", value: 4 }, memoryCost: 3 },
  ],
};

function makeBuild(overrides = {}) {
  return {
    klass: minimalKlass,
    attributes: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 15, res: 10 },
    selectedPerks:  [],
    selectedSkills: [],
    selectedSpells: [],
    activeBuffs:    [],
    classResourceCounters: {},
    stackCounts:    {},
    selectedTiers:  {},
    playerStates:   [],
    target: { pdr: 0, mdr: 0, headshotDR: 0 },
    weaponType: "sword",
    gear: { weapon: { weaponType: "sword" }, bonuses: {} },
    hpFraction: 1.0,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Scaffold tests — field population + defaults
// ─────────────────────────────────────────────────────────────────────

describe('buildContext scaffold', () => {
  it('populates attributes straight from build', () => {
    const ctx = buildContext(makeBuild({ attributes: { str: 15, vig: 20, agi: 10, dex: 10, wil: 25, kno: 30, res: 15 } }));
    expect(ctx.attributes).toEqual({ str: 15, vig: 20, agi: 10, dex: 10, wil: 25, kno: 30, res: 15 });
  });

  it('defaults target.maxHealth to 100 when absent (OQ3)', () => {
    const ctx = buildContext(makeBuild({ target: { pdr: 0.5, mdr: 0.2, headshotDR: 0.1 } }));
    expect(ctx.target.maxHealth).toBe(100);
  });

  it('preserves target.maxHealth when authored', () => {
    const ctx = buildContext(makeBuild({
      target: { pdr: 0, mdr: 0, headshotDR: 0, maxHealth: 250 },
    }));
    expect(ctx.target.maxHealth).toBe(250);
  });

  it('converts viewingAfterEffect to a Set', () => {
    const ctx = buildContext(makeBuild({ viewingAfterEffect: ["spell_a"] }));
    expect(ctx.viewingAfterEffect).toBeInstanceOf(Set);
    expect(ctx.viewingAfterEffect.has("spell_a")).toBe(true);
  });

  it('defaults hpFraction to 1.0 when absent', () => {
    const { hpFraction, ...buildNoHp } = makeBuild();
    const ctx = buildContext(buildNoHp);
    expect(ctx.hpFraction).toBe(1.0);
  });

  it('throws when klass is missing', () => {
    expect(() => buildContext({ attributes: {}, selectedPerks: [] }))
      .toThrow(/missing `klass`/);
  });
});

// ─────────────────────────────────────────────────────────────────────
// §6.4 — weapon-state derivation
// ─────────────────────────────────────────────────────────────────────

describe('buildContext weapon-state derivation', () => {
  it('resolves weaponType from build.weaponType', () => {
    const ctx = buildContext(makeBuild({ weaponType: "axe" }));
    expect(ctx.weaponType).toBe("axe");
  });

  it('virtual ranged: true for bow', () => {
    const ctx = buildContext(makeBuild({ weaponType: "bow" }));
    expect(ctx.isRanged).toBe(true);
  });

  it('virtual unarmed: true when weaponType=unarmed', () => {
    const ctx = buildContext(makeBuild({
      weaponType: "unarmed",
      gear: { weapon: { weaponType: "unarmed" }, bonuses: {} },
    }));
    expect(ctx.isUnarmed).toBe(true);
  });

  it('virtual unarmed: true when no weapon', () => {
    const ctx = buildContext(makeBuild({
      weaponType: null,
      gear: { weapon: null, bonuses: {} },
    }));
    expect(ctx.isUnarmed).toBe(true);
  });

  it('virtual two_handed: reads gear.weapon.handed', () => {
    const ctx = buildContext(makeBuild({
      weaponType: "axe",
      gear: { weapon: { weaponType: "axe", handed: "two_handed" }, bonuses: {} },
    }));
    expect(ctx.isTwoHanded).toBe(true);
    expect(ctx.isOneHanded).toBe(false);
  });

  it('virtual instrument: reads weapon.tags', () => {
    const ctx = buildContext(makeBuild({
      weaponType: "staff",
      gear: { weapon: { weaponType: "staff", tags: ["instrument"] }, bonuses: {} },
    }));
    expect(ctx.isInstrument).toBe(true);
  });

  it('virtual dual_wielding: reads gear.offhand.weaponType', () => {
    const ctx = buildContext(makeBuild({
      weaponType: "dagger",
      gear: { weapon: { weaponType: "dagger" }, offhand: { weaponType: "dagger" }, bonuses: {} },
    }));
    expect(ctx.isDualWielding).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// §6.1 / §6.2 — availability resolver
// ─────────────────────────────────────────────────────────────────────

describe('buildContext availability resolver', () => {
  it('activeAbilityIds = passive perks + toggle/cast_buff in activeBuffs', () => {
    const ctx = buildContext(makeBuild({
      selectedPerks:  ["passive_perk"],
      selectedSkills: ["toggle_skill"],
      activeBuffs:    ["toggle_skill"],
    }));
    expect(ctx.activeAbilityIds).toContain("passive_perk");
    expect(ctx.activeAbilityIds).toContain("toggle_skill");
  });

  it('cast ability is selected but NOT active', () => {
    const ctx = buildContext(makeBuild({
      selectedSkills: ["cast_skill"],
    }));
    expect(ctx.availableAbilityIds).toContain("cast_skill");
    expect(ctx.activeAbilityIds).not.toContain("cast_skill");
  });

  it('grants with satisfied condition expand availableAbilityIds', () => {
    const klass = {
      ...minimalKlass,
      skills: [
        ...minimalKlass.skills,
        { id: "granter", type: "skill", name: "Gr", desc: "x", activation: "toggle",
          cost: { type: "none", value: 0 },
          grants: [{ type: "ability", abilityId: "granted" }] },
        { id: "granted", type: "skill", name: "Gd", desc: "x", activation: "cast",
          cost: { type: "none", value: 0 } },
      ],
    };
    const ctx = buildContext({
      ...makeBuild({ selectedSkills: ["granter"], activeBuffs: ["granter"] }),
      klass,
    });
    expect(ctx.availableAbilityIds).toContain("granted");
  });

  it('grants with condition=false do NOT expand', () => {
    const klass = {
      ...minimalKlass,
      skills: [
        ...minimalKlass.skills,
        { id: "granter", type: "skill", name: "Gr", desc: "x", activation: "toggle",
          cost: { type: "none", value: 0 },
          grants: [{ type: "ability", abilityId: "granted",
            condition: { type: "weapon_type", weaponType: "unarmed" } }] },
        { id: "granted", type: "skill", name: "Gd", desc: "x", activation: "cast",
          cost: { type: "none", value: 0 } },
      ],
    };
    const ctx = buildContext({
      ...makeBuild({ selectedSkills: ["granter"], activeBuffs: ["granter"] }),
      klass,
    });
    expect(ctx.availableAbilityIds).not.toContain("granted");
  });

  it('cycle guard: caps at 3 iterations; sets debug.grantsCycleDropped', () => {
    // A → B → C → A ... (infinite chain, but each only contributes 1 id;
    // cap drops on 4th-iteration changes).
    const klass = {
      ...minimalKlass,
      perks: [
        { id: "a", type: "perk", name: "A", desc: "x", activation: "passive",
          grants: [{ type: "ability", abilityId: "b" }] },
        { id: "b", type: "perk", name: "B", desc: "x", activation: "passive",
          grants: [{ type: "ability", abilityId: "c" }] },
        { id: "c", type: "perk", name: "C", desc: "x", activation: "passive",
          grants: [{ type: "ability", abilityId: "d" }] },
        { id: "d", type: "perk", name: "D", desc: "x", activation: "passive",
          grants: [{ type: "ability", abilityId: "e" }] },
        { id: "e", type: "perk", name: "E", desc: "x", activation: "passive" },
      ],
      skills: [],
      spells: [],
    };
    const ctx = buildContext({
      ...makeBuild({ selectedPerks: ["a"] }),
      klass,
    });
    expect(ctx.debug.grantsCycleDropped).toBe(true);
  });

  it('ability-level condition gates the whole ability out of available', () => {
    const klass = {
      ...minimalKlass,
      perks: [
        ...minimalKlass.perks,
        { id: "gated", type: "perk", name: "G", desc: "x", activation: "passive",
          condition: { type: "weapon_type", weaponType: "bow" } },
      ],
    };
    const ctx = buildContext({
      ...makeBuild({ selectedPerks: ["passive_perk", "gated"], weaponType: "axe" }),
      klass,
    });
    expect(ctx.availableAbilityIds).toContain("passive_perk");
    expect(ctx.availableAbilityIds).not.toContain("gated");
    expect(ctx.lockedAbilityIds).toContain("gated");
  });
});

// ─────────────────────────────────────────────────────────────────────
// §6.3 — memory-budget preliminary pass
// ─────────────────────────────────────────────────────────────────────

describe('buildContext memory-budget preliminary pass', () => {
  it('pools have independent capacity seeded from KNO curve', () => {
    // KNO=15 → memoryCapacity curve: linear from 6, slope 1 → (15-6)=9 slots per pool.
    const ctx = buildContext(makeBuild({ attributes: {
      str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 15, res: 10,
    }}));
    expect(ctx.memoryBudget.spell.capacity).toBe(9);
    expect(ctx.memoryBudget.transformation.capacity).toBe(9);
    expect(ctx.memoryBudget.music.capacity).toBe(9);
  });

  it('memorySlots atom with abilityType: "spell" adds only to spell pool', () => {
    const klass = {
      ...minimalKlass,
      skills: [
        ...minimalKlass.skills,
        { id: "spell_memory", type: "skill", name: "SM", desc: "x", activation: "passive",
          effects: [{ stat: "memorySlots", value: 5, phase: "post_curve", abilityType: "spell" }] },
      ],
    };
    const ctx = buildContext({
      ...makeBuild({ selectedSkills: ["spell_memory"] }),
      klass,
    });
    expect(ctx.memoryBudget.spell.capacity).toBe(14);           // 9 + 5
    expect(ctx.memoryBudget.transformation.capacity).toBe(9);    // untouched
    expect(ctx.memoryBudget.music.capacity).toBe(9);             // untouched
  });

  it('selectedSpells consumed in order; overflow goes to lockedOut[]', () => {
    // capacity 9; select spell_a (cost 1) + spell_b (cost 3) = 4 used, fits.
    const ctxFits = buildContext(makeBuild({
      selectedSpells: ["spell_a", "spell_b"],
    }));
    expect(ctxFits.memoryBudget.spell.used).toBe(4);
    expect(ctxFits.memoryBudget.spell.lockedOut).toEqual([]);

    // Shrink capacity by dropping KNO so only spell_a (cost 1) fits at cap=3.
    // With KNO=9 the curve is (9-6)=3.
    const ctxCramped = buildContext(makeBuild({
      attributes: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 9, res: 10 },
      selectedSpells: ["spell_a", "spell_b", "spell_a_overflow"],
    }));
    expect(ctxCramped.memoryBudget.spell.capacity).toBe(3);
    expect(ctxCramped.memoryBudget.spell.used).toBe(1);
    expect(ctxCramped.memoryBudget.spell.lockedOut).toEqual(["spell_b"]);
  });
});
