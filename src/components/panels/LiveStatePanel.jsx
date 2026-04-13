// LiveStatePanel — HP% slider only for Phase 1.
//
// TODO(Phase 2): HP% drives hpScaling effects (no Warlock consumer yet;
// Barbarian Berserker / Sorcerer Elemental Fury will use this).
// TODO(Phase 2): States panel — hiding / crouching / blocking /
// defensive_stance toggles, derived from equipped abilities' player_state
// conditions.
// TODO(Phase 3): Target status toggles (frostbite / burn / poison /
// electrified) driven by equipped abilities' appliesStatus entries.

import { Panel } from '../ui/Panel.jsx';

export function LiveStatePanel({ state, patchState }) {
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
