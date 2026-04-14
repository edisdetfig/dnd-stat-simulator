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
When implementing a curve: write it as a pure function, unit-test against the verified test points in docs/damage_formulas.md / docs/healing_verification.md, then integrate.
When a discrepancy is found: document it in unresolved_questions.md with a testing protocol.

# Architecture & Key Files

KNOWLEDGE FILE LAYOUT:
- data/stat_curves.json — all 17 piecewise curve definitions (stable, patch-only changes)
- docs/damage_formulas.md — physical/magical damage formulas, DR, penetration, Antimagic, DR caps
- docs/season8_constants.md — global caps, derived stat formulas, season changes, balance notes
- docs/unresolved_questions.md — open unknowns, resolved findings, and testing protocols
- docs/healing_verification.md — verified healing formula with test points

# Notes

- **Primary test class**: Warlock — class-agnostic architecture supports all classes via data
- **External resources**: darkanddarker.wiki.spellsandguns.com (wiki with LaTeX formulas)
- **Version tracking**: Season 8 is the season; hotfix numbers increment with patches; game version is the full build number shown in-game

# Current State

**Stack:** Vite + React 19. Single-page character simulator. Deploys to GitHub Pages via `.github/workflows/static.yml` on push to `main`.

**Phase status (2026-04-14):** Engine mid-rebuild (Phase 1.3 Section D). Class data is v3-native across all 10 classes. Non-load-bearing pre-v3 engine code has been archived out of the project; only verified-math files (`curves.js`, `damage.js`, `recipes.js`) remain in `src/engine/`. The simulator UI does not currently run — `App.jsx` imports resolve to archived paths and will be re-wired during Phase D.0.3/D.0.4.

**Source layout:**
- `src/App.jsx` — main simulator UI (currently broken; pending re-wire to the rebuilt engine)
- `src/components/` — gear editors, panels, curve charts
- `src/data/classes/` — v3 class data (10 classes, all fully authored)
- `src/data/constants.js` — enums (EFFECT_PHASES, CONDITION_TYPES, STATUS_TYPES, PLAYER_STATES, WEAPON_TYPES, TARGETING, EFFECT_TARGETS, etc.)
- `src/data/stat-meta.js` — canonical stat registry with direction/tag metadata for duration modifiers
- `src/engine/curves.js` — piecewise curve evaluation + 17 curves
- `src/engine/damage.js` — verified damage formulas
- `src/engine/recipes.js` — HP / PPB / MPB / PDR / MDR derived-stat recipes + `RECIPE_IDS` registry (distinct from STAT_META — the two-namespace model)
- `data/stat_curves.json` — verified piecewise curve definitions (patch-only changes)

**Commands:**
```bash
source ~/.nvm/nvm.sh    # WSL: load nvm before npm commands
npm install             # first time only
npm run dev             # Vite dev server
npm run build           # Production build -> dist/
npm test                # Run vitest
```

**Tracker + architecture docs:**
- `docs/engine_requirements_phase_1_3.md` — §A–G engine feature tracker (27 §D rows)
- `docs/vocabulary.md` — controlled vocabulary (enum values, conventions, tags, direction semantics)
- `docs/shape_examples.md` — class-agnostic worked examples of v3 ability patterns

**Two-namespace stat model:**
- STAT_META keys = gear/perk additive contributions (e.g., `physicalDamageReductionBonus`, `maxHealthBonus`)
- `RECIPE_IDS` entries = recipe outputs / cap-override targets (e.g., `pdr`, `mdr`, `hp`). Short recipe IDs are valid under `effect.stat` only when `phase === "cap_override"`; the validator enforces this.
