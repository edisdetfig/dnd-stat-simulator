# Phase 2 — Warlock Migration (Anchor Class) — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 2 of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo. Read, don't assume.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker. Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage/heal projections + available abilities. No time passes, no events fire. See `docs/perspective.md` for the full mental model.

The project is mid-rebuild:
- The class-data shape (`src/data/classes/class-shape.js`) is **locked**.
- The engine has been stripped to verified-math only (`src/engine/curves.js`, `damage.js`, `recipes.js`).
- Phase 0 landed a performance harness + pinned engine API surface.
- **Phase 1 landed a class-shape validator** (`src/data/classes/class-shape-validator.js` + `.test.js`). It reads every rule from canonical sources and flags exactly which patterns in the current v3 class data are still legacy. **This is your safety net.** Every error the validator surfaces on Warlock is a migration task; your goal is zero validator errors on Warlock by end of phase.
- Real class data has NOT been migrated to the locked shape yet. **You migrate Warlock.** Phase 10 will migrate the remaining 9.

You are executing **Phase 2** of the 13-phase rebuild plan. Warlock is the **anchor class**: Phase 3 (engine architecture doc) and Phase 6 (engine implementation) are both grounded in real Warlock data, so your output must be rich enough that those phases have concrete patterns to build against.

---

## Mandatory reading order

Read these files before anything else. Do not skim.

1. **`docs/rebuild-plan.md`** — authoritative roadmap. Read in full: Operating protocol, Constraints, and **Phase 2** in detail. Pay attention to the Watch-for items (they encode the highest-risk pitfalls).
2. `CLAUDE.md` — project-level guidance. Note the accuracy-first doctrine: every formula traces to a verified source.
3. `docs/perspective.md` — mental model (snapshot not realtime; no causation in data; atoms self-contained; conditions gate; UI emerges from data; data-driven, class-agnostic; accuracy first).
4. `src/data/classes/class-shape.js` — the schema you author against.
5. `src/data/classes/class-shape-examples.js` — concrete patterns across the shape.
6. `docs/class-shape-progress.md` — **locked decisions.** Read in full; the Blood Pact, `grants[]`/`removes[]`, `mergedSpells`, `activation` variants, resource system, and forbidden-field decisions are the rules you're authoring against.
7. `src/data/classes/class-shape-validator.js` + `class-shape-validator.test.js` — the validator logic and its rule codes. Your feedback loop.
8. `src/data/constants.js` — canonical vocabularies (ABILITY_TYPES, ACTIVATIONS, ATOM_TAGS, CONDITION_TYPES, DAMAGE_TYPES, ARMOR_TYPES, GRANT_REMOVE_TYPES, COST_TYPES, COST_SOURCE, TIER_VALUES, SCALES_WITH_TYPES, EFFECT_PHASES, EFFECT_TARGETS, PLAYER_STATES, WEAPON_TYPES). Everything you author must use these values.
9. `src/data/stat-meta.js` — `STAT_META`, `STAT_OPTIONS`. Warlock migration will require new entries; this is the registry to extend.
10. `src/engine/recipes.js` — `RECIPE_IDS`. For the two-namespace discipline (`stat ∈ RECIPE_IDS` only when `phase === "cap_override"`).
11. `src/engine/curves.js`, `src/engine/damage.js` — verified math you'll reference (not modify).
12. **`src/data/classes/warlock.js`** — the OLD Warlock v3 file. **Reference only.** Do not modify it. It's the canonical source for what Warlock's mechanics actually are.
13. **`docs/classes/warlock.csv`** — the spreadsheet export. Source of truth for `memoryCost` (CSV "Tier" column — see class-shape-progress.md open-item 9), verified stat values, verified damage numbers.
14. `docs/damage_formulas.md`, `docs/healing_verification.md` — verified formula test points. Any damage/heal authoring must cross-check.
15. `docs/season8_constants.md` — global caps, derived-stat formulas, VERIFIED constants.
16. `docs/unresolved_questions.md` — known mechanic unknowns. Do NOT invent values for unresolved mechanics; flag them with `_unverified`.
17. `src/data/classes/index.js` — the class registry. You'll wire your migrated Warlock into it.
18. `bench/fixtures/max-loadout.fixture.js` — the synthetic fixture used as the validator's rich positive case. Your migrated Warlock is an independent authoring — don't try to reuse the fixture as data.

**Use the `Explore` sub-agent** for context gather on `warlock.js` + the CSV — those are dense, and your main context window shouldn't hold them line-by-line.

---

## Your mission — Phase 2 in one sentence

Author a complete Warlock class data file in the new shape such that it **passes the Phase 1 validator with zero errors**, preserves **every verified mechanic** from the old `warlock.js` + CSV, and is **rich enough to anchor** the Phase 3 engine architecture doc.

See `docs/rebuild-plan.md § Phase 2` for the authoritative Goal / Work / Watch for / Success criteria. That spec is your source of truth.

---

## The three-priority hierarchy (governs every tradeoff)

1. **Performance first.** Not directly at stake in data authoring, but: don't bloat atom counts beyond what the mechanics actually require. Each extra atom is recompute cost.
2. **Class-agnostic, second.** If you feel pulled toward a Warlock-specific engine mechanism, **stop** — that's a sign the shape needs to express it more generally. Raise it as a shape-change decision, not a data hack.
3. **Engine-mechanic extension ease, third.** If Warlock needs a pattern the shape doesn't support, you propose a shape extension with the same rigor as a locked decision: update `class-shape.js` + `class-shape-progress.md` + validator + data together in one coherent change.

**Plus the accuracy-first doctrine** (project-level, not in the three-priority list but non-negotiable): every numeric value traces to a verified source. Use `_unverified` annotation for anything you can't cite.

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 2 in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

### Stage 1 — Context Gather → Terse Map
Read the files above. Use the `Explore` sub-agent for:
- Warlock CSV survey: every ability row, its type, its tier, its verified numeric values.
- Old `warlock.js` survey: every ability's current shape, cross-referenced to the CSV.
- Validator's current output on Warlock: run `npm test -- --run class-shape-validator` and capture the Warlock error list (it's the migration to-do list, item-by-item).
- `STAT_META` current entries: which stats Warlock will reference that exist vs need adding (audit passives from old data against existing entries).

Produce a written **Terse Map** covering:
- Warlock ability inventory (perks, skills, spells) with type + activation + memoryCost from CSV.
- Verified mechanics catalog (formulas, numeric values, cite sources).
- Unresolved mechanics (cross-referenced to `unresolved_questions.md`).
- STAT_META gaps — new entries required.
- Shape/vocabulary extensions required (expected: **zero**, but if any surface, flag).
- Current validator errors on Warlock — the to-do list as rule-bucketed counts.

### Stage 2 — Plan
Produce a detailed execution plan covering:

- **File strategy.** Create `src/data/classes/warlock.new.js` (keeps old available as reference; Phase 8 deletes old). Wire it into `src/data/classes/index.js` replacing the old import, so the validator sees the new file. Old `warlock.js` stays on disk but unreferenced. Confirm this approach or propose an alternative with rationale.
- **Ability-by-ability migration table.** For each of Warlock's perks/skills/spells, spell out:
  - id, name, type, activation, memoryCost (from CSV), cost shape.
  - Target-shape atoms (effects / damage / heal / shield / afterEffect / grants / removes) with the specific atom shape each uses (stat_effect with phase X and target Y; damage_atom with damageType Z; etc.).
  - Which `condition` gates it (if any).
  - Which `tags` it carries.
  - Verified-source citation for every numeric value.
  - `_unverified` markings for anything without a citation.
- **Blood Pact specification in full.** The most architecturally loaded ability. Per locked decisions: skill, toggle activation, in `skills[]`, no `form` block, grants `bolt_of_darkness` + `exploitation_strike` + `exit_demon_form`, effects gate on `effect_active: blood_pact`. Lay out the full atom list.
- **`classResources` declarations.** `darkness_shards` (cross-ability shared pool) and `blood_pact_locked_shards` (user-set counter scoped via condition). Confirm the conditions match the locked answer for open items 2 and 3.
- **STAT_META extensions.** List each new stat key with: name, direction (positive/negative better), tags, any cap metadata. Aim for additions, not modifications. Justify each against a Warlock mechanic that needs it.
- **armorProficiency.** Set to `["cloth", "leather"]` per locked decision (class-shape-progress.md). Old field name is `armorRestrictions`; do NOT carry it over.
- **Validator-feedback protocol.** How you'll run the validator during execution to track progress (e.g. "run after each section completed; target is zero Warlock errors").
- **Cross-check protocol.** How you'll verify numeric accuracy against `damage_formulas.md` and `healing_verification.md` test points — which ability's atoms map to which test points.
- **Exact files to create / modify** (full paths).
- **Mapping to Phase 2 success criteria, item by item.**
- **Decisions requiring user sign-off** (numbered list).
- **Risks** and **open questions**.

### Stage 3 — STOP — Plan Report
Emit the **Plan Report** in exactly this format:

```markdown
# Phase 2 — Plan Report

## Terse map
[bullets / tables from Stage 1]

## Execution plan
[detailed plan from Stage 2 — the ability-by-ability migration table is the heart]

## Decisions requiring user sign-off
[numbered list; flag any shape extensions or STAT_META judgment calls]

## Success-criteria coverage
| Criterion | Plan addresses it via |
|---|---|
| Warlock passes validator with zero errors | ... |
| Every CSV ability represented | ... |
| Verified mechanics preserved | ... |
| STAT_META complete for Warlock | ... |

## Risks
[bullets]

## Open questions
[bullets — and specifically call out any `_unverified`-worthy mechanics]
```

**WAIT for explicit user sign-off.** If feedback comes back, revise and re-emit. Do not proceed to Stage 4 without explicit "approved" or equivalent.

### Stage 4 — Execute
Once signed off, execute the plan. Treat the validator as your inner feedback loop — after every ability block (or every few), re-run and fix errors before moving on. Commit discipline:
- Stay strictly inside the signed-off plan.
- Any shape change, vocabulary addition, or STAT_META extension NOT already signed off requires surfacing before acting.
- If you discover a mechanic in the CSV that isn't in the old warlock.js (or vice versa), surface it — don't paper over.
- If a verified value disagrees between two sources, STOP and flag — don't guess.

### Stage 5 — STOP — Completion Report
Emit the **Completion Report** in exactly this format:

```markdown
# Phase 2 — Completion Report

## Files created / modified
[paths + one-line purpose each]

## What was built
[summary tied to the plan]

## Validator status on Warlock
[exact error count — must be 0 for Phase 2 to close. If non-zero, explain why and what's blocking.]

## Ability inventory delivered
| Ability | Type | Activation | memoryCost | Verified mechanics preserved |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## STAT_META additions
[list with justifications]

## Shape / vocabulary / validator changes
[none expected; list any that happened + why, with links to the coordinated updates]

## Unresolved mechanics (`_unverified` annotations)
[list each; cite the unresolved_questions.md entry or explain why still open]

## Deviations from plan
[what changed and why — or "none"]

## Success-criteria status
| Criterion | Status | Evidence |
|---|---|---|
| ... | DONE / PARTIAL / BLOCKED | ... |

## Findings (for later phases)
[anything discovered out of Phase 2 scope — especially things Phase 3 architecture doc needs to describe, or Phase 10 migrations will benefit from as precedent]

## Follow-ups (non-blocking)
[anything noticed out of scope]
```

**WAIT for explicit user sign-off.** Feedback may require revision. Do not declare Phase 2 complete without explicit sign-off.

---

## Phase 2 nuances you must surface in the plan

1. **File strategy: `warlock.new.js` vs in-place rewrite.** Plan recommends `warlock.new.js` with index.js rewired. But `warlock.new` is a junk suffix long-term. Propose your final plan: is it (a) `warlock.new.js` + old stays until Phase 8 deletes, (b) rename old to `warlock.legacy.js` and use `warlock.js` for the new file, (c) something else. Decide and surface.

2. **Old `warlock.js` presence after migration.** Once your new Warlock is in index.js, the old file is unreferenced. Leave it on disk (Phase 12 cleanup) or delete now? Plan says don't delete until verification works — i.e., not in Phase 2. Confirm you leave it.

3. **CSV vs old `warlock.js` conflicts.** When a mechanic disagrees between CSV and the old code file, which wins? Default: CSV (it's the spreadsheet export; typically more current). But flag every conflict — they're signals.

4. **Memory cost for Blood Pact's granted sub-abilities.** `bolt_of_darkness`, `exploitation_strike`, `exit_demon_form` are granted by Blood Pact. Granted abilities have `costSource: "granted"` by default (granted ability pays its own cost) or `"granter"` (granter's cost governs). Decide per sub-ability; cite evidence from old file / CSV.

5. **Bolt of Darkness exists as both a regular spell AND a granted ability?** Check the CSV / old file. Warlock has Bolt of Darkness as a spell when unlocked; Blood Pact grants a version while in demon form. Are these the same ability (one id, one data block)? Or two different abilities that happen to be similar? Decide, justify, surface.

6. **`darkness_shards` UI counter.** Cross-class shared resource, gated on `any(ability_selected: soul_collector, ability_selected: spell_predation)`. Verify this condition matches the locked answer (class-shape-progress.md open-item 2).

7. **`blood_pact_locked_shards` second-half condition.** Per locked answer: `all(effect_active: blood_pact, any(ability_selected: soul_collector, ability_selected: spell_predation))`. Implement verbatim.

8. **STAT_META judgment calls.** Every new stat entry you propose will outlive Phase 2. Names matter. Proposed names should match existing conventions (e.g. `XBonus` for multiplicative; direction metadata per STAT_META shape). If in doubt, flag in Plan Report for sign-off.

9. **Tag vocabulary caveat.** Phase 1 flagged two unlocked tag vocabularies (Finding #4 — capability tags on display-only atoms; Finding #5 — ability-level tags used as `removes[].tags` filter targets). If Warlock needs a capability tag or ability-level tag, use it and flag — but do NOT try to canonicalize the vocabulary here. That's Phase 3.

10. **Blood Tithe and the Warlock theme variant.** The app has a Blood Tithe theme (from CLAUDE.md history). This is a UI concern, not data. If you find yourself wanting to author UI-specific fields, stop.

---

## Sub-agent guidance

- **Context Gather (Stage 1).** Spawn the `Explore` sub-agent to survey `src/data/classes/warlock.js`, `docs/classes/warlock.csv`, and `docs/unresolved_questions.md` for Warlock entries. Three parallel Explore calls or one thorough call — your choice.
- **Plan (Stage 2).** The ability-by-ability table is large (~19 abilities). Consider spawning the `Plan` sub-agent to draft the table from the Terse Map inventory, with precise atom shapes for each ability. You aggregate + review.
- **Execute (Stage 4).** Ability authoring is inherently sequential (validator loop), so main session drives. Spawn sub-agents only for specific research queries: "is Dark Bolt's headshot multiplier verified or wiki-sourced?" / "cross-check Curse of Pain duration with damage_formulas.md."

When you spawn a sub-agent, brief it fully (self-contained prompt — it has no memory of your session). Aggregate results; keep high-level state in the main session.

---

## Guardrails (from Phase 2 "Watch for")

- **Don't modify the old `warlock.js`.** It's the reference. You read it; you don't touch it.
- **Don't invent fields the validator rejects.** If you need a field the shape doesn't support, STOP and raise as a shape-change decision.
- **Don't invent numeric values.** Every number traces to a verified source or carries `_unverified`.
- **Don't canonicalize unlocked vocabularies.** Capability tags and ability-level tags remain unlocked until Phase 3.
- **Don't audit `constants.js` for orphan exports.** Phase 3 job.
- **Don't write an architecture doc.** Phase 3 job. Your output IS the grounding material for that doc; let Phase 3 do the synthesis.
- **Stay in scope.** Any scope expansion is a sign-off-gate question, not a unilateral call.

---

## When in doubt

Re-read `docs/rebuild-plan.md § Phase 2` and `§ Operating protocol`. Re-read `docs/perspective.md § Core principles`. Read `docs/class-shape-progress.md § Locked decisions` for anything about Warlock, Blood Pact, grants, or resource patterns.

If a mechanic's semantics are ambiguous (e.g., you can see two defensible authorings), raise it under **Open questions** in your Plan Report. Don't pick silently.

**Begin with Stage 1.**
