# Perspective

How to think about this project. Read this first when starting a new session or onboarding. 

---

## What this project is

A **snapshot stat simulator** for Dark and Darker. Takes a character build (class, perks, skills, spells, gear, player states) plus UI toggles and produces derived stats, damage / heal projections, and a list of available abilities.

The user's question is **"what do my stats look like given these settings?"** — not "what happens when I cast this spell?"

Non-goals: real-time combat simulation, DPS / rotation optimization, ability cooldown tracking across time, multiplayer composition.

---

## Core principles

### 1. Snapshot, not real-time
No time passes. No events fire. The user sets toggles; the engine produces a stat sheet. Duration, cooldown, cast time are **display projections** — computed values the snapshot shows in tooltips. They don't gate engine behavior.

### 2. No causation in data
In-game, drinking ale makes you drunk; casting Rush puts you in frenzy; Blood Pact has its own Darkness Shards counter at activation. In the simulator, the user just toggles `drunk` / `frenzy` / sets the darkness shard counter for Blood Pact directly. The data models **surface conditions**, not cause-and-effect chains. In-game causation ("drinking ale produces this") lives in `desc` prose, not in structural fields.

### 3. Atoms are self-contained
Each unit of ability output — a stat contribution, a damage projection, a heal, a shield — carries its own `duration`, `target`, `condition`, and optional `type` grouping. Outer wrappers don't push structure onto atoms. An ability is a thin bag of fully-parameterized atoms plus identity.

### 4. One typed container per output category
Abilities have `effects[]`, `damage[]`, `heal`, `shield`, etc, please see `src/data/classes/class-shape.js` as parallel sibling fields — each holds one kind of thing. `effects[]` is stat-contribution atoms; `damage[]` is damage projections; etc. Not a discriminated-union grab bag.

### 5. Conditions are the gating mechanism
Whether an atom fires is determined by its `condition`. There's no separate event system, no `stateChange` keyword, no cancellation-specific fields. Cancellation is expressed via the `not` compound condition. Everything routes through the condition evaluator.

### 6. UI emerges from data
Which toggles the UI surfaces depends on what the selected build's atoms reference in their conditions. If nothing reads `hiding`, no Hiding toggle appears. If Warlock doesn't have Soul Collector or Spell Predation selected, the `darkness_shards` counter doesn't show. No separate "availability registry" — the data is the registry.

### 7. Data-driven, class-agnostic
Engine code doesn't branch on class, ability, or stat identity. Dispatch is enum-driven or data-driven. Adding content is a data change; engine changes only when a new **mechanic type** appears.

### 8. Accuracy first
Every formula traces to a verified source. **VERIFIED > WIKI-SOURCED > UNRESOLVED**. When in-game numbers don't match predictions, stop and investigate before continuing.

---

## How we work on this project

- **One thing at a time.** Tackle focused questions fully before moving on. Don't solve five things in parallel.
- **Concrete examples over abstract framing.** When a decision is hard, ground it in specific cases from actual class data. The generalization becomes obvious after the examples align.
- **Verify claims against the code.** Don't rely on what a prior agent said or on a plausible-sounding recollection. When in doubt, read the file.
- **Don't invent fields.** If a field isn't in the data, don't pretend it is. If a pattern doesn't exist yet, say so explicitly.
- **Don't write history into the data or docs.** Describe what IS, not what used to be. Focus on the current shape, not the transitions that got us here.
- **Ask, then wait.** When asking the user a yes/no question, that's the end of the turn. Don't run the action in the same turn and treat the question as a formality.
- **Decisions get locked.** Once aligned, update `class-shape.js` / `class-shape-examples.js` / other relevant documents. Don't leave decisions as "we discussed it." Future sessions see the files, not the conversation.

---

## Reference pointers

| File | What it holds                                                                                                                                         |
|---|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `docs/engine_architecture.md` | To be created, defines the technical contracts the engine must facilitate — built from `src/data/classes/class-shape.js`, stage pipeline, public API. |
| `src/data/classes/class-shape.js` | Consolidated class-data schema (class root, ability, atoms, sub-shapes). Authoring reference.                                                         |
| `src/data/classes/class-shape-examples.js` | Concrete examples from actual class data, expressed in the consolidated shape.                                                                        |
| `docs/class-shape-progress.md` | In-flight state of the class-shape consolidation — locked decisions, open items, continuation.                                                        |
| `docs/vocabulary.md` | To be created, defines controlled vocabulary (enum values, tags, conventions, direction semantics, etc) - built from `src/data/classes/class-shape.js`.                                           |
| `docs/unresolved_questions.md` | Open in-game mechanic unknowns with testing protocols.                                                                                                |
| `docs/damage_formulas.md` | Verified damage formulas with test points.                                                                                                            |
| `docs/healing_verification.md` | Verified healing formula with test points.                                                                                                            |
