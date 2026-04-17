# Phase 5 — Engine Implementation Plan — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 5 of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo. Read, don't assume.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker. Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage/heal projections + available abilities. No time passes, no events fire. See `docs/perspective.md` for the full mental model.

The project is mid-rebuild:
- The class-data shape (`src/data/classes/class-shape.js`) is **locked**.
- The engine has been stripped to verified-math only (`src/engine/curves.js`, `damage.js`, `recipes.js`).
- Phase 0 landed a performance harness + pinned engine API surface.
- Phase 1 landed a class-shape validator.
- Phase 2 migrated **Warlock** as the anchor class.
- Phase 3 produced **`docs/engine_architecture.md`** (the engine's public contract — 22 sections + glossary) and **`docs/vocabulary.md`**, plus the typed-damage-stat migration.
- Phase 4 verified the contract against Warlock + executed 5 Phase 3 follow-up re-authors + STAT_META cleanup.
- A small post-Phase-4 refactor introduced `targetMaxHpRatio` on DAMAGE_ATOM (symmetric with `lifestealRatio`) and reverted Phase 4's dual-context `percentMaxHealth` interpretation back to single-context. EX Strike's HEAL_ATOM was dropped; the `targetMaxHpRatio: 0.10` lives on its damage atom now.

You are executing **Phase 5** of the 13-phase rebuild plan: **decompose the engine into modules with clear contracts and test boundaries.** No engine code is written in Phase 5 — that's Phase 6's job. Phase 5 produces an **implementation plan** (a document) that a Phase 6 implementer follows.

---

## Mandatory reading order

Read these files before anything else. Do not skim.

1. **`docs/rebuild-plan.md`** — authoritative roadmap. Read in full: Operating protocol, Constraints, and **Phase 5** in detail. Pay attention to Watch-for items.
2. `CLAUDE.md` — project-level guidance.
3. `docs/perspective.md` — mental model.
4. **`docs/engine_architecture.md`** — **the contract Phase 5 plans to implement.** Read in full. Module boundaries you propose must respect every rule, every stage spec, every atom contract documented here.
5. **`docs/vocabulary.md`** — controlled-vocabulary glossary.
6. `docs/class-shape-progress.md` — locked decisions + engine architecture open questions (Q1 resolved by Phase 3; Q2 — Stage 2 cache-key granularity — is a Phase 5 deliverable).
7. `src/data/classes/class-shape.js` — locked schema.
8. `src/data/classes/class-shape-validator.js` — validator logic; rule codes.
9. `src/data/constants.js` — canonical vocabularies.
10. `src/data/stat-meta.js` — `STAT_META`.
11. `src/engine/recipes.js`, `src/engine/curves.js`, `src/engine/damage.js` — verified math the engine pipeline calls into. Phase 5 modules wrap and orchestrate these; do not modify.
12. **`src/data/classes/warlock.new.js`** — the anchor class. Every module's input/output spec must round-trip Warlock cleanly.
13. `docs/damage_formulas.md`, `docs/healing_verification.md`, `docs/season8_constants.md` — verified math. Module test plans cite these for projection-correctness assertions.
14. `bench/fixtures/max-loadout.fixture.js` — Phase 0 fixture; the build the < 50ms budget targets.
15. `bench/` — any existing bench harness files. Phase 0 introduced these; Phase 5 plan extends them per stage.
16. **Commits to read** (read each commit message, not just the diff):
    - `0622189` — Phase 0 (performance harness + checkpoints)
    - `c5160d7` — Phase 1 (validator)
    - `f8431ad` — Phase 2 (Warlock migration)
    - `5f99a80` — Phase 3 (architecture doc + vocabulary + typed-damage migration)
    - `f93dec2` — Phase 4 (verification + 5 re-authors + STAT_META cleanup)
    - `f682439` — post-Phase-4 refactor (targetMaxHpRatio + dual-context elimination)

**Use the `Explore` sub-agent** for cross-cutting reads (e.g., "every file in `src/engine/` and what it exports"; "every `bench/` file and what it measures"; "every Warlock atom shape that needs to round-trip a module's I/O contract").

---

## Your mission — Phase 5 in one sentence

Produce `docs/engine_implementation_plan.md` such that a Phase 6 implementer can build each engine module to spec — module name, inputs, outputs, dependencies, test approach, memoization boundaries, performance budget share — without re-deriving any architectural decisions.

See `docs/rebuild-plan.md § Phase 5` for the authoritative Goal / Work / Watch for / Success criteria.

---

## The three-priority hierarchy (governs every tradeoff)

1. **Performance first.** Snapshot recompute < 50ms for the largest realistic build. Module boundaries enable memoization at stage transitions. Identify heavy stages early; assign budget shares.
2. **Class-agnostic, second.** Adding a class is a data change only. No module branches on class, ability, or stat identity. Dispatch is enum-driven or data-driven.
3. **Engine-mechanic extension ease, third.** New mechanic types extend dispatch tables, never rewrite pipelines.

When priorities conflict, top of list wins.

**Plus the accuracy-first doctrine:** module test plans cite verified-source line numbers for projection-correctness assertions; no invented numbers.

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 5 in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

### Stage 1 — Context Gather → Terse Map

Read the files above. Use `Explore` sub-agents for:
- **Module surface inventory.** Walk `src/engine/` (curves.js, damage.js, recipes.js); inventory exports, what each function consumes, what it returns. Phase 5 modules orchestrate these — your plan must thread them in correctly.
- **Phase 0 harness inventory.** Walk `bench/`; inventory existing fixtures, what they measure, what checkpoints exist. Phase 5's per-stage budget split builds on this.
- **Architecture-doc → module mapping.** For each section of `engine_architecture.md` that specifies pipeline behavior (§3 stages, §4 Snapshot shape, §5 ctx shape, §6 atom contracts, §7 phase contract, §8 availability resolver, §9 memory budget, §10 mutual exclusion, §11 condition dispatcher, §12 scalesWith, §13 stacking, §14 afterEffect, §15 damage projection, §16 heal projection, §17 shield projection, §18 class-resource mechanics, §19 hp_below, §20 query API), identify which Phase 5 module owns it.
- **Warlock pattern coverage check.** For every Warlock atom that exercises a non-trivial mechanic (resource scaling, effect_active, hp_below, weapon_type, percentMaxHealth, lifestealRatio, targetMaxHpRatio, afterEffect, etc.), identify which module(s) participate in producing the correct snapshot output.

Produce a written **Terse Map** covering:
- Engine module list (per Phase 5 expected: `buildContext`, `collectAtoms`, `filterByConditions`, `conditions`, `materializeStacking`, `aggregate`, `deriveStats`, `projectDamage` / `projectHealing` / `projectShield`, `runSnapshot`).
- Per module: one-line responsibility, principal inputs, principal outputs, dependencies (other modules + engine constants + verified-math files).
- Architecture-doc → module ownership matrix.
- Warlock-pattern → module participation matrix.
- Performance budget split candidates (which stages likely heaviest).
- Open architectural questions (very few expected; engine open Q2 — Stage 2 cache-key granularity — is one).

### Stage 2 — Plan

Produce a detailed execution plan covering:

**`docs/engine_implementation_plan.md` outline.** Section structure (mandatory):

1. **Purpose & three-priority hierarchy.**
2. **Module list** — one-line table summarizing all modules.
3. **Per-module contracts.** For each module:
   - Module path (proposed: `src/engine/<name>.js`).
   - Responsibility (one paragraph).
   - Public API (function signatures with TypeScript-style inline types).
   - Inputs (precise type, citing architecture-doc section if relevant).
   - Outputs (precise type, citing architecture-doc section).
   - Dependencies (other engine modules; engine constants imported; verified-math files called into).
   - Purity classification: pure / pure-with-constants-read / ctx-reading-only / impure (and why).
   - Memoization checkpoint: what inputs the output depends on (the cache key set); whether memoization is recommended at this boundary.
   - Performance budget share (% of the < 50ms budget; rationale).
   - Test approach: unit (this module in isolation), integration (this module + previous), with explicit test fixture references.
   - Verified-source citations for any projection-math correctness assertions.
4. **Pipeline orchestration.** How `runSnapshot` threads modules together. Order of execution. Where memoization checkpoints fire.
5. **Stage transition contracts.** What invariants hold between Stage N output and Stage N+1 input.
6. **Stage 0 detail sections.** Memory-budget two-pass resolution; grants chain cycle detection; availability resolver; weapon-state derivation.
7. **Stage 2 cache-key layout** (engine open Q2 resolution). Fine-grained dependency-declared key vs coarse whole-ctx; commit to one and justify.
8. **Stage 1 afterEffect main-state atom drop** (per architecture doc §14). Implemented at Stage 1 (structural short-circuit) — not Stage 2 (filter). Spec the behavior.
9. **Stage 6 derivation rules.** `lifestealRatio` (§16.2) + `targetMaxHpRatio` (§16.4) + `percentMaxHealth` (§16.3) + `damageTypeToHealType()` family-collapse utility — module ownership and execution order.
10. **Performance budget split table.** Per-stage % of < 50ms.
11. **Test plan summary.** Unit + integration + end-to-end coverage map. Test fixture inventory. Verified-source assertion inventory.
12. **Forward-spec patterns** the implementation must accommodate even though Warlock doesn't exercise them (Druid mutual exclusion; Bard music pool; Sorcerer mergedSpells; etc.) — surface so Phase 6 doesn't paint into a corner.

**Plan must also cover:**
- File creation strategy (single comprehensive `engine_implementation_plan.md` file).
- Commits-to-cite when introducing patterns (the Phase 0 harness, the Phase 3 architecture doc, the targetMaxHpRatio refactor, etc.).
- Mapping to Phase 5 success criteria, item by item.
- Decisions requiring user sign-off (numbered list — including the Stage 2 cache-key layout decision).
- Risks and open questions.

### Stage 3 — STOP — Plan Report

Emit the **Plan Report** in exactly this format:

```markdown
# Phase 5 — Plan Report

## Terse map
[bullets / tables from Stage 1: module list, ownership matrix, Warlock pattern matrix, budget candidates]

## Execution plan
[detailed plan from Stage 2: section outline, per-module contracts, orchestration, budget split, test plan]

## Decisions requiring user sign-off
[numbered list — including Stage 2 cache-key layout, performance budget split percentages, any other architectural calls]

## Success-criteria coverage
| Criterion | Plan addresses it via |
|---|---|
| Module list documented | ... |
| Each module has clear contract | ... |
| Test plan per module | ... |
| Stage boundaries identified for memoization | ... |
| Performance budget split assigned | ... |

## Risks
[bullets]

## Open questions
[bullets]
```

**WAIT for explicit user sign-off.** Revise and re-emit if feedback comes back. Do not proceed to Stage 4 without explicit "approved."

### Stage 4 — Execute

Once signed off, execute the plan. Maintain a working progress document at `docs/session-prompts/phase-5-progress.md` for crash resilience (template at the end of this prompt). Update after each step.

**Discipline:**
- Stay strictly inside the signed-off plan.
- Any architectural decision NOT already locked (in `class-shape-progress.md § Locked decisions`, the architecture doc, this prompt's "Locked from coordinator" section, or this session's signed-off plan) requires surfacing before acting.
- **No engine code.** Phase 5 produces a document. If you find yourself writing `src/engine/buildContext.js`, stop — that's Phase 6.
- The Phase 5 deliverable is `docs/engine_implementation_plan.md`. It's a long, structured document. Use the section outline you signed off on; don't add TBDs.
- Cite verified sources by line number for any projection-math correctness assertion in test plans.

### Stage 5 — STOP — Completion Report

Emit the **Completion Report** in exactly this format:

```markdown
# Phase 5 — Completion Report

## Files created / modified
[paths + one-line purpose each]

## What was built
[summary tied to the plan]

## Module list delivered
| Module | Path | Responsibility | Purity | Budget share |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Per-module contract coverage
| Module | Inputs spec'd | Outputs spec'd | Memoization spec'd | Test plan spec'd |
|---|---|---|---|---|
| ... | ✓ / ✗ | ✓ / ✗ | ✓ / ✗ | ✓ / ✗ |

## Stage 2 cache-key resolution
[which approach chosen + rationale]

## Performance budget split
| Stage | % of 50ms | Rationale |
|---|---|---|

## Forward-spec patterns covered
[list with anticipated first consumer]

## Deviations from plan
[what changed and why — or "none"]

## Success-criteria status
| Criterion | Status | Evidence |
|---|---|---|

## Findings (for later phases)
[anything for Phase 6 / Phase 8 / etc.]

## Follow-ups (non-blocking)
[anything noticed out of scope]
```

**WAIT for explicit user sign-off.** Revise per feedback. Do not declare Phase 5 complete without explicit sign-off.

---

## Locked from coordinator (binding for Phase 5)

These are settled — do not re-litigate. Implement as specified.

### LOCK A — Phase 5 produces a document, not code
The deliverable is `docs/engine_implementation_plan.md`. No `src/engine/*.js` file is created or modified in Phase 5. Phase 6 builds the modules from this plan. This is non-negotiable — the rebuild-plan.md operating protocol depends on the spec / implementation separation.

### LOCK B — Module list follows the architecture doc
Modules are: `buildContext`, `collectAtoms`, `filterByConditions`, `conditions` (the condition evaluator dispatch table — Stage 2.5, used by `filterByConditions`), `materializeStacking`, `aggregate`, `deriveStats`, `projectDamage`, `projectHealing`, `projectShield`, `runSnapshot`. If the architecture doc surfaces a sub-module not in this list (e.g., a `damageTypeToHealType` utility), include it as a small utility module under whatever stage owns it; don't grow the top-level list.

### LOCK C — `runSnapshot` is the public engine API
The single entry point Phase 7 / Phase 11 UI calls. Signature pinned in Phase 0. The implementation plan must specify how `runSnapshot` orchestrates the modules; do not propose alternative top-level APIs.

### LOCK D — Stage transitions enforce purity
- Stage 0 produces `ctx`. After Stage 0, `ctx` is **read-only** (perspective.md core principle).
- Stages 1–6 are pure functions of (Stage N input, ctx, engine constants).
- The implementation plan's per-module purity classification must be honest. If a module needs to read ctx, label it `ctx-reading-only`. If a module reads engine constants (STAT_META, EFFECT_PHASES, etc.), label it `pure-with-constants-read`. If it reads neither, label it `pure`.

### LOCK E — afterEffect main-state atom drop is at Stage 1
Per architecture doc §14, when `ctx.viewingAfterEffect` includes an ability id, that ability's main-state atoms (effects/damage/heal/shield) are dropped from collection — they never reach Stages 2–6. This is a structural short-circuit at Stage 1, NOT a filter at Stage 2 (Stage 2 filters by atom-level condition; Stage 1 filters by parent-ability-level state). The implementation plan must spec this explicitly in `collectAtoms` module's contract.

### LOCK F — Engine open Q2 resolves in Phase 5
`docs/class-shape-progress.md § Engine architecture open questions` Q2 (Stage 2 cache-key granularity) must be resolved as part of this phase. Two candidates:
- **Fine-grained dependency-declared key** — Stage 2 declares its dependency subset of ctx (`activeBuffs`, `weapon_type`, `player_state`, `equipment`, `creature_type`, `damage_type`, `environment`, `tier`, `hpFraction`); cache key derived from those fields only.
- **Coarse whole-ctx key** — cache key is a hash of the entire ctx; simpler invariants, more cache misses.
The implementation plan commits to one (with rationale tied to performance) — not "TBD," not "decide in Phase 6."

### LOCK G — Performance budget split is a Phase 5 deliverable
Don't defer the % per stage to Phase 6. Estimate based on Phase 0 baseline + Warlock atom counts + the algorithmic work each stage does. Stage 6 (projection math through `applyDamage` / `calcHealing`) is likely heaviest; Stage 2 (condition evaluation) likely second. Even rough estimates pin Phase 6's optimization priorities.

### LOCK H — Test plans cite verified sources by line number
Every projection-correctness assertion in the test plan cites `damage_formulas.md` / `healing_verification.md` / `season8_constants.md` line numbers. Phase 6 implementations will write tests against these; Phase 5 spec'ing the citations means Phase 6 doesn't have to re-derive them.

---

## Phase-specific nuances you must surface in the plan

These are tensions, judgment calls, and forward-looking questions that need to be visible in the Plan Report — not buried in implementation.

1. **Module-boundary strictness.** Stage 4 (aggregate) shouldn't filter atoms; that's Stage 2's job. Stage 5 (deriveStats) shouldn't aggregate; that's Stage 4. The plan must enforce this through module API design — Stage 4's input type is "filtered + materialized atoms"; Stage 5's input type is "bonuses object." Type discipline is the boundary.

2. **Pure-vs-impure classification rigor.** Don't hand-wave. If a module reads `ctx.viewingAfterEffect`, it's ctx-reading-only. If it reads `STAT_META`, it's pure-with-constants-read. If it reads neither, it's pure. This affects testability + memoization; honesty matters.

3. **Memoization checkpoint per stage transition.** For each stage transition (0→1, 1→2, 2→3, 3→4, 4→5, 5→6), declare: (a) cache key composition, (b) whether memoization is worth implementing in Phase 6 (vs deferring until measurement shows a hot stage). Don't implement memoization unless measurement shows the stage is a bottleneck — but spec the cache key composition so memoization can be added without refactoring.

4. **Stage 2 cache-key layout (engine open Q2 — LOCK F).** Recommend fine-grained dependency-declared per LOCK F intro. Justify against Stage 2's algorithmic structure: condition evaluation reads a small subset of ctx; declaring that subset means most condition-irrelevant ctx changes (e.g., gear toggles) don't invalidate the Stage 2 cache. If you propose coarse instead, justify against measurement risk.

5. **Stage 1 afterEffect short-circuit (LOCK E).** `collectAtoms`'s contract: walk `ctx.activeAbilityIds`; for each ability, if `ctx.viewingAfterEffect.has(abilityId)`, emit ONLY the afterEffect's effects[] atoms (skip the parent ability's effects/damage/heal/shield); else emit the parent ability's atoms (skip afterEffect). Spec this explicitly.

6. **Stage 0 memory-budget two-pass resolution.** Spec the algorithm: pass 1 computes total `memorySlots` capacity (per `abilityType` pool — spell, transformation, music) by summing the relevant memorySlots-stat atoms from selected perks/skills; pass 2 walks `selectedSpells` (in order) consuming capacity, marking each ability `active` (capacity available) or `locked` (capacity exhausted). The order matters — spec how it's determined (probably user-chosen ordering preserved in the selection list).

7. **Stage 0 grants chain cycle detection.** Per architecture doc §8, grants can chain (ability A grants ability B which grants ability C). Spec a depth limit (architecture doc says 3) + cycle detection (a visited set during resolution). Surface what happens if a cycle is detected (drop the cycling grant; log; continue).

8. **Stage 6 module split (`projectDamage` / `projectHealing` / `projectShield`).** Each is a separate file? Or one file with three exports? The plan recommends three files for module-boundary clarity (each owns one projection type); each file's `damageTypeToHealType` utility is a tiny module imported by both `projectDamage` (lifesteal derivation) and `projectHealing` (HoT). Justify your choice.

9. **Stage 2.5 conditions module shape.** The condition dispatcher is a dispatch table: `CONDITION_TYPES → evaluator(condition, ctx, abilityShape) → boolean`. `filterByConditions` calls into it once per atom. Spec the module's shape — exported dispatch table + helper for compound (all/any/not) conditions; per-variant evaluator functions.

10. **Performance budget split honesty.** A < 50ms budget across 7 stages averages ~7ms/stage, but distribution isn't uniform. Stage 6 (per-atom projection math through `applyDamage` / `calcHealing`) is heaviest because it loops over every active damage/heal atom and runs full formula evaluation. Stage 2 (condition evaluation) is second because it walks every atom's condition tree. Stages 4–5 (aggregation + recipes) are computationally light. Stage 0 is one-shot. Rough estimates: Stage 0 = 5%, Stage 1 = 5%, Stage 2 = 25%, Stage 3 = 5%, Stage 4 = 10%, Stage 5 = 10%, Stage 6 = 40%. Surface your numbers + rationale; user can adjust.

11. **Test fixture strategy.** Three layers:
    - **Per-module unit fixtures** — minimal class data exercising the module's contract (e.g., a 1-perk class for `collectAtoms`).
    - **Integration fixtures** — Warlock builds for stage-pair tests (e.g., `collectAtoms` + `filterByConditions` end-to-end).
    - **End-to-end fixtures** — `bench/fixtures/max-loadout.fixture.js` (the Phase 0 reference build) for `runSnapshot`.
    Spec which test fixtures live where (`src/engine/<module>.test.js` for unit; new `bench/fixtures/<scenario>.fixture.js` for integration; existing fixture for end-to-end).

12. **Verified-source assertion inventory.** Bolt of Darkness body/head test points (damage_formulas.md), Life Drain 100% lifesteal (unresolved_questions.md:270–278), Antimagic 0.80 multiplier (damage_formulas.md:180–188), Shadow Touch flat 2 dark + 2 heal (damage_formulas.md:149–153), HP recipe (season8_constants.md). Each test point becomes a Phase 6 integration test assertion. Inventory them in the plan so Phase 6 has the test list.

13. **Forward-spec patterns Phase 6 must accommodate.** Druid form mutual exclusion (Stage 0's availability resolver respects it; ctx.activeForm is a singleton); Bard music memory pool (Stage 0's memory budget validator handles 3 pools — spell / transformation / music); Sorcerer mergedSpells (Stage 0's availability resolver evaluates `condition: ability_selected` for auto-derived spells); `tier` condition variant (Stage 2.5 dispatch table includes `tier` evaluator even though Warlock doesn't exercise it). Surface these so Phase 6 doesn't paint into a corner with Warlock-only assumptions.

14. **No engine code in Phase 5.** Phase 5 produces `engine_implementation_plan.md`. Phase 6 builds. If you find yourself writing module bodies in this session, stop.

---

## Sub-agent guidance

- **Stage 1 (Context Gather).** Spawn `Explore` for the surveys: src/engine/ surface inventory, bench/ inventory, architecture-doc → module ownership mapping, Warlock-pattern → module participation matrix. Each is parallelizable.
- **Stage 2 (Plan).** `Plan` sub-agent can draft individual per-module contracts given the Terse Map's responsibility line. You aggregate + harmonize purity classifications + memoization checkpoints + budget split.
- **Stage 4 (Execute).** Document writing is sequential. Main session does synthesis. Sub-agents only for specific lookups (e.g., "what does `applyDamage` in `damage.js` actually return?").

When you spawn a sub-agent, brief it fully (self-contained prompt — it has no memory of yours).

---

## Guardrails (from Phase 5 "Watch for")

- **Don't conflate stages.** Stage 4 (aggregation) shouldn't filter atoms; that's Stage 2's job. Module API types enforce.
- **Pure functions wherever possible.** `ctx` is read-only after Stage 0. Honest purity classification per LOCK D.
- **Performance budget split.** Identify heavy stages early; don't pretend uniform.
- **Don't implement modules.** Phase 5 produces the plan. Phase 6 implements.
- **Don't introduce TBDs in `engine_implementation_plan.md`.** Open architectural items go to `class-shape-progress.md § Engine architecture open questions` or `rebuild-plan.md`. Engine open Q2 resolves in this phase per LOCK F.
- **Don't deviate from locked decisions.** The 8 LOCKs above + every entry in `class-shape-progress.md § Locked decisions` + every section of `engine_architecture.md` are binding.
- **Validator must stay green on Warlock.** No data changes are required by Phase 5; if you need one, surface as sign-off.
- **No new vocabulary.** Phase 3/4 locked the surface. Vocabulary additions = sign-off-gate question.
- **Maintain the progress document throughout Stage 4** (`docs/session-prompts/phase-5-progress.md`). Update before/after each step.

---

## When in doubt

Re-read `docs/rebuild-plan.md § Phase 5` and `§ Operating protocol`. Re-read `docs/engine_architecture.md` (the contract you're planning to implement). Re-read `docs/perspective.md § Core principles`. Re-read this prompt's "Locked from coordinator" section.

If a module's boundary is genuinely ambiguous (you can see two defensible decompositions), raise it under **Open questions** in your Plan Report. Don't pick silently.

**Begin with Stage 1.**

---

## Progress document template (`docs/session-prompts/phase-5-progress.md`)

```markdown
# Phase 5 — Execution Progress

**Stage 4 status:** in-progress | paused | complete
**Last updated:** <ISO timestamp>
**Current step:** <step name, or "complete">

## Pre-flight checks
- [ ] Architecture doc fully read
- [ ] Vocabulary doc fully read
- [ ] src/engine/ surface inventoried
- [ ] bench/ harness inventoried

## Document deliverable: docs/engine_implementation_plan.md
Section progress (per the section outline signed off in the Plan):
- [ ] §1 Purpose & three-priority hierarchy
- [ ] §2 Module list summary table
- [ ] §3 Per-module contracts:
  - [ ] §3.1 buildContext
  - [ ] §3.2 collectAtoms
  - [ ] §3.3 filterByConditions
  - [ ] §3.4 conditions (dispatch table)
  - [ ] §3.5 materializeStacking
  - [ ] §3.6 aggregate
  - [ ] §3.7 deriveStats
  - [ ] §3.8 projectDamage
  - [ ] §3.9 projectHealing
  - [ ] §3.10 projectShield
  - [ ] §3.11 runSnapshot
  - [ ] §3.12 damageTypeToHealType utility
- [ ] §4 Pipeline orchestration
- [ ] §5 Stage transition contracts
- [ ] §6 Stage 0 detail (memory budget two-pass; grants chain cycle detection; availability resolver; weapon-state derivation)
- [ ] §7 Stage 2 cache-key layout (engine open Q2 resolution)
- [ ] §8 Stage 1 afterEffect short-circuit
- [ ] §9 Stage 6 derivation rules (lifestealRatio + targetMaxHpRatio + percentMaxHealth + family-collapse utility)
- [ ] §10 Performance budget split table
- [ ] §11 Test plan summary
- [ ] §12 Forward-spec patterns

## Verification gates passed
- [ ] No engine code created (per LOCK A)
- [ ] All per-module purity classifications honest (per LOCK D)
- [ ] All test-plan citations re-verified by re-reading cited spans (per LOCK H)
- [ ] No TBDs introduced

## Notes / blockers
<append as encountered>

## Resume protocol
If picking up from a prior session, read this doc first. The next item is the lowest-numbered unchecked section.
```
