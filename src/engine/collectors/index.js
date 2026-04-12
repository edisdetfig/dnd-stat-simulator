// Collector barrel + unified entrypoint.
//
// `collectAllEffects(ctx)` runs every collector and concatenates the
// results. The effect pipeline consumes this flat list and partitions by
// phase.

import { collectPerkEffects } from './perks.js';
import { collectBuffEffects } from './buffs.js';
import { collectTransformationEffects } from './transformations.js';
import { collectReligionEffects } from './religion.js';
import { collectStackingEffects } from './stacking.js';
import { expandHpScaling } from './hp-scaling.js';
import { collectStatusEffects } from './status.js';

export {
  collectPerkEffects, collectBuffEffects, collectTransformationEffects,
  collectReligionEffects, collectStackingEffects, expandHpScaling,
  collectStatusEffects,
};

export function collectAllEffects(ctx) {
  const raw = [
    ...collectPerkEffects(ctx),
    ...collectBuffEffects(ctx),
    ...collectTransformationEffects(ctx),
    ...collectReligionEffects(ctx),
    ...collectStackingEffects(ctx),
    ...collectStatusEffects(ctx),
  ];
  return expandHpScaling(raw, ctx);
}
