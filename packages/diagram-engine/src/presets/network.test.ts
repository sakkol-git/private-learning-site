import { describe, expect, it } from 'vitest';
import { routeAround } from '../model';
import type { DiagramState } from '../types';
import {
  networkScenarios,
  ROUTE_UPDATE_MS,
  type NetworkAction,
  type NetworkMetrics,
} from './network';

/**
 * laptop → r1 → r2 → server, with a slower detour r1 → r3 → r4 → r2.
 * Two lookups go via DNS, one is cached.
 */
const base: DiagramState<NetworkMetrics> = {
  nodes: [
    { id: 'laptop', kind: 'device', label: 'Laptop', x: 0, y: 0 },
    { id: 'dns', kind: 'dns', label: 'DNS', x: 0, y: 4 },
    { id: 'r1', kind: 'router', label: 'R1', x: 4, y: 0 },
    { id: 'r2', kind: 'router', label: 'R2', x: 8, y: 0 },
    { id: 'r3', kind: 'router', label: 'R3', x: 4, y: 4 },
    { id: 'r4', kind: 'router', label: 'R4', x: 8, y: 4 },
    { id: 'web', kind: 'server', label: 'Web', x: 12, y: 0, capacity: 100 },
    { id: 'bots', kind: 'attacker', label: 'Botnet', x: 12, y: 4 },
  ],
  links: [
    { id: 'a', from: 'laptop', to: 'r1' },
    { id: 'b', from: 'r1', to: 'r2' },
    { id: 'c', from: 'r2', to: 'web' },
    { id: 'd', from: 'r1', to: 'r3' },
    { id: 'e', from: 'r3', to: 'r4' },
    { id: 'f', from: 'r4', to: 'r2' },
    { id: 'g', from: 'laptop', to: 'dns' },
    { id: 'h', from: 'bots', to: 'r4' },
  ],
  flows: [
    { route: ['laptop', 'r1', 'r2', 'web'], kind: 'request', ratePerSec: 30 },
    { route: ['laptop', 'dns'], kind: 'request', ratePerSec: 10 },
  ],
  metrics: { pageLoadMs: 400, roundTripMs: 40, lossPct: 0, okPct: 100, hops: 4 },
};

const run = (action: NetworkAction, state = base) => {
  const s = networkScenarios[action](state);
  if (!s) throw new Error(`${action} should apply`);
  return s;
};

describe('routeAround', () => {
  it('finds the shortest path and detours around failures', () => {
    expect(routeAround(base, 'laptop', 'web')).toEqual(['laptop', 'r1', 'r2', 'web']);
    expect(routeAround(base, 'laptop', 'web', new Set(['r2']))).toBeNull();
    expect(routeAround(base, 'r1', 'r2', new Set(['laptop']))).toEqual(['r1', 'r2']);
  });
});

describe('network scenarios', () => {
  it('a router failure drops requests, then routes around it more slowly', () => {
    const s = run('routerFails');
    expect(s.stateAt(500).nodes.find((n) => n.id === 'r1')?.health).toBe('down');
    // r1 carries the page; only the DNS lookup still works, and there is no way around r1.
    expect(s.metricsAt(1000).okPct).toBe(25);
    expect(s.metricsAt(ROUTE_UPDATE_MS + 2000).okPct).toBe(25);
  });

  it('when the middle router fails, traffic takes the detour', () => {
    const middle: DiagramState<NetworkMetrics> = {
      ...base,
      links: [...base.links, { id: 'i', from: 'r4', to: 'web' }],
      flows: [
        { route: ['laptop', 'r1', 'r2', 'web'], kind: 'request', ratePerSec: 30 },
        { route: ['r4', 'r2', 'web'], kind: 'request', ratePerSec: 10 },
      ],
    };
    const s = run('routerFails', middle);
    const settled = s.metricsAt(ROUTE_UPDATE_MS + 2000);
    expect(s.stateAt(0).nodes.find((n) => n.id === 'r2')?.health).toBe('down');
    expect(s.metricsAt(1000).okPct).toBe(0);
    expect(settled.okPct).toBe(100);
    // One flow gains a hop, the other loses one: half a hop more on average.
    expect(settled.hops).toBe(4.5);
    expect(settled.pageLoadMs).toBeGreaterThan(400);
  });

  it('a DNS outage fails only the lookups that need it', () => {
    const s = run('dnsOutage');
    expect(s.metricsAt(1000).okPct).toBe(75);
    expect(s.stateAt(0).flows.filter((f) => f.kind === 'failed')).toHaveLength(1);
  });

  it('packet loss slows pages far more than the loss itself', () => {
    const m = run('packetLoss').metricsAt(2000);
    expect(m.lossPct).toBe(4);
    expect(m.pageLoadMs).toBeGreaterThan(800);
  });

  it('a flood overwhelms the server unless a shield is in the way', () => {
    const open = run('ddos').metricsAt(2000);
    expect(open.okPct).toBeLessThan(15);
    const shielded: DiagramState<NetworkMetrics> = {
      ...base,
      nodes: [...base.nodes, { id: 'wall', kind: 'shield', label: 'Shield', x: 10, y: 4 }],
      links: [
        ...base.links.filter((l) => l.id !== 'h'),
        { id: 'h1', from: 'bots', to: 'wall' },
        { id: 'h2', from: 'wall', to: 'r4' },
      ],
    };
    const s = run('ddos', shielded);
    expect(s.metricsAt(2000).okPct).toBe(100);
    expect(s.stateAt(0).flows.some((f) => f.kind === 'failed' && f.route.at(-1) === 'wall')).toBe(
      true,
    );
  });
});
