/**
 * Networking preset: page-load metrics and things that go wrong on the internet.
 */
import { routeAround } from '../model';
import {
  easeOut,
  lerp,
  withNodes,
  type ActionNeeds,
  type Scenario,
  type Scenarios,
} from '../scenario';
import type { DiagramNode, DiagramState, TrafficFlow } from '../types';

export interface NetworkMetrics {
  pageLoadMs: number;
  roundTripMs: number;
  /** Share of packets lost on the way, in percent. */
  lossPct: number;
  /** Share of requests that get an answer, in percent. */
  okPct: number;
  /** Routers and servers a request passes through. */
  hops: number;
}

export type NetworkAction = 'routerFails' | 'dnsOutage' | 'packetLoss' | 'ddos';

type State = DiagramState<NetworkMetrics>;
type Sc = Scenario<NetworkMetrics>;

/** How long routers take to notice a failure and agree on new routes. */
export const ROUTE_UPDATE_MS = 2000;
/** Extra round-trip time per extra hop. */
const HOP_MS = 9;
/** Round trips a typical page load needs (DNS, connection, TLS, request). */
const ROUND_TRIPS = 4;
/** Attack traffic relative to all real traffic. */
const ATTACK_FACTOR = 20;

const requests = (state: State) => state.flows.filter((f) => f.kind === 'request');
const rateOf = (flows: TrafficFlow[]) => flows.reduce((sum, f) => sum + f.ratePerSec, 0);
const round1 = (x: number) => Math.round(x * 10) / 10;

/** Request flows that pass through a node, and their share of all requests. */
function through(state: State, id: string) {
  const all = requests(state);
  const hit = all.filter((f) => f.route.includes(id));
  const total = rateOf(all) || 1;
  return { hit, share: rateOf(hit) / total };
}

/** Nodes of a kind, busiest first (the ones whose failure hurts most). */
function byLoad(state: State, kind: DiagramNode['kind']): DiagramNode[] {
  return state.nodes
    .filter((n) => n.kind === kind && n.health !== 'down')
    .map((n) => ({ n, rate: rateOf(through(state, n.id).hit) }))
    .sort((a, b) => b.rate - a.rate)
    .map(({ n }) => n);
}

const busiest = (state: State, kind: DiagramNode['kind']) => byLoad(state, kind)[0];

/** Every request through the node could find another way to its destination. */
function hasDetour(state: State, id: string): boolean {
  const { hit } = through(state, id);
  return (
    hit.length > 0 &&
    hit.every(
      (f) =>
        routeAround(state, f.route[0] ?? '', f.route[f.route.length - 1] ?? '', new Set([id])) !==
        null,
    )
  );
}

/** A flow cut short at a node, bouncing back as failed. */
function stoppedAt(flow: TrafficFlow, id: string): TrafficFlow {
  return { ...flow, kind: 'failed', route: flow.route.slice(0, flow.route.indexOf(id) + 1) };
}

const routerFails = (base: State): Sc | null => {
  // Prefer the busiest router the network can route around, to show recovery; else the busiest.
  const routers = byLoad(base, 'router');
  const router = routers.find((r) => hasDetour(base, r.id)) ?? routers[0];
  if (!router) return null;
  const m = base.metrics;
  const { hit, share } = through(base, router.id);
  const down = (n: DiagramNode): DiagramNode => (n.id === router.id ? { ...n, health: 'down' } : n);
  const others = base.flows.filter((f) => !hit.includes(f));
  const before = withNodes(base, down, [...others, ...hit.map((f) => stoppedAt(f, router.id))]);

  let extraHops = 0;
  let lostRate = 0;
  const rerouted: TrafficFlow[] = hit.map((f) => {
    const path = routeAround(
      base,
      f.route[0] ?? '',
      f.route[f.route.length - 1] ?? '',
      new Set([router.id]),
    );
    if (!path) {
      lostRate += f.ratePerSec;
      return stoppedAt(f, router.id);
    }
    extraHops += (path.length - f.route.length) * f.ratePerSec;
    return { ...f, route: path };
  });
  const total = rateOf(requests(base)) || 1;
  const reroutedRate = rateOf(hit) - lostRate;
  const avgExtra = reroutedRate > 0 ? extraHops / reroutedRate : 0;
  const after = withNodes(base, down, [...others, ...rerouted]);
  const settled = {
    ...m,
    okPct: round1(100 - (lostRate / total) * 100),
    roundTripMs: Math.round(m.roundTripMs + avgExtra * HOP_MS * share),
    pageLoadMs: Math.round(m.pageLoadMs + avgExtra * HOP_MS * ROUND_TRIPS * share),
    hops: round1(m.hops + avgExtra * share),
  };

  return {
    phaseAt: (t) => (t < ROUTE_UPDATE_MS ? 0 : 1),
    stateAt: (t) => (t < ROUTE_UPDATE_MS ? before : after),
    metricsAt: (t) => {
      if (t < ROUTE_UPDATE_MS)
        return { ...m, okPct: round1(lerp(m.okPct, 100 - share * 100, easeOut(t / 300))) };
      const k = easeOut((t - ROUTE_UPDATE_MS) / 600);
      return {
        okPct: round1(lerp(100 - share * 100, settled.okPct, k)),
        roundTripMs: Math.round(lerp(m.roundTripMs, settled.roundTripMs, k)),
        pageLoadMs: Math.round(lerp(m.pageLoadMs, settled.pageLoadMs, k)),
        hops: round1(lerp(m.hops, settled.hops, k)),
        lossPct: m.lossPct,
      };
    },
  };
};

const dnsOutage = (base: State): Sc | null => {
  const dnsNodes = base.nodes.filter((n) => n.kind === 'dns' && n.health !== 'down');
  if (dnsNodes.length === 0) return null;
  const ids = new Set(dnsNodes.map((n) => n.id));
  const all = requests(base);
  const hit = all.filter((f) => f.route.some((id) => ids.has(id)));
  const share = rateOf(hit) / (rateOf(all) || 1);
  const flows = base.flows.map((f) => {
    const at = f.route.find((id) => ids.has(id));
    return at && f.kind === 'request' ? stoppedAt(f, at) : f;
  });
  const state = withNodes(base, (n) => (ids.has(n.id) ? { ...n, health: 'down' } : n), flows);
  const m = base.metrics;
  return {
    phaseAt: () => 0,
    stateAt: () => state,
    metricsAt: (t) => ({ ...m, okPct: round1(lerp(m.okPct, 100 - share * 100, easeOut(t / 300))) }),
  };
};

/** Extra loss on a struggling router. */
const LOSS_PCT = 4;

const packetLoss = (base: State): Sc | null => {
  const router = busiest(base, 'router');
  if (!router) return null;
  const { hit } = through(base, router.id);
  const drops = hit.map((f) => ({ ...stoppedAt(f, router.id), ratePerSec: f.ratePerSec * 0.15 }));
  const state = withNodes(base, (n) => (n.id === router.id ? { ...n, health: 'degraded' } : n), [
    ...base.flows,
    ...drops,
  ]);
  const m = base.metrics;
  return {
    phaseAt: () => 0,
    stateAt: () => state,
    metricsAt: (t) => {
      const k = easeOut(t / 800);
      return {
        ...m,
        lossPct: round1(m.lossPct + LOSS_PCT * k),
        roundTripMs: Math.round(m.roundTripMs * (1 + 0.15 * k)),
        // Lost packets are only resent after a timeout, so pages wait far longer than the loss suggests.
        pageLoadMs: Math.round(m.pageLoadMs * (1 + 1.1 * k)),
      };
    },
  };
};

const ddos = (base: State): Sc | null => {
  const attackers = base.nodes.filter((n) => n.kind === 'attacker');
  const target = base.nodes.find((n) => n.kind === 'server' && n.health !== 'down');
  if (attackers.length === 0 || !target) return null;
  const m = base.metrics;
  const legit = rateOf(through(base, target.id).hit);
  const attackRate = (Math.max(1, rateOf(requests(base))) * ATTACK_FACTOR) / attackers.length;
  let reaching = 0;
  const attack: TrafficFlow[] = [];
  for (const a of attackers) {
    const path = routeAround(base, a.id, target.id);
    if (!path) continue;
    // A shield (scrubbing service, firewall) or a CDN in the way soaks up the flood.
    const absorber = path.find((id) =>
      base.nodes.some((n) => n.id === id && (n.kind === 'shield' || n.kind === 'cdn')),
    );
    if (absorber) {
      attack.push({
        route: path.slice(0, path.indexOf(absorber) + 1),
        kind: 'failed',
        ratePerSec: attackRate,
      });
    } else {
      attack.push({ route: path, kind: 'request', ratePerSec: attackRate });
      reaching += attackRate;
    }
  }
  const capacity = target.capacity ?? Math.max(1, legit) * 2;
  const demand = legit + reaching;
  const served = Math.min(1, capacity / Math.max(1, demand));
  const health =
    demand > capacity * 3 ? 'down' : demand > capacity ? 'degraded' : (target.health ?? 'healthy');
  const state = withNodes(base, (n) => (n.id === target.id ? { ...n, health } : n), [
    ...base.flows,
    ...attack,
  ]);
  return {
    phaseAt: () => 0,
    stateAt: () => state,
    metricsAt: (t) => {
      const k = easeOut(t / 800);
      return {
        ...m,
        okPct: round1(lerp(m.okPct, m.okPct * served, k)),
        pageLoadMs: Math.round(lerp(m.pageLoadMs, Math.min(30_000, m.pageLoadMs / served), k)),
      };
    },
  };
};

export const networkScenarios: Scenarios<NetworkMetrics, NetworkAction> = {
  routerFails,
  dnsOutage,
  packetLoss,
  ddos,
};

export const NETWORK_ACTION_NEEDS: ActionNeeds<NetworkAction> = {
  routerFails: ['router'],
  dnsOutage: ['dns'],
  packetLoss: ['router'],
  ddos: ['attacker'],
};

export function summarizeNetwork(state: State, m: NetworkMetrics): string {
  const parts = state.nodes.map((n) =>
    n.health && n.health !== 'healthy' ? `${n.label} (${n.health})` : n.label,
  );
  return (
    `Diagram: ${parts.join(', ')}. Page load ${m.pageLoadMs} ms, round trip ${m.roundTripMs} ms, ` +
    `${m.lossPct}% packets lost, ${m.okPct}% of requests answered, ${m.hops} hops.`
  );
}
