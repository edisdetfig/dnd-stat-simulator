import { ExampleBuildPicker } from '../ExampleBuildPicker.jsx';

export function Header({ className, onHome, examples, loaded, onLoadExample }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "6px 0 12px", borderBottom: "1px solid var(--sim-border-hairline)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
        <button onClick={onHome} style={{
          background: "transparent", border: "1px solid var(--sim-border-hairline)",
          color: "var(--sim-text-whisper)", padding: "4px 10px",
          fontFamily: "inherit", fontSize: 10, cursor: "pointer", borderRadius: 3,
        }}>← Classes</button>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: "var(--sim-text-primary)", letterSpacing: "0.12em" }}>
          {className}
        </div>
      </div>
      <ExampleBuildPicker examples={examples} loaded={loaded} onLoad={onLoadExample} />
    </div>
  );
}
