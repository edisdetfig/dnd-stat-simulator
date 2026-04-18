// ClassSelector — Phase 7 exposes Warlock only (LOCK A). The dropdown
// is data-driven so Phase 10 class migrations extend it without code
// changes; for now we just surface the single option.
//
// Intentionally does not mutate state: Phase 7's CharacterBuild is
// single-class-bound and swapping class would require a new default
// build constructor. The dropdown renders disabled for the extra
// classes as a forward-spec hint.

import { CLASS_LIST } from "../data/classes/index.js";

export function ClassSelector({ currentClassId }) {
  return (
    <div className="p7-panel">
      <h2>Class</h2>
      <select
        value={currentClassId}
        onChange={() => { /* Phase 10: class swap will reset build state. */ }}
        style={{ width: "100%" }}
      >
        {CLASS_LIST.map((c) => (
          <option key={c.id} value={c.id} disabled={c.id !== currentClassId}>
            {c.name}{c.id !== currentClassId ? "  (Phase 10)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
