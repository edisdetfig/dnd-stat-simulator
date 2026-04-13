// ActiveBuffsPanel — minimal toggle list for equipped abilities with
// `activation: "toggle"`. Phase 2 replaces this with the sectioned
// ActiveEffectsHub (Toggles / Stacks / Afterglow + ConditionBadges)
// per plan §4.U.1.
//
// For abilities carrying any `target: "either"` effect or damage entry,
// a second line of checkboxes appears so the user picks whether the
// "either" entries apply to self, enemy, both, or neither. Defaults come
// from ability.defaultApplyToSelf / defaultApplyToEnemy (engine fallback:
// applyToSelf=true, applyToEnemy=false).

import { resolveApplyMode } from '../../engine/index.js';
import { Panel } from '../ui/Panel.jsx';

export function ActiveBuffsPanel({
  toggleableBuffs, activeBuffs, toggleBuff,
  abilityTargetMode, setAbilityTargetMode,
}) {
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
      {toggleableBuffs.map(({ ability, source }) => (
        <ActiveBuffRow key={ability.id}
          ability={ability}
          source={source}
          on={!!activeBuffs[ability.id]}
          onToggle={() => toggleBuff(ability.id)}
          abilityTargetMode={abilityTargetMode}
          setAbilityTargetMode={setAbilityTargetMode}
        />
      ))}
    </Panel>
  );
}

function ActiveBuffRow({ ability, source, on, onToggle, abilityTargetMode, setAbilityTargetMode }) {
  const either = hasEitherEntry(ability);
  const mode = either
    ? resolveApplyMode(ability, { abilityTargetMode })
    : null;
  const setMode = (patch) => setAbilityTargetMode(ability.id, { ...mode, ...patch });

  return (
    <div style={{
      borderBottom: "1px solid var(--sim-border-whisper)",
      padding: "4px 6px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
        <input type="checkbox" checked={on} onChange={onToggle} />
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

      {on && either && (
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          fontSize: 10, color: "var(--sim-text-muted)",
          marginTop: 3, marginLeft: 24,
        }}>
          <span style={{ color: "var(--sim-text-whisper)", fontSize: 9, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Apply to:
          </span>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <input type="checkbox" checked={mode.applyToSelf}
              onChange={(e) => setMode({ applyToSelf: e.target.checked })} />
            Self
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <input type="checkbox" checked={mode.applyToEnemy}
              onChange={(e) => setMode({ applyToEnemy: e.target.checked })} />
            Enemy
          </label>
        </div>
      )}
    </div>
  );
}

// An ability is "either"-bearing if any effect or damage entry carries
// target: "either". Phase 1: scans effects[] and damage[]. Nested entries
// (triggers / afterEffect / stacking.perStack) don't drive top-level UI
// for Phase 1 — their "either" rendering is Phase 2 work.
function hasEitherEntry(ability) {
  if (ability.effects?.some(e => e.target === "either")) return true;
  if (ability.damage?.some(d => d.target === "either")) return true;
  return false;
}
