# Health Formula — Technical Specification

Season 8, Hotfix 112 (Patch 6.10). VERIFIED in-game.

---

## Formula

```
healthRating = STR × 0.25 + VIG × 0.75

baseHealth = evaluate(healthCurve, healthRating)

if sumMHB = 0:
  finalHP = ceil(baseHealth) + 10 + sumMHA

if sumMHB > 0:
  finalHP = floor(baseHealth × (1 + sumMHB)) + 10 + sumMHA
```

---

## Terms

| Term | Description |
|------|-------------|
| `STR` | Total Strength from all sources (class base + all gear + buffs). Can be fractional after attribute multipliers. |
| `VIG` | Total Vigor from all sources. Same rules as STR. |
| `healthRating` | Intermediate value. Fractional, never rounded. Not displayed in-game. |
| `baseHealth` | Pre-patch health from piecewise curve. Fractional, never rounded at this stage. |
| `sumMHB` | Sum of all Max Health Bonus % sources as a decimal (5% = 0.05). All sources are additive. |
| `sumMHA` | Sum of all flat Max Health Add sources. Integers in practice. |
| `10` | Flat patch bonus (Hotfix 112). Added after rounding. Never scaled by MHB%. |

---

## Health Curve (Pre-Patch Base Values)

The +10 patch bonus is NOT included in these values. It is always added separately at the end.

```json
{
  "segments": [
    { "start": 0,  "end": 15,  "startValue": 85.0,   "slope": 2.0 },
    { "start": 15, "end": 21,  "startValue": 115.0,  "slope": 1.75 },
    { "start": 21, "end": 44,  "startValue": 125.5,  "slope": 1.5 },
    { "start": 44, "end": 48,  "startValue": 160.0,  "slope": 1.25 },
    { "start": 48, "end": 64,  "startValue": 165.0,  "slope": 1.0 },
    { "start": 64, "end": 100, "startValue": 181.0,  "slope": 0.5 }
  ]
}
```

**Evaluation:** Find the segment where `start <= healthRating < end`, then:
```
baseHealth = segment.startValue + (healthRating - segment.start) × segment.slope
```

---

## Rounding Rules

| Condition | Rounding |
|-----------|----------|
| No MHB% active (sumMHB = 0) | `ceil(baseHealth)` |
| MHB% active (sumMHB > 0) | `floor(baseHealth × (1 + sumMHB))` |

The +10 patch bonus and MHA are always added after rounding — they are integers and don't affect the rounding step.

---

## MHB% Sources

All MHB% sources are **additive** — they sum into a single value before being applied.

Example: Robust (7.5%) + chest enchant (5%) + weapon (4%) = 16.5% total.

Sources include gear inherent stats, perks, and active buffs/skills.

### Known MHB Values

| Source | Tooltip | Measured | Notes |
|--------|---------|----------|-------|
| Robust perk | 8% | 7.5% | Tooltip discrepancy. 7.5% verified across 16 tests; 8% fails. |
| Gear enchants | Varies | Matches tooltip | No discrepancies observed. |
| War Cry | 25% | Not yet verified | Use tooltip until tested. |

---

## MHA Sources

Flat HP from gear inherent stats (e.g., Necklace of Peace: +6 Max Health). Never scaled by MHB%. Added after rounding as a simple integer addition. Only appears as inherent stats — never socketable.

---

The simulator should output the detailed view value.

---

## Worked Examples

### Naked Barbarian (STR 20, VIG 25)
- healthRating = 20 × 0.25 + 25 × 0.75 = 23.75
- baseHealth = 125.5 + (23.75 − 21) × 1.5 = 129.625
- No MHB: ceil(129.625) + 10 = 130 + 10 = **140** ✅

### With 5% MHB Chest (+2 STR, +2 VIG)
- STR 22, VIG 27 → healthRating = 25.75
- baseHealth = 125.5 + (25.75 − 21) × 1.5 = 132.625
- floor(132.625 × 1.05) + 10 = floor(139.256) + 10 = 139 + 10 = **149** ✅

### With 5% MHB Chest + 6 MHA Necklace
- STR 22, VIG 27 → baseHealth = 132.625
- floor(132.625 × 1.05) + 10 + 6 = 139 + 10 + 6 = **155** ✅

### Naked Barbarian + Robust Perk
- STR 20, VIG 25 → baseHealth = 129.625
- floor(129.625 × 1.075) + 10 = floor(139.347) + 10 = 139 + 10 = **149** ✅

---

## Verification Data

### Curve Verification (no MHB, no MHA, Barbarian)

| # | STR | VIG | HR | baseHealth | ceil + 10 | Actual | |
|---|-----|-----|----|------------|-----------|--------|---|
| 1 | 20 | 25 | 23.75 | 129.625 | 140 | 140 | ✅ |
| 2 | 20 | 28 | 26.0 | 133.0 | 143 | 143 | ✅ |
| 3 | 24 | 29 | 27.75 | 135.625 | 146 | 146 | ✅ |
| 4 | 26 | 31 | 29.75 | 138.625 | 149 | 149 | ✅ |
| 5 | 28 | 32 | 31.0 | 140.5 | 151 | 151 | ✅ |
| 6 | 30 | 34 | 33.0 | 143.5 | 154 | 154 | ✅ |

### MHB Verification (Barbarian, base STR 30, VIG 32 without chest)

Chest: Tri-Pelt Northern Full Tunic (5% MHB, +2 STR, +2 VIG via sockets).
Weapon: Troll's Bane (4% MHB, no STR/VIG).
Necklace: Necklace of Peace (+6 Max Health Add).
Robust perk: measured at 7.5% (tooltip says 8%).

| # | Robust | Chest | Necklace | Weapon | sumMHB | MHA | Actual |
|---|--------|-------|----------|--------|--------|-----|--------|
| 1 | — | — | — | — | 0% | 0 | 152 |
| 2 | — | — | — | 4% | 4% | 0 | 157 |
| 3 | — | 5% | — | — | 5% | 0 | 161 |
| 4 | — | 5% | — | 4% | 9% | 0 | 166 |
| 5 | — | — | +6 | — | 0% | 6 | 158 |
| 6 | — | — | +6 | 4% | 4% | 6 | 163 |
| 7 | — | 5% | +6 | — | 5% | 6 | 167 |
| 8 | — | 5% | +6 | 4% | 9% | 6 | 172 |
| 9 | 7.5% | — | — | — | 7.5% | 0 | 162 |
| 10 | 7.5% | — | +6 | — | 7.5% | 6 | 168 |
| 11 | 7.5% | — | +6 | 4% | 11.5% | 6 | 173 |
| 12 | 7.5% | 5% | +6 | — | 12.5% | 6 | 178 |
| 13 | 7.5% | 5% | +6 | 4% | 16.5% | 6 | 183 |
| 14 | 7.5% | — | — | 4% | 11.5% | 0 | 167 |
| 15 | 7.5% | 5% | — | 4% | 16.5% | 0 | 177 |
| 16 | 7.5% | 5% | — | — | 12.5% | 0 | 172 |

---

## Constants

```javascript
const HEALTH_CONSTANTS = {
  PATCH_BONUS: 10,
  HR_STR_WEIGHT: 0.25,
  HR_VIG_WEIGHT: 0.75,
  ROBUST_ACTUAL_MHB: 0.075,
};
```

---

## Key Rules

1. healthRating = STR × 0.25 + VIG × 0.75. Fractional, never rounded.
2. Curve lookup produces fractional baseHealth. Never rounded at this stage.
3. All MHB% sources sum additively into one value.
4. When sumMHB = 0: ceil the baseHealth. When sumMHB > 0: floor(baseHealth × (1 + sumMHB)).
5. Add +10 patch bonus after rounding. Never scaled by MHB%.
6. Add flat MHA after rounding. Never scaled by MHB%.
7. All gear stats (including from MHB% items) are included in STR/VIG totals feeding the curve.
8. Robust perk is internally 7.5%, not 8% as tooltip states.
