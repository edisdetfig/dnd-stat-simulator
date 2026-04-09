// Main App — full character simulator
// Migrated from index.old.html lines 1987-2626 (Phase 5: UI extraction).
// Architectural changes from the monolith:
//   - Buffs derived from spell defs (no CLASS_BUFFS map); see availableBuffs useMemo.
//   - Perk effects read from new shape (perkDef.statEffects, .typeDamageBonus, .passiveEffects, .capOverrides, .healingMod).
//   - Effect phases use EFFECT_PHASES constants (PRE_CURVE_FLAT, POST_CURVE, TYPE_DAMAGE_BONUS).
//   - PDR/MDR cap references now use CAPS.pdr / CAPS.mdr (was CONSTANTS.PDR_CAP/MDR_CAP).

import { useState, useMemo, useCallback } from 'react';

// Data
import {
  CAPS,
  CORE_ATTRS,
  EFFECT_PHASES,
  TARGETING,
  TARGET_PRESETS,
  FALLBACK_MAJOR_STATS,
} from './data/constants.js';
import { derivedLabel } from './data/stat-meta.js';
import { CLASSES } from './data/classes/index.js';
import { RELIGION_BLESSINGS } from './data/religions.js';
import { makeDefaultGear } from './data/gear-defaults.js';

// Engine
import { TIER_COLORS } from './engine/curves.js';
import { aggregateGear, computeAttrBreakdown } from './engine/aggregator.js';
import { computeDerivedStats } from './engine/derived-stats.js';
import {
  calcPhysicalMeleeDamage,
  calcSpellDamage,
  calcHealing,
  HEALING_ITEMS,
} from './engine/damage.js';
import { runTests } from './engine/tests.js';

// Styles
import { styles } from './styles/theme.js';

// Format helpers
import { fmtPct } from './utils/format.js';

// Components
import { Panel } from './components/ui/Panel.jsx';
import { Collapsible } from './components/ui/Collapsible.jsx';
import { InfoTip } from './components/ui/InfoTip.jsx';
import { AttrTooltip } from './components/ui/AttrTooltip.jsx';
import { SR, CapSR, SubSR } from './components/stats/StatRows.jsx';
import { CurveChart } from './components/charts/CurveChart.jsx';
import { MarginalBadge } from './components/charts/MarginalBadge.jsx';
import { TargetEditor } from './components/TargetEditor.jsx';
import { GearSlot } from './components/gear/GearSlot.jsx';
import { ALL_SLOTS } from './components/gear/slots.js';

// Armor slot ids used by the unarmed-true-damage gather. Must mirror the keys
// in ALL_SLOTS minus the weapon slots.
const ARMOR_SLOT_KEYS = ["head", "chest", "back", "hands", "legs", "feet", "ring1", "ring2", "necklace"];

function App() {
  const [showTests, setShowTests] = useState(null);
  const [weapon, setWeapon] = useState("none");
  const [showDebug, setShowDebug] = useState(false);
  const [gear, setGear] = useState(makeDefaultGear);
  const [gearCollapsed, setGearCollapsed] = useState(false);
  const [activeBuffs, setActiveBuffs] = useState({});
  const [religion, setReligion] = useState("none");
  const [useAcronyms, setUseAcronyms] = useState(true);
  const [expandedCurve, setExpandedCurve] = useState(null);

  // v0.5.0 — Target properties (internal decimals)
  const [target, setTarget] = useState({ pdr: -0.22, mdr: 0.075, headshotDR: 0 });

  const [selectedClass, setSelectedClass] = useState("warlock");
  const [selectedPerks, setSelectedPerks] = useState(["demon_armor", "shadow_touch", "dark_reflection"]);
  const [selectedSkills, setSelectedSkills] = useState(["spell_memory_1", "blow_of_corruption"]);
  const [selectedSpells, setSelectedSpells] = useState([
    "curse_of_weakness", "power_of_sacrifice", "bloodstained_blade", "eldritch_shield", "spell_predation"
  ]);

  const classData = CLASSES[selectedClass];

  const tests = useMemo(() => runTests(), []);
  const pc = tests.filter(t => t.status === "PASS").length;
  const fc = tests.filter(t => t.status === "FAIL").length;

  const handleGearChange = useCallback((slot, data) => setGear(prev => ({ ...prev, [slot]: data })), []);
  const toggleBuff = useCallback((buffId) => setActiveBuffs(prev => ({ ...prev, [buffId]: !prev[buffId] })), []);
  const togglePerk = useCallback((perkId) => {
    setSelectedPerks(prev => {
      if (prev.includes(perkId)) return prev.filter(p => p !== perkId);
      if (prev.length >= (classData?.maxPerks || 4)) return prev;
      return [...prev, perkId];
    });
  }, [classData]);
  const toggleSpell = useCallback((spellId) => {
    setSelectedSpells(prev => {
      if (prev.includes(spellId)) return prev.filter(s => s !== spellId);
      const smCount = selectedSkills.filter(sk => {
        const skDef = (classData?.skills || []).find(s => s.id === sk);
        return skDef?.type === "spell_memory";
      }).length;
      if (prev.length >= smCount * 5) return prev;
      return [...prev, spellId];
    });
  }, [classData, selectedSkills]);
  const handleClassChange = useCallback((newClassId) => {
    setSelectedClass(newClassId);
    setSelectedPerks([]);
    setSelectedSkills([]);
    setSelectedSpells([]);
    setActiveBuffs({});
  }, []);
  const handleSkillChange = useCallback((slotIndex, skillId) => {
    setSelectedSkills(prev => {
      const next = [...prev];
      if (skillId === "") next.splice(slotIndex, 1);
      else if (slotIndex < next.length) next[slotIndex] = skillId;
      else next.push(skillId);
      return next;
    });
  }, []);

  const spellMemorySlots = useMemo(() => {
    return selectedSkills.filter(sk => {
      const skDef = (classData?.skills || []).find(s => s.id === sk);
      return skDef?.type === "spell_memory";
    }).reduce((sum, sk) => {
      const skDef = (classData?.skills || []).find(s => s.id === sk);
      return sum + (skDef?.spellSlots || 0);
    }, 0);
  }, [classData, selectedSkills]);

  const totalMemoryCost = useMemo(() => {
    return selectedSpells.reduce((sum, spId) => {
      const spDef = (classData?.spells || []).find(s => s.id === spId);
      return sum + (spDef?.memoryCost || 0);
    }, 0);
  }, [classData, selectedSpells]);

  // Derive available self-buffs from equipped spells (replaces old CLASS_BUFFS map).
  // A spell contributes a buff entry if it isn't enemy-only and has at least one
  // non-DoT effect. Spells with onBreak (e.g., Eldritch Shield) contribute a second
  // entry as a "Break" sub-buff.
  const availableBuffs = useMemo(() => {
    const buffs = [];
    for (const spell of (classData?.spells || [])) {
      if (!selectedSpells.includes(spell.id)) continue;
      if (spell.targeting === TARGETING.ENEMY_ONLY) continue;
      const buffEffects = (spell.effects || []).filter(e => e.phase !== EFFECT_PHASES.DAMAGE_OVER_TIME);
      if (buffEffects.length > 0) {
        buffs.push({
          id: spell.id,
          name: spell.name,
          description: spell.tooltip,
          duration: spell.duration ? `${spell.duration}s` : null,
          healthCost: spell.healthCost,
          effects: buffEffects,
        });
      }
      if (spell.onBreak?.effects?.length) {
        buffs.push({
          id: spell.id + "_break",
          name: spell.name + " (Break)",
          description: spell.tooltip,
          duration: spell.onBreak.duration ? `${spell.onBreak.duration}s` : null,
          effects: spell.onBreak.effects,
        });
      }
    }
    return buffs;
  }, [classData, selectedSpells]);

  const computed = useMemo(() => {
    const { attrs, bonuses, activeWeapon } = aggregateGear(classData, gear, weapon);

    // Pre-curve buff effects (PRE_CURVE_FLAT only)
    for (const buff of availableBuffs) {
      if (!activeBuffs[buff.id]) continue;
      for (const eff of buff.effects) {
        if (eff.phase !== EFFECT_PHASES.PRE_CURVE_FLAT) continue;
        if (CORE_ATTRS.has(eff.stat)) attrs[eff.stat] = (attrs[eff.stat] || 0) + eff.value;
        else bonuses[eff.stat] = (bonuses[eff.stat] || 0) + eff.value;
      }
    }

    // Perk effects (new shape: statEffects, typeDamageBonus, passiveEffects, capOverrides, healingMod)
    const pe = {};
    const typeDmgBonuses = {};
    const capOverrides = {};
    for (const perkId of selectedPerks) {
      const perkDef = classData.perks.find(p => p.id === perkId);
      if (!perkDef) continue;
      for (const eff of (perkDef.statEffects || [])) {
        pe[eff.stat] = (pe[eff.stat] || 0) + eff.value;
      }
      if (perkDef.typeDamageBonus) {
        for (const [type, val] of Object.entries(perkDef.typeDamageBonus)) {
          typeDmgBonuses[type] = (typeDmgBonuses[type] || 0) + val;
        }
      }
      if (perkDef.passiveEffects) Object.assign(pe, perkDef.passiveEffects);
      if (perkDef.capOverrides) Object.assign(capOverrides, perkDef.capOverrides);
      if (perkDef.healingMod) pe.healingMod = (pe.healingMod || 0) + perkDef.healingMod;
    }
    pe.capOverrides = capOverrides;

    const ds = computeDerivedStats(attrs, bonuses, pe);

    // Post-curve buff effects (POST_CURVE modifies ds; TYPE_DAMAGE_BONUS feeds typeDmgBonuses)
    ds.buffPostCurve = {};
    for (const buff of availableBuffs) {
      if (!activeBuffs[buff.id]) continue;
      for (const eff of buff.effects) {
        if (eff.phase === EFFECT_PHASES.POST_CURVE) {
          ds.buffPostCurve[eff.stat] = (ds.buffPostCurve[eff.stat] || 0) + eff.value;
          ds[eff.stat] = (ds[eff.stat] || 0) + eff.value;
        } else if (eff.phase === EFFECT_PHASES.TYPE_DAMAGE_BONUS) {
          typeDmgBonuses[eff.damageType] = (typeDmgBonuses[eff.damageType] || 0) + eff.value;
        }
      }
    }

    ds.typeDamageBonuses = typeDmgBonuses;

    // Healing stats
    ds.healingMod = pe.healingMod || 0;
    ds.magicalHealingAdd = bonuses.magicalHealing || 0;
    ds.physicalHealingAdd = bonuses.physicalHealing || 0;

    // Religion blessings
    ds.religionBonuses = {};
    const blessing = RELIGION_BLESSINGS.find(b => b.id === religion);
    if (blessing) {
      for (const eff of blessing.effects) {
        ds.religionBonuses[eff.stat] = eff.value;
        ds[eff.stat] = (ds[eff.stat] || 0) + eff.value;
      }
    }

    ds._perkFlags = pe;

    return { attrs, bonuses, ds, activeWeapon };
  }, [weapon, gear, activeBuffs, religion, selectedPerks, selectedClass, classData, availableBuffs]);

  const { ds } = computed;

  const attrBreakdown = useMemo(() =>
    computeAttrBreakdown(classData, gear, weapon, activeBuffs, availableBuffs),
    [classData, gear, weapon, activeBuffs, availableBuffs]
  );

  const majorStatIds = classData.majorDerivedStats || FALLBACK_MAJOR_STATS;
  const magDmg = computed.activeWeapon?.magicalDamage || 0;

  // v0.5.0 — Target label for display
  const targetPresetMatch = TARGET_PRESETS.find(p =>
    Math.abs(target.pdr - p.pdr) < 0.001 &&
    Math.abs(target.mdr - p.mdr) < 0.001 &&
    Math.abs(target.headshotDR - p.headshotDR) < 0.001
  );
  const targetLabel = targetPresetMatch ? targetPresetMatch.name : "Custom Target";

  // Helper: marginal badge for a stat — clickable to toggle curve chart
  const badge = (id) => <MarginalBadge statId={id} ds={ds} attrs={computed.attrs}
    isExpanded={expandedCurve === id}
    onToggle={() => setExpandedCurve(expandedCurve === id ? null : id)} />;

  // Helper: wrap a stat block with optional curve chart
  const withCurve = (id, content) => (
    <div key={id}>
      {content}
      {expandedCurve === id && <CurveChart statId={id} ds={ds} attrs={computed.attrs} />}
    </div>
  );

  const renderDmgLine = (source, d, di) => {
    const effBase = d.base + (d.damageType !== "physical" ? magDmg : 0);
    const typeBonus = ds.typeDamageBonuses?.[d.damageType] || 0;
    const bodyDmg = calcSpellDamage({ baseDamage: effBase, scaling: d.scaling, mpb: ds.mpb, targetMDR: target.mdr, attackerMagicPen: ds.magicPenetration, typeBonuses: typeBonus, affectedByHitLocation: !!d.affectedByHitLocation });
    const headDmg = d.affectedByHitLocation ? calcSpellDamage({ baseDamage: effBase, scaling: d.scaling, mpb: ds.mpb, targetMDR: target.mdr, attackerMagicPen: ds.magicPenetration, typeBonuses: typeBonus, hitLocation: "head", affectedByHitLocation: true, headshotBonus: ds.headshotDamageBonus, targetHeadshotDR: target.headshotDR }) : null;
    return (
      <div key={`${source}-${di}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 8px", background: "#0d0d14", borderRadius: 4, marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: "#888" }}>{source} · {d.label} · {d.base}({d.scaling}){magDmg > 0 ? `+${magDmg}wpn` : ""}{typeBonus > 0 ? ` +${Math.round(typeBonus*100)}%` : ""} {(d.damageType || "").replace("_magical", "")}</span>
        <span style={{ fontSize: 11 }}>
          <span style={{ color: "#c8a8ff", fontWeight: 500 }}>{bodyDmg}</span>
          {headDmg != null && <span style={{ color: "#666", marginLeft: 4 }}>/ {headDmg} head</span>}
        </span>
      </div>
    );
  };

  const allDmgLines = [];
  selectedSkills.forEach(skId => {
    const skDef = (classData.skills || []).find(s => s.id === skId);
    if (skDef?.damage) skDef.damage.forEach((d, di) => allDmgLines.push(renderDmgLine(skDef.name, d, di)));
  });
  selectedSpells.forEach(spId => {
    const spDef = (classData.spells || []).find(s => s.id === spId);
    if (spDef?.damage) spDef.damage.forEach((d, di) => allDmgLines.push(renderDmgLine(spDef.name, d, di)));
  });

  // Collect healing sources from equipped perks
  const allHealLines = [];
  selectedPerks.forEach(perkId => {
    const perkDef = (classData.perks || []).find(p => p.id === perkId);
    if (!perkDef?.healEffects) return;
    perkDef.healEffects.forEach((h, hi) => {
      const heal = calcHealing({
        baseHeal: h.baseHeal, scaling: h.scaling,
        mpb: ds.mpb, healingAdd: ds.magicalHealingAdd,
        healingMod: ds.healingMod,
      });
      allHealLines.push(
        <div key={`perk-${perkId}-${hi}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 8px", background: "#0d0d14", borderRadius: 4, marginBottom: 2 }}>
          <span style={{ fontSize: 10, color: "#888" }}>
            {perkDef.name} · {h.label} · {h.baseHeal}({h.scaling})
            {h.scaling > 0 && ds.magicalHealingAdd > 0 ? ` +${ds.magicalHealingAdd}mh` : ""}
            {ds.healingMod > 0 ? ` ×${(1 + ds.healingMod).toFixed(1)}` : ""}
          </span>
          <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 500 }}>
            +{heal.toFixed(1)} HP
          </span>
        </div>
      );
    });
  });
  // Reference healing items (potions etc.)
  HEALING_ITEMS.forEach((item, ii) => {
    const heal = calcHealing({
      baseHeal: item.baseHeal, scaling: item.scaling,
      mpb: ds.mpb, healingAdd: ds.magicalHealingAdd,
      healingMod: ds.healingMod,
      isHoT: item.isHoT, baseDuration: item.baseDuration,
      buffDuration: ds.buffDuration,
    });
    const ticks = item.isHoT ? Math.floor(item.baseDuration * (1 + ds.buffDuration)) : 0;
    allHealLines.push(
      <div key={`item-${ii}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 8px", background: "#0d0d14", borderRadius: 4, marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: "#888" }}>
          {item.name} · {item.baseHeal}({item.scaling}) {item.label}
          {ds.magicalHealingAdd > 0 ? ` +${ds.magicalHealingAdd}mh` : ""}
          {item.isHoT ? ` · ${ticks}s` : ""}
          {ds.healingMod > 0 ? ` ×${(1 + ds.healingMod).toFixed(1)}` : ""}
        </span>
        <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 500 }}>
          +{heal.toFixed(1)} HP
        </span>
      </div>
    );
  });

  const renderDerivedStat = (id) => {
    const L = (k) => derivedLabel(k, useAcronyms);
    switch (id) {
      case "hp": return withCurve(id, <SR label={L("hp")} value={ds.health} detail={`rating ${ds.healthRating.toFixed(1)}`} badge={badge("hp")} />);
      case "ppb": return withCurve(id, <><SR label={L("ppb")} value={fmtPct(ds.ppb)} badge={badge("ppb")} />
        <SubSR label={`From Power`} value={`${ds.physicalPower} (${fmtPct(ds.ppbFromCurve)})`} />
        <SubSR label="From Bonuses" value={ds.ppbFromBonuses > 0 ? fmtPct(ds.ppbFromBonuses) : "0"}
          info="Flat addition to curve output — not a multiplier. Gear % bonuses add directly to the curve value." /></>);
      case "mpb": return withCurve(id, <><SR label={L("mpb")} value={fmtPct(ds.mpb)} badge={badge("mpb")} />
        <SubSR label={`From Power`} value={`${ds.magicalPower} (${fmtPct(ds.mpbFromCurve)})`} />
        <SubSR label="From Bonuses" value={ds.mpbFromBonuses > 0 ? fmtPct(ds.mpbFromBonuses) : "0"}
          info="Flat addition to curve output. MPB also scales magical healing (potions, spells) — not just damage." /></>);
      case "pdr": return withCurve(id, <><CapSR label={L("pdr")} value={ds.pdr} cap={ds.pdrCap} curve={ds.pdrFromCurve} bonus={ds.pdrFromBonuses} badge={badge("pdr")} />
        <SubSR label="From AR" value={`${ds.armorRating} (${fmtPct(ds.pdrFromCurve)})`} />
        <SubSR label="From Bonuses" value={ds.pdrFromBonuses > 0 ? fmtPct(ds.pdrFromBonuses) : "0"}
          info={`Added flat after the AR→PDR curve, before ${Math.round(ds.pdrCap*100)}% cap${ds.pdrCap > CAPS.pdr ? " (raised by Defense Mastery)" : ""}. Not a multiplier on existing PDR.`} /></>);
      case "mdr": return withCurve(id, <><CapSR label={L("mdr")} value={ds.mdr} cap={ds.mdrCap} curve={ds.mdrFromCurve} bonus={ds.mdrFromBonuses} badge={badge("mdr")} />
        <SubSR label="From MR" value={`${Math.round(ds.magicResistance)} (${fmtPct(ds.mdrFromCurve)})`} />
        <SubSR label="From Bonuses" value={ds.mdrFromBonuses > 0 ? fmtPct(ds.mdrFromBonuses) : "0"}
          info={`Added flat after the MR→MDR curve, before ${Math.round(ds.mdrCap*100)}% cap${ds.mdrCap > CAPS.mdr ? " (raised by Iron Will)" : ""}. Not a multiplier on existing MDR.`} />
        {ds.hasAntimagic && <SubSR label="Antimagic (×0.80)" value={fmtPct(1 - ds.effectiveMagicDmgTaken)}
          info="Separate multiplicative layer AFTER the MDR cap — not added to stat-screen MDR. Does not apply vs divine magic." />}</>);
      case "moveSpeed": return withCurve(id, <SR label={L("moveSpeed")} value={ds.moveSpeed} badge={badge("moveSpeed")} />);
      case "actionSpeed": return withCurve(id, <SR label={L("actionSpeed")} value={fmtPct(ds.actionSpeed)} detail={`rating ${ds.actionSpeedRating.toFixed(1)}`} badge={badge("actionSpeed")} />);
      case "spellCastingSpeed": return withCurve(id, <SR label={L("spellCastingSpeed")} value={fmtPct(ds.spellCastingSpeed)} detail={ds.buffPostCurve?.spellCastingSpeed ? `+${fmtPct(ds.buffPostCurve.spellCastingSpeed)} from ES break` : null} badge={badge("spellCastingSpeed")} />);
      case "regularInteractionSpeed": return withCurve(id, <SR label={L("regularInteractionSpeed")} value={fmtPct(ds.regularInteractionSpeed)} detail={ds.religionBonuses?.regularInteractionSpeed ? `+${fmtPct(ds.religionBonuses.regularInteractionSpeed)} religion` : null} badge={badge("regularInteractionSpeed")} />);
      case "magicalInteractionSpeed": return withCurve(id, <SR label={L("magicalInteractionSpeed")} value={fmtPct(ds.magicalInteractionSpeed)} badge={badge("magicalInteractionSpeed")} />);
      case "cdr": return withCurve(id, <SR label={L("cdr")} value={fmtPct(ds.cdr)} detail={ds.religionBonuses?.cdr ? `+${fmtPct(ds.religionBonuses.cdr)} religion` : null} badge={badge("cdr")} />);
      case "buffDuration": return withCurve(id, <SR label={<>{L("buffDuration")}<InfoTip text="Extends potion/HoT duration — you get MORE total healing, not just slower. Each extra tick = more HP." /></>} value={fmtPct(ds.buffDuration)} badge={badge("buffDuration")} />);
      case "debuffDuration": return withCurve(id, <SR label={L("debuffDuration")} value={fmtPct(ds.debuffDuration)} badge={badge("debuffDuration")} />);
      case "memoryCapacity": return withCurve(id, <SR label={<>{L("memoryCapacity")}<InfoTip text="Formula: ceil(curve(KNO) × (1 + bonus%)) + flat. Percentage and flat bonuses stack differently." /></>} value={ds.memoryCapacity} badge={badge("memoryCapacity")} />);
      case "healthRecovery": return withCurve(id, <SR label={<>{L("healthRecovery")}<InfoTip text="HP recovered per 2s while sitting/resting. Converts recoverable (dark red) health back to real HP." /></>} value={fmtPct(ds.healthRecovery)} badge={badge("healthRecovery")} />);
      case "memoryRecovery": return withCurve(id, <SR label={L("memoryRecovery")} value={fmtPct(ds.memoryRecovery)} badge={badge("memoryRecovery")} />);
      case "magicalHealing": return <SR key={id} label={<>{L("magicalHealing")}<InfoTip text="Flat bonus added to magical heals (potions, spells) before MPB multiplier. Effectiveness depends on ability scaling — e.g., potions use 50%, so +4 MH = +2 base heal." /></>} value={computed.bonuses.magicalHealing || 0} />;
      case "physicalHealing": return <SR key={id} label={<>{L("physicalHealing")}<InfoTip text="Flat bonus to physical heals (bandages, campfires, field rations). NOT affected by Physical Power Bonus." /></>} value={computed.bonuses.physicalHealing || 0} />;
      case "manualDexterity": return withCurve(id, <SR label={L("manualDexterity")} value={fmtPct(ds.manualDexterity)} badge={badge("manualDexterity")} />);
      case "equipSpeed": return withCurve(id, <SR label={L("equipSpeed")} value={fmtPct(ds.equipSpeed)} badge={badge("equipSpeed")} />);
      case "persuasiveness": return withCurve(id, <SR label={L("persuasiveness")} value={Math.round(ds.persuasiveness)} detail={ds.religionBonuses?.persuasiveness ? `+${ds.religionBonuses.persuasiveness} religion` : null} badge={badge("persuasiveness")} />);
      case "luck": return <SR key={id} label={L("luck")} value={ds.luck} detail={ds.religionBonuses?.luck ? `+${ds.religionBonuses.luck} religion` : null} />;
      case "armorPenetration": return <SR key={id} label={<>{L("armorPenetration")}<InfoTip text="Reduces target's PDR. Has NO effect when target PDR is negative (e.g., training dummies at -22%)." /></>} value={fmtPct(ds.armorPenetration)} />;
      case "magicPenetration": return <SR key={id} label={<>{L("magicPenetration")}<InfoTip text="Reduces target's MDR. Formula: max(1 - MDR×(1-Pen), 1-MDR) — only helps when target has positive MDR." /></>} value={fmtPct(ds.magicPenetration)} detail={ds.religionBonuses?.magicPenetration ? `+${fmtPct(ds.religionBonuses.magicPenetration)} religion` : null} />;
      case "headshotDamageBonus": return <SR key={id} label={L("headshotDamageBonus")} value={fmtPct(ds.headshotDamageBonus)} />;
      case "headshotDamageReduction": return <SR key={id} label={L("headshotDamageReduction")} value={fmtPct(ds.headshotDamageReduction)} />;
      case "projectileDamageReduction": return <SR key={id} label={L("projectileDamageReduction")} value={fmtPct(ds.projectileDamageReduction)} />;
      default: return null;
    }
  };

  const ALL_DERIVED_IDS = ["hp", "ppb", "mpb", "pdr", "mdr", "moveSpeed", "actionSpeed", "spellCastingSpeed",
    "regularInteractionSpeed", "magicalInteractionSpeed", "cdr", "buffDuration", "debuffDuration",
    "memoryCapacity", "healthRecovery", "memoryRecovery", "physicalHealing", "manualDexterity", "equipSpeed", "persuasiveness", "luck",
    "armorPenetration", "magicPenetration", "headshotDamageBonus", "headshotDamageReduction", "projectileDamageReduction"];
  const minorStatIds = ALL_DERIVED_IDS.filter(id => !majorStatIds.includes(id));

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", background: "#0a0a0f", color: "#c8c8d4", minHeight: "100vh", padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0a0a0f; }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { opacity: 1; }
        select option:disabled { color: #666; font-weight: 600; background: #0a0a0f; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1e1e2e", paddingBottom: 16, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "#e0e0ec", letterSpacing: "0.05em", textTransform: "uppercase" }}>D&D Simulator</h1>
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>Season 8 · Hotfix 112-1 · v0.5.0</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div onClick={() => setUseAcronyms(!useAcronyms)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: "#10101c", border: "1px solid #1e1e2e", borderRadius: 20, padding: "4px 12px" }}>
            <span style={{ fontSize: 10, color: "#555" }}>Labels:</span>
            <div style={{ width: 32, height: 16, borderRadius: 8, background: useAcronyms ? "#6366f1" : "#2a2a3e", position: "relative", transition: "background 0.2s" }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: "#e0e0ec", position: "absolute", top: 2, left: useAcronyms ? 18 : 2, transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: 10, color: useAcronyms ? "#6366f1" : "#555", fontWeight: 600, minWidth: 36 }}>{useAcronyms ? "Short" : "Full"}</span>
          </div>
          <select value={selectedClass} onChange={(e) => handleClassChange(e.target.value)}
            style={{ ...styles.select, fontSize: 12, minWidth: 120 }}>
            {Object.values(CLASSES).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Legend for marginal badges */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, padding: "4px 8px", fontSize: 9, color: "#555", alignItems: "center" }}>
        <span style={{ color: "#777" }}>Curve efficiency:</span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: TIER_COLORS.gold, display: "inline-block" }} /> <span style={{ color: TIER_COLORS.gold }}>★ Peak</span></span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: TIER_COLORS.green, display: "inline-block" }} /> <span style={{ color: TIER_COLORS.green }}>Good</span></span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: TIER_COLORS.amber, display: "inline-block" }} /> <span style={{ color: TIER_COLORS.amber }}>Tapering</span></span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: TIER_COLORS.gray, display: "inline-block" }} /> <span style={{ color: TIER_COLORS.gray }}>Dim</span></span>
        <span style={{ display: "flex", alignItems: "center", gap: 3 }}><span style={{ color: TIER_COLORS.amber }}>↑</span> = acceleration ahead</span>
      </div>

      {/* ========== TWO-COLUMN LAYOUT ========== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>

        {/* ═══ LEFT PANEL: COMBAT ═══ */}
        <div>

          <Panel title="Weapon Held" color="#60a5fa">
            <div style={{ display: "flex", gap: 6 }}>
              {[["none", "Bare Hands"], ["weaponSlot1", gear.weaponSlot1?.primary?.name || "Weapon 1"], ["weaponSlot2", gear.weaponSlot2?.primary?.name || "Weapon 2"]].map(([k, l]) => (
                <button key={k} onClick={() => setWeapon(k)} style={{
                  flex: 1, background: weapon === k ? "#1a1a2e" : "transparent",
                  border: `1px solid ${weapon === k ? "#4a4a6e" : "#1e1e2e"}`,
                  color: weapon === k ? "#e0e0ec" : "#666", padding: "8px 12px", borderRadius: 4,
                  cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: weapon === k ? 600 : 400,
                }}>{l}</button>
              ))}
            </div>
          </Panel>

          {/* v0.5.0 — Target Property Editor */}
          <Panel title={<span>Target {"\u2014"} <span style={{ color: "#c8b4ff", fontWeight: 500, textTransform: "none", letterSpacing: "normal" }}>{targetLabel}</span></span>} color="#a78bfa">
            <TargetEditor target={target} onChange={setTarget} />
          </Panel>

          {availableBuffs.length > 0 && (
            <Panel title="Active Buffs" color="#a78bfa">
              {availableBuffs.map(buff => {
                const active = !!activeBuffs[buff.id];
                return (
                  <div key={buff.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #111118" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => toggleBuff(buff.id)} style={{
                        width: 36, height: 20, flexShrink: 0, borderRadius: 10, border: "none", cursor: "pointer",
                        background: active ? "#4a6a4a" : "#2a2a3e", position: "relative", transition: "background 0.2s",
                      }}>
                        <div style={{ width: 14, height: 14, borderRadius: 7, background: active ? "#6bff6b" : "#555",
                          position: "absolute", top: 3, left: active ? 19 : 3, transition: "left 0.2s, background 0.2s" }} />
                      </button>
                      <div>
                        <div style={{ fontSize: 11, color: active ? "#e0e0ec" : "#666", fontWeight: active ? 500 : 400 }}>{buff.name}</div>
                        <div style={{ fontSize: 9, color: "#444" }}>{buff.description}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 10, color: "#555" }}>
                      {buff.duration && <span>{buff.duration}</span>}
                      {buff.healthCost && <span style={{ color: "#a44", marginLeft: 6 }}>-{buff.healthCost} HP</span>}
                    </div>
                  </div>
                );
              })}
              {Object.values(activeBuffs).some(v => v) && (() => {
                const totalHpCost = availableBuffs.filter(b => activeBuffs[b.id] && b.healthCost).reduce((sum, b) => sum + b.healthCost, 0);
                return totalHpCost > 0 ? <div style={{ fontSize: 10, color: "#a44", marginTop: 4, textAlign: "right" }}>Total buff cast cost: -{totalHpCost} HP</div> : null;
              })()}
            </Panel>
          )}

          <Panel title={`Physical Damage — ${computed.activeWeapon ? computed.activeWeapon.name : "Bare Hands"} vs ${targetLabel}`} color="#f59e0b">
            {(() => {
              const UNARMED_BASE = 8;
              const baseWpnDmg = computed.activeWeapon ? computed.activeWeapon.weaponDamage : UNARMED_BASE;
              const gearWpnDmg = computed.bonuses.additionalWeaponDamage || 0;
              const buffWpnDmg = computed.bonuses.buffWeaponDamage || 0;
              const pen = ds.armorPenetration;
              const hsBonus = ds.headshotDamageBonus;
              const combos = computed.activeWeapon ? [1.0, 1.05, 1.1] : [1.0];
              const truePhysDmg = (() => {
                let total = 0;
                for (const slot of ARMOR_SLOT_KEYS) {
                  const item = gear[slot];
                  if (item?.onHitEffects) {
                    for (const eff of item.onHitEffects) {
                      if (eff.trueDamage) total += eff.damage;
                    }
                  }
                }
                return total;
              })();
              return (
                <div style={{ display: "flex", gap: 8 }}>
                  {combos.map((cm, i) => {
                    const d = calcPhysicalMeleeDamage({ baseWeaponDmg: baseWpnDmg, buffWeaponDmg: buffWpnDmg, gearWeaponDmg: gearWpnDmg, ppb: ds.ppb, comboMultiplier: cm, targetPDR: target.pdr, attackerPen: pen, truePhysicalDmg: truePhysDmg });
                    const dh = calcPhysicalMeleeDamage({ baseWeaponDmg: baseWpnDmg, buffWeaponDmg: buffWpnDmg, gearWeaponDmg: gearWpnDmg, ppb: ds.ppb, comboMultiplier: cm, targetPDR: target.pdr, attackerPen: pen, hitLocation: "head", headshotBonus: hsBonus, targetHeadshotDR: target.headshotDR, truePhysicalDmg: truePhysDmg });
                    return (
                      <div key={i} style={{ flex: 1, background: "#1a150d", border: "1px solid #3a3020", borderRadius: 4, padding: "6px 8px" }}>
                        <div style={{ fontSize: 10, color: "#666", textAlign: "center", marginBottom: 4 }}>{combos.length > 1 ? `Hit ${i + 1}` : "Hit"} {cm !== 1.0 && <span style={{ color: "#555" }}>×{cm}</span>}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <div style={{ flex: 1, background: "#1a180a", borderRadius: 3, padding: "4px 0", textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "#8a7a3a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Body</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>{d}</div>
                          </div>
                          <div style={{ flex: 1, background: "#1a0e0e", borderRadius: 3, padding: "4px 0", textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "#8a4a4a", textTransform: "uppercase", letterSpacing: "0.05em" }}>Head</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#f87171" }}>{dh}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {!computed.activeWeapon && <div style={{ fontSize: 9, color: "#444", marginTop: 4 }}>Unarmed base damage: 8 (verified)</div>}
            {target.pdr < 0 && ds.armorPenetration > 0 && (
              <div style={{ fontSize: 9, color: "#a86b32", marginTop: 4 }}>
                {"\u26a0"} Target has negative PDR {"\u2014"} your {fmtPct(ds.armorPenetration)} armor pen has no effect
              </div>
            )}
          </Panel>

          {allDmgLines.length > 0 && (
            <Panel title={`Spell & Skill Damage vs ${targetLabel}`} color="#f59e0b">
              <div style={{ fontSize: 9, color: "#444", marginBottom: 6 }}>MDR {fmtPct(target.mdr)}{magDmg > 0 ? ` · +${magDmg} Magical Damage from ${computed.activeWeapon?.name || "weapon"}` : ""}
                <InfoTip text={"Dmg = Base × (1 + MPB × Scaling + TypeBonus) × HitLoc × DR. The (1.0) is Scaling — at 1.0 you get full MPB benefit, at 0.5 only half. Type bonuses (e.g., Dark Enhancement) only apply to matching damage types."} color="#6a6a4e" />
              </div>
              {allDmgLines}
            </Panel>
          )}

          {allHealLines.length > 0 && (
            <Panel title="Healing" color="#4ade80">
              <div style={{ fontSize: 9, color: "#444", marginBottom: 6 }}>
                Mag Heal: {ds.magicalHealingAdd || 0}
                {ds.healingMod > 0 ? ` · Healing Mod: +${Math.round(ds.healingMod * 100)}%` : ""}
                {ds.mpb > 0 ? ` · MPB: ${fmtPct(ds.mpb)}` : ""}
                <InfoTip text={"Heal = (Base + MagHeal × Scaling) × (1 + MPB × Scaling) × (1 + HealMod). The (0.5) after an ability is its Scaling — controls how much your stats contribute. MPB boosts magical healing (potions, spells), not just damage."} color="#4a6a4e" />
              </div>
              {allHealLines}
            </Panel>
          )}

          <Panel title={`Build — ${classData.name}`} color="#6366f1">
            <Collapsible title="Perks" color="#6366f1" badge={`${selectedPerks.length}/${classData.maxPerks}`} defaultOpen>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", padding: "4px 0" }}>
                {(classData.perks || []).map(perk => {
                  const active = selectedPerks.includes(perk.id);
                  const atMax = !active && selectedPerks.length >= classData.maxPerks;
                  return (
                    <div key={perk.id} onClick={() => !atMax && togglePerk(perk.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 4, cursor: atMax ? "not-allowed" : "pointer",
                        background: active ? "#141428" : "transparent", border: `1px solid ${active ? "#3a3a5e" : "transparent"}`, opacity: atMax ? 0.4 : 1 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${active ? "#6b8aff" : "#333"}`,
                        background: active ? "#6b8aff" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>{active ? "✓" : ""}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: active ? "#e0e0ec" : "#888", fontWeight: active ? 500 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{perk.name}</div>
                        <div style={{ fontSize: 9, color: "#444", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{perk.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Collapsible>

            {(classData.skills || []).length > 0 && (
              <Collapsible title="Skills" color="#6366f1" badge={`${selectedSkills.length} slots`} defaultOpen>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 0" }}>
                  {[0, 1].map(slot => (
                    <select key={slot} value={selectedSkills[slot] || ""} onChange={(e) => handleSkillChange(slot, e.target.value)}
                      style={{ ...styles.select, minWidth: 180, fontSize: 11 }}>
                      <option value="">— empty —</option>
                      {(classData.skills || []).filter(sk => !selectedSkills.includes(sk.id) || selectedSkills[slot] === sk.id)
                        .map(sk => <option key={sk.id} value={sk.id}>{sk.name}{sk.type === "spell_memory" ? ` (${sk.spellSlots} slots)` : ""}</option>)}
                    </select>
                  ))}
                </div>
              </Collapsible>
            )}

            {(classData.spells || []).length > 0 && spellMemorySlots > 0 && (
              <Collapsible title="Spells" color="#6366f1"
                badge={`${totalMemoryCost}/${ds.memoryCapacity} memory${totalMemoryCost > ds.memoryCapacity ? " ⚠" : ""}`} defaultOpen>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", padding: "4px 0" }}>
                  {(classData.spells || []).map(spell => {
                    const equipped = selectedSpells.includes(spell.id);
                    const atSlotMax = !equipped && selectedSpells.length >= spellMemorySlots;
                    return (
                      <div key={spell.id} onClick={() => !atSlotMax && toggleSpell(spell.id)}
                        style={{ padding: "4px 6px", borderRadius: 4, cursor: atSlotMax ? "not-allowed" : "pointer",
                          background: equipped ? "#141428" : "transparent", border: `1px solid ${equipped ? "#3a3a5e" : "transparent"}`, opacity: atSlotMax ? 0.4 : 1 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${equipped ? "#a855f7" : "#333"}`,
                              background: equipped ? "#a855f7" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", fontWeight: 700 }}>{equipped ? "✓" : ""}</div>
                            <span style={{ fontSize: 11, color: equipped ? "#e0e0ec" : "#888" }}>{spell.name}</span>
                          </div>
                          <div style={{ fontSize: 9, color: "#555", display: "flex", gap: 6 }}>
                            <span>T{spell.tier}</span><span>M{spell.memoryCost}</span>
                            {classData.spellCostType === "health" && <span style={{ color: "#a44" }}>-{spell.healthCost}HP</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 6, background: "#0b0b12", border: `1px solid ${totalMemoryCost > ds.memoryCapacity ? "#f87171" : "#1e1e2e"}`, borderRadius: 5, padding: "6px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: totalMemoryCost > ds.memoryCapacity ? "#f87171" : "#4ade80" }}>
                      Memory: {totalMemoryCost} / {ds.memoryCapacity}
                    </span>
                    {totalMemoryCost > ds.memoryCapacity && <span style={{ fontSize: 10, color: "#f87171", fontWeight: 600 }}>⚠ Over by {totalMemoryCost - ds.memoryCapacity}</span>}
                    {totalMemoryCost <= ds.memoryCapacity && <span style={{ fontSize: 10, color: totalMemoryCost === ds.memoryCapacity ? "#f59e0b" : "#4ade80" }}>{ds.memoryCapacity - totalMemoryCost} remaining</span>}
                  </div>
                  <div style={{ height: 5, background: "#1a1a2e", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(100, (totalMemoryCost / ds.memoryCapacity) * 100)}%`,
                      background: totalMemoryCost > ds.memoryCapacity ? "#f87171" : totalMemoryCost === ds.memoryCapacity ? "#f59e0b" : "#4ade80", transition: "width 0.2s" }} />
                  </div>
                </div>
              </Collapsible>
            )}

            <Collapsible title="Religion" color="#6366f1" badge={religion !== "none" ? RELIGION_BLESSINGS.find(b => b.id === religion)?.name.replace("Blessing of ", "") : "None"}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
                <select value={religion} onChange={(e) => setReligion(e.target.value)} style={{ ...styles.select, minWidth: 200, fontSize: 11 }}>
                  {RELIGION_BLESSINGS.map(b => <option key={b.id} value={b.id}>{b.name}{b.description ? ` — ${b.description}` : ""}</option>)}
                </select>
                {religion !== "none" && (() => {
                  const b = RELIGION_BLESSINGS.find(x => x.id === religion);
                  return b ? <div style={{ fontSize: 10, color: "#888" }}>
                    {b.description}
                    {b.verification === "NOT_TESTED" && <span style={{ color: "#a86b32", fontSize: 9, marginLeft: 6 }}>UNVERIFIED</span>}
                  </div> : null;
                })()}
              </div>
            </Collapsible>
          </Panel>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: fc > 0 ? "#f66" : "#4a8", fontWeight: 600 }}>{fc > 0 ? "⚠" : "✓"} {pc}/{tests.length} tests</span>
              <button onClick={() => setShowTests(showTests ? null : tests)} style={{ background: "none", border: "1px solid #1e1e2e", color: "#555", padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontFamily: "inherit", fontSize: 9 }}>{showTests ? "Hide" : "Show"}</button>
              <button onClick={() => setShowDebug(!showDebug)} style={{ background: "none", border: "1px solid #1e1e2e", color: "#555", padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontFamily: "inherit", fontSize: 9 }}>{showDebug ? "Hide" : "Show"} Debug</button>
              <button onClick={() => {
                const snapshot = {
                  class: selectedClass,
                  religion,
                  weaponHeld: weapon,
                  selectedPerks,
                  selectedSkills,
                  selectedSpells,
                  activeBuffs: Object.keys(activeBuffs).filter(k => activeBuffs[k]),
                  target,
                  attrs: computed.attrs,
                  attrBreakdown,
                  bonuses: computed.bonuses,
                  activeWeapon: computed.activeWeapon,
                  derived: ds,
                  gear,
                };
                const json = JSON.stringify(snapshot, null, 2);
                (navigator.clipboard?.writeText?.(json) ?? Promise.reject()).catch(() => {
                  // Fallback: dump to console so the user can copy manually
                  console.log("[debug snapshot]\n" + json);
                  alert("Clipboard blocked — snapshot logged to console.");
                });
              }} style={{ background: "none", border: "1px solid #1e1e2e", color: "#555", padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontFamily: "inherit", fontSize: 9 }}>Copy Debug JSON</button>
            </div>
            {showTests && (
              <div style={{ background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 6, padding: 8, maxHeight: 200, overflowY: "auto", fontSize: 10 }}>
                {showTests.map((t, i) => <div key={i} style={{ padding: "2px 0", color: t.status === "PASS" ? "#4a8" : "#f66" }}>{t.status === "PASS" ? "✓" : "✗"} {t.name}{t.status === "FAIL" && <span style={{ color: "#a66" }}> — exp {t.expected}, got {t.got}</span>}</div>)}
              </div>
            )}
            {showDebug && <pre style={{ marginTop: 8, background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 6, padding: 8, fontSize: 9, overflow: "auto", maxHeight: 300, color: "#888" }}>{JSON.stringify({ attrs: computed.attrs, bonuses: computed.bonuses, derived: ds, target }, null, 2)}</pre>}
          </div>
        </div>

        {/* ═══ RIGHT PANEL: STATS + EQUIPMENT ═══ */}
        <div>

          <Panel title="Attributes" color="#4ade80">
            <div style={{ fontSize: 9, color: "#444", marginBottom: 6 }}>Hover for source breakdown</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["str", "vig", "agi", "dex", "wil", "kno", "res"].map(a => (
                <AttrTooltip key={a} breakdown={attrBreakdown} attrKey={a} className={classData.name}>
                  <div style={{ padding: "4px 10px", background: "#0a1a10", border: "1px solid #1a3a1a", borderRadius: 4, fontSize: 12, color: "#4ade80", cursor: "default", display: "flex", gap: 4, alignItems: "baseline" }}>
                    <span style={{ fontWeight: 700, fontSize: 11, color: "#555" }}>{a.toUpperCase()}</span>
                    <span style={{ fontWeight: 700 }}>{computed.attrs[a]}</span>
                    <span style={{ fontSize: 9, color: "#333" }}>({classData.baseStats[a]})</span>
                  </div>
                </AttrTooltip>
              ))}
            </div>
          </Panel>

          <Panel title={`${classData.name} — Key Stats`} color="#4ade80">
            {majorStatIds.map(id => renderDerivedStat(id))}
          </Panel>

          <Panel>
            <Collapsible title="Other Stats" color="#555" badge={`${minorStatIds.length} stats`}>
              {minorStatIds.map(id => renderDerivedStat(id))}
            </Collapsible>
          </Panel>

          <Panel title={
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.15em" }}>Equipment</span>
              <button onClick={() => setGearCollapsed(!gearCollapsed)} style={{ ...styles.addBtn }}>{gearCollapsed ? "Expand" : "Collapse"}</button>
            </span>
          }>
            {!gearCollapsed && ALL_SLOTS.map(s => <GearSlot key={s.key} slotDef={s} gear={gear} onGearChange={handleGearChange} />)}
            {gearCollapsed && <div style={{ fontSize: 10, color: "#444", padding: "4px 0" }}>
              {ALL_SLOTS.map(s => { const item = s.isWeapon ? gear[s.key]?.primary : gear[s.key]; return item ? item.name : null; }).filter(Boolean).join(" · ")}
            </div>}
          </Panel>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: "12px 0", borderTop: "1px solid #1e1e2e", fontSize: 10, color: "#444" }}>v0.5.0 · {tests.length} tests · Target property editor</div>
    </div>
  );
}

export default App;
