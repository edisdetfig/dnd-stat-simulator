# Snapshot recompute budget

Phase 0 deliverable. Establishes the < 50ms snapshot recompute budget
operationally — before the engine that implements the full pipeline exists —
and forward-declares the stage-boundary checkpoints so memoization can be
added during Phase 6 without restructuring.

Read this doc alongside `docs/rebuild-plan.md § Constraints`,
`docs/perspective.md § Core principles`, and
`docs/class-shape-progress.md § Engine architecture open questions`.

---

## 1. Budget

**Target.** A full snapshot recompute must complete in **< 50 ms** for the
largest realistic build.

**Anchor.** The anchor for this budget is the synthetic max-loadout fixture
at `bench/fixtures/max-loadout.fixture.js`. The fixture is calibrated to
exercise every pattern from `src/data/classes/class-shape-examples.js` at
Warlock-scale density; it is **not** a real class. When Phase 2's Warlock
migration lands, Phase 6 re-runs the same harness against real Warlock data
and the two numbers are cross-checked.

---

## 2. What counts

The recompute pipeline, Stages 0 through 6:

0. `buildContext` — turns user input into `ctx` (incl. availability resolver,
   memory-budget validator, derived weapon-state).
1. `collectAtoms` — walks every active ability's atom containers; populates
   each atom's `source` and `atomId`; returns flat lists per category.
2. `filterByConditions` — condition evaluator drops atoms whose
   `condition` evaluates false.
3. `materializeStacking` — applies `maxStacks` / `resource` scaling to atom
   `value`s.
4. `aggregate` — buckets stat-effect atoms by `stat` × `phase`; sums into a
   `Bonuses` object.
5. `deriveStats` — runs `DERIVED_STAT_RECIPES` against `(attrs, bonuses, capOverrides)`.
6. `projectDamage` / `projectHealing` — per-atom projections through
   `calcPhysicalMeleeDamage` / `calcSpellDamage` / `calcHealing`.

The availability resolver (which produces `availableAbilityIds`) is Stage 0's
side output and counts within the budget.

---

## 3. What doesn't count

- React render / reconciliation of the snapshot into DOM.
- Initial page load (bundle parse, font load, first paint).
- Build / fixture construction / deserialization.
- Dev-mode assertions and validator runs (those are authoring-time, not
  recompute-time).
- Shape-validation reads (class-shape validator runs under `npm test`, not
  under `runSnapshot`).

---

## 4. Why 50 ms

User-visible snapshot updates must feel instant. Under ~50 ms the click-to-
update pipeline registers as "responsive"; above ~100 ms the UI starts to
feel sluggish. 50 ms gives headroom for React's render pass (~5–10 ms on a
real machine) to still complete within a ~60 ms click-response window.

See `docs/rebuild-plan.md § Constraints — priority order` — performance is
ranked #1 above class-agnosticism and extension ease; when priorities
conflict, the 50 ms budget wins.

---

## 5. Baseline policy

**Today (Phase 0).** The baseline measured by `bench/snapshot.bench.js` is a
**PARTIAL lower bound** — only Stages 5 (`deriveStats`) and 6 (projections)
exist as real code; Stages 0–4 are stubbed in `bench/stub-pipeline.js`.

The number printed by `npm run bench` must be read as:

> "This is the cost of the verified-math slice of the pipeline. Stages 0–4
> will add real work on top. This is a floor, not a total."

Every bench case title in `snapshot.bench.js` is prefixed with `PARTIAL:` so
the reporter output is unmistakable. The file and stub both carry top-of-file
banners to the same effect.

**Phase 6.** When the real `runSnapshot` lands, the stub is retired:
`bench/stub-pipeline.js` is deleted and `bench/snapshot.bench.js` imports
`runSnapshot` from `src/engine/runSnapshot.js` with no other changes
(possible because §6.1 pins the signature). Numbers reprint; THAT number
is the baseline the 50 ms budget is measured against.

---

## 6. Stage-boundary checkpoint spec

> **Forward-declared.** Written in Phase 0, before the stage modules exist.
> Subject to refinement during Phase 5 (engine implementation plan). The
> dependency sets below are the load-bearing claim; the memo-key-hint column
> is advisory.

For each stage: what it reads from `ctx`, what it produces, what invalidates
its cached output, and a memoization-key hint (coarse → fine, pick fine when
measurement shows cache hits suffer from coarseness).

| Stage | Reads | Produces | Invalidates on | Memo key hint |
|---|---|---|---|---|
| **0 — buildContext** | full user input: `class`, `selectedPerks`, `selectedSkills`, `selectedSpells`, `activeBuffs`, `classResourceCounters`, `stackCounts`, `gear`, `weaponStates`, `selectedTiers`, `playerStates`, `target`, `environment`, `attributes` | `ctx` incl. `availableAbilityIds`, `activeAbilities`, `memoryBudget` validation | any user-input field | whole user-input object |
| **1 — collectAtoms** | `ctx.activeAbilities`, class data (static) | flat atom lists per category with `source` and `atomId` populated | `activeAbilities` set change | sorted `activeAbilityIds` |
| **2 — filterByConditions** | Stage 1 out + condition-source subset of `ctx`: selected sets, `activeBuffs`, `weapon_type`, `player_state`, `equipment`, `creature_type`, `damage_type`, `environment`, `tier`, `hp_below` input (see open question 1) | filtered atom lists | Stage 1 out OR any condition source | Stage-1 key + condition-source digest |
| **3 — materializeStacking** | Stage 2 out, `ctx.stackCounts`, `ctx.classResources` | atoms with `value` scaled per stack count | Stage 2 out OR stack counts | Stage-2 key + stack-counts digest |
| **4 — aggregate** | Stage 3 `effects` atoms | `Bonuses` object, phase-bucketed | Stage 3 out | Stage-3 key |
| **5 — deriveStats** | `Bonuses`, `ctx.attributes`, `ctx.capOverrides`, class `baseAttributes`/`baseHealth` | derived stat sheet (`runRecipe` outputs) | Bonuses, attributes, capOverrides | `{bonuses, attrs, caps}` |
| **6 — projectDamage / projectHealing** | derived stat sheet, Stage 3 damage/heal atoms, target profile | `Snapshot` (§6.1) | stat sheet, damage/heal atoms, target | `{statSheet, atoms, target}` |

### 6.1 Public API surface (pinned)

```
runSnapshot(build: Build): Snapshot

Snapshot = {
  bonuses:           Record<StatId, Record<Phase, number>>,
  derivedStats:      Record<DerivedId, { value, rawValue?, cap? }>,
  damageProjections: Array<{
                       atomId,
                       source: { kind, abilityId, className },
                       hit: { body?, head?, limb? },       // see (1)
                     }>,
  healProjections:   Array<{
                       atomId,
                       source,
                       amount,
                       isHot,
                       duration?,
                     }>,
  availableAbilityIds: string[],
  memoryBudget:      { used, capacity, lockedOut: string[] },
}
```

**Stability.** `runSnapshotStub(build) → Snapshot` (implemented in
`bench/stub-pipeline.js`) matches this shape exactly. Phase 6's real
`runSnapshot` is a drop-in replacement: consumers update one import line.

**Minimal floor.** Phase 5 may extend this shape with additions like
`shieldProjections`, `effectsTrace`, or `activeAbilities[]`. **Additions are
extensions; existing keys are pinned.** New keys do not invalidate the stub
or Phase 0 consumers.

**(1) `hit` shape is TBD Phase 5.** Magical spells emit a single damage
number; weapon attacks emit three hit-location numbers (body / head / limb).
Whether body/head/limb live as three keyed numbers inside `hit`, as a flat
`amount` with a projection-kind discriminator, or split into two projection
types is a Phase 5 call. Phase 0 pins the overall shape; the `hit` inner
structure is the one field that may change shape, not just add keys.

### 6.2 `atomId` derivation rule (pinned)

Every atom gets a deterministic identifier. Generated at Stage 1 by
`collectAtoms`; reproducible by both the Phase 0 stub and Phase 6's real
`runSnapshot`.

```
atomId = "<ability_id>:<container>:<index>"
```

- `<ability_id>` — the `id` field of the source ability.
- `<container>` ∈ {`effects`, `damage`, `heal`, `shield`,
                   `afterEffect.effects`, `grants`, `removes`}.
- `<index>` — 0-based position within that container on the source ability,
  **pre-stacking** (stacking materialization in Stage 3 does not change ids).

**Singular containers.** When `heal` / `shield` are authored as a single
object (per class-shape.js), the container index is always `0`, so the id
reads `<ability_id>:heal:0` / `<ability_id>:shield:0`.

**`afterEffect.effects`.** The dotted container name keeps the hierarchy
explicit so trace output is unambiguous.

**Examples.**

```
bolt_of_darkness:damage:0       — Bolt of Darkness's direct damage atom
blood_pact:effects:2            — Blood Pact's third stat-effect atom
blood_pact:grants:1             — Blood Pact's second grant atom (exploitation_strike)
fireball:damage:1               — Fireball's splash damage atom
fireball:damage:2               — Fireball's burn DoT atom
fireball:effects:0              — Fireball's knockback bare-CC atom
ballad_of_courage:effects:0     — Ballad of Courage's "poor" tier atom
natures_touch:heal:0            — Nature's Touch's HoT atom
protection:shield:0             — Protection's shield atom
adrenaline_rush:afterEffect.effects:0  — Adrenaline Rush's penalty action-speed atom
```

---

## 7. Non-goals for Phase 0

- **No memoization implementation.** Phase 0 identifies checkpoint locations;
  it does not cache anything. Phase 6 implements memoization at the stages
  where measurement shows a hotspot.
- **No fixture-generation tooling.** The max-loadout fixture is hand-authored
  so every pattern from `class-shape-examples.js` is intentionally covered.
- **No perf-regression CI gate.** Phase 6+ adds bench runs to CI once the
  real engine exists. Running a PARTIAL bench as a gate would gate on the
  wrong number.

---

## 8. Engine architecture open questions

Surfaced by Phase 0 but not resolved here — logged in
`docs/class-shape-progress.md § Engine architecture open questions`:

1. **`hp_below` Stage 2 ↔ Stage 5 cycle.** The condition depends on current
   HP, which Stage 5 produces; Stage 2 runs before Stage 5. Two candidate
   resolutions recorded in the progress doc.
2. **Stage 2 cache-key granularity.** The dependency set is pinned above;
   the cache-key *layout* (fine-grained per-source digest vs. coarse whole
   `ctx` key) is a Phase 5/6 implementation choice driven by measurement.

---

## 9. How to run

```
npm run bench                    # vitest bench --run — one-shot
npx vitest bench                 # watch mode
npm test                         # harness-self tests (fixture shape, stub smoke)
```

Harness-self tests (`bench/**/*.test.js`) run as part of the regular
`npm test` suite so the fixture and stub are kept honest by the same gate
that protects verified-math tests.
