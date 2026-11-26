import { describe, expect, it } from 'vitest';
import { chartScene } from './chart-scene';
import { FOREX_NEEDS_POSITION, forexScenarios } from './forex';
import { BAR_MS } from './scenario';
import { buildChartStates } from './scene';
import { evaluateFx as evaluate } from './trading';
import type { ChartState, FxInitial } from './types';

const init: FxInitial = {
  market: 'fx',
  symbol: 'EUR/USD',
  timeframe: '1H',
  pip: 0.0001,
  seed: 3,
  start: 1.085,
  bars: 40,
  reveal: 20,
  volatility: 0.0001,
  spread: 1,
  account: { balance: 10_000, leverage: 30 },
};

const withPosition = (
  position: NonNullable<ChartState['position']>,
  extra: Partial<FxInitial> = {},
) => {
  const state = buildChartStates({ ...init, ...extra }, [{ position }])[0];
  if (!state) throw new Error('state');
  return state;
};

const play = (action: keyof typeof forexScenarios, state: ChartState, t = 20 * BAR_MS) => {
  const s = forexScenarios[action](state);
  if (!s) throw new Error('scenario');
  return s.stateAt(t);
};

describe('forex scenarios', () => {
  it('reveal new bars one at a time and start from the step state', () => {
    const base = withPosition({ side: 'buy', size: 1, openBar: 19 });
    const s = forexScenarios.priceMovesAgainst(base);
    expect(s?.stateAt(0).reveal).toBe(20);
    expect(s?.stateAt(3 * BAR_MS).reveal).toBe(23);
    expect(s?.phaseAt(3 * BAR_MS)).toBe(3);
  });

  it('price moving against a 1-lot buy costs about $10 a pip', () => {
    const base = withPosition({ side: 'buy', size: 1, openBar: 19 });
    const before = evaluate(base).metrics.equity;
    const after = evaluate(play('priceMovesAgainst', base)).metrics.equity;
    expect(before - after).toBeGreaterThan(900);
    expect(before - after).toBeLessThan(1000);
  });

  it('moves against a sell by going up', () => {
    const base = withPosition({ side: 'sell', size: 1, openBar: 19 });
    expect(evaluate(play('priceMovesAgainst', base)).metrics.openPnl).toBeLessThan(-800);
  });

  it('a weekend gap fills the stop at the open, worse than planned', () => {
    const base = withPosition({ side: 'buy', size: 1, openBar: 19, stop: 20 });
    const closed = evaluate(play('weekendGap', base)).closed;
    expect(closed?.reason).toBe('stop');
    expect(closed?.pnl).toBeLessThan(-200 - 100);
  });

  it('a spread spike alone can trigger a tight stop', () => {
    const base = withPosition({ side: 'buy', size: 1, openBar: 19, stop: 4 });
    expect(evaluate(base).closed).toBeNull();
    expect(evaluate(play('spreadWidens', base)).closed?.reason).toBe('stop');
  });

  it('high leverage plus an adverse move ends in a margin call', () => {
    const base = withPosition(
      { side: 'buy', size: 4, openBar: 19 },
      { account: { balance: 1000, leverage: 500 } },
    );
    expect(evaluate(play('priceMovesAgainst', base)).closed?.reason).toBe('margin call');
  });

  it('a news spike leaves a long wick and a note', () => {
    const after = play('newsSpike', withPosition({ side: 'buy', size: 0.1, openBar: 19 }));
    const spike = after.series[20];
    expect(spike && (spike.o - spike.l) / init.pip).toBeGreaterThan(65);
    expect(after.notes.map((n) => n.text)).toContain('Rate decision');
  });
});

describe('chart lesson checks', () => {
  const check = chartScene(forexScenarios, FOREX_NEEDS_POSITION);

  it('accepts a valid lesson and flags actions that need a position', () => {
    expect(check(init, [{ change: { reveal: 25 }, breakActions: ['newsSpike'] }])).toEqual([]);
    expect(check(init, [{ change: {}, breakActions: ['weekendGap'] }])).toEqual([
      { step: 0, message: 'break action weekendGap needs an open position' },
    ]);
    expect(check(init, [{ change: {}, breakActions: ['teleport'] }])).toEqual([
      { step: 0, message: 'unknown break action "teleport"' },
    ]);
  });

  it('flags bad initial scenes', () => {
    expect(check({ ...init, reveal: 50, shocks: [{ bar: 99, move: 1 }] }, [])).toEqual([
      { step: null, message: 'reveal 50 is outside 1..40' },
      { step: null, message: 'shock on bar 99 is outside the series' },
    ]);
  });
});
