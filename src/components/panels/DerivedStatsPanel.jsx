// DerivedStatsPanel — compact two-column read-out of every recipe-produced
// derived stat. Each cell receives a DerivedStat { value, rawValue?, cap? };
// rows with a cap show overflow / at-cap indicators so users can see wasted
// stat budget at a glance.

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

// Percent-formatted derived stats (no STAT_META entry for the alias).
const PERCENT_DERIVED = new Set([
  "ppb","mpb","pdr","mdr","actionSpeed","spellCastingSpeed",
  "regularInteractionSpeed","magicalInteractionSpeed","cdr",
  "buffDuration","debuffDuration","healthRecovery","memoryRecovery",
  "manualDexterity","equipSpeed","armorPenetration","magicPenetration",
  "headshotDamageBonus","headshotDamageReduction","projectileDamageReduction",
]);

const EPSILON = 0.0001;

export function DerivedStatsPanel({ ds }) {
  return (
    <Panel title="Derived Stats">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        {DERIVED_ORDER.map(id => (
          <DerivedRow key={id} id={id} stat={ds[id]} />
        ))}
      </div>
    </Panel>
  );
}

function DerivedRow({ id, stat }) {
  const isPct = STAT_META[id]?.unit === "percent" || PERCENT_DERIVED.has(id);
  const fmt = (n) => isPct ? fmtPct(n) : (Number.isInteger(n) ? n : n.toFixed(1));

  if (stat == null || !Number.isFinite(stat.value)) {
    return <Row label={derivedLabel(id, true)} value="—" />;
  }

  const { value, rawValue, cap } = stat;
  let suffix = null;
  let valueColor = "var(--sim-text-primary)";

  if (cap != null && rawValue != null) {
    const overflow = rawValue - cap;
    if (overflow > EPSILON) {
      // Over cap: show capped value, annotate overflow.
      suffix = ` (+${fmt(overflow)} over cap)`;
      valueColor = "var(--sim-accent-blood-wound)";
    } else if (overflow > -EPSILON) {
      // At cap (rawValue ≈ cap).
      suffix = " (at cap)";
      valueColor = "var(--sim-accent-flame-hot)";
    }
    // rawValue < cap: no indicator, plain display.
  }

  return <Row label={derivedLabel(id, true)} value={fmt(value)} suffix={suffix} color={valueColor} />;
}

function Row({ label, value, suffix, color = "var(--sim-text-primary)" }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", padding: "3px 0",
      borderBottom: "1px solid var(--sim-border-whisper)", fontSize: 11,
    }}>
      <span style={{ color: "var(--sim-text-muted)" }}>{label}</span>
      <span style={{ color, fontWeight: 500 }}>
        {value}
        {suffix && <span style={{ color: "var(--sim-text-whisper)", fontWeight: 400, marginLeft: 4 }}>{suffix}</span>}
      </span>
    </div>
  );
}
