/** Styles injected into the stage SVG. Colours come from the theme's CSS variables. */
export const STAGE_CSS = `
.ss-stage { overflow: visible; }
.ss-stage .ft { fill: var(--f-top); }
.ss-stage .fl { fill: var(--f-left); }
.ss-stage .fr { fill: var(--f-right); }
.ss-stage .fs { fill: var(--f-soft); }
.ss-stage .ft, .ss-stage .fl, .ss-stage .fr, .ss-stage .fs {
  stroke: var(--f-outline); stroke-width: 1; stroke-linejoin: round;
  transition: fill 300ms cubic-bezier(.2,.7,.2,1), stroke 300ms cubic-bezier(.2,.7,.2,1);
}
.ss-stage .detail { fill: none; stroke: var(--f-outline); stroke-width: 1; opacity: .55; }
.ss-stage .glyph { fill: none; stroke: var(--glyph); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
.ss-stage .glyph-fill { fill: var(--glyph); }
.ss-stage .led { fill: var(--led); transition: fill 300ms; }
.ss-stage .is-degraded .led { fill: var(--warn); animation: ss-pulse 900ms ease-in-out infinite; }
.ss-stage .is-down .led { fill: var(--muted); opacity: .45; }
@keyframes ss-pulse { 50% { opacity: .25; } }

.ss-stage .ss-floor-top { fill: var(--floor-top); stroke: var(--line); stroke-width: 1; }
.ss-stage .ss-floor-left { fill: var(--floor-edge); }
.ss-stage .ss-floor-right { fill: color-mix(in srgb, var(--floor-edge) 88%, #000); }
.ss-stage .ss-floor-grid { stroke: var(--floor-grid); stroke-width: 1; }

.ss-stage .ss-link { fill: none; stroke: var(--link); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: stroke 300ms, opacity 250ms; }
.ss-stage .ss-link.is-dashed { stroke-dasharray: 6 5; }
.ss-stage .ss-link.is-failing { stroke: var(--fail); stroke-dasharray: 5 5; }
.ss-stage .ss-arrow { fill: var(--link); transition: fill 300ms, opacity 250ms; }
.ss-stage .ss-arrow.is-failing { fill: var(--fail); }
.ss-stage .ss-link-label { font: 600 11.5px var(--font-mono); fill: var(--muted); text-anchor: middle; }

.ss-stage .ss-label { font: 600 13.5px var(--font-mono); fill: var(--ink); text-anchor: middle;
  paint-order: stroke; stroke: var(--floor-top); stroke-width: 4px; stroke-linejoin: round; }
.ss-stage .ss-sublabel { font: 500 12px var(--font-mono); fill: var(--muted); text-anchor: middle;
  paint-order: stroke; stroke: var(--floor-top); stroke-width: 4px; stroke-linejoin: round; }
.ss-stage .ss-pill rect { fill: var(--card); stroke: var(--line-strong); stroke-width: 1; transition: stroke 300ms; }
.ss-stage .ss-pill text { font: 600 11.5px var(--font-mono); fill: var(--ink-2); text-anchor: middle; }
.ss-stage .ss-pill .dot { fill: var(--accent); }
.ss-stage .ss-pill.is-warn rect { stroke: var(--warn); fill: var(--warn-soft); }
.ss-stage .ss-pill.is-warn .dot { fill: var(--warn); }
.ss-stage .ss-pill.is-warn text { fill: var(--warn-text); }
.ss-stage .ss-pill.is-fail rect { stroke: var(--fail); fill: var(--fail-soft); }
.ss-stage .ss-pill.is-fail .dot { fill: var(--fail); }
.ss-stage .ss-pill.is-fail text { fill: var(--fail-text); }
.ss-stage .ss-badge circle { fill: var(--fail); }
.ss-stage .ss-badge path { stroke: var(--card); stroke-width: 2; stroke-linecap: round; }

.ss-stage .ss-packet .core { fill: var(--accent); }
.ss-stage .ss-packet .glow { fill: var(--accent); opacity: .22; }
.ss-stage .ss-packet.k-response .core, .ss-stage .ss-packet.k-response .glow { fill: var(--accent-dark); }
.ss-stage .ss-packet.k-failed .core, .ss-stage .ss-packet.k-failed .glow,
.ss-stage .ss-packet.k-checkFailing .core, .ss-stage .ss-packet.k-checkFailing .glow { fill: var(--fail); }
.ss-stage .ss-packet.k-healthCheck .core, .ss-stage .ss-packet.k-healthCheck .glow { fill: var(--packet-health); }
.ss-stage .ss-shadow { fill: var(--ink); opacity: .13; }
`;
