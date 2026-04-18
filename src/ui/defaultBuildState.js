// defaultBuildState — factory that returns a fresh copy of the Phase 7
// anchor CharacterBuild (warlockBloodTitheBuild). Phase 7 holds one
// source of truth in React state; all mutations produce new objects
// through the withXxx helpers below.
//
// The fixture is the default. Later phases may introduce a blank
// (class-agnostic) default, but Phase 7 scope is Warlock-only (LOCK A).

import { warlockBloodTitheBuild } from "../fixtures/warlock-blood-tithe.fixture.js";

// Deep-clone the fixture so live React state never aliases the
// module-level constant. structuredClone preserves objects but drops
// function references — not an issue here (no functions in the fixture).
export function makeDefaultBuildState() {
  return structuredClone(warlockBloodTitheBuild);
}

// ── Immutable-update helpers ───────────────────────────────────
// Each helper returns a new CharacterBuild with exactly one branch of
// the object changed. Keeps React state updates structural.

export function withCharacter(state, updater) {
  return { ...state, character: updater(state.character) };
}

export function withSession(state, updater) {
  return { ...state, session: updater(state.session) };
}

export function withPersistentSelections(state, updater) {
  return withCharacter(state, (c) => ({
    ...c,
    persistentSelections: updater(c.persistentSelections),
  }));
}

// ── Toggle helpers — common mutations the UI wires to callbacks ─

export function togglePerk(state, perkId) {
  return withPersistentSelections(state, (sel) => ({
    ...sel,
    selectedPerks: toggleInArray(sel.selectedPerks, perkId),
  }));
}

export function toggleSkill(state, skillId) {
  return withPersistentSelections(state, (sel) => ({
    ...sel,
    selectedSkills: toggleInArray(sel.selectedSkills, skillId),
  }));
}

export function toggleSpell(state, spellId) {
  return withPersistentSelections(state, (sel) => ({
    ...sel,
    selectedSpells: toggleInArray(sel.selectedSpells, spellId),
  }));
}

export function toggleActiveBuff(state, abilityId) {
  return withSession(state, (s) => ({
    ...s,
    activeBuffs: toggleInArray(s.activeBuffs, abilityId),
  }));
}

export function toggleViewingAfterEffect(state, abilityId) {
  return withSession(state, (s) => ({
    ...s,
    viewingAfterEffect: toggleInArray(s.viewingAfterEffect, abilityId),
  }));
}

export function setWeaponHeldState(state, heldState) {
  return withSession(state, (s) => ({ ...s, weaponHeldState: heldState }));
}

export function setHpFraction(state, fraction) {
  return withSession(state, (s) => ({ ...s, hpFraction: fraction }));
}

export function setClassResourceCount(state, resourceId, count) {
  return withSession(state, (s) => ({
    ...s,
    classResourceCounters: { ...s.classResourceCounters, [resourceId]: count },
  }));
}

export function setApplyToSelf(state, abilityId, flag) {
  return withSession(state, (s) => ({
    ...s,
    applyToSelf: { ...s.applyToSelf, [abilityId]: flag },
  }));
}

export function setApplyToEnemy(state, abilityId, flag) {
  return withSession(state, (s) => ({
    ...s,
    applyToEnemy: { ...s.applyToEnemy, [abilityId]: flag },
  }));
}

export function setTargetField(state, field, value) {
  return withSession(state, (s) => ({
    ...s,
    target: { ...s.target, [field]: value },
  }));
}

// ── Internal helper ────────────────────────────────────────────

function toggleInArray(arr, id) {
  const list = Array.isArray(arr) ? arr : [];
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}
