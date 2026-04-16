# bench/

Phase 0 performance harness. See `docs/performance-budget.md` for the budget,
stage-boundary checkpoint spec, and the pinned `runSnapshot(build) → Snapshot`
signature this harness targets.

## Run

```
npm run bench          # one-shot
npx vitest bench       # watch mode
npm test               # harness-self tests (fixture shape, stub smoke)
```

## Layout

| Path | Role |
|---|---|
| `fixtures/max-loadout.fixture.js`     | Synthetic max-density anchor (full perks/skills/spells, gear stack, toggles, stacks). NOT a real class. |
| `fixtures/minimal-loadout.fixture.js` | 1 passive perk, no gear. Scaling-signal control case. |
| `fixtures/max-loadout.fixture.test.js`| Pattern-coverage + shape tests guarding the fixture. |
| `stub-pipeline.js`                    | THROWAWAY. Stubs Stages 0–4; calls real `computeDerivedStats` / `calcSpellDamage` / `calcHealing` for Stages 5–6. Matches the pinned `Snapshot` signature. |
| `stub-pipeline.test.js`               | Smoke test + signature check. |
| `snapshot.bench.js`                   | Bench cases. Every case title prefixed `PARTIAL:` because Stages 0–4 are stubbed. |

## Reading the numbers

**Numbers from this harness are a lower bound, not a budget baseline.**
Stages 0–4 do not exist yet. Phase 6's real `runSnapshot` will add more
work; the real baseline reprints against the 50 ms budget when that ships.

## Adding a bench case

New cases go in `snapshot.bench.js` alongside the existing blocks. Match the
title convention: `snapshot recompute — <LABEL>: <stage or scope> — <fixture>`.
Drop the `PARTIAL:` prefix only after Stages 0–4 are real code.
