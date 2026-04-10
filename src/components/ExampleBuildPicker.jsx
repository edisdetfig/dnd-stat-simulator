// ExampleBuildPicker — header dropdown for loading pre-made example builds.
// Custom (not <select>) so each item can render a title + subtitle stack
// with display typography (Cinzel) instead of a flat one-line option.

import { useState, useEffect, useRef, useCallback } from 'react';

export function ExampleBuildPicker({ examples, loaded, onLoad }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Close on click-outside or Escape. Listeners are only attached while
  // the panel is open so they don't fire for the entire app lifetime.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handlePick = useCallback((id) => {
    setOpen(false);
    onLoad(id);
  }, [onLoad]);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      {/* Hover/focus visuals are pure CSS so item hover doesn't re-render
          the React tree. */}
      <style>{`
        .ex-picker-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--sim-surface-ink-raised);
          border: 1px solid var(--sim-border-hairline);
          border-radius: 4px;
          padding: 5px 12px;
          color: var(--sim-text-body);
          font-family: inherit;
          font-size: 10px;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .ex-picker-trigger:hover,
        .ex-picker-trigger:focus-visible,
        .ex-picker-trigger.open {
          border-color: var(--sim-border-seam);
          color: var(--sim-accent-arcane-pale);
          outline: none;
        }
        .ex-picker-trigger-label {
          font-size: 9px;
          color: var(--sim-text-whisper);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .ex-picker-trigger.loaded {
          padding: 4px 12px;
          border-color: var(--sim-border-seam);
        }
        .ex-picker-trigger-loaded {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.15;
        }
        .ex-picker-trigger-name {
          font-family: 'Cinzel', serif;
          font-size: 12px;
          font-weight: 700;
          color: var(--sim-accent-arcane-frost);
          letter-spacing: 0.05em;
        }
        .ex-picker-trigger-subtitle {
          font-size: 8px;
          color: var(--sim-text-aside);
          font-style: italic;
          letter-spacing: 0.03em;
          margin-top: 1px;
        }
        .ex-picker-chevron {
          font-size: 8px;
          color: var(--sim-text-dim);
          transition: transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1.2);
          display: inline-block;
        }
        .ex-picker-trigger.open .ex-picker-chevron {
          transform: rotate(180deg);
          color: var(--sim-accent-arcane-pale);
        }

        @keyframes ex-picker-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ex-picker-panel {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          min-width: 260px;
          background: linear-gradient(180deg, var(--sim-surface-ink) 0%, var(--sim-surface-void) 100%);
          border: 1px solid var(--sim-border-seam);
          border-radius: 5px;
          box-shadow: var(--sim-shadow-ex-picker-panel);
          padding: 5px;
          z-index: 100;
          animation: ex-picker-fade-in 0.16s ease-out;
        }

        .ex-picker-empty {
          padding: 10px 14px;
          font-size: 10px;
          color: var(--sim-text-whisper);
          font-style: italic;
        }

        .ex-picker-item {
          display: block;
          width: 100%;
          background: transparent;
          border: none;
          border-left: 2px solid transparent;
          color: var(--sim-text-body);
          padding: 9px 12px 9px 14px;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          border-radius: 3px;
          transition: background 0.14s ease, border-left-color 0.14s ease;
        }
        .ex-picker-item:hover,
        .ex-picker-item:focus-visible {
          background: var(--sim-glow-arcane-hover);
          border-left-color: var(--sim-accent-arcane-core);
          outline: none;
        }
        .ex-picker-item-title {
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 700;
          color: var(--sim-text-primary);
          letter-spacing: 0.05em;
          line-height: 1.2;
        }
        .ex-picker-item:hover .ex-picker-item-title,
        .ex-picker-item:focus-visible .ex-picker-item-title {
          color: var(--sim-accent-arcane-frost);
        }
        .ex-picker-item-subtitle {
          font-size: 9px;
          color: var(--sim-text-aside);
          font-style: italic;
          letter-spacing: 0.03em;
          margin-top: 3px;
        }
      `}</style>

      <button
        type="button"
        className={
          (open ? "ex-picker-trigger open" : "ex-picker-trigger") +
          (loaded ? " loaded" : "")
        }
        onClick={() => setOpen((o) => !o)}
        title={loaded ? loaded.description || loaded.name : "Load a pre-made example build"}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ex-picker-trigger-label">Preset</span>
        {loaded ? (
          <span className="ex-picker-trigger-loaded">
            <span className="ex-picker-trigger-name">{loaded.name}</span>
            {loaded.subtitle && (
              <span className="ex-picker-trigger-subtitle">{loaded.subtitle}</span>
            )}
          </span>
        ) : (
          <span>Load Example</span>
        )}
        <span className="ex-picker-chevron" aria-hidden="true">▼</span>
      </button>

      {open && (
        <div className="ex-picker-panel" role="listbox">
          {examples.length === 0 ? (
            <div className="ex-picker-empty">No example builds for this class</div>
          ) : (
            examples.map((b) => (
              <button
                key={b.id}
                type="button"
                className="ex-picker-item"
                onClick={() => handlePick(b.id)}
                title={b.description || ""}
                role="option"
              >
                <div className="ex-picker-item-title">{b.name}</div>
                {b.subtitle && (
                  <div className="ex-picker-item-subtitle">{b.subtitle}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
