// Class registry.
// Insertion order = display order in the ClassPicker.

import WARLOCK from './warlock.js';

export const CLASSES = {
  warlock: WARLOCK,
};

export const CLASS_LIST = Object.values(CLASSES);

export function getClass(id) {
  return CLASSES[id] ?? null;
}
