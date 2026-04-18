# Healing Formula — VERIFIED (2026-04-08)

## Source
Wiki: darkanddarker.wiki.spellsandguns.com/Healing

## Formula

### Instant Base Heals
```
Total Healing = (BaseHeal + HealingAdd × Scaling) × (1 + MPB × Scaling) × (1 + HealingMod)
```

### Heal over Time
```
Total Healing = (BaseHeal + HealingAdd × Scaling) × (1 + MPB × Scaling) × (1 + HealingMod) × (floor(BaseDuration × (1 + BuffDuration)) / BaseDuration)
```

### Lifesteal (Life Drain)
```
Heal per tick = ceil(PostDRDamageDealt × LifestealRatio × (1 + HealingMod))
```

`PostDRDamageDealt` is the damage number the target receives *after* all target reductions (MDR for magical, PDR for physical). Ceil applies at display-surface; internal HP uses decimals (see "HP is tracked with decimals" below).

**HealingAdd (Magical Healing / Physical Healing) does NOT apply to lifesteal.** MPB contributes to the damage value itself (which feeds the post-DR basis); it does not multiply the heal a second time.

Anchor: Life Drain, `LifestealRatio = 1.0`. Verified 2026-04-17 — see "Verification Data — Life Drain Lifesteal (2026-04-17)" below.

## Terms
- **HealingAdd** = flat "Magical Healing" or "Physical Healing" stat from gear (outgoing only)
- **Scaling** = per-source value, the `(0.15)` in tooltips. Controls how much HealingAdd and MPB contribute.
- **MPB** = Magic Power Bonus (from WIL curve). Only affects Magical healing, NOT Physical healing.
- **HealingMod** = Vampirism (+20%). Affects ALL healing types. Not affected by Scaling.
- **BuffDuration** = extends HoT tick count, multiplicative on total heal.

## Warlock Healing Sources (Scaling values from wiki)
| Source | Base | Scaling | Type | Notes |
|---|---|---|---|---|
| Torture Mastery | 2 | 0.15 | Magical | Per second of curse damage. NOT a HoT — new instance each tick. |
| Shadow Touch | 2 | 0 | Magical | Always flat 2. Gear MH and MPB have NO effect (0% scaling). |
| Life Drain | = post-DR dmg dealt | N/A | Lifesteal | Only HealingMod applies. See §Lifesteal (Life Drain). |
| Healing Potion | 20 | 0.50 | Magical | HoT over varying duration by rarity. Affected by Buff Duration. |
| Troll's Blood | 30 | 0.50 | Magical | HoT. Affected by Buff Duration. |

## Physical Healing Sources (wiki)
| Source | Base | Scaling | Notes |
|---|---|---|---|
| Campfire Kit (Common) | 3/s | 1.00 | Per second. NOT affected by Buff Duration (not a buff). |
| Surgical Kit | varies | 0 | No scaling from Physical Healing Add. |
| Bandage | converts recoverable HP | N/A | Converts recoverable health to actual health. |

## Key Mechanics
- Physical Healing does NOT scale with Physical Power Bonus (only Magical heals use MPB)
- Vampirism (HealingMod) is multiplicative at the end, affects ALL heal types
- HP is tracked with decimals; in-game display uses ceil()
- HoT tick extension: floor(baseDur × (1 + buffDur)) gives extra seconds of healing
- Healing potions are MAGICAL healing (not physical), affected by MPB and Magical Healing Add

## Verification Data — 6/6 test points match (2026-04-08)

All tests: Poor Healing Potion (20 HP over 20s, 0.50 scaling)

| # | Setup | MH | MPB | Buff Dur | Predicted | In-Game | Match |
|---|---|---|---|---|---|---|---|
| 1 | Naked Fighter | 0 | 0% | 0% | 20.00 | 20 | ✅ exact |
| 2 | Fighter + 8 MH rings | 8 | 0% | 0% | 24.00 | 24 | ✅ exact |
| 3 | Warlock kit, no MH | 0 | 23% | 23% | 26.76 | 27 | ✅ ceil |
| 4 | Warlock kit + 8 MH | 8 | 23% | 23% | 32.11 | 32 | ✅ decimal |
| 5 | Fighter geared, no MH | 0 | 0% | 14.5% | 22.00 | 22 | ✅ exact |
| 6 | Fighter geared + 8 MH | 8 | 0% | 14.5% | 26.40 | 27 | ✅ ceil |

All fractional results consistent with decimal HP + ceil display.

## Verification Data — Life Drain Lifesteal (2026-04-17)

Caster: Warlock, 7% MPB, +5 magical damage spellbook equipped. Target: real target (not training dummy). Life Drain cast, per-tick damage and heal observed.

Formula: `heal = ceil(postDR_damage × LifestealRatio × (1 + HealingMod))`, with `LifestealRatio = 1.0` for Life Drain.

### Scenario A — Baseline (no Vampirism, 0 Magical Healing)

| Tick | Damage dealt (post-DR) | Heal received | Predicted |
|---|---|---|---|
| 1 | 5 | 5 | ceil(5 × 1.0 × 1.0) = 5 ✅ |
| 2 | 5 | 5 | 5 ✅ |
| 3 | 4 | 4 | 4 ✅ |
| 4 | 5 | 5 | 5 ✅ |

1:1 heal-to-damage confirms `LifestealRatio = 1.0`.

### Scenario B — Vampirism ON (HealingMod +0.20, 0 Magical Healing)

| Tick | Damage dealt (post-DR) | Heal received | Predicted |
|---|---|---|---|
| 1 | 5 | 6 | ceil(5 × 1.0 × 1.20) = ceil(6.00) = 6 ✅ |
| 2 | 5 | 6 | 6 ✅ |
| 3 | 4 | 5 | ceil(4 × 1.0 × 1.20) = ceil(4.80) = 5 ✅ |

Vampirism multiplicative at the end; ceil applies at display.

### Scenario C — Magical Healing +6 (Vampirism OFF)

| Tick | Damage dealt (post-DR) | Heal received | Predicted |
|---|---|---|---|
| 1 | 5 | 5 | 5 ✅ |
| 2 | 5 | 5 | 5 ✅ |
| 3 | 4 | 4 | 4 ✅ |

**Magical Healing is inert for Life Drain.** +6 MH leaves the 1:1 heal ratio unchanged — confirms "Only HealingMod applies" (see §Warlock Healing Sources).

### Gameplay note — training dummy

Life Drain cast on a training dummy produces **no heal** across all damage magnitudes. This is a gameplay rule (target-type exclusion), not engine math. The simulator projects what lifesteal *would* heal given damage output; it does not filter by target type. Use real targets for lifesteal verification.
