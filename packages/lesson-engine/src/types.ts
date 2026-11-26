import type { DiagramInitial, StepChange } from '@ss/diagram-engine';

export type StepTag = 'PROBLEM' | 'IDEA' | 'SOLUTION' | 'TRY IT' | 'TRADE-OFF' | 'RECAP';
export type LessonLevel = 'beginner' | 'intermediate' | 'advanced';

/** M is the course's metrics shape, A its break-it action names. */
export interface Step<M = unknown, A extends string = string> {
  id: string;
  /** One or two words, shown under the stepper circle and on the Next button. */
  short: string;
  tag: StepTag;
  title: string;
  /** Short paragraphs; only <b> and <code> markup is allowed. */
  body: string[];
  keyIdea?: string;
  change: StepChange<M>;
  /** Shown as buttons on TRY IT steps. */
  breakActions?: A[];
}

export interface Lesson<M = unknown, A extends string = string> {
  slug: string;
  chapter: string;
  title: string;
  summary: string;
  minutes: number;
  level: LessonLevel;
  /** Each item is ticked once the learner reaches the step with the matching id. */
  youWillLearn: { text: string; stepId: string }[];
  initial: DiagramInitial<M>;
  steps: Step<M, A>[];
}
