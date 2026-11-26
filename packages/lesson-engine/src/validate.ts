import { applyChange, findLinkBetween, initialState } from '@ss/diagram-engine';
import type { NodeKind } from '@ss/diagram-engine';
import type { Lesson } from './types';

export interface ValidateOptions {
  /** Node kinds each break action needs on stage. Unknown actions are reported. */
  actionNeeds?: Readonly<Record<string, readonly NodeKind[]>>;
}

const STEP_TAGS = new Set(['PROBLEM', 'IDEA', 'SOLUTION', 'TRY IT', 'TRADE-OFF', 'RECAP']);
const ALLOWED_MARKUP = /<\/?(b|code)>/g;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) (seen.has(id) ? dupes : seen).add(id);
  return [...dupes];
}

/** Returns every problem found in one lesson; an empty array means it is valid. */
export function validateLesson<M, A extends string>(
  lesson: Lesson<M, A>,
  options: ValidateOptions = {},
): string[] {
  const issues: string[] = [];
  const at = (where: string) => (msg: string) => issues.push(`${lesson.slug} ${where}: ${msg}`);
  const top = at('lesson');

  if (!SLUG.test(lesson.slug)) top(`slug "${lesson.slug}" is not kebab-case`);
  if (lesson.steps.length === 0) top('has no steps');
  if (lesson.youWillLearn.length === 0) top('youWillLearn is empty');
  if (lesson.minutes <= 0) top('minutes must be positive');

  const initial = at('initial');
  for (const id of duplicates(lesson.initial.nodes.map((n) => n.id)))
    initial(`node id "${id}" repeats`);
  for (const id of duplicates(lesson.initial.links.map((l) => l.id)))
    initial(`link id "${id}" repeats`);
  const startIds = new Set(lesson.initial.nodes.map((n) => n.id));
  for (const link of lesson.initial.links) {
    for (const end of [link.from, link.to]) {
      if (!startIds.has(end)) initial(`link "${link.id}" references missing node "${end}"`);
    }
  }

  for (const id of duplicates(lesson.steps.map((s) => s.id))) top(`step id "${id}" repeats`);
  const stepIds = new Set(lesson.steps.map((s) => s.id));
  for (const item of lesson.youWillLearn) {
    if (!stepIds.has(item.stepId))
      top(`youWillLearn "${item.text}" points at missing step "${item.stepId}"`);
  }

  let state = initialState(lesson.initial);
  lesson.steps.forEach((step, index) => {
    const report = at(`step ${index + 1} (${step.id})`);
    if (!STEP_TAGS.has(step.tag)) report(`unknown tag "${step.tag}"`);
    if (step.body.length === 0) report('body is empty');
    for (const paragraph of step.body) {
      const stray = paragraph.replace(ALLOWED_MARKUP, '').match(/<[^>]*>/);
      if (stray) report(`body uses disallowed markup ${stray[0]}`);
    }
    const added = [...(step.change.add?.nodes ?? []).map((n) => n.id)];
    for (const id of duplicates(added)) report(`adds node id "${id}" twice`);

    const result = applyChange(state, step.change);
    result.issues.forEach(report);
    state = result.state;

    for (const flow of step.change.flows ?? []) {
      if (flow.route.length < 2) report('flow route needs at least two nodes');
      if (flow.ratePerSec < 0) report('flow rate cannot be negative');
      for (let i = 1; i < flow.route.length; i++) {
        const a = flow.route[i - 1] ?? '';
        const b = flow.route[i] ?? '';
        if (
          state.nodes.some((n) => n.id === a) &&
          state.nodes.some((n) => n.id === b) &&
          !findLinkBetween(state, a, b)
        ) {
          report(`flow hop ${a} → ${b} has no link`);
        }
      }
    }
    for (const action of step.breakActions ?? []) {
      if (!options.actionNeeds) continue;
      const needs = options.actionNeeds[action];
      if (!needs) {
        report(`unknown break action "${action}"`);
        continue;
      }
      if (!state.nodes.some((n) => needs.includes(n.kind))) {
        report(`break action ${action} needs a ${needs.join(' or ')}`);
      }
    }
  });
  return issues;
}

/** Validates every lesson plus rules that span lessons (unique slugs). */
export function validateCatalog<M, A extends string>(
  lessons: Lesson<M, A>[],
  options: ValidateOptions = {},
): string[] {
  const issues = lessons.flatMap((lesson) => validateLesson(lesson, options));
  for (const slug of duplicates(lessons.map((l) => l.slug)))
    issues.push(`slug "${slug}" is used by more than one lesson`);
  return issues;
}
