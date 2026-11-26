import { describe, expect, it } from 'vitest';
import { formatPrice, formatUsd, placeTags } from './render';

describe('render helpers', () => {
  it('formats prices to the pipette and money with a sign', () => {
    expect(formatPrice(1.0850123, 0.0001)).toBe('1.08501');
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
