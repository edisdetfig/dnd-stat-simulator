// Simulator app — state, the engine memo seam, and panel composition.
// Panels live in src/components/panels/*.jsx (plan §2 architecture).

import { useState, useMemo, useCallback } from 'react';
import { ThemeProvider } from './styles/ThemeProvider.jsx';
import { defaultTheme } from './styles/theme.js';
import { bloodTitheTheme } from './styles/themes/blood-tithe.js';
import {
  buildEngineContext, runEffectPipeline, runTargetPipeline,
  computeDerivedStats, getAvailableSpells,
} from './engine/index.js';
import { getClass } from './data/classes/index.js';
import { RELIGION_BLESSINGS } from './data/religions.js';
import { EXAMPLE_BUILDS, defaultStateForClass } from './data/example-builds.js';
import { ClassPicker } from './components/ClassPicker.jsx';
import { Header } from './components/panels/Header.jsx';
import { AttributesPanel } from './components/panels/AttributesPanel.jsx';
import { DerivedStatsPanel } from './components/panels/DerivedStatsPanel.jsx';
import { GearPanel } from './components/panels/GearPanel.jsx';
import { PerksPanel } from './components/panels/PerksPanel.jsx';
import { SkillsPanel } from './components/panels/SkillsPanel.jsx';
import { SpellsPanel } from './components/panels/SpellsPanel.jsx';
import { ActiveBuffsPanel } from './components/panels/ActiveBuffsPanel.jsx';
import { LiveStatePanel } from './components/panels/LiveStatePanel.jsx';
import { ReligionPanel } from './components/panels/ReligionPanel.jsx';
import { TargetPanelWrapper } from './components/panels/TargetPanelWrapper.jsx';
import { DebugPanel } from './components/panels/DebugPanel.jsx';

const THEMES = { default: defaultTheme, "blood-tithe": bloodTitheTheme };

export default function App() {
  const [state, setState] = useState(() => defaultStateForClass(null));

  const theme = THEMES[state.theme] ?? defaultTheme;
  const classData = state.classId ? getClass(state.classId) : null;

  if (!classData) {
    return (
      <ThemeProvider theme={theme}>
        <ClassPicker onSelect={(id) => setState(defaultStateForClass(id))} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Simulator state={state} setState={setState} classData={classData} />
    </ThemeProvider>
  );
}

function Simulator({ state, setState, classData }) {
  const religion = state.religionId
    ? RELIGION_BLESSINGS.find(r => r.id === state.religionId)
    : null;

  // The seam: single memo runs both pipelines + derived stats.
  const { ctx, pipeline, enemyPipeline, ds, availableSpells } = useMemo(() => {
    const ctx = buildEngineContext({ ...state, classData, religion });
    const pipeline = runEffectPipeline(ctx);
    const enemyPipeline = runTargetPipeline(ctx);
    const ds = computeDerivedStats(pipeline.finalAttrs, pipeline.finalBonuses, pipeline.capOverrides);
    const availableSpells = getAvailableSpells(ctx);
    return { ctx, pipeline, enemyPipeline, ds, availableSpells };
  }, [state, classData, religion]);

  const patch = useCallback((delta) =>
    setState((s) => ({ ...s, ...(typeof delta === "function" ? delta(s) : delta) })),
  [setState]);

  const togglePerk = useCallback((id) => patch((s) => ({
    selectedPerks: s.selectedPerks.includes(id)
      ? s.selectedPerks.filter(p => p !== id)
      : [...s.selectedPerks, id].slice(-classData.maxPerks),
  })), [patch, classData.maxPerks]);

  const toggleSkill = useCallback((id) => patch((s) => ({
    selectedSkills: s.selectedSkills.includes(id)
      ? s.selectedSkills.filter(p => p !== id)
      : [...s.selectedSkills, id].slice(-classData.maxSkills),
  })), [patch, classData.maxSkills]);

  const toggleSpell = useCallback((id) => patch((s) => ({
    selectedSpells: s.selectedSpells.includes(id)
      ? s.selectedSpells.filter(p => p !== id)
      : [...s.selectedSpells, id],
  })), [patch]);

  const toggleBuff = useCallback((id) =>
    patch((s) => ({ activeBuffs: { ...s.activeBuffs, [id]: !s.activeBuffs[id] } })),
  [patch]);

  const setStacks = useCallback((id, n) =>
    patch((s) => ({ selectedStacks: { ...s.selectedStacks, [id]: n } })),
  [patch]);

  const setAbilityTargetMode = useCallback((id, mode) =>
    patch((s) => ({ abilityTargetMode: { ...s.abilityTargetMode, [id]: mode } })),
  [patch]);

  const setGearSlot = useCallback((slotKey, value) =>
    patch((s) => ({ gear: { ...s.gear, [slotKey]: value } })),
  [patch]);

  const setWeaponHeld = useCallback((held) => patch({ weaponHeldState: held }), [patch]);

  const loadExample = useCallback((id) => {
    const ex = EXAMPLE_BUILDS.find(b => b.id === id);
    if (ex) setState(ex.build());
  }, [setState]);

  const loadedExample = useMemo(() =>
    EXAMPLE_BUILDS.find(b => b.id === state.id && b.classId === state.classId),
  [state.id, state.classId]);

  const toggleableBuffs = useMemo(() => {
    const selectedSet = new Set([...state.selectedSkills, ...state.selectedSpells]);
    const out = [];
    for (const a of classData.skills ?? [])
      if (a.activation === "toggle" && selectedSet.has(a.id)) out.push({ ability: a, source: "skill" });
    for (const a of classData.spells ?? [])
      if (a.activation === "toggle" && selectedSet.has(a.id)) out.push({ ability: a, source: "spell" });
    return out;
  }, [classData, state.selectedSkills, state.selectedSpells]);

  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      minHeight: "100vh",
      background: "var(--sim-surface-void)",
      color: "var(--sim-text-body)",
      padding: "12px 18px 28px",
      boxSizing: "border-box",
    }}>
      <Header
        className={classData.name}
        onHome={() => setState(defaultStateForClass(null))}
        examples={EXAMPLE_BUILDS.filter(b => b.classId === state.classId)}
        loaded={loadedExample}
        onLoadExample={loadExample}
      />

      <div style={{
        display: "grid",
        gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1fr)",
        gap: 14, marginTop: 12,
      }}>
        {/* Left column: what the user adjusts. */}
        <Column>
          <TargetPanelWrapper target={state.target} patchState={patch} />
          <LiveStatePanel state={state} patchState={patch} />
          <PerksPanel classData={classData} selected={state.selectedPerks} toggle={togglePerk}
            selectedStacks={state.selectedStacks} setStacks={setStacks} />
          <SkillsPanel
            classData={classData}
            selected={state.selectedSkills}
            toggle={toggleSkill}
            selectedStacks={state.selectedStacks}
            setStacks={setStacks}
          />
          <SpellsPanel
            classData={classData}
            selected={state.selectedSpells}
            toggle={toggleSpell}
            availableSpells={availableSpells}
            selectedStacks={state.selectedStacks}
            setStacks={setStacks}
          />
          <ReligionPanel state={state} patchState={patch} />
        </Column>

        {/* Right column: what the engine computes + dev surface. */}
        <Column>
          <AttributesPanel attrs={pipeline.finalAttrs} base={classData.baseStats} />
          <DerivedStatsPanel ds={ds} />
          <GearPanel
            gear={state.gear}
            setGearSlot={setGearSlot}
            weaponHeldState={state.weaponHeldState}
            setWeaponHeld={setWeaponHeld}
          />
          <ActiveBuffsPanel
            toggleableBuffs={toggleableBuffs}
            activeBuffs={state.activeBuffs}
            toggleBuff={toggleBuff}
            abilityTargetMode={state.abilityTargetMode}
            setAbilityTargetMode={setAbilityTargetMode}
          />
          <DebugPanel ctx={ctx} pipeline={pipeline} enemyPipeline={enemyPipeline} ds={ds} />
        </Column>
      </div>
    </div>
  );
}

function Column({ children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>;
}
