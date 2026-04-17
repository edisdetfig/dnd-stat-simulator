# Gear & Character Shape — Design Source of Truth

Durable working doc for Phase 6.5 (Gear & Character Shape) work. Owned by the coordinator. Every session in this phase — 6.5a (wiki facts), 6.5b (current-state mapping + gap analysis), 6.5c (shape design) — reads this first and treats it as canonical input.

This document is not a session prompt. It is the **data source the session prompts point at**.

---

## 1. Framing — the rules this phase operates under

**Clean-slate shape design.** The Gear shape and the Character shape are being designed from the ground up, based on the requirements captured below. Current shapes across the codebase are **not templates**. Do not begin shape design by translating existing structures; begin it by reading §4 (metadata) and §3 (locked decisions) and asking what shape those facts imply.

**Authoritative data source.** The metadata in §4, plus the locked decisions in §3, is **the authoritative data source for every gear-piece example, every inherent stat, every random-modifier slot, every rarity-tier decision, and every exclusion rule** this phase produces.

**Silence rule — surface, do not invent.** Where the metadata is silent on a question, surface it as an **Open Question** in the current session's report. Do not invent values, rules, or behaviors to fill gaps. The wiki (Phase 6.5a) and the user resolve silences; sessions do not.

**Conflict rule — metadata wins.** Where the metadata conflicts with current code (e.g., stat-id naming divergence), the metadata wins for the new shape. The seam either adapts (via normalizer) or the engine changes to accept the new shape — both are legitimate paths, chosen deliberately in Session 6.5c.

**Integration seams only.** The following current-code files are integration seams — **read them to know what the engine consumes today, not to copy their structure**:

| File | What it contributes to the seam |
|---|---|
| `src/engine/buildContext.js` | Consumes `build.gear.{weapon, bonuses, offhand}`, `build.attributes` (pre-summed base + gear), `build.weaponType` (pre-resolved), `build.target`, `build.hpFraction`, plus selected/active sets. Produces `ctx`. |
| `src/engine/aggregate.js` | Reads `ctx.gear.bonuses` (flat `Record<StatId, number>`) and folds into `bonuses[stat].gear` at Stage 4. |
| `src/engine/projectDamage.js` | Reads `ctx.gear.weapon.{baseWeaponDmg, gearWeaponDmg, magicalDamage}` and other weapon sub-fields during Stage 6. |
| `src/data/stat-meta.js` | Current STAT_META — stat registry + phase/direction metadata. New registry (§4.3) forces reconciliation. |
| `src/data/gear-defaults.js` | Pre-rebuild `makeEmptyGear()` with slot names. Reference for the UI slot shape App.jsx expects; not a template for the Gear shape. |
| `src/data/gear/define-gear.js` | Pre-rebuild gear validator (triggers[]-focused). Legacy. |
| `bench/fixtures/max-loadout.fixture.js` | Exemplar `Build` + flat `gear` object. Closest working shape to match or deliberately diverge from. |
| `src/data/classes/class-shape.js` — `armorProficiency` | Already-locked class-root field (see `class-shape-progress.md` locked decisions). New Gear shape respects the `armorProficiency` contract when authoring armor items. |

Changing any of these is an explicit **seam change** decision in Session 6.5c, not a free side-effect.

---

## 2. Phase 6.5 sub-phase sequence

| Sub-phase | Session name | Scope | Output |
|---|---|---|---|
| 6.5a | Gear Wiki Facts | Research-only. Pull wiki-sourced mechanics for every gear-related question the metadata doesn't answer. No design, no code. | `docs/gear-wiki-facts.md` — topic-keyed facts with citations, verification levels, and residual OQs. |
| 6.5b | Gear & Character Mapping | Research-only. Map current-state integration seams. Gap-analyze against (this doc ∪ 6.5a facts). No design. | Mapping doc + gap inventory + refined OQ list. |
| 6.5c | Gear & Character Shape Design | Clean-slate design. Produces the two new shapes, normalizer spec, validator spec. Paths TBD by 6.5c. | Shape files + examples + normalizer spec + validator spec. No UI yet (Phase 7 / 11). |

Sub-phase gates are coordinator-enforced: 6.5a and 6.5b must pass Completion-Report sign-off before 6.5c begins. Each sub-phase prompt lives under `docs/session-prompts/`.

---

## 3. Locked decisions (coordinator — binding for all 6.5 sub-phases)

These are settled decisions derived from conversation with the user. Sessions do not re-litigate them.

### L1 — Unique rarity behavior
A `unique` rarity item has **1 modifier**, which rolls within **3× the normal range**. Example: if the normal range for that modifier is 1–2%, the unique rolls 3–6%.

### L2 — Weapon categorization axes
Five orthogonal axes describe a weapon:

1. **`slotType`** — `primaryWeapon` or `secondaryWeapon`. Governs which of the loadout's two slots the weapon fills.
2. **`handType`** — `oneHanded` or `twoHanded`. Two-handed weapons are always primary; they preclude any secondary in the same loadout.
3. **`weaponType`** — vocabulary entry (`sword`, `axe`, `dagger`, `spellbook`, etc.). May be **a single string or an array**; see L2.1 below.
4. **`rarity`** — per item's `availableRarities`.
5. **`requiredClasses`** — per item's `requiredClasses` (empty = any class with armor proficiency).

**L2.1 — `weaponType` array semantics.** When an item's `weaponType` is an array (e.g., Frostlight Crystal Sword: `["sword", "magicStuff"]`), the weapon satisfies any condition `{ type: "weapon_type", weaponType: T }` where `T` is a member of the array. `"magicStuff"` is a real vocabulary entry, not placeholder (exact semantic domain to be confirmed by Phase 6.5a / vocabulary audit).

**L2.2 — Secondary weapon rules.** Not all one-handed weapons have secondary variants; not all weapon types do. Weapon types that *do* have secondary variants include at least daggers, axes, swords, and shields (Phase 6.5a confirms the full list). Shields have an unusual case: at least one primary+two-handed shield exists.

**L2.3 — Terminology.** Use "Secondary Weapon" (matches game terminology), not "offhand".

### L3 — Stat range provenance
- **Inherent stat ranges** are determined **per item** — item metadata carries the range.
- **Random-modifier stat ranges** are determined by `(stat × item-type)` — the same stat can roll different ranges on different slot types (e.g., `physicalDamageBonus` has different ranges on weapon_twoHanded vs chest vs back).
- Not all stats are available on all item types; the per-slot modifier pools (§4.4) encode which stats apply where.

### L4 — Weapon property stats are inherent-only
`comboMultiplier`, `impactZone`, `swingTiming` are **inherent-only** (never appear in modifier pools). They differ per weapon.

**Plus: `impactPower` and `impactResistance`.** Weapons and shields also carry Impact Power and/or Impact Resistance depending on the item. These are inherent-only weapon/shield properties and must be captured in the shape + displayed in the UI.

**Display requirement:** the simulator must surface the full hit combo with per-stage damage per weapon. The math for each stage needs wiki citation (6.5a scope).

### L5 — Weapon held state
`weaponHeldState` values: `"unarmed" | "slot1" | "slot2"`. Default: `"unarmed"`.

`"unarmed"` aligns with `weapon_type: "unarmed"` conditions — same underlying state.

Only the held loadout contributes stats (see L6).

### L6 — Off-loadout is dormant
The non-held weapon loadout contributes **nothing** to snapshot stats — neither inherent stats nor socketed modifiers. Only the currently-held weapon (per `weaponHeldState`) contributes.

### L7 — "Bonus" suffix is context-sensitive
The `Bonus` suffix on a stat name is **sometimes a naming variant** and **sometimes load-bearing**. Session 6.5c must audit each case:

- **Naming variant (same stat):** e.g., `physicalDamageReduction` ≡ `physicalDamageReductionBonus`. Either form is acceptable; choose one canonical form and stick with it.
- **Load-bearing distinction (different stats):** e.g., `maxHealth` and `maxHealthBonus` are **mechanically distinct stats**:
  - `maxHealth` — flat health, added to total health pool post-curve.
  - `maxHealthBonus` — percent bonus applied to total. Example: 100 HP + 5% `maxHealthBonus` = 105 HP.

The per-stat audit (which stats are naming variants vs load-bearing pairs) is Phase 6.5c scope, informed by Phase 6.5a wiki facts.

### L8 — Per-stat phase/curve behavior is wiki-sourced
Each stat has its own phase/curve interaction model. Examples the user cited:

- `additionalWeaponDamage` — flat damage, subject to target PDR/MDR unless `trueDamage: true` (then flat).
- `additionalArmorRating` — added to armor rating pool **before** curve evaluation (flows through the curve).
- `physicalDamageReduction` (≡ `physicalDamageReductionBonus`) — flat % added **post-curve**.
- `memoryCapacityBonus` / `additionalMemoryCapacity` — their own interactions, wiki-sourced.

**Naming alone does not predict behavior.** Every stat must have a verified or wiki-sourced per-phase behavior before Session 6.5c assigns it to a phase.

### L9 — Jewelry (rings + necklace)
- **No class gating** on jewelry. Any class can wear any ring or necklace.
- **Both ring slots share one modifier pool** (`ring` in §4.4). `ring1` and `ring2` each draw from this single pool.
- A character may wear two identical rings; they are two distinct item instances; both contribute their stats.
- Necklace is a single-slot item; no necklace-stack question.

### L10 — `requiredClasses` + armor proficiency gate
Wearable-check for a gear piece against a character:

1. If `item.requiredClasses` is **non-empty**: the character's class must be in the list, **OR** the character has a class-level grant that blankets an armor type into their proficiency (per the class's `grants[]` — e.g., Warlock Demon Armor grants plate). If neither, the item is unwearable.
2. If `item.requiredClasses` is **empty** (default): any class with the item's `armorType` in their `armorProficiency` (or granted via `grants[]`) can wear it.
3. `removes[]` on a class's perks (e.g., Fighter Slayer removes plate) subtracts from proficiency even when `requiredClasses` would otherwise permit.

### L11 — Unit (flat vs percent) is stat-determined
A stat's unit (`flat` | `percent`) is determined by the stat identity, not by the gear piece or the authoring. Example: `armorRating` is always flat; `physicalDamageReduction` is always percent. The stat registry (whether STAT_META reform or a new registry) must carry the unit as part of the stat's identity.

### L12 — Rarity modifier-count table
Standard count of random modifier slots per rarity:

| Rarity | Modifier count |
|---|---|
| poor | 0 |
| common | 0 |
| uncommon | 1 |
| rare | 2 |
| epic | 3 |
| legendary | 4 |
| unique | 1 modifier, rolls 3× normal range (see L1) |

Per-item `modifierCountOverrides` is allowed when the item deviates (e.g., Foul Boots: `{ rare: 3 }` instead of 2).

### L13 — Simulator modifier selection
In the simulator (different from in-game random rolls):

- The item instance has N modifier slots per its rarity (and any overrides).
- The user **picks modifiers** from the allowed pool for the item type (subject to exclusion rules).
- The user **picks the value** within the applicable range.
- All picked modifiers are active simultaneously; there is no "selected subset" layer.

**In-game note (for future UX decisions):** In-game, a newly-found gear piece has modifiers rolled from the `naturalRange`; "socketing" overwrites a modifier with a user-chosen stat at the lower `socketRange`. Whether the simulator distinguishes natural-vs-socketed (to mark "this roll is only achievable via socketing" vs "naturally attainable") is a **Session 6.5c design decision** — not locked.

### L14 — Stat registry delta from current `STAT_META`
The stat registry in §4.3 introduces several new stats not in current `STAT_META`. Session 6.5c must decide for each:

- **Add to STAT_META** (stat participates in the aggregate-through-bonuses pipeline).
- **Promote to RECIPE_IDS** (stat is a recipe output / cap override).
- **New category** (e.g., weapon-property inherent-only stats may not fit either).

The metadata registry (§4.3) is canonical for new stats. Current STAT_META entries not in the registry may be stale / renamed and should be reconciled, not silently kept.

---

## 4. Authoritative metadata

Verbatim (lightly reformatted for readability). This is the data the design is built on. Treat §4.1 through §4.5 as source of truth.

### 4.1 Gear slots + held state + target

```jsonc
{
  // Gear slots
  // Two weapon loadout slots (swap between them in-game).
  // Each loadout has a primary + optional secondary (only if primary is oneHanded).
  // If primary is twoHanded, secondary must be null.
  // Plus 9 armor/accessory slots.
  "gear": {
    "weaponSlot1": {
      "primary": { /* Equipped Item Instance — e.g., Spectral Blade */ },
      "secondary": null  // null because Spectral Blade is twoHanded
    },
    "weaponSlot2": {
      "primary": { /* Equipped Item Instance — e.g., Spellbook */ },
      "secondary": null  // null because Spellbook is twoHanded
    },
    "head":     { /* Equipped Item Instance */ },
    "chest":    { /* Equipped Item Instance */ },
    "back":     { /* Equipped Item Instance */ },
    "hands":    { /* Equipped Item Instance */ },
    "legs":     { /* Equipped Item Instance */ },
    "feet":     { /* Equipped Item Instance */ },
    "ring1":    { /* Equipped Item Instance */ },
    "ring2":    { /* Equipped Item Instance */ },
    "necklace": { /* Equipped Item Instance */ }
  },

  // Weapon held state — 3-way mutually exclusive toggle.
  // "unarmed" = bare-hands (no weapon stats applied)
  // "slot1"   = weapon loadout 1 stats applied
  // "slot2"   = weapon loadout 2 stats applied
  "weaponHeldState": "unarmed",

  // Target properties (for damage calculation)
  "target": {
    "pdr": -22,       // Dummy default
    "mdr": 6,         // Dummy default
    "headshotDR": 0
  }
}
```

(Note: metadata as originally supplied used `"none"` for the unarmed held state. Per L5, the canonical value is `"unarmed"`.)

### 4.2 Total slot count

11 slots: 2 weapon loadouts (each `{primary, secondary}`) + 9 armor/accessory (`head`, `chest`, `back`, `hands`, `legs`, `feet`, `ring1`, `ring2`, `necklace`).

### 4.3 Stat ID Registry (canonical)

Canonical stat identifiers used across all schemas. Grouped by category.

```jsonc
{
  "coreAttributes": [
    "str", "vig", "agi", "dex", "wil", "kno", "res"
  ],

  "offensiveStats": [
    "weaponDamage",
    "magicWeaponDamage",
    "additionalWeaponDamage",
    "additionalPhysicalDamage",
    "physicalPower",
    "magicalPower",
    "physicalDamageBonus",
    "magicalDamageBonus",
    "armorPenetration",
    "magicPenetration",
    "headshotDamageBonus",
    "demonDamageBonus",
    "undeadDamageBonus"
  ],

  "defensiveStats": [
    "armorRating",
    "additionalArmorRating",
    "magicResistance",
    "physicalDamageReduction",
    "magicalDamageReduction",
    "projectileDamageReduction",
    "demonDamageReduction",
    "undeadDamageReduction",
    "headshotDamageReduction"
  ],

  "utilityStats": [
    "moveSpeed",
    "actionSpeed",
    "spellCastingSpeed",
    "regularInteractionSpeed",
    "magicalInteractionSpeed",
    "cooldownReductionBonus",
    "buffDurationBonus",
    "debuffDurationBonus",
    "memoryCapacityBonus",
    "additionalMemoryCapacity",
    "physicalHealing",
    "magicalHealing",
    "luck",
    "maxHealth"
  ],

  "weaponProperties": [
    "comboMultiplier",
    "impactZone",
    "swingTiming"
  ]
}
```

**Note — `additionalMagicalDamage`** appears in the per-slot modifier pools (§4.4, `head` / `back` / `ring` / `necklace` pools) but is not listed in this registry as typed. It's implicitly offensive. Registry consolidation is a Session 6.5c task.

**Note — `impactPower` and `impactResistance`** per L4 are additional inherent-only weapon/shield properties that belong in the `weaponProperties` / shield-properties category. Not in the registry above; to be added during Session 6.5c.

### 4.4 Item examples (validated in-game)

The following four items are user-verified in-game. Shape is illustrative, not binding — the shape the Session 6.5c design adopts may restructure; but every **fact** (inherent stats, slot mapping, handType, armorType, required classes, rarity, on-hit effects) is authoritative.

**Spectral Blade** — two-handed epic sword, class-restricted:

```jsonc
{
  "id": "spectral_blade",
  "name": "Spectral Blade",
  "slotType": "primaryWeapon",
  "armorType": null,
  "weaponType": "sword",
  "handType": "twoHanded",
  "requiredClasses": ["fighter", "warlock", "sorcerer"],

  "availableRarities": ["epic"],
  "modifierCountOverrides": {},

  "inherentStats": [
    { "stat": "weaponDamage",        "value": 40 },
    { "stat": "moveSpeed",           "value": -30 },
    { "stat": "actionSpeed",         "value": 5, "unit": "percent" },
    { "stat": "headshotDamageBonus", "value": 5, "unit": "percent" }
    // For ranged inherent stats:
    // { "stat": "armorRating", "min": 28, "max": 35 }
  ],

  "socketExclusionOverrides": [],
  "onHitEffects": []
}
```

**Frostlight Crystal Sword** — two-handed epic sword, multi-typed weapon (`["sword", "magicStuff"]`):

```jsonc
{
  "id": "frostlight_crystal_sword",
  "name": "Frostlight Crystal Sword",
  "slotType": "primaryWeapon",
  "armorType": null,
  "weaponType": ["sword", "magicStuff"],
  "handType": "twoHanded",
  "requiredClasses": ["wizard", "warlock", "sorcerer"],
  "availableRarities": ["epic"],
  "modifierCountOverrides": {},

  "inherentStats": [
    { "stat": "weaponDamage",      "value": 13 },
    { "stat": "magicWeaponDamage", "value": 18 },
    { "stat": "moveSpeed",         "value": -25 },
    { "stat": "actionSpeed",       "value": 2, "unit": "percent" }
  ],

  "socketExclusionOverrides": [],
  "onHitEffects": []
}
```

**Foul Boots** — leather feet, rare, open-class, with `modifierCountOverrides`:

```jsonc
{
  "id": "foul_boots",
  "name": "Foul Boots",
  "slotType": "feet",
  "armorType": "leather",
  "weaponType": null,
  "handType": null,
  "requiredClasses": [],           // empty = all classes that can wear this armor type
  "availableRarities": ["rare"],
  "modifierCountOverrides": { "rare": 3 },

  "inherentStats": [
    { "stat": "armorRating",   "value": 18 },
    { "stat": "moveSpeed",     "value": 6 },
    { "stat": "agi",           "value": 3 },
    { "stat": "physicalPower", "value": 2 }
  ],

  "socketExclusionOverrides": [],
  "onHitEffects": []
}
```

**Spiked Gauntlet** — plate hands, epic, with an `onHitEffects` entry:

```jsonc
{
  "id": "spiked_gauntlet",
  "name": "Spiked Gauntlet",
  "slotType": "hands",
  "armorType": "plate",
  "weaponType": null,
  "handType": null,
  "requiredClasses": [],
  "availableRarities": ["epic"],
  "modifierCountOverrides": {},

  "inherentStats": [
    { "stat": "armorRating",              "value": 43 },
    { "stat": "projectileDamageReduction","value": 2.5, "unit": "percent" },
    { "stat": "magicResistance",          "value": -5 },
    { "stat": "moveSpeed",                "value": -1 },
    { "stat": "dex",                      "value": 2 },
    { "stat": "vig",                      "value": 2 }
  ],

  "socketExclusionOverrides": [],

  "onHitEffects": [
    {
      "damage": 1,
      "damageType": "true_physical",
      "trueDamage": true,
      "scaling": "attributeBonusRatio",
      "separateInstance": false,
      "notes": "Included in main damage number, not a separate hit"
    }
  ]
}
```

**Observations about `onHitEffects`:**

- `separateInstance: false` + `"Included in main damage number, not a separate hit"` means the +1 rolls into the primary physical damage instance at Stage 6 — it is not a separate damage projection. This is the Phase-6-surfaced gap (`docs/class-shape-progress.md § Gear-shape open questions § 1`).
- `scaling: "attributeBonusRatio"` is a scaling model name that needs verification (Phase 6.5a). Unclear whether it scales with the caster's attribute bonuses, with the attribute → bonus curve, or with something else.

### 4.5 Per-slot modifier pools

Each slot-type has an allowed-modifier pool. Every entry carries:

- `stat` — stat identity from §4.3.
- `socketRange: {min, max}` — value range when the stat is socketed (typically narrower than natural).
- `naturalRange: {min, max}` — value range when the stat appears as a naturally-rolled random modifier.
- `unit: "flat" | "percent"`.
- Optional `exclusionGroup: <id>` (see §4.6).
- Optional `naturalRangeVerified: false` — metadata-quality flag; `false` means the range in the doc is an estimate from screenshots, not a confirmed roll range.

Per L3, the same stat may have different ranges on different slot-types.

**Slot pools:**

#### `weapon_twoHanded`

```jsonc
[
  { "stat": "additionalWeaponDamage", "socketRange": { "min": 2, "max": 2 },   "naturalRange": { "min": 2, "max": 2 },  "unit": "flat" },
  { "stat": "physicalDamageBonus",    "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 },  "unit": "percent" },
  { "stat": "demonDamageBonus",       "socketRange": { "min": 4, "max": 6.4 }, "naturalRange": { "min": 4, "max": 8 },  "unit": "percent" },
  { "stat": "armorPenetration",       "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 },  "unit": "percent" },
  { "stat": "undeadDamageBonus",      "socketRange": { "min": 4, "max": 6.4 }, "naturalRange": { "min": 4, "max": 8 },  "unit": "percent" },
  { "stat": "magicalDamageBonus",     "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 },  "unit": "percent" },
  { "stat": "headshotDamageBonus",    "socketRange": { "min": 4, "max": 6.4 }, "naturalRange": { "min": 4, "max": 8 },  "unit": "percent" },
  { "stat": "physicalPower",          "socketRange": { "min": 2, "max": 3 },   "naturalRange": { "min": 2, "max": 3 },  "unit": "flat" },
  { "stat": "actionSpeed",            "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 },  "unit": "percent" },
  { "stat": "luck",                   "socketRange": { "min": 30, "max": 48 }, "naturalRange": { "min": 30, "max": 60 }, "unit": "flat" },
  { "stat": "magicResistance",        "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat" },
  { "stat": "magicalPower",           "socketRange": { "min": 2, "max": 3 },   "naturalRange": { "min": 2, "max": 3 },  "unit": "flat" },
  { "stat": "demonDamageReduction",   "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 },  "unit": "percent" },
  { "stat": "magicalDamageReduction", "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent" },
  { "stat": "magicPenetration",       "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 },  "unit": "percent" },
  { "stat": "spellCastingSpeed",      "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 },  "unit": "percent" },
  { "stat": "undeadDamageReduction",  "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 },  "unit": "percent" },
  { "stat": "debuffDurationBonus",    "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 },  "unit": "percent" },
  { "stat": "physicalHealing",        "socketRange": { "min": 1, "max": 1 },   "naturalRange": { "min": 1, "max": 2 },  "unit": "flat" },
  { "stat": "magicalHealing",         "socketRange": { "min": 1, "max": 1 },   "naturalRange": { "min": 1, "max": 2 },  "unit": "flat" },
  { "stat": "memoryCapacityBonus",    "socketRange": { "min": 5, "max": 8 },   "naturalRange": { "min": 5, "max": 10 }, "unit": "percent" },
  { "stat": "buffDurationBonus",      "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 },  "unit": "percent" },
  { "stat": "physicalDamageReduction","socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "exclusionGroup": "ar_pdr" },
  { "stat": "additionalArmorRating",  "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat", "exclusionGroup": "ar_pdr" },
  { "stat": "regularInteractionSpeed","socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 },  "unit": "percent" },
  { "stat": "projectileDamageReduction","socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent" },
  { "stat": "cooldownReductionBonus", "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 },  "unit": "percent" },
  { "stat": "magicalInteractionSpeed","socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 },  "unit": "percent" },
  { "stat": "additionalMemoryCapacity","socketRange": { "min": 2, "max": 3 },  "naturalRange": { "min": 2, "max": 4 },  "unit": "flat" }
]
```

#### `weapon_oneHanded`

Source-note from metadata: Obsidian Cutlass (Sword, One-Handed, Epic) socket screenshots. Ranges roughly half of `weapon_twoHanded` for most stats. `naturalRangeVerified` is `false` for many entries — confirmed socket ranges, estimated natural ranges.

```jsonc
[
  { "stat": "additionalWeaponDamage",    "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 },   "naturalRange": { "min": 15, "max": 30 },   "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "memoryCapacityBonus",       "socketRange": { "min": 2.5, "max": 4 },   "naturalRange": { "min": 2.5, "max": 5 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "physicalHealing",           "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalHealing",            "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false }
]
```

#### `chest`

Main armor slot → core attributes included.

```jsonc
[
  { "stat": "agi",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat" },
  { "stat": "wil",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat" },
  { "stat": "kno",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat" },
  { "stat": "res",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat" },
  { "stat": "str",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat" },
  { "stat": "dex",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat" },
  { "stat": "vig",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat" },
  { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent" },
  { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent" },
  { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent" },
  { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent" },
  { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent" },
  { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent" },
  { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent" },
  { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 },   "naturalRange": { "min": 15, "max": 30 },   "unit": "flat" },
  { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat" },
  { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent" },
  { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent" },
  { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent" },
  { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent" },
  { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent" },
  { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent" },
  { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent" },
  { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 },   "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent" },
  { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent" },
  { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr" },
  { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "exclusionGroup": "ar_pdr" },
  { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent" },
  { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent" },
  { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent" },
  { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 2 },     "unit": "flat" }
]
```

#### `hands`

Main armor slot. Source-note from metadata: Golden Gloves (Leather, Epic). Natural ranges many `naturalRangeVerified: false`. **Uniquely has `additionalPhysicalDamage`** among main armor slots.

```jsonc
[
  { "stat": "str",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "vig",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "agi",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "dex",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "wil",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "kno",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "res",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "additionalPhysicalDamage",  "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 },   "naturalRange": { "min": 15, "max": 30 },   "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 },   "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent", "naturalRangeVerified": false },
  { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 2 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false }
]
```

#### `head`

Main armor slot. Source-note: Barbuta Helm (Plate, Epic). **Uniquely has `additionalMagicalDamage`** among main armor slots. Headshot DR and Move Speed never socketable on any slot.

```jsonc
[
  { "stat": "str",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "vig",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "agi",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "dex",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "wil",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "kno",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "res",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "additionalMagicalDamage",   "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 },   "naturalRange": { "min": 15, "max": 30 },   "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 },   "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent", "naturalRangeVerified": false },
  { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 2 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false }
]
```

#### `legs`

Main armor slot. Source-note: Dark Leather Leggings (Leather, Epic). No `additionalPhysicalDamage` (hands-only for armor slots). Move Speed never socketable.

```jsonc
[
  { "stat": "str",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "vig",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "agi",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "dex",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "wil",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "kno",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "res",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 },   "naturalRange": { "min": 15, "max": 30 },   "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 },   "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent", "naturalRangeVerified": false },
  { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 2 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false }
]
```

#### `feet`

Main armor slot. Source-note: Rugged Boots (Leather, Epic). No `additionalPhysicalDamage`.

```jsonc
[
  { "stat": "str",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "vig",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "agi",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "dex",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "wil",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "kno",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "res",                       "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 },   "naturalRange": { "min": 15, "max": 30 },   "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 2 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 },   "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent", "naturalRangeVerified": false },
  { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false }
]
```

#### `back`

NOT a main armor slot — no core attributes in pool. Ranges much higher than main armor (comparable to weapons). Has `additionalPhysicalDamage`, `additionalMagicalDamage`, `physicalHealing`, `magicalHealing`.

```jsonc
[
  { "stat": "demonDamageBonus",          "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageBonus",         "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "headshotDamageBonus",       "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "additionalPhysicalDamage",  "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "additionalMagicalDamage",   "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "actionSpeed",               "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "luck",                      "socketRange": { "min": 30, "max": 48 },   "naturalRange": { "min": 30, "max": 60 },   "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "armorPenetration",          "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicPenetration",          "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicResistance",           "socketRange": { "min": 15, "max": 24 },   "naturalRange": { "min": 15, "max": 30 },   "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalDamageReduction",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "spellCastingSpeed",         "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageReduction",     "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageReduction",      "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "debuffDurationBonus",       "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalHealing",           "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "memoryCapacityBonus",       "socketRange": { "min": 5, "max": 8 },     "naturalRange": { "min": 5, "max": 10 },    "unit": "percent", "naturalRangeVerified": false },
  { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 2, "max": 3 },     "naturalRange": { "min": 2, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "buffDurationBonus",         "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "cooldownReductionBonus",    "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalHealing",            "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "physicalDamageReduction",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "additionalArmorRating",     "socketRange": { "min": 15, "max": 24 },   "naturalRange": { "min": 15, "max": 30 },   "unit": "flat",    "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "regularInteractionSpeed",   "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "projectileDamageReduction", "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false }
]
```

#### `ring`

Single pool covers both `ring1` and `ring2` (L9). NOT a main armor slot — no core attributes. Rings have higher `physicalPower` / `magicalPower` / `magicalHealing` (2–4) than armor.

```jsonc
[
  { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalDamageBonus",       "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalDamageBonus",        "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalPower",             "socketRange": { "min": 2, "max": 3 },     "naturalRange": { "min": 2, "max": 4 },     "unit": "flat",    "naturalRangeVerified": true },
  { "stat": "additionalPhysicalDamage",  "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "additionalMagicalDamage",   "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 },   "naturalRange": { "min": 15, "max": 30 },   "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalPower",              "socketRange": { "min": 2, "max": 3 },     "naturalRange": { "min": 2, "max": 4 },     "unit": "flat",    "naturalRangeVerified": true },
  { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 },     "naturalRange": { "min": 1, "max": 2 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalHealing",            "socketRange": { "min": 2, "max": 3 },     "naturalRange": { "min": 2, "max": 4 },     "unit": "flat",    "naturalRangeVerified": true },
  { "stat": "physicalHealing",           "socketRange": { "min": 2, "max": 3 },     "naturalRange": { "min": 2, "max": 4 },     "unit": "flat",    "naturalRangeVerified": true },
  { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 },    "naturalRange": { "min": 7, "max": 15 },    "unit": "flat",    "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 },   "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent", "naturalRangeVerified": false },
  { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false }
]
```

#### `necklace`

NOT a main armor slot — no core attributes. Ranges similar to back (higher than main armor). `maxHealth` inherent; never socketable.

```jsonc
[
  { "stat": "headshotDamageBonus",       "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageBonus",          "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "armorPenetration",          "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "undeadDamageBonus",         "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "additionalPhysicalDamage",  "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "additionalMagicalDamage",   "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 },   "naturalRange": { "min": 1, "max": 2 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "actionSpeed",               "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "luck",                      "socketRange": { "min": 30, "max": 48 },   "naturalRange": { "min": 30, "max": 60 },   "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicResistance",           "socketRange": { "min": 15, "max": 24 },   "naturalRange": { "min": 15, "max": 30 },   "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "magicalDamageReduction",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "naturalRangeVerified": false },
  { "stat": "demonDamageReduction",      "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicPenetration",          "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "spellCastingSpeed",         "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "memoryCapacityBonus",       "socketRange": { "min": 5, "max": 8 },     "naturalRange": { "min": 5, "max": 10 },    "unit": "percent", "naturalRangeVerified": false },
  { "stat": "debuffDurationBonus",       "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 2, "max": 3 },     "naturalRange": { "min": 2, "max": 3 },     "unit": "flat",    "naturalRangeVerified": false },
  { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "projectileDamageReduction", "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "cooldownReductionBonus",    "socketRange": { "min": 2, "max": 3.2 },   "naturalRange": { "min": 2, "max": 4 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "magicalHealing",            "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "physicalHealing",           "socketRange": { "min": 1, "max": 1 },     "naturalRange": { "min": 1, "max": 1 },     "unit": "flat" },
  { "stat": "undeadDamageReduction",     "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "physicalDamageReduction",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 },   "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "additionalArmorRating",     "socketRange": { "min": 15, "max": 24 },   "naturalRange": { "min": 15, "max": 30 },   "unit": "flat",    "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
  { "stat": "regularInteractionSpeed",   "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false },
  { "stat": "buffDurationBonus",         "socketRange": { "min": 3, "max": 4.8 },   "naturalRange": { "min": 3, "max": 6 },     "unit": "percent", "naturalRangeVerified": false }
]
```

### 4.6 Modifier exclusion rules

```jsonc
{
  "modifierExclusionRules": {
    // General rule: inherent stat blocks itself from socketing.
    // Applied by default. Per-item socketExclusionOverrides can re-allow.
    "generalRule": "inherent_blocks_self",

    // Named exclusion groups for mutual exclusivity in socketing.
    "exclusionGroups": {
      "ar_pdr": {
        "members": ["additionalArmorRating", "physicalDamageReduction"],
        "description": "Can socket at most one of these two.",
        "dominantBlocker": "physicalDamageReduction"
        // If the item has inherent PDR, the entire group is blocked.
        // If the item has inherent AR (but not PDR), the group remains available.
      }
    },

    // Stats that are exempt from the general inherent-blocks-self rule.
    // Currently none known — AR/MR blocking behavior is handled via
    // exclusion groups and the dominantBlocker pattern.
    "globalExemptions": []
  }
}
```

Key derived rules:

- **General rule — inherent blocks self.** If an item has an inherent stat S, then S cannot be socketed on the same item — unless the item's `socketExclusionOverrides` lists S.
- **Exclusion group — at most one member.** An item cannot simultaneously have multiple members of a named exclusion group (by any means — inherent or socketed). At most one member may appear.
- **Dominant blocker within a group.** If the item has the `dominantBlocker` (inherent), the entire group is blocked (no member can be socketed). If the item has a non-dominant member (inherent), the group remains available to the user (they can choose to socket the dominant blocker or leave the group unoccupied).

Per §4.4 pools, `ar_pdr` is the only named group so far. `additionalArmorRating` (flat) and `physicalDamageReduction` (percent) are the members; `physicalDamageReduction` is dominant.

Not fully captured in metadata but observable in per-slot pools:
- `headshotDamageReduction` never appears in any socket pool (inherent-only on head).
- `moveSpeed` never appears in any socket pool (inherent-only, always flat).
- `maxHealth` never appears in any socket pool (inherent-only on necklace per observation).

These may warrant a "never-socketable stats" list; wiki verification pending (Phase 6.5a).

---

## 5. Open questions — for Phase 6.5a (wiki research)

These are questions the metadata does not answer and that are most efficiently resolved via wiki consultation. The Phase 6.5a session targets these.

### OQ-W1 — Per-stat phase/curve behavior (cross-cutting; highest priority)
For each stat in §4.3 plus `impactPower` / `impactResistance` (L4), answer:

- At which pipeline phase does the stat contribute (`pre_curve_flat` / `attribute_multiplier` / `post_curve` / `post_curve_multiplicative` / `multiplicative_layer` / `post_cap_multiplicative_layer` / `type_damage_bonus` / `healing_modifier` / `cap_override`; see `src/data/constants.js::EFFECT_PHASES`)?
- Is the stat a flat additive, an attribute multiplier, a curve input, a curve output, or a post-cap multiplier?
- Where stat naming pairs exist (`X` vs `XBonus`, `additionalX` vs `X`), which behavior distinguishes them (per L7 / L8)?

Output format: a table keyed by stat id → `{ phase, semantic, citation, verification_level }`.

### OQ-W2 — Weapon property math
Each weapon property (`comboMultiplier`, `impactZone`, `swingTiming`, `impactPower`, `impactResistance`) — how does it participate in damage / combat math? Specifically:

- `comboMultiplier`: is this a damage multiplier applied per hit-stage of a combo? How many stages does a typical combo have?
- `impactZone`: which damage projections consume this? How does it interact with `hit.body/head/limb`?
- `swingTiming`: display-only, or does it feed action speed / cooldown math?
- `impactPower` / `impactResistance`: what does each do in the damage pipeline? On which item types does each appear?

### OQ-W3 — Hit combo semantics
The simulator must display full hit combos with per-stage damage (L4). Questions:

- How many stages per combo per weapon?
- Per stage: what's the damage multiplier vs base weapon damage?
- Does weapon type (sword vs axe vs dagger) affect combo stage count / multipliers?
- Is combo data wiki-documented per weapon, or is it derived from `comboMultiplier` / `swingTiming` at runtime?

### OQ-W4 — Memory capacity stat interactions
Specifically:

- `memoryCapacityBonus` — percent bonus applied to base memory capacity? At which phase?
- `additionalMemoryCapacity` — flat additive? At which phase?
- Base memory capacity comes from KNO curve (`STAT_CURVES.memoryCapacity`); how do the two stats compose with the curve?

### OQ-W5 — Secondary weapon variant specifics
Which weapon types exist in secondary variants, per wiki? Currently hinted: daggers, axes, swords, shields. Confirm full list. Also: is there a separate modifier pool for secondary-weapon variants (metadata has `weapon_oneHanded` but not a `weapon_secondary` pool), or do they share the `weapon_oneHanded` pool?

### OQ-W6 — `"magicStuff"` weapon-type vocabulary
L2.1 confirms `"magicStuff"` is real vocabulary (not placeholder). Confirm via wiki:

- What is the semantic domain? (Crystal / magical / arcane weapon subtype?)
- Which existing weapon types use it?
- Does it correspond to a condition-dispatch category (e.g., gates spells that require "magic item equipped")?

### OQ-W7 — Never-socketable stats
Confirm which stats are never socketable on any slot (candidates from §4.4 observation: `headshotDamageReduction`, `moveSpeed`, `maxHealth`). Is there a canonical wiki list?

### OQ-W8 — Rarity + modifier count exceptions
Confirm:

- The standard count table (L12) matches wiki data.
- Which item categories use `modifierCountOverrides` in the wild? (Beyond Foul Boots.)
- The `unique = 1 × 3` rule — is it wiki-documented or in-game observation only?

### OQ-W9 — Inherent ranged stats
When an item's inherent stat has `{ min, max }` form (per §4.4 Spectral Blade example comment: `{ stat: "armorRating", min: 28, max: 35 }`):

- Is this a per-rarity variance? A per-drop variance?
- In the simulator, is the user picking in-range (L13-style) or is the item instance fixed at acquisition?

### OQ-W10 — On-hit effects
Spiked Gauntlet's `onHitEffects[0]` (§4.4):

- `scaling: "attributeBonusRatio"` — confirm the formula. Does it scale with caster's attribute-bonus table, with the attribute curve output, or with something else?
- `separateInstance: false` + `"Included in main damage number, not a separate hit"` — confirm the math: is the +1 added into the pre-DR damage pipeline, to the post-DR number, or summed directly into the displayed number?
- Are there other items with on-hit effects the wiki documents? What's the shape of the most common ones?

### OQ-W11 — Class / armor grants
Wiki confirmation of:

- Warlock Demon Armor blanket-adds plate (current class data encodes this). Any other class-level blanket adds the wiki knows about?
- Fighter Slayer removes plate (current class data). Any other class-level removes?

(Class shape already locks these as `grants[]` / `removes[]` per `class-shape-progress.md`; 6.5a confirms wiki coverage before Session 6.5c designs Gear-side gating.)

### OQ-W12 — Class gating on non-armor (jewelry + weapons)
L9 confirms jewelry has no class gating. Wiki confirmation: any exceptions? (Class-locked unique necklaces etc.)

Weapons: `requiredClasses` is already captured in the item metadata. Any wiki-documented weapon with *zero* class restrictions, or are all weapons class-gated?

### OQ-W13 — Items with `naturalRangeVerified: false`
The metadata has many entries flagged `naturalRangeVerified: false`. Any wiki source that verifies these? Low priority — ranges are "close enough" for simulator accuracy until gear editor ships (Phase 11+). But worth noting what's unverified if someone wants to spot-check.

---

## 6. Open questions — for Phase 6.5c (shape design)

These are design decisions, not research questions. 6.5c resolves them; 6.5b surfaces any additional ones during mapping.

### OQ-D1 — Natural vs socketed distinction in simulator
Per L13 "In-game note": whether the simulator distinguishes "this value is socketed" vs "this value is natural" affects UI and shape. Options:

- **Merged:** user picks value in whichever range — natural-max is the upper bound. No distinction.
- **Split:** user picks "natural" or "socketed" per stat, value limited to the applicable range. UI surfaces "craft-only" warning on socketed values above naturalRange.

Decision affects: Gear item instance shape, Gear UI, simulator legitimacy semantics.

### OQ-D2 — Character shape boundary
What is the "Character" in the new shape?

- Identity (name, class, religion)?
- Persistent selections (perks/skills/spells as saved; active buffs as per-session)?
- Gear loadout reference (full gear or gear-id reference)?
- Attribute allocation?
- Multi-character persistence (can a user save N characters and switch)?

The current `Build` is session state (selected + activeBuffs + gear + toggles). "Character" may be a persistent subset + session overlay. Design target: both save-able state (e.g., for saved builds) and live state coexist cleanly.

### OQ-D3 — Normalizer location + shape
The Character + Gear shapes need to normalize into whatever `buildContext` consumes (today: a flat `Build` with pre-summed `attributes` + flat `gear.bonuses`). Where does this normalizer live?

- In `buildContext.js` (engine changes to accept richer shape)?
- Upstream as a separate module (engine unchanged; normalizer feeds engine-compatible Build)?
- In App.jsx (Phase 7 anti-pattern — UI becomes normalizer)?

Decision has ripple effects: location determines what engine modules change.

### OQ-D4 — Stat-registry reconciliation with STAT_META
The metadata registry (§4.3) has ~38 stats, partly overlapping with current STAT_META. Session 6.5c decides:

- Replace STAT_META with the registry (STAT_META entries not in registry are deleted)?
- Merge (STAT_META keeps entries it has that aren't in the registry)?
- Register migration plan (new shape uses registry; class data still authors in STAT_META-keyed form until Phase 10 migration)?

Consequences for the two-namespace model (STAT_META vs RECIPE_IDS) — registry doesn't include recipe ids; those stay in `RECIPE_IDS`.

### OQ-D5 — Item instance vs item definition
Item metadata (§4.4) describes an item **definition** (e.g., what a Spectral Blade *can* be). But the Character's gear references an item **instance** (e.g., "this player's Spectral Blade with these specific rolled stats"). Shape implications:

- One file with embedded instance data? (Every wearable variant is a separate file.)
- Definition + instance-overlay? (Definition holds the inherent spec; instance holds the user's rolled-modifier picks.)
- Tiered definition (base → rarity variant → user-instance)?

### OQ-D6 — On-hit effect pipeline routing
Spiked Gauntlet's on-hit (§4.4) is "included in main damage number, not a separate hit." Shape + engine consequences:

- Add a field to DAMAGE_ATOM that projectDamage reads at Stage 6 (`additionalFlatDamage` or similar).
- Add a field to the Gear shape that projectDamage reads at Stage 6.
- Synthesize a STAT_META entry consumed in aggregate (less good — doesn't sum into "main number" naturally).

The 6.5c design picks one; the gap currently parked at `class-shape-progress.md § Gear-shape open questions § 1` resolves.

### OQ-D7 — Two weapon loadouts in `ctx` + engine
Current engine consumes `ctx.gear.weapon` (singular). New shape has two loadouts + held-state toggle. Design choices:

- Pass only the held loadout into ctx (`ctx.gear.weapon` remains singular, reflects held). Normalizer picks.
- Pass both loadouts + held-state (ctx has richer gear subshape, engine modules read held-state).

Former is simpler and matches L6 dormancy. Flag for 6.5c.

### OQ-D8 — Inherent stat materialization order
An item can have inherent stats (post-rarity, pre-socket-override). When the item also has `socketExclusionOverrides`, exclusion groups interact (e.g., inherent AR + override to allow AR-socket). Materialization: (1) pick inherent, (2) compute available pool (pool minus inherent-blocked minus exclusion-blocked + overrides), (3) pick socketed from available, (4) validate exclusion-group membership.

Shape + validator need this order spec'd.

### OQ-D9 — Gear validator scope
A validator parallel to `class-shape-validator.js` is expected. What does it validate?

- Item definition structural validity.
- Item instance (user-picked stats in range, within pool, respecting exclusions).
- Character+Gear consistency (requiredClasses / armorProficiency check; grant/remove cascades).

### OQ-D10 — Shape file locations + naming
Where do the shapes land?

- `src/data/gear/gear-shape.js` + `src/data/character/character-shape.js`?
- A unified `src/data/<shape>.js` with sub-objects?
- Do item definitions live in `src/data/gear/items/<id>.js` or a single registry file?

---

## 7. How this document is used by each session

- **Phase 6.5a (wiki facts):** Reads §1 framing, §3 locked decisions, §4 metadata, §5 OQ-W list. Output: `docs/gear-wiki-facts.md` answering §5 OQs. No design decisions, no shape proposals.
- **Phase 6.5b (mapping + gap analysis):** Reads this doc + 6.5a's output. Produces the current-state map + gap analysis against both. Still no design decisions.
- **Phase 6.5c (shape design):** Reads this doc + 6.5a's output + 6.5b's map/gaps. Resolves §6 OQ-D list. Produces shape files + examples + normalizer spec + validator spec.

Each session updates their progress doc and adds additional OQs if they surface during work (surfaced OQs go to the coordinator, not silently answered in the session).

---

## 8. Revision log

- **2026-04-17 — Initial draft.** Locked L1–L14 from user conversation; embedded authoritative metadata (§4); seeded OQ-W (§5) and OQ-D (§6) lists; defined sub-phase sequence (§2). Coordinator-owned.
- **2026-04-17 — §4.5 metadata update (post-Phase 6.5a).** Adopted three wiki-sourced naturalRange corrections in `weapon_twoHanded` per user sign-off: (a) `additionalMemoryCapacity` natural 2–3 → 2–4; (b) `physicalHealing` natural 1–1 → 1–2; (c) `magicalHealing` natural 1–1 → 1–2. Socket ranges unchanged. Resolves `docs/gear-wiki-facts.md § 15` item #15.
