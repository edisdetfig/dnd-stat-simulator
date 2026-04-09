// Class definitions aggregator
// Import all class files and export unified CLASSES object

import { warlock } from './warlock.js';
import { fighter } from './fighter.js';

// Aggregate all classes into a single lookup object
export const CLASSES = {
  warlock,
  fighter,
};

// Export individual classes for direct import if needed
export { warlock, fighter };
