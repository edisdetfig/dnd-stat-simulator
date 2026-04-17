# Gear & Character Mapping — Phase 6.5b output

Current-state map + gap inventory + refined OQ-D list. Research-only
deliverable; no shape proposals, no code changes, no source-doc edits.

Consumed by Phase 6.5c (clean-slate shape design) alongside
`docs/session-prompts/gear-shape-design.md` (requirements — L1–L14, §4.x, §6
OQ-Ds) and `docs/gear-wiki-facts.md` (Phase 6.5a wiki facts).

Citation conventions:
- `[REPO: path:lines]` — absolute repo path, line range.
- `[L-N]` / `[§4.x]` — locked decision or metadata section in
  `docs/session-prompts/gear-shape-design.md`.
- `[WIKI-FACTS §N]` — section N of `docs/gear-wiki-facts.md`.
- `[OQ-D N]` — design-phase open question in `gear-shape-design.md § 6`.

---

## § 1 Purpose + how this doc is used by Phase 6.5c

This doc is the **landscape read** Phase 6.5c works off of. It does not propose
shapes, resolve OQ-Ds, or edit engine code.

**What 6.5c consumes from here:**

- **§ 2** — what the current engine, class data, STAT_META, stale UI,
  fixtures, and legacy infra look like today, with file:line citations so
  design decisions are grounded in observable code.
- **§ 3** — per-requirement gap table, each gap classified as **Additive**,
  **Structural**, or **Net-new surface** per LOCK E. 6.5c uses the
  classification to scope its own work: Additive gaps cost a normalizer;
  Structural gaps cost specific engine-module signature changes; Net-new
  surface gaps cost new code + data + validation.
- **§ 4** — roll-up of Structural gaps (the engine-module changes 6.5c must
  commit to if it chooses that path on each gap).
- **§ 5** — refined OQ-D1–OQ-D10. Each entry names the original question,
  what the mapping surfaced, candidate options (where mapping makes any
  clearly viable), and an explicit non-answer stance.
- **§ 6** — Phase 6.5a UNRESOLVED items that cascade into 6.5c design
  problems (vs items that stay as deferred research).
- **§ 7** — revision log.

**What 6.5c does NOT consume from here:** shape proposals, field names, file
paths, validator specs. None are authored in this doc (LOCK G).

**How to use if you are 6.5c:** read §§ 2–3 first for grounding; jump to § 5
to see the design-question set; return to § 3 to see the seams underlying each
question; use § 4 to scope engine-side work.

---

## § 2 Current-state map

### 2.1 Build shape (what `buildContext` consumes)

The `Build` object is the engine's public input. Fresh fixtures author the
shape directly; there is no `Build` TypeScript or JSDoc definition in the
repo. Authoritative shape is extracted from the fixture anchor (§ 2.9).

**Top-level `Build` keys read by `buildContext`:**

| Key | Read at | Default / normalization |
|---|---|---|
| `klass` | `[REPO: src/engine/buildContext.js:41]` | required; throws if missing |
| `attributes` | `[REPO: src/engine/buildContext.js:50]` | shallow copy into `ctx.attributes`; pre-summed (base + gear) by upstream per comment at lines 48–49 |
| `selectedPerks / Skills / Spells` | `[REPO: src/engine/buildContext.js:56–58]` | default `[]` |
| `activeBuffs` | `[REPO: src/engine/buildContext.js:59]` | default `[]` |
| `activeForm` | `[REPO: src/engine/buildContext.js:79]` | default `null` |
| `classResourceCounters / stackCounts / selectedTiers` | `[REPO: src/engine/buildContext.js:81–83]` | default `{}` |
| `playerStates` | `[REPO: src/engine/buildContext.js:84]` | default `[]` |
| `viewingAfterEffect` | `[REPO: src/engine/buildContext.js:85]` | default `[]` |
| `applyToSelf / applyToEnemy` | `[REPO: src/engine/buildContext.js:89–90]` | default `{}` |
| `environment` | `[REPO: src/engine/buildContext.js:92]` | passthrough |
| `target` (object) | `[REPO: src/engine/buildContext.js:62–69]` | normalized to `{ pdr, mdr, headshotDR, maxHealth, creatureType, projectileDR }` with defaults |
| `gear` (object) | `[REPO: src/engine/buildContext.js:95]` | default `{ weapon: null, bonuses: {} }` (engine-facing pass-through shape — see § 2.3) |
| `weaponType` | `[REPO: src/engine/buildContext.js:136]` | override; falls back to `build.gear.weapon.weaponType` |
| `hpFraction` | `[REPO: src/engine/buildContext.js:105]` | default `1.0` |
| Weapon-state overrides (`isTwoHanded / isOneHanded / isUnarmed / isInstrument / isDualWielding`) | `[REPO: src/engine/buildContext.js:140–145]` | each overrides the derivation inside `deriveWeaponState` |

**Not on Build today (by absence):** identity (name, religion), saved-build
persistence fields, any `character` wrapper, any `weaponHeldState` key (only
fixture-injected booleans substitute for this).

### 2.2 Ctx shape (output of `buildContext`; input to Stages 1–6)

The `ctx` object returned by `buildContext` is what every engine stage reads.

**Gear/attribute/target/weapon-related fields written onto `ctx`:**

| `ctx` field | Sourced from | File:line |
|---|---|---|
| `ctx.gear` | `build.gear ?? { weapon: null, bonuses: {} }` (**shallow passthrough — no normalization**) | `[REPO: src/engine/buildContext.js:95]` |
| `ctx.attributes` | shallow copy of `build.attributes` | `[REPO: src/engine/buildContext.js:50, 104]` |
| `ctx.target` | normalized from `build.target` with defaults | `[REPO: src/engine/buildContext.js:62–69, 93]` |
| `ctx.weaponType` | `deriveWeaponState` — `build.weaponType ?? build.gear.weapon?.weaponType ?? null` | `[REPO: src/engine/buildContext.js:96, 136]` |
| `ctx.isRanged` | `deriveWeaponState` — `WEAPON_TYPE_CATEGORIES.ranged.includes(weaponType)` | `[REPO: src/engine/buildContext.js:97, 138]` |
| `ctx.isTwoHanded / isOneHanded / isUnarmed / isInstrument / isDualWielding` | `deriveWeaponState` — Build overrides then weapon/offhand inference | `[REPO: src/engine/buildContext.js:98–102, 140–145]` |
| `ctx.hpFraction` | `build.hpFraction ?? 1.0` | `[REPO: src/engine/buildContext.js:105]` |

**Not on ctx today (load-bearing for § 3 gaps):** no `ctx.weaponHeldState`;
no distinction between loadouts; no item-level gear structure (rings,
necklace, armor items individually — `ctx.gear.bonuses` is a flat
`Record<StatId, number>`); no `ctx.character` wrapper; no per-stat unit /
source / exclusion metadata inside `ctx.gear`.

### 2.3 Gear sub-shape inside ctx (`ctx.gear.*`)

What the engine actually reads out of `ctx.gear`:

| Field | Stage / module | File:line | How used |
|---|---|---|---|
| `ctx.gear.bonuses` | Stage 4 (aggregate) | `[REPO: src/engine/runSnapshot.js:44]` | passed to `aggregate` as `gearBonuses`; folded into `bonuses[stat].gear` |
| `ctx.gear.weapon.magicalDamage` | Stage 6 (damage) | `[REPO: src/engine/runSnapshot.js:56]` | fallback for `_weaponMagicalDamageFlat` |
| `ctx.gear.weapon` (whole sub-object) | Stage 6 (damage) | `[REPO: src/engine/runSnapshot.js:62]` | passed to `projectDamage`; consumed as `baseWeaponDmg / gearWeaponDmg` inside `calcPhysicalMeleeDamage` |
| `ctx.gear.offhand.weaponType` | Stage 0 (`deriveWeaponState`) | `[REPO: src/engine/buildContext.js:145]` | used only to infer `isDualWielding`; no stat contribution |

**Fields `ctx.gear.bonuses` carries today (observed across max-loadout fixture
and recipes):** a flat map of STAT_META ids to numbers; recipe consumers in
`[REPO: src/engine/recipes.js:100–106, 115–120, 126–132, 141, 184–185]` read
`bonuses.{armorRating, additionalArmorRating, equippedArmorRatingBonus,
magicResistance, physicalDamageReductionBonus, magicalDamageReductionBonus,
physicalPower, physicalDamageBonus, magicalPower, magicalDamageBonus,
moveSpeedBonus, memoryCapacityBonus, additionalMemoryCapacity, ...}`.

**No sub-structure:** no per-slot breakdown, no per-item attribution, no
rarity, no modifier-provenance, no exclusion-group tracking. `ctx.gear` is
the engine's agreed-upon pre-flattened form; any richness upstream (§ 2.7 UI
shape; § 2.9 fixture) is erased before this point.

### 2.4 Snapshot shape (engine output)

The `Snapshot` is what `runSnapshot` returns. Gear-relevant surfaces:

- `snapshot.derivedStats` — recipe outputs (HP, PPB, MPB, PDR, MDR, etc.) +
  bucketed `bonuses` by stat. Recipe-output keys come from `[REPO:
  src/engine/recipes.js]` — `RECIPE_IDS`.
- `snapshot.damage[]` — per-ability projections; carries gear-weapon-derived
  values when the ability scales with weapon damage.
- `snapshot.heal / snapshot.shield` — no gear reads beyond `target.maxHealth`.

Gear does not surface on the Snapshot as a distinct object; it is folded into
`derivedStats` / `bonuses` by the time the engine returns. Any UI that wants
to re-expose per-slot / per-item attribution in the snapshot output is doing
net-new work (§ 3.11).

### 2.5 STAT_META current state (reconciliation with § 4.3 registry)

**Coverage of § 4.3 canonical stat registry against STAT_META
(`[REPO: src/data/stat-meta.js]`):**

- **Exact matches (44 of 49 §4.3 targets):** all 7 core attributes
  `[REPO: src/data/stat-meta.js:13–19]`, all 12 offense + 1 offense-bucket
  stat (`additionalMagicalDamage`) `[REPO: src/data/stat-meta.js:26–37]`,
  core defense stats `[REPO: src/data/stat-meta.js:40–57]` except the two
  naming-variants below, all 14 utility stats `[REPO:
  src/data/stat-meta.js:61–74]`, `weaponDamage / magicalDamage /
  magicWeaponDamage` weapon-inherents `[REPO: src/data/stat-meta.js:81–83]`,
  `impactResistance` `[REPO: src/data/stat-meta.js:97]`, `impactPower`
  `[REPO: src/data/stat-meta.js:121]`. The §4.3 registry contains
  `impactPower / impactResistance` per L4's weapon/shield-properties
  addendum; both exist in STAT_META with labels + units.
- **Naming-variant matches (2 of 49):** § 4.3 `physicalDamageReduction` ↔
  STAT_META `physicalDamageReductionBonus` `[REPO:
  src/data/stat-meta.js:52]`; § 4.3 `magicalDamageReduction` ↔ STAT_META
  `magicalDamageReductionBonus` `[REPO: src/data/stat-meta.js:53]`. Per L7
  these are naming variants, not load-bearing distinct stats. Author
  comment at `[REPO: src/data/stat-meta.js:43–51]` clarifies the
  two-namespace distinction (STAT_META `...Bonus` additive contributions
  vs `RECIPE_IDS` `pdr / mdr` recipe outputs). The canonical-name
  reconciliation is deferred per L7 / OQ-D4.
- **Absent (3 of 49):** `comboMultiplier`, `impactZone`, `swingTiming` —
  none in STAT_META. All are weapon-properties; inherent-only per L4. The
  engine already consumes `comboMultiplier` and `impactZone` as
  fixture-supplied private fields (`ctx._buffWeaponDamageFlat`,
  `ctx.comboMultiplier`, `ctx.impactZone` at `[REPO:
  src/engine/projectDamage.js:144–150, 173]`); their absence from
  STAT_META is consistent with "inherent-only, never-gear-rolled" and is
  not a gap by itself. The gap (§ 3.8) is the missing *shape* for
  inherent-only weapon properties, not STAT_META entries.

**`gearStat: true` flag.** STAT_META carries an authoring flag
`gearStat: true` on 42 entries; purpose documented at `[REPO:
src/data/stat-meta.js:7–9]` — "controls whether a stat appears in the gear
modifier dropdown." Class-authored and display-only stats omit the flag.
Every §4.3-in-STAT_META entry carries `gearStat: true`; every class-authored
/ display-only entry in Appendix A of `[WIKI-FACTS Appendix A]` omits it.
Phase 6.5c must decide whether `gearStat` stays the authoritative flag or
whether the new Gear shape's per-slot modifier pools (§ 4.5) replace it
(OQ-D4).

**STAT_META entries outside the § 4.3 registry:** ~48 entries are
class-authored or display-only — enumerated in `[WIKI-FACTS Appendix A]` (49
listed, one of which is `impactResistance` which Appendix A does not
explicitly list because it IS in §4.3 via L4; confirmed by the § 2.5
reconciliation above). These entries are **correctly outside** the gear-affix
registry by design. Phase 6.5c should not blanket-reconcile them away.

**Per-stat work retained for 6.5c (non-blanket):** the "don't blanket-reconcile"
rule does not mean "ignore per-stat." Per L7, `maxHealth` and `maxHealthBonus`
are **mechanically distinct stats** (flat post-MHB-multiplier vs percent
multiplier on base — `[REPO: src/engine/recipes.js:82–91]`). `maxHealthBonus`
is a gear-adjacent load-bearing case: it's in STAT_META at `[REPO:
src/data/stat-meta.js:58]` without `gearStat: true`, absent from §4.3
registry, removed from gear affix pool in Season 8 per `[REPO:
docs/season8_constants.md:76]`, but is wiki-flagged as a mutually-exclusive
"modifier family" member with `maxHealth` `[WIKI-FACTS § 9.6]`. OQ-D4 (stat
registry reconciliation) has real per-stat work on cases like this; this
mapping surfaces the case but does not resolve it.

### 2.6 Class-side gates (`armorProficiency`, `grants[]`, `removes[]`)

**`armorProficiency`.**

- Schema: `[REPO: src/data/classes/class-shape.js:20]` — class-root field
  `["cloth | leather | plate"]`; docstring "Base armor types the class can
  equip; modified by grants[]/removes[] on perks."
- Warlock-authored value: `[REPO: src/data/classes/warlock.new.js:22]` —
  `["cloth", "leather"]`.
- Validator: `[REPO: src/data/classes/class-shape-validator.js:245–250]`
  enforces values against `ARMOR_TYPES`.
- **Engine consumer: none.** Neither `buildContext.js` nor `runSnapshot.js`
  reads `klass.armorProficiency`. The field is authored + validated at
  schema time but not consumed by the runtime.

**`grants[]` atom.**

- Schema: `[REPO: src/data/classes/class-shape.js:315–322]` — `GRANT_ATOM`
  with `type: "ability | weapon | armor"`, `abilityId` (for ability),
  `weaponType` (for weapon), `armorType` (for armor), optional `condition`,
  optional `costSource: "granted | granter"`.
- Examples from Warlock: Demon Armor grants `{ type: "armor", armorType:
  "plate" }` `[REPO: src/data/classes/warlock.new.js:57–59]`; Blood Pact
  grants three abilities with conditions `[REPO:
  src/data/classes/warlock.new.js:277–287]`.
- Engine resolver: `[REPO: src/engine/buildContext.js:213–225]` — fixpoint
  loop inside `resolveAvailability`. **Handles `type: "ability"` only**;
  line 217: `if (grant.type !== "ability") continue;` — weapon and armor
  grants are parsed into the schema but not consumed at runtime.

**`removes[]` atom.**

- Schema: `[REPO: src/data/classes/class-shape.js:328–334]` —
  `REMOVE_ATOM` with `type`, `abilityType` (for ability), `armorType` (for
  armor), optional `tags[]`, optional `condition`.
- Engine resolver: `[REPO: src/engine/buildContext.js:227–239]` + helper
  `findRemovalTargets` at `[REPO: src/engine/buildContext.js:286–300]`.
  **Handles `type: "ability"` only**; line 232: `if (remove.type !==
  "ability") continue;` — weapon and armor removes are parsed but not
  consumed.
- Warlock authors no `removes[]`. Class-shape-progress.md lists expected
  consumers (Fighter Slayer → armor:plate; Druid Shapeshift Mastery →
  ability:spell tags:["spirit"]; Druid Lifebloom → ability:transformation)
  `[REPO: docs/class-shape-progress.md:72]`. None authored in migrated
  class data (only `warlock.new.js` exists post-rebuild).

**Summary.** Class-side authoring is locked + partially consumed: ability
grants/removes flow through the fixpoint; armor/weapon grants/removes are
schema-complete but runtime-inert. The item-side of the gate is entirely
absent — see § 2.7 (UI) and § 3.7 (gap).

### 2.7 Stale UI state shape (integration-seam hints)

`src/App.jsx` and `src/components/gear/*` are broken post-rebuild; per
nuance 2 of the session prompt, treat them as seam hints, not authoritative
state. Inventoried for the field-name signal they give Phase 7 wiring.

**Slot taxonomy (`[REPO: src/components/gear/slots.js:4–16]`).** 11 slots:
`weaponSlot1, weaponSlot2, head, chest, back, hands, legs, feet, ring1,
ring2, necklace`. **Matches § 4.1 / § 4.2 canonical taxonomy exactly** (same
keys, same count).

**Slot sub-shapes.**

- Weapon slots: `{ primary, secondary }` (both item-or-null) — `[REPO:
  src/data/gear-defaults.js:3–17]`.
- Armor / ring / necklace slots: item-or-null (flat).

**Item fields referenced across UI components:**

| Field | First-seen file:line | Notes |
|---|---|---|
| `item.id` | `[REPO: src/data/example-builds.js:42]` | stable identifier |
| `item.name` | `[REPO: src/components/gear/GearSlot.jsx:13]` | display |
| `item.rarity` | `[REPO: src/components/gear/GearSlot.jsx:14]` | rarity string, e.g. `"epic"` |
| `item.inherentStats[]` | `[REPO: src/components/gear/GearSlot.jsx:16]` | array of `{stat, value}` |
| `item.modifiers[]` | `[REPO: src/components/gear/GearSlot.jsx:15]` | array of `{stat, value}` |
| `item.weaponType` / `item.armorType` | `[REPO: src/data/example-builds.js:46, 84]` | weapon vs armor discriminator |
| `item.handType` | `[REPO: src/components/gear/WeaponEditor.jsx:24]` | handedness |
| `item.weaponDamage` / `item.magicalDamage` / `item.magicWeaponDamage` | `[REPO: src/components/gear/WeaponEditor.jsx:29–33]` | weapon-inherent damage values |
| `item.triggers[]` | `[REPO: src/data/example-builds.js:151]` | Spiked Gauntlet uses `{ on: "melee_hit", damage: [...], target: "enemy" }` shape |

**Weapon held state.** `[REPO: src/components/panels/GearPanel.jsx:30–32]`
encodes three values `"none" | "weaponSlot1" | "weaponSlot2"` — **divergent
from L5 canonical `"unarmed" | "slot1" | "slot2"`.** Stale-UI naming; 6.5c
shape adopts L5.

**Stale engine imports.** `[REPO: src/App.jsx:9–10]` imports
`buildEngineContext, runEffectPipeline, runTargetPipeline,
getAvailableSpells` — none exist in post-`0e69523` engine. Phase 7 must
re-wire; not a 6.5b concern.

**Note on UI-rich shape vs fixture flat shape.** The UI/example-builds shape
(11 slots, per-item rich) is **parallel and distinct** from the fixture
pass-through shape (§ 2.9) that `buildContext` consumes. No normalizer
bridges the two today; App.jsx would be the (broken) bridge. This is the
structural context for OQ-D3.

### 2.8 Legacy gear infrastructure

**`[REPO: src/data/gear-defaults.js]`** (17 lines).

- Exports `makeEmptyGear()` — returns the 11-slot shape with all slots
  initialized to `null` (weapons: `{primary: null, secondary: null}`;
  others: `null`).
- No rarity system, no stat registry, no modifier pools.
- Consumed by: `[REPO: src/data/example-builds.js:5]` only.

**`[REPO: src/data/gear/define-gear.js]`** (87 lines).

- Triggers-focused validator: validates `triggers[].{on, conditions,
  effects, damage, target}` against `GEAR_TRIGGER_EVENTS / CONDITION_TYPES
  / STAT_META / EFFECT_PHASES`.
- Test: `[REPO: src/data/gear/define-gear.test.js]` — 73 lines, 2 happy +
  4 failure cases.
- **Not imported or called anywhere at runtime.** No engine path.
- Seam-anchor value is the `triggers[]` precedent (Spiked Gauntlet in
  `[REPO: src/data/example-builds.js:151]`) — the only existing shape for
  "on hit, do X" authoring on gear. Whether this precedent becomes the
  6.5c on-hit-effects shape (§4.4 `onHitEffects[]`) is an 6.5c design call
  (§ 3.9, OQ-D6).

**Partial infrastructure.**

- Rarity registry exists: `RARITY_CONFIG` + `RARITY_ORDER` at `[REPO:
  src/data/constants.js:269–278]`. L12 modifier-count table matches code
  exactly. No consumer code validates items against it.

**Absent infrastructure.**

- No per-slot modifier pool definitions.
- No per-item `availableRarities[]` or `modifierCountOverrides` field.
- No unique-rolls-at-3× encoding of L1.
- No exclusion-group registry.
- No craftable-gear catalog or flag.

All absent items land as Net-new surface gaps in § 3; the existing rarity
registry makes § 3.5 partially Additive (§ 3.5).

### 2.9 Fixture Build shape — anchor example

**Anchor: `[REPO: bench/fixtures/max-loadout.fixture.js]`** (benchmark Build
with maximally populated gear.bonuses).

Top-level `Build` keys (from max-loadout.fixture.js lines 506–561 +
warlock-*.fixture.js:15 copies):

```
Build {
  klass,                     // class object reference
  gear,                      // {weapon, bonuses, offhand?} — engine-flat
  attributes,                // {str, vig, agi, dex, wil, kno, res}
  selectedPerks[],
  selectedSkills[],
  selectedSpells[],
  activeBuffs[],
  classResourceCounters,     // {[resourceId]: number}
  stackCounts,               // {[abilityId]: number}
  selectedTiers,             // {[spellId]: tierName}
  playerStates[],            // e.g. ["hiding"]
  weaponType,                // pre-resolved string, e.g. "axe"
  target,                    // {pdr, mdr, headshotDR, ...}
  hpFraction,                // 0.0–1.0
  // optional fixture-specific:
  isUnarmed?, _weaponMagicalDamageFlat?, viewingAfterEffect?
}
```

**Fixture `gear` sub-shape:** `{ weapon: { weaponType, baseWeaponDmg,
gearWeaponDmg, magicalDamage? } | null, bonuses: Record<StatId, number>,
offhand? }` (lines 459–500 for max-loadout; warlock fixtures use minimal
variants).

**Fixture deliberately embeds pre-flattened gear.** Per comments at `[REPO:
src/engine/buildContext.js:48–49]` the Build is expected to have upstream
normalization done — the engine consumes the pass-through. Everything in the
11-slot rich shape (§ 2.7) would need to be flattened into `gear.bonuses` to
reach the engine.

**Warlock fixtures.** Eight fixtures under `bench/fixtures/warlock-*.js`
each author the same top-level shape with class-specific selections and
minimal `gear`. `warlock-blood-pact.fixture.js:11–27` uses `gear: {weapon:
null, bonuses: {}}` and `isUnarmed: true` to exercise the unarmed path.
`warlock-exploitation-strike.fixture.js:10–26` sets
`target.maxHealth: 150`.

---

## § 3 Gap inventory

Per LOCK E, every gap is classified as one of:

- **Additive** — the new shape normalizes into the existing engine input
  seam without changing engine-module signatures or ctx shape. Normalizer
  bridges. No engine change.
- **Structural** — the existing seam must change (ctx shape extends, a
  buildContext sub-function generalizes, or an engine stage reads new
  fields). Specifies which module + signature.
- **Net-new surface** — no current code addresses this at all. 6.5c authors
  new code + data + shape.

### 3.1 Slot taxonomy + weaponHeldState

**Requirement.** § 4.1 / § 4.2: 11 slots (`weaponSlot1 / weaponSlot2` each
`{primary, secondary}`, `head / chest / back / hands / legs / feet / ring1 /
ring2 / necklace`). L5: `weaponHeldState ∈ {"unarmed" | "slot1" | "slot2"}`,
default `"unarmed"`. L6: off-loadout contributes nothing.

**Current provision.**

- 11-slot taxonomy matches exactly: `[REPO:
  src/components/gear/slots.js:4–16]` + `[REPO:
  src/data/gear-defaults.js:3–17]`. UI-side slot naming is already
  §4.1-aligned.
- Stale UI encodes held state as `"none" | "weaponSlot1" | "weaponSlot2"`
  `[REPO: src/components/panels/GearPanel.jsx:30–32]` — naming divergent
  from L5.
- **No engine-side `weaponHeldState` exists.** `buildContext` consumes a
  single `ctx.gear.weapon` (flat pass-through, § 2.3); no two-loadout +
  held-state concept.

**Classification.** **Structural.** The naming divergence is trivial (stale
UI, not a seam), but honoring L5 + L6 together requires at minimum the
normalizer picking the held loadout into `ctx.gear.weapon`, or the ctx shape
extending to carry both loadouts + the held-state discriminator. Either way,
`deriveWeaponState` at `[REPO: src/engine/buildContext.js:132–151]` needs to
generalize (or a normalizer upstream needs to absorb the pick). See § 3.10
for the dedicated two-loadout discussion.

**Design implication (for 6.5c).** Decide: normalizer picks into singular
`ctx.gear.weapon` (dormancy enforced upstream) OR ctx carries both loadouts
with a `ctx.weaponHeldState` discriminator read at each weapon-consuming
site (`projectDamage.js`, `buildContext.js` deriveWeaponState). OQ-D7.

### 3.2 Item shape (§ 4.4 examples)

**Requirement.** § 4.4: each item carries `id, name, slotType, armorType,
weaponType, handType, requiredClasses[], availableRarities[],
modifierCountOverrides, inherentStats[], socketExclusionOverrides[],
onHitEffects[]`. Inherent stats can be `{stat, value}` or `{stat, min, max}`
ranged.

**Current provision (per-field).**

| § 4.4 field | Current state |
|---|---|
| `id, name` | authored on items in `[REPO: src/data/example-builds.js:42–234]` — present |
| `slotType` | not authored on items; slot inferred from placement in 11-slot gear object (§ 2.7) |
| `armorType` | authored on armor items at `[REPO: src/data/example-builds.js:84, 105, 124, 142, 167, 185]` — **present** |
| `weaponType` | authored on weapon items at `[REPO: src/data/example-builds.js:46, 65]`; also consumed by engine as `ctx.weaponType` |
| `handType` | authored on weapon items at `[REPO: src/data/example-builds.js:47, 66]`; engine `deriveWeaponState` reads `weapon.handed` `[REPO: src/engine/buildContext.js:139]` (naming drift: `handed` vs `handType`) |
| `requiredClasses` | **absent from items in code.** No hits across `src/` |
| `availableRarities` | absent. Items carry a single `rarity: "epic"` string `[REPO: src/data/example-builds.js:45]` — no list of rolls-available rarities |
| `modifierCountOverrides` | absent |
| `inherentStats[]` | authored at `[REPO: src/data/example-builds.js:48–58, 67–75, 85–93, ...]` as arrays of `{stat, value}` — present but lacks ranged `{min, max}` form |
| `socketExclusionOverrides[]` | absent |
| `onHitEffects[]` | indirectly present via `triggers[]` precedent `[REPO: src/data/example-builds.js:151–155]` (Spiked Gauntlet). Shape differs from § 4.4's `onHitEffects[]`; see § 3.9. |

**Classification.** **Net-new surface** for most fields (slotType,
requiredClasses, availableRarities, modifierCountOverrides,
socketExclusionOverrides). **Additive** for the fields that already exist
in example-builds.js (id/name/armorType/weaponType/handType/inherentStats) —
the new shape can restructure these within the item-definition shape
without engine impact; stats flatten into `gear.bonuses` via normalizer
regardless.

**Design implication (for 6.5c).** Design the item-definition shape from
scratch (OQ-D5). Item-side authoring for `armorType` is pre-existing and
§4.4-compatible in spirit; only naming normalization (`handed` →
`handType`) and new fields are net-new on the item-definition side.

### 3.3 Stat registry (§ 4.3)

**Requirement.** L7, L11, L14, § 4.3: canonical stat ids grouped
coreAttributes / offensive / defensive / utility / weaponProperties; unit
(flat | percent) stat-determined; registry delta from current STAT_META
requires per-stat decisions (add / promote to RECIPE_IDS / new category).

**Current provision.** Inventoried in § 2.5 above — 44 exact matches, 2
naming-variants, 3 absent. STAT_META already carries `unit` on every entry.

**Classification.** **Additive** for the 44 exact-match stats (name +
unit + phase already captured; no change needed). **Structural (schema-level)**
for the two naming-variant pairs (canonical-form pick is a stat-registry
reconciliation, touches every authored reference). **Net-new surface (small)**
for the 3 inherent-only weapon-property stats (their home category is
currently implicit; see § 3.8).

**Design implication (for 6.5c).** Resolve OQ-D4 (registry reconciliation):
pick canonical names for the two variants; decide per-stat whether §4.3
registry replaces STAT_META's gearStat subset, supplements it, or triggers a
migration. Plus the per-stat nuance for `maxHealth` / `maxHealthBonus`
(§2.5 refinement).

### 3.4 Per-slot modifier pools (§ 4.5 — 10 pools)

**Requirement.** § 4.5: 10 pools (`weapon_twoHanded, weapon_oneHanded, chest,
hands, head, legs, feet, back, ring, necklace`), each entry `{ stat,
socketRange, naturalRange, unit, exclusionGroup?, naturalRangeVerified? }`.
Authority over which stats roll on which slot and at what ranges.

**Current provision.** **Entirely absent.** No per-slot pool registry, no
socket/natural-range structures, no exclusion-group-on-entry field. Items
in `example-builds.js` hand-author a `modifiers[]` array of `{stat, value}`
without any schema enforcement about pool-membership or range legality.

**Classification.** **Net-new surface** — all 10 pools + all range
structures.

**Design implication (for 6.5c).** Decide pool-registry home (a single
`src/data/gear/modifier-pools.js`? per-slot files?), entry shape, and how
the validator (OQ-D9) consumes the pool to enforce "this stat can roll on
this slot" + "value within range." Not scoped here.

### 3.5 Rarity + modifier count

**Requirement.** L1 (unique: 1 modifier at 3× normal), L12 (standard count
table poor=0 / common=0 / uncommon=1 / rare=2 / epic=3 / legendary=4 /
unique=1 at 3×), plus `modifierCountOverrides` per item, plus
`[WIKI-FACTS § 9.4]` craftable-gear +1-per-rarity rule.

**Current provision.** **Partial — registry exists, integration does not.**
`[REPO: src/data/constants.js:269–278]` defines `RARITY_CONFIG` with
`{label, modCount, color}` per rarity and `RARITY_ORDER =
["poor","common","uncommon","rare","epic","legendary","unique"]`. The
modifier-count table in `RARITY_CONFIG` **exactly matches L12 for standard
rarities** (poor=0 / common=0 / uncommon=1 / rare=2 / epic=3 /
legendary=4 / unique=1). L1's unique-rolls-at-3× rule is not encoded
anywhere. Items in `example-builds.js` carry a single `rarity: "epic"`
string but no consumer validates against `RARITY_ORDER`; no code reads
`RARITY_CONFIG.modCount` for a count-check; no `availableRarities[]` or
`modifierCountOverrides` field exists on items.

**Classification.** **Additive (rarity enum + modCount table)** — already
in code; the new shape can reference these. **Net-new surface (everything
else)** — `availableRarities[]` per item, `modifierCountOverrides` per
item, unique-3×-range semantics, craftable +1-per-rarity rule, and any
validator that enforces "items at rarity R have RARITY_CONFIG[R].modCount
modifiers (plus overrides)."

**Design implication (for 6.5c).** Decide whether to represent craftable
as a per-item `modifierCountOverrides` per rarity or as a class-wide
`craftable: true` flag triggering +1 per rarity `[WIKI-FACTS § 9.4]`. Surface
as a secondary OQ (refinement to OQ-D1 / D5).

### 3.6 Modifier exclusion rules

**Requirement.** § 4.6: `generalRule: "inherent_blocks_self"`, named
`exclusionGroups` (currently `ar_pdr`), optional `dominantBlocker` pattern,
`socketExclusionOverrides[]` per item. Plus L13 natural-vs-socketed
distinction. Plus `[WIKI-FACTS § 9.6]` listing 4 wiki-confirmed modifier
families (Physical+Magical True; Additional+True Physical; MaxHealth+
MaxHealthBonus; AddMovespeed+MovespeedBonus).

**Current provision.** **Entirely absent.** No exclusion-group registry, no
per-item `socketExclusionOverrides`, no natural-vs-socketed labeling.

**Classification.** **Net-new surface.**

**Design implication (for 6.5c).** Design exclusion-group registry,
per-item override shape, and (per OQ-D1) decide natural-vs-socketed
distinction representation. Wiki lists 4 families; only `ar_pdr` is
currently in §4.6 — 6.5c decides which of the other 3 become live families
in Season 8 (two are defunct per Season-8 removals `[REPO:
docs/season8_constants.md:76]`, one is moveSpeed-family with UNRESOLVED
socketable status per `[WIKI-FACTS § 15 item 9]`).

### 3.7 Class gating (L9 jewelry, L10 requiredClasses + armorProficiency)

**Requirement.** L10 wearable-check algorithm: if `item.requiredClasses`
non-empty → char's class must be in list OR class has blanket grant of the
item's armor type; if empty → any class with `armorType ∈ armorProficiency`
(or granted) wearable; `removes[]` subtracts. L9: jewelry no class gating.

**Current provision (split by side of the gate).**

- **Class side — partial.** `armorProficiency` authored + validated;
  `grants[] / removes[]` authored + validated; engine consumes ability
  grants/removes only (§ 2.6).
- **Item side — entirely absent from engine consumption.** `armorType` IS
  authored on items in `[REPO: src/data/example-builds.js:84, 105, 124,
  142, 167, 185]` — the authoring shape is pre-existing and §4.4-compatible.
  `requiredClasses` is not authored on any item in code today. **The gap is
  not missing authoring; the gap is that no engine code reads
  `item.armorType` or `item.requiredClasses` for a wearability check.**

**Classification.** **Structural (class-side, partial existing seam).** The
grant/remove fixpoint at `[REPO: src/engine/buildContext.js:213–239]`
already loops over grants/removes; extending it to consume
`type: "armor"` / `type: "weapon"` variants is a localized signature
change. **Net-new surface (item-side gate code).** No existing function
validates `item.requiredClasses + item.armorType` against
`class.armorProficiency + grants + removes`. The shape to validate against
exists; the validator does not.

**Design implication (for 6.5c).** Decide validator location (OQ-D9):
separate `gear-shape-validator.js`? in buildContext as part of the
availability resolver? — and the wearable-check algorithm's algorithmic
form (class-data-driven predicate vs engine-level function). § 4 roll-up
notes the engine-side extension site.

### 3.8 Inherent-only weapon/shield properties (L4, L5)

**Requirement.** L4 inherent-only: `comboMultiplier, impactZone,
swingTiming` + L4 addendum `impactPower, impactResistance`.

**Current provision.** `comboMultiplier` and `impactZone` are engine-consumed
via fixture-supplied private ctx fields `ctx.comboMultiplier` /
`ctx.impactZone` at `[REPO: src/engine/projectDamage.js:149–150]`; no gear
shape authors them as item-inherents — they bypass the item shape.
`swingTiming` has no engine consumer. `impactPower` + `impactResistance`
exist in STAT_META (§ 2.5) without gear-shape home.

**Classification.** **Net-new surface (unified).** All five inherent-only
weapon-properties lack a gear-shape home for authoring on the item; the
engine already consumes two of them but via fixture side-channels, not via
an item → ctx flow.

**Design implication (for 6.5c).** Decide the item-side shape for inherent
weapon properties (combo stages, impact zones, swing timing per combo
stage, impact power/resistance) — complex because per-weapon values are
structured (per `[WIKI-FACTS § 2.5, § 3]`: e.g., `comboMultiplier` is a
per-combo-stage array, not a single number; `swingTiming` is per-stage
windup/hit/recovery times). Normalizer path from the new item shape to
`ctx.{comboMultiplier, impactZone, ...}` replaces the fixture side-channel.

### 3.9 On-hit effects (Spiked Gauntlet — OQ-D6 routing)

**Requirement.** § 4.4 Spiked Gauntlet authoring:
```
onHitEffects: [{ damage: 1, damageType: "true_physical", trueDamage: true,
  scaling: "attributeBonusRatio", separateInstance: false,
  notes: "Included in main damage number, not a separate hit" }]
```
Per `[WIKI-FACTS § 11.1]`: this +1 is VERIFIED at `[REPO:
docs/damage_formulas.md:33, 100–113, 155–159]` — added after `floor()` as
True Physical Damage term, not a separate projection.

**Current provision.**

- Legacy seam anchor: the `triggers[]` shape authored on Spiked Gauntlet in
  `[REPO: src/data/example-builds.js:151–155]` (`{ on: "melee_hit", damage:
  [{ damageType: "true_physical", base: 1, trueDamage: true }], target:
  "enemy" }`). Validator exists at `[REPO:
  src/data/gear/define-gear.js:23–48]` — not wired at runtime.
- Engine path: `projectDamage.js` has no read for gear-side on-hit riders.
  Stage-6 math entry points that would plausibly consume the +1:
  - Physical damage pre-DR math at `[REPO:
    src/engine/projectDamage.js:70, 100–101, 144–150, 173]`
    (computePhysicalPreDR).
  - True-damage post-DR additive at `[REPO:
    src/engine/projectDamage.js:155–159]` equivalents (per `[REPO:
    docs/damage_formulas.md:155–159]` — the VERIFIED position for
    Spiked Gauntlet's true physical).
- `ctx.gear.bonuses` is a flat `Record<StatId, number>` (§ 2.3) — has no
  field for "flat amount added into every primary physical hit," per the
  existing parking in `[REPO: docs/class-shape-progress.md:219–236]`.

**Classification.** **Structural.** A seam in `projectDamage.js` needs a
new read — either from a new `ctx.gear.onHitRiders[]` field (per `[REPO:
docs/class-shape-progress.md:228–229]` candidate a) or from a new
synthetic STAT_META key in `bonuses` (candidate b). OQ-D6 picks.

**Design implication (for 6.5c).** Resolve OQ-D6. Mapping surfaces the
VERIFIED math position (post-floor, true-physical-additive) so the shape
choice routes correctly. Either candidate lands at the same math position;
they differ in where the data lives (gear sub-shape vs STAT_META bonuses
map).

### 3.10 Two-weapon loadout + held-state in ctx/engine (OQ-D7)

**Requirement.** L5 + L6 + § 4.1: `gear.weaponSlot1 / weaponSlot2` each
`{primary, secondary}`; `weaponHeldState ∈ {"unarmed" | "slot1" | "slot2"}`;
only held loadout contributes.

**Current provision.** Engine consumes a single `ctx.gear.weapon` (§ 2.3).
`deriveWeaponState` reads `build.gear.weapon` and `build.gear.offhand` (for
dual-wielding only) `[REPO: src/engine/buildContext.js:132–151]`. No ctx
field encodes which of two loadouts is "held." No off-loadout dormancy is
enforced because no off-loadout exists at the ctx layer today.

**Classification.** **Structural.** Either (a) normalizer picks the held
loadout + secondary and writes singular `ctx.gear.weapon` / `ctx.gear.offhand`
— engine unchanged; or (b) ctx carries both loadouts + a discriminator —
`deriveWeaponState` + every `ctx.gear.weapon` read site extends. Both are
legitimate; mapping flags both as viable without picking.

**Design implication (for 6.5c).** Resolve OQ-D7. If (a): normalizer
location (OQ-D3) is load-bearing — the pick happens upstream of the engine.
If (b): list engine-module signature changes (enumerated in § 4).

### 3.11 Character shape (OQ-D2)

**Requirement.** OQ-D2: "Character" = identity (name, class, religion) +
persistent selections (perks/skills/spells) + gear-loadout reference +
attribute allocation + multi-character persistence option. Design target:
save-able state + live state coexist cleanly.

**Current provision.** **No `Character` surface exists** in the codebase.
The Build (§ 2.9) is session state conflating identity-like + selection +
session-overlay. Stale App.jsx state holds selections per-class in a React
state tree; no persistence layer exists (no localStorage / indexedDB /
server calls for saved builds). Per LOCK F: "almost all identity-like
fields currently live in Build or stale App.jsx." Confirmed by inventory:

- Identity (name / religion): nowhere.
- Class: `build.klass` at `[REPO: src/engine/buildContext.js:41]`.
- Persistent selections: `build.selectedPerks / Skills / Spells` at `[REPO:
  src/engine/buildContext.js:56–58]`.
- Gear-loadout reference: `build.gear` at `[REPO:
  src/engine/buildContext.js:95]`.
- Attribute allocation: `build.attributes` at `[REPO:
  src/engine/buildContext.js:50]` (pre-summed base + gear — the pre-summing
  itself assumes a character allocation step upstream that does not exist).
- Multi-character save: not implemented. Per `[REPO:
  /home/edis/.claude/projects/-mnt-c-Users-itsth-projects-dnd-stat-simulator/memory/project_shareable_builds.md]`
  (user memory), shareable/saved builds are a deferred feature.

**Classification.** **Net-new surface** (per LOCK F). No current seam
covers Character as a first-class concept.

**Design implication (for 6.5c).** Resolve OQ-D2. Mapping surfaces what IS
there (Build conflation); 6.5c decides whether Character is a persistent
subset wrapped by live Build overlay, a separate exported shape, or
something else.

### 3.12 Normalizer location (OQ-D3)

**Requirement.** OQ-D3: whether the new Gear + Character shapes normalize
upstream of `buildContext` (engine unchanged, normalizer module feeds
engine-compatible Build) or are consumed directly by a refactored
`buildContext` (engine changes to accept richer shape). Third bad option:
normalizer lives in App.jsx.

**Current provision.** No normalizer exists. The fixture flat shape (§ 2.9)
is authored directly; the UI rich shape (§ 2.7) never reaches the engine.
App.jsx would be the bridge today but is broken. Two parallel shapes, no
normalizer.

**Classification.** **Structural** (if the normalizer lives in
`buildContext`) OR **Net-new surface** (if the normalizer is a new
upstream module). Which one this gap becomes is the design call.

**Design implication (for 6.5c).** Resolve OQ-D3. Mapping surfaces the
existing seam signatures: `buildContext(build) → ctx` expects flat
`gear.{weapon, bonuses}`. Normalizer has to produce that shape (or the
engine has to be refactored to consume richer input). Either choice
ripples through Phase 7 wiring.

---

## § 4 Design implications for 6.5c — Structural gap roll-up

Compiled from § 3. Every gap classified **Structural** requires at minimum
one of the following engine-side signature-level changes if 6.5c picks the
engine-touching path:

| Structural gap (§) | Module affected | Current signature / entry point | What changes |
|---|---|---|---|
| § 3.1 + § 3.10 (held-state / two-loadout — OQ-D7 path "b") | `src/engine/buildContext.js` — `deriveWeaponState` at lines 132–151 | reads `build.gear.weapon` + `build.gear.offhand.weaponType` | generalize to read both loadouts + `weaponHeldState` discriminator; write to `ctx.gear.weapon` (current) OR `ctx.gear.weaponSlot1 / weaponSlot2 + ctx.weaponHeldState` (new) |
| § 3.7 (class-side grants/removes weapon+armor wiring — L10 blanket case) | `src/engine/buildContext.js` — grants fixpoint lines 213–225; removes fixpoint lines 227–239 | filters `if (grant/remove.type !== "ability") continue` | extend to handle `type: "weapon"` / `type: "armor"` into a resolved weapon/armor proficiency set consumed by the item-side check |
| § 3.7 (item-side gate) | `src/engine/buildContext.js` — new function adjacent to `resolveAvailability` OR standalone validator `src/data/gear/gear-shape-validator.js` (OQ-D9) | n/a (no current) | reads `ctx.klass.armorProficiency + ctx.grantedArmorTypes − ctx.removedArmorTypes` + `item.armorType + item.requiredClasses`; returns wearability predicate per slot |
| § 3.9 (on-hit riders — OQ-D6) | `src/engine/projectDamage.js` — post-floor true-physical additive at lines 155–159 (per `[REPO: docs/damage_formulas.md:155–159]` VERIFIED position) | no current read of gear on-hit riders | reads either `ctx.gear.onHitRiders[]` (candidate a) or a new STAT_META key in `ctx.gear.bonuses` (candidate b); adds into physical damage at the VERIFIED formula position |
| § 3.8 (inherent-only weapon properties) | `src/engine/buildContext.js` + normalizer | current: `ctx.comboMultiplier / impactZone` are fixture-supplied private fields | normalizer reads from item's new inherent-shape (combo-stage arrays, impact-zone structure, swing-timing sub-structure) and writes into ctx. Fixture side-channel retires. |
| § 3.1 (weaponHeldState naming) | `src/components/panels/GearPanel.jsx:30–32` | stale UI values `"none" / "weaponSlot1" / "weaponSlot2"` | Phase 7 wiring concern, not 6.5c; flag so Phase 7 adopts L5 naming |

**Non-Structural gaps (roll-up for scope awareness):**

- **Additive:** § 3.2 (partial — id/name/armorType/weaponType/handType
  restructurable within item shape); § 3.3 (44 exact-match stats).
- **Net-new surface:** § 3.2 (missing fields), § 3.4, § 3.5, § 3.6,
  § 3.7 (item-side validator code), § 3.8 (inherent weapon-property shape
  in item file), § 3.11 (Character shape), potentially § 3.12
  (normalizer-as-module path).

---

## § 5 Refined OQ-D list

Each entry: original question (terse restate), what mapping surfaced,
candidate options (when clearly viable from mapping), non-answer stance.

### OQ-D1 — Natural vs socketed distinction in simulator

**Original.** Merged (user picks in whichever range — natural-max is upper
bound) vs split (natural or socketed per stat). Affects item-instance shape
+ UI.

**Mapping surfaced.** Neither representation exists today. `[REPO:
src/data/example-builds.js]` item modifiers are `{stat, value}` with no
natural-vs-socketed label; engine consumes only the final flat number. So
the choice is purely in the item-instance / gear-shape layer, no engine
implication either way. Wiki confirms (`[WIKI-FACTS § 9.5]`) socketed ≤
natural in every pool — split representation can store which range was used
at acquisition.

**Candidate options.** (a) merged; (b) split with per-modifier `source:
"natural" | "socketed"` flag; (c) split with two fields (current value +
craft-overwrite value, unioned at display time).

**Non-answer.** Mapping does not imply a winner; 6.5c picks based on UI
legitimacy semantics.

### OQ-D2 — Character shape boundary

**Original.** What is "Character"? Identity + selections + gear ref +
attributes + multi-character persistence?

**Mapping surfaced.** § 3.11 details: no Character surface today; identity
(name / religion) is nowhere; selections + gear + attributes live on Build;
no persistence layer exists. Per LOCK F this is **Net-new surface**.

**Candidate options.** (a) Character is a persistent subset embedded in
Build (dehydration path); (b) Character is a separate shape with a
build-time overlay (live Build composes Character + session-toggle
state); (c) Character is a thin identity-only wrapper + the Build holds
everything else.

**Non-answer.** Mapping surfaces the gap cleanly; 6.5c picks based on
OQ-D2 sub-questions (name/religion scope, multi-character yes/no).

### OQ-D3 — Normalizer location + shape

**Original.** Normalizer inside `buildContext` (engine changes) vs
upstream module (engine unchanged) vs in App.jsx (anti-pattern).

**Mapping surfaced.** § 3.12: no normalizer exists today; two parallel
shapes (fixture flat, UI rich) meet nowhere. Current `buildContext`
signature is `(build) → ctx` expecting flat `gear.{weapon, bonuses}`. The
new Gear shape (per-slot items with rarity, inherent + modifiers,
exclusion rules, held-state) is richer than what buildContext consumes.

**Candidate options.** (a) new upstream normalizer module (e.g.,
`src/engine/normalizeBuild.js`) that flattens rich Build into the current
buildContext-accepted shape — engine contract unchanged; (b)
`buildContext` refactored to consume rich Build directly — engine
signature changes; (c) explicit split: `normalizeBuild` produces the
fixture-equivalent flat Build, consumed by buildContext unchanged — but
lives with the engine module for cohesion.

**Non-answer.** Mapping implies (a) is the lowest-disruption path
(existing seam preserved) but 6.5c decides based on whether the richer
shape makes buildContext cleaner overall. Either way, App.jsx should NOT
be the normalizer (per nuance 2 + LOCK G spirit).

### OQ-D4 — Stat-registry reconciliation with STAT_META

**Original.** Replace STAT_META / merge / migration plan.

**Mapping surfaced.** § 2.5 coverage: 44 exact + 2 naming-variant + 3
absent (weapon-properties). 48 STAT_META entries outside §4.3 registry are
**correctly outside** — class-authored, not gear-rollable. Per §2.5
refinement: the "don't blanket-reconcile" rule does not mean ignore
per-stat; `maxHealth` / `maxHealthBonus` per L7 are mechanically distinct
stats (load-bearing pair).

**Candidate options.** (a) §4.3 registry + STAT_META coexist — registry is
the authoritative "gear-rollable stat" set, STAT_META keeps everything
else; (b) merge (every §4.3 stat lands in STAT_META; gearStat flag marks
§4.3 membership); (c) split: §4.3 → `src/data/gear/stat-registry.js`, rest
stays in STAT_META, consumers read both.

**Non-answer.** Mapping implies (b) is minimal-disruption (STAT_META
already has 44 / 49 with the right flag). Per-stat decisions remain for
cases like `maxHealthBonus` — surfaced, not resolved.

### OQ-D5 — Item instance vs item definition

**Original.** Embedded-in-one-file vs definition + instance-overlay vs
tiered (base → rarity variant → user-instance).

**Mapping surfaced.** Current `example-builds.js` items embed everything
(id, name, rarity, armorType/weaponType, inherentStats, modifiers) in one
object — no definition/instance split. No multi-rarity variant authoring
pattern (items carry `rarity: "epic"` singular; § 4.4
`availableRarities[]` has no precedent). No tiered progression (Arming
Sword's per-rarity damage progression, per `[WIKI-FACTS § 10]`, has no
current shape).

**Candidate options.** (a) single-file per item with `availableRarities[]`
branching inside; (b) definition file + user-rolled-instance separate;
(c) tiered (base → rarity variant → instance) for multi-rarity weapons,
flat for fixed-rarity items.

**Non-answer.** Mapping does not imply a winner.

### OQ-D6 — On-hit effect pipeline routing

**Original.** DAMAGE_ATOM field / Gear-shape field / STAT_META key.

**Mapping surfaced.** § 3.9: no current engine read for gear on-hit
riders; VERIFIED math position known (`[REPO:
docs/damage_formulas.md:155–159]` — post-floor true-physical additive);
two candidate shapes from `[REPO: docs/class-shape-progress.md:228–229]`.

**Candidate options.** (a) extend gear sub-shape on ctx:
`ctx.gear.onHitRiders[] = [{amount, damageType, trueDamage, scaling}]`,
consumed at Stage 6; (b) synthesize STAT_META key (e.g.,
`additionalTruePhysicalDamage`), `projectDamage` reads from
`ctx.gear.bonuses`; (c) extend DAMAGE_ATOM shape (per OQ-D6 original
option).

**Non-answer.** Mapping surfaces VERIFIED position for all three
candidates to land at the same math location. 6.5c picks based on where
the data fits naturally (gear shape vs STAT_META vs atom).

### OQ-D7 — Two weapon loadouts in ctx + engine

**Original.** Pass only held loadout (ctx unchanged) vs pass both +
held-state (ctx extended).

**Mapping surfaced.** § 3.10: current ctx has singular
`ctx.gear.weapon`; `deriveWeaponState` already handles override logic;
normalizer-picks path (a) is the simpler; ctx-carries-both path (b)
extends the engine surface.

**Candidate options.** (a) normalizer picks the held loadout; engine
unchanged — L6 dormancy enforced upstream; (b) ctx carries both loadouts
+ `ctx.weaponHeldState`; engine reads discriminator wherever it consumes
weapon.

**Non-answer.** Mapping does not pick. (a) is least disruption (matches
L6 natural semantics); (b) enables future features (e.g., surface both
loadouts' damage projections).

### OQ-D8 — Inherent stat materialization order

**Original.** Pick inherent → compute available pool → pick socketed →
validate exclusion-group membership.

**Mapping surfaced.** No current materialization pipeline; items are
hand-authored with mod arrays. Validator would be net-new.

**Candidate options.** Not Mapping scope — this is an algorithmic
specification 6.5c authors. Mapping confirms no precedent exists to
conflict with.

**Non-answer.** Mapping has no input beyond "no precedent."

### OQ-D9 — Gear validator scope

**Original.** Item-definition-structural vs item-instance (within range,
exclusions) vs character+gear consistency (requiredClasses check).

**Mapping surfaced.** `[REPO: src/data/gear/define-gear.js]` validates
triggers-focused fields only, not wired at runtime. No instance
validator, no character+gear validator. Class-shape validator at `[REPO:
src/data/classes/class-shape-validator.js:245–250]` validates
`armorProficiency` values but not cross-with-items.

**Candidate options.** (a) three-tier validator (definition / instance /
character-gear); (b) single validator with mode flag; (c) engine-embedded
per-stage validation (anti-pattern per perspective.md §6).

**Non-answer.** Mapping implies three-tier is natural from authorship
separation (definition = design-time-authored item-file; instance =
user-picked rolls; character-gear = wearability at runtime), but 6.5c
picks.

### OQ-D10 — Shape file locations + naming

**Original.** `src/data/gear/gear-shape.js` + `src/data/character/character-shape.js` vs
unified `src/data/<shape>.js` vs item definitions per-file vs single registry.

**Mapping surfaced.** Current class shape lives at
`src/data/classes/class-shape.js` (single file). Gear infra under
`src/data/gear/` currently exists (define-gear.js + test). No
`src/data/character/` directory exists. Item-definitions currently live
in `src/data/example-builds.js` (ad-hoc, not per-file).

**Candidate options.** Naming parallel to class is the path-of-least-
surprise: `src/data/gear/gear-shape.js` + `src/data/character/character-shape.js`
+ per-item files under `src/data/gear/items/<id>.js` (parallels class
migration in Phase 10 style). Alternatives as listed.

**Non-answer.** 6.5c picks. Mapping notes existing `src/data/gear/`
directory as a natural home with seam continuity.

### New OQ-Ds surfaced by mapping

- **OQ-D11 (new — craftable-gear rule representation).** `[WIKI-FACTS
  § 9.4]` introduces +1-per-rarity for craftable gear. Represent as
  per-item `modifierCountOverrides: { rare: 3, epic: 4, ... }` or as a
  class-wide `craftable: true` flag with rule-based count lookup? Mapping
  surfaces as a refinement of OQ-D1 / D5; 6.5c decides. Non-answer
  stance.
- **OQ-D12 (new — `handType` / `handed` naming drift).** Engine's
  `deriveWeaponState` reads `weapon.handed` `[REPO:
  src/engine/buildContext.js:139]`; § 4.4 spec uses `handType`.
  Canonical name for the new shape is 6.5c's pick; either the shape
  adopts `handed` (matches engine) or the engine adopts `handType`
  (matches §4.4). Non-answer.

---

## § 6 Cascade from Phase 6.5a UNRESOLVED

Per `[WIKI-FACTS § 15]` — 17 UNRESOLVED items. Below: which cascade into
6.5c design problems vs which stay as deferred research (Phase 11+ gear
authoring, Phase 10 class migration, or in-game testing).

| § 15 item | Summary | Cascades to 6.5c? |
|---|---|---|
| 1 | `demonDamageBonus` / `undeadDamageBonus` multiplicative_layer modeling | **No** — engine gap, Phase 11+ creature-type targeting. Not a shape gap. |
| 2 | `impactZone` per-weapon zone-to-region mapping | **No** — shape carries `impactZone` per-stage; numeric authoring is Phase 11+. |
| 3 | per-weapon `impactPower` values | **No** — same; shape-only accommodation in 6.5c. |
| 4 | `swingTiming` exhaustive per-weapon | **No** — shape carries the field; value scrape Phase 11+. |
| 5 | combo data for under-sampled weapon types | **No** — shape-only in 6.5c. |
| 6 | `"magicStuff"` gating of spells/abilities | **No** — Phase 10 (class audit). |
| 7 | formal wiki never-socketable list | **Yes (secondary).** Matters for the "never-socketable stats" list in the new shape (§ 3.4 pool authoring). `moveSpeed / moveSpeedBonus` family specifically under-sampled — may need in-game follow-up before final pool content. |
| 8 | Unique row modifier count (wiki 5 vs L12 1 at 3×) | **No** — L12 has precedence per `[WIKI-FACTS § 15 item 8]`. Recorded for posterity. |
| 9 | modifier families beyond `ar_pdr` | **Yes (design).** § 3.6: 6.5c decides which of the 4 wiki-listed families land as live exclusion groups in Season 8 (two are defunct, one is moveSpeed-family under-verified, `ar_pdr` is already named). |
| 10 | per-item ranged-inherent full catalog | **No** — shape accommodates `{min, max}` inherents; value scrape Phase 11+. |
| 11 | Spiked Gauntlet `scaling` exact value | **No** — shape-level decision (OQ-D6); value is likely 1.0 per convention. In-game testing resolves number, not shape. |
| 12 | other gear items with on-hit procs | **No** — shape accommodates `onHitEffects[]`; catalog is Phase 11+. |
| 13 | exhaustive class grants/removes catalog | **No** — Phase 10. |
| 14 | weapons with empty `requiredClasses` | **No** — shape accommodates empty list; catalog is Phase 11+. |
| 15 | natural-range discrepancies (2H `additionalMemoryCapacity`, 2H `physicalHealing / magicalHealing`) | **Partial** — metadata already updated per `[REPO: docs/session-prompts/gear-shape-design.md:1062]` revision log for healing pair; `additionalMemoryCapacity` 2H may still need correction. 6.5c should consult §4.5 as-of-commit-7ba5734+d7291e9 and note remaining delta if any. |
| 16 | R3 Delta from VERIFIED formula (6 deltas) | **No** — Phase 11+ simulator-accuracy. |
| 17 | Wiki version drift (Hotfix 112-1 vs 113) | **No** — routine re-sync when project patches. |

**Cascades-to-6.5c summary.** 2 primary (§9 families; §7 never-socketable
refinement for moveSpeed family), 1 partial (§15 natural-range
corrections). Remaining 14 are deferred research (Phase 10 or Phase 11+)
or recorded-not-signal.

---

## § 7 Revision log

- **2026-04-17 — Initial draft (Phase 6.5b Stage 4).** Full current-state
  map, gap inventory, design implications, refined OQ-D list, UNRESOLVED
  cascade. Authored per Plan Report signed off 2026-04-17 with three
  refinements absorbed (L7 maxHealth/maxHealthBonus nuance in §2.5,
  impactResistance phrasing in §2.5, §3.7 armorType-already-authored
  framing).
