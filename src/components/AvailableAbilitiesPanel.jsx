// AvailableAbilitiesPanel — shows every available ability with a
// visual distinction for:
//   - active (contributing state)  vs just available
//   - locked out of the memory pool (grayed with a "(locked)" tag)
//
// Also surfaces the memoryBudget used/capacity per pool.

import { findAbilityById } from "../ui/uiSurfaceRules.js";

export function AvailableAbilitiesPanel({ classData, snapshot }) {
  if (!classData || !snapshot) return null;

  const available = snapshot.availableAbilityIds ?? [];
  const active    = new Set(snapshot.activeAbilityIds ?? []);
  const memBudget = snapshot.memoryBudget ?? {};
  const allLocked = new Set();
  for (const pool of Object.values(memBudget)) {
    for (const id of pool?.lockedOut ?? []) allLocked.add(id);
  }

  const rows = available.map((id) => {
    const a = findAbilityById(classData, id);
    return {
      id,
      name: a?.name ?? id,
      type: a?.type ?? "",
      activation: a?.activation ?? "",
      isActive: active.has(id),
      isLocked: allLocked.has(id),
    };
  });
  rows.sort((x, y) => x.name.localeCompare(y.name));

  return (
    <div className="p7-panel">
      <h2>Abilities Available · {available.length}</h2>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 8 }}>
        {Object.entries(memBudget).map(([pool, data]) => {
          const { used = 0, capacity = 0, lockedOut = [] } = data ?? {};
          return (
            <div key={pool} className="p7-mini" style={{ padding: 4, background: "#0b0b11", border: "1px solid var(--hairline)", borderRadius: 3 }}>
              <div style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>{pool}</div>
              <div>{used} / {capacity}</div>
              {lockedOut.length > 0 && <div style={{ color: "var(--negative)" }}>{lockedOut.length} locked</div>}
            </div>
          );
        })}
      </div>

      {rows.map((r) => (
        <div
          key={r.id}
          className={"p7-ability-row" + (r.isLocked ? " p7-ability-locked" : "")}
        >
          <span className="p7-name" style={{ fontWeight: r.isActive ? 600 : 400 }}>{r.name}</span>
          <span className="p7-tag">{r.activation}</span>
          {r.isActive && <span className="p7-tag p7-positive">active</span>}
          {r.isLocked && <span className="p7-tag p7-negative">locked</span>}
        </div>
      ))}
    </div>
  );
}
