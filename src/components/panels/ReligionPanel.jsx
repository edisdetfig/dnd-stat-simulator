import { RELIGION_BLESSINGS } from '../../data/religions.js';
import { Panel } from '../ui/Panel.jsx';

export function ReligionPanel({ state, patchState }) {
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
