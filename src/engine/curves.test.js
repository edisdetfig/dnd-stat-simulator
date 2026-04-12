import { describe, it, expect } from 'vitest';
import { evaluateCurve, STAT_CURVES } from './curves.js';

describe('evaluateCurve smoke', () => {
  it('loads stat_curves.json and returns segment-start values for physicalPowerBonus', () => {
    const curve = STAT_CURVES.physicalPowerBonus;
    expect(curve).toBeDefined();
    expect(evaluateCurve(curve, 15)).toBe(0);
    expect(evaluateCurve(curve, 50)).toBe(0.35);
  });
});
