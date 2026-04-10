// Panel — styled container with optional uppercase title
// Source: index.old.html lines 1531-1538

export function Panel({ title, color, children }) {
  return (
    <div style={{ background: "var(--sim-surface-ink)", border: "1px solid var(--sim-surface-shadow)", borderRadius: 6, padding: 12, marginBottom: 8 }}>
      {title && <div style={{ fontSize: 10, fontWeight: 700, color: color || "var(--sim-text-whisper)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>{title}</div>}
      {children}
    </div>
  );
}
