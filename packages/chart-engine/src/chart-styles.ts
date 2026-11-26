/** Styles injected into the chart SVG. Colours come from the theme's CSS variables. */
export const CHART_CSS = `
.cs-stage { font-family: var(--font-mono); }
.cs-title { font: 600 12px var(--font-mono); fill: var(--muted); letter-spacing: .04em; }
.cs-grid { stroke: var(--line); stroke-width: 1; }
.cs-axis { font: 500 10.5px var(--font-mono); fill: var(--muted); }
.cs-highlight { fill: var(--accent-soft); opacity: .8; }
.cs-risk { fill: var(--fail-soft); opacity: .75; }
.cs-reward { fill: var(--accent-soft); opacity: .85; }
.cs-volume { fill: var(--line-strong); }
.cs-line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; }
.cs-candle line { stroke-width: 1.2; }
.cs-up line, .cs-up rect { stroke: var(--accent); }
.cs-up rect { fill: var(--card); stroke-width: 1.3; }
.cs-down line { stroke: var(--fail); }
.cs-down rect { fill: var(--fail); stroke: var(--fail); }
.cs-sma { fill: none; stroke-width: 1.8; stroke-linejoin: round; }
.cs-sma-label { font: 600 10.5px var(--font-mono); paint-order: stroke; stroke: var(--stage); stroke-width: 3px; }
.cs-sma-0 { stroke: var(--node-users); }
.cs-sma-label.cs-sma-0 { fill: var(--node-users); stroke: var(--stage); }
.cs-sma-1 { stroke: var(--warn); }
.cs-sma-label.cs-sma-1 { fill: var(--warn-text); stroke: var(--stage); }
.cs-sma-2 { stroke: var(--node-db); }
.cs-sma-label.cs-sma-2 { fill: var(--node-db); stroke: var(--stage); }
.cs-level { stroke: var(--muted); stroke-dasharray: 3 4; stroke-width: 1; }
.cs-level-label { font: 500 10.5px var(--font-mono); fill: var(--muted); }
.cs-entry { stroke: var(--ink-2); stroke-dasharray: 5 4; stroke-width: 1.3; }
.cs-stop { stroke: var(--fail); stroke-width: 1.5; }
.cs-target { stroke: var(--accent); stroke-width: 1.5; }
.cs-marker { fill: var(--ink-2); }
.cs-tag text { font: 600 10px var(--font-mono); text-anchor: middle; fill: var(--card); }
.cs-tag-last rect { fill: var(--ink); }
.cs-tag-entry rect { fill: var(--ink-2); }
.cs-tag-stop rect { fill: var(--fail); }
.cs-tag-target rect { fill: var(--accent); }
.cs-tag-target text { fill: var(--on-accent); }
.cs-exit circle { stroke: var(--card); stroke-width: 2; }
.cs-exit text { font: 700 11.5px var(--font-mono); paint-order: stroke; stroke: var(--stage); stroke-width: 4px; }
.cs-exit-good circle { fill: var(--accent); }
.cs-exit-good text { fill: var(--accent); }
.cs-exit-bad circle { fill: var(--fail); }
.cs-exit-bad text { fill: var(--fail-text); }
.cs-note line { stroke: var(--muted); stroke-width: 1; }
.cs-note text { font: 600 11px var(--font-mono); fill: var(--ink); text-anchor: middle; paint-order: stroke; stroke: var(--stage); stroke-width: 4px; }
.cs-spread { fill: var(--warn-soft); stroke: var(--warn); stroke-width: 1; opacity: .9; }
.cs-spread-label { font: 600 11px var(--font-mono); fill: var(--warn-text); text-anchor: end; }
`;
