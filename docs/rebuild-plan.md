# Rebuild Plan

The authoritative roadmap for the simulator rebuild, from locked `class-shape.js` to a fully rebuilt, class-agnostic, performance-bounded snapshot engine with a shipping UI. Every session that picks up phase work reads this doc and `docs/perspective.md` first.

---

## Operating protocol (applies to every phase)

Every phase is executed by a fresh session, driven by a session prompt crafted by the project coordinator. Every phase prompt enforces this pattern:

1. **Context Gather → Terse Map.** The session reads canonical files, maps the surface area, produces a short written map of what exists and what's missing.
2. **Plan.** The session produces a detailed execution plan grounded in the terse map. Sub-agents may be used for parallel context-gather or scoped planning work.
3. **STOP — plan report for sign-off.** The session emits a plan + report and waits. The coordinator + user review, provide feedback, and may require revisions. The session acts on feedback until explicit sign-off is given.
4. **Execute.** Once the plan is signed off, the session executes it — again using sub-agents as appropriate — keeping the plan as its source of truth.
5. **STOP — completion report for sign-off.** The session emits a completion report summarizing what was done, mapped to the phase's success criteria, and waits. The coordinator + user review, provide feedback, and may require revisions. The session acts on feedback until explicit sign-off is given.

No phase is "done" without both gates passed. No subsequent phase begins before the prior phase's completion gate clears.

---

## Constraints — priority order (resolves all tradeoffs)

1. **Performance first.** Snapshot recompute must complete in < 50ms for the largest realistic build. Memoization at stage boundaries is the implementation strategy.
2. **Class-agnostic, second.** Adding a new class is a data change only. Updating verified values on a game patch must be a one-line edit in class data, never a code refactor.
3. **Engine-mechanic extension ease, third.** New mechanic types (condition variants, atom types, cost types) should be additive — extend dispatch tables, don't rewrite pipelines.

When priorities conflict, top of list wins. Performance pulls toward simpler shapes; class-agnostic pulls toward more data-driven dispatch; extensibility pulls toward more polymorphism.

---

## Phase 0 — Performance harness

**Goal.** Establish the < 50ms budget operationally before there's an engine to measure against.

**Work.**
- Document the recompute budget and what counts: full pipeline from ctx build → derived stats + damage projections + heal projections + active abilities list.
- Write a minimal benchmark harness (Vitest `bench` or standalone script) that times recompute on a fixture build.
- Set memoization checkpoints at each stage boundary (Stage 0 → 1 → 2 → 3 → 4 → 5 → 6) — record what inputs each stage depends on so cache invalidation is predictable.
- Establish a reference build (Warlock with full perks/spells/gear loadout) as the benchmark fixture.

**Watch for.**
- Premature optimization. Don't memoize until there's a measurable bottleneck — but design stage boundaries so memoization can be added without restructuring.
- Realistic fixture. Trivial builds won't expose performance issues; the fixture should approximate the largest realistic loadout.

**Success criteria.** Benchmark harness runs; baseline measured (likely > 50ms initially); checkpoint locations identified.

---

## Phase 1 — Build the class-shape validator

**Goal.** Build-time check that catches authoring errors before the engine runs. Every class data file must conform to `class-shape.js` + `STAT_META` + `CONDITION_VARIANTS` + atom-tag vocabulary. Produces the migration to-do list for every class and becomes Phase 2's safety net.

**Where it lives.**
- **Primary.** Vitest test (`src/data/classes/class-shape-validator.test.js`) that loads every class file and runs it through the validator. Fails with detailed errors. Runs as part of `npm test`.
- **Secondary.** Optional Vite plugin for build-time enforcement on `npm run build` — fail builds on validator errors. Can defer to later phase.

**What it validates (detailed).**

**A. Class root structure.**
- Required: `id`, `name`, `baseAttributes`, `baseHealth`, `maxPerks`, `maxSkills`, `armorProficiency`.
- Optional: `classResources`, `perks[]`, `skills[]`, `spells[]`, `mergedSpells[]` (Sorcerer only).
- `baseAttributes` contains all 7 attribute keys (`str/vig/agi/dex/wil/kno/res`).
- `armorProficiency` is a subset of locked armor types (`cloth`, `leather`, `plate`).

**B. Per-ability structure.**
- Required: `id`, `name`, `type`, `desc`, `activation`.
- `type` ∈ {`perk`, `skill`, `spell`, `transformation`, `music`}.
- `activation` ∈ {`passive`, `cast`, `cast_buff`, `toggle`}.
- `id` is unique within the class file.
- `id` follows snake_case convention.
- Sensible type+activation combos (warn on `perk` + `activation: cast`, etc.).

**C. `STAT_EFFECT_ATOM`.**
- If `stat` present, must be in `STAT_META`.
- If `phase` present, must be in `EFFECT_PHASES`.
- If `target` present, must be in `EFFECT_TARGETS`.
- If `tags` present, each tag in the locked atom-tag vocabulary.
- Display-only (no `stat`/`value`/`phase`) requires `tags` for identity.
- `scalesWith.type` ∈ valid values (currently `hp_missing`); fields per type variant.
- `abilityType` (if present) ∈ valid ability types.
- Stacking: `maxStacks` XOR `resource` (not both).
- `resource` references a `classResources` entry that exists.

**D. `DAMAGE_ATOM`.**
- Required: `base`, `scaling`, `damageType`, `target`.
- `damageType` in locked damage-type vocabulary.
- `count` positive integer (default 1).
- `scalesWith.type` ∈ valid values (currently `attribute`); fields per type variant.
- DoT consistency: if `isDot: true`, `tickRate` and `duration` should be present.
- Stacking same as `STAT_EFFECT_ATOM`.

**E. `HEAL_ATOM`, `SHIELD_ATOM`.** Standard field checks.

**F. Condition recursion.**
- `condition.type` ∈ `CONDITION_VARIANTS`.
- For each variant, required fields present (e.g., `ability_selected` requires `abilityId`).
- `all`/`any`/`not` recurse with the same checks.
- `ability_selected.abilityId` resolves to a real ability (in this class's data, or — if cross-class refs allowed — anywhere).
- `effect_active.effectId` resolves.
- `weapon_type.weaponType` in `WEAPON_TYPES`.
- `player_state.state` in `PLAYER_STATES`.

**G. `GRANT_ATOM` / `REMOVE_ATOM`.**
- `type` ∈ {`ability`, `weapon`, `armor`}.
- For `type: "ability"`, `abilityId` resolves.
- For `type: "weapon"`, `weaponType` in valid set.
- For `type: "armor"`, `armorType` in valid set.
- `costSource` (grants only) ∈ {`granted`, `granter`}.
- `removes[].tags` filter values in atom-tag vocabulary.

**H. Cost.**
- `type` ∈ {`charges`, `health`, `cooldown`, `percentMaxHealth`, `none`}.
- `value` numeric, ≥ 0.

**I. Memory cost.**
- `type: "spell"` abilities: `memoryCost` present and ≥ 0.
- `type: "transformation"`, `type: "music"`: `memoryCost` per their pool rules.

**J. Class resources.**
- Each entry has `maxStacks`, `desc`.
- Optional `condition` recursively validated.

**K. Reserved/deprecated field check.** Forbid: `passives`, `form`, `summon`, `requires`, `hpScaling`, `triggers`, `appliesStatus`, `cc`, `stateChange`, `stacking`, `performanceTiers`, `abilityModifiers`, `slots`, `grantsSpells`, `grantsSkills`, `grantsWeapon`, `grantsArmor`, `removesArmor`, `disables`, `altSkills`, `spellCost` (at class root), `mergedSpells.requires`. These all migrated to other shapes; their presence indicates incomplete migration.

**L. Cross-class id collisions.** Ability ids should be unique across all classes (avoid `lesser_heal` in two classes with different mechanics).

**Error reporting.**
- Each error: class id + ability id + field path + reason.
- Example: `"warlock.spells[3] (id: bolt_of_darkness): atom effects[0].stat 'spellChargeMultiplier' is not in STAT_META — was it renamed?"`
- Group errors by file for digestibility.

**Watch for.**
- Validator must read from canonical sources: `STAT_META` from `stat-meta.js`, `EFFECT_PHASES` from `constants.js`, `CONDITION_TYPES` from `constants.js`. Do not duplicate the lists. When those source files update, the validator picks up automatically.
- Add tests for the validator itself — feed it valid + invalid sample data, ensure it accepts/rejects correctly. Otherwise the validator silently rotting is a real risk.
- Forbidden-field list (item K) is critical — it's what catches incomplete migrations during the rewrite.
- Atom-tag vocabulary needs to move from a comment in `class-shape.js` into a canonical constants module so the validator can reference it. Micro-refactor during this phase.

**Success criteria.** Validator runs against current v3 class data and produces a report of every shape mismatch. (We expect many — the v3 data uses old patterns. The validator output IS the migration to-do list for each class.)

---

## Phase 2 — Migrate Warlock (anchor class)

**Goal.** Author Warlock fully in the new shape against the Phase 1 validator. Warlock becomes the anchor-class reference that grounds the engine architecture doc (Phase 3) and the engine implementation (Phase 6).

**Work.**
- Create `src/data/classes/warlock.new.js` (or branch `warlock.js` carefully). Author from scratch using the new shape, referencing both the old `warlock.js` and `docs/classes/warlock.csv`.
- Each ability gets the standard `ABILITY` shape: `id`, `name`, `type`, `desc`, `activation`, atom containers, `cost`, `memoryCost` (with tier from CSV).
- Blood Pact moves to `skills[]` as the toggle skill we locked.
- Bolt of Darkness, Curse of Pain, Bloodstained Blade, etc. as spells with proper `activation` values (`cast` vs `cast_buff` based on whether they produce caster-side buffs).
- Add per-class `STAT_META` entries as needed (`lifestealOnDamage`, `lifestealOfTargetMaxHp`, etc. from the passives audit).
- Run validator continuously; fix every error.

**Watch for.**
- Don't delete the old `warlock.js` until end-to-end verification works. It's the reference for verified mechanics.
- Don't invent fields the validator rejects. If you need something the shape doesn't support, that's a shape change (update `class-shape.js` + validator + progress doc together), not a local workaround.
- Cross-check against `damage_formulas.md`, `healing_verification.md`, `unresolved_questions.md` for verified mechanics. Don't lose verified accuracy in translation.
- Tag values must come from locked vocabulary. If a passive needs a tag not in the vocabulary, that's a vocabulary update (separate decision, not a quiet add).
- No formal architecture doc exists yet — that's Phase 3, intentionally. Migration proceeds against `class-shape.js` + `class-shape-progress.md` + `class-shape-examples.js`, which already document the semantic rules (`effect_active` dispatch, memory-budget, `scalesWith` polymorphism, etc.).

**Success criteria.**
- Warlock data passes validator with zero errors.
- Every ability in the CSV has a corresponding entry.
- Verified mechanics (Darkness Shard semantics, Blood Pact form, etc.) are preserved.
- `STAT_META` has entries for every stat referenced by Warlock data.

---

## Phase 3 — Create `engine_architecture.md` and `vocabulary.md` (no code)

**Goal.** Create the engine's public contract. Because Warlock is already migrated (Phase 2), every pattern described in this doc is grounded in real anchor-class data, not synthetic examples. The contract covers the full shape surface — including patterns other classes will exercise in Phase 10 — but Warlock's migrated data is the authoring anchor: if a section can't be clarified by pointing at a concrete Warlock case, that section deserves a second pass.

**Work (non-exhaustive).**
- Specify the full Stage 0–6 pipeline: inputs, outputs, invariants, pure-vs-impure boundaries. Align with the checkpoint spec produced in Phase 0.
- Ensure `STAT_EFFECT_ATOM` and `DAMAGE_ATOM` contracts reflect `tags`, polymorphic `scalesWith` (via `type`), `count`, `abilityType` discriminator, etc. — grounded in Warlock atoms wherever possible.
- Document the availability resolver (Stage 0 produces `availableAbilityIds` from `selectedX` + `grants[]` − `removes[]` + ability-level condition checks).
- Document the memory-budget validator (sequential consumption of `memorySlots` against ordered selections; locked/active distinction).
- Document mutual-exclusion enforcement for Druid forms (only one in `activeBuffs`) even though Warlock doesn't exercise it — the engine must support it for Phase 10. Mark patterns that Warlock doesn't exercise so the Phase 4 verification knows they're forward-specified.
- Document the condition dispatcher (`CONDITION_VARIANTS`), including the `effect_active` dispatch rule based on `activation`.
- Document that `duration` is "Not engine-gating" structurally — the rule from `class-shape.js` carries through.
- Create `vocabulary.md` for the locked atom-tag vocabulary, condition variants, ability types, damage types, effect phases, effect targets.

**Watch for.**
- Drift between this doc and `class-shape-progress.md`. Every locked decision should appear in both — but the architecture doc is the engine-builder's source of truth.
- Don't add open-questions or "TBD" sections to the architecture doc. If something's open, it goes in the progress doc, not the contract.
- Don't over-restrict to Warlock's slice. Patterns locked in `class-shape.js`/`class-shape-progress.md` must be in the doc even if Warlock doesn't exercise them. Warlock is the authoring anchor, not the scope limit.

**Success criteria.** A second reader could implement the engine from this doc alone, without needing to read `class-shape-progress.md`. Every pattern Warlock's migrated data uses is covered. Every locked decision from `class-shape-progress.md` is reflected.

---

## Phase 4 — Architecture doc verification pass

**Goal.** Single-pass verification that the Phase 3 architecture doc covers every pattern Warlock uses. This is a verification checkpoint, not an iteration loop — Phase 3's grounding in real Warlock data removed the churn risk that would have justified a loop.

**Work.**
- Walk through Warlock's authored shape; for each pattern it uses, find it in the architecture doc.
- For each gap (mechanic Warlock uses but the doc doesn't describe how to evaluate): update the doc.
- If a gap turns out to be a data authoring error (not a doc gap), fix the data and re-run validator.
- Cross-check `vocabulary.md` against every atom tag / condition variant / enum value Warlock references.

**Watch for.**
- If significant gaps emerge, that's a signal Phase 3 wasn't thorough enough — the right response is to re-run Phase 3 work end-to-end, not to patch ad hoc.
- Resist scope creep into refactoring things that work. The goal is coverage verification, not polish.

**Success criteria.** Every pattern Warlock data uses is documented in the architecture doc. Validator stays green. No TBDs introduced.

---

## Phase 5 — Engine implementation plan

**Goal.** Decompose the engine into modules with clear contracts and test boundaries.

**Work.** Define each module with: name, inputs, outputs, dependencies, test approach, performance budget share.

**Modules expected (based on architecture doc).**
- **Stage 0 — `buildContext.js`** — turns user input + selected build into `ctx`. Includes derived weapon-state computation, availability resolver (`selectedX` + `grants[]` − `removes[]` + `condition`), memory-budget validator (sequential consumption marking spells active/locked).
- **Stage 1 — `collectAtoms.js`** — walks every active ability's atom containers, populates each atom's `source` field, returns flat atom lists per category (`effects`/`damage`/`heal`/`shield`).
- **Stage 2 — `filterByConditions.js`** — applies condition evaluator to each atom; drops atoms with false conditions.
- **Stage 2.5 — `conditions.js`** (condition evaluator) — dispatch table: `type` → `evaluator(condition, ctx, abilityShape)` → boolean. Includes `effect_active` dispatch on `activation`.
- **Stage 3 — `materializeStacking.js`** — applies `maxStacks` / `resource` scaling to atom values.
- **Stage 4 — `aggregate.js`** — buckets atoms by phase, sums per stat into `Bonuses` object.
- **Stage 5 — `deriveStats.js`** — runs `DERIVED_STAT_RECIPES` with attrs + bonuses → stat sheet.
- **Stage 6 — `projectDamage.js` / `projectHealing.js`** — per-atom projections through `applyDamage` / `calcHealing`.
- **Public API — `runSnapshot.js`** — orchestrates Stages 0–6, returns `Snapshot` object.

For each module:
- Define exact input/output types.
- Identify pure functions vs ones that read engine constants.
- Note test approach (unit, integration).
- Identify memoization boundaries (can this module's output be cached against its inputs?).

**Watch for.**
- Don't conflate stages. Stage 4 (aggregation) shouldn't filter atoms; that's Stage 2's job. Module boundaries enforced through testing.
- Pure functions wherever possible. The `ctx` is read-only after Stage 0.
- Performance budget split. If full recompute is < 50ms, each stage gets a fraction. Identify the heavy stages early.

**Success criteria.** Module list documented; each module has a clear contract and test plan; stage boundaries identified for memoization.

---

## Phase 6 — Engine implementation

**Goal.** Build the engine modules, TDD-style, against Warlock data.

**Work.**
- Implement modules in dependency order (Stage 0 first, then 1, etc.).
- Write tests alongside each module — unit tests for the module in isolation, then integration tests as stages chain together.
- Preserve existing verified-math tests (`curves.js`, `damage.js`, `recipes.js`) — they stay; the new engine modules call into these.
- Benchmark after each stage lands; track against the < 50ms budget.
- Implement memoization at stage boundaries when measurements show it's needed.

**Watch for.**
- Don't optimize before measuring. Get the engine working first; benchmark; optimize the hot stages.
- Class-agnostic discipline: no `if (className === 'warlock')` branches. If a Warlock mechanic seems to require special handling, that's a sign the shape needs to express it more generally.
- Keep the validator green. If engine work surfaces a shape change, update `class-shape.js` + validator + Warlock data + architecture doc together.

**Success criteria.** All modules implemented, tested, benchmarked. Full snapshot for Warlock fixture under 50ms. All verified-math test points still pass.

---

## Phase 7 — Anchor class wiring + minimal UI

**Goal.** Replace broken `App.jsx` with a minimal Warlock-only UI proving end-to-end flow works.

**Work.**
- Stub-replace `App.jsx`: class selector (just Warlock), perk/skill/spell selectors, basic stat-sheet panel, basic damage panel, basic heal panel.
- Wire to `runSnapshot()` from Phase 6.
- Toggle UI for active buffs; counter UI for `classResources`.
- No styling polish; functionality only.

**Watch for.**
- Don't try to ship full UI yet. Goal is "the engine works end-to-end through React," not "ship-quality interface."
- Components reading new ctx shape may need fresh authoring. Don't try to repair old broken components yet — write new minimal ones.

**Success criteria.** User can: select Warlock, pick perks/skills/spells, toggle Blood Pact, see derived stats update, see damage/heal projections. End-to-end flow works.

---

## Phase 8 — End-to-end verification

**Goal.** Confirm the new engine matches verified game mechanics.

**Work.**
- Run every test point from `damage_formulas.md`, `healing_verification.md` against the new engine via the Phase 7 UI fixture.
- Cross-check Warlock builds against any in-game-tested values the user has.
- Catalog any divergences in `unresolved_questions.md`.

**Watch for.**
- Divergences from verified test points are STOP signals. Per the accuracy-first principle, don't continue to Phase 10 with known math errors.
- Some divergences may indicate verified-test-point staleness (game patched). Investigate before changing the engine.

**Success criteria.** Every verified test point passes through the new engine. No regressions from the old engine for shared mechanics.

---

## Phase 9 — Doc maintenance sweep

**Goal.** Update all knowledge docs to reflect the new state.

**Work.**
- `vocabulary.md` — reflect locked vocabulary changes (atom tags, ability types including `music`, condition variants, etc.).
- `perspective.md` — verify principles still match (no major changes expected).
- `class-shape-progress.md` — consolidate resolved items into a "Locked decisions" section; trim open items list to truly-open work.
- `engine_architecture.md` — final pass after Phase 6 implementation surfaces any final wording issues.
- Add a `docs/migration-status.md` tracking which classes are migrated.

**Watch for.**
- Easy to skip this phase under deadline pressure. Don't. Doc rot starts here.

**Success criteria.** A new contributor could orient themselves from the docs without reading code.

---

## Phase 10 — Migrate remaining 9 classes

**Goal.** Author each class in the new shape, one at a time.

**Work.** Per class:
- Author `<class>.new.js` using the new shape, referencing old `<class>.js` + CSV.
- Run validator; fix errors.
- Add per-class `STAT_META` entries needed.
- Wire into UI (just add to class selector dropdown).
- Verify a few key projections against verified mechanics (where available).
- Once verified, remove old class file.

**Order suggestion.** Prioritize classes with highest mechanic novelty (Druid for forms; Sorcerer for merged spells; Bard for music) so engine extensibility is stress-tested early. Save simpler classes (Fighter, Ranger) for later when patterns are settled.

**Watch for.**
- Each new class may surface engine gaps. Address with engine + shape updates, not class-specific hacks.
- `STAT_META` growth — keep it organized; group entries by domain.
- Validator is your safety net — keep it green throughout.

**Success criteria.** All 10 classes authored in new shape; all pass validator; engine handles all observed mechanics without class-specific code.

---

## Phase 11 — Full UI rebuild

**Goal.** Replace the minimal Phase 7 UI with the full simulator UI.

**Work.**
- Rebuild gear editor, all panels (derived stats, damage, heal, abilities, curve charts).
- Implement target editor (PDR/MDR/headshot DR presets).
- Add `classResource` counters with proper UI.
- Add memory-budget visualization (locked vs active spells).
- Theming + Blood Tithe variant (per memory).
- Mobile responsiveness if applicable.

**Watch for.**
- Rebuild components rather than repairing. Old components were tied to old data shape.
- "UI emerges from data" — the UI should derive what to render from the build's atoms (e.g., `classResource` counter only shows if any selected ability references that resource).

**Success criteria.** Feature parity with the pre-rebuild simulator (or better); theming works; deploys cleanly via the existing GitHub Actions workflow.

---

## Phase 12 — Deferred features + cleanup

**Goal.** Address parked items and remove archived code.

**Work.**
- Incoming-damage panel (deferred per memory).
- Shareable builds (deferred per memory; if/when picked up).
- Remove all archived old engine + class code from the repo.
- Final doc sweep.
- Tag a release.

**Watch for.**
- Don't delete archived code until end of Phase 11. It may still be useful for cross-checking during late-phase work.

**Success criteria.** Repo is clean; only new architecture remains; deferred features either implemented or explicitly tracked elsewhere.

---

## Cross-phase practices

- **Branches.** One feature branch per phase. Merge to `main` only when phase passes its success criteria.
- **Tests gate every merge.** Validator + verified-math tests + module tests must all pass.
- **Doc updates ride with code changes.** Don't merge a code change that invalidates a doc without updating both.
- **Performance regression alarm.** Each phase that touches engine code re-runs the benchmark; if recompute time grows > 10%, investigate before merging.
- **Memory aid.** Update `class-shape-progress.md` and the `MEMORY.md` index as decisions get made or revised.

---

## Risk register

- **Architecture doc gaps surface during implementation.** Mitigation: Phase 3 is grounded in real Warlock data so the risk is pre-reduced; Phase 4 verification catches remaining gaps; rare in-implementation discoveries update the doc + validator + Warlock data together.
- **Verified mechanics are lost in translation.** Mitigation: Phase 8 verification is a hard gate; archived old code stays available throughout.
- **UI rebuild scope creep.** Mitigation: Phase 7 is intentionally minimal; defer all polish to Phase 11.
- **Validator rot.** Mitigation: tests for the validator itself; canonical-source reads (`STAT_META`, constants).
- **Class data divergence between v3 archived and new.** Mitigation: validator's forbidden-field check (item K) prevents accidental old-pattern leakage.
- **Warlock migration (Phase 2) without a formal architecture doc produces inconsistent choices.** Mitigation: `class-shape.js` + `class-shape-progress.md` already document semantic rules (`effect_active` dispatch, memory-budget, `scalesWith` polymorphism). Phase 3 absorbs the migrated patterns back into the formal doc — no duplication risk.
