import { describe, expect, it } from 'vitest';
import type { DiagramState } from '../types';
import {
  formatMoney,
  marketFactor,
  MONTH_MS,
  moneyScenarios,
  type MoneyAction,
  type MoneyMetrics,
} from './money';

const base: DiagramState<MoneyMetrics> = {
  nodes: [
    { id: 'job', kind: 'employer', label: 'Employer', x: 0, y: 0 },
    { id: 'wallet', kind: 'wallet', label: 'Account', x: 4, y: 0 },
    { id: 'jar', kind: 'jar', label: 'Savings', x: 4, y: 4, value: 3000, capacity: 6000 },
    { id: 'shop', kind: 'shop', label: 'Bills', x: 8, y: 0 },
    { id: 'bank', kind: 'bank', label: 'Lender', x: 8, y: 4 },
    { id: 'fund', kind: 'market', label: 'Index fund', x: 0, y: 4, value: 10000 },
  ],
  links: [
    { id: 'job-wallet', from: 'job', to: 'wallet' },
    { id: 'wallet-jar', from: 'wallet', to: 'jar' },
    { id: 'wallet-shop', from: 'wallet', to: 'shop' },
    { id: 'wallet-bank', from: 'wallet', to: 'bank' },
  ],
  flows: [
    { route: ['job', 'wallet'], kind: 'request', ratePerSec: 2000 },
    { route: ['wallet', 'shop'], kind: 'request', ratePerSec: 1500 },
    { route: ['wallet', 'bank'], kind: 'request', ratePerSec: 200 },
  ],
  metrics: { income: 2000, spending: 1500, saved: 300, debt: 4000, netWorth: 9000 },
};

const run = (action: MoneyAction, state = base) => {
  const s = moneyScenarios[action](state);
  if (!s) throw new Error(`${action} should apply`);
  return s;
};

describe('loseIncome', () => {
  const s = run('loseIncome');

  it('stops income and draws down savings month by month', () => {
    expect(s.metricsAt(MONTH_MS).income).toBe(0);
    expect(s.stateAt(MONTH_MS).nodes.find((n) => n.id === 'jar')?.value).toBe(1500);
    expect(s.stateAt(0).nodes.find((n) => n.id === 'job')?.health).toBe('down');
  });

  it('turns into debt once savings run out', () => {
    expect(s.metricsAt(2 * MONTH_MS).debt).toBe(4000);
    expect(s.metricsAt(4 * MONTH_MS).debt).toBe(7000);
    expect(s.stateAt(4 * MONTH_MS).flows.some((f) => f.kind === 'failed')).toBe(true);
  });
});

describe('surpriseExpense', () => {
  it('is paid from savings when the jar can cover it', () => {
    const s = run('surpriseExpense');
    expect(s.metricsAt(2000)).toMatchObject({ debt: 4000, netWorth: 9000 - 2300 });
    expect(s.stateAt(2000).nodes.find((n) => n.id === 'jar')?.value).toBe(700);
  });

  it('becomes debt when there is no safety net', () => {
    const noJar = { ...base, nodes: base.nodes.filter((n) => n.kind !== 'jar') };
    expect(run('surpriseExpense', noJar).metricsAt(2000).debt).toBe(4000 + 2300);
  });
});

describe('rateHike', () => {
  it('raises spending and cuts saving by the extra interest', () => {
    const m = run('rateHike').metricsAt(2000);
    expect(m.spending).toBe(1500 + 17);
    expect(m.saved).toBe(300 - 17);
  });
});

describe('marketDrop', () => {
  it('falls, waits, then recovers past where it started', () => {
    expect(marketFactor(1000)).toBeCloseTo(0.65);
    expect(marketFactor(20_000)).toBeCloseTo(1.12);
    const s = run('marketDrop');
    expect(s.metricsAt(1000).netWorth).toBe(9000 - 3500);
    expect(s.metricsAt(20_000).netWorth).toBe(9000 + 1200);
  });
});

describe('newMoneyStops', () => {
  const scheme: DiagramState<MoneyMetrics> = {
    nodes: [
      { id: 'new', kind: 'person', label: 'New investors', x: 0, y: 0 },
      { id: 'pyramid', kind: 'scheme', label: 'Scheme', x: 4, y: 0, value: 50000 },
      { id: 'you', kind: 'person', label: 'You', x: 8, y: 0, value: 2000 },
    ],
    links: [
      { id: 'a', from: 'new', to: 'pyramid' },
      { id: 'b', from: 'pyramid', to: 'you' },
    ],
    flows: [
      { route: ['new', 'pyramid'], kind: 'request', ratePerSec: 10 },
      { route: ['pyramid', 'you'], kind: 'response', ratePerSec: 2 },
    ],
    metrics: { income: 0, spending: 0, saved: 0, debt: 0, netWorth: 5000 },
  };

  it('drains, collapses, and takes your stake with it', () => {
    const s = run('newMoneyStops', scheme);
    expect(s.stateAt(500).flows.some((f) => f.route[0] === 'new')).toBe(false);
    const after = s.stateAt(3000);
    expect(after.nodes.find((n) => n.id === 'pyramid')?.health).toBe('down');
    expect(after.nodes.find((n) => n.id === 'you')?.value).toBe(0);
    expect(s.metricsAt(5000).netWorth).toBe(3000);
  });
});

describe('formatMoney', () => {
  it('keeps amounts short', () => {
    expect(formatMoney(1250)).toBe('$1,250');
    expect(formatMoney(12_480)).toBe('$12.5k');
    expect(formatMoney(250_000)).toBe('$250k');
    expect(formatMoney(10_000)).toBe('$10k');
    expect(formatMoney(-300)).toBe('−$300');
  });
});
