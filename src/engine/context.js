// buildEngineContext — the seam between App.jsx state and the engine.
//
// Consumes the raw UI state and produces an `EngineContext` object that
// the effect pipeline, condition evaluator, and collectors all read from.
// Pre-aggregates gear once (via aggregateGear) so the pipeline itself is
// a pure function of effects.
//
// ── EngineContext shape ──
//   classData        — full class data object (from registry)
//   religion         — religion blessing object or null
//   gear             — raw gear tree (for slot iteration + display)
//   weaponHeldState  — "weaponSlot1" | "weaponSlot2" | "none"
//
//   // gear-only baseline (post-aggregation, pre-effects)
//   attrs            — { str, vig, agi, dex, wil, kno, res }
//   bonuses          — { [statKey]: number } non-attribute stat sums
//   activeWeapon     — primary weapon item on the held slot, or null
//
//   // derived condition inputs
//   weaponType       — string | null  (from activeWeapon.weaponType)
//   isTwoHanded      — boolean        (from activeWeapon.handType)
//   isUnarmed        — boolean        (weaponHeldState === "none" || no weapon)
//   isDualWield      — boolean        (active slot has primary AND secondary
//                                      both with weaponType)
//   gearEquipment    — { [slot]: item | undefined } for equipment checks
//
//   // user-controlled live state (pass-through)
//   selectedPerks        — string[]
//   selectedSkills       — string[]
//   selectedSpells       — string[]
//   activeBuffs          — { [abilityId]: boolean }
//   activeForm           — string | null
//   activeSummons        — { [abilityId]: boolean }
//   activeAfterEffects   — { [abilityId]: boolean }
//   activeWildSkill      — string | null
//   activeMergedSpells   — string[]
//   selectedStacks       — { [abilityId]: number }
//   selectedTiers        — { [abilityId]: "poor"|"good"|"perfect" }
//   hpPercent            — 0..100
//   playerStates         — { [state]: boolean }
//   frenzyActive         — boolean
//   environment          — string | null
//   targetStatuses       — { [statusType]: boolean }
//   targetStatusSource   — { [statusType]: abilityId }
//   target               — { pdr, mdr, headshotDR }
//
//   // derived membership union (for effect_active / isAbilityActive)
//   activeAbilityIds     — Set<string>

import { aggregateGear } from './aggregator.js';

export function buildEngineContext(state) {
  const {
    classData, religion = null, gear, weaponHeldState = "none",
    selectedPerks = [], selectedSkills = [], selectedSpells = [],
    activeBuffs = {}, activeForm = null,
    activeSummons = {}, activeAfterEffects = {},
    activeWildSkill = null, activeMergedSpells = [],
    selectedStacks = {}, selectedTiers = {},
    hpPercent = 100, playerStates = {}, frenzyActive = false,
    environment = null,
    targetStatuses = {}, targetStatusSource = {},
    target = null,
  } = state;

  const { attrs, bonuses, activeWeapon } = aggregateGear(classData, gear, weaponHeldState);

  const weaponType = activeWeapon?.weaponType ?? null;
  const isTwoHanded = activeWeapon?.handType === "twoHanded";
  const isUnarmed = weaponHeldState === "none" || !activeWeapon;

  const activeSlot = weaponHeldState !== "none" ? gear?.[weaponHeldState] : null;
  const isDualWield = !!(activeSlot?.primary?.weaponType && activeSlot?.secondary?.weaponType);

  const gearEquipment = {};
  for (const slot of ["head", "chest", "back", "hands", "legs", "feet", "ring1", "ring2", "necklace"]) {
    if (gear?.[slot]) gearEquipment[slot] = gear[slot];
  }

  const activeAbilityIds = collectActiveAbilityIds({
    selectedPerks, activeBuffs, activeForm,
    activeSummons, activeAfterEffects, activeWildSkill,
    activeMergedSpells,
  });

  return {
    classData, religion, gear, weaponHeldState,
    attrs, bonuses, activeWeapon,
    weaponType, isTwoHanded, isUnarmed, isDualWield, gearEquipment,
    selectedPerks, selectedSkills, selectedSpells,
    activeBuffs, activeForm,
    activeSummons, activeAfterEffects, activeWildSkill, activeMergedSpells,
    selectedStacks, selectedTiers,
    hpPercent, playerStates, frenzyActive, environment,
    targetStatuses, targetStatusSource, target,
    activeAbilityIds,
  };
}

function collectActiveAbilityIds({
  selectedPerks, activeBuffs, activeForm,
  activeSummons, activeAfterEffects, activeWildSkill,
  activeMergedSpells,
}) {
  const ids = new Set();
  for (const id of selectedPerks) ids.add(id);
  for (const [id, on] of Object.entries(activeBuffs)) if (on) ids.add(id);
  for (const [id, on] of Object.entries(activeSummons)) if (on) ids.add(id);
  for (const [id, on] of Object.entries(activeAfterEffects)) if (on) ids.add(id);
  if (activeForm) ids.add(activeForm);
  if (activeWildSkill) ids.add(activeWildSkill);
  for (const id of activeMergedSpells) ids.add(id);
  return ids;
}
