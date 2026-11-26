import type { Candle, ChartState, ForexMetrics } from './types';

const UNITS_PER_LOT = 100_000;
/** Brokers close positions when margin level falls to this percentage. */
const STOP_OUT_PCT = 50;

export interface TradeLevels {
  side: 'buy' | 'sell';
  units: number;
  entry: number;
  stop: number | null;
  target: number | null;
  openBar: number;
  margin: number;
}

interface ClosedTrade {
  bar: number;
  price: number;
  pnl: number;
  reason: 'stop' | 'target' | 'margin call';
}

export interface Evaluation {
  trade: TradeLevels | null;
  /** Set when the trade closed by itself (stop, target or margin call) within the revealed bars. */
  closed: ClosedTrade | null;
  /** The price the open trade would close at now (bid for buys, ask for sells). */
  mark: number | null;
  metrics: ForexMetrics;
}

const half = (state: ChartState, bar?: Candle) => ((bar?.spread ?? state.spread) * state.pip) / 2;

/** Works out entry, stop, target and margin from the authored position. */
export function tradeLevels(state: ChartState): TradeLevels | null {
  const p = state.position;
  const bar = p && state.series[p.openBar];
  if (!p || !bar) return null;
  const dir = p.side === 'buy' ? 1 : -1;
  const entry = bar.c + dir * half(state);
  const units = p.lots * UNITS_PER_LOT;
  return {
    side: p.side,
    units,
    entry,
    stop: p.stopPips ? entry - dir * p.stopPips * state.pip : null,
    target: p.targetPips ? entry + dir * p.targetPips * state.pip : null,
    openBar: p.openBar,
    margin: (units * entry) / state.account.leverage,
  };
}

function checkBar(
  t: TradeLevels,
  bar: Candle,
  h: number,
  balance: number,
): Omit<ClosedTrade, 'bar'> | null {
  const dir = t.side === 'buy' ? 1 : -1;
  const pnl = (price: number) => dir * (price - t.entry) * t.units;
  // Worst and best prices you could close at during this bar.
  const open = t.side === 'buy' ? bar.o - h : bar.o + h;
  const worst = t.side === 'buy' ? bar.l - h : bar.h + h;
  const best = t.side === 'buy' ? bar.h - h : bar.l + h;
  if (t.stop !== null && dir * (worst - t.stop) <= 0) {
    // Gapped past the stop: filled at the open, not the stop.
    const fill = dir * (open - t.stop) < 0 ? open : t.stop;
    return { price: fill, pnl: pnl(fill), reason: 'stop' };
  }
  const equityAtWorst = balance + pnl(worst);
  if (equityAtWorst <= (t.margin * STOP_OUT_PCT) / 100) {
    const price = t.entry + dir * (((t.margin * STOP_OUT_PCT) / 100 - balance) / t.units);
    const fill = dir * (open - price) < 0 ? open : price;
    return { price: fill, pnl: pnl(fill), reason: 'margin call' };
  }
  if (t.target !== null && dir * (best - t.target) >= 0) {
    return { price: t.target, pnl: pnl(t.target), reason: 'target' };
  }
  return null;
}

/** Plays the revealed bars against the open position and reports the account. */
export function evaluate(state: ChartState): Evaluation {
  const { balance, startBalance } = state.account;
  const trade = tradeLevels(state);
  const drawdown = (equity: number) => Math.max(0, ((startBalance - equity) / startBalance) * 100);
  const flat = (bal: number, closed: ClosedTrade | null): Evaluation => ({
    trade,
    closed,
    mark: null,
    metrics: {
      balance: bal,
      equity: bal,
      openPnl: 0,
      marginLevelPct: null,
      drawdownPct: drawdown(bal),
    },
  });
  if (!trade) return flat(balance, null);

  for (let i = trade.openBar + 1; i < state.reveal; i++) {
    const bar = state.series[i];
    if (!bar) break;
    const hit = checkBar(trade, bar, half(state, bar), balance);
    if (hit) return flat(balance + hit.pnl, { ...hit, bar: i });
  }
  const last = state.series[state.reveal - 1] ?? state.series[trade.openBar];
  const h = half(state, last);
  const mark = last ? (trade.side === 'buy' ? last.c - h : last.c + h) : trade.entry;
  const openPnl = (trade.side === 'buy' ? 1 : -1) * (mark - trade.entry) * trade.units;
  const equity = balance + openPnl;
  return {
    trade,
    closed: null,
    mark,
    metrics: {
      balance,
      equity,
      openPnl,
      marginLevelPct: (equity / trade.margin) * 100,
      drawdownPct: drawdown(equity),
    },
  };
}
