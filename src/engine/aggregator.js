// Gear aggregation - combines class base stats with gear

import { CORE_ATTRS, ARMOR_SLOTS } from '../data/constants.js';

export function aggregateGear(classData, gear, weaponHeldState) {
  const attrs = { ...classData.baseStats };
  const bonuses = {};

  function addItem(item) {
    if (!item) return;
    for (const { stat, value } of [...(item.inherentStats || []), ...(item.modifiers || [])]) {
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
