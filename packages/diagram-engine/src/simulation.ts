/**
 * A small deterministic simulation. Everything is a pure function of the
 * step state and elapsed scenario time, so tests can sample any moment.
 */
import type { BreakAction, DiagramNode, DiagramState, Metrics, TrafficFlow } from './types';

/** Utilisation (0..∞) of every node that declares a capacity. */
export function computeLoads(state: DiagramState): Map<string, number> {
  const rps = new Map<string, number>();
  for (const flow of state.flows) {
    if (flow.kind !== 'request') continue;
    for (const id of flow.route) rps.set(id, (rps.get(id) ?? 0) + flow.ratePerSec);
  }
  const loads = new Map<string, number>();
  for (const node of state.nodes) {
    if (node.capacity && node.health !== 'down')
      loads.set(node.id, (rps.get(node.id) ?? 0) / node.capacity);
  }
  return loads;
}

export interface Scenario {
  action: BreakAction;
  /** Discrete phase index at time t; the stage re-renders the diagram when it changes. */
  phaseAt(t: number): number;
  stateAt(t: number): DiagramState;
  metricsAt(t: number): Metrics;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const round1 = (x: number) => Math.round(x * 10) / 10;

/** How long a dead server keeps receiving traffic before the health check notices. */
export const HEALTH_CHECK_DETECT_MS = 3000;

function withNodes(
  base: DiagramState,
  patch: (n: DiagramNode) => DiagramNode,
  flows: TrafficFlow[],
): DiagramState {
  return { ...base, nodes: base.nodes.map(patch), flows };
}

function killServer(base: DiagramState): Scenario | null {
  const servers = base.nodes.filter((n) => n.kind === 'server' && n.health !== 'down');
  const target = servers[1] ?? servers[0];
  if (!target) return null;
  const n = servers.length;
  const m = base.metrics;
  const share = 100 / n;
  const down = (node: DiagramNode): DiagramNode =>
    node.id === target.id ? { ...node, health: 'down' } : node;

  const hitting: TrafficFlow[] = base.flows.map((flow) => {
    const i = flow.route.indexOf(target.id);
    if (i < 0 || flow.kind !== 'request') return flow;
    return { ...flow, kind: 'failed', route: flow.route.slice(0, i + 1) };
  });
  const scale = n > 1 ? n / (n - 1) : 1;
  const servesViaServer = (flow: TrafficFlow) =>
    flow.route.some((id) => base.nodes.some((node) => node.id === id && node.kind === 'server'));
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

  return {
    action: 'killServer',
    phaseAt: (t) => (t < HEALTH_CHECK_DETECT_MS ? 0 : 1),
    stateAt: (t) => (t < HEALTH_CHECK_DETECT_MS ? before : after),
    metricsAt: (t) => {
      if (t < HEALTH_CHECK_DETECT_MS) {
        const k = easeOut(t / 300);
        return {
          ...m,
          healthy,
          errorRatePct: round1(lerp(m.errorRatePct, m.errorRatePct + share, k)),
          p95LatencyMs: Math.round(lerp(m.p95LatencyMs, m.p95LatencyMs * 1.15, k)),
        };
      }
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

export const SPIKE_FACTOR = 5;
const SPIKE_RAMP_MS = 1500;

function spikeTraffic(base: DiagramState): Scenario {
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
    action: 'spikeTraffic',
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

export const SLOW_DB_EXTRA_MS = 900;

function slowDatabase(base: DiagramState): Scenario | null {
  if (!base.nodes.some((n) => n.kind === 'database')) return null;
  const m = base.metrics;
  const slow = withNodes(
    base,
    (node) =>
      node.kind === 'database' && node.health !== 'down' ? { ...node, health: 'degraded' } : node,
    base.flows,
  );
  return {
    action: 'slowDatabase',
    phaseAt: () => 0,
    stateAt: () => slow,
    metricsAt: (t) => ({
      ...m,
      p95LatencyMs: Math.round(m.p95LatencyMs + SLOW_DB_EXTRA_MS * easeOut(t / 1000)),
    }),
  };
}

/** Builds a break-it scenario on top of a step state, or null if it cannot apply. */
export function createScenario(action: BreakAction, base: DiagramState): Scenario | null {
  switch (action) {
    case 'killServer':
      return killServer(base);
    case 'spikeTraffic':
      return spikeTraffic(base);
    case 'slowDatabase':
      return slowDatabase(base);
  }
}
