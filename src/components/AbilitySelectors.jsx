// AbilitySelectors — checkbox grid for perks / skills / spells.
// Enforces class-declared `maxPerks` / `maxSkills` caps (disables
// unselected rows once the cap is reached). Grays out spells that are
// in `memoryBudget.spell.lockedOut[]` — the user can still un-select
// them, but the visual signal mirrors the engine's lockout decision.
//
// Selection toggles mutate CharacterBuild.persistentSelections via the
// immutable toggle helpers. Class-agnostic: rows render from
// classData.perks / .skills / .spells.

import {
  togglePerk, toggleSkill, toggleSpell,
} from "../ui/defaultBuildState.js";

function countSelected(list, all) {
  return list.filter((id) => all.some((a) => a.id === id)).length;
}

function Section({ title, items, selected, onToggle, max, lockedOutIds }) {
  const lockedSet = new Set(lockedOutIds ?? []);
  const selCount = countSelected(selected, items);
  const atCap = max != null && selCount >= max;

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="p7-mini" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</span>
        {max != null && <span className="p7-mini">{selCount} / {max}</span>}
      </div>
      {items.map((a) => {
        const isSelected = selected.includes(a.id);
        const isLockedOut = lockedSet.has(a.id);
        const disabled = !isSelected && atCap;
        return (
          <label
            key={a.id}
            className={"p7-ability-row" + (isLockedOut ? " p7-ability-locked" : "")}
            style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled && !isSelected ? 0.5 : undefined }}
            title={a.desc ?? ""}
          >
            <input
              type="checkbox"
              checked={isSelected}
              disabled={disabled}
              onChange={() => onToggle(a.id)}
            />
            <span className="p7-name">{a.name}</span>
            {isLockedOut && <span className="p7-tag">(locked)</span>}
            {a.memoryCost != null && <span className="p7-tag">mc {a.memoryCost}</span>}
          </label>
        );
      })}
    </div>
  );
}

export function AbilitySelectors({ classData, buildState, setBuildState, snapshot }) {
  if (!classData) return null;
  const sel = buildState.character.persistentSelections;

  const lockedSpells = snapshot?.memoryBudget?.spell?.lockedOut ?? [];

  return (
    <div className="p7-panel">
      <h2>Abilities</h2>
      <Section
        title="Perks"
        items={classData.perks ?? []}
        selected={sel.selectedPerks}
        onToggle={(id) => setBuildState((s) => togglePerk(s, id))}
        max={classData.maxPerks}
      />
      <Section
        title="Skills"
        items={(classData.skills ?? []).filter((s) => !isGrantedOnly(classData, s))}
        selected={sel.selectedSkills}
        onToggle={(id) => setBuildState((s) => toggleSkill(s, id))}
        max={classData.maxSkills}
      />
      <Section
        title="Spells"
        items={classData.spells ?? []}
        selected={sel.selectedSpells}
        onToggle={(id) => setBuildState((s) => toggleSpell(s, id))}
        lockedOutIds={lockedSpells}
      />
    </div>
  );
}

// Heuristic: a skill that appears only as the target of a GRANT_ATOM
// elsewhere in the class (and is therefore not directly user-selectable)
// should not show up in the skills list. Phase 7 scope — works for
// Warlock's exploitation_strike / exit_demon_form / bolt_of_darkness.
// Phase 11 may surface granted abilities in a separate group.
function isGrantedOnly(classData, ability) {
  if (!classData || !ability) return false;
  for (const src of [...(classData.perks ?? []), ...(classData.skills ?? []), ...(classData.spells ?? [])]) {
    for (const g of src.grants ?? []) {
      if (g.type === "ability" && g.abilityId === ability.id) return true;
    }
  }
  return false;
}
