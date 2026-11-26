import { seriesFor } from './scene';
import type { Candle, ChartState, ForexMetrics, StockMetrics } from './types';

const UNITS_PER_LOT = 100_000;
/** Forex brokers close positions when margin level falls to this percentage. */
const FX_STOP_OUT_PCT = 50;

export interface TradeLevels {
  side: 'buy' | 'sell';
  units: number;
  entry: number;
  stop: number | null;
  target: number | null;
  openBar: number;
  /** The price at which the broker would force the trade closed, if any. */
  callPrice: number | null;
  /** Forex margin locked for the trade (0 for stocks). */
  margin: number;
  /** Stocks: cash left after opening (negative means borrowed). */
  cashAfterOpen: number;
}

interface Exit {
  bar: number;
  price: number;
  reason: 'stop' | 'target' | 'margin call';
}

interface ClosedTrade extends Exit {
  pnl: number;
}

export interface Evaluation<M> {
  trade: TradeLevels | null;
  /** Set when the trade closed by itself (stop, target or margin call) within the revealed bars. */
  closed: ClosedTrade | null;
  /** The price the open trade would close at now (bid for buys, ask for sells). */
  mark: number | null;
  metrics: M;
}

const halfSpread = (state: ChartState, bar?: Candle) =>
  ((bar?.spread ?? state.spread) * state.tick) / 2;

/** Price change for a move in this chart's unit (pips for forex, percent for stocks). */
function moveDelta(state: ChartState, price: number, move: number): number {
  return state.account.kind === 'fx' ? move * state.tick : (price * move) / 100;
}

/** Works out entry, stop, target and the forced-close price from the authored position. */
export function tradeLevels(state: ChartState): TradeLevels | null {
  const p = state.position;
  const series = p ? seriesFor(state, p.symbol) : null;
  const bar = series?.[p?.openBar ?? -1];
  if (!p || !bar) return null;
  const dir = p.side === 'buy' ? 1 : -1;
  const entry = bar.c + dir * halfSpread(state);
  const acc = state.account;
  const units = acc.kind === 'fx' ? p.size * UNITS_PER_LOT : p.size;
  const base = {
    side: p.side,
    units,
    entry,
    stop: p.stop ? entry - dir * moveDelta(state, entry, p.stop) : null,
    target: p.target ? entry + dir * moveDelta(state, entry, p.target) : null,
    openBar: p.openBar,
  };
  if (acc.kind === 'fx') {
    const margin = (units * entry) / acc.leverage;
    const callPrice = entry + dir * (((margin * FX_STOP_OUT_PCT) / 100 - acc.balance) / units);
    return { ...base, margin, callPrice, cashAfterOpen: acc.balance };
  }
  const m = acc.maintenancePct / 100;
  const cashAfterOpen = acc.cash - dir * units * entry - acc.commission;
  let callPrice: number | null = null;
  // Long on borrowed money: called when equity / value falls to the maintenance level.
  if (dir === 1 && cashAfterOpen < 0) callPrice = -cashAfterOpen / (units * (1 - m));
  // Short: called when the price rises far enough that equity / value falls to it.
  if (dir === -1) callPrice = cashAfterOpen / (units * (1 + m));
  return { ...base, margin: 0, callPrice, cashAfterOpen };
}

/** Plays the revealed bars against the trade: first stop, forced close or target wins. */
function walk(state: ChartState, t: TradeLevels): Exit | null {
  const series = seriesFor(state, state.position?.symbol) ?? [];
  const dir = t.side === 'buy' ? 1 : -1;
  for (let i = t.openBar + 1; i < state.reveal; i++) {
    const bar = series[i];
    if (!bar) break;
    const h = halfSpread(state, bar);
    // Prices you could close at during this bar: buys sell at the bid, sells buy back at the ask.
    const open = t.side === 'buy' ? bar.o - h : bar.o + h;
    const worst = t.side === 'buy' ? bar.l - h : bar.h + h;
    const best = t.side === 'buy' ? bar.h - h : bar.l + h;
    // A level gapped through fills at the open, not at the level.
    const fillAt = (level: number) => (dir * (open - level) < 0 ? open : level);
    if (t.stop !== null && dir * (worst - t.stop) <= 0)
      return { bar: i, price: fillAt(t.stop), reason: 'stop' };
    if (t.callPrice !== null && dir * (worst - t.callPrice) <= 0) {
      return { bar: i, price: fillAt(t.callPrice), reason: 'margin call' };
    }
    if (t.target !== null && dir * (best - t.target) >= 0)
      return { bar: i, price: t.target, reason: 'target' };
  }
  return null;
}

/** True when the step has a trade that has not hit its stop, target or a margin call. */
export function isTradeOpen(state: ChartState): boolean {
  const t = tradeLevels(state);
  return t !== null && walk(state, t) === null;
}

function markPrice(state: ChartState, t: TradeLevels): number {
  const series = seriesFor(state, state.position?.symbol) ?? [];
  const last = series[state.reveal - 1];
  if (!last) return t.entry;
  const h = halfSpread(state, last);
  return t.side === 'buy' ? last.c - h : last.c + h;
}

const drawdown = (start: number, value: number) => Math.max(0, ((start - value) / start) * 100);

export function evaluateFx(state: ChartState): Evaluation<ForexMetrics> {
  const acc = state.account;
  const balance = acc.kind === 'fx' ? acc.balance : 0;
  const start = acc.kind === 'fx' ? acc.startBalance : 1;
  const flat = (bal: number): ForexMetrics => ({
    balance: bal,
    equity: bal,
    openPnl: 0,
    marginLevelPct: null,
    drawdownPct: drawdown(start, bal),
  });
  const trade = tradeLevels(state);
  if (!trade) return { trade, closed: null, mark: null, metrics: flat(balance) };
  const dir = trade.side === 'buy' ? 1 : -1;
  const pnl = (price: number) => dir * (price - trade.entry) * trade.units;
  const exit = walk(state, trade);
  if (exit) {
    const closed = { ...exit, pnl: pnl(exit.price) };
    return { trade, closed, mark: null, metrics: flat(balance + closed.pnl) };
  }
  const mark = markPrice(state, trade);
  const equity = balance + pnl(mark);
  return {
    trade,
    closed: null,
    mark,
    metrics: {
      balance,
      equity,
      openPnl: pnl(mark),
      marginLevelPct: (equity / trade.margin) * 100,
      drawdownPct: drawdown(start, equity),
    },
  };
}

export function evaluateStock(state: ChartState): Evaluation<StockMetrics> {
  const acc = state.account;
  const cash = acc.kind === 'stock' ? acc.cash : 0;
  const start = acc.kind === 'stock' ? acc.startValue : 1;
  const commission = acc.kind === 'stock' ? acc.commission : 0;
  const metrics = (value: number, cashNow: number): StockMetrics => ({
    value,
    cash: cashNow,
    pnl: value - start,
    returnPct: ((value - start) / start) * 100,
    drawdownPct: drawdown(start, value),
  });
  const trade = tradeLevels(state);
  if (!trade) return { trade, closed: null, mark: null, metrics: metrics(cash, cash) };
  const dir = trade.side === 'buy' ? 1 : -1;
  const exit = walk(state, trade);
  if (exit) {
    const pnl = dir * (exit.price - trade.entry) * trade.units - 2 * commission;
    const final = cash + pnl;
    return { trade, closed: { ...exit, pnl }, mark: null, metrics: metrics(final, final) };
  }
  const mark = markPrice(state, trade);
  const value = trade.cashAfterOpen + dir * trade.units * mark;
  return { trade, closed: null, mark, metrics: metrics(value, trade.cashAfterOpen) };
}

/** Problems with opening a stock position: not enough cash, or shorting in a cash account. */
export function stockOrderIssue(state: ChartState): string | null {
  const t = tradeLevels(state);
  const acc = state.account;
  if (!t || acc.kind !== 'stock') return null;
  if (t.side === 'sell' && acc.marginPct >= 100)
    return 'short selling needs a margin account (marginPct below 100)';
  const required = (t.units * t.entry * acc.marginPct) / 100 + acc.commission;
  if (required > acc.cash + 0.005) {
    return `position needs $${Math.round(required).toLocaleString('en-US')} of the account's own money, but it has $${Math.round(acc.cash).toLocaleString('en-US')}`;
  }
  return null;
}
