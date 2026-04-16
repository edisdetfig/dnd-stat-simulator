# Phase 1 — Class-Shape Validator — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 1 of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo. Read, don't assume.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker. Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage/heal projections + available abilities. No time passes, no events fire. See `docs/perspective.md` for the full mental model.

The project is mid-rebuild:
- The class-data shape (`src/data/classes/class-shape.js`) is **locked**.
- The engine has been stripped to verified-math only (`src/engine/curves.js`, `damage.js`, `recipes.js`).
- Phase 0 landed a performance harness + pinned engine API surface (`docs/performance-budget.md`).
- Real class data (`barbarian.js`, `warlock.js`, …) has NOT been migrated to the locked shape yet — that's Phase 2 (Warlock anchor) and Phase 10 (remaining 9).

You are executing **Phase 1** of the 13-phase rebuild plan. Your output becomes **the safety net that Phase 2 authors use while migrating Warlock** and that Phase 10 authors use for the remaining classes.

---

## Mandatory reading order

Read these files before anything else. Do not skim.

1. **`docs/rebuild-plan.md`** — authoritative roadmap. Read in full: Operating protocol, Constraints, and **Phase 1** in detail (the validation items A–L are your spec).
2. `CLAUDE.md` — project-level guidance.
3. `docs/perspective.md` — mental model + how-we-work principles.
4. `src/data/classes/class-shape.js` — class-data schema. **This is what you validate against.**
5. `src/data/classes/class-shape-examples.js` — concrete patterns; source of positive-case fixtures.
6. `docs/class-shape-progress.md` — locked decisions and the "Engine architecture open questions" section (do not try to resolve those here).
7. `src/data/constants.js` — canonical enum registry (`EFFECT_PHASES`, `CONDITION_TYPES`, `PLAYER_STATES`, `WEAPON_TYPES`, `EFFECT_TARGETS`, etc.).
8. `src/data/stat-meta.js` — `STAT_META`, `STAT_OPTIONS`.
9. `src/engine/recipes.js` — for `RECIPE_IDS` (the two-namespace model: STAT_META keys vs recipe IDs).
10. All 10 class files under `src/data/classes/*.js` — the current v3 data you'll be pointing the validator at. **Don't modify them in this phase.** They will ALL fail validation because they use old patterns; the validator output IS the migration to-do list for Phases 2 and 10.

---

## Your mission — Phase 1 in one sentence

Build a class-shape validator that runs against every class file on `npm test`, reads its rules from canonical sources (so it never rots), and produces a precise, digestible migration to-do list for every class — including catching forbidden legacy fields (the Phase 1 plan's item K) that indicate incomplete migrations.

See `docs/rebuild-plan.md § Phase 1` for the authoritative Goal / Work / Watch for / Success criteria and the detailed item-A-through-L spec. That spec is your source of truth — do not improvise beyond it.

---

## The three-priority hierarchy (governs every tradeoff)

1. **Performance first.** The validator is build-time (not on the < 50ms recompute path), but it still runs on every `npm test`. Keep it fast enough to not slow down the test loop.
2. **Class-agnostic, second.** The validator has **zero** class-specific logic. It reads from `class-shape.js`, `STAT_META`, `constants.js` — adding a class is a data change.
3. **Engine-mechanic extension ease, third.** New condition variants / atom types / cost types are additive dispatch-table entries in the canonical sources; the validator picks them up automatically.

Top of list wins when they conflict. Cite this hierarchy explicitly when making tradeoff calls in your plan.

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 1 in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

### Stage 1 — Context Gather → Terse Map
Read the files above. Use the `Explore` sub-agent for broad surveys:
- What validation infrastructure exists? (None expected, but confirm.)
- What shape do the current v3 class files have, pattern-by-pattern? (Scan a couple to sense the old patterns you'll flag.)
- Where do canonical enum lists actually live in `constants.js`, `stat-meta.js`, `class-shape.js`? (The atom-tag vocabulary currently lives as a *comment* in `class-shape.js` — that's a micro-refactor you'll need to decide on; see nuance #1 below.)

Produce a written **Terse Map**: what exists, what's missing, what's uncertain.

### Stage 2 — Plan
Produce a detailed execution plan covering:

- **Module layout.** Does the validator live as a single file, or split into sub-modules per category (class-root / ability / atoms / conditions / grants-removes / ids)? Justify with the three priorities.
- **Primary location.** `src/data/classes/class-shape-validator.test.js` (per the plan), but the *logic* likely lives in a sibling `class-shape-validator.js` so a future Vite plugin can import it without pulling in Vitest. Confirm this split.
- **Canonical-source strategy.** For each validation rule (items A–L), name the exact canonical source it reads from. Flag any rule whose canonical source doesn't exist yet and needs a micro-refactor (see nuance #1).
- **Forbidden-field list (item K).** Enumerate explicitly from the plan. This is the single most valuable check — it's what proves a migration is complete.
- **Error format.** `class id + ability id + field path + reason`, grouped by file. Commit to an exact printable format with an example.
- **Test strategy for the validator itself.** Positive fixtures (ideally derived from `class-shape-examples.js`) + deliberately-broken negative fixtures per rule. Without validator self-tests, the validator silently rots.
- **What to do with the current v3 class data.** It will ALL fail. The plan is explicit: the validator output is the migration to-do list. Confirm you will NOT "fix" any class data in Phase 1. Surfaced failures become the input to Phases 2 and 10.
- **Cross-class id-collision check (item L).** How you aggregate ids across classes efficiently.
- **Two-namespace discipline.** `STAT_EFFECT_ATOM.stat` accepts either a `STAT_META` key OR a `RECIPE_IDS` entry — but the latter only when `phase === "cap_override"`. Your validator must enforce this (and only this) for the two-namespace model.
- **Exact files to create / modify** (full paths), with purpose lines.
- **Mapping back to Phase 1 success criteria, item by item.**
- **Open questions / decisions you need the user to resolve** before executing.
- **Risks identified.**

### Stage 3 — STOP — Plan Report
Emit the **Plan Report** in exactly this format:

```markdown
# Phase 1 — Plan Report

## Terse map
[bullets from Stage 1]

## Execution plan
[detailed plan from Stage 2]

## Decisions requiring user sign-off
[numbered list]

## Success-criteria coverage
| Criterion | Plan addresses it via |
|---|---|
| Validator runs on npm test | ... |
| Every class file evaluated | ... |
| Errors grouped by file, precisely located | ... |
| Forbidden-field (item K) catches legacy patterns | ... |
| Validator itself has positive + negative tests | ... |
| Reads rules from canonical sources | ... |

## Risks
[bullets]

## Open questions
[bullets]
```

**WAIT for explicit user sign-off.** If feedback comes back, revise and re-emit. Do not proceed to Stage 4 without explicit "approved" or equivalent.

### Stage 4 — Execute
Once signed off, execute the plan. Use sub-agents for independent parallel work where it helps. Stay strictly inside the signed-off plan — mid-execution discoveries that change scope must be surfaced, not unilaterally acted upon.

### Stage 5 — STOP — Completion Report
Emit the **Completion Report** in exactly this format:

```markdown
# Phase 1 — Completion Report

## Files created / modified
[paths + one-line purpose each]

## What was built
[summary tied to the plan]

## Validator output against current v3 class data
[high-level summary — e.g., "Validator flags N errors across 10 class files, grouped as follows: <summary>". Do NOT paste the full error dump here; attach it as a file or link if large. The goal is: is the migration to-do list real and useful?]

## Validator self-tests
[how many positive / negative cases; all green?]

## Deviations from plan
[what changed and why — or "none"]

## Success-criteria status
| Criterion | Status | Evidence |
|---|---|---|
| Validator runs on npm test | DONE / DEFERRED / N/A | ... |
| ... | ... | ... |

## Findings (for later phases)
[anything discovered but out of Phase 1 scope — especially orphan fields in current class data that suggest the shape might need another decision, or STAT_META gaps Phase 2 will need to fill]

## Follow-ups (non-blocking)
[anything noticed but out of scope]
```

**WAIT for explicit user sign-off.** Feedback may require revision. Do not declare Phase 1 complete without explicit sign-off.

---

## Phase 1 nuances you must surface in the plan

These are real tensions. Surface them in the Plan Report with your proposed resolution; don't hide them inside implementation choices.

1. **Atom-tag vocabulary currently lives as a *comment* in `class-shape.js`** (around the `STAT_EFFECT_ATOM.tags` field). Your validator needs to reference it as data. Proposal space: (a) add a new canonical constants module, e.g. `src/data/constants.js` gets an `ATOM_TAGS` frozen set; (b) a dedicated `src/data/atom-tags.js`; (c) something else. Decide, justify, surface for sign-off. Same question applies to the `CONDITION_VARIANTS` list, which is similarly comment-y.

2. **`scalesWith.type` enum.** Two values exist today (`"hp_missing"` on `STAT_EFFECT_ATOM`; `"attribute"` on `DAMAGE_ATOM`). There's no canonical list — just mentions in the shape comments. Like atom-tags, this needs a canonical home. Decide + surface.

3. **The current v3 class data WILL all fail validation.** That's the point. But handling this in a Vitest test requires care: do you mark those files' tests as `describe.skip` until Phase 2/10 migrates them (then unskip per class), or do you let them fail loudly as a perpetual reminder of the migration to-do list? Either is defensible — justify your pick.

4. **Cross-reference integrity for `ability_selected` and `effect_active`.** These reference ability IDs. Scope options: (a) same-class only; (b) any class. The locked shape doesn't forbid cross-class references, but no current data uses them. Decide + surface.

5. **Forbidden-field detection depth.** Item K lists ~20 forbidden fields. Flat top-level forbidden-field check is easy; deep/nested check (e.g., a forbidden field inside an atom, inside a nested structure) costs more. The plan's example (`warlock.spells[3] (id: bolt_of_darkness): atom effects[0].stat 'spellChargeMultiplier' is not in STAT_META`) implies deep traversal. Confirm deep-traversal and the error-path format.

6. **Commit 6dc3dd4's orphan-export concern** (flagged by Phase 0) is explicitly deferred to Phase 3 (architecture doc). If you find yourself wanting to audit `constants.js` during Phase 1, **stop** — you'll be scope-creeping into Phase 3.

---

## Sub-agent guidance

- **Context Gather (Stage 1).** Spawn the `Explore` sub-agent to survey current v3 class data patterns — the session's main context window shouldn't hold 10 class files.
- **Plan (Stage 2).** Optionally spawn the `Plan` sub-agent for the validation-rule decomposition (items A–L) if the dispatch tables feel dense.
- **Execute (Stage 4).** Sub-agents per validation category (e.g., "write the condition-validator module") if the work parallelizes cleanly; otherwise main session.

When you spawn a sub-agent, brief it fully (self-contained prompt — it has no memory of your session). Aggregate results; keep high-level state in the main session.

---

## Guardrails (from Phase 1 "Watch for")

- **Canonical-source reads only.** Never duplicate an enum list in the validator. If a list doesn't exist canonically, your plan must propose where it lives (nuance #1).
- **Validator self-tests are not optional.** Positive + negative cases. No validator self-tests = no sign-off.
- **Don't modify class data in Phase 1.** The validator output is the migration to-do list. Fixing data is Phases 2 and 10.
- **Don't audit `constants.js` for orphan exports** (Phase 3 job).
- **Stay in scope.** Any scope expansion is a sign-off-gate question, not a unilateral call.

---

## When in doubt

Re-read `docs/rebuild-plan.md § Phase 1` and `§ Operating protocol`. Re-read `docs/perspective.md § Core principles`. If still in doubt, raise it under **Open questions** in your Plan Report.

**Begin with Stage 1.**
