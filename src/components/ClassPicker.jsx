// ClassPicker — full-screen dungeon-themed takeover for selecting a class.
// Rendered when App's selectedClass is null. Passes the chosen class id
// back to the parent via onSelect.

import { CLASS_ROSTER } from '../data/classes/index.js';
import { GAME_VERSION } from '../data/constants.js';

const STATUS_LABELS = {
  active: { text: "ACTIVE", bg: "#14301a", fg: "#4ade80", border: "#4ade8040" },
  wip: { text: "WIP", bg: "#302014", fg: "#f59e0b", border: "#f59e0b40" },
  coming_soon: { text: "LOCKED", bg: "#18182a", fg: "#555", border: "#33334a" },
};

export function ClassPicker({ onSelect }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      position: "relative",
      minHeight: "100vh",
      color: "#c8c8d4",
      background: "#07070c",
      // Static corner ambient — subtle violet/red hint that stays still while
      // the amber torchlight (below, in the .classpicker-glow layers) breathes.
      backgroundImage:
        "radial-gradient(ellipse at top left, rgba(168, 85, 247, 0.07) 0%, rgba(10, 10, 15, 0) 45%), " +
        "radial-gradient(ellipse at bottom right, rgba(239, 68, 68, 0.06) 0%, rgba(10, 10, 15, 0) 45%)",
      padding: "48px 24px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      boxSizing: "border-box",
      overflow: "hidden",
    }}>
      <style>{`
        /* Fonts (Cinzel + JetBrains Mono) are self-hosted via @fontsource
           and imported in src/main.jsx. No @import or CDN link needed. */

        /* Main central torch glow — animated via transform/opacity on a
           dedicated layer so only the GPU compositor does the work. */
        @keyframes torchBreathe {
          0%, 100% { opacity: 0.85; transform: translate(-50%, -50%) scale(1); }
          50%      { opacity: 1;    transform: translate(-50%, -50%) scale(1.06); }
        }
        /* Title flicker — opacity only. text-shadow is paint-bound, so the
           shadow is static at its brightest value (below) and only opacity
           animates. */
        @keyframes torchFlicker {
          0%, 100% { opacity: 1;    }
          22%      { opacity: 0.94; }
          41%      { opacity: 0.98; }
          63%      { opacity: 0.90; }
          82%      { opacity: 0.97; }
        }

        .classpicker-glow-primary {
          position: absolute;
          top: 50%; left: 50%;
          width: 100vw; height: 100vh;
          pointer-events: none;
          background: radial-gradient(ellipse at center,
            rgba(245, 158, 11, 0.16) 0%,
            rgba(245, 158, 11, 0.07) 18%,
            rgba(245, 158, 11, 0.03) 35%,
            rgba(10, 10, 15, 0)     55%);
          animation: torchBreathe 5.5s ease-in-out infinite;
          will-change: opacity, transform;
        }

        /* Respect reduced-motion: kill the continuously-running animations
           entirely. The static glow and vignette still light the scene. */
        @media (prefers-reduced-motion: reduce) {
          .classpicker-glow-primary,
          .classpicker-title { animation: none; }
        }

        /* Dark vignette — pulls the edges of the page into near-black so the
           central torch glow reads as the only light source in the room. */
        .classpicker-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(ellipse at center,
            rgba(0, 0, 0, 0)    30%,
            rgba(0, 0, 0, 0.45) 65%,
            rgba(0, 0, 0, 0.82) 100%);
        }

        /* Parchment / stone grain. SVG fractalNoise baked into a data URL
           so no extra HTTP request, no asset to ship. feColorMatrix
           desaturates to luminance. Previously used mix-blend-mode: overlay
           for a nicer "baked in" look, but that prevented GPU layer caching
           and forced full-viewport repaints on every frame of the torch
           animations — the main source of hover stutter. A straight
           low-opacity wash is visually close enough and essentially free. */
        .classpicker-texture {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.08;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.72' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }

        .classpicker-title {
          animation: torchFlicker 3.6s ease-in-out infinite;
          /* Hint the compositor to put the title on its own layer so the
             opacity animation stays off the main thread. */
          will-change: opacity;
        }

        /* ═══ Class cards ═══
           All hover/focus visuals are pure CSS so React doesn't re-render
           the grid on every mouse enter/leave. Per-class accent color is
           passed via the --class-color custom property on each card's
           inline style, so the same static CSS rules work for every class. */
        .classpicker-card {
          position: relative;
          background: linear-gradient(145deg, #101018 0%, #0b0b12 100%);
          border: 1px solid #1e1e2e;
          border-radius: 6px;
          padding: 18px 14px 14px;
          min-height: 220px;
          display: flex;
          flex-direction: column;
          user-select: none;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
          /* Transition ONLY cheap, compositor-friendly properties.
             box-shadow and background are paint-bound, so the hover glow
             lives on a ::before pseudo-element below and animates opacity. */
          transition: transform 0.18s ease, border-color 0.18s ease;
          contain: layout paint;
        }
        /* Pre-rasterized hover glow. The shadow gets painted into this
           pseudo-element's layer ONCE and is then composited cheaply on
           every hover via opacity. Avoids paint-on-first-hover stutter. */
        .classpicker-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          box-shadow:
            0 0 18px var(--class-color-shadow),
            0 6px 18px rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.18s ease;
          pointer-events: none;
        }
        .classpicker-card:hover,
        .classpicker-card:focus-visible {
          transform: translateY(-3px);
          border-color: var(--class-color);
          will-change: transform;
          outline: none;
        }
        .classpicker-card:hover::before,
        .classpicker-card:focus-visible::before {
          opacity: 1;
        }
        .classpicker-card:hover .classpicker-card-name,
        .classpicker-card:focus-visible .classpicker-card-name {
          color: var(--class-color);
        }
        .classpicker-card:hover .classpicker-card-accent,
        .classpicker-card:focus-visible .classpicker-card-accent {
          transform: scaleX(1.71);
        }
        .classpicker-card:hover .classpicker-card-prompt,
        .classpicker-card:focus-visible .classpicker-card-prompt {
          color: var(--class-color);
        }
        /* Pseudo-element text swap lets the "Select → Enter ▶" effect
           live in CSS instead of React state. */
        .classpicker-card-prompt::before { content: "Select"; }
        .classpicker-card:hover .classpicker-card-prompt::before,
        .classpicker-card:focus-visible .classpicker-card-prompt::before {
          content: "Enter ▶";
        }

        /* Locked variant — hover/focus do nothing on locked cards. opacity
           alone provides the dim/disabled affordance; the accent bar gets
           a fixed muted color since --class-color is set inline (and so
           wins specificity over a CSS rule on the locked variant). */
        .classpicker-card-locked {
          cursor: not-allowed;
          opacity: 0.55;
        }
        .classpicker-card-locked .classpicker-card-accent {
          background: #3a3a4a;
        }
        .classpicker-card-locked:hover,
        .classpicker-card-locked:focus-visible {
          transform: none;
          border-color: #1e1e2e;
          will-change: auto;
        }
        .classpicker-card-locked:hover::before,
        .classpicker-card-locked:focus-visible::before {
          opacity: 0;
        }
        .classpicker-card-locked:hover .classpicker-card-name,
        .classpicker-card-locked:focus-visible .classpicker-card-name {
          color: #e0e0ec;
        }
        .classpicker-card-locked:hover .classpicker-card-accent,
        .classpicker-card-locked:focus-visible .classpicker-card-accent {
          transform: none;
        }
        .classpicker-card-locked .classpicker-card-prompt,
        .classpicker-card-locked:hover .classpicker-card-prompt,
        .classpicker-card-locked:focus-visible .classpicker-card-prompt {
          color: #3a3a4a;
        }
        .classpicker-card-locked .classpicker-card-prompt::before,
        .classpicker-card-locked:hover .classpicker-card-prompt::before,
        .classpicker-card-locked:focus-visible .classpicker-card-prompt::before {
          content: "Coming Soon";
        }

        /* Card inner elements. Colors/widths are driven by the parent's
           :hover/:focus-visible states above. */
        .classpicker-card-name {
          font-family: 'Cinzel', serif;
          font-size: 22px;
          font-weight: 700;
          color: #e0e0ec;
          letter-spacing: 0.06em;
          margin-bottom: 10px;
          transition: color 0.18s ease;
        }
        .classpicker-card-accent {
          width: 28px;
          height: 2px;
          background: var(--class-color);
          margin-bottom: 14px;
          /* GPU-accelerated grow: scaleX with origin: left grows the bar
             from the left edge without triggering layout. cubic-bezier
             gives a snappier "punch out" feel than the default ease. */
          transform-origin: left center;
          transition: transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1.2);
        }
        .classpicker-card-locked .classpicker-card-accent { opacity: 0.5; }
        .classpicker-card-prompt {
          font-size: 9px;
          color: #444;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-top: 12px;
          text-align: right;
          transition: color 0.18s ease;
        }

        /* Stacking context: content goes above the glow + vignette layers */
        .classpicker-content { position: relative; z-index: 1; width: 100%; display: flex; flex-direction: column; align-items: center; }

        /* Responsive: collapse the 5-column grid on narrow screens so cards
           don't overflow the viewport. */
        @media (max-width: 1100px) {
          .classpicker-grid { grid-template-columns: repeat(3, minmax(160px, 220px)) !important; }
        }
        @media (max-width: 720px) {
          .classpicker-grid { grid-template-columns: repeat(2, minmax(140px, 1fr)) !important; }
          .classpicker-title { font-size: 28px !important; }
        }
      `}</style>

      {/* Background layers, behind the content. Stacking order (bottom → top):
          stone texture → breathe glow → dark vignette. */}
      <div className="classpicker-texture" aria-hidden="true" />
      <div className="classpicker-glow-primary" aria-hidden="true" />
      <div className="classpicker-vignette" aria-hidden="true" />

      {/* Content stacking context wraps the rest of the picker. */}
      <div className="classpicker-content">

      {/* ═══ Header ═══ */}
      <div style={{ textAlign: "center", marginBottom: 48, maxWidth: 820 }}>
        <div style={{
          fontSize: 10,
          color: "#666",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          marginBottom: 14,
        }}>
          ⚔  Dark and Darker  ⚔
        </div>
        <h1 className="classpicker-title" style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 46,
          fontWeight: 700,
          color: "#f59e0b",
          letterSpacing: "0.18em",
          margin: 0,
          // Static shadow at the brightest value the old flicker animation
          // reached. Matches the previous peak so the title doesn't read
          // dimmer now that text-shadow is no longer in the keyframes.
          textShadow: "0 0 28px rgba(245, 158, 11, 0.55), 0 0 56px rgba(245, 158, 11, 0.22)",
        }}>
          CHOOSE YOUR ADVENTURER
        </h1>
        <div style={{
          fontSize: 11,
          color: "#5a5a6e",
          marginTop: 12,
          letterSpacing: "0.1em",
        }}>
          {GAME_VERSION.season} · {GAME_VERSION.hotfix} · Character Simulator
        </div>
      </div>

      {/* ═══ Class grid (5 cols × 2 rows) ═══ */}
      <div className="classpicker-grid" style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(160px, 200px))",
        gap: 16,
        maxWidth: 1100,
        width: "100%",
      }}>
        {CLASS_ROSTER.map((cls) => {
          const isLocked = cls.status === "coming_soon";
          const statusLabel = STATUS_LABELS[cls.status];

          return (
            <div
              key={cls.id}
              // Accessibility: each card acts as a button. Locked cards get
              // tabIndex={-1} and aria-disabled so screen readers announce
              // them as unavailable. Enter/Space activate a card exactly
              // like a click. All hover/focus visuals live in CSS (see
              // .classpicker-card in the <style> block above) so we don't
              // re-render the grid on mouse moves — that React churn was
              // the main source of hover stutter.
              role="button"
              aria-label={isLocked ? `${cls.name} (coming soon)` : `Select ${cls.name}`}
              aria-disabled={isLocked || undefined}
              tabIndex={isLocked ? -1 : 0}
              title={isLocked ? "Coming soon — not yet implemented" : undefined}
              className={isLocked ? "classpicker-card classpicker-card-locked" : "classpicker-card"}
              // Per-class accent color is passed via CSS custom properties
              // so the static CSS rules can read it for border, shadow,
              // accent bar, and hover-state text colors. --class-color-shadow
              // is pre-built with an alpha suffix so we don't need color-mix().
              style={{
                '--class-color': cls.color,
                '--class-color-shadow': `${cls.color}33`,
              }}
              onClick={() => !isLocked && onSelect(cls.id)}
              onKeyDown={(e) => {
                if (isLocked) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(cls.id);
                }
              }}
            >
              {/* Status pill */}
              <div style={{
                alignSelf: "flex-start",
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: statusLabel.fg,
                background: statusLabel.bg,
                border: `1px solid ${statusLabel.border}`,
                borderRadius: 3,
                padding: "2px 6px",
                marginBottom: 12,
              }}>
                {isLocked && "🔒 "}{statusLabel.text}
              </div>

              {/* Class name — styles in .classpicker-card-name */}
              <div className="classpicker-card-name">{cls.name}</div>

              {/* Accent bar — width animates from 28 → 48 on parent hover */}
              <div className="classpicker-card-accent" />

              {/* Tagline */}
              <div style={{
                fontSize: 10,
                color: "#7a7a8e",
                lineHeight: 1.5,
                fontStyle: "italic",
                flex: 1,
              }}>
                {cls.tagline}
              </div>

              {/* Bottom prompt — text is driven by a CSS ::before pseudo-
                  element so the "Select → Enter ▶" swap happens in pure
                  CSS without any React state. Locked cards' ::before says
                  "Coming Soon". */}
              <div className="classpicker-card-prompt" />
            </div>
          );
        })}
      </div>

      {/* ═══ Footer ═══ */}
      <div style={{
        marginTop: 48,
        fontSize: 9,
        color: "#444",
        textAlign: "center",
        maxWidth: 600,
        lineHeight: 1.6,
      }}>
        <div>Accuracy-first character simulator. Every formula traces to a verified source.</div>
        <div style={{ marginTop: 4 }}>
          Class data is in progress — locked classes are coming. Warlock is fully supported; Fighter is a stub.
        </div>
      </div>
      </div>{/* end .classpicker-content */}
    </div>
  );
}
