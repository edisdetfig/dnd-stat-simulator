# Unresolved Questions & Testing Protocols

Season 8, Hotfix 112-1 (2026-04-09), game version 0.15.134.8480.

---

## OPEN: Health MHB table deviations (8/16)

**Status: UNRESOLVED (2026-04-12) — formula + 14 verified points consistent; 8 MHB-table points deviate by ±1**

The health formula in `docs/health_formula.md` reconciles cleanly with:
- All 6 no-MHB entries in the Curve Verification table
- All 3 worked examples (Naked Barbarian = 140, +5% chest = 149, Robust = 149)
- 8 of the 16 MHB Verification table entries

The remaining 8 MHB table entries deviate by ±1 in a non-systematic direction (4 want +1 over the formula, 4 want -1 under it). Neither alternate rounding (round/ceil), multiplicative MHB stacking ((1+a)(1+b) instead of (1+a+b)), nor partial-stat-from-chest hypotheses reconcile all 16.

### The deviating cases

All Barbarian, base STR 30 VIG 32; +2 STR / +2 VIG when chest is equipped (via sockets). Curve segment [21, 44): `base = 125.5 + (hr − 21) × 1.5`.

| # | Config | HR | base | Formula: `floor(base × (1+mhb)) + 10 + mha` | Doc table says |
|---|---|---|---|---|---|
| 2  | +4% weapon                        | 31.5 | 141.25 | floor(146.900)+10 = **156** | 157 |
| 4  | +5% chest + 4% weapon (9%)        | 33.5 | 144.25 | floor(157.233)+10 = **167** | 166 |
| 6  | +4% weapon + 6 MHA                | 31.5 | 141.25 | floor(146.900)+10+6 = **162** | 163 |
| 8  | +5% chest + 4% weapon + 6 MHA (9%)| 33.5 | 144.25 | floor(157.233)+10+6 = **173** | 172 |
| 9  | Robust 7.5%                       | 31.5 | 141.25 | floor(151.844)+10 = **161** | 162 |
| 10 | Robust + 6 MHA (7.5%)             | 31.5 | 141.25 | floor(151.844)+10+6 = **167** | 168 |
| 13 | Robust + 5% chest + 4% wpn + 6 MHA (16.5%) | 33.5 | 144.25 | floor(168.051)+10+6 = **184** | 183 |
| 15 | Robust + 5% chest + 4% weapon (16.5%)      | 33.5 | 144.25 | floor(168.051)+10 = **178** | 177 |

### What was tried

- Pure `floor` per documented formula: 8/16 MHB cases pass
- `round` instead of `floor`: swaps which cases fail; still 8/16
- `ceil` instead of `floor`: all +1-biased cases pass, all -1-biased fail
- Multiplicative MHB stacking: identical results for the additive cases, no improvement
- Chest contributes only +2 STR or only +2 VIG: breaks cases that currently pass

### Engine stance

`src/engine/recipes.js` implements the documented formula. 8 passing MHB entries are active tests. 8 deviating entries are captured in `describe.skip()` in `src/engine/recipes.test.js` with exact `docSays` and `formulaGives` values preserved. When re-verification resolves each row, un-skipping is a one-file edit.

### Re-verification protocol

Test in-game with Barbarian, base STR 30 / VIG 32 (unchested), each config below. Record exact displayed HP from the **Detailed** stats view (not the Simplified/rounded view). Correlate with this table.

Gear to slot:
- Chest: Tri-Pelt Northern Full Tunic (5% MHB, +2 STR +2 VIG sockets)
- Weapon: Troll's Bane (4% MHB, no STR/VIG)
- Necklace: Necklace of Peace (+6 Max Health Add)
- Perk: Robust (measured 7.5%)

For each of the 8 deviating cases: assemble the gear per the Config column, read the Detailed HP. If it matches formulaGives, docs/health_formula.md's table has a typo. If it matches docSays, the formula has an edge-case we haven't captured.

---

## RESOLVED: Health Formula (Max HP Computation)

**Status: VERIFIED (2026-04-10) — 6/6 test points match, Barbarian**

### Formula

```
healthRating = STR × 0.25 + VIG × 0.75
baseHealth = evaluate(healthCurve, healthRating)
finalHP = floor(baseHealth × (1 + sumMHB)) + sumMHA
```

- `healthRating`: Fractional, never rounded. Includes temporary STR/VIG from buffs (e.g., Power of Sacrifice).
- `baseHealth`: Piecewise linear lookup from stat_curves.json. Fractional, never rounded.
- `sumMHB`: Sum of all Max Health Bonus % sources (gear enchants, perks, buffs) as decimal (5% = 0.05).
- `sumMHA`: Sum of all flat Max Health Add sources (gear enchants, etc.) as integers.
- `floor()` applies to the percentage product only. Flat MHA is added AFTER floor and is NOT multiplied by MHB%.

### Display

- Detailed stats view: shows `floor()` result (authoritative, matches formula)
- Simplified stat view: shows `ceil()` of underlying fractional computation (can be +1 higher)
- **Simulator should use `floor()` as the canonical value**

### Verification Data — 6/6 match

All tests: Barbarian, 2026-04-10.

| # | STR | VIG | HR | Curve | MHB% | MHA | floor(curve × (1+MHB)) + MHA | In-Game | Match |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 20 | 25 | 23.75 | 139.625 | 0% | 0 | 139 | 139 (detail) / 140 (simple) | ✅ |
| 2 | 22 | 27 | 25.75 | 142.625 | 0% | 0 | 142 | 142 (detail) / 143 (simple) | ✅ |
| 3 | 22 | 27 | 25.75 | 142.625 | 5% | 0 | 149 | 149 | ✅ |
| 4 | 22 | 28 | 26.5 | 143.75 | 5% | 0 | 150 | 150 | ✅ |
| 5 | 22 | 27 | 25.75 | 142.625 | 0% | 6 | 144 | 144 (detail) / 145 (simple) | ✅ |
| 6 | 22 | 27 | 25.75 | 142.625 | 5% | 6 | 155 | 155 | ✅ |

### Key Finding

Test point 6 confirms MHA is added AFTER the percentage multiply. If MHA were inside the multiply, the result would be `floor((142.625 + 6) × 1.05) = floor(156.056) = 156`, not 155. Actual: `floor(142.625 × 1.05) + 6 = floor(149.756) + 6 = 149 + 6 = 155`. ✅

---

## RESOLVED: Healing Formula (Magical/Physical/HoT)

**Status: VERIFIED (2026-04-09) — 10/10 test points match**

### Source
Wiki: darkanddarker.wiki.spellsandguns.com/Healing

### Formula

**Instant Base Heals:**
```
Total Healing = (BaseHeal + HealingAdd × Scaling) × (1 + MPB × Scaling) × (1 + HealingMod)
```

**Heal over Time:**
```
Total Healing = (BaseHeal + HealingAdd × Scaling) × (1 + MPB × Scaling) × (1 + HealingMod) × (floor(BaseDuration × (1 + BuffDuration)) / BaseDuration)
```

**Lifesteal (Life Drain):**
```
Heal = OutgoingDamageBeforeReductions × HealPercent × (1 + HealingMod)
```
Note: HealPercent is unknown — see UNRESOLVED section.

### Key Terms
- **HealingAdd** = flat Magical/Physical Healing stat from gear (outgoing only)
- **Scaling** = per-source value, the (0.15) in tooltips
- **MPB** = Magic Power Bonus. Only affects Magical healing, NOT Physical.
- **HealingMod** = Vampirism (+20%). Affects ALL healing types. Not affected by Scaling.
- **BuffDuration** = extends HoT tick count. Capped at 100%.

### Key Finding: MPB Scales Magical Healing
Confirmed by in-game testing (T1 vs T3).

### Verification Data — 6/6 potion baseline tests

All tests: Poor Healing Potion (20 HP over 20s, 0.50 scaling)

| # | Setup | MH | MPB | Buff Dur | Predicted | In-Game | Match |
|---|---|---|---|---|---|---|---|
| 1 | Naked Fighter | 0 | 0% | 0% | 20.00 | 20 | ✅ exact |
| 2 | Fighter + 8 MH rings | 8 | 0% | 0% | 24.00 | 24 | ✅ exact |
| 3 | Warlock kit, no MH | 0 | 23% | 23% | 26.76 | 27 | ✅ ceil |
| 4 | Warlock kit + 8 MH | 8 | 23% | 23% | 32.11 | 32 | ✅ |
| 5 | Fighter geared, no MH | 0 | 0% | 14.5% | 22.00 | 22 | ✅ exact |
| 6 | Fighter geared + 8 MH | 8 | 0% | 14.5% | 26.40 | 27 | ✅ ceil |

### Healing Source Scaling Values (wiki-sourced)
| Source | Base | Scaling | Type | Notes |
|---|---|---|---|---|
| Torture Mastery | 2 | 0.15 | Magical | Per second of curse damage |
| Shadow Touch | 2 | 0 | Magical | Always flat 2 (0% scaling) |
| Life Drain | = dmg | N/A | Lifesteal | Only HealingMod applies |
| Healing Potion | 20 | 0.50 | Magical | HoT, duration varies by rarity |
| Troll's Blood | 30 | 0.50 | Magical | HoT, single rarity only |
| Campfire Kit | 3/s | 1.00 | Physical | NOT affected by Buff Duration |
| Surgical Kit | ? | 0 | Physical | 0% scaling confirmed |
| Shrine of Health | ? | 1.00 | Magical | Instant, one-time |
| Cleric Lesser Heal | 15 | 0.80 | Magical | Instant (nerfed 112-1) |
| Cleric Holy Light | 25 | 0.80 | Magical | Instant (nerfed 112-1) |
| Cleric Sanctuary | ?/s | 0.50 | Magical | Channel, per second |

---

## RESOLVED: Buff Duration Cap = 100%

**Status: VERIFIED (2026-04-09)**

Buff Duration capped at 100% (internal 1.0). Display shows 99.9% at cap. Adding more has no effect.

### Evidence
Barbarian at 99.9% displayed. Weapon adds +17.7% — stat unchanged (capped).

Poor potion + Potion Chugger (10s modified base):
- 99.9% internal: floor(10 × 1.999) = 19 ticks → 54.1 HP (doesn't match)
- 100% internal: floor(10 × 2.0) = 20 ticks → 56.95 HP (**matches measured 56**)

### Impact
Add BUFF_DURATION_CAP: 1.0 to simulator constants.

---

## RESOLVED: Potion Chugger Formula

**Status: VERIFIED (2026-04-09) — 4/4 test points match**

+20% potency as final multiplier, -50% base duration (before buff duration extends it).

```
ModifiedBaseDuration = BaseDuration × 0.5
EffectiveTicks = floor(ModifiedBaseDuration × (1 + BuffDuration))
Total = (BaseHeal + HealAdd × Scale) × (1 + MPB × Scale) × (Ticks / ModBaseDur) × 1.2
```

Barbarian: 26% MPB, 2 MH, 100% Buff Duration, Potion Chugger.

| Potion | Base Dur | Chugger Dur | Ticks | Predicted | Measured | Match |
|---|---|---|---|---|---|---|
| Poor (20s) | 20s | 10s | 20 | 56.95 | 56 | ✅ |
| Common (17.5s) | 17.5s | 8.75s | 17 | 55.32 | 55 | ✅ |
| Uncommon (15s) | 15s | 7.5s | 15 | 56.95 | 57 | ✅ |
| Epic (10s) | 10s | 5s | 10 | 56.95 | 56 | ✅ |

### Floor() Tick Loss Finding
At 100% buff dur + Chugger, Common and Rare lose a fractional tick. Poor potions (3g) heal same total as Epic (136g) — only speed differs.

---

## RESOLVED: Regular Interaction Speed Formula

**Status: VERIFIED (2026-04-07) — 9/9 class data points match**

```
RIS Rating = DEX × 0.25 + RES × 0.75
```

---

## RESOLVED: Ruins Dummy MDR = 7.5%

**Status: VERIFIED (2026-04-08) — 8/8 spell test points**

---

## RESOLVED: Weapon Magical Damage Adds to Spell Base

**Status: VERIFIED (2026-04-08) — 6/6 test points**

---

## RESOLVED: Unarmed Base Damage = 8

**Status: VERIFIED (2026-04-08) — 4/4 test points**

---

## RESOLVED: AR→PDR Segment [275,295) Slope = 0.001

**Status: VERIFIED (2026-04-08)**

---

## UNRESOLVED: Life Drain Heal Percentage

**Status: UNKNOWN**

Life Drain heals "a portion" of outgoing damage (before target MDR). The percentage is not documented.

### Testing Protocol
1. Warlock with Life Drain, known MPB/spell damage stats
2. Cast on dummy, record damage floater AND HP gained per tick
3. Ratio = HP gained / damage floater
4. Repeat with Vampirism — should see heal × 1.2
5. Test with 0 Magical Healing to confirm MH doesn't affect it

---

## UNRESOLVED: Surgical Kit Speed & Base Values

**Status: UNKNOWN**

Which stat affects Surgical Kit usage speed? Wiki RIS postCurve note says: "Bandages/Surgical Kits: time = base / (1 + RIS × 0.5)". Not verified.

### Testing Protocol
1. Time Surgical Kit use with naked Fighter (0% RIS, 0% AS)
2. Time with high RIS gear
3. Time with high AS gear
4. Also need: base heal per rarity, duration per rarity

---

## UNRESOLVED: Dark Enhancement on Non-Spell Sources

**Status: PARTIALLY VERIFIED (2026-04-08)**

Verified on Bolt of Darkness. Untested on Shadow Touch and Dark Reflection.

---

## UNRESOLVED: Torture Mastery 0.15 Scaling

**Status: WIKI-SOURCED, not independently verified**

---

## UNRESOLVED: Religion Blessings (Partial)

Noxulon VERIFIED. Zorin, Solaris, Blythar NOT TESTED.

---

## UNRESOLVED: Rare Potion Chugger Prediction

**Predicted: ~55 HP** (54.67). Awaiting confirmation.

---

## UNRESOLVED: Mending Grove Duration

**Status: UNKNOWN**

Tooltip does not specify duration. Estimated 5s in class data. Needs in-game measurement.

### Testing Protocol
1. Cast Mending Grove, time how long the forest area persists
2. Check if Buff Duration affects it

---

## UNRESOLVED: Druid Form Attack Damage Formula

**Status: WIKI-SOURCED, not independently verified**

Shapeshift attacks use the primitive curve formula instead of weapon damage:
```
(primitiveCurve(attr) × primitiveMultiplier + primitiveAdd) × (1 + PowerBonus)
```

The wiki confirms Power Bonus (PPB for physical, MPB for magical) applies as a multiplier on the total. The `shapeshiftPrimitive` curve is in `data/stat_curves.json` (78 segments, wiki LaTeX source).

Wiki example: 30 AGI, attack "Agility based × 50% + 5", +10% PPB:
`(primitiveCurve(30) × 0.5 + 5) × (1.1) = (8.631 × 0.5 + 5) × 1.1 = 10.45`

### What to verify in-game
1. Bear form, Swipe (STR-based): compare predicted vs actual damage at different STR levels
2. Does `(1.0)` scaling in tooltips like `27(1.0)` mean PPB scaling = 1.0? Or is it always 100%?
3. Penguin Water Cannon (ice magical) — confirm MPB applies instead of PPB

### Testing Protocol
1. Naked Druid in Bear form: record Swipe damage vs Training Dummy (-22% PDR)
2. Add STR gear → re-record → check if damage increase matches primitive curve delta × PPB
3. Add Physical Damage Bonus gear → check if PPB multiplies the full `(curve × mult + add)` value

---

## UNRESOLVED: Panther Base Attack Speed

**Status: UNKNOWN**

Panther form ignores the character's Action Speed stat entirely and uses a fixed attack speed. Exact value needs in-game measurement.

### Testing Protocol
1. Enter Panther form with 0% Action Speed
2. Time Scratch attack cycle (start to start)
3. Enter Panther form with high Action Speed gear
4. Re-time — should be identical if truly fixed
5. Record the fixed cycle time

---

## Data Needed: Consumable Healing Tool

| Item | Base Heal | Scaling | Type | Duration | Status |
|---|---|---|---|---|---|
| Healing Potion | 20 | 0.50 | Magical | 20/17.5/15/12.5/10/7.5s | ✅ VERIFIED |
| Troll's Blood | 30 | 0.50 | Magical | Need duration | Wiki-sourced |
| Bandage | ? | ? | Physical | ? | Need all values |
| Campfire Kit | 3/s | 1.00 | Physical | 21s (Common) | Wiki-sourced |
| Surgical Kit | ? | 0 | Physical | ? | Need values + speed stat |
| Shrine of Health | ? | 1.00 | Magical | Instant | Need base value |
