/**
 * Pure SVG markup for one chart frame. Colours come from theme CSS variables
 * (see chart-styles.ts), so light and dark themes need no code changes.
 */
import { sma } from './series';
import type { Evaluation } from './trading';
import type { ChartState } from './types';

export const WIDTH = 760;
export const HEIGHT = 380;
const LEFT = 10;
const AXIS = 104;
const TAG_W = 96;
const TAG_GAP = 20;
const TOP = 34;
const BOTTOM = 18;
const VOLUME = 54;
/** Room kept on the right for bars that break-it scenarios add. */
const SPARE_SLOTS = 16;

/** The fixed scale for a lesson: bar slots across, and the price range down. */
export interface Frame {
  slots: number;
  low: number;
  high: number;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r = (n: number) => Math.round(n * 10) / 10;

export function formatPrice(price: number, pip: number): string {
  const decimals = Math.max(0, Math.round(-Math.log10(pip)) + 1);
  return price.toFixed(decimals);
}

/** "+$300", "−$1,250". */
export function formatUsd(value: number, signed = false): string {
  const sign = value < 0 ? '−' : signed && value > 0 ? '+' : '';
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
}

function priceRange(state: ChartState, e: Evaluation): [number, number] {
  let low = Infinity;
  let high = -Infinity;
  for (const bar of state.series.slice(0, state.reveal)) {
    low = Math.min(low, bar.l);
    high = Math.max(high, bar.h);
  }
  const extra = [
    ...state.levels.map((l) => l.price),
    ...(e.trade ? [e.trade.entry, e.trade.stop, e.trade.target] : []),
    ...(e.closed ? [e.closed.price] : []),
  ].filter((p): p is number => p !== null);
  for (const p of extra) {
    low = Math.min(low, p);
    high = Math.max(high, p);
  }
  return [low, high];
}

/** A scale that fits every step of the lesson, so the chart does not jump between steps. */
export function frameFor(items: { state: ChartState; e: Evaluation }[]): Frame {
  let low = Infinity;
  let high = -Infinity;
  let slots = 0;
  for (const { state, e } of items) {
    const [l, h] = priceRange(state, e);
    low = Math.min(low, l);
    high = Math.max(high, h);
    slots = Math.max(slots, state.reveal);
  }
  const pad = (high - low) * 0.12 || 0.001;
  return { slots: slots + SPARE_SLOTS, low: low - pad, high: high + pad };
}

/** Grows the frame when a scenario pushes price or bars outside it. */
export function fitFrame(frame: Frame, state: ChartState, e: Evaluation): Frame {
  const [l, h] = priceRange(state, e);
  // Generous room so notes and exit labels on new extremes stay inside the plot.
  const pad = (Math.max(frame.high, h) - Math.min(frame.low, l)) * 0.16;
  return {
    slots: Math.max(frame.slots, state.reveal + 2),
    low: Math.min(frame.low, l - pad),
    high: Math.max(frame.high, h + pad),
  };
}

function niceStep(range: number): number {
  const raw = range / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3.5 ? 2 : norm < 7.5 ? 5 : 10) * mag;
}

export function renderChart(state: ChartState, e: Evaluation, frame: Frame): string {
  const right = WIDTH - AXIS;
  const plotBottom = HEIGHT - BOTTOM - (state.showVolume ? VOLUME + 8 : 0);
  const slot = (right - LEFT) / frame.slots;
  const x = (i: number) => LEFT + (i + 0.5) * slot;
  const y = (p: number) => TOP + ((frame.high - p) / (frame.high - frame.low)) * (plotBottom - TOP);
  const price = (p: number) => formatPrice(p, state.pip);
  const bars = state.series.slice(0, state.reveal);
  const out: string[] = [];
  const tags: { cls: string; y: number; text: string }[] = [];
  const tag = (cls: string, p: number, text: string) => tags.push({ cls, y: y(p), text });

  // Header and grid
  out.push(
    `<text class="cs-title" x="${LEFT}" y="18">${esc(state.pair)} · ${esc(state.timeframe)}</text>`,
  );
  const step = niceStep(frame.high - frame.low);
  for (let p = Math.ceil(frame.low / step) * step; p <= frame.high; p += step) {
    out.push(
      `<line class="cs-grid" x1="${LEFT}" x2="${right}" y1="${r(y(p))}" y2="${r(y(p))}"/>`,
      `<text class="cs-axis" x="${right + 8}" y="${r(y(p) + 4)}">${price(p)}</text>`,
    );
  }

  if (state.highlight !== null) {
    out.push(
      `<rect class="cs-highlight" x="${r(x(state.highlight) - slot / 2)}" y="${TOP - 6}" width="${r(slot)}" height="${r(plotBottom - TOP + 12)}" rx="3"/>`,
    );
  }

  // Risk and reward zones of the trade
  const t = e.trade;
  // While open, zones and lines run to the edge; once closed they stop at the exit.
  const tradeEnd = e.closed ? x(e.closed.bar) : right;
  if (t) {
    const x0 = x(t.openBar);
    const x1 = Math.max(x0 + slot, tradeEnd);
    const box = (cls: string, a: number, b: number) =>
      `<rect class="${cls}" x="${r(x0)}" y="${r(Math.min(y(a), y(b)))}" width="${r(x1 - x0)}" height="${r(Math.abs(y(a) - y(b)))}"/>`;
    if (t.stop !== null) out.push(box('cs-risk', t.entry, t.stop));
    if (t.target !== null) out.push(box('cs-reward', t.entry, t.target));
  }

  if (state.showVolume) {
    const top = plotBottom + 8;
    const h = HEIGHT - BOTTOM - top;
    out.push(`<line class="cs-grid" x1="${LEFT}" x2="${right}" y1="${top + h}" y2="${top + h}"/>`);
    bars.forEach((b, i) => {
      const bh = Math.max(1, b.v * h);
      out.push(
        `<rect class="cs-volume" x="${r(x(i) - slot * 0.3)}" y="${r(top + h - bh)}" width="${r(slot * 0.6)}" height="${r(bh)}"/>`,
      );
    });
    out.push(`<text class="cs-axis" x="${right + 8}" y="${top + 10}">Volume</text>`);
  }

  // Price
  if (state.style === 'line') {
    out.push(
      `<polyline class="cs-line" points="${bars.map((b, i) => `${r(x(i))},${r(y(b.c))}`).join(' ')}"/>`,
    );
  } else {
    const body = Math.max(1.5, slot * 0.62);
    bars.forEach((b, i) => {
      const up = b.c >= b.o;
      const top = y(Math.max(b.o, b.c));
      const height = Math.max(1, Math.abs(y(b.o) - y(b.c)));
      out.push(
        `<g class="cs-candle ${up ? 'cs-up' : 'cs-down'}"><line x1="${r(x(i))}" x2="${r(x(i))}" y1="${r(y(b.h))}" y2="${r(y(b.l))}"/><rect x="${r(x(i) - body / 2)}" y="${r(top)}" width="${r(body)}" height="${r(height)}"/></g>`,
      );
    });
  }

  // Bid/ask band, drawn under labels and notes
  const latest = bars[bars.length - 1];
  if (latest) {
    const lastSpread = latest.spread ?? state.spread;
    if (state.showSpread) {
      const half = (lastSpread * state.pip) / 2;
      const bid = latest.c - half;
      const ask = latest.c + half;
      out.push(
        `<rect class="cs-spread" x="${r(x(bars.length - 1))}" y="${r(y(ask))}" width="${r(right - x(bars.length - 1))}" height="${r(Math.max(2, y(bid) - y(ask)))}"/>`,
        `<text class="cs-spread-label" x="${right - 4}" y="18">Bid ${price(bid)} · Ask ${price(ask)} · Spread ${lastSpread} pips</text>`,
      );
    }
  }

  state.indicators.forEach((ind, n) => {
    const values = sma(bars, ind.period);
    const pts = values.flatMap((v, i) => (v === null ? [] : [`${r(x(i))},${r(y(v))}`]));
    const lastValue = values[values.length - 1];
    if (pts.length < 2 || lastValue === null || lastValue === undefined) return;
    out.push(`<polyline class="cs-sma cs-sma-${n % 3}" points="${pts.join(' ')}"/>`);
    out.push(
      `<text class="cs-sma-label cs-sma-${n % 3}" x="${r(x(bars.length - 1) + 6)}" y="${r(y(lastValue) - 6)}">SMA ${ind.period}</text>`,
    );
  });

  for (const level of state.levels) {
    out.push(
      `<line class="cs-level" x1="${LEFT}" x2="${right}" y1="${r(y(level.price))}" y2="${r(y(level.price))}"/>`,
      `<text class="cs-level-label" x="${LEFT + 4}" y="${r(y(level.price) - 5)}">${esc(level.label)}</text>`,
    );
  }

  // Trade lines, entry and exit
  if (t) {
    const x0 = x(t.openBar);
    const line = (cls: string, p: number) =>
      `<line class="${cls}" x1="${r(x0)}" x2="${r(Math.max(x0 + slot, tradeEnd))}" y1="${r(y(p))}" y2="${r(y(p))}"/>`;
    out.push(line('cs-entry', t.entry));
    if (t.stop !== null) out.push(line('cs-stop', t.stop));
    if (t.target !== null) out.push(line('cs-target', t.target));
    if (!e.closed) {
      tag('cs-tag-entry', t.entry, `${t.side === 'buy' ? 'Buy' : 'Sell'} ${price(t.entry)}`);
      if (t.stop !== null) tag('cs-tag-stop', t.stop, `Stop ${price(t.stop)}`);
      if (t.target !== null) tag('cs-tag-target', t.target, `Target ${price(t.target)}`);
    }
    const dir = t.side === 'buy' ? 1 : -1;
    const ey = y(t.entry) + dir * 14;
    out.push(`<path class="cs-marker" d="M${r(x0)},${r(ey - dir * 6)} l-5,${dir * 8} h10z"/>`);
  }
  if (e.closed) {
    const good = e.closed.pnl >= 0;
    const cx = x(e.closed.bar);
    const cy = y(e.closed.price);
    const label = `${e.closed.reason === 'target' ? 'Target hit' : e.closed.reason === 'stop' ? 'Stopped out' : 'Margin call'} ${formatUsd(e.closed.pnl, true)}`;
    out.push(
      `<g class="cs-exit ${good ? 'cs-exit-good' : 'cs-exit-bad'}"><circle cx="${r(cx)}" cy="${r(cy)}" r="5"/><text x="${r(cx + 9)}" y="${r(cy + (good ? -9 : 17))}">${esc(label)}</text></g>`,
    );
  }

  for (const note of state.notes) {
    const bar = state.series[note.bar];
    if (!bar || note.bar >= state.reveal) continue;
    const above = note.at !== 'low';
    const anchor = y(above ? bar.h : bar.l);
    const ty = anchor + (above ? -20 : 28);
    out.push(
      `<g class="cs-note"><line x1="${r(x(note.bar))}" x2="${r(x(note.bar))}" y1="${r(anchor + (above ? -3 : 3))}" y2="${r(ty + (above ? 4 : -12))}"/><text x="${r(x(note.bar))}" y="${r(ty)}">${esc(note.text)}</text></g>`,
    );
  }

  const last = bars[bars.length - 1];
  if (last) {
    tag('cs-tag-last', last.c, price(last.c));
  }
  out.push(
    ...placeTags(tags, TOP, plotBottom).map(
      (tg) =>
        `<g class="cs-tag ${tg.cls}" transform="translate(${right + 4} ${r(tg.y)})"><rect x="0" y="-9" width="${TAG_W}" height="18" rx="4"/><text x="${TAG_W / 2}" y="3.5">${esc(tg.text)}</text></g>`,
    ),
  );
  return out.join('');
}

/** Pushes price tags apart so none overlap, keeping each as close to its price as possible. */
export function placeTags<T extends { y: number }>(tags: T[], top: number, bottom: number): T[] {
  const sorted = [...tags].sort((a, b) => a.y - b.y).map((t) => ({ ...t }));
  // Downward pass: no tag closer than TAG_GAP to the one above it.
  sorted.forEach((cur, i) => {
    const prev = sorted[i - 1];
    if (prev && cur.y - prev.y < TAG_GAP) cur.y = prev.y + TAG_GAP;
  });
  // Upward pass: pull tags back inside the plot if the last one fell off the bottom.
  for (let i = sorted.length - 1; i >= 0; i--) {
    const cur = sorted[i];
    const next = sorted[i + 1];
    if (!cur) continue;
    const limit = next ? next.y - TAG_GAP : bottom;
    if (cur.y > limit) cur.y = limit;
  }
  return sorted.map((t) => ({ ...t, y: Math.max(top, t.y) }));
}
