# Unresolved Questions & Testing Protocols

Patch 6.10, Hotfix 112, Season 8.

---

## RESOLVED: Regular Interaction Speed Formula

**Status: VERIFIED (2026-04-07) — 9/9 class data points match**

### Input Formula
```
Regular Interaction Speed Rating = DEX × 0.25 + RES × 0.75
```
Weights confirmed correct. Matches wiki (darkanddarker.wiki.spellsandguns.com/Stats).

### Curve
The RIS curve in stat_curves.json is verified correct. All 9 piecewise segments produce exact matches against in-game values when the +20% religion bonus is accounted for.

### Verification Data (all classes, naked, Blessing of Noxulon active)

| Class      | DEX | RES | Rating | Curve Output | +20% Religion | In-Game | Match |
|------------|-----|-----|--------|-------------|---------------|---------|-------|
| Fighter    | 15  | 15  | 15.00  | 0.0%        | 20.0%         | 20%     | ✅    |
| Barbarian  | 12  | 12  | 12.00  | -4.5%       | 15.5%         | 15.5%   | ✅    |
| Rogue      | 20  | 25  | 23.75  | 46.0%       | 66.0%         | 66%     | ✅    |
| Ranger     | 17  | 23  | 21.50  | 35.2%       | 55.2%         | 55.2%   | ✅    |
| Wizard     | 17  | 15  | 15.50  | 2.8%        | 22.8%         | 22.8%   | ✅    |
| Cleric     | 13  | 12  | 12.25  | -4.1%       | 15.9%         | 15.9%   | ✅    |
| Bard       | 22  | 15  | 16.75  | 9.8%        | 29.8%         | 29.8%   | ✅    |
| Warlock    | 15  | 14  | 14.25  | -1.1%       | 18.9%         | 18.9%   | ✅    |
| Sorcerer   | 17  | 12  | 13.25  | -2.6%       | 17.4%         | 17.4%   | ✅    |

Additional Warlock test points (with gear, Noxulon active):
- DEX 17 (Spiked Gauntlet only), RES 14: 19.6% in-game, curve = -0.4% + 20% = 19.6% ✅
- DEX 27 (full gear, no weapon), RES 14: 32.6% in-game, curve = 12.6% + 20% = 32.6% ✅

---

## RESOLVED: Ruins Dummy MDR

**Status: VERIFIED (2026-04-08) — 8/8 spell test points match at 7.5%**

Previously estimated as ~6% (based on limited BoC testing where 6% and 7.5% produce the same floored result). Corrected via Bolt of Darkness testing with bare hands vs spellbook:

- MDR 6% predicts BoD bare-hands body = 23 (WRONG — in-game shows 22)
- MDR 7.5% predicts BoD bare-hands body = 22 (CORRECT)
- All 8 spell test points match at MDR 7.5% (see damage_formulas.md for full table)

**Dummy MDR = 7.5%** for all future calculations.

---

## RESOLVED: Weapon "Magical Damage" Adds to Spell Base Damage

**Status: VERIFIED (2026-04-08) — 6/6 test points confirm**

The "Magical Damage" stat on weapons (e.g., Spellbook +5) adds flat damage to the spell's base damage before all multipliers. This is a DIFFERENT stat from "Magic Weapon Damage" (which is magic melee damage on weapons like Crystal Sword).

**Evidence:**
- Bolt of Darkness bare-hands body: 22 = floor(20 × 1.23 × 0.925)
- Bolt of Darkness Spellbook body: 28 = floor((20+5) × 1.23 × 0.92875) — the +5 from Spellbook's Magical Damage
- Bolt of Darkness Spellbook + Dark Enhancement body: 33 = floor((20+5) × 1.43 × 0.92875)

**Key distinction:**
| Stat | Example | Adds to Spells? | Scales with MPB? |
|------|---------|----------------|-----------------|
| Magical Damage | Spellbook (+5) | YES | No (flat addition) |
| Magic Weapon Damage | Crystal Sword | NO | YES (separate melee instance) |

Casting a spell while holding a Crystal Sword provides NO spell damage bonus from Magic Weapon Damage. Only the "Magical Damage" stat affects spells.

---

## RESOLVED: Noxulon Blessing — +20% RIS (not 12%)

**Status: VERIFIED (2026-04-07)**

Initial testing showed an apparent 20% → 12% discrepancy across 9 classes. After further investigation:
- Toggling UI elements in-game corrected the display — Fighter (all 15s) then showed 20% as expected
- A friend with a **different religion** on a base Fighter (all 15s, no gear) confirmed **0% RIS** — proving the curve's zero-point at rating 15 is correct
- The +12% readings were a **UI display bug in Dark and Darker**, not a real mechanical discrepancy
- **Blessing of Noxulon applies a flat +20% RIS post-curve**, exactly as the tooltip states

**Note:** The DaD client may display stale/incorrect stat values until the UI is refreshed. When verifying stats, toggle equipment or UI elements to force a refresh if values seem off.

---

## UNRESOLVED: Religion / Blessing System — Remaining Blessings

### What We Know
The game has a religion/blessing system that applies flat stat bonuses. These are post-curve additive bonuses. Noxulon verified; others modeled at face value.

#### Known Blessings
| Blessing | Cost | Tooltip | Actual Effect | Verified? |
|----------|------|---------|---------------|-----------|
| Blessing of Noxulon | 20 | "Gain 20% regular interaction speed" | +20% flat RIS (post-curve) | VERIFIED |
| Blessing of Blythar | 20 | "Gain 30 Luck" | Likely +30 Luck (flat) | NOT TESTED |
| Blessing of Solaris | 20 | "Gain 5% cooldown reduction bonus" | Likely +5% CDR (flat) | NOT TESTED |
| Blessing of Zorin | 16 | "Gain 8% magic penetration" | Likely +8% Magic Pen (flat) | NOT TESTED |

### Testing Protocol
1. **Test other blessings** when possible — verify Solaris CDR, Zorin magic pen, and Blythar luck apply at face value
2. **Check if blessing values scale with faith/devotion level** (if such a system exists)
3. **Always force UI refresh** when testing — DaD client may display stale stat values

### Impact on Simulator
Religion bonuses are modeled as flat post-curve additive modifiers. Implemented as a dropdown selector in the UI with per-blessing effect definitions. UNVERIFIED blessings show a warning tag.

---

## UNRESOLVED: Dark Enhancement Type Bonus on Non-Spell Sources

**Status: PARTIALLY VERIFIED (2026-04-08)**

Dark Enhancement's +20% dark magic damage bonus is verified working on Bolt of Darkness (dark_magical spell). Untested on:
- Shadow Touch (2 flat dark magical, scaling 0) — since scaling is 0, the type bonus enters as `typeBonuses` in the formula: `floor(2 × (1 + 0 × MPB + 0.20) × ...)` = `floor(2 × 1.20 × ...)`. Does DE boost Shadow Touch? Needs in-game testing.
- Dark Reflection (15 dark magical, scaling 0.75) — similar question.

### Testing Protocol
1. Equip Shadow Touch + Dark Enhancement. Hit dummy. Does Shadow Touch floater change from 2 to something higher?
2. Same for Dark Reflection if testable.

---

## Verified Class Base Stats (from religion testing, 2026-04-07)

DEX and RES confirmed for 9 of 10 classes (Druid unavailable):

| Class      | DEX | RES | Source |
|------------|-----|-----|--------|
| Fighter    | 15  | 15  | in-game naked |
| Barbarian  | 12  | 12  | in-game naked |
| Rogue      | 20  | 25  | in-game naked |
| Ranger     | 17  | 23  | in-game naked |
| Wizard     | 17  | 15  | in-game naked |
| Cleric     | 13  | 12  | in-game naked |
| Bard       | 22  | 15  | in-game naked |
| Warlock    | 15  | 14  | in-game naked (previously verified) |
| Sorcerer   | 17  | 12  | in-game naked |
| Druid      | ?   | ?   | unavailable |

Note: Full base stat sets (all 7 attributes) still needed for classes other than Warlock and Fighter.
