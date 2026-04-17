# Phase 6.5a — Gear Wiki Facts — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 6.5a of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo plus the public wiki. Read, don't assume. Cite, don't infer.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker (Season 8, Hotfix 112-1, game version 0.15.134.8480). Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage / heal / shield projections + available abilities. No time passes, no events fire. See `docs/perspective.md` for the full mental model.

The project is mid-rebuild:
- Phases 0–6 landed the performance harness, class-shape validator, Warlock migration, engine architecture + implementation (12 modules under `src/engine/`, public entry `runSnapshot`).
- Phase 6 closed at commit `0e69523`; docs propagated in `1dc1b02`.
- **Phase 6.5** is a newly-inserted sub-phase to close two shape gaps the original plan treated as implicit: **Gear shape** and **Character shape**. It has three sub-phases: 6.5a (wiki facts), 6.5b (mapping + gap analysis), 6.5c (shape design).

**You are executing Phase 6.5a.** This phase is **research-only**. No code, no shape design, no architectural decisions. The output is a wiki-sourced facts document that Phases 6.5b and 6.5c will use as authoritative input alongside user-provided metadata already captured in `docs/session-prompts/gear-shape-design.md`.

The three-priority hierarchy and the project's accuracy-first doctrine bind this phase too — especially accuracy-first: **every fact in your output carries a citation + verification level.**

---

## Mandatory reading order

Read these files before anything else. Do not skim.

1. **`CLAUDE.md`** — project-level guidance. Note the accuracy-first doctrine especially: "Every formula traces to a verified source. Verification levels: VERIFIED (tested in-game), WIKI-SOURCED (from wiki LaTeX), UNRESOLVED (unknown). When in-game numbers don't match predictions, STOP and investigate before continuing."
2. **`docs/session-prompts/gear-shape-design.md`** — **the canonical source document for this phase**. §1 (framing) + §3 (locked decisions) + §4 (authoritative metadata) + §5 (the OQ-W list you are answering) are the heart of your scope. Every research question you answer is in §5. Every fact in your output must cross-reference the metadata's naming / locked decisions.
3. `docs/rebuild-plan.md` — roadmap. Phase 6.5 is an inserted sub-phase not yet in the phase index; rebuild-plan.md is still the source for operating-protocol conventions.
4. `docs/coordinator-role.md` — how the coordinator role operates. Your Plan Report + Completion Report formats mirror prior-phase patterns.
5. `docs/perspective.md` — mental model. Principles 1 (snapshot, not real-time) and 7 (data-driven, class-agnostic) are load-bearing for gear-mechanic framing.
6. `docs/damage_formulas.md` — verified physical + magical damage formulas + test points. Several OQ-W answers (per-stat phase behavior for stats that participate in damage) should be cross-checked against this.
7. `docs/healing_verification.md` — verified healing formula + test points.
8. `docs/season8_constants.md` — verified global constants (caps, hit-location multipliers, Training Dummy DR). Cross-check here for anything related to caps / global modifiers.
9. `docs/unresolved_questions.md` — prior open questions + resolved findings. If any of your OQ-W answers are already here (under "resolved findings"), cite that as the source; do not re-derive.
10. `docs/engine_architecture.md` — engine contract. §7 (the per-phase contract table) names every `EFFECT_PHASE` you will classify stats into. §15 (damage projection math) and §16 (heal math) are the phases' consumers — useful to know which formulas each phase feeds.
11. `src/data/stat-meta.js` — current STAT_META. You will compare wiki-documented stat names against this, noting overlaps / divergences.
12. `src/data/constants.js` — `EFFECT_PHASES` canonical values. Use these exact phase names in your classifications (no ad-hoc names).
13. `src/engine/recipes.js` + `src/engine/damage.js` + `src/engine/curves.js` — the verified-math modules + the piecewise curve system. Read enough to understand: (a) which curve each attribute/stat goes through (per `data/stat_curves.json`), (b) which recipes produce which derived stats.
14. `data/stat_curves.json` — the 17 piecewise curves. Some stats in the §4.3 registry will trace back to specific curve names here.
15. **Commit context:**
    - `0e69523` — Phase 6 engine implementation (latest engine baseline).
    - `1dc1b02` — Phase 6 doc propagation.
    - `b47312d` — Phase 5 engine implementation plan.

**Primary research source — the wiki.** `darkanddarker.wiki.spellsandguns.com`. Use `WebFetch` to pull pages. Start by scoping: fetch the index / main page, identify sections relevant to gear mechanics, then fetch sub-pages. You do not know the URL structure in advance; discover it.

**Use the `Explore` sub-agent** for cross-cutting reads inside the repo (e.g., "every STAT_META entry's `phase` / `direction` / `tag` metadata, grouped by category"; "every reference to `physicalDamageReduction` vs `physicalDamageReductionBonus` across docs"). Each is parallelizable.

**Use `WebFetch` or `WebSearch` directly** for wiki pages. WebFetch is better when you have a known URL; WebSearch is better when you need to discover what page covers a topic. Combine.

---

## Your mission — Phase 6.5a in one sentence

Produce `docs/gear-wiki-facts.md`: a topic-keyed facts document that answers every OQ-W listed in `docs/session-prompts/gear-shape-design.md § 5`, with each fact carrying a citation (wiki URL or repo file:line reference) and a verification level (`VERIFIED` / `WIKI-SOURCED` / `UNRESOLVED`), structured so Phases 6.5b and 6.5c can consume it without re-reading the wiki.

See `docs/session-prompts/gear-shape-design.md § 5` for the authoritative question list.

---

## The three-priority hierarchy (governs every tradeoff)

From `docs/rebuild-plan.md § Constraints`:

1. **Performance first.** For this phase: don't burn wiki-fetch rounds on irrelevant pages. Scope your research to the OQ-W list; surface anything outside scope as a follow-up, don't rabbit-hole.
2. **Class-agnostic, second.** Facts you collect are authored in terms of stat identities and mechanics, not specific classes (Warlock etc.). Exception: class-level armor / weapon grants (OQ-W11, OQ-W12) are class-specific by nature; capture them cleanly.
3. **Engine-mechanic extension ease, third.** Your output's structure should make it trivial for Phase 6.5c to pick up a stat id and know "which phase does this go through in the engine?" The fact table per OQ-W1 is the highest-leverage artifact for that.

When priorities conflict, top of list wins.

**Accuracy-first doctrine (applies throughout):**

- **Cite every fact.** Wiki URL (preferred) or repo file:line (for facts already in `docs/damage_formulas.md` etc.).
- **Classify every fact by verification level** (see §Locked from coordinator LOCK B).
- **Do not invent.** If the wiki is silent or ambiguous, mark the fact as `UNRESOLVED` and move on. Phase 6.5c + the user resolve unresolved items — not Phase 6.5a.
- **Prefer VERIFIED > WIKI-SOURCED > UNRESOLVED.** If a fact is documented only in the wiki, it's WIKI-SOURCED. If it's in `docs/damage_formulas.md` or `docs/season8_constants.md` (which have verified test points), it's VERIFIED.

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 6.5a in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

### Stage 1 — Context Gather → Terse Map

Read the files above. Start by reading `docs/session-prompts/gear-shape-design.md` in full — it is your research brief.

Then:

- **Wiki site-structure discovery.** Fetch `https://darkanddarker.wiki.spellsandguns.com/` (or likely-adjacent URLs). Identify sections that cover gear-related topics: stat mechanics, weapon properties, armor, rarity, sockets / modifiers, class gating. Note the URL structure you find (e.g., wiki page for "Weapon Damage", "Armor Rating", "Physical Damage Reduction"). Do not deep-read yet — this stage is a site map.
- **OQ-W → wiki-page mapping.** For each OQ-W item in §5, identify the most likely wiki page(s) that will answer it. Produce a mapping.
- **Existing verified content scan.** For each OQ-W, scan `docs/damage_formulas.md`, `docs/healing_verification.md`, `docs/season8_constants.md`, `docs/unresolved_questions.md` to see if the question is already answered. If so, cite the answer in-place (VERIFIED); that OQ-W is likely closed without wiki fetch.
- **STAT_META reconciliation inventory.** Walk `src/data/stat-meta.js`. For each registry entry in the metadata §4.3, mark: (a) present in STAT_META (exact match), (b) present with name variance (e.g., `physicalDamageReduction` ↔ `physicalDamageReductionBonus`), (c) absent (new stat). This is an input to OQ-W1 and to Phase 6.5c's stat-registry reconciliation (OQ-D4).

Produce a written **Terse Map** covering:

- Wiki site structure (sections found, rough URL pattern).
- OQ-W → likely-wiki-page(s) mapping.
- Pre-answered OQs from existing verified docs (cite).
- STAT_META reconciliation inventory (present / variance / absent, per §4.3 stat).
- Open questions about scope (e.g., "is OQ-W3 hit-combo data actually documented on the wiki, or is it in-game-observation only?" — surface).

### Stage 2 — Plan

Produce a detailed research plan covering:

**Per OQ-W, the research approach:**

- Which wiki pages will you fetch?
- Which existing-doc citations will you use?
- What's the expected fact shape for the answer?
- What's your fallback if the wiki is silent (mark UNRESOLVED + note what's missing)?

**Output doc structure.** `docs/gear-wiki-facts.md` — one §-section per OQ-W, plus a top-matter section with how the doc is organized + verification-level legend.

Proposed layout (feel free to adjust with rationale):

```
docs/gear-wiki-facts.md
├── §1 Purpose + verification legend
├── §2 Per-stat phase/curve table (answers OQ-W1)
├── §3 Weapon property math (OQ-W2)
├── §4 Hit combo semantics (OQ-W3)
├── §5 Memory-capacity interactions (OQ-W4)
├── §6 Secondary weapon variants (OQ-W5)
├── §7 "magicStuff" vocabulary (OQ-W6)
├── §8 Never-socketable stats (OQ-W7)
├── §9 Rarity + modifier count (OQ-W8)
├── §10 Inherent ranged stats (OQ-W9)
├── §11 On-hit effects (OQ-W10)
├── §12 Class / armor grants (OQ-W11)
├── §13 Class gating on jewelry / weapons (OQ-W12)
├── §14 Items with naturalRangeVerified: false (OQ-W13)
├── §15 Unresolved items (persistent OQs)
└── §16 Revision log
```

**Citation + verification conventions.** Inside the doc, each fact carries inline citations:

- Wiki: `[WIKI: https://darkanddarker.wiki.spellsandguns.com/wiki/Weapon_Damage]`
- Repo: `[REPO: docs/damage_formulas.md:100–113]`
- Plus verification level: `(VERIFIED)` / `(WIKI-SOURCED)` / `(UNRESOLVED)`.

**Execution sequence.** Propose your order. A reasonable default: start with OQ-W1 (highest-leverage; informs phase assignments for the whole registry), then OQ-W2–W4 (weapon/memory math — next-most-load-bearing for engine consumers), then OQ-W5–W13 (narrower / smaller).

**Scope discipline.** List what's EXPLICITLY out of scope:

- Non-gear wiki content (ability / class / PvE mechanics unless they happen to answer an OQ-W).
- Design decisions (OQ-D* from `gear-shape-design.md § 6` belong to Phase 6.5c, not here).
- Shape proposals, code changes, new files beyond `docs/gear-wiki-facts.md` + the required progress doc.

**Plan must also cover:**

- Estimated wiki-page-fetch count (rough — is this ~10 pages or ~50 pages?).
- Fallback handling when a wiki page is missing / ambiguous (mark UNRESOLVED; do not guess).
- Decisions requiring user sign-off (should be few — possibly zero).
- Risks (e.g., wiki outdated relative to Hotfix 112-1; surface as a caveat).

### Stage 3 — STOP — Plan Report

Emit the **Plan Report** in exactly this format:

```markdown
# Phase 6.5a — Plan Report

## Terse map
[bullets / tables from Stage 1: wiki site structure, OQ-W → page mapping, pre-answered OQs from existing verified docs, STAT_META reconciliation inventory, scope-clarification open questions]

## Research plan
[per OQ-W: wiki pages to fetch, existing citations to use, expected fact shape, fallback]

## Output doc structure
[proposed `docs/gear-wiki-facts.md` section layout + citation conventions]

## Execution sequence
[proposed order of operations with rationale]

## Decisions requiring user sign-off
[numbered list — likely zero or few]

## Risks
[bullets]

## Open questions
[bullets — should be small; wiki-silence is NOT surfaced here because it's handled inside the plan via UNRESOLVED tagging]
```

**WAIT for explicit user sign-off.** Revise and re-emit if feedback comes back. Do not proceed to Stage 4 without explicit "approved."

### Stage 4 — Execute

Once signed off, execute the plan. Maintain a working progress document at `docs/session-prompts/phase-6-5-a-progress.md` for crash resilience (simple checklist per OQ-W; timestamps on start / complete).

**Inner-loop discipline (per OQ-W):**

1. Fetch the wiki page(s) you identified. Read carefully; do not skim.
2. Extract facts relevant to the OQ-W. Capture inline citations as you go.
3. Classify each fact by verification level.
4. For any fact the wiki doesn't provide, check existing repo docs one more time; if still silent, mark UNRESOLVED and note what's missing.
5. Write the corresponding section of `docs/gear-wiki-facts.md`.
6. Update progress doc.
7. Move to the next OQ-W.

**Discipline:**

- **Strictly research, no design.** You are answering questions, not proposing shapes.
- **Strictly wiki + existing repo docs.** Do not use game knowledge you might have from training; every fact is cited.
- **Every fact classified.** If you cannot classify (insufficient info to judge verification level), that's an UNRESOLVED.
- **No silent inventions.** A gap is flagged, not filled.
- **Stay inside scope.** OQ-W list, full stop. Out-of-scope findings go into "Follow-ups" in the Completion Report, not into `gear-wiki-facts.md`.
- **No code changes.** Do not touch `src/*`, `bench/*`, class data, engine, any runtime file. Docs-only.
- **No modifications to `docs/session-prompts/gear-shape-design.md`.** That doc is coordinator-owned; if you find facts that contradict locked decisions L1–L14, surface in the Completion Report — do not rewrite.

### Stage 5 — STOP — Completion Report

Emit the **Completion Report** in exactly this format:

```markdown
# Phase 6.5a — Completion Report

## Files created / modified
[paths + one-line purpose each — should be `docs/gear-wiki-facts.md` + `docs/session-prompts/phase-6-5-a-progress.md`; anything else is a deviation requiring explanation]

## OQ-W resolution status
| OQ-W | Topic | Status | Verification level | Citation count |
|---|---|---|---|---|
| OQ-W1 | Per-stat phase/curve table | ... | ... | ... |
| ... | ... | ... | ... | ... |

(Status: ANSWERED / PARTIAL / UNRESOLVED. Verification level is the dominant level for the OQ-W's facts; PARTIAL = mix.)

## Key findings
[3–7 bullets. Surface the most load-bearing facts Phase 6.5b / 6.5c must know — e.g., "All `XBonus` stats currently in STAT_META trace to post_curve phase per wiki citation X; except `maxHealthBonus` which is post_curve_multiplicative per Y."]

## Stat-registry reconciliation findings
[summary from the STAT_META inventory — exact matches count, variance count, absent count. Full detail in `gear-wiki-facts.md`.]

## Conflicts with locked decisions
[if wiki contradicts any of L1–L14 in `gear-shape-design.md § 3`, list here. Expected: zero.]

## Persistent UNRESOLVED list
[every fact that remained UNRESOLVED after wiki + repo-doc research — this is the hand-off to Phase 6.5b / 6.5c + the user]

## Wiki-research stats
- Pages fetched: N
- Facts captured: N
- Verification-level breakdown: N VERIFIED, N WIKI-SOURCED, N UNRESOLVED

## Deviations from plan
[what changed and why, or "none"]

## Test status
[no code tests run this phase; "N/A" is acceptable if no code touched]

## Follow-ups (non-blocking, out of scope)
[out-of-scope findings the wiki turned up — surface without inflating the phase]
```

**WAIT for explicit user sign-off.** Revise per feedback. Do not declare Phase 6.5a complete without explicit sign-off.

---

## Locked from coordinator (binding for Phase 6.5a)

These are settled — do not re-litigate.

### LOCK A — Research-only, no design, no code
Phase 6.5a produces docs and only docs. Specifically: `docs/gear-wiki-facts.md` (deliverable) and `docs/session-prompts/phase-6-5-a-progress.md` (progress tracking). Any code change, shape proposal, engine modification, or new non-doc file is out of scope; surface as a follow-up.

### LOCK B — Verification level on every fact
Every fact in `docs/gear-wiki-facts.md` carries one of three verification levels:

- **VERIFIED** — fact traces to `docs/damage_formulas.md`, `docs/healing_verification.md`, `docs/season8_constants.md`, or a line explicitly labeled VERIFIED in `docs/unresolved_questions.md` (those are in-game-tested).
- **WIKI-SOURCED** — fact traces to a wiki page citation (URL), and is not corroborated in the verified docs.
- **UNRESOLVED** — fact the research did not nail down. Must be listed in §15 of the output doc and in the Completion Report's Persistent UNRESOLVED list.

Facts without a level, or with invented/speculative content, are authoring errors.

### LOCK C — No modifications to the source docs
You do not edit:

- `docs/session-prompts/gear-shape-design.md` (coordinator-owned — locked decisions live there).
- `docs/damage_formulas.md` / `docs/healing_verification.md` / `docs/season8_constants.md` (verified-source docs — only updated via verified in-game testing, which is out of scope here).
- `docs/class-shape-progress.md` (class-shape consolidation — separate track).
- `docs/rebuild-plan.md` / `docs/coordinator-role.md` (coordinator roadmap — only coordinator edits these).

If research surfaces a conflict with any of these, surface it in the Completion Report.

### LOCK D — Scope is the OQ-W list
Answer the 13 OQ-W questions in `docs/session-prompts/gear-shape-design.md § 5`. Do not expand the scope. If wiki reading turns up fascinating unrelated content, note as a follow-up — do not fold into `gear-wiki-facts.md`.

### LOCK E — STAT_META reconciliation is a reference, not a prescription
Your reconciliation inventory (STAT_META entries vs metadata §4.3 registry) is **informational**. You do not propose which naming wins, do not edit `src/data/stat-meta.js`, do not flag STAT_META as "wrong." Reconciliation decisions are Phase 6.5c (per OQ-D4).

### LOCK F — Per-stat phase table (OQ-W1) uses canonical phase names
Phases come from `src/data/constants.js::EFFECT_PHASES`. Use those exact strings. If a wiki-sourced stat has behavior that doesn't fit any existing phase, flag in UNRESOLVED with a note — do not invent a new phase name.

### LOCK G — Wiki version caveat
The wiki may lag the current game version (0.15.134.8480, Season 8 Hotfix 112-1). Note the version the wiki reports (if findable) in `gear-wiki-facts.md § 1`. Facts that might have been patch-changed since the wiki's version should be flagged; the research just records what the wiki says + notes the version divergence.

### LOCK H — No in-game testing, no user ask-backs mid-execution
You do not test in-game; you do not ask the user to run tests. You read docs + the wiki. If a fact is genuinely ambiguous from both sources, that's UNRESOLVED.

Exception: **at Stage 3 (Plan Report)**, you may request specific clarifications from the user before executing — this is the standard STOP-gate question mechanism. Phrase each as "Question N:" followed by the question. The user answers or signs off as-is.

### LOCK I — Wiki-page fetch hygiene
Use `WebFetch` (one URL at a time, with a specific prompt) for targeted reads. Use `WebSearch` only when you don't know which wiki page covers a topic. Batch reads in parallel when pages are known-independent (multiple `WebFetch` calls in one turn). Do not refetch pages you've already read — cache the content in your session memory.

---

## Phase-specific nuances you must surface in the plan

These are tensions or edge cases worth naming early.

1. **OQ-W1 is the single highest-leverage question.** Phase 6.5c's design cannot proceed without knowing which phase each stat contributes to. Allocate the most research budget here. The table structure matters: per stat, exactly one `phase` value (from canonical `EFFECT_PHASES`), plus `semantic` (short prose — "flat additive post curve" / "curve input" / etc.), plus the citation, plus the verification level. Missing entries are worse than UNRESOLVED entries.

2. **Stat-name reconciliation is intertwined with OQ-W1.** You cannot answer "which phase does `physicalDamageReduction` contribute to?" if you don't first decide whether the wiki's `physicalDamageReduction` is the same thing as STAT_META's `physicalDamageReductionBonus` (L7 says yes). The inventory pre-step in Stage 1 is load-bearing.

3. **Verified doc precedence.** `docs/damage_formulas.md` has citations like `(Verified: 2025-...)`. Where it answers an OQ-W, that's VERIFIED and the wiki is redundant. For example, the Antimagic post-cap multiplicative layer math is already in `damage_formulas.md:180–188` + `engine_architecture.md § 7` — OQ-W1 for `magicDamageTaken` should cite these and not re-derive from wiki.

4. **`impactPower` / `impactResistance`** are L4-added stats not in the §4.3 registry. Your OQ-W1 output must include them (and note their inherent-only + weapon/shield-specific nature). OQ-W2 details their math.

5. **Hit combo data** (OQ-W3) may not be wiki-documented per-weapon. If not, surface as UNRESOLVED with a note that this is likely in-game-observation-only data the user will need to provide. Phase 6.5c can design the **shape** for hit combo data even without the **data** — as long as the shape is documented.

6. **Wiki silence on `"magicStuff"`** (OQ-W6) is plausible — the name sounds colloquial. If the wiki doesn't use the term, search for: "magical weapon subtype", "spellbook-adjacent", "crystal weapon category". Match to whatever the wiki calls it; flag the name reconciliation.

7. **Rarity color names and in-game UI.** The wiki may use color-based rarity names ("junk" = poor? "common" = white? etc.). Normalize in your output to the §4.3 registry's naming (`poor` / `common` / `uncommon` / `rare` / `epic` / `legendary` / `unique`). Note any name divergence.

8. **Scaling="attributeBonusRatio"** (Spiked Gauntlet onHit, OQ-W10) is a name not in the engine's `SCALES_WITH_TYPES` vocabulary. The wiki may or may not use this exact term. Research what "attribute bonus ratio" means mechanically; capture the formula; do not propose a shape for it.

9. **Progress doc.** Maintain `docs/session-prompts/phase-6-5-a-progress.md` during Stage 4. Simple OQ-W checklist with started / completed timestamps. Include per-OQ-W rough fact counts as you go.

10. **You are reporting to the coordinator, not to the user directly.** The user relays your Plan Report / Completion Report back to the coordinator, who reviews. Draft your reports for the coordinator as audience — i.e., terse, decision-ready, explicit about deviations.

---

## Sub-agent guidance

- **Stage 1 (Context Gather).** Spawn `Explore` in parallel for: (a) STAT_META inventory, (b) scan of `docs/damage_formulas.md` / `healing_verification.md` / `season8_constants.md` for pre-answered OQ-Ws, (c) `src/engine/recipes.js` + `deriveStats.js` for which stats feed which recipe outputs. Each is independent.
- **Stage 1 — wiki site discovery.** Do NOT use `Explore` for wiki work — that agent reads the repo. Use `WebFetch` + `WebSearch` directly. Wiki site mapping is a handful of top-level fetches; don't spin up a sub-agent for it.
- **Stage 2 (Plan).** Main session synthesizes Terse Map into the plan. No sub-agents needed.
- **Stage 4 (Execute).** Per-OQ-W execution. Each OQ-W is a bounded research unit. Parallelize by spawning `Explore` for large repo-doc sweeps within an OQ-W (e.g., OQ-W1: one `Explore` call asking "every per-stat-math comment in docs that references a phase", returning a consolidated citation list). `WebFetch` is always from the main session. Do NOT spawn a sub-agent to "research OQ-W X end-to-end" — you lose the ability to cross-reference facts across OQ-Ws, and facts from one OQ-W often inform another.

When you spawn a sub-agent, brief it fully (self-contained prompt). Aggregate results; keep high-level state in the main session.

---

## Guardrails (from project's accuracy-first doctrine + this phase's scope)

- **Cite every fact.**
- **Classify every fact by verification level.**
- **Do not invent.** UNRESOLVED is an acceptable outcome; invention is not.
- **Do not design.** Shape design is Phase 6.5c.
- **Do not modify source docs** (LOCK C).
- **Scope = OQ-W list** (LOCK D).
- **Maintain the progress document throughout Stage 4** (nuance 9).

---

## When in doubt

Re-read `docs/session-prompts/gear-shape-design.md § 5`. Re-read `CLAUDE.md` (accuracy-first framing). Re-read this prompt's "Locked from coordinator" section.

If a fact is genuinely ambiguous between wiki sources, repo verified docs, and the §4 metadata: mark UNRESOLVED, note the contradictions, surface in the Completion Report. That is the correct behavior — not picking a side.

If the plan reveals that an OQ-W is unanswerable from available sources: that's a signal to the coordinator that the question needs in-game testing (the user has the game open). Surface as UNRESOLVED + note the testing protocol (mirror `docs/unresolved_questions.md` format if helpful).

**Begin with Stage 1.**
