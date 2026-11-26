// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { BAR_MS, forexScenarios, type ForexAction } from './forex';
import { createChartStage, type Scheduler } from './stage';
import type { ChartChange, ChartInitial, ForexMetrics } from './types';

function manualScheduler() {
  let now = 0;
  let queue = new Map<number, (t: number) => void>();
  let id = 0;
  const scheduler: Scheduler = {
    now: () => now,
    request(cb) {
      queue.set(++id, cb);
      return id;
    },
    cancel(handle) {
      queue.delete(handle);
    },
  };
  return {
    scheduler,
    advance(ms: number, step = 50) {
      for (let t = 0; t < ms; t += step) {
        now += step;
        const due = queue;
        queue = new Map();
        for (const cb of due.values()) cb(now);
      }
    },
  };
}

const initial: ChartInitial = {
  pair: 'EUR/USD',
  timeframe: '1H',
  pip: 0.0001,
  seed: 9,
  start: 1.085,
  bars: 60,
  reveal: 20,
  volatility: 4,
  spread: 1,
  account: { balance: 10_000, leverage: 30 },
};

const changes: ChartChange[] = [
  { style: 'candles', add: { notes: [{ id: 'n', bar: 5, text: 'A <b>note</b>' }] } },
  { reveal: 40, position: { side: 'buy', lots: 1, openBar: 30, stopPips: 25, targetPips: 50 } },
];

function setup(reducedMotion = false) {
  const clock = manualScheduler();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const stage = createChartStage<ForexAction>(
    svg,
    { initial, changes },
    {
      scheduler: clock.scheduler,
      reducedMotion,
      scenarios: forexScenarios,
    },
  );
  const seen: ForexMetrics[] = [];
  stage.onMetrics((m) => seen.push(m));
  return { svg, stage, clock, seen };
}

describe('chart stage', () => {
  it('draws an accessible chart with escaped note text', () => {
    const { svg, stage } = setup();
    stage.goToStep(0);
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('EUR/USD 1H candlestick chart, 20 bars');
    expect(svg.querySelectorAll('.cs-candle')).toHaveLength(20);
    expect(svg.innerHTML).toContain('A &lt;b&gt;note&lt;/b&gt;');
  });

  it('reveals new bars one by one, then shows the trade', () => {
    const { svg, stage, clock } = setup();
    stage.goToStep(1);
    expect(svg.querySelectorAll('.cs-candle').length).toBeLessThan(40);
    clock.advance(2000);
    expect(svg.querySelectorAll('.cs-candle')).toHaveLength(40);
    expect(svg.querySelector('.cs-tag-stop text')?.textContent).toMatch(/^Stop 1\.0/);
    expect(stage.current().evaluation.trade?.side).toBe('buy');
  });

  it('runs a break-it scenario on top of the step and resets back', () => {
    const { stage, clock, seen } = setup(true);
    stage.goToStep(1);
    const before = stage.current().evaluation.metrics.equity;
    expect(stage.break('priceMovesAgainst')).toBe(true);
    clock.advance(20 * BAR_MS);
    expect(stage.current().evaluation.closed?.reason).toBe('stop');
    expect(Math.min(...seen.map((m) => m.balance))).toBeLessThan(before);
    stage.reset();
    expect(stage.current().evaluation.metrics.equity).toBeCloseTo(before);
  });

  it('pausing stops a scenario mid-way', () => {
    const { stage, clock } = setup();
    stage.goToStep(1);
    clock.advance(2000);
    stage.break('priceMovesAgainst');
    clock.advance(2 * BAR_MS);
    stage.pause();
    const reveal = stage.current().state.reveal;
    clock.advance(10 * BAR_MS);
    expect(stage.current().state.reveal).toBe(reveal);
  });

  it('refuses actions the course does not offer', () => {
    const { stage } = setup();
    expect(stage.break('teleport' as ForexAction)).toBe(false);
  });
});
