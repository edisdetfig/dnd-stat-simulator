# dnd-stat-simulator

Dark and Darker character build simulator — stat curves, damage calculator, gear planning.

**Season 8 · Hotfix 112-1**

## What it does

Computes all derived stats from equipped gear using verified game formulas:
- 17 piecewise stat curves (all from wiki LaTeX, some corrected via in-game testing)
- Dynamic gear aggregation from per-item definitions (no hardcoded totals)
- Physical and magical damage calculators with verified test points
- Weapon held state (Bare Hands / Spectral Blade / Spellbook)
- Cap tracking with effective bonus display (PDR, MDR)

Currently configured for a Warlock build. Class-agnostic architecture — designed to support all classes via data, not code changes.

## Running locally

No build tools needed. Just open `index.html` in a browser.

The app loads React from CDN and transpiles JSX in the browser via Babel. No npm, no node, nothing to install.

## Running via GitHub Pages

1. Go to repo Settings → Pages
2. Set source to "Deploy from a branch"
3. Select `main` branch, `/ (root)` folder
4. Save — site will be live at `https://edisdetfig.github.io/dnd-stat-simulator/`

## Project structure

```
index.html              ← Standalone app (React + all game logic)
data/
  stat_curves.json      ← All 17 piecewise curve definitions
docs/
  damage_formulas.md    ← Verified damage formulas + test points
  season8_constants.md  ← Caps, display rules, derived stat formulas
  simulator_architecture.md  ← Architecture, data flow, build phases
  data_schemas.md       ← JSON schemas for classes, items, builds
README.md
```

## Verified against in-game

All stat values and damage numbers have been tested against a live Warlock build in-game:
- 50+ unit tests covering curve evaluation, gear aggregation, and derived stats
- 8 damage test points (physical melee + spell + on-hit effects)
- PDR curve corrected from wiki data via in-game testing at 6 armor rating values
- Debuff duration upgraded from approximation to full 59-segment wiki LaTeX curve

## Status

- **Phase 0** ✅ Data foundation (schemas, Warlock class data, stat curves)
- **Phase 1** ✅ Core engine (curves, aggregator, derived stats, damage calc)
- **Phase 2** 🔜 Interactive gear editing, buff toggles, build save/load
- **Phase 3** 🔜 Item database, additional classes, DPS module
