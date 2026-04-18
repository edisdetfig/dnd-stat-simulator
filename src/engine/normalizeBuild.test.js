// normalizeBuild.test.js — unit tests for the CharacterBuild → Build
// flattener. Golden-diff test vs `max-loadout.fixture.js` lives separately
// (it exercises a bigger surface).

import { describe, it, expect } from "vitest";
import { normalizeBuild } from "./normalizeBuild.js";
import { ITEM_DEFINITIONS } from "../data/gear/gear-shape-examples.js";
import {
  warlockCharacter,
  idleSession,
  demonArmorActiveSession,
  warlockLoadout,
} from "../data/character/character-shape-examples.js";

// Minimal Warlock classData stub (normalizer does not introspect beyond
// passthrough as `build.klass`). Uses the real class-shape container
// layout (perks/skills/spells) — a flat `abilities` field is fictional
// per `src/data/classes/ability-helpers.js` and no lookup ever resolves
// through it.
const warlockClassStub = {
  id: "warlock",
  armorProficiency: ["cloth", "leather"],
  perks: [],
  skills: [],
  spells: [],
};

function baseInput(overrides = {}) {
  return {
    character: warlockCharacter,
    session:   idleSession,
    loadout:   warlockLoadout,
    itemInstances: {},
    itemDefinitions: ITEM_DEFINITIONS,
    classData: warlockClassStub,
    ...overrides,
  };
}

// ── klass passthrough + structural output ─────────────────────────

describe("normalizeBuild — output structure", () => {
  it("requires classData", () => {
    expect(() => normalizeBuild({ ...baseInput(), classData: undefined })).toThrow(/classData/);
  });
  it("returns a Build with klass + gear + attributes + selections", () => {
    const b = normalizeBuild(baseInput());
    expect(b.klass).toBe(warlockClassStub);
    expect(b.gear).toBeDefined();
    expect(b.gear.bonuses).toBeDefined();
    expect(b.gear.onHitEffects).toBeInstanceOf(Array);
    // Attributes include gear pre-sum; verify presence + non-base values.
    expect(b.attributes.str).toBeGreaterThanOrEqual(warlockCharacter.attributes.str);
    expect(b.attributes.wil).toBe(warlockCharacter.attributes.wil);  // no gear contribution
    expect(b.selectedPerks).toEqual(["demon_armor", "torture_mastery"]);
  });
});

// ── weaponHeldState — held loadout selection (OQ-D7) ─────────────

describe("normalizeBuild — held loadout (OQ-D7 path a)", () => {
  it("picks slot1 weapon when weaponHeldState=slot1", () => {
    // Warlock loadout: slot1.primary = Frostlight Crystal Sword
    const b = normalizeBuild(baseInput());  // idleSession is slot1
    expect(b.gear.weapon).not.toBeNull();
    expect(b.gear.weapon.weaponType).toEqual(["sword", "magicStuff"]);
    expect(b.gear.weapon.handType).toBe("twoHanded");
    expect(b.gear.weapon.baseWeaponDmg).toBe(13);          // Frostlight weaponDamage
    expect(b.gear.weapon.magicalDamage).toBe(18);          // Frostlight magicWeaponDamage
    expect(b.isUnarmed).toBe(false);
  });
  it("picks slot2 weapon when weaponHeldState=slot2", () => {
    const session = { ...idleSession, weaponHeldState: "slot2" };
    const b = normalizeBuild(baseInput({ session }));
    // slot2.primary = Spectral Blade
    expect(b.gear.weapon.weaponType).toBe("sword");
    expect(b.gear.weapon.handType).toBe("twoHanded");
    expect(b.gear.weapon.baseWeaponDmg).toBe(40);          // Spectral Blade weaponDamage
  });
  it("drops both loadouts when weaponHeldState=unarmed", () => {
    const session = { ...idleSession, weaponHeldState: "unarmed" };
    const b = normalizeBuild(baseInput({ session }));
    expect(b.gear.weapon).toBeNull();
    expect(b.isUnarmed).toBe(true);
  });
});

// ── bonuses — flattening + percent→decimal + alias resolution ────

describe("normalizeBuild — gear.bonuses flattening", () => {
  it("sums inherents + modifiers, converts percent → decimal", () => {
    const b = normalizeBuild(baseInput());
    // Frostlight inherents: weaponDamage=13 (weapon-field, not bonuses),
    //   magicWeaponDamage=18 (magicalDamage field, not bonuses),
    //   moveSpeed=-25 (flat), actionSpeed=2% (→ 0.02 decimal).
    // Frostlight modifiers: magicalDamageBonus=4% → 0.04, spellCastingSpeed=6% → 0.06,
    //   memoryCapacityBonus=7% → 0.07.
    // Foul Boots inherents: armorRating=18, moveSpeed=6, agi=3 (→ attr contrib), physicalPower=2.
    // Foul Boots modifiers: str=2 (→ attr), dex=2 (→ attr), additionalArmorRating=12.
    // Spiked Gauntlet inherents: armorRating=43, projectileDamageReduction=2.5% → 0.025,
    //   magicResistance=-5, moveSpeed=-1, dex=2 (→ attr), vig=2 (→ attr).
    // Spiked Gauntlet modifiers: str=3 (→ attr), physicalPower=1, armorPenetration=3% → 0.03,
    //   additionalArmorRating=12.
    // moveSpeed = -25 + 6 - 1 = -20 (flat, sums)
    expect(b.gear.bonuses.moveSpeed).toBe(-20);
    // armorRating = 18 + 43 = 61
    expect(b.gear.bonuses.armorRating).toBe(61);
    // additionalArmorRating = 12 + 12 = 24
    expect(b.gear.bonuses.additionalArmorRating).toBe(24);
    // actionSpeed = 2% = 0.02
    expect(b.gear.bonuses.actionSpeed).toBeCloseTo(0.02, 10);
    // magicalDamageBonus = 4% = 0.04
    expect(b.gear.bonuses.magicalDamageBonus).toBeCloseTo(0.04, 10);
    // armorPenetration = 3% = 0.03
    expect(b.gear.bonuses.armorPenetration).toBeCloseTo(0.03, 10);
    // magicResistance = -5
    expect(b.gear.bonuses.magicResistance).toBe(-5);
    // physicalPower = 2 (inherent) + 1 (modifier) = 3
    expect(b.gear.bonuses.physicalPower).toBe(3);
  });

  it("routes core-attr contributions to attributes, not bonuses", () => {
    const b = normalizeBuild(baseInput());
    // Foul Boots: agi=3 inherent, str=2 + dex=2 modifiers
    // Spiked Gauntlet: dex=2 + vig=2 inherent, str=3 modifier
    expect(b.gear.bonuses.str).toBeUndefined();
    expect(b.gear.bonuses.agi).toBeUndefined();
    // base warlock str=15 + gear str contributions (2 + 3 = 5) = 20
    expect(b.attributes.str).toBe(15 + 5);
    // base vig 15 + gear 2 = 17
    expect(b.attributes.vig).toBe(15 + 2);
    // base agi 15 + gear 3 = 18
    expect(b.attributes.agi).toBe(15 + 3);
    // base dex 15 + gear (2 + 2) = 19
    expect(b.attributes.dex).toBe(15 + 4);
  });

  it("resolves §4.3 bare-name aliases (physicalDamageReduction → ...Bonus)", () => {
    // Author a custom instance via override (use Foul Boots with a PDR modifier
    // that's normally natural 0.7-1.5 in feet pool; sockets to canonical form).
    const customInstance = {
      definitionId: "foul_boots",
      rarity: "rare",
      modifiers: [
        { stat: "physicalDamageReduction", value: 1.2, unit: "percent", source: "socketed" }, // bare name
        { stat: "str", value: 1, unit: "flat", source: "natural" },
        { stat: "dex", value: 1, unit: "flat", source: "natural" },
      ],
    };
    const customLoadout = {
      id: "l_alias",
      slots: {
        weaponSlot1: { primary: null, secondary: null },
        weaponSlot2: { primary: null, secondary: null },
        head: null, chest: null, back: null, hands: null, legs: null,
        feet: customInstance,
        ring1: null, ring2: null, necklace: null,
      },
    };
    const b = normalizeBuild(baseInput({
      session: { ...idleSession, weaponHeldState: "unarmed" },
      loadout: customLoadout,
    }));
    // Bare-name alias maps to canonical STAT_META key `physicalDamageReductionBonus`.
    expect(b.gear.bonuses.physicalDamageReductionBonus).toBeCloseTo(0.012, 10);
    expect(b.gear.bonuses.physicalDamageReduction).toBeUndefined();
  });
});

// ── onHitEffects (OQ-D6) ─────────────────────────────────────────

describe("normalizeBuild — onHitEffects aggregation", () => {
  it("collects onHitEffects from all equipped items with sourceItemId", () => {
    const b = normalizeBuild(baseInput());
    expect(b.gear.onHitEffects).toHaveLength(1);
    expect(b.gear.onHitEffects[0]).toMatchObject({
      damage: 1,
      damageType: "physical",
      trueDamage: true,
      separateInstance: false,
      sourceItemId: "spiked_gauntlet",
    });
  });
});

// ── Session passthrough (OQ-D2) ──────────────────────────────────

describe("normalizeBuild — session passthrough", () => {
  it("passes active buffs + counters + target + hpFraction", () => {
    const b = normalizeBuild(baseInput({ session: demonArmorActiveSession }));
    expect(b.activeBuffs).toEqual(["demon_armor", "blood_pact"]);
    expect(b.classResourceCounters).toMatchObject({ soul_shards: 1 });
    expect(b.stackCounts).toMatchObject({ blood_pact: 1 });
    expect(b.hpFraction).toBe(0.75);
    expect(b.target.pdr).toBe(0.50);
    expect(b.target.creatureType).toBe("demon");
  });
});

// ── Dual-wielding detection ──────────────────────────────────────

describe("normalizeBuild — isDualWielding", () => {
  it("false when secondary is null", () => {
    expect(normalizeBuild(baseInput()).isDualWielding).toBe(false);
  });
  it("false when unarmed even if secondary would exist", () => {
    const session = { ...idleSession, weaponHeldState: "unarmed" };
    expect(normalizeBuild(baseInput({ session })).isDualWielding).toBe(false);
  });
});
