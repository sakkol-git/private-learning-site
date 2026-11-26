import {
  applyChange,
  findLinkBetween,
  initialState,
  type DiagramInitial,
  type NodeKind,
  type StepChange,
} from '@ss/diagram-engine';
import { duplicates, type SceneIssue, type SceneValidator } from './validate';

/**
 * Scene checks for diagram courses: ids, links, flows that follow links, diffs that
 * only touch what exists, and break actions whose node kinds are on stage.
 */
export function diagramScene<M>(
  actionNeeds?: Readonly<Record<string, readonly NodeKind[]>>,
): SceneValidator<DiagramInitial<M>, StepChange<M>> {
  return (initial, steps) => {
    const issues: SceneIssue[] = [];
    const start = (message: string) => issues.push({ step: null, message });
    for (const id of duplicates(initial.nodes.map((n) => n.id))) start(`node id "${id}" repeats`);
    for (const id of duplicates(initial.links.map((l) => l.id))) start(`link id "${id}" repeats`);
    const startIds = new Set(initial.nodes.map((n) => n.id));
    for (const link of initial.links) {
      for (const end of [link.from, link.to]) {
        if (!startIds.has(end)) start(`link "${link.id}" references missing node "${end}"`);
      }
    }

    let state = initialState(initial);
    steps.forEach((step, index) => {
      const report = (message: string) => issues.push({ step: index, message });
      for (const id of duplicates((step.change.add?.nodes ?? []).map((n) => n.id))) {
        report(`adds node id "${id}" twice`);
      }
      const result = applyChange(state, step.change);
      result.issues.forEach(report);
      state = result.state;

      for (const flow of step.change.flows ?? []) {
        if (flow.route.length < 2) report('flow route needs at least two nodes');
        if (flow.ratePerSec < 0) report('flow rate cannot be negative');
        for (let i = 1; i < flow.route.length; i++) {
          const a = flow.route[i - 1] ?? '';
          const b = flow.route[i] ?? '';
          const both = state.nodes.some((n) => n.id === a) && state.nodes.some((n) => n.id === b);
          if (both && !findLinkBetween(state, a, b)) report(`flow hop ${a} → ${b} has no link`);
        }
      }
      for (const action of step.breakActions ?? []) {
        if (!actionNeeds) continue;
        const needs = actionNeeds[action];
        if (!needs) report(`unknown break action "${action}"`);
        else if (!state.nodes.some((n) => needs.includes(n.kind))) {
          report(`break action ${action} needs a ${needs.join(' or ')}`);
        }
      }
    });
    return issues;
  };
}
