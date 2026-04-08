# Simulator Architecture

Design and implementation plan for the Dark and Darker character builder and damage simulator.
Patch 6.10, Hotfix 112, Season 8.

---

## Core Principle: Centralized Shared Data

All game-specific data lives in dedicated data files (stat_curves.json, classes.json, items.json, slot_modifier_pools.json, damage_formulas.md, season8_constants.md). The application reads from these at runtime. User-specific data (saved builds) lives in persistent storage (window.storage API).

Application logic never hardcodes game values. When a patch changes a value, update the data files — not the code.

---

## Data Flow

```
Game Data (JSON files, read-only at runtime)
      ↓
Class Selection → Base Stats, Equippable Armor, Spells, Skills, Perks
      ↓
Active Perks (max 4) → stat effects + perk flags (antimagic, type damage bonuses, etc.)
      ↓
Active Skills (2 slots) → includes Spell Memory (required for casting). Combat skills (BoC, etc.)
      ↓
Active Spells (constrained by spell memory slots + memory capacity)
      ↓
Active Buffs (derived from equipped spells that have self-buff effects)
      ↓
Gear Slots
  ├── Weapon Loadout 1 (primary + optional secondary)
  ├── Weapon Loadout 2 (primary + optional secondary)
  ├── head, chest, back, hands, legs, feet
  └── ring1, ring2, necklace
  Each slot:
  ├── Item definition (inherent stats — fixed or ranged)
  ├── Random modifiers (user-entered, constrained by slot pool + exclusion rules)
  └── Weapon Held State: "none" | "slot1" | "slot2" (mutually exclusive, stats only apply for active slot)
      ↓
Attribute Aggregator
  ├── Class base stats
  ├── Sum of all gear inherent stats + random modifier stats
  │   (weapon stats only included when weaponHeldState is true)
  ├── Active buff/spell attribute bonuses (e.g., Power of Sacrifice +15 STR/VIG)
  │   (pre-curve buffs applied here)
  └── Attribute bonus multipliers applied AFTER all additive sources
      (e.g., Curse of Weakness -25% all attributes)
      ↓
Derive perkEffects from selected perks
  ├── statEffects → additive bonuses (e.g., Demon Armor -10% SCS)
  ├── perkFlags → boolean flags (antimagic, fighterDefenseMastery, etc.)
  └── typeDamageBonus → type-specific damage maps (e.g., Dark Enhancement +20% dark_magical)
      ↓
Intermediate Values (formulas in season8_constants.md)
  ├── Physical Power = STR × 1 + gear PP bonuses
  ├── Magical Power = WIL × 1 + gear MP bonuses
  ├── Health Rating = STR × 0.25 + VIG × 0.75
  ├── Action Speed Rating = AGI × 0.25 + DEX × 0.75
  ├── Regular Interaction Rating = DEX × 0.25 + RES × 0.75
  └── etc.
      ↓
Stat Curve Engine (piecewise evaluator, reads from stat_curves.json)
      ↓
Derived Stats (curve output + post-curve bonuses)
  ├── PPB = PPB_curve(Physical Power) + flat Physical Damage Bonus% from gear
  ├── MPB = MPB_curve(Magical Power) + flat Magical Damage Bonus% from gear
  ├── HP = ceil(Health_curve(Health Rating)) + Max Health from gear
  ├── PDR = min(PDR_curve(AR) + flat PDR% from gear, PDR cap)
  ├── MDR = min(MDR_curve(MR) + flat MDR% from gear, MDR cap)
  │   └── Antimagic: separate × (1 - 0.20) layer after cap, except vs divine
  ├── Move Speed = 300 + MoveSpeed_curve(AGI) + gear move mods (cap 330)
  ├── Action Speed = ActionSpeed_curve(AS Rating) + flat AS% from gear
  ├── Buff/Debuff Duration, CDR, Spell Casting Speed, etc.
  └── Memory Capacity = ceil(MemCap_curve(KNO) × (1 + MemCap Bonus%)) + Add MemCap
      ↓
Post-Curve Modifications
  ├── Post-curve buff effects (e.g., ES break +50% SCS)
  ├── Type damage bonuses from buffs (e.g., ES break +30% dark_magical)
  ├── Religion bonuses (flat post-curve additive: Noxulon +20% RIS, Zorin +8% Magic Pen, etc.)
  └── All post-curve bonuses stored separately for display (ds.buffPostCurve, ds.religionBonuses)
      ↓
Damage Calculator (formulas in damage_formulas.md)
  ├── Physical damage per hit (weapon + combo + impact zone + PPB + DR)
  ├── Spell/skill damage ((base + weapon magical dmg) × (1 + MPB × scaling + type bonuses) × hit loc × MDR)
  ├── On-hit effects (each as separate damage instance)
  ├── Damage type validation (dark ≠ evil ≠ curse ≠ divine ≠ fire)
  ├── Type-specific bonuses from perks + buffs (ds.typeDamageBonuses map)
  └── All display values use Math.floor()
      ↓
DPS Module (damage per hit × weapon swing timing / (1 + action speed))
      ↓
Comparison Engine (snapshot → swap → diff)
```

---

## Equipment System

### Gear Slots

**Weapon Loadout:** 2 weapon slots (labeled 1 and 2 in-game), swappable. Each slot has a primary + optional secondary sub-slot. If primary is twoHanded, secondary is blocked. Plus 9 armor/accessory slots.

| Slot | slotType | Core Stats? | Notes |
|------|----------|-------------|-------|
| Weapon Slot 1 Primary | primaryWeapon | No | |
| Weapon Slot 1 Secondary | secondaryWeapon | No | Only if Slot 1 primary is oneHanded. Shields, lanterns, off-hand |
| Weapon Slot 2 Primary | primaryWeapon | No | |
| Weapon Slot 2 Secondary | secondaryWeapon | No | Only if Slot 2 primary is oneHanded |
| Head | head | Yes | Sub-types exist (e.g., "Open helmet", "Full helmet") |
| Chest | chest | Yes | |
| Back | back | No | Higher modifier ranges than armor |
| Hands | hands | Yes | Has Additional Physical Damage |
| Legs | legs | Yes | |
| Feet | feet | Yes | |
| Ring 1 | ring | No | Higher Physical/Magical Power/Healing ranges |
| Ring 2 | ring | No | Same pool as Ring 1 |
| Necklace | necklace | No | Higher modifier ranges than armor |

### Weapon Properties

Weapons have three distinct damage-related properties:

| Property | Field | Purpose | Affects Spells? | Scales with PPB/MPB? |
|----------|-------|---------|----------------|---------------------|
| Weapon Damage | `weaponDamage` | Physical melee damage | No | Yes (PPB) |
| Magical Damage | `magicalDamage` | Flat addition to spell/skill base damage when held | YES | No (flat pre-multiplier) |
| Magic Weapon Damage | `magicWeaponDamage` | Magic melee damage (e.g., Crystal Sword) | NO | Yes (MPB) — separate melee instance |

**Critical distinction:** `magicalDamage` (Spellbook +5) adds to spell base damage. `magicWeaponDamage` (Crystal Sword) is a separate melee damage instance that does NOT affect spells.

### Item Definition Structure

Each item has:
- **Inherent stats:** Fixed values (or min/max for ranged stats). Always present, always contribute to build calculations. Displayed but not user-editable (except ranged stats, constrained to valid bounds).
- **Random modifiers:** User-selected/rolled values from the available modifier pool. Count determined by rarity (Poor=0, Common=0, Uncommon=1, Rare=2, Epic=3, Legendary=4, Unique=1 at 3× natural range). Per-item overrides possible (e.g., Foul Boots: Rare with 3 modifiers).
- **Available rarities:** Most items span Poor–Unique; some locked to a single rarity.
- **Required classes:** Which classes can equip. Empty = any class (subject to armor type).
- **Armor type:** cloth, leather, plate, or null. Class must be able to equip the type (base + perk grants).

### Modifier Pool Rules

Each slot type has a defined modifier pool with socket ranges and natural roll ranges. The available pool for a specific item is computed at runtime:

1. Start with the slot's full modifier pool.
2. Remove any modifier where the item has that stat as inherent (general rule).
3. Apply per-item `socketExclusionOverrides` to re-add any blocked stat that should still be available.
4. **AR/PDR asymmetry:** If item has inherent PDR → remove entire ar_pdr exclusion group. If item has inherent AR only → ar_pdr group remains available.
5. Within the `ar_pdr` exclusion group, user can pick at most one (Additional Armor Rating OR Physical Damage Reduction).
6. MR and MDR are independent — each only blocked if that specific stat is inherent.

### Never-Socketable Stats

Move Speed, Headshot Damage Reduction, Max Health — can only appear as inherent stats, never as random modifiers.

### Range Tiers

Modifier socket ranges vary by slot type:
- **Armor slots** (head, chest, hands, legs, feet): lowest ranges (e.g., Armor Pen 1.5%–2.4%)
- **Rings**: mostly armor-level, but Physical/Magical Power (2–3) and Physical/Magical Healing (2–3) are higher. Natural max of 4 confirmed.
- **Back, Necklace**: higher ranges comparable to weapons (e.g., Armor Pen 3%–4.8%, Luck 30–48)
- **Two-handed weapons**: highest ranges (e.g., Armor Pen 3%–4.8%, Additional Weapon Damage +2)
- **One-handed weapons**: roughly half of two-handed (e.g., Armor Pen 1.5%–2.4%, Additional Weapon Damage +1)

### Weapon Held State

Three mutually exclusive states:
- **"none"** — bare-hands. No weapon stats applied.
- **"slot1"** — weapon loadout 1 active. Primary (and secondary if applicable) stats applied.
- **"slot2"** — weapon loadout 2 active. Primary (and secondary if applicable) stats applied.

The UI should show stat totals updating when switching between these three states. This is critical for builds that swap between a melee weapon and a casting implement (e.g., Spectral Blade for damage vs Spellbook for memory/buffs).

---

## Class System

### Class Definition Structure

Each class has:
- **Base stats:** 7 core attributes (STR, VIG, AGI, DEX, WIL, KNO, RES)
- **Base HP:** Starting health before gear/curves
- **Base Memory:** Starting spell memory capacity
- **Equippable armor:** Base armor types (perks can grant additional)
- **Spell cost type:** Warlock uses "health" (spells cost HP). Per-spell healthCost values.
- **Perks:** Max 4 active. Each has `statEffects` (additive bonuses fed to perkEffects) and `perkFlags` (boolean flags + typeDamageBonus maps). Class-agnostic: engine reads perk data, doesn't hardcode class-specific behavior.
- **Skills:** 2 slots. Includes Spell Memory I/II (required for casting). Combat skills (Blow of Corruption, Blood Pact, Phantomize). Skills with `dmg` field show inline damage.
- **Spells:** Up to 5 per Spell Memory skill. Memory cost = tier. Constrained by total memory capacity. Spells with `dmg` field show inline damage. Spells with self-buff effects appear as toggleable Active Buffs (via CLASS_BUFFS `sourceSpell` field).
- **Shared resources:** Class-level mechanics like Darkness Shards that multiple abilities interact with.

### Perk Effect System

Perks contribute to the stat pipeline via two mechanisms:

1. **`statEffects`** — additive bonuses merged into perkEffects object. E.g., Demon Armor: `[{ stat: "spellCastingSpeedBonus", value: -0.10 }]`
2. **`perkFlags`** — boolean flags and type bonus maps:
   - `{ antimagic: true }` → 20% separate magic DR multiplier
   - `{ fighterDefenseMastery: true }` → PDR cap raised to 75%
   - `{ typeDamageBonus: { dark_magical: 0.20 } }` → type-specific damage bonus
   - Multiple perks' typeDamageBonus maps are merged (not overwritten)

### Buff System

Active buffs are derived from equipped spells that have self-buff effects. Each buff in CLASS_BUFFS has:
- `sourceSpell` — the spell that must be equipped for this buff to appear
- `effects` with `phase`:
  - `"pre"` — applied to attrs/bonuses before computeDerivedStats (e.g., PoS +15 STR/VIG)
  - `"post"` — applied to derived stats after computeDerivedStats (e.g., ES break +50% SCS)
  - `"type_bonus"` — type-specific damage bonus from buff (e.g., ES break +30% dark_magical)

### Religion System

Blessings are flat post-curve additive bonuses, independent of class. Applied after all curve calculations. Stored as `ds.religionBonuses` for display. Noxulon (+20% RIS) VERIFIED; others at face value pending testing.

### Attribute → Derived Stat Mapping (from in-game tooltips)

| Attribute | Primary Effects | Secondary Effects |
|-----------|----------------|-------------------|
| STR | Physical Power, weapon damage | Health (slight) |
| VIG | Health | Health Recovery Bonus |
| AGI | Move Speed | Action Speed (slight) |
| DEX | Action Speed, Manual Dexterity, Regular Interaction Speed | Equip Speed |
| WIL | Magical Interaction Speed, Magic Power, Buff/Debuff Duration | Base Magic Resistance |
| KNO | Memory Capacity, Spell Casting Speed | Spell Recovery Bonus |
| RES | Regular Interaction Speed, install speed (traps/campfires) | Skill Cooldowns (CDR) |

---

## Application Components

1. **Stat Curve Engine** — Generic piecewise evaluator. Takes a curve definition (array of segments from stat_curves.json) and input value, returns output. One function handles all curves. Verified against naked Warlock baseline (15/20 exact matches, 4 display rounding).

2. **Gear Slot System** — 11 slots. Item selection (dropdown from gear DB filtered by class + armor type + perk grants) + random modifier inputs (constrained by slot pool and exclusion rules). Inherent stats displayed but not editable (except ranged inherents). Weapon held toggles.

3. **Attribute Aggregator** — Sums class base + all gear inherent stats + all gear random modifiers + active buff bonuses. Respects weapon held state. Applies attribute bonus multipliers (e.g., Curse of Weakness -25%) AFTER all additive sources.

4. **Class / Buff / Religion Manager** — Class dropdown populates perks, skills, spells. Perk checkboxes (max 4) with live stat effects. Skill dropdowns (2 slots). Spell selection grid with memory tracking. Active buff toggles derived from equipped spells. Religion blessing selector with post-curve bonuses. All state-driven, class-agnostic.

5. **Damage Calculator** — Physical damage formula and spell damage. Reads weapon/spell data. Validates magic damage types before applying type-specific bonuses. Handles separate damage instances (physical, magical, on-hit effects). Handles Antimagic as separate multiplicative layer. Inline spell/skill damage display uses weapon's `magicalDamage` + type bonuses from perks/buffs.

6. **DPS Module** — Per-hit damage × weapon swing timing / (1 + action speed).

7. **Comparison Engine** — Snapshot current build. Swap one piece. Show deltas for all derived stats and damage.

---

## User Data (Persistent Storage)

```
builds:{buildId}     → Full build state (class, gear, mods, perks, skills, spells, 
                        active buffs, weapon held state, target properties)
builds:index          → List of saved build names/IDs
preferences           → UI preferences (dummy mode, default class, etc.)
```

---

## Build Order

### Phase 0: Data Foundation ✅ (Complete)
1. Define JSON schemas — class definitions, items, slot modifier pools, stat curves
2. Populate Warlock data — all 11 perks, 5 skills, 13 spells, base stats verified
3. Populate stat curve definitions — all curves verified against naked Warlock baseline
4. Populate all 10 slot modifier pools — socket ranges confirmed from Goldsmith screenshots
5. Populate Warlock-relevant gear from current build as seed items
6. Capture Fighter base stats

### Phase 1: Core Engine ✅ (Complete)
1. Stat Curve Engine — generic piecewise evaluator, all 17 curves, unit tested against naked Warlock baseline + geared build
2. Attribute Aggregator — dynamic per-item aggregation (no hardcoded totals), class base + gear inherent + gear modifiers, weapon held state (3-way: none/slot1/slot2)
3. Derived Stat Pipeline — attributes → intermediate values → curves → post-curve bonuses → caps → final stats. All values verified against in-game display.
4. Damage Calculator — physical melee formula + spell damage + on-hit effects. Verified against Ruins training dummy (8 test points, all passing). Spectral Blade combo multipliers derived from in-game testing (1.0/1.05/1.1).

### Phase 2: UI & Gear System ✅ (Complete — 2026-04-08)
5. ✅ Gear slot UI — per-slot collapsible editors with item name, rarity, inherent stats, modifier rows
6. ✅ Derived stat display — two-column layout matching in-game stat screen, with breakdowns (PDR from AR/Bonuses, MDR from MR/Bonuses, PPB/MPB from Power/Bonuses)
7. ✅ Weapon held state toggles — 3-way (none/slot1/slot2) with live recalculation
8. ✅ Class selection system — dropdown with class-specific perks (checkboxes, max 4), skills (2 dropdowns), spells (toggleable grid with memory tracking), active buffs (from equipped spells), and religion blessing selector
9. ✅ Spell/skill damage display — inline damage calculations for equipped damage-dealing spells and skills, using weapon magical damage + type-specific bonuses from perks/buffs
10. ✅ Type-specific damage bonuses — generalizable system via perkFlags.typeDamageBonus maps and buff phase "type_bonus" effects. Dark Enhancement (+20% dark) verified in-game.
11. ✅ Dummy MDR corrected to 7.5% (from ~6%) — verified with 8 spell damage test points
12. ✅ Magical Damage vs Magic Weapon Damage distinction documented and implemented

### Phase 2 Remaining (UI convenience — no engine changes needed)
13. Gear comparison (delta display) — swap one piece, show stat deltas
14. Build save/load with persistent storage — window.storage API
15. Target property editor — configurable PDR/MDR instead of hardcoded dummy values

### Phase 3: Database & Polish
16. Populate gear database (Warlock-relevant Epic items first, expand to other classes)
17. Dropdown item selection from database with search/filter
18. Additional class definitions (Fighter perks/skills, other classes)
19. DPS module with weapon swing timings and combo multipliers
20. Full spell/ability damage modeling with all damage types
21. Skin system (optional stat modifiers from cosmetics)
