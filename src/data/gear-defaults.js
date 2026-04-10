// Empty loadout — used when a user picks a fresh class from the picker.
// All slots null; aggregator and UI handle null slots gracefully.
export function makeEmptyGear() {
  return {
    weaponSlot1: { primary: null, secondary: null },
    weaponSlot2: { primary: null, secondary: null },
    head: null,
    chest: null,
    back: null,
    hands: null,
    legs: null,
    feet: null,
    ring1: null,
    ring2: null,
    necklace: null,
  };
}
