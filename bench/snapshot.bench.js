// PARTIAL harness — Stages 0–4 are stubbed in bench/stub-pipeline.js.
// Numbers printed here are a LOWER BOUND, not a budget baseline.
// See docs/performance-budget.md § 5 Baseline policy.
//
// Every case title carries the `PARTIAL:` prefix so the reporter output
// cannot be read as "we're under budget" — we're not; Stages 0–4 haven't
// been written yet.

import { bench } from 'vitest';
import {
  prepareBonuses,
  deriveStatsStage,
  projectStage,
  runSnapshotStub,
} from './stub-pipeline.js';
import { MAX_LOADOUT_BUILD } from './fixtures/max-loadout.fixture.js';
import { MINIMAL_LOADOUT_BUILD } from './fixtures/minimal-loadout.fixture.js';

// ── Max-loadout — Stage 5 only (deriveStats) ─────────────────────────────

{
  const build = MAX_LOADOUT_BUILD;
  const { bonusesFlat } = prepareBonuses(build);
  bench('snapshot recompute — PARTIAL: Stage 5 (deriveStats) — max loadout', () => {
    deriveStatsStage(build.attributes, bonusesFlat);
  });
}

// ── Max-loadout — Stage 6 only (projections) ─────────────────────────────

{
  const build = MAX_LOADOUT_BUILD;
  const { atoms, bonusesFlat } = prepareBonuses(build);
  const derivedStats = deriveStatsStage(build.attributes, bonusesFlat);
  bench('snapshot recompute — PARTIAL: Stage 6 (projections) — max loadout', () => {
    projectStage(atoms, derivedStats, build.target, build);
  });
}

// ── Max-loadout — Stages 5+6 end-to-end ──────────────────────────────────

{
  const build = MAX_LOADOUT_BUILD;
  const { atoms, bonusesFlat } = prepareBonuses(build);
  bench('snapshot recompute — PARTIAL: Stages 5+6 end-to-end — max loadout', () => {
    const ds = deriveStatsStage(build.attributes, bonusesFlat);
    projectStage(atoms, ds, build.target, build);
  });
}

// ── Minimal-loadout control — Stages 5+6 end-to-end ──────────────────────
// Scaling signal: compare max-loadout vs minimal-loadout to see whether
// Stages 5+6 scale with atom density or carry fixed overhead.

{
  const build = MINIMAL_LOADOUT_BUILD;
  const { atoms, bonusesFlat } = prepareBonuses(build);
  bench('snapshot recompute — PARTIAL: Stages 5+6 end-to-end — minimal loadout (1 perk)', () => {
    const ds = deriveStatsStage(build.attributes, bonusesFlat);
    projectStage(atoms, ds, build.target, build);
  });
}

// ── Full stub including Stages 0–4 stub work — diagnostic only ───────────
// Not a budget number. Useful for seeing what the stub costs END-to-end
// without being mistaken for the real baseline.

{
  const build = MAX_LOADOUT_BUILD;
  bench('snapshot recompute — PARTIAL: full runSnapshotStub (incl. stubbed Stages 0–4) — max loadout', () => {
    runSnapshotStub(build);
  });
}
