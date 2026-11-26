/**
 * System design preset: request metrics and the infrastructure break-it scenarios.
 */
import {
  clamp01,
  computeLoads,
  easeOut,
  lerp,
  round1,
  withNodes,
  type ActionNeeds,
  type Scenario,
  type Scenarios,
} from '../scenario';
import type { DiagramNode, DiagramState, TrafficFlow } from '../types';
import {
  expireCache,
  killDatabase,
  noisyClient,
  partition,
  slowDependency,
  stopWorkers,
} from './infra-failures';

export interface InfraMetrics {
  users: number;
  requestsPerSec: number;
  p95LatencyMs: number;
  errorRatePct: number;
  /** [healthy, total] servers */
  healthy: [number, number];
}

export type InfraAction =
  | 'killServer'
  | 'spikeTraffic'
  | 'slowDatabase'
  | 'expireCache'
  | 'killDatabase'
  | 'partition'
  | 'stopWorkers'
  | 'noisyClient'
  | 'slowDependency';

/** How long a dead server keeps receiving traffic before the health check notices. */
export const HEALTH_CHECK_DETECT_MS = 3000;

function killServer(base: DiagramState<InfraMetrics>): Scenario<InfraMetrics> | null {
  const servers = base.nodes.filter((n) => n.kind === 'server' && n.health !== 'down');
  const target = servers[1] ?? servers[0];
  if (!target) return null;
  const n = servers.length;
  const m = base.metrics;
  const servesViaServer = (flow: TrafficFlow) =>
    flow.route.some((id) => base.nodes.some((node) => node.id === id && node.kind === 'server'));
  // The dead server's share of the traffic that servers handle; an even split when no traffic is drawn.
  const served = base.flows.filter((f) => f.kind === 'request' && servesViaServer(f));
  const servedRate = served.reduce((s, f) => s + f.ratePerSec, 0);
  const lostRate = served
    .filter((f) => f.route.includes(target.id))
    .reduce((s, f) => s + f.ratePerSec, 0);
  const lostShare = servedRate > 0 ? lostRate / servedRate : 1 / n;
  const share = n > 1 ? lostShare * 100 : 100;
  const down = (node: DiagramNode): DiagramNode =>
    node.id === target.id ? { ...node, health: 'down' } : node;

  const hitting: TrafficFlow[] = base.flows.map((flow) => {
    const i = flow.route.indexOf(target.id);
    if (i < 0 || flow.kind !== 'request') return flow;
    return { ...flow, kind: 'failed', route: flow.route.slice(0, i + 1) };
  });
  const scale = n > 1 && lostShare < 1 ? 1 / (1 - lostShare) : 1;
  const rerouted: TrafficFlow[] = [];
  const checks: TrafficFlow[] = [];
  for (const flow of base.flows) {
    const i = flow.route.indexOf(target.id);
    if (i > 0 && flow.kind === 'request') {
      const prev = flow.route[i - 1] as string;
      if (!checks.some((c) => c.route[0] === prev)) {
        checks.push({ route: [prev, target.id], kind: 'healthCheck', ratePerSec: 1 });
      }
      continue;
    }
    if (i >= 0) continue;
    rerouted.push(
      flow.kind === 'request' && servesViaServer(flow)
        ? { ...flow, ratePerSec: flow.ratePerSec * scale }
        : flow,
    );
  }
  const before = withNodes(base, down, hitting);
  const after = withNodes(base, down, [...rerouted, ...checks]);
  const healthy: [number, number] = [Math.max(0, m.healthy[0] - 1), m.healthy[1]];
  const settledLatency = m.p95LatencyMs * scale ** 1.3;
  const failing = (t: number): InfraMetrics => {
    const k = easeOut(t / 300);
    return {
      ...m,
      healthy,
      errorRatePct: round1(lerp(m.errorRatePct, Math.min(100, m.errorRatePct + share), k)),
      p95LatencyMs: Math.round(lerp(m.p95LatencyMs, m.p95LatencyMs * 1.15, k)),
    };
  };

  if (n === 1) {
    // Nothing left to reroute to: the health check notices, but every request still fails.
    return { phaseAt: () => 0, stateAt: () => before, metricsAt: failing };
  }

  return {
    phaseAt: (t) => (t < HEALTH_CHECK_DETECT_MS ? 0 : 1),
    stateAt: (t) => (t < HEALTH_CHECK_DETECT_MS ? before : after),
    metricsAt: (t) => {
      if (t < HEALTH_CHECK_DETECT_MS) return failing(t);
      const k = easeOut((t - HEALTH_CHECK_DETECT_MS) / 600);
      return {
        ...m,
        healthy,
        errorRatePct: round1(lerp(m.errorRatePct + share, m.errorRatePct, k)),
        p95LatencyMs: Math.round(lerp(m.p95LatencyMs * 1.15, settledLatency, k)),
      };
    },
  };
}

const SPIKE_FACTOR = 5;
const SPIKE_RAMP_MS = 1500;

function spikeTraffic(base: DiagramState<InfraMetrics>): Scenario<InfraMetrics> {
  const m = base.metrics;
  const loads = computeLoads(base);
  const serverLoads = base.nodes
    .filter((n) => n.kind === 'server')
    .map((n) => loads.get(n.id) ?? 0);
  const rho0 = serverLoads.length > 0 ? Math.max(...serverLoads, 0.05) : 0.3;
  const flows = base.flows.map((f) =>
    f.kind === 'request' ? { ...f, ratePerSec: f.ratePerSec * SPIKE_FACTOR } : f,
  );
  const strained = withNodes(
    base,
    (node) =>
      node.capacity && node.health !== 'down' && (loads.get(node.id) ?? 0) * SPIKE_FACTOR > 0.85
        ? { ...node, health: 'degraded' }
        : node,
    flows,
  );
  const busy = { ...base, flows };
  const latencyFactor = (rho: number) => (1 - Math.min(rho0, 0.95)) / (1 - Math.min(rho, 0.95));

  return {
    phaseAt: (t) => (t < SPIKE_RAMP_MS * 0.6 ? 0 : 1),
    stateAt: (t) => (t < SPIKE_RAMP_MS * 0.6 ? busy : strained),
    metricsAt: (t) => {
      const k = lerp(1, SPIKE_FACTOR, easeOut(t / SPIKE_RAMP_MS));
      const rho = rho0 * k;
      const dropped = rho > 1 ? (1 - 1 / rho) * 100 : 0;
      return {
        ...m,
        users: Math.round(m.users * k),
        requestsPerSec: Math.round(m.requestsPerSec * k),
        p95LatencyMs: Math.round(m.p95LatencyMs * latencyFactor(rho)),
        errorRatePct: round1(Math.min(100, m.errorRatePct + dropped)),
      };
    },
  };
}

const SLOW_DB_EXTRA_MS = 900;

/**
 * Share of user requests that reach a database. p95 only moves when more than
 * about 1 in 20 requests is slow, which is why a good cache hides a slow database.
 */
export function databaseShare(state: DiagramState<InfraMetrics>): number {
  const dbIds = new Set(state.nodes.filter((n) => n.kind === 'database').map((n) => n.id));
  const requests = state.flows.filter((f) => f.kind === 'request');
  const total = requests.reduce((sum, f) => sum + f.ratePerSec, 0);
  if (total === 0) return 1;
  const toDb = requests
    .filter((f) => f.route.some((id) => dbIds.has(id)))
    .reduce((sum, f) => sum + f.ratePerSec, 0);
  return toDb / total;
}

function slowDatabase(base: DiagramState<InfraMetrics>): Scenario<InfraMetrics> | null {
  if (!base.nodes.some((n) => n.kind === 'database')) return null;
  const m = base.metrics;
  const reach = clamp01((databaseShare(base) - 0.04) / 0.03);
  const slow = withNodes(
    base,
    (node) =>
      node.kind === 'database' && node.health !== 'down' ? { ...node, health: 'degraded' } : node,
    base.flows,
  );
  return {
    phaseAt: () => 0,
    stateAt: () => slow,
    metricsAt: (t) => ({
      ...m,
      p95LatencyMs: Math.round(m.p95LatencyMs + SLOW_DB_EXTRA_MS * reach * easeOut(t / 1000)),
    }),
  };
}

export const infraScenarios: Scenarios<InfraMetrics, InfraAction> = {
  killServer,
  spikeTraffic,
  slowDatabase,
  expireCache,
  killDatabase,
  partition,
  stopWorkers,
  noisyClient,
  slowDependency,
};

export const INFRA_ACTION_NEEDS: ActionNeeds<InfraAction> = {
  killServer: ['server'],
  spikeTraffic: ['server'],
  slowDatabase: ['database'],
  expireCache: ['cache', 'cdn'],
  killDatabase: ['database'],
  partition: ['server', 'database', 'service'],
  stopWorkers: ['service'],
  noisyClient: ['users'],
  slowDependency: ['service'],
};

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

/** Screen-reader summary of the diagram and its numbers. */
export function summarizeInfra(state: DiagramState<InfraMetrics>, m: InfraMetrics): string {
  const parts = state.nodes.map((n) =>
    n.health && n.health !== 'healthy' ? `${n.label} (${n.health})` : n.label,
  );
  return (
    `Diagram: ${parts.join(', ')}. ${fmt(m.users)} users, ${fmt(m.requestsPerSec)} requests per second, ` +
    `p95 latency ${fmt(m.p95LatencyMs)} ms, ${m.errorRatePct}% errors, ${m.healthy[0]} of ${m.healthy[1]} servers healthy.`
  );
}
