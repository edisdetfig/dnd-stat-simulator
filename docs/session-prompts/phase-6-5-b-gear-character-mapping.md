# Phase 6.5b — Gear & Character Mapping — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 6.5b of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo + the Phase 6.5a output. Read, don't assume. Cite, don't infer.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker. Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage / heal / shield projections + available abilities. No time passes, no events fire. See `docs/perspective.md` for the full mental model.

The project is mid-rebuild:
- Phases 0–6 shipped the performance harness, class-shape validator, Warlock migration, engine architecture + implementation (12 modules under `src/engine/`, public entry `runSnapshot`, commit `0e69523`).
- **Phase 6.5** is an inserted sub-phase to close the Gear and Character shape gaps before Phase 7 bakes implicit versions into the `App.jsx` wiring seam. Three sub-phases: 6.5a (wiki facts — DONE, commit `7ba5734`), 6.5b (mapping + gap analysis — this phase), 6.5c (clean-slate shape design).

**You are executing Phase 6.5b.** This phase is **research-only**. No code, no shape design, no architectural decisions. The output is:

1. A **current-state map** — what the gear-and-character data flow looks like today, across the engine, the data layer, the class data, the stale UI, and the fixtures. Every fact cites a file:line.
2. A **gap inventory** — per requirement (locked decisions L1–L14 from `gear-shape-design.md § 3`, authoritative metadata in `gear-shape-design.md § 4`, wiki-sourced facts from `gear-wiki-facts.md`), what does the current codebase provide, what's missing, and what seam has to move to close the gap.
3. A **refined OQ list** — updated Open Questions for Phase 6.5c design, informed by what the mapping surfaced.

Output lands in `docs/gear-character-mapping.md` (new) + progress tracker at `docs/session-prompts/phase-6-5-b-progress.md`.

The three-priority hierarchy and the project's accuracy-first doctrine bind this phase.

---

## Mandatory reading order

Read these before anything else. Do not skim.

1. **`CLAUDE.md`** — project-level guidance. Accuracy-first doctrine, verification levels.
2. **`docs/session-prompts/gear-shape-design.md`** — the canonical requirements doc. §1 (framing), §3 (locked decisions L1–L14), §4 (authoritative metadata), §5 (OQ-W research list — already answered by 6.5a), §6 (OQ-D design list — Phase 6.5c's scope, informs this phase's gap analysis). **You will map current state against every requirement in §3 and §4.**
3. **`docs/gear-wiki-facts.md`** — Phase 6.5a output. Per-stat phase/curve table (§2), weapon property math (§3), hit combos (§4), rarity rules (§9), on-hit effects (§11), class grants/removes (§12), STAT_META entries outside §4.3 registry (Appendix A), persistent UNRESOLVED items (§15). **These are authoritative for wiki-sourced mechanics; map current engine behavior against them.**
4. `docs/rebuild-plan.md § Phase 6.5` — Phase 6.5 charter. Operating-protocol conventions.
5. `docs/coordinator-role.md` — coordinator role + report conventions. Your Plan Report + Completion Report formats mirror prior-phase patterns.
6. `docs/perspective.md` — mental model. Principles 1 (snapshot, not real-time) and 6 (UI emerges from data) are load-bearing for character-shape scoping.
7. `docs/engine_architecture.md` — engine contract. §3 pipeline (stage flow), §4 Snapshot shape, §5 Ctx shape, §6 atom contracts, §6.5 GRANT/REMOVE atoms, §15 damage projection math (gear weapon consumption), §21 performance checkpoints. Cross-reference with gear-wiki-facts.md's phase assignments.
8. `docs/class-shape-progress.md` — locked decisions for class data. **"armorProficiency"** and **"grants[] / removes[]"** locked sections are the class-side of the gear gate (L10). **"Gear-shape open questions"** section holds a pre-Phase-6.5 noted gap (Spiked Gauntlet onHit); confirm it matches what 6.5a found.
9. `src/data/classes/class-shape.js` — schema. `armorProficiency` field, `grants`/`removes` atom contracts.
10. `src/data/classes/warlock.new.js` — only class migrated to new shape. Reference for how `armorProficiency` + class-level `grants[]` are authored today.

**Engine source (the integration seams):**
11. **`src/engine/runSnapshot.js`** — public entry. Trace how `Build` flows through to `Snapshot`. Note every `build.gear.*` / `build.attributes` / `build.weaponType` / `build.target` access.
12. **`src/engine/buildContext.js`** — Stage 0. Consumes `Build`; produces `ctx`. Pay close attention to `deriveWeaponState` (lines 132–151) and how `ctx.gear` is carried through. This is the primary input seam.
13. `src/engine/aggregate.js` — Stage 4. Consumes `ctx.gear.bonuses` (flat `Record<StatId, number>`) and folds into `bonuses[stat].gear`.
14. `src/engine/projectDamage.js` — Stage 6. Consumes `ctx.gear.weapon.{baseWeaponDmg, gearWeaponDmg, magicalDamage}` + `weaponType` + `ctx.target` in damage math.
15. `src/engine/projectHealing.js` / `src/engine/projectShield.js` — Stage 6 companions. Note any gear reads.
16. `src/engine/deriveStats.js` + `src/engine/recipes.js` — Stage 5. Which recipes take gear-derived bonuses as input (e.g., armor rating recipe → PDR output).

**Data + vocabulary:**
17. **`src/data/stat-meta.js`** — current STAT_META registry. Cross-reference with `gear-shape-design.md § 4.3` stat registry and `gear-wiki-facts.md Appendix A` (STAT_META entries outside the §4.3 registry).
18. `src/data/constants.js` — EFFECT_PHASES, ABILITY_TYPES, CONDITION_TYPES, WEAPON_TYPES, WEAPON_TYPE_CATEGORIES, ARMOR_TYPES, GRANT_REMOVE_TYPES, COST_TYPES, RARITY_CONFIG, RARITY_ORDER.
19. `data/stat_curves.json` — 17 piecewise curves. Some gear stats trace to specific curves (e.g., armorRating → PDR curve).

**Legacy gear infrastructure (to inventory, not preserve):**
20. `src/data/gear-defaults.js` — pre-rebuild `makeEmptyGear()` with the 11-slot taxonomy. Inventory the slot names + shape.
21. `src/data/gear/define-gear.js` + `src/data/gear/define-gear.test.js` — pre-rebuild gear validator (triggers[]-focused). Inventory what it validates; this is legacy seam information, not a template.

**Stale UI (integration-seam hints only, per `docs/rebuild-plan.md § Phase 7` notes; do NOT attempt to repair):**
22. `src/App.jsx` — imports resolve to archived paths; broken until Phase 7 rewire. Inventory what gear-shape fields the current UI passes around. **Don't modify.**
23. `src/components/panels/GearPanel.jsx` (if it exists) + `src/components/GearSlot.jsx` or similar — pre-rebuild gear UI. Inventory what data shape it expects.

**Fixtures (closest thing to a working Build shape today):**
24. **`bench/fixtures/max-loadout.fixture.js`** — the benchmark `Build` + `MAX_LOADOUT_GEAR`. This is your most concrete Build-shape example for mapping.
25. `bench/fixtures/warlock-*.fixture.js` — real-class fixtures. Note how they carry gear.
26. `bench/fixtures/minimal-loadout.fixture.js` — minimal reference.

**Commit context:**
- `7ba5734` — Phase 6.5a (gear-wiki-facts.md + requirements doc + Phase 6.5 roadmap).
- `d7291e9` — Phase 6.5a DONE in coordinator index.
- `0e69523` — Phase 6 engine implementation (the baseline Build shape).

**Use `Explore` sub-agents** for cross-cutting reads inside the repo. Parallelize: engine-surface inventory; STAT_META reconciliation; stale-UI gear-field inventory; class-side gate inventory; fixture Build-shape extraction. Each is independent.

**Do NOT use `WebFetch` or `WebSearch`** — the wiki research is Phase 6.5a's deliverable. Your job is mapping, not more research. If you find yourself wanting wiki content, it's already in `gear-wiki-facts.md`; cite from there.

---

## Your mission — Phase 6.5b in one sentence

Produce `docs/gear-character-mapping.md`: a current-state map of every gear-and-character surface in the codebase (engine seams, class-side gates, stale UI, fixtures, legacy infrastructure) plus a gap inventory keyed against every requirement in `gear-shape-design.md § 3–§4` and `gear-wiki-facts.md`, plus a refined Open Questions list for Phase 6.5c design — all with file:line citations.

See `docs/rebuild-plan.md § Phase 6.5` for the authoritative sub-phase charter.

---

## The three-priority hierarchy (governs every tradeoff)

From `docs/rebuild-plan.md § Constraints`:

1. **Performance first.** For this phase: don't inventory files beyond what the mapping needs. Scope is bounded by the requirements in `gear-shape-design.md § 3–§4`; anything outside is a follow-up, not a scope expansion.
2. **Class-agnostic, second.** Gap analysis is authored in terms of shape requirements and stat identities, not specific classes. Warlock appears only as the anchor class whose data exercises the existing class-side gates (armorProficiency, grants[]).
3. **Engine-mechanic extension ease, third.** Gap inventory should surface which gaps are additive (seam unchanged; normalizer bridges) vs structural (seam must change; engine modules touched). Phase 6.5c uses this categorization to scope its own work.

When priorities conflict, top of list wins.

**Accuracy-first doctrine (applies throughout):**

- **Cite every current-state fact.** file:line reference.
- **Cite every gap against its source.** Each gap maps to a specific locked decision (L1–L14), metadata section (§4.x), wiki fact (gear-wiki-facts.md § N), or OQ.
- **Do not invent.** If a gap's remediation path is ambiguous, surface it as a refined OQ-D; do not pick a side.
- **Mark UNRESOLVED where research is genuinely silent** (mainly for any Phase 6.5a UNRESOLVED items that cascade into gaps here).

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 6.5b in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

### Stage 1 — Context Gather → Terse Map

Read the files above. Start by reading `docs/session-prompts/gear-shape-design.md § 1–§6` and `docs/gear-wiki-facts.md § 1, § 2, §15, Appendix A` in full — these are your north stars.

Then, via `Explore` sub-agents (parallelizable):

- **Engine surface inventory.** Walk `runSnapshot.js`, `buildContext.js`, `aggregate.js`, `projectDamage.js`, `projectHealing.js`, `projectShield.js`, `deriveStats.js`, `recipes.js`. For every access to `build.gear.*`, `build.attributes`, `build.weaponType`, `build.target`, `ctx.gear.*`, `ctx.weaponType`, `ctx.attributes`: record (module, line, field, semantic — "reads", "derives from", "routes into"). This is the **input+derived-from seam inventory**.
- **STAT_META reconciliation.** For every entry in `src/data/stat-meta.js`, tag: (a) in §4.3 registry (exact match — alignment), (b) naming variant per L7 (e.g., `physicalDamageReductionBonus` ↔ `physicalDamageReduction`), (c) STAT_META-only (Appendix A — class-data, perks, ability modifiers), (d) gearStat flag present / absent. Then for every stat in §4.3 registry: tag (a) present, (b) variant name, (c) absent. Corrected inventory must match gear-wiki-facts.md's reconciliation findings (Phase 6.5a's corrected output).
- **Class-side gate inventory.** For `armorProficiency`, `grants[]`, `removes[]` in `class-shape.js` + `warlock.new.js` + `class-shape-progress.md`: document how each currently works (which classes exercise which; what shape the atoms take; what the engine does with them at buildContext.js availability resolver). This is the **class-side of L10 (requiredClasses + armorProficiency gate)**.
- **Stale UI field inventory.** Walk `src/App.jsx` + `src/components/panels/GearPanel.jsx` (or similar). For every gear-related field name the UI references (even if it doesn't resolve to the current engine): record. This tells 6.5c what App.jsx's shape memory is, which informs Phase 7 wiring.
- **Fixture Build-shape extraction.** From `max-loadout.fixture.js` + `warlock-*.fixture.js` + `minimal-loadout.fixture.js`, extract the exact `Build` object shape: keys, nesting, value types. This is the **closest working shape** today.
- **Legacy infrastructure inventory.** `gear-defaults.js`, `gear/define-gear.js`, `gear/define-gear.test.js`. For each: purpose, shape, whether anything is worth keeping as a seam anchor.

Produce a written **Terse Map** covering:

- Engine seam inventory (input fields + derived-from fields + consuming stages).
- STAT_META reconciliation (matches Phase 6.5a corrected findings; spot-check and note any divergences).
- Class-side gate inventory (armorProficiency + grants/removes as they exist today).
- Stale UI field inventory.
- Fixture Build-shape as extracted.
- Legacy infrastructure inventory.
- Scope-clarification open questions (should be few; most context is in the requirements doc).

### Stage 2 — Plan

Produce a detailed mapping+gap-analysis plan covering:

**Output doc structure.** `docs/gear-character-mapping.md` — propose your section layout. A reasonable default:

```
§1  Purpose + how this doc is used by Phase 6.5c
§2  Current-state map
    §2.1 Build shape (what buildContext consumes)
    §2.2 Ctx shape (output of buildContext; input to Stages 1–6)
    §2.3 Gear sub-shape inside ctx (ctx.gear.*)
    §2.4 Snapshot shape (engine output)
    §2.5 STAT_META current state (reconciliation with §4.3 registry)
    §2.6 Class-side gates (armorProficiency, grants[], removes[])
    §2.7 Stale UI state shape (App.jsx + components — integration-seam hints)
    §2.8 Legacy gear infrastructure (gear-defaults.js, define-gear.js)
    §2.9 Fixture Build-shape (anchor example from max-loadout.fixture.js)
§3  Gap inventory (per requirement vs current state)
    §3.1 Slot taxonomy + weaponHeldState (L2, L5, L6, L7, §4.1, §4.2)
    §3.2 Item shape (§4.4 examples — slotType/armorType/weaponType/handType/requiredClasses/availableRarities/modifierCountOverrides/inherentStats/socketExclusionOverrides/onHitEffects)
    §3.3 Stat registry (L7, L11, L14, §4.3)
    §3.4 Per-slot modifier pools (§4.5 — 10 pools)
    §3.5 Rarity + modifier count (L1, L12)
    §3.6 Modifier exclusion rules (§4.6, L13 natural/socket)
    §3.7 Class gating (L9 jewelry, L10 requiredClasses + armorProficiency interaction)
    §3.8 Inherent-only weapon/shield properties (L4, L5 impactPower/impactResistance)
    §3.9 On-hit effects (Spiked Gauntlet — OQ-D6 routing)
    §3.10 Two-weapon loadout + held-state in ctx/engine (L5, L6, OQ-D7)
    §3.11 Character shape (OQ-D2 — identity, persistent selections, gear-loadout reference)
    §3.12 Normalizer location (OQ-D3 — where upstream-of-engine transformation lives)
§4  Design implications for Phase 6.5c (per-gap, what seam must move)
§5  Refined OQ-D list
§6  Unresolved items cascading from 6.5a (any UNRESOLVED in gear-wiki-facts.md §15 that becomes a 6.5c design problem)
§7  Revision log
```

Adjust with rationale. The structure above is a suggestion, not a mandate.

**Per-gap analysis method.** For each gap (§3.N):

1. **State the requirement.** Cite source (L-number, §4.x, gear-wiki-facts.md § N, OQ-number).
2. **State the current provision** (if any). File:line citation. If nothing matches, state "absent."
3. **Classify the gap:**
   - **Additive:** new shape normalizes into existing seam; no engine change. (E.g., new Gear shape's per-slot items flatten into `gear.bonuses` as today.)
   - **Structural:** seam has to change. Note which engine module(s) are affected. (E.g., two-loadout `weaponHeldState` → buildContext's `deriveWeaponState` generalizes.)
   - **Net-new surface:** no current seam at all; 6.5c authors new code + data. (E.g., rarity system.)
4. **Design implication:** what 6.5c must decide / produce to close.

**Refined OQ-D list.** Start with `gear-shape-design.md § 6` OQ-D1–OQ-D10. For each, refine based on what the mapping surfaced: narrow the question, add context, propose candidate options if the mapping makes any clearly viable. **Do not pick the answer** — refining is not deciding.

**Execution sequence.** Propose your order. A reasonable default:

```
Step 0 — Inventory stage (from Stage 1 Terse Map — already done).
Step 1 — Author §2 (current-state map). Each §2.N is a straightforward data extraction from the inventory.
Step 2 — Author §3 per-gap analysis in roughly the order of §3.1 → §3.12.
         Gaps share structure across sections; doing them sequentially
         produces a consistent shape.
Step 3 — Author §4 (design implications) as a roll-up of §3's per-gap
         classifications.
Step 4 — Refine OQ-D list (§5) — update each of 6.5c's pending OQ-Ds based
         on what §3's mapping surfaced.
Step 5 — §6 cascade-from-6.5a UNRESOLVED items.
Step 6 — Finalize §1 (how the doc is used) once the body is in place.
```

**Scope discipline.** List what's EXPLICITLY out of scope:

- Proposing shape structures or field names (that's 6.5c).
- Editing `src/` code, class data, engine modules, stat-meta, or the source docs (`gear-shape-design.md`, `gear-wiki-facts.md`, `damage_formulas.md`, `healing_verification.md`, `season8_constants.md`, `perspective.md`, `coordinator-role.md`, `rebuild-plan.md`).
- Editing `class-shape-progress.md` (separate track).
- Fetching the wiki (6.5a's deliverable is the authoritative wiki slice).
- In-game testing or user ask-backs beyond standard STOP gate questions.

**Plan must also cover:**

- Estimated fact-citation volume (rough).
- How Stage 4 will maintain `docs/session-prompts/phase-6-5-b-progress.md` for crash resilience.
- Decisions requiring user sign-off (numbered list — should be small).
- Risks.

### Stage 3 — STOP — Plan Report

Emit the **Plan Report** in exactly this format:

```markdown
# Phase 6.5b — Plan Report

## Terse map
[bullets / tables from Stage 1: engine seam inventory, STAT_META reconciliation, class-side gate inventory, stale UI field inventory, fixture Build-shape, legacy infrastructure, scope-clarification OQs]

## Mapping plan
[§2 approach per sub-section]

## Gap-analysis plan
[§3 approach per sub-section; classification rubric]

## Output doc structure
[proposed `docs/gear-character-mapping.md` section layout]

## Execution sequence
[proposed order with rationale]

## Decisions requiring user sign-off
[numbered list — likely few]

## Risks
[bullets]

## Open questions
[bullets — should be small]
```

**WAIT for explicit user sign-off.** Revise and re-emit if feedback comes back. Do not proceed to Stage 4 without explicit "approved."

### Stage 4 — Execute

Once signed off, execute the plan. Maintain `docs/session-prompts/phase-6-5-b-progress.md` for crash resilience (step-level checklist; timestamps on start / complete).

**Inner-loop discipline (per section of the output doc):**

1. Author the section, pulling from the Terse Map inventory + direct file reads as needed.
2. Every fact gets a file:line citation (or source-doc reference for requirement-side claims).
3. For gap classifications, label explicitly: **Additive** / **Structural** / **Net-new surface**.
4. Update progress doc.
5. Move to the next section.

**Discipline:**

- **Strictly map + gap-analyze, no design.** You are surfacing the landscape + the gaps, not filling them.
- **No code changes.**
- **No modifications to source docs** (LOCK C).
- **No scope expansion beyond the OQ-W/OQ-D/requirement sources in gear-shape-design.md + gear-wiki-facts.md.**
- **No silent inventions.** A gap's remediation path that's genuinely ambiguous becomes a refined OQ-D.
- **Stay in-phase.** Cross-phase findings (Phase 10 class migration, Phase 11 UI) go to Follow-ups, not into the mapping doc.

### Stage 5 — STOP — Completion Report

Emit the **Completion Report** in exactly this format:

```markdown
# Phase 6.5b — Completion Report

## Files created / modified
[paths + one-line purpose each — should be `docs/gear-character-mapping.md` + `docs/session-prompts/phase-6-5-b-progress.md`; anything else is a deviation requiring explanation]

## Gap classification summary
| Category | Count | Notes |
|---|---|---|
| Additive (normalizes into existing seam) | N | ... |
| Structural (seam changes; engine module(s) touched) | N | ... |
| Net-new surface (no current seam at all) | N | ... |

## Seams that must change (Structural gaps)
[list, with file:line refs]

## Key findings (load-bearing for 6.5c)
[3–7 bullets — the most load-bearing insights the mapping surfaced]

## Refined OQ-D list
[how each of gear-shape-design.md §6 OQ-D1–OQ-D10 was refined; new OQ-Ds added if any]

## STAT_META reconciliation outcome
[match counts, naming-variant counts, absent counts; any divergence from gear-wiki-facts.md § Appendix A]

## Cascade from Phase 6.5a UNRESOLVED
[which of gear-wiki-facts.md § 15 items became design problems here vs stay as deferred research]

## Conflicts with locked decisions
[if the mapping surfaces contradictions with L1–L14, list here. Expected: zero or minor (naming).]

## Fact counts
- Current-state citations: N
- Gap citations: N

## Deviations from plan
[what changed and why, or "none"]

## Test status
[N/A — research-only phase, no code touched.]

## Follow-ups (non-blocking, out of scope)
[out-of-scope findings the mapping turned up — surface without inflating the phase]
```

**WAIT for explicit user sign-off.** Revise per feedback. Do not declare Phase 6.5b complete without explicit sign-off.

---

## Locked from coordinator (binding for Phase 6.5b)

These are settled — do not re-litigate.

### LOCK A — Research-only, no design, no code
Phase 6.5b produces docs only: `docs/gear-character-mapping.md` (deliverable) + `docs/session-prompts/phase-6-5-b-progress.md` (progress tracking). Any code change, shape proposal, or new non-doc file is out of scope — surface as a follow-up.

### LOCK B — Every fact cites a source
Current-state facts cite `file:line`. Requirement-side references cite the source doc (L-number, §4.x, gear-wiki-facts.md § N, OQ-number). Facts without citations are authoring errors.

### LOCK C — No modifications to source docs
You do not edit:

- `docs/session-prompts/gear-shape-design.md` (coordinator-owned — locked decisions live there).
- `docs/gear-wiki-facts.md` (Phase 6.5a output — frozen research-time snapshot).
- `docs/damage_formulas.md` / `docs/healing_verification.md` / `docs/season8_constants.md` (verified-source docs).
- `docs/class-shape-progress.md` (class-shape consolidation — separate track; note class-side gates but do not edit).
- `docs/rebuild-plan.md` / `docs/coordinator-role.md` / `docs/engine_architecture.md` / `docs/engine_implementation_plan.md` / `docs/perspective.md` / `docs/vocabulary.md` (coordinator-owned roadmap / engine contract / mental model).

If mapping surfaces a contradiction with any of these, surface in the Completion Report under "Conflicts with locked decisions."

### LOCK D — Scope is bounded by L1–L14, §4.x, and §6 OQ-Ds
Gap analysis targets only the requirements already captured in `gear-shape-design.md` + the wiki-sourced facts in `gear-wiki-facts.md`. Do not expand scope. If the mapping surfaces a new requirement the locked docs don't mention, surface it as a Follow-up in the Completion Report — do not fold into `gear-character-mapping.md`.

### LOCK E — Gap classification vocabulary
Use exactly three classifications: **Additive**, **Structural**, **Net-new surface**. Do not introduce other terms. The semantics:

- **Additive:** the new shape can be normalized into the existing engine input seam without changing engine module signatures or `ctx` shape. Normalizer bridges the shape. No engine change.
- **Structural:** the existing seam must change — `ctx` shape extends, a `buildContext` sub-function generalizes, or an engine stage reads new fields. Specify exactly which module + signature. The engine change is non-trivial enough to require 6.5c to commit to it.
- **Net-new surface:** no current code addresses this at all. 6.5c authors new code + data + shape to cover. (E.g., rarity system; modifier exclusion rules.)

### LOCK F — Character shape scoping
The "Character" concept is currently diffused across `Build` + UI React state + persistent save files (none exist). Do not invent a Character surface that isn't there. Map what IS — where "identity-like" fields, selection state, gear reference, and session toggles currently live (almost all in Build or stale App.jsx). §3.11 Character-shape gap is likely **Net-new surface**; specify concretely what's missing.

### LOCK G — No shape proposals
You do not propose shape keys, field names, type structures, or file locations. Phase 6.5c does that. Your gap entries describe what's missing + what classification the gap falls into; that's sufficient for 6.5c to design.

### LOCK H — No in-game testing, no user ask-backs mid-execution
Same as Phase 6.5a: you read code + docs. Stage 3 Plan Report may include "Question N:" items for the user. Stage 4 executes without further pauses unless genuinely stuck.

### LOCK I — Fact-citation volume expectations
Expect ~150–250 cited facts across the output doc: ~60–80 current-state facts in §2, ~90–150 gap-side citations (each gap has a requirement-cite + a current-state-cite + optional wiki-cite), plus refinement citations in §5. Numbers are directional; don't chase volume, chase coverage.

---

## Phase-specific nuances you must surface in the plan

These are tensions or edge cases worth naming early.

1. **The engine's `Build` is underspecified vs the new requirements — but that's the point.** Phase 6 deliberately shipped a pass-through `{weapon, bonuses}` gear shape because the upstream Character + Gear shapes weren't locked. Your mapping should treat the current Build shape as a **satisfactory engine input contract today**, NOT a deficient one — and identify which gaps are upstream (pre-engine normalization) vs engine-side (seam must change).

2. **Stale `src/App.jsx` is an integration-seam hint, not a source of truth.** It references engine APIs (`buildEngineContext`, `runEffectPipeline`, etc.) that no longer exist per `0e69523`'s rebuild. Inventory its field names (they tell you what shape App.jsx's author was thinking in terms of — useful for 6.5c's wiring anticipation), but don't treat it as authoritative current state. Note every stale import.

3. **STAT_META has MANY entries outside §4.3.** Per `gear-wiki-facts.md Appendix A`, ~49 STAT_META entries are class-data / perk / ability-modifier stats, not gear-affix stats. These are **correctly outside** the gear registry — they're not a gap. Clarify this explicitly in §2.5 and §3.3 so 6.5c doesn't accidentally "reconcile" them away.

4. **Two-namespace model (STAT_META vs RECIPE_IDS).** The engine enforces: stat-id in STAT_META for additive contributions; stat-id in RECIPE_IDS only for cap_override phase atoms. Gear stats are STAT_META contributions. New registry entries from §4.3 need to land in STAT_META (Phase 6.5c decision), not RECIPE_IDS. Map this.

5. **Class-side gear gate already exists partially.** `armorProficiency` on class root + `grants[]`/`removes[]` on perks handle "which armor types can this class equip" and class-level blanket adds/removes (Warlock Demon Armor grants plate; Fighter Slayer removes plate — confirmed by Phase 6.5a for at least these two). Your §2.6 maps how the class-side works today. §3.7 gap then focuses on the **item-side** of the gate (requiredClasses, per-item armorType matching) — no current code handles this.

6. **`weaponHeldState` is not in the current ctx.** Current engine consumes a single `ctx.gear.weapon` — no two-loadout + held-state concept. §3.10 gap is **Structural** (buildContext.deriveWeaponState generalizes) or **Net-new surface** depending on whether 6.5c keeps ctx.weapon singular (normalizer picks based on held-state) or expands ctx to carry both loadouts. Flag as a concrete decision point for 6.5c (OQ-D7).

7. **On-hit effects shape tension.** Spiked Gauntlet's `onHitEffects[0]` has `separateInstance: false` + "included in main damage number." Current engine has no seam for "add into the main physical damage at Stage 6 projection." §3.9 gap is **Structural** — where in projectDamage.js does the value land? OQ-D6 is the design call; your mapping documents the Stage 6 math entry points (lines to cite in `projectDamage.js`) where this would plausibly slot.

8. **`class-shape-progress.md § Gear-shape open questions § 1`** — the pre-Phase-6.5 noted Spiked Gauntlet onHit parking. Phase 6.5a confirmed the math (VERIFIED: 1 true physical, rolled into main). This cascades into your §3.9 gap and the conclusion it drives. Cross-reference.

9. **Integration-seam files to treat as canonical.** `buildContext.js` + `aggregate.js` + `projectDamage.js` are the three load-bearing seams. Other engine modules (condition dispatcher, stacking, scalesWith) don't touch gear. Focus the engine-side mapping on those three; the rest gets one-line mentions if at all.

10. **Refined OQ-D output is the primary hand-off to Phase 6.5c.** Your refined OQ-D list (§5) replaces `gear-shape-design.md § 6` as the definitive design-question set for 6.5c. Each refined entry should have: the original question, what mapping surfaced, candidate options (if any), and a non-answer stance.

11. **Progress doc.** Maintain `docs/session-prompts/phase-6-5-b-progress.md` during Stage 4. Simple checklist per output-section; timestamps on start/complete; per-section rough fact counts. Crash resilience.

12. **You are reporting to the coordinator, not to the user directly.** The user relays your Plan Report / Completion Report to the coordinator, who reviews. Draft for coordinator audience — terse, decision-ready, explicit about deviations.

---

## Sub-agent guidance

- **Stage 1 (Context Gather).** Spawn `Explore` in parallel for five independent inventories: (a) engine seam fields, (b) STAT_META reconciliation, (c) class-side gate inventory, (d) stale UI field inventory, (e) fixture Build-shape extraction. Each gets a self-contained prompt + returns a consolidated tabular summary.
- **Stage 2 (Plan).** Main session synthesizes Terse Map into the plan. `Plan` sub-agent can draft the §2.N + §3.N execution order given the Terse Map output.
- **Stage 4 (Execute).** Mostly main-session work. `Explore` sub-agents for specific re-reads only (e.g., "every file in `src/engine/` that references `ctx.gear`" — returns citations). Do NOT spawn agents to author whole sections — aggregation lives in the main session.

When you spawn a sub-agent, brief it fully. Aggregate results. Keep high-level state in the main session.

---

## Guardrails

- **Cite every fact** (LOCK B).
- **Classify every gap** (LOCK E).
- **No code changes, no source-doc edits** (LOCK A, LOCK C).
- **No shape proposals** (LOCK G).
- **Scope = requirements-already-locked** (LOCK D).
- **Character shape gap is Net-new surface** (LOCK F); don't invent what isn't there.
- **Maintain the progress document throughout Stage 4** (nuance 11).

---

## When in doubt

Re-read `docs/session-prompts/gear-shape-design.md § 1–§6`. Re-read `docs/gear-wiki-facts.md § 1, § 15, Appendix A`. Re-read this prompt's "Locked from coordinator" section.

If a gap's remediation path is genuinely ambiguous: refine it as an OQ-D entry in §5 with the ambiguity captured. That is the correct behavior — not picking a side.

If mapping reveals the Phase 6 engine has a latent bug relative to a VERIFIED source: surface as a Follow-up in the Completion Report (high-priority). Do not fix in this phase.

**Begin with Stage 1.**
