import { describe, expect, it } from 'vitest';
import { applyChartChange, buildChartStates, initialChartState } from './scene';
import { generateSeries, sma } from './series';
import { evaluate, tradeLevels } from './trading';
import type { ChartInitial } from './types';

const init: ChartInitial = {
  pair: 'EUR/USD',
  timeframe: '1H',
  pip: 0.0001,
  seed: 42,
  start: 1.085,
  bars: 60,
  reveal: 20,
  volatility: 5,
  spread: 1,
  account: { balance: 10_000, leverage: 30 },
};

describe('series', () => {
  it('is the same every time for the same seed', () => {
    expect(generateSeries(init)).toEqual(generateSeries(init));
    expect(generateSeries({ ...init, seed: 43 })).not.toEqual(generateSeries(init));
  });

  it('keeps candles well formed and continuous', () => {
    const s = generateSeries(init);
    s.forEach((bar, i) => {
      expect(bar.h).toBeGreaterThanOrEqual(Math.max(bar.o, bar.c));
      expect(bar.l).toBeLessThanOrEqual(Math.min(bar.o, bar.c));
      if (i > 0) expect(bar.o).toBeCloseTo(s[i - 1]?.c ?? 0, 10);
    });
  });

  it('applies scripted shocks exactly', () => {
    const s = generateSeries({ ...init, shocks: [{ bar: 10, pips: -40, wick: -15 }] });
    const bar = s[10];
    expect(bar && (bar.c - bar.o) / init.pip).toBeCloseTo(-40);
    expect(bar && (bar.c - bar.l) / init.pip).toBeGreaterThanOrEqual(15);
  });

  it('averages closes', () => {
    const closes = [1, 2, 3, 4].map((c) => ({ o: c, h: c, l: c, c, v: 0 }));
    expect(sma(closes, 2)).toEqual([null, 1.5, 2.5, 3.5]);
  });
});

describe('scene diffs', () => {
  it('reveals bars and reports going backwards or past the end', () => {
    const start = initialChartState(init);
    expect(applyChartChange(start, { reveal: 30 }).state.reveal).toBe(30);
    expect(applyChartChange(start, { reveal: 10 }).issues).toEqual([
      'reveal goes back from 20 to 10',
    ]);
    expect(applyChartChange(start, { reveal: 99 }).issues).toEqual(['reveal 99 is outside 1..60']);
  });

  it('reports notes and positions on bars that are not revealed', () => {
    const { issues } = applyChartChange(initialChartState(init), {
      add: { notes: [{ id: 'n', bar: 25, text: 'later' }] },
      position: { side: 'buy', lots: 1, openBar: 30 },
    });
    expect(issues).toEqual([
      'note "n" is on bar 25, which is not revealed yet',
      'position opens on bar 30, which is not revealed yet',
    ]);
  });
});

describe('trading', () => {
  const flatInit: ChartInitial = { ...init, volatility: 0.0001, spread: 2, shocks: [] };
  const open = (change = {}) =>
    buildChartStates(flatInit, [{ position: { side: 'buy', lots: 1, openBar: 19 }, ...change }])[0];

  it('buys at the ask and starts behind by the spread', () => {
    const state = open();
    if (!state) throw new Error('state');
    const t = tradeLevels(state);
    expect(t?.margin).toBeCloseTo((100_000 * (t?.entry ?? 0)) / 30);
    expect(evaluate(state).metrics.openPnl).toBeCloseTo(-20, 0);
  });

  it('closes at the stop: 10 pips on 1 lot is $100', () => {
    const shocked = { ...flatInit, shocks: [{ bar: 21, pips: -30 }] };
    const states = buildChartStates(shocked, [
      { position: { side: 'buy', lots: 1, openBar: 19, stopPips: 10 } },
      { reveal: 23 },
    ]);
    const e = evaluate(states[1] ?? initialChartState(shocked));
    expect(e.closed?.reason).toBe('stop');
    expect(e.closed?.pnl).toBeCloseTo(-100, 0);
    expect(e.metrics.balance).toBeCloseTo(9900, 0);
  });

  it('takes profit at the target', () => {
    const rising = { ...flatInit, shocks: [{ bar: 21, pips: 40 }] };
    const states = buildChartStates(rising, [
      { position: { side: 'buy', lots: 1, openBar: 19, stopPips: 20, targetPips: 30 } },
      { reveal: 23 },
    ]);
    const e = evaluate(states[1] ?? initialChartState(rising));
    expect(e.closed).toMatchObject({ reason: 'target' });
    expect(e.closed?.pnl).toBeCloseTo(300, 0);
    expect(e.metrics.balance).toBeCloseTo(10_300, 0);
  });

  it('stops out on a margin call when leverage is too high', () => {
    const crash = {
      ...flatInit,
      account: { balance: 1000, leverage: 500 },
      shocks: [{ bar: 21, pips: -40 }],
    };
    const states = buildChartStates(crash, [
      { position: { side: 'buy', lots: 4, openBar: 19 } },
      { reveal: 23 },
    ]);
    const e = evaluate(states[1] ?? initialChartState(crash));
    expect(e.closed?.reason).toBe('margin call');
    expect(e.metrics.balance).toBeLessThan(500);
    expect(e.metrics.marginLevelPct).toBeNull();
  });
});
