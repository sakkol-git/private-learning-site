/** Forex preset: break-it scenarios, in pips. */
import { against, playMoves, type ChartScenarios } from './scenario';

export type ForexAction = 'priceMovesAgainst' | 'newsSpike' | 'weekendGap' | 'spreadWidens';

/** Bars added by scenarios are this many pips taller than their body on each side. */
const PAD = 1.5;

export const forexScenarios: ChartScenarios<ForexAction> = {
  priceMovesAgainst: (base) => {
    const d = against(base);
    return playMoves(
      base,
      Array.from({ length: 14 }, (_, i) => ({ move: d * (i % 3 === 2 ? 3 : 8.5) })),
      PAD,
    );
  },
  newsSpike: (base) => {
    const d = against(base);
    return playMoves(
      base,
      [
        { move: d * 45, wick: d * 25, note: 'Rate decision' },
        { move: -d * 18 },
        { move: d * 6 },
        { move: -d * 8 },
        { move: d * 3 },
      ],
      PAD,
    );
  },
  weekendGap: (base) => {
    const d = against(base);
    return playMoves(
      base,
      [
        { move: -d * 2 },
        { gap: d * 60, move: d * 6, note: 'Monday open: gap' },
        { move: -d * 4 },
        { move: d * 3 },
        { move: -d * 2 },
      ],
      PAD,
    );
  },
  spreadWidens: (base) => {
    const wide = Math.max(12, base.spread * 8);
    return playMoves(
      base,
      [
        { move: 1, spread: wide, note: `Spread ${wide} pips` },
        { move: -1, spread: wide },
        { move: 1.5, spread: wide },
        { move: -1, spread: wide },
        { move: 0.5, spread: base.spread },
        { move: 1, spread: base.spread },
      ],
      PAD,
    );
  },
};

/** Actions that only make sense with an open trade. */
export const FOREX_NEEDS_POSITION: readonly ForexAction[] = ['priceMovesAgainst', 'weekendGap'];
