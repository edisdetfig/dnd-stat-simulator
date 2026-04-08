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
The RIS curve in stat_curves.json is verified correct. All 9 piecewise segments produce exact matches against in-game values when the +12% religion bonus is accounted for.

### Verification Data (all classes, naked, Blessing of Noxulon active)

| Class      | DEX | RES | Rating | Curve Output | +12% Religion | In-Game | Match |
|------------|-----|-----|--------|-------------|---------------|---------|-------|
| Fighter    | 15  | 15  | 15.00  | 0.0%        | 12.0%         | 12%     | ✅    |
| Barbarian  | 12  | 12  | 12.00  | -4.5%       | 7.5%          | 7.5%    | ✅    |
| Rogue      | 20  | 25  | 23.75  | 46.0%       | 58.0%         | 58%     | ✅    |
| Ranger     | 17  | 23  | 21.50  | 35.2%       | 47.2%         | 47.2%   | ✅    |
| Wizard     | 17  | 15  | 15.50  | 2.8%        | 14.8%         | 14.8%   | ✅    |
| Cleric     | 13  | 12  | 12.25  | -4.1%       | 7.9%          | 7.9%    | ✅    |
| Bard       | 22  | 15  | 16.75  | 9.8%        | 21.8%         | 21.8%   | ✅    |
| Warlock    | 15  | 14  | 14.25  | -1.1%       | 10.9%         | 10.9%   | ✅    |
| Sorcerer   | 17  | 12  | 13.25  | -2.6%       | 9.4%          | 9.4%    | ✅    |

Additional Warlock test points (with gear, Noxulon active):
- DEX 17 (Spiked Gauntlet only), RES 14: 11.6% in-game, curve = -0.4% + 12% = 11.6% ✅
- DEX 27 (full gear, no weapon), RES 14: 24.6% in-game, curve = 12.6% + 12% = 24.6% ✅

---

## UNRESOLVED: Religion / Blessing System

### What We Know
The game has a religion/blessing system that applies flat stat bonuses. These appear to be post-curve additive bonuses.

#### Known Blessings (from in-game screenshots)
| Blessing | Cost | Tooltip | Actual Effect | Verified? |
|----------|------|---------|---------------|-----------|
| Blessing of Noxulon | 20 | "Gain 20% regular interaction speed" | +20% flat RIS (post-curve) | VERIFIED — DaD UI display bug initially showed 12%, corrected after UI refresh |
| Blessing of Blythar | 20 | "Gain 30 Luck" | Likely +30 Luck (flat) | NOT TESTED |
| Blessing of Solaris | 20 | "Gain 5% cooldown reduction bonus" | Likely +5% CDR (flat) | NOT TESTED |
| Blessing of Zorin | 16 | "Gain 8% magic penetration" | Likely +8% Magic Pen (flat) | NOT TESTED |

### Noxulon Display Bug (RESOLVED)
Initial testing showed an apparent 20% → 12% discrepancy across 9 classes. After further investigation:
- Toggling UI elements in-game corrected the display — Fighter (all 15s) then showed 20% as expected
- A friend with a **different religion** on a base Fighter (all 15s, no gear) confirmed **0% RIS** — proving the curve's zero-point at rating 15 is correct
- The +12% readings were a **UI display bug in Dark and Darker**, not a real mechanical discrepancy
- **Blessing of Noxulon applies a flat +20% RIS post-curve**, exactly as the tooltip states

**Note:** The DaD client may display stale/incorrect stat values until the UI is refreshed. When verifying stats, toggle equipment or UI elements to force a refresh if values seem off.

### Testing Protocol
To fully characterize the religion system:
1. **Test other blessings** when possible — verify Solaris CDR, Zorin magic pen, and Blythar luck apply at face value
2. **Check if blessing values scale with faith/devotion level** (if such a system exists)
3. **Always force UI refresh** when testing — DaD client may display stale stat values

### Impact on Simulator
For now, religion bonuses should be modeled as flat post-curve additive modifiers. The user must input the ACTUAL effective value (not the tooltip value) until the scaling is understood.

The simulator should add:
- A religion/blessing selector or manual stat bonus input
- Blessings apply as flat additive bonuses to their respective derived stats
- Display should show the religion bonus separately (similar to "from bonuses" for PDR/MDR)

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

Note: Full base stat sets (all 7 attributes) still needed for classes other than Warlock.
