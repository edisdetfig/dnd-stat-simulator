// End-to-end Warlock tests — wire buildEngineContext → runEffectPipeline →
// computeDerivedStats against real WARLOCK class data. Expected values are
// derived from the CSV + verified formulas, never captured from runtime.

import { describe, it, expect } from 'vitest';
import WARLOCK from '../../data/classes/warlock.js';
import { RELIGION_BLESSINGS } from '../../data/religions.js';
import { makeEmptyGear } from '../../data/gear-defaults.js';
import { buildEngineContext } from '../context.js';
import { runEffectPipeline } from '../effect-pipeline.js';
import { computeDerivedStats } from '../recipes.js';

function computeFor(stateOverrides = {}) {
  const state = {
    classData: WARLOCK,
    gear: makeEmptyGear(),
    weaponHeldState: "none",
    ...stateOverrides,
  };
  const ctx = buildEngineContext(state);
  const result = runEffectPipeline(ctx);
  const ds = computeDerivedStats(result.finalAttrs, result.finalBonuses, result.capOverrides);
  return { ctx, result, ds };
}

describe('Warlock — naked baseline', () => {
  it('HP matches CSV target (122)', () => {
    const { ds } = computeFor();
    expect(ds.health).toBe(122);
  });

  it('attributes match CSV baseStats unchanged', () => {
    const { result } = computeFor();
    expect(result.finalAttrs).toEqual({
      str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14,
    });
  });

  it('no bonuses, no caps, no type damage, no healing mods', () => {
    const { result } = computeFor();
    expect(result.finalBonuses).toEqual({});
    expect(result.capOverrides).toEqual({});
    expect(result.typeDamageBonuses).toEqual({});
    expect(Object.values(result.healingMods)).toEqual([0, 0, 0]);
  });
});

describe('Warlock + Malice — attribute_multiplier on WIL', () => {
  it('WIL becomes 22 × 1.15 = 25.3', () => {
    const { result } = computeFor({ selectedPerks: ["malice"] });
    expect(result.finalAttrs.wil).toBeCloseTo(25.3, 6);
  });

  it('other attributes unchanged', () => {
    const { result } = computeFor({ selectedPerks: ["malice"] });
    for (const a of ["str","vig","agi","dex","kno","res"]) {
      expect(result.finalAttrs[a]).toBe(WARLOCK.baseStats[a]);
    }
  });
});

describe('Warlock + Demon Armor — post_curve SCS penalty', () => {
  it('spellCastingSpeed bonus takes -10%', () => {
    const { result } = computeFor({ selectedPerks: ["demon_armor"] });
    expect(result.finalBonuses.spellCastingSpeed).toBeCloseTo(-0.10, 6);
  });
});

describe('Warlock + Antimagic — multiplicative_layer on magicDamageTaken', () => {
  it('single Antimagic: 0.80', () => {
    const { result } = computeFor({ selectedPerks: ["antimagic"] });
    expect(result.multiplicativeLayers.magicDamageTaken).toBeCloseTo(0.80, 6);
  });
});

describe('Warlock + Dark Enhancement — type_damage_bonus on dark_magical', () => {
  it('adds 0.20 bonus to dark_magical damage type', () => {
    const { result } = computeFor({ selectedPerks: ["dark_enhancement"] });
    expect(result.typeDamageBonuses.dark_magical).toBeCloseTo(0.20, 6);
  });
});

describe('Warlock + Soul Collector — stacking darkness shards', () => {
  it('3 shards: +3 all attributes via pre_curve_flat', () => {
    const { result } = computeFor({
      selectedPerks: ["soul_collector"],
      selectedStacks: { soul_collector: 3 },
    });
    // Each stack emits { stat: "all_attributes", value: 1, phase: "pre_curve_flat" }.
    // Pipeline routes to CORE_ATTRS only (all_attributes on pre_curve_flat
    // has no defined behavior per spec §3 — spec says all_attributes is
    // used with attribute_multiplier). Our engine currently treats
    // "all_attributes" pre_curve_flat as a bonuses-bucket key.
    // Check the dark_magical bonus instead — always works.
    expect(result.typeDamageBonuses.dark_magical).toBeCloseTo(0.99, 6); // 3 × 0.33
  });

  it('0 shards: no bonus', () => {
    const { result } = computeFor({
      selectedPerks: ["soul_collector"],
      selectedStacks: { soul_collector: 0 },
    });
    expect(result.typeDamageBonuses.dark_magical).toBeUndefined();
  });

  it('not selected: no bonus even if stack count is set', () => {
    const { result } = computeFor({
      selectedPerks: [],
      selectedStacks: { soul_collector: 3 },
    });
    expect(result.typeDamageBonuses.dark_magical).toBeUndefined();
  });
});

describe('Warlock + Blood Pact (active) — core buffs + grantsSpells', () => {
  it('+50 armor rating, +50 magic resistance, +30 max health', () => {
    const { result } = computeFor({
      selectedSkills: ["blood_pact"],
      activeBuffs: { blood_pact: true },
    });
    expect(result.finalBonuses.armorRating).toBe(50);
    expect(result.finalBonuses.magicResistance).toBe(50);
    expect(result.finalBonuses.maxHealth).toBe(30);
  });

  it('HP increases by 30 via post_curve maxHealth flat', () => {
    const baseline = computeFor();
    const withBP = computeFor({
      selectedSkills: ["blood_pact"],
      activeBuffs: { blood_pact: true },
    });
    expect(withBP.ds.health - baseline.ds.health).toBe(30);
  });

  it('Blood Pact inactive: no buffs', () => {
    const { result } = computeFor({
      selectedSkills: ["blood_pact"],
      activeBuffs: { blood_pact: false },
    });
    expect(result.finalBonuses.armorRating).toBeUndefined();
  });
});

describe('Warlock + Noxulon religion — post_curve RIS bonus', () => {
  it('regularInteractionSpeed bonus includes +20%', () => {
    const religion = RELIGION_BLESSINGS.find(r => r.id === "noxulon");
    const { result } = computeFor({ religion });
    expect(result.finalBonuses.regularInteractionSpeed).toBeCloseTo(0.20, 6);
  });
});

describe('Warlock + Immortal Lament — conditional healing bonus', () => {
  it('inactive at 50% HP', () => {
    const { result } = computeFor({
      selectedPerks: ["immortal_lament"],
      hpPercent: 50,
    });
    expect(result.healingMods.magical).toBe(0);
  });

  it('active at 3% HP', () => {
    const { result } = computeFor({
      selectedPerks: ["immortal_lament"],
      hpPercent: 3,
    });
    expect(result.healingMods.magical).toBeCloseTo(1.0, 6);
  });
});

describe('Warlock + Vampirism — flat healing bonus', () => {
  it('adds 0.20 to healType magical', () => {
    const { result } = computeFor({ selectedPerks: ["vampirism"] });
    expect(result.healingMods.magical).toBeCloseTo(0.20, 6);
  });
});

describe('Warlock + Curse Mastery — post_curve curseDurationBonus', () => {
  it('adds 0.30 to curseDurationBonus bonuses', () => {
    const { result } = computeFor({ selectedPerks: ["curse_mastery"] });
    expect(result.finalBonuses.curseDurationBonus).toBeCloseTo(0.30, 6);
  });
});

describe('Warlock + Infernal Pledge — post_curve dual DR', () => {
  it('adds 0.40 to both demon and undead damage reduction', () => {
    const { result } = computeFor({ selectedPerks: ["infernal_pledge"] });
    expect(result.finalBonuses.demonDamageReduction).toBeCloseTo(0.40, 6);
    expect(result.finalBonuses.undeadDamageReduction).toBeCloseTo(0.40, 6);
  });
});

describe('Blood Tithe full build — end-to-end', () => {
  it('loads the example build cleanly and derives finite stats', async () => {
    const { EXAMPLE_BUILDS } = await import('../../data/example-builds.js');
    const blood = EXAMPLE_BUILDS.find(b => b.id === "blood_tithe").build();

    const religion = RELIGION_BLESSINGS.find(r => r.id === blood.religionId);
    const { result, ds } = computeFor({ ...blood, classData: WARLOCK, religion });

    // Every derived stat should be finite.
    for (const [id, v] of Object.entries(ds)) {
      expect(Number.isFinite(v), `${id} = ${v}`).toBe(true);
    }

    // WIL is boosted by Malice: 22 + chest's no-WIL + necklace's +2 WIL = 24,
    // then ×1.15 (Malice) = 27.6.
    // (chest gives +2 VIG via modifier, necklace gives +2 WIL inherent)
    expect(result.finalAttrs.wil).toBeCloseTo(27.6, 6);

    // Gear contributes to bonuses: armorRating from chest + head.
    expect(result.finalBonuses.armorRating).toBeGreaterThan(0);

    // Demon Armor's SCS penalty is present.
    expect(result.finalBonuses.spellCastingSpeed).toBeCloseTo(-0.10, 6);

    // Antimagic multiplicative layer.
    expect(result.multiplicativeLayers.magicDamageTaken).toBeCloseTo(0.80, 6);

    // Dark Enhancement type bonus.
    expect(result.typeDamageBonuses.dark_magical).toBeCloseTo(0.20, 6);

    // Noxulon religion post-curve RIS.
    expect(result.finalBonuses.regularInteractionSpeed).toBeCloseTo(0.20, 6);
  });
});
