// DebugPanel — dev-only surface for serializing full engine state to the
// clipboard and inspecting the pipeline trace. Phase 6 will give this
// a proper home (possibly behind a dev-mode flag).

import { useState } from 'react';
import { Panel } from '../ui/Panel.jsx';

const headerButtonStyle = {
  background: "transparent", border: "1px solid var(--sim-border-hairline)",
  color: "var(--sim-text-whisper)", padding: "4px 10px",
  fontFamily: "inherit", fontSize: 10, cursor: "pointer", borderRadius: 3,
};

export function DebugPanel({ ctx, pipeline, enemyPipeline, ds }) {
  const [open, setOpen] = useState(false);
  const debug = () => {
    const payload = {
      class: ctx.classData.id,
      baseStats: ctx.classData.baseStats,
      selectedPerks: ctx.selectedPerks,
      selectedSkills: ctx.selectedSkills,
      selectedSpells: ctx.selectedSpells,
      activeBuffs: ctx.activeBuffs,
      abilityTargetMode: ctx.abilityTargetMode,
      selectedStacks: ctx.selectedStacks,
      weaponHeldState: ctx.weaponHeldState,
      weaponType: ctx.weaponType,
      isTwoHanded: ctx.isTwoHanded,
      isDualWield: ctx.isDualWield,
      hpPercent: ctx.hpPercent,
      religion: ctx.religion?.id ?? null,
      gearBaselineAttrs: ctx.attrs,
      gearBaselineBonuses: ctx.bonuses,
      self: {
        finalAttrs: pipeline.finalAttrs,
        finalBonuses: pipeline.finalBonuses,
        capOverrides: pipeline.capOverrides,
        typeDamageBonuses: pipeline.typeDamageBonuses,
        multiplicativeLayers: pipeline.multiplicativeLayers,
        healingMods: pipeline.healingMods,
        trace: pipeline.trace,
      },
      enemy: {
        finalAttrs: enemyPipeline.finalAttrs,
        finalBonuses: enemyPipeline.finalBonuses,
        capOverrides: enemyPipeline.capOverrides,
        typeDamageBonuses: enemyPipeline.typeDamageBonuses,
        multiplicativeLayers: enemyPipeline.multiplicativeLayers,
        healingMods: enemyPipeline.healingMods,
        trace: enemyPipeline.trace,
      },
      derivedStats: ds,
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
{JSON.stringify({ self: pipeline.trace, enemy: enemyPipeline.trace }, null, 2)}
        </pre>
      )}
    </Panel>
  );
}
