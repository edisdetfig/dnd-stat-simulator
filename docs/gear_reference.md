# Gear Reference (extracted from old `data_schemas.md`)

> **Status:** Reference only. Not authoritative for implementation — actual item data lives in code. Use this to understand the conceptual shape of gear items, slot modifier pools, and socket/exclusion rules.
>
> **Extracted from** the now-deleted `docs/data_schemas.md` (sections 2-5). Class-definition sections were obsolete and discarded with the rest of that doc.

---

## 1. Item Definition Schema

Each item is a unique definition. Variants (e.g., Frostlight Crystal Sword vs. Crystal Sword) are separate entries.

```jsonc
{
  "id": "spectral_blade",
  "name": "Spectral Blade",
  "slotType": "primaryWeapon",     // In-game "Slot Type" — single value
  "armorType": null,               // null for non-armor
  "weaponType": "sword",           // null for non-weapons; can be array (e.g. ["sword", "magicStuff"])
  "handType": "twoHanded",         // "oneHanded", "twoHanded", or null
  "requiredClasses": ["fighter", "warlock", "sorcerer"],
  "availableRarities": ["epic"],   // Subset of poor/common/uncommon/rare/epic/legendary/unique

  // Override random modifier count per rarity.
  // Standard mapping: poor=0, common=0, uncommon=1, rare=2, epic=3, legendary=4, unique=1 (3× natural range)
  "modifierCountOverrides": {},    // e.g. Foul Boots: { "rare": 3 }

  // Always-present stats. Use value (fixed) OR min/max (ranged, user picks within range).
  "inherentStats": [
    { "stat": "weaponDamage", "value": 40 },
    { "stat": "actionSpeed",  "value": 5, "unit": "percent" },
    // Ranged example:
    // { "stat": "armorRating", "min": 28, "max": 35 }
  ],

  // Inherent stats that should still be socketable (override general exclusion rule).
  "socketExclusionOverrides": [],

  // On-hit intrinsics (e.g., Spiked Gauntlet's 1 true physical damage).
  "onHitEffects": [],

  // Non-stat mechanics that don't fit standard categories.
  "specialProperties": []
}
```

### Design Notes
- **`id`** is the unique key. Variants get their own id.
- **`slotType`** values: `primaryWeapon`, `secondaryWeapon`, `head`, `chest`, `hands`, `legs`, `feet`, `back`, `ring`, `necklace`.
- **`handType`** — `"oneHanded"` permits a secondary slot item (shield/lantern/off-hand); `"twoHanded"` blocks it.
- **`inherentStats`** — `unit` defaults to `"flat"`; specify `"percent"` when applicable.
- **`requiredClasses`** — empty array means any class can equip (subject to armor type).
- **`modifierCountOverrides`** — only needed when item deviates from standard rarity → count mapping.

---

## 2. Slot Modifier Pool Schema

Defines what random modifiers are available per slot, with both **socket ranges** (via gems) and **natural roll ranges** (on-drop).

```jsonc
{
  "slotModifierPools": {
    "weapon_twoHanded": {
      "modifiers": [
        {
          "stat": "additionalWeaponDamage",
          "socketRange":  { "min": 2, "max": 2 },
          "naturalRange": { "min": 2, "max": 2 },
          "unit": "flat"
        },
        {
          "stat": "physicalDamageBonus",
          "socketRange":  { "min": 2, "max": 3.2 },
          "naturalRange": { "min": 2, "max": 4 },
          "unit": "percent"
        },
        {
          "stat": "additionalArmorRating",
          "exclusionGroup": "ar_pdr",   // mutually exclusive with physicalDamageReductionBonus
          "socketRange":  { "min": 3, "max": 4.8 },
          "naturalRange": { "min": 3, "max": 6 },
          "unit": "flat"
        }
        // ... more modifier definitions
      ]
    }
    // ... more pool keys
  }
}
```

### Pool keys
- **Armor/accessory slots:** match `slotType` directly (e.g., `head`, `chest`, `hands`, etc.).
- **Weapons:** use `weapon_oneHanded` and `weapon_twoHanded` since ranges differ by hand type. Items map to the correct pool at runtime via their `handType`.

### Socket exclusion logic (runtime)

1. Start with the slot's full modifier pool.
2. Remove any modifier where the item has that stat as inherent (general rule).
3. Apply the item's `socketExclusionOverrides` to re-add any stat that should still be available despite being inherent.
4. **AR/PDR asymmetry:**
   - If item has inherent `physicalDamageReductionBonus` → remove the entire `ar_pdr` exclusion group.
   - If item has inherent `armorRating` only → `ar_pdr` group remains available.
5. Enforce mutual exclusivity within each `exclusionGroup` — user can pick at most one.

### Range tiers (rough guide)
- **Armor slots** (head, chest, hands, legs, feet): lowest ranges (e.g., Armor Pen 1.5–2.4%)
- **Rings:** mostly armor-level, but Physical/Magical Power (2–3) and Physical/Magical Healing (2–3) are higher
- **Back, Necklace:** higher ranges comparable to weapons (e.g., Armor Pen 3–4.8%, Luck 30–48)
- **Two-handed weapons:** highest ranges (e.g., Armor Pen 3–4.8%, Additional Weapon Damage +2)
- **One-handed weapons:** roughly half of two-handed (e.g., Armor Pen 1.5–2.4%, Additional Weapon Damage +1)

### Never-socketable stats
Move Speed, Headshot Damage Reduction, Max Health — these only appear as inherent stats on items, never as random modifiers.

---

## 3. Modifier Exclusion Rules

Standalone rules object consumed by the runtime pool computation.

```jsonc
{
  "modifierExclusionRules": {
    // General rule: inherent stat blocks itself from socketing.
    // Per-item socketExclusionOverrides can re-allow specific stats.
    "generalRule": "inherent_blocks_self",

    // Named exclusion groups for mutual exclusivity in socketing.
    "exclusionGroups": {
      "ar_pdr": {
        "members": ["additionalArmorRating", "physicalDamageReductionBonus"],
        "description": "Can socket at most one of these two.",
        "dominantBlocker": "physicalDamageReductionBonus"
        // If item has inherent PDR, entire group is blocked.
        // If item has inherent AR (but not PDR), group remains available.
      }
    },

    "globalExemptions": []
  }
}
```

**MR / MDR note:** independent — each only blocked if that specific stat is inherent. No exclusion group.

---

## 4. Equipped Item Instance Schema

Represents a specific item a character has equipped — concrete values for ranged inherent stats and rolled random modifiers.

```jsonc
{
  "itemId": "spectral_blade",
  "rarity": "epic",

  // Only needed for inherent stats that have ranges.
  // Fixed inherent stats are read from the item definition.
  "inherentStatValues": {},
  // Example: { "armorRating": 32 }  — when AR inherent had range 28-35

  // Random modifiers — count based on rarity + any per-item overrides.
  "modifiers": [
    { "stat": "armorPenetration",       "value": 4.5 },
    { "stat": "physicalDamageBonus",    "value": 2.5 },
    { "stat": "additionalWeaponDamage", "value": 2 }
  ]
}
```

### Standard rarity → modifier count
| Rarity | Count |
|---|---|
| Poor | 0 |
| Common | 0 |
| Uncommon | 1 |
| Rare | 2 |
| Epic | 3 |
| Legendary | 4 |
| Unique | 1 (at 3× natural range) |

Per-item overrides via `modifierCountOverrides` on the item definition (e.g., Foul Boots: Rare with 3 mods).

---

## Usage

- **For reference, not specification.** Current gear code is authoritative for actual item shapes.
- **When adding new gear:** use this doc to understand how items, slot pools, and exclusion rules *conceptually* fit together.
- **When verifying gear data:** compare actual item values against in-game displays, not against this doc (may be stale).
