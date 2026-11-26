import type { CatalogEntry } from '@ss/lesson-engine';

export interface SearchHit {
  slug: string;
  lessonTitle: string;
  /** 1-based step number, or undefined for the lesson itself. */
  step?: number;
  title: string;
  detail: string;
}

interface Doc extends SearchHit {
  haystack: string;
  weight: number;
}

export function buildIndex(catalog: readonly CatalogEntry[]): Doc[] {
  return catalog.flatMap((lesson) => [
    {
      slug: lesson.slug,
      lessonTitle: lesson.title,
      title: lesson.title,
      detail: lesson.summary,
      haystack: `${lesson.title} ${lesson.summary} ${lesson.chapter}`.toLowerCase(),
      weight: 2,
    },
    ...lesson.steps.map((s, i) => ({
      slug: lesson.slug,
      lessonTitle: lesson.title,
      step: i + 1,
      title: s.title,
      detail: lesson.title,
      haystack: `${s.title} ${s.short}`.toLowerCase(),
      weight: 1,
    })),
  ]);
}

/** Every query word must appear; title hits and lessons rank first. */
export function search(index: readonly Doc[], query: string, limit = 8): SearchHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return index
    .filter((d) => words.every((w) => d.haystack.includes(w)))
    .map((d) => ({
      d,
      score: d.weight + (words.every((w) => d.title.toLowerCase().includes(w)) ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ d }) => ({
      slug: d.slug,
      lessonTitle: d.lessonTitle,
      title: d.title,
      detail: d.detail,
      ...(d.step ? { step: d.step } : {}),
    }));
}
