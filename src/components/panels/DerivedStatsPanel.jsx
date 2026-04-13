// DerivedStatsPanel — compact two-column read-out of every recipe-produced
// derived stat. Preserved as a single compact panel (user-preferred UX
// over the v1 multi-panel stat display).

import { STAT_META, derivedLabel } from '../../data/stat-meta.js';
import { Panel } from '../ui/Panel.jsx';
import { fmtPct } from '../../utils/format.js';

// Order mirrors DERIVED_DISPLAY convention with HP/defensive/offensive grouping.
const DERIVED_ORDER = [
  "health", "ppb", "mpb", "pdr", "mdr",
  "moveSpeed", "actionSpeed", "spellCastingSpeed",
  "regularInteractionSpeed", "magicalInteractionSpeed",
  "cdr", "buffDuration", "debuffDuration",
  "memoryCapacity", "healthRecovery", "memoryRecovery",
  "magicalHealing", "physicalHealing",
  "manualDexterity", "equipSpeed", "persuasiveness", "luck",
  "armorPenetration", "magicPenetration",
  "headshotDamageBonus", "headshotDamageReduction", "projectileDamageReduction",
];

// Percent-formatted stats that aren't marked in STAT_META (mostly derived
// stat aliases like "ppb" / "mdr" / "cdr" that don't have a STAT_META entry).
const PERCENT_DERIVED = new Set([
  "ppb","mpb","pdr","mdr","actionSpeed","spellCastingSpeed",
  "regularInteractionSpeed","magicalInteractionSpeed","cdr",
  "buffDuration","debuffDuration","healthRecovery","memoryRecovery",
  "manualDexterity","equipSpeed","armorPenetration","magicPenetration",
  "headshotDamageBonus","headshotDamageReduction","projectileDamageReduction",
]);

export function DerivedStatsPanel({ ds }) {
  return (
    <Panel title="Derived Stats">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        {DERIVED_ORDER.map(id => (
          <DerivedRow key={id} id={id} value={ds[id]} />
        ))}
      </div>
    </Panel>
  );
}

function DerivedRow({ id, value }) {
  const isPct = STAT_META[id]?.unit === "percent" || PERCENT_DERIVED.has(id);
  const display = value == null || !Number.isFinite(value)
    ? "—"
    : isPct ? fmtPct(value) : (Number.isInteger(value) ? value : value.toFixed(1));
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", padding: "3px 0",
      borderBottom: "1px solid var(--sim-border-whisper)", fontSize: 11,
    }}>
      <span style={{ color: "var(--sim-text-muted)" }}>{derivedLabel(id, true)}</span>
      <span style={{ color: "var(--sim-text-primary)", fontWeight: 500 }}>{display}</span>
    </div>
  );
}
