import { describe, expect, it } from 'vitest';
import type { DiagramState } from '../types';
import { businessScenarios, DAY_MS, type BusinessAction, type BusinessMetrics } from './business';

/** One supplier ships 100 units a day into a warehouse that sells 100 a day. */
const base: DiagramState<BusinessMetrics> = {
  nodes: [
    { id: 'supplier', kind: 'factory', label: 'Supplier', x: 0, y: 0 },
    { id: 'wh', kind: 'warehouse', label: 'Warehouse', x: 5, y: 0, value: 300 },
    { id: 'shop', kind: 'shop', label: 'Shop', x: 10, y: 0 },
    { id: 'buyers', kind: 'users', label: 'Customers', x: 14, y: 0 },
    { id: 'bank', kind: 'bank', label: 'Bank', x: 10, y: 4 },
  ],
  links: [
    { id: 'a', from: 'supplier', to: 'wh' },
    { id: 'b', from: 'wh', to: 'shop' },
    { id: 'c', from: 'shop', to: 'buyers' },
    { id: 'd', from: 'shop', to: 'bank' },
  ],
  flows: [
    { route: ['supplier', 'wh'], kind: 'request', ratePerSec: 100 },
    { route: ['wh', 'shop', 'buyers'], kind: 'request', ratePerSec: 100 },
    { route: ['buyers', 'shop'], kind: 'response', ratePerSec: 2000 },
  ],
  metrics: { stock: 300, filledPct: 100, daysOfStock: 3, cash: 5000, profitPerDay: 500 },
};

const run = (action: BusinessAction, state = base) => {
  const s = businessScenarios[action](state);
  if (!s) throw new Error(`${action} should apply`);
  return s;
};

const day = (n: number) => n * DAY_MS + 500;

describe('business scenarios', () => {
  it('a late supplier drains three days of stock, then orders go unfilled', () => {
    const s = run('supplierDelay');
    expect(s.metricsAt(day(1)).stock).toBe(200);
    expect(s.metricsAt(day(3)).stock).toBe(0);
    expect(s.metricsAt(day(4)).filledPct).toBe(0);
    expect(s.metricsAt(day(4)).cash).toBeLessThan(5000);
    expect(s.stateAt(day(4)).flows.some((f) => f.kind === 'failed')).toBe(true);
    // Supplier back after six days: sales recover.
    expect(s.metricsAt(day(7)).filledPct).toBe(100);
  });

  it('a backup supplier with spare capacity keeps the shelves full', () => {
    const withBackup: DiagramState<BusinessMetrics> = {
      ...base,
      nodes: [
        ...base.nodes,
        { id: 'backup', kind: 'factory', label: 'Backup supplier', x: 0, y: 4, capacity: 120 },
      ],
      links: [...base.links, { id: 'e', from: 'backup', to: 'wh' }],
      flows: [...base.flows, { route: ['backup', 'wh'], kind: 'request', ratePerSec: 10 }],
    };
    const s = run('supplierDelay', withBackup);
    expect(s.metricsAt(day(5)).filledPct).toBe(100);
  });

  it('a demand spike earns more while stock lasts, then runs out', () => {
    const s = run('demandSpike');
    expect(s.metricsAt(day(0)).profitPerDay).toBe(1250);
    expect(s.metricsAt(day(3)).filledPct).toBeLessThan(100);
  });

  it('late payments drain cash, which returns when customers pay up', () => {
    const s = run('latePayments');
    expect(s.metricsAt(day(4)).cash).toBe(5000 - 2000 * 5);
    expect(s.metricsAt(day(11)).cash).toBe(5000);
  });
});
