# Gear Wiki Facts — Phase 6.5a output

Research-only facts document. Answers every OQ-W in
`docs/session-prompts/gear-shape-design.md § 5` with citation + verification
level per LOCK B. No design decisions, no shape proposals.

---

## § 1 Purpose, legend, wiki version caveat

**Purpose.** Phase 6.5b (current-state mapping) and Phase 6.5c (shape design)
consume this document as authoritative wiki-sourced input alongside the
user-supplied metadata in `docs/session-prompts/gear-shape-design.md § 4`.
Where the two disagree, coordinator resolves (Phase 6.5b surfaces; Phase 6.5c
designs against the resolution).

**Verification legend.**

- **(VERIFIED)** — fact traces to `docs/damage_formulas.md`,
  `docs/healing_verification.md`, `docs/season8_constants.md`, or a line
  explicitly labeled VERIFIED in `docs/unresolved_questions.md`. In-game-tested.
- **(WIKI-SOURCED)** — fact traces to a wiki page citation, and is not
  corroborated in the verified docs.
- **(UNRESOLVED)** — fact the research did not nail down. Listed in § 15.

**Citation format.**

- Wiki: `[WIKI: https://darkanddarker.wiki.spellsandguns.com/<Page>]` (short
  form `[WIKI: /<Page>]` inside this doc).
- Repo: `[REPO: <path>:<line-range>]`.

**Wiki version caveat (per LOCK G).** The wiki documents itself as
**Patch 6.10 Hotfix 113 (2026-04-16)** per
`[WIKI: /Patch_Notes]` (most recent entry at time of research). This project
tracks **Season 8 Hotfix 112-1 (2026-04-09), game version 0.15.134.8480**. The
wiki is **one hotfix ahead of this project's state** — meaning some facts may
reflect changes not yet in our VERIFIED docs, and our VERIFIED docs may lag on
the newest numerical tweaks. Per LOCK G, facts flagged as potentially
patch-changed are noted inline. Where the wiki contradicts our VERIFIED docs,
VERIFIED wins; the wiki fact is noted as "stale or hotfix-delta" rather than
UNRESOLVED.

**Scope reminder.** This doc answers the OQ-W questions (`§ 5`) only. Design
decisions (OQ-D list in `§ 6` of `gear-shape-design.md`) are **not** in scope.

---

## § 2 Per-stat phase/curve table (answers OQ-W1)

**Table scope.** Every stat in `gear-shape-design.md § 4.3` plus `impactPower`
and `impactResistance` (per L4), plus `additionalMagicalDamage` (per §4.4 slot
pools, user-approved inclusion). The `maxHealthBonus` row is included as a
load-bearing pair with `maxHealth` per L7 (despite not being in the §4.3
registry).

**Phase vocabulary.** All phase values come from
`src/data/constants.js::EFFECT_PHASES` per LOCK F. No ad-hoc phases.

**"Phase: n/a" meaning.** Stat is inherent-only (per L4 for weapon
properties) OR consumed directly by a recipe's `inputFormula` / damage-module
parameter without going through the Stage-4 phase-bucket pipeline. Noted in
`semantic` when this applies.

**Naming-pair handling (per L7).** Where the §4.3 registry name differs from
the STAT_META name, both names appear in the row label and are treated as
naming-variants of the same stat. Load-bearing pairs (distinct stats) get
separate rows.

### 2.1 Core attributes

| Stat | Phase | Semantic | Citation | Level |
|---|---|---|---|---|
| `str` | n/a (ctx.attributes input) | Pre-curve attribute input; gear sums into `ctx.attributes.str` BEFORE the STR→PhysicalPower→PPB chain. Feeds `healthRating = STR×0.25 + VIG×0.75`. Class-data % multipliers route through `attribute_multiplier` phase (L8). | `[REPO: src/engine/recipes.js:84,126]` + `[REPO: docs/season8_constants.md:52]` | VERIFIED |
| `vig` | n/a (ctx.attributes input) | Pre-curve attribute input. Feeds `healthRating` at 0.75 weight; feeds `healthRecovery` curve. | `[REPO: src/engine/recipes.js:84,189]` | VERIFIED |
| `agi` | n/a (ctx.attributes input) | Pre-curve. Feeds `moveSpeed` curve; `actionSpeedRating = AGI×0.25 + DEX×0.75`. | `[REPO: src/engine/recipes.js:139,145]` + `[WIKI: /Movement]` | VERIFIED |
| `dex` | n/a (ctx.attributes input) | Pre-curve. Feeds `actionSpeed` at 0.75 weight; `regularInteractionSpeed` at 0.25 weight; `manualDexterity`, `equipSpeed` curves. | `[REPO: src/engine/recipes.js:145,158,197,201]` | VERIFIED |
| `wil` | n/a (ctx.attributes input) | Pre-curve. Feeds MPB chain (`WIL + magicalPower` → `magicPowerBonus` curve); `willToMagicResistance` → MDR chain; `buffDuration`, `debuffDuration`, `magicalInteractionSpeed` curves. | `[REPO: src/engine/recipes.js:115,131,163,173,178]` | VERIFIED |
| `kno` | n/a (ctx.attributes input) | Pre-curve. Feeds `spellCastingSpeed`, `memoryCapacity`, `memoryRecovery` curves. | `[REPO: src/engine/recipes.js:153,183,193]` | VERIFIED |
| `res` | n/a (ctx.attributes input) | Pre-curve. Feeds `cdr` curve; `regularInteractionSpeed` at 0.75 weight; `persuasiveness` curve. | `[REPO: src/engine/recipes.js:158,168,205]` | VERIFIED |

### 2.2 Offensive stats

| Stat | Phase | Semantic | Citation | Level |
|---|---|---|---|---|
| `weaponDamage` | n/a (inherent-only) | Base physical damage on the weapon; consumed as `baseWeaponDmg` in `calcPhysicalMeleeDamage`. Scales with rarity (wiki: Arming Sword 27→33 across Rarity I→VII, Longsword 36→42). | `[REPO: docs/damage_formulas.md:25]` + `[REPO: src/engine/damage.js:7,29]` + `[WIKI: /Arming_Sword]` + `[WIKI: /Longsword]` | VERIFIED |
| `magicWeaponDamage` | n/a (inherent-only — produces separate melee projection) | On Crystal Sword / Frostlight Crystal Sword etc. Produces an **independent** magic-melee damage instance (via spell-damage math). Does NOT add to spell base damage. Scales off caster's `magicalDamageBonus` / MPB. | `[REPO: docs/damage_formulas.md:84-96]` + `[WIKI: /Crystal_Sword]` | VERIFIED |
| `additionalWeaponDamage` (wiki: "Physical Gear Weapon Damage") | `post_curve` | Flat added AFTER `(Base + Buff) × Combo × ImpactZone`, BEFORE the `(1 + PPB)` multiplier. Benefits from PPB. Applies ONLY to direct weapon attacks (not skills like Rupture / Caltrops / Achilles Strike). | `[REPO: docs/damage_formulas.md:29]` + `[WIKI: /Enchantments]` | VERIFIED |
| `additionalPhysicalDamage` | `post_curve` | Flat added AFTER the `(1 + PPB)` multiplier, BEFORE hit-location / DR. Does NOT benefit from PPB. Applies to any physical damage instance (direct + skills). Scales with Attribute Bonus Ratio. | `[REPO: docs/damage_formulas.md:31]` + `[WIKI: /Scaling]` | VERIFIED |
| `additionalMagicalDamage` | `post_curve` | Symmetric with `additionalPhysicalDamage` for magical damage instances. Wiki confirms "Additional Magical Damage" is affected by Attribute Bonus Ratio. Registry consolidation deferred to 6.5c per `gear-shape-design.md:281`. | `[WIKI: /Scaling]` + `[WIKI: /Enchantments]` + `[REPO: docs/season8_constants.md:78-80]` | WIKI-SOURCED |
| `physicalPower` | `pre_curve_flat` (PPB curve input) | Flat added to STR **before** the PPB curve: `ppb.inputFormula = attrs.str + bonuses.physicalPower`. Not a post-curve addition. | `[REPO: src/engine/recipes.js:126]` | VERIFIED |
| `magicalPower` | `pre_curve_flat` (MPB curve input) | Flat added to WIL before the MPB curve. | `[REPO: src/engine/recipes.js:131]` | VERIFIED |
| `physicalDamageBonus` (wiki: "Physical Power Bonus") | `post_curve` | Added AFTER the PPB curve output: `finalPPB = curve(STR+gearPP) + gearPhysicalDamageBonus`. Final PPB enters damage formula as `(1 + PPB)`. | `[REPO: src/engine/recipes.js:127]` + `[REPO: docs/season8_constants.md:56]` | VERIFIED |
| `magicalDamageBonus` (wiki: "Magic Power Bonus" / "Magical Damage Bonus") | `post_curve` | Added AFTER the MPB curve output. **Universal** — applies to ALL magical subtypes additively. Typed bonuses (darkDamageBonus etc., class-authored, not gear-rolled) stack additively on top per matching type. | `[REPO: src/engine/recipes.js:132]` + `[REPO: docs/damage_formulas.md:122,130-143]` | VERIFIED |
| `armorPenetration` | `post_curve` (passthrough) | Flat % summed into `bonuses.armorPenetration`; consumed by `calcPhysicalMeleeDamage` as `attackerPen`. Multiplies **against target PDR%** (not AR). Cannot reduce DR below 0%. No effect on 0% or negative-DR targets (per `max()` in DR formula). | `[REPO: docs/damage_formulas.md:47-55]` + `[REPO: src/engine/recipes.js:213]` | VERIFIED |
| `magicPenetration` | `post_curve` (passthrough) | Symmetric; multiplies against target MDR%. | `[REPO: docs/damage_formulas.md:82]` + `[REPO: src/engine/recipes.js:214]` | VERIFIED |
| `headshotDamageBonus` (wiki: "Headshot Damage Modifier") | `post_curve` | Additive into Hit Location Multiplier for head: `hlm = 1.0 + 0.5 + HSBonus% − target HS DR%`. Recipe sums with class-data `headshotPower` (Barbarian Executioner +20%, Ranger Sharpshooter +15%). | `[REPO: docs/damage_formulas.md:40]` + `[REPO: src/engine/recipes.js:221-223]` + `[REPO: docs/season8_constants.md:22]` | VERIFIED |
| `demonDamageBonus` (wiki: "Demon Race Damage Bonus") | `multiplicative_layer` (conditional on target creature_type) | Multiplicatively layered: enters damage formula as `× (1 + RaceDamageBonus)` — gated on target's creature type = demon. Engine has `condition: { type: "creature_type", creatureType: "demon" }` available. | `[WIKI: /Damage]` + `[WIKI: /Enchantments]` | WIKI-SOURCED |
| `undeadDamageBonus` (wiki: "Undead Race Damage Bonus") | `multiplicative_layer` (conditional on target creature_type) | Symmetric with demonDamageBonus. | `[WIKI: /Damage]` + `[WIKI: /Enchantments]` | WIKI-SOURCED |

### 2.3 Defensive stats

| Stat | Phase | Semantic | Citation | Level |
|---|---|---|---|---|
| `armorRating` | `pre_curve_flat` (AR→PDR curve input) | Gear armor rating. Scaled by `equippedArmorRatingBonus` (Fighter Defense Mastery +15%); final AR = `gearAR × (1 + equippedARBonus) + additionalArmorRating`. Fed into `armorRatingToPDR` curve. Wiki: `Final AR = Item AR × (1 + Item AR Bonus) + Other AR`. | `[REPO: src/engine/recipes.js:97-106]` + `[WIKI: /Stats]` + `[WIKI: /Enchantments]` | VERIFIED |
| `additionalArmorRating` (wiki: "Armor Rating Add") | `pre_curve_flat` (AR pool, post-bonus-multiplier) | Flat AR added AFTER `equippedArmorRatingBonus` multiplies `armorRating` — bypasses the Defense-Mastery %AR bonus. Still feeds the AR→PDR curve (pre-curve input). | `[REPO: src/engine/recipes.js:99-103]` | VERIFIED |
| `magicResistance` (wiki: "Magical Resistance") | `pre_curve_flat` (MR→MDR curve input) | Two-stage: `WIL → willToMagicResistance` curve, then gear MR added to produce total MR, then `magicResistanceToMDR` curve. Gear MR is pre-curve to the second stage. | `[REPO: src/engine/recipes.js:112-120]` | VERIFIED |
| `physicalDamageReduction` (registry; ≡ STAT_META `physicalDamageReductionBonus` per L7 naming variance) | `post_curve` | Flat % added AFTER the AR→PDR curve. Enters before the cap clamp. Default cap 65%; Fighter Defense Mastery raises to 75% via `cap_override`. | `[REPO: src/engine/recipes.js:97-106]` + `[REPO: docs/season8_constants.md:10]` + `[REPO: docs/damage_formulas.md:56-59]` | VERIFIED |
| `magicalDamageReduction` (registry; ≡ STAT_META `magicalDamageReductionBonus`) | `post_curve` | Symmetric. Default cap 65%; Barbarian Iron Will raises to 75%. Antimagic is a **separate** `post_cap_multiplicative_layer` — not flat-additive to stat-screen MDR. | `[REPO: src/engine/recipes.js:118]` + `[REPO: docs/damage_formulas.md:180-188]` | VERIFIED |
| `projectileDamageReduction` | `post_curve` (passthrough) | Flat % passthrough via recipe; consumed in `calcPhysicalMeleeDamage` as `projectileReduction` parameter — enters formula as `× (1 − projectileReduction)`. Applies only to projectile damage (arrows, bolts, throwables, some spells). | `[REPO: docs/damage_formulas.md:32]` + `[REPO: src/engine/recipes.js:216]` | VERIFIED |
| `demonDamageReduction` | `multiplicative_layer` (conditional on attacker creature_type = demon) | Reduces incoming damage from demon-type attackers. Enters formula as `× (1 − RaceDamageReduction)`. Wiki shows Race Damage Reduction as a separate multiplicative factor. | `[WIKI: /Damage]` + `[WIKI: /Enchantments]` + `[REPO: src/data/stat-meta.js:56]` | WIKI-SOURCED |
| `undeadDamageReduction` | `multiplicative_layer` (conditional on attacker creature_type = undead) | Symmetric. | `[WIKI: /Damage]` + `[WIKI: /Enchantments]` + `[REPO: src/data/stat-meta.js:57]` | WIKI-SOURCED |
| `headshotDamageReduction` | `post_curve` (passthrough; inherent-only on head per wiki) | Subtracted from attacker's HS bonus in Hit Location Multiplier for head hits. Per wiki "Headshot Damage Modifier exclusive to head slot"; never appears in any socket pool. | `[REPO: docs/damage_formulas.md:40]` + `[REPO: src/engine/recipes.js:215]` + `[WIKI: /Armors]` | VERIFIED (math) + WIKI-SOURCED (inherent-only, never-socketable) |

### 2.4 Utility stats

| Stat | Phase | Semantic | Citation | Level |
|---|---|---|---|---|
| `moveSpeed` | `post_curve` (flat rating post-AGI curve) | Flat rating added AFTER AGI→MoveSpeed curve. 3 rating = 1%; base 300 (= 100%); hard cap 330 (= 110%). Gear values often negative (armor weight penalties). Never socketable (per wiki enchantments table — only `moveSpeedBonus`% or `moveSpeed` flat variants appear, and neither on the socketable list — inherent-only on armor). | `[REPO: src/engine/recipes.js:140]` + `[WIKI: /Movement]` + `[REPO: docs/season8_constants.md:13,58]` | VERIFIED |
| `actionSpeed` | `post_curve` | Flat % added to hybrid AGI/DEX curve output. Final AS enters as `(1 + AS)` in attack-time formula: `newLength = base / (1 + AS)`. Wiki range −38% to +63%. | `[REPO: src/engine/recipes.js:143-147]` + `[WIKI: /Stats]` | VERIFIED |
| `spellCastingSpeed` | `post_curve` | Final SCS = `spellCastingSpeed(KNO) + gearSpellCastingSpeed`. Cast time = `base / (1 + SCS)`. Wiki range −60% to +111%. | `[REPO: src/engine/recipes.js:151-154]` + `[REPO: docs/season8_constants.md:65]` + `[WIKI: /Stats]` | VERIFIED |
| `regularInteractionSpeed` | `post_curve` | Final RIS = curve((DEX×0.25)+(RES×0.75)) + gear %. Interaction time = `base / (1 + RIS)`. Surgical Kit / Bandage scaling = 0.5 per wiki. | `[REPO: src/engine/recipes.js:156-160]` + `[REPO: docs/season8_constants.md:66-67]` + `[WIKI: /Stats]` | VERIFIED |
| `magicalInteractionSpeed` | `post_curve` | Final MIS = curve(WIL) + gear %. Affects shrines / portals. | `[REPO: src/engine/recipes.js:161-165]` + `[WIKI: /Stats]` | VERIFIED |
| `cooldownReductionBonus` | `post_curve` | Final CDR = curve(RES) + gear %. Hard cap 65%. `reducedCooldown = base × (1 − CDR)`. | `[REPO: src/engine/recipes.js:166-170]` + `[REPO: docs/season8_constants.md:14,68]` | VERIFIED |
| `buffDurationBonus` | `post_curve` | Final = curve(WIL) + gear %. Capped at 100% (VERIFIED). Extends HoT tick counts: `floor(BaseDuration × (1 + BuffDur))`. | `[REPO: src/engine/recipes.js:171-175]` + `[REPO: docs/unresolved_questions.md:190-205]` | VERIFIED |
| `debuffDurationBonus` | `post_curve` | Final = curve(WIL) + gear %. Extends outgoing debuffs. Wiki: DoT duration = `Base × (1 + DebuffDur%)`; total ticks = `floor(duration)`; total value = `BaseValue / BaseDur × TotalTicks`. | `[REPO: src/engine/recipes.js:176-180]` + `[WIKI: /Damage]` | VERIFIED (repo) + WIKI-SOURCED (DoT formula) |
| `memoryCapacityBonus` | `post_curve_multiplicative` | Multiplicative on base memory capacity: `Total = ceil(MemCap(KNO) × (1 + memoryCapacityBonus)) + additionalMemoryCapacity`. Applied BEFORE additionalMemoryCapacity. | `[REPO: src/engine/recipes.js:181-186]` + `[REPO: docs/season8_constants.md:64]` + `[WIKI: /Stats]` | VERIFIED |
| `additionalMemoryCapacity` | `post_curve` (flat additive AFTER the bonus multiplier) | `Total = ceil(MemCap × (1 + Bonus)) + Add`. Add bypasses the percent multiplier. | Same as above | VERIFIED |
| `physicalHealing` (wiki: "Outgoing Physical Healing Add") | `post_curve` (feeds heal-formula `HealingAdd` term, physical path only) | Enters heal formula as `HealingAdd` for physical heal sources. `Total = (BaseHeal + HealingAdd × Scaling) × (1 + HealingMod)`. Physical healing does NOT scale with MPB. | `[REPO: docs/healing_verification.md:8-28]` + `[REPO: src/engine/recipes.js:212]` | VERIFIED |
| `magicalHealing` (wiki: "Outgoing Magical Healing Add") | `post_curve` (feeds `HealingAdd` term, magical path) | Same shape; magical heals receive both `HealingAdd × Scaling` AND `MPB × Scaling`: `Total = (BaseHeal + HealingAdd × Scaling) × (1 + MPB × Scaling) × (1 + HealingMod)`. | `[REPO: docs/healing_verification.md:8-28]` + `[REPO: src/engine/recipes.js:211]` | VERIFIED |
| `luck` | `post_curve` (passthrough; no curve) | Summed into Luck total (not attribute-derived). Hard cap 500. Feeds piecewise Luck Grade tables per wiki — NOT a simple linear multiplier on drop rates. Consumer: loot-roll path (out of simulator scope). | `[REPO: src/engine/recipes.js:210]` + `[WIKI: /Luck]` | WIKI-SOURCED |
| `maxHealth` (wiki: "Max Health Add") | `post_curve` (flat HP added AFTER the MHB% multiplier) | `finalHP = floor(base × (1 + sumMHB)) + PATCH_HEALTH_BONUS + sumMHA`. Added AFTER MHB% multiplier; bypasses MHB scaling. Inherent on necklaces (e.g., Necklace of Peace); never socketable (not in wiki enchantments table). | `[REPO: docs/unresolved_questions.md:82-121]` + `[REPO: src/engine/recipes.js:82-91]` + `[WIKI: /Accessories]` + `[WIKI: /Health]` | VERIFIED |
| **`maxHealthBonus`** (NOT in §4.3 registry; included per L7 load-bearing pair) | `post_curve_multiplicative` | Percent multiplier applied to base HP BEFORE maxHealth addition. Mechanically distinct from maxHealth per L7. Wiki flags `Max Health and Max Health Bonus` as a mutually exclusive "modifier family" — cannot socket both on same item. Removed from equipment in Season 8 per `season8_constants.md:76` (gear rolls eliminated; still available via perks like Barbarian Robust +7.5%). | `[REPO: src/engine/recipes.js:82-91]` + `[REPO: docs/unresolved_questions.md:82-121]` + `[WIKI: /Enchantments]` + `[REPO: docs/season8_constants.md:76]` | VERIFIED |

### 2.5 Weapon properties (inherent-only per L4)

| Stat | Phase | Semantic | Citation | Level |
|---|---|---|---|---|
| `comboMultiplier` | n/a (inherent-only, per-combo-stage) | Multiplier per combo stage. Enters damage formula as `(Base + Buff) × ComboMult × ImpactZone + GearWpnDmg`. Per-weapon values (e.g., Spectral Blade 1.0/1.05/1.10 VERIFIED; Longsword Attacks 1/2/3 = 100/105/110%; Arming Sword 100/105/110%). Special/riposte stages have their own multipliers (Spectral Blade special 135/135%; Longsword riposte 135/135% after 112-1 nerf from 150%). | `[REPO: docs/damage_formulas.md:10-20,208-213]` + `[WIKI: /Spectral_Blade]` + `[WIKI: /Longsword]` + `[WIKI: /Arming_Sword]` + `[REPO: docs/season8_constants.md:101-102]` | VERIFIED (Spectral Blade) + WIKI-SOURCED (others) |
| `impactZone` | n/a (inherent-only; per-strike-location) | Multiplier per hitbox region on the weapon arc. Per wiki per-weapon pages, values given as `"100%/90%"` — two-zone (first-hit vs subsequent, or primary hitbox vs edge — exact mapping not specified in wiki copy reviewed). Enters damage formula same position as `comboMultiplier` (multiplied together). Exact per-weapon zone-to-region mapping requires in-game instrumentation. | `[REPO: docs/damage_formulas.md:28]` + `[WIKI: /Weapons]` + `[WIKI: /Spectral_Blade]` | VERIFIED (formula position) + WIKI-SOURCED (per-weapon values; partial zone-mapping) |
| `swingTiming` | n/a (inherent-only; display metadata) | Per-weapon per-stage windup / hit / recovery times (e.g., Spectral Blade Attack 1: 0.932s windup, 0.229s hit; Arming Sword Attack 1: 0.399s/0.205s/0.234s). Does NOT feed action-speed computation directly — action speed derives from AGI/DEX curve + gear %. Swing timing is per-weapon metadata consumed in UI display; action speed modifies total swing cycle as `newLength = base / (1 + AS)`. | `[WIKI: /Spectral_Blade]` + `[WIKI: /Arming_Sword]` + `[WIKI: /Longsword]` | WIKI-SOURCED |
| **`impactPower`** (per L4) | n/a (inherent-only, weapon) | Weapon inherent. Used for (a) breaking breakable props and (b) stagger on blocked hits. Formula: `ImpactDamage = ImpactPower − ImpactResistance` determines stagger tier: `>` heavy, `=` medium, `<` weak. Weak/Medium stagger interrupts attacker combo (resets to Attack 1); Heavy preserves combo. Hilt strikes cannot break or stagger. Prop-breaking: `ceil(ImpactEndurance / (ImpactResistance − ImpactPower))` hits (when resistance > power). **Wiki does NOT list per-weapon Impact Power values** — missing datum; needs in-game measurement. | `[WIKI: /Impact_Power]` | WIKI-SOURCED |
| **`impactResistance`** (per L4) | n/a (inherent-only, shield / weapon-with-block-ability / prop) | Opposite of impactPower. On shields: Buckler 6, Round Shield 4, Heater Shield 5, Pavise 6 (WIKI-SOURCED). On weapons with a block ability: Spectral Blade 3, Longsword 3, Arming Sword 3 (WIKI-SOURCED — confirms Hotfix 112-1 change removing Impact Resistance from Fighter Weapon Guard per `season8_constants.md:93`; gear-side Impact Resistance still exists on shields + block-capable weapons). Shield blocking's stagger also scales with shield's documented stagger duration (0.3s–1.5s per shield). | `[WIKI: /Impact_Power]` + `[WIKI: /Pavise]` + `[WIKI: /Spectral_Blade]` + `[WIKI: /Arming_Sword]` + `[WIKI: /Longsword]` + `[REPO: docs/season8_constants.md:93]` | WIKI-SOURCED |

### 2.6 Cross-cutting phase notes

- **Antimagic is a `post_cap_multiplicative_layer`** consumer but its stat
  (`magicDamageTaken`) is **class-authored only**, not in §4.3 gear registry
  (per STAT_META at `src/data/stat-meta.js:95`; not gear-roll-pool-eligible).
  `[REPO: docs/damage_formulas.md:180-188]` (VERIFIED).
- **`healingMod` is a `healing_modifier` phase** consumer but is
  class-authored only (Vampirism, Immortal Lament). Not in §4.3 registry.
  `[REPO: docs/healing_verification.md:23-28]` (VERIFIED).
- **`cap_override` phase** is consumed by perks (Fighter Defense Mastery `pdr`
  cap to 0.75; Barbarian Iron Will `mdr` cap to 0.75). No gear affix uses
  `cap_override`. `[REPO: src/engine/recipes.js:42-65]` (VERIFIED).
- **Typed-damage-bonus phase** (`type_damage_bonus`) is consumed by typed
  stats (`darkDamageBonus`, `fireDamageBonus`, etc.). All class-authored; no
  gear affix lands there (gear rolls `magicalDamageBonus` which is universal
  additive into MPB at `post_curve`). `[REPO: docs/damage_formulas.md:122,130-143]`
  (VERIFIED).

---

## § 3 Weapon property math (answers OQ-W2)

### 3.1 comboMultiplier

- **Position in formula:** `(Base + Buff) × ComboMult × ImpactZone + GearWpnDmg` — inside the `(... ×(1+PPB) + addPhys)` bracket. `[REPO: docs/damage_formulas.md:10-20]` (VERIFIED).
- **Per-stage count:** Typical 3-stage primary combo. Also: some weapons have a 2-stage special/riposte sub-combo (Arming Sword 1-stage special 150%; Longsword 2-stage riposte 135/135%; Spectral Blade 2-stage special 135/135%).
- **Typical values (wiki-sourced):**
  - One-handed swords (Arming Sword): Primary 100/105/110%; Special 150%.
  - Two-handed swords (Longsword, Spectral Blade): Primary 100/105/110%; Special 135/135%.
- **VERIFIED test points in repo:** Spectral Blade Hit 1/2/3 = 1.0/1.05/1.1 (`docs/damage_formulas.md:211`).

### 3.2 impactZone

- **Position in formula:** Same position as `comboMultiplier` (multiplied together) per `docs/damage_formulas.md:28`.
- **Per-weapon wiki data:** wiki per-weapon pages document impactZone as a two-value pair (e.g., "100%/90%") for primary attacks. Exact zone-to-strike-location mapping (tip / mid / hilt) is not in the copy reviewed — the wiki page for Spectral Blade shows the two values without naming the zones. Requires in-game measurement OR deeper wiki scrape (hitbox images on individual weapon pages may clarify) — UNRESOLVED for now.
- **VERIFIED status in repo:** Spectral Blade impact zone values "not yet tested (center assumed 1.0, hilt appears lower)" (`docs/damage_formulas.md:213`).

### 3.3 swingTiming

- **Engine role: display-only.** Wiki per-weapon pages list per-stage windup / hit / recovery times. These do NOT feed the action-speed recipe (which derives from AGI/DEX curve + gear %). They ARE scaled by final Action Speed at display time: `displayedSwingLength = baseSwingTiming / (1 + AS)`.
- **Representative values:**
  - Spectral Blade Attack 1: 0.932s windup / 0.229s hit / 0.283s recovery.
  - Arming Sword Attack 1: 0.399s / 0.205s / 0.234s; Attack 2: 0.4s / 0.157s / 0.376s; Attack 3: 0.6s / 0.154s / 0.313s.
  - Longsword Attack 1: 0.932s / 0.229s / 0.283s (identical windup to Spectral Blade's primary attack 1).

### 3.4 impactPower / impactResistance

- See § 2.5 rows. Key facts:
  - Weapon stat (on attacker) vs shield / prop / block-capable-weapon stat (on defender / object).
  - Formula: `stagger tier = sign(ImpactPower − ImpactResistance)` (>, =, <).
  - Prop break: `hits = ceil(Endurance / (Resistance − Power))` when Resistance > Power.
  - Hilt cannot break / stagger.
  - Shield Impact Resistance values (VERIFIED list from `/Impact_Power`): Buckler 6, Round Shield 4, Heater Shield 5, Pavise 6.
  - Weapon Impact Power values **not documented on wiki** for specific weapons — UNRESOLVED.
  - Block-capable-weapon Impact Resistance values: Spectral Blade / Longsword / Arming Sword = 3 each (WIKI-SOURCED from per-weapon pages).

### 3.5 Delta from VERIFIED formula — recorded for Phase 11+ consideration

The wiki `/Damage` page documents a richer core formula than our VERIFIED formula in `docs/damage_formulas.md:10-20`. Recording the deltas here so 6.5c + Phase 11 know what's outside the currently-instrumented simulator path.

**Wiki's full formula:**

```
Damage =
  (((Base + BuffWpn) × ComboMult × ImpactZoneMult
    + GearWpnDmg | MagicalDmg
    + DivineStrikeDmg)
   × (1 + PowerBonus)
   + AdditionalDmg)
  × (1 + HitLocationBonus)
  × (1 + RaceDamageBonus)
  × (1 − RaceDamageReduction)
  × ((1 − DR × (1 + DRMod) × (1 − Pen)) + ElementalDamageReduction)
  × (1 − ProjectileReduction)
  × ProjectileFalloff
  + TrueDamage
```

**Deltas from our VERIFIED formula (`damage_formulas.md:10-20`):**

1. **`DivineStrikeDmg` term** in the weapon-damage bracket — wiki-only. VERIFIED formula does not model this (Cleric-specific; out of Warlock-anchor scope). Record for Phase 10 (Cleric migration).
2. **`(1 + RaceDamageBonus)` multiplicative layer** — wiki-only in this position. Our `docs/damage_formulas.md` does not yet model creature-type bonuses (`demonDamageBonus` / `undeadDamageBonus`) in the formula despite STAT_META having the stats and §4.4 pools containing them. Maps to `multiplicative_layer` phase with `creature_type` condition. Record for Phase 11+ when PvE creature-type targeting enters scope.
3. **`(1 − RaceDamageReduction)` multiplicative layer** — wiki-only. Symmetric with above. Same deferral.
4. **`(1 + DRMod)` inner DR amplifier** — wiki-only. Amplifies the effective DR seen by the attacker. No consumer in current data; unclear what class/perk produces it. Flag UNRESOLVED — potential new stat the wiki assumes exists; may be Season 8 pre-removal or hotfix-113 new.
5. **`+ ElementalDamageReduction` inner DR addend** — wiki-only. Appears to be a separate DR layer applied additively inside the DR term. No clear stat map. UNRESOLVED.
6. **`× ProjectileFalloff` outer factor** — wiki-only. Distance-attenuation for ranged attacks. Not modeled (we're snapshot-no-distance). Display-time only at most. Record for possible Phase 11+ ranged-weapon accuracy panel.
7. **Hit-location granularity: wiki splits limb** into Arms (×0.8), Hands (×0.7), Legs (×0.6), Feet (×0.5). Our VERIFIED doc collapses all to a single Limb = ×0.5 per `docs/season8_constants.md:22-23` (VERIFIED). The wiki's granular values may be a later-patch addition OR a display-layer detail; in-game instrumentation (the 0.5 limb multiplier test) confirmed our coarse value. If the granular split is actually in-game, our VERIFIED test happens to have used a "foot" limb or other ×0.5 location — note for re-verification. For now: VERIFIED wins on coarse Body/Head/Limb; wiki granularity is **WIKI-SOURCED extension, UNRESOLVED in engine** until re-tested.

**Recommendation:** Phase 11+ — run additional damage tests against non-foot-non-generic-limb hit locations to confirm whether arms/hands/legs differ from feet. If they do, the simulator needs a richer hit-location enum; if they don't, the wiki's per-limb breakdown is display-only.

---

## § 4 Hit combo semantics (answers OQ-W3)

**Documentation status.** Per-weapon hit combos ARE wiki-documented — on each individual weapon's page. Not on the `/Weapons` hub, which only lists weapons by category.

**Per-weapon data shape (wiki-confirmed):**

```
Primary Attack N:
  - Multiplier % (of base weapon damage)
  - Damage type (Slash / Pierce / Blunt)
  - Windup / Hit / Recovery times (seconds)
  - Action movement penalty (Self, Mid-Attack, Block, Special multipliers)
  - Impact zone: "X%/Y%" (two values — zone mapping partially resolved)
```

**Sampled weapons (full data in wiki per-weapon pages):**

| Weapon | Category | Handedness | Primary stages + multipliers | Special stages + multipliers | Impact Resistance (block ability) |
|---|---|---|---|---|---|
| Spectral Blade | Sword | 2H Main | 1: 100% Pierce; 2: 105% Slash; 3: 110% Slash | Riposte 1/2: 135%/135% Slash | 3 |
| Longsword | Sword | 2H Main | 1: 100% Pierce; 2: 105% Slash; 3: 110% Slash | Riposte 1/2: 135%/135% Slash (post-112-1) | 3 |
| Arming Sword | Sword | 1H Main | 1: 100% Slash; 2: 105% Slash; 3: 110% Pierce | Special: 150% Slash | 3 |

**Combo-stage count by weapon type (observational):**

- Swords (1H + 2H): 3-stage primary. Special/riposte: 1–2 stage.
- Daggers, Axes, Maces, Polearms: not fully sampled this phase — per-weapon pages hold the data.
- Bows / Crossbows / Firearms: single-shot; likely no multi-stage "combo" — UNRESOLVED this phase.
- Magic Stuff: no weapon-attack combos (primary use is spell-cast) — UNRESOLVED this phase.

**Combo data is per-weapon, not per-weaponType.** Different weapons of the same type may have different combo multipliers (e.g., we sampled three swords with identical 100/105/110 primary; but Obsidian Cutlass or Kuma's Claw or Tidal Falchion are not sampled and may diverge). Phase 11+ / gear-authoring-time task: scrape all individual weapon pages.

**Base damage scaling by rarity (wiki-confirmed pattern).** Arming Sword 27→33 (I→VII). Longsword 36→42 (I→VII). Spectral Blade page shows a single "40" (Common/Rarity-fixed). **Rarity increments base damage by +1 per tier** for weapons that scale; weapons with a single-rarity availability (Spectral Blade: Epic-only per §4.4) show only their single-rarity value.

**VERIFIED data point.** Spectral Blade 1.0/1.05/1.10 combo multipliers + headshot test points `[REPO: docs/damage_formulas.md:206-240]` confirm the wiki numbers for Spectral Blade primary combo.

---

## § 5 Memory capacity interactions (answers OQ-W4)

**Base memory capacity formula.** `MemCap = curve(KNO)` — piecewise curve in `data/stat_curves.json`.

**Gear interactions:**

- `memoryCapacityBonus` — percent; **multiplicative** on base: multiplies `MemCap(KNO)`.
- `additionalMemoryCapacity` — flat; **additive AFTER** the percent multiplier.

**Composition formula (VERIFIED):**

```
Total Memory = ceil(MemCap(KNO) × (1 + memoryCapacityBonus)) + additionalMemoryCapacity
```

Citations: `[REPO: docs/season8_constants.md:64]` + `[REPO: src/engine/recipes.js:181-186]` + `[WIKI: /Stats § Memory Capacity]` (VERIFIED).

**Key behavior:**

- `ceil()` applies to the percent-multiplied-curve-output, BEFORE adding flat Add.
- Flat Add bypasses the percent multiplier.
- Wiki confirms: "Total Memory Capacity = ceil(Cap × (1 + Bonus%)) + Add Cap".
- Max memory from Knowledge alone: 94 at KNO cap (wiki: "0 up to 6 Knowledge" baseline; then curve through 94).
- Spell Memory I / II perks add +5 to the SPELL pool (class-authored, `memorySlots` stat). Pools are per-ability-type (spell / transformation / music); wiki and engine both treat these as separate pools.

---

## § 6 Secondary weapon variants (answers OQ-W5)

**Terminology.** Wiki uses "Main-Hand" / "Off-Hand". Per L2.3 our shape uses "primaryWeapon" / "secondaryWeapon".

**Weapon types with documented Off-Hand (secondary) variants (WIKI-SOURCED from `/Weapons`):**

| Weapon type | Off-Hand variants (wiki-listed) |
|---|---|
| Sword | Bloodsap Blade, Short Sword, Divine Short Sword, Short Sword of Righteousness, Sterling Short Sword |
| Dagger | Castillon Dagger, Stiletto Dagger, Icefang, Obsidian Stiletto Dagger, Deathbloom |
| Axe | Hatchet |
| Shield | All standard shields (Buckler, Round Shield, Heater Shield) occupy off-hand slot — EXCEPT Pavise (see below) |
| Unarmed | "Bare Hands" listed as Off-Hand in wiki (§4.4 note: `weaponHeldState: "unarmed"` aligns with `weapon_type: "unarmed"` conditions — matches L5) |

**Weapon types WITHOUT off-hand variants (observational from wiki):** Maces, Polearms, Bows, Crossbows, Firearms, Throwables (utility), Magic Stuff, Light Sources.

**Primary-Two-Handed-Shield anomaly (L2.2 confirmed).** Pavise is a primary two-handed shield:
- Hand type: Two Handed
- Slot: Main-Hand
- Required classes: Fighter, Ranger
- Armor Rating 30 (base rarity) → 40~41 (high rarity)
- Block ability Impact Resistance: 6
- Move speed penalty: −50
- Source: `[WIKI: /Pavise]`

**Single modifier pool for all one-handed weapons (WIKI-SOURCED from `/Enchantments`).** The enchantment table pools by `1H / 2H / All armor / Ring / Necklace / Cloak` — no separate "off-hand 1H" column. This confirms §4.4 metadata's `weapon_oneHanded` pool covers main-hand AND off-hand one-handed weapons. No separate `weapon_secondary` pool needed.

---

## § 7 "magicStuff" weapon-type vocabulary (answers OQ-W6)

**Wiki naming: "Magic Stuff"** (with space). Our `weaponType` value `"magicStuff"` is the camelCase form of this category name. Not a placeholder. `[WIKI: /Weapons]` (WIKI-SOURCED).

**Members of Magic Stuff category (from `/Spellbook § Other Magic Stuff Weapons`):**

- Spellbook (2H Main)
- Ceremonial Staff
- Crystal Ball
- Crystal Sword (multi-typed: Sword + Magic Stuff — confirms L2.1 array form)
- Magic Staff
- Spellplunder Rod
- Golden Scripture of Solaris (craftable variant)
- Requiem of the Fairy (craftable variant)
- Tome of Sheol (craftable variant)
- Frostlight Crystal Sword (multi-typed — confirms L2.1)

**Multi-typed case pattern (L2.1 confirmed).** Crystal Sword is documented as BOTH "Sword" and "Magic Stuff". Functions as a hybrid weapon: physical base damage AS a sword; `magicWeaponDamage` AS a magic-stuff-category entry. `[WIKI: /Crystal_Sword]` (WIKI-SOURCED).

**Semantic domain.** Magic Stuff is the "caster-class weapon category" — all members require at least one of {Wizard, Cleric, Warlock, Druid, Sorcerer} (subset varies per weapon). The category gates **class availability for that weapon**, and is used in at least:

- `weaponType` tagging on the item (enables `{ type: "weapon_type", weaponType: "magicStuff" }` condition dispatch for abilities like "requires magic weapon").
- Allowable rarity / enchantment pool membership (from `/Enchantments` pools: the 2H-Magic-Stuff pool differs from the 2H-Physical pool in emphasis on magical-power vs physical-power affixes).

**Does magicStuff gate spells?** Not explicitly documented on the pages reviewed. Some class abilities may condition on `weapon_type: "magicStuff"` (or the specific member — `spellbook`). Full audit is Phase 10 class-migration scope; flagged for 6.5c. (UNRESOLVED as a class-data question, but outside OQ-W scope.)

---

## § 8 Never-socketable stats (answers OQ-W7)

Wiki does NOT publish an explicit "never socketable" list. Derivation: the complete `/Enchantments` enchantment table lists every socketable modifier. Stats absent from that table are never socketable (though they may appear as inherent-only on specific items).

**Derived never-socketable list (WIKI-SOURCED from `/Enchantments` absence):**

| Stat | Appears as inherent on | Note |
|---|---|---|
| `moveSpeed` (flat rating) | Feet items (positive), armor (often negative) | Never in enchantment table. Inherent-only. (UNRESOLVED: wiki lists `moveSpeedBonus` as a mutually-exclusive family member but neither member appears in the socketable enchantments table reviewed — both may be non-socketable; needs deeper enchantments-page scrape.) |
| `maxHealth` | Necklace only (e.g., Necklace of Peace) | Never in enchantment table. Wiki flags `Max Health` / `Max Health Bonus` as a "modifier family" (mutually exclusive). |
| `maxHealthBonus` | Class perks only (Season 8 removed from gear per `season8_constants.md:76`) | Removed from gear affix pool in Season 8. |
| `headshotDamageReduction` | Head slot only (inherent) | Never in enchantment table. Wiki armor page: "Headshot Damage Reduction exclusive to this slot". |
| `weaponDamage` | Weapons only (inherent) | Base weapon stat. |
| `magicWeaponDamage` | Magic-stuff weapons + crystal weapons (inherent) | Not an enchantment. |
| `comboMultiplier` | Weapons (inherent, per-stage) | Not an enchantment (per L4). |
| `impactZone` | Weapons (inherent, per-zone) | Not an enchantment (per L4). |
| `swingTiming` | Weapons (inherent, per-stage display) | Not an enchantment (per L4). |
| `impactPower` | Weapons (inherent) | Not an enchantment. |
| `impactResistance` | Shields, block-capable weapons, props (inherent) | Not an enchantment. |

**Observations confirming §4.6 "globally exempt" candidate list:**
- `headshotDamageReduction` — inherent-only on head → matches §4.6 observation.
- `moveSpeed` — never in pool tables → matches.
- `maxHealth` — never in pool tables → matches.

**Season 8 removals (from `season8_constants.md:76-80`, VERIFIED):**
- HP Bonus (i.e., `maxHealthBonus`) removed from equipment.
- True Damage and All Attributes affixes removed from random roll pool.
- No new "Add Damage" affix introduced; remaining flat-damage affixes are `additionalWeaponDamage`, `additionalPhysicalDamage`, `additionalMagicalDamage`.

---

## § 9 Rarity + modifier count (answers OQ-W8)

### 9.1 Standard rarity → modifier count

**L12 (user-verified, in-game-confirmed, has precedence):**

| Rarity | Modifier count (L12) |
|---|---|
| poor | 0 |
| common | 0 |
| uncommon | 1 |
| rare | 2 |
| epic | 3 |
| legendary | 4 |
| unique | 1 modifier, rolls at 3× normal range (per L1) |

### 9.2 Wiki-documented rarity table (WIKI-SOURCED from `/Enchantments`)

| Rarity | Modifier count (wiki) |
|---|---|
| Poor | 0 |
| Common | 0 |
| Uncommon | 1 |
| Rare | 2 |
| Epic | 3 |
| Legend | 4 |
| Unique | 5 |

### 9.3 Reconciliation — L12 vs wiki

- **Poor / Common / Uncommon / Rare / Epic / Legendary**: **MATCH.** (Wiki says "Legend"; our shape says "legendary" — naming variance only, same count.)
- **Unique row only**: L12 says `1 modifier at 3× normal range`; wiki says `5 modifiers`.

**Resolution:** L12 has precedence. The L12 Unique rule is user-in-game-verified (coordinator confirmation before this phase). The wiki entry is either stale, uses different counting semantics (e.g., counts inherents alongside modifiers), or reflects a pre-Season-8 version. Recorded here for completeness; not a reopen-L12 signal. See § 15 for final framing.

### 9.4 Craftable-gear exception (wiki-confirmed, new)

Wiki `/Enchantments`: *"Craftable gear begins with 2 enchantments at Uncommon and increases by 1 per rarity level."*

| Rarity | Craftable modifier count (wiki) |
|---|---|
| Uncommon | 2 |
| Rare | 3 |
| Epic | 4 |
| Legend | 5 |
| Unique | 6 |

This is a **new** pattern not yet captured in the §4.4 metadata's `modifierCountOverrides` example (Foul Boots: rare→3). Phase 6.5c may wish to author a `modifierCountOverrides` entry per craftable item OR a class-wide `craftable: true` flag that triggers the +1 per rarity rule. Record this as a design input; not a 6.5a decision.

Example craftables the wiki names: Spiked Gauntlet (wiki states "Craftable: Yes (via Armourer merchant)"), Foul Boots (§4.4 metadata flags as rare+3), most Magic Stuff weapons. A full craftable-catalog scrape is out of OQ-W8 scope.

### 9.5 Rolled-value rules (wiki-confirmed)

- "Items will always have the maximum number of enchantments possible" per rarity (WIKI-SOURCED).
- "Only positive values roll; no duplicates per item" (WIKI-SOURCED).
- Socketed range ≤ natural range (WIKI-SOURCED and matches §4.4).

### 9.6 Modifier "families" — mutually exclusive socketing pairs (WIKI-SOURCED)

Wiki `/Enchantments` lists these modifier families (only one per family can be socketed on an item):

1. **`additionalPhysicalDamage`** vs **True Physical Damage** (the "Physical True" family). Our §4.6 does not explicitly enumerate this family — gear `additionalPhysicalDamage` exists; True Physical Damage as an affix was removed in Season 8 per `season8_constants.md:78-80`, so this family is **currently defunct** on gear (True Physical only via Spiked Gauntlet inherent).
2. **Max Health** vs **Max Health Bonus** — family. In Season 8, `maxHealthBonus` removed from equipment, so family is **currently single-member** on gear.
3. **Additional Movespeed** vs **Movespeed Bonus** — family. Both appear to be rare / inherent; neither in socketable enchantments table reviewed. Status UNRESOLVED on gear pools.
4. **Physical True Damage** vs **Magical True Damage** — family. Both removed in Season 8 per above. Currently inapplicable.

Our §4.6 currently has only `ar_pdr` (`additionalArmorRating` vs `physicalDamageReduction`). Wiki does NOT list this as a named family explicitly — likely implicit in the "Reductions" section pool structure. Confirmation that the wiki treats AR and PDR as competing rather than complementary requires deeper wiki scrape — **UNRESOLVED** for § 15.

---

## § 10 Inherent ranged stats (answers OQ-W9)

**Wiki pattern.** Per-weapon pages list inherent stats as **either a single value** or **a per-rarity progression** (e.g., Arming Sword base damage: Rarity I=27, II=28, …, VII=33).

**Observations from sampled pages:**

- Spectral Blade: single value per stat (40 base damage, 5% Action Speed, 5% Headshot). No ranged form.
- Arming Sword: per-rarity value progression on base damage (27→33).
- Longsword: per-rarity progression on base damage (36→42).
- Spellbook: per-rarity progression on Magical Damage (1→7) and physical base (18→24).
- Spiked Gauntlet (wiki page): single values shown for Common rarity only — no per-rarity data for Epic.
- Necklace of Peace (from `/Accessories`): `Max Health Add 1~2 to 9~10 depending on rarity` — **this IS a ranged form per rarity**.

**Pattern classification:**

1. **Fixed scalar per item at each rarity** (most weapons' inherent AR and secondary stats).
2. **Per-rarity scalar progression** (base weapon damage on multi-rarity weapons).
3. **Per-rarity range** `{ min, max }` (accessories like Necklace of Peace).

**Answer to OQ-W9 question (a) "per-rarity variance or per-drop variance?":** Both patterns exist:

- **Per-rarity variance** — base damage on Arming Sword (27 at Rarity I, 33 at VII) is **fixed** within a rarity, varies between rarities.
- **Per-drop variance within a rarity** — Necklace of Peace `Max Health Add 1~2 (Rarity X)` means every rolled item at that rarity lands in `[1, 2]` randomly at acquisition; later instances may re-roll within that range (this matches in-game "socketing" semantics — which overwrites the rolled value with a craft-selected value within the socket range).

**Answer to OQ-W9 question (b) "simulator user picks in-range or instance is fixed?":** Per L13, the simulator is the **user picks** model — user selects the value within the applicable range. Whether the "applicable range" is `naturalRange` or `socketRange` (or a merged range) is OQ-D1 (6.5c design decision, not 6.5a research).

**Spectral Blade's §4.4 `{ stat: "armorRating", min: 28, max: 35 }` comment.** This illustrative range in the metadata example is **hypothetical** — Spectral Blade is primarily a weapon, not an armor piece, and the wiki page does not show an AR range on Spectral Blade. The illustrative example is to demonstrate the SHAPE of a ranged inherent stat, not to encode a real Spectral Blade stat. Phase 6.5c should author ranged-inherent entries based on actual wiki per-item data when authoring items.

---

## § 11 On-hit effects (answers OQ-W10)

### 11.1 Spiked Gauntlet — the §4.4 anchor case

| Fact | Value | Citation | Level |
|---|---|---|---|
| Damage per melee hit | 1 | `[REPO: docs/damage_formulas.md:33]` + `[WIKI: /Spiked_Gauntlet]` | VERIFIED |
| Damage type | True physical | `[REPO: docs/damage_formulas.md:155]` | VERIFIED |
| Shown as separate floater? | **NO** — rolled into main physical damage number | `[REPO: docs/damage_formulas.md:33]` + `[REPO: docs/damage_formulas.md:155-159]` + `[REPO: docs/damage_formulas.md:100-113]` | VERIFIED |
| Position in formula | Added **after** `floor()` as True Physical Damage term | `[REPO: docs/damage_formulas.md:158]` | VERIFIED |
| Trigger | Melee hit (any combo stage, consistent) | `[REPO: docs/damage_formulas.md:242]` (Spiked Gauntlet test points) | VERIFIED |
| Scaling | Scales with Attribute Bonus Ratio per `[REPO: docs/damage_formulas.md:31]` + `[WIKI: /Scaling]` | — | VERIFIED |
| Class restrictions | Fighter, Cleric | `[WIKI: /Spiked_Gauntlet]` | WIKI-SOURCED |
| Armor type | Plate | `[WIKI: /Spiked_Gauntlet]` | WIKI-SOURCED |
| Slot | Hands (2×2 inventory) | `[WIKI: /Spiked_Gauntlet]` | WIKI-SOURCED |
| Craftable? | Yes, via Armourer merchant | `[WIKI: /Spiked_Gauntlet]` | WIKI-SOURCED |

**Hit-location table reference:** `[REPO: docs/damage_formulas.md:35-43]` (Body / Head / Limb multipliers; VERIFIED). `docs/damage_formulas.md:32-33` covers Projectile Reduction + True Physical Damage formula-position components; line 33 specifically notes the Spiked-Gauntlet-rolled-into-main-number behavior.

### 11.2 `scaling: "attributeBonusRatio"` — what the wiki says

**Wiki terminology.** The wiki uses **"Attribute Bonus Ratio"** (with spaces). The string identifier `"attributeBonusRatio"` does NOT appear on the wiki pages reviewed.

**Mechanical definition (WIKI-SOURCED from `/Scaling`):**

> "Attribute Bonus Ratio is a hidden modifier present on a variety of spells, items, and skills."

- It is the **`(0.x)` parenthetical value** in tooltips (e.g., `15 (1.0)` = base 15, scaling 1.0 = 100% Attribute Bonus Ratio).
- It modifies the **Power Bonus** (MPB for magical, PPB for physical) multiplier's effect.
- It scales (on magical damage / heal): **Magical Damage from spellbooks/staves/crystal balls**, **Additional Damage (Magical + Physical)**, **True Damage (Magical + Physical)**, **Physical/Magical Healing Add**.
- Example (WIKI-SOURCED): Warlock Curse of Pain with 50% Attribute Bonus Ratio halves both the +5 Magical Damage (weapon Magical Damage) contribution AND the 24% MPB contribution, reducing 18.6 damage to 14 damage over 8 seconds.

**Translation to engine vocabulary.** Our engine already models this under `DAMAGE_ATOM.scaling` (a numeric 0-1 field) and `HEAL_ATOM.scaling`, consumed in `calcSpellDamage` as `(1 + mpb × scaling + typeBonuses)` and in `calcHealing` as `HealingAdd × Scaling` / `MPB × Scaling`. The §4.4 Spiked Gauntlet's `scaling: "attributeBonusRatio"` string is **naming the mechanism rather than assigning a value** — mechanically equivalent to authoring `scaling: <number>` on a DAMAGE_ATOM. 6.5c will resolve the authoring form (string tag vs numeric value); 6.5a just records the mechanical equivalence.

**UNRESOLVED sub-question.** What numeric Attribute Bonus Ratio does Spiked Gauntlet's +1 true physical have? Wiki does not state. `docs/damage_formulas.md:31` says Additional Physical Damage is "influenced by Attribute Bonus Ratio" without a value. Likely 1.0 (100%) by convention for gear flat-adds, but UNRESOLVED until in-game testing.

### 11.3 Other items with on-hit effects (wiki scan)

From `/Armors § Named Items`:

- **Spiked Gauntlet** — True Physical Damage 1 (the anchor case above).
- **Mitre** — Undead Race Damage Bonus 5-8%. Inherent `undeadDamageBonus` on head item. NOT an on-hit rider; a conditional damage multiplier (applies whenever hitting undead, not per-hit-proc). Classified as modifier-layer, not on-hit.
- **Regal Mitre** — Demon Race Damage Bonus 5-8%. Same shape as Mitre, for demon creatures.

**No other items in the sampled wiki coverage have a true on-hit proc** comparable to Spiked Gauntlet's +1 flat per melee hit. Class perks (Shadow Touch, Dark Reflection) are on-hit-proc'd but are not gear — they're Warlock ability atoms and already covered in `docs/damage_formulas.md:147-165`. Confirming Spiked Gauntlet as the **one gear-side on-hit rider** in the Warlock-anchor scope.

**Expected additional on-hit gear items (not fully audited this phase):** weapons with proc effects, perhaps other armors or rings. Full catalog is Phase 11+ / gear-authoring scope. UNRESOLVED as a complete enumeration.

---

## § 12 Class / armor grants (answers OQ-W11)

### 12.1 Confirmed grants / removes (wiki-confirmed)

| Class | Ability | Effect | Citation |
|---|---|---|---|
| Warlock | Demon Armor (perk) | `grants: armorType: plate` + `−10% spellCastingSpeed` inherent cost | `[WIKI: /Warlock]` |
| Fighter | Slayer (perk) | `removes: armorType: plate` (conditional — "when dual-wielding") | `[WIKI: /Fighter]` |
| Fighter | Defense Mastery (perk) | `cap_override: pdr → 0.75` + `equippedArmorRatingBonus: +0.15` | `[WIKI: /Fighter]` |
| Fighter | Weapon Mastery (perk) | `grants: weapon: any-weapon` (weapon-proficiency blanket) | `[WIKI: /Fighter]` |

### 12.2 Base armor proficiency (partial wiki confirmation)

- **Warlock**: wiki does not explicitly enumerate base proficiency. `class-shape-progress.md` locked: cloth + leather. Demon Armor adds plate.
- **Fighter**: wiki says Fighter has access to "most weapons and armors" — implying cloth + leather + plate base, with Weapon Mastery extending weapons further.
- Other classes not specifically audited this phase; `class-shape-progress.md § armorProficiency` has the locked base set.

### 12.3 Other classes — quick wiki scan for `grants[]` / `removes[]` patterns (UNDER-SAMPLED this phase)

Only Warlock and Fighter pages fetched in depth. Other class pages (Cleric, Barbarian, Wizard, Sorcerer, Druid, Rogue, Bard, Ranger) not audited for class-level blanket armor / weapon grants. Phase 10 (class migration) will comprehensively audit.

**Known (from `class-shape-progress.md` and Warlock / Fighter audits):**
- Warlock Demon Armor → plate grant.
- Fighter Slayer → plate remove.
- Fighter Weapon Mastery → weapon blanket.
- Barbarian Iron Will → `cap_override: mdr → 0.75` (per `docs/damage_formulas.md:57-59`).
- Druid Shapeshift Mastery → `removes: ability, abilityType: spell, tags: ["spirit"]` (per engine `§22` forward-spec).
- Ranger Spear Proficiency → `grants: weapon, weaponType: spear`.
- Druid Lifebloom → `removes: all transformations`.
- Warlock Blood Pact → `grants: ability × 3` (bolt_of_darkness, exploitation_strike, exit_demon_form).
- Druid Orb of Nature → `grants: ability, costSource: "granter"`.

**UNRESOLVED.** Exhaustive class-level grants / removes list beyond what Warlock/Fighter sample showed — deferred to Phase 10.

---

## § 13 Class gating on jewelry + weapons (answers OQ-W12)

### 13.1 Jewelry (confirms L9)

**Wiki says (from `/Accessories`):** "No class restrictions exist." Every ring and necklace is class-agnostic.

Wiki enumerates all 18 accessories (Badger Pendant, Bear Pendant, Charm of Fortune, Fangs of Death Necklace, Fox Pendant, Frost Amulet, Monkey Pendant, Necklace of Peace, Owl Pendant, Ox Pendant, Phoenix Choker, Rat Pendant, Tattered Choker, Torq of Soul, Wind Locket, Crystal Frost Ring, Grimsmile Ring, Ring of Courage, Ring of Finesse, Ring of Quickness, Ring of Resolve, Ring of Survival, Ring of Vitality, Ring of Wisdom) — **none carry class restrictions** per the page.

**L9 fully confirmed.** Jewelry has no class gating; simulator treats `requiredClasses: []` as the default for all rings and necklaces.

### 13.2 Weapons

**Empirically:** every weapon page reviewed carries a `requiredClasses` list. No weapon samples with empty `requiredClasses` were found in this phase's audit. Examples:

- Spectral Blade: Fighter, Warlock, Sorcerer.
- Frostlight Crystal Sword: Wizard, Warlock, Sorcerer.
- Longsword: Fighter, Cleric (inferred from wiki category).
- Arming Sword: Fighter, Cleric, Rogue (inferred; not fully confirmed).
- Spellbook: Wizard, Cleric, Warlock, Druid, Sorcerer.
- Crystal Sword: Wizard, Warlock, Sorcerer.

**Not exhaustively audited.** Whether ANY weapon has empty `requiredClasses` (universally wieldable) is **UNRESOLVED**. Exhaustive catalog is Phase 11+ gear-authoring scope.

### 13.3 Special case: Pavise primary-two-handed shield

- Required classes: Fighter, Ranger
- See § 6 for full data.

---

## § 14 naturalRangeVerified:false audit (answers OQ-W13)

**Approach.** Single-pass comparison of §4.4 socket + natural ranges against wiki `/Enchantments` enchantments table. Low-priority per prompt.

### 14.1 Wiki table summary (WIKI-SOURCED, reproduced compactly)

Wiki `/Enchantments` per-slot pools are organized by slot category and give natural + socketed ranges. Key natural/socketed pairs (focusing on stats where §4.4 flagged `naturalRangeVerified: false`):

| Stat | Slot category | Wiki natural | Wiki socketed | §4.4 natural | §4.4 socketed | Match? |
|---|---|---|---|---|---|---|
| Physical Power Bonus (physicalDamageBonus) | 1H | 1–2 | 1–1.6 | 1–2 | 1–1.6 | ✓ exact |
| Physical Power Bonus | 2H | 2–4 | 2–3.2 | 2–4 | 2–3.2 | ✓ exact |
| Magical Power Bonus | 1H / 2H | 1–2 / 2–4 | 1–1.6 / 2–3.2 | 1–2 / 2–4 | 1–1.6 / 2–3.2 | ✓ exact |
| Armor Penetration | 1H / 2H | 1.5–3 / 3–6 | 1.5–2.4 / 3–4.8 | 1.5–3 / 3–6 | 1.5–2.4 / 3–4.8 | ✓ exact |
| Magical Damage Bonus | 1H / 2H | 1–2 / 2–4 (wiki table implies symmetric with physical) | — | 1–2 / 2–4 | 1–1.6 / 2–3.2 | ✓ with caveat |
| Demon/Undead Race Damage Bonus | 1H / 2H | 2–4 / 4–8 | 2–3.2 / 4–6.4 | 2–4 / 4–8 | 2–3.2 / 4–6.4 | ✓ exact |
| Headshot Damage Modifier | 1H / 2H | 2–4 / 4–8 | 2–3.2 / 4–6.4 | 2–4 / 4–8 | 2–3.2 / 4–6.4 | ✓ exact |
| Armor Rating Add (additionalArmorRating) | 1H / 2H (wiki "armor/ring/necklace") | 7–15 / 15–30 | 7–12 / 15–24 | 7–15 / 15–30 | 7–12 / 15–24 | ✓ exact |
| Physical Damage Reduction | 1H / 2H | 0.7–1.5 / 1.5–3 | 0.7–1.2 / 1.5–2.4 | 0.7–1.5 / 1.5–3 | 0.7–1.2 / 1.5–2.4 | ✓ exact |
| Magical Damage Reduction | 1H / 2H | 0.7–1.5 / 1.5–3 | 0.7–1.2 / 1.5–2.4 | 0.7–1.5 / 1.5–3 | 0.7–1.2 / 1.5–2.4 | ✓ exact |
| Projectile DR | 1H / 2H | 1–2 / 2–4 | 1–1.6 / 2–3.2 | 1–2 / 2–4 | 1–1.6 / 2–3.2 | ✓ exact |
| Magical Resistance | 1H / 2H | 7–15 / 15–30 | 7–12 / 15–24 | 7–15 / 15–30 | 7–12 / 15–24 | ✓ exact |
| CDR Bonus | 1H / 2H | 1.5–3 / 3–6 | 1.5–2.4 / 3–4.8 | 1.5–3 / 3–6 | 1.5–2.4 / 3–4.8 | ✓ exact |
| Action Speed | 1H / 2H | 1–2 / 2–4 | 1–1.6 / 2–3.2 | 1–2 / 2–4 | 1–1.6 / 2–3.2 | ✓ exact |
| Regular Interaction Speed | 1H / 2H | 1.5–3 / 3–6 | 1.5–2.4 / 3–4.8 | 1.5–3 / 3–6 | 1.5–2.4 / 3–4.8 | ✓ exact |
| Memory Capacity Add | 1H / 2H | 1–2 / 2–4 | 1–1 / 2–3 | 1–2 / 2–3 | 1–1 / 2–3 | ⚠️ 2H natural differs (wiki 2–4, §4.4 2–3) |
| Memory Capacity Bonus | 1H / 2H | 2.5–5 / 5–10 | 2.5–4 / 5–8 | 2.5–5 / 5–10 | 2.5–4 / 5–8 | ✓ exact |
| Luck | 1H / 2H | 15–30 / 30–60 | 15–24 / 30–48 | 15–30 / 30–60 | 15–24 / 30–48 | ✓ exact |
| Buff/Debuff Duration Bonus | 1H / 2H | 1.5–3 / 3–6 | 1.5–2.4 / 3–4.8 | 1.5–3 / 3–6 | 1.5–2.4 / 3–4.8 | ✓ exact |
| Physical / Magical Healing Add | Most slots / 2H | 1–1 / 1–2 | 1–1 / 1–1 | 1–1 / 1–1 (2H) | 1–1 / 1–1 | ⚠️ 2H wiki natural = 1–2, §4.4 = 1–1 |

### 14.2 Discrepancies found

**Discrepancy 1 — `additionalMemoryCapacity` on 2H pool.** §4.4 says natural 2–3; wiki says 2–4. Delta could be patch-drift or in-game-range sample-size.

**Discrepancy 2 — `physicalHealing` / `magicalHealing` on 2H pool.** §4.4 says natural 1–1; wiki says 1–2. Worth verifying in-game.

**Everything else matches exactly.** §4.4's `naturalRangeVerified: false` flag appears to be a conservative "not yet confirmed" marker rather than an indication of incorrect values — wiki confirms the §4.4 ranges within the above two exceptions.

### 14.3 Recommendation

- For the §4.4 discrepancies: surface in § 15 UNRESOLVED with recommendation to re-verify in-game (two specific test points) OR accept wiki values as WIKI-SOURCED and update metadata in 6.5b/6.5c.
- Comprehensive per-item ranged-stat audit: Phase 11+ (per prompt's own note that this is "low priority — ranges are 'close enough' for simulator accuracy until gear editor ships").

---

## Appendix A — STAT_META entries outside §4.3 registry

Per user-requested refinement for Phase 6.5c (OQ-D4 reconciliation). Lists every `STAT_META` entry whose stat ID is NOT in `gear-shape-design.md § 4.3`, grouped by category. **No phase assignments, no reconciliation prescription — visibility only.**

Not every entry needs a §4.3 home: many are class-authored-only stats that exist outside the gear-affix registry by design (typed damage bonuses, duration-tag modifiers, post-cap layers, etc.). Phase 6.5c decides which of these become first-class gear registry entries, remain class-only, or get merged with §4.3 counterparts.

### Attr category (1)

- `allAttributes` — composite stat that applies its value to each of the 7 core attributes. Class-authored (Soul Collector, Blood Pact, Curse of Weakness). Not gear-rollable.

### Offense category (18)

**Typed damage bonuses (11) — class-authored, `type_damage_bonus` phase:**
- `divineDamageBonus`, `darkDamageBonus`, `evilDamageBonus`
- `fireDamageBonus`, `iceDamageBonus`, `lightningDamageBonus`, `airDamageBonus`
- `earthDamageBonus`, `arcaneDamageBonus`, `spiritDamageBonus`, `lightDamageBonus`

**Other offense entries:**
- `magicalDamage` — weapon-inherent magical damage (on spellbook-class weapons). Distinct from `magicWeaponDamage` which is STAT_META-style; likely a name/domain duplicate to reconcile in 6.5c.
- `buffWeaponDamage` — the "Buff Weapon Damage" term in physical damage formula (Bloodstained Blade + 5 etc.). Class-authored.
- `headshotPower` — perk-granted HS bonus stat (Barbarian Executioner +20%). Recipe sums it with `headshotDamageBonus`.
- `headPenetration` — class-authored equivalent of magic/armor pen for headshot piercing.
- `knockbackPowerBonus` — class-authored knockback modifier.
- `headshotPenetration` — added in Phase 1.3 (duration-modifier cluster); class-authored.

### Defense category (7)

- `maxHealthBonus` — **load-bearing pair with `maxHealth` per L7.** Removed from gear affix pool Season 8; now class/perk only (Barbarian Robust +7.5%, War Cry +25%, etc.).
- `magicDamageTaken` — Antimagic's `post_cap_multiplicative_layer` consumer. Class-authored.
- `flatDamageReduction` — class-authored generic flat DR.
- `equippedArmorRatingBonus` — class-authored (Fighter Defense Mastery +15%). Scales `armorRating` in PDR recipe.
- `knockbackResistance` — class-authored.
- `recoverableHealth` — class-authored bookkeeping for post-damage regeneration pool.

### Utility category (23)

**Healing modifiers:**
- `healingMod` — `healing_modifier` phase consumer (Vampirism, Immortal Lament).
- `healingAdd` — the generic heal-formula `HealingAdd` term; class-authored.
- `incomingPhysicalHealing`, `incomingMagicalHealing` — receiver-side healing multipliers; class-authored.

**Duration-tag modifiers (Convention 13: carry `direction` + `tag`):**
- `curseDurationBonus` (curse tag, caster)
- `shoutDurationBonus` (shout tag, caster)
- `burnDurationAdd` (burn tag, caster)
- `drunkDurationBonus` (drunk tag, receiver)
- `spellCostBonus` (spell tag, caster — cost multiplier)

**Other utility:**
- `moveSpeedBonus` — percent move-speed modifier (mutually exclusive family with `moveSpeed` per wiki). Class-authored.
- `jumpHeight` — display-only.
- `spellChargeBonus`, `spellCooldownMultiplier` — class-authored spell mechanics.
- `drawSpeed` — display-only bow / crossbow.
- `memorySlots` — class-authored (Spell Memory I/II perks).
- `armorMovePenaltyReduction` — class-authored armor-weight offset.
- `potionPotency` — class-authored (Potion Chugger).
- `projectileSpeed` — display-only.
- `switchingSpeed` — class-authored.
- `shapeshiftTimeReduction` — class-authored (Druid).
- `wildSkillCooldownReduction` — class-authored.
- `spellMemoryRecovery` — class-authored.

**Summary counts.** 1 attr + 18 offense + 7 defense + 23 utility = 49 STAT_META entries outside §4.3 registry. About 80% are class-authored (not gear-rollable); a handful (`maxHealthBonus`, `moveSpeedBonus`) are gear-adjacent but Season-8-removed or family-exclusive.

---

## § 15 Persistent UNRESOLVED list

Items left UNRESOLVED at end of Phase 6.5a research. These hand off to Phase 6.5b (surface in gap analysis) and/or the coordinator + user (in-game testing where applicable).

1. **OQ-W1 / demonDamageBonus / undeadDamageBonus** — wiki confirms these as `multiplicative_layer` with creature_type condition, but our VERIFIED docs do not yet model the `× (1 + RaceDamageBonus)` layer. Engine gap, not data gap. Deferred to Phase 11+ creature-type targeting.
2. **OQ-W2 / impactZone per-weapon zone-to-region mapping** — wiki shows "100%/90%" on per-weapon pages but does not name the two zones (tip/mid? primary/edge?). Needs hitbox-image review or in-game testing.
3. **OQ-W2 / per-weapon `impactPower` values** — wiki has Impact Power mechanics page but NOT per-weapon numeric values; only shield Impact Resistance values are enumerated. Needs in-game data authoring.
4. **OQ-W2 / `swingTiming` exact values beyond sampled swords** — wiki has per-weapon pages with the data; comprehensive scrape is Phase 11+ / gear-authoring.
5. **OQ-W3 / combo data for Daggers / Axes / Maces / Polearms / Bows / Crossbows / Firearms / Magic Stuff** — each weapon's per-page data; not sampled comprehensively this phase.
6. **OQ-W6 / "magicStuff" gating of spells or abilities** — whether any class ability conditions on `weapon_type: "magicStuff"` is Phase 10 audit scope.
7. **OQ-W7 / formal "never-socketable" wiki list** — wiki does not publish one; derivation-by-absence is the best available. The `moveSpeed` / `moveSpeedBonus` family specifically needs re-verification (both may be never-socketable; wiki sources partial).
8. **OQ-W8 / rarity+modifier count — Unique row.** Wiki says 5; L12 says 1 at 3× range. **L12 has precedence** (user-verified in-game before this phase). Wiki is either stale, uses different counting semantics (perhaps counts inherents among "modifiers"), or reflects a pre-Season-8 version. The wiki row is recorded in § 9.2 for completeness, **not as a reopen-L12 signal**.
9. **OQ-W8 / modifier families beyond `ar_pdr`** — wiki lists 4 families (Physical+Magical True, Additional+True Physical, MaxHealth+MaxHealthBonus, AddMovespeed+MovespeedBonus). Our §4.6 has only `ar_pdr`. Whether the wiki `ar_pdr` IS named implicitly (in the "Reductions" section) or is purely our framing needs confirmation. 6.5c decision.
10. **OQ-W9 / per-item ranged-inherent full catalog** — wiki has per-item pages; comprehensive scrape is Phase 11+ / gear-authoring.
11. **OQ-W10 / Spiked Gauntlet `scaling: "attributeBonusRatio"` exact value** — wiki says Additional Physical Damage is "influenced by Attribute Bonus Ratio" without a numeric scaling value for Spiked Gauntlet specifically. Most likely 1.0; in-game testing would confirm.
12. **OQ-W10 / other gear items with on-hit procs** — full catalog not audited. Only Spiked Gauntlet + Mitre (undead dmg) + Regal Mitre (demon dmg) found; Mitre / Regal Mitre are conditional-modifier-layer, not proc-based. Phase 11+ gear-authoring task.
13. **OQ-W11 / exhaustive class grants/removes catalog across all 10 classes** — only Warlock + Fighter audited in depth this phase. Phase 10 class migration task.
14. **OQ-W12 / weapons with empty `requiredClasses`** — whether any exist is unconfirmed; all sampled weapons have explicit class lists. Phase 11+ catalog task.
15. **OQ-W13 / natural-range discrepancies** — 2 found (2H `additionalMemoryCapacity` natural: §4.4 says 2-3, wiki says 2-4; 2H `physicalHealing` / `magicalHealing` natural: §4.4 says 1-1, wiki says 1-2). Either accept wiki (WIKI-SOURCED) or re-verify in-game.
16. **R3 Delta from VERIFIED formula** (§ 3.5) — 6 deltas recorded: DivineStrikeDmg, RaceDamageBonus, RaceDamageReduction, DRMod, ElementalDamageReduction, ProjectileFalloff, plus granular limb-location. Phase 11+ Simulator-accuracy decision whether to model each.
17. **Wiki version drift** — wiki is on Hotfix 113 (2026-04-16); our project VERIFIED state is Hotfix 112-1 (2026-04-09). 1-hotfix wiki-ahead delta. Specific wiki facts may reflect Hotfix 113 changes not yet tested. Routine re-sync required when project patches to 113.

---

## § 16 Revision log

- **2026-04-17** — Initial draft. Phase 6.5a research-only output. Wiki citations: `/Main_Page`, `/Stats`, `/Damage`, `/Weapons`, `/Enchantments`, `/Scaling`, `/Impact_Power`, `/Movement`, `/Health`, `/Luck`, `/Spectral_Blade`, `/Arming_Sword`, `/Longsword`, `/Accessories`, `/Warlock`, `/Fighter`, `/Spiked_Gauntlet`, `/Spellbook`, `/Crystal_Sword`, `/Pavise`, `/Statuses`, `/Armors`, `/Patch_Notes`. Authored by Phase 6.5a session; review/commit by coordinator. No code changes. Output paired with `docs/session-prompts/phase-6-5-a-progress.md`.
