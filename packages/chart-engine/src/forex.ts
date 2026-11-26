/**
 * Forex preset: break-it scenarios that append new bars after the revealed ones.
 * Deterministic: each scenario is a pure function of the step state and time.
 */
import { extendSeries } from './series';
import { evaluate } from './trading';
import type { ChartNote, ChartState } from './types';

export type ForexAction = 'priceMovesAgainst' | 'newsSpike' | 'weekendGap' | 'spreadWidens';

export interface ChartScenario {
  /** Changes whenever the chart should redraw (here: once per new bar). */
  phaseAt(t: number): number;
  stateAt(t: number): ChartState;
}

type Factory = (base: ChartState) => ChartScenario | null;

/** One new bar appears every BAR_MS of scenario time. */
export const BAR_MS = 250;

interface Move {
  pips: number;
  wick?: number;
  gap?: number;
  spread?: number;
  note?: string;
}

/** Direction that hurts the open trade (down if there is none). */
function against(base: ChartState): 1 | -1 {
  const e = evaluate(base);
  if (!e.trade || e.closed) return -1;
  return e.trade.side === 'buy' ? -1 : 1;
}

function playMoves(base: ChartState, moves: Move[]): ChartScenario {
  const last = base.series[base.reveal - 1];
  const ext = last ? extendSeries(last, moves, base.pip) : [];
  const series = [...base.series.slice(0, base.reveal), ...ext];
  const notes: ChartNote[] = moves.flatMap((m, i) =>
    m.note
      ? [{ id: `event-${i}`, bar: base.reveal + i, text: m.note, at: m.pips < 0 ? 'low' : 'high' }]
      : [],
  );
  const shown = (t: number) => Math.min(ext.length, Math.floor(t / BAR_MS));
  return {
    phaseAt: shown,
    stateAt: (t) => {
      const k = shown(t);
      const latest = ext[k - 1];
      return {
        ...base,
        series,
        reveal: base.reveal + k,
        showSpread: base.showSpread || latest?.spread !== undefined,
        notes: [...base.notes, ...notes.filter((n) => n.bar < base.reveal + k)],
      };
    },
  };
}

const priceMovesAgainst: Factory = (base) => {
  const d = against(base);
  return playMoves(
    base,
    Array.from({ length: 14 }, (_, i) => ({ pips: d * (i % 3 === 2 ? 3 : 8.5) })),
  );
};

const newsSpike: Factory = (base) => {
  const d = against(base);
  return playMoves(base, [
    { pips: d * 45, wick: d * 25, note: 'Rate decision' },
    { pips: -d * 18 },
    { pips: d * 6 },
    { pips: -d * 8 },
    { pips: d * 3 },
  ]);
};

const weekendGap: Factory = (base) => {
  const d = against(base);
  return playMoves(base, [
    { pips: -d * 2 },
    { gap: d * 60, pips: d * 6, note: 'Monday open: gap' },
    { pips: -d * 4 },
    { pips: d * 3 },
    { pips: -d * 2 },
  ]);
};

const spreadWidens: Factory = (base) => {
  const wide = Math.max(12, base.spread * 8);
  return playMoves(base, [
    { pips: 1, spread: wide, note: `Spread ${wide} pips` },
    { pips: -1, spread: wide },
    { pips: 1.5, spread: wide },
    { pips: -1, spread: wide },
    { pips: 0.5, spread: base.spread },
    { pips: 1, spread: base.spread },
  ]);
};

export const forexScenarios: Record<ForexAction, Factory> = {
  priceMovesAgainst,
  newsSpike,
  weekendGap,
  spreadWidens,
};

/** What must be true on the chart for each action to make sense. */
export const FOREX_ACTION_NEEDS: Record<ForexAction, 'open position' | null> = {
  priceMovesAgainst: 'open position',
  newsSpike: null,
  weekendGap: 'open position',
  spreadWidens: null,
};
