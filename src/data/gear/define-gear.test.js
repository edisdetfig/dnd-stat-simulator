import { describe, it, expect } from 'vitest';
import { defineGear } from './define-gear.js';

function baseItem(extra = {}) {
  return {
    id: "test_item",
    name: "Test",
    slot: "hands",
    ...extra,
  };
}

describe('defineGear — happy path', () => {
  it('returns the item unchanged when no triggers present', () => {
    const item = baseItem();
    expect(defineGear(item)).toBe(item);
  });

  it('validates a well-formed triggers[] array (Spiked Gauntlet)', () => {
    const item = baseItem({
      triggers: [
        { on: "melee_hit", damage: [{ damageType: "true_physical", base: 1 }] },
      ],
    });
    expect(() => defineGear(item)).not.toThrow();
  });
});

describe('defineGear — failure modes', () => {
  it('rejects unknown trigger event names', () => {
    const item = baseItem({
      triggers: [{ on: "melee_miss", damage: [{ damageType: "physical" }] }],
    });
    expect(() => defineGear(item)).toThrow(/unknown trigger event "melee_miss"/);
  });

  it('rejects damage entries missing damageType', () => {
    const item = baseItem({
      triggers: [{ on: "melee_hit", damage: [{ base: 1 }] }],
    });
    expect(() => defineGear(item)).toThrow(/missing damageType/);
  });

  it('rejects unknown condition types inside triggers[].conditions', () => {
    const item = baseItem({
      triggers: [{
        on: "melee_hit",
        conditions: [{ type: "moon_phase" }],
        damage: [{ damageType: "physical" }],
      }],
    });
    expect(() => defineGear(item)).toThrow(/unknown condition type "moon_phase"/);
  });

  it('rejects unknown target values on trigger', () => {
    const item = baseItem({
      triggers: [{
        on: "kill",
        target: "ghost",
        damage: [{ damageType: "physical" }],
      }],
    });
    expect(() => defineGear(item)).toThrow(/unknown target "ghost"/);
  });

  it('includes gear id in the error message for traceability', () => {
    const item = baseItem({
      id: "spiked_gauntlet",
      triggers: [{ on: "unknown_event", damage: [{ damageType: "physical" }] }],
    });
    expect(() => defineGear(item)).toThrow(/\[defineGear:spiked_gauntlet\]/);
  });
});
