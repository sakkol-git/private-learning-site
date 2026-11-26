import { describe, expect, it } from 'vitest';
import { orderCatalog, toCatalogEntry, validateOutline } from './catalog';
import type { Lesson } from './types';

const lesson = (slug: string, chapter: string): Lesson => ({
  slug,
  chapter,
  title: slug,
  summary: '',
  minutes: 1,
  level: 'beginner',
  youWillLearn: [],
  initial: {
    nodes: [],
    links: [],
    metrics: { users: 0, requestsPerSec: 0, p95LatencyMs: 0, errorRatePct: 0, healthy: [0, 0] },
  },
  steps: [{ id: 's', short: 'S', tag: 'IDEA', title: 'Step', body: ['x'], change: {} }],
});

describe('outline', () => {
  const chapters = [
    { id: 'one', title: 'One', lessons: ['b', 'a'] },
    { id: 'two', title: 'Two', lessons: ['c'] },
  ];

  it('orders catalog entries by the outline', () => {
    const entries = [lesson('a', 'One'), lesson('c', 'Two'), lesson('b', 'One')].map(
      toCatalogEntry,
    );
    expect(orderCatalog(chapters, entries).map((e) => e.slug)).toEqual(['b', 'a', 'c']);
  });

  it('reports unlisted, misplaced and missing lessons', () => {
    const issues = validateOutline(chapters, [
      lesson('a', 'Two'),
      lesson('b', 'One'),
      lesson('z', 'One'),
    ]);
    expect(issues).toEqual([
      'a says chapter "Two" but the outline puts it in "One"',
      'outline does not list lesson "z"',
      'outline lists missing lesson "c"',
    ]);
  });

  it('keeps only display fields of steps', () => {
    expect(toCatalogEntry(lesson('a', 'One')).steps).toEqual([
      { id: 's', short: 'S', title: 'Step', tag: 'IDEA' },
    ]);
  });
});
