// Engine self-test suite — verifies curves, aggregation, derived stats, and damage formulas
// against pinned values. Ported verbatim from index.old.html (lines 1115-1211).
//
// One key rename was applied: pe.spellCastingSpeedBonus → pe.spellCastingSpeed, to match
// the new derived-stats.js field name (the data-layer migration renamed this key when it
// switched perks to the statEffects shape; pe['spellCastingSpeed'] is what the production
// perk loop now writes, so the test must read it the same way).

import {
  STAT_CURVES,
  evaluateCurve,
  getMarginalSlope,
  getCurveContext,
} from './curves.js';
import { aggregateGear } from './aggregator.js';
import { computeDerivedStats } from './derived-stats.js';
import { calcPhysicalMeleeDamage, calcSpellDamage } from './damage.js';
import { CLASSES } from '../data/classes/index.js';
import { makeWarlockDarkPlateGear } from '../data/example-builds.js';

const WARLOCK = CLASSES.warlock;

export function runTests() {
  const R = [];
  const pass = (n) => R.push({ name: n, status: "PASS" });
  const fail = (n, e, g) => R.push({ name: n, status: "FAIL", expected: e, got: g });
  const eq = (a, b, t = 0.015) => Math.abs(a - b) <= t;
  let v;

  const TEST_GEAR = makeWarlockDarkPlateGear();

  v = evaluateCurve(STAT_CURVES.physicalPowerBonus, 11); eq(v, -0.08) ? pass("PPB(11)=-8%") : fail("PPB(11)", -0.08, v);
  v = evaluateCurve(STAT_CURVES.physicalPowerBonus, 15); eq(v, 0) ? pass("PPB(15)=0%") : fail("PPB(15)", 0, v);
  v = evaluateCurve(STAT_CURVES.magicPowerBonus, 22); eq(v, 0.07) ? pass("MPB(22)=7%") : fail("MPB(22)", 0.07, v);
  v = evaluateCurve(STAT_CURVES.health, 13.25); eq(v, 121.5, 0.5) ? pass("HP(13.25)=121.5") : fail("HP(13.25)", 121.5, v);
  v = evaluateCurve(STAT_CURVES.actionSpeed, 14.75); eq(v, -0.0025, 0.005) ? pass("AS(14.75)") : fail("AS(14.75)", -0.0025, v);
  v = evaluateCurve(STAT_CURVES.moveSpeed, 14); eq(v, -1, 0.1) ? pass("MS(14)=-1") : fail("MS(14)", -1, v);
  v = evaluateCurve(STAT_CURVES.willToMagicResistance, 22); eq(v, 58, 0.5) ? pass("WIL→MR(22)=58") : fail("WIL→MR(22)", 58, v);
  v = evaluateCurve(STAT_CURVES.cooldownReduction, 14); eq(v, -0.02) ? pass("CDR(14)=-2%") : fail("CDR(14)", -0.02, v);
  v = evaluateCurve(STAT_CURVES.spellCastingSpeed, 15); eq(v, 0) ? pass("SCS(15)=0%") : fail("SCS(15)", 0, v);
  v = evaluateCurve(STAT_CURVES.memoryCapacity, 15); eq(v, 9, 0.1) ? pass("Mem(15)=9") : fail("Mem(15)", 9, v);
  v = evaluateCurve(STAT_CURVES.buffDuration, 22); eq(v, 0.07) ? pass("BD(22)=7%") : fail("BD(22)", 0.07, v);
  v = evaluateCurve(STAT_CURVES.debuffDuration, 22); eq(v, -0.065) ? pass("DD(22)=-6.5%") : fail("DD(22)", -0.065, v);
  v = evaluateCurve(STAT_CURVES.debuffDuration, 38); eq(v, -0.187) ? pass("DD(38)=-18.7%") : fail("DD(38)", -0.187, v);
  v = evaluateCurve(STAT_CURVES.healthRecovery, 14); eq(v, -0.03) ? pass("HRec(14)=-3%") : fail("HRec(14)", -0.03, v);
  v = evaluateCurve(STAT_CURVES.persuasiveness, 14); eq(v, 14, 0.1) ? pass("Pers(14)=14") : fail("Pers(14)", 14, v);
  v = evaluateCurve(STAT_CURVES.manualDexterity, 15); eq(v, 0) ? pass("MD(15)=0%") : fail("MD(15)", 0, v);
  v = evaluateCurve(STAT_CURVES.itemEquipSpeed, 15); eq(v, 0) ? pass("ES(15)=0%") : fail("ES(15)", 0, v);
  v = evaluateCurve(STAT_CURVES.magicalInteractionSpeed, 22); eq(v, 0.49) ? pass("MIS(22)=49%") : fail("MIS(22)", 0.49, v);
  v = evaluateCurve(STAT_CURVES.memoryRecovery, 15); eq(v, 0.655) ? pass("MRec(15)=65.5%") : fail("MRec(15)", 0.655, v);
  v = evaluateCurve(STAT_CURVES.regularInteractionSpeed, 14.25); eq(v, -0.01125, 0.005) ? pass("RIS(14.25)") : fail("RIS(14.25)", -0.01125, v);

  const { attrs, bonuses } = aggregateGear(WARLOCK, TEST_GEAR, "none");
  attrs.str === 31 ? pass("AGG STR=31") : fail("AGG STR", 31, attrs.str);
  attrs.vig === 20 ? pass("AGG VIG=20") : fail("AGG VIG", 20, attrs.vig);
  attrs.agi === 17 ? pass("AGG AGI=17") : fail("AGG AGI", 17, attrs.agi);
  attrs.dex === 27 ? pass("AGG DEX=27") : fail("AGG DEX", 27, attrs.dex);
  attrs.wil === 38 ? pass("AGG WIL=38") : fail("AGG WIL", 38, attrs.wil);
  attrs.kno === 18 ? pass("AGG KNO=18") : fail("AGG KNO", 18, attrs.kno);
  attrs.res === 14 ? pass("AGG RES=14") : fail("AGG RES", 14, attrs.res);
  eq(bonuses.physicalPower, 10, 0.1) ? pass("AGG PP=10") : fail("AGG PP", 10, bonuses.physicalPower);
  eq(bonuses.armorRating, 297, 0.1) ? pass("AGG AR=297") : fail("AGG AR", 297, bonuses.armorRating);
  eq(bonuses.magicResistance, 142, 0.5) ? pass("AGG gearMR=142") : fail("AGG gearMR", 142, bonuses.magicResistance);

  const pe = { antimagic: false, spellCastingSpeed: -0.10 };
  const ds = computeDerivedStats(attrs, bonuses, pe);
  ds.health === 145 ? pass("HP=145") : fail("HP", 145, ds.health);
  eq(ds.ppb, 0.326) ? pass("PPB=32.6%") : fail("PPB", 0.326, ds.ppb);
  eq(ds.mpb, 0.23) ? pass("MPB=23%") : fail("MPB", 0.23, ds.mpb);
  eq(ds.pdr, 0.4225, 0.005) ? pass("PDR≈42.2%") : fail("PDR", 0.4225, ds.pdr);
  eq(ds.magicResistance, 259, 1) ? pass("MR=259") : fail("MR", 259, ds.magicResistance);
  eq(ds.mdr, 0.65) ? pass("MDR=65%cap") : fail("MDR", 0.65, ds.mdr);
  eq(ds.debuffDuration, -0.187) ? pass("DD=-18.7%") : fail("DD", -0.187, ds.debuffDuration);
  ds.memoryCapacity === 12 ? pass("Mem=12") : fail("Mem", 12, ds.memoryCapacity);
  eq(ds.buffDuration, 0.23) ? pass("BD=23%") : fail("BD", 0.23, ds.buffDuration);
  eq(ds.spellCastingSpeed, -0.037) ? pass("SCS=-3.7%") : fail("SCS", -0.037, ds.spellCastingSpeed);

  const w1 = aggregateGear(WARLOCK, TEST_GEAR, "weaponSlot1");
  eq(w1.bonuses.armorPenetration, 0.105, 0.001) ? pass("W1 APen=10.5%") : fail("W1 APen", 0.105, w1.bonuses.armorPenetration);
  w1.activeWeapon?.weaponDamage === 40 ? pass("W1 WpnDmg=40") : fail("W1 WpnDmg", 40, w1.activeWeapon?.weaponDamage);

  const w2 = aggregateGear(WARLOCK, TEST_GEAR, "weaponSlot2");
  const ds2 = computeDerivedStats(w2.attrs, w2.bonuses, pe);
  ds2.memoryCapacity === 17 ? pass("W2 Mem=17") : fail("W2 Mem", 17, ds2.memoryCapacity);

  v = calcSpellDamage({ baseDamage: 12, scaling: 1.0, mpb: 0.23, targetMDR: 0.06 });
  v === 13 ? pass("BoC body=13") : fail("BoC body", 13, v);
  v = calcSpellDamage({ baseDamage: 12, scaling: 1.0, mpb: 0.23, hitLocation: "head", affectedByHitLocation: true, targetMDR: 0.06 });
  v === 20 ? pass("BoC head=20") : fail("BoC head", 20, v);
  v = calcPhysicalMeleeDamage({ baseWeaponDmg: 40, buffWeaponDmg: 5, gearWeaponDmg: 2, ppb: 0.351, targetPDR: -0.22, attackerPen: 0.105 });
  v === 77 ? pass("Spectral+BSB=77") : fail("Spectral+BSB", 77, v);

  // Curve analysis tests (v0.4.3)
  v = getMarginalSlope(STAT_CURVES.physicalPowerBonus, 30);
  eq(v, 0.01, 0.001) ? pass("Slope PPB@30=1%/pt") : fail("Slope PPB@30", 0.01, v);
  v = getMarginalSlope(STAT_CURVES.regularInteractionSpeed, 16);
  eq(v, 0.056, 0.001) ? pass("Slope RIS@16=5.6%/pt") : fail("Slope RIS@16", 0.056, v);
  const ctx = getCurveContext(STAT_CURVES.healthRecovery, 14);
  ctx.tier === "amber" ? pass("HRec@14 tier=amber") : fail("HRec@14 tier", "amber", ctx.tier);
  ctx.isAccelerating === true ? pass("HRec@14 accel=true") : fail("HRec@14 accel", true, ctx.isAccelerating);
  const ctx2 = getCurveContext(STAT_CURVES.regularInteractionSpeed, 16);
  ctx2.tier === "gold" ? pass("RIS@16 tier=gold") : fail("RIS@16 tier", "gold", ctx2.tier);

  // v0.5.0 — Target preset tests
  const dmgDummy = calcPhysicalMeleeDamage({ baseWeaponDmg: 40, gearWeaponDmg: 2, ppb: 0.326, targetPDR: -0.22, attackerPen: 0 });
  const dmgPlate = calcPhysicalMeleeDamage({ baseWeaponDmg: 40, gearWeaponDmg: 2, ppb: 0.326, targetPDR: 0.42, attackerPen: 0 });
  dmgDummy > dmgPlate ? pass("Dummy>Plate phys") : fail("Dummy>Plate phys", "dummy>plate", `${dmgDummy} vs ${dmgPlate}`);
  const magDummyT = calcSpellDamage({ baseDamage: 20, scaling: 1.0, mpb: 0.23, targetMDR: 0.075 });
  const magCloth = calcSpellDamage({ baseDamage: 20, scaling: 1.0, mpb: 0.23, targetMDR: 0.45 });
  magDummyT > magCloth ? pass("Dummy>Cloth mag") : fail("Dummy>Cloth mag", "dummy>cloth", `${magDummyT} vs ${magCloth}`);
  const noPenT = calcPhysicalMeleeDamage({ baseWeaponDmg: 40, ppb: 0.3, targetPDR: 0.42, attackerPen: 0 });
  const withPenT = calcPhysicalMeleeDamage({ baseWeaponDmg: 40, ppb: 0.3, targetPDR: 0.42, attackerPen: 0.10 });
  withPenT > noPenT ? pass("Pen helps vs +PDR") : fail("Pen helps vs +PDR", "withPen>noPen", `${withPenT} vs ${noPenT}`);
  const noPenNeg = calcPhysicalMeleeDamage({ baseWeaponDmg: 40, ppb: 0.3, targetPDR: -0.22, attackerPen: 0 });
  const withPenNeg = calcPhysicalMeleeDamage({ baseWeaponDmg: 40, ppb: 0.3, targetPDR: -0.22, attackerPen: 0.10 });
  noPenNeg === withPenNeg ? pass("Pen no effect vs -PDR") : fail("Pen no effect vs -PDR", noPenNeg, withPenNeg);

  return R;
}
