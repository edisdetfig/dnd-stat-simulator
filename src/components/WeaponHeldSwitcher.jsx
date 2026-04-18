// WeaponHeldSwitcher — 3-way segmented control for session.weaponHeldState.
// Reads the held-item labels from the Loadout's slot contents +
// itemDefinitions (so the label surfaces the actual equipped item name
// per slot, not a generic "Slot 1").

import { setWeaponHeldState } from "../ui/defaultBuildState.js";

function itemLabel(loadout, itemDefinitions, slotKey) {
  const slot = loadout?.slots?.[slotKey];
  const primary = slot?.primary;
  if (!primary) return "(empty)";
  const def = itemDefinitions?.[primary.definitionId];
  return def?.name ?? primary.definitionId;
}

export function WeaponHeldSwitcher({ buildState, setBuildState }) {
  const { loadout, itemDefinitions, session } = buildState;

  const options = [
    { value: "slot1",   label: itemLabel(loadout, itemDefinitions, "weaponSlot1") },
    { value: "slot2",   label: itemLabel(loadout, itemDefinitions, "weaponSlot2") },
    { value: "unarmed", label: "Unarmed" },
  ];

  return (
    <div className="p7-panel">
      <h2>Weapon Held</h2>
      <div className="p7-seg" role="group" aria-label="Weapon held state">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={session.weaponHeldState === o.value}
            onClick={() => setBuildState((s) => setWeaponHeldState(s, o.value))}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
