import { describe, it, expect } from 'vitest';
import { projectShield } from './projectShield.js';

function shieldAtom(fields) {
  return {
    base: 0, scaling: 0, damageFilter: null, target: "self", duration: 15,
    source: { kind: "spell", abilityId: "test", className: "t" },
    atomId: "test:shield:0",
    ...fields,
  };
}

describe('projectShield', () => {
  it('Eldritch Shield: base 25, scaling 0, damageFilter magical → absorb 25', () => {
    const [out] = projectShield(
      [shieldAtom({ base: 25, scaling: 0, damageFilter: "magical" })],
      { mpb: { value: 0.23 } }
    );
    expect(out.absorbAmount).toBe(25);
    expect(out.damageFilter).toBe("magical");
    expect(out.duration).toBe(15);
    expect(out.atomId).toBe("test:shield:0");
  });

  it('scaling applied: base 10 + 0.5 × 0.23 MPB = 10.115', () => {
    const [out] = projectShield(
      [shieldAtom({ base: 10, scaling: 0.5 })],
      { mpb: { value: 0.23 } }
    );
    expect(out.absorbAmount).toBeCloseTo(10.115);
  });

  it('damageFilter null (absorb-all)', () => {
    const [out] = projectShield(
      [shieldAtom({ base: 15, damageFilter: null })],
      { mpb: { value: 0 } }
    );
    expect(out.damageFilter).toBeNull();
    expect(out.absorbAmount).toBe(15);
  });

  it('damageFilter defaults to null when absent', () => {
    const [out] = projectShield(
      [shieldAtom({ base: 5, damageFilter: undefined })],
      { mpb: { value: 0 } }
    );
    expect(out.damageFilter).toBeNull();
  });

  it('damageFilter "physical" preserved', () => {
    const [out] = projectShield(
      [shieldAtom({ base: 20, damageFilter: "physical" })],
      { mpb: { value: 0 } }
    );
    expect(out.damageFilter).toBe("physical");
  });

  it('multiple shield atoms: one projection each', () => {
    const out = projectShield(
      [
        shieldAtom({ base: 10, atomId: "a:shield:0" }),
        shieldAtom({ base: 20, atomId: "b:shield:0" }),
      ],
      { mpb: { value: 0 } }
    );
    expect(out).toHaveLength(2);
    expect(out.map(s => s.absorbAmount)).toEqual([10, 20]);
  });
});
