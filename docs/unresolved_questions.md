# Unresolved Questions & Testing Protocols

Season 8, Hotfix 112-1 (2026-04-09), game version 0.15.134.8480.

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

## Verified Class Base Stats

| Class | DEX | RES | Full Stats |
|---|---|---|---|
| Fighter | 15 | 15 | All 15s ✅ |
| Warlock | 15 | 14 | Full set ✅ |
| Others | DEX/RES only | | Need full sets |
| Druid | ? | ? | Unavailable |

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
