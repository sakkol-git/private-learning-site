import { forexScenarios, FOREX_ACTION_NEEDS, type ForexAction } from './forex';
import { applyChartChange, initialChartState } from './scene';
import { evaluate } from './trading';
import type { ChartChange, ChartInitial } from './types';

/** Same shape as the lesson engine's SceneIssue: step is 0-based, null means the initial scene. */
interface Issue {
  step: number | null;
  message: string;
}

const isAction = (a: string): a is ForexAction => a in forexScenarios;

/** Lesson checks for chart courses: reveals, ids, positions and which break actions apply. */
export function chartScene() {
  return (
    initial: ChartInitial,
    steps: readonly { change: ChartChange; breakActions?: readonly string[] }[],
  ): Issue[] => {
    const issues: Issue[] = [];
    const start = (message: string) => issues.push({ step: null, message });
    if (initial.reveal < 1 || initial.reveal > initial.bars)
      start(`reveal ${initial.reveal} is outside 1..${initial.bars}`);
    for (const shock of initial.shocks ?? []) {
      if (shock.bar < 0 || shock.bar >= initial.bars)
        start(`shock on bar ${shock.bar} is outside the series`);
    }
    let state = initialChartState(initial);
    steps.forEach((step, index) => {
      const result = applyChartChange(state, step.change);
      for (const message of result.issues) issues.push({ step: index, message });
      state = result.state;
      for (const action of step.breakActions ?? []) {
        if (!isAction(action)) {
          issues.push({ step: index, message: `unknown break action "${action}"` });
          continue;
        }
        const e = evaluate(state);
        if (FOREX_ACTION_NEEDS[action] === 'open position' && (!e.trade || e.closed)) {
          issues.push({ step: index, message: `break action ${action} needs an open position` });
        }
      }
    });
    return issues;
  };
}
