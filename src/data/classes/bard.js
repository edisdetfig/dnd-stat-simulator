// Bard — v3 class definition.
// Authored from docs/classes/bard.csv against docs/shape_examples.md patterns
// and docs/vocabulary.md enums. See docs/engine_requirements_phase_1_3.md for
// engine capabilities this data depends on but that aren't yet implemented.

export const bard = ({
  id: "bard",
  name: "Bard",
  desc: "Musical performance buffs and inspirational play.",

  baseAttributes: { str: 13, vig: 13, agi: 13, dex: 20, wil: 11, kno: 20, res: 15 },
  baseHealth: 121,

  maxPerks: 4,
  maxSkills: 2,

  armorRestrictions: ["cloth", "leather", "plate"],
  // Bard music uses no charges/cooldown as cost — memory-slot gated via skills.
  spellCost: { type: "none" },

  perks: [
    {
      id: "charismatic_performance",
      type: "perk",
      name: "Charismatic Performance",
      desc: "Upgrades a 'good' performance into a 'perfect' performance.",
      activation: "passive",
      passives: { upgradeGoodToPerfect: true },
    },

    {
      id: "dancing_feet",
      type: "perk",
      name: "Dancing Feet",
      desc: "While holding an instrument, gain 10 additional move speed.",
      activation: "passive",
      effects: [
        {
          stat: "moveSpeed", value: 10, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "instrument" },
        },
      ],
    },

    {
      id: "fermata",
      type: "perk",
      name: "Fermata",
      desc: "Gain 5 resourcefulness.",
      activation: "passive",
      effects: [
        { stat: "res", value: 5, phase: "pre_curve_flat" },
      ],
    },

    {
      id: "jolly_time",
      type: "perk",
      name: "Jolly Time",
      desc: "Drinking ale recovers 5(1.0) health, and grants 5 additional move speed while drunk.",
      activation: "passive",
      tags: ["drunk"],
      triggers: [
        {
          desc: "Fires on drinking ale — heals 5(1.0) physical and applies drunk state.",
          heal: { baseHeal: 5, scaling: 1.0, healType: "physical", target: "self" },
          stateChange: { drunk: true },
        },
      ],
      effects: [
        {
          stat: "moveSpeed", value: 5, phase: "post_curve",
          condition: { type: "player_state", state: "drunk" },
        },
      ],
    },

    {
      id: "lore_mastery",
      type: "perk",
      name: "Lore Mastery",
      desc: "Grants 30% regular interaction speed and 5 additional memory capacity.",
      activation: "passive",
      effects: [
        { stat: "regularInteractionSpeed", value: 0.30, phase: "post_curve" },
        { stat: "additionalMemoryCapacity", value: 5, phase: "post_curve" },
      ],
    },

    {
      id: "melodic_protection",
      type: "perk",
      name: "Melodic Protection",
      desc: "While playing music, gain 25% physical damage reduction and 25% magical damage reduction.",
      activation: "passive",
      effects: [
        {
          stat: "physicalDamageReduction", value: 0.25, phase: "post_curve",
          condition: { type: "player_state", state: "playing_music" },
        },
        {
          stat: "magicalDamageReduction", value: 0.25, phase: "post_curve",
          condition: { type: "player_state", state: "playing_music" },
        },
      ],
    },

    {
      id: "rapier_mastery",
      type: "perk",
      name: "Rapier Mastery",
      desc: "While using a Rapier, gain 3 weapon damage and 5% action speed.",
      activation: "passive",
      effects: [
        {
          stat: "weaponDamage", value: 3, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "rapier" },
        },
        {
          stat: "actionSpeed", value: 0.05, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "rapier" },
        },
      ],
    },

    {
      id: "reinforced_instruments",
      type: "perk",
      name: "Reinforced Instruments",
      desc: "When attacking with an instrument, gain 50% physical damage bonus.",
      activation: "passive",
      effects: [
        {
          stat: "physicalDamageBonus", value: 0.50, phase: "post_curve",
          condition: { type: "weapon_type", weaponType: "instrument" },
        },
      ],
    },

    {
      id: "story_teller",
      type: "perk",
      name: "Story Teller",
      desc: "Give all nearby party members around a +5 will and +3 knowledge buff. This applies to yourself as well.",
      activation: "passive",
      effects: [
        { stat: "wil", value: 5, phase: "pre_curve_flat", target: "nearby_allies" },
        { stat: "kno", value: 3, phase: "pre_curve_flat", target: "nearby_allies" },
      ],
    },

    {
      id: "superior_dexterity",
      type: "perk",
      name: "Superior Dexterity",
      desc: "50% faster switching time when switching between weapons/utility items.",
      activation: "passive",
      effects: [
        { stat: "switchingSpeed", value: 0.50, phase: "post_curve" },
      ],
    },

    {
      id: "wanderers_luck",
      type: "perk",
      name: "Wanderer's Luck",
      desc: "Gain 100 luck and increases the chance of finding high-quality items when opening treasure chests.",
      activation: "passive",
      effects: [
        { stat: "luck", value: 100, phase: "post_curve" },
      ],
      passives: { highQualityChestBonus: true },
    },

    {
      id: "war_song",
      type: "perk",
      name: "War Song",
      desc: "A successful performance increases nearby allies' weapon damage by 3 for 6 seconds. This applies to yourself as well.",
      activation: "passive",
      tags: ["song"],
      duration: { base: 6, type: "buff" },
      triggers: [
        {
          desc: "Fires on successful performance — +3 weapon damage to nearby allies for 6s.",
          effects: [
            { stat: "buffWeaponDamage", value: 3, phase: "post_curve", target: "nearby_allies" },
          ],
        },
      ],
    },
  ],

  skills: [
    {
      id: "encore",
      type: "skill",
      name: "Encore",
      desc: "Resets the duration of all active music buffs on nearby party members.",
      activation: "cast",
      targeting: "nearby_allies",
      passives: { resetsMusicDurations: true },
    },

    {
      id: "dissonance",
      type: "skill",
      name: "Dissonance",
      desc: "Plays an instrument to make an unpleasant noise that silences all enemy targets for 2 seconds.",
      activation: "cast",
      targeting: "enemy",
      tags: ["song"],
      appliesStatus: [
        {
          type: "silence",
          duration: { base: 2, type: "debuff" },
          desc: "Silence — disables skills/spells/performance abilities.",
        },
      ],
    },

    {
      id: "party_maker",
      type: "skill",
      name: "Party Maker",
      desc: "Play an instrument and grant all nearby allies immunity to drunkenness for 15 seconds. While immune, drinking alcohol restores 5 health.",
      activation: "cast",
      targeting: "nearby_allies",
      tags: ["song"],
      duration: { base: 15, type: "buff" },
      triggers: [
        {
          desc: "Fires on drinking alcohol while immune — restores 5 physical health.",
          heal: { baseHeal: 5, scaling: 0, healType: "physical", target: "self" },
        },
      ],
      passives: { drunkImmunity: true },
    },

    {
      id: "music_memory_1",
      type: "skill",
      name: "Music Memory 1",
      desc: "Allows for using up to 5 musics.",
      activation: "passive",
      slots: { type: "music", count: 5 },
    },

    {
      id: "music_memory_2",
      type: "skill",
      name: "Music Memory 2",
      desc: "Allows for using up to 5 musics.",
      activation: "passive",
      slots: { type: "music", count: 5 },
    },
  ],

  spells: [],

  musics: [
    {
      id: "rousing_rhythms",
      type: "music",
      name: "Rousing Rhythms",
      desc: "Nearby allies gain 2 all attributes for 60/120/240 seconds, based on performance.",
      activation: "cast",
      memoryCost: 3,
      targeting: "nearby_allies",
      tags: ["song", "drum"],
      performanceTiers: {
        poor: {
          duration: { base: 60, type: "buff" },
          effects: [
            { stat: "all_attributes", value: 2, phase: "pre_curve_flat", target: "nearby_allies" },
          ],
        },
        good: {
          duration: { base: 120, type: "buff" },
          effects: [
            { stat: "all_attributes", value: 2, phase: "pre_curve_flat", target: "nearby_allies" },
          ],
        },
        perfect: {
          duration: { base: 240, type: "buff" },
          effects: [
            { stat: "all_attributes", value: 2, phase: "pre_curve_flat", target: "nearby_allies" },
          ],
        },
      },
    },

    {
      id: "din_of_darkness",
      type: "music",
      name: "Din of Darkness",
      desc: "Deal 1(0.16)/3(0.33)/5(0.5) dark magical damage to all enemies in an area around the performer, based on performance.",
      activation: "cast",
      memoryCost: 3,
      targeting: "enemy",
      tags: ["song", "drum", "dark"],
      performanceTiers: {
        poor: {
          damage: [
            { base: 1, scaling: 0.16, damageType: "dark_magical", target: "nearby_enemies" },
          ],
        },
        good: {
          damage: [
            { base: 3, scaling: 0.33, damageType: "dark_magical", target: "nearby_enemies" },
          ],
        },
        perfect: {
          damage: [
            { base: 5, scaling: 0.5, damageType: "dark_magical", target: "nearby_enemies" },
          ],
        },
      },
    },

    {
      id: "beats_of_alacrity",
      type: "music",
      name: "Beats of Alacrity",
      desc: "The performer gains 4/5/6 additional move speed for 60/120/240 seconds. Song does not stack on itself.",
      activation: "cast",
      memoryCost: 1,
      targeting: "self",
      tags: ["song", "drum"],
      performanceTiers: {
        poor: {
          duration: { base: 60, type: "buff" },
          effects: [{ stat: "moveSpeed", value: 4, phase: "post_curve" }],
        },
        good: {
          duration: { base: 120, type: "buff" },
          effects: [{ stat: "moveSpeed", value: 5, phase: "post_curve" }],
        },
        perfect: {
          duration: { base: 240, type: "buff" },
          effects: [{ stat: "moveSpeed", value: 6, phase: "post_curve" }],
        },
      },
    },

    {
      id: "allegro",
      type: "music",
      name: "Allegro",
      desc: "You and nearby allies gain 3/4.5/6% action speed and 3/4.5/6% spell casting speed per second for 6 seconds based on your performance. Stacks up to 3 times.",
      activation: "cast",
      memoryCost: 4,
      targeting: "nearby_allies",
      tags: ["song", "drum"],
      performanceTiers: {
        poor: {
          duration: { base: 6, type: "buff" },
          stacking: {
            maxStacks: 3,
            perStack: [
              { stat: "actionSpeed", value: 0.03, phase: "post_curve", target: "nearby_allies" },
              { stat: "spellCastingSpeed", value: 0.03, phase: "post_curve", target: "nearby_allies" },
            ],
            desc: "Stacks per second up to 3.",
          },
        },
        good: {
          duration: { base: 6, type: "buff" },
          stacking: {
            maxStacks: 3,
            perStack: [
              { stat: "actionSpeed", value: 0.045, phase: "post_curve", target: "nearby_allies" },
              { stat: "spellCastingSpeed", value: 0.045, phase: "post_curve", target: "nearby_allies" },
            ],
            desc: "Stacks per second up to 3.",
          },
        },
        perfect: {
          duration: { base: 6, type: "buff" },
          stacking: {
            maxStacks: 3,
            perStack: [
              { stat: "actionSpeed", value: 0.06, phase: "post_curve", target: "nearby_allies" },
              { stat: "spellCastingSpeed", value: 0.06, phase: "post_curve", target: "nearby_allies" },
            ],
            desc: "Stacks per second up to 3.",
          },
        },
      },
    },

    {
      id: "accelerando",
      type: "music",
      name: "Accelerando",
      desc: "You and nearby allies gain 1/3/5 additional move speed per second for 6 seconds based on your performance. Stacks up to 3 times.",
      activation: "cast",
      memoryCost: 4,
      targeting: "nearby_allies",
      tags: ["song", "drum"],
      performanceTiers: {
        poor: {
          duration: { base: 6, type: "buff" },
          stacking: {
            maxStacks: 3,
            perStack: [
              { stat: "moveSpeed", value: 1, phase: "post_curve", target: "nearby_allies" },
            ],
            desc: "Stacks per second up to 3.",
          },
        },
        good: {
          duration: { base: 6, type: "buff" },
          stacking: {
            maxStacks: 3,
            perStack: [
              { stat: "moveSpeed", value: 3, phase: "post_curve", target: "nearby_allies" },
            ],
            desc: "Stacks per second up to 3.",
          },
        },
        perfect: {
          duration: { base: 6, type: "buff" },
          stacking: {
            maxStacks: 3,
            perStack: [
              { stat: "moveSpeed", value: 5, phase: "post_curve", target: "nearby_allies" },
            ],
            desc: "Stacks per second up to 3.",
          },
        },
      },
    },

    {
      id: "unchained_harmony",
      type: "music",
      name: "Unchained Harmony",
      desc: "Open all nearby doors/containers, including locked containers. It does not work for doors that require a special key.",
      activation: "cast",
      memoryCost: 5,
      targeting: "self",
      tags: ["song", "flute"],
      passives: { unlockContainers: true },
    },

    {
      id: "shriek_of_weakness",
      type: "music",
      name: "Shriek of Weakness",
      desc: "Nearby enemies lose 3/4/5 physical power and lose 3/6/9% physical damage reduction for 6/12/18 seconds.",
      activation: "cast",
      memoryCost: 3,
      targeting: "enemy",
      tags: ["song", "flute"],
      performanceTiers: {
        poor: {
          duration: { base: 6, type: "debuff" },
          effects: [
            { stat: "physicalPower", value: -3, phase: "post_curve", target: "nearby_enemies" },
            { stat: "physicalDamageReduction", value: -0.03, phase: "post_curve", target: "nearby_enemies" },
          ],
        },
        good: {
          duration: { base: 12, type: "debuff" },
          effects: [
            { stat: "physicalPower", value: -4, phase: "post_curve", target: "nearby_enemies" },
            { stat: "physicalDamageReduction", value: -0.06, phase: "post_curve", target: "nearby_enemies" },
          ],
        },
        perfect: {
          duration: { base: 18, type: "debuff" },
          effects: [
            { stat: "physicalPower", value: -5, phase: "post_curve", target: "nearby_enemies" },
            { stat: "physicalDamageReduction", value: -0.09, phase: "post_curve", target: "nearby_enemies" },
          ],
        },
      },
    },

    {
      id: "piercing_shrill",
      type: "music",
      name: "Piercing Shrill",
      desc: "Deal 20(0.1)/25(0.3)/30(0.5) physical damage to a target. Causes the echo sound effect on player targets for 3 seconds.",
      activation: "cast",
      memoryCost: 3,
      targeting: "enemy",
      tags: ["song", "flute"],
      performanceTiers: {
        poor: {
          damage: [
            { base: 20, scaling: 0.1, damageType: "physical", target: "enemy" },
          ],
        },
        good: {
          damage: [
            { base: 25, scaling: 0.3, damageType: "physical", target: "enemy" },
          ],
        },
        perfect: {
          damage: [
            { base: 30, scaling: 0.5, damageType: "physical", target: "enemy" },
          ],
        },
      },
    },

    {
      id: "banshees_howl",
      type: "music",
      name: "Banshees Howl",
      desc: "Reduces nearby enemy all attributes by 1/2/3 for 20 seconds. Does not work on Boss or Sub-boss monsters.",
      activation: "cast",
      memoryCost: 3,
      targeting: "enemy",
      tags: ["song", "flute"],
      performanceTiers: {
        poor: {
          duration: { base: 20, type: "debuff" },
          effects: [
            { stat: "all_attributes", value: -1, phase: "pre_curve_flat", target: "nearby_enemies" },
          ],
        },
        good: {
          duration: { base: 20, type: "debuff" },
          effects: [
            { stat: "all_attributes", value: -2, phase: "pre_curve_flat", target: "nearby_enemies" },
          ],
        },
        perfect: {
          duration: { base: 20, type: "debuff" },
          effects: [
            { stat: "all_attributes", value: -3, phase: "pre_curve_flat", target: "nearby_enemies" },
          ],
        },
      },
    },

    {
      id: "song_of_silence",
      type: "music",
      name: "Song of Silence",
      desc: "Interrupts all skills, spells, and songs used by nearby enemies, and prevents them from using skills, casting spells, or playing songs for 1/1.5/2 seconds. Does not work on boss or sub-boss monsters.",
      activation: "cast",
      memoryCost: 2,
      targeting: "enemy",
      tags: ["song", "lute"],
      performanceTiers: {
        poor: {
          appliesStatus: [
            { type: "silence", duration: { base: 1, type: "debuff" }, desc: "Silence — 1s." },
          ],
        },
        good: {
          appliesStatus: [
            { type: "silence", duration: { base: 1.5, type: "debuff" }, desc: "Silence — 1.5s." },
          ],
        },
        perfect: {
          appliesStatus: [
            { type: "silence", duration: { base: 2, type: "debuff" }, desc: "Silence — 2s." },
          ],
        },
      },
    },

    {
      id: "peacemaking",
      type: "music",
      name: "Peacemaking",
      desc: "All nearby players and monsters temporarily lose the will to fight when enchanted by the channel section of the song.",
      activation: "cast",
      memoryCost: 3,
      targeting: "nearby_enemies",
      tags: ["song", "lute"],
      passives: { peacemaking: true, channeledAbility: true },
    },

    {
      id: "lament_of_languor",
      type: "music",
      name: "Lament of Languor",
      desc: "Reduces the additional move speed by 10 of all enemy targets in the area for 6/12/18 seconds.",
      activation: "cast",
      memoryCost: 2,
      targeting: "enemy",
      tags: ["song", "lute"],
      performanceTiers: {
        poor: {
          duration: { base: 6, type: "debuff" },
          effects: [{ stat: "moveSpeed", value: -10, phase: "post_curve", target: "nearby_enemies" }],
        },
        good: {
          duration: { base: 12, type: "debuff" },
          effects: [{ stat: "moveSpeed", value: -10, phase: "post_curve", target: "nearby_enemies" }],
        },
        perfect: {
          duration: { base: 18, type: "debuff" },
          effects: [{ stat: "moveSpeed", value: -10, phase: "post_curve", target: "nearby_enemies" }],
        },
      },
    },

    {
      id: "chaotic_discord",
      type: "music",
      name: "Chaotic Discord",
      desc: "Excites nearby monsters to attack the nearest target except the performer.",
      activation: "cast",
      memoryCost: 3,
      targeting: "nearby_enemies",
      tags: ["song", "lute"],
      passives: { monsterAggroRedirect: true },
    },

    {
      id: "aria_of_alacrity",
      type: "music",
      name: "Aria of Alacrity",
      desc: "The performer gains 4/6/8% action speed for 60/120/240 seconds. Song does not stack on itself.",
      activation: "cast",
      memoryCost: 1,
      targeting: "self",
      tags: ["song", "lute"],
      performanceTiers: {
        poor: {
          duration: { base: 60, type: "buff" },
          effects: [{ stat: "actionSpeed", value: 0.04, phase: "post_curve" }],
        },
        good: {
          duration: { base: 120, type: "buff" },
          effects: [{ stat: "actionSpeed", value: 0.06, phase: "post_curve" }],
        },
        perfect: {
          duration: { base: 240, type: "buff" },
          effects: [{ stat: "actionSpeed", value: 0.08, phase: "post_curve" }],
        },
      },
    },

    {
      id: "tranquility",
      type: "music",
      name: "Tranquility",
      desc: "Restore 2(0.25) recoverable health of yourself and nearby allies every second while resting for 10/15/20 seconds.",
      activation: "cast",
      memoryCost: 2,
      targeting: "nearby_allies",
      tags: ["song", "lyre"],
      performanceTiers: {
        poor: {
          duration: { base: 10, type: "other" },
          heal: { baseHeal: 2, scaling: 0.25, healType: "magical", isHot: true, tickRate: 1, target: "nearby_allies" },
        },
        good: {
          duration: { base: 15, type: "other" },
          heal: { baseHeal: 2, scaling: 0.25, healType: "magical", isHot: true, tickRate: 1, target: "nearby_allies" },
        },
        perfect: {
          duration: { base: 20, type: "other" },
          heal: { baseHeal: 2, scaling: 0.25, healType: "magical", isHot: true, tickRate: 1, target: "nearby_allies" },
        },
      },
      passives: { healsRecoverable: true, requiresResting: true },
    },

    {
      id: "song_of_shadow",
      type: "music",
      name: "Song of Shadow",
      desc: "You and all nearby allies gain invisibility for 10/20/30 seconds. Invisibility breaks upon movement.",
      activation: "cast",
      memoryCost: 3,
      targeting: "nearby_allies",
      tags: ["song", "lyre"],
      performanceTiers: {
        poor: { duration: { base: 10, type: "buff" } },
        good: { duration: { base: 20, type: "buff" } },
        perfect: { duration: { base: 30, type: "buff" } },
      },
      passives: { invisibility: true, breaksOnMovement: true },
    },

    {
      id: "harmonic_shield",
      type: "music",
      name: "Harmonic Shield",
      desc: "The performer gains 3/4/5% physical damage reduction and 3/4/5% magical damage reduction for 60/120/240 seconds.",
      activation: "cast",
      memoryCost: 1,
      targeting: "self",
      tags: ["song", "lyre"],
      performanceTiers: {
        poor: {
          duration: { base: 60, type: "buff" },
          effects: [
            { stat: "physicalDamageReduction", value: 0.03, phase: "post_curve" },
            { stat: "magicalDamageReduction", value: 0.03, phase: "post_curve" },
          ],
        },
        good: {
          duration: { base: 120, type: "buff" },
          effects: [
            { stat: "physicalDamageReduction", value: 0.04, phase: "post_curve" },
            { stat: "magicalDamageReduction", value: 0.04, phase: "post_curve" },
          ],
        },
        perfect: {
          duration: { base: 240, type: "buff" },
          effects: [
            { stat: "physicalDamageReduction", value: 0.05, phase: "post_curve" },
            { stat: "magicalDamageReduction", value: 0.05, phase: "post_curve" },
          ],
        },
      },
    },

    {
      id: "chorale_of_clarity",
      type: "music",
      name: "Chorale of Clarity",
      desc: "Restore 8 spell memory per second of all nearby allies who rest for 8/16/24 seconds.",
      activation: "cast",
      memoryCost: 3,
      targeting: "nearby_allies",
      tags: ["song", "lyre"],
      performanceTiers: {
        poor: {
          duration: { base: 8, type: "other" },
          effects: [
            { stat: "spellMemoryRecovery", value: 8, phase: "post_curve", target: "nearby_allies" },
          ],
        },
        good: {
          duration: { base: 16, type: "other" },
          effects: [
            { stat: "spellMemoryRecovery", value: 8, phase: "post_curve", target: "nearby_allies" },
          ],
        },
        perfect: {
          duration: { base: 24, type: "other" },
          effects: [
            { stat: "spellMemoryRecovery", value: 8, phase: "post_curve", target: "nearby_allies" },
          ],
        },
      },
      passives: { requiresResting: true },
    },

    {
      id: "ballad_of_courage",
      type: "music",
      name: "Ballad of Courage",
      desc: "Grants the performer 5/7/10 physical power for 60/120/240 seconds. Song does not stack on itself.",
      activation: "cast",
      memoryCost: 1,
      targeting: "self",
      tags: ["song", "lyre"],
      performanceTiers: {
        poor: {
          duration: { base: 60, type: "buff" },
          effects: [{ stat: "physicalPower", value: 5, phase: "post_curve" }],
        },
        good: {
          duration: { base: 120, type: "buff" },
          effects: [{ stat: "physicalPower", value: 7, phase: "post_curve" }],
        },
        perfect: {
          duration: { base: 240, type: "buff" },
          effects: [{ stat: "physicalPower", value: 10, phase: "post_curve" }],
        },
      },
    },
  ],

  transformations: [],
});

export default bard;
