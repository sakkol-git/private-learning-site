import type { DiagramInitial, DiagramState, StepChange } from './types';

export interface ApplyResult {
  state: DiagramState;
  issues: string[];
}

export function initialState(initial: DiagramInitial): DiagramState {
  return {
    nodes: initial.nodes.map((n) => ({ ...n })),
    links: initial.links.map((l) => ({ ...l })),
    flows: [],
    metrics: { ...initial.metrics, healthy: [...initial.metrics.healthy] },
  };
}

/**
 * Applies one step diff. Never throws: problems are reported as issues and the
 * offending part of the diff is skipped, so the renderer stays usable while the
 * validator can fail the build on the same issues.
 */
export function applyChange(prev: DiagramState, change: StepChange): ApplyResult {
  const issues: string[] = [];
  let nodes = prev.nodes.map((n) => ({ ...n }));
  let links = prev.links.map((l) => ({ ...l }));

  for (const id of change.remove?.links ?? []) {
    if (!links.some((l) => l.id === id)) issues.push(`removes missing link "${id}"`);
    links = links.filter((l) => l.id !== id);
  }
  for (const id of change.remove?.nodes ?? []) {
    if (!nodes.some((n) => n.id === id)) issues.push(`removes missing node "${id}"`);
    nodes = nodes.filter((n) => n.id !== id);
  }
  for (const node of change.add?.nodes ?? []) {
    if (nodes.some((n) => n.id === node.id)) {
      issues.push(`adds duplicate node "${node.id}"`);
      continue;
    }
    nodes.push({ ...node });
  }
  for (const update of change.update?.nodes ?? []) {
    const index = nodes.findIndex((n) => n.id === update.id);
    const current = nodes[index];
    if (!current) {
      issues.push(`updates missing node "${update.id}"`);
      continue;
    }
    nodes[index] = { ...current, ...update };
  }
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const link of change.add?.links ?? []) {
    if (links.some((l) => l.id === link.id)) {
      issues.push(`adds duplicate link "${link.id}"`);
      continue;
    }
    links.push({ ...link });
  }
  for (const link of links) {
    for (const end of [link.from, link.to]) {
      if (!nodeIds.has(end)) issues.push(`link "${link.id}" references missing node "${end}"`);
    }
  }
  links = links.filter((l) => nodeIds.has(l.from) && nodeIds.has(l.to));

  const flows = (change.flows ?? prev.flows).filter((flow) => {
    const missing = flow.route.filter((id) => !nodeIds.has(id));
    for (const id of missing) issues.push(`flow references missing node "${id}"`);
    return missing.length === 0;
  });

  const metrics = { ...prev.metrics, ...change.metrics };
  metrics.healthy = [...metrics.healthy];
  return { state: { nodes, links, flows, metrics }, issues };
}

/** states[i] is the diagram after applying the diffs of steps 0..i. */
export function buildStepStates(initial: DiagramInitial, changes: StepChange[]): DiagramState[] {
  const states: DiagramState[] = [];
  let state = initialState(initial);
  for (const change of changes) {
    state = applyChange(state, change).state;
    states.push(state);
  }
  return states;
}

/** Finds the link joining two nodes in either direction. */
export function findLinkBetween(state: DiagramState, a: string, b: string) {
  return state.links.find((l) => (l.from === a && l.to === b) || (l.from === b && l.to === a));
}
