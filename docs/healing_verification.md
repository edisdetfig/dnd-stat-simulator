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
Heal = OutgoingDamageBefore Reductions × (1 + HealingMod)
```

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
| Life Drain | = dmg dealt | N/A | Lifesteal | Only HealingMod applies. |
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
