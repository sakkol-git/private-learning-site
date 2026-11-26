/**
 * Break-it scenarios append new bars after the revealed ones. They are pure
 * functions of the step state and elapsed time, so tests can sample any moment.
 */
import { extendSeries, type Move } from './series';
import { isTradeOpen } from './trading';
import type { Market } from './market';
import type { ChartNote, ChartState } from './types';

export interface ChartScenario {
  /** Changes whenever the chart should redraw (here: once per new bar). */
  phaseAt(t: number): number;
  stateAt(t: number): ChartState;
}

export type ChartScenarios<A extends string> = Record<
  A,
  (base: ChartState) => ChartScenario | null
>;

/** One new bar appears every BAR_MS of scenario time. */
export const BAR_MS = 250;

export interface EventMove extends Move {
  note?: string;
}

function marketOfState(state: ChartState): Market {
  return state.account.kind === 'fx'
    ? { tick: state.tick, decimals: state.decimals, delta: (_p, m) => m * state.tick }
    : { tick: state.tick, decimals: state.decimals, delta: (p, m) => (p * m) / 100 };
}

/** Direction that hurts the open trade (down when there is none). */
export function against(base: ChartState): 1 | -1 {
  if (!isTradeOpen(base)) return -1;
  return base.position?.side === 'sell' ? 1 : -1;
}

/**
 * Plays scripted moves after the revealed bars: `main` for the main symbol and
 * `others(symbol)` for any comparison series. `pad` widens each bar, in move units.
 */
export function playMoves(
  base: ChartState,
  main: EventMove[],
  pad: number,
  others: (symbol: string) => Move[] = () => main.map(() => ({ move: 0 })),
): ChartScenario {
  const market = marketOfState(base);
  const grow = (series: ChartState['series'], moves: readonly Move[]) => {
    const last = series[base.reveal - 1];
    return [
      ...series.slice(0, base.reveal),
      ...(last ? extendSeries(last, moves, market, pad) : []),
    ];
  };
  const series = grow(base.series, main);
  const otherSeries = base.others.map((o) => ({
    symbol: o.symbol,
    series: grow(o.series, others(o.symbol)),
  }));
  const notes: ChartNote[] = main.flatMap((m, i) =>
    m.note
      ? [
          {
            id: `event-${i}`,
            bar: base.reveal + i,
            text: m.note,
            at: m.move + (m.gap ?? 0) < 0 ? 'low' : 'high',
          },
        ]
      : [],
  );
  const shown = (t: number) => Math.min(main.length, Math.floor(t / BAR_MS));
  return {
    phaseAt: shown,
    stateAt: (t) => {
      const k = shown(t);
      const latest = series[base.reveal + k - 1];
      return {
        ...base,
        series,
        others: otherSeries,
        reveal: base.reveal + k,
        showSpread: base.showSpread || (k > 0 && latest?.spread !== undefined),
        notes: [...base.notes, ...notes.filter((n) => n.bar < base.reveal + k)],
      };
    },
  };
}
