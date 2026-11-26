import type { Lesson } from './types';

/** Reuse the same sequence of scene changes as the stage, including earlier steps. */
export function experimentState<I, C, S>(
  lesson: Lesson<I, C>,
  stepId: string,
  build: (initial: I, changes: C[]) => S[],
): S {
  const index = lesson.steps.findIndex((step) => step.id === stepId);
  const state = build(
    lesson.initial,
    lesson.steps.slice(0, index + 1).map((step) => step.change),
  )[index];
  if (state === undefined) throw new Error(`Missing experiment step ${lesson.slug}/${stepId}`);
  return state;
}
