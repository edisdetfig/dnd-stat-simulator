// End-to-end Warlock tests — wire buildEngineContext → runEffectPipeline →
// computeDerivedStats against real WARLOCK class data. Expected values are
// derived from the CSV + verified formulas, never captured from runtime.

import { describe, it, expect } from 'vitest';
import WARLOCK from '../../data/classes/warlock.js';
import { RELIGION_BLESSINGS } from '../../data/religions.js';
import { makeEmptyGear } from '../../data/gear-defaults.js';
import { buildEngineContext } from '../context.js';
import { runEffectPipeline, runTargetPipeline } from '../effect-pipeline.js';
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

function selfAndTarget(stateOverrides = {}) {
  const state = {
    classData: WARLOCK,
    gear: makeEmptyGear(),
    weaponHeldState: "none",
    ...stateOverrides,
  };
  const ctx = buildEngineContext(state);
  return { self: runEffectPipeline(ctx), enemy: runTargetPipeline(ctx) };
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
  it('3 shards: +3 fans out to every CORE_ATTR (pre_curve_flat all_attributes)', () => {
    const { result } = computeFor({
      selectedPerks: ["soul_collector"],
      selectedStacks: { soul_collector: 3 },
    });
    // Each stack emits { stat: "all_attributes", value: 1, phase: "pre_curve_flat" }.
    // With fan-out, every core attribute gains +3 over its baseline.
    const base = { str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 };
    for (const [a, v] of Object.entries(base)) {
      expect(result.finalAttrs[a], `${a} should be base + 3`).toBe(v + 3);
    }
    // Dark magical typeDamageBonus accumulates 3 × 0.33 = 0.99.
    expect(result.typeDamageBonuses.dark_magical).toBeCloseTo(0.99, 6);
  });

  it('0 shards: no bonus anywhere', () => {
    const { result } = computeFor({
      selectedPerks: ["soul_collector"],
      selectedStacks: { soul_collector: 0 },
    });
    expect(result.typeDamageBonuses.dark_magical).toBeUndefined();
    expect(result.finalAttrs.str).toBe(11);
  });

  it('not selected: no bonus even if stack count is set', () => {
    const { result } = computeFor({
      selectedPerks: [],
      selectedStacks: { soul_collector: 3 },
    });
    expect(result.typeDamageBonuses.dark_magical).toBeUndefined();
    expect(result.finalAttrs.str).toBe(11);
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

// ── Blood Tithe — canonical example build (precision pinned) ──
//
// Every derived value below is pinned to an exact integer / fraction.
// If any of these drift, the simulator has regressed. Expected values
// computed from CSV + gear inherent/modifier stats + verified formulas,
// never captured from runtime output (though cross-checked with a
// scratch run before pinning).
//
// Default perks (demon_armor, shadow_touch, dark_reflection) include
// NO attribute_multiplier effect — Malice is not selected. So WIL
// stays at its gear-aggregated value of 38, no multiplier applied.
//
// Gear STR contributions (sum): head +3 mod, back +2, hands +2 mod,
// legs +3 mod, feet +4 inherent, ring1 +3, ring2 +3 = 20 over base 11 = 31.
// Gear VIG contributions: chest +2 inherent, hands +2 inherent, legs +2
// inherent = 6 over base 14 = 20.
// Gear WIL contributions: head +2, chest +3, back +2, hands +3, legs +3,
// feet +3 = 16 over base 22 = 38.
describe('Blood Tithe full build — end-to-end', () => {
  async function loadBloodTithe(stateOverrides = {}) {
    const { EXAMPLE_BUILDS } = await import('../../data/example-builds.js');
    const blood = EXAMPLE_BUILDS.find(b => b.id === "blood_tithe").build();
    const religion = blood.religionId
      ? RELIGION_BLESSINGS.find(r => r.id === blood.religionId)
      : null;
    return computeFor({ ...blood, ...stateOverrides, classData: WARLOCK, religion });
  }

  it('every derived stat is finite', async () => {
    const { ds } = await loadBloodTithe();
    for (const [id, v] of Object.entries(ds)) {
      expect(Number.isFinite(v), `${id} = ${v}`).toBe(true);
    }
  });

  it('attributes with all buffs off: STR 31, VIG 20, WIL 38 (no Malice)', async () => {
    const { result } = await loadBloodTithe({ activeBuffs: {} });
    expect(result.finalAttrs.str).toBe(31);
    expect(result.finalAttrs.vig).toBe(20);
    expect(result.finalAttrs.wil).toBe(38);
    expect(result.finalAttrs.dex).toBe(27);
  });

  it('HP with all buffs off = 145', async () => {
    // hr = 31 × 0.25 + 20 × 0.75 = 22.75
    // curve [21, 44) = 125.5 + (22.75 − 21) × 1.5 = 128.125
    // mhb = 0 (no MHB gear in build) → ceil(128.125) = 129
    // mha = 6 (Necklace of Peace) → 129 + 10 + 6 = 145
    const { ds } = await loadBloodTithe({ activeBuffs: {} });
    expect(ds.health).toBe(145);
  });

  it('HP as-loaded (PoS + Bloodstained Blade active) = 167', async () => {
    // PoS pre_curve_flat adds +15 STR and +15 VIG to caster:
    //   STR 31 + 15 = 46, VIG 20 + 15 = 35
    //   hr = 46 × 0.25 + 35 × 0.75 = 11.5 + 26.25 = 37.75
    //   curve [21, 44) = 125.5 + 16.75 × 1.5 = 150.625
    //   ceil(150.625) = 151 → 151 + 10 + 6 = 167
    // Bloodstained Blade contributes buffWeaponDamage (not to HP).
    const { ds } = await loadBloodTithe();
    expect(ds.health).toBe(167);
  });

  it('HP with Blood Pact additionally toggled on = 197', async () => {
    // Replace Blow of Corruption with Blood Pact (maxSkills = 2).
    // Blood Pact adds +30 maxHealth (post_curve) → mha = 6 + 30 = 36.
    // With PoS+BSB still on: STR 46, VIG 35 → curve 150.625 → ceil 151
    //   151 + 10 + 36 = 197.
    const { ds } = await loadBloodTithe({
      selectedSkills: ["spell_memory_i", "blood_pact"],
      activeBuffs: { power_of_sacrifice: true, bloodstained_blade: true, blood_pact: true },
    });
    expect(ds.health).toBe(197);
  });

  it('armor rating sums all armor pieces = 297', async () => {
    // head 32 + chest 121 + back 19 + hands 43 + legs 44 + feet 38 = 297.
    // Rings and necklace contribute no AR.
    const { result } = await loadBloodTithe();
    expect(result.finalBonuses.armorRating).toBe(297);
  });

  it('Demon Armor post_curve SCS penalty = -10%', async () => {
    const { result } = await loadBloodTithe();
    expect(result.finalBonuses.spellCastingSpeed).toBeCloseTo(-0.10, 6);
  });

  it('Noxulon religion contributes +20% RIS', async () => {
    const { result } = await loadBloodTithe();
    expect(result.finalBonuses.regularInteractionSpeed).toBeCloseTo(0.20, 6);
  });
});

// ── Target routing regressions ──
//
// Pre-fix, every active ability dumped its effects into the self
// pipeline regardless of target. Curse of Weakness active meant the
// CASTER took the -25% all_attributes / -15% DR debuffs. These tests
// pin correct self/enemy split.

describe('Curse of Weakness — enemy-target routing', () => {
  it('toggled active: caster finalAttrs unchanged from baseline', () => {
    const { self } = selfAndTarget({
      selectedSpells: ["curse_of_weakness"],
      activeBuffs: { curse_of_weakness: true },
    });
    expect(self.finalAttrs).toEqual({
      str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14,
    });
    // Self PDR/MDR untouched by the debuffs.
    expect(self.finalBonuses.physicalDamageReduction ?? 0).toBe(0);
    expect(self.finalBonuses.magicalDamageReduction ?? 0).toBe(0);
  });

  it('toggled active: enemy pipeline receives the debuffs', () => {
    const { enemy } = selfAndTarget({
      selectedSpells: ["curse_of_weakness"],
      activeBuffs: { curse_of_weakness: true },
    });
    // Enemy attrs × 0.75 (all_attributes -0.25 attribute_multiplier).
    // Enemy starts with finalAttrs = {} (Phase 1 no enemy baseline),
    // so multiplying by 0.75 stays 0 — we verify the trace rather than
    // the unattached attr values.
    expect(enemy.trace.some(t => t.stat === "all_attributes" && t.phase === "attribute_multiplier")).toBe(true);
    // PDR / MDR debuffs land in enemy bonuses.
    expect(enemy.finalBonuses.physicalDamageReduction).toBeCloseTo(-0.15, 6);
    expect(enemy.finalBonuses.magicalDamageReduction).toBeCloseTo(-0.15, 6);
  });

  it('toggled off: neither pipeline is affected', () => {
    const { self, enemy } = selfAndTarget({
      selectedSpells: ["curse_of_weakness"],
      activeBuffs: { curse_of_weakness: false },
    });
    expect(self.finalAttrs.str).toBe(11);
    expect(enemy.trace).toEqual([]);
  });
});

describe('Power of Sacrifice — "either" with per-ability toggles', () => {
  const state = (applyToSelf, applyToEnemy) => ({
    selectedSpells: ["power_of_sacrifice"],
    activeBuffs: { power_of_sacrifice: true },
    abilityTargetMode: { power_of_sacrifice: { applyToSelf, applyToEnemy } },
  });

  it('applyToSelf=true, applyToEnemy=false: caster +15 STR/VIG, enemy untouched', () => {
    const { self, enemy } = selfAndTarget(state(true, false));
    expect(self.finalAttrs.str).toBe(11 + 15);
    expect(self.finalAttrs.vig).toBe(14 + 15);
    expect(enemy.trace.filter(t => t.ability === "power_of_sacrifice")).toEqual([]);
  });

  it('applyToSelf=false, applyToEnemy=true: caster untouched, enemy gets +15 STR/VIG', () => {
    const { self, enemy } = selfAndTarget(state(false, true));
    expect(self.finalAttrs.str).toBe(11);
    expect(self.finalAttrs.vig).toBe(14);
    // Enemy baseline attrs are {}, so STR ends at 0 + 15 = 15.
    expect(enemy.finalAttrs.str).toBe(15);
    expect(enemy.finalAttrs.vig).toBe(15);
  });

  it('both true: entries route to BOTH pipelines simultaneously', () => {
    const { self, enemy } = selfAndTarget(state(true, true));
    expect(self.finalAttrs.str).toBe(11 + 15);
    expect(enemy.finalAttrs.str).toBe(15);
  });

  it('both false: nothing applies anywhere', () => {
    const { self, enemy } = selfAndTarget(state(false, false));
    expect(self.finalAttrs.str).toBe(11);
    expect(enemy.trace.filter(t => t.ability === "power_of_sacrifice")).toEqual([]);
  });

  it('no abilityTargetMode override: ability defaults apply (self-only)', () => {
    const { self, enemy } = selfAndTarget({
      selectedSpells: ["power_of_sacrifice"],
      activeBuffs: { power_of_sacrifice: true },
      // abilityTargetMode omitted — PoS defaults to applyToSelf: true.
    });
    expect(self.finalAttrs.str).toBe(11 + 15);
    expect(enemy.finalAttrs.str ?? 0).toBe(0);
  });
});

describe('runTargetPipeline — seeds from ctx.target', () => {
  it('enemy finalBonuses start with PDR/MDR/HSDR from target editor values', () => {
    const { enemy } = selfAndTarget({
      target: { pdr: 0.30, mdr: 0.20, headshotDR: 0.10 },
    });
    expect(enemy.finalBonuses.physicalDamageReduction).toBeCloseTo(0.30, 6);
    expect(enemy.finalBonuses.magicalDamageReduction).toBeCloseTo(0.20, 6);
    expect(enemy.finalBonuses.headshotDamageReduction).toBeCloseTo(0.10, 6);
  });
});
