# Phase 6 — Engine Implementation — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 6 of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo. Read, don't assume.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker. Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage/heal projections + available abilities. No time passes, no events fire. See `docs/perspective.md` for the full mental model.

The project is mid-rebuild:
- The class-data shape (`src/data/classes/class-shape.js`) is **locked**.
- Phase 0 landed a performance harness + pinned engine API surface.
- Phase 1 landed a class-shape validator.
- Phase 2 migrated **Warlock** as the anchor class.
- Phase 3 produced **`docs/engine_architecture.md`** (the engine's public contract) and `docs/vocabulary.md`, plus typed-damage-stat migration.
- Phase 4 verified the contract against Warlock + executed Phase 3 follow-up re-authors.
- A small post-Phase-4 refactor introduced `targetMaxHpRatio` on DAMAGE_ATOM (symmetric with `lifestealRatio`) and reverted Phase 4's dual-context `percentMaxHealth` interpretation back to single-context.
- Phase 5 produced **`docs/engine_implementation_plan.md`** — 1562-line authoritative module-decomposition with 12 module contracts, pipeline orchestration, stage-transition contracts, Stage 0–6 detail, performance budget split, test plan with 18 verified-source assertions, and forward-spec patterns.

You are executing **Phase 6** of the 13-phase rebuild plan: **build the engine modules**, TDD-style, against Warlock data, per `docs/engine_implementation_plan.md`. The plan is the spec; you implement.

This is the largest phase yet by code volume. Module count = 12 (11 modules + 1 utility). All locked decisions from Phases 1–5 are binding. The engine must be class-agnostic — no `if (className === 'warlock')` branches. Adding the other 9 classes in Phase 10 must be a data-only change.

---

## Mandatory reading order

Read these files before anything else. Do not skim.

1. **`docs/rebuild-plan.md`** — authoritative roadmap. Read in full: Operating protocol, Constraints, and **Phase 6** in detail. Pay attention to Watch-for items.
2. `CLAUDE.md` — project-level guidance. Note the accuracy-first doctrine.
3. `docs/perspective.md` — mental model.
4. **`docs/engine_implementation_plan.md`** — **the spec you're implementing.** Read in full. Every module contract, every signature, every field.
5. **`docs/engine_architecture.md`** — the underlying engine contract Phase 5 plans against. Read in full.
6. `docs/vocabulary.md` — controlled-vocabulary glossary.
7. `docs/class-shape-progress.md` — locked decisions (engine open Q1 + Q2 both resolved).
8. `src/data/classes/class-shape.js` — locked schema.
9. `src/data/classes/class-shape-validator.js` + `class-shape-validator.test.js` — validator logic; rule codes. Phase 6 adds three new rules (LOCK F).
10. `src/data/constants.js` — canonical vocabularies.
11. `src/data/stat-meta.js` — `STAT_META` (typed-damage stats, lifesteal stats removed in Phase 4).
12. **`src/engine/recipes.js`, `src/engine/curves.js`, `src/engine/damage.js`** — verified math. **Read carefully** — your modules call into these. Do not modify them.
13. **`src/data/classes/warlock.new.js`** — the anchor class. Every module must round-trip Warlock cleanly.
14. **`docs/damage_formulas.md`, `docs/healing_verification.md`, `docs/season8_constants.md`** — verified math. Test points cite line numbers; your test code asserts against these.
15. `docs/unresolved_questions.md` — known mechanic unknowns; `_unverified` annotations.
16. `bench/fixtures/max-loadout.fixture.js` — Phase 0 fixture.
17. **`bench/`** — existing benchmark harness (incl. `bench/stub-pipeline.js` which Phase 6 retires as final step).
18. **Commits to read** (commit messages and diffs):
    - `0622189` — Phase 0 (performance harness + checkpoints)
    - `c5160d7` — Phase 1 (validator)
    - `f8431ad` — Phase 2 (Warlock migration)
    - `5f99a80` — Phase 3 (architecture doc + vocabulary + typed-damage migration)
    - `f93dec2` — Phase 4 (verification + 5 re-authors + STAT_META cleanup)
    - `f682439` — post-Phase-4 refactor (targetMaxHpRatio + dual-context elimination)
    - `b47312d` — Phase 5 (engine implementation plan)

**Use the `Explore` sub-agent** for cross-cutting reads (e.g., "every export from `src/engine/recipes.js`, `curves.js`, `damage.js` and what each function expects"; "every existing test fixture in `bench/` and what it covers").

---

## Your mission — Phase 6 in one sentence

Build all 12 engine modules per `docs/engine_implementation_plan.md`, TDD-style; add the three new validator rules; create six Warlock integration fixtures; retire `bench/stub-pipeline.js` as the final step — Warlock snapshot under 50ms, all 18 verified-source assertions passing, validator green throughout, class-agnostic discipline absolute.

See `docs/rebuild-plan.md § Phase 6` for the authoritative Goal / Work / Watch for / Success criteria.

---

## The three-priority hierarchy (governs every tradeoff)

1. **Performance first.** Snapshot recompute < 50ms for the largest realistic build. Per-stage budget per `engine_implementation_plan.md § 10`. Don't optimize before measuring; do optimize once measurement shows a hot stage.
2. **Class-agnostic, second.** No engine-code branches on class, ability, or stat identity. Dispatch is enum-driven or data-driven. Adding Phase 10 classes must be a data-only change.
3. **Engine-mechanic extension ease, third.** New mechanic types extend dispatch tables, never rewrite pipelines.

When priorities conflict, top of list wins.

**Plus the accuracy-first doctrine:** every test assertion that exercises projection math cites a verified-source line number. The 18-item §11.4 assertion inventory IS the integration test list.

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 6 in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

### Stage 1 — Context Gather → Terse Map

Read the files above. Use `Explore` sub-agents for:
- **Existing engine surface inventory.** Walk `src/engine/`; for each export from `recipes.js` / `curves.js` / `damage.js`, capture: function signature, expected inputs, return shape, side-effects (none expected — these are pure). Your modules wrap and orchestrate; don't change.
- **Existing test surface inventory.** Walk `src/engine/*.test.js` and `bench/`; capture: what's tested, what fixtures exist, what assertions validate (especially the verified-source ones). Phase 6 adds tests; existing must stay green.
- **Validator surface inventory.** Walk `class-shape-validator.js` + `class-shape-validator.test.js`; capture rule codes, dispatch shape, where the three new LOCK F rules slot in.
- **Warlock atom inventory cross-checked against §11.2 fixtures.** For each of the six fixtures (warlock-bolt-of-darkness, warlock-blood-pact, warlock-life-drain, warlock-exploitation-strike, warlock-antimagic, warlock-eldritch-shield), identify which Warlock atom shapes participate and which engine modules each fixture exercises end-to-end.

Produce a written **Terse Map** covering:
- Engine module list with current implementation status (all "not yet" entering Phase 6).
- Existing engine surface (recipes/curves/damage exports).
- Existing test surface (what's already there — must stay green).
- Validator rule codes (existing + the three new ones to add).
- Warlock atom → integration fixture → engine module participation matrix.
- Phase 0 baseline benchmark output (what's the current measurement; what's PARTIAL).
- Open implementation questions (very few expected; the spec is detailed).

### Stage 2 — Plan

Produce a detailed execution plan covering:

**File creation map.** Per `engine_implementation_plan.md`, the modules and their paths:
- `src/engine/damageTypeToHealType.js` (utility) + `.test.js`
- `src/engine/conditions.js` + `.test.js`
- `src/engine/buildContext.js` + `.test.js`
- `src/engine/collectAtoms.js` + `.test.js`
- `src/engine/filterByConditions.js` + `.test.js`
- `src/engine/materializeStacking.js` + `.test.js`
- `src/engine/aggregate.js` + `.test.js`
- `src/engine/deriveStats.js` + `.test.js`
- `src/engine/projectShield.js` + `.test.js`
- `src/engine/projectHealing.js` + `.test.js`
- `src/engine/projectDamage.js` + `.test.js`
- `src/engine/runSnapshot.js` + `.test.js`

Plus:
- `src/data/classes/class-shape-validator.js` (modify — three new rules)
- `src/data/classes/class-shape-validator.test.js` (modify — three new rules + positive/negative coverage)
- `bench/fixtures/warlock-bolt-of-darkness.fixture.js` (create)
- `bench/fixtures/warlock-blood-pact.fixture.js` (create)
- `bench/fixtures/warlock-life-drain.fixture.js` (create)
- `bench/fixtures/warlock-exploitation-strike.fixture.js` (create)
- `bench/fixtures/warlock-antimagic.fixture.js` (create)
- `bench/fixtures/warlock-eldritch-shield.fixture.js` (create)
- `bench/snapshot.bench.js` (modify — flip import from stub-pipeline to runSnapshot)
- `bench/stub-pipeline.js` (delete — final step)

**Execution sequence per Appendix C of the implementation plan (non-binding bottom-up; Phase 6 may diverge if a dependency reveals cleaner sequence):**

```
Step 0  — Validator extension: add three new rules (K.afterEffect_forbidden,
          C.memorySlots_abilityType_required, C.damage_type_phase_invariant)
          + tests. Validator stays green on Warlock.

Step 1  — damageTypeToHealType utility + test (13 mappings).

Step 2  — conditions module + test (13 variants × evaluator + compound combinators).

Step 3  — buildContext + test (4 sub-behaviors per § 6: availability resolver, grants
          chain cycle detection, memory-budget two-pass per-pool, weapon-state derivation).

Step 4  — collectAtoms + test (atom walk, source/atomId population, afterEffect short-
          circuit per LOCK E).

Step 5  — filterByConditions + test (per-atom condition eval, damage_type pass-through,
          fine-grained Stage 2 cache-key composition per § 7).

Step 6  — materializeStacking + test (maxStacks × resource × scalesWith dispatch).

Step 7  — aggregate + test (per-phase routing into bonuses / perTypeBonuses /
          postCapMultiplicativeLayers / capOverrides; typed-damage routing table).

Step 8  — deriveStats + test (wraps recipes.computeDerivedStats; phase-flatten adapter).

Step 9  — projectShield + test.

Step 10 — projectHealing + test (authored HEAL + derived-heal descriptor processing).

Step 11 — projectDamage + test (per-atom physical/magical dispatch + typed bonuses +
          post-cap layer re-eval + lifesteal pre-MDR computation per § 9.1).

Step 12 — Six Warlock integration fixtures (per § 11.2): warlock-bolt-of-darkness,
          warlock-blood-pact, warlock-life-drain, warlock-exploitation-strike,
          warlock-antimagic, warlock-eldritch-shield. Each fixture exercises a full
          stage chain (Stages 0–5 as far as the fixture's shape requires).

Step 13 — runSnapshot + test (orchestration, second memory pass, derived-heal back-
          ref wiring, Snapshot._internal non-enumerable property, Query API
          companions atomsByTarget / atomsBySourceAbility / activeConditions /
          atomsByStat).

Step 14 — Bench retirement: flip bench/snapshot.bench.js import to use the new
          runSnapshot; delete bench/stub-pipeline.js. First REAL (non-PARTIAL)
          baseline measurement against the 50ms budget.

Step 15 — End-to-end verification: 18 verified-source assertions per § 11.4 all
          pass; Warlock snapshot < 50ms via bench harness.
```

**Plan must also cover:**
- Per-step validator-feedback protocol: re-run validator after each module lands; warlock per-class errors must stay 0.
- Per-step bench-feedback protocol: after Stage X module lands, run bench; capture the per-stage timing; flag if any stage exceeds its budget per `engine_implementation_plan.md § 10`.
- Per-step test count: each module's test file should exercise the cases the implementation plan calls out; flag the test count target.
- Memoization deferral discipline: do NOT implement memoization caches in Phase 6 unless measurement shows a hot stage. Per the plan: cache key composition is spec'd; implementation is conditional on measurement.
- File creation strategy (one engine module + one test file per step; integration fixtures grouped at Step 12; bench retirement at Step 14).
- Mapping to Phase 6 success criteria, item by item.
- Decisions requiring user sign-off (numbered list — should be very few; the implementation plan is the spec).
- Risks and open questions.

### Stage 3 — STOP — Plan Report

Emit the **Plan Report** in exactly this format:

```markdown
# Phase 6 — Plan Report

## Terse map
[bullets / tables from Stage 1: module status, engine surface, test surface, validator rules, Warlock fixture matrix, Phase 0 baseline]

## Execution plan
[detailed plan from Stage 2: 16-step execution sequence with per-step file targets + validator/bench feedback]

## Decisions requiring user sign-off
[numbered list — very few expected]

## Success-criteria coverage
| Criterion | Plan addresses it via |
|---|---|
| All modules implemented | ... |
| TDD discipline | ... |
| Verified-math test points pass | ... |
| Snapshot for Warlock fixture < 50ms | ... |
| Validator green on Warlock throughout | ... |
| Three new validator rules added | ... |
| Six integration fixtures created | ... |
| bench/stub-pipeline.js retired | ... |

## Risks
[bullets]

## Open questions
[bullets — should be near-zero]
```

**WAIT for explicit user sign-off.** Revise and re-emit if feedback comes back. Do not proceed to Stage 4 without explicit "approved."

### Stage 4 — Execute

Once signed off, execute the plan. Maintain a working progress document at `docs/session-prompts/phase-6-progress.md` for crash resilience (template at the end of this prompt). Update before/after each step. Phase 6 is the largest phase — the progress doc is essential.

**Inner-loop discipline (per step):**

1. Implement the module body.
2. Write the test file alongside it.
3. Run `npm test -- <module-test-path>` — confirm passes.
4. Run full validator (`npm test -- --run class-shape-validator`) — confirm warlock per-class errors stay 0.
5. Run full test suite (`npm test`) — confirm no regressions.
6. After Steps 3, 5, 7, 9, 10, 11, 13: run bench (`npx vitest bench --run`) — capture per-stage timing.
7. Update `phase-6-progress.md` with started/completed timestamps.
8. Move to next step.

**Discipline:**
- Stay strictly inside the signed-off plan.
- Any architectural decision NOT already locked (in `engine_implementation_plan.md`, `engine_architecture.md`, `class-shape-progress.md § Locked decisions`, this prompt's "Locked from coordinator" section, or this session's signed-off plan) requires surfacing before acting.
- **No shape changes without sign-off.** If implementation reveals the shape needs to evolve, STOP and surface — don't unilaterally update class-shape.js / validator / Warlock data / architecture doc.
- **Class-agnostic discipline absolute.** No `if (className === 'X')` branches. If a Warlock mechanic seems to require class-specific handling, that's a sign the shape needs to express it more generally — surface the issue.
- **Don't optimize before measuring.** Get each module working first; benchmark; optimize only the hot stages identified by measurement.
- **Memoization is conditional.** Implementation plan spec'd cache-key compositions; do NOT implement the caches unless measurement shows the stage is a bottleneck.
- **Verified-source citations.** Every projection-math test cites the verified-source line number. The §11.4 assertion inventory is your test list — implement all 18.
- **Forward-spec patterns must be SUPPORTED, not exercised.** Druid form mutual exclusion, Bard music memory pool, Sorcerer mergedSpells, etc. — engine code accommodates them so Phase 10 doesn't paint into a corner. Tests can be minimal (one synthetic fixture) but the code path must exist.

### Stage 5 — STOP — Completion Report

Emit the **Completion Report** in exactly this format:

```markdown
# Phase 6 — Completion Report

## Files created / modified
[paths + one-line purpose each]

## What was built
[summary tied to the plan]

## Module implementation status
| Module | Path | Test file | Tests passing | Notes |
|---|---|---|---|---|
| ... | ... | ... | ✓ N/N | ... |

## Validator rules added
| Rule code | Rule purpose | Test coverage |
|---|---|---|

## Integration fixture status
| Fixture | What it exercises | Engine modules participated | Test passing |
|---|---|---|---|

## Verified-source assertion outcomes
| # | Assertion (per § 11.4) | Implementation location | Pass/Fail |
|---|---|---|---|

## Performance budget outcome
| Stage | Budget (ms) | Measured (ms) | % budget | Notes |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Bench retirement
[stub-pipeline.js deletion confirmation; first real baseline measurement; comparison to budget]

## Validator status
[Warlock per-class errors: 0 throughout; cross-class L-rule still failing per Phase 10 backlog]

## Memoization decisions
[which stages got caches implemented (if any) based on measurement; rationale]

## Deviations from plan
[what changed and why — or "none"]

## Success-criteria status
| Criterion | Status | Evidence |
|---|---|---|

## Findings (for later phases)
[Phase 7 wiring; Phase 8 verification; Phase 10 migration anchors]

## Follow-ups (non-blocking)
[anything noticed out of scope]
```

**WAIT for explicit user sign-off.** Revise per feedback. Do not declare Phase 6 complete without explicit sign-off.

---

## Locked from coordinator (binding for Phase 6)

These are settled — do not re-litigate. Implement as specified.

### LOCK A — Module implementation order
Bottom-up per Appendix C of `docs/engine_implementation_plan.md`: utility → conditions → buildContext → collectAtoms → filterByConditions → materializeStacking → aggregate → deriveStats → projectShield → projectHealing → projectDamage → integration fixtures → runSnapshot → bench retirement. The order is non-binding only in the sense that a dependency revealed during execution may justify a small reorder; the broad bottom-up approach is binding. Any reorder requires sign-off.

### LOCK B — TDD discipline
Each module ships with a `.test.js` file in the same step. Tests are written alongside the implementation, not deferred. Validator green on Warlock at every checkpoint.

### LOCK C — Validator stays green on Warlock throughout
Warlock per-class errors = 0 at every step. Cross-class L-rule collision (`spell_memory_1` / `spell_memory_2`) remains expected per Phase 10 backlog. Other v3 classes' per-class errors remain expected per Phase 10.

### LOCK D — Class-agnostic discipline absolute
No `if (className === 'X')` branches. No `if (abilityId === 'Y')` branches. Dispatch is enum-driven (`CONDITION_TYPES`, `EFFECT_PHASES`, `ABILITY_TYPES`, etc.) or data-driven (atom shape, STAT_META metadata). If a Warlock mechanic seems to require class-specific handling, surface as a shape-or-spec issue, don't add a branch.

### LOCK E — Existing verified-math files preserved
`src/engine/recipes.js`, `src/engine/curves.js`, `src/engine/damage.js` — your modules wrap and orchestrate; do not modify. Existing tests against them must stay green. If Phase 6 surfaces a need to extend verified-math, surface as sign-off.

### LOCK F — Three new validator rules to add
- **`K.afterEffect_forbidden`** — forbid `grants[]` and `removes[]` keys inside any `afterEffect` wrapper. Per Phase 5 §8 + Phase 4 LOCK 5: afterEffect carries only `effects[]`.
- **`C.memorySlots_abilityType_required`** — forbid `{stat: "memorySlots", ...}` without an `abilityType` discriminator. Per Phase 5 §6.3 per-pool memory-budget independence.
- **`C.damage_type_phase_invariant`** — forbid a `damage_type`-conditioned atom at any phase other than `post_cap_multiplicative_layer`. Per Phase 5 §3.6 aggregate contract: such atoms route into `postCapMultiplicativeLayers[]` with conditions preserved; routing them into `bonuses` would silently drop the condition.

All three rules land in Step 0 (before any module work) so authoring constraints are enforced from the start. Each rule has positive (passes) + negative (fails with the rule code) test coverage in `class-shape-validator.test.js`.

### LOCK G — `bench/stub-pipeline.js` retirement is the final step
Step 14, after `runSnapshot` is implemented and tested. Flip `bench/snapshot.bench.js` import to use the new `runSnapshot`; delete `bench/stub-pipeline.js`. This produces the first REAL (non-PARTIAL) baseline measurement against the 50ms budget.

### LOCK H — Six Warlock integration fixtures land between Steps 11 and 13
Per coordinator decision: integration fixtures are a separate sub-deliverable, landed AFTER all 11 module implementations (Step 11 closes projectDamage) but BEFORE runSnapshot wiring (Step 13). They live in `bench/fixtures/warlock-*.fixture.js`. Each fixture exercises a full stage chain end-to-end. Fixture authoring is a coherent sub-deliverable, not interleaved with module work.

### LOCK I — All 18 verified-source assertions must pass
Per `engine_implementation_plan.md § 11.4`. The test list:
- V1: Spectral Blade test points (`damage_formulas.md:234–240`)
- V2: Shadow Touch 2 dark + 2 heal (`damage_formulas.md:240`)
- V3–V8: BoD body/head/spellbook/Dark-Enhancement test points (`damage_formulas.md:250–255`)
- V9–V10: BoC body/head test points (`damage_formulas.md:248–249`)
- V11: Antimagic 0.80 multiplier post-MDR (`damage_formulas.md:180–188`)
- V12: Life Drain 100% lifesteal pre-MDR (`unresolved_questions.md:270–278`)
- V13: Healing 6 test points (`healing_verification.md:59–64`)
- V14: PDR cap 65% / Defense Mastery 75% (`season8_constants.md:11`)
- V15: MDR cap 65% / Iron Will 75% (`season8_constants.md:12`)
- V16: Headshot multiplier 1.0 + 0.5 + HSbonus − HSDR (`season8_constants.md:22`)
- V17: Limb multiplier 0.5 (`season8_constants.md:23`)
- V18: Warlock baseline HP 122 (`season8_constants.md`, HR curve + patch 10)

Each becomes a test assertion in the appropriate test file (per-module unit test or integration fixture test). Phase 6 closes only when all 18 pass.

### LOCK J — Performance budget compliance
Per `engine_implementation_plan.md § 10`: full snapshot for Warlock fixture < 50ms. Per-stage budget: Stage 0: 5%, Stage 1: 5%, Stage 2: 25%, Stage 3: 5%, Stage 4: 10%, Stage 5: 10%, Stage 6: 40%. If a stage exceeds its budget, optimize it before continuing to subsequent stages — the budget split was assigned per algorithmic work analysis; an exceeding stage indicates a real performance issue, not a budget calibration error.

### LOCK K — Memoization implementation is conditional on measurement
Per Phase 5: cache key compositions are spec'd; do NOT implement the caches unless measurement shows the stage is a bottleneck. Default: pass-through, no caching. If bench measurement shows Stage 2 above its 12.5ms budget AND the gear-edit common case is a real workload concern, implement Stage 2 cache per `engine_implementation_plan.md § 7`. Document the implementation decision in the Completion Report.

---

## Phase-specific nuances you must surface in the plan

These are tensions, judgment calls, and forward-looking questions that need to be visible in the Plan Report — not buried in implementation.

1. **Test fixtures: per-module unit vs integration vs end-to-end.** Per-module unit fixtures (`src/engine/<module>.test.js`) use minimal class data exercising the module's contract — small, focused. Integration fixtures (`bench/fixtures/warlock-*.fixture.js`) are real Warlock atoms exercising stage chains. End-to-end is `bench/fixtures/max-loadout.fixture.js` + real `warlock.new.js` through `runSnapshot`. Don't conflate; each layer covers different concerns.

2. **Snapshot._internal non-enumerable property** (per `engine_implementation_plan.md § 3.11`). The Query API companions read introspection state from `Snapshot._internal` (Stage 1 atom map keyed by atomId; Stage 2 condition results). Use `Object.defineProperty(snapshot, '_internal', { value: ..., enumerable: false })` so it doesn't appear in JSON serialization or shallow inspection. Phase 6 implements per spec; if measurement / JIT issues arise, the alternative is closure-based queries (per `engine_implementation_plan.md` follow-up note).

3. **Per-pool memory budget independence** (per `engine_implementation_plan.md § 6.3`). Three pools — spell / transformation / music — each starts from the KNO-curve capacity baseline; `memorySlots` atoms add only to the pool named by their `abilityType` discriminator. Two-pass: pass 1 in buildContext computes preliminary capacity per pool; pass 2 in runSnapshot (after deriveStats) finalizes capacity with ctx-derived stat values. The `C.memorySlots_abilityType_required` rule (LOCK F) prevents authoring errors that would default to a wrong pool.

4. **Lifesteal pre-MDR computation** (per `engine_implementation_plan.md § 9.1`). `projectDamage` derives `pre_mdr_body` via the spell-damage formula up to (but excluding) the MDR clamp; threads that value into the derived-heal descriptor. This is sharper than "use the damage projection" — `damage.js::calcSpellDamage` returns post-MDR; lifesteal needs pre-MDR per `healing_verification.md:18–21`.

5. **`damage_type` deferred evaluation** (per `engine_implementation_plan.md § 3.6`). Stage 2 passes `damage_type`-conditioned atoms through unfiltered; Stage 4 routes them into `postCapMultiplicativeLayers[]` (preserving the condition); Stage 6 re-evaluates per projection (the projection's damageType is known then; the condition resolves true or false). The `C.damage_type_phase_invariant` rule (LOCK F) prevents `damage_type`-conditioned atoms from accidentally landing in `bonuses` / `perTypeBonuses` where the condition would be silently dropped.

6. **Forward-spec coverage in module code, minimal in tests.** Engine code paths must accommodate Druid form mutual exclusion (singleton `ctx.activeForm`), Bard music pool (3rd memory pool), Sorcerer `mergedSpells` (auto-derived spells via `condition: ability_selected`), `tier` condition variant, etc. Per-module tests can include one synthetic fixture per forward-spec pattern to confirm the code path exists; don't over-test (Phase 10 exercises these in earnest).

7. **`runSnapshot` is the public engine API** (LOCK C from Phase 5). Single entry point. Phase 7 wires it to UI; Phase 11 builds the full UI against it. Phase 6 must export `runSnapshot` as the named API, plus the four Query API functions (`atomsByTarget`, `atomsBySourceAbility`, `activeConditions`, `atomsByStat`).

8. **Bench harness reads from real engine after Step 14.** Pre-retirement, `bench/snapshot.bench.js` measures the stub. Post-retirement, it measures the real engine. The per-stage timing comparison (stub baseline → real first measurement) is the Phase 6 success indicator. Capture both numbers in the Completion Report.

9. **Don't optimize before measuring.** Implement straightforwardly first. Measure. Optimize hot stages identified by measurement. The 50ms budget allows for naive implementation in many places; over-optimization is premature.

10. **Memoization conditional implementation** (LOCK K). Cache key compositions are spec'd in `engine_implementation_plan.md` per-module memoization sections. Default Phase 6 behavior: no caching. If bench shows Stage 2 hot, implement per § 7 layout. Document in Completion Report which (if any) caches got implemented and why.

11. **Test count target.** Per-module test counts should match what the implementation plan calls for. E.g., `conditions.js.test.js` should have ≥ 13 unit tests (one per variant) + compound combinator tests. `damageTypeToHealType.js.test.js` should have ≥ 13 mappings tested. Flag in plan; verify in Completion Report.

12. **Stage 4's typed-damage routing table** (per `engine_implementation_plan.md § 3.6`). Stage 4 routes `typeDamageBonus`-stat atoms... wait, that stat was removed in Phase 3. The current shape: typed-stat atoms (`darkDamageBonus`, `fireDamageBonus`, etc.) carry a `damageType` implicit in their stat name. Stage 4 needs a stat-name-to-damage-type lookup table to route into `perTypeBonuses[damageType]`. Spec the table in the aggregate module's implementation; align with the typed-damage stats in `STAT_META`.

13. **`bench/snapshot.bench.js` import flip.** Currently imports the stub. Step 14 changes one import line to use the real `runSnapshot`. Test coverage on the bench harness itself: after the flip, the bench should run cleanly and produce a measurement; if it errors, the engine has a `runSnapshot`-API incompatibility with what bench expects.

14. **Phase 0 baseline as the comparison point.** Capture the stub baseline measurement before retiring (Step 14); compare to the real measurement after. This is the "did Phase 6 stay within the budget the harness expected" check.

---

## Sub-agent guidance

- **Stage 1 (Context Gather).** Spawn `Explore` for the surveys: engine surface inventory, test surface inventory, validator inventory, Warlock-fixture matrix. Each is parallelizable.
- **Stage 2 (Plan).** Main session aggregates Terse Map findings into the execution plan. `Plan` sub-agent can draft individual module test plans (test count target + verified-source assertions per module) given Stage 1's inventory.
- **Stage 4 (Execute).** Sequential per Appendix C order. Main session drives. Sub-agents only for specific lookups (e.g., "what's the exact signature of `damage.js::calcSpellDamage`?"). Do NOT spawn agents to implement modules — module implementation is the main session's work, with test-implementation discipline tightly coupled.

When you spawn a sub-agent, brief it fully (self-contained prompt). Aggregate results; keep high-level state in the main session.

---

## Guardrails (from Phase 6 "Watch for")

- **Don't optimize before measuring.** Naive implementation first; measurement-driven optimization second.
- **Class-agnostic discipline absolute.** No `if (className === ...)` or `if (abilityId === ...)` branches.
- **Validator green on Warlock throughout.** Re-run after every step.
- **Don't modify verified-math files** (`recipes.js`, `curves.js`, `damage.js`). If a need arises, surface as sign-off.
- **No shape changes without sign-off.** Shape evolution requires coordinator approval; surface, don't add.
- **No new vocabulary** without sign-off. Phase 3/4 locked the vocabulary surface; Phase 6 implements against it.
- **Forward-spec patterns must be supported in code** even if Warlock doesn't exercise them. Test them minimally with synthetic fixtures.
- **Maintain the progress document throughout Stage 4** (`docs/session-prompts/phase-6-progress.md`). Update before/after each step. Crash resilience requirement.
- **Memoization conditional.** Don't implement caches unless measurement shows hot stages.
- **`Snapshot._internal` non-enumerable.** Use `Object.defineProperty` so it doesn't pollute serialization.

---

## When in doubt

Re-read `docs/rebuild-plan.md § Phase 6` and `§ Operating protocol`. Re-read `docs/engine_implementation_plan.md` (the spec you're implementing). Re-read `docs/engine_architecture.md` (the underlying contract). Re-read `docs/perspective.md § Core principles`. Re-read this prompt's "Locked from coordinator" section.

If implementation reveals an ambiguity (you can see two defensible decisions), raise it under **Open questions** in your Plan Report. Don't pick silently.

**Begin with Stage 1.**

---

## Progress document template (`docs/session-prompts/phase-6-progress.md`)

```markdown
# Phase 6 — Execution Progress

**Stage 4 status:** in-progress | paused | complete
**Last updated:** <ISO timestamp>
**Current step:** <step number + name, or "complete">

## Pre-flight checks
- [ ] Validator baseline confirmed (warlock 0 per-class errors)
- [ ] Implementation plan fully read
- [ ] Architecture doc fully read
- [ ] src/engine/ existing surface inventoried
- [ ] bench/ existing harness inventoried

## Step 0: Validator extension (3 new rules)
- [ ] K.afterEffect_forbidden — implementation + positive/negative tests — started: <ts> / completed: <ts>
- [ ] C.memorySlots_abilityType_required — implementation + tests
- [ ] C.damage_type_phase_invariant — implementation + tests
- [ ] Validator regreen check (Warlock 0 errors)

## Step 1: damageTypeToHealType utility
- [ ] src/engine/damageTypeToHealType.js — implementation
- [ ] src/engine/damageTypeToHealType.test.js — 13 mappings tested
- [ ] Test pass + validator regreen

## Step 2: conditions module
- [ ] src/engine/conditions.js — dispatch table + 13 evaluators + compound combinators
- [ ] src/engine/conditions.test.js — per-variant tests + compound tests
- [ ] Test pass + validator regreen

## Step 3: buildContext
- [ ] src/engine/buildContext.js — availability resolver + grants cycle detection + memory-budget pass 1 + weapon-state derivation
- [ ] src/engine/buildContext.test.js — sub-behavior tests
- [ ] Test pass + validator regreen
- [ ] Bench checkpoint: Stage 0 timing

## Step 4: collectAtoms
- [ ] src/engine/collectAtoms.js — atom walk + source/atomId + afterEffect short-circuit (LOCK E)
- [ ] src/engine/collectAtoms.test.js — including viewingAfterEffect on/off variants
- [ ] Test pass + validator regreen

## Step 5: filterByConditions
- [ ] src/engine/filterByConditions.js — per-atom condition eval + damage_type pass-through + cache-key composition
- [ ] src/engine/filterByConditions.test.js
- [ ] Test pass + validator regreen
- [ ] Bench checkpoint: Stage 2 timing

## Step 6: materializeStacking
- [ ] src/engine/materializeStacking.js
- [ ] src/engine/materializeStacking.test.js
- [ ] Test pass + validator regreen

## Step 7: aggregate
- [ ] src/engine/aggregate.js — per-phase routing + typed-damage table
- [ ] src/engine/aggregate.test.js
- [ ] Test pass + validator regreen
- [ ] Bench checkpoint: Stage 4 timing

## Step 8: deriveStats
- [ ] src/engine/deriveStats.js
- [ ] src/engine/deriveStats.test.js
- [ ] Test pass + validator regreen

## Step 9: projectShield
- [ ] src/engine/projectShield.js
- [ ] src/engine/projectShield.test.js
- [ ] Test pass + validator regreen
- [ ] Bench checkpoint: Stage 6 (shield) timing

## Step 10: projectHealing
- [ ] src/engine/projectHealing.js — authored HEAL + derived-heal descriptor processing
- [ ] src/engine/projectHealing.test.js
- [ ] Test pass + validator regreen
- [ ] Bench checkpoint: Stage 6 (healing) timing

## Step 11: projectDamage
- [ ] src/engine/projectDamage.js — physical/magical dispatch + typed bonuses + post-cap layer re-eval + lifesteal pre-MDR
- [ ] src/engine/projectDamage.test.js
- [ ] Test pass + validator regreen
- [ ] Bench checkpoint: Stage 6 (damage) timing

## Step 12: Six Warlock integration fixtures
- [ ] bench/fixtures/warlock-bolt-of-darkness.fixture.js
- [ ] bench/fixtures/warlock-blood-pact.fixture.js
- [ ] bench/fixtures/warlock-life-drain.fixture.js
- [ ] bench/fixtures/warlock-exploitation-strike.fixture.js
- [ ] bench/fixtures/warlock-antimagic.fixture.js
- [ ] bench/fixtures/warlock-eldritch-shield.fixture.js
- [ ] Each fixture's stage chain test passing

## Step 13: runSnapshot
- [ ] src/engine/runSnapshot.js — orchestration + second memory pass + derived-heal back-refs + Snapshot._internal + Query API companions
- [ ] src/engine/runSnapshot.test.js — including Query API tests
- [ ] Test pass + validator regreen
- [ ] All 18 verified-source assertions integrated

## Step 14: Bench retirement
- [ ] bench/snapshot.bench.js — import flipped to runSnapshot
- [ ] bench/stub-pipeline.js — deleted
- [ ] First REAL baseline measurement captured
- [ ] Comparison to 50ms budget recorded

## Step 15: End-to-end verification
- [ ] All 18 verified-source assertions passing
- [ ] Warlock snapshot < 50ms via bench
- [ ] No regressions in pre-existing tests
- [ ] Cross-class L-rule still firing as expected (Phase 10 backlog)

## Memoization decisions
- [ ] Stage 0 cache: implemented? <yes/no + rationale>
- [ ] Stage 1 cache: implemented? <yes/no + rationale>
- [ ] Stage 2 cache: implemented? <yes/no + rationale>
- [ ] Stage 3 cache: implemented? <yes/no + rationale>
- [ ] Stage 4 cache: implemented? <yes/no + rationale>
- [ ] Stage 5 cache: implemented? <yes/no + rationale>
- [ ] Stage 6 cache: implemented? <yes/no + rationale>

## Notes / blockers
<append as encountered>

## Resume protocol
If picking up from a prior session, read this doc first. The next item is the lowest-numbered unchecked step. If a step shows "started: <ts>" without "completed: <ts>", treat as in-progress: re-verify state (re-run validator + test for that module) before deciding to redo or continue.
```
