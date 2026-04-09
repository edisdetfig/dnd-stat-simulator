# Project Title

Dark and Darker — Research & Simulator

# Project Description

Research verified game mechanics and build an interactive character simulator for Dark and Darker. The project maintains two parallel tracks: (1) documenting and verifying in-game formulas, stat curves, and damage mechanics through real-time testing, and (2) implementing those mechanics as a React-based character builder that evaluates gear swaps by comparing damage output, survivability, and derived stats. Accuracy is the core constraint — every formula must trace to a verified source, and in-game discrepancies halt development until resolved.

# Instructions

You are researching and building a Dark and Darker character simulator (Season 8, Hotfix 112-1, game version 0.15.134.8480).

DUAL ROLE: Research verified game mechanics AND implement them as an interactive web application.

ACCURACY FIRST:
- Every formula traces to a verified source in the knowledge files. Never assume.
- Verification levels: VERIFIED (tested in-game), WIKI-SOURCED (from wiki LaTeX), UNRESOLVED (unknown).
- When in-game numbers don't match predictions, STOP and investigate before continuing.
- All damage display values use Math.floor. Magic damage types must be checked before applying bonuses.
- The user has the game open — suggest specific in-game tests for any unknown.

When starting a session: read relevant knowledge files, summarize current state, ask what to work on.
When implementing a curve: write it as a pure function, unit test against verification_test_points.md, then integrate.
When a discrepancy is found: document it in unresolved_questions.md with a testing protocol.

# Architecture & Key Files

ARCHITECTURE:
- Single-page React application. Pure functions for all stat curves.
- Data flows one direction: Gear → Attributes → Curves → Derived Stats → Damage.
- Game data (curves, class/gear/spell/perk definitions) stored as .json files, loaded at runtime. Currently local; will eventually be fetched from an external server. Never hardcode game values in application logic.
- User-specific data (saved builds, presets) stored via window.storage API.
- Class-agnostic design: class stats, perks, spells, equippable armor are all data-driven.

KNOWLEDGE FILE LAYOUT:
- data/stat_curves.json — all 17 piecewise curve definitions (stable, patch-only changes)
- docs/damage_formulas.md — physical/magical damage formulas, DR, penetration, Antimagic, DR caps
- docs/season8_constants.md — global caps, derived stat formulas, season changes, balance notes
- docs/unresolved_questions.md — open unknowns, resolved findings, and testing protocols
- docs/healing_verification.md — verified healing formula with test points
- docs/simulator_architecture.md — app design, data flow, component structure, build phases
- docs/data_schemas.md — JSON schemas for classes, items, builds

# Notes

- **Primary test class**: Warlock — class-agnostic architecture supports all classes via data
- **External resources**: darkanddarker.wiki.spellsandguns.com (wiki with LaTeX formulas)
- **Version tracking**: Season 8 is the season; hotfix numbers increment with patches; game version is the full build number shown in-game

# Current State

**Stack:** Vite + React 19. Single-page character simulator. Deploys to GitHub Pages via `.github/workflows/static.yml` on push to `main`.

**Source layout:**
- `src/App.jsx` — main simulator UI (state, layout, stat rendering)
- `src/components/` — extracted UI (gear editors, stat rows, curve charts, target editor, panels)
- `src/data/` — constants, stat metadata, classes, religions, gear defaults
- `src/engine/` — `aggregator.js`, `curves.js`, `derived-stats.js`, `damage.js`, `tests.js`
- `src/utils/format.js`, `src/styles/theme.js` — formatters and shared styles
- `data/stat_curves.json` — verified piecewise curves (patch-only changes)

**Commands:**
```bash
source ~/.nvm/nvm.sh    # WSL: load nvm before npm commands
npm run dev             # Vite dev server
npm run build           # Production build -> dist/
```

**Primary test class:** Warlock. Fighter is a stub (one perk, no skills/spells).

**Spell effect model:** spells and perks use the `EFFECT_PHASES` enum from `src/data/constants.js` — `PRE_CURVE_FLAT`, `ATTRIBUTE_MULTIPLIER`, `POST_CURVE`, `TYPE_DAMAGE_BONUS`, `DAMAGE_OVER_TIME`. Effects are applied in the computed `useMemo` in `App.jsx`. Perk-based stat-cap raises (e.g., Fighter Defense Mastery) use the `capOverrides` pattern — see `src/engine/derived-stats.js`.

**Debug:** the "Copy Debug JSON" button next to the Tests row serializes class/religion/gear/buffs/attrs/derived stats to the clipboard. Paste that when reporting a numeric discrepancy — it's the fastest way to diagnose a pipeline bug.
