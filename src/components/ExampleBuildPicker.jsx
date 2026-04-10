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
          background: #10101c;
          border: 1px solid #1e1e2e;
          border-radius: 4px;
          padding: 5px 12px;
          color: #c8c8d4;
          font-family: inherit;
          font-size: 10px;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: border-color 0.15s ease, color 0.15s ease;
        }
        .ex-picker-trigger:hover,
        .ex-picker-trigger:focus-visible,
        .ex-picker-trigger.open {
          border-color: #2e2342;
          color: #c8b4ff;
          outline: none;
        }
        .ex-picker-trigger-label {
          font-size: 9px;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .ex-picker-trigger.loaded {
          padding: 4px 12px;
          border-color: #2e2342;
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
          color: #d4baff;
          letter-spacing: 0.05em;
        }
        .ex-picker-trigger-subtitle {
          font-size: 8px;
          color: #6e6e84;
          font-style: italic;
          letter-spacing: 0.03em;
          margin-top: 1px;
        }
        .ex-picker-chevron {
          font-size: 8px;
          color: #666;
          transition: transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1.2);
          display: inline-block;
        }
        .ex-picker-trigger.open .ex-picker-chevron {
          transform: rotate(180deg);
          color: #c8b4ff;
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
          background: linear-gradient(180deg, #0d0d18 0%, #0a0a12 100%);
          border: 1px solid #2a2a3e;
          border-radius: 5px;
          box-shadow:
            0 12px 32px rgba(0, 0, 0, 0.65),
            0 0 0 1px rgba(168, 85, 247, 0.06),
            0 0 24px rgba(168, 85, 247, 0.05);
          padding: 5px;
          z-index: 100;
          animation: ex-picker-fade-in 0.16s ease-out;
        }

        .ex-picker-empty {
          padding: 10px 14px;
          font-size: 10px;
          color: #555;
          font-style: italic;
        }

        .ex-picker-item {
          display: block;
          width: 100%;
          background: transparent;
          border: none;
          border-left: 2px solid transparent;
          color: #c8c8d4;
          padding: 9px 12px 9px 14px;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          border-radius: 3px;
          transition: background 0.14s ease, border-left-color 0.14s ease;
        }
        .ex-picker-item:hover,
        .ex-picker-item:focus-visible {
          background: rgba(168, 85, 247, 0.08);
          border-left-color: #a855f7;
          outline: none;
        }
        .ex-picker-item-title {
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 700;
          color: #e0e0ec;
          letter-spacing: 0.05em;
          line-height: 1.2;
        }
        .ex-picker-item:hover .ex-picker-item-title,
        .ex-picker-item:focus-visible .ex-picker-item-title {
          color: #d4baff;
        }
        .ex-picker-item-subtitle {
          font-size: 9px;
          color: #6e6e84;
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
