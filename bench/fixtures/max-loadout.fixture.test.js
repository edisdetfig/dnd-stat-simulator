// Fixture shape + pattern-coverage tests.
//
// Enforces that bench/fixtures/max-loadout.fixture.js exercises every
// pattern present in src/data/classes/class-shape-examples.js so the bench
// measurements reflect realistic atom density across every shape variant
// the real engine will encounter.

import { test, expect } from 'vitest';
import { MAX_LOADOUT_CLASS, MAX_LOADOUT_BUILD } from './max-loadout.fixture.js';
import { STAT_META } from '../../src/data/stat-meta.js';
import { EFFECT_PHASES } from '../../src/data/constants.js';

const klass = MAX_LOADOUT_CLASS;
const allAbilities = [...klass.perks, ...klass.skills, ...klass.spells];
const allEffects = allAbilities.flatMap(a => [
  ...(a.effects ?? []),
  ...(a.afterEffect?.effects ?? []),
]);
const allDamage  = allAbilities.flatMap(a => a.damage  ?? []);
const allHeals   = allAbilities.flatMap(a => a.heal ? [a.heal] : []);
const allShields = allAbilities.flatMap(a => a.shield ? [a.shield] : []);
const allGrants  = allAbilities.flatMap(a => a.grants  ?? []);
const allRemoves = allAbilities.flatMap(a => a.removes ?? []);

// ── Shape cardinality ────────────────────────────────────────────────────

test('fills perk / skill / spell caps', () => {
  expect(klass.perks.length).toBe(klass.maxPerks);
  expect(klass.skills.length).toBe(klass.maxSkills);
  expect(klass.spells.length).toBeGreaterThanOrEqual(12);
});

test('classResources exercises shared / grouped / user-set patterns', () => {
  const rs = klass.classResources;
  expect(Object.keys(rs).length).toBe(3);
  // Shared: condition via any(ability_selected, ability_selected).
  expect(rs.shared_pool.condition.type).toBe('any');
  // Grouped: condition via effect_active.
  expect(rs.channel_stacks.condition.type).toBe('effect_active');
  // User-set: condition via all(effect_active, any(ability_selected)).
  expect(rs.form_locked_shards.condition.type).toBe('all');
});

test('memory-cost cap exhausts with room to lock some out', () => {
  const total = klass.spells.reduce((s, sp) => s + (sp.memoryCost ?? 0), 0);
  expect(total).toBeGreaterThanOrEqual(15);
});

// ── Activation variant coverage ──────────────────────────────────────────

test('every activation variant appears at least once', () => {
  const activations = new Set(allAbilities.map(a => a.activation));
  for (const act of ['passive', 'cast', 'cast_buff', 'toggle']) {
    expect(activations.has(act)).toBe(true);
  }
});

// ── Cost variant coverage ────────────────────────────────────────────────

test('every cost.type variant appears at least once across abilities with costs', () => {
  const costTypes = new Set(allAbilities.flatMap(a => a.cost ? [a.cost.type] : []));
  for (const type of ['charges', 'health', 'cooldown', 'percentMaxHealth', 'none']) {
    expect(costTypes.has(type)).toBe(true);
  }
});

// ── STAT_EFFECT_ATOM pattern coverage ────────────────────────────────────

test('stat-effect atoms cover every class-shape-examples pattern', () => {
  // Every stat-effect atom's `stat` (when present) must be in STAT_META.
  for (const eff of allEffects) {
    if (eff.stat) expect(STAT_META[eff.stat]).toBeDefined();
    if (eff.phase) expect(Object.values(EFFECT_PHASES).includes(eff.phase)).toBe(true);
  }

  const byPattern = {
    passive_weapon_type_conditioned: allEffects.some(e =>
      e.stat && e.condition?.type === 'weapon_type'),              // axeSpecialization
    scales_with_hp_missing:          allEffects.some(e =>
      e.scalesWith?.type === 'hp_missing'),                        // berserker
    bare_cc_no_stat:                 allEffects.some(e =>
      !e.stat && !e.phase && e.tags && e.target),                  // savageRoar / fireball knockback
    named_status_via_tags:           allEffects.some(e =>
      e.stat && e.tags?.includes('frostbite'))
      && allEffects.some(e => e.stat && e.tags?.includes('poison')),
    tier_conditioned:                allEffects.some(e =>
      e.condition?.type === 'tier'),                               // balladOfCourage
    tag_scoped_stat_contribution:    allEffects.some(e =>
      e.stat === 'shoutDurationBonus'),                            // treacherousLungs
    display_only_tagged_atom:        allEffects.some(e =>
      !e.stat && e.tags?.includes('detects_hidden')),              // summonHydra
    after_effect_with_not_compound:  allAbilities.some(a =>
      a.afterEffect?.effects?.some(e => e.condition?.type === 'not')),
    player_state_condition:          allEffects.some(e =>
      e.condition?.type === 'player_state'),
    maxstacks_single_atom:           allEffects.some(e =>
      e.maxStacks && !e.tags),                                     // comboAttack
    maxstacks_multi_atom_status:     allEffects.filter(e =>
      e.maxStacks && e.tags?.includes('poison')).length >= 2,      // poisonedWeapon
    resource_shared_pool:            allEffects.some(e =>
      e.resource === 'shared_pool'),                               // soulCollector
    resource_grouped_multiatom:      allEffects.filter(e =>
      e.resource === 'channel_stacks').length >= 2,                // darkOffering
    resource_user_set_gated:         allEffects.some(e =>
      e.resource === 'form_locked_shards' && e.condition?.type === 'effect_active'),  // bloodPact locked
  };

  for (const [pattern, ok] of Object.entries(byPattern)) {
    expect(ok, `stat-effect pattern missing: ${pattern}`).toBe(true);
  }
});

// ── DAMAGE_ATOM pattern coverage ─────────────────────────────────────────

test('damage atoms cover every class-shape-examples pattern', () => {
  const byPattern = {
    direct_single:           allDamage.some(d => !d.isDot && d.target === 'enemy'),   // boltOfDarkness
    dot:                     allDamage.some(d => d.isDot),                            // poisonedWeapon / fireball burn
    multi_direct_splash_dot: allAbilities.some(a =>
      (a.damage ?? []).length >= 3
      && a.damage.some(d => d.target === 'enemy' && !d.isDot)
      && a.damage.some(d => d.target === 'nearby_enemies')
      && a.damage.some(d => d.isDot)),                                                // fireball
    maxstacks_dot:           allDamage.some(d => d.isDot && d.maxStacks),             // poisonedWeapon DoT
    tagged_status:           allDamage.some(d => d.tags?.includes('burn'))
                           && allDamage.some(d => d.tags?.includes('poison')),
    effect_active_gated_dot: allDamage.some(d =>
      d.isDot && d.condition?.type === 'effect_active'),                              // bloodPact abyssal flame
  };

  for (const [pattern, ok] of Object.entries(byPattern)) {
    expect(ok, `damage pattern missing: ${pattern}`).toBe(true);
  }
});

// ── HEAL / SHIELD coverage ───────────────────────────────────────────────

test('heal atoms cover instant and HoT patterns', () => {
  expect(allHeals.some(h => !h.isHot)).toBe(true);             // lesserHeal
  expect(allHeals.some(h => h.isHot && h.tickRate && h.duration)).toBe(true);  // naturesTouch
});

test('shield atoms cover damageFilter pattern', () => {
  expect(allShields.some(s => s.damageFilter && s.duration)).toBe(true);  // protection
});

// ── Condition variant coverage ───────────────────────────────────────────

test('every condition variant from class-shape.js appears somewhere', () => {
  const seen = new Set();
  const walk = (c) => {
    if (!c) return;
    seen.add(c.type);
    (c.conditions ?? []).forEach(walk);
  };
  for (const a of allAbilities) {
    walk(a.condition);
    for (const e of a.effects ?? [])           walk(e.condition);
    for (const d of a.damage ?? [])            walk(d.condition);
    if (a.heal)   walk(a.heal.condition);
    if (a.shield) walk(a.shield.condition);
    for (const g of a.grants ?? [])            walk(g.condition);
    for (const r of a.removes ?? [])           walk(r.condition);
    for (const e of a.afterEffect?.effects ?? []) walk(e.condition);
  }
  for (const r of Object.values(klass.classResources)) walk(r.condition);

  for (const variant of [
    'weapon_type', 'effect_active', 'ability_selected',
    'tier', 'all', 'any', 'not', 'player_state',
  ]) {
    expect(seen.has(variant), `condition variant missing: ${variant}`).toBe(true);
  }
});

// ── GRANT / REMOVE pattern coverage ──────────────────────────────────────

test('grant atoms cover ability + weapon + armor + costSource variants', () => {
  const types = new Set(allGrants.map(g => g.type));
  expect(types.has('ability')).toBe(true);
  expect(types.has('weapon')).toBe(true);
  expect(types.has('armor')).toBe(true);

  const costSources = new Set(allGrants.filter(g => g.type === 'ability').map(g => g.costSource));
  expect(costSources.has('granted')).toBe(true);              // bloodPact
  expect(costSources.has('granter')).toBe(true);              // orbOfNature

  expect(allGrants.some(g => g.condition)).toBe(true);        // bloodPact grants w/ condition
});

test('remove atoms cover tags-filtered + condition-gated variants', () => {
  expect(allRemoves.some(r => r.tags?.includes('spirit'))).toBe(true);  // druid shapeshift mastery
  expect(allRemoves.some(r => r.condition)).toBe(true);                  // fighter slayer analog
});

// ── Build fixture shape ──────────────────────────────────────────────────

test('MAX_LOADOUT_BUILD references only in-fixture ids', () => {
  const b = MAX_LOADOUT_BUILD;
  const allIds = new Set(allAbilities.map(a => a.id));
  for (const id of b.selectedPerks)  expect(allIds.has(id)).toBe(true);
  for (const id of b.selectedSkills) expect(allIds.has(id)).toBe(true);
  for (const id of b.selectedSpells) expect(allIds.has(id)).toBe(true);
  for (const id of b.activeBuffs) {
    if (id !== 'second_wind') expect(allIds.has(id)).toBe(true);  // second_wind used only in `not` cancelers
  }
});
