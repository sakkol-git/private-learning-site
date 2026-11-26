import type { Candle, ChartInitial } from './types';

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

/** Generates the lesson's whole price series: a seeded random walk plus scripted shocks. */
export function generateSeries(init: ChartInitial): Candle[] {
  const rand = seededRandom(init.seed);
  const shocks = new Map((init.shocks ?? []).map((s) => [s.bar, s]));
  const out: Candle[] = [];
  let close = init.start;
  for (let i = 0; i < init.bars; i++) {
    const shock = shocks.get(i);
    const noise = (rand() - 0.5) * 2 * init.volatility;
    const move = shock ? shock.pips : noise + (init.trend ?? 0);
    const o = close;
    const c = o + move * init.pip;
    const up = (rand() * 0.6 + 0.1) * init.volatility * init.pip;
    const down = (rand() * 0.6 + 0.1) * init.volatility * init.pip;
    let h = Math.max(o, c) + up;
    let l = Math.min(o, c) - down;
    if (shock?.wick && shock.wick > 0) h += shock.wick * init.pip;
    if (shock?.wick && shock.wick < 0) l += shock.wick * init.pip;
    out.push({
      o,
      h,
      l,
      c,
      v: Math.min(1, 0.25 + Math.abs(move) / (init.volatility * 3) + rand() * 0.2),
    });
    close = c;
  }
  return out;
}

/** Appends bars that follow a list of close-to-close moves (used by break-it scenarios). */
export function extendSeries(
  from: Candle,
  moves: { pips: number; wick?: number; gap?: number; spread?: number }[],
  pip: number,
): Candle[] {
  const out: Candle[] = [];
  let close = from.c;
  for (const m of moves) {
    const o = close + (m.gap ?? 0) * pip;
    const c = o + m.pips * pip;
    let h = Math.max(o, c) + 1.5 * pip;
    let l = Math.min(o, c) - 1.5 * pip;
    if (m.wick && m.wick > 0) h += m.wick * pip;
    if (m.wick && m.wick < 0) l += m.wick * pip;
    out.push({
      o,
      h,
      l,
      c,
      v: Math.min(1, 0.3 + Math.abs(m.pips + (m.gap ?? 0)) / 40),
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
