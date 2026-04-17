import { describe, it, expect } from 'vitest';
import { collectAtoms } from './collectAtoms.js';

// Minimal ability fixture exercising every container.
const klassAllContainers = {
  id: "t",
  perks: [
    { id: "p_full", type: "perk", name: "P", desc: "x", activation: "passive",
      effects: [{ stat: "luck", value: 1, phase: "post_curve" }],
      damage:  [{ base: 5, scaling: 0, damageType: "physical", target: "enemy" }],
      heal:    { baseHeal: 3, scaling: 0, healType: "magical", target: "self" },
      shield:  { base: 10, scaling: 0, damageFilter: "physical", target: "self" },
      grants:  [{ type: "ability", abilityId: "granted_a" }],
      removes: [{ type: "armor", armorType: "plate" }],
    },
    { id: "granted_a", type: "perk", name: "G", desc: "x", activation: "passive" },
  ],
  skills: [],
  spells: [],
};

function makeCtx(overrides = {}) {
  return {
    klass: klassAllContainers,
    availableAbilityIds: ["p_full"],
    activeAbilityIds: ["p_full"],
    viewingAfterEffect: new Set(),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────
// atomId format + source population
// ─────────────────────────────────────────────────────────────────────

describe('collectAtoms — atomId + source', () => {
  it('effects atom: atomId "<abilityId>:effects:<i>" + source populated', () => {
    const out = collectAtoms(makeCtx());
    expect(out.effects).toHaveLength(1);
    expect(out.effects[0].atomId).toBe("p_full:effects:0");
    expect(out.effects[0].source).toEqual({ kind: "perk", abilityId: "p_full", className: "t" });
  });

  it('damage atom: atomId "<abilityId>:damage:<i>"', () => {
    const out = collectAtoms(makeCtx());
    expect(out.damage).toHaveLength(1);
    expect(out.damage[0].atomId).toBe("p_full:damage:0");
  });

  it('heal (singular): atomId "<abilityId>:heal:0"', () => {
    const out = collectAtoms(makeCtx());
    expect(out.heal).toHaveLength(1);
    expect(out.heal[0].atomId).toBe("p_full:heal:0");
  });

  it('shield (singular): atomId "<abilityId>:shield:0"', () => {
    const out = collectAtoms(makeCtx());
    expect(out.shield).toHaveLength(1);
    expect(out.shield[0].atomId).toBe("p_full:shield:0");
  });

  it('grants atom: atomId "<abilityId>:grants:<i>"', () => {
    const out = collectAtoms(makeCtx());
    expect(out.grants).toHaveLength(1);
    expect(out.grants[0].atomId).toBe("p_full:grants:0");
  });

  it('removes atom: atomId "<abilityId>:removes:<i>"', () => {
    const out = collectAtoms(makeCtx());
    expect(out.removes).toHaveLength(1);
    expect(out.removes[0].atomId).toBe("p_full:removes:0");
  });

  it('source.kind reflects ability.type', () => {
    const klass = {
      ...klassAllContainers,
      spells: [
        { id: "sp", type: "spell", name: "S", desc: "x", activation: "cast",
          cost: { type: "none", value: 0 }, memoryCost: 1,
          damage: [{ base: 1, scaling: 0, damageType: "magical", target: "enemy" }] },
      ],
    };
    // Cast spell: in availableAbilityIds, NOT in activeAbilityIds — damage still collected.
    const out = collectAtoms({ ...makeCtx(), klass,
      availableAbilityIds: ["sp"], activeAbilityIds: [] });
    expect(out.damage[0].source.kind).toBe("spell");
  });
});

// ─────────────────────────────────────────────────────────────────────
// afterEffect short-circuit (LOCK E)
// ─────────────────────────────────────────────────────────────────────

const klassWithAfterEffect = {
  id: "t",
  perks: [],
  skills: [],
  spells: [
    { id: "shield_spell", type: "spell", name: "SS", desc: "x", activation: "cast_buff",
      cost: { type: "none", value: 0 }, memoryCost: 1,
      effects: [{ stat: "luck", value: 1, phase: "post_curve" }],
      shield:  { base: 25, scaling: 0, damageFilter: "magical", target: "self" },
      afterEffect: {
        duration: 6,
        effects: [
          { stat: "darkDamageBonus", value: 0.30, phase: "type_damage_bonus" },
          { stat: "spellCastingSpeed", value: 0.50, phase: "post_curve" },
        ],
      },
    },
  ],
};

describe('collectAtoms — afterEffect short-circuit', () => {
  it('short-circuit OFF: main-state atoms included; afterEffect atoms NOT', () => {
    const out = collectAtoms({
      klass: klassWithAfterEffect,
      availableAbilityIds: ["shield_spell"],
      activeAbilityIds: ["shield_spell"],
      viewingAfterEffect: new Set(),
    });
    expect(out.effects).toHaveLength(1);
    expect(out.effects[0].atomId).toBe("shield_spell:effects:0");
    expect(out.shield).toHaveLength(1);
  });

  it('short-circuit ON: afterEffect.effects included; main-state atoms dropped', () => {
    const out = collectAtoms({
      klass: klassWithAfterEffect,
      availableAbilityIds: ["shield_spell"],
      activeAbilityIds: ["shield_spell"],
      viewingAfterEffect: new Set(["shield_spell"]),
    });
    expect(out.effects).toHaveLength(2);
    expect(out.effects[0].atomId).toBe("shield_spell:afterEffect.effects:0");
    expect(out.effects[1].atomId).toBe("shield_spell:afterEffect.effects:1");
    expect(out.shield).toHaveLength(0);
  });

  it('grants/removes still flow on the afterEffect path', () => {
    const klass = {
      ...klassWithAfterEffect,
      spells: [
        { ...klassWithAfterEffect.spells[0],
          grants: [{ type: "ability", abilityId: "dummy" }],
        },
        { id: "dummy", type: "spell", name: "D", desc: "x", activation: "cast",
          cost: { type: "none", value: 0 }, memoryCost: 1 },
      ],
    };
    const out = collectAtoms({
      klass,
      availableAbilityIds: ["shield_spell"],
      activeAbilityIds: ["shield_spell"],
      viewingAfterEffect: new Set(["shield_spell"]),
    });
    expect(out.grants).toHaveLength(1);
    expect(out.grants[0].atomId).toBe("shield_spell:grants:0");
  });
});

// ─────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────

describe('collectAtoms — edge cases', () => {
  it('empty availableAbilityIds → all lists empty', () => {
    const out = collectAtoms({ klass: klassAllContainers,
      availableAbilityIds: [], activeAbilityIds: [], viewingAfterEffect: new Set() });
    expect(out.effects).toEqual([]);
    expect(out.damage).toEqual([]);
    expect(out.heal).toEqual([]);
    expect(out.shield).toEqual([]);
    expect(out.grants).toEqual([]);
    expect(out.removes).toEqual([]);
  });

  it('unknown abilityId in availableAbilityIds is skipped silently', () => {
    const out = collectAtoms({
      klass: klassAllContainers,
      availableAbilityIds: ["p_full", "ghost_id"],
      activeAbilityIds: ["p_full"],
      viewingAfterEffect: new Set(),
    });
    expect(out.effects).toHaveLength(1);   // only p_full contributed
  });

  it('authored atoms are not mutated (shallow clone)', () => {
    const authored = klassAllContainers.perks[0].effects[0];
    const before = { ...authored };
    collectAtoms(makeCtx());
    expect(authored).toEqual(before);
    expect("source" in authored).toBe(false);
    expect("atomId" in authored).toBe(false);
  });
});
