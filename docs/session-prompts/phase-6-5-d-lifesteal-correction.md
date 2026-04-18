# Phase 6.5d — Accuracy-First Lifesteal Correction — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 6.5d of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo + the user-verified in-game data locked below. Read, don't assume. Cite, don't infer.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker. Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage / heal / shield projections + available abilities. See `docs/perspective.md` for the full mental model.

**Project state at start of 6.5d:**
- Phases 0–6 shipped the engine (12 modules under `src/engine/`, public entry `runSnapshot`, commit `0e69523`).
- Phase 6.5 closed (`6.5a` gear wiki facts, `6.5b` gear-and-character mapping, `6.5c.1` shape + validators, `6.5c.2` normalizer + engine seams — most recent commit `137f2b1`).
- Coordinator phase index at `docs/coordinator-role.md` shows 6.5c.2 DONE.

**Why Phase 6.5d exists.** During 6.5c.2 Stage 4 execution, coordinator + user in-game re-testing surfaced that the project's VERIFIED docs for lifesteal math (`docs/healing_verification.md:18-21`, `docs/unresolved_questions.md:268-278`) mis-interpreted their own test data. Life Drain actually heals based on **post-DR damage** (the final number the target received), not pre-MDR damage. `computePhysicalPreDR` and `computeMagicalPreMDR` in `src/engine/projectDamage.js` are solving a non-existent problem. Phase 6.5d corrects the docs, refactors the engine, and ships verified tests against the user's clean in-game data.

**This phase is narrow and execution-heavy.** Single commit at Stage 5. No sub-phasing.

---

## Mandatory reading order

Read these before anything else. Do not skim.

1. **`CLAUDE.md`** — project-level guidance. Accuracy-first doctrine, verification levels (VERIFIED > WIKI-SOURCED > UNRESOLVED).
2. **`docs/healing_verification.md`** — THE doc about to be corrected. §18–21 (Lifesteal section) and §35 (Warlock Healing Sources Life Drain row) are the primary targets. Understand the existing formulas first.
3. **`docs/unresolved_questions.md:260–300`** — the "RESOLVED: Life Drain Heal Percentage = 100% (pre-MDR)" entry (`:268–278`) needs full rewrite. Its outstanding items (`:280–282`) are resolved by the new data.
4. **`docs/engine_architecture.md`** — §3 pipeline overview, §4 Snapshot shape, §5 Ctx shape, §15.1 physical damage math, §15.2 magical damage math, **§16.2 lifesteal engine rule (the primary edit target)**, §16.3 percentMaxHealth on HEAL_ATOM, §16.4 targetMaxHpRatio on DAMAGE_ATOM (these two sections stay unchanged — see LOCK E).
5. **`docs/damage_formulas.md:7–82`** — physical + magical damage formulas. Don't edit this doc; read to understand what `hit.body` represents in the engine.
6. **`docs/rebuild-plan.md`** — roadmap + phase-gate discipline. No 6.5d section exists yet; phase is inserted into the Phase 6.5 umbrella by coordinator.
7. **`docs/coordinator-role.md`** — coordinator role + report conventions. Your Plan Report + Completion Report formats mirror prior-phase patterns.
8. **`docs/perspective.md`** — mental model. Principle 8 (accuracy first) is load-bearing.
9. **`src/engine/projectDamage.js`** — contains `computePhysicalPreDR` (~:200) + `computeMagicalPreMDR` (~:272) + the lifesteal-derivation dispatch (the main `projectDamage` function walks damage atoms, and for atoms with `lifestealRatio != null`, currently calls the pre-DR helpers). This file is the primary refactor target.
10. `src/engine/projectHealing.js` — consumes derived-heal descriptors from projectDamage; may have references to the pre-DR-computed values. Confirm and update if needed.
11. `src/engine/damage.js` — `calcHealing` (`~:80–150` approximate). The lifesteal derivation routes through this with `baseHeal = heal_amount, scaling = 0, healingMod` — that routing is correct and stays.
12. `src/data/classes/warlock.new.js` — contains `life_drain` spell (`~:582`). Reference for Life Drain's authored `lifestealRatio: 1.0`, base damage, scaling, tickRate, duration.
13. **`bench/fixtures/warlock-life-drain.fixture.js`** — likely asserts Life Drain heal values. **Test values here will need updating** to match the corrected post-DR basis + user's verified in-game numbers.
14. Other `bench/fixtures/warlock-*.fixture.js` — sweep for any other references to lifesteal / pre-MDR. Most Warlock abilities don't lifesteal; confirm with grep.
15. **Commit context:**
    - `137f2b1` — Phase 6.5c.2 (normalizer + engine seams). The computePhysicalPreDR rider injection backed out in this commit's revisions per Path A.
    - `051d977` — Phase 6.5c.2 DONE in coordinator index.
    - `0e69523` — Phase 6 engine implementation (the pre-MDR lifesteal path lives here).

**Use `Explore` sub-agents** for cross-cutting sweeps. Good candidates: (a) every reference to `computePhysicalPreDR` / `computeMagicalPreMDR` / `preMdr` / `preMDR` / `preDR` across src/engine + tests + fixtures; (b) every test that asserts a Life Drain heal value; (c) every occurrence of "pre-MDR" / "before reductions" / "outgoing damage" phrases in docs that may need coordination.

**Do NOT use `WebFetch` or `WebSearch`** — research is complete; Phase 6.5a captured wiki facts and Phase 6.5d uses the coordinator-locked VERIFIED data below, not new external sources.

---

## Your mission — Phase 6.5d in one sentence

Correct the lifesteal basis from pre-MDR to post-DR across the three affected VERIFIED docs, eliminate `computePhysicalPreDR` and `computeMagicalPreMDR` from `src/engine/projectDamage.js` by refactoring the lifesteal-derivation logic to read `hit.body` from the just-computed damage projection directly, update existing lifesteal test assertions to match the corrected math + the user's verified in-game numbers, and ship as a single commit — while preserving the VERIFIED Warlock damage test points (8/8 physical + 8/8 spell) unchanged.

See LOCK B and LOCK C below for the canonical VERIFIED data + the corrected formula.

---

## The three-priority hierarchy (governs every tradeoff)

From `docs/rebuild-plan.md § Constraints`:

1. **Performance first.** Refactor should reduce code volume (eliminating two helper functions + their call sites); snapshot recompute time should stay within the Phase 6 <50 ms budget, likely improving slightly. Re-measure max-loadout fixture post-refactor; delta should be ≤ 0 ms (i.e., not worse).
2. **Class-agnostic, second.** No class-specific changes. The refactor touches physical and magical lifesteal paths uniformly; Life Drain is an anchor test, not an engine dispatch target.
3. **Engine-mechanic extension ease, third.** The refactor is a simplification — eliminates a dead concept (pre-DR lifesteal basis). Future lifesteal extensions (Barbarian Blood Exchange `lifestealOnDamage` stat-driven — Phase 10) slot in cleanly against the post-DR `hit.body` basis.

**Accuracy-first doctrine (primary driver this phase):**

- Every VERIFIED doc edit traces to LOCK B's user-verified in-game data.
- Test value changes trace to LOCK B + the formula in LOCK C.
- No invented values, no plausible-sounding fill-in-the-blank. If the data doesn't support a specific claim, surface as UNRESOLVED in the Completion Report.
- **VERIFIED Warlock damage test points (32/32) must stay green unchanged.** The refactor doesn't touch damage math; damage tests assert pre-refactor behavior.

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 6.5d in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

Phase 6.5d is narrow; the Plan Report will be short (specific refactor steps + test value changes + doc edits). That's expected.

### Stage 1 — Context Gather → Terse Map

Read the files above. The load-bearing reads are `projectDamage.js`, `healing_verification.md:18–35`, `unresolved_questions.md:268–282`, `engine_architecture.md § 16.2`, `warlock.new.js` Life Drain section, and `warlock-life-drain.fixture.js`.

Via `Explore` sub-agents (parallelizable):

- **Pre-DR call-site inventory.** Every reference to `computePhysicalPreDR` / `computeMagicalPreMDR` / pre-MDR / pre-DR in src + tests + bench. Record file:line for each.
- **Lifesteal test inventory.** Every test that asserts a Life Drain heal value or exercises the `lifestealRatio` derivation path. Record: test file, line, current asserted value, the config (MPB/Vamp/MH/target-MDR).
- **Current derivation flow trace.** In `projectDamage.js`, trace how an atom with `lifestealRatio` becomes a heal projection today: which function fires, what it computes, what it passes to downstream. You need this to know what the refactor replaces.
- **VERIFIED doc sweep.** Every reference across docs to "pre-MDR" / "BeforeReductions" / "before reductions" that could propagate the mis-interpretation. Scope: `docs/*.md`. Expected findings: `healing_verification.md:18-21, :35`, `unresolved_questions.md:268-278 + :280-282`, `engine_architecture.md § 16.2`. Anything else surfaced goes in Open Questions.

Produce a written **Terse Map** covering:

- Pre-DR call-site table (file:line → function → semantic).
- Lifesteal test inventory (file:line → asserted value → config).
- Current derivation flow (concrete, traced — "atom with lifestealRatio hits projectDamage line X; calls computePhysicalPreDR; which does Y; result feeds projectHealing Z").
- VERIFIED doc references to correct.
- Scope-clarification open questions (should be near-zero — LOCKs below are explicit).

### Stage 2 — Plan

Produce a detailed execution plan covering:

**A. Doc edits.** Per-doc, the exact spans to rewrite + the replacement text. Cite LOCK B for the VERIFIED data anchor, LOCK C for the corrected formula:

- `docs/healing_verification.md:18–21` — rewrite the Lifesteal (Life Drain) section.
- `docs/healing_verification.md:35` — row in the Warlock Healing Sources table may need a note adjustment (keeping "Only HealingMod applies" but clarifying post-DR basis).
- `docs/healing_verification.md § Verification Data` — **add** a Life Drain verification-data table with the user's three VERIFIED in-game scenarios.
- `docs/unresolved_questions.md:268–278 + :280–282` — re-author the RESOLVED entry: corrected interpretation (post-DR), note dummy-no-heal as a gameplay rule, cite the new VERIFIED data. Remove the "Outstanding" sub-section (all open items now resolved).
- `docs/engine_architecture.md § 16.2` — rewrite the lifesteal engine rule: heal derives from `damageProjection.hit.body × lifestealRatio × (1 + HealingMod)` with ceil at display.

**B. Engine refactor.** Per file, the exact changes:

- `src/engine/projectDamage.js`:
   - **Delete** `computePhysicalPreDR` function (~:200).
   - **Delete** `computeMagicalPreMDR` function (~:272) — IF grep confirms nothing else calls it beyond the lifesteal derivation. Otherwise inline-simplify.
   - **Update** the lifesteal-derivation dispatch (the `if (atom.lifestealRatio != null && atom.lifestealRatio > 0)` block) to read `hit.body` from the already-computed physical/magical projection directly. The descriptor flow (`derivedHealDescriptors` return → `projectHealing` consume) stays unchanged.
- `src/engine/projectHealing.js` — if it references pre-MDR descriptors or the removed helpers, update. Likely untouched.
- `src/engine/damage.js` — `calcHealing` routing with `baseHeal = heal_amount, scaling = 0, healingMod` stays unchanged. No edits.

**C. Test value updates.** Per test/fixture, the new asserted heal value(s) derived from the LOCK C formula applied to the current Warlock Life Drain setup (MPB 7% anchor + target MDR per the fixture):

- `bench/fixtures/warlock-life-drain.fixture.js` — update lifesteal heal assertions if present.
- Any other tests found via the Stage 1 inventory.
- **Add** a Life Drain VERIFIED fixture reproducing user's three in-game scenarios (baseline, Vamp, MH-inert) with exact assertions per LOCK B. This is the single authoritative regression gate for lifesteal math going forward.

**D. Execution sequence.** Propose your order. A reasonable default:

```
Step 0  — Baseline perf measurement (max-loadout fixture).
Step 1  — Doc edits (healing_verification.md, unresolved_questions.md,
          engine_architecture.md § 16.2). Doc-only, no code risk.
Step 2  — Engine refactor: lifesteal-derivation dispatch updated to read
          hit.body; computePhysicalPreDR / computeMagicalPreMDR deletions
          staged (may stay until all call sites clear).
Step 3  — Test value updates in existing lifesteal fixtures.
Step 4  — New Life Drain VERIFIED fixture authored per LOCK B data.
Step 5  — npm test full run — VERIFIED Warlock damage (8/8 + 8/8) stays
          green; lifesteal tests match new asserted values.
Step 6  — Delete computePhysicalPreDR / computeMagicalPreMDR functions
          (after confirming all call sites clear via grep).
Step 7  — Post-refactor perf measurement (should be ≤ baseline).
Step 8  — Completion Report.
```

Adjust with rationale.

**E. Plan must also cover:**

- Decisions requiring user sign-off (should be very few — LOCKs cover most decisions).
- Risks (especially: any test that uses the pre-MDR helpers for non-lifesteal purposes; dummy-on-heal gameplay documentation clarity).
- Open questions to the coordinator (true asks, not re-derivable from LOCKs).

### Stage 3 — STOP — Plan Report

Emit the **Plan Report** in exactly this format:

```markdown
# Phase 6.5d — Plan Report

## Terse map
[pre-DR call-site inventory, lifesteal test inventory, current derivation flow, VERIFIED doc references, scope-clarification OQs]

## Doc-edit plan
[per-doc: section span + replacement text outline]

## Engine-refactor plan
[per-file: deletions + updates + preserved routing]

## Test-update plan
[existing assertions to update + new VERIFIED fixture]

## Execution sequence
[step-by-step ordering with rationale]

## Decisions requiring user sign-off
[numbered list — likely near-zero]

## Risks
[bullets]

## Open questions
[bullets — should be near-zero]
```

**WAIT for explicit user sign-off.** Revise and re-emit if feedback comes back. Do not proceed to Stage 4 without explicit "approved."

### Stage 4 — Execute

Once signed off, execute the plan. Maintain `docs/session-prompts/phase-6-5-d-progress.md` for crash resilience (simple step checklist; timestamps on start / complete).

**Inner-loop discipline (per step):**

1. Implement the step.
2. Run `npm test` (incremental — focus on affected tests, plus the full verified-math suite). Expected throughout Stage 4:
   - VERIFIED Warlock damage (8/8 physical + 8/8 spell): **always green** — refactor doesn't touch damage math.
   - Lifesteal tests: green against new asserted values.
3. Update progress doc.
4. Move to the next step.

**Discipline:**

- **VERIFIED doc edits** are authorized ONLY for the spans named in LOCK A. No other doc edits (including no "while you're there" cleanups in other sections of the same file).
- **Refactor preserves existing behavior for non-lifesteal paths.** Damage math untouched. percentMaxHealth (HEAL_ATOM) and targetMaxHpRatio (DAMAGE_ATOM) derivations untouched (LOCK E).
- **No scope expansion.** `lifestealOnDamage` stat-driven path is Phase 10 (LOCK E). No STAT_META entries for it. No Stage 6 post-process for it.
- **No UI code** (LOCK H).

### Stage 5 — STOP — Completion Report

Emit the **Completion Report** in exactly this format:

```markdown
# Phase 6.5d — Completion Report

## Files created / modified / deleted
[paths + one-line purpose each]

## Doc updates
[per-doc: section span + summary of what was rewritten; diff-level detail]

## Engine refactor
- Deletions: [computePhysicalPreDR + computeMagicalPreMDR confirmed removed; call-site count before → 0 after]
- Updates: [lifesteal-derivation dispatch; hit.body read source]
- Preserved: [damage math, percentMaxHealth, targetMaxHpRatio, calcHealing routing]

## Test status
- npm test: N passing / N failing / N skipped (pre-phase baseline: N / N / N)
- VERIFIED Warlock damage (8/8 physical + 8/8 spell): passing / failing [MUST be passing]
- Lifesteal tests: old value → new value table (per fixture)
- New Life Drain VERIFIED fixture: N/N passing

## Performance impact
- Pre-phase baseline: max-loadout Nms
- Post-phase: max-loadout Nms
- Delta: Nms (expected ≤ 0)

## VERIFIED data anchor
[LOCK B data reproduced verbatim as the single source of truth for the new fixture's assertions]

## Deviations from plan
[per item + rationale; expected: near-zero]

## Follow-ups (non-blocking, out of scope)
[Phase 10 lifestealOnDamage stat-driven path; other items surfaced]
```

**WAIT for explicit user sign-off.** Revise per feedback. Do not declare Phase 6.5d complete without explicit sign-off.

---

## Locked from coordinator (binding for Phase 6.5d)

These are settled — do not re-litigate.

### LOCK A — VERIFIED doc edits are EXPLICITLY AUTHORIZED for this phase (one-off scope exception)

Unlike prior Phase 6.5 sub-phases that prohibited VERIFIED doc edits (LOCK C), **Phase 6.5d is explicitly authorized to edit**:

- `docs/healing_verification.md` — §18–21 (Lifesteal section), §35 (Warlock Healing Sources table Life Drain row), and the Verification Data section (add Life Drain table).
- `docs/unresolved_questions.md` — the RESOLVED: Life Drain Heal Percentage entry at `:268–278 + :280–282`.
- `docs/engine_architecture.md § 16.2` — the lifesteal engine rule.

**No other doc edits.** Specifically NOT authorized:
- `docs/damage_formulas.md` — damage math unchanged; no edits.
- `docs/season8_constants.md` — untouched.
- `docs/perspective.md`, `docs/class-shape-progress.md`, `docs/vocabulary.md`, `docs/engine_implementation_plan.md`, `docs/gear-wiki-facts.md`, `docs/gear-character-mapping.md`, `docs/session-prompts/gear-shape-design.md` — all untouched.
- `docs/engine_architecture.md` sections other than §16.2 — untouched unless a cross-reference in another section demonstrably depends on the §16.2 wording (grep and flag).
- `docs/rebuild-plan.md` — untouched (coordinator updates the phase index post-commit per established pattern).

If you find a cross-reference to "pre-MDR" / "before reductions" / "outgoing damage before" elsewhere in the codebase that's now stale, surface in Open Questions; do not rewrite unilaterally.

### LOCK B — VERIFIED data anchor (user in-game testing, 2026-04-17)

Caster: Warlock, 7% MPB, +5 magical damage spellbook equipped, Life Drain cast on a real target (not training dummy).

Per-tick damage and heal values observed in three independent scenarios:

**Scenario A — Baseline (no Vampirism, 0 Magical Healing gear):**
| Tick | Damage dealt (post-DR) | Heal received |
|---|---|---|
| 1 | 5 | 5 |
| 2 | 5 | 5 |
| 3 | 4 | 4 |
| 4 | 5 | 5 |
Observation: **1:1 heal-to-damage ratio.** Life Drain's lifestealRatio = 1.0.

**Scenario B — Vampirism ON (HealingMod +0.20, still 0 Magical Healing):**
| Tick | Damage dealt (post-DR) | Heal received |
|---|---|---|
| 1 | 5 | 6 |
| 2 | 5 | 6 |
| 3 | 4 | 5 |
Observation: `heal = ceil(damage × 1.20)`. Vampirism's HealingMod applies multiplicatively. `5 × 1.20 = 6.0 → 6`; `4 × 1.20 = 4.8 → ceil = 5`.

**Scenario C — Magical Healing +6 (Vampirism OFF):**
| Tick | Damage dealt (post-DR) | Heal received |
|---|---|---|
| 1 | 5 | 5 |
| 2 | 5 | 5 |
| 3 | 4 | 4 |
Observation: **Magical Healing (MH) is inert for Life Drain.** 1:1 ratio unchanged by +6 MH. Confirms existing `healing_verification.md:35` "Only HealingMod applies" rule.

**Training dummy behavior (prior in-game finding):** Life Drain cast on a training dummy produces **no heal** across all damage magnitudes. This is a **gameplay rule**, not engine math. The simulator projects what lifesteal WOULD heal given damage output; it does not implement a target-type exclusion. Document in `unresolved_questions.md` but do not implement in engine.

### LOCK C — Corrected Life Drain formula (binding)

```
heal_per_tick = ceil(postDR_damage_per_tick × lifestealRatio × (1 + HealingMod))
```

Where:
- `postDR_damage_per_tick` = the per-tick post-DR damage number from the engine's damage projection (equivalent to `damageProjection.hit.body` in the code for a DoT body-only projection).
- `lifestealRatio` = per-atom authored value (Life Drain: 1.0).
- `HealingMod` = sum of all HealingMod-phase bonuses active on the caster (Vampirism: +0.20; any other future sources — Blood Exchange's buff-driven path is Phase 10).
- `ceil()` applies at display-surface; internal HP tracking uses decimals per `healing_verification.md:49`.

**Not applied to the heal multiplier:**
- `HealingAdd` (Magical Healing / Physical Healing flat stats) — per VERIFIED Scenario C.
- `MPB` directly — MPB contributes to the damage value itself, which feeds the post-DR basis; it does NOT multiply the heal a second time.
- `Scaling` (tooltip parenthetical value) — irrelevant for lifesteal; the atom's lifestealRatio is the scaling.

Generalizes to all DAMAGE_ATOMs with `lifestealRatio`: the formula above applies uniformly. Physical vs magical damage types dispatch to their respective damage projection paths; lifesteal reads `hit.body` from whichever projection was produced.

### LOCK D — Engine refactor scope (binding)

**Delete:** `computePhysicalPreDR` and `computeMagicalPreMDR` from `src/engine/projectDamage.js`. They were scaffolding for the incorrect pre-MDR lifesteal interpretation.

**Update:** The lifesteal-derivation dispatch inside `projectDamage` (the block that runs for atoms with `lifestealRatio != null && lifestealRatio > 0`) reads `hit.body` from the just-computed projection directly.

**Preserve:**
- The `calcHealing(baseHeal = heal_amount, scaling = 0, healingMod)` routing — scaling = 0 correctly zeros out HealingAdd and MPB per LOCK C; HealingMod multiplication happens inside calcHealing as designed.
- The `derivedHealDescriptors` return-value flow from projectDamage → projectHealing (if it exists; grep). The refactor changes what the descriptor's heal amount is computed from, not how descriptors propagate.
- `damage.js` in entirety. `calcHealing` contract unchanged.
- `percentMaxHealth` on HEAL_ATOM (arch-doc § 16.3) — target max HP derivation, no damage involvement.
- `targetMaxHpRatio` on DAMAGE_ATOM (arch-doc § 16.4) — target max HP derivation, no damage involvement.

### LOCK E — `lifestealOnDamage` stat-driven path is OUT OF SCOPE

Barbarian's Blood Exchange ("heal 10% of damage dealt while active") is a buff-driven lifesteal model (STAT_EFFECT_ATOM → Stage 6 post-process) that doesn't exist in the current engine. **Do not author it in 6.5d.**

- No STAT_META entry for `lifestealOnDamage` in this phase.
- No Stage 6 post-process for buff-driven lifesteal.
- No Barbarian class data.

This is deferred to **Phase 10 Barbarian migration** (Blood Exchange is the forcing function). Flag as a Follow-up in the Completion Report. Authoring infrastructure without a consumer risks drift.

### LOCK F — VERIFIED Warlock damage test points (8/8 physical + 8/8 spell) must stay green unchanged

Per `docs/damage_formulas.md:229–253`, the Warlock anchor has 16 VERIFIED damage test points. The refactor doesn't touch damage math (only reads the projection); damage tests should pass pre- and post-refactor with identical values. If any damage test breaks, that's a regression, not an expected change — STOP and investigate.

### LOCK G — Lifesteal test values WILL change to match corrected math

Any existing test that asserts a Life Drain heal value based on pre-MDR math is incorrect and needs updating to match the new post-DR formula per LOCK C + the VERIFIED data in LOCK B. This is an expected cascade; update deliberately with citations to LOCK B. The Life Drain VERIFIED fixture (new in this phase) is the single authoritative regression gate — assert exactly the values in LOCK B's scenario tables.

### LOCK H — No UI code

`src/App.jsx`, `src/components/*` stay untouched. Phase 7 does UI.

### LOCK I — Single commit, no sub-phasing

Phase 6.5d is small enough to ship as one commit at Stage 5 sign-off. No splitting into 6.5d.1 / 6.5d.2. Progress doc captures the step-by-step, but the coordinator commits once.

### LOCK J — Performance non-regression

Re-measure `max-loadout.fixture.js` snapshot time pre- and post-refactor. Expect delta ≤ 0 ms (the refactor eliminates two helper functions; code is simpler). If post > pre by any meaningful amount, investigate before Completion Report.

---

## Phase-specific nuances you must surface in the plan

1. **The refactor is a simplification, not an extension.** Code volume DECREASES (two helpers gone; single read site replacing them). This is rare — treasure it. Don't sneak in anything else.

2. **Training-dummy no-heal is a gameplay fact, not engine math.** The stat simulator projects what lifesteal WOULD heal given damage output. It does not filter by target type. Document the gameplay rule in `unresolved_questions.md` (so future testing uses real targets) but do not implement target-exclusion in engine. User tests lifesteal on real targets; sim projects lifesteal for whatever the user's damage setup produces.

3. **Ceiling is applied at display-surface.** Per `healing_verification.md:49` ("HP is tracked with decimals; in-game display uses ceil()"), `calcHealing` likely applies ceil at return. Confirm during Stage 2 plan; if it's not already there, add it without expanding scope.

4. **Variance in user's damage per tick (5/5/4/5) reflects decimal HP tracking or fractional per-tick damage values.** Life Drain at base 4 × (1 + MPB 0.07) + 5 weapon magical = ~9.28 per tick pre-MDR, post-MDR depends on target. The 4/5 integer variation is consistent with fractional per-tick damage + ceil/floor accumulation — not a special mechanic. The existing damage math already produces this pattern; don't instrument anything new.

5. **Magic Damage atoms dispatched at `projectDamage.js:~64` with `trueDamage && !isPhysical`** (inline `Math.floor(atom.base)` branch for magical true damage like Shadow Touch) DO NOT have `lifestealRatio` in current Warlock data. Confirm during Stage 1 sweep; not a concern for 6.5d refactor but worth knowing the dispatch.

6. **Progress doc.** Maintain `docs/session-prompts/phase-6-5-d-progress.md` during Stage 4. Simple step checklist; timestamps; crash resilience.

7. **You are reporting to the coordinator, not the user directly.** The user relays your reports. Draft for the coordinator audience — terse, decision-ready, explicit about deviations.

8. **`healing_verification.md § Verification Data`** (the test-table section at `:53–66`) is dedicated to Instant Base Heal test points (Poor Healing Potion). Add a **new adjacent table** for Life Drain Lifesteal test points per LOCK B scenarios A/B/C; do not overwrite the Poor Healing Potion table. Heading: `## Verification Data — Life Drain Lifesteal (2026-04-17)`.

9. **`unresolved_questions.md:268–278`** currently has a "Status: VERIFIED (2026-04-13) — single data point" annotation. The new data supersedes; rewrite with `Status: VERIFIED (2026-04-17) — multi-scenario; single data point at 2026-04-13 mis-interpreted original reading.`

---

## Sub-agent guidance

- **Stage 1 (Context Gather).** Spawn `Explore` in parallel for four independent sweeps: (a) pre-DR call-site inventory, (b) lifesteal test inventory, (c) derivation-flow trace, (d) VERIFIED-doc-reference sweep. Each self-contained.
- **Stage 2 (Plan).** Main session synthesizes. Small scope; no Plan sub-agent needed.
- **Stage 4 (Execute).** Mostly main session. `Explore` for a final re-grep of `computePhysicalPreDR` / `computeMagicalPreMDR` after Step 6 deletion to confirm zero remaining references before Completion Report.

When spawning, brief fully. Aggregate. Keep state in main session.

---

## Guardrails

- **Accuracy first** — every value cites LOCK B or follows from LOCK C's formula.
- **Scope bound to LOCK D** (engine refactor) + LOCK A (authorized doc edits).
- **LOCK E stands — `lifestealOnDamage` is Phase 10.**
- **LOCK F stands — VERIFIED damage test points (8/8+8/8) green throughout.**
- **LOCK J stands — perf delta ≤ 0 ms.**
- **No UI code, no scope expansion, no opportunistic cleanups.**
- **Maintain the progress document throughout Stage 4.**

---

## When in doubt

Re-read LOCK B (VERIFIED data) + LOCK C (corrected formula) + LOCK D (refactor scope). Re-read this prompt's Locked section.

If a test value doesn't derive cleanly from LOCK C applied to a known config: surface in Open Questions. Don't back-solve a plausible-looking value.

If an engine behavior outside the refactor scope surfaces as suspect during implementation: that's a Follow-up, not a scope expansion. Flag in Completion Report.

If the grep sweep finds a reference to "pre-MDR" or "before reductions" outside the authorized doc spans: flag in Open Questions. Do not rewrite unilaterally.

**Begin with Stage 1.**
