/** Stock preset: break-it scenarios, in percent per daily bar. */
import { against, playMoves, type ChartScenarios } from './scenario';

export type StockAction = 'earningsGap' | 'marketSelloff' | 'companyCollapse' | 'shortSqueeze';

/** Bars added by scenarios are this many percent taller than their body on each side. */
const PAD = 0.6;

export const stockScenarios: ChartScenarios<StockAction> = {
  /** Results disappoint (or beat, for a short): the stock opens 20% away overnight. */
  earningsGap: (base) => {
    const d = against(base);
    return playMoves(
      base,
      [
        { move: d * 0.5 },
        { gap: d * 20, move: d * 2, note: d < 0 ? 'Earnings miss' : 'Earnings beat' },
        { move: -d * 1.5 },
        { move: d * 1 },
        { move: -d * 0.5 },
      ],
      PAD,
    );
  },
  /** Fear spreads: everything falls for two weeks, single stocks more than the index. */
  marketSelloff: (base) =>
    playMoves(
      base,
      Array.from({ length: 10 }, (_, i) => ({
        move: i === 0 ? -3.5 : i % 4 === 3 ? 1 : -2.8,
        ...(i === 0 ? { note: 'Market sell-off' } : {}),
      })),
      PAD,
      () => Array.from({ length: 10 }, (_, i) => ({ move: i % 4 === 3 ? 0.6 : -1.6 })),
    ),
  /** The company itself fails: the stock loses almost everything, the index barely notices. */
  companyCollapse: (base) =>
    playMoves(
      base,
      [
        { gap: -55, move: -5, note: 'Accounts found false' },
        { move: -30 },
        { move: -25 },
        { move: -35 },
        { move: 5 },
        { move: -25 },
      ],
      PAD,
      () => [
        { move: -1.2 },
        { move: -0.4 },
        { move: 0.3 },
        { move: 0.2 },
        { move: 0.4 },
        { move: 0.1 },
      ],
    ),
  /** Short sellers rush to buy back at once and push the price up fast. */
  shortSqueeze: (base) =>
    playMoves(
      base,
      [
        { move: 6, note: 'Short squeeze' },
        { move: 12 },
        { move: 16 },
        { move: 20 },
        { move: 12 },
        { move: 8 },
      ],
      PAD,
    ),
};

/** Actions that only make sense with an open trade. */
export const STOCK_NEEDS_POSITION: readonly StockAction[] = ['earningsGap', 'shortSqueeze'];
