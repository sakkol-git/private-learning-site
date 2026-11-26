import type { BreakAction, DiagramInitial, StepChange } from '@ss/diagram-engine';

export type StepTag = 'PROBLEM' | 'IDEA' | 'SOLUTION' | 'TRY IT' | 'TRADE-OFF' | 'RECAP';
export type LessonLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Step {
  id: string;
  /** One or two words, shown under the stepper circle and on the Next button. */
  short: string;
  tag: StepTag;
  title: string;
  /** Short paragraphs; only <b> and <code> markup is allowed. */
  body: string[];
  keyIdea?: string;
  change: StepChange;
  /** Shown as buttons on TRY IT steps. */
  breakActions?: BreakAction[];
}

export interface Lesson {
  slug: string;
  chapter: string;
  title: string;
  summary: string;
  minutes: number;
  level: LessonLevel;
  /** Each item is ticked once the learner reaches the step with the matching id. */
  youWillLearn: { text: string; stepId: string }[];
  initial: DiagramInitial;
  steps: Step[];
}
