// Stat metadata for display and formatting

export const STAT_META = {
  str: { label: "STR", unit: "flat", cat: "attr" },
  vig: { label: "VIG", unit: "flat", cat: "attr" },
  agi: { label: "AGI", unit: "flat", cat: "attr" },
  dex: { label: "DEX", unit: "flat", cat: "attr" },
  wil: { label: "WIL", unit: "flat", cat: "attr" },
  kno: { label: "KNO", unit: "flat", cat: "attr" },
  res: { label: "RES", unit: "flat", cat: "attr" },
  physicalPower: { label: "Physical Power", unit: "flat", cat: "offense" },
  magicalPower: { label: "Magical Power", unit: "flat", cat: "offense" },
  physicalDamageBonus: { label: "Physical Damage Bonus", unit: "percent", cat: "offense" },
  magicalDamageBonus: { label: "Magical Damage Bonus", unit: "percent", cat: "offense" },
  armorPenetration: { label: "Armor Penetration", unit: "percent", cat: "offense" },
  magicPenetration: { label: "Magic Penetration", unit: "percent", cat: "offense" },
  headshotDamageBonus: { label: "Headshot Damage Bonus", unit: "percent", cat: "offense" },
  additionalWeaponDamage: { label: "Add. Weapon Damage", unit: "flat", cat: "offense" },
  additionalPhysicalDamage: { label: "Add. Physical Damage", unit: "flat", cat: "offense" },
  additionalMagicalDamage: { label: "Add. Magical Damage", unit: "flat", cat: "offense" },
  demonDamageBonus: { label: "Demon Damage Bonus", unit: "percent", cat: "offense" },
  undeadDamageBonus: { label: "Undead Damage Bonus", unit: "percent", cat: "offense" },
  armorRating: { label: "Armor Rating", unit: "flat", cat: "defense" },
  additionalArmorRating: { label: "Add. Armor Rating", unit: "flat", cat: "defense" },
  magicResistance: { label: "Magic Resistance", unit: "flat", cat: "defense" },
  physicalDamageReduction: { label: "Phys. Damage Reduction", unit: "percent", cat: "defense" },
  magicalDamageReduction: { label: "Magic Damage Reduction", unit: "percent", cat: "defense" },
  projectileDamageReduction: { label: "Projectile DR", unit: "percent", cat: "defense" },
  headshotDamageReduction: { label: "Headshot DR", unit: "percent", cat: "defense" },
  demonDamageReduction: { label: "Demon Damage Reduction", unit: "percent", cat: "defense" },
  undeadDamageReduction: { label: "Undead Damage Reduction", unit: "percent", cat: "defense" },
  moveSpeed: { label: "Move Speed", unit: "flat", cat: "utility" },
  actionSpeed: { label: "Action Speed", unit: "percent", cat: "utility" },
  spellCastingSpeed: { label: "Spell Casting Speed", unit: "percent", cat: "utility" },
  regularInteractionSpeed: { label: "Regular Interaction Spd", unit: "percent", cat: "utility" },
  magicalInteractionSpeed: { label: "Magical Interaction Spd", unit: "percent", cat: "utility" },
  cooldownReductionBonus: { label: "Cooldown Reduction", unit: "percent", cat: "utility" },
  buffDurationBonus: { label: "Buff Duration", unit: "percent", cat: "utility" },
  debuffDurationBonus: { label: "Debuff Duration", unit: "percent", cat: "utility" },
  memoryCapacityBonus: { label: "Memory Capacity Bonus", unit: "percent", cat: "utility" },
  additionalMemoryCapacity: { label: "Add. Memory Capacity", unit: "flat", cat: "utility" },
  physicalHealing: { label: "Physical Healing", unit: "flat", cat: "utility" },
  magicalHealing: { label: "Magical Healing", unit: "flat", cat: "utility" },
  luck: { label: "Luck", unit: "flat", cat: "utility" },
  maxHealth: { label: "Max Health", unit: "flat", cat: "utility" },
  weaponDamage: { label: "Weapon Damage", unit: "flat", cat: "weapon" },
  magicalDamage: { label: "Magical Damage", unit: "flat", cat: "weapon" },
  magicWeaponDamage: { label: "Magic Weapon Damage", unit: "flat", cat: "weapon" },
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

export const STAT_OPTIONS = (() => {
  const cats = { attr: "— Attributes —", offense: "— Offensive —", defense: "— Defensive —", utility: "— Utility —" };
  const groups = {};
  for (const [id, meta] of Object.entries(STAT_META)) {
    if (meta.cat === "weapon") continue;
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
