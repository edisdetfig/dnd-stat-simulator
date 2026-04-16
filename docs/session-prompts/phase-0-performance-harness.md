# Phase 0 — Performance Harness — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 0 of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo. Read, don't assume.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker. Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage/heal projections + available abilities. No time passes, no events fire. See `docs/perspective.md` for the full mental model.

The project is mid-rebuild:
- The class-data shape (`src/data/classes/class-shape.js`) is **locked**.
- The engine has been stripped down to verified-math only (`src/engine/curves.js`, `damage.js`, `recipes.js`). The rest was archived.
- `App.jsx` is broken — imports resolve to archived paths. UI re-wire is later.
- Real class data has NOT yet been migrated to the locked shape.

You are executing **Phase 0** of the 13-phase rebuild plan.

---

## Mandatory reading order

Read these files before anything else. Do not skim — Phase 0's correctness depends on understanding the planned pipeline.

1. **`docs/rebuild-plan.md`** — authoritative roadmap. Read in full: Operating protocol, Constraints, and Phase 0.
2. `CLAUDE.md` — project-level guidance.
3. `docs/perspective.md` — mental model + how-we-work principles.
4. `src/data/classes/class-shape.js` — class-data schema (ABILITY shape, atoms, conditions).
5. `src/data/classes/class-shape-examples.js` — concrete patterns.
6. `docs/class-shape-progress.md` — locked decisions that will constrain engine design.
7. `src/engine/curves.js`, `src/engine/damage.js`, `src/engine/recipes.js` — extant verified-math engine code.
8. `src/data/stat-meta.js`, `src/data/constants.js` — canonical stat + enum registries.
9. `package.json`, `vitest.config.js` (if present) — existing test infrastructure.

---

## Your mission — Phase 0 in one sentence

Establish the **< 50ms snapshot recompute budget operationally** — build the benchmark harness, define the reference fixture, identify stage-boundary memoization checkpoints — **before the engine exists to measure**.

See `docs/rebuild-plan.md § Phase 0` for the authoritative Goal / Work / Watch for / Success criteria. Do not improvise scope beyond what's specified there.

---

## The three-priority hierarchy (governs every tradeoff)

1. **Performance first.** < 50ms snapshot recompute for the largest realistic build.
2. **Class-agnostic, second.** New classes = data-only changes.
3. **Engine-mechanic extension ease, third.** New mechanic types extend dispatch tables, never rewrite pipelines.

Top of list wins when they conflict. Cite this hierarchy explicitly when making tradeoff calls in your plan.

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 0 in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

### Stage 1 — Context Gather → Terse Map
Read the files listed above. Use the `Explore` sub-agent for broad surface-area surveys (e.g., "what testing/benchmarking infra exists in this repo?"). Produce a written **Terse Map** capturing:
- What exists now relevant to Phase 0 (testing infra, engine surface, class-data state, benchmarking patterns if any).
- What's missing.
- What's uncertain or ambiguous.

### Stage 2 — Plan
Produce a detailed execution plan covering:

- **Benchmark harness technology.** Vitest `bench` vs standalone Node script. Decide with rationale tied to the priorities.
- **Recompute-budget document outline.** What counts (full pipeline: ctx build → derived stats + damage projections + heal projections + active abilities list), what doesn't (UI render, initial page load), how it maps to the planned Stage 0–6 pipeline.
- **Stage-boundary checkpoint specification.** For each of Stages 0–6, list the inputs each stage will depend on → what invalidates its cached output. Use the pipeline model from `docs/rebuild-plan.md § Phase 5`.
- **Reference-build fixture definition.** A Warlock full loadout. Since real Warlock data isn't yet migrated, specify HOW you'll represent the fixture (options surfaced below).
- **Initial baseline measurement approach.** Since no real pipeline exists yet, what DO you measure now vs what's explicitly deferred to Phase 6?
- **Exact files to create/modify** (full paths).
- **Test plan for the harness itself** (so it doesn't silently rot).
- **Mapping back to Phase 0 success criteria, item by item.**
- **Open questions / decisions you need the user to resolve** before executing.
- **Risks identified.**

### Stage 3 — STOP — Plan Report
Emit the **Plan Report** in exactly this format:

```markdown
# Phase 0 — Plan Report

## Terse map
[bullets from Stage 1]

## Execution plan
[detailed plan from Stage 2]

## Decisions requiring user sign-off
[numbered list]

## Success-criteria coverage
| Criterion | Plan addresses it via |
|---|---|
| Benchmark harness runs | ... |
| Baseline measured | ... |
| Checkpoint locations identified | ... |

## Risks
[bullets]

## Open questions
[bullets]
```

**WAIT for explicit user sign-off.** If the user gives feedback, revise and re-emit. Do not proceed to Stage 4 without explicit "approved" or equivalent.

### Stage 4 — Execute
Once signed off, execute the plan. Use sub-agents for independent parallel work where it helps. Stay strictly inside the signed-off plan — any mid-execution discovery that changes scope is a surfaced question, not a unilateral decision.

### Stage 5 — STOP — Completion Report
Emit the **Completion Report** in exactly this format:

```markdown
# Phase 0 — Completion Report

## Files created / modified
[paths + one-line purpose each]

## What was built
[summary tied to the plan]

## Baseline measurements
[numbers — or explicit "deferred to Phase 6" rationale]

## Deviations from plan
[what changed mid-execution and why — or "none"]

## Success-criteria status
| Criterion | Status | Evidence |
|---|---|---|
| Benchmark harness runs | DONE / DEFERRED / N/A | ... |
| Baseline measured | ... | ... |
| Checkpoint locations identified | ... | ... |

## Implications for downstream phases
[anything Phase 1+ needs to know]

## Follow-ups (non-blocking)
[anything noticed but out of scope]
```

**WAIT for explicit user sign-off.** Feedback may require revision. Do not declare Phase 0 complete without explicit sign-off.

---

## Phase 0 nuances you must surface in the plan

These are real tensions you must address in the Plan Report, not hide inside implementation choices.

1. **"Benchmark before engine exists" is a tension.** The rebuild plan explicitly says *"Establish the < 50ms budget operationally before there's an engine to measure."* Two defensible paths: (a) measure an empty/stub pipeline now as a sanity floor, (b) ship harness infrastructure + checkpoint definitions now, defer real baseline to Phase 6 when the engine lands. Pick one, justify, and surface the pick for sign-off.

2. **Reference fixture problem.** The spec calls for "Warlock with full perks/spells/gear loadout" — but Warlock data isn't yet in the new shape (that's Phase 3). Fixture options:
   - (a) Minimal hand-authored new-shape fixture inline in the benchmark file.
   - (b) Stub that imports a future `warlock.new.js` whose creation is Phase 2 (creates a cross-phase dependency).
   - (c) Use `class-shape-examples.js` patterns to stitch together a synthetic but full-scale fixture.
   - (d) Other.
   Pick, justify, surface.

3. **Stage-boundary checkpoints are forward-declarations.** They describe inputs each FUTURE stage will depend on, per the pipeline model in `docs/rebuild-plan.md § Phase 5` and the architecture doc to-be-written in Phase 3. Your checkpoint spec may need updating during Phase 5 — that's expected. Document the assumption.

---

## Sub-agent guidance

- **Context Gather (Stage 1).** Spawn the `Explore` sub-agent for broad surface-area surveys (testing/benchmarking prior art, repo structure). Cheaper than reading many files serially.
- **Plan (Stage 2).** Optionally spawn the `Plan` sub-agent for the stage-boundary checkpoint specification if the pipeline model feels dense.
- **Execute (Stage 4).** Phase 0 is small-scope; main session can execute directly. Use sub-agents only for specific, independent file-creation tasks.

When you spawn a sub-agent, brief it fully (self-contained prompt — it has no memory of your session). Aggregate results; keep high-level state in the main session.

---

## Guardrails (from Phase 0 "Watch for")

- **No premature optimization.** Do not implement memoization in Phase 0. Design stage boundaries so it CAN be added later. Phase 0 ends with checkpoint *identification*, not implementation.
- **Realistic fixture.** Trivial builds won't expose performance issues. If you go with an inline new-shape fixture, populate it to approximate the largest realistic Warlock loadout (full perks, spells loaded to memory cap, toggled abilities active, gear stats present).
- **Don't invent engine.** Phase 0 is harness + budget + checkpoints. If you find yourself writing `runSnapshot()` stubs that do real pipeline work beyond the minimum the benchmark needs as a target, stop.
- **Stay in scope.** Any scope expansion is a sign-off-gate question, not a unilateral call.

---

## When in doubt

Re-read `docs/rebuild-plan.md § Phase 0` and `§ Operating protocol`. Re-read `docs/perspective.md § Core principles`. If still in doubt, the right move is to raise it under **Open questions** in your Plan Report, not to guess.

**Begin with Stage 1.**
