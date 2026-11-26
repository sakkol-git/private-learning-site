import { describe, expect, it } from 'vitest';
import { computeLoads, createScenario, HEALTH_CHECK_DETECT_MS } from './simulation';
import type { DiagramState } from './types';

const base: DiagramState = {
  nodes: [
    { id: 'users', kind: 'users', label: 'Users', x: 0, y: 4 },
    { id: 'lb', kind: 'loadBalancer', label: 'LB', x: 5, y: 4 },
    { id: 'a', kind: 'server', label: 'A', x: 10, y: 1, capacity: 400 },
    { id: 'b', kind: 'server', label: 'B', x: 10, y: 4, capacity: 400 },
    { id: 'c', kind: 'server', label: 'C', x: 10, y: 7, capacity: 400 },
    { id: 'db', kind: 'database', label: 'DB', x: 15, y: 4, capacity: 2000 },
  ],
  links: [],
  flows: ['a', 'b', 'c'].map((s) => ({
    route: ['users', 'lb', s, 'db'],
    kind: 'request' as const,
    ratePerSec: 200,
  })),
  metrics: {
    users: 3000,
    requestsPerSec: 600,
    p95LatencyMs: 120,
    errorRatePct: 0,
    healthy: [3, 3],
  },
};

describe('loads', () => {
  it('sums request flows per node against capacity', () => {
    const loads = computeLoads(base);
    expect(loads.get('a')).toBeCloseTo(0.5);
    expect(loads.get('db')).toBeCloseTo(0.3);
    expect(loads.has('users')).toBe(false);
  });
});

describe('killServer', () => {
  const s = createScenario('killServer', base);
  if (!s) throw new Error('scenario expected');

  it('marks server B down and fails its traffic until the health check notices', () => {
    const early = s.stateAt(1000);
    expect(early.nodes.find((n) => n.id === 'b')?.health).toBe('down');
    expect(early.flows.filter((f) => f.kind === 'failed')).toHaveLength(1);
    expect(s.metricsAt(1000).errorRatePct).toBeGreaterThan(30);
    expect(s.metricsAt(1000).healthy).toEqual([2, 3]);
  });

  it('drops errors back to zero and raises latency after detection', () => {
    const late = s.metricsAt(HEALTH_CHECK_DETECT_MS + 2000);
    expect(late.errorRatePct).toBe(0);
    expect(late.p95LatencyMs).toBeGreaterThan(base.metrics.p95LatencyMs);
    const after = s.stateAt(HEALTH_CHECK_DETECT_MS + 1);
    expect(after.flows.some((f) => f.kind === 'healthCheck' && f.route.at(-1) === 'b')).toBe(true);
    expect(computeLoads(after).get('a')).toBeCloseTo(0.75);
  });
});

describe('spikeTraffic', () => {
  const s = createScenario('spikeTraffic', base);
  if (!s) throw new Error('scenario expected');

  it('multiplies load, raises latency and degrades servers', () => {
    const m = s.metricsAt(5000);
    expect(m.requestsPerSec).toBe(3000);
    expect(m.p95LatencyMs).toBeGreaterThan(base.metrics.p95LatencyMs);
    expect(m.errorRatePct).toBeGreaterThan(0);
    expect(
      s
        .stateAt(5000)
        .nodes.filter((n) => n.health === 'degraded')
        .map((n) => n.id),
    ).toEqual(['a', 'b', 'c', 'db']);
  });

  it('starts from the step metrics', () => {
    expect(s.metricsAt(0).requestsPerSec).toBe(600);
  });
});

describe('slowDatabase', () => {
  it('raises p95 latency and degrades the database', () => {
    const s = createScenario('slowDatabase', base);
    expect(s?.metricsAt(2000).p95LatencyMs).toBeGreaterThan(900);
    expect(s?.stateAt(0).nodes.find((n) => n.id === 'db')?.health).toBe('degraded');
  });

  it('does not apply without a database', () => {
    expect(
      createScenario('slowDatabase', {
        ...base,
        nodes: base.nodes.filter((n) => n.kind !== 'database'),
      }),
    ).toBeNull();
  });
});
