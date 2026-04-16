// Stub pipeline smoke test.
//
// Proves runSnapshotStub runs end-to-end against the max-loadout fixture
// and returns the Snapshot shape pinned in docs/performance-budget.md § 6.1.
// Guards against silent harness rot — if the stub breaks, `npm test` fails
// before anyone tries to read a bench number.

import { test, expect } from 'vitest';
import { runSnapshotStub } from './stub-pipeline.js';
import { MAX_LOADOUT_BUILD } from './fixtures/max-loadout.fixture.js';
import { MINIMAL_LOADOUT_BUILD } from './fixtures/minimal-loadout.fixture.js';

test('runSnapshotStub returns pinned Snapshot shape', () => {
  const snap = runSnapshotStub(MAX_LOADOUT_BUILD);

  // Top-level keys
  expect(snap).toHaveProperty('bonuses');
  expect(snap).toHaveProperty('derivedStats');
  expect(snap).toHaveProperty('damageProjections');
  expect(snap).toHaveProperty('healProjections');
  expect(snap).toHaveProperty('availableAbilityIds');
  expect(snap).toHaveProperty('memoryBudget');

  // Bonuses shape: Record<StatId, Record<Phase, number>>
  const anyStat = Object.keys(snap.bonuses)[0];
  expect(typeof snap.bonuses[anyStat]).toBe('object');
  for (const phaseMap of Object.values(snap.bonuses)) {
    for (const v of Object.values(phaseMap)) {
      expect(typeof v).toBe('number');
    }
  }

  // Derived stats shape: each has .value
  for (const ds of Object.values(snap.derivedStats)) {
    expect(ds).toHaveProperty('value');
    expect(typeof ds.value).toBe('number');
  }

  // Damage projections shape
  expect(snap.damageProjections.length).toBeGreaterThan(0);
  for (const p of snap.damageProjections) {
    expect(p).toHaveProperty('atomId');
    expect(p).toHaveProperty('source');
    expect(p).toHaveProperty('hit');
    expect(p.source).toHaveProperty('kind');
    expect(p.source).toHaveProperty('abilityId');
    expect(p.source).toHaveProperty('className');
  }

  // Heal projections shape
  for (const h of snap.healProjections) {
    expect(h).toHaveProperty('atomId');
    expect(h).toHaveProperty('amount');
    expect(h).toHaveProperty('isHot');
    expect(typeof h.amount).toBe('number');
  }

  // availableAbilityIds
  expect(Array.isArray(snap.availableAbilityIds)).toBe(true);
  expect(snap.availableAbilityIds.length).toBeGreaterThan(0);

  // Memory budget
  expect(snap.memoryBudget).toHaveProperty('used');
  expect(snap.memoryBudget).toHaveProperty('capacity');
  expect(Array.isArray(snap.memoryBudget.lockedOut)).toBe(true);
});

test('atomId follows the pinned "<ability_id>:<container>:<index>" rule', () => {
  const snap = runSnapshotStub(MAX_LOADOUT_BUILD);
  for (const p of [...snap.damageProjections, ...snap.healProjections]) {
    expect(p.atomId).toMatch(/^[a-z_]+:(effects|damage|heal|shield|afterEffect\.effects|grants|removes):\d+$/);
  }
  // Spot-check known examples.
  const ids = new Set(snap.damageProjections.map(p => p.atomId));
  expect(ids.has('bolt_of_darkness:damage:0')).toBe(true);
  expect(ids.has('fireball:damage:1')).toBe(true);      // splash
  expect(ids.has('fireball:damage:2')).toBe(true);      // burn DoT
});

test('sanity checks on derived stats', () => {
  const snap = runSnapshotStub(MAX_LOADOUT_BUILD);
  expect(snap.derivedStats.health.value).toBeGreaterThan(0);
  expect(snap.derivedStats.pdr.value).toBeLessThanOrEqual(0.65);
  expect(snap.derivedStats.mdr.value).toBeLessThanOrEqual(0.65);
});

test('memory budget locks out excess spells', () => {
  const snap = runSnapshotStub(MAX_LOADOUT_BUILD);
  expect(snap.memoryBudget.used).toBeLessThanOrEqual(snap.memoryBudget.capacity);
});

test('minimal-loadout build runs and produces a minimal snapshot', () => {
  const snap = runSnapshotStub(MINIMAL_LOADOUT_BUILD);
  expect(snap.damageProjections.length).toBe(0);    // no damage atoms authored
  expect(snap.healProjections.length).toBe(0);
  expect(snap.derivedStats.health.value).toBeGreaterThan(0);
});

test('granted abilities appear in availableAbilityIds when grantor is active', () => {
  const snap = runSnapshotStub(MAX_LOADOUT_BUILD);
  // demon_form is active and grants dark_strike unconditionally-while-active
  expect(snap.availableAbilityIds).toContain('dark_strike');
});
