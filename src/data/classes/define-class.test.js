import { describe, it, expect } from 'vitest';
import { defineClass } from './define-class.js';

// Minimal valid class — used as a base; tests mutate to inject failures.
function baseClass() {
  return {
    id: "stub",
    name: "Stub",
    baseStats: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 },
    perks: [
      {
        id: "robust",
        type: "perk",
        name: "Robust",
        effects: [{ stat: "maxHealthBonus", value: 0.075, phase: "pre_curve_flat" }],
      },
    ],
    skills: [],
    spells: [],
  };
}

describe('defineClass — happy path', () => {
  it('returns the class data when validation passes', () => {
    const cls = baseClass();
    expect(defineClass(cls)).toBe(cls);
  });

  it('accepts "all_attributes" as a stat key', () => {
    const cls = baseClass();
    cls.perks.push({
      id: "weakness",
      type: "perk",
      name: "Curse of Weakness",
      effects: [{ stat: "all_attributes", value: -0.10, phase: "attribute_multiplier" }],
    });
    expect(() => defineClass(cls)).not.toThrow();
  });

  it('accepts CORE_ATTRS (str, wil) as effect stats', () => {
    const cls = baseClass();
    cls.perks.push({
      id: "malice",
      type: "perk",
      name: "Malice",
      effects: [{ stat: "wil", value: 0.15, phase: "attribute_multiplier" }],
    });
    expect(() => defineClass(cls)).not.toThrow();
  });
});

describe('defineClass — failure modes', () => {
  it('catches unknown stat key', () => {
    const cls = baseClass();
    cls.perks[0].effects = [{ stat: "spellCastingSpeedBonus", value: 1, phase: "post_curve" }];
    expect(() => defineClass(cls)).toThrow(/unknown stat "spellCastingSpeedBonus"/);
  });

  it('catches unknown phase', () => {
    const cls = baseClass();
    cls.perks[0].effects = [{ stat: "physicalPower", value: 5, phase: "damage_over_time" }];
    expect(() => defineClass(cls)).toThrow(/unknown phase "damage_over_time"/);
  });

  it('catches unknown condition type', () => {
    const cls = baseClass();
    cls.perks[0].condition = { type: "moon_phase" };
    expect(() => defineClass(cls)).toThrow(/unknown condition type "moon_phase"/);
  });

  it('catches unknown status type in appliesStatus', () => {
    const cls = baseClass();
    cls.skills.push({
      id: "freeze",
      type: "skill",
      name: "Freeze",
      appliesStatus: [{ type: "petrified", duration: 2 }],
    });
    expect(() => defineClass(cls)).toThrow(/unknown status type "petrified"/);
  });

  it('catches unknown trigger event', () => {
    const cls = baseClass();
    cls.perks[0].triggers = [{ event: "on_dawn", effects: [] }];
    expect(() => defineClass(cls)).toThrow(/unknown trigger event "on_dawn"/);
  });

  it('catches duplicate ability ID', () => {
    const cls = baseClass();
    cls.skills.push({ id: "robust", type: "skill", name: "Robust Clash" });
    expect(() => defineClass(cls)).toThrow(/duplicate ability id "robust"/);
  });

  it('catches dangling merged spell component', () => {
    const cls = baseClass();
    cls.spells = [
      { id: "fire_bolt", type: "spell", name: "Fire Bolt" },
      // ice_bolt is intentionally missing
      {
        id: "steam_bolt",
        type: "merged_spell",
        name: "Steam Bolt",
        components: ["fire_bolt", "ice_bolt"],
      },
    ];
    expect(() => defineClass(cls)).toThrow(/unknown component spell id "ice_bolt"/);
  });

  it('catches invalid slot type', () => {
    const cls = baseClass();
    cls.skills.push({
      id: "weird_memory",
      type: "skill",
      name: "Weird Memory",
      slots: { type: "trinket", count: 4 },
    });
    expect(() => defineClass(cls)).toThrow(/unknown slot type "trinket"/);
  });

  it('reports the source path in error messages', () => {
    const cls = baseClass();
    cls.perks[0].effects[0].stat = "ghostStat";
    expect(() => defineClass(cls)).toThrow(/\[defineClass:stub\] perks\[0\]\.effects\[0\]:/);
  });
});

describe('defineClass — nested effect lists', () => {
  it('validates effects nested inside triggers[].effects', () => {
    const cls = baseClass();
    cls.perks[0].triggers = [
      { event: "on_kill", effects: [{ stat: "ghostStat", value: 1, phase: "post_curve" }] },
    ];
    expect(() => defineClass(cls)).toThrow(/triggers\[0\]\.effects\[0\]:.*unknown stat "ghostStat"/);
  });

  it('validates effects nested inside afterEffect.effects', () => {
    const cls = baseClass();
    cls.skills.push({
      id: "rush",
      type: "skill",
      name: "Rush",
      afterEffect: {
        duration: 2,
        effects: [{ stat: "actionSpeed", value: -0.08, phase: "alien_phase" }],
      },
    });
    expect(() => defineClass(cls)).toThrow(/afterEffect\.effects\[0\]:.*unknown phase "alien_phase"/);
  });

  it('validates effects nested inside stacking.perStack', () => {
    const cls = baseClass();
    cls.perks.push({
      id: "stacker",
      type: "perk",
      name: "Stacker",
      stacking: {
        maxStacks: 3,
        perStack: [{ stat: "physicalDamageBonus", value: 0.10, phase: "alien_phase" }],
      },
    });
    expect(() => defineClass(cls)).toThrow(/stacking\.perStack\[0\]:.*unknown phase/);
  });
});
