import { describe, expect, it } from 'vitest';
import type { CatalogEntry } from '@ss/lesson-engine';
import { buildIndex, search } from './search';

const catalog: CatalogEntry[] = [
  {
    slug: 'caching',
    chapter: 'Scaling',
    title: 'Caching',
    summary: 'Keep hot data close.',
    minutes: 8,
    level: 'beginner',
    steps: [
      { id: 'a', short: 'Miss', title: 'A cache miss', tag: 'PROBLEM' },
      { id: 'b', short: 'TTL', title: 'Expire with a TTL', tag: 'IDEA' },
    ],
  },
];

describe('search', () => {
  const index = buildIndex(catalog);

  it('finds lessons by title and summary', () => {
    expect(search(index, 'hot data')[0]).toMatchObject({ slug: 'caching', title: 'Caching' });
  });

  it('finds steps and points at their number', () => {
    expect(search(index, 'ttl')).toEqual([
      {
        slug: 'caching',
        lessonTitle: 'Caching',
        title: 'Expire with a TTL',
        detail: 'Caching',
        step: 2,
      },
    ]);
  });

  it('requires every word and ignores empty queries', () => {
    expect(search(index, 'cache banana')).toEqual([]);
    expect(search(index, '   ')).toEqual([]);
  });
});
