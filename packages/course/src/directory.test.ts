import { describe, expect, it } from 'vitest';
import { courseDirectory, relatedDestinations } from './directory';

describe('cross-course navigation', () => {
  it('only offers configured production destinations', () => {
    expect(courseDirectory(undefined)).toEqual([]);
    expect(courseDirectory('{"finance":"https://money.example.org/"}')).toEqual([
      { id: 'finance', origin: 'https://money.example.org' },
    ]);
    expect(courseDirectory(undefined, 'localhost')).toHaveLength(7);
  });
  it('connects reserves in personal finance and business in both directions', () => {
    expect(relatedDestinations('finance', 'safety-net')[0]?.slug).toBe('cash-flow');
    expect(relatedDestinations('business', 'cash-flow')[0]?.slug).toBe('safety-net');
    expect(relatedDestinations('business', 'unknown')).toEqual([]);
  });
});
