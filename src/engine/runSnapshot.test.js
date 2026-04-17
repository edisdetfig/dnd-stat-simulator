import { describe, it, expect } from 'vitest';
import {
  runSnapshot,
  atomsByTarget,
  atomsBySourceAbility,
  activeConditions,
  atomsByStat,
} from './runSnapshot.js';
import { warlock } from '../data/classes/warlock.new.js';
import { WARLOCK_BOD_BUILD } from '../../bench/fixtures/warlock-bolt-of-darkness.fixture.js';
import { WARLOCK_LIFE_DRAIN_BUILD } from '../../bench/fixtures/warlock-life-drain.fixture.js';

// ─────────────────────────────────────────────────────────────────────
// Minimal smoke — all Snapshot keys present
// ─────────────────────────────────────────────────────────────────────

describe('runSnapshot — minimal smoke', () => {
  it('returns Snapshot with all pinned + Phase-3 keys', () => {
    const snapshot = runSnapshot(WARLOCK_BOD_BUILD);

    // Phase 0 pinned keys.
    expect(snapshot.bonuses).toBeDefined();
    expect(snapshot.derivedStats).toBeDefined();
    expect(snapshot.damageProjections).toBeDefined();
    expect(snapshot.healProjections).toBeDefined();
    expect(snapshot.availableAbilityIds).toBeDefined();
    expect(snapshot.memoryBudget).toBeDefined();

    // Phase 3 additions.
    expect(snapshot.shieldProjections).toBeDefined();
    expect(snapshot.perTypeBonuses).toBeDefined();
    expect(snapshot.postCapMultiplicativeLayers).toBeDefined();
    expect(snapshot.activeAbilityIds).toBeDefined();
    expect(snapshot.viewingAfterEffect).toBeDefined();
    expect(snapshot.classResourceCounters).toBeDefined();
    expect(snapshot.stackCounts).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Snapshot._internal non-enumerable
// ─────────────────────────────────────────────────────────────────────

describe('runSnapshot — Snapshot._internal non-enumerable', () => {
  it('_internal NOT in Object.keys', () => {
    const snapshot = runSnapshot(WARLOCK_BOD_BUILD);
    expect(Object.keys(snapshot)).not.toContain("_internal");
  });

  it('_internal NOT in JSON.stringify', () => {
    const snapshot = runSnapshot(WARLOCK_BOD_BUILD);
    const json = JSON.stringify(snapshot);
    expect(json).not.toMatch(/_internal/);
  });

  it('_internal IS accessible via direct property read', () => {
    const snapshot = runSnapshot(WARLOCK_BOD_BUILD);
    expect(snapshot._internal).toBeDefined();
    expect(snapshot._internal.filteredAtoms).toBeDefined();
    expect(snapshot._internal.droppedAtoms).toBeDefined();
    expect(snapshot._internal.klass).toBe(warlock);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Derived-heal back-ref wiring
// ─────────────────────────────────────────────────────────────────────

describe('runSnapshot — derived-heal back-refs', () => {
  it('Life Drain damage projection has .derivedHeal populated (V12 back-ref)', () => {
    const snapshot = runSnapshot(WARLOCK_LIFE_DRAIN_BUILD);
    const lifeDrain = snapshot.damageProjections.find(p =>
      p.atomId === "life_drain:damage:0");
    expect(lifeDrain).toBeDefined();
    expect(lifeDrain.derivedHeal).toBeDefined();
    expect(lifeDrain.derivedHeal.derivedFrom.kind).toBe("lifesteal");
    expect(lifeDrain.derivedHeal.derivedFrom.damageAtomId).toBe("life_drain:damage:0");
  });

  it('Non-lifesteal damage projection has no derivedHeal', () => {
    const snapshot = runSnapshot(WARLOCK_BOD_BUILD);
    const bod = snapshot.damageProjections.find(p =>
      p.atomId === "bolt_of_darkness:damage:0");
    expect(bod.derivedHeal).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────
// Memory-budget finalization
// ─────────────────────────────────────────────────────────────────────

describe('runSnapshot — memory-budget second pass', () => {
  it('Warlock with Spell Memory I: memoryBudget reflects adjusted capacity', () => {
    // Warlock's spell_memory_1 adds +5 slots to spell pool.
    const build = {
      klass: warlock,
      attributes: { str: 11, vig: 14, agi: 14, dex: 15, wil: 22, kno: 15, res: 14 },
      selectedPerks: [],
      selectedSkills: ["spell_memory_1"],
      // Fill more spell slots than the base KNO capacity alone allows.
      selectedSpells: ["bolt_of_darkness", "curse_of_weakness", "curse_of_pain",
                       "bloodstained_blade", "eldritch_shield", "hellfire"],
      activeBuffs: [],
      classResourceCounters: {},
      stackCounts: {},
      selectedTiers: {},
      playerStates: [],
      target: { pdr: 0, mdr: 0.075, headshotDR: 0, maxHealth: 100 },
      weaponType: "spellbook",
      gear: { weapon: { weaponType: "spellbook" }, bonuses: {} },
      hpFraction: 1.0,
    };
    const snapshot = runSnapshot(build);
    // KNO=15 → baseline 9 slots; +5 from spell_memory_1 → 14 slots.
    // Selected spells total memoryCost: 1+1+2+2+5+4 = 15 → one over → hellfire (last) locked out.
    expect(snapshot.memoryBudget.spell.capacity).toBe(14);
    // At least one spell should be locked out at capacity 14 < sum 15.
    expect(snapshot.memoryBudget.spell.lockedOut.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Query API companions
// ─────────────────────────────────────────────────────────────────────

describe('runSnapshot — Query API companions', () => {
  it('atomsByTarget(self): returns atoms with target: "self" or "self_or_ally"', () => {
    const snapshot = runSnapshot(WARLOCK_BOD_BUILD);
    const selfAtoms = atomsByTarget(snapshot, "self");
    // All returned atoms should have target self or self_or_ally (or default self).
    for (const atom of selfAtoms) {
      const t = atom.target ?? "self";
      expect(["self", "self_or_ally"]).toContain(t);
    }
  });

  it('atomsByTarget(enemy): returns enemy-targeted atoms', () => {
    const snapshot = runSnapshot(WARLOCK_BOD_BUILD);
    const enemyAtoms = atomsByTarget(snapshot, "enemy");
    // BoD damage atom is target: "enemy".
    const bodDamage = enemyAtoms.find(a => a.atomId === "bolt_of_darkness:damage:0");
    expect(bodDamage).toBeDefined();
  });

  it('atomsBySourceAbility: all containers for a given ability', () => {
    const snapshot = runSnapshot(WARLOCK_BOD_BUILD);
    const view = atomsBySourceAbility(snapshot, "bolt_of_darkness");
    expect(view.damage).toHaveLength(1);
    expect(view.damage[0].atomId).toBe("bolt_of_darkness:damage:0");
  });

  it('atomsBySourceAbility: dark_enhancement contributes one effects atom', () => {
    const snapshot = runSnapshot(WARLOCK_BOD_BUILD);
    const view = atomsBySourceAbility(snapshot, "dark_enhancement");
    expect(view.effects).toHaveLength(1);
    expect(view.effects[0].stat).toBe("darkDamageBonus");
  });

  it('activeConditions: returns dropped atoms (zero expected for BoD build)', () => {
    const snapshot = runSnapshot(WARLOCK_BOD_BUILD);
    const dropped = activeConditions(snapshot);
    expect(Array.isArray(dropped)).toBe(true);
    // Every dropped entry is `{ atom, condition, evaluation }`.
    for (const d of dropped) {
      expect(d.atom).toBeDefined();
      expect(d.condition).toBeDefined();
      expect(d.evaluation).toBe(false);
    }
  });

  it('atomsByStat: returns effects atoms matching a stat', () => {
    const snapshot = runSnapshot(WARLOCK_BOD_BUILD);
    const darkAtoms = atomsByStat(snapshot, "darkDamageBonus");
    // Only Dark Enhancement contributes this stat in this build.
    expect(darkAtoms).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Verified-source assertions end-to-end through runSnapshot
// ─────────────────────────────────────────────────────────────────────

describe('runSnapshot — V18 Warlock baseline HP 122', () => {
  it('bare Warlock (no buffs) has derivedStats.health.value === 122', () => {
    const build = {
      klass: warlock,
      attributes: warlock.baseAttributes,
      selectedPerks: [], selectedSkills: [], selectedSpells: [],
      activeBuffs: [], classResourceCounters: {}, stackCounts: {},
      selectedTiers: {}, playerStates: [],
      target: { pdr: 0, mdr: 0, headshotDR: 0, maxHealth: 100 },
      weaponType: null, gear: { weapon: null, bonuses: {} },
      hpFraction: 1.0,
    };
    const snapshot = runSnapshot(build);
    expect(snapshot.derivedStats.health.value).toBe(122);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Max-loadout fixture smoke — runs the Phase 0 fixture through the real
// engine end-to-end. Pre-retirement check (Step 14 coverage).
// ─────────────────────────────────────────────────────────────────────

describe('runSnapshot — max-loadout smoke (pre-bench-retirement)', () => {
  it('MAX_LOADOUT_BUILD runs through real engine without throwing', async () => {
    const { MAX_LOADOUT_BUILD } = await import('../../bench/fixtures/max-loadout.fixture.js');
    const snapshot = runSnapshot(MAX_LOADOUT_BUILD);
    expect(snapshot).toBeDefined();
    expect(snapshot.derivedStats.health.value).toBeGreaterThan(0);
    // The synthetic MAX_LOADOUT_CLASS has 3 caps at or under 0.65 by recipes.js
    expect(snapshot.derivedStats.pdr.value).toBeLessThanOrEqual(0.65);
    expect(snapshot.derivedStats.mdr.value).toBeLessThanOrEqual(0.65);
    // availableAbilityIds has entries.
    expect(snapshot.availableAbilityIds.length).toBeGreaterThan(0);
    // AtomId format sanity — every damage/heal projection conforms.
    for (const p of [...snapshot.damageProjections, ...snapshot.healProjections]) {
      expect(p.atomId).toMatch(/^[a-z_]+:(effects|damage|heal|shield|afterEffect\.effects|grants|removes):\d+$/);
    }
    // Memory budget shape — per-pool.
    expect(snapshot.memoryBudget.spell).toBeDefined();
    expect(snapshot.memoryBudget.spell.used).toBeLessThanOrEqual(snapshot.memoryBudget.spell.capacity);
  });
});
