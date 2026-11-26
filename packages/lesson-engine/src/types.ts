import type { DiagramInitial, StepChange } from '@ss/diagram-engine';

export type StepTag = 'PROBLEM' | 'IDEA' | 'SOLUTION' | 'TRY IT' | 'TRADE-OFF' | 'RECAP';
export type LessonLevel = 'beginner' | 'intermediate' | 'advanced';

/** C is the scene diff the course's engine understands, A its break-it action names. */
export interface Step<C = unknown, A extends string = string> {
  id: string;
  /** One or two words, shown under the stepper circle and on the Next button. */
  short: string;
  tag: StepTag;
  title: string;
  /** Short paragraphs; only <b> and <code> markup is allowed. */
  body: string[];
  keyIdea?: string;
  change: C;
  /** Shown as buttons on TRY IT steps. */
  breakActions?: A[];
}

/** I is the engine's starting scene, C its step diff, A the break-it action names. */
export interface Lesson<I = unknown, C = unknown, A extends string = string> {
  slug: string;
  chapter: string;
  title: string;
  summary: string;
  minutes: number;
  level: LessonLevel;
  /** Each item is ticked once the learner reaches the step with the matching id. */
  youWillLearn: { text: string; stepId: string }[];
  initial: I;
  steps: Step<C, A>[];
}

/** A lesson told with the isometric diagram engine. */
export type DiagramLesson<M, A extends string> = Lesson<DiagramInitial<M>, StepChange<M>, A>;
