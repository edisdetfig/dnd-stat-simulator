// EquippedGearPanel — read-only view of what's currently equipped in
// the Loadout. Per LOCK D (minimal UI), Phase 7 does NOT ship a gear
// editor; this panel exists so a user debugging stat contributions
// can see which items are feeding gear.bonuses.
//
// Class-agnostic: reads loadout + itemDefinitions + itemInstances
// directly. Iterates a fixed slot order (weapons → armor → jewelry).
// On row-click, expands to show the item's `inherentStats[]` + the
// instance's rolled `modifiers[]` — the two sources the normalizer
// folds into `gear.bonuses`.

import { useState, useCallback } from "react";

const SLOT_ORDER = [
  { key: "weaponSlot1", label: "Weapon Slot 1",    isWeaponSlot: true  },
  { key: "weaponSlot2", label: "Weapon Slot 2",    isWeaponSlot: true  },
  { key: "head",        label: "Head",             isWeaponSlot: false },
  { key: "chest",       label: "Chest",            isWeaponSlot: false },
  { key: "back",        label: "Back",             isWeaponSlot: false },
  { key: "hands",       label: "Hands",            isWeaponSlot: false },
  { key: "legs",        label: "Legs",             isWeaponSlot: false },
  { key: "feet",        label: "Feet",             isWeaponSlot: false },
  { key: "ring1",       label: "Ring 1",           isWeaponSlot: false },
  { key: "ring2",       label: "Ring 2",           isWeaponSlot: false },
  { key: "necklace",    label: "Necklace",         isWeaponSlot: false },
];

function fmtUnit(value, unit) {
  if (value == null) return "—";
  if (unit === "percent") {
    return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
  }
  return String(value);
}

function InherentRow({ inherent }) {
  // inherent may carry `value`, or `{ min, max }` (ranged rolls). The
  // anchor items use fixed values; ranged rolls land in Phase 11.
  const value = inherent.value
    ?? (inherent.min != null && inherent.max != null ? `${inherent.min}–${inherent.max}` : "?");
  return (
    <div className="p7-row" style={{ padding: "1px 0" }}>
      <span className="p7-label">{inherent.stat}</span>
      <span className="p7-value">{fmtUnit(value, inherent.unit)}</span>
    </div>
  );
}

function ModifierRow({ mod }) {
  return (
    <div className="p7-row" style={{ padding: "1px 0" }}>
      <span className="p7-label">
        {mod.stat}
        <span className="p7-tag" style={{ marginLeft: 6 }}>{mod.source}</span>
      </span>
      <span className="p7-value">{fmtUnit(mod.value, mod.unit)}</span>
    </div>
  );
}

function WeaponOnHitRow({ effect }) {
  return (
    <div className="p7-row" style={{ padding: "1px 0" }}>
      <span className="p7-label">onHit · {effect.damageType}{effect.trueDamage ? " (true)" : ""}</span>
      <span className="p7-value">+{effect.damage}</span>
    </div>
  );
}

function SlotRow({ slotKey, slotLabel, itemInstance, itemDefinitions, expanded, onToggle, subLabel }) {
  const def = itemInstance?.definitionId ? itemDefinitions?.[itemInstance.definitionId] : null;
  const itemName = def?.name ?? (itemInstance ? `(unknown: ${itemInstance.definitionId})` : "empty");
  const rarity = itemInstance?.rarity ?? null;

  return (
    <div style={{ borderTop: "1px dotted var(--hairline)", padding: "3px 0" }}>
      <button
        type="button"
        onClick={() => itemInstance && onToggle(slotKey)}
        disabled={!itemInstance}
        aria-expanded={expanded}
        style={{
          display: "flex", width: "100%", justifyContent: "space-between",
          background: "transparent", border: "none", padding: 2, textAlign: "left",
          cursor: itemInstance ? "pointer" : "default",
        }}
      >
        <span>
          <span className="p7-label" style={{ marginRight: 6 }}>{slotLabel}</span>
          {subLabel && <span className="p7-tag" style={{ marginRight: 6 }}>{subLabel}</span>}
          <span style={{ color: itemInstance ? "var(--text)" : "var(--text-dim)" }}>{itemName}</span>
        </span>
        {rarity && <span className="p7-tag">{rarity}</span>}
      </button>

      {expanded && def && (
        <div style={{ paddingLeft: 14, paddingTop: 3, paddingBottom: 3 }}>
          {Array.isArray(def.inherentStats) && def.inherentStats.length > 0 && (
            <>
              <div className="p7-mini" style={{ marginTop: 2 }}>Inherent</div>
              {def.inherentStats.map((inh, i) => (
                <InherentRow key={`inh-${i}`} inherent={inh} />
              ))}
            </>
          )}
          {Array.isArray(itemInstance?.modifiers) && itemInstance.modifiers.length > 0 && (
            <>
              <div className="p7-mini" style={{ marginTop: 4 }}>Modifiers</div>
              {itemInstance.modifiers.map((m, i) => <ModifierRow key={`mod-${i}`} mod={m} />)}
            </>
          )}
          {Array.isArray(def.onHitEffects) && def.onHitEffects.length > 0 && (
            <>
              <div className="p7-mini" style={{ marginTop: 4 }}>On-Hit</div>
              {def.onHitEffects.map((e, i) => <WeaponOnHitRow key={`oh-${i}`} effect={e} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function EquippedGearPanel({ buildState }) {
  const { loadout, itemDefinitions } = buildState;
  const held = buildState.session.weaponHeldState;

  const [expanded, setExpanded] = useState(() => new Set());
  const onToggle = useCallback((key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  return (
    <div className="p7-panel">
      <h2>Equipped Gear</h2>
      <div className="p7-mini" style={{ marginBottom: 4 }}>
        Click an item to see inherents + rolled modifiers.
      </div>
      {SLOT_ORDER.map((s) => {
        const slotVal = loadout?.slots?.[s.key];
        if (s.isWeaponSlot) {
          const primary   = slotVal?.primary   ?? null;
          const secondary = slotVal?.secondary ?? null;
          const heldMatch =
            (s.key === "weaponSlot1" && held === "slot1") ||
            (s.key === "weaponSlot2" && held === "slot2");
          return (
            <div key={s.key}>
              <SlotRow
                slotKey={s.key + ":primary"}
                slotLabel={s.label}
                subLabel={heldMatch ? "HELD" : (primary ? "dormant" : "")}
                itemInstance={primary}
                itemDefinitions={itemDefinitions}
                expanded={expanded.has(s.key + ":primary")}
                onToggle={onToggle}
              />
              {secondary && (
                <SlotRow
                  slotKey={s.key + ":secondary"}
                  slotLabel={s.label}
                  subLabel="offhand"
                  itemInstance={secondary}
                  itemDefinitions={itemDefinitions}
                  expanded={expanded.has(s.key + ":secondary")}
                  onToggle={onToggle}
                />
              )}
            </div>
          );
        }
        return (
          <SlotRow
            key={s.key}
            slotKey={s.key}
            slotLabel={s.label}
            itemInstance={slotVal ?? null}
            itemDefinitions={itemDefinitions}
            expanded={expanded.has(s.key)}
            onToggle={onToggle}
          />
        );
      })}
    </div>
  );
}
