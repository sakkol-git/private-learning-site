import { describe, expect, it } from 'vitest';
import { applyChange, buildStepStates, initialState } from './model';
import type { InfraMetrics } from './presets/infra';
import type { DiagramInitial } from './types';

const initial: DiagramInitial<InfraMetrics> = {
  nodes: [
    { id: 'users', kind: 'users', label: 'Users', x: 0, y: 2 },
    { id: 'a', kind: 'server', label: 'Server A', x: 4, y: 2 },
  ],
  links: [{ id: 'u-a', from: 'users', to: 'a' }],
  metrics: { users: 100, requestsPerSec: 50, p95LatencyMs: 80, errorRatePct: 0, healthy: [1, 1] },
};

describe('step diffs', () => {
  it('applies steps 0..n to the expected node set', () => {
    const states = buildStepStates(initial, [
      { add: { nodes: [{ id: 'b', kind: 'server', label: 'Server B', x: 4, y: 4 }] } },
      { update: { nodes: [{ id: 'b', health: 'down' }] }, metrics: { healthy: [1, 2] } },
      { remove: { nodes: ['a'] } },
    ]);
    expect(states.map((s) => s.nodes.map((n) => n.id))).toEqual([
      ['users', 'a', 'b'],
      ['users', 'a', 'b'],
      ['users', 'b'],
    ]);
    expect(states[1]?.nodes[2]?.health).toBe('down');
    expect(states[1]?.metrics.healthy).toEqual([1, 2]);
  });

  it('drops links whose node was removed and reports them', () => {
    const { state, issues } = applyChange(initialState(initial), { remove: { nodes: ['a'] } });
    expect(state.links).toEqual([]);
    expect(issues).toEqual(['link "u-a" references missing node "a"']);
  });

  it('keeps flows between steps unless replaced', () => {
    const flow = { route: ['users', 'a'], kind: 'request' as const, ratePerSec: 10 };
    const states = buildStepStates(initial, [{ flows: [flow] }, {}, { flows: [] }]);
    expect(states.map((s) => s.flows.length)).toEqual([1, 1, 0]);
  });

  it('reports removing and updating things that do not exist', () => {
    const { issues } = applyChange(initialState(initial), {
      remove: { links: ['nope'] },
      update: { nodes: [{ id: 'ghost', label: 'x' }] },
    });
    expect(issues).toEqual(['removes missing link "nope"', 'updates missing node "ghost"']);
  });
});
