import { describe, expect, it } from 'vitest';
import { completion, loadProgress, PROGRESS_KEY, recordStep } from './progress';

function memory(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

describe('progress', () => {
  it('starts empty and survives junk', () => {
    expect(loadProgress(memory())).toEqual({ lessons: {} });
    expect(loadProgress(memory({ [PROGRESS_KEY]: '{not json' }))).toEqual({ lessons: {} });
  });

  it('keeps the furthest step while tracking the last one', () => {
    const store = memory();
    recordStep('caching', 5, 9, store, 1);
    const p = recordStep('caching', 2, 9, store, 2);
    expect(p.lessons.caching).toEqual({ furthest: 5, last: 2, stepCount: 9, updatedAt: 2 });
    expect(p.lastSlug).toBe('caching');
    expect(loadProgress(store)).toEqual(p);
  });

  it('computes completion', () => {
    expect(completion(undefined)).toBe(0);
    expect(completion({ furthest: 4, last: 4, stepCount: 10, updatedAt: 0 })).toBe(0.5);
    expect(completion({ furthest: 9, last: 0, stepCount: 10, updatedAt: 0 })).toBe(1);
  });
});
