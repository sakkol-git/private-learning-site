import { describe, expect, it } from 'vitest';
import type { DiagramState } from '../types';
import type { InfraMetrics } from './infra';
import {
  COLD_MS,
  evaluate,
  expireCache,
  FAILOVER_MS,
  killDatabase,
  noisyClient,
  partition,
  slowDependency,
  stopWorkers,
  WARM_MS,
} from './infra-failures';

const metrics: InfraMetrics = {
  users: 1000,
  requestsPerSec: 400,
  p95LatencyMs: 50,
  errorRatePct: 0,
  healthy: [1, 1],
};

/** 400 req/s: 360 answered by the cache, 40 misses reach a database that can take 200. */
const cached: DiagramState<InfraMetrics> = {
  nodes: [
    { id: 'users', kind: 'users', label: 'Users', x: 0, y: 0 },
    { id: 'app', kind: 'server', label: 'App', x: 4, y: 0, capacity: 1000 },
    { id: 'cache', kind: 'cache', label: 'Cache', x: 8, y: -3, capacity: 20000 },
    { id: 'db', kind: 'database', label: 'DB', x: 8, y: 3, capacity: 200 },
  ],
  links: [
    { id: 'a', from: 'users', to: 'app' },
    { id: 'b', from: 'app', to: 'cache' },
    { id: 'c', from: 'app', to: 'db' },
  ],
  flows: [
    { route: ['users', 'app', 'cache'], kind: 'request', ratePerSec: 360 },
    { route: ['users', 'app', 'db'], kind: 'request', ratePerSec: 40 },
  ],
  metrics,
};

describe('evaluate', () => {
  it('leaves an unchanged diagram unchanged', () => {
    expect(evaluate(cached, cached)).toEqual({ ...metrics, healthy: [1, 1] });
  });

  it('counts requests dropped at an overloaded node', () => {
    const doubled = {
      ...cached,
      flows: [{ route: ['users', 'app', 'db'], kind: 'request' as const, ratePerSec: 400 }],
    };
    // The database gets 400 req/s for 200 capacity: half are dropped.
    expect(evaluate(cached, doubled).errorRatePct).toBe(50);
  });
});

describe('expireCache', () => {
  const s = expireCache(cached);
  if (!s) throw new Error('should apply');

  it('sends every request to the database while the keys are cold', () => {
    const cold = s.stateAt(100);
    const toDb = cold.flows
      .filter((f) => f.route.at(-1) === 'db')
      .reduce((t, f) => t + f.ratePerSec, 0);
    expect(toDb).toBe(400);
    expect(s.metricsAt(500).errorRatePct).toBe(50);
  });

  it('recovers as the cache warms up again', () => {
    expect(s.metricsAt(COLD_MS + WARM_MS + 1000).errorRatePct).toBe(0);
    expect(s.metricsAt(COLD_MS + WARM_MS / 2).errorRatePct).toBeLessThan(50);
  });
});

/** Primary takes 300 reads/s; a standby can take over. */
const replicated: DiagramState<InfraMetrics> = {
  nodes: [
    { id: 'app', kind: 'server', label: 'App', x: 0, y: 0, capacity: 1000 },
    { id: 'primary', kind: 'database', label: 'Primary', x: 4, y: 0, capacity: 600 },
    { id: 'standby', kind: 'database', label: 'Standby', x: 4, y: 4, capacity: 600 },
  ],
  links: [
    { id: 'a', from: 'app', to: 'primary' },
    { id: 'b', from: 'app', to: 'standby' },
  ],
  flows: [{ route: ['app', 'primary'], kind: 'request', ratePerSec: 300 }],
  metrics,
};

describe('killDatabase', () => {
  it('fails everything until a replica is promoted, then recovers', () => {
    const s = killDatabase(replicated);
    expect(s?.metricsAt(1000).errorRatePct).toBe(100);
    expect(s?.metricsAt(FAILOVER_MS + 1000).errorRatePct).toBe(0);
    expect(s?.stateAt(FAILOVER_MS + 1).flows[0]?.route).toEqual(['app', 'standby']);
  });

  it('stays down with nothing to fail over to', () => {
    const alone = {
      ...replicated,
      nodes: replicated.nodes.slice(0, 2),
      links: replicated.links.slice(0, 1),
    };
    expect(killDatabase(alone)?.metricsAt(FAILOVER_MS + 1000).errorRatePct).toBe(100);
  });
});

describe('partition', () => {
  it('fails only the requests that cross between zones', () => {
    const zones: DiagramState<InfraMetrics> = {
      ...replicated,
      nodes: [
        { id: 'east-app', kind: 'server', label: 'East app', x: 0, y: 0, tag: 'east' },
        { id: 'east-db', kind: 'database', label: 'East DB', x: 4, y: 0, tag: 'east' },
        { id: 'west-db', kind: 'database', label: 'West DB', x: 8, y: 0, tag: 'west' },
      ],
      links: [
        { id: 'a', from: 'east-app', to: 'east-db' },
        { id: 'b', from: 'east-db', to: 'west-db' },
      ],
      flows: [
        { route: ['east-app', 'east-db'], kind: 'request', ratePerSec: 75 },
        { route: ['east-app', 'east-db', 'west-db'], kind: 'request', ratePerSec: 25 },
      ],
    };
    expect(partition(zones)?.metricsAt(1000).errorRatePct).toBe(25);
  });
});

describe('stopWorkers', () => {
  const work: DiagramState<InfraMetrics> = {
    nodes: [
      { id: 'web', kind: 'server', label: 'Web', x: 0, y: 0, capacity: 500 },
      { id: 'q', kind: 'queue', label: 'Queue', x: 4, y: 0, value: 0 },
      { id: 'w', kind: 'service', label: 'Worker', x: 8, y: 0, tag: 'worker', capacity: 100 },
    ],
    links: [
      { id: 'a', from: 'web', to: 'q' },
      { id: 'b', from: 'q', to: 'w' },
      { id: 'c', from: 'web', to: 'w' },
    ],
    flows: [{ route: ['web', 'q', 'w'], kind: 'request', ratePerSec: 40 }],
    metrics,
  };

  it('lets a queue absorb jobs as a growing backlog, with no errors', () => {
    const s = stopWorkers(work);
    expect(s?.metricsAt(3000).errorRatePct).toBe(0);
    expect(s?.stateAt(3000).nodes.find((n) => n.id === 'q')?.value).toBe(120);
  });

  it('fails the jobs when they call the worker directly', () => {
    const direct = {
      ...work,
      flows: [{ route: ['web', 'w'], kind: 'request' as const, ratePerSec: 40 }],
    };
    expect(stopWorkers(direct)?.metricsAt(1000).errorRatePct).toBe(100);
  });
});

describe('noisyClient', () => {
  const shared: DiagramState<InfraMetrics> = {
    nodes: [
      { id: 'good', kind: 'users', label: 'Everyone', x: 0, y: 0 },
      { id: 'bot', kind: 'users', label: 'Script', x: 0, y: 4, tag: 'noisy' },
      { id: 'api', kind: 'server', label: 'API', x: 6, y: 2, capacity: 300 },
    ],
    links: [
      { id: 'a', from: 'good', to: 'api' },
      { id: 'b', from: 'bot', to: 'api' },
    ],
    flows: [
      { route: ['good', 'api'], kind: 'request', ratePerSec: 150 },
      { route: ['bot', 'api'], kind: 'request', ratePerSec: 30 },
    ],
    metrics,
  };

  it('one client flooding a shared server hurts everyone', () => {
    // 150 + 300 = 450 req/s on 300 capacity: a third dropped for everyone.
    expect(noisyClient(shared)?.metricsAt(1000).errorRatePct).toBe(33.3);
  });

  it('a rate limiter blocks the excess and protects the others', () => {
    const limited: DiagramState<InfraMetrics> = {
      ...shared,
      nodes: [...shared.nodes, { id: 'limit', kind: 'shield', label: 'Limiter', x: 3, y: 4 }],
      links: [
        shared.links[0] ?? { id: 'a', from: 'good', to: 'api' },
        { id: 'b1', from: 'bot', to: 'limit' },
        { id: 'b2', from: 'limit', to: 'api' },
      ],
      flows: [
        shared.flows[0] ?? { route: ['good', 'api'], kind: 'request', ratePerSec: 150 },
        { route: ['bot', 'limit', 'api'], kind: 'request', ratePerSec: 30 },
      ],
    };
    expect(noisyClient(limited)?.metricsAt(1000).errorRatePct).toBe(0);
  });
});

describe('slowDependency', () => {
  const chain: DiagramState<InfraMetrics> = {
    nodes: [
      { id: 'users', kind: 'users', label: 'Users', x: 0, y: 0 },
      { id: 'web', kind: 'server', label: 'Web', x: 4, y: 0, capacity: 500 },
      { id: 'recs', kind: 'service', label: 'Recommendations', x: 8, y: 0, capacity: 500 },
      { id: 'db', kind: 'database', label: 'DB', x: 8, y: 4, capacity: 1000 },
    ],
    links: [
      { id: 'a', from: 'users', to: 'web' },
      { id: 'b', from: 'web', to: 'recs' },
      { id: 'c', from: 'web', to: 'db' },
    ],
    flows: [
      { route: ['users', 'web', 'recs'], kind: 'request', ratePerSec: 100 },
      { route: ['users', 'web', 'db'], kind: 'request', ratePerSec: 100 },
    ],
    metrics,
  };

  it('ties up the callers so every request suffers', () => {
    const m = slowDependency(chain)?.metricsAt(1000);
    // Web capacity drops from 500 to 100 for 200 req/s: half of everything fails.
    expect(m?.errorRatePct).toBe(50);
    expect(m?.p95LatencyMs).toBeGreaterThan(500);
  });

  it('a timeout with a fallback contains the damage', () => {
    const guarded: DiagramState<InfraMetrics> = {
      ...chain,
      nodes: [...chain.nodes, { id: 'breaker', kind: 'shield', label: 'Timeout', x: 6, y: -2 }],
      links: [
        chain.links[0] ?? { id: 'a', from: 'users', to: 'web' },
        { id: 'b1', from: 'web', to: 'breaker' },
        { id: 'b2', from: 'breaker', to: 'recs' },
        chain.links[2] ?? { id: 'c', from: 'web', to: 'db' },
      ],
      flows: [
        { route: ['users', 'web', 'breaker', 'recs'], kind: 'request', ratePerSec: 100 },
        chain.flows[1] ?? { route: ['users', 'web', 'db'], kind: 'request', ratePerSec: 100 },
      ],
    };
    expect(slowDependency(guarded)?.metricsAt(1000)).toMatchObject({
      errorRatePct: 0,
      p95LatencyMs: 50,
    });
  });
});

describe('scenario targeting', () => {
  it('expires only the caches tagged expires', () => {
    const ring: DiagramState<InfraMetrics> = {
      ...cached,
      nodes: [
        ...cached.nodes,
        {
          id: 'cache2',
          kind: 'cache',
          label: 'Cache 2',
          x: 8,
          y: -6,
          capacity: 20000,
          tag: 'expires',
        },
      ],
      links: [...cached.links, { id: 'd', from: 'app', to: 'cache2' }],
      flows: [
        { route: ['users', 'app', 'cache'], kind: 'request', ratePerSec: 300 },
        { route: ['users', 'app', 'cache2'], kind: 'request', ratePerSec: 100 },
      ],
    };
    const cold = expireCache(ring)?.stateAt(100);
    expect(
      cold?.flows.filter((f) => f.route.at(-1) === 'db').reduce((t, f) => t + f.ratePerSec, 0),
    ).toBe(100);
  });

  it('fails over the database tagged primary, even when a replica is busier', () => {
    const tagged: DiagramState<InfraMetrics> = {
      ...replicated,
      nodes: replicated.nodes.map((n) => (n.id === 'primary' ? { ...n, tag: 'primary' } : n)),
      flows: [
        { route: ['app', 'primary'], kind: 'request', ratePerSec: 50 },
        { route: ['app', 'standby'], kind: 'request', ratePerSec: 400 },
      ],
    };
    expect(
      killDatabase(tagged)
        ?.stateAt(0)
        .nodes.find((n) => n.id === 'primary')?.health,
    ).toBe('down');
  });

  it('a queue between caller and slow service keeps the caller free', () => {
    const decoupled: DiagramState<InfraMetrics> = {
      nodes: [
        { id: 'web', kind: 'server', label: 'Orders', x: 0, y: 0, capacity: 300 },
        { id: 'topic', kind: 'queue', label: 'Topic', x: 4, y: 0 },
        { id: 'mail', kind: 'service', label: 'Email', x: 8, y: 0, capacity: 300 },
      ],
      links: [
        { id: 'a', from: 'web', to: 'topic' },
        { id: 'b', from: 'topic', to: 'mail' },
      ],
      flows: [{ route: ['web', 'topic', 'mail'], kind: 'request', ratePerSec: 100 }],
      metrics,
    };
    expect(slowDependency(decoupled)?.metricsAt(1000).errorRatePct).toBe(0);
  });
});
