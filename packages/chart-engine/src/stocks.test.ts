import { describe, expect, it } from 'vitest';
import { chartScene } from './chart-scene';
import { renderChart } from './render';
import { BAR_MS } from './scenario';
import { buildChartStates, initialChartState } from './scene';
import { STOCK_NEEDS_POSITION, stockScenarios, type StockAction } from './stocks';
import { evaluateStock, stockOrderIssue } from './trading';
import type { ChartChange, ChartState, StockInitial } from './types';

const init: StockInitial = {
  market: 'stock',
  symbol: 'KTL',
  company: 'Kettle Labs',
  timeframe: 'Daily',
  seed: 5,
  start: 50,
  bars: 60,
  reveal: 30,
  volatility: 0.0001,
  spread: 2,
  others: [{ symbol: 'WIDX', seed: 6, start: 100, volatility: 0.0001 }],
  account: { cash: 10_000, marginPct: 100, maintenancePct: 25, commission: 5 },
};

const at = (change: ChartChange, base: StockInitial = init): ChartState => {
  const state = buildChartStates(base, [change])[0];
  if (!state) throw new Error('state');
  return state;
};

const play = (action: StockAction, state: ChartState, t = 30 * BAR_MS) => {
  const s = stockScenarios[action](state);
  if (!s) throw new Error('scenario');
  return s.stateAt(t);
};

describe('stock accounts', () => {
  it('buying with cash pays the ask plus commission', () => {
    const e = evaluateStock(at({ position: { side: 'buy', size: 100, openBar: 29 } }));
    expect(e.trade?.entry).toBeCloseTo(50.01, 2);
    expect(e.metrics.cash).toBeCloseTo(10_000 - 5001 - 5, 0);
    // Marked at the bid: down by the spread and one commission.
    expect(e.metrics.pnl).toBeCloseTo(-7, 0);
    expect(e.trade?.callPrice).toBeNull();
  });

  it('refuses a position the account cannot afford, and shorting in a cash account', () => {
    expect(stockOrderIssue(at({ position: { side: 'buy', size: 300, openBar: 29 } }))).toMatch(
      /needs \$15,008/,
    );
    expect(
      stockOrderIssue(at({ position: { side: 'buy', size: 300, openBar: 29 }, marginPct: 50 })),
    ).toBeNull();
    expect(stockOrderIssue(at({ position: { side: 'sell', size: 100, openBar: 29 } }))).toMatch(
      /margin account/,
    );
  });

  it('borrowing on margin shows negative cash and a forced-close price', () => {
    const e = evaluateStock(
      at({ marginPct: 50, position: { side: 'buy', size: 300, openBar: 29 } }),
    );
    expect(e.metrics.cash).toBeLessThan(-5000);
    // Equity falls to 25% of the position at about $22.
    expect(e.trade?.callPrice).toBeCloseTo(22.24, 1);
  });

  it('a short gains when the price falls', () => {
    const falling: StockInitial = { ...init, shocks: [{ bar: 31, move: -10 }] };
    const e = evaluateStock(
      at(
        { marginPct: 50, reveal: 33, position: { side: 'sell', size: 100, openBar: 29 } },
        falling,
      ),
    );
    expect(e.metrics.pnl).toBeGreaterThan(480);
  });
});

describe('stock scenarios', () => {
  it('an earnings gap jumps over the stop and fills at the open', () => {
    const base = at({ position: { side: 'buy', size: 100, openBar: 29, stop: 8 } });
    const e = evaluateStock(play('earningsGap', base));
    expect(e.closed?.reason).toBe('stop');
    // Planned: about −$400. Gap fill: about −$1,000.
    expect(e.closed?.pnl).toBeLessThan(-950);
  });

  it('a market sell-off hits the stock harder than the index', () => {
    const after = play('marketSelloff', at({}));
    const stock = after.series[after.reveal - 1]?.c ?? 0;
    const index = after.others[0]?.series[after.reveal - 1]?.c ?? 0;
    expect(stock / 50 - 1).toBeLessThan(-0.17);
    expect(index / 100 - 1).toBeGreaterThan(-0.13);
  });

  it('a company collapse wipes out the stock but barely moves the index', () => {
    const after = play('companyCollapse', at({}));
    expect((after.series[after.reveal - 1]?.c ?? 0) / 50).toBeLessThan(0.15);
    expect((after.others[0]?.series[after.reveal - 1]?.c ?? 0) / 100).toBeGreaterThan(0.98);
  });

  it('a short squeeze ends in a margin call', () => {
    const base = at({ marginPct: 50, position: { side: 'sell', size: 150, openBar: 29 } });
    const e = evaluateStock(play('shortSqueeze', base));
    expect(e.closed?.reason).toBe('margin call');
    expect(e.metrics.pnl).toBeLessThan(-2000);
  });
});

describe('stock lessons', () => {
  const check = chartScene(stockScenarios, STOCK_NEEDS_POSITION);

  it('checks positions against the account and actions against the trade', () => {
    expect(check(init, [{ change: {}, breakActions: ['companyCollapse'] }])).toEqual([]);
    expect(check(init, [{ change: {}, breakActions: ['shortSqueeze'] }])).toEqual([
      { step: 0, message: 'break action shortSqueeze needs an open position' },
    ]);
    expect(
      check(init, [{ change: { position: { side: 'buy', size: 500, openBar: 29 } } }])[0]?.message,
    ).toMatch(/position needs/);
  });

  it('compare mode draws percent lines with ticker tags', () => {
    const state = at({ compare: true, reveal: 40 });
    const markup = renderChart(
      state,
      { trade: null, closed: null },
      { slots: 60, low: -5, high: 5 },
    );
    expect(markup).toContain('KTL');
    expect(markup).toContain('WIDX');
    expect(markup).toContain('cs-cmp');
    expect(markup).not.toContain('cs-candle');
  });

  it('starts with the cash as the portfolio value', () => {
    expect(evaluateStock(initialChartState(init)).metrics).toMatchObject({
      value: 10_000,
      pnl: 0,
      returnPct: 0,
    });
  });
});
