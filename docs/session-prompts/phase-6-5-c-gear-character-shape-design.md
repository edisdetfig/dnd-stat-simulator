# Phase 6.5c — Gear & Character Shape Design — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 6.5c of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo + the Phase 6.5a and 6.5b outputs. Read, don't assume. Decide, don't defer.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker. Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage / heal / shield projections + available abilities. No time passes, no events fire. See `docs/perspective.md` for the full mental model.

The project is mid-rebuild:
- Phases 0–6 shipped the engine (12 modules under `src/engine/`, public entry `runSnapshot`, commit `0e69523`).
- **Phase 6.5** is an inserted sub-phase closing two shape gaps before Phase 7 wiring. Three sub-phases: 6.5a (wiki facts — DONE, `7ba5734`), 6.5b (current-state mapping + gap inventory — DONE, `62c64c3`), 6.5c (clean-slate shape design — this phase).

**You are executing Phase 6.5c.** This phase is **design + implementation**. Unlike 6.5a and 6.5b, you produce:

1. **Shape files.** `src/data/gear/gear-shape.js` + `src/data/character/character-shape.js` (or equivalent paths — OQ-D10 resolves here). Parallels `src/data/classes/class-shape.js`.
2. **Concrete examples.** Parallel to `src/data/classes/class-shape-examples.js`. Each new shape decision grounded in real metadata from `docs/session-prompts/gear-shape-design.md § 4`.
3. **Normalizer spec.** Character + Gear → `Build` (or direct to `ctx`, per OQ-D3). Implemented if that's the cleaner path; spec-only if it's better to commit implementation as a follow-on.
4. **Validator spec + implementation.** Parallel to `src/data/classes/class-shape-validator.js`. Three-tier scope (definition / instance / character-gear) per OQ-D9.
5. **Engine-seam changes**, if Structural gaps from `docs/gear-character-mapping.md § 4` require them. Commit deliberately; do not accidentally.
6. **Resolution of all 12 OQ-Ds** in `gear-character-mapping.md § 5` — OQ-D1 through OQ-D10 (refined by 6.5b) plus OQ-D11 / OQ-D12 (new from 6.5b). Each OQ-D gets a **decision**, not a deferral.

The three-priority hierarchy and the project's accuracy-first doctrine bind this phase.

---

## Mandatory reading order

Read these before anything else. Do not skim.

1. **`CLAUDE.md`** — project-level guidance. Accuracy-first doctrine, two-namespace stat model (STAT_META vs RECIPE_IDS).
2. **`docs/session-prompts/gear-shape-design.md`** — the requirements doc. §1 (framing — clean-slate mandate, authoritative-source doctrine, integration-seam-only rule), §3 (locked decisions L1–L14), §4 (authoritative metadata — 11 slots, stat registry, item examples, 10 per-slot modifier pools, exclusion rules), §5 (OQ-W — already answered by 6.5a), §6 (OQ-D — refined by 6.5b). **§3 locks are binding; §4 is authoritative source.**
3. **`docs/gear-wiki-facts.md`** — Phase 6.5a output. §2 per-stat phase/curve table (authoritative for pipeline phase assignments), §3 weapon property math, §11 on-hit effects, §15 persistent UNRESOLVED items, Appendix A (STAT_META entries outside §4.3). **Use §2 exactly when authoring stat phase assignments.**
4. **`docs/gear-character-mapping.md`** — Phase 6.5b output. **Your primary scope anchor.** §2 current-state, §3 gap inventory (Additive / Structural / Net-new classifications), §4 design implications (Structural gaps → engine module roll-up), §5 refined OQ-Ds (OQ-D1–D12), §6 6.5a UNRESOLVED cascade. **§3's classifications tell you what must change where.**
5. `docs/rebuild-plan.md § Phase 6.5` — Phase 6.5 charter + phase-gate discipline.
6. `docs/coordinator-role.md` — coordinator role + report conventions.
7. `docs/perspective.md` — mental model. Principles 1 (snapshot, not real-time), 3 (atoms are self-contained), 6 (UI emerges from data), 7 (data-driven, class-agnostic).
8. `docs/engine_architecture.md` — engine contract. §3 pipeline, §4 Snapshot shape, §5 Ctx shape (what your normalizer outputs), §6 atom contracts, §7 phase table, §15 damage projection math (gear weapon consumption). Required reading before you design any engine-seam change.
9. `docs/engine_implementation_plan.md` — module contracts. Cross-reference before engine changes.
10. `docs/class-shape-progress.md` — class-shape locked decisions. `armorProficiency` and `grants[]` / `removes[]` (class-side of L10).

**Shape-design precedents (read for shape + authoring style, not for content):**
11. **`src/data/classes/class-shape.js`** — the reference for shape file style. Your gear-shape and character-shape files follow its structural pattern (exported CLASS_SHAPE / SUB_SHAPE consts, comment-heavy, authoritative-not-implementation).
12. `src/data/classes/class-shape-examples.js` — the reference for example-file style. Each example is a concrete, real, validated case drawn from actual metadata / verified sources.
13. **`src/data/classes/class-shape-validator.js`** — the reference for validator implementation style. Rule codes (`C.stat`, `D.required`, etc.), test-mode throw / dev-mode warn, canonical-source reads from `STAT_META` / `EFFECT_PHASES` / etc.
14. `src/data/classes/class-shape-validator.test.js` — the reference for validator test style. Happy + failure cases, exhaustive rule coverage.
15. `src/data/stat-meta.js` — STAT_META + its `gearStat` flag convention. Every new stat from §4.3 that lands in STAT_META follows this shape + flag.
16. `src/data/constants.js` — canonical enums (`EFFECT_PHASES`, `CONDITION_TYPES`, `WEAPON_TYPES`, `ARMOR_TYPES`, `GRANT_REMOVE_TYPES`, `RARITY_CONFIG`, `RARITY_ORDER`). Extend where new vocabulary lands; do not duplicate.

**Engine source (modules that may change; read in full if touching):**
17. `src/engine/buildContext.js` — Stage 0. Availability resolver (`resolveAvailability`, grants/removes fixpoint at 213–239 — currently `type: "ability"` only). `deriveWeaponState` at 132–151 (currently single-weapon). Your normalizer + OQ-D7 decision likely touches here.
18. `src/engine/aggregate.js` — Stage 4. `ctx.gear.bonuses` consumer at its Stage 4 entry. Touched only if OQ-D routes on-hit riders through gear bonuses.
19. `src/engine/projectDamage.js` — Stage 6. Spiked Gauntlet math lands post-floor (per `docs/damage_formulas.md:155–159`); OQ-D6 picks the shape for riding along.
20. `src/engine/recipes.js` + `src/engine/deriveStats.js` — Stage 5. Recipe consumers of `bonuses`. No direct gear consumption; touched only if new stat categories (weapon-properties) need new recipes.

**Test harness:**
21. `bench/fixtures/max-loadout.fixture.js` — canonical `Build` + flat gear shape. After your normalizer lands, this fixture may be re-expressed in the new shape + normalized through your function; or left in the flat form as the engine-input seam anchor. You decide.
22. `bench/fixtures/warlock-*.fixture.js` — anchor-class fixtures. Must still pass after any engine changes (8/8 physical + 8/8 spell VERIFIED test points from `docs/damage_formulas.md`).

**Commit context:**
- `62c64c3` — Phase 6.5b (gear-character-mapping.md).
- `3b45619` — Phase 6.5b DONE in coordinator index.
- `7ba5734` — Phase 6.5a (gear-wiki-facts.md + requirements doc).
- `0e69523` — Phase 6 engine implementation baseline.

**Use `Explore` sub-agents** for cross-cutting reads. Good candidates: (a) inventory of every engine-test reference to gear-shape fields (to know what tests will need updating if you change ctx.gear); (b) inventory of every STAT_META entry with `gearStat: true` (to know the current gear-stat surface); (c) inventory of authoring patterns in `class-shape.js` + `class-shape-examples.js` (to anchor your shape style).

**Do NOT use `WebFetch` or `WebSearch`** — wiki research is Phase 6.5a's deliverable. If you find yourself wanting wiki content, it's in `gear-wiki-facts.md`; cite from there.

---

## Your mission — Phase 6.5c in one sentence

Produce `src/data/gear/gear-shape.js`, `src/data/character/character-shape.js`, concrete examples files, a normalizer (spec or implementation) translating Character + Gear into the engine's `Build` or `ctx`, validators for all three scopes (item definition / item instance / character-gear consistency), and any engine-seam changes the Structural gaps in `gear-character-mapping.md § 3` require — while resolving every OQ-D1–D12 with a principled decision, preserving the two-namespace stat model, and keeping all existing verified-math + module tests green.

See `docs/rebuild-plan.md § Phase 6.5` for the sub-phase charter.

---

## The three-priority hierarchy (governs every tradeoff)

From `docs/rebuild-plan.md § Constraints`:

1. **Performance first.** Snapshot recompute stays < 50ms (Phase 6 budget). The normalizer adds ≤ 5ms. Re-measure after any engine-seam change.
2. **Class-agnostic, second.** The new shapes do not hard-code class identities, ability ids, or stat ids. `requiredClasses` on items is data, not engine dispatch. Adding a new class is a data change only (same rule class data already follows).
3. **Engine-mechanic extension ease, third.** New shape features land via dispatch tables + registry entries, not pipeline rewrites. Adding a new rarity, a new weapon type, a new slot is a constants/data edit plus (at most) one validator rule.

When priorities conflict, top of list wins.

**Accuracy-first doctrine (applies throughout):**

- **Every stat's pipeline phase traces to `gear-wiki-facts.md § 2`** (or `docs/damage_formulas.md` / `healing_verification.md` / `season8_constants.md` where VERIFIED). Do not assign phases by intuition.
- **Every per-slot modifier pool** authored in the shape traces to `gear-shape-design.md § 4.5` verbatim (modulo the three 2H naturalRange corrections already in §4.5 per the 2026-04-17 revision).
- **Every gap resolution** cites the gap's classification (Additive / Structural / Net-new) from `gear-character-mapping.md § 3`.
- **When a question is genuinely ambiguous** (no metadata-sourced answer, no wiki-sourced answer, no principled precedent from class-shape), **surface to the coordinator in the Plan Report or as a Question N: item**; do not guess.

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 6.5c in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

This phase is larger than 6.5a and 6.5b. In your Plan Report, **you may propose sub-phasing** (e.g., 6.5c.1 shape files + validator; 6.5c.2 normalizer + engine-seam changes) if the scope warrants. The coordinator + user decide. A single-phase execution is also acceptable.

### Stage 1 — Context Gather → Terse Map

Read the files above. The three most load-bearing are `gear-shape-design.md`, `gear-wiki-facts.md`, and `gear-character-mapping.md` — read them in full. Other files: targeted reads.

Via `Explore` sub-agents (parallelizable) — candidates:

- **Class-shape authoring pattern inventory.** Walk `class-shape.js` + `class-shape-examples.js` + `class-shape-validator.js`. Extract: file-header conventions, export patterns, comment density, example-per-pattern density, validator rule-code naming, test-mode dispatch, canonical-source reads. Your new shape files mirror this style.
- **`gearStat: true` inventory.** Every STAT_META entry with the flag. Cross-reference with §4.3 registry. Any §4.3 stat that's in STAT_META but missing the flag? Any STAT_META entry with the flag but not in §4.3? Prep for OQ-D4 reconciliation.
- **Engine-test gear-field inventory.** Every `buildContext.test.js` / `projectDamage.test.js` / etc. reference to `build.gear.*` or `ctx.gear.*`. Tells you what you have to re-author if the engine seam changes.
- **Fixture gear-shape inventory.** `bench/fixtures/*.js` gear objects. Shape delta if normalizer lands.
- **`example-builds.js` item authoring inventory.** Lines 84 / 105 / 124 / 142 / 167 / 185 (armorType authoring) + other inherent / modifier structure. Authoring patterns your examples can follow or improve on.

Produce a written **Terse Map** covering:

- The three-doc synthesis: each of L1–L14, each §4.x section, each §2–§11 wiki-fact table, each §3.N gap, each §5 OQ-D (D1–D12) — condensed into a single decision-ready summary. This is the hardest artifact of Stage 1 and the most load-bearing for Stage 2.
- Class-shape authoring pattern skeleton (what your shape files will look like).
- STAT_META reconciliation inventory update (§4.3-aligned, with `gearStat` flag status per stat).
- Engine-test + fixture-gear inventory (what will break if ctx.gear shape changes).
- Proposed sub-phasing (if you recommend it) with scope boundaries.
- Open questions to the coordinator — your asks before committing to the plan (legitimate; not guessing).

### Stage 2 — Plan

Produce a detailed design + implementation plan covering:

**A. Shape decisions.** For each of the 11 slot types (§4.1), the item shape (§4.4 precedents — `slotType`, `armorType`, `weaponType`, `handType`, `requiredClasses`, `availableRarities`, `modifierCountOverrides`, `inherentStats`, `socketExclusionOverrides`, `onHitEffects`, plus inherent-only weapon properties from L4), and the Character shape (identity fields, persistent selections, gear loadout reference, attribute allocation, session state boundary): propose the shape structure. Cite source (L-number, §4.x, OQ-D-number).

**B. OQ-D resolutions.** For each OQ-D1 through OQ-D12: decide. Format per OQ-D:

```
OQ-D<N> — <topic>
- Original question: <from gear-shape-design.md §6 or gear-character-mapping.md §5>
- 6.5b refinement: <what mapping surfaced>
- Decision: <the chosen approach>
- Rationale: <why, tied to one of the three priorities + any locked decisions L1–L14>
- Consequence: <what this implies for shape / engine / validator / examples>
```

If a decision is genuinely blocked on coordinator input, list as `Question N:` in the Plan Report, NOT inside the OQ-D section (OQ-D entries ship with decisions).

**C. Engine-seam changes.** From `gear-character-mapping.md § 4` (Structural roll-up): each seam change gets a plan:

- Module + file:line affected.
- Current signature / behavior.
- New signature / behavior.
- Backward-compat strategy for tests + fixtures.
- Test additions required.
- Budget impact (< 50ms stays).

**D. Validator scope (OQ-D9).** Three-tier plan:

- Item definition validator (shape / required fields / enum-membership for `slotType`, `armorType`, `weaponType`, `handType`; pool membership).
- Item instance validator (rarity / modifier count / exclusion-group membership / range bounds natural-vs-socketed per OQ-D1 / value-within-range).
- Character-gear consistency validator (class proficiency / requiredClasses / item-slot compatibility / no duplicates in same loadout / weaponHeldState consistency).

Each tier: where it lives, when it runs (test-time + runtime?), rule codes.

**E. Normalizer.** Character + Gear → engine `Build`. Decide: spec-only vs implement here. If implement: where it lives (`src/engine/normalizeBuild.js` / `src/data/character/normalize.js` / other), what it does per OQ-D3, budget impact.

**F. File locations (OQ-D10).** Decide. Cite parallels to `src/data/classes/*`.

**G. Engine-test / fixture impact.** Every test + fixture that needs updating. Author the update plan alongside the engine change plan.

**H. Execution sequence.** Propose your order. A reasonable default:

```
Step 0  — Publish shape files (gear-shape.js, character-shape.js) — pure data-contract files, no runtime behavior
Step 1  — Publish example files (examples parallel to class-shape-examples.js)
Step 2  — Publish constants/registry extensions (new rarity rules / exclusion groups / etc., if any)
Step 3  — Publish validator (definition tier)
Step 4  — Publish validator (instance tier)
Step 5  — Publish validator (character-gear consistency tier)
Step 6  — Validator tests — happy + failure cases per rule
Step 7  — Engine-seam changes (if any) — per Structural gap, module by module
Step 8  — Normalizer (spec or implementation)
Step 9  — Fixture updates (Build-shape re-expression where needed)
Step 10 — Full `npm test` pass; confirm 8/8 physical + 8/8 spell VERIFIED points; perf benchmark
Step 11 — Doc updates: class-shape-progress.md § Gear-shape open questions (close the Spiked-Gauntlet-onHit parked item); engine_architecture.md if ctx shape changed; perspective.md if principles shift (unlikely)
```

Adjust with rationale.

**I. Plan must also cover:**

- Decisions requiring user sign-off (numbered list).
- Risks (especially: engine-seam changes that could regress VERIFIED test points).
- Open questions to the coordinator (not OQ-Ds — those get decided; these are true asks).
- Performance budget impact (Stage 0 add, normalizer cost, any aggregated delta).

### Stage 3 — STOP — Plan Report

Emit the **Plan Report** in exactly this format:

```markdown
# Phase 6.5c — Plan Report

## Terse map
[three-doc synthesis; class-shape authoring pattern skeleton; STAT_META reconciliation update; engine-test+fixture inventory; sub-phasing proposal if any; scope-clarification OQs]

## Shape design
[gear-shape top-level structure; character-shape top-level structure; per-slot item shape; inherent-vs-modifier distinction; pool reference mechanism; rarity integration; on-hit-effect shape]

## OQ-D resolutions (D1–D12)
[12 entries, each with original / refinement / decision / rationale / consequence]

## Engine-seam changes
[per Structural gap from gear-character-mapping.md § 4: module, current, new, tests, budget]

## Validator plan
[three-tier scope; rule codes; test plan]

## Normalizer plan
[location; spec vs implementation; budget]

## File locations
[paths + rationale, per OQ-D10]

## Execution sequence
[Step 0–N with rationale]

## Decisions requiring user sign-off
[numbered list]

## Risks
[bullets, especially around VERIFIED test points + budget]

## Open questions
[true asks, not OQ-Ds]

## Sub-phasing proposal (if any)
[optional: propose 6.5c.1 / 6.5c.2 split with scope boundaries]
```

**WAIT for explicit user sign-off.** Revise and re-emit if feedback comes back. Do not proceed to Stage 4 without explicit "approved."

### Stage 4 — Execute

Once signed off, execute per the plan. Maintain `docs/session-prompts/phase-6-5-c-progress.md` for crash resilience (step checklist; timestamps on start / complete).

**Inner-loop discipline (per step):**

1. Implement the step.
2. Run `npm test` (incremental — just the affected tests + the full verified-math suite).
3. If engine changed: run `bench/fixtures/max-loadout.fixture.js` through `runSnapshot` to smoke-test perf.
4. Update progress doc.
5. Move to the next step.

**Discipline:**

- **Class-agnostic absolute.** No `if (className === ...)` or `if (stat === "physicalDamageBonus")` branches in new code.
- **Two-namespace stat model preserved.** New stats from §4.3 land in STAT_META (with `gearStat: true`) unless they're recipe outputs (RECIPE_IDS). Per `CLAUDE.md` + `src/data/stat-meta.js`.
- **VERIFIED test points must pass.** If an engine-seam change breaks `bench/fixtures/warlock-*.fixture.js` math, stop and investigate; do not shim.
- **< 50ms budget preserved.** Any normalizer + engine-seam addition re-measures via `bench/fixtures/max-loadout.fixture.js`.
- **Authoring-first, implementation-second where possible.** The shape + examples + validator form a contract a future sub-phase could implement if it's a lot of code. The Plan Report decides what ships in this phase vs later.
- **No UI code.** Phase 7 does UI wiring. Phase 11 does full UI rebuild.
- **Metadata §4.x is authoritative**: per-slot pools, item examples, exclusion rules. Do not rename stat ids, re-author ranges, or invent new slot types. If §4.x has a gap you need to fill, it's a coordinator question, not a silent authoring decision.

### Stage 5 — STOP — Completion Report

Emit the **Completion Report** in exactly this format:

```markdown
# Phase 6.5c — Completion Report

## Files created / modified
[paths + one-line purpose each]

## Shape files
[gear-shape.js summary; character-shape.js summary]

## Examples files
[what's covered; cross-reference to metadata §4.x examples]

## Validator implementation
[rule codes added; test coverage; happy + failure case count]

## Normalizer
[implemented vs spec-only; path; budget]

## Engine-seam changes
[per Structural gap: what landed, VERIFIED test status after, bench time]

## OQ-D resolutions shipped
| OQ-D | Decision | Files touched |
|---|---|---|
| D1 | ... | ... |
...
| D12 | ... | ... |

## Performance impact
- Budget: < 50ms (Phase 6 baseline)
- Measured: Nms (max-loadout fixture)
- Delta: +Nms

## Test status
- `npm test`: N/N passing (pre-phase: N/N)
- VERIFIED physical (8/8): passing / failing
- VERIFIED spell (8/8): passing / failing
- Phase 6 module tests: N/N
- New validator tests: N/N

## Doc updates
[class-shape-progress.md entries closed; engine_architecture.md updated sections; etc.]

## Deviations from plan
[per item + rationale]

## Follow-ups (non-blocking, out of scope)
[Phase 7 / Phase 10 / Phase 11 items surfaced]
```

**WAIT for explicit user sign-off.** Revise per feedback. Do not declare Phase 6.5c complete without explicit sign-off.

---

## Locked from coordinator (binding for Phase 6.5c)

These are settled — do not re-litigate.

### LOCK A — Decisions, not deferrals
OQ-D1 through OQ-D12 each ship with a **decision** in the Plan Report + Completion Report. If an OQ-D is genuinely blocked on coordinator input, surface as a `Question N:` item before Stage 4 begins — get sign-off on the ask, then decide. You do not emit a Completion Report with unresolved OQ-D entries.

### LOCK B — Metadata §4.x is authoritative
The 11 slots (§4.1), the stat ID registry (§4.3), the four item examples (§4.4), the 10 per-slot modifier pools (§4.5), the modifier exclusion rules (§4.6) are the ground truth. Your shape files adopt this metadata verbatim. You do not rename stat ids, re-author ranges, or invent new slot types. If §4.x has a gap (e.g., secondaryWeapon pool not explicitly defined), surface as a `Question N:` item.

### LOCK C — Locked decisions L1–L14 are binding
From `gear-shape-design.md § 3`. Particularly load-bearing:
- **L1** — Unique rarity = 1 modifier × 3× range. Your rarity implementation encodes this; not just `modCount: 1` (which matches `constants.js:276`), but the 3× amplification rule per `gear-character-mapping.md § 3.5`.
- **L4** — weapon-property stats (`comboMultiplier`, `impactZone`, `swingTiming`, `impactPower`, `impactResistance`) are inherent-only; they do NOT appear in per-slot modifier pools. Your shape enforces this asymmetry.
- **L5** — `weaponHeldState` canonical values are `"unarmed" | "slot1" | "slot2"`. Not `"none" | "weaponSlot1" | "weaponSlot2"` (that's stale UI per `GearPanel.jsx:30–32`; Phase 7 handles the rename).
- **L6** — Off-loadout contributes nothing. Your normalizer picks the held loadout; discards the other for engine purposes.
- **L7** — `Bonus` suffix is context-sensitive. Per-stat audit: `maxHealth` vs `maxHealthBonus` are **mechanically distinct** (flat post-curve vs percent-of-total). `physicalDamageReduction` ≡ `physicalDamageReductionBonus` (naming variant). OQ-D4 resolution audits per-stat.
- **L9** — Jewelry has no class gating. Ring pool shared between `ring1` and `ring2`.
- **L10** — `requiredClasses` + `armorProficiency` interaction. Both gates must pass. Warlock Demon Armor granting plate = `armorProficiency` extension via class `grants[]`.
- **L12** — Rarity modifier-count table. `RARITY_CONFIG` at `constants.js:269–278` matches the standard; your implementation uses / extends this.
- **L13** — Sim modifier selection: user picks modifiers + values in range; no "active subset" layer. OQ-D1 decides whether natural vs socketed distinction is surfaced in shape.

### LOCK D — Two-namespace stat model preserved
Per `CLAUDE.md` + `src/data/stat-meta.js`:
- **STAT_META keys** = additive-contribution stat ids (gear affixes, perk contributions, etc.). `gearStat: true` flag identifies stats gear can roll.
- **RECIPE_IDS entries** = recipe outputs (hp, pdr, mpb, etc.) — valid as `effect.stat` **only** when `phase === "cap_override"`.
- **New stats from §4.3 registry** land in STAT_META (with `gearStat: true`) unless they're recipe outputs. Weapon-property inherents (L4 `comboMultiplier`/`impactZone`/`swingTiming`; plus `impactPower`/`impactResistance` already in STAT_META per `stat-meta.js:97, 121`) may need a new category or may stay in STAT_META with `gearStat: false` — OQ-D4 decides.

### LOCK E — Class-shape style precedent
Your shape files + validator mirror the style of `src/data/classes/class-shape.js` + `class-shape-validator.js`. Per-rule codes. Test-mode dispatch. Canonical-source reads. Happy + failure tests. Comment-heavy shape file. This is a stylistic lock; deviations need explicit Plan Report justification.

### LOCK F — Engine-seam changes are deliberate
Any change to `src/engine/*.js` is justified by a Structural gap from `gear-character-mapping.md § 4`. You do not touch `projectDamage.js` to "clean up something" while you're in there. Each engine-edit has: (a) gap it closes, (b) VERIFIED-test status before + after, (c) budget delta. Drive-by edits are authoring errors.

### LOCK G — No UI code
`src/App.jsx` / `src/components/*` stay untouched. Phase 7 wires UI. If your normalizer needs a UI call site, document the seam but do not author the call.

### LOCK H — `bench/fixtures/` updates are in scope; other test data is not
Fixtures under `bench/fixtures/` may be updated to reflect the new gear shape (if normalizer lands) or stay flat (if normalizer is spec-only). You own this decision. `src/engine/*.test.js` updates are in scope when engine seams change. You do not touch `src/data/classes/*.test.js` or any test under a class migration.

### LOCK I — Close the Spiked Gauntlet parked question
`docs/class-shape-progress.md § Gear-shape open questions § 1` (the Spiked Gauntlet onHit parked item) is closed by your OQ-D6 decision. Update that doc to reflect resolution. (Coordinator will approve the edit during Completion Report review; you are permitted to edit `class-shape-progress.md` in this phase — LOCK C from prior phases does not apply here since the specific item being edited is the Gear-shape open questions subsection that this phase resolves.)

### LOCK J — Performance budget
< 50ms snapshot recompute for max-loadout fixture. Pre-phase baseline: measure once at Stage 1 end. Post-phase measurement in Completion Report. If delta > +5ms, investigate.

### LOCK K — Class data remains on v3
You do NOT migrate class data to the new Gear shape in this phase (that's Phase 10). Warlock stays in its current new-shape form. Other classes stay in v3. Your normalizer + validator + shape must work for Warlock data as-is; they don't need to accommodate every class yet.

---

## Phase-specific nuances you must surface in the plan

1. **OQ-D1 (natural vs socketed) is a shape design choice, not a UX choice.** Merged vs split determines whether your item-instance shape carries a `source: "natural" | "socketed"` flag per modifier, or two separate arrays. Pick; don't defer to UI.

2. **OQ-D2 (Character boundary) interacts with Phase 7.** Whatever you decide, App.jsx (Phase 7) will instantiate + mutate. Your Character shape is the React-state boundary. Identity fields (name, religion) + selections + attribute allocation + gear-loadout reference are the minimum; consider multi-character persistence as a **flag** (reserved / not-yet-implemented) rather than a full implementation.

3. **OQ-D3 (normalizer location) interacts with Structural gap density.** If OQ-D7 adopts path (a) (normalizer picks, ctx.weapon stays singular), normalizer absorbs the loadout logic. If path (b) (ctx carries both), buildContext generalizes. Pick OQ-D7 first, then OQ-D3 cascades naturally.

4. **OQ-D4 (STAT_META reconciliation) is narrow per 6.5b findings.** 44/49 §4.3 stats are already exact matches. 2 naming variants (L7 naming). 3 absent (L4 weapon properties). `maxHealthBonus` per L7 is the only tricky per-stat case. Aim for a minimal reconciliation: add missing entries with `gearStat: true`; document naming-variant choices (keep current names for engine-compat; document canonical-alias). 48 non-§4.3 STAT_META entries stay untouched (per `gear-character-mapping.md § 3.3` + `gear-wiki-facts.md Appendix A`).

5. **OQ-D6 (on-hit routing) has three candidate shapes, all landing at the same engine math position** (post-floor true-physical per `damage_formulas.md:155–159`). Decide on **data-placement grounds**: (a) `ctx.gear.onHitRiders: [{amount, damageType, trueDamage, scaling}]` — new ctx field, new aggregation step; (b) synthetic STAT_META key `additionalTruePhysicalDamage` — no new ctx field, routes through existing bonuses; (c) DAMAGE_ATOM field on weapon-primary-hit damage atom — lives on the atom, not the gear. Each has different coupling implications. Pick.

6. **OQ-D7 (two-loadout) cascades into OQ-D3 + buildContext.** Path (a) simpler today; path (b) more future-proof for per-loadout features. Recommend (a) unless you have concrete future-feature evidence.

7. **OQ-D8 (inherent materialization order)** is an algorithmic spec: (1) apply inherent stats, (2) compute exclusion-blocked set from inherent + socketExclusionOverrides, (3) user picks socketed from available pool, (4) validate exclusion-group membership including across natural+socketed. This is a validator spec, not an engine-seam change. Document precisely.

8. **OQ-D9 (validator tiering)** expects three validators, each with clear scope:
   - **Definition validator** (build-time): item-definition files pass this. Tests.
   - **Instance validator** (runtime): user's picked-item state passes this. Runtime-callable (though UI calls it).
   - **Character-gear consistency validator** (runtime): whole-loadout + character passes this. Runtime-callable.
   Different rule sets per validator. Don't cram them into one.

9. **OQ-D10 (file locations)** — follow `src/data/classes/` precedent. Expected:
   - `src/data/gear/gear-shape.js`
   - `src/data/gear/gear-shape-examples.js`
   - `src/data/gear/gear-shape-validator.js` (+ `.test.js`) — or split into three validators
   - `src/data/gear/item-instance-validator.js` etc.
   - `src/data/character/character-shape.js`
   - `src/data/character/character-shape-examples.js`
   - `src/data/character/character-shape-validator.js`
   - Normalizer: `src/engine/normalizeBuild.js` or `src/data/character/normalize.js` — OQ-D3 decides.

10. **OQ-D11 (craftable rule)** — wiki says craftable starts at Uncommon=2 and +1 per rarity. Candidates: (a) `modifierCountOverrides` per item (repeats craftable data everywhere); (b) `craftable: true` flag on item + rule in rarity system ("if craftable, +1 to baseline"). Pick (b) unless there's a reason; document. Also confirm whether "craftable" items can still be non-crafted (found as drops) — if so, this is per-instance, not per-definition.

11. **OQ-D12 (handType vs handed)** — canonical pick. `handType` is `§4.4` / metadata style; `handed` is `buildContext.js:139` / engine style. Pick one. Cascade the rename through shape + normalizer + buildContext if changing engine side.

12. **Progress doc.** Maintain `docs/session-prompts/phase-6-5-c-progress.md` during Stage 4. Simple step checklist; timestamps; per-step result summary (pass/fail). Crash resilience.

13. **You are reporting to the coordinator, not the user directly.** The user relays your reports. Draft for the coordinator audience — terse, decision-ready, explicit about deviations.

14. **Phase 6.5c is a larger phase than 6.5a + 6.5b combined.** Sub-phasing is an option. A reasonable split:
   - **6.5c.1** — Shape files + examples + validator + validator tests. No engine changes. Ships fast.
   - **6.5c.2** — Normalizer + engine-seam changes + fixture updates. Engine-touching; requires full test pass.
   Propose in the Plan Report if warranted.

---

## Sub-agent guidance

- **Stage 1 (Context Gather).** `Explore` for the five inventories listed in the Stage-1 description. Parallelizable; each self-contained.
- **Stage 2 (Plan).** Main session synthesizes. `Plan` sub-agent can draft the OQ-D decision matrix given the three source docs; main session reviews + finalizes.
- **Stage 4 (Execute).** Mostly main session. `Explore` for specific re-reads (e.g., "every occurrence of `ctx.gear` in engine code" to know what needs updating after a ctx-shape change). Do NOT spawn agents to author whole shape files or validators — aggregation lives in main session; shape files are design decisions + careful authoring.

When spawning, brief fully. Aggregate. Keep state in main session.

---

## Guardrails

- **Decisions, not deferrals** (LOCK A).
- **Metadata §4.x authoritative** (LOCK B).
- **Locked decisions L1–L14 binding** (LOCK C).
- **Two-namespace stat model preserved** (LOCK D).
- **Class-shape style precedent** (LOCK E).
- **Engine-seam changes deliberate + justified + test-gated** (LOCK F).
- **No UI code** (LOCK G).
- **Spiked Gauntlet parked question closed** (LOCK I).
- **Performance budget < 50ms** (LOCK J).
- **Class data stays on v3** (LOCK K).
- **Maintain the progress document throughout Stage 4.**

---

## When in doubt

Re-read `docs/session-prompts/gear-shape-design.md § 3` (locked L1–L14). Re-read `docs/gear-character-mapping.md § 5` (refined OQ-Ds). Re-read this prompt's "Locked from coordinator" section.

If a design decision is genuinely blocked on coordinator input, surface as `Question N:` in the Plan Report. Do not ship a Plan Report with unresolved OQ-D entries. Do not invent what the metadata doesn't say.

If an engine-seam change surfaces a regression in VERIFIED test points: stop. Investigate. A regression is never acceptable — either the change is wrong, or the test's verified value was under an assumption your change violates, and the verified doc needs updating (which is out of your scope and a coordinator escalation).

**Begin with Stage 1.**
