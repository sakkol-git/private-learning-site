import { describe, expect, it } from 'vitest';
import { COS30, depthSort, floorEllipse, project } from './iso';

describe('isometric projection', () => {
  it('maps the origin to the origin', () => {
    expect(project(0, 0, 0, 10)).toEqual({ sx: 0, sy: 0 });
  });

  it('maps known grid points to the expected screen points', () => {
    const a = project(1, 0, 0, 10);
    expect(a.sx).toBeCloseTo(COS30 * 10);
    expect(a.sy).toBeCloseTo(5);
    const b = project(0, 1, 0, 10);
    expect(b.sx).toBeCloseTo(-COS30 * 10);
    expect(b.sy).toBeCloseTo(5);
    const c = project(2, 2, 0, 10);
    expect(c.sx).toBeCloseTo(0);
    expect(c.sy).toBeCloseTo(20);
  });

  it('lifts points straight up by z', () => {
    expect(project(3, 1, 2, 10).sy).toBeCloseTo(project(3, 1, 0, 10).sy - 20);
    expect(project(3, 1, 2, 10).sx).toBeCloseTo(project(3, 1, 0, 10).sx);
  });

  it('projects a floor circle to a 2:1 ellipse', () => {
    const { rx, ry } = floorEllipse(1, 10);
    expect(rx / ry).toBeCloseTo(2 * COS30);
  });
});

describe('depth sorting', () => {
  it('draws blocks further back first', () => {
    const front = { id: 'front', x: 5, y: 5 };
    const back = { id: 'back', x: 1, y: 2 };
    const middle = { id: 'middle', x: 4, y: 0 };
    expect(depthSort([front, back, middle]).map((n) => n.id)).toEqual(['back', 'middle', 'front']);
  });

  it('breaks ties by z, then keeps input order', () => {
    const low = { id: 'low', x: 2, y: 2, z: 0 };
    const high = { id: 'high', x: 1, y: 3, z: 1 };
    const sibling = { id: 'sibling', x: 3, y: 1, z: 0 };
    expect(depthSort([high, low, sibling]).map((n) => n.id)).toEqual(['low', 'sibling', 'high']);
  });
});
