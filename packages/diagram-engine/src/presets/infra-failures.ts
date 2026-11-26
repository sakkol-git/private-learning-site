/**
 * More system design failures, all scored the same way: the scenario reshapes the
 * diagram (who is down, where requests go, how fast they arrive), and `evaluate`
 * turns that diagram into error rate and p95 from the actual flow rates and capacities.
 *
 * Conventions in lessons:
 * - `cache` and `cdn` nodes answer the request flows that end at them (hits). If any is tagged
 *   `expires`, only those go cold (for example the one arc of a hash ring that moved).
 * - A database tagged `primary` is the one that fails over.
 * - Workers are `service` nodes with `tag: 'worker'`; a `queue` in front of them buffers jobs.
 * - Zones are node `tag`s; a partition cuts every link between two different tags.
 * - A client with `tag: 'noisy'` is the misbehaving one; its own requests are not counted as errors.
 * - A `shield` on a path is a protective layer: a rate limiter, or a timeout with a fallback.
 */
import { routeAround } from '../model';
import { clamp01, computeLoads, easeOut, lerp, round1, type Scenario } from '../scenario';
import type { DiagramNode, DiagramState, TrafficFlow } from '../types';
import type { InfraMetrics } from './infra';

type State = DiagramState<InfraMetrics>;
type Sc = Scenario<InfraMetrics>;

const sum = (flows: TrafficFlow[]) => flows.reduce((s, f) => s + f.ratePerSec, 0);
const nodeOf = (state: State, id: string | undefined) => state.nodes.find((n) => n.id === id);
const isNoisy = (state: State, f: TrafficFlow) => nodeOf(state, f.route[0])?.tag === 'noisy';
const latencyFactor = (rho: number) => 1 / (1 - Math.min(rho, 0.95));

/** Highest utilisation along a flow's route. */
function bottleneck(loads: Map<string, number>, f: TrafficFlow): number {
  return Math.max(0, ...f.route.map((id) => loads.get(id) ?? 0));
}

/**
 * Error rate and p95 for a reshaped diagram, relative to the step it started from.
 * Errors are failed flows plus requests dropped at any node pushed past its capacity.
 */
export function evaluate(base: State, next: State, extraP95 = 0): InfraMetrics {
  const m = base.metrics;
  const counted = (s: State) => s.flows.filter((f) => !isNoisy(s, f));
  const demand = sum(counted(base).filter((f) => f.kind === 'request')) || 1;
  const loads = computeLoads(next);
  const baseLoads = computeLoads(base);
  let dropped = 0;
  let worst = 0;
  for (const f of counted(next)) {
    if (f.kind !== 'request') continue;
    const rho = bottleneck(loads, f);
    worst = Math.max(worst, rho);
    if (rho > 1) dropped += f.ratePerSec * (1 - 1 / rho);
  }
  let baseWorst = 0;
  for (const f of counted(base))
    if (f.kind === 'request') baseWorst = Math.max(baseWorst, bottleneck(baseLoads, f));
  const failed = sum(counted(next).filter((f) => f.kind === 'failed'));
  const wasDown = new Set(base.nodes.filter((n) => n.health === 'down').map((n) => n.id));
  const lost = next.nodes.filter(
    (n) => n.kind === 'server' && n.health === 'down' && !wasDown.has(n.id),
  ).length;
  return {
    ...m,
    errorRatePct: round1(Math.min(100, m.errorRatePct + ((failed + dropped) / demand) * 100)),
    p95LatencyMs: Math.round(
      (m.p95LatencyMs * latencyFactor(worst)) / latencyFactor(baseWorst) + extraP95,
    ),
    // A node can stand for several servers, so count only the ones this scenario took down.
    healthy: [Math.max(0, m.healthy[0] - lost), m.healthy[1]],
  };
}

/** Eases from the step's numbers to the scenario's over the first moments. */
function easedMetrics(base: State, at: (t: number) => InfraMetrics, rampMs = 400) {
  return (t: number): InfraMetrics => {
    const target = at(t);
    const k = easeOut(t / rampMs);
    if (k >= 1) return target;
    const m = base.metrics;
    return {
      ...target,
      errorRatePct: round1(lerp(m.errorRatePct, target.errorRatePct, k)),
      p95LatencyMs: Math.round(lerp(m.p95LatencyMs, target.p95LatencyMs, k)),
    };
  };
}

const cut = (f: TrafficFlow, upTo: number, kind: TrafficFlow['kind']): TrafficFlow => ({
  ...f,
  kind,
  route: f.route.slice(0, upTo + 1),
});

const patchNodes = (
  s: State,
  patch: (n: DiagramNode) => DiagramNode,
  flows: TrafficFlow[],
): State => ({
  ...s,
  nodes: s.nodes.map(patch),
  flows,
});

// ---------- cache expiry ----------

/** How long every key stays cold before refills start landing. */
export const COLD_MS = 600;
/** How long the cache takes to warm back up to its usual hit rate. */
export const WARM_MS = 4000;
const TICK_MS = 500;

/** The route a cache miss takes: on to the nearest database, or from a CDN back to its origin. */
function missRoute(state: State, hit: TrafficFlow): string[] | null {
  const cache = hit.route[hit.route.length - 1] ?? '';
  const before = hit.route.slice(0, -1);
  const caller = before[before.length - 1];
  const backends = state.nodes.filter(
    (n) => (n.kind === 'database' || n.kind === 'server') && !hit.route.includes(n.id),
  );
  const shortest = (from: string, avoid: Set<string>) =>
    backends
      .map((b) => routeAround(state, from, b.id, avoid))
      .filter((p): p is string[] => p !== null)
      .sort((a, b) => a.length - b.length)[0];
  if (caller) {
    const viaCaller = shortest(caller, new Set([cache, ...before.slice(0, -1)]));
    if (
      viaCaller &&
      state.nodes.find((n) => n.id === viaCaller[viaCaller.length - 1])?.kind === 'database'
    ) {
      return [...before, ...viaCaller.slice(1)];
    }
  }
  const viaCache = shortest(cache, new Set(before));
  return viaCache ? [...hit.route, ...viaCache.slice(1)] : null;
}

/** Many keys expire together: every hit becomes a miss, then the cache refills. */
export function expireCache(base: State): Sc | null {
  const caches = base.nodes.filter(
    (n) => (n.kind === 'cache' || n.kind === 'cdn') && n.health !== 'down',
  );
  const marked = caches.filter((n) => n.tag === 'expires');
  const cacheIds = new Set((marked.length > 0 ? marked : caches).map((n) => n.id));
  const hits = base.flows.filter(
    (f) => f.kind === 'request' && cacheIds.has(f.route[f.route.length - 1] ?? ''),
  );
  const pairs = hits
    .map((h) => ({ hit: h, miss: missRoute(base, h) }))
    .filter((p) => p.miss !== null);
  if (pairs.length === 0) return null;
  const warmAt = (phase: number) => clamp01((phase * TICK_MS - COLD_MS) / WARM_MS);
  const last = Math.ceil((COLD_MS + WARM_MS) / TICK_MS);
  const phaseAt = (t: number) => Math.min(last, Math.floor(t / TICK_MS));
  const stateAt = (t: number): State => {
    const w = warmAt(phaseAt(t));
    const flows = base.flows.flatMap((f) => {
      const pair = pairs.find((p) => p.hit === f);
      if (!pair?.miss) return [f];
      return [
        ...(w > 0 ? [{ ...f, ratePerSec: f.ratePerSec * w }] : []),
        ...(w < 1 ? [{ ...f, route: pair.miss, ratePerSec: f.ratePerSec * (1 - w) }] : []),
      ];
    });
    return patchNodes(
      base,
      (n) => (cacheIds.has(n.id) && w < 1 ? { ...n, health: 'degraded' } : n),
      flows,
    );
  };
  return { phaseAt, stateAt, metricsAt: easedMetrics(base, (t) => evaluate(base, stateAt(t))) };
}

// ---------- database failover ----------

/** How long until a replica is promoted after the primary stops answering. */
export const FAILOVER_MS = 4000;

export function killDatabase(base: State): Sc | null {
  const loads = computeLoads(base);
  const dbs = base.nodes
    .filter((n) => n.kind === 'database' && n.health !== 'down')
    .sort(
      (a, b) =>
        (loads.get(b.id) ?? 0) * (b.capacity ?? 1) - (loads.get(a.id) ?? 0) * (a.capacity ?? 1),
    );
  const target = dbs.find((d) => d.tag === 'primary') ?? dbs[0];
  if (!target) return null;
  const others = dbs.filter((d) => d.id !== target.id);
  const down = (n: DiagramNode): DiagramNode => (n.id === target.id ? { ...n, health: 'down' } : n);
  const hit = (f: TrafficFlow) => f.kind === 'request' && f.route.includes(target.id);
  const before = patchNodes(
    base,
    down,
    base.flows.flatMap((f) =>
      hit(f)
        ? [cut(f, f.route.indexOf(target.id), 'failed')]
        : f.route.includes(target.id)
          ? []
          : [f],
    ),
  );
  const failover = (f: TrafficFlow): TrafficFlow => {
    const i = f.route.indexOf(target.id);
    const from = f.route[i - 1];
    if (!from) return cut(f, i, 'failed');
    const path = others
      .map((d) => routeAround(base, from, d.id, new Set([target.id])))
      .filter((p): p is string[] => p !== null)
      .sort((a, b) => a.length - b.length)[0];
    return path ? { ...f, route: [...f.route.slice(0, i), ...path.slice(1)] } : cut(f, i, 'failed');
  };
  const after = patchNodes(
    base,
    down,
    base.flows.flatMap((f) => (hit(f) ? [failover(f)] : f.route.includes(target.id) ? [] : [f])),
  );
  const stateAt = (t: number) => (t < FAILOVER_MS ? before : after);
  return {
    phaseAt: (t) => (t < FAILOVER_MS ? 0 : 1),
    stateAt,
    metricsAt: easedMetrics(base, (t) => evaluate(base, stateAt(t))),
  };
}

// ---------- network partition ----------

export function partition(base: State): Sc | null {
  const zone = (id: string) => nodeOf(base, id)?.tag;
  const crosses = (a: string, b: string) =>
    zone(a) !== undefined && zone(b) !== undefined && zone(a) !== zone(b);
  if (!base.links.some((l) => crosses(l.from, l.to))) return null;
  const flows = base.flows.flatMap((f) => {
    const hop = f.route.findIndex((id, i) => i > 0 && crosses(f.route[i - 1] ?? '', id));
    if (hop < 0) return [f];
    return f.kind === 'request' ? [cut(f, hop - 1, 'failed')] : [];
  });
  const state: State = { ...base, flows };
  return {
    phaseAt: () => 0,
    stateAt: () => state,
    metricsAt: easedMetrics(base, () => evaluate(base, state)),
  };
}

// ---------- workers stop ----------

export function stopWorkers(base: State): Sc | null {
  const workers = new Set(
    base.nodes
      .filter((n) => n.kind === 'service' && n.tag === 'worker' && n.health !== 'down')
      .map((n) => n.id),
  );
  if (workers.size === 0) return null;
  const queued: { queue: string; rate: number }[] = [];
  const flows = base.flows.flatMap((f) => {
    const i = f.route.findIndex((id) => workers.has(id));
    if (i < 0) return [f];
    if (f.kind !== 'request') return [];
    const prev = nodeOf(base, f.route[i - 1]);
    if (prev?.kind === 'queue') {
      queued.push({ queue: prev.id, rate: f.ratePerSec });
      return [cut(f, i - 1, 'request')];
    }
    return [cut(f, i, 'failed')];
  });
  const phaseAt = (t: number) => Math.min(40, Math.floor(t / TICK_MS));
  const stateAt = (t: number): State => {
    const seconds = (phaseAt(t) * TICK_MS) / 1000;
    return patchNodes(
      base,
      (n) => {
        if (workers.has(n.id)) return { ...n, health: 'down' };
        const backlog = queued
          .filter((q) => q.queue === n.id)
          .reduce((s, q) => s + q.rate * seconds, 0);
        return backlog > 0 ? { ...n, value: Math.round((n.value ?? 0) + backlog) } : n;
      },
      flows,
    );
  };
  return { phaseAt, stateAt, metricsAt: easedMetrics(base, (t) => evaluate(base, stateAt(t))) };
}

// ---------- one client floods ----------

/** How much harder the noisy client pushes. */
const NOISY_FACTOR = 10;
/** What a rate limiter lets through, relative to the client's usual rate. */
const LIMIT_FACTOR = 1.2;

export function noisyClient(base: State): Sc | null {
  const noisy = new Set(base.nodes.filter((n) => n.tag === 'noisy').map((n) => n.id));
  if (noisy.size === 0) return null;
  const flows = base.flows.flatMap((f) => {
    if (f.kind !== 'request' || !noisy.has(f.route[0] ?? '')) return [f];
    const s = f.route.findIndex((id) => nodeOf(base, id)?.kind === 'shield');
    if (s < 0) return [{ ...f, ratePerSec: f.ratePerSec * NOISY_FACTOR }];
    return [
      { ...f, ratePerSec: f.ratePerSec * LIMIT_FACTOR },
      { ...cut(f, s, 'failed'), ratePerSec: f.ratePerSec * (NOISY_FACTOR - LIMIT_FACTOR) },
    ];
  });
  const state: State = { ...base, flows };
  return {
    phaseAt: () => 0,
    stateAt: () => state,
    metricsAt: easedMetrics(base, () => evaluate(base, state)),
  };
}

// ---------- a dependency slows down ----------

/** How much a slow dependency shrinks the capacity of the callers waiting on it. */
const STUCK_FACTOR = 5;

export function slowDependency(base: State): Sc | null {
  const loads = computeLoads(base);
  const target = base.nodes
    .filter((n) => n.kind === 'service' && n.health !== 'down' && n.tag !== 'worker')
    .sort(
      (a, b) =>
        (loads.get(b.id) ?? 0) * (b.capacity ?? 1) - (loads.get(a.id) ?? 0) * (a.capacity ?? 1),
    )[0];
  if (!target) return null;
  const stuck = new Set<string>();
  const flows = base.flows.flatMap((f) => {
    const i = f.route.indexOf(target.id);
    if (i < 0) return [f];
    if (f.kind !== 'request') return [];
    const guard = f.route.findIndex((id, j) => j < i && nodeOf(base, id)?.kind === 'shield');
    // A timeout with a fallback answers fast and stops waiting on the slow service.
    if (guard >= 0) return [cut(f, guard, 'request')];
    // Callers wait synchronously, back to the nearest queue: work behind a queue does not hold anyone.
    for (let j = i - 1; j >= 0; j--) {
      const caller = nodeOf(base, f.route[j]);
      if (!caller || caller.kind === 'queue') break;
      if (caller.capacity) stuck.add(caller.id);
    }
    return [f];
  });
  const state = patchNodes(
    base,
    (n) => {
      if (n.id === target.id) return { ...n, health: 'degraded' };
      if (stuck.has(n.id) && n.capacity) return { ...n, capacity: n.capacity / STUCK_FACTOR };
      return n;
    },
    flows,
  );
  return {
    phaseAt: () => 0,
    stateAt: () => state,
    metricsAt: easedMetrics(base, () => evaluate(base, state)),
  };
}
