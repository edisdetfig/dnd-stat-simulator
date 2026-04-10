// Main App — full character simulator
// Migrated from index.old.html lines 1987-2626 (Phase 5: UI extraction).
// Architectural changes from the monolith:
//   - Buffs derived from spell defs (no CLASS_BUFFS map); see availableBuffs useMemo.
//   - Perk effects read from new shape (perkDef.statEffects, .typeDamageBonus, .passiveEffects, .capOverrides, .healingMod).
//   - Effect phases use EFFECT_PHASES constants (PRE_CURVE_FLAT, POST_CURVE, TYPE_DAMAGE_BONUS).
//   - PDR/MDR cap references now use CAPS.pdr / CAPS.mdr (was CONSTANTS.PDR_CAP/MDR_CAP).

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

// Data
import {
  CAPS,
  CORE_ATTRS,
  EFFECT_PHASES,
  TARGETING,
  TARGET_PRESETS,
  FALLBACK_MAJOR_STATS,
  GAME_VERSION,
  APP_VERSION,
} from './data/constants.js';
import { derivedLabel, STAT_META } from './data/stat-meta.js';
import { CLASSES, EMPTY_CLASS_STUB } from './data/classes/index.js';
import { RELIGION_BLESSINGS } from './data/religions.js';
import { makeEmptyGear } from './data/gear-defaults.js';
import { getExampleBuildsForClass } from './data/example-builds.js';

// Engine
import { TIER_COLORS } from './styles/theme.js';
import { aggregateGear, computeAttrBreakdown } from './engine/aggregator.js';
import { computeDerivedStats } from './engine/derived-stats.js';
import {
  calcPhysicalMeleeDamage,
  calcSpellDamage,
  calcHealing,
  HEALING_ITEMS,
  calcFormAttackDamage,
} from './engine/damage.js';
import { runTests } from './engine/tests.js';
import { STAT_CURVES, evaluateCurve } from './engine/curves.js';

// Styles & Themes
import { styles, defaultTheme } from './styles/theme.js';
import { ThemeProvider } from './styles/ThemeProvider.jsx';
import { THEMES } from './styles/themes/index.js';

// Format helpers
import { fmtPct } from './utils/format.js';
import { encodeBuild, decodeBuild, resolveTheme } from './utils/build-url.js';

// Components
import { Panel } from './components/ui/Panel.jsx';
import { Collapsible } from './components/ui/Collapsible.jsx';
import { InfoTip } from './components/ui/InfoTip.jsx';
import { AttrTooltip } from './components/ui/AttrTooltip.jsx';
import { SR, CapSR, SubSR } from './components/stats/StatRows.jsx';
import { CurveChart } from './components/charts/CurveChart.jsx';
import { MarginalBadge } from './components/charts/MarginalBadge.jsx';
import { ClassPicker } from './components/ClassPicker.jsx';
import { ExampleBuildPicker } from './components/ExampleBuildPicker.jsx';
import { TargetEditor } from './components/TargetEditor.jsx';
import { GearSlot } from './components/gear/GearSlot.jsx';
import { ALL_SLOTS } from './components/gear/slots.js';

// Armor slot ids used by the unarmed-true-damage gather. Must mirror the keys
// in ALL_SLOTS minus the weapon slots.
const ARMOR_SLOT_KEYS = ["head", "chest", "back", "hands", "legs", "feet", "ring1", "ring2", "necklace"];

// Decode URL hash at module load to seed initial state (avoids flash).
// Discard if the class ID doesn't exist in CLASSES.
const _rawBuild = decodeBuild(window.location.hash.replace(/^#/, ''));
const _initBuild = _rawBuild && CLASSES[_rawBuild.class] ? _rawBuild : null;
const _initTheme = _initBuild ? (resolveTheme(_initBuild.theme) || defaultTheme) : defaultTheme;

function App() {
  const [showTests, setShowTests] = useState(null);
  const [weapon, setWeapon] = useState(_initBuild?.weapon ?? "none");
  const [showDebug, setShowDebug] = useState(false);
  const [gear, setGear] = useState(() => _initBuild?.gear ?? makeEmptyGear());
  const [gearCollapsed, setGearCollapsed] = useState(false);
  const [activeBuffs, setActiveBuffs] = useState(() => { if (!_initBuild) return {}; const buffs = {}; for (const id of _initBuild.buffs) buffs[id] = true; return buffs; });
  const [religion, setReligion] = useState(_initBuild?.religion ?? "none");
  const [useAcronyms, setUseAcronyms] = useState(true);
  const [expandedCurve, setExpandedCurve] = useState(null);

  // v0.5.0 — Target properties (internal decimals)
  const [target, setTarget] = useState(() => _initBuild?.target ?? { pdr: -0.22, mdr: 0.075, headshotDR: 0 });

  // selectedClass === null means the picker takeover is shown. All other
  // build state stays empty until a class is chosen.
  const [selectedClass, setSelectedClass] = useState(_initBuild?.class ?? null);
  const [selectedPerks, setSelectedPerks] = useState(() => { if (!_initBuild) return []; const cd = CLASSES[_initBuild.class]; return _initBuild.perks.filter(id => cd.perks.some(p => p.id === id)); });
  const [selectedSkills, setSelectedSkills] = useState(() => { if (!_initBuild) return []; const cd = CLASSES[_initBuild.class]; return _initBuild.skills.filter(id => cd.skills.some(s => s.id === id)); });
  const [selectedSpells, setSelectedSpells] = useState(() => { if (!_initBuild) return []; const cd = CLASSES[_initBuild.class]; return _initBuild.spells.filter(id => cd.spells.some(s => s.id === id)); });
  // Tracks which example preset is currently loaded so the picker trigger
  // can display its name + subtitle. Cleared on class change / reset.
  const [loadedExampleId, setLoadedExampleId] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(_initTheme);
  const [selectedTransformations, setSelectedTransformations] = useState(() => {
    if (!_initBuild) return [];
    const cd = CLASSES[_initBuild.class];
    if (!cd.transformations) return [];
    return _initBuild.transformations.filter(id => cd.transformations.some(t => t.id === id));
  });
  const [activeForm, setActiveForm] = useState(() => {
    if (!_initBuild?.activeForm) return null;
    const cd = CLASSES[_initBuild.class];
    if (!cd.transformations?.some(t => t.id === _initBuild.activeForm)) return null;
    return _initBuild.activeForm;
  });
  const [linkCopied, setLinkCopied] = useState(false);

  // Stub fallback lets the hooks below run unconditionally before the
  // ClassPicker early-return.
  const classData = CLASSES[selectedClass] || EMPTY_CLASS_STUB;

  // URL sync: debounced replaceState keeps the hash in sync with build state
  const urlTimer = useRef(null);
  useEffect(() => {
    if (!selectedClass) {
      if (window.location.hash) history.replaceState(null, '', window.location.pathname);
      return;
    }
    clearTimeout(urlTimer.current);
    urlTimer.current = setTimeout(() => {
      const fragment = encodeBuild({
        selectedClass, weapon, religion, selectedPerks, selectedSkills,
        selectedSpells, activeBuffs, selectedTransformations, activeForm,
        target, gear, currentTheme,
      });
      history.replaceState(null, '', '#' + fragment);
    }, 400);
    return () => clearTimeout(urlTimer.current);
  }, [selectedClass, weapon, religion, selectedPerks, selectedSkills, selectedSpells, activeBuffs, selectedTransformations, activeForm, target, gear, currentTheme]);

  const tests = useMemo(() => runTests(), []);
  const pc = tests.filter(t => t.status === "PASS").length;
  const fc = tests.filter(t => t.status === "FAIL").length;

  const handleGearChange = useCallback((slot, data) => setGear(prev => ({ ...prev, [slot]: data })), []);
  const toggleBuff = useCallback((buffId) => setActiveBuffs(prev => ({ ...prev, [buffId]: !prev[buffId] })), []);
  const toggleTransformation = useCallback((formId) => {
    setSelectedTransformations(prev => {
      if (prev.includes(formId)) {
        if (activeForm === formId) setActiveForm(null);
        return prev.filter(f => f !== formId);
      }
      const maxSlots = classData?.skills?.find(s => s.type === "shapeshift_memory")?.shapeshiftSlots || 5;
      if (prev.length >= maxSlots) return prev;
      return [...prev, formId];
    });
  }, [classData, activeForm]);
  const handleSetActiveForm = useCallback((formId) => {
    setActiveForm(prev => prev === formId ? null : formId);
  }, []);
  const togglePerk = useCallback((perkId) => {
    setSelectedPerks(prev => {
      if (prev.includes(perkId)) return prev.filter(p => p !== perkId);
      if (prev.length >= (classData?.maxPerks || 4)) return prev;
      // Enforce perk constraints when selecting
      const perkDef = classData.perks.find(p => p.id === perkId);
      if (perkDef?.disablesShapeshift) {
        setSelectedTransformations([]);
        setActiveForm(null);
      }
      if (perkDef?.disablesSpiritSpells) {
        const spiritIds = new Set((classData.spells || []).filter(s => s.isSpirit).map(s => s.id));
        setSelectedSpells(prev2 => prev2.filter(id => !spiritIds.has(id)));
      }
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
  // Reset the entire build state to a fresh empty loadout (gear, weapon,
  // religion, perks, skills, spells, buffs). Called by the class picker and
  // example-build loader so switching contexts never leaves stale state.
  const resetBuildState = useCallback(() => {
    setGear(makeEmptyGear());
    setWeapon("none");
    setReligion("none");
    setSelectedPerks([]);
    setSelectedSkills([]);
    setSelectedSpells([]);
    setActiveBuffs({});
    setSelectedTransformations([]);
    setActiveForm(null);
    setLoadedExampleId(null);
    setCurrentTheme(defaultTheme);
  }, []);

  // Does the current build have anything worth warning about before reset?
  // True if any perks/skills/spells are picked, any buffs active, weapon or
  // religion changed from default, or any gear slot is populated.
  const isBuildDirty = useCallback(() => {
    if (selectedPerks.length > 0) return true;
    if (selectedSkills.length > 0) return true;
    if (selectedSpells.length > 0) return true;
    if (Object.values(activeBuffs).some(Boolean)) return true;
    if (selectedTransformations.length > 0) return true;
    if (activeForm) return true;
    if (weapon !== "none") return true;
    if (religion !== "none") return true;
    for (const slotDef of ALL_SLOTS) {
      const slot = gear[slotDef.key];
      if (slot == null) continue;
      if (slotDef.isWeapon ? (slot.primary || slot.secondary) : slot.id) return true;
    }
    return false;
  }, [selectedPerks, selectedSkills, selectedSpells, activeBuffs, selectedTransformations, activeForm, weapon, religion, gear]);

  // Pick a class from the ClassPicker takeover. Called when selectedClass is
  // null and the user clicks a class card.
  const handlePickClass = useCallback((classId) => {
    resetBuildState();
    setSelectedClass(classId);
  }, [resetBuildState]);

  // Return to the ClassPicker takeover. If the user has in-progress work,
  // confirm before discarding it.
  const handleChangeClass = useCallback(() => {
    if (isBuildDirty() && !window.confirm("Switching class will discard your current build. Continue?")) return;
    resetBuildState();
    setSelectedClass(null);
  }, [isBuildDirty, resetBuildState]);

  // Load a pre-made example build from src/data/example-builds.js. Calls the
  // preset's `build()` factory each time to produce a fresh deep copy.
  const handleLoadExample = useCallback((exampleId) => {
    const ex = getExampleBuildsForClass(selectedClass).find((b) => b.id === exampleId);
    if (!ex) return;
    if (isBuildDirty() && loadedExampleId !== exampleId &&
        !window.confirm("Loading an example will discard your current build. Continue?")) return;
    const built = ex.build();
    setGear(built.gear);
    setWeapon(built.weapon);
    setReligion(built.religion);
    setSelectedPerks(built.selectedPerks);
    setSelectedSkills(built.selectedSkills);
    setSelectedSpells(built.selectedSpells);
    setActiveBuffs(built.activeBuffs);
    setSelectedTransformations(built.selectedTransformations || []);
    setActiveForm(built.activeForm || null);
    setLoadedExampleId(exampleId);
    setCurrentTheme(ex.theme ? (THEMES[ex.theme] || defaultTheme) : defaultTheme);
  }, [selectedClass, isBuildDirty, loadedExampleId]);

  const handleSkillChange = useCallback((slotIndex, skillId) => {
    setSelectedSkills(prev => {
      const next = [...prev];
      if (skillId === "") next.splice(slotIndex, 1);
      else if (slotIndex < next.length) next[slotIndex] = skillId;
      else next.push(skillId);
      return next;
    });
  }, []);

  // Stable identity (empty deps) so MarginalBadge's React.memo holds across
  // App re-renders. Each badge passes its own statId on click.
  const handleCurveToggle = useCallback((id) => {
    setExpandedCurve(prev => prev === id ? null : id);
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

  const shapeshiftSlots = useMemo(() => {
    return selectedSkills.filter(sk => {
      const skDef = (classData?.skills || []).find(s => s.id === sk);
      return skDef?.type === "shapeshift_memory";
    }).reduce((sum, sk) => {
      const skDef = (classData?.skills || []).find(s => s.id === sk);
      return sum + (skDef?.shapeshiftSlots || 0);
    }, 0);
  }, [classData, selectedSkills]);

  const hasDisablesShapeshift = useMemo(() =>
    selectedPerks.some(id => classData.perks.find(p => p.id === id)?.disablesShapeshift),
    [selectedPerks, classData]
  );
  const hasDisablesSpiritSpells = useMemo(() =>
    selectedPerks.some(id => classData.perks.find(p => p.id === id)?.disablesSpiritSpells),
    [selectedPerks, classData]
  );

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

    // Active transformation form — apply stat modifiers with cap awareness
    let activeFormDef = null;
    if (activeForm && classData.transformations) {
      const formDef = classData.transformations.find(t => t.id === activeForm);
      if (formDef) {
        activeFormDef = formDef;
        for (const mod of formDef.statModifiers) {
          if (mod.stat === "maxHealthBonus") {
            // Multiplicative: scale existing health
            ds.health = Math.ceil(ds.health * (1 + mod.value));
          } else if (mod.stat === "physicalDamageReduction") {
            ds.pdr = Math.min(ds.pdrCap, ds.pdr + mod.value);
          } else if (mod.stat === "magicalDamageReduction") {
            ds.mdr = Math.min(ds.mdrCap, ds.mdr + mod.value);
          } else {
            // Flat additive or display-only stats
            ds[mod.stat] = (ds[mod.stat] || 0) + mod.value;
          }
        }
      }
    }

    // Shapeshift-only perk effects (e.g., Enhanced Wildness) — only when a form is active
    if (activeForm) {
      for (const perkId of selectedPerks) {
        const perkDef = classData.perks.find(p => p.id === perkId);
        if (!perkDef?.shapeshiftOnly) continue;
        for (const eff of (perkDef.statEffects || [])) {
          if (eff.stat === "armorRating") {
            // AR affects PDR through the curve — for now add directly as it's post-curve
            ds.armorRating = (ds.armorRating || 0) + eff.value;
          }
          ds[eff.stat] = (ds[eff.stat] || 0) + eff.value;
        }
      }
    }

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

    return { attrs, bonuses, ds, activeWeapon, activeFormDef };
  }, [weapon, gear, activeBuffs, religion, selectedPerks, selectedClass, classData, availableBuffs, activeForm]);

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
    onToggle={handleCurveToggle} />;

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
      <div key={`${source}-${di}`} style={styles.dmgHealRow}>
        <span style={styles.dmgHealLabel}>{source} · {d.label} · {d.base}({d.scaling}){magDmg > 0 ? `+${magDmg}wpn` : ""}{typeBonus > 0 ? ` +${Math.round(typeBonus*100)}%` : ""} {(d.damageType || "").replace("_magical", "")}</span>
        <span style={{ fontSize: 11 }}>
          <span style={{ color: "var(--sim-damage-type-magical-value)", fontWeight: 500 }}>{bodyDmg}</span>
          {headDmg != null && <span style={{ color: "var(--sim-text-dim)", marginLeft: 4 }}>/ {headDmg} head</span>}
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
        <div key={`perk-${perkId}-${hi}`} style={styles.dmgHealRow}>
          <span style={styles.dmgHealLabel}>
            {perkDef.name} · {h.label} · {h.baseHeal}({h.scaling})
            {h.scaling > 0 && ds.magicalHealingAdd > 0 ? ` +${ds.magicalHealingAdd}mh` : ""}
            {ds.healingMod > 0 ? ` ×${(1 + ds.healingMod).toFixed(1)}` : ""}
          </span>
          <span style={{ fontSize: 11, color: "var(--sim-damage-type-heal-value)", fontWeight: 500 }}>
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
      <div key={`item-${ii}`} style={styles.dmgHealRow}>
        <span style={styles.dmgHealLabel}>
          {item.name} · {item.baseHeal}({item.scaling}) {item.label}
          {ds.magicalHealingAdd > 0 ? ` +${ds.magicalHealingAdd}mh` : ""}
          {item.isHoT ? ` · ${ticks}s` : ""}
          {ds.healingMod > 0 ? ` ×${(1 + ds.healingMod).toFixed(1)}` : ""}
        </span>
        <span style={{ fontSize: 11, color: "var(--sim-damage-type-heal-value)", fontWeight: 500 }}>
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

  // Example builds available for the current class (if any) — drives the
  // "Load Example Build" control in the header.
  const classExamples = selectedClass ? getExampleBuildsForClass(selectedClass) : [];
  const loadedExample = loadedExampleId ? classExamples.find((b) => b.id === loadedExampleId) : null;

  // ═══ Render: ThemeProvider wraps both ClassPicker and simulator ═══
  if (!selectedClass) {
    return <ThemeProvider theme={currentTheme}><ClassPicker onSelect={handlePickClass} /></ThemeProvider>;
  }

  return (
    <ThemeProvider theme={currentTheme}>
    <div style={{ fontFamily: "'JetBrains Mono', monospace", background: "var(--sim-surface-void)", color: "var(--sim-text-body)", minHeight: "100vh", padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; } body { background: var(--sim-surface-void); }
        input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { opacity: 1; }
        select option:disabled { color: var(--sim-text-dim); font-weight: 600; background: var(--sim-surface-void); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--sim-border-hairline)", paddingBottom: 16, marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--sim-text-primary)", letterSpacing: "0.05em", textTransform: "uppercase" }}>D&D Simulator</h1>
          <div style={{ fontSize: 11, color: "var(--sim-text-dim)", marginTop: 4 }}>{GAME_VERSION.season} · {GAME_VERSION.hotfix} · {APP_VERSION}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div onClick={() => setUseAcronyms(!useAcronyms)} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", background: "var(--sim-surface-ink-raised)", border: "1px solid var(--sim-border-hairline)", borderRadius: 20, padding: "4px 12px" }}>
            <span style={{ fontSize: 10, color: "var(--sim-text-whisper)" }}>Labels:</span>
            <div style={{ width: 32, height: 16, borderRadius: 8, background: useAcronyms ? "var(--sim-border-focus)" : "var(--sim-surface-stone)", position: "relative", transition: "background 0.2s" }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: "var(--sim-text-primary)", position: "absolute", top: 2, left: useAcronyms ? 18 : 2, transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: 10, color: useAcronyms ? "var(--sim-border-focus)" : "var(--sim-text-whisper)", fontWeight: 600, minWidth: 36 }}>{useAcronyms ? "Short" : "Full"}</span>
          </div>
          {/* Current class display + Change Class button. Clicking the
              button returns to the ClassPicker takeover (with dirty confirm). */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--sim-surface-ink-raised)", border: "1px solid var(--sim-border-hairline)", borderRadius: 4, padding: "4px 10px" }}>
            <span style={{ fontSize: 10, color: "var(--sim-text-whisper)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Class</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--sim-accent-arcane-pale)" }}>{classData.name}</span>
            <button onClick={handleChangeClass}
              title="Return to the class picker"
              style={{ background: "none", border: "1px solid var(--sim-border-seam)", color: "var(--sim-text-dim)", padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontFamily: "inherit", fontSize: 9, marginLeft: 4 }}>
              ◀ Change
            </button>
          </div>

          {/* Load Example Build — only shown when presets exist for this class. */}
          {classExamples.length > 0 && (
            <ExampleBuildPicker
              examples={classExamples}
              loaded={loadedExample}
              onLoad={handleLoadExample}
            />
          )}
        </div>
      </div>

      {/* Legend for marginal badges */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, padding: "4px 8px", fontSize: 9, color: "var(--sim-text-whisper)", alignItems: "center" }}>
        <span style={{ color: "var(--sim-text-dim)" }}>Curve efficiency:</span>
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

          <Panel title="Weapon Held" color="var(--sim-stat-weapon)">
            <div style={{ display: "flex", gap: 6 }}>
              {[["none", "Bare Hands"], ["weaponSlot1", gear.weaponSlot1?.primary?.name || "Weapon 1"], ["weaponSlot2", gear.weaponSlot2?.primary?.name || "Weapon 2"]].map(([k, l]) => (
                <button key={k} onClick={() => setWeapon(k)} style={{
                  flex: 1, background: weapon === k ? "var(--sim-surface-shadow)" : "transparent",
                  border: `1px solid ${weapon === k ? "var(--sim-border-info)" : "var(--sim-border-hairline)"}`,
                  color: weapon === k ? "var(--sim-text-primary)" : "var(--sim-text-dim)", padding: "8px 12px", borderRadius: 4,
                  cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: weapon === k ? 600 : 400,
                }}>{l}</button>
              ))}
            </div>
          </Panel>

          {/* v0.5.0 — Target Property Editor */}
          <Panel title={<span>Target {"\u2014"} <span style={{ color: "var(--sim-accent-arcane-pale)", fontWeight: 500, textTransform: "none", letterSpacing: "normal" }}>{targetLabel}</span></span>} color="var(--sim-stat-magical)">
            <TargetEditor target={target} onChange={setTarget} />
          </Panel>

          {/* Active Form — shown when transformations are memorized */}
          {selectedTransformations.length > 0 && !hasDisablesShapeshift && (
            <Panel title="Shapeshift Form" color="var(--sim-stat-shapeshift)">
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                <button onClick={() => setActiveForm(null)}
                  style={{
                    flex: "1 1 0", minWidth: 0, padding: "8px 6px", borderRadius: 4,
                    cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: !activeForm ? 600 : 400,
                    background: !activeForm ? "var(--sim-surface-ink-raised)" : "transparent",
                    border: `1.5px solid ${!activeForm ? "var(--sim-stat-shapeshift)" : "var(--sim-border-hairline)"}`,
                    color: !activeForm ? "var(--sim-text-primary)" : "var(--sim-text-dim)",
                    transition: "all 0.15s", position: "relative", overflow: "hidden",
                  }}>
                  {!activeForm && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--sim-stat-shapeshift)" }} />}
                  Human
                </button>
                {selectedTransformations.map(formId => {
                  const form = classData.transformations.find(t => t.id === formId);
                  if (!form) return null;
                  const isActive = activeForm === formId;
                  return (
                    <button key={formId} onClick={() => handleSetActiveForm(formId)}
                      style={{
                        flex: "1 1 0", minWidth: 0, padding: "8px 6px", borderRadius: 4,
                        cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: isActive ? 600 : 400,
                        background: isActive ? "var(--sim-surface-ink-raised)" : "transparent",
                        border: `1.5px solid ${isActive ? "var(--sim-stat-shapeshift)" : "var(--sim-border-hairline)"}`,
                        color: isActive ? "var(--sim-text-primary)" : "var(--sim-text-dim)",
                        transition: "all 0.15s", position: "relative", overflow: "hidden",
                      }}>
                      {isActive && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "var(--sim-stat-shapeshift)" }} />}
                      {form.name}
                    </button>
                  );
                })}
              </div>
              {activeForm && computed.activeFormDef && (
                <div style={{ marginTop: 8, padding: "6px 8px", background: "var(--sim-surface-ink)", borderRadius: 4, border: "1px solid var(--sim-border-hairline)" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", fontSize: 10 }}>
                    {computed.activeFormDef.statModifiers.map((mod, i) => (
                      <span key={i} style={{ color: mod.value > 0 ? "var(--sim-accent-verdant-life)" : "var(--sim-accent-blood-ember)" }}>
                        {mod.value > 0 ? "+" : ""}{STAT_META[mod.stat]?.unit === "percent" ? `${Math.round(mod.value * 100)}%` : mod.value} {STAT_META[mod.stat]?.label || mod.stat}
                      </span>
                    ))}
                  </div>
                  {computed.activeFormDef.fixedAttackSpeed && (
                    <div style={{ fontSize: 9, color: "var(--sim-accent-flame-rust)", marginTop: 4 }}>Fixed attack speed (ignores Action Speed)</div>
                  )}
                  {computed.activeFormDef.wildSkill && (
                    <div style={{ fontSize: 9, color: "var(--sim-text-ghost)", marginTop: 4 }}>
                      Wild Skill: {computed.activeFormDef.wildSkill.name} — {computed.activeFormDef.wildSkill.desc}
                    </div>
                  )}
                </div>
              )}
            </Panel>
          )}

          {availableBuffs.length > 0 && (
            <Panel title="Active Buffs" color="var(--sim-stat-magical)">
              {availableBuffs.map(buff => {
                const active = !!activeBuffs[buff.id];
                return (
                  <div key={buff.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--sim-border-whisper)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => toggleBuff(buff.id)} style={{
                        width: 36, height: 20, flexShrink: 0, borderRadius: 10, border: "none", cursor: "pointer",
                        background: active ? "var(--sim-accent-verdant-moss)" : "var(--sim-surface-stone)", position: "relative", transition: "background 0.2s",
                      }}>
                        <div style={{ width: 14, height: 14, borderRadius: 7, background: active ? "var(--sim-accent-verdant-bright)" : "var(--sim-text-whisper)",
                          position: "absolute", top: 3, left: active ? 19 : 3, transition: "left 0.2s, background 0.2s" }} />
                      </button>
                      <div>
                        <div style={{ fontSize: 11, color: active ? "var(--sim-text-primary)" : "var(--sim-text-dim)", fontWeight: active ? 500 : 400 }}>{buff.name}</div>
                        <div style={{ fontSize: 9, color: "var(--sim-text-ghost)" }}>{buff.description}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 10, color: "var(--sim-text-whisper)" }}>
                      {buff.duration && <span>{buff.duration}</span>}
                      {buff.healthCost && <span style={{ color: "var(--sim-accent-blood-murmur)", marginLeft: 6 }}>-{buff.healthCost} HP</span>}
                    </div>
                  </div>
                );
              })}
              {Object.values(activeBuffs).some(v => v) && (() => {
                const totalHpCost = availableBuffs.filter(b => activeBuffs[b.id] && b.healthCost).reduce((sum, b) => sum + b.healthCost, 0);
                return totalHpCost > 0 ? <div style={{ fontSize: 10, color: "var(--sim-accent-blood-murmur)", marginTop: 4, textAlign: "right" }}>Total buff cast cost: -{totalHpCost} HP</div> : null;
              })()}
            </Panel>
          )}

          <Panel title={`Physical Damage — ${computed.activeWeapon ? computed.activeWeapon.name : "Bare Hands"} vs ${targetLabel}`} color="var(--sim-stat-physical)">
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
                      <div key={i} style={{ flex: 1, background: "var(--sim-damage-type-physical-well-frame)", border: "1px solid var(--sim-damage-type-physical-well-border)", borderRadius: 4, padding: "6px 8px" }}>
                        <div style={{ fontSize: 10, color: "var(--sim-text-dim)", textAlign: "center", marginBottom: 4 }}>{combos.length > 1 ? `Hit ${i + 1}` : "Hit"} {cm !== 1.0 && <span style={{ color: "var(--sim-text-whisper)" }}>×{cm}</span>}</div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <div style={{ flex: 1, background: "var(--sim-damage-type-physical-body-well)", borderRadius: 3, padding: "4px 0", textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "var(--sim-damage-type-physical-body-label)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Body</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--sim-damage-type-physical-body)" }}>{d}</div>
                          </div>
                          <div style={{ flex: 1, background: "var(--sim-damage-type-physical-head-well)", borderRadius: 3, padding: "4px 0", textAlign: "center" }}>
                            <div style={{ fontSize: 9, color: "var(--sim-damage-type-physical-head-label)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Head</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--sim-damage-type-physical-head)" }}>{dh}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {!computed.activeWeapon && <div style={{ fontSize: 9, color: "var(--sim-text-ghost)", marginTop: 4 }}>Unarmed base damage: 8 (verified)</div>}
            {target.pdr < 0 && ds.armorPenetration > 0 && (
              <div style={{ fontSize: 9, color: "var(--sim-accent-flame-rust)", marginTop: 4 }}>
                {"\u26a0"} Target has negative PDR {"\u2014"} your {fmtPct(ds.armorPenetration)} armor pen has no effect
              </div>
            )}
          </Panel>

          {/* Form attack damage — shown when a transformation is active */}
          {activeForm && computed.activeFormDef && computed.activeFormDef.attacks.length > 0 && (
            <Panel title={`${computed.activeFormDef.name} Form Attacks vs ${targetLabel}`} color="var(--sim-stat-shapeshift)">
              <div style={{ fontSize: 9, color: "var(--sim-text-ghost)", marginBottom: 6 }}>
                Primitive curve ({computed.activeFormDef.primitiveAttr ? computed.activeFormDef.primitiveAttr.toUpperCase() : "—"}{computed.activeFormDef.primitiveAttr ? ` ${computed.attrs[computed.activeFormDef.primitiveAttr] || 0}` : ""}) · PPB {fmtPct(ds.ppb)}
                <InfoTip text={"Form damage = (primitiveCurve(attr) × mult + add) × (1 + PowerBonus). WIKI-SOURCED — not yet verified in-game."} color="var(--sim-accent-flame-dim)" />
                <span style={{ color: "var(--sim-accent-flame-rust)", marginLeft: 6, fontSize: 8, fontWeight: 600 }}>UNVERIFIED</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {computed.activeFormDef.attacks.map(attack => {
                  const attr = computed.activeFormDef.primitiveAttr;
                  const attrVal = attr ? (computed.attrs[attr] || 0) : 0;
                  const primitiveCalc = attr ? evaluateCurve(STAT_CURVES.shapeshiftPrimitive, attrVal) : 0;
                  const baseDmg = primitiveCalc * attack.primitiveMultiplier + attack.primitiveAdd;
                  const isPhysical = attack.damageType === "physical";
                  const bodyDmg = calcFormAttackDamage({
                    baseDamage: baseDmg, scaling: attack.scaling, damageType: attack.damageType,
                    ppb: ds.ppb, mpb: ds.mpb,
                    targetPDR: target.pdr, targetMDR: target.mdr,
                    attackerArmorPen: ds.armorPenetration, attackerMagicPen: ds.magicPenetration,
                  });
                  return (
                    <div key={attack.id} style={{ flex: 1, background: "var(--sim-damage-type-form-attack-body-well)", border: "1px solid var(--sim-damage-type-form-attack-well-border)", borderRadius: 4, padding: "8px" }}>
                      <div style={{ fontSize: 10, color: "var(--sim-text-dim)", marginBottom: 2, fontWeight: 500 }}>{attack.name}</div>
                      <div style={{ fontSize: 9, color: "var(--sim-text-ghost)", marginBottom: 6 }}>
                        {attr ? `${attr.toUpperCase()} curve` : ""} ×{attack.primitiveMultiplier * 100}% + {attack.primitiveAdd}({attack.scaling})
                        {!isPhysical && <span style={{ marginLeft: 4, color: "var(--sim-damage-type-magical-value)" }}>{attack.damageType.replace("_magical", "")}</span>}
                      </div>
                      <div style={{ background: "var(--sim-damage-type-form-attack-body-well)", borderRadius: 3, padding: "6px 0", textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: "var(--sim-damage-type-form-attack-body-label)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Body</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "var(--sim-damage-type-form-attack-body)" }}>{bodyDmg}</div>
                      </div>
                      {attack.bleed && (
                        <div style={{ marginTop: 4, fontSize: 9, color: "var(--sim-accent-blood-murmur)" }}>
                          + {attack.bleed.damage}({attack.bleed.scaling}) bleed / {attack.bleed.duration}s
                        </div>
                      )}
                      {attack.plague && (
                        <div style={{ marginTop: 4, fontSize: 9, color: "var(--sim-accent-arcane-core)" }}>
                          + {attack.plague.damage}({attack.plague.scaling}) plague / {attack.plague.duration}s
                        </div>
                      )}
                      {attack.armorPenetration && (
                        <div style={{ marginTop: 4, fontSize: 9, color: "var(--sim-text-whisper)" }}>
                          {Math.round(attack.armorPenetration.base * 100)}% armor pen
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {allDmgLines.length > 0 && (
            <Panel title={`Spell & Skill Damage vs ${targetLabel}`} color="var(--sim-stat-physical)">
              <div style={{ fontSize: 9, color: "var(--sim-text-ghost)", marginBottom: 6 }}>MDR {fmtPct(target.mdr)}{magDmg > 0 ? ` · +${magDmg} Magical Damage from ${computed.activeWeapon?.name || "weapon"}` : ""}
                <InfoTip text={"Dmg = Base × (1 + MPB × Scaling + TypeBonus) × HitLoc × DR. The (1.0) is Scaling — at 1.0 you get full MPB benefit, at 0.5 only half. Type bonuses (e.g., Dark Enhancement) only apply to matching damage types."} color="var(--sim-accent-flame-dim)" />
              </div>
              {allDmgLines}
            </Panel>
          )}

          {allHealLines.length > 0 && (
            <Panel title="Healing" color="var(--sim-stat-healing)">
              <div style={{ fontSize: 9, color: "var(--sim-text-ghost)", marginBottom: 6 }}>
                Mag Heal: {ds.magicalHealingAdd || 0}
                {ds.healingMod > 0 ? ` · Healing Mod: +${Math.round(ds.healingMod * 100)}%` : ""}
                {ds.mpb > 0 ? ` · MPB: ${fmtPct(ds.mpb)}` : ""}
                <InfoTip text={"Heal = (Base + MagHeal × Scaling) × (1 + MPB × Scaling) × (1 + HealMod). The (0.5) after an ability is its Scaling — controls how much your stats contribute. MPB boosts magical healing (potions, spells), not just damage."} color="var(--sim-accent-verdant-moss)" />
              </div>
              {allHealLines}
            </Panel>
          )}

          <Panel title={`Build — ${classData.name}`} color="var(--sim-stat-build)">
            <Collapsible title="Perks" color="var(--sim-stat-build)" badgeBg="var(--sim-stat-build-badge)" badge={`${selectedPerks.length}/${classData.maxPerks}`} defaultOpen>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", padding: "4px 0" }}>
                {(classData.perks || []).map(perk => {
                  const active = selectedPerks.includes(perk.id);
                  const atMax = !active && selectedPerks.length >= classData.maxPerks;
                  return (
                    <div key={perk.id} onClick={() => !atMax && togglePerk(perk.id)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 6px", borderRadius: 4, cursor: atMax ? "not-allowed" : "pointer",
                        background: active ? "var(--sim-surface-ink-raised)" : "transparent", border: `1px solid ${active ? "var(--sim-border-edge)" : "transparent"}`, opacity: atMax ? 0.4 : 1 }}>
                      <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${active ? "var(--sim-accent-azure-pulse)" : "var(--sim-text-ghost)"}`,
                        background: active ? "var(--sim-accent-azure-pulse)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--sim-text-primary)", fontWeight: 700 }}>{active ? "✓" : ""}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: active ? "var(--sim-text-primary)" : "var(--sim-text-muted)", fontWeight: active ? 500 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{perk.name}</div>
                        <div style={{ fontSize: 9, color: "var(--sim-text-ghost)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{perk.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Collapsible>

            {(classData.skills || []).length > 0 && (
              <Collapsible title="Skills" color="var(--sim-stat-build)" badgeBg="var(--sim-stat-build-badge)" badge={`${selectedSkills.length} slots`} defaultOpen>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 0" }}>
                  {[0, 1].map(slot => (
                    <select key={slot} value={selectedSkills[slot] || ""} onChange={(e) => handleSkillChange(slot, e.target.value)}
                      style={{ ...styles.select, minWidth: 180, fontSize: 11 }}>
                      <option value="">— empty —</option>
                      {(classData.skills || []).filter(sk => !selectedSkills.includes(sk.id) || selectedSkills[slot] === sk.id)
                        .map(sk => <option key={sk.id} value={sk.id}>{sk.name}{sk.type === "spell_memory" ? ` (${sk.spellSlots} slots)` : sk.type === "shapeshift_memory" ? ` (${sk.shapeshiftSlots} forms)` : ""}</option>)}
                    </select>
                  ))}
                </div>
              </Collapsible>
            )}

            {(classData.spells || []).length > 0 && spellMemorySlots > 0 && (
              <Collapsible title="Spells" color="var(--sim-stat-build)" badgeBg="var(--sim-stat-build-badge)"
                badge={`${totalMemoryCost}/${ds.memoryCapacity} memory${totalMemoryCost > ds.memoryCapacity ? " ⚠" : ""}`} defaultOpen>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", padding: "4px 0" }}>
                  {(classData.spells || []).map(spell => {
                    const equipped = selectedSpells.includes(spell.id);
                    const atSlotMax = !equipped && selectedSpells.length >= spellMemorySlots;
                    const spiritDisabled = hasDisablesSpiritSpells && spell.isSpirit;
                    const disabled = atSlotMax || spiritDisabled;
                    return (
                      <div key={spell.id} onClick={() => !disabled && toggleSpell(spell.id)}
                        style={{ padding: "4px 6px", borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer",
                          background: equipped ? "var(--sim-surface-ink-raised)" : "transparent", border: `1px solid ${equipped ? "var(--sim-border-edge)" : "transparent"}`, opacity: disabled ? 0.4 : 1 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 3, border: `1px solid ${equipped ? "var(--sim-accent-arcane-core)" : "var(--sim-text-ghost)"}`,
                              background: equipped ? "var(--sim-accent-arcane-core)" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--sim-text-primary)", fontWeight: 700 }}>{equipped ? "✓" : ""}</div>
                            <span style={{ fontSize: 11, color: equipped ? "var(--sim-text-primary)" : "var(--sim-text-muted)" }}>{spell.name}</span>
                            {spell.isSpirit && <span style={{ fontSize: 8, color: "var(--sim-accent-arcane-muted)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginLeft: 4 }}>spirit</span>}
                          </div>
                          <div style={{ fontSize: 9, color: "var(--sim-text-whisper)", display: "flex", gap: 6 }}>
                            <span>T{spell.tier}</span><span>M{spell.memoryCost}</span>
                            {classData.spellCostType === "health" && <span style={{ color: "var(--sim-accent-blood-murmur)" }}>-{spell.healthCost}HP</span>}
                            {classData.spellCostType === "charges" && spell.maxCasts && <span style={{ color: "var(--sim-text-muted)" }}>×{spell.maxCasts}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 6, background: "var(--sim-surface-input)", border: `1px solid ${totalMemoryCost > ds.memoryCapacity ? "var(--sim-accent-blood-wound)" : "var(--sim-border-hairline)"}`, borderRadius: 5, padding: "6px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: totalMemoryCost > ds.memoryCapacity ? "var(--sim-accent-blood-wound)" : "var(--sim-accent-verdant-life)" }}>
                      Memory: {totalMemoryCost} / {ds.memoryCapacity}
                    </span>
                    {totalMemoryCost > ds.memoryCapacity && <span style={{ fontSize: 10, color: "var(--sim-accent-blood-wound)", fontWeight: 600 }}>⚠ Over by {totalMemoryCost - ds.memoryCapacity}</span>}
                    {totalMemoryCost <= ds.memoryCapacity && <span style={{ fontSize: 10, color: totalMemoryCost === ds.memoryCapacity ? "var(--sim-accent-flame-hot)" : "var(--sim-accent-verdant-life)" }}>{ds.memoryCapacity - totalMemoryCost} remaining</span>}
                  </div>
                  <div style={{ height: 5, background: "var(--sim-surface-shadow)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 3, width: `${Math.min(100, (totalMemoryCost / ds.memoryCapacity) * 100)}%`,
                      background: totalMemoryCost > ds.memoryCapacity ? "var(--sim-accent-blood-wound)" : totalMemoryCost === ds.memoryCapacity ? "var(--sim-accent-flame-hot)" : "var(--sim-accent-verdant-life)", transition: "width 0.2s" }} />
                  </div>
                </div>
              </Collapsible>
            )}

            {/* Transformation memory — shown when class has transformations and shapeshift_memory is equipped */}
            {(classData.transformations || []).length > 0 && shapeshiftSlots > 0 && !hasDisablesShapeshift && (
              <Collapsible title="Shapeshift Forms" color="var(--sim-stat-build)" badgeBg="var(--sim-stat-build-badge)"
                badge={`${selectedTransformations.length}/${shapeshiftSlots} forms`} defaultOpen>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, padding: "4px 0" }}>
                  {classData.transformations.filter(t => t.id !== "human").map(form => {
                    const memorized = selectedTransformations.includes(form.id);
                    const atMax = !memorized && selectedTransformations.length >= shapeshiftSlots;
                    return (
                      <div key={form.id} onClick={() => !atMax && toggleTransformation(form.id)}
                        style={{
                          padding: "6px 8px", borderRadius: 4,
                          cursor: atMax ? "not-allowed" : "pointer",
                          background: memorized ? "var(--sim-surface-ink-raised)" : "transparent",
                          border: `1px solid ${memorized ? "var(--sim-border-edge)" : "transparent"}`,
                          opacity: atMax ? 0.4 : 1,
                          transition: "background 0.15s, border-color 0.15s",
                        }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                            border: `1px solid ${memorized ? "var(--sim-stat-shapeshift)" : "var(--sim-text-ghost)"}`,
                            background: memorized ? "var(--sim-stat-shapeshift)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, color: "var(--sim-surface-void)", fontWeight: 700,
                          }}>{memorized ? "✓" : ""}</div>
                          <span style={{
                            fontSize: 11, fontWeight: memorized ? 500 : 400,
                            color: memorized ? "var(--sim-text-primary)" : "var(--sim-text-muted)",
                          }}>{form.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 4, fontSize: 9, color: "var(--sim-text-ghost)", padding: "2px 0" }}>
                  {selectedTransformations.length}/{shapeshiftSlots} forms memorized · Human form always available
                </div>
              </Collapsible>
            )}

            <Collapsible title="Religion" color="var(--sim-stat-build)" badgeBg="var(--sim-stat-build-badge)" badge={religion !== "none" ? RELIGION_BLESSINGS.find(b => b.id === religion)?.name.replace("Blessing of ", "") : "None"}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "4px 0" }}>
                <select value={religion} onChange={(e) => setReligion(e.target.value)} style={{ ...styles.select, minWidth: 200, fontSize: 11 }}>
                  {RELIGION_BLESSINGS.map(b => <option key={b.id} value={b.id}>{b.name}{b.description ? ` — ${b.description}` : ""}</option>)}
                </select>
                {religion !== "none" && (() => {
                  const b = RELIGION_BLESSINGS.find(x => x.id === religion);
                  return b ? <div style={{ fontSize: 10, color: "var(--sim-text-muted)" }}>
                    {b.description}
                    {b.verification === "NOT_TESTED" && <span style={{ color: "var(--sim-accent-flame-rust)", fontSize: 9, marginLeft: 6 }}>UNVERIFIED</span>}
                  </div> : null;
                })()}
              </div>
            </Collapsible>
          </Panel>

          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: fc > 0 ? "var(--sim-accent-blood-ember)" : "var(--sim-accent-verdant-pass)", fontWeight: 600 }}>{fc > 0 ? "⚠" : "✓"} {pc}/{tests.length} tests</span>
              <button onClick={() => setShowTests(showTests ? null : tests)} style={{ background: "none", border: "1px solid var(--sim-border-hairline)", color: "var(--sim-text-whisper)", padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontFamily: "inherit", fontSize: 9 }}>{showTests ? "Hide" : "Show"}</button>
              <button onClick={() => setShowDebug(!showDebug)} style={{ background: "none", border: "1px solid var(--sim-border-hairline)", color: "var(--sim-text-whisper)", padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontFamily: "inherit", fontSize: 9 }}>{showDebug ? "Hide" : "Show"} Debug</button>
              <button onClick={() => {
                const snapshot = {
                  class: selectedClass,
                  religion,
                  weaponHeld: weapon,
                  selectedPerks,
                  selectedSkills,
                  selectedSpells,
                  activeBuffs: Object.keys(activeBuffs).filter(k => activeBuffs[k]),
                  selectedTransformations,
                  activeForm,
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
              }} style={{ background: "none", border: "1px solid var(--sim-border-hairline)", color: "var(--sim-text-whisper)", padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontFamily: "inherit", fontSize: 9 }}>Copy Debug JSON</button>
              <button onClick={() => {
                (navigator.clipboard?.writeText?.(window.location.href) ?? Promise.reject())
                  .then(() => { setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); })
                  .catch(() => alert("Clipboard blocked — copy the URL from the address bar."));
              }} style={{ background: "none", border: `1px solid ${linkCopied ? "var(--sim-accent-verdant-pass)" : "var(--sim-border-hairline)"}`, color: linkCopied ? "var(--sim-accent-verdant-pass)" : "var(--sim-text-whisper)", padding: "2px 8px", borderRadius: 3, cursor: "pointer", fontFamily: "inherit", fontSize: 9, transition: "border-color 0.3s, color 0.3s" }}>{linkCopied ? "Copied!" : "Copy Build Link"}</button>
            </div>
            {showTests && (
              <div style={{ background: "var(--sim-surface-ink)", border: "1px solid var(--sim-border-hairline)", borderRadius: 6, padding: 8, maxHeight: 200, overflowY: "auto", fontSize: 10 }}>
                {showTests.map((t, i) => <div key={i} style={{ padding: "2px 0", color: t.status === "PASS" ? "var(--sim-accent-verdant-pass)" : "var(--sim-accent-blood-ember)" }}>{t.status === "PASS" ? "✓" : "✗"} {t.name}{t.status === "FAIL" && <span style={{ color: "var(--sim-accent-blood-whisper)" }}> — exp {t.expected}, got {t.got}</span>}</div>)}
              </div>
            )}
            {showDebug && <pre style={{ marginTop: 8, background: "var(--sim-surface-ink)", border: "1px solid var(--sim-border-hairline)", borderRadius: 6, padding: 8, fontSize: 9, overflow: "auto", maxHeight: 300, color: "var(--sim-text-muted)" }}>{JSON.stringify({ attrs: computed.attrs, bonuses: computed.bonuses, derived: ds, target }, null, 2)}</pre>}
          </div>
        </div>

        {/* ═══ RIGHT PANEL: STATS + EQUIPMENT ═══ */}
        <div>

          <Panel title="Attributes" color="var(--sim-stat-healing)">
            <div style={{ fontSize: 9, color: "var(--sim-text-ghost)", marginBottom: 6 }}>Hover for source breakdown</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["str", "vig", "agi", "dex", "wil", "kno", "res"].map(a => (
                <AttrTooltip key={a} breakdown={attrBreakdown} attrKey={a} className={classData.name}>
                  <div style={{ padding: "4px 10px", background: "var(--sim-accent-verdant-forest)", border: "1px solid var(--sim-accent-verdant-loam)", borderRadius: 4, fontSize: 12, color: "var(--sim-accent-verdant-life)", cursor: "default", display: "flex", gap: 4, alignItems: "baseline" }}>
                    <span style={{ fontWeight: 700, fontSize: 11, color: "var(--sim-text-whisper)" }}>{a.toUpperCase()}</span>
                    <span style={{ fontWeight: 700 }}>{computed.attrs[a]}</span>
                    <span style={{ fontSize: 9, color: "var(--sim-text-ghost)" }}>({classData.baseStats[a]})</span>
                  </div>
                </AttrTooltip>
              ))}
            </div>
          </Panel>

          <Panel title={`${classData.name} — Key Stats`} color="var(--sim-stat-healing)">
            {majorStatIds.map(id => renderDerivedStat(id))}
          </Panel>

          <Panel>
            <Collapsible title="Other Stats" color="var(--sim-text-whisper)" badge={`${minorStatIds.length} stats`}>
              {minorStatIds.map(id => renderDerivedStat(id))}
            </Collapsible>
          </Panel>

          <Panel title={
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "var(--sim-text-whisper)", textTransform: "uppercase", letterSpacing: "0.15em" }}>Equipment</span>
              <button onClick={() => setGearCollapsed(!gearCollapsed)} style={{ ...styles.addBtn }}>{gearCollapsed ? "Expand" : "Collapse"}</button>
            </span>
          }>
            {!gearCollapsed && ALL_SLOTS.map(s => <GearSlot key={s.key} slotDef={s} gear={gear} onGearChange={handleGearChange} />)}
            {gearCollapsed && <div style={{ fontSize: 10, color: "var(--sim-text-ghost)", padding: "4px 0" }}>
              {ALL_SLOTS.map(s => { const item = s.isWeapon ? gear[s.key]?.primary : gear[s.key]; return item ? item.name : null; }).filter(Boolean).join(" · ")}
            </div>}
          </Panel>
        </div>
      </div>

      <div style={{ marginTop: 20, padding: "12px 0", borderTop: "1px solid var(--sim-border-hairline)", fontSize: 10, color: "var(--sim-text-ghost)" }}>v0.5.0 · {tests.length} tests · Target property editor</div>
    </div>
    </ThemeProvider>
  );
}

export default App;
