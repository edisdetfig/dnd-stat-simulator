// Gear aggregation - combines class base stats with gear

import { CORE_ATTRS, ARMOR_SLOTS, WEAPON_ONLY } from '../data/constants.js';

export function aggregateGear(classData, gear, weaponHeldState) {
  const attrs = { ...classData.baseStats };
  const bonuses = {};

  function addItem(item) {
    if (!item) return;
    for (const { stat, value } of [...(item.inherentStats || []), ...(item.modifiers || [])]) {
      if (WEAPON_ONLY.has(stat)) continue;
      if (CORE_ATTRS.has(stat)) attrs[stat] = (attrs[stat] || 0) + value;
      else bonuses[stat] = (bonuses[stat] || 0) + value;
    }
  }

  for (const slot of ARMOR_SLOTS) addItem(gear[slot]);

  let activeWeapon = null;
  if (weaponHeldState !== "none" && gear[weaponHeldState]) {
    const ws = gear[weaponHeldState];
    addItem(ws.primary);
    addItem(ws.secondary);
    activeWeapon = ws.primary;
  }

  return { attrs, bonuses, activeWeapon };
}

// Compute attribute breakdown for detailed display
export function computeAttrBreakdown(classData, gear, weaponHeldState, activeBuffs, availableBuffs) {
  const breakdown = {};
  for (const attr of ["str", "vig", "agi", "dex", "wil", "kno", "res"]) {
    breakdown[attr] = { base: classData.baseStats[attr], gearInherent: 0, gearMods: 0, buffs: [], total: 0 };
  }

  function scanItem(item) {
    if (!item) return;
    for (const { stat, value } of (item.inherentStats || [])) {
      if (CORE_ATTRS.has(stat)) breakdown[stat].gearInherent += value;
    }
    for (const { stat, value } of (item.modifiers || [])) {
      if (CORE_ATTRS.has(stat)) breakdown[stat].gearMods += value;
    }
  }

  for (const slot of ARMOR_SLOTS) scanItem(gear[slot]);

  if (weaponHeldState !== "none" && gear[weaponHeldState]) {
    const ws = gear[weaponHeldState];
    scanItem(ws.primary);
    scanItem(ws.secondary);
  }

  for (const buff of availableBuffs) {
    if (!activeBuffs[buff.id]) continue;
    for (const eff of buff.effects) {
      if (eff.phase === "pre_curve_flat" && CORE_ATTRS.has(eff.stat)) {
        breakdown[eff.stat].buffs.push({ name: buff.name, value: eff.value });
      }
    }
  }

  for (const attr of Object.keys(breakdown)) {
    const b = breakdown[attr];
    b.total = b.base + b.gearInherent + b.gearMods + b.buffs.reduce((s, x) => s + x.value, 0);
  }

  return breakdown;
}
