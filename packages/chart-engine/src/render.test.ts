import { describe, expect, it } from 'vitest';
import { formatUsd } from './market';
import { placeTags } from './render';

describe('render helpers', () => {
  it('formats money with a sign', () => {
    expect(formatUsd(-1250)).toBe('−$1,250');
    expect(formatUsd(300, true)).toBe('+$300');
  });

  it('pushes overlapping price tags apart and keeps them in the plot', () => {
    const placed = placeTags([{ y: 100 }, { y: 105 }, { y: 300 }], 30, 320);
    expect(placed.map((t) => t.y)).toEqual([100, 120, 300]);
    const crowded = placeTags([{ y: 310 }, { y: 312 }, { y: 315 }], 30, 320);
    expect(crowded.map((t) => t.y)).toEqual([280, 300, 320]);
  });
});
