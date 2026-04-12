// Data barrel — public surface for class/religion/stat data.

export { CLASSES, CLASS_LIST, getClass } from './classes/index.js';
export { RELIGION_BLESSINGS } from './religions.js';
export { STAT_META, DERIVED_DISPLAY, STAT_OPTIONS, derivedLabel,
         displayToInternal, internalToDisplay, statDisplaySuffix } from './stat-meta.js';
export { makeEmptyGear } from './gear-defaults.js';
export {
  CORE_ATTRS, ARMOR_SLOTS, PATCH_HEALTH_BONUS, HR_STR_WEIGHT, HR_VIG_WEIGHT,
  EFFECT_PHASES, CONDITION_TYPES, TRIGGER_EVENTS, STATUS_TYPES, PLAYER_STATES,
  WEAPON_TYPES, WEAPON_TYPE_CATEGORIES, TARGETING, EFFECT_TARGETS,
} from './constants.js';
