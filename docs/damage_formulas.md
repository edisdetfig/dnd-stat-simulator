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

## Separate Damage Instances

Multiple damage sources on a single hit are calculated SEPARATELY:

- Physical weapon damage (formula above, uses PPB, reduced by PDR)
- Magical weapon damage (if weapon has magic component, uses MPB, reduced by MDR)
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
- Dark Enhancement perk (+20% dark magic dmg) → boosts Shadow Touch (Dark), NOT BoC (Evil).
- Eldritch Shield break bonus (+30% dark magic dmg) → boosts dark spells, NOT BoC (Evil).

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

## Blow of Corruption (VERIFIED)

- Base damage: 12, Scaling: 1.0 (100% MPB applies)
- Damage type: Evil magical
- Formula: `floor(12 × (1 + MPB) × Hit_Location_Multiplier × MDR_Multiplier)`
- IS affected by hit location (headshot multiplier applies)
- IS reduced by target's MDR (not PDR)
- Cooldown: 24s

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

## Verified Damage Test Points

All tests on Ruins training dummy (PDR ~-22%, MDR ~6%). Warlock build: PPB 35.1% (with Spectral Blade), MPB 23%, Armor Pen 10.5%, HS Bonus 5%, Spiked Gauntlet +1 true phys, Shadow Touch active.

| Test | Expected | In-Game | Status |
|------|----------|---------|--------|
| Spectral Blade, no BSB, body, hit 1 | floor(69.22)+1=70 | 70 | ✅ |
| Spectral Blade + BSB, body, hit 1 | floor(77.47)+1=78 | 78 | ✅ |
| Spectral Blade + BSB, body, hit 2 | floor(81.18)+1=82 | 82 | ✅ |
| Spectral Blade + BSB, body, hit 3 | floor(84.88)+1=85 | 85 | ✅ |
| Spectral Blade + BSB, headshot, hit 1 | floor(120.07)+1=121 | 121 | ✅ |
| Shadow Touch (all hits) | 2 dark magic | 2 | ✅ |
| BoC body (fists, MPB 23%) | floor(13.87)=13 | 13 | ✅ |
| BoC headshot (fists, MPB 23%) | floor(20.81)=20 | 20 | ✅ |
