// Tests for pure display-compute helpers used by StatSheetPanel.
//
// Revision #5 anchors:
//   Rev 1 — `moveSpeed` is a flat stat (not percent); PERCENT_DERIVED
//           must not contain it; formatValue must not apply × 100.
//   Rev 2 — `effectiveAttribute` applies the engine's
//           attribute_multiplier phase on top of the normalizer's flat
//           base. Malice's +0.15 WIL multiplier must surface.

import { describe, it, expect } from "vitest";
import {
  PERCENT_DERIVED,
  formatValue,
  formatMoveSpeed,
  effectiveAttribute,
  MOVE_SPEED_BASE,
} from "./statSheetCompute.js";
import { warlockBloodTitheBuild } from "../fixtures/warlock-blood-tithe.fixture.js";
import { getClass } from "../data/classes/index.js";
import { normalizeBuild } from "../engine/normalizeBuild.js";
import { runSnapshot } from "../engine/runSnapshot.js";

describe("Revision #5 · Rev 1 — moveSpeed flat-unit classification", () => {
  it("PERCENT_DERIVED does NOT contain moveSpeed", () => {
    expect(PERCENT_DERIVED.has("moveSpeed")).toBe(false);
  });

  it("formatValue('moveSpeed', -19) returns '-19' (not '-1900.0%')", () => {
    expect(formatValue("moveSpeed", -19)).toBe("-19");
  });

  it("formatValue('moveSpeed', 0) returns '0'", () => {
    expect(formatValue("moveSpeed", 0)).toBe("0");
  });

  it("formatValue still percent-formats stats that ARE percents", () => {
    expect(formatValue("pdr", 0.14)).toBe("14.0%");
    expect(formatValue("mpb", 0.23)).toBe("23.0%");
  });

  it("formatMoveSpeed wraps delta with the 300 base from season8_constants.md", () => {
    const entry = { value: -19, cap: 330 };
    const out = formatMoveSpeed(entry);
    expect(out.final).toBe(MOVE_SPEED_BASE - 19); // 281
    expect(out.cap).toBe(330);
    expect(out.delta).toBe(-19);
  });

  it("formatMoveSpeed tolerates missing entry", () => {
    expect(formatMoveSpeed(undefined)).toEqual({ final: null, cap: null });
  });

  it("formatMoveSpeed passes through the engine's cap when present", () => {
    expect(formatMoveSpeed({ value: 0, cap: 330 }).cap).toBe(330);
  });
});

describe("Revision #5 · Rev 2 — attribute_multiplier phase surfaces", () => {
  it("effectiveAttribute with zero multiplier returns base unchanged", () => {
    const { value, multiplier } = effectiveAttribute(22, {});
    expect(value).toBe(22);
    expect(multiplier).toBe(0);
  });

  it("effectiveAttribute applies a single attribute_multiplier contribution", () => {
    // Malice: wil +0.15.
    const { value, multiplier } = effectiveAttribute(22, { attribute_multiplier: 0.15 });
    expect(multiplier).toBe(0.15);
    expect(value).toBeCloseTo(25.3, 2);
  });

  it("effectiveAttribute is defensive against an object-shape phase bucket", () => {
    // Future-proofing if aggregation ever returns per-source breakdowns.
    const { value, multiplier } = effectiveAttribute(22, {
      attribute_multiplier: { malice: 0.15, dark_pact: 0.10 },
    });
    expect(multiplier).toBeCloseTo(0.25, 5);
    expect(value).toBeCloseTo(27.5, 2);
  });

  it("Malice-selected Warlock fixture surfaces wil × 1.15 via snapshot.bonuses", () => {
    // The Phase 7 default fixture drops Malice (maxPerks=4 budget); this
    // test swaps a perk to confirm the attribute_multiplier flow lights up
    // end-to-end through normalizeBuild → runSnapshot.
    const classData = getClass(warlockBloodTitheBuild.character.className);
    const withMalice = {
      ...warlockBloodTitheBuild,
      character: {
        ...warlockBloodTitheBuild.character,
        persistentSelections: {
          ...warlockBloodTitheBuild.character.persistentSelections,
          selectedPerks: ["demon_armor", "malice", "vampirism", "soul_collector"],
        },
      },
    };
    const flat = normalizeBuild({ ...withMalice, classData });
    const snap = runSnapshot(flat);

    // Engine surfaces the contribution as bonuses.wil.attribute_multiplier.
    expect(snap.bonuses?.wil?.attribute_multiplier).toBeCloseTo(0.15, 5);

    // The StatSheetPanel display layer picks up the multiplier correctly.
    const { value, multiplier } = effectiveAttribute(flat.attributes.wil, snap.bonuses.wil);
    expect(multiplier).toBeCloseTo(0.15, 5);
    // flat.attributes.wil is warlock base 22 (no gear WIL in fixture).
    expect(value).toBeCloseTo(22 * 1.15, 2);
  });
});
