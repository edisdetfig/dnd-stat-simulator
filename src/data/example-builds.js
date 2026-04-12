// Example builds — preconfigured loadouts for the ExampleBuildPicker.
// Each exports a `build()` factory returning the full v3 state shape the
// simulator expects.

import { makeEmptyGear } from './gear-defaults.js';

// ── Shared defaults: v3 state every build starts from ──
//
// Any build() factory spreads these over its specifics so new state fields
// added in later phases don't silently disappear from older builds.
const V3_DEFAULTS = Object.freeze({
  weaponHeldState:      "none",
  selectedPerks:        [],
  selectedSkills:       [],
  selectedSpells:       [],
  activeBuffs:          {},
  activeForm:           null,
  activeSummons:        {},
  activeAfterEffects:   {},
  activeWildSkill:      null,
  activeMergedSpells:   [],
  selectedStacks:       {},
  selectedTiers:        {},
  hpPercent:            100,
  playerStates:         {},
  frenzyActive:         false,
  environment:          null,
  targetStatuses:       {},
  targetStatusSource:   {},
  target:               { pdr: 0, mdr: 0, headshotDR: 0 },
  religionId:           null,
  theme:                "default",
});

// ── Blood Tithe — flagship Warlock build ──
//
// Demon-flavor: Demon Armor (unlocks plate), Malice (+15% WIL),
// Antimagic (-20% magic damage taken), Dark Enhancement (+20% dark).
// Blood Pact skill for demon form. Spectral Blade + Dark Plate Armor.
function bloodTitheBuild() {
  const gear = makeEmptyGear();

  gear.weaponSlot1.primary = {
    id: "spectral_blade",
    name: "Spectral Blade",
    weaponType: "sword",
    handType: "twoHanded",
    inherentStats: [
      { stat: "weaponDamage",      value: 40 },
      { stat: "magicWeaponDamage", value: 10 },
    ],
    modifiers: [
      { stat: "magicalPower",      value: 3 },
      { stat: "physicalPower",     value: 2 },
    ],
  };

  gear.chest = {
    id: "dark_plate",
    name: "Dark Plate Armor",
    armorType: "plate",
    inherentStats: [
      { stat: "armorRating",       value: 80 },
      { stat: "magicResistance",   value: 12 },
      { stat: "maxHealthBonus",    value: 0.05 },
    ],
    modifiers: [
      { stat: "vig",               value: 2 },
    ],
  };

  gear.head = {
    id: "shrouded_hood",
    name: "Shrouded Hood",
    armorType: "cloth",
    inherentStats: [
      { stat: "armorRating",       value: 15 },
      { stat: "magicalPower",      value: 2 },
    ],
    modifiers: [],
  };

  gear.necklace = {
    id: "obsidian_pendant",
    name: "Obsidian Pendant",
    inherentStats: [
      { stat: "wil",               value: 2 },
    ],
    modifiers: [
      { stat: "cooldownReductionBonus", value: 0.05 },
    ],
  };

  return {
    ...V3_DEFAULTS,
    id:              "blood_tithe",
    name:            "Blood Tithe",
    classId:         "warlock",
    theme:           "blood-tithe",
    religionId:      "noxulon",
    gear,
    weaponHeldState: "weaponSlot1",
    selectedPerks:   ["demon_armor", "malice", "antimagic", "dark_enhancement"],
    selectedSkills:  ["spell_memory_i", "blood_pact"],
    selectedSpells:  [
      "bolt_of_darkness", "curse_of_weakness", "bloodstained_blade",
      "eldritch_shield", "ray_of_darkness",
    ],
  };
}

export const EXAMPLE_BUILDS = [
  { id: "blood_tithe", name: "Blood Tithe — Demon Warlock", classId: "warlock", build: bloodTitheBuild },
];

export function defaultStateForClass(classId) {
  return {
    ...V3_DEFAULTS,
    classId,
    gear: makeEmptyGear(),
    theme: "default",
  };
}
