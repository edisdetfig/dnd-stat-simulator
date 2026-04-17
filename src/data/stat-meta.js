// Stat metadata for display and formatting.
//
// Every stat ID used anywhere in the app (gear modifiers, class effects,
// derived stats, transformation modifiers) should have an entry here for
// label/unit lookups.
//
// The `gearStat` flag controls whether a stat appears in the gear modifier
// dropdown (STAT_OPTIONS). Stats without gearStat are display-only — they
// get labels and unit formatting but don't appear in the gear editor.

export const STAT_META = {
  // ── Attributes ──
  str: { label: "STR", unit: "flat", cat: "attr", gearStat: true },
  vig: { label: "VIG", unit: "flat", cat: "attr", gearStat: true },
  agi: { label: "AGI", unit: "flat", cat: "attr", gearStat: true },
  dex: { label: "DEX", unit: "flat", cat: "attr", gearStat: true },
  wil: { label: "WIL", unit: "flat", cat: "attr", gearStat: true },
  kno: { label: "KNO", unit: "flat", cat: "attr", gearStat: true },
  res: { label: "RES", unit: "flat", cat: "attr", gearStat: true },
  // Composite — applies the value to each of the 7 core attributes. Used by
  // e.g. Soul Collector (+1 per shard), Blood Pact (+1 per locked shard),
  // Curse of Weakness (-25% via attribute_multiplier on enemy).
  allAttributes: { label: "All Attributes", unit: "flat", cat: "attr" },

  // ── Offensive ──
  physicalPower: { label: "Physical Power", unit: "flat", cat: "offense", gearStat: true },
  magicalPower: { label: "Magical Power", unit: "flat", cat: "offense", gearStat: true },
  physicalDamageBonus: { label: "Physical Damage Bonus", unit: "percent", cat: "offense", gearStat: true },
  magicalDamageBonus: { label: "Magical Damage Bonus", unit: "percent", cat: "offense", gearStat: true },
  armorPenetration: { label: "Armor Penetration", unit: "percent", cat: "offense", gearStat: true },
  magicPenetration: { label: "Magic Penetration", unit: "percent", cat: "offense", gearStat: true },
  headshotDamageBonus: { label: "Headshot Damage Bonus", unit: "percent", cat: "offense", gearStat: true },
  additionalWeaponDamage: { label: "Add. Weapon Damage", unit: "flat", cat: "offense", gearStat: true },
  additionalPhysicalDamage: { label: "Add. Physical Damage", unit: "flat", cat: "offense", gearStat: true },
  additionalMagicalDamage: { label: "Add. Magical Damage", unit: "flat", cat: "offense", gearStat: true },
  demonDamageBonus: { label: "Demon Damage Bonus", unit: "percent", cat: "offense", gearStat: true },
  undeadDamageBonus: { label: "Undead Damage Bonus", unit: "percent", cat: "offense", gearStat: true },

  // ── Defensive ──
  armorRating: { label: "Armor Rating", unit: "flat", cat: "defense", gearStat: true },
  additionalArmorRating: { label: "Add. Armor Rating", unit: "flat", cat: "defense", gearStat: true },
  magicResistance: { label: "Magic Resistance", unit: "flat", cat: "defense", gearStat: true },
  // ── Defensive additive contributions ──
  // These stats represent *additive contributions* from gear and perks,
  // summed into a total that feeds the pdr/mdr recipes. They are NOT the
  // final computed PDR/MDR values. Those are the *recipe outputs* produced
  // by src/engine/recipes.js, keyed as "pdr" / "mdr" (see RECIPE_IDS).
  //
  // Authoring rule:
  //   - Perk/gear that says "+5% PDR" → { stat: "physicalDamageReductionBonus", ... }
  //   - Perk that raises the PDR cap → { stat: "pdr", phase: "cap_override", ... }
  physicalDamageReductionBonus: { label: "Physical Damage Reduction Bonus", unit: "percent", cat: "defense", gearStat: true },
  magicalDamageReductionBonus: { label: "Magical Damage Reduction Bonus", unit: "percent", cat: "defense", gearStat: true },
  projectileDamageReduction: { label: "Projectile DR", unit: "percent", cat: "defense", gearStat: true },
  headshotDamageReduction: { label: "Headshot DR", unit: "percent", cat: "defense", gearStat: true },
  demonDamageReduction: { label: "Demon Damage Reduction", unit: "percent", cat: "defense", gearStat: true },
  undeadDamageReduction: { label: "Undead Damage Reduction", unit: "percent", cat: "defense", gearStat: true },
  maxHealthBonus: { label: "Max Health Bonus", unit: "percent", cat: "defense" },

  // ── Utility ──
  moveSpeed: { label: "Move Speed", unit: "flat", cat: "utility", gearStat: true },
  actionSpeed: { label: "Action Speed", unit: "percent", cat: "utility", gearStat: true },
  spellCastingSpeed: { label: "Spell Casting Speed", unit: "percent", cat: "utility", gearStat: true },
  regularInteractionSpeed: { label: "Regular Interaction Spd", unit: "percent", cat: "utility", gearStat: true },
  magicalInteractionSpeed: { label: "Magical Interaction Spd", unit: "percent", cat: "utility", gearStat: true },
  cooldownReductionBonus: { label: "Cooldown Reduction", unit: "percent", cat: "utility", gearStat: true },
  buffDurationBonus: { label: "Buff Duration", unit: "percent", cat: "utility", gearStat: true },
  debuffDurationBonus: { label: "Debuff Duration", unit: "percent", cat: "utility", gearStat: true },
  memoryCapacityBonus: { label: "Memory Capacity Bonus", unit: "percent", cat: "utility", gearStat: true },
  additionalMemoryCapacity: { label: "Add. Memory Capacity", unit: "flat", cat: "utility", gearStat: true },
  physicalHealing: { label: "Physical Healing", unit: "flat", cat: "utility", gearStat: true },
  magicalHealing: { label: "Magical Healing", unit: "flat", cat: "utility", gearStat: true },
  luck: { label: "Luck", unit: "flat", cat: "utility", gearStat: true },
  maxHealth: { label: "Max Health", unit: "flat", cat: "utility", gearStat: true },
  moveSpeedBonus: { label: "Move Speed Bonus", unit: "percent", cat: "utility" },
  jumpHeight: { label: "Jump Height", unit: "percent", cat: "utility" },
  incomingPhysicalHealing: { label: "Incoming Physical Healing", unit: "percent", cat: "utility" },
  incomingMagicalHealing: { label: "Incoming Magical Healing", unit: "percent", cat: "utility" },

  // ── Weapon (never in gear dropdowns, inherent to weapon items) ──
  weaponDamage: { label: "Weapon Damage", unit: "flat", cat: "weapon" },
  magicalDamage: { label: "Magical Damage", unit: "flat", cat: "weapon" },
  magicWeaponDamage: { label: "Magic Weapon Damage", unit: "flat", cat: "weapon" },
  // Inherent-only weapon/shield properties per gear-shape-design.md L4.
  // Structural richness (per-combo-stage arrays, per-strike-zone mappings,
  // per-stage windup/hit/recovery seconds) lives on the item-definition
  // `inherentWeaponProperties` sub-shape, not as numeric STAT_META
  // contributions. These entries exist for label/unit lookup only — they
  // never participate in aggregate bonuses (no gearStat) and are not
  // surfaced in any modifier pool (§4.5 omits them).
  comboMultiplier:  { label: "Combo Multiplier",  unit: "percent", cat: "weapon" },
  impactZone:       { label: "Impact Zone",       unit: "percent", cat: "weapon" },
  swingTiming:      { label: "Swing Timing",      unit: "flat",    cat: "weapon" },

  // ── v3 additions (data spec §5) ──
  // Display-only entries: no gearStat flag — these come from abilities/perks,
  // not from rolled gear modifiers.

  // Healing modifiers
  healingMod: { label: "Healing Mod", unit: "percent", cat: "utility" },
  healingAdd: { label: "Healing Add", unit: "flat", cat: "utility" },
  recoverableHealth: { label: "Recoverable Health", unit: "flat", cat: "defense" },

  // Defensive layers
  magicDamageTaken: { label: "Magic Damage Taken", unit: "percent", cat: "defense" },
  flatDamageReduction: { label: "Flat Damage Reduction", unit: "flat", cat: "defense" },
  impactResistance: { label: "Impact Resistance", unit: "flat", cat: "defense" },
  equippedArmorRatingBonus: { label: "Equipped Armor Rating Bonus", unit: "percent", cat: "defense" },

  // Offensive (per-target / per-context multipliers)
  // Typed-damage-bonus stats — one per magical subtype. Applied at the
  // `type_damage_bonus` phase, additive with MPB × Scaling in the spell
  // damage formula (damage_formulas.md:130–143). Class-data-authored only;
  // gear rolls only `physicalDamageBonus` / `magicalDamageBonus`. The
  // universal `magicalDamageBonus` applies to ALL magic types
  // (damage_formulas.md:122); these typed stats apply only to matching type.
  divineDamageBonus:    { label: "Divine Damage Bonus",    unit: "percent", cat: "offense" },
  darkDamageBonus:      { label: "Dark Damage Bonus",      unit: "percent", cat: "offense" },
  evilDamageBonus:      { label: "Evil Damage Bonus",      unit: "percent", cat: "offense" },
  fireDamageBonus:      { label: "Fire Damage Bonus",      unit: "percent", cat: "offense" },
  iceDamageBonus:       { label: "Ice Damage Bonus",       unit: "percent", cat: "offense" },
  lightningDamageBonus: { label: "Lightning Damage Bonus", unit: "percent", cat: "offense" },
  airDamageBonus:       { label: "Air Damage Bonus",       unit: "percent", cat: "offense" },
  earthDamageBonus:     { label: "Earth Damage Bonus",     unit: "percent", cat: "offense" },
  arcaneDamageBonus:    { label: "Arcane Damage Bonus",    unit: "percent", cat: "offense" },
  spiritDamageBonus:    { label: "Spirit Damage Bonus",    unit: "percent", cat: "offense" },
  lightDamageBonus:     { label: "Light Damage Bonus",     unit: "percent", cat: "offense" },
  buffWeaponDamage: { label: "Buff Weapon Damage", unit: "flat", cat: "offense" },
  headshotPower: { label: "Headshot Power", unit: "percent", cat: "offense" },
  headPenetration: { label: "Head Penetration", unit: "percent", cat: "offense" },
  impactPower: { label: "Impact Power", unit: "flat", cat: "offense" },

  // Class / spell mechanics
  curseDurationBonus: { label: "Curse Duration", unit: "percent", cat: "utility", direction: "caster", tag: "curse" },
  spellChargeBonus: { label: "Spell Charge Bonus", unit: "percent", cat: "utility" },
  spellCooldownMultiplier: { label: "Spell Cooldown Multiplier", unit: "percent", cat: "utility" },
  drawSpeed: { label: "Draw Speed", unit: "percent", cat: "utility" },
  memorySlots: { label: "Memory Slots", unit: "flat", cat: "utility" },

  // ── Phase 1.3 §B additions ──
  // Duration-modifier entries carry `direction` ("caster" | "receiver") and
  // `tag` (status-effect name) per vocabulary Convention 13.

  // Offense
  headshotPenetration: { label: "Headshot Penetration", unit: "percent", cat: "offense" },
  knockbackPowerBonus: { label: "Knockback Power", unit: "percent", cat: "offense" },

  // Defense
  knockbackResistance: { label: "Knockback Resistance", unit: "percent", cat: "defense" },

  // Utility
  armorMovePenaltyReduction: { label: "Armor Move Penalty Reduction", unit: "percent", cat: "utility" },
  potionPotency: { label: "Potion Potency", unit: "percent", cat: "utility" },
  projectileSpeed: { label: "Projectile Speed", unit: "percent", cat: "utility" },
  switchingSpeed: { label: "Switching Speed", unit: "percent", cat: "utility" },
  shapeshiftTimeReduction: { label: "Shapeshift Time Reduction", unit: "percent", cat: "utility" },
  wildSkillCooldownReduction: { label: "Wild Skill Cooldown Reduction", unit: "percent", cat: "utility" },
  spellMemoryRecovery: { label: "Spell Memory Recovery", unit: "flat", cat: "utility" },

  // Duration modifiers (Convention 13: direction + tag)
  shoutDurationBonus: { label: "Shout Duration", unit: "percent", cat: "utility", direction: "caster", tag: "shout" },
  burnDurationAdd: { label: "Burn Duration Add", unit: "flat", cat: "utility", direction: "caster", tag: "burn" },
  drunkDurationBonus: { label: "Drunk Duration", unit: "percent", cat: "utility", direction: "receiver", tag: "drunk" },

  // Ability-property modifier (Convention 13: direction + tag). +100% cost
  // multiplier on spell-tagged abilities (Warlock Torture Mastery: 1.0).
  spellCostBonus: { label: "Spell Cost Bonus", unit: "percent", cat: "utility", direction: "caster", tag: "spell" },
};

export const DERIVED_DISPLAY = {
  hp: { short: "HP", full: "Health" },
  ppb: { short: "PPB", full: "Physical Power Bonus" },
  mpb: { short: "MPB", full: "Magical Power Bonus" },
  pdr: { short: "PDR", full: "Physical Damage Reduction" },
  mdr: { short: "MDR", full: "Magical Damage Reduction" },
  moveSpeed: { short: "Move Spd", full: "Move Speed" },
  actionSpeed: { short: "AS", full: "Action Speed" },
  spellCastingSpeed: { short: "SCS", full: "Spell Casting Speed" },
  regularInteractionSpeed: { short: "RIS", full: "Regular Interaction Spd" },
  magicalInteractionSpeed: { short: "MIS", full: "Magical Interaction Spd" },
  cdr: { short: "CDR", full: "Cooldown Reduction Bonus" },
  buffDuration: { short: "Buff Dur", full: "Buff Duration" },
  debuffDuration: { short: "Debuff Dur", full: "Debuff Duration" },
  memoryCapacity: { short: "Mem Cap", full: "Memory Capacity" },
  healthRecovery: { short: "HP Recovery", full: "Health Recovery Bonus" },
  memoryRecovery: { short: "Spell Rec", full: "Spell Recovery Bonus" },
  magicalHealing: { short: "Mag Heal", full: "Magical Healing" },
  physicalHealing: { short: "Phys Heal", full: "Physical Healing" },
  manualDexterity: { short: "Man Dex", full: "Manual Dexterity" },
  equipSpeed: { short: "Equip Spd", full: "Equip Speed" },
  persuasiveness: { short: "Pers", full: "Persuasiveness" },
  luck: { short: "Luck", full: "Luck" },
  armorPenetration: { short: "Armor Pen", full: "Armor Penetration" },
  magicPenetration: { short: "Magic Pen", full: "Magic Penetration" },
  headshotDamageBonus: { short: "HS Bonus", full: "Headshot Damage Bonus" },
  headshotDamageReduction: { short: "HS DR", full: "Headshot Damage Reduction" },
  projectileDamageReduction: { short: "Proj DR", full: "Projectile Damage Reduction" },
};

export function derivedLabel(id, useAcronyms) {
  const d = DERIVED_DISPLAY[id];
  return d ? (useAcronyms ? d.short : d.full) : id;
}

// Gear modifier dropdown options — only includes stats with gearStat: true.
export const STAT_OPTIONS = (() => {
  const cats = { attr: "— Attributes —", offense: "— Offensive —", defense: "— Defensive —", utility: "— Utility —" };
  const groups = {};
  for (const [id, meta] of Object.entries(STAT_META)) {
    if (!meta.gearStat) continue;
    if (!groups[meta.cat]) groups[meta.cat] = [];
    groups[meta.cat].push({ id, label: meta.label });
  }
  const result = [];
  for (const [cat, heading] of Object.entries(cats)) {
    if (groups[cat]) {
      result.push({ id: `__header_${cat}`, label: heading, disabled: true });
      groups[cat].sort((a, b) => a.label.localeCompare(b.label));
      result.push(...groups[cat]);
    }
  }
  return result;
})();

export function displayToInternal(statId, displayVal) {
  const meta = STAT_META[statId];
  if (!meta) return displayVal;
  return meta.unit === "percent" ? displayVal / 100 : displayVal;
}

export function internalToDisplay(statId, internalVal) {
  const meta = STAT_META[statId];
  if (!meta) return internalVal;
  return meta.unit === "percent" ? internalVal * 100 : internalVal;
}

export function statDisplaySuffix(statId) {
  const meta = STAT_META[statId];
  return meta && meta.unit === "percent" ? "%" : "";
}
