# Phase 7 — Anchor Class Wiring + Minimal UI — Session Prompt

Paste this into a fresh Claude Code session in the `dnd-stat-simulator` repo.

---

You are beginning **Phase 7 of the Dark and Darker Stat Simulator rebuild**. This is a fresh session — you have no prior conversation context. Everything you need is in the repo. Read, don't assume.

## Project context (30-second orientation)

This project is a **snapshot stat simulator** for Dark and Darker. Not real-time combat. The user sets toggles (class, perks, spells, gear, player states); the engine produces a stat sheet + damage/heal projections + available abilities. No time passes, no events fire. See `docs/perspective.md` for the full mental model.

The project is mid-rebuild:
- The class-data shape (`src/data/classes/class-shape.js`) is **locked**.
- Phases 0–5 landed the performance harness, validator, Warlock migration, architecture doc, and implementation plan.
- **Phase 6 landed the engine** (commit `0e69523`) — 12 modules under `src/engine/`, public entry `runSnapshot`, integration fixtures under `bench/fixtures/warlock-*.fixture.js`.
- **Phase 6.5 closed the Gear + Character shape gap** across five sub-phase commits:
  - `6.5a` (`7ba5734`) — wiki-sourced gear facts
  - `6.5b` (`62c64c3`) — current-state mapping + gap inventory
  - `6.5c.1` (`aabb921`) — `gear-shape.js` + `character-shape.js` + 4 VERIFIED anchor items (Spectral Blade, Frostlight Crystal Sword, Foul Boots, Spiked Gauntlet) + 10 modifier pools + 4 validators (74 tests)
  - `6.5c.2` (`137f2b1`) — `src/engine/normalizeBuild.js` (`CharacterBuild → Build` upstream flattener); `handed → handType` rename; `ctx.gear.onHitEffects[]` consumption in `projectPhysicalHit` (gated on `atom.isWeaponPrimary`)
  - `6.5d` (`f904943`) — accuracy-first lifesteal correction; `computePhysicalPreDR` + `computeMagicalPreMDR` eliminated; lifesteal reads post-DR `hit.body`
- Test status entering Phase 7: **557/575 passing** (10 pre-existing class-shape-validator failures are Phase 10 scope).

You are executing **Phase 7** of the 13-phase rebuild plan: **replace the broken `src/App.jsx` with a minimal Warlock-only UI that proves end-to-end flow works, wiring the new `normalizeBuild` seam from Character + Session + Loadout + Item instances → engine Build → `runSnapshot` → rendered Snapshot**. No styling polish. No features beyond what rebuild-plan.md lists. The engine is the product; Phase 7 proves it moves through React against the post-6.5 data shapes.

This is a **narrow** phase. Phase 11 does the full UI rebuild. Phase 7 proves the wiring.

---

## Mandatory reading order

Read these files before anything else. Do not skim.

1. **`docs/rebuild-plan.md`** — authoritative roadmap. Read **Operating protocol**, **Constraints**, **Phase 6.5** (the five sub-phases shaping Phase 7 input), and **Phase 7**. Note the Watch-for items.
2. `CLAUDE.md` — project-level guidance. Note the accuracy-first doctrine + two-namespace stat model.
3. **`docs/perspective.md`** — mental model. Principle 6 ("UI emerges from data") is especially load-bearing this phase.
4. **`docs/engine_architecture.md`** — engine contract. Focus on §3 pipeline, §4 Snapshot shape, §5 Ctx shape (note `ctx.gear.onHitEffects[]` + `handType` additions from 6.5c.2), §6.1 `target: "either"` routing, §14 afterEffect flow, §15.1 post-floor true-physical + `isWeaponPrimary` gate (6.5c.2), §16.2 post-DR lifesteal rule (6.5d corrected), §18 classResources UI surfacing, §19 hp_below slider, §20 Query API.
5. `docs/engine_implementation_plan.md` — §3.11 `runSnapshot` public API, §3.6 aggregate routing, §11 test layout.
6. `docs/class-shape-progress.md` — locked decisions. The former "Gear-shape open questions" subsection is now fully resolved by Phase 6.5.
7. `docs/vocabulary.md` — controlled-vocabulary glossary.
8. `docs/damage_formulas.md` — damage math; note test points around BoD / Spectral Blade (Phase 7 smoke target, not Phase 8 gate).
9. `docs/healing_verification.md` — heal math (corrected by Phase 6.5d; note `§Lifesteal` and new `§Verification Data — Life Drain Lifesteal (2026-04-17)`).
10. `docs/unresolved_questions.md` — note the rewritten "RESOLVED: Life Drain Heal Basis = Post-DR Damage Dealt" entry.
11. `docs/season8_constants.md` — global caps, Training Dummy DR values.
12. **`docs/session-prompts/gear-shape-design.md`** — Phase 6.5 requirements doc. §3 locked decisions L1–L14, §4 authoritative metadata, §6 OQ-D resolutions (now all shipped).
13. `docs/gear-wiki-facts.md` — wiki-sourced gear mechanics (Phase 6.5a).
14. `docs/gear-character-mapping.md` — Phase 6.5b current-state map + gap inventory. §3.10 and §3.11 speak to the normalizer + Character shape your UI consumes.
15. `src/data/stat-meta.js` — STAT_META (extended by 6.5c.1 with `comboMultiplier`, `impactZone`, `swingTiming`). See LOCK G.
16. `src/data/constants.js` — vocabularies (EFFECT_PHASES, CONDITION_TYPES, ACTIVATIONS, WEAPON_TYPES incl. new `magicStuff`, RARITY_CONFIG, SLOT_TYPES, ITEM_SLOT_KEYS, HAND_TYPES).
17. **`src/data/classes/warlock.new.js`** — the anchor class. Phase 7 fixture binds to this file's ability ids + perks/skills/spells.
18. `src/data/classes/class-shape.js` — locked schema.
19. **`src/data/gear/gear-shape.js`** — Phase 6.5c.1 Gear shape. `GEAR_SHAPE`, `GEAR_ITEM_DEFINITION`, `GEAR_ITEM_INSTANCE`, `INHERENT_STAT_ATOM`, `ON_HIT_EFFECT_ATOM`, `MATERIALIZATION_ORDER` spec.
20. `src/data/gear/gear-shape-examples.js` — the 4 VERIFIED anchor items (Spectral Blade, Frostlight Crystal Sword, Foul Boots, Spiked Gauntlet) + 4 instance examples. Phase 7 fixture builds from these.
21. `src/data/gear/modifier-pools.js` — 10 per-slot pools + `MODIFIER_POOL_STAT_ALIASES` + `resolvePoolKey` dispatch.
22. `src/data/gear/exclusion-groups.js` — `ar_pdr` exclusion group + `NEVER_SOCKETABLE_STATS`.
23. **`src/data/character/character-shape.js`** — Phase 6.5c.1 Character shape. `CHARACTER_SHAPE` (persistent: identity + attributes + persistentSelections), `SESSION_SHAPE` (live: buffs + counters + stacks + tiers + target + hpFraction + applyToSelf/Enemy + viewingAfterEffect + weaponHeldState), `CHARACTER_BUILD` (composition contract).
24. `src/data/character/character-shape-examples.js` — Warlock exemplar (`warlockCharacter`, `warlockLoadout`, `warlockBuild`). Phase 7's starting fixture.
25. `src/data/gear/gear-definition-validator.js` + `src/data/gear/gear-instance-validator.js` + `src/data/character/character-shape-validator.js` + `src/data/character/character-gear-validator.js` — four validators. Phase 7 UI runs these at the React-state boundary so bad states surface immediately.
26. **`src/engine/normalizeBuild.js`** — THE UI → engine seam. Signature: `normalizeBuild({ character, session, loadout, itemInstances, itemDefinitions, classData }) → Build`. Phase 7's `useMemo` wraps `runSnapshot(normalizeBuild(...))`. Read the full module.
27. **`src/engine/runSnapshot.js`** — Phase 7 calls this. Signature, Snapshot return shape, Query API companions.
28. `src/engine/buildContext.js` — the `Build` input shape `normalizeBuild` produces. Confirms the contract.
29. `src/engine/aggregate.js` — `ctx.gear.bonuses` / `ctx.applyToSelf` / `ctx.applyToEnemy` / `ctx.capOverrides` consumption; confirms the bonuses the normalizer must surface.
30. `src/engine/projectDamage.js` — §15.1 + `sumGearOnHitTruePhysical`. Note `atom.isWeaponPrimary` gate (no current pipeline stage populates it; see Phase-specific nuance §6).
31. `bench/fixtures/max-loadout.fixture.js` — flat-Build engine-input shape (pre-normalizer target). Phase 7's golden-diff test (per 6.5c.2 Follow-up) asserts `normalizeBuild` output against this shape when possible.
32. `bench/fixtures/warlock-*.fixture.js` — flat-Build Warlock fixtures. Reference for the post-normalizer engine contract.
33. `src/engine/normalizeBuild-e2e.test.js` — the 5 E2E smoke tests from 6.5c.2. Read to understand the Character → normalize → runSnapshot pipeline the UI mirrors.
34. `src/engine/lifesteal-verified.test.js` — the Phase 6.5d VERIFIED fixture (Life Drain math after lifesteal correction).
35. **Pre-existing `src/App.jsx` + `src/components/` + `src/main.jsx` + `src/index.css` + `src/data/example-builds.js` + `src/data/gear-defaults.js`** — stale pre-rebuild code. Inventory for shape hints; per LOCK C Phase 7 rebuilds not repairs; per LOCK L Phase 7 **retires** the `gear-defaults.js → example-builds.js → App.jsx` chain (deferred from 6.5c.1 per its Deviation #1).
36. `vite.config.js`, `index.html`, `package.json` — confirm dev server + build still run; do not change these without sign-off.
37. **Commits to read** (messages + diffs):
    - `f904943` — Phase 6.5d (lifesteal correction)
    - `137f2b1` — Phase 6.5c.2 (normalizer + engine seams)
    - `aabb921` — Phase 6.5c.1 (shape + validators)
    - `62c64c3` — Phase 6.5b (mapping + gap analysis)
    - `7ba5734` — Phase 6.5a (gear wiki facts)
    - `0e69523` — Phase 6 engine baseline
    - `f8431ad` — Phase 2 Warlock migration

**Use the `Explore` sub-agent** for cross-cutting reads (e.g., "every export from `src/engine/*.js` that Phase 7 UI code will import"; "every ability in `warlock.new.js` with a `classResource`, `hp_below`, `afterEffect`, or `target: \"either\"` atom — these drive the UI-surfacing contract"). Each is parallelizable.

---

## Your mission — Phase 7 in one sentence

Author a new `src/App.jsx` + supporting components that hold React state as **Character + Session + Loadout + ItemInstances + ItemDefinitions** (Phase 6.5 shapes), wire that state through `normalizeBuild` → `runSnapshot`, and render a minimal stat/damage/heal/shield UI where the user can swap the held weapon loadout, toggle buffs, set classResource counters, and see the snapshot update — with UI surfaces that emerge from data per the engine architecture's locked rules. Retire the stale `gear-defaults.js → example-builds.js → App.jsx` chain as part of the wire-up.

See `docs/rebuild-plan.md § Phase 7` for the authoritative Goal / Work / Watch for / Success criteria.

---

## The three-priority hierarchy (governs every tradeoff)

1. **Performance first.** Snapshot recompute < 50ms (already proven in Phase 6). Phase 7 must not regress — one `runSnapshot` call per user interaction, no redundant re-computation in render loops. Memoize the snapshot against Build identity at the React boundary.
2. **Class-agnostic, second.** No engine-code branches on class, ability, or stat identity. **This applies to UI code too.** Even though Phase 7 exposes only Warlock, component code must not read `className === "warlock"` or hardcode ability ids. When Phase 10 adds classes, the UI should Just Work as a data change.
3. **Engine-mechanic extension ease, third.** New mechanic types extend dispatch tables; they do not rewrite pipelines. UI-side: new condition variants, new atom kinds, new `scalesWith` types should not trigger UI rewrites.

When priorities conflict, top of list wins.

**Plus the accuracy-first doctrine:** Spiked Gauntlet's `+1 true_physical` onHit routing is **wired in Phase 6.5c.2** (`projectDamage.js:sumGearOnHitTruePhysical` inside `projectPhysicalHit`), but the rider is **gated on `atom.isWeaponPrimary === true`** and **no pipeline stage populates that flag today** — weapon-primary-atom synthesis is Phase 11+ work. Consequence for Phase 7: the rider remains dormant in practice, so Spectral Blade body/head projections (if any — see nuance §6) fire *without* the +1. The Phase 7 damage-projection acceptance surface is primarily the **ability-authored damage atoms** (Blow of Corruption, Bolt of Darkness, Shadow Touch, etc.) that actually project today. **Matching verified values to the point is Phase 8's job**, not Phase 7's — Phase 7 proves flow, Phase 8 verifies math.

---

## Operating protocol — NON-NEGOTIABLE

You execute Phase 7 in five stages. **STOP GATES are hard** — do not cross them without explicit sign-off from the user.

### Stage 1 — Context Gather → Terse Map

Read the files above. Use `Explore` sub-agents for:
- **Engine surface the UI will consume.** Walk `src/engine/runSnapshot.js`, note its signature + Snapshot return shape + Query API exports. Walk the other engine modules only to confirm what `ctx` fields the Build must carry (via `buildContext.js`).
- **Warlock UI-surfacing inventory.** For every ability in `warlock.new.js`, identify: its `activation` (drives active-buffs UI), whether any of its atoms reference `classResources` / `hp_below` / `afterEffect` / `target: "either"`. The result is the "UI surfaces that must render" list. Per perspective.md principle 6, this is a data-derived list, not a hardcoded one.
- **Stale-code inventory.** Walk `src/App.jsx`, `src/components/`, `src/main.jsx`, `src/index.css`. For each file: note its purpose in the pre-rebuild codebase, whether any part is reusable in Phase 7, and whether it references engine APIs that no longer exist (expected — these files predate Phase 6). Per LOCK C, Phase 7 rebuilds from scratch; this inventory is a what-to-delete / what-to-rewrite list.
- **Build shape confirmation.** Walk `bench/fixtures/max-loadout.fixture.js` + each `bench/fixtures/warlock-*.fixture.js`. Extract the `Build` object shape (keys, nesting, value types). Phase 7's anchor fixture must match this shape.

Produce a written **Terse Map** covering:
- `runSnapshot` signature + Snapshot shape + Query API (as a compact reference).
- Warlock ability → UI-surface requirement matrix (ability id → `{ activation, hasClassResource, hasHpBelow, hasAfterEffect, hasEitherTarget }`).
- Stale-code disposition (per file: delete / rewrite / reference-only).
- Build shape extracted from fixtures.
- Anchor fixture draft — the Blood Tithe Build object (see "Phase-specific nuances" §4 for the raw data to encode).
- Gaps / open implementation questions (very few expected; the spec is detailed).

### Stage 2 — Plan

Produce a detailed execution plan covering:

**File creation / modification map.** Propose the concrete file set. A reasonable starting shape (may vary with judgment):
- `src/fixtures/warlock-blood-tithe.fixture.js` — the anchor `Build` object (or wherever is the cleanest home; Phase 7 fixtures are user-facing, not benchmark fixtures).
- `src/App.jsx` — rewrite.
- `src/components/<Panel>.jsx` files — propose the component list. Minimum candidates: `ClassSelector`, `AbilitySelectors` (perk/skill/spell, multi-select with memory-budget), `WeaponSwap`, `TargetEditor` (pdr/mdr/hsDR), `ActiveBuffsToggles`, `ClassResourceCounters`, `HpFractionSlider`, `EitherTargetToggles`, `ViewingAfterEffectToggles`, `StatSheetPanel`, `DamagePanel`, `HealPanel`, `ShieldPanel`. Exact split is a judgment call; propose and justify.
- `src/index.css` — rewrite for plain-CSS minimal layout. No design system, no CSS-in-JS library adoption. Goal: readable, not pretty.
- `src/main.jsx` — confirm or rewrite. Mount `App`, no routing.
- **Possibly delete** `src/App.css`, any pre-rebuild component files that have no analogue. List explicitly in the plan; sign-off before deleting.

**Data-derived UI surface rules** — per perspective.md principle 6, the plan must specify how each conditional UI element is surfaced:
- `ClassResourceCounters` renders a counter for resource R iff (a) R's own `condition` evaluates true (via Query API or ctx), AND (b) any atom in any available ability references `resource: R`.
- `HpFractionSlider` renders iff any available ability's atom tree contains an `hp_below` condition at any depth.
- `ViewingAfterEffectToggles` renders a checkbox for ability A iff A has a non-trivial `afterEffect`.
- `EitherTargetToggles` renders a pair of toggles (applyToSelf / applyToEnemy) for ability A iff A has any atom with `target: "either"`.
- `ActiveBuffsToggles` renders a toggle for ability A iff A is selected AND `activation ∈ { "cast_buff", "toggle" }`.

**Acceptance check plan.** Given the anchor fixture + `activeBuffs = ["power_of_sacrifice", "bloodstained_blade"]` + Spectral Blade equipped + Training Dummy target (pdr -22, mdr 6, hsDR 0): the Damage panel should show a Spectral Blade primary projection with body ≈ 84 and head ≈ 130 (accounting for the Spiked Gauntlet parking; see LOCK H). Define the check as a human-eyeball inspection in the dev server, plus (if feasible without scope creep) a minimal React Testing Library or Vitest assertion that imports the fixture + calls runSnapshot + asserts the numbers. Prefer the render-test path if it's a small add; prefer eyeball-only if rendering tests require pulling in a testing lib that isn't already in the repo.

**Execution sequence** — propose your own ordering with rationale. A reasonable default:
```
Step 0  — Inventory the stale code; stage a delete/rewrite proposal for sign-off.
Step 1  — Author the Blood Tithe anchor Build fixture.
Step 2  — Rewrite src/App.jsx as a thin shell wiring fixture → runSnapshot → children.
Step 3  — StatSheetPanel (consumes derivedStats); smoke check: attrs + HP render.
Step 4  — DamagePanel (consumes damageProjections); acceptance check lands here.
Step 5  — HealPanel (consumes healProjections + derived heals).
Step 6  — ShieldPanel (consumes shieldProjections).
Step 7  — AbilitySelectors + WeaponSwap + ActiveBuffsToggles (now the build is editable).
Step 8  — ClassResourceCounters + HpFractionSlider + EitherTargetToggles +
          ViewingAfterEffectToggles (data-surfaced).
Step 9  — TargetEditor (pdr/mdr/hsDR).
Step 10 — Styling pass (plain CSS; readable layout; no polish).
Step 11 — Dev server smoke test: walk through the success-criteria flow, confirm no console errors, capture the acceptance numbers.
```

**Plan must also cover:**
- React version + patterns. `package.json` shows React 19; use modern hooks (`useState`, `useMemo`, `useCallback`). No class components. No context-provider sprawl — one top-level `buildState` kept in `App.jsx` with single-source-of-truth flow is sufficient for Phase 7's scope.
- Memoization at the React boundary. `useMemo(() => runSnapshot(build), [build])` — the snapshot recomputes only when `build` changes. Do not call `runSnapshot` inside child render paths.
- Fail-loud on engine errors. If `runSnapshot` throws, let it bubble — don't swallow with try/catch in Phase 7. Errors indicate real bugs (engine or fixture); surfacing them is the point.
- Mapping to Phase 7 success criteria, item by item.
- Decisions requiring user sign-off (numbered list — should be few).
- Risks and open questions.

### Stage 3 — STOP — Plan Report

Emit the **Plan Report** in exactly this format:

```markdown
# Phase 7 — Plan Report

## Terse map
[bullets / tables from Stage 1: engine surface reference, Warlock UI-surface matrix, stale-code disposition, Build shape, anchor fixture draft]

## Execution plan
[detailed plan from Stage 2: file map, data-derived UI rules, acceptance check plan, step sequence]

## Decisions requiring user sign-off
[numbered list]

## Success-criteria coverage
| Criterion (from rebuild-plan.md § Phase 7) | Plan addresses it via |
|---|---|
| User can select Warlock | ... |
| User can pick perks/skills/spells | ... |
| User can toggle Blood Pact (and other active buffs) | ... |
| User sees derived stats update | ... |
| User sees damage projections | ... |
| User sees heal projections | ... |
| End-to-end engine flow works through React | ... |

## Risks
[bullets]

## Open questions
[bullets — should be near-zero]
```

**WAIT for explicit user sign-off.** Revise and re-emit if feedback comes back. Do not proceed to Stage 4 without explicit "approved."

### Stage 4 — Execute

Once signed off, execute the plan. Maintain a working progress document at `docs/session-prompts/phase-7-progress.md` for crash resilience (simple step-level checklist; timestamps on start/complete).

**Inner-loop discipline (per step):**
1. Implement the step.
2. Start / restart the dev server (`npm run dev`); load the page; confirm no console errors and the step's feature renders.
3. Run `npm test` — confirm all existing tests stay green (Phase 6's 18 verified-source assertions + the validator + all module unit tests).
4. Update `phase-7-progress.md`.
5. Move to the next step.

**Discipline:**
- Stay strictly inside the signed-off plan.
- **Rebuild, don't repair** (LOCK C). Pre-rebuild components are stale; don't spend time making them work against the new engine.
- **Class-agnostic discipline absolute** (LOCK J) — no `if (className === ...)` branches in UI code. Data-driven rendering.
- **No shape changes, no engine changes** without sign-off (LOCK E, LOCK F).
- **Fixture corrections only**: per LOCK G, rename `physicalDamageReduction` → `physicalDamageReductionBonus` and `magicalDamageReduction` → `magicalDamageReductionBonus` in the fixture (these are canonical STAT_META keys). Per LOCK H, drop Spiked Gauntlet's `onHit: +1 true_physical` from the fixture with a parenthetical comment (ref `class-shape-progress.md § Gear-shape open questions § 1`).
- **Minimal UI only** (LOCK D). No theming. No mobile. No shareable builds. No incoming-damage panel. No ability-detail tooltips. No gear editor. Those are later phases.
- **Dev server is the primary test surface.** Phase 7 ships by running `npm run dev`, clicking through the flow, and confirming the acceptance numbers render.

### Stage 5 — STOP — Completion Report

Emit the **Completion Report** in exactly this format:

```markdown
# Phase 7 — Completion Report

## Files created / modified / deleted
[paths + one-line purpose each]

## What was built
[summary tied to the plan]

## Component inventory
| Component | Path | What it consumes from Snapshot | What it renders |
|---|---|---|---|

## Anchor fixture
[path + key contents summary (class, selections, gear variants, activeBuffs, classResources state, target profile)]

## Acceptance check outcome
| Measurement | Expected | Observed | Notes |
|---|---|---|---|
| Spectral Blade primary body | 84 | ... | Phase 7 target; Phase 8 verifies vs 85 in-game anchor |
| Spectral Blade primary head | 130 | ... | Phase 7 target; Phase 8 verifies vs 131 in-game anchor |
| Snapshot recompute (rough perf sanity) | < 50ms | ... | Phase 6 already proved this; Phase 7 should not regress |

## UI-surfacing rule outcomes
| Surface | Rule | Warlock case verified |
|---|---|---|
| ClassResourceCounter (darkness_shards) | condition true + atom references resource | ... |
| ClassResourceCounter (blood_pact_locked_shards) | condition true + atom references resource | ... |
| HpFractionSlider | any atom references hp_below | ... (Immortal Lament) |
| ViewingAfterEffectToggle | ability has non-trivial afterEffect | ... (Eldritch Shield) |
| EitherTargetToggles | ability has target: "either" atom | ... (Power of Sacrifice) |
| ActiveBuffsToggle | selected + activation cast_buff/toggle | ... |

## Test status
[existing tests all green; any new tests added; any deliberately-skipped tests noted]

## Dev server flow verification
[step-by-step confirmation that the success-criteria flow works: select Warlock → pick perks/skills/spells → toggle Blood Pact → see stats/damage/heal update → swap weapon → ... ]

## Console errors observed
[none, or list + disposition]

## Deviations from plan
[what changed and why — or "none"]

## Success-criteria status
| Criterion | Status | Evidence |
|---|---|---|

## Findings (for later phases)
[Phase 8 verification candidates; Phase 11 UI-rebuild notes; gear-shape concerns surfaced]

## Follow-ups (non-blocking)
[anything noticed out of scope]
```

**WAIT for explicit user sign-off.** Revise per feedback. Do not declare Phase 7 complete without explicit sign-off.

---

## Locked from coordinator (binding for Phase 7)

These are settled — do not re-litigate.

### LOCK A — Warlock-only scope
The class selector exposes only Warlock. Other class files (`barbarian.js`, `bard.js`, `cleric.js`, `druid.js`, `fighter.js`, `ranger.js`, `rogue.js`, `sorcerer.js`, `wizard.js`, legacy `warlock.js`) are untouched in Phase 7. They're Phase 10 work.

### LOCK B — Anchor fixture is the acceptance test
The Blood Tithe build (see "Phase-specific nuances" §4 for the raw data, restructured as Character + Session + Loadout + ItemInstances + ItemDefinitions per 6.5c.1 shape) is the fixture. The success condition is that this build, authored in React state → `normalizeBuild` → `runSnapshot` → rendered, produces:

1. **Ability-damage projections** (Blow of Corruption, Bolt of Darkness, Shadow Touch) against the Training Dummy target profile that match the Phase 6 engine's current output (the same numbers passing in `projectDamage.test.js` today — no regression through the normalizer seam). **This is the primary Phase 7 acceptance gate.**
2. **Derived-stat panel** showing HP, PDR, MDR, MPB, PPB, etc. with the expected magnitudes (PDR/MDR near cap from the anchor armor; MPB ~23% from Warlock WIL curve + gear).
3. **Data-derived UI surfaces** rendering correctly per the rules in nuance §1 (classResources counters, hp_below slider, viewingAfterEffect checkboxes, target:"either" toggles, activeBuffs toggles).
4. **Lifesteal projection** (Life Drain) reading post-DR damage per Phase 6.5d correction — `src/engine/lifesteal-verified.test.js` is the math reference.
5. **Spiked Gauntlet rider** does NOT fire against current ability damage atoms (rider is `isWeaponPrimary`-gated; no atom carries the flag today). Confirm via UI damage panel that no ability-damage includes a spurious +1.

Divergence from the pass-through engine output is a Phase 6 regression finding, not a Phase 7 acceptance failure.

### LOCK C — Rebuild, don't repair
Pre-existing `src/App.jsx` and `src/components/` are stale pre-rebuild code. **Do not try to make them work with the new engine.** Write new minimal components. Old components can be referenced as hints for what panels existed, but assume zero line reuse.

### LOCK D — Minimal UI only
No theming, no polish, no mobile responsive layouts, no shareable-build URL encoding, no incoming-damage panel, no ability-detail tooltips, no gear editor UI. Those are later phases (mostly Phase 11, some Phase 12). Plain CSS. Plain layout. Phase 7 proves functionality only.

### LOCK E — No shape changes
If UI wiring surfaces a need to add fields to `class-shape.js` / Warlock data / STAT_META / constants.js beyond what already exists, **STOP and surface**. Do not unilaterally update.

### LOCK F — No engine modifications
`src/engine/*` is sealed by Phase 6 (with the exception of genuine bugs — which are STOP-and-surface events, not fix-in-phase events). The public API is `runSnapshot` and the Query API companions. If the UI surfaces an engine gap, surface as sign-off.

### LOCK G — STAT_META + alias map are complete for Phase 7
Phase 6.5c.1 extended `src/data/stat-meta.js` with three inherent-only weapon-property entries (`comboMultiplier`, `impactZone`, `swingTiming` — `cat: "weapon"`, no `gearStat` flag). Phase 6.5c.2 preserved engine-canonical names (`physicalDamageReductionBonus`, `magicalDamageReductionBonus` — the `Bonus` suffix is the canonical key). Phase 7 uses:
- **Item definitions** author the §4.3 registry's bare-name forms (e.g., `physicalDamageReduction`, `magicalDamageReduction`) inside `inherentStats[]` + `modifiers[]`.
- **`normalizeBuild`** resolves these through `MODIFIER_POOL_STAT_ALIASES` (`src/data/gear/modifier-pools.js`) to the engine-canonical `…Bonus` forms when flattening into `gear.bonuses`.
- **Validators** (definition + instance) enforce pool membership and alias resolution at authoring time.

Net: Phase 7 authors in §4.3 bare-name form at the data layer; the normalizer handles the translation. No engine rename, no fixture-side manual aliasing.

### LOCK H — Spiked Gauntlet onHit is WIRED, not parked
The former "parking" of Spiked Gauntlet's `+1 true_physical` onHit is **resolved**. Phase 6.5c.1 authored `ON_HIT_EFFECT_ATOM` shape + Spiked Gauntlet instance with that effect; Phase 6.5c.2 wired consumption in `projectDamage.js:sumGearOnHitTruePhysical` inside `projectPhysicalHit`. The rider is gated on `atom.isWeaponPrimary === true`.

**No pipeline stage populates `isWeaponPrimary` today.** Weapon-primary-atom synthesis (emitting a damage atom for the held weapon's primary hit) is **Phase 11+ work**. Until then, the rider is dormant — it exists, tests pass against it, but no current ability-damage projection picks it up.

**Phase 7 implication:** author the Spiked Gauntlet item instance in the Loadout using the real `ON_HIT_EFFECT_ATOM` shape (per `gear-shape-examples.js`). The rider will flow through `normalizeBuild` into `ctx.gear.onHitEffects[]` correctly. It will simply not contribute to any damage projection, because nothing sets `isWeaponPrimary`. Do NOT attempt weapon-primary-atom synthesis in Phase 7 — that's Phase 11 scope. Document in the Completion Report that Phase 7 verified the `ctx.gear.onHitEffects[]` surfaces the rider but no projection currently reads it.

### LOCK L — Retire the stale gear-defaults / example-builds / legacy-App chain
Phase 6.5c.1 left these files in place because `App.jsx` imports them transitively (`App.jsx` → `example-builds.js` → `gear-defaults.js::makeEmptyGear`). Phase 7 retires all three:

- Delete `src/data/gear-defaults.js` (including `makeEmptyGear`).
- Delete `src/data/example-builds.js`.
- Rewrite `src/App.jsx` from scratch (per LOCK C); retire all imports of the above.

The post-Phase-7 state model is: React state holds Character + Session + Loadout + ItemInstances + ItemDefinitions per `src/data/character/character-shape-examples.js` pattern. Default state constructor lives wherever makes sense in the new tree (propose in the plan).

### LOCK I — Phase 7 is flow, Phase 8 is verification
Phase 7's acceptance is "end-to-end wiring works; numbers are in the right ballpark." Phase 8 is the formal verification gate against all test points in `damage_formulas.md` / `healing_verification.md` / `season8_constants.md`. If Phase 7 surfaces a divergence > 2 points from the 84/130 target, **surface it as a Phase 8 concern in the Completion Report; do not derail Phase 7 trying to fix it**. Only stop-and-surface if the number is wildly wrong (> 20 points off) — that's a Phase 6 regression needing investigation.

### LOCK J — Class-agnostic UI code
UI component code must NOT branch on `className`, specific ability ids, specific stat ids (as hardcoded values controlling rendering), specific resource ids, or specific player-state names. Rendering is data-driven: component reads the Snapshot, reads the ctx, reads STAT_META for labels/units, and renders accordingly. When Phase 10 adds classes, the class selector dropdown populates from the class registry and the UI surfaces new abilities/resources/conditions without component-code changes. This rule is non-negotiable — a `switch (className)` in a component is a structural failure and must be refactored in-phase, not "deferred."

### LOCK K — Dev server is the primary acceptance surface
Phase 7 ships when `npm run dev` renders the fixture flow correctly, user can walk through the success criteria, and the acceptance numbers are within target. A minimal render test is a nice-to-have if it's a small add, but not a requirement. The user has the game open and will validate against in-game behavior during Phase 8.

---

## Phase-specific nuances you must surface in the plan

These are tensions, judgment calls, and forward-looking questions that need to be visible in the Plan Report — not buried in implementation.

1. **UI surfaces emerge from data, not from hardcoding.** Per perspective.md principle 6: if no selected ability's atom tree references `hp_below`, the HP slider does not render. If no atom references the `darkness_shards` resource, the counter does not render. Implementation: a small set of helpers that walk `ctx.availableAbilityIds` (or the Query API's atoms-by-ability) and answer "does this build reference hp_below / classResource R / afterEffect on ability A / target: 'either' on ability A?" The helpers live in UI code (not engine) since they're presentation concerns. Propose the helper locations in the plan.

2. **`Build` vs `ctx` in React state.** `Build` is what the user manipulates (selections, toggles, target profile, gear). `ctx` is derived at Stage 0 of `runSnapshot`. React state should hold `Build`; `ctx` and `Snapshot` are memoized derivations. Do not mirror `ctx` into React state — it's a derived value, not a source of truth.

3. **Memory-budget rendering.** `Snapshot.memoryBudget.lockedOut[]` lists spells selected but past the capacity cap. The spell selector should visually mark these (e.g., grayed text or a "(locked)" suffix). The user can still de-select; they just can't be active. Don't build a full budget visualizer in Phase 7; Phase 11 does that polish.

4. **Anchor fixture raw data** — **restructured post-6.5c.1.** The raw gear + selection data below is the pre-Phase-6.5 flat-Build shape. Phase 7 authors it in the new **CharacterBuild** composition (`character` + `session` + `loadout` + `itemInstances` + `itemDefinitions`) per `src/data/character/character-shape-examples.js` pattern. `normalizeBuild` flattens it back into the engine `Build` the runtime consumes. The data values are unchanged; the shape wraps them per §4.4 `GEAR_ITEM_DEFINITION` + §4.5 `GEAR_ITEM_INSTANCE`. Each anchor gear piece (Spectral Blade, Foul Boots, Spiked Gauntlet, etc. — where the 4 §4.4 anchors cover what's available; items not yet in `gear-shape-examples.js` may need brief authoring — surface in Open Questions if stat data doesn't fit the existing pool definitions).

   **Selections:**
   ```
   selectedPerks:  ["demon_armor", "shadow_touch", "dark_reflection"]
   selectedSkills: ["spell_memory_1", "blow_of_corruption"]
   selectedSpells: ["curse_of_weakness", "power_of_sacrifice", "bloodstained_blade", "eldritch_shield", "spell_predation"]
   activeBuffs:    ["power_of_sacrifice", "bloodstained_blade"]
   ```

   **Training Dummy target profile:** `pdr: -0.22, mdr: 0.06, headshotDR: 0, creatureType: null, maxHealth: null`.

   **Weapon variants (Phase 7 UI swaps between these):**

   *Spectral Blade (two-handed, epic):*
   ```
   weaponDamage: 40, moveSpeed: -30, actionSpeed: 0.05,
   headshotDamageBonus: 0.05, armorPenetration: 0.045,
   physicalDamageBonus: 0.025, additionalWeaponDamage: 2
   ```

   *Spellbook (two-handed, epic):*
   ```
   weaponDamage: 22, magicalDamage: 5, moveSpeed: -10,
   magicPenetration: 0.05, memoryCapacityBonus: 0.062,
   additionalMemoryCapacity: 4, buffDurationBonus: 0.06
   ```

   *Unarmed:* empty weapon contribution.

   **Armor + accessories (constant across weapon variants), stat-id → value:**

   *Head (Rubysilver Barbuta Helm):*
   ```
   armorRating: 32, projectileDamageReduction: 0.012,
   headshotDamageReduction: 0.15, magicResistance: 30,
   moveSpeed: -4, dex: 4, physicalDamageReductionBonus: 0.01,
   str: 3, wil: 2, armorPenetration: 0.022
   ```

   *Chest (Dark Plate Armor):*
   ```
   armorRating: 121, projectileDamageReduction: 0.035,
   magicResistance: 41, moveSpeed: -11, vig: 2, agi: 3,
   wil: 3, kno: 3
   ```

   *Back (Spectral Cloak):*
   ```
   armorRating: 19, str: 2, dex: 2, wil: 2,
   magicalDamageReductionBonus: 0.028, actionSpeed: 0.03,
   magicResistance: 24
   ```

   *Hands (Spiked Gauntlet) — `onHit: +1 true_physical` PARKED per LOCK H:*
   ```
   armorRating: 43, projectileDamageReduction: 0.025,
   magicResistance: -5, moveSpeed: -1, dex: 2, vig: 2,
   wil: 3, str: 2, physicalPower: 2
   ```

   *Legs (Dark Padded Hose):*
   ```
   armorRating: 44, magicResistance: 25, moveSpeed: -4,
   vig: 2, dex: 2, wil: 3, str: 3
   ```

   *Feet (Golden Boots):*
   ```
   armorRating: 38, moveSpeed: 5, str: 4, luck: 10,
   magicalDamageReductionBonus: 0.02, dex: 2, wil: 3,
   actionSpeed: 0.017
   ```

   *Ring 1 (Ring of Courage):*
   ```
   str: 3, physicalDamageBonus: 0.032, physicalPower: 4,
   armorPenetration: 0.018
   ```

   *Ring 2 (Ring of Courage):*
   ```
   str: 3, physicalPower: 4, physicalDamageBonus: 0.034,
   armorPenetration: 0.02
   ```

   *Necklace (Necklace of Peace):*
   ```
   maxHealth: 6, magicResistance: 27,
   magicalDamageReductionBonus: 0.029, actionSpeed: 0.039
   ```

   Per LOCK G: the fixture's stat-id keys are exactly the STAT_META canonical keys (note the `Bonus` suffix on PDR/MDR additive contributions). The fixture flattens all armor + accessories + weapon into a single `gear.bonuses: Record<StatId, number>` object at Build time (summing per stat id); three variants exist (spectral_blade, spellbook, unarmed) differing only by which weapon row is included.

5. **`target: "either"` atoms — Power of Sacrifice.** Per arch-doc §6.1 and `src/engine/aggregate.js`, atoms authored with `target: "either"` require `ctx.applyToSelf[abilityId]` and `ctx.applyToEnemy[abilityId]` toggles. Default per aggregate spec: `applyToSelf = true`, `applyToEnemy = false` for a fresh build. Phase 7 UI: for every ability with at least one `target: "either"` atom, render two toggles (applyToSelf / applyToEnemy). The anchor fixture should have PoS's `applyToSelf: true` and `applyToEnemy: false` matching how the in-game buff actually operates in the build context (it buffs the caster's stats). If the engine's default already achieves this, no fixture-side override needed; confirm in Terse Map.

6. **Smoke-check acceptance** (see LOCK B for the full surface). Phase 7 pass conditions, given Warlock anchor build + Spectral Blade equipped (held-state = slot1) + Training Dummy target (`pdr: -0.22, mdr: 0.075, headshotDR: 0`) + `activeBuffs: ["power_of_sacrifice", "bloodstained_blade"]`:

   **Ability-damage projections (primary gate):**
   - Blow of Corruption body: matches the 6.5c.2 passing value (via the Snapshot UI, not re-derived in-phase).
   - Bolt of Darkness body + head: matches.
   - Shadow Touch: shows as 2 flat dark magical, separate floater (per `docs/damage_formulas.md:151`).

   **No weapon-primary projection is expected.** Per LOCK H + `gear-character-mapping.md § 3.10` follow-up: no current pipeline stage synthesizes a "Spectral Blade primary hit" damage atom. The engine today cannot project that hit without one. Phase 7 does NOT attempt to add the synthesis — that's Phase 11+ work.

   If the Terse Map surfaces a weapon-primary projection **accidentally appearing** (e.g., from a fixture side-channel or a Phase-6-era holdover), that's a finding to flag, not a green-light for Phase 7 to depend on.

   **Derived-stat panel values** (order-of-magnitude, not point-exact):
   - HP near 140 (base + gear + VIG curve)
   - PDR near cap (65%) with the plate armor loadout
   - MDR positive (plate + accessory MR)
   - MPB around 23% (Warlock WIL curve + gear MPB)

   Tolerance: the Phase 7 gate is **no regression through the normalizer seam**. If the same Character+Gear input produces different Snapshot output than the equivalent flat-Build through `runSnapshot` directly, that's a normalizer bug — STOP and surface. If the flat-Build and normalizer-Build both produce the same wrong number, that's a Phase 8 concern.

7. **Forward-spec patterns Warlock exercises.** The UI must surface: `classResources` counters (darkness_shards, blood_pact_locked_shards), `hp_below` slider (Immortal Lament), `viewingAfterEffect` checkbox (Eldritch Shield), `target: "either"` toggles (Power of Sacrifice), active-buffs toggle list (any selected cast_buff/toggle ability). Each rule is data-derived per perspective.md principle 6.

8. **React + Vite dev server.** The repo uses Vite + React 19 (`package.json`). `npm run dev` starts the server (bound to the port Vite picks; typically 5173). `npm run build` produces `dist/`. Deployment is via GitHub Actions to GitHub Pages (`.github/workflows/static.yml`) — Phase 7's work must not break this path. Do not change `vite.config.js` or `.github/workflows/*` without sign-off.

9. **What Phase 7 explicitly does NOT do.** Do not: build a gear editor UI; implement theming; ship shareable-build URLs; render an incoming-damage panel; show ability-detail tooltips; add mobile breakpoints; integrate any design system; add a state management library (Redux, Zustand, etc. — React's built-in state is sufficient for Phase 7). These are Phase 11 (or deferred) work.

10. **Progress doc.** Maintain `docs/session-prompts/phase-7-progress.md` during Stage 4. Simple step checklist with started/completed timestamps. Crash resilience requirement.

11. **Golden-diff test for normalizeBuild.** Per Phase 6.5c.2 Follow-up: Phase 7 adds a golden-comparison test that authors the anchor Warlock fixture in Character+Gear form, runs it through `normalizeBuild`, and asserts the produced `Build`'s `gear.bonuses` / `gear.weapon` / `gear.onHitEffects[]` / attribute totals match the equivalent flat Build (either `max-loadout.fixture.js` where coverage overlaps, or a hand-authored flat-shape reference). The 6.5c.2 Deviation #2 downscoped this when only the 4 anchor items existed; Phase 7's richer Warlock anchor closes part of the gap. Propose the test's location + shape in the plan; full 10+ item catalog coverage remains Phase 11. Scope: a handful of golden-diff assertions — not a comprehensive regression matrix.

12. **Four validators run at the React-state boundary.** Per 6.5c.1: `gear-definition-validator`, `gear-instance-validator`, `character-shape-validator`, `character-gear-validator`. Phase 7 UI invokes these on state mutations (or at least on mount + on significant state changes). Invalid states surface as inline errors rather than silent-pass-through. `ctx.validator` dispatch mode (`test` → throw, `dev` → warn, `prod` → debug) per `defineClass`/`defineGear` convention — in Phase 7 dev, warn.

13. **Life Drain heal surface.** Per Phase 6.5d: heal projection for Life Drain reads post-DR `hit.body` × `lifestealRatio: 1.0` × `(1 + HealingMod)`. With Vampirism-class modifiers in the Warlock anchor, verify the heal panel displays reasonable values. If a Life Drain atom appears in the Warlock anchor's selectable spells, surface its heal projection — this is the first end-to-end UI verification of the Phase 6.5d correction. `src/engine/lifesteal-verified.test.js` is the VERIFIED math reference.

---

## Sub-agent guidance

- **Stage 1 (Context Gather).** Spawn `Explore` in parallel for: (a) engine-surface inventory, (b) Warlock UI-surface matrix, (c) stale-code disposition, (d) Build-shape extraction from bench fixtures. Each is independent.
- **Stage 2 (Plan).** Main session synthesizes the Terse Map into the execution plan. `Plan` sub-agent can draft the component-split proposal given the Terse Map output.
- **Stage 4 (Execute).** Sequential per plan's step ordering. Main session drives. Sub-agents only for specific lookups (e.g., "confirm React 19's current recommended pattern for memoizing expensive computed values"). Do NOT spawn agents to implement whole components — each component is small enough that branching reasoning into a sub-agent loses more context than it saves.

When you spawn a sub-agent, brief it fully (self-contained prompt). Aggregate results; keep high-level state in the main session.

---

## Guardrails (from Phase 7 "Watch for")

- **Rebuild, don't repair** (LOCK C).
- **Minimal UI only** (LOCK D). Feature creep is the #1 Phase 7 failure mode.
- **Class-agnostic UI** (LOCK J).
- **No engine or shape changes** without sign-off (LOCK E, LOCK F).
- **Dev server is the primary acceptance surface** (LOCK K). `npm test` must stay green; the acceptance check is a dev-server flow.
- **Fixture corrections are doctrine compliance, not shape changes** — renaming to the canonical `...Bonus` keys per LOCK G is authoring the fixture correctly, not "migrating" or "evolving" anything.
- **Maintain the progress document throughout Stage 4.**

---

## When in doubt

Re-read `docs/rebuild-plan.md § Phase 7` and `§ Operating protocol`. Re-read `docs/perspective.md § Core principles` (especially principle 6). Re-read `docs/engine_architecture.md § 20` (Query API). Re-read this prompt's "Locked from coordinator" section.

If implementation reveals an ambiguity (you can see two defensible decisions), raise it under **Open questions** in your Plan Report or Completion Report. Don't pick silently.

**Begin with Stage 1.**
