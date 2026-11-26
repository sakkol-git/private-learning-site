import type { Market } from './market';
import type { Candle, SeriesSpec } from './types';

/** Small, fast, seeded PRNG (mulberry32): the same seed always gives the same prices. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Generates a whole price series: a seeded random walk plus scripted shocks. */
export function generateSeries(spec: SeriesSpec, bars: number, market: Market): Candle[] {
  const rand = seededRandom(spec.seed);
  const shocks = new Map((spec.shocks ?? []).map((s) => [s.bar, s]));
  const out: Candle[] = [];
  let close = spec.start;
  for (let i = 0; i < bars; i++) {
    const shock = shocks.get(i);
    const noise = (rand() - 0.5) * 2 * spec.volatility;
    const move = shock ? shock.move : noise + (spec.trend ?? 0);
    const o = close;
    const c = o + market.delta(o, move);
    const up = market.delta(o, (rand() * 0.6 + 0.1) * spec.volatility);
    const down = market.delta(o, (rand() * 0.6 + 0.1) * spec.volatility);
    let h = Math.max(o, c) + up;
    let l = Math.min(o, c) - down;
    if (shock?.wick && shock.wick > 0) h += market.delta(o, shock.wick);
    if (shock?.wick && shock.wick < 0) l += market.delta(o, shock.wick);
    out.push({
      o,
      h,
      l,
      c,
      v: Math.min(1, 0.25 + Math.abs(move) / (spec.volatility * 3) + rand() * 0.2),
    });
    close = c;
  }
  return out;
}

export interface Move {
  move: number;
  wick?: number;
  /** Jump between the previous close and this bar's open. */
  gap?: number;
  /** Spread in ticks during this bar. */
  spread?: number;
}

/** Appends bars that follow a list of moves (used by break-it scenarios). */
export function extendSeries(
  from: Candle,
  moves: readonly Move[],
  market: Market,
  pad: number,
): Candle[] {
  const out: Candle[] = [];
  let close = from.c;
  for (const m of moves) {
    const o = close + market.delta(close, m.gap ?? 0);
    const c = o + market.delta(o, m.move);
    const edge = market.delta(o, pad);
    let h = Math.max(o, c) + edge;
    let l = Math.min(o, c) - edge;
    if (m.wick && m.wick > 0) h += market.delta(o, m.wick);
    if (m.wick && m.wick < 0) l += market.delta(o, m.wick);
    out.push({
      o,
      h,
      l,
      c,
      v: Math.min(1, 0.3 + Math.abs(m.move + (m.gap ?? 0)) / (pad * 25)),
      ...(m.spread !== undefined ? { spread: m.spread } : {}),
    });
    close = c;
  }
  return out;
}

/** Simple moving average of closes; null until there are enough bars. */
export function sma(series: readonly Candle[], period: number): (number | null)[] {
  let sum = 0;
  return series.map((bar, i) => {
    sum += bar.c;
    const old = series[i - period];
    if (old) sum -= old.c;
    return i >= period - 1 ? sum / period : null;
  });
}
