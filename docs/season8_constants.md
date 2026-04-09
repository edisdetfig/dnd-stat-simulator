# Season 8 Constants & Global Rules

Season 8, Hotfix 112-1 (2026-04-09), game version 0.15.134.8480.

---

## Global Caps

| Constant | Value | Notes |
|----------|-------|-------|
| PDR cap | 65% | 75% for Fighter with Defense Mastery perk |
| MDR cap | 65% | 75% for Barbarian with Iron Will perk |
| Move Speed cap | 330 | Hard cap |
| CDR cap | 65% | Both curve and final |
| Manual Dexterity cap | 55% | Curve + final |
| PPB/MPB lower limit | -100% | |

## Combat Constants

| Constant | Value |
|----------|-------|
| Headshot base multiplier | +0.5 (Head = 1.0 + 0.5 + HS bonus − target HS DR) |
| Limb multiplier | 0.5 |
| Base move speed | 300 (before AGI curve and gear) |

## Test Dummy Properties (Ruins Map) — VERIFIED (2026-04-08)

| Property | Value | Verification |
|----------|-------|-------------|
| PDR | ~-22% (amplifies physical damage) | 8/8 physical melee tests match |
| MDR | **7.5%** | 8/8 spell tests match. Previously estimated ~6%; corrected 2026-04-08 via Bolt of Darkness bare-hands vs spellbook testing. |

At negative PDR, armor penetration has NO effect (max() in DR formula). Different dummy types/maps may differ. All testing on Ruins dummies.

---

## Display Rules (VERIFIED)

- **Percentage stats:** Rounded to 1 decimal place (Math.round). Verified: Action Speed 20.475% displays as 20.5%, CDR -2.0% displays as -2%.
- **Damage numbers:** Floored (Math.floor). All damage display uses floor.
- **Health:** Integer display. Curve output uses ceil() before adding Max Health (see below).

---

## Derived Stat Formulas (quick reference)

How attributes feed into intermediate values before entering stat curves (curve definitions in stat_curves.json):

| Derived Value | Formula |
|---------------|---------|
| Physical Power | STR × 1 + gear PP bonuses |
| Magical Power | WIL × 1 + gear MP bonuses |
| Health Rating | STR × 0.25 + VIG × 0.75 |
| Action Speed Rating | AGI × 0.25 + DEX × 0.75 |
| Regular Interaction Rating | DEX × 0.25 + RES × 0.75 (weights uncertain) |
| Final PPB | PPB(curve) + flat "Physical Damage Bonus" gear % |
| Final MPB | MPB(curve) + flat "Magical Damage Bonus" gear % |
| Final HP | **ceil**(Health(curve)) + Max Health from gear. VERIFIED: HR 22.75 → curve 138.125 → ceil 139 + 6 = 145. |
| Final Move Speed | 300 + MoveSpeed(curve) + gear move mods (cap 330) |
| Final Action Speed | ActionSpeed(curve) + flat gear % |
| Final PDR | min(PDR(curve) + flat gear PDR%, PDR cap) |
| Final MDR | min(MDR(curve) + flat gear MDR%, MDR cap). When capped, in-game "from bonuses" shows effective amount applied (cap − curve), not total bonus. |
| Final AR | AR_from_items × (1 + Item_AR_Bonus) + other_AR_sources |
| Total Memory | ceil(MemCap(KNO) × (1 + MemCap Bonus%)) + Add MemCap |
| Cast Time | Base Cast Time / (1 + Spell Casting Speed) |
| Interaction Time | Base Time / (1 + Regular Interaction Speed) |
| Bandage Time | Base Time / (1 + RIS × 0.5) |
| Reduced Cooldown | Base CD × (1 - CDR) |
| Perk CD (debuff) | Base × (1 - (-Debuff_Duration + CDR)) |
| Health per tick | Base Recovery × (1 + Health Recovery Bonus) |
| SP per tick | Base Recharge × (1 + Memory Recovery Bonus) |

---

## Season 8 Key Changes

- Arena gear capped at Epic quality; all items retained on loss; no duplicate classes per team
- HP Bonus affixes removed from equipment
- Headshot multiplier reduced to 1.5x (from 1.75x)
- True Damage and All Attributes affixes removed from the random roll pool (no new "Add Damage" affix was created — the remaining affixes are Additional Weapon Damage, Additional Physical Damage, Additional Magical Damage, etc.)
- Longsword riposte multiplier changed from 1.50 to 1.35
- Torture Mastery now only restores regenerable health
- Void Blade changed to Legendary rarity (not Arena-legal)
- Spectral Blade headshot damage bonus reduced from 10% to 5%

---

## Hotfix 112-1 Changes (2026-04-09)

**Cleric**
- Lesser Heal and Holy Light scaling reduced from 1.0 to 0.8

**Fighter**
- Weapon Guard: Impact Resistance removed, +5% Action Speed added

**Bard**
- Shriek of Weakness: Armor Rating removed, Physical Damage Reduction -3/-6/-9% added
- Harmonic Shield: Armor Rating and Magic Resistance removed, Physical and Magical Damage Reduction +3/4/5% added respectively

**Weapons**
- Longsword riposte second hit animation sped up
- Icefang riposte second hit added
