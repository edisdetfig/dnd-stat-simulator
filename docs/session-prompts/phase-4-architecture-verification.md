# Phase 4 — Architecture Doc Verification Pass + Phase 3 Follow-Up Re-Authors — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 4 of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo. Read, don't assume.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker. Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage/heal projections + available abilities. No time passes, no events fire. See `docs/perspective.md` for the full mental model.

The project is mid-rebuild:
- The class-data shape (`src/data/classes/class-shape.js`) is **locked**.
- The engine has been stripped to verified-math only (`src/engine/curves.js`, `damage.js`, `recipes.js`).
- Phase 0 landed a performance harness + pinned engine API surface.
- Phase 1 landed a class-shape validator (`src/data/classes/class-shape-validator.js` + `.test.js`).
- Phase 2 migrated **Warlock** as the anchor class (`src/data/classes/warlock.new.js`).
- Phase 3 produced **`docs/engine_architecture.md`** (the engine's public contract — 22 sections + glossary) and **`docs/vocabulary.md`** (controlled-vocabulary glossary). Phase 3 also landed the typed-damage-stat migration (11 typed stats; `typeDamageBonus` removed) and added the `lifestealRatio` flat field to DAMAGE_ATOM.

You are executing **Phase 4** of the 13-phase rebuild plan: **single-pass verification that `engine_architecture.md` covers every pattern Warlock actually uses, plus execution of the 5 follow-up re-authors Phase 3 deferred to this phase.** This is a verification checkpoint, not an iteration loop. Every Warlock pattern should be findable in the architecture doc; every architecture-doc claim should match what Warlock actually does.

---

## Mandatory reading order

Read these files before anything else. Do not skim.

1. **`docs/rebuild-plan.md`** — authoritative roadmap. Read in full: Operating protocol, Constraints, and **Phase 4** in detail. Pay attention to the Watch-for items.
2. `CLAUDE.md` — project-level guidance. Note the accuracy-first doctrine.
3. `docs/perspective.md` — mental model (snapshot not realtime; no causation in data; atoms self-contained; conditions gate; UI emerges from data; data-driven, class-agnostic; accuracy first).
4. **`docs/engine_architecture.md`** — **the verification subject.** Read in full. Every section, every table, every cited line number.
5. **`docs/vocabulary.md`** — the controlled-vocabulary glossary. Cross-check against constants.js + STAT_META + class-shape.js.
6. `src/data/classes/class-shape.js` — the locked schema.
7. `src/data/classes/class-shape-examples.js` — concrete patterns.
8. `docs/class-shape-progress.md` — locked decisions + engine architecture open questions (Q1 should be resolved by Phase 3; Q2 should be deferred to Phase 5; verify both).
9. `src/data/classes/class-shape-validator.js` + `class-shape-validator.test.js` — validator logic; rule codes including the new `D.lifestealRatio` and `C.capability_tags` from Phase 3.
10. `src/data/constants.js` — canonical vocabularies, including new `CAPABILITY_TAGS` Set and `EFFECT_TARGETS` extended with `ally` + `self_or_ally`.
11. `src/data/stat-meta.js` — `STAT_META`. 11 typed-damage stats added in Phase 3; `typeDamageBonus` removed.
12. `src/engine/recipes.js`, `src/engine/curves.js`, `src/engine/damage.js` — verified math the engine pipeline calls into.
13. **`src/data/classes/warlock.new.js`** — **the verification anchor.** Every pattern this file authors must be findable in the architecture doc.
14. `docs/damage_formulas.md` — verified damage formulas + test points. Re-verify every line citation in `engine_architecture.md` §15 against this file.
15. `docs/healing_verification.md` — verified healing formula + test points. Re-verify `engine_architecture.md` §16 citations.
16. `docs/season8_constants.md` — global caps, derived-stat formulas, VERIFIED constants.
17. `docs/unresolved_questions.md` — known mechanic unknowns; `_unverified` annotations on Warlock atoms cross-reference here.
18. `bench/fixtures/max-loadout.fixture.js` — Phase 0 fixture; pattern coverage reference.
19. **Phase 2 commit** (`f8431ad`) — Warlock authoring patterns.
20. **Phase 3 commit** (`5f99a80`) — engine_architecture.md + vocabulary.md + typed-damage-stat migration. Read the commit message in full; it surfaces the locked decisions and Phase 4 follow-ups.
21. `docs/session-prompts/phase-3-progress.md` — Phase 3 execution audit trail; useful for understanding what landed.

**Use the `Explore` sub-agent** for cross-cutting verification surveys (e.g., "every atom in warlock.new.js cross-referenced against architecture doc §6 atom-shape inventory"; "every line citation in engine_architecture.md verified against the cited span").

---

## Your mission — Phase 4 in one sentence

Confirm `docs/engine_architecture.md` and `docs/vocabulary.md` cover every pattern Warlock actually uses (no doc gaps; no doc claims unsupported by data); execute the 5 Phase 3 follow-up re-authors against the contract; keep validator green on Warlock throughout.

See `docs/rebuild-plan.md § Phase 4` for the authoritative Goal / Work / Watch for / Success criteria.

---

## The three-priority hierarchy (governs every tradeoff)

1. **Performance first.** Snapshot recompute < 50ms for the largest realistic build. Architecture-doc claims about pipeline boundaries and memoization checkpoints stay accurate.
2. **Class-agnostic, second.** Adding a class is a data change only. Engine code does not branch on class, ability, or stat identity.
3. **Engine-mechanic extension ease, third.** New mechanic types extend dispatch tables, never rewrite pipelines.

When priorities conflict, top of list wins.

**Plus the accuracy-first doctrine** (project-level): every numeric value traces to a verified source. Re-verify every line citation in `engine_architecture.md` by re-reading the cited span before declaring Phase 4 complete.

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 4 in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

### Stage 1 — Context Gather → Terse Map

Read the files above. Use `Explore` sub-agents for:
- **Pattern coverage matrix.** For every atom in `warlock.new.js` (every entry across `effects[]` / `damage[]` / `heal` / `shield` / `afterEffect` / `grants[]` / `removes[]`), record: file location, atom shape variant, which architecture-doc section describes how to evaluate it. Identify gaps (Warlock uses pattern X; architecture doc doesn't describe X).
- **Vocabulary coverage matrix.** Every condition variant, EFFECT_PHASES value, EFFECT_TARGETS value, ATOM_TAGS value, CAPABILITY_TAGS value, ABILITY_TYPES value, ACTIVATIONS value, WEAPON_TYPES value, DAMAGE_TYPES value, ARMOR_TYPES value, SCALES_WITH_TYPES value, GRANT_REMOVE_TYPES value, COST_TYPES value Warlock references — cross-checked against `vocabulary.md` and `constants.js`.
- **Citation verification.** Every line citation in `engine_architecture.md` (e.g., `damage_formulas.md:130–143`, `healing_verification.md:8–17`) re-read against the cited span; flag any drift.
- **Forward-spec inventory verification.** Every "forward-spec; first anticipated consumer in Phase 10" claim in `engine_architecture.md` §22 cross-checked against the locked decisions in `class-shape-progress.md` and the spec in `class-shape.js`. If a "forward-spec" pattern is actually exercised by Warlock (that the verification missed), surface it as a doc gap.
- **STAT_META reference inventory.** Every stat key Warlock references — confirm presence in STAT_META; surface orphans (stats Warlock no longer references after Phase 4 re-authors, candidates for removal).

Produce a written **Terse Map** covering:
- Pattern coverage status (matrix: Warlock pattern → architecture-doc section → "covered" / "gap" / "doc claims more than data does")
- Vocabulary coverage status (matrix: vocab value → vocabulary-doc section → "covered" / "gap")
- Citation verification status (cited line → re-read result → "match" / "drift")
- 5 Phase 4 follow-up re-author execution plans (per re-author: target file + line, current shape, target shape, validator regreen plan)
- STAT_META cleanup candidates (stats becoming orphans after re-authors)
- Any newly surfaced gaps requiring architecture-doc updates
- Any newly surfaced data authoring errors requiring fixes

### Stage 2 — Plan

Produce a detailed execution plan covering:

**Verification deliverables:**
- Pattern coverage matrix in tabular form (Warlock pattern → architecture-doc section → status)
- Vocabulary coverage matrix in tabular form
- Citation verification status (with any drift findings)
- Forward-spec inventory verification

**Code deliverables (5 Phase 3 follow-up re-authors):**

1. **Eldritch Shield afterEffect → `viewingAfterEffect` flow (LOCK 5).** Currently the inner atoms inside `eldritch_shield.afterEffect.effects[]` (warlock.new.js:619–636) gate on `condition: { type: "effect_active", effectId: "eldritch_shield" }`. Per LOCK 5, afterEffect atoms apply when `ctx.viewingAfterEffect` includes the parent ability id — the inner `effect_active` conditions become redundant and misleading. Remove them. Verify against `engine_architecture.md` §14 spec.

2. **Life Drain → `lifestealRatio: 1.0` (LOCK 3).** Life Drain currently authors `effects: [{ stat: "lifestealOnDamage", value: 1.0, phase: "post_curve" }]` (warlock.new.js:586) alongside its damage atom (line 582). Per LOCK 3, replace this with `lifestealRatio: 1.0` on the damage atom; drop the `effects[]` entry. Then drop `lifestealOnDamage` from STAT_META once grep confirms no other consumers. Verify against `engine_architecture.md` §16 lifestealRatio rule.

3. **Exploitation Strike → HEAL_ATOM with `percentMaxHealth: 0.10`.** Currently authors `effects: [{ stat: "lifestealOfTargetMaxHp", value: 0.10, phase: "post_curve", condition: ... }]` (warlock.new.js:386). Per Phase 3 finding, re-author as a HEAL_ATOM with `percentMaxHealth: 0.10`, `target: "self"`, the same condition (effect_active + weapon_type unarmed), and `healType: "magical"`. Drop `lifestealOfTargetMaxHp` from STAT_META if grep confirms no other consumers. Verify against `engine_architecture.md` §16 percentMaxHealth semantic ("% of whichever target is contextually relevant").

4. **Bloodstained Blade → `target: self_or_ally` (LOCK 6).** Currently authors atoms with `target: "self"`. Re-author the relevant effects/damage atoms to `target: "self_or_ally"` reflecting in-game self-or-ally cast. Verify against `engine_architecture.md` §5 + vocabulary.md EFFECT_TARGETS section.

5. **Shadow Touch desc revisit.** Phase 2 authored Shadow Touch atoms with desc "per melee physical hit" (warlock.new.js:84/87). Coordinator clarified earlier that Shadow Touch fires on ANY weapon attack the Warlock can perform (bare hands, spellbook, sword, bow, etc.), NOT only melee, and NOT on spell casts. Update both atoms' desc text to reflect this accurately. Cross-check `damage_formulas.md:151` ("Heal: 2 HP per melee hit") — if that line is also outdated, flag as a docs/damage_formulas.md follow-up (do NOT modify damage_formulas.md as part of Phase 4 unless explicitly approved; raise as a sign-off question).

**For each re-author:**
- Exact file paths + line ranges to modify
- Before / after atom shape (concrete syntax)
- Validator regreen confirmation (warlock per-class must stay 0 errors)
- Cross-reference to architecture-doc section the re-author validates against
- STAT_META cleanup follow-on (drop unused stat entries; coordinate stat-meta.test.js update if needed)

**Doc updates required:**
- Any architecture-doc gaps found in pattern verification → spec the missing section
- Any vocabulary-doc gaps → add the entry
- Any line-citation drift → update the citation to the correct line
- Any forward-spec mis-classification → re-classify (move from forward-spec to Warlock-grounded if Warlock actually exercises it)

**Plan must also cover:**
- Validator-feedback protocol (re-run after each re-author; warlock at 0 errors)
- File creation strategy: this is mostly modifications to existing docs/data files; no new files unless a verification finding requires one
- Mapping to Phase 4 success criteria, item by item
- Decisions requiring user sign-off (numbered list — including the damage_formulas.md follow-up question)
- Risks and open questions

### Stage 3 — STOP — Plan Report

Emit the **Plan Report** in exactly this format:

```markdown
# Phase 4 — Plan Report

## Terse map
[bullets / tables from Stage 1: pattern coverage matrix, vocabulary coverage matrix, citation verification status, re-author inventory, STAT_META cleanup candidates]

## Execution plan
[detailed plan from Stage 2: doc-gap fixes, 5 re-author specs, doc updates, validator regreen plan]

## Decisions requiring user sign-off
[numbered list]

## Success-criteria coverage
| Criterion | Plan addresses it via |
|---|---|
| Every Warlock pattern documented in architecture doc | ... |
| vocabulary.md covers every value Warlock references | ... |
| Every line citation verified | ... |
| 5 Phase 3 follow-up re-authors complete | ... |
| Validator stays green on Warlock | ... |
| No TBDs introduced | ... |

## Risks
[bullets]

## Open questions
[bullets — including the damage_formulas.md update question]
```

**WAIT for explicit user sign-off.** Revise and re-emit if feedback comes back. Do not proceed to Stage 4 without explicit "approved."

### Stage 4 — Execute

Once signed off, execute the plan. Maintain a working progress document at `docs/session-prompts/phase-4-progress.md` for crash resilience (template below). Update after each step; commit-eligible (file lives in repo) but do NOT commit until Phase 4 itself is committed by the coordinator.

Treat the validator as the inner feedback loop:
- Re-run `npm test -- --run class-shape-validator` after every re-author
- Warlock per-class errors must stay at 0
- Cross-class spell_memory_1/2 L-rule collision is expected (Phase 10 scope)

**Discipline:**
- Stay strictly inside the signed-off plan
- Any architecture-doc change NOT already signed off requires surfacing before acting
- If a Warlock pattern surfaces that Phase 3 missed (gap), flag it explicitly — verify against locked decisions in `class-shape-progress.md` to ensure the gap is real and not a misreading
- If a verified source disagrees with the architecture doc's citation, STOP and flag — don't unilaterally change either
- No new vocabulary additions in Phase 4. Phase 3 locked the surface; Phase 4 enforces it

**Progress document template (`docs/session-prompts/phase-4-progress.md`):**

```markdown
# Phase 4 — Execution Progress

**Stage 4 status:** in-progress | paused | complete
**Last updated:** <ISO timestamp>
**Current step:** <step number + name, or "complete">

## Pre-flight checks
- [ ] Validator baseline re-confirmed (warlock 0 per-class errors)
- [ ] Phase 3 commit (5f99a80) reviewed
- [ ] Architecture-doc + vocabulary-doc fully read

## Verification steps
- [ ] Pattern coverage matrix completed
- [ ] Vocabulary coverage matrix completed
- [ ] Citation verification completed
- [ ] Forward-spec inventory verification completed
- [ ] Doc gap fixes applied (list each)

## Re-author steps (in execution order)
- [ ] 1. Eldritch Shield afterEffect → viewingAfterEffect — started: <ts> / completed: <ts>
- [ ] 2. Life Drain → lifestealRatio: 1.0
- [ ] 3. Exploitation Strike → HEAL_ATOM with percentMaxHealth
- [ ] 4. Bloodstained Blade → target: self_or_ally
- [ ] 5. Shadow Touch desc revisit

## STAT_META cleanup
- [ ] lifestealOnDamage removed (post-Life-Drain re-author; grep-confirmed no consumers)
- [ ] lifestealOfTargetMaxHp removed (post-EX-Strike re-author; grep-confirmed no consumers)
- [ ] stat-meta.test.js updated for any removed stats

## Verification gates passed
- [ ] Warlock per-class validator: 0 errors after each re-author
- [ ] Warlock per-class validator: 0 errors at final step
- [ ] Full test suite green
- [ ] All architecture-doc citations re-verified

## Notes / blockers
<append as encountered>

## Resume protocol
If picking up from a prior session, read this doc first. The next item is the lowest-numbered unchecked step. If a step shows "started: <ts>" without "completed: <ts>", treat as in-progress: re-verify state before deciding to redo or continue.
```

### Stage 5 — STOP — Completion Report

Emit the **Completion Report** in exactly this format:

```markdown
# Phase 4 — Completion Report

## Files created / modified
[paths + one-line purpose each]

## What was built
[summary tied to the plan]

## Pattern coverage outcome
| Warlock pattern | Architecture-doc section | Status before / after Phase 4 |
|---|---|---|
| ... | ... | covered / gap-filled / re-classified |

## Vocabulary coverage outcome
| Vocabulary value | vocabulary.md section | Status |
|---|---|---|
| ... | ... | ... |

## Citation verification outcome
| Citation | Re-read result | Action taken (if any) |
|---|---|---|
| ... | ... | ... |

## Re-author outcomes
| Re-author | File:line before | File:line after | Validator regreen |
|---|---|---|---|
| Eldritch Shield afterEffect | ... | ... | ... |
| Life Drain lifestealRatio | ... | ... | ... |
| Exploitation Strike HEAL_ATOM | ... | ... | ... |
| Bloodstained Blade self_or_ally | ... | ... | ... |
| Shadow Touch desc | ... | ... | ... |

## STAT_META cleanup
[list of removed stats + confirmation grep showed no consumers]

## Validator status
[Warlock: 0 errors at every regreen point; full suite: pass/fail/skip counts]

## Doc updates
[any architecture-doc gaps fixed + line citations corrected]

## Deviations from plan
[what changed and why — or "none"]

## Success-criteria status
| Criterion | Status | Evidence |
|---|---|---|
| ... | DONE / PARTIAL / BLOCKED | ... |

## Findings (for later phases)
[anything discovered out of Phase 4 scope]

## Follow-ups (non-blocking)
[anything noticed out of scope]
```

**WAIT for explicit user sign-off.** Revise per feedback. Do not declare Phase 4 complete without explicit sign-off.

---

## Locked from coordinator (binding for Phase 4)

These are settled — do not re-litigate. Implement as specified.

### LOCK A — The 5 re-authors are required scope (not optional)
Phase 4 is verification + execution. The 5 re-authors deferred from Phase 3 are part of Phase 4's required deliverables, not a follow-up phase. Validator stays green on Warlock throughout.

### LOCK B — No new vocabulary in Phase 4
Phase 3 locked the surface (CAPABILITY_TAGS at 7; EFFECT_TARGETS at 8 with `ally` + `self_or_ally`; SCALES_WITH_TYPES at 2; etc.). Phase 4 enforces the locked vocabulary. If a verification finding suggests a vocabulary gap, surface it as a sign-off question; do NOT add quietly. Phase 9/10 may grow vocabularies; Phase 4 does not.

### LOCK C — Power of Sacrifice does NOT need a re-author
PoS keeps `target: "either"`. Per coordinator clarification, "either" captures the engine-visible cases (self/enemy projection); ally targeting lives in desc and that's the correct snapshot-model representation. Don't touch PoS atoms.

### LOCK D — Architecture-doc gap fixes coordinate with locked decisions
If verification surfaces a gap (Warlock uses pattern X; architecture doc doesn't describe X), the fix is to ADD the section to the architecture doc, NOT to remove the Warlock authoring or alter the locked shape. The shape is the source of truth; the doc must catch up. The exception: if the Warlock authoring violates a locked decision in `class-shape-progress.md`, that's a data error — fix the data.

### LOCK E — Citation drift fixes the citation, not the math
If `engine_architecture.md` cites `damage_formulas.md:130–143` and the cited span has shifted by line offset, update the citation. If the cited span has changed in semantic content, STOP and flag — that's a verified-source change requiring separate review.

### LOCK F — `damage_formulas.md` updates require explicit sign-off
If Shadow Touch desc revisit (re-author #5) surfaces that `damage_formulas.md:151` is outdated about Shadow Touch's heal trigger, raise it as a sign-off question. Do not modify `damage_formulas.md` unilaterally — verified-source documents are accuracy-first; updates need user verification against the in-game state.

---

## Phase-specific nuances you must surface in the plan

These are tensions, judgment calls, and forward-looking questions that need to be visible in the Plan Report — not buried in implementation.

1. **Verification rigor: don't approximate.** Every Warlock atom gets cross-referenced against an architecture-doc section. Every condition variant Warlock uses gets cross-referenced against the dispatcher table. Every line citation gets re-read. Vague "looks comprehensive" passes are not verification.

2. **Re-authors are coordinated changes, not standalone fixes.** Each re-author touches: data file (warlock.new.js), validator regreen, possibly STAT_META cleanup, possibly stat-meta.test.js update, possibly architecture-doc cross-reference verification. Treat each re-author as an atomic change set; don't leave intermediate states after a stop.

3. **Order-of-operations matters.** Suggested order:
   - Verification first (pattern + vocab + citation matrices) — tells you what (if any) doc gaps exist
   - Doc-gap fixes second — bring doc to parity with current Warlock data
   - Re-authors third — apply each, regreen validator after each
   - STAT_META cleanup fourth — only after re-authors land and grep confirms no consumers
   - Final full-suite test fifth — confirm everything still green

4. **`lifestealOnDamage` STAT_META removal verification.** After Life Drain re-authors, grep for `lifestealOnDamage` across the entire codebase. Should appear in: nowhere (post-removal). If it appears in v3 archived class files (warlock.js, etc.), those are Phase 10 scope — don't touch. If it appears in any active code path (UI, tests, fixtures), surface — that's an unexpected consumer.

5. **`lifestealOfTargetMaxHp` STAT_META removal verification.** Same pattern as #4. Possibly the only consumer was Exploitation Strike; once re-authored, drop. Verify by grep.

6. **`stat-meta.test.js` coordination.** If you remove `lifestealOnDamage` and/or `lifestealOfTargetMaxHp` from STAT_META, the canonical-list assertion in `stat-meta.test.js` may need updating. Verify; coordinate the test update with the STAT_META change in a single coherent step.

7. **Eldritch Shield afterEffect re-author edge case.** The current authoring has `condition: { type: "effect_active", effectId: "eldritch_shield" }` on each inner atom. Per LOCK 5, when ctx.viewingAfterEffect includes the parent ability, the afterEffect atoms apply — the effect_active condition is redundant. Remove the inner conditions cleanly. Verify the re-authored atoms still parse the LOCK 5 spec (no implicit cast_buff state required for afterEffect to apply).

8. **Exploitation Strike percentMaxHealth target semantic.** Per Phase 3 LOCK 3 clarification ("% of whichever target is contextually relevant"), EX Strike's heal-target is self but source-of-percent is the enemy (the entity being hit). Verify the architecture-doc §16 percentMaxHealth section captures this dual-context semantic clearly. If not, the doc needs an update before the re-author lands.

9. **Bloodstained Blade re-author scope.** Verify which atoms in Bloodstained Blade need `target: self_or_ally` — it may be just the buff effect (`buffWeaponDamage`) and not the per-swing self-damage (which legitimately stays `target: self`). Walk atom-by-atom; don't blanket-replace.

10. **Shadow Touch desc revisit:** purely a desc-text update. The atom semantics (damage values, scaling) don't change — Phase 2 authored them correctly per the formula. Only the desc string needs to reflect the broader trigger.

11. **No engine code in Phase 4.** Phase 4 produces verification + data re-authors + doc updates. Implementing pipeline modules (`buildContext.js`, `collectAtoms.js`, etc.) is Phase 6.

12. **Forward-spec inventory cross-check.** Phase 3's §22 forward-spec index lists patterns Warlock doesn't exercise. Verify each entry is genuinely forward-spec (Warlock doesn't have it) — if Warlock actually has the pattern, it's a doc-gap (architecture-doc says Warlock doesn't exercise it but Warlock does). Re-classify.

13. **The Eldritch Shield re-author touches the engine-architecture.md §14 understanding.** When the inner `effect_active` conditions are removed from the afterEffect atoms, the resulting atoms apply purely on `viewingAfterEffect`. Confirm the architecture doc §14 spec accommodates this (it should — that's exactly what LOCK 5 specifies).

14. **Cross-class spell_memory_1/2 L-rule collision** continues. Not Phase 4's fix; expected Phase 10 work.

---

## Sub-agent guidance

- **Stage 1 (Context Gather).** Spawn `Explore` for the verification surveys: pattern coverage, vocabulary coverage, citation verification. Each is a self-contained query with no dependency on the others — run in parallel.
- **Stage 2 (Plan).** Main session aggregates Terse Map findings into the execution plan. `Plan` sub-agent can draft individual re-author specs (before/after atom syntax) given Stage 1's inventory.
- **Stage 4 (Execute).** Sequential (validator regreen loop). Main session drives. Sub-agents only for specific lookups (e.g., "is there any consumer of `lifestealOnDamage` outside warlock.new.js?").

When you spawn a sub-agent, brief it fully (self-contained prompt). Aggregate results; keep high-level state in the main session.

---

## Guardrails (from Phase 4 "Watch for")

- **Don't write engine code.** No `buildContext.js`, no `collectAtoms.js`, no pipeline modules. Phase 6 builds the engine; Phase 4 verifies the contract.
- **Don't introduce TBDs.** Verification finds gaps; gaps get filled; the doc stays as a no-TBD contract.
- **Don't deviate from locked decisions.** The 6 LOCKs from Phase 3 + every entry in `class-shape-progress.md § Locked decisions` are binding.
- **Validator stays green on Warlock throughout.** Re-run after every re-author.
- **Don't grow vocabularies in Phase 4.** Phase 3 locked the surface; Phase 4 enforces. Vocabulary additions = sign-off-gate question.
- **Don't modify verified-source docs (`damage_formulas.md`, `healing_verification.md`, `season8_constants.md`) without explicit user sign-off.** Accuracy-first applies — updates need user verification.
- **Don't touch v3 archived class files** (fighter.js, barbarian.js, ranger.js, rogue.js, cleric.js, wizard.js, sorcerer.js, bard.js, druid.js, the legacy warlock.js). They fail validator and that's expected; Phase 10 migrates them.
- **Stay in scope.** Verification + 5 re-authors + STAT_META cleanup + any necessary doc gap fixes. Anything else is sign-off-gate.
- **Maintain the progress document throughout Stage 4** (`docs/session-prompts/phase-4-progress.md`). Update before/after each step. Crash resilience requirement.

---

## When in doubt

Re-read `docs/rebuild-plan.md § Phase 4` and `§ Operating protocol`. Re-read `docs/perspective.md § Core principles`. Re-read `docs/class-shape-progress.md § Locked decisions`. Re-read this prompt's "Locked from coordinator" section.

If a pattern's semantics are genuinely ambiguous (you can see two defensible interpretations), raise it under **Open questions** in your Plan Report. Don't pick silently.

**Begin with Stage 1.**
