import type { Lesson, LessonLevel, StepTag } from './types';

/** Lightweight lesson metadata, generated at build time for the home page and search. */
export interface CatalogEntry {
  slug: string;
  chapter: string;
  title: string;
  summary: string;
  minutes: number;
  level: LessonLevel;
  steps: { id: string; short: string; title: string; tag: StepTag }[];
}

export interface Chapter {
  id: string;
  title: string;
  lessons: readonly string[];
}

export function toCatalogEntry<I, C, A extends string>(lesson: Lesson<I, C, A>): CatalogEntry {
  const { slug, chapter, title, summary, minutes, level } = lesson;
  return {
    slug,
    chapter,
    title,
    summary,
    minutes,
    level,
    steps: lesson.steps.map(({ id, short, title: stepTitle, tag }) => ({
      id,
      short,
      title: stepTitle,
      tag,
    })),
  };
}

/** Lessons in course order with their chapter position. */
export function orderCatalog(
  chapters: readonly Chapter[],
  entries: readonly CatalogEntry[],
): CatalogEntry[] {
  const bySlug = new Map(entries.map((e) => [e.slug, e]));
  return chapters.flatMap((c) => c.lessons.flatMap((slug) => bySlug.get(slug) ?? []));
}

/** Checks the outline against the lessons: every lesson listed once, in its own chapter. */
export function validateOutline(
  chapters: readonly Chapter[],
  lessons: readonly Lesson[],
): string[] {
  const issues: string[] = [];
  const listed = new Map<string, string>();
  for (const chapter of chapters) {
    for (const slug of chapter.lessons) {
      if (listed.has(slug)) issues.push(`outline lists "${slug}" more than once`);
      listed.set(slug, chapter.title);
    }
  }
  for (const lesson of lessons) {
    const chapter = listed.get(lesson.slug);
    if (!chapter) issues.push(`outline does not list lesson "${lesson.slug}"`);
    else if (chapter !== lesson.chapter) {
      issues.push(
        `${lesson.slug} says chapter "${lesson.chapter}" but the outline puts it in "${chapter}"`,
      );
    }
  }
  for (const slug of listed.keys()) {
    if (!lessons.some((l) => l.slug === slug))
      issues.push(`outline lists missing lesson "${slug}"`);
  }
  return issues;
}
