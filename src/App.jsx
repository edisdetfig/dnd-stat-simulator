// Phase 7 App — thin shell wiring CharacterBuild React state →
// normalizeBuild → runSnapshot → rendered Snapshot. One useState for
// the full build; one useMemo for the snapshot; fan out to panel
// children with setters.
//
// Per LOCK J, no component branches on class / ability / stat / resource
// identity. Everything renders from the build's data and the Snapshot's
// structure.

import React, { useMemo, useCallback, useEffect, useState } from "react";

import { getClass } from "./data/classes/index.js";
import { normalizeBuild } from "./engine/normalizeBuild.js";
import { runSnapshot } from "./engine/runSnapshot.js";

import { validateCharacter }      from "./data/character/character-shape-validator.js";
import { validateCharacterGear }  from "./data/character/character-gear-validator.js";

import { makeDefaultBuildState, setTargetField } from "./ui/defaultBuildState.js";

import { ClassSelector }            from "./components/ClassSelector.jsx";
import { AbilitySelectors }         from "./components/AbilitySelectors.jsx";
import { WeaponHeldSwitcher }       from "./components/WeaponHeldSwitcher.jsx";
import { EquippedGearPanel }        from "./components/EquippedGearPanel.jsx";
import { ActiveBuffsToggles }       from "./components/ActiveBuffsToggles.jsx";
import { HpFractionSlider }         from "./components/HpFractionSlider.jsx";
import { ViewingAfterEffectToggles } from "./components/ViewingAfterEffectToggles.jsx";
import { EitherTargetToggles }      from "./components/EitherTargetToggles.jsx";
import { ClassResourceCounters }    from "./components/ClassResourceCounters.jsx";
import { TargetEditor }             from "./components/TargetEditor.jsx";
import { StatSheetPanel }           from "./components/StatSheetPanel.jsx";
import { DamagePanel }              from "./components/DamagePanel.jsx";
import { HealPanel }                from "./components/HealPanel.jsx";
import { ShieldPanel }              from "./components/ShieldPanel.jsx";
import { AvailableAbilitiesPanel }  from "./components/AvailableAbilitiesPanel.jsx";

export default function App() {
  const [buildState, setBuildState] = useState(() => makeDefaultBuildState());

  const classData = useMemo(
    () => getClass(buildState.character.className),
    [buildState.character.className],
  );

  // Snapshot is memoized against the buildState identity. Every immutable
  // setter returns a fresh object, so React re-runs this exactly when
  // something actually changed. runSnapshot is left to throw if the build
  // is malformed — per LOCK K, errors bubble up.
  const { snapshot, flatBuild } = useMemo(() => {
    const flat = normalizeBuild({ ...buildState, classData });
    const snap = runSnapshot(flat);
    return { snapshot: snap, flatBuild: flat };
  }, [buildState, classData]);

  // Dev-only: run validators and log warnings. Validators never throw;
  // they return arrays of errors. Bad states show up in the console
  // and (for the most informative ones) as inline banners.
  const validationErrors = useMemo(() => {
    const errs = [];
    errs.push(...validateCharacter(buildState.character));
    errs.push(
      ...validateCharacterGear({
        character:       buildState.character,
        session:         buildState.session,
        loadout:         buildState.loadout,
        itemInstances:   buildState.itemInstances,
        itemDefinitions: buildState.itemDefinitions,
        classData,
      }),
    );
    return errs;
  }, [buildState, classData]);

  useEffect(() => {
    if (validationErrors.length > 0) {
      // eslint-disable-next-line no-console
      console.warn("[Phase 7] validator errors:", validationErrors);
    }
  }, [validationErrors]);

  // ── Setters ────────────────────────────────────────────────
  // Each callback returns a new buildState; components receive them
  // via props. All use structural immutable updates.

  const onTargetChange = useCallback((field, value) => {
    setBuildState((s) => setTargetField(s, field, value));
  }, []);

  return (
    <div className="p7-app">
      <header className="p7-header">
        <h1>D&D Stat Simulator · Phase 7 · Warlock Anchor</h1>
        <div className="p7-subtitle">Season 8 / snapshot · {snapshot.availableAbilityIds.length} abilities available</div>
      </header>

      {validationErrors.length > 0 && (
        <div className="p7-error">
          {validationErrors.length} validation error(s) — see console.
          First: {validationErrors[0]?.rule} @ {validationErrors[0]?.path}: {validationErrors[0]?.message}
        </div>
      )}

      <div className="p7-grid">
        {/* ── Left column — Build inputs ─────────────────── */}
        <div className="p7-col">
          <ClassSelector
            currentClassId={buildState.character.className}
          />

          <AbilitySelectors
            classData={classData}
            buildState={buildState}
            setBuildState={setBuildState}
            snapshot={snapshot}
          />

          <WeaponHeldSwitcher
            buildState={buildState}
            setBuildState={setBuildState}
          />

          <EquippedGearPanel
            buildState={buildState}
          />

          <ActiveBuffsToggles
            classData={classData}
            buildState={buildState}
            setBuildState={setBuildState}
          />

          <HpFractionSlider
            classData={classData}
            buildState={buildState}
            setBuildState={setBuildState}
            snapshot={snapshot}
          />

          <ClassResourceCounters
            classData={classData}
            buildState={buildState}
            setBuildState={setBuildState}
            snapshot={snapshot}
          />

          <EitherTargetToggles
            classData={classData}
            buildState={buildState}
            setBuildState={setBuildState}
            snapshot={snapshot}
          />

          <ViewingAfterEffectToggles
            classData={classData}
            buildState={buildState}
            setBuildState={setBuildState}
            snapshot={snapshot}
          />

          <TargetEditor
            target={buildState.session.target}
            onChange={onTargetChange}
          />
        </div>

        {/* ── Center column — Derived stats + Abilities ──── */}
        <div className="p7-col">
          <StatSheetPanel
            snapshot={snapshot}
            flatBuild={flatBuild}
          />
          <AvailableAbilitiesPanel
            classData={classData}
            snapshot={snapshot}
          />
        </div>

        {/* ── Right column — Projections ────────────────── */}
        <div className="p7-col">
          <DamagePanel  snapshot={snapshot} classData={classData} />
          <HealPanel    snapshot={snapshot} classData={classData} />
          <ShieldPanel  snapshot={snapshot} classData={classData} />
        </div>
      </div>
    </div>
  );
}
