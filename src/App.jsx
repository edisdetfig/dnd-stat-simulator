// Simulator app — fresh v3 authoring.
//
// One-way flow: state → buildEngineContext (the seam) → engine → derived
// stats → render. All user controls are toggles/sliders/selectors per the
// snapshot principle; the engine never reads temporal fields.
//
// ── Phase 1 scope ──
// This App.jsx wires the existing primitives (ClassPicker, ExampleBuildPicker,
// TargetEditor, GearSlot, Panel, StatRows) around the v3 state model so
// Warlock is fully functional end-to-end. Several richer UI surfaces are
// planned for Phase 2/3 and are marked TODO below with their target phase.

import { useState, useMemo, useCallback } from 'react';
import { ThemeProvider } from './styles/ThemeProvider.jsx';
import { defaultTheme } from './styles/theme.js';
import { bloodTitheTheme } from './styles/themes/blood-tithe.js';
import {
  buildEngineContext,
  runEffectPipeline,
  computeDerivedStats,
  getAvailableSpells,
} from './engine/index.js';
import { getClass } from './data/classes/index.js';
import { RELIGION_BLESSINGS } from './data/religions.js';
import { EXAMPLE_BUILDS, defaultStateForClass } from './data/example-builds.js';
import { STAT_META, derivedLabel } from './data/stat-meta.js';
import { ClassPicker } from './components/ClassPicker.jsx';
import { ExampleBuildPicker } from './components/ExampleBuildPicker.jsx';
import { TargetEditor } from './components/TargetEditor.jsx';
import { GearSlot } from './components/gear/GearSlot.jsx';
import { ALL_SLOTS } from './components/gear/slots.js';
import { Panel } from './components/ui/Panel.jsx';
import { fmtPct } from './utils/format.js';

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

  // The seam: single memoized derivation of EngineContext + pipeline output.
  // Pipeline already emits a `trace` array (see effect-pipeline.js) —
  // unused by this Phase 1 App.jsx but ready for the Phase 2 hover-over
  // attribute-breakdown UI and the "where did this +20 AR come from?"
  // display per plan §13.8.
  const { ctx, pipeline, ds, availableSpells } = useMemo(() => {
    const ctx = buildEngineContext({ ...state, classData, religion });
    const pipeline = runEffectPipeline(ctx);
    const ds = computeDerivedStats(pipeline.finalAttrs, pipeline.finalBonuses, pipeline.capOverrides);
    const availableSpells = getAvailableSpells(ctx);
    return { ctx, pipeline, ds, availableSpells };
  }, [state, classData, religion]);

  const patchState = useCallback((delta) =>
    setState((s) => ({ ...s, ...(typeof delta === "function" ? delta(s) : delta) })),
  [setState]);

  const togglePerk = useCallback((id) => {
    patchState((s) => ({
      selectedPerks: s.selectedPerks.includes(id)
        ? s.selectedPerks.filter(p => p !== id)
        : [...s.selectedPerks, id].slice(-classData.maxPerks),
    }));
  }, [patchState, classData.maxPerks]);

  const toggleSkill = useCallback((id) => {
    patchState((s) => ({
      selectedSkills: s.selectedSkills.includes(id)
        ? s.selectedSkills.filter(p => p !== id)
        : [...s.selectedSkills, id].slice(-classData.maxSkills),
    }));
  }, [patchState, classData.maxSkills]);

  const toggleSpell = useCallback((id) => {
    patchState((s) => ({
      selectedSpells: s.selectedSpells.includes(id)
        ? s.selectedSpells.filter(p => p !== id)
        : [...s.selectedSpells, id],
    }));
  }, [patchState]);

  const toggleBuff = useCallback((id) => {
    patchState((s) => ({ activeBuffs: { ...s.activeBuffs, [id]: !s.activeBuffs[id] } }));
  }, [patchState]);

  const setStacks = useCallback((id, n) => {
    patchState((s) => ({ selectedStacks: { ...s.selectedStacks, [id]: n } }));
  }, [patchState]);

  const setGearSlot = useCallback((slotKey, value) => {
    patchState((s) => ({ gear: { ...s.gear, [slotKey]: value } }));
  }, [patchState]);

  const setWeaponHeld = useCallback((held) => {
    patchState({ weaponHeldState: held });
  }, [patchState]);

  const loadExample = useCallback((id) => {
    const ex = EXAMPLE_BUILDS.find(b => b.id === id);
    if (ex) setState(ex.build());
  }, [setState]);

  const loadedExample = useMemo(() => EXAMPLE_BUILDS.find(b =>
    b.id === state.id && b.classId === state.classId,
  ), [state.id, state.classId]);

  // Abilities with `activation: "toggle"` that the user has equipped.
  // Used to populate the Active Buffs toggle list.
  const toggleableBuffs = useMemo(() => {
    const out = [];
    const addIf = (list, selectedSet, source) => {
      for (const a of list ?? []) {
        if (a.activation === "toggle" && selectedSet.has(a.id)) {
          out.push({ ability: a, source });
        }
      }
    };
    addIf(classData.skills, new Set(state.selectedSkills), "skill");
    addIf(classData.spells, new Set(state.selectedSpells), "spell");
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1fr)", gap: 14, marginTop: 12 }}>
        {/* ── Left column ── */}
        <Column>
          <TargetPanelWrapper target={state.target} patchState={patchState} />
          <LiveStatePanel state={state} patchState={patchState} />
          <PerksPanel classData={classData} selected={state.selectedPerks} toggle={togglePerk} />
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
          <ActiveBuffsPanel
            toggleableBuffs={toggleableBuffs}
            activeBuffs={state.activeBuffs}
            toggleBuff={toggleBuff}
          />
          <ReligionPanel state={state} patchState={patchState} />
        </Column>

        {/* ── Right column ── */}
        <Column>
          <AttributesPanel attrs={pipeline.finalAttrs} base={classData.baseStats} />
          <DerivedStatsPanel ds={ds} />
          <GearPanel
            gear={state.gear}
            setGearSlot={setGearSlot}
            weaponHeldState={state.weaponHeldState}
            setWeaponHeld={setWeaponHeld}
          />
          <DebugPanel ctx={ctx} pipeline={pipeline} ds={ds} />
        </Column>
      </div>
    </div>
  );
}

// ── Header ──

function Header({ className, onHome, examples, loaded, onLoadExample }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "6px 0 12px", borderBottom: "1px solid var(--sim-border-hairline)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <button onClick={onHome} style={headerButtonStyle}>← Classes</button>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: "var(--sim-text-primary)", letterSpacing: "0.12em" }}>
          {className}
        </div>
      </div>
      <ExampleBuildPicker examples={examples} loaded={loaded} onLoad={onLoadExample} />
    </div>
  );
}

const headerButtonStyle = {
  background: "transparent", border: "1px solid var(--sim-border-hairline)",
  color: "var(--sim-text-whisper)", padding: "4px 10px",
  fontFamily: "inherit", fontSize: 10, cursor: "pointer", borderRadius: 3,
};

// ── Layout ──

function Column({ children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>;
}

// ── Attributes ──

function AttributesPanel({ attrs, base }) {
  // TODO(Phase 2): hover-over each attribute to see the full breakdown
  // ("base 11, gear inherent +3, gear mods +2, Power of Sacrifice +15").
  // Pipeline emits the trace that feeds this (see effect-pipeline.js).
  const order = ["str", "vig", "agi", "dex", "wil", "kno", "res"];
  return (
    <Panel title="Attributes">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
        {order.map(key => (
          <AttrCell key={key} label={STAT_META[key].label} value={attrs[key]} base={base[key]} />
        ))}
      </div>
    </Panel>
  );
}

function AttrCell({ label, value, base }) {
  const delta = value - base;
  const isDecimal = Math.abs(value - Math.round(value)) > 0.001;
  return (
    <div style={{
      padding: "6px 8px", background: "var(--sim-surface-ink-raised)",
      border: "1px solid var(--sim-border-hairline)", borderRadius: 3,
    }}>
      <div style={{ fontSize: 9, color: "var(--sim-text-whisper)", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--sim-text-primary)" }}>
        {isDecimal ? value.toFixed(2) : value}
        {Math.abs(delta) > 0.01 && (
          <span style={{ fontSize: 9, marginLeft: 5, color: delta > 0 ? "var(--sim-accent-verdant-life)" : "var(--sim-accent-blood-wound)" }}>
            ({base})
          </span>
        )}
      </div>
    </div>
  );
}

// ── Derived stats ──

// Order mirrors DERIVED_DISPLAY convention with HP/defensive/offensive grouping.
const DERIVED_ORDER = [
  "health", "ppb", "mpb", "pdr", "mdr",
  "moveSpeed", "actionSpeed", "spellCastingSpeed",
  "regularInteractionSpeed", "magicalInteractionSpeed",
  "cdr", "buffDuration", "debuffDuration",
  "memoryCapacity", "healthRecovery", "memoryRecovery",
  "magicalHealing", "physicalHealing",
  "manualDexterity", "equipSpeed", "persuasiveness", "luck",
  "armorPenetration", "magicPenetration",
  "headshotDamageBonus", "headshotDamageReduction", "projectileDamageReduction",
];

function DerivedStatsPanel({ ds }) {
  return (
    <Panel title="Derived Stats">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        {DERIVED_ORDER.map(id => (
          <DerivedRow key={id} id={id} value={ds[id]} />
        ))}
      </div>
    </Panel>
  );
}

function DerivedRow({ id, value }) {
  const meta = STAT_META[id];
  const isPct = meta?.unit === "percent"
    || ["ppb","mpb","pdr","mdr","actionSpeed","spellCastingSpeed",
        "regularInteractionSpeed","magicalInteractionSpeed","cdr",
        "buffDuration","debuffDuration","healthRecovery","memoryRecovery",
        "manualDexterity","equipSpeed","armorPenetration","magicPenetration",
        "headshotDamageBonus","headshotDamageReduction","projectileDamageReduction",
       ].includes(id);
  const display = value == null || !Number.isFinite(value)
    ? "—"
    : isPct ? fmtPct(value) : (Number.isInteger(value) ? value : value.toFixed(1));
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", padding: "3px 0",
      borderBottom: "1px solid var(--sim-border-whisper)", fontSize: 11,
    }}>
      <span style={{ color: "var(--sim-text-muted)" }}>{derivedLabel(id, true)}</span>
      <span style={{ color: "var(--sim-text-primary)", fontWeight: 500 }}>{display}</span>
    </div>
  );
}

// ── Gear ──

// Phase 1: functional Weapon Held 3-way toggle + all 11 slots via GearSlot.
// Phase 2 promotes the toggle into the richer ContextBar (weapon picker +
// armor readout + dual-wield pill) per plan §3.5.
function GearPanel({ gear, setGearSlot, weaponHeldState, setWeaponHeld }) {
  return (
    <Panel title="Gear">
      <WeaponHeldToggle held={weaponHeldState} onChange={setWeaponHeld} />
      <div style={{ marginTop: 8 }}>
        {ALL_SLOTS.map(slotDef => (
          <GearSlot
            key={slotDef.key}
            slotDef={slotDef}
            gear={gear}
            onGearChange={setGearSlot}
          />
        ))}
      </div>
    </Panel>
  );
}

function WeaponHeldToggle({ held, onChange }) {
  const options = [
    { key: "none",        label: "None" },
    { key: "weaponSlot1", label: "Slot 1" },
    { key: "weaponSlot2", label: "Slot 2" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 10, color: "var(--sim-text-whisper)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Weapon Held
      </span>
      <div style={{ display: "inline-flex", gap: 2, marginLeft: "auto" }}>
        {options.map(o => {
          const active = held === o.key;
          return (
            <button key={o.key} onClick={() => onChange(o.key)}
              style={{
                background: active ? "var(--sim-surface-shadow)" : "transparent",
                border: `1px solid ${active ? "var(--sim-border-focus)" : "var(--sim-border-hairline)"}`,
                color: active ? "var(--sim-accent-arcane-pale)" : "var(--sim-text-whisper)",
                padding: "3px 10px", borderRadius: 3, cursor: "pointer",
                fontFamily: "inherit", fontSize: 10,
                fontWeight: active ? 600 : 400,
              }}>{o.label}</button>
          );
        })}
      </div>
    </div>
  );
}

// ── Perks / Skills / Spells ──

function PerksPanel({ classData, selected, toggle }) {
  return (
    <Panel title={`Perks (${selected.length}/${classData.maxPerks})`}>
      {classData.perks.map(perk => (
        <AbilityRow key={perk.id}
          ability={perk}
          selected={selected.includes(perk.id)}
          onToggle={() => toggle(perk.id)}
        />
      ))}
    </Panel>
  );
}

function SkillsPanel({ classData, selected, toggle, selectedStacks, setStacks }) {
  return (
    <Panel title={`Skills (${selected.length}/${classData.maxSkills})`}>
      {classData.skills.map(skill => (
        <AbilityRow key={skill.id}
          ability={skill}
          selected={selected.includes(skill.id)}
          onToggle={() => toggle(skill.id)}
          stacks={selectedStacks[skill.id] ?? 0}
          setStacks={skill.stacking ? (n) => setStacks(skill.id, n) : null}
        />
      ))}
    </Panel>
  );
}

function SpellsPanel({ classData, selected, toggle, availableSpells, selectedStacks, setStacks }) {
  const availableIds = new Set(availableSpells.map(s => s.id));
  return (
    <Panel title={`Spells (${selected.length})`}>
      {classData.spells.map(spell => {
        const isInMemory = selected.includes(spell.id);
        const isGranted = !isInMemory && availableIds.has(spell.id);
        return (
          <AbilityRow key={spell.id}
            ability={spell}
            selected={isInMemory}
            grantedLabel={isGranted ? "granted" : null}
            onToggle={() => toggle(spell.id)}
            stacks={selectedStacks[spell.id] ?? 0}
            setStacks={spell.stacking ? (n) => setStacks(spell.id, n) : null}
          />
        );
      })}
    </Panel>
  );
}

function AbilityRow({ ability, selected, onToggle, stacks, setStacks, grantedLabel }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "4px 6px", borderBottom: "1px solid var(--sim-border-whisper)", fontSize: 11,
    }}>
      <input type="checkbox" checked={selected} onChange={onToggle} />
      <span style={{ flex: 1, color: selected ? "var(--sim-text-primary)" : "var(--sim-text-muted)" }}>
        {ability.name}
        {ability.tier != null && (
          <span style={{ fontSize: 9, marginLeft: 6, color: "var(--sim-text-whisper)" }}>T{ability.tier}</span>
        )}
        {grantedLabel && (
          <span style={{ fontSize: 9, marginLeft: 6, color: "var(--sim-accent-arcane-pale)", fontStyle: "italic" }}>
            {grantedLabel}
          </span>
        )}
      </span>
      {setStacks && selected && (
        <input type="number" min={0} max={ability.stacking.maxStacks} step={1}
          value={stacks}
          onChange={(e) => setStacks(Math.max(0, Math.min(ability.stacking.maxStacks, parseInt(e.target.value) || 0)))}
          // TODO(Phase 2): Warlock darkness-shard sources (Soul Collector,
          // Spell Predation, Blood Pact) share an in-game 3-shard cap
          // across all sources, but the engine tracks each independently.
          // Add a tooltip here noting the shared cap so users don't
          // silently over-allocate.
          title={`Stacks (0–${ability.stacking.maxStacks})`}
          style={{ width: 36, fontSize: 10, background: "var(--sim-surface-input)",
            border: "1px solid var(--sim-border-hairline)", color: "var(--sim-text-primary)",
            borderRadius: 2, textAlign: "center" }}
        />
      )}
    </div>
  );
}

// ── Active Buffs ──

// Phase 1: minimal toggle list for equipped `activation: "toggle"` abilities.
// Phase 2 replaces this with the sectioned ActiveEffectsHub (Toggles /
// Stacks / Afterglow + ConditionBadges) per plan §4.U.1.
function ActiveBuffsPanel({ toggleableBuffs, activeBuffs, toggleBuff }) {
  if (toggleableBuffs.length === 0) {
    return (
      <Panel title="Active Buffs">
        <div style={{ fontSize: 10, color: "var(--sim-text-whisper)", fontStyle: "italic" }}>
          No togglable abilities equipped. Select skills or spells with toggle activation to add them here.
        </div>
      </Panel>
    );
  }
  return (
    <Panel title="Active Buffs">
      {toggleableBuffs.map(({ ability, source }) => {
        const on = !!activeBuffs[ability.id];
        return (
          <div key={ability.id}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "4px 6px", borderBottom: "1px solid var(--sim-border-whisper)",
              fontSize: 11,
            }}>
            <input type="checkbox" checked={on} onChange={() => toggleBuff(ability.id)} />
            <span style={{
              flex: 1,
              color: on ? "var(--sim-accent-verdant-life)" : "var(--sim-text-muted)",
            }}>
              {ability.name}
              <span style={{ fontSize: 9, marginLeft: 6, color: "var(--sim-text-whisper)" }}>
                {source}{ability.tier != null ? ` · T${ability.tier}` : ""}
              </span>
            </span>
            {ability.duration != null && (
              <span style={{ fontSize: 9, color: "var(--sim-text-ghost)" }}>{ability.duration}s</span>
            )}
          </div>
        );
      })}
    </Panel>
  );
}

// ── Live state + Religion ──

function LiveStatePanel({ state, patchState }) {
  // TODO(Phase 2): HP% slider drives hpScaling (no Warlock consumer yet,
  // Barbarian Berserker / Sorcerer Elemental Fury will use this).
  // TODO(Phase 2): States panel — hiding/crouching/blocking/defensive_stance
  // toggles, derived from equipped abilities' player_state conditions.
  // TODO(Phase 3): Target status toggles (frostbite / burn / poison /
  // electrified) driven by equipped abilities' appliesStatus entries.
  return (
    <Panel title="Live State">
      <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11 }}>
        <label style={{ color: "var(--sim-text-muted)" }}>HP%</label>
        <input type="range" min={0} max={100} step={1}
          value={state.hpPercent}
          onChange={(e) => patchState({ hpPercent: parseInt(e.target.value) })}
          style={{ flex: 1 }}
        />
        <span style={{ color: "var(--sim-text-primary)", minWidth: 28, textAlign: "right" }}>{state.hpPercent}%</span>
      </div>
    </Panel>
  );
}

function ReligionPanel({ state, patchState }) {
  return (
    <Panel title="Religion">
      <select
        value={state.religionId ?? ""}
        onChange={(e) => patchState({ religionId: e.target.value || null })}
        style={{ width: "100%", padding: "4px 6px", background: "var(--sim-surface-input)",
          border: "1px solid var(--sim-border-hairline)", color: "var(--sim-text-body)",
          fontFamily: "inherit", fontSize: 11, borderRadius: 3 }}
      >
        <option value="">— None —</option>
        {RELIGION_BLESSINGS.filter(r => r.id !== "none").map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>
    </Panel>
  );
}

function TargetPanelWrapper({ target, patchState }) {
  return (
    <Panel title="Target">
      <TargetEditor target={target} onChange={(t) => patchState({ target: t })} />
    </Panel>
  );
}

// ── Debug ──

function DebugPanel({ ctx, pipeline, ds }) {
  const [open, setOpen] = useState(false);
  const debug = () => {
    const payload = {
      class: ctx.classData.id,
      baseStats: ctx.classData.baseStats,
      selectedPerks: ctx.selectedPerks,
      selectedSkills: ctx.selectedSkills,
      selectedSpells: ctx.selectedSpells,
      activeBuffs: ctx.activeBuffs,
      selectedStacks: ctx.selectedStacks,
      weaponHeldState: ctx.weaponHeldState,
      weaponType: ctx.weaponType,
      isTwoHanded: ctx.isTwoHanded,
      isDualWield: ctx.isDualWield,
      hpPercent: ctx.hpPercent,
      religion: ctx.religion?.id ?? null,
      gearBaselineAttrs: ctx.attrs,
      gearBaselineBonuses: ctx.bonuses,
      finalAttrs: pipeline.finalAttrs,
      finalBonuses: pipeline.finalBonuses,
      capOverrides: pipeline.capOverrides,
      typeDamageBonuses: pipeline.typeDamageBonuses,
      multiplicativeLayers: pipeline.multiplicativeLayers,
      healingMods: pipeline.healingMods,
      derivedStats: ds,
      trace: pipeline.trace,
    };
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2));
  };
  return (
    <Panel title="Debug">
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={debug} style={headerButtonStyle}>Copy Debug JSON</button>
        <button onClick={() => setOpen(o => !o)} style={headerButtonStyle}>{open ? "Hide" : "Show"} trace</button>
      </div>
      {open && (
        <pre style={{
          marginTop: 8, fontSize: 10, color: "var(--sim-text-whisper)",
          maxHeight: 300, overflow: "auto", background: "var(--sim-surface-input)",
          padding: 8, borderRadius: 3,
        }}>
          {JSON.stringify(pipeline.trace, null, 2)}
        </pre>
      )}
    </Panel>
  );
}
