// character-gear-validator.test.js — happy + per-rule negative fixtures.

import { describe, it, expect } from "vitest";
import { validateCharacterGear, computeEffectiveArmorProficiency } from "./character-gear-validator.js";
import { warlockCharacter, warlockLoadout, idleSession } from "./character-shape-examples.js";
import { ITEM_DEFINITIONS } from "../gear/gear-shape-examples.js";

function rulesOf(errs) { return errs.map(e => e.rule); }

// Minimal Warlock classData stub — uses real class-shape containers
// (perks / skills / spells) so the validator's lookups land. A prior
// revision of this file used a fictional `abilities: [...]` flat field
// which the validator silently ignored against real data. The helper
// at `src/data/classes/ability-helpers.js` is now the single source of
// truth for ability lookup — any synthetic fixture must conform to
// that contract.
const warlockClassStub = {
  id: "warlock",
  armorProficiency: ["cloth", "leather"],
  perks: [
    {
      id: "demon_armor",
      type: "perk",
      activation: "passive",
      grants: [{ type: "armor", armorType: "plate" }],
    },
    {
      id: "torture_mastery",
      type: "perk",
      activation: "passive",
      grants: [],
    },
  ],
  skills: [
    {
      id: "phantomize",
      type: "skill",
      activation: "cast_buff",
    },
  ],
  spells: [],
};

// Context for happy-path — Warlock with Demon Armor perk selected, Spiked
// Gauntlet equipped (plate). Demon Armor's grant bridges plate into
// effective proficiency → no CG.armorProficiency error.
function happyCtx(overrides = {}) {
  return {
    character:       warlockCharacter,
    session:         idleSession,
    loadout:         warlockLoadout,
    itemInstances:   {},                 // unused by validator (reads definitions)
    itemDefinitions: ITEM_DEFINITIONS,
    classData:       warlockClassStub,
    ...overrides,
  };
}

describe("character-gear-validator — happy path", () => {
  it("validates the Warlock + Spiked Gauntlet loadout clean (Demon Armor grants plate)", () => {
    expect(validateCharacterGear(happyCtx())).toEqual([]);
  });
});

describe("computeEffectiveArmorProficiency", () => {
  it("adds granted armor types from selected perks", () => {
    const eff = computeEffectiveArmorProficiency(warlockCharacter, warlockClassStub);
    expect(eff).toBeInstanceOf(Set);
    expect(eff.has("cloth")).toBe(true);
    expect(eff.has("leather")).toBe(true);
    expect(eff.has("plate")).toBe(true);   // via Demon Armor grant
  });
  it("does not add grants from unselected perks", () => {
    const charWithoutDemonArmor = {
      ...warlockCharacter,
      persistentSelections: { ...warlockCharacter.persistentSelections, selectedPerks: ["torture_mastery"] },
    };
    const eff = computeEffectiveArmorProficiency(charWithoutDemonArmor, warlockClassStub);
    expect(eff.has("plate")).toBe(false);
  });
});

describe("character-gear-validator — CG.armorProficiency", () => {
  it("flags plate gauntlet when Demon Armor is not selected", () => {
    const charWithoutDemonArmor = {
      ...warlockCharacter,
      persistentSelections: { ...warlockCharacter.persistentSelections, selectedPerks: ["torture_mastery"] },
    };
    const errs = validateCharacterGear(happyCtx({ character: charWithoutDemonArmor }));
    expect(rulesOf(errs)).toContain("CG.armorProficiency");
  });
});

describe("character-gear-validator — CG.requiredClasses", () => {
  it("flags a weapon requiredClasses that does not include character class", () => {
    // Spectral Blade requires fighter/warlock/sorcerer. Change character to
    // 'rogue' → should fail.
    const rogueChar = { ...warlockCharacter, className: "rogue" };
    // Simpler: place Spectral Blade in slot1; Warlock is allowed (requiredClasses
    // includes warlock), so pivot: class = ranger (not in list).
    const ctx = happyCtx({
      character: { ...rogueChar, className: "ranger" },
      classData: { ...warlockClassStub, id: "ranger", armorProficiency: ["cloth", "leather", "plate"] },
      loadout: {
        ...warlockLoadout,
        slots: {
          ...warlockLoadout.slots,
          weaponSlot1: {
            primary:   { definitionId: "spectral_blade", rarity: "epic", modifiers: [] },
            secondary: null,
          },
          weaponSlot2: { primary: null, secondary: null },
          hands: null,       // remove Spiked Gauntlet (removes plate gate concerns)
        },
      },
    });
    const errs = validateCharacterGear(ctx);
    expect(rulesOf(errs)).toContain("CG.requiredClasses");
  });
});

describe("character-gear-validator — CG.slotCompatibility", () => {
  it("flags item.slotType mismatch with slot key", () => {
    const ctx = happyCtx({
      loadout: {
        ...warlockLoadout,
        slots: {
          ...warlockLoadout.slots,
          hands: { definitionId: "spectral_blade", rarity: "epic", modifiers: [] },  // weapon in hands slot
        },
      },
    });
    const errs = validateCharacterGear(ctx);
    expect(rulesOf(errs)).toContain("CG.slotCompatibility");
  });
});

describe("character-gear-validator — CG.twoHandedExclusiveSecondary", () => {
  it("flags a secondary item with a twoHanded primary", () => {
    const ctx = happyCtx({
      loadout: {
        ...warlockLoadout,
        slots: {
          ...warlockLoadout.slots,
          weaponSlot1: {
            primary:   { definitionId: "spectral_blade", rarity: "epic", modifiers: [] },  // twoHanded
            secondary: { definitionId: "foul_boots",     rarity: "rare", modifiers: [] },  // anything non-null
          },
        },
      },
    });
    const errs = validateCharacterGear(ctx);
    expect(rulesOf(errs)).toContain("CG.twoHandedExclusiveSecondary");
  });
});

describe("character-gear-validator — CG.weaponHeldStateValid", () => {
  it("flags invalid weaponHeldState", () => {
    const errs = validateCharacterGear(happyCtx({ session: { ...idleSession, weaponHeldState: "both" } }));
    expect(rulesOf(errs)).toContain("CG.weaponHeldStateValid");
  });
});

describe("character-gear-validator — CG.loadoutRef", () => {
  it("flags equippedLoadoutId mismatch", () => {
    const ctx = happyCtx({
      character: { ...warlockCharacter, persistentSelections: { ...warlockCharacter.persistentSelections, equippedLoadoutId: "different_id" } },
    });
    const errs = validateCharacterGear(ctx);
    expect(rulesOf(errs)).toContain("CG.loadoutRef");
  });
});

// ── Phase 7 anchor-fixture integration gate ──────────────────────
// Guards the bug class "validator silently accepts / rejects a valid
// fixture under real class data". A test failure here on future edits
// means either the fixture went bad or the validator drifted.
describe("character-gear-validator — Phase 7 anchor fixture integration", () => {
  it("validates the Phase 7 Warlock anchor fixture with zero errors", async () => {
    const { warlockBloodTitheBuild } = await import("../../fixtures/warlock-blood-tithe.fixture.js");
    const { getClass } = await import("../classes/index.js");
    const classData = getClass(warlockBloodTitheBuild.character.className);

    const errors = validateCharacterGear({
      character:       warlockBloodTitheBuild.character,
      session:         warlockBloodTitheBuild.session,
      loadout:         warlockBloodTitheBuild.loadout,
      itemInstances:   warlockBloodTitheBuild.itemInstances,
      itemDefinitions: warlockBloodTitheBuild.itemDefinitions,
      classData,
    });
    expect(errors).toEqual([]);
  });
});

describe("character-gear-validator — CG.definitionMissing", () => {
  it("flags an equipped item whose definitionId is not in itemDefinitions", () => {
    const ctx = happyCtx({
      loadout: {
        ...warlockLoadout,
        slots: {
          ...warlockLoadout.slots,
          hands: { definitionId: "mystery_gauntlet", rarity: "epic", modifiers: [] },
        },
      },
    });
    const errs = validateCharacterGear(ctx);
    expect(rulesOf(errs)).toContain("CG.definitionMissing");
  });
});
