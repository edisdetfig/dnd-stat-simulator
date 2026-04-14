# dnd-stat-simulator

Dark and Darker character build simulator — stat curves, damage calculator, gear planning.

**Season 8 · Hotfix 112-1 · game version 0.15.134.8480**

## What it does

Evaluates character builds by computing derived stats from equipped gear, perks, skills, spells, transformations, buffs, and player states using verified in-game formulas. Snapshot-style: toggle abilities on or off and the stat sheet updates instantly. It's a loadout-comparison tool, not a real-time combat simulator.

- 17 piecewise stat curves (wiki-LaTeX sourced; in-game verified where possible)
- Physical and magical damage calculators with 16 verified test points (8 physical melee + 8 spell; see `docs/damage_formulas.md`)
- All 10 classes authored: Barbarian, Bard, Cleric, Druid, Fighter, Ranger, Rogue, Sorcerer, Warlock, Wizard
- Class-agnostic architecture: adding content is a data change, not a code change
- Unified damage pipeline with composable layers — same formulas serve both outgoing damage and (planned) incoming-damage analysis

## Running locally

Requires Node.js + npm (WSL users: via nvm).

```bash
source ~/.nvm/nvm.sh        # WSL only
npm install                 # first time
npm run dev                 # dev server at localhost:5173
npm run build               # production build -> dist/
npm test                    # run vitest
```

## Deployment

GitHub Pages via `.github/workflows/static.yml` on push to `main`.

## Project status

Phase 1.3 engine rebuild in progress (2026-04-14). Class data is stable and v3-native; the engine is being rebuilt from scratch against the locked architecture. The simulator UI is temporarily non-functional during the rebuild — `App.jsx` will be re-wired to the new engine during Phase D.0.3/D.0.4.

## Reference docs

- `docs/engine_requirements_phase_1_3.md` — §A–G engine feature tracker
- `docs/damage_formulas.md` — verified damage formulas + in-game test points
- `docs/healing_verification.md` — verified healing formula
- `docs/unresolved_questions.md` — open in-game verification questions + resolved findings
- `docs/vocabulary.md` — controlled vocabulary for v3 data
- `docs/shape_examples.md` — worked v3 ability examples
- `docs/season8_constants.md` — patch-stable constants

## Accuracy stance

Every formula traces to a verified source. When in-game measurements disagree with predictions, development stops on that path until the discrepancy is resolved. Open questions are tracked in `docs/unresolved_questions.md` with testing protocols.
