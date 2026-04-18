// Phase 7 golden-diff test — asserts the normalizer produces a flat
// Build with the expected shape when given the Phase 7 anchor
// CharacterBuild fixture. Scope intentionally narrow (~10 asserts);
// full-catalog coverage is Phase 11 (when the 10+ item catalog lands).
//
// Purpose: confirm the normalizer seam introduced in 6.5c.2 remains
// faithful to the flat-Build contract the engine expects. A "no
// regression through the normalizer seam" gate, per Phase 7 LOCK B.
//
// Reference values were captured once from an actual normalizeBuild()
// run against the Phase 7 fixture (see smoke test output), then
// frozen here. Any normalizer change that would alter these values
// must re-bake this reference with scrutiny.

import { describe, it, expect } from "vitest";
import { warlockBloodTitheBuild } from "../fixtures/warlock-blood-tithe.fixture.js";
import { normalizeBuild } from "./normalizeBuild.js";
import { getClass } from "../data/classes/index.js";

function normalize() {
  const classData = getClass(warlockBloodTitheBuild.character.className);
  return normalizeBuild({ ...warlockBloodTitheBuild, classData });
}

describe("Phase 7 — normalizeBuild golden diff", () => {
  it("populates klass from classData", () => {
    const flat = normalize();
    expect(flat.klass?.id).toBe("warlock");
  });

  it("pre-sums attributes from character + gear (Frostlight held, Spiked Gauntlet + Foul Boots)", () => {
    const flat = normalize();
    // Base warlock attrs: str 11 / vig 14 / agi 14 / dex 15 / wil 22 / kno 15 / res 14.
    // Gear contributions per gear-shape-examples.js modifier rolls:
    //   Spiked Gauntlet: dex+2, vig+2 (inherents); str+3 (modifier).
    //   Foul Boots:      agi+3 (inherent); str+2, dex+2 (modifiers).
    // Total: str +5, vig +2, agi +3, dex +4.
    expect(flat.attributes).toEqual({
      str: 16,   // 11 + 3 (gauntlet) + 2 (boots)
      vig: 16,   // 14 + 2 (gauntlet inherent)
      agi: 17,   // 14 + 3 (boots inherent)
      dex: 19,   // 15 + 2 (gauntlet inherent) + 2 (boots modifier)
      wil: 22,
      kno: 15,
      res: 14,
    });
  });

  it("extracts Frostlight Crystal Sword into gear.weapon with dual-type shape", () => {
    const flat = normalize();
    expect(flat.gear.weapon).toEqual({
      weaponType: ["sword", "magicStuff"],
      handType: "twoHanded",
      baseWeaponDmg: 13,       // inherent weaponDamage
      gearWeaponDmg: 0,        // no additionalWeaponDamage rolls in fixture
      magicalDamage: 18,       // inherent magicWeaponDamage
    });
  });

  it("derives isUnarmed / isDualWielding", () => {
    const flat = normalize();
    expect(flat.isUnarmed).toBe(false);
    expect(flat.isDualWielding).toBe(false);
  });

  it("forwards onHitEffects from Spiked Gauntlet (+1 true physical, annotated with sourceItemId)", () => {
    const flat = normalize();
    expect(flat.gear.onHitEffects).toEqual([
      {
        damage: 1,
        damageType: "physical",
        trueDamage: true,
        scaling: 1,
        separateInstance: false,
        notes: expect.stringContaining("post-floor true-physical"),
        sourceItemId: "spiked_gauntlet",
      },
    ]);
  });

  it("flattens non-attribute gear bonuses (percent stats display→internal)", () => {
    const flat = normalize();
    const b = flat.gear.bonuses;
    // Frostlight inherent: moveSpeed -25, actionSpeed 2%. Foul Boots: armor 18,
    // moveSpeed +6, physicalPower 2. Spiked Gauntlet: armorRating 43,
    // projectileDamageReduction 2.5%, magicResistance -5, moveSpeed -1.
    expect(b.moveSpeed).toBe(-20);                  // -25 + 6 - 1
    expect(b.armorRating).toBe(61);                 // 18 + 43
    expect(b.projectileDamageReduction).toBeCloseTo(0.025, 4); // 2.5% → 0.025
    expect(b.magicResistance).toBe(-5);             // Spiked Gauntlet
    expect(b.physicalPower).toBe(3);                // Foul Boots inherent 2 + Spiked Gauntlet modifier 1
  });

  it("does NOT include core attributes in gear.bonuses (those go to attributes)", () => {
    const flat = normalize();
    for (const attr of ["str", "vig", "agi", "dex", "wil", "kno", "res"]) {
      expect(flat.gear.bonuses[attr]).toBeUndefined();
    }
  });

  it("passes through persistent selections verbatim", () => {
    const flat = normalize();
    expect(flat.selectedPerks).toEqual(warlockBloodTitheBuild.character.persistentSelections.selectedPerks);
    expect(flat.selectedSkills).toEqual(warlockBloodTitheBuild.character.persistentSelections.selectedSkills);
    expect(flat.selectedSpells).toEqual(warlockBloodTitheBuild.character.persistentSelections.selectedSpells);
  });

  it("passes through session fields (activeBuffs, target, hpFraction)", () => {
    const flat = normalize();
    expect(flat.activeBuffs).toEqual(warlockBloodTitheBuild.session.activeBuffs);
    expect(flat.target.pdr).toBe(-0.22);
    expect(flat.target.mdr).toBe(0.06);
    expect(flat.hpFraction).toBe(1.0);
  });

  it("switches weapon payload when weaponHeldState is slot2 (Spectral Blade)", () => {
    const classData = getClass(warlockBloodTitheBuild.character.className);
    const slot2Build = {
      ...warlockBloodTitheBuild,
      session: { ...warlockBloodTitheBuild.session, weaponHeldState: "slot2" },
    };
    const flat = normalizeBuild({ ...slot2Build, classData });
    expect(flat.gear.weapon).toEqual({
      weaponType: "sword",
      handType: "twoHanded",
      baseWeaponDmg: 40,
      gearWeaponDmg: 0,
      magicalDamage: undefined,     // no magicWeaponDamage on Spectral Blade
    });
  });

  it("drops the weapon when weaponHeldState is unarmed", () => {
    const classData = getClass(warlockBloodTitheBuild.character.className);
    const unarmedBuild = {
      ...warlockBloodTitheBuild,
      session: { ...warlockBloodTitheBuild.session, weaponHeldState: "unarmed" },
    };
    const flat = normalizeBuild({ ...unarmedBuild, classData });
    expect(flat.gear.weapon).toBeNull();
    expect(flat.isUnarmed).toBe(true);
  });
});
