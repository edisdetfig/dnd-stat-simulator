# Project Title

Dark and Darker — Research & Simulator

# Project Description

Research verified game mechanics and build an interactive character simulator for Dark and Darker. The project maintains two parallel tracks: (1) documenting and verifying in-game formulas, stat curves, and damage mechanics through real-time testing, and (2) implementing a real-time stat snapshot simulator as a React-based character builder that evaluates gear swaps by comparing damage output, survivability, and derived stats. Accuracy is the core constraint — every formula must trace to a verified source, and in-game discrepancies halt development until resolved.

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
- data/classes/class-shape.js - Authoritative class data shape that defines all class data and which all classes must conform to
- data/classes/class-shape-examples.js - Concrete examples of class data
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

**Classes** Class data across all 10 classes in `src/data/classes` is to only be used as a reference while building new class files from our class shape source file `class-shape.js`. Relevant examples can be found in `class-shape-examples.js`. Only verified-math files (`curves.js`, `damage.js`, `recipes.js`) remain in `src/engine/`. The simulator UI does not currently run — `App.jsx` imports resolve to archived paths.

**Source layout:**
- `src/App.jsx` — main simulator UI (currently broken; pending re-wire to the newly built engine)
- `src/components/` — gear editors, panels, curve charts, etc, more to be determined during architecture
- `src/data/classes/` — Class data across all 10 classes that should only be used to reference the data, not the structure (10 classes, all need to be fully created with `class-shape.js`)
- `src/data/constants.js` — enums for different effect phases, condition types, etc, to be followed and updated as needed.
- `src/data/stat-meta.js` — canonical stat registry with direction/tag metadata for duration modifiers (may be stale and need updated)
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

**Ability data shape consolidation in flight** — see `docs/perspective.md` for the project's mental model (read this first on a fresh session), and `docs/class-shape-progress.md` for the current state of the class-shape work. The shape itself is defined in `src/data/classes/class-shape.js`, with concrete examples in `src/data/classes/class-shape-examples.js`. Real class data (`barbarian.js` etc.) is simply a reference for the underlying data, not shape — it along with every other class need to be completely rebuild to adhere to `src/data/classes/class-shape.js`.

**Tracker + architecture docs:**
- `docs/rebuild-plan.md` — authoritative 13-phase roadmap from locked `class-shape.js` to shipping UI; every phase session reads this first
- `docs/coordinator-role.md` — how the coordinator/architect role operates; read this if you're driving the rebuild (designing session prompts, reviewing reports, committing phase work)
- `docs/perspective.md` — project mental model and core principles
- `src/data/classes/class-shape.js` - Authoritative class data shape
- `src/data/classes/class-shape-examples.js` - Concrete examples of class data
- `docs/class-shape-progress.md` — in-flight state of the class-data shape consolidation

**Two-namespace stat model:**
- STAT_META keys = gear/perk additive contributions (e.g., `physicalDamageReductionBonus`, `maxHealthBonus`)
- `RECIPE_IDS` entries = recipe outputs / cap-override targets (e.g., `pdr`, `mdr`, `hp`). Short recipe IDs are valid under `effect.stat` only when `phase === "cap_override"`; the validator enforces this.
