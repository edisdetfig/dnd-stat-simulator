// Theme registry — maps string IDs (used in example-builds.js) to theme objects.
// Adding a new theme: create the file, import it here, add the entry.

import { bloodTitheTheme } from './blood-tithe.js';

export const THEMES = {
  "blood-tithe": bloodTitheTheme,
};
