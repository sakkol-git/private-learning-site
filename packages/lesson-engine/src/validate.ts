import type { Lesson } from './types';

/** A problem found in a lesson's scene. `step` is a 0-based index, or null for the initial scene. */
export interface SceneIssue {
  step: number | null;
  message: string;
}

/**
 * Checks the engine-specific part of a lesson (diagram nodes, chart lines, …)
 * and which break actions are possible at each step.
 */
export type SceneValidator<I, C> = (
  initial: I,
  steps: readonly { change: C; breakActions?: readonly string[] }[],
) => SceneIssue[];

export interface ValidateOptions<I, C> {
  scene?: SceneValidator<I, C>;
}

const STEP_TAGS = new Set(['PROBLEM', 'IDEA', 'SOLUTION', 'TRY IT', 'TRADE-OFF', 'RECAP']);
const ALLOWED_MARKUP = /<\/?(b|code)>/g;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) (seen.has(id) ? dupes : seen).add(id);
  return [...dupes];
}

/** Returns every problem found in one lesson; an empty array means it is valid. */
export function validateLesson<I, C, A extends string>(
  lesson: Lesson<I, C, A>,
  options: ValidateOptions<I, C> = {},
): string[] {
  const issues: string[] = [];
  const at = (where: string) => (msg: string) => issues.push(`${lesson.slug} ${where}: ${msg}`);
  const top = at('lesson');
  const stepAt = (index: number) => at(`step ${index + 1} (${lesson.steps[index]?.id ?? '?'})`);

  if (!SLUG.test(lesson.slug)) top(`slug "${lesson.slug}" is not kebab-case`);
  if (lesson.steps.length === 0) top('has no steps');
  if (lesson.youWillLearn.length === 0) top('youWillLearn is empty');
  if (lesson.minutes <= 0) top('minutes must be positive');

  for (const id of duplicates(lesson.steps.map((s) => s.id))) top(`step id "${id}" repeats`);
  const stepIds = new Set(lesson.steps.map((s) => s.id));
  const experiment = lesson.experiment;
  if (experiment) {
    if (!stepIds.has(experiment.stepId)) top('experiment points at a missing step');
    if (experiment.frames.length < 2) top('experiment needs at least two comparison frames');
    for (const frame of experiment.frames) {
      if (!frame.rows.length || frame.rows.some((row) => !Number.isFinite(row.value))) {
        top(`experiment frame "${frame.label}" needs finite chart values`);
      }
    }
  }
  for (const item of lesson.youWillLearn) {
    if (!stepIds.has(item.stepId)) {
      top(`youWillLearn "${item.text}" points at missing step "${item.stepId}"`);
    }
  }

  lesson.steps.forEach((step, index) => {
    const report = stepAt(index);
    if (!STEP_TAGS.has(step.tag)) report(`unknown tag "${step.tag}"`);
    if (step.body.length === 0) report('body is empty');
    for (const paragraph of step.body) {
      const stray = paragraph.replace(ALLOWED_MARKUP, '').match(/<[^>]*>/);
      if (stray) report(`body uses disallowed markup ${stray[0]}`);
    }
  });

  for (const issue of options.scene?.(lesson.initial, lesson.steps) ?? []) {
    (issue.step === null ? at('initial') : stepAt(issue.step))(issue.message);
  }
  return issues;
}

/** Validates every lesson plus rules that span lessons (unique slugs). */
export function validateCatalog<I, C, A extends string>(
  lessons: Lesson<I, C, A>[],
  options: ValidateOptions<I, C> = {},
): string[] {
  const issues = lessons.flatMap((lesson) => validateLesson(lesson, options));
  for (const slug of duplicates(lessons.map((l) => l.slug))) {
    issues.push(`slug "${slug}" is used by more than one lesson`);
  }
  return issues;
}
