/**
 * Break-it scenarios and the helpers presets share. A scenario is a pure
 * function of the step state and elapsed time, so tests can sample any moment.
 */
import type { DiagramNode, DiagramState, NodeKind, TrafficFlow } from './types';

export interface Scenario<M> {
  /** Discrete phase index at time t; the stage re-renders the diagram when it changes. */
  phaseAt(t: number): number;
  stateAt(t: number): DiagramState<M>;
  metricsAt(t: number): M;
}

/** Builds a scenario on top of a step state, or returns null when it cannot apply. */
type ScenarioFactory<M> = (base: DiagramState<M>) => Scenario<M> | null;

/** Everything a course can break, keyed by action name. */
export type Scenarios<M, A extends string> = Record<A, ScenarioFactory<M>>;

/** Which node kinds must be on the stage for each action (checked by the lesson validator). */
export type ActionNeeds<A extends string> = Record<A, readonly NodeKind[]>;

/** Utilisation (0..∞) of every node with a capacity, from the request flows through it. */
export function computeLoads<M>(state: DiagramState<M>): Map<string, number> {
  const rate = new Map<string, number>();
  for (const flow of state.flows) {
    if (flow.kind !== 'request') continue;
    for (const id of flow.route) rate.set(id, (rate.get(id) ?? 0) + flow.ratePerSec);
  }
  const loads = new Map<string, number>();
  for (const node of state.nodes) {
    if (node.capacity && node.health !== 'down') {
      loads.set(node.id, (rate.get(node.id) ?? 0) / node.capacity);
    }
  }
  return loads;
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const round1 = (x: number) => Math.round(x * 10) / 10;

export function withNodes<M>(
  base: DiagramState<M>,
  patch: (n: DiagramNode) => DiagramNode,
  flows: TrafficFlow[],
): DiagramState<M> {
  return { ...base, nodes: base.nodes.map(patch), flows };
}
