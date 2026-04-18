// HpFractionSlider — renders only if any available ability's atom-tree
// references `hp_below`. Per perspective.md principle 6: if no atom
// cares about HP fraction, the UI does not ask the user for it.

import { buildReferencesHpBelow } from "../ui/uiSurfaceRules.js";
import { setHpFraction } from "../ui/defaultBuildState.js";

export function HpFractionSlider({ classData, buildState, setBuildState, snapshot }) {
  if (!classData || !snapshot) return null;
  const surfaceActive = buildReferencesHpBelow(classData, snapshot.availableAbilityIds ?? []);
  if (!surfaceActive) return null;

  const frac = buildState.session.hpFraction ?? 1.0;
  const pct = Math.round(frac * 100);

  return (
    <div className="p7-panel">
      <h2>HP Fraction</h2>
      <div className="p7-mini" style={{ marginBottom: 6 }}>
        Caster HP % (drives <code>hp_below</code> conditions).
      </div>
      <div className="p7-row">
        <span className="p7-label">{pct}%</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => setBuildState((s) => setHpFraction(s, Number(e.target.value) / 100))}
        />
      </div>
    </div>
  );
}
