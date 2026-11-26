import type { ChartScenarios } from './scenario';
import { applyChartChange, initialChartState } from './scene';
import { isTradeOpen, stockOrderIssue } from './trading';
import type { ChartChange, ChartInitial } from './types';

/** Same shape as the lesson engine's SceneIssue: step is 0-based, null means the initial scene. */
interface Issue {
  step: number | null;
  message: string;
}

/**
 * Lesson checks for chart courses: reveals, ids, positions, whether the account
 * can afford each position, and which break actions apply at each step.
 */
export function chartScene<A extends string>(
  scenarios: ChartScenarios<A>,
  needsPosition: readonly A[],
) {
  const isAction = (a: string): a is A => a in scenarios;
  return (
    initial: ChartInitial,
    steps: readonly { change: ChartChange; breakActions?: readonly string[] }[],
  ): Issue[] => {
    const issues: Issue[] = [];
    const start = (message: string) => issues.push({ step: null, message });
    if (initial.reveal < 1 || initial.reveal > initial.bars) {
      start(`reveal ${initial.reveal} is outside 1..${initial.bars}`);
    }
    const specs = [initial, ...(initial.market === 'stock' ? (initial.others ?? []) : [])];
    for (const spec of specs) {
      for (const shock of spec.shocks ?? []) {
        if (shock.bar < 0 || shock.bar >= initial.bars)
          start(`shock on bar ${shock.bar} is outside the series`);
      }
    }
    let state = initialChartState(initial);
    steps.forEach((step, index) => {
      const result = applyChartChange(state, step.change);
      for (const message of result.issues) issues.push({ step: index, message });
      state = result.state;
      if (step.change.position) {
        const problem = stockOrderIssue(state);
        if (problem) issues.push({ step: index, message: problem });
      }
      for (const action of step.breakActions ?? []) {
        if (!isAction(action))
          issues.push({ step: index, message: `unknown break action "${action}"` });
        else if (needsPosition.includes(action) && !isTradeOpen(state)) {
          issues.push({ step: index, message: `break action ${action} needs an open position` });
        }
      }
    });
    return issues;
  };
}
