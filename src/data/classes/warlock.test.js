import { describe, it, expect } from 'vitest';
import WARLOCK from './warlock.js';

describe('Warlock class — import-time validation', () => {
  it('loads without defineClass throwing (shape is v3-valid)', () => {
    // If defineClass finds any issue at class load, the import itself
    // throws in test mode. Reaching this line means validation passed.
    expect(WARLOCK).toBeDefined();
    expect(WARLOCK.id).toBe("warlock");
    expect(WARLOCK.name).toBe("Warlock");
  });

  it('has the CSV-declared base stats', () => {
    expect(WARLOCK.baseStats).toEqual({
      str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14,
    });
  });

  it('declares configuration (perks/skills caps, spell cost, equippable armor)', () => {
    expect(WARLOCK.maxPerks).toBe(4);
    expect(WARLOCK.maxSkills).toBe(2);
    expect(WARLOCK.spellCostType).toBe("health");
    expect(WARLOCK.equippableArmor).toEqual(["cloth", "leather"]);
  });

  it('has every perk, skill, and spell listed in the CSV', () => {
    const perkIds = WARLOCK.perks.map(p => p.id);
    expect(perkIds).toEqual([
      "demon_armor", "malice", "shadow_touch", "dark_reflection",
      "antimagic", "dark_enhancement", "torture_mastery", "curse_mastery",
      "immortal_lament", "infernal_pledge", "vampirism", "soul_collector",
    ]);

    const skillIds = WARLOCK.skills.map(s => s.id);
    expect(skillIds).toEqual([
      "spell_memory_i", "spell_memory_ii",
      "blow_of_corruption", "blood_pact", "phantomize", "dark_offering",
    ]);

    const spellIds = WARLOCK.spells.map(s => s.id);
    expect(spellIds).toEqual([
      "power_of_sacrifice", "curse_of_weakness", "bolt_of_darkness",
      "bloodstained_blade", "curse_of_pain", "spell_predation",
      "evil_eye", "ray_of_darkness", "life_drain", "hellfire",
      "eldritch_shield", "flame_walker", "summon_hydra",
    ]);
  });

  it('Blood Pact grants Bolt of Darkness bare-handed', () => {
    const bp = WARLOCK.skills.find(s => s.id === "blood_pact");
    expect(bp.grantsSpells).toEqual(["bolt_of_darkness"]);
    expect(bp.activation).toBe("toggle");
    // Shard lock-in via stacking
    expect(bp.stacking.maxStacks).toBe(3);
  });

  it('Torture Mastery sets spellCostMultiplier 2.0', () => {
    const tm = WARLOCK.perks.find(p => p.id === "torture_mastery");
    expect(tm.spellCostMultiplier).toBe(2.0);
  });

  it('Soul Collector has 3-stack darkness-shard system', () => {
    const sc = WARLOCK.perks.find(p => p.id === "soul_collector");
    expect(sc.stacking.maxStacks).toBe(3);
    expect(sc.stacking.perStack).toHaveLength(2);
    expect(sc.stacking.perStack[0]).toMatchObject({ stat: "all_attributes", value: 1 });
    expect(sc.stacking.perStack[1]).toMatchObject({ stat: "typeDamageBonus", damageType: "dark_magical" });
  });
});
