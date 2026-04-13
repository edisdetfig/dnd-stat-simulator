import { RELIGION_BLESSINGS } from '../../data/religions.js';
import { Panel } from '../ui/Panel.jsx';
import { HoverTip } from '../ui/HoverTip.jsx';

export function ReligionPanel({ state, patchState }) {
  const selected = state.religionId
    ? RELIGION_BLESSINGS.find(r => r.id === state.religionId)
    : null;
  const desc = selected?.description;

  return (
    <Panel title="Religion">
      {/* HoverTip wraps the select so users see the selected blessing's
          description without committing keyboard focus to the field.
          Individual options also carry native `title` attributes so hovering
          inside the open dropdown surfaces each blessing's description. */}
      <HoverTip title={selected?.name} text={desc}>
        <select
          value={state.religionId ?? ""}
          onChange={(e) => patchState({ religionId: e.target.value || null })}
          style={{ width: "100%", padding: "4px 6px", background: "var(--sim-surface-input)",
            border: "1px solid var(--sim-border-hairline)", color: "var(--sim-text-body)",
            fontFamily: "inherit", fontSize: 11, borderRadius: 3 }}
        >
          <option value="">— None —</option>
          {RELIGION_BLESSINGS.filter(r => r.id !== "none").map(r => (
            <option key={r.id} value={r.id} title={r.description ?? ""}>{r.name}</option>
          ))}
        </select>
      </HoverTip>
      {desc && (
        <div style={{
          fontSize: 10, color: "var(--sim-text-whisper)",
          marginTop: 4, fontStyle: "italic",
        }}>
          {desc}
        </div>
      )}
    </Panel>
  );
}
