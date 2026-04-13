import { describe, it, expect } from 'vitest';
import { buildEngineContext } from '../context.js';
import { makeMockClass } from '../__test-fixtures__/mockClass.js';
import { emptyGear } from '../__test-fixtures__/mockGear.js';
import {
  collectPerkEffects, collectBuffEffects, collectTransformationEffects,
  collectReligionEffects, collectStackingEffects, collectStatusEffects,
  collectAllEffects,
} from './index.js';

function ctxOf(classOverrides, stateOverrides = {}) {
  return buildEngineContext({
    classData: makeMockClass(classOverrides),
    gear: emptyGear(),
    weaponHeldState: "none",
    ...stateOverrides,
  });
}

describe('collectPerkEffects', () => {
  it('yields nothing when no perks selected', () => {
    const ctx = ctxOf({
      perks: [{
        id: "a", type: "perk", name: "A",
        effects: [{ stat: "str", value: 5, phase: "pre_curve_flat" }],
      }],
    });
    expect(collectPerkEffects(ctx)).toHaveLength(0);
  });

  it('emits one entry per effect on each selected perk', () => {
    const ctx = ctxOf({
      perks: [
        { id: "a", type: "perk", name: "A", effects: [
          { stat: "str", value: 5, phase: "pre_curve_flat" },
          { stat: "vig", value: 3, phase: "pre_curve_flat" },
        ]},
        { id: "b", type: "perk", name: "B", effects: [
          { stat: "physicalDamageBonus", value: 0.1, phase: "post_curve" },
        ]},
      ],
    }, { selectedPerks: ["a", "b"] });
    const entries = collectPerkEffects(ctx);
    expect(entries).toHaveLength(3);
    expect(entries.every(e => e.source === "perk")).toBe(true);
  });

  it('skips selected perks that have no effects array', () => {
    const ctx = ctxOf({
      perks: [{ id: "a", type: "perk", name: "A", passives: { note: "..." } }],
    }, { selectedPerks: ["a"] });
    expect(collectPerkEffects(ctx)).toHaveLength(0);
  });
});

describe('collectBuffEffects', () => {
  it('yields effects from spells/skills toggled on via activeBuffs', () => {
    const ctx = ctxOf({
      skills: [{
        id: "dark_offering", type: "skill", name: "Dark Offering",
        effects: [{ stat: "magicalDamageBonus", value: 0.05, phase: "post_curve" }],
      }],
      spells: [{
        id: "bloodstained_blade", type: "spell", name: "Bloodstained Blade",
        effects: [{ stat: "buffWeaponDamage", value: 5, phase: "pre_curve_flat" }],
      }],
    }, { activeBuffs: { dark_offering: true, bloodstained_blade: true } });
    const entries = collectBuffEffects(ctx);
    expect(entries).toHaveLength(2);
    expect(entries.find(e => e.source === "skill").ability.id).toBe("dark_offering");
    expect(entries.find(e => e.source === "spell").ability.id).toBe("bloodstained_blade");
  });

  it('skips buffs that are toggled off', () => {
    const ctx = ctxOf({
      spells: [{
        id: "x", type: "spell", name: "X",
        effects: [{ stat: "str", value: 1, phase: "pre_curve_flat" }],
      }],
    }, { activeBuffs: { x: false } });
    expect(collectBuffEffects(ctx)).toHaveLength(0);
  });
});

describe('collectTransformationEffects', () => {
  it('yields effects only when activeForm matches', () => {
    const tform = {
      id: "bear", type: "transformation", name: "Bear",
      condition: { type: "form_active", form: "bear" },
      effects: [{ stat: "maxHealthBonus", value: 0.50, phase: "pre_curve_flat" }],
    };
    const classData = { transformations: [tform] };
    const noForm = ctxOf(classData);
    expect(collectTransformationEffects(noForm)).toHaveLength(0);

    const inForm = ctxOf(classData, { activeForm: "bear" });
    expect(collectTransformationEffects(inForm)).toHaveLength(1);
  });
});

describe('collectReligionEffects', () => {
  it('yields religion blessing effects', () => {
    const ctx = ctxOf({}, {
      religion: {
        id: "noxulon", name: "Noxulon",
        effects: [{ stat: "regularInteractionSpeed", value: 0.20, phase: "post_curve" }],
      },
    });
    const entries = collectReligionEffects(ctx);
    expect(entries).toHaveLength(1);
    expect(entries[0].source).toBe("religion");
  });

  it('yields nothing when religion is null', () => {
    expect(collectReligionEffects(ctxOf({}))).toHaveLength(0);
  });
});

describe('collectStackingEffects', () => {
  const stackingPerk = {
    id: "soul_collector", type: "perk", name: "Soul Collector",
    stacking: {
      maxStacks: 3,
      perStack: [
        { stat: "all_attributes", value: 1, phase: "pre_curve_flat" },
        { stat: "typeDamageBonus", value: 0.33, phase: "type_damage_bonus",
          damageType: "dark_magical" },
      ],
    },
  };

  it('yields perStack × count entries when parent is active', () => {
    const ctx = ctxOf({ perks: [stackingPerk] }, {
      selectedPerks: ["soul_collector"],
      selectedStacks: { soul_collector: 2 },
    });
    const entries = collectStackingEffects(ctx);
    // 2 stacks × 2 perStack effects = 4 entries
    expect(entries).toHaveLength(4);
    expect(entries.every(e => e.source === "stacking")).toBe(true);
  });

  it('yields nothing when count is 0', () => {
    const ctx = ctxOf({ perks: [stackingPerk] }, {
      selectedPerks: ["soul_collector"],
      selectedStacks: { soul_collector: 0 },
    });
    expect(collectStackingEffects(ctx)).toHaveLength(0);
  });

  it('yields nothing when parent ability is not selected/equipped', () => {
    const ctx = ctxOf({ perks: [stackingPerk] }, {
      selectedPerks: [],                      // NOT selected
      selectedStacks: { soul_collector: 3 },
    });
    expect(collectStackingEffects(ctx)).toHaveLength(0);
  });

  it('cast-activation abilities contribute stacks without any active toggle', () => {
    // Spell Predation is a cast spell — never appears in activeAbilityIds.
    // Pre-fix, collector's isAbilityActive gate silently dropped its stacks.
    const predation = {
      id: "spell_predation", type: "spell", name: "Spell Predation",
      activation: "cast",
      stacking: {
        maxStacks: 3,
        perStack: [{ stat: "str", value: 1, phase: "pre_curve_flat" }],
      },
    };
    const ctx = ctxOf(
      { spells: [predation] },
      {
        selectedSpells: ["spell_predation"],
        // NO activeBuffs entry — cast spells don't have one.
        selectedStacks: { spell_predation: 3 },
      },
    );
    expect(collectStackingEffects(ctx)).toHaveLength(3);
  });

  it('tracks independent stacking on multiple abilities (no shared pool)', () => {
    // Warlock darkness-shard sources: engine treats each independently.
    const secondary = {
      id: "spell_predation", type: "spell", name: "Spell Predation",
      stacking: {
        maxStacks: 3,
        perStack: [{ stat: "str", value: 1, phase: "pre_curve_flat" }],
      },
    };
    const ctx = ctxOf(
      { perks: [stackingPerk], spells: [secondary] },
      {
        selectedPerks: ["soul_collector"],
        selectedSpells: ["spell_predation"],
        selectedStacks: { soul_collector: 3, spell_predation: 3 },
      },
    );
    const entries = collectStackingEffects(ctx);
    // soul_collector: 3×2 = 6. spell_predation: 3×1 = 3. Total 9.
    expect(entries).toHaveLength(9);
  });
});

describe('stubs — hp-scaling and status', () => {
  it('collectStatusEffects returns [] for Warlock-era contexts', () => {
    expect(collectStatusEffects(ctxOf({}))).toEqual([]);
  });
});

describe('collectAllEffects — unions every collector', () => {
  it('returns a flat array combining all collectors', () => {
    const ctx = ctxOf({
      perks: [{ id: "p", type: "perk", name: "P",
        effects: [{ stat: "str", value: 1, phase: "pre_curve_flat" }] }],
    }, {
      selectedPerks: ["p"],
      religion: { id: "r", name: "R",
        effects: [{ stat: "luck", value: 30, phase: "post_curve" }] },
    });
    const entries = collectAllEffects(ctx);
    expect(entries).toHaveLength(2);
    expect(entries.map(e => e.source).sort()).toEqual(["perk", "religion"]);
  });
});
