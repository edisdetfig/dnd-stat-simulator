# Phase 7 — Progress Tracker

Crash-resilience checklist. All steps complete.

Revisions applied post-plan sign-off:
- REQ-1: dropped Malice from the perk set (Warlock maxPerks = 4).
- REQ-2: Decision 4 → Option F (UI builds a minimal ctx from Session + Snapshot,
  calls the exported `evaluateCondition`).

## Steps

- [x] Step 0 — Retire stale code (example-builds.js, gear-defaults.js, all legacy components, src/styles/** except TIER_COLORS stub).
- [x] Step 1 — `src/fixtures/warlock-blood-tithe.fixture.js` authored.
- [x] Step 2 — `src/ui/uiSurfaceRules.js` + `src/ui/defaultBuildState.js` + 12 unit tests (passing).
- [x] Step 3 — App shell (App.jsx + main.jsx + index.css) + component stubs.
- [x] Step 4 — StatSheetPanel.
- [x] Step 5 — DamagePanel + HealPanel + ShieldPanel.
- [x] Step 6 — AbilitySelectors + WeaponHeldSwitcher + ActiveBuffsToggles.
- [x] Step 7 — Data-derived surfaces (HpFractionSlider, ViewingAfterEffectToggles, EitherTargetToggles, ClassResourceCounters).
- [x] Step 8 — TargetEditor + AvailableAbilitiesPanel.
- [x] Step 9 — Golden-diff test `normalizeBuild-phase7-golden.test.js` (11 asserts passing).
- [x] Step 10 — CSS layout pass (baked into Step 3 `index.css`).
- [x] Step 11 — Acceptance walk-through (8 programmatic asserts passing + dev server + production build green).

## Notes during execution

- **Deviation from signed-off plan:** skills changed from
  `[blood_pact, blow_of_corruption]` to `[blood_pact, spell_memory_1]`.
  Cause: without spell_memory_1, Warlock memoryCapacity ≈ 9 and Life
  Drain (cost 4) locks out of the pool — breaking the Phase 6.5d
  lifesteal demo which is the primary Phase 7 heal-projection gate.
  `spell_memory_1` adds +5 to the spell pool, bringing used/capacity to
  13/14 and keeping every selected spell active.

- **Theme stub:** `src/engine/curves.js` re-exports `TIER_COLORS` from
  `src/styles/theme.js`. Deleting all of `src/styles/` broke engine
  tests. Restored a minimal `src/styles/theme.js` that exports only
  the `TIER_COLORS` literal map (class-var strings). Zero behavior
  change; keeps the engine contract intact without resurrecting the
  full pre-rebuild theme system.

- **Tests status:** 588 passing, 10 pre-existing Phase-10-scope
  class-shape-validator failures (unchanged from Phase 7 baseline),
  8 skipped. +31 new tests (12 + 11 + 8).

- **Production build:** clean (71 modules, 449 KB total, 111 KB
  gzipped, 638 ms).
