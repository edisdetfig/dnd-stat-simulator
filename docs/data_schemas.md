# Data Schemas — Phase 0

JSON schema definitions for all game data. These drive the entire simulator — application logic reads from these structures, never hardcodes game values.

---

## 1. Class Definition Schema

One file per class, or all classes in a single `classes.json`.

```jsonc
{
  "id": "warlock",
  "name": "Warlock",
  "baseStats": {
    "str": 11,
    "vig": 14,
    "agi": 14,
    "dex": 15,
    "wil": 22,
    "kno": 15,
    "res": 14
  },
  "baseHp": 121.5,
  "baseMemory": 9,
  "equippableArmor": ["cloth", "leather"],
  // Armor types granted conditionally by perks are handled
  // via the perk's effect, not listed here.

  // Warlock-specific: spells cost health to cast.
  // Other classes may have "none" or other cost types.
  "spellCostType": "health",

  // Shared resources used across multiple abilities
  "resources": {
    "darkness_shards": {
      "name": "Darkness Shard",
      "maxStacks": 3,
      "perStackBonuses": [
        { "type": "stat_modifier", "stat": "all_attributes", "value": 1, "unit": "flat" },
        { "type": "damage_bonus", "damageType": "dark_magical", "value": 33, "unit": "percent" }
      ],
      "consumedOn": "dark_magic_damage_dealt",
      "consumeAll": true,
      // Acquisition differs per source — defined in perk/skill/spell entries.
      // Behavior modifications (e.g., additional bonuses from Soul Collector perk)
      // are defined on the perk itself.
      "sources": ["soul_collector", "spell_predation", "blood_pact"]
    }
  },

  "perks": [
    {
      "id": "demon_armor",
      "name": "Demon Armor",
      "effects": [
        {
          "type": "grant_armor_type",
          "armorType": "plate"
        },
        {
          "type": "stat_modifier",
          "stat": "spellCastingSpeed",
          "value": -10,
          "unit": "percent",
          "stacking": "additive"
        }
      ]
    },
    {
      "id": "shadow_touch",
      "name": "Shadow Touch",
      "effects": [
        {
          "type": "on_hit",
          "trigger": "melee_attack",
          "damage": 2,
          "damageType": "dark_magical",
          "trueDamage": true,
          "scaling": 0,
          "separateInstance": true
        },
        {
          "type": "on_hit",
          "trigger": "melee_attack",
          "healSelf": 2,
          "scalesWithMagicalHealing": false
        }
      ]
    },
    {
      "id": "dark_reflection",
      "name": "Dark Reflection",
      "effects": [
        {
          "type": "on_hit",
          "trigger": "hit_by_melee",
          "damage": 15,
          "damageType": "dark_magical",
          "trueDamage": false,
          "scaling": 0.75,
          "separateInstance": true,
          "cooldownBased": true
        }
      ]
    },
    {
      "id": "antimagic",
      "name": "Antimagic",
      "effects": [
        {
          "type": "damage_reduction_multiplier",
          // Separate multiplicative layer AFTER MDR cap
          "damageCategory": "magical",
          "excludeTypes": ["divine"],
          "value": 20,
          "unit": "percent",
          "stacking": "separate_multiplier"
        }
      ]
    },
    {
      "id": "dark_enhancement",
      "name": "Dark Enhancement",
      "effects": [
        {
          "type": "damage_bonus",
          "damageType": "dark_magical",
          // Tooltip: "towards dark magic spells" — ONLY dark, not evil/divine/curse
          "value": 20,
          "unit": "percent"
        }
      ]
    },
    {
      "id": "torture_mastery",
      "name": "Torture Mastery",
      "effects": [
        {
          "type": "on_curse_damage",
          "trigger": "curse_damage_dealt_to_enemy",
          "healSelf": 2,
          "scaling": 0.15,
          "healType": "recoverable_only",
          "perInstance": true
        },
        {
          "type": "spell_cost_multiplier",
          "target": "self",
          "classRestriction": "warlock",
          "multiplier": 2.0,
          "description": "All Warlock spell costs are doubled"
        }
      ]
    },
    {
      "id": "curse_mastery",
      "name": "Curse Mastery",
      "effects": [
        {
          "type": "stat_modifier",
          "stat": "curseDurationBonus",
          "value": 30,
          "unit": "percent",
          "stacking": "additive",
          "description": "Gain 30% duration towards all curses you cast"
        }
      ]
    },
    {
      "id": "immortal_lament",
      "name": "Immortal Lament",
      "effects": [
        {
          "type": "special",
          "id": "spell_health_floor",
          "minHealth": 1,
          "trigger": "spell_self_damage",
          "description": "Casting spells will no longer take you below 1 health"
        },
        {
          "type": "conditional_buff",
          "trigger": "health_below_percent",
          "threshold": 5,
          "duration": 5,
          "buffs": [
            {
              "type": "stat_modifier",
              "stat": "magicalHealingBonus",
              "value": 100,
              "unit": "percent",
              "stacking": "additive"
            }
          ]
        }
      ]
    },
    {
      "id": "infernal_pledge",
      "name": "Infernal Pledge",
      "effects": [
        {
          "type": "damage_reduction_multiplier",
          "damageCategory": "all",
          "value": 40,
          "unit": "percent",
          "conditions": ["pve_only", "source_undead_or_demon"],
          "description": "Reduces damage taken from Undead and Demons by 40%"
        }
      ]
    },
    {
      "id": "vampirism",
      "name": "Vampirism",
      "effects": [
        {
          "type": "stat_modifier",
          "stat": "magicalHealingBonus",
          "value": 20,
          "unit": "percent",
          "stacking": "additive"
        }
      ]
    },
    {
      "id": "soul_collector",
      "name": "Soul Collector",
      "effects": [
        {
          "type": "resource_gain",
          "resource": "darkness_shards",
          "amount": 1,
          "trigger": "killing_blow",
          "description": "On killing blow, collect 1 Darkness Shard"
        }
        // Shard bonuses defined in shared resource.
        // If Soul Collector grants additional per-shard bonuses beyond
        // the base resource definition, add them here with
        // type: "resource_bonus_modifier".
      ]
    }
  ],

  "skills": [
    {
      "id": "spell_memory_1",
      "name": "Spell Memory I",
      "skillType": "spell_memory",
      "spellSlots": 5,
      "description": "Holds up to 5 spells. Required to cast spells. Spells exceeding available memory cannot be cast."
    },
    {
      "id": "spell_memory_2",
      "name": "Spell Memory II",
      "skillType": "spell_memory",
      "spellSlots": 5,
      "description": "Identical to Spell Memory I. Holds up to 5 spells."
    },
    {
      "id": "blow_of_corruption",
      "name": "Blow of Corruption",
      "baseDamage": 12,
      "scaling": 1.0,
      "scalingStat": "mpb",
      "damageType": "evil_magical",
      "cooldown": 24,
      "affectedByHitLocation": true,
      "reducedByMDR": true,
      "trigger": "next_physical_attack",
      "effects": [
        {
          "type": "debuff",
          "name": "Corruption",
          "healingReduction": 80,
          "healingTypes": ["physical", "magical"],
          "duration": 12
        }
      ]
    },
    {
      "id": "blood_pact",
      "name": "Blood Pact",
      "effects": [
        {
          "type": "transformation",
          "form": "demon",
          "description": "Take the form of your contracted demon. Cannot be stopped until complete.",
          "statBonuses": [
            { "stat": "maxHealth", "value": 30, "unit": "flat" },
            { "stat": "armorRating", "value": 50, "unit": "flat" },
            { "stat": "magicResistance", "value": 50, "unit": "flat" }
          ],
          "selfDot": {
            "type": "percent_max_health",
            "value": 1,
            "interval": 1,
            "description": "Abyssal Flame: 1% damage per second"
          },
          "aura": {
            "damage": 2,
            "scaling": 0.25,
            "damageType": "magical",
            "interval": 1,
            "description": "2(0.25) magical damage per second to nearby characters"
          },
          "resourceInteraction": {
            "resource": "darkness_shards",
            "action": "consume_for_bonus",
            "description": "Consume Darkness Shards for +1 all attributes, +33% dark magical damage bonus each"
          },
          "skillOverride": "demon_skills",
          "inputOverride": {
            "leftClick": "Use equipped item, or 4-hit bare-handed combo",
            "rightClick": "Use equipped item, or fire bolt of darkness"
          }
        }
      ]
    },
    {
      "id": "phantomize",
      "name": "Phantomize",
      "duration": 4,
      "effects": [
        {
          "type": "special",
          "id": "phase",
          "description": "Phase through melee attacks and projectiles. Can only move, no collision."
        },
        {
          "type": "stat_modifier",
          "stat": "moveSpeed",
          "value": 5,
          "unit": "percent",
          "stacking": "additive"
        },
        {
          "type": "stat_modifier",
          "stat": "magicalDamageReduction",
          "value": -50,
          "unit": "percent",
          "stacking": "additive"
        }
      ]
    }
  ],

  "spells": [
    {
      "id": "power_of_sacrifice",
      "name": "Power of Sacrifice",
      "tier": 1,
      "memoryCost": 1,
      "healthCost": 4,
      "damageType": "evil_magical",
      "duration": 12,
      "targeting": "enemy_or_self",
      "selfCastFallback": true,
      "effects": [
        {
          "type": "stat_modifier",
          "target": "spell_target",
          "stat": "str",
          "value": 15,
          "unit": "flat",
          "stacking": "additive"
        },
        {
          "type": "stat_modifier",
          "target": "spell_target",
          "stat": "vig",
          "value": 15,
          "unit": "flat",
          "stacking": "additive"
        },
        {
          "type": "dot",
          "target": "spell_target",
          "damage": 3,
          "damageType": "evil_magical",
          "interval": 1
        }
      ]
    },
    {
      "id": "curse_of_weakness",
      "name": "Curse of Weakness",
      "tier": 1,
      "memoryCost": 1,
      "healthCost": 4,
      "damageType": "curse",
      "duration": 12,
      "effects": [
        {
          "type": "attribute_bonus_multiplier",
          "target": "enemy",
          "stats": "all_base",
          "value": -25,
          "unit": "percent"
        },
        {
          "type": "stat_modifier",
          "target": "enemy",
          "stat": "physicalDamageReduction",
          "value": -15,
          "unit": "percent",
          "stacking": "additive"
        },
        {
          "type": "stat_modifier",
          "target": "enemy",
          "stat": "magicalDamageReduction",
          "value": -15,
          "unit": "percent",
          "stacking": "additive"
        }
      ]
    },
    {
      "id": "bolt_of_darkness",
      "name": "Bolt of Darkness",
      "tier": 1,
      "memoryCost": 1,
      "healthCost": 4,
      "baseDamage": 20,
      "scaling": 1.0,
      "scalingStat": "mpb",
      "damageType": "dark_magical",
      "spellType": "projectile"
    },
    {
      "id": "curse_of_pain",
      "name": "Curse of Pain",
      "tier": 2,
      "memoryCost": 2,
      "healthCost": 4,
      "damageType": "evil_magical",
      "effects": [
        {
          "type": "instant_damage",
          "damage": 15,
          "scaling": 1.0,
          "scalingStat": "mpb",
          "damageType": "evil_magical"
        },
        {
          "type": "dot",
          "target": "enemy",
          "damage": 15,
          "scaling": 0.5,
          "scalingStat": "mpb",
          "damageType": "evil_magical",
          "duration": 8,
          "description": "15(0.5) evil magical damage distributed over 8 seconds"
        }
      ]
    },
    {
      "id": "bloodstained_blade",
      "name": "Bloodstained Blade",
      "tier": 2,
      "memoryCost": 2,
      "healthCost": 4,
      "duration": 20,
      "effects": [
        {
          "type": "stat_modifier",
          "target": "self",
          "stat": "buffWeaponDamage",
          "value": 5,
          "unit": "flat",
          "stacking": "additive"
        }
      ]
    },
    {
      "id": "spell_predation",
      "name": "Spell Predation",
      "tier": 3,
      "memoryCost": 3,
      "healthCost": 4,
      "damageType": "evil_magical",
      "effects": [
        {
          "type": "buff_strip",
          "target": "enemy",
          "scope": "all_removable_magical",
          "perBuffEffects": [
            {
              "type": "resource_gain",
              "resource": "darkness_shards",
              "amount": 1
            },
            {
              "type": "instant_damage",
              "damage": 3,
              "scaling": 1.0,
              "scalingStat": "mpb",
              "damageType": "evil_magical"
            }
          ]
        }
      ]
    },
    {
      "id": "evil_eye",
      "name": "Evil Eye",
      "tier": 3,
      "memoryCost": 3,
      "healthCost": 5,
      "castTime": 1,
      "spellType": "summon",
      "effects": [
        {
          "type": "special",
          "description": "Summon an evil eye that can be possessed by the caster for 30 seconds"
        }
      ]
    },
    {
      "id": "ray_of_darkness",
      "name": "Ray of Darkness",
      "tier": 4,
      "memoryCost": 4,
      "healthCost": 5,
      "baseDamage": 12,
      "scaling": 1.0,
      "scalingStat": "mpb",
      "damageType": "dark_magical",
      "spellType": "channel",
      "tickRate": 1,
      "channelNotes": "Can move and aim while channeling"
    },
    {
      "id": "life_drain",
      "name": "Life Drain",
      "tier": 4,
      "memoryCost": 4,
      "healthCost": 5,
      "baseDamage": 5,
      "scaling": 0.25,
      "scalingStat": "mpb",
      "damageType": "evil_magical",
      "spellType": "channel",
      "channelDuration": 7.5,
      "tickRate": 1,
      "effects": [
        {
          "type": "special",
          "description": "Convert a portion of the damage dealt into health for the caster"
        }
      ]
    },
    {
      "id": "hellfire",
      "name": "Hellfire",
      "tier": 4,
      "memoryCost": 4,
      "healthCost": 6,
      "baseDamage": 60,
      "scaling": 0.5,
      "scalingStat": "mpb",
      "damageType": "fire_magical",
      "spellType": "aoe",
      "tickRate": 1,
      "persistent": true,
      "description": "Does not dissipate when reaching a target"
    },
    {
      "id": "flame_walker",
      "name": "Flame Walker",
      "tier": 5,
      "memoryCost": 5,
      "healthCost": 6,
      "duration": 6,
      "damageType": "fire_magical",
      "effects": [
        {
          "type": "ground_effect",
          "trailDuration": 4,
          "damage": 5,
          "scaling": 1.0,
          "scalingStat": "mpb",
          "damageType": "fire_magical",
          "tickInterval": 0.2,
          "statusEffect": "burn",
          "description": "Leave trail of Hellfire for 6s, trails last 4s, 5(1.0) fire dmg per 0.2s to targets in area"
        }
      ]
    },
    {
      "id": "eldritch_shield",
      "name": "Eldritch Shield",
      "tier": 5,
      "memoryCost": 5,
      "healthCost": 6,
      "duration": 15,
      "effects": [
        {
          "type": "shield",
          "absorbAmount": 25,
          "absorbType": "magical"
        },
        {
          "type": "on_break_buff",
          "duration": 6,
          "appliesTo": "next_dark_spell",
          "buffs": [
            {
              "type": "damage_bonus",
              "damageType": "dark_magical",
              "value": 30,
              "unit": "percent"
            },
            {
              "type": "stat_modifier",
              "stat": "spellCastingSpeed",
              "value": 50,
              "unit": "percent",
              "stacking": "additive"
            }
          ]
        }
      ]
    },
    {
      "id": "summon_hydra",
      "name": "Summon Hydra",
      "tier": 6,
      "memoryCost": 6,
      "healthCost": 12,
      "damageType": "fire_magical",
      "spellType": "summon",
      "summonDuration": 10,
      "effects": [
        {
          "type": "summon_attack",
          "damage": 10,
          "scaling": 1.0,
          "scalingStat": "mpb",
          "damageType": "fire_magical",
          "projectileType": "fireball",
          "description": "Spits fireballs at enemy targets. Can detect hidden targets."
        }
      ]
    }
  ]
}
```

### Fighter — Base Stats (partial, perks/skills/spells TBD)

```jsonc
{
  "id": "fighter",
  "name": "Fighter",
  "baseStats": {
    "str": 15,
    "vig": 15,
    "agi": 15,
    "dex": 15,
    "wil": 15,
    "kno": 15,
    "res": 15
  },
  "baseHp": null,        // TBD — needs in-game verification
  "baseMemory": null,    // TBD
  "equippableArmor": ["cloth", "leather", "plate"],
  "spellCostType": "none",
  "perks": [],           // Defense Mastery, Projectile Resistance documented in class_definitions.md
  "skills": [],
  "spells": []           // Fighter has no spells
}
```

### Design Notes — Class Schema

- **Effect types** are extensible: `stat_modifier`, `damage_bonus`, `damage_reduction_multiplier`, `on_hit`, `grant_armor_type`, `attribute_bonus_multiplier`, `shield`, `on_break_buff`, `debuff`, `dot`, `instant_damage`, `on_curse_damage`, `spell_cost_multiplier`, `conditional_buff`, `resource_gain`, `transformation`, `ground_effect`, `buff_strip`, `summon_attack`, `special`.
- `special` is the escape hatch for effects too complex or unique to model generically yet. Always includes a human-readable `description`. When an effect is marked `special`, it means custom logic will handle it in the damage calculator or stat pipeline. As patterns repeat across classes, we promote `special` effects into proper typed effects. This prevents the schema from blocking progress — we never skip a perk/spell because it's hard to model; we store what we know and flag it for custom handling.
- **`conditions`** field on any effect restricts when it applies: e.g., `["pve_only", "source_undead_or_demon"]` for Infernal Pledge. The damage calculator checks conditions against the combat context (target type, damage source, etc.).
- **`resources`** section defines shared mechanics (like Darkness Shards) that multiple abilities interact with. Each ability specifies how it acquires/consumes the resource, and can add source-specific behavior modifications.
- **`targeting`** on spells: `"enemy_or_self"` with `"selfCastFallback": true` means the spell targets enemies but self-casts if no target found (Power of Sacrifice). `"spell_target"` in effects means the buff/debuff applies to whoever the spell lands on.
- **Spell memory cost = tier number.** `memoryCost` is stored explicitly for clarity but should always equal `tier`.
- **`spellCostType`** is a class-level field. Warlock uses `"health"` — each spell has a `healthCost` field representing HP lost on cast. Other classes may use `"none"` or other cost types. Torture Mastery doubles this cost via `spell_cost_multiplier`.
- **Spell Memory skills** (`spell_memory_1`, `spell_memory_2`) occupy skill slots and are required to cast spells. Each holds up to 5 spells. You can equip spells beyond your memory capacity, but those exceeding available memory cannot be cast. Classes typically have 2 skill slots total, so equipping Spell Memory has an opportunity cost.
- `stacking` field distinguishes additive bonuses from separate multiplicative layers (critical for Antimagic vs. MDR).
- `damageType` uses specific types: `dark_magical`, `evil_magical`, `divine`, `curse`, `fire_magical`, `ice`, `lightning`, `neutral`. Type-specific bonuses only apply to matching types.
- `scaling` on damage effects is the Attribute Bonus Ratio shown in tooltips as the parenthetical value, e.g., `12(1.0)` = 12 base damage with 1.0 (100%) scaling from the relevant power bonus.

---

## 2. Item Definition Schema

Each item is a unique definition. Variants (e.g., Frostlight Crystal Sword vs Crystal Sword) are separate item entries.

```jsonc
{
  "id": "spectral_blade",
  "name": "Spectral Blade",
  "slotType": "primaryWeapon", // Matches in-game "Slot Type" field
  "armorType": null,         // null for non-armor (weapons, rings, necklaces)
  "weaponType": "sword",     // null for non-weapons
  "handType": "twoHanded",   // "oneHanded", "twoHanded", null for non-weapons
  "requiredClasses": ["fighter", "warlock", "sorcerer"],

  // Rarities this item can exist in.
  // Most items: ["poor","common","uncommon","rare","epic","legendary","unique"]
  // Some items are locked to a single rarity.
  "availableRarities": ["epic"],

  // Override random modifier count for specific rarities.
  // Only needed when the item deviates from the standard counts.
  // Standard: poor=0, common=0, uncommon=1, rare=2, epic=3, legendary=4, unique=1(3x)
  "modifierCountOverrides": {},
  // Example for Foul Boots: { "rare": 3 }

  // Inherent stats — always present on this item, not user-configurable
  // unless the stat has a range (min/max).
  "inherentStats": [
    { "stat": "weaponDamage",              "value": 40 },
    { "stat": "moveSpeed",                 "value": -30 },
    { "stat": "actionSpeed",               "value": 5,    "unit": "percent" },
    { "stat": "headshotDamageBonus",       "value": 5,    "unit": "percent" }
    // For ranged inherent stats:
    // { "stat": "armorRating", "min": 28, "max": 35 }
  ],

  // Inherent stats that are excluded from socketing per the general rule
  // but need to be OVERRIDDEN to still be available.
  // Empty array = standard exclusion rules apply.
  "socketExclusionOverrides": [],
  // Example: if an item has inherent "armorRating" but should still
  // allow "additionalArmorRating" in socketing:
  // ["additionalArmorRating"]

  // On-hit effects intrinsic to this item (e.g., Spiked Gauntlet's true phys dmg)
  "onHitEffects": [],

  // Special properties that don't fit standard stat categories
  "specialProperties": []
}
```

### Another example — Frostlight Crystal Sword (craftable variant):

```jsonc
{
  "id": "frostlight_crystal_sword",
  "name": "Frostlight Crystal Sword",
  "slotType": "primaryWeapon",
  "armorType": null,
  "weaponType": ["sword", "magicStuff"],
  "handType": "twoHanded",
  "requiredClasses": ["wizard", "warlock", "sorcerer"],
  "availableRarities": ["epic"],   // Craft-only, single rarity
  "modifierCountOverrides": {},

  "inherentStats": [
    { "stat": "weaponDamage",         "value": 13 },
    { "stat": "magicWeaponDamage",    "value": 18 },
    { "stat": "moveSpeed",            "value": -25 },
    { "stat": "actionSpeed",          "value": 2, "unit": "percent" }
  ],

  "socketExclusionOverrides": [],
  "onHitEffects": [],
  "specialProperties": []
}
```

### Another example — Foul Boots (modifier count override):

```jsonc
{
  "id": "foul_boots",
  "name": "Foul Boots",
  "slotType": "feet",
  "armorType": "leather",
  "weaponType": null,
  "handType": null,
  "requiredClasses": [],       // Empty = all classes that can wear this armor type
  "availableRarities": ["rare"],
  "modifierCountOverrides": { "rare": 3 },

  "inherentStats": [
    { "stat": "armorRating",    "value": 18 },
    { "stat": "moveSpeed",      "value": 6 },
    { "stat": "agi",            "value": 3 },
    { "stat": "physicalPower",  "value": 2 }
  ],

  "socketExclusionOverrides": [],
  "onHitEffects": [],
  "specialProperties": []
}
```

### Another example — Spiked Gauntlet (on-hit effect):

```jsonc
{
  "id": "spiked_gauntlet",
  "name": "Spiked Gauntlet",
  "slotType": "hands",
  "armorType": "plate",
  "weaponType": null,
  "handType": null,
  "requiredClasses": [],
  "availableRarities": ["poor","common","uncommon","rare","epic","legendary","unique"],
  "modifierCountOverrides": {},

  "inherentStats": [
    { "stat": "armorRating",              "value": 43 },
    { "stat": "projectileDamageReduction","value": 2.5, "unit": "percent" },
    { "stat": "magicResistance",          "value": -5 },
    { "stat": "moveSpeed",                "value": -1 },
    { "stat": "dex",                      "value": 2 },
    { "stat": "vig",                      "value": 2 }
  ],

  "socketExclusionOverrides": [],

  "onHitEffects": [
    {
      "damage": 1,
      "damageType": "true_physical",
      "trueDamage": true,
      "scaling": "attributeBonusRatio",
      "separateInstance": false,
      "notes": "Included in main damage number, not a separate hit"
    }
  ],

  "specialProperties": []
}
```

### Design Notes — Item Schema

- **`id`** is the unique key. Variants get their own id (e.g., `crystal_sword` vs `frostlight_crystal_sword`).
- **`slotType`** matches the in-game "Slot Type" field exactly: `"primaryWeapon"`, `"secondaryWeapon"`, `"head"`, `"chest"`, `"hands"`, `"legs"`, `"feet"`, `"back"`, `"ring"`, `"necklace"`. Always a single value.
- **`handType`** for weapons: `"oneHanded"` allows a secondary weapon/shield/lantern, `"twoHanded"` blocks the secondary slot.
- **`inherentStats`** use either `value` (fixed) or `min`/`max` (ranged). `unit` defaults to `"flat"` if omitted; specify `"percent"` when applicable.
- **`modifierCountOverrides`** only needed for items that deviate from the standard rarity → count mapping.
- **`socketExclusionOverrides`** lists stat IDs that should remain available for socketing despite being inherent. Empty array = apply standard exclusion rules.
- **`requiredClasses`** lists which classes can equip this item. Empty array means any class can use it (assuming they can wear the armor type).
- **`availableRarities`** controls which rarities the item can drop/craft in.

---

## 3. Slot Modifier Pool Schema

Defines what random modifiers are available per slot, with both socket ranges and natural roll ranges. The actual available pool for a specific item is computed at runtime by filtering this against the item's inherent stats and exclusion rules.

```jsonc
{
  "slotModifierPools": {
    "weapon_twoHanded": {
      "modifiers": [
        {
          "stat": "additionalWeaponDamage",
          "socketRange": { "min": 2, "max": 2 },
          "naturalRange": { "min": 2, "max": 2 },
          "unit": "flat"
        },
        {
          "stat": "physicalDamageBonus",
          "socketRange": { "min": 2, "max": 3.2 },
          "naturalRange": { "min": 2, "max": 4 },
          "unit": "percent"
        },
        {
          "stat": "demonDamageBonus",
          "socketRange": { "min": 4, "max": 6.4 },
          "naturalRange": { "min": 4, "max": 8 },
          "unit": "percent"
        },
        {
          "stat": "armorPenetration",
          "socketRange": { "min": 3, "max": 4.8 },
          "naturalRange": { "min": 3, "max": 6 },
          "unit": "percent"
        },
        {
          "stat": "undeadDamageBonus",
          "socketRange": { "min": 4, "max": 6.4 },
          "naturalRange": { "min": 4, "max": 8 },
          "unit": "percent"
        },
        {
          "stat": "magicalDamageBonus",
          "socketRange": { "min": 2, "max": 3.2 },
          "naturalRange": { "min": 2, "max": 4 },
          "unit": "percent"
        },
        {
          "stat": "headshotDamageBonus",
          "socketRange": { "min": 4, "max": 6.4 },
          "naturalRange": { "min": 4, "max": 8 },
          "unit": "percent"
        },
        {
          "stat": "physicalPower",
          "socketRange": { "min": 2, "max": 3 },
          "naturalRange": { "min": 2, "max": 3 },
          "unit": "flat"
        },
        {
          "stat": "actionSpeed",
          "socketRange": { "min": 2, "max": 3.2 },
          "naturalRange": { "min": 2, "max": 4 },
          "unit": "percent"
        },
        {
          "stat": "luck",
          "socketRange": { "min": 30, "max": 48 },
          "naturalRange": { "min": 30, "max": 60 },
          "unit": "flat"
        },
        {
          "stat": "magicResistance",
          "socketRange": { "min": 15, "max": 24 },
          "naturalRange": { "min": 15, "max": 30 },
          "unit": "flat"
        },
        {
          "stat": "magicalPower",
          "socketRange": { "min": 2, "max": 3 },
          "naturalRange": { "min": 2, "max": 3 },
          "unit": "flat"
        },
        {
          "stat": "demonDamageReduction",
          "socketRange": { "min": 3, "max": 4.8 },
          "naturalRange": { "min": 3, "max": 6 },
          "unit": "percent"
        },
        {
          "stat": "magicalDamageReduction",
          "socketRange": { "min": 1.5, "max": 2.4 },
          "naturalRange": { "min": 1.5, "max": 3 },
          "unit": "percent"
        },
        {
          "stat": "magicPenetration",
          "socketRange": { "min": 3, "max": 4.8 },
          "naturalRange": { "min": 3, "max": 6 },
          "unit": "percent"
        },
        {
          "stat": "spellCastingSpeed",
          "socketRange": { "min": 3, "max": 4.8 },
          "naturalRange": { "min": 3, "max": 6 },
          "unit": "percent"
        },
        {
          "stat": "undeadDamageReduction",
          "socketRange": { "min": 3, "max": 4.8 },
          "naturalRange": { "min": 3, "max": 6 },
          "unit": "percent"
        },
        {
          "stat": "debuffDurationBonus",
          "socketRange": { "min": 3, "max": 4.8 },
          "naturalRange": { "min": 3, "max": 6 },
          "unit": "percent"
        },
        {
          "stat": "physicalHealing",
          "socketRange": { "min": 1, "max": 1 },
          "naturalRange": { "min": 1, "max": 1 },
          "unit": "flat"
        },
        {
          "stat": "magicalHealing",
          "socketRange": { "min": 1, "max": 1 },
          "naturalRange": { "min": 1, "max": 1 },
          "unit": "flat"
        },
        {
          "stat": "memoryCapacityBonus",
          "socketRange": { "min": 5, "max": 8 },
          "naturalRange": { "min": 5, "max": 10 },
          "unit": "percent"
        },
        {
          "stat": "buffDurationBonus",
          "socketRange": { "min": 3, "max": 4.8 },
          "naturalRange": { "min": 3, "max": 6 },
          "unit": "percent"
        },
        {
          "stat": "physicalDamageReduction",
          "socketRange": { "min": 1.5, "max": 2.4 },
          "naturalRange": { "min": 1.5, "max": 3 },
          "unit": "percent",
          "exclusionGroup": "ar_pdr"
        },
        {
          "stat": "additionalArmorRating",
          "socketRange": { "min": 15, "max": 24 },
          "naturalRange": { "min": 15, "max": 30 },
          "unit": "flat",
          "exclusionGroup": "ar_pdr"
        },
        {
          "stat": "regularInteractionSpeed",
          "socketRange": { "min": 3, "max": 4.8 },
          "naturalRange": { "min": 3, "max": 6 },
          "unit": "percent"
        },
        {
          "stat": "projectileDamageReduction",
          "socketRange": { "min": 2, "max": 3.2 },
          "naturalRange": { "min": 2, "max": 4 },
          "unit": "percent"
        },
        {
          "stat": "cooldownReductionBonus",
          "socketRange": { "min": 3, "max": 4.8 },
          "naturalRange": { "min": 3, "max": 6 },
          "unit": "percent"
        },
        {
          "stat": "magicalInteractionSpeed",
          "socketRange": { "min": 3, "max": 4.8 },
          "naturalRange": { "min": 3, "max": 6 },
          "unit": "percent"
        },
        {
          "stat": "additionalMemoryCapacity",
          "socketRange": { "min": 2, "max": 3 },
          "naturalRange": { "min": 2, "max": 3 },
          "unit": "flat"
        }
      ]
    },

    "weapon_oneHanded": {
      // Source: Obsidian Cutlass (Sword, One-Handed, Epic) socket screenshots.
      // Obsidian Cutlass inherent: Weapon Damage 33, Projectile DR 2%, Move Speed -23
      // Socketed: Regular Interaction Speed (selected), Magical Damage Bonus, Physical Damage Bonus
      // Hidden: Projectile DR (inherent), Magical/Physical Damage Bonus (socketed not selected)
      // Ranges are roughly HALF of weapon_twoHanded for most stats.
      // NOTE: Natural ranges TBD.
      "modifiers": [
        { "stat": "additionalWeaponDamage",    "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "memoryCapacityBonus",       "socketRange": { "min": 2.5, "max": 4 }, "naturalRange": { "min": 2.5, "max": 5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "physicalHealing",           "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalHealing",            "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false }
      ]
    },

    "chest": {
      "modifiers": [
        // Chest armor pieces — includes core stats (main armor slot)
        { "stat": "agi",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat" },
        { "stat": "wil",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat" },
        { "stat": "kno",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat" },
        { "stat": "res",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat" },
        { "stat": "str",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat" },
        { "stat": "dex",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat" },
        { "stat": "vig",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat" },
        { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent" },
        { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent" },
        { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent" },
        { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent" },
        { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent" },
        { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent" },
        { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent" },
        { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat" },
        { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat" },
        { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent" },
        { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent" },
        { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent" },
        { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent" },
        { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent" },
        { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent" },
        { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent" },
        { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 }, "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent" },
        { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent" },
        { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr" },
        { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "exclusionGroup": "ar_pdr" },
        { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent" },
        { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent" },
        { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent" },
        { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "flat" }
      ]
    },

    "hands": {
      // Source: Golden Gloves (Leather, Epic) socket screenshots.
      // Golden Gloves inherent: AR 24, VIG 4, Luck 10, MDR 2%
      // Socketed: STR (not selected), DEX (not selected), Armor Pen (selected)
      // Hidden stats added back: STR, DEX (socketed), VIG, Luck, MDR (inherent)
      // NOTE: Natural ranges are TBD — only socket ranges confirmed from screenshots.
      // Hands is a main armor slot → core stats available.
      "modifiers": [
        { "stat": "str",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "vig",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "agi",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "dex",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "wil",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "kno",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "res",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "additionalPhysicalDamage",  "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 }, "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false }
      ]
    },
    "head": {
      // Source: Barbuta Helm (Plate, Epic) socket screenshots.
      // Inherent: AR 32, Projectile DR 1.2%, Headshot DR 15%, MR 30, Move Speed -4, DEX 4
      // Socketed: STR (not selected), AGI (selected), VIG (not selected)
      // Hidden: STR, VIG (socketed), DEX, Projectile DR, MR (inherent)
      // Headshot DR and Move Speed are NEVER socketable on any slot.
      // Head has Additional Magical Damage — unique among main armor slots.
      "modifiers": [
        { "stat": "str",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "vig",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "agi",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "dex",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "wil",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "kno",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "res",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "additionalMagicalDamage",   "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 }, "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false }
      ]
    },
    "legs": {
      // Source: Dark Leather Leggings (Leather, Epic) socket screenshots.
      // Leggings inherent: AR 57, MR 21, Move Speed -5, DEX 2
      // Socketed: VIG (not selected), STR (not selected), Physical Power (selected)
      // Hidden stats added back: VIG, STR (socketed), DEX, MR (inherent)
      // Move Speed is NOT a socketable stat (never appears in any socket pool).
      // NOTE: Natural ranges are TBD — only socket ranges confirmed.
      // Legs is a main armor slot → core stats available.
      // Notable: NO Additional Physical Damage (hands-only for armor slots).
      "modifiers": [
        { "stat": "str",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "vig",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "agi",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "dex",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "wil",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "kno",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "res",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 }, "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false }
      ]
    },
    "feet": {
      // Source: Rugged Boots (Leather, Epic) socket screenshots.
      // Inherent: AR 30, Move Speed 6, VIG 4
      // Socketed: Will (not selected), Armor Penetration (not selected), Magical Damage Bonus (selected)
      // Hidden: VIG (inherent), WIL + Armor Pen (socketed not selected)
      // Feet is a main armor slot → core stats available.
      // No Additional Physical Damage (same as legs).
      "modifiers": [
        { "stat": "str",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "vig",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "agi",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "dex",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "wil",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "kno",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "res",                       "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 }, "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false }
      ]
    },
    "back": {
      // Source: Adventurer Cloak (Cloth, Epic) socket screenshots.
      // Inherent: AR 10, AGI 3
      // Socketed: Magic Resistance (not selected), Physical Damage Reduction (selected), Armor Penetration (not selected)
      // Hidden: MR + Armor Pen (socketed not selected). AGI is inherent but NOT in pool (no core stats on back slot).
      // Cloak/Back ranges are MUCH HIGHER than armor — comparable to weapons.
      // Has: Additional Physical Damage, Additional Magical Damage, Physical Healing, Magical Healing.
      // NO core stats (not a main armor piece).
      "modifiers": [
        { "stat": "demonDamageBonus",          "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageBonus",         "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "headshotDamageBonus",       "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "additionalPhysicalDamage",  "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "additionalMagicalDamage",   "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "actionSpeed",               "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "luck",                      "socketRange": { "min": 30, "max": 48 }, "naturalRange": { "min": 30, "max": 60 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "armorPenetration",          "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicPenetration",          "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicResistance",           "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalDamageReduction",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "spellCastingSpeed",         "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageReduction",     "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageReduction",      "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "debuffDurationBonus",       "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalHealing",           "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "memoryCapacityBonus",       "socketRange": { "min": 5, "max": 8 }, "naturalRange": { "min": 5, "max": 10 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 2, "max": 3 }, "naturalRange": { "min": 2, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "buffDurationBonus",         "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "cooldownReductionBonus",    "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalHealing",            "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "physicalDamageReduction",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "additionalArmorRating",     "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "regularInteractionSpeed",   "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "projectileDamageReduction", "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false }
      ]
    },
    "ring": {
      // Source: Crystal Frost Ring (Epic) socket screenshots.
      // Inherent: VIG 2, WIL 1
      // Socketed: Physical Healing (not selected), Additional Physical Damage (selected), Debuff Duration Bonus (not selected)
      // Hidden: Physical Healing + Debuff Duration Bonus (socketed not selected)
      // VIG/WIL inherent but NOT in ring pool (no core stats on rings).
      // Ring has higher Physical Power (2-3), Magical Power (2-3), Magical Healing (2-3) than armor.
      // Confirmed: rings can naturally roll Physical/Magical Healing/Power up to 4.
      // NO core stats.
      "modifiers": [
        { "stat": "headshotDamageBonus",       "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalDamageBonus",       "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageBonus",          "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "armorPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageBonus",         "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalDamageBonus",        "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalPower",             "socketRange": { "min": 2, "max": 3 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "flat", "naturalRangeVerified": true },
        { "stat": "additionalPhysicalDamage",  "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "additionalMagicalDamage",   "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "actionSpeed",               "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "luck",                      "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicResistance",           "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalPower",              "socketRange": { "min": 2, "max": 3 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "flat", "naturalRangeVerified": true },
        { "stat": "demonDamageReduction",      "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalDamageReduction",    "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicPenetration",          "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "spellCastingSpeed",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageReduction",     "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "buffDurationBonus",         "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "projectileDamageReduction", "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 1, "max": 2 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalHealing",            "socketRange": { "min": 2, "max": 3 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "flat", "naturalRangeVerified": true },
        { "stat": "physicalHealing",           "socketRange": { "min": 2, "max": 3 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "flat", "naturalRangeVerified": true },
        { "stat": "debuffDurationBonus",       "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalDamageReduction",   "socketRange": { "min": 0.7, "max": 1.2 }, "naturalRange": { "min": 0.7, "max": 1.5 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "additionalArmorRating",     "socketRange": { "min": 7, "max": 12 }, "naturalRange": { "min": 7, "max": 15 }, "unit": "flat", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "regularInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "memoryCapacityBonus",       "socketRange": { "min": 3.7, "max": 6 }, "naturalRange": { "min": 3.7, "max": 7.5 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "cooldownReductionBonus",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false }
      ]
    },
    "necklace": {
      // Source: Necklace of Peace (Epic) socket screenshots.
      // Inherent: Max Health 5-6
      // Socketed: Buff Duration Bonus (selected), Physical Healing (not selected), Undead Damage Reduction (not selected)
      // Hidden: Physical Healing + Undead Damage Reduction (socketed not selected)
      // Max Health is NEVER socketable. Ranges similar to back — higher than armor.
      // NO core stats.
      "modifiers": [
        { "stat": "headshotDamageBonus",       "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalDamageBonus",        "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageBonus",          "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "armorPenetration",          "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "undeadDamageBonus",         "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "additionalPhysicalDamage",  "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "additionalMagicalDamage",   "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "physicalPower",             "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "physicalDamageBonus",       "socketRange": { "min": 1, "max": 1.6 }, "naturalRange": { "min": 1, "max": 2 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "actionSpeed",               "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "luck",                      "socketRange": { "min": 30, "max": 48 }, "naturalRange": { "min": 30, "max": 60 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicResistance",           "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalPower",              "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "magicalDamageReduction",    "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "demonDamageReduction",      "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicPenetration",          "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "spellCastingSpeed",         "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "memoryCapacityBonus",       "socketRange": { "min": 5, "max": 8 }, "naturalRange": { "min": 5, "max": 10 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "debuffDurationBonus",       "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "additionalMemoryCapacity",  "socketRange": { "min": 2, "max": 3 }, "naturalRange": { "min": 2, "max": 3 }, "unit": "flat", "naturalRangeVerified": false },
        { "stat": "magicalInteractionSpeed",   "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "projectileDamageReduction", "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "cooldownReductionBonus",    "socketRange": { "min": 2, "max": 3.2 }, "naturalRange": { "min": 2, "max": 4 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "magicalHealing",            "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "physicalHealing",           "socketRange": { "min": 1, "max": 1 }, "naturalRange": { "min": 1, "max": 1 }, "unit": "flat" },
        { "stat": "undeadDamageReduction",     "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "physicalDamageReduction",   "socketRange": { "min": 1.5, "max": 2.4 }, "naturalRange": { "min": 1.5, "max": 3 }, "unit": "percent", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "additionalArmorRating",     "socketRange": { "min": 15, "max": 24 }, "naturalRange": { "min": 15, "max": 30 }, "unit": "flat", "exclusionGroup": "ar_pdr", "naturalRangeVerified": false },
        { "stat": "regularInteractionSpeed",   "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false },
        { "stat": "buffDurationBonus",         "socketRange": { "min": 3, "max": 4.8 }, "naturalRange": { "min": 3, "max": 6 }, "unit": "percent", "naturalRangeVerified": false }
      ]
    }
  }
}
```

### Design Notes — Slot Modifier Pools

- **Pool key** matches `slotType` for armor/accessories. Weapons use `weapon_oneHanded` and `weapon_twoHanded` since ranges differ by hand type. At runtime, weapon items map to the correct pool via their `handType` field.
- **`exclusionGroup`** marks modifiers that are mutually exclusive for socketing. `"ar_pdr"` means you can socket at most one from this group. This is a socket constraint only — natural rolls are not restricted by this.
- **Socket exclusion logic at runtime:**
  1. Start with the slot's full modifier pool.
  2. Remove any modifier where the item has that stat as inherent (general rule).
  3. Apply `socketExclusionOverrides` from the item to re-add any stat that was removed in step 2 but should still be available.
  4. If item has inherent `physicalDamageReduction`, remove the entire `ar_pdr` exclusion group.
  5. If item has inherent `armorRating`, do NOT remove the `ar_pdr` group (AR is inherent on almost everything; it doesn't block the group).
  6. Enforce mutual exclusivity within each `exclusionGroup` — user can pick at most one.
- **Natural roll ranges** are wider than socket ranges. The sim uses natural ranges for random modifier value inputs, socket ranges for the gem socketing UI (future feature).
- **Natural range accuracy caveat:** No confirmed universal multiplier pattern between socket and natural ranges. Each must be gathered individually from in-game observation. Ranges marked as estimated until verified.

---

## 4. Modifier Exclusion Rules

Encoded as a standalone rules object, referenced by the runtime pool computation.

```jsonc
{
  "modifierExclusionRules": {
    // General rule: inherent stat blocks itself from socketing.
    // Applied by default. Per-item socketExclusionOverrides can re-allow.
    "generalRule": "inherent_blocks_self",

    // Named exclusion groups for mutual exclusivity in socketing.
    "exclusionGroups": {
      "ar_pdr": {
        "members": ["additionalArmorRating", "physicalDamageReduction"],
        "description": "Can socket at most one of these two.",
        "dominantBlocker": "physicalDamageReduction"
        // If the item has inherent PDR, the entire group is blocked.
        // If the item has inherent AR (but not PDR), the group remains available.
      }
    },

    // Stats that are exempt from the general inherent-blocks-self rule.
    // Currently none known — AR/MR blocking behavior is handled via
    // exclusion groups and the dominantBlocker pattern.
    "globalExemptions": []
  }
}
```

---

## 5. Equipped Item Instance Schema

Represents a specific item the user has equipped, with concrete values for inherent stats (if ranged) and rolled/socketed random modifiers.

```jsonc
{
  "itemId": "spectral_blade",
  "rarity": "epic",

  // Only needed for inherent stats that have ranges.
  // Fixed inherent stats are read from the item definition.
  "inherentStatValues": {},
  // Example: { "armorRating": 32 }  (if AR had a range of 28-35)

  // Random modifiers — up to N based on rarity + any overrides.
  "modifiers": [
    { "stat": "armorPenetration",     "value": 4.5 },
    { "stat": "physicalDamageBonus",  "value": 2.5 },
    { "stat": "additionalWeaponDamage", "value": 2 }
  ]
}
```

---

## 6. Build State Schema

Full user build, stored via `window.storage` API.

```jsonc
{
  "id": "build_001",
  "name": "BoC Warlock — Fangs",
  "classId": "warlock",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T14:22:00Z",

  // Gear slots
  // Two weapon loadout slots (swap between them in-game).
  // Each loadout has a primary + optional secondary (only if primary is oneHanded).
  // If primary is twoHanded, secondary must be null.
  // Plus 9 armor/accessory slots.
  "gear": {
    "weaponSlot1": {
      "primary": { /* Equipped Item Instance — e.g., Spectral Blade */ },
      "secondary": null  // null because Spectral Blade is twoHanded
    },
    "weaponSlot2": {
      "primary": { /* Equipped Item Instance — e.g., Spellbook */ },
      "secondary": null  // null because Spellbook is twoHanded
    },
    "head":            { /* Equipped Item Instance */ },
    "chest":           { /* Equipped Item Instance */ },
    "back":            { /* Equipped Item Instance */ },
    "hands":           { /* Equipped Item Instance */ },
    "legs":            { /* Equipped Item Instance */ },
    "feet":            { /* Equipped Item Instance */ },
    "ring1":           { /* Equipped Item Instance */ },
    "ring2":           { /* Equipped Item Instance */ },
    "necklace":        { /* Equipped Item Instance */ }
  },

  // Active perks (max 4 for most classes)
  "perks": ["demon_armor", "shadow_touch", "dark_reflection", "antimagic"],

  // Active skills (2 skill slots)
  // One slot must be a Spell Memory skill to cast spells.
  "skills": ["spell_memory_1", "blow_of_corruption"],

  // Equipped spells (up to 5 per Spell Memory skill, constrained by total memory)
  // Current loadout: CoW(1) + PoS(1) + BSB(2) + ES(5) + SP(3) = 12 memory
  // Health cost per cast: CoW=4, PoS=4, BSB=4, ES=6, SP=4
  "spells": [
    "curse_of_weakness",
    "power_of_sacrifice",
    "bloodstained_blade",
    "eldritch_shield",
    "spell_predation"
  ],

  // Weapon held state — 3-way mutually exclusive toggle.
  // "none" = bare-hands (no weapon stats applied)
  // "slot1" = weapon loadout 1 stats applied
  // "slot2" = weapon loadout 2 stats applied
  "weaponHeldState": "none",

  // Toggle state for active buffs (for stat calculation snapshots)
  "activeBuffs": {
    "power_of_sacrifice": false,
    "bloodstained_blade": false,
    "eldritch_shield_break": false
  },

  // Target properties (for damage calculation)
  "target": {
    "pdr": -22,       // Dummy default
    "mdr": 6,         // Dummy default
    "headshotDR": 0
  }
}
```

---

## 7. Stat ID Registry

Canonical stat identifiers used across all schemas. Grouped by category.

```jsonc
{
  "coreAttributes": [
    "str", "vig", "agi", "dex", "wil", "kno", "res"
  ],

  "offensiveStats": [
    "weaponDamage",
    "magicWeaponDamage",
    "additionalWeaponDamage",
    "additionalPhysicalDamage",
    "physicalPower",
    "magicalPower",
    "physicalDamageBonus",
    "magicalDamageBonus",
    "armorPenetration",
    "magicPenetration",
    "headshotDamageBonus",
    "demonDamageBonus",
    "undeadDamageBonus"
  ],

  "defensiveStats": [
    "armorRating",
    "additionalArmorRating",
    "magicResistance",
    "physicalDamageReduction",
    "magicalDamageReduction",
    "projectileDamageReduction",
    "demonDamageReduction",
    "undeadDamageReduction",
    "headshotDamageReduction"
  ],

  "utilityStats": [
    "moveSpeed",
    "actionSpeed",
    "spellCastingSpeed",
    "regularInteractionSpeed",
    "magicalInteractionSpeed",
    "cooldownReductionBonus",
    "buffDurationBonus",
    "debuffDurationBonus",
    "memoryCapacityBonus",
    "additionalMemoryCapacity",
    "physicalHealing",
    "magicalHealing",
    "luck",
    "maxHealth"
  ],

  "weaponProperties": [
    "comboMultiplier",
    "impactZone",
    "swingTiming"
  ]
}
```

---

## Open Questions & Data Gathering Needed

1. **Natural roll max values:** No confirmed pattern. Must be gathered per-stat per-slot from in-game observation. All natural ranges currently estimated.
2. **All slot modifier pools populated.** Confirmed socket ranges from Goldsmith screenshots. Cross-slot range tiers identified: armor slots (low), rings (mixed), back/necklaces/weapons (high).
3. **Inherent stat ranges:** Identify per-item as we populate the database. User will flag which inherent stats have ranges. Necklace of Peace Max Health confirmed as 5-6.
4. **Additional exclusion group anomalies:** Discover as we populate the database. Per-item overrides handle edge cases.
5. **Modifier pools are per-slot type**, not per-armor-type. Confirmed by user.
6. **Unique rarity 3× range:** Unique items cannot be socketed. Their single modifier rolls in a range of [natural min, natural max × 3].
7. **Secondary weapon items:** Need to catalog shields, lanterns, and off-hand items with their slot type and any special properties.
8. **Never-socketable stats:** Move Speed, Headshot Damage Reduction, Max Health are never available in any socket pool. They can only be inherent.
9. **Head sub-types:** Barbuta Helm shows "Head(Open helmet)" — there may be head sub-types (open/closed) that affect gameplay. Need to investigate.
10. **Ring Physical Healing range:** Crystal Frost Ring has +4 Physical Healing as a natural roll. Socket range for Physical Healing on rings needs confirmation (estimated 2-3 based on Magical Healing pattern).
