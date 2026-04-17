// Snapshot bench harness — measures runSnapshot against realistic fixtures.
//
// Budget: < 50 ms per snapshot for the max-loadout build
// (docs/performance-budget.md § 4-5). Per-stage split per
// docs/engine_implementation_plan.md §10.

import { bench } from 'vitest';
import { runSnapshot } from '../src/engine/runSnapshot.js';
import { MAX_LOADOUT_BUILD } from './fixtures/max-loadout.fixture.js';
import { MINIMAL_LOADOUT_BUILD } from './fixtures/minimal-loadout.fixture.js';

// ── Max-loadout end-to-end ────────────────────────────────────────────

bench('snapshot recompute — max loadout (end-to-end)', () => {
  runSnapshot(MAX_LOADOUT_BUILD);
});

// ── Minimal-loadout end-to-end ────────────────────────────────────────
// Scaling signal: compare max-loadout vs minimal-loadout to see whether
// timing scales with atom density or carries fixed per-call overhead.

bench('snapshot recompute — minimal loadout (1 perk)', () => {
  runSnapshot(MINIMAL_LOADOUT_BUILD);
});
