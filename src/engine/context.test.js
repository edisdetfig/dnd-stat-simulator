import { describe, it, expect } from 'vitest';
import { buildEngineContext } from './context.js';
import { makeMockClass } from './__test-fixtures__/mockClass.js';
import { emptyGear, weaponItem, armorItem } from './__test-fixtures__/mockGear.js';

function stateWith(overrides = {}) {
  return {
    classData: makeMockClass(),
    gear: emptyGear(),
    weaponHeldState: "none",
    ...overrides,
  };
}

describe('buildEngineContext — gear aggregation', () => {
  it('pre-aggregates base class stats into attrs', () => {
    const ctx = buildEngineContext(stateWith());
    expect(ctx.attrs).toEqual({
      str: 10, vig: 10, agi: 10, dex: 10, wil: 10, kno: 10, res: 10,
    });
  });

  it('folds gear inherentStats into attrs (core) and bonuses (other)', () => {
    const gear = emptyGear();
    gear.chest = armorItem({
      inherentStats: [
        { stat: "vig", value: 2 },              // core → attrs
        { stat: "armorRating", value: 50 },     // non-core → bonuses
      ],
    });
    const ctx = buildEngineContext(stateWith({ gear }));
    expect(ctx.attrs.vig).toBe(12);
    expect(ctx.bonuses.armorRating).toBe(50);
  });

  it('activeWeapon is null when weaponHeldState is "none"', () => {
    const ctx = buildEngineContext(stateWith());
    expect(ctx.activeWeapon).toBeNull();
    expect(ctx.weaponType).toBeNull();
    expect(ctx.isUnarmed).toBe(true);
  });
});

describe('buildEngineContext — weapon-derived flags', () => {
  it('populates weaponType and isTwoHanded from the active weapon', () => {
    const gear = emptyGear();
    gear.weaponSlot1.primary = weaponItem({ weaponType: "staff", handType: "twoHanded" });
    const ctx = buildEngineContext(stateWith({ gear, weaponHeldState: "weaponSlot1" }));
    expect(ctx.weaponType).toBe("staff");
    expect(ctx.isTwoHanded).toBe(true);
    expect(ctx.isUnarmed).toBe(false);
  });

  it('isDualWield when both primary and secondary have weaponType', () => {
    const gear = emptyGear();
    gear.weaponSlot1.primary = weaponItem({ weaponType: "sword", handType: "oneHanded" });
    gear.weaponSlot1.secondary = weaponItem({ weaponType: "dagger", handType: "oneHanded" });
    const ctx = buildEngineContext(stateWith({ gear, weaponHeldState: "weaponSlot1" }));
    expect(ctx.isDualWield).toBe(true);
  });

  it('not dual wield when secondary is a non-weapon (e.g., shield)', () => {
    const gear = emptyGear();
    gear.weaponSlot1.primary = weaponItem({ weaponType: "sword" });
    gear.weaponSlot1.secondary = armorItem({ armorType: "shield" }); // no weaponType
    const ctx = buildEngineContext(stateWith({ gear, weaponHeldState: "weaponSlot1" }));
    expect(ctx.isDualWield).toBe(false);
  });
});

describe('buildEngineContext — gearEquipment', () => {
  it('includes slots that have gear; omits empty slots', () => {
    const gear = emptyGear();
    gear.chest = armorItem();
    gear.head = null;
    const ctx = buildEngineContext(stateWith({ gear }));
    expect(ctx.gearEquipment.chest).toBeDefined();
    expect(ctx.gearEquipment.head).toBeUndefined();
  });
});

describe('buildEngineContext — activeAbilityIds union', () => {
  it('unions perks, buffs, form, summons, after-effects, wild skill, merged spells', () => {
    const ctx = buildEngineContext(stateWith({
      selectedPerks: ["robust"],
      activeBuffs: { eldritch_shield: true, phantomize: false },
      activeSummons: { hydra: true },
      activeAfterEffects: { adrenaline_penalty: true },
      activeForm: "bear",
      activeWildSkill: "bear_roar",
      activeMergedSpells: ["steam_bolt"],
    }));
    expect(ctx.activeAbilityIds).toEqual(new Set([
      "robust", "eldritch_shield", "hydra",
      "adrenaline_penalty", "bear", "bear_roar", "steam_bolt",
    ]));
    expect(ctx.activeAbilityIds.has("phantomize")).toBe(false);
  });

  it('empty state yields an empty set', () => {
    const ctx = buildEngineContext(stateWith());
    expect(ctx.activeAbilityIds.size).toBe(0);
  });
});

describe('buildEngineContext — pass-through fields', () => {
  it('forwards live state fields verbatim', () => {
    const state = stateWith({
      hpPercent: 45,
      playerStates: { defensive_stance: true },
      selectedStacks: { dark_offering: 3 },
      environment: "water",
      frenzyActive: true,
      target: { pdr: 0, mdr: 0, headshotDR: 0 },
    });
    const ctx = buildEngineContext(state);
    expect(ctx.hpPercent).toBe(45);
    expect(ctx.playerStates.defensive_stance).toBe(true);
    expect(ctx.selectedStacks.dark_offering).toBe(3);
    expect(ctx.environment).toBe("water");
    expect(ctx.frenzyActive).toBe(true);
    expect(ctx.target).toEqual({ pdr: 0, mdr: 0, headshotDR: 0 });
  });

  it('applies sane defaults when fields are omitted', () => {
    const ctx = buildEngineContext(stateWith());
    expect(ctx.hpPercent).toBe(100);
    expect(ctx.playerStates).toEqual({});
    expect(ctx.environment).toBeNull();
    expect(ctx.activeForm).toBeNull();
    expect(ctx.religion).toBeNull();
  });
});
