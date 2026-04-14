import { describe, it, expect } from 'vitest';
import { defineClass } from './define-class.js';

// Minimal valid class — used as a base; tests mutate to inject failures.
function baseClass() {
  return {
    id: "stub",
    name: "Stub",
    baseAttributes: { str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10 },
    baseHealth: 110,
    maxPerks: 4,
    maxSkills: 2,
    armorRestrictions: ["cloth", "leather"],
    spellCost: { type: "none" },
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

  it('accepts Phase 1.3 STATUS_TYPES additions (plague, blind, freeze)', () => {
    const cls = baseClass();
    cls.skills.push({
      id: "infected_fangs",
      type: "skill",
      name: "Infected Fangs",
      appliesStatus: [
        { type: "plague", duration: { base: 3, type: "debuff" } },
        { type: "blind",  duration: { base: 2, type: "debuff" } },
        { type: "freeze", duration: { base: 2, type: "debuff" } },
      ],
    });
    expect(() => defineClass(cls)).not.toThrow();
  });

  it('accepts creature_type condition', () => {
    const cls = baseClass();
    cls.perks.push({
      id: "undead_slaying",
      type: "perk",
      name: "Undead Slaying",
      effects: [
        { stat: "physicalDamageBonus", value: 0.15, phase: "post_curve",
          condition: { type: "creature_type", value: "undead" } },
      ],
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

  it('accepts all_attributes under pre_curve_flat and attribute_multiplier', () => {
    const cls = baseClass();
    cls.perks.push({
      id: "shard_flat", type: "perk", name: "Shard Flat",
      effects: [{ stat: "all_attributes", value: 1, phase: "pre_curve_flat" }],
    });
    cls.perks.push({
      id: "curse_mul", type: "perk", name: "Curse Mul",
      effects: [{ stat: "all_attributes", value: -0.25, phase: "attribute_multiplier" }],
    });
    expect(() => defineClass(cls)).not.toThrow();
  });

  it('rejects all_attributes under post_curve (or any other phase)', () => {
    const cls = baseClass();
    cls.perks[0].effects = [
      { stat: "all_attributes", value: 5, phase: "post_curve" },
    ];
    expect(() => defineClass(cls)).toThrow(/"all_attributes" not valid under phase "post_curve"/);
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

describe('defineClass — class-root schema', () => {
  it('rejects unknown attribute in baseAttributes', () => {
    const cls = baseClass();
    cls.baseAttributes.fake = 10;
    expect(() => defineClass(cls)).toThrow(/baseAttributes: unknown attribute "fake"/);
  });

  it('rejects non-numeric baseAttributes value', () => {
    const cls = baseClass();
    cls.baseAttributes.str = "strong";
    expect(() => defineClass(cls)).toThrow(/baseAttributes\.str: value must be a number/);
  });

  it('rejects missing baseHealth', () => {
    const cls = baseClass();
    delete cls.baseHealth;
    expect(() => defineClass(cls)).toThrow(/baseHealth: must be a number/);
  });

  it('rejects non-numeric maxPerks / maxSkills', () => {
    const cls = baseClass();
    cls.maxPerks = "four";
    expect(() => defineClass(cls)).toThrow(/maxPerks: must be a number/);
  });

  it('rejects non-string entries in armorRestrictions', () => {
    const cls = baseClass();
    cls.armorRestrictions = ["cloth", 42];
    expect(() => defineClass(cls)).toThrow(/armorRestrictions: must be string\[\]/);
  });

  it('accepts class-root spellCost.type "none" for martial classes', () => {
    const cls = baseClass();
    cls.spellCost = { type: "none" };
    expect(() => defineClass(cls)).not.toThrow();
  });

  it('rejects unknown spellCost.type', () => {
    const cls = baseClass();
    cls.spellCost = { type: "mana" };
    expect(() => defineClass(cls)).toThrow(/spellCost: unknown type "mana"/);
  });

  it('accepts valid classResources shape', () => {
    const cls = baseClass();
    cls.classResources = { darkness_shards: { maxStacks: 3, desc: "Shared pool." } };
    expect(() => defineClass(cls)).not.toThrow();
  });

  it('rejects classResources entry missing maxStacks', () => {
    const cls = baseClass();
    cls.classResources = { darkness_shards: { desc: "Shared pool." } };
    expect(() => defineClass(cls)).toThrow(/classResources\.darkness_shards\.maxStacks: must be a number/);
  });

  it('rejects classResources entry missing desc', () => {
    const cls = baseClass();
    cls.classResources = { darkness_shards: { maxStacks: 3 } };
    expect(() => defineClass(cls)).toThrow(/classResources\.darkness_shards\.desc: must be a string/);
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

  it('accepts valid form.attacks damage and tolerates empty attacks[]', () => {
    const cls = baseClass();
    cls.spells.push({
      id: "bear",
      type: "transformation",
      name: "Bear",
      form: {
        formId: "bear",
        attacks: [
          {
            name: "Swipe",
            damage: [{ base: 27, scaling: 1.0, damageType: "physical", target: "enemy" }],
          },
        ],
      },
    });
    cls.spells.push({
      id: "demon",
      type: "transformation",
      name: "Demon",
      form: { formId: "demon", attacks: [] },
    });
    expect(() => defineClass(cls)).not.toThrow();
  });

  it('rejects form.attacks damage missing damageType', () => {
    const cls = baseClass();
    cls.spells.push({
      id: "bear",
      type: "transformation",
      name: "Bear",
      form: {
        formId: "bear",
        attacks: [
          { name: "Swipe", damage: [{ base: 27, scaling: 1.0, target: "enemy" }] },
        ],
      },
    });
    expect(() => defineClass(cls)).toThrow(/form\.attacks\[0\]\.damage\[0\]: missing damageType/);
  });

  it('validates damage inside form.attacks[].frenziedEffect.damage', () => {
    const cls = baseClass();
    cls.spells.push({
      id: "panther",
      type: "transformation",
      name: "Panther",
      form: {
        formId: "panther",
        attacks: [
          {
            name: "Neckbite",
            damage: [{ base: 25, scaling: 1.0, damageType: "physical", target: "enemy" }],
            frenziedEffect: {
              damage: [{ base: 10, scaling: 0.5, damageType: "physical", target: "bogus_target" }],
            },
          },
        ],
      },
    });
    expect(() => defineClass(cls)).toThrow(/frenziedEffect\.damage\[0\]: unknown target "bogus_target"/);
  });

  it('accepts valid summon.damage[]', () => {
    const cls = baseClass();
    cls.spells.push({
      id: "hydra",
      type: "spell",
      name: "Summon Hydra",
      summon: {
        type: "hydra",
        duration: { base: 10, type: "other" },
        damage: [{ base: 10, scaling: 1.0, damageType: "fire_magical", target: "enemy" }],
      },
    });
    expect(() => defineClass(cls)).not.toThrow();
  });

  it('rejects summon.damage[] missing damageType', () => {
    const cls = baseClass();
    cls.spells.push({
      id: "hydra",
      type: "spell",
      name: "Summon Hydra",
      summon: {
        type: "hydra",
        duration: { base: 10, type: "other" },
        damage: [{ base: 10, scaling: 1.0, target: "enemy" }],
      },
    });
    expect(() => defineClass(cls)).toThrow(/summon\.damage\[0\]: missing damageType/);
  });

  it('shield.effects walker is a no-op when shield has no effects (future-proof)', () => {
    const cls = baseClass();
    cls.spells.push({
      id: "arcane_shield",
      type: "spell",
      name: "Arcane Shield",
      shield: { base: 15, scaling: 0.5, damageFilter: null },
    });
    expect(() => defineClass(cls)).not.toThrow();
  });

  it('accepts valid duration shapes (buff / debuff / other, optional tags)', () => {
    const cls = baseClass();
    cls.skills.push(
      { id: "a", type: "skill", name: "A", duration: { base: 8, type: "buff" } },
      { id: "b", type: "skill", name: "B", duration: { base: 2, type: "debuff" } },
      { id: "c", type: "skill", name: "C", duration: { base: 30, type: "other", tags: ["shout"] } },
    );
    expect(() => defineClass(cls)).not.toThrow();
  });

  it('rejects unknown duration.type', () => {
    const cls = baseClass();
    cls.skills.push({ id: "a", type: "skill", name: "A", duration: { base: 8, type: "forever" } });
    expect(() => defineClass(cls)).toThrow(/\.duration: unknown duration type "forever"/);
  });

  it('rejects non-numeric duration.base', () => {
    const cls = baseClass();
    cls.skills.push({ id: "a", type: "skill", name: "A", duration: { base: "long", type: "buff" } });
    expect(() => defineClass(cls)).toThrow(/\.duration: base must be a number/);
  });

  it('rejects malformed duration.tags', () => {
    const cls = baseClass();
    cls.skills.push({ id: "a", type: "skill", name: "A", duration: { base: 3, type: "buff", tags: "shout" } });
    expect(() => defineClass(cls)).toThrow(/\.duration\.tags: must be string\[\]/);
  });

  it('validates duration nested in appliesStatus and afterEffect', () => {
    const cls = baseClass();
    cls.skills.push({
      id: "rush",
      type: "skill",
      name: "Rush",
      afterEffect: { duration: { base: 2, type: "whatever" }, effects: [] },
    });
    expect(() => defineClass(cls)).toThrow(/afterEffect\.duration: unknown duration type "whatever"/);
  });

  it('accepts valid cost shapes (health / charges / cooldown)', () => {
    const cls = baseClass();
    cls.spells.push(
      { id: "a", type: "spell", name: "A", cost: { type: "health",   value: 5  } },
      { id: "b", type: "spell", name: "B", cost: { type: "charges",  value: 4  } },
      { id: "c", type: "spell", name: "C", cost: { type: "cooldown", value: 12 } },
    );
    expect(() => defineClass(cls)).not.toThrow();
  });

  it('rejects unknown cost.type', () => {
    const cls = baseClass();
    cls.spells.push({ id: "a", type: "spell", name: "A", cost: { type: "mana", value: 5 } });
    expect(() => defineClass(cls)).toThrow(/\.cost: unknown cost type "mana"/);
  });

  it('rejects non-numeric cost.value', () => {
    const cls = baseClass();
    cls.spells.push({ id: "a", type: "spell", name: "A", cost: { type: "charges", value: "five" } });
    expect(() => defineClass(cls)).toThrow(/\.cost: value must be a number/);
  });

  it('accepts valid abilityModifiers[]', () => {
    const cls = baseClass();
    cls.perks.push({
      id: "sculpt",
      type: "perk",
      name: "Spell Sculpting",
      abilityModifiers: [
        { target: { type: "spell" }, modify: "range", value: 0.25, mode: "multiply" },
        { target: { tags: ["curse"] }, modify: "duration", value: 0.30, mode: "multiply" },
        { target: { id: "hide" }, modify: "cooldown", value: -30, mode: "add" },
      ],
    });
    expect(() => defineClass(cls)).not.toThrow();
  });

  it('rejects unknown abilityModifiers.modify field', () => {
    const cls = baseClass();
    cls.perks[0].abilityModifiers = [
      { target: { type: "spell" }, modify: "gibberish", value: 0.25, mode: "multiply" },
    ];
    expect(() => defineClass(cls)).toThrow(/abilityModifiers\[0\]: unknown modify "gibberish"/);
  });

  it('rejects unknown abilityModifiers.mode', () => {
    const cls = baseClass();
    cls.perks[0].abilityModifiers = [
      { target: { type: "spell" }, modify: "range", value: 0.25, mode: "divide" },
    ];
    expect(() => defineClass(cls)).toThrow(/abilityModifiers\[0\]: unknown mode "divide"/);
  });

  it('rejects abilityModifiers.target without exactly one of tags|type|id', () => {
    const cls = baseClass();
    cls.perks[0].abilityModifiers = [
      { target: {}, modify: "range", value: 0.25, mode: "multiply" },
    ];
    expect(() => defineClass(cls)).toThrow(/abilityModifiers\[0\]\.target: must set exactly one of/);
  });

  it('rejects non-numeric abilityModifiers.value', () => {
    const cls = baseClass();
    cls.perks[0].abilityModifiers = [
      { target: { type: "spell" }, modify: "range", value: "big", mode: "multiply" },
    ];
    expect(() => defineClass(cls)).toThrow(/abilityModifiers\[0\]: value must be a number/);
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
