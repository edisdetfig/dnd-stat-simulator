# Phase 3 — Engine Architecture Doc + Vocabulary Doc — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 3 of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo. Read, don't assume.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker. Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage/heal projections + available abilities. No time passes, no events fire. See `docs/perspective.md` for the full mental model.

The project is mid-rebuild:
- The class-data shape (`src/data/classes/class-shape.js`) is **locked**.
- The engine has been stripped to verified-math only (`src/engine/curves.js`, `damage.js`, `recipes.js`).
- Phase 0 landed a performance harness + pinned engine API surface.
- Phase 1 landed a class-shape validator (`src/data/classes/class-shape-validator.js` + `.test.js`).
- **Phase 2 migrated Warlock** as the anchor class (`src/data/classes/warlock.new.js`). Warlock passes the validator with zero per-class errors and is now the canonical reference data for engine architecture work.
- Real class data has NOT been migrated for the other 9 classes. Phase 10 handles those after the engine is built and verified.

You are executing **Phase 3** of the 13-phase rebuild plan: **create `engine_architecture.md` and `vocabulary.md`, plus the typed-damage-stat migration in code.** This is the engine's public contract — the document a Phase 6 implementer will build against.

---

## Mandatory reading order

Read these files before anything else. Do not skim.

1. **`docs/rebuild-plan.md`** — authoritative roadmap. Read in full: Operating protocol, Constraints, and **Phase 3** in detail. Pay attention to Watch-for items.
2. `CLAUDE.md` — project-level guidance. Note the accuracy-first doctrine.
3. `docs/perspective.md` — mental model (snapshot not realtime; no causation in data; atoms self-contained; conditions gate; UI emerges from data; data-driven, class-agnostic; accuracy first).
4. `src/data/classes/class-shape.js` — the locked schema. Every shape your architecture doc describes is grounded here.
5. `src/data/classes/class-shape-examples.js` — concrete patterns across the shape.
6. `docs/class-shape-progress.md` — **locked decisions** (read in full); **engine architecture open questions** (sections you must resolve or explicitly carry forward).
7. `src/data/classes/class-shape-validator.js` + `class-shape-validator.test.js` — validator logic and rule codes. Authoritative on what the shape currently enforces.
8. `src/data/constants.js` — canonical vocabularies (`ABILITY_TYPES`, `ACTIVATIONS`, `ATOM_TAGS`, `CONDITION_TYPES`, `DAMAGE_TYPES`, `ARMOR_TYPES`, `GRANT_REMOVE_TYPES`, `COST_TYPES`, `COST_SOURCE`, `TIER_VALUES`, `SCALES_WITH_TYPES`, `EFFECT_PHASES`, `EFFECT_TARGETS`, `PLAYER_STATES`, `WEAPON_TYPES`).
9. `src/data/stat-meta.js` — `STAT_META`, `STAT_OPTIONS`. Phase 3 expands this with typed-damage stats.
10. `src/engine/recipes.js` — `RECIPE_IDS`. The two-namespace discipline (recipe outputs vs gear/perk additive contributions).
11. `src/engine/curves.js`, `src/engine/damage.js` — verified math the engine pipeline calls into.
12. **`src/data/classes/warlock.new.js`** — **the canonical anchor.** Every pattern your architecture doc describes must be grounded in real Warlock data wherever possible.
13. **`docs/damage_formulas.md`** — verified damage formulas + test points. **Critical**: lines 130–143 spec additive stacking of MPB and TypeBonus. Architecture doc cites this directly.
14. `docs/healing_verification.md` — verified healing formula + test points.
15. `docs/season8_constants.md` — global caps, derived-stat formulas, VERIFIED constants.
16. `docs/unresolved_questions.md` — known mechanic unknowns.
17. `bench/fixtures/max-loadout.fixture.js` — Phase 0 fixture; reference for the kind of build the < 50ms budget targets.
18. **Phase 2 commit** (`f8431ad`) — the authoring patterns Warlock exercises define what Phase 3 must spec. Read the commit message; it surfaces the architectural anchors.

**Use the `Explore` sub-agent** for cross-cutting surveys (e.g., "every condition variant Warlock uses"; "every atom shape Warlock authors"; "every STAT_META key Warlock references").

---

## Your mission — Phase 3 in one sentence

Produce `docs/engine_architecture.md` and `docs/vocabulary.md` such that a Phase 6 implementer can build the engine from those documents alone, plus execute the typed-damage-stat migration in code (STAT_META + class-shape.js + validator + Warlock data) so the doc and data agree at Phase 3's exit.

See `docs/rebuild-plan.md § Phase 3` for the authoritative Goal / Work / Watch for / Success criteria.

---

## The three-priority hierarchy (governs every tradeoff)

1. **Performance first.** Snapshot recompute < 50ms for the largest realistic build. Every architecture decision evaluates against that budget. Stage boundaries enable memoization.
2. **Class-agnostic, second.** Adding a class is a data change only. Engine code does not branch on class, ability, or stat identity. Dispatch is enum-driven or data-driven.
3. **Engine-mechanic extension ease, third.** New mechanic types extend dispatch tables, never rewrite pipelines.

When priorities conflict, top of list wins. Cite this hierarchy when making tradeoffs.

**Plus the accuracy-first doctrine** (project-level): every numeric value traces to a verified source. Architecture-doc math claims cite `docs/damage_formulas.md` / `healing_verification.md` / `season8_constants.md` line numbers.

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 3 in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

### Stage 1 — Context Gather → Terse Map
Read the files above. Use `Explore` sub-agents for:
- Warlock atom inventory: every atom shape Warlock authors, with its container (`effects` / `damage` / `heal` / `shield` / `afterEffect` / `grants` / `removes`), `phase`, `target`, `condition`, `tags`, `scalesWith`, `resource` / `maxStacks`, `damageType` (where applicable).
- Condition-variant inventory: every condition variant Warlock uses, with example call sites.
- STAT_META reference inventory: every stat key Warlock references and which atoms reference it.
- Constants.js orphan-export audit (cross-reference every exported constant against actual usage in `warlock.new.js`, `class-shape-validator.js`, `class-shape.js`, `class-shape-examples.js`).
- Forward-spec inventory: patterns described in `class-shape.js` / `class-shape-progress.md` that Warlock doesn't exercise but the engine must support (Druid form mutual exclusion; Bard music; Sorcerer `mergedSpells`; music memory pool; `tier` condition variant; etc.).

Produce a written **Terse Map** covering:
- Pipeline-stage layout (Stage 0–6) with each stage's inputs/outputs/dependencies tagged from the Phase 0 checkpoint spec.
- Atom-shape inventory (per category container) with example Warlock atoms for each variant.
- Condition-variant catalog with Warlock and forward-spec call sites.
- STAT_META gaps (typed-damage stats to add).
- `class-shape.js` shape changes required (drop `damageType` from STAT_EFFECT_ATOM; add new `scalesWith.type` for damage-derived heal; etc.).
- Validator changes required (drop the `damageType` conditional; add scalesWith type variant; accept `ally` / `self_or_ally` targets; etc.).
- `vocabulary.md` table of contents (every locked vocabulary with values + brief semantics).
- Open architecture questions still pending after locked decisions (should be very few).

### Stage 2 — Plan
Produce a detailed execution plan covering:

**Document deliverables:**
- `docs/engine_architecture.md` — section-by-section outline. Each section names what it specs and which Warlock pattern grounds it. **Mandatory sections** (non-exhaustive):
  - **Stage pipeline (0–6)** — per stage: inputs, outputs, invariants, pure-vs-impure boundary, memoization checkpoint declaration (linked to Phase 0).
  - **Per-phase contract table** — for each `EFFECT_PHASES` value: operation (add / multiply / max / min / etc.), how stored value is interpreted by that operation, pipeline order. Antimagic worked example.
  - **Atom contracts** — STAT_EFFECT_ATOM, DAMAGE_ATOM, HEAL_ATOM, SHIELD_ATOM, GRANT_ATOM, REMOVE_ATOM, AFTER_EFFECT — each with required/optional fields, cross-reference rules, validator-enforced invariants.
  - **Condition dispatcher** — `CONDITION_TYPES` value → evaluator semantics. Includes `effect_active` activation-dispatch rule (passive=selected; cast_buff/toggle=selected AND in activeBuffs; cast=never).
  - **Availability resolver** (Stage 0) — `selectedX + grants[] − removes[] + ability-level condition` → `availableAbilityIds`.
  - **Memory-budget validator** (Stage 0) — sequential `memorySlots` consumption against ordered selections; locked vs active distinction; per-`abilityType` pool.
  - **Mutual exclusion** (forward-spec) — Druid forms; how engine enforces "one form active at a time" via UI + `ctx.activeForm` singleton even though Warlock doesn't exercise it.
  - **Damage projection math** (Stage 6) — including additive-stacking spec citing `damage_formulas.md:130–143`; per-damage-type bonus dispatch via typed stats.
  - **Heal projection math** (Stage 6) — citing `healing_verification.md`; including new lifesteal-derived heal projection mechanism.
  - **`afterEffect` engine semantics** — always-display informational metadata + conditionally-applied state-toggle. Per-ability user toggle in snapshot ctx.
  - **`scalesWith` polymorphism** — current types (`hp_missing`, `attribute`) + new type for damage-atom-derived heal (lifesteal).
  - **Snapshot data shape** — full `Snapshot` object structure: `bonuses`, `derivedStats`, `damageProjections`, `healProjections`, `availableAbilities`, `activeBuffs`, `viewingAfterEffect`, `classResources`, etc.
  - **Engine query API for Phase 11 UI** — at minimum: query atoms by target (e.g., "all atoms with target containing ally" for ally-buff panel).

- `docs/vocabulary.md` — every locked vocabulary with values + brief semantics. Mandatory sections:
  - `ABILITY_TYPES`, `ACTIVATIONS`, `ATOM_TAGS` (status + CC), `CAPABILITY_TAGS` (display-only atom tags — see nuance #11), `CONDITION_TYPES`, `DAMAGE_TYPES`, `ARMOR_TYPES`, `GRANT_REMOVE_TYPES`, `COST_TYPES`, `COST_SOURCE`, `TIER_VALUES`, `SCALES_WITH_TYPES`, `EFFECT_PHASES`, `EFFECT_TARGETS` (incl. new `ally` + `self_or_ally`), `PLAYER_STATES`, `WEAPON_TYPES`.

**Code deliverables (typed-damage-stat migration):**
- `src/data/stat-meta.js` — add typed-damage-bonus stats: one entry per `DAMAGE_TYPES` value where it makes sense (e.g., `darkDamageBonus`, `fireDamageBonus`, `evilDamageBonus`, `divineDamageBonus`, `iceDamageBonus`, `lightningDamageBonus`, `airDamageBonus`, `earthDamageBonus`, `arcaneDamageBonus`, `spiritDamageBonus`, `lightDamageBonus`). Decide whether `physicalDamageBonus` and `magicalDamageBonus` (already present) need restructuring.
- `src/data/classes/class-shape.js` — drop `damageType` from STAT_EFFECT_ATOM; add new `scalesWith.type` for damage-derived heal; add `ally` + `self_or_ally` to EFFECT_TARGETS comment; document `afterEffect` engine semantics.
- `src/data/constants.js` — add `ally` + `self_or_ally` to `EFFECT_TARGETS`; extend `SCALES_WITH_TYPES` with new variant for damage-derived heal.
- `src/data/classes/class-shape-validator.js` — drop the `damageType` conditional rule; add new `scalesWith.type` variant; accept new EFFECT_TARGETS values.
- `src/data/classes/warlock.new.js` — re-author the 4 `typeDamageBonus` atoms (Dark Enhancement, Soul Collector, Eldritch Shield, Blood Pact) using typed stats.
- `src/data/classes/class-shape-examples.js` — update typeDamageBonus references to typed-stat form.

**Plan must also cover:**
- File creation strategy for `docs/engine_architecture.md` and `docs/vocabulary.md` (single comprehensive file each, vs sectioned).
- Validator-feedback protocol (post-migration: rerun `npm test -- --run class-shape-validator`; warlock must stay at 0 errors).
- Cross-check protocol: every architecture-doc claim about damage/heal math cites the verified source by line.
- Deferred re-authors logged for Phase 4 (Eldritch Shield → afterEffect; PoS / Bloodstained Blade → ally targets; Shadow Touch desc revisit; Life Drain + Exploitation Strike → lifesteal-as-HEAL_ATOM with new scalesWith).
- Mapping to Phase 3 success criteria, item by item.
- Decisions requiring user sign-off (numbered list).
- Risks and open questions.

### Stage 3 — STOP — Plan Report

Emit the **Plan Report** in exactly this format:

```markdown
# Phase 3 — Plan Report

## Terse map
[bullets / tables from Stage 1]

## Execution plan
[detailed plan from Stage 2 — section outlines for both docs + code-migration steps + validator regreen plan]

## Decisions requiring user sign-off
[numbered list]

## Success-criteria coverage
| Criterion | Plan addresses it via |
|---|---|
| engine_architecture.md alone is sufficient for a Phase 6 implementer | ... |
| Every Warlock pattern is documented in the architecture doc | ... |
| Every locked decision from class-shape-progress.md is reflected | ... |
| vocabulary.md captures every locked vocabulary | ... |
| Typed-damage-stat migration: doc + STAT_META + class-shape.js + validator + Warlock data agree | ... |
| Validator stays green on Warlock after migration | ... |

## Risks
[bullets]

## Open questions
[bullets — including any forward-spec patterns that need user input]
```

**WAIT for explicit user sign-off.** Revise and re-emit if feedback comes back. Do not proceed to Stage 4 without explicit "approved."

### Stage 4 — Execute
Once signed off, execute the plan. Treat the validator as the inner feedback loop for the code-migration portion (re-run after each code change; warlock must stay at 0 errors).

- Stay strictly inside the signed-off plan.
- Any architectural decision NOT already locked (in `class-shape-progress.md § Locked decisions`, `rebuild-plan.md § Phase 3`, or this prompt's "Locked from coordinator" section below) requires surfacing before acting.
- If you discover a Warlock pattern not anticipated in the plan, surface it — don't paper over.
- If a verified source disagrees with itself or with `class-shape-progress.md`, STOP and flag.

### Stage 5 — STOP — Completion Report

Emit the **Completion Report** in exactly this format:

```markdown
# Phase 3 — Completion Report

## Files created / modified
[paths + one-line purpose each]

## What was built
[summary tied to the plan]

## Architecture doc coverage
| Architecture-doc section | Warlock pattern grounding it | Forward-spec patterns covered |
|---|---|---|
| ... | ... | ... |

## Vocabulary doc coverage
| Vocabulary | Source of truth | Notes |
|---|---|---|
| ... | ... | ... |

## Code migration outcome
- STAT_META: [N typed-damage-bonus stats added; details]
- class-shape.js: [diff summary]
- constants.js: [diff summary]
- validator: [rules dropped/added/changed]
- warlock.new.js: [N atoms re-authored from typeDamageBonus → typed stats]
- class-shape-examples.js: [N references updated]

## Validator status
[Warlock: 0 errors confirmed. Full test count.]

## Deviations from plan
[what changed and why — or "none"]

## Success-criteria status
| Criterion | Status | Evidence |
|---|---|---|
| ... | DONE / PARTIAL / BLOCKED | ... |

## Findings (for later phases)
[anything discovered out of Phase 3 scope — Phase 4 verification follow-ups, Phase 5/6 implementation considerations, Phase 10 class-migration anchors]

## Follow-ups (non-blocking)
[anything noticed out of scope]
```

**WAIT for explicit user sign-off.** Revise per feedback. Do not declare Phase 3 complete without explicit sign-off.

---

## Locked from coordinator (resolved before this session opened)

These six decisions were resolved between Phase 2 and Phase 3. **Do not re-litigate. Implement as specified.**

### LOCK 1 — Per-phase contract table (engine_architecture.md)
For each `EFFECT_PHASES` value, the architecture doc specifies: (a) what operation the phase performs, (b) how stored value is interpreted by that operation, (c) order in pipeline. Antimagic (`magicDamageTaken: 0.80` at `post_cap_multiplicative_layer`) is the canonical worked example. Authoring rule: stat name + phase together carry the semantic; the doc's table is the legibility contract.

### LOCK 2 — Typed-damage-stat migration
Drop `damageType` field from STAT_EFFECT_ATOM. Replace `typeDamageBonus` + `damageType` discriminator with typed stats per damage-type (`darkDamageBonus`, `fireDamageBonus`, etc.) — one STAT_META entry per damage type that needs a bonus stat. Re-author Warlock's 4 atoms (Dark Enhancement, Soul Collector, Eldritch Shield, Blood Pact). Validator drops the conditional `damageType` rule. **Phase 3 sub-decision (defer to Phase 6 if reasonable):** does `type_damage_bonus` remain a distinct phase or collapse into `post_curve_multiplicative`? Recommend keeping the phase for clarity; Phase 6 can collapse if implementation finds it redundant.

### LOCK 3 — `lifestealRatio` flat field on DAMAGE_ATOM
Lifesteal mechanics that scale heal from damage dealt are expressed as a flat optional `lifestealRatio` field on DAMAGE_ATOM (alongside the existing `percentMaxHealth` field — same flat-field pattern). Engine rule: any damage atom with `lifestealRatio` produces a derived heal projection at `lifestealRatio × damage_atom_projection`, with `target: "self"` and `healType` derived via family collapse (`physical` → `physical`; any magical subtype → `magical`). Engine carries a small `damageTypeToHealType()` utility for the collapse.

**No new `scalesWith` variant. No new STAT_META metadata. No HEAL_ATOM changes** — `percentMaxHealth` already handles target-max-HP-derived heals (Exploitation Strike pattern; semantic per coordinator clarification: "% of whichever target is contextually relevant").

**Phase 3 work**: add `lifestealRatio` to DAMAGE_ATOM in `class-shape.js`; validator accepts the field (optional numeric, recommend sanity check 0–1 range); architecture doc heal-projection section specs the engine rule + family-collapse mapping; vocabulary doc references the field.

**Phase 4 follow-up**: re-author Life Drain damage atom with `lifestealRatio: 1.0`; drop `lifestealOnDamage` from STAT_META (no consumers after re-author). Exploitation Strike's `lifestealOfTargetMaxHp` stays raw-stat for now (different mechanic — % of target max HP, not damage-derived).

### LOCK 4 — No `melee` virtual category in WEAPON_TYPES
"Every weapon can melee" — `melee` is not a meaningful distinguishing category. Atoms that fire on "any attack" carry no `weapon_type` condition; their desc explains the in-game trigger. Abilities that exclude bare hands (require any equipped weapon) use `condition: { type: "not", conditions: [{ type: "weapon_type", weaponType: "unarmed" }] }`. Document this canonical pattern in `vocabulary.md`. If Phase 10 surfaces a true "melee weapon only" gate (separate from unarmed/ranged/two_handed), it's an additive vocabulary change then.

### LOCK 5 — `afterEffect` engine semantics: always-display + conditional-apply via toggle
`afterEffect` (existing locked sibling container) holds the trailing post-main-effect phase. Engine treats afterEffect atoms two ways:
- **Always-display informational metadata** in tooltips whenever the parent ability is selected — atoms not summed into snapshot stats.
- **Conditionally applied to snapshot stats** via a per-ability user toggle ("view post-effect state"). When toggled: snapshot drops the parent ability's main-state atoms (effects/damage/heal/shield) and applies the afterEffect's atoms instead.

Snapshot ctx gains a representation of which abilities are in "view-after-state" mode (e.g., `viewingAfterEffect: Set<abilityId>`, distinct from `activeBuffs`). Architecture doc specs the toggle's lifecycle, evaluation rule, and UI surface. **Phase 4 follow-up**: re-author Eldritch Shield's proc effects from `effects[]` (currently gated on `effect_active`) into `afterEffect`.

### LOCK 6 — `EFFECT_TARGETS` adds `ally` and `self_or_ally`
Add both values to `EFFECT_TARGETS` in `constants.js`. Engine treats them as display-only initially (no projection synthesized; same as `party` / `nearby_allies` today). **Required engine API for Phase 11 UI**: a query method that returns "all atoms with target containing ally" (for the ally-buffs panel that Phase 11 builds). Architecture doc specs the query method signature and behavior. **Phase 4 follow-up**: re-author Power of Sacrifice (`target: "either"` → richer target spec covering self/ally/enemy) and Bloodstained Blade (`target: "self"` → self/ally) using new vocabulary.

---

## Phase-specific nuances you must surface in the plan

These are tensions, judgment calls, and forward-looking questions that need to be visible in the Plan Report — not buried in implementation. Six-to-ten typical; Phase 3 has more because of its surface area.

1. **Architecture doc rigor: every pattern Warlock uses must be specced; every locked-but-not-yet-exercised pattern must be forward-specced.** Forward-spec patterns to cover (non-exhaustive):
   - Druid form mutual exclusion (one form in `activeBuffs` at a time)
   - Bard music memory pool (`abilityType: "music"` discriminator)
   - Sorcerer `mergedSpells` (auto-derived spells gated on `ability_selected` conditions)
   - `transformation` ability type + its memory-pool discriminator
   - `tier` condition variant (Bard performance tiers)
   - `equipment` condition variant
   - `environment` condition variant
   - Player states Warlock doesn't reference (`hiding`, `crouching`, `bow_drawn`, etc.)
   - Specific weapon types Warlock doesn't reference

   For each forward-spec pattern, the architecture doc names the pattern, explains its semantic, and notes "Warlock does not exercise this; first user is anticipated to be class X in Phase 10."

2. **Per-phase contract table — exhaustive enumeration.** All 9 EFFECT_PHASES values get spec rows: `pre_curve_flat`, `attribute_multiplier`, `post_curve`, `post_curve_multiplicative`, `multiplicative_layer`, `post_cap_multiplicative_layer`, `type_damage_bonus`, `healing_modifier`, `cap_override`. For each, what's the operation, what's the value semantic, what's the pipeline order. Include the additive-stacking-within-phase, multiplicative-across-phases rule citing `damage_formulas.md:130–143`.

3. **Snapshot data shape — exhaustive enumeration.** Spec the full `Snapshot` object: every field, its type, its source stage. Include the new `viewingAfterEffect` toggle from LOCK 5. The Phase 6 implementer reads this section to know what they're building.

4. **`scalesWith` polymorphism naming.** Propose the new variant name for damage-derived heal (e.g., `self_damage_dealt`) and its field shape — what the heal atom needs to carry to identify which sibling damage atom(s) it scales from. The pattern must be class-agnostic.

5. **Forward-spec for class-resource conditions.** Warlock's `darkness_shards` resource has a condition (visibility gating); `blood_pact_locked_shards` has a compound condition. Architecture doc specs how the resource-condition system works and how UI consumes it. Anticipate: Cleric's holy_power, Druid's shapeshift charges, Sorcerer's mana, Bard's performance state — all forward-spec.

6. **`afterEffect` engine flow exhaustive spec.** The toggle isn't trivial — when active, what happens to: shield projections, heal projections, damage projections of the parent ability? When inactive, what's displayed? Phase 6 implementer needs the answer in the doc.

7. **Capability tags from Phase 1 Finding #4 → vocabulary.md canonicalization.** Warlock authors capability tags on display-only atoms: `cooldown_gated`, `phase_through`, `spells_cannot_kill`, `detects_hidden`, `possessable`, `can_move_while_channeling`, `irreversible_until_contract_ends`. These are unlocked vocabulary — Phase 3 canonicalizes them. Two paths:
   - **(a) Lock the current set as `CAPABILITY_TAGS` constant** in `constants.js`, validator enforces.
   - **(b) Define a naming convention only** (snake_case capability names), no enforced enum — vocabulary grows organically.
   Recommend (a) with the current 7 values + provision for Phase 10 to add. Surface this in Plan Report.

8. **Ability-level tags vocabulary (Phase 1 Finding #5).** Warlock uses ability-level `tags` (e.g., `["demon", "blood"]` on Blood Pact, `["curse"]` on Curse of Pain, `["dark", "projectile"]` on Bolt of Darkness). These are also unlocked. Phase 3 canonicalizes — same options as #7. Note `removes[].tags` filter consumers reference these.

9. **`damageFilter` on SHIELD_ATOM.** Eldritch Shield uses `damageFilter: "magical"` — verify this is in the locked shape or surface as new vocabulary. Spec the field's value set in `vocabulary.md`.

10. **Engine query API for Phase 11 UI.** LOCK 6 names one query method (atoms-by-target). Anticipate others Phase 11 will need: e.g., "atoms grouped by source ability"; "active conditions and what they're gating"; "next-effect-of-cast for any cast_buff/cast spell." The architecture doc reserves API surface for these without implementing them. Don't over-spec — name the queries Phase 11 obviously needs and stop.

11. **Validator changes coordinated with shape changes.** When you drop `damageType` from STAT_EFFECT_ATOM, the validator's rule that enforced it must also drop. When you add new EFFECT_TARGETS values, the validator must accept them. When you extend SCALES_WITH_TYPES, the validator's scalesWith.type check must accept the new variant. Coordinate these in a single coherent commit; warlock stays at 0 validator errors throughout.

12. **`class-shape.js` is documentation as well as schema.** Comments in the file are read by authors. After Phase 3, comments referencing `damageType` on STAT_EFFECT_ATOM must update; comments documenting `afterEffect` engine semantics must align with LOCK 5; comments documenting target options must mention `ally` / `self_or_ally`.

13. **Engine architecture open questions in `class-shape-progress.md`.** Two unresolved items at Phase 3 entry:
    - Q1: `hp_below` Stage 2 ↔ Stage 5 cycle. Warlock's Immortal Lament uses `hp_below: 0.05`. Resolve in Phase 3 — propose either (a) compute HP-before-conditions once at Stage 0 or (b) reframe as user-settable HP% toggle. Recommend (b) per snapshot-no-causation principle. Surface in Plan Report.
    - Q2: Stage 2 cache-key granularity. Phase 0's checkpoint spec records the dependency set; Phase 3 should commit to the cache-key layout (fine-grained dependency-declared key vs coarse whole-ctx). Recommend deferring to Phase 5 implementation plan if not strictly needed for the architecture-doc contract.

14. **No engine code in Phase 3.** Phase 3 produces docs + the typed-damage-stat data migration. Implementing pipeline modules (`buildContext.js`, `collectAtoms.js`, etc.) is Phase 6. If you find yourself wanting to write `runSnapshot.js`, stop — that's out of scope.

---

## Sub-agent guidance

- **Stage 1 (Context Gather).** Spawn `Explore` for the surveys: Warlock atom inventory, condition-variant call sites, STAT_META reference inventory, constants orphan-export audit, forward-spec inventory. These are the kind of broad reads that bloat main-session context. Each Explore call gets a self-contained prompt — it has no memory of yours.
- **Stage 2 (Plan).** `Plan` sub-agent can draft individual sections of the architecture doc — Stage X pipeline contract, condition dispatcher table, snapshot data shape — given the Terse Map as input. You aggregate + review in main session.
- **Stage 4 (Execute).**
  - Document writing: main session does the synthesis. Sub-agents draft section content; you compose.
  - Code migration: sequential (validator loop). Main session drives. Sub-agents only for specific research queries ("are there other consumers of `damageType` field besides STAT_EFFECT_ATOM?").

When you spawn a sub-agent, brief it fully (self-contained prompt). Aggregate results; keep high-level state in the main session.

---

## Guardrails (from Phase 3 "Watch for")

- **Don't write engine code.** No `buildContext.js`, no `collectAtoms.js`, no `runSnapshot.js`. Phase 6 builds the engine; Phase 3 specs it.
- **Don't introduce TBDs in the architecture doc.** Open items go to `class-shape-progress.md § Engine architecture open questions` or `rebuild-plan.md`. The architecture doc is the contract — contracts have no TBDs.
- **Don't deviate from locked decisions.** The 6 LOCKs above + every entry in `class-shape-progress.md § Locked decisions` are binding. Disagree? Raise it; don't bypass.
- **Don't over-restrict to Warlock's slice.** Forward-spec patterns are part of the contract.
- **Don't canonicalize unlocked vocabularies that aren't part of Phase 3's scope.** This phase canonicalizes: typed-damage stats, capability tags (nuance #7), ability-level tags (nuance #8), new EFFECT_TARGETS values, new SCALES_WITH_TYPES variant, `damageFilter` on SHIELD_ATOM. Other vocabularies stay as-is unless surfaced for sign-off.
- **Validator stays green on Warlock throughout.** Every code change is validated. Per-class warlock test must read 0 errors at every checkpoint.
- **Cite verified sources by line number.** Every math claim in the architecture doc cites `damage_formulas.md` / `healing_verification.md` / `season8_constants.md` line numbers. No invented values.
- **Stay in scope.** Any scope expansion is a sign-off-gate question, not a unilateral call.

---

## When in doubt

Re-read `docs/rebuild-plan.md § Phase 3` and `§ Operating protocol`. Re-read `docs/perspective.md § Core principles`. Re-read `docs/class-shape-progress.md § Locked decisions` for anything about the shape. Re-read this prompt's "Locked from coordinator" section for the 6 architectural decisions made between Phase 2 and Phase 3.

If a pattern's semantic is genuinely ambiguous (you can see two defensible specs), raise it under **Open questions** in your Plan Report. Don't pick silently.

**Begin with Stage 1.**
