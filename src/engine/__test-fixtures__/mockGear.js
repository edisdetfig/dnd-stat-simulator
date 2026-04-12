// Minimal empty-gear loadouts and small factories for gear-dependent tests.

export function emptyGear() {
  return {
    weaponSlot1: { primary: null, secondary: null },
    weaponSlot2: { primary: null, secondary: null },
    head: null, chest: null, back: null, hands: null,
    legs: null, feet: null, ring1: null, ring2: null, necklace: null,
  };
}

export function weaponItem({ weaponType = "sword", handType = "oneHanded", inherentStats = [], modifiers = [] } = {}) {
  return { weaponType, handType, inherentStats, modifiers };
}

export function armorItem({ armorType = "cloth", inherentStats = [], modifiers = [] } = {}) {
  return { armorType, inherentStats, modifiers };
}
