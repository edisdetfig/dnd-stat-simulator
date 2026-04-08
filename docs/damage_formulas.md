# Damage Formulas

Patch 6.10, Hotfix 112, Season 8. All formulas VERIFIED unless noted.

---

## Physical Melee Damage

```
Physical Damage = floor(
  ((((Base Weapon Damage + Buff Weapon Damage) × Combo Multiplier × Impact Zone)
    + Gear Weapon Damage) × (1 + Physical Power Bonus))
    + Additional Physical Damage)
  × Hit Location Multiplier
  × DR Multiplier
  × (1 - Projectile Reduction))
  + True Physical Damage
)
```

All in-game damage display is floored (rounded down).

### Components

- **Base Weapon Damage:** Tooltip value (e.g., 40 for Spectral Blade).
- **Buff Weapon Damage:** From spells like Bloodstained Blade (+5). Multiplied by Combo and Impact Zone.
- **Combo Multiplier:** Per-weapon, per-hit. See Verified Weapon Data below.
- **Impact Zone:** Per-weapon tip/mid/hilt multipliers. Varies by weapon type.
- **Gear Weapon Damage:** "+Additional Weapon Damage" affix. Added AFTER Combo/Impact Zone, BEFORE Power Bonus. Benefits from PPB. Does NOT apply to skills (Rupture, Caltrops, Achilles Strike) — only direct weapon attacks.
- **Physical Power Bonus:** PPB curve output (see stat_curves.json) + flat "Physical Damage Bonus" gear affixes.
- **Additional Physical Damage:** Flat affix from gear/perks. Does NOT benefit from PPB. Applies to any physical damage instance. Influenced by Attribute Bonus Ratio (Scaling).
- **Projectile Reduction:** Only for projectiles (arrows, bolts, throwables, some spells). From plate armor or Fighter's Projectile Resistance perk.
- **True Physical Damage:** Flat, added at the very end. Ignores PPB, hit location, DR, and all multipliers. Only affected by Attribute Bonus Ratio. **Display note:** True physical damage (e.g., Spiked Gauntlet +1) is rolled into the main physical damage number — NOT shown as a separate floater.

### Hit Location Multiplier

| Location | Multiplier |
|----------|-----------|
| Body | 1.0 |
| Head | 1.0 + 0.5 + Headshot Damage Bonus% − Target's Headshot Damage Reduction% |
| Limb | 0.5 |

AoE and DoT sources are NOT affected by hit location.

### DR Multiplier

```
DR_Multiplier = max(1 - Target_DR × (1 - Attacker_Pen), 1 - Target_DR)
```

- Penetration multiplies against the DR percentage, NOT Armor Rating.
- Pen cannot bring DR below 0% — no benefit to exceeding 100% pen.
- Pen has NO effect when target DR is 0% or negative.
- The max() prevents pen from reducing amplification on negative-DR targets.

**DR Caps (VERIFIED):**
- PDR cap: 65% (75% for Fighter with Defense Mastery perk)
- MDR cap: 65% (75% for Barbarian with Iron Will perk)
- The cap applies to the stat-screen DR value. Antimagic operates as a separate multiplicative layer AFTER the MDR cap.

---

## Spell / Skill Magical Damage — VERIFIED (2026-04-08)

```
Spell Damage = floor(
  (Base Damage + Weapon Magical Damage)
  × (1 + MPB × Scaling + Type Bonuses)
  × Hit Location Multiplier
  × MDR Multiplier
)
```

### Components

- **Base Damage:** Spell/skill tooltip value (e.g., 20 for Bolt of Darkness, 12 for Blow of Corruption).
- **Weapon Magical Damage:** The "Magical Damage" stat on the held weapon (e.g., Spellbook +5). Added to base damage before all multipliers. Only applies when that weapon is in the active held state. Zero when bare-handed or holding a weapon without this stat.
- **MPB:** Magic Power Bonus from curve + gear bonuses. Applies universally to all magic damage types.
- **Scaling:** The Attribute Bonus Ratio from the spell tooltip, shown as the parenthetical value. E.g., `20(1.0)` = base 20, scaling 1.0 (100% of MPB applies). `5(0.25)` = base 5, scaling 0.25 (25% of MPB applies).
- **Type Bonuses:** Type-specific damage bonuses from perks/buffs. ONLY apply to matching damage types. See Magic Damage Types section below.
- **Hit Location Multiplier:** Same as physical. Some spells are NOT affected by hit location (AoE, DoT). Per-spell `affectedByHitLocation` flag.
- **MDR Multiplier:** Same DR formula as physical, using target's MDR and attacker's Magic Penetration.

### CRITICAL: Magical Damage vs Magic Weapon Damage

These are TWO DIFFERENT weapon stats with completely different behaviors:

| Stat | Example | Adds to Spells? | Scales with MPB? | Purpose |
|------|---------|----------------|-------------------|---------|
| **Magical Damage** | Spellbook (+5) | YES — added to spell base damage | No (flat addition before multipliers) | Boosts spell damage when weapon is held |
| **Magic Weapon Damage** | Crystal Sword | NO — does not affect spells at all | YES — separate melee damage instance | Magic portion of melee attacks with the weapon |

**Key rules:**
- **Magical Damage** only applies to spells/skills when the weapon is in the active held state.
- **Magic Weapon Damage** is a separate melee damage instance calculated independently. It does NOT scale things that scale off of Magical Damage Bonus. However, Magic Weapon Damage itself scales off of your Magical Damage Bonus.
- Casting a spell with a Crystal Sword equipped provides NO bonus to spell damage from the Crystal Sword's Magic Weapon Damage. It's equivalent to casting bare-handed (unless the Crystal Sword has random modifiers that add Magical Damage Bonus or Magical Power).

---

## Separate Damage Instances

Multiple damage sources on a single hit are calculated SEPARATELY:

- Physical weapon damage (formula above, uses PPB, reduced by PDR)
- Magic weapon damage (if weapon has Magic Weapon Damage component, uses MPB, reduced by MDR — separate melee instance)
- On-hit effects (Shadow Touch, Dark Reflection — each independent)
- Skill/spell effects (BoC magic damage — independent instance)

**Display behavior (VERIFIED):**
- Shadow Touch: shown as a separate damage floater (2 dark magic)
- Spiked Gauntlet true physical: NOT shown separately — rolled into main physical number
- BoC: shown as a separate damage floater

---

## Magic Damage Types

Type-specific bonuses ONLY apply to matching types.

**Known types:** Dark, Evil, Divine, Curse, Neutral, Fire, Ice, Lightning

- **Magic Power Bonus** (from Will/gear) → ALL magic types universally.
- **Type-specific bonuses** (e.g., "dark magical damage bonus") → ONLY the named type.
- A Dark magic bonus does NOTHING for Evil, Divine, Curse, or other types.

Examples:
- Dark Enhancement perk (+20% dark magic dmg) → boosts Bolt of Darkness (Dark), Shadow Touch (Dark). Does NOT boost BoC (Evil).
- Eldritch Shield break bonus (+30% dark magic dmg) → boosts dark spells only, NOT BoC (Evil).

### Type Bonus in Formula

Type bonuses enter the formula as an additive term alongside MPB × Scaling:

```
damage = baseDamage × (1 + MPB × Scaling + TypeBonus)
```

For example, Bolt of Darkness with MPB 23% and Dark Enhancement (+20%):
```
damage = 20 × (1 + 0.23 × 1.0 + 0.20) = 20 × 1.43 = 28.6 → floor = 28 (bare hands)
```

**VERIFIED:** Dark Enhancement +20% on Bolt of Darkness with Spellbook (+5 Magical Damage), MPB 23%, dummy MDR 7.5%, Magic Pen 5%: body = 33, head = 49.

---

## On-Hit Effects (VERIFIED)

### Shadow Touch (Perk)
- Damage: 2 flat dark magical (true damage, scaling 0)
- Heal: 2 HP per melee hit
- Shown as separate damage floater
- Consistent across all combo hits (does not scale with combo multiplier)

### Spiked Gauntlet (Item)
- Damage: 1 true physical
- NOT shown as separate floater — added to main physical damage number
- Position in formula: added after floor(), as True Physical Damage term

### Dark Reflection (Perk)
- Damage: 15 dark magical (scaling 0.75, NOT true damage)
- Trigger: hit by melee attack
- Cooldown-based
- Verification: needs testing

---

## Blow of Corruption — VERIFIED

- Base damage: 12, Scaling: 1.0 (100% MPB applies)
- Damage type: Evil magical
- Formula: `floor((12 + weaponMagicalDmg) × (1 + MPB) × Hit_Location_Multiplier × MDR_Multiplier)`
- IS affected by hit location (headshot multiplier applies)
- IS reduced by target's MDR (not PDR)
- Cooldown: 24s
- Note: Weapon Magical Damage (from held weapon like Spellbook) adds to BoC base damage, same as spells.

---

## Antimagic Perk (VERIFIED)

Separate multiplicative layer, NOT additive to stat-screen MDR. Stat screen shows identical MDR with/without Antimagic equipped.

```
Effective_magic_damage_taken = (1 - min(MDR, MDR_cap)) × (1 - 0.20)
```

Does NOT apply vs divine magic (per in-game tooltip).

---

## Attribute Bonus Multipliers

Sources like Curse of Weakness multiply attributes AFTER all additive sources:

```
Final Attribute = Attribute × (1 + Attribute_Bonus)
```

Attributes can have decimals; in-game display rounds them.

---

## Verified Weapon Data

### Spectral Blade (Sword, Two-Handed) — VERIFIED

| Property | Value |
|----------|-------|
| Base Weapon Damage | 40 |
| Combo Multipliers | Hit 1: 1.0, Hit 2: 1.05, Hit 3: 1.1 |
| Impact Zones | Not yet tested (center assumed 1.0, hilt appears lower) |

---

## Test Dummy Properties (Ruins Map) — VERIFIED (2026-04-08)

| Property | Value | Verification |
|----------|-------|-------------|
| PDR | ~-22% (amplifies physical damage) | 8/8 physical tests match |
| MDR | **7.5%** | 8/8 spell tests match at 7.5%. Previously estimated ~6%, corrected via Bolt of Darkness bare-hands testing. |

At negative PDR, armor penetration has NO effect (max() in DR formula). Different dummy types/maps may differ. All testing on Ruins dummies.

---

## Verified Damage Test Points

### Physical Melee (Ruins Dummy, PDR -22%)

Warlock build: PPB 35.1% (with Spectral Blade held), MPB 23%, Armor Pen 10.5%, HS Bonus 5%, Spiked Gauntlet +1 true phys, Shadow Touch active.

| Test | Expected | In-Game | Status |
|------|----------|---------|--------|
| Spectral Blade, no BSB, body, hit 1 | floor(69.22)+1=70 | 70 | ✅ |
| Spectral Blade + BSB, body, hit 1 | floor(77.47)+1=78 | 78 | ✅ |
| Spectral Blade + BSB, body, hit 2 | floor(81.18)+1=82 | 82 | ✅ |
| Spectral Blade + BSB, body, hit 3 | floor(84.88)+1=85 | 85 | ✅ |
| Spectral Blade + BSB, headshot, hit 1 | floor(120.07)+1=121 | 121 | ✅ |
| Shadow Touch (all hits) | 2 dark magic | 2 | ✅ |

### Spell / Skill Damage (Ruins Dummy, MDR 7.5%) — VERIFIED 2026-04-08

Warlock build: MPB 23%. Bare hands = no weapon held (via Blood Pact). Spellbook = weapon slot 2 held (Magical Damage +5, Magic Pen 5%).

| Test | Build State | Formula | Expected | In-Game | Status |
|------|------------|---------|----------|---------|--------|
| BoC body | bare hands, no pen | `floor(12 × 1.23 × 0.925)` | 13 | 13 | ✅ |
| BoC head | bare hands, no pen | `floor(12 × 1.23 × 1.5 × 0.925)` | 20 | 20 | ✅ |
| BoD body | bare hands, no pen | `floor(20 × 1.23 × 0.925)` | 22 | 22 | ✅ |
| BoD head | bare hands, no pen | `floor(20 × 1.23 × 1.5 × 0.925)` | 34 | 34 | ✅ |
| BoD body | spellbook (+5, 5% pen) | `floor(25 × 1.23 × 0.92875)` | 28 | 28 | ✅ |
| BoD head | spellbook (+5, 5% pen) | `floor(25 × 1.23 × 1.5 × 0.92875)` | 42 | 42 | ✅ |
| BoD + DE body | spellbook, Dark Enh +20% | `floor(25 × 1.43 × 0.92875)` | 33 | 33 | ✅ |
| BoD + DE head | spellbook, Dark Enh +20% | `floor(25 × 1.43 × 1.5 × 0.92875)` | 49 | 49 | ✅ |
