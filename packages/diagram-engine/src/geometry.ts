import { project, type ScreenPoint } from './iso';

export interface FloorPoint {
  x: number;
  y: number;
}

export interface BoxFaces {
  top: ScreenPoint[];
  left: ScreenPoint[];
  right: ScreenPoint[];
}

/**
 * The three visible faces of an axis-aligned box centred on (cx, cy).
 * "left" is the face looking down +y, "right" the face looking down +x.
 */
export function boxFaces(
  cx: number,
  cy: number,
  w: number,
  d: number,
  z0: number,
  h: number,
): BoxFaces {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - d / 2;
  const y1 = cy + d / 2;
  const z1 = z0 + h;
  return {
    top: [project(x0, y0, z1), project(x1, y0, z1), project(x1, y1, z1), project(x0, y1, z1)],
    left: [project(x0, y1, z1), project(x1, y1, z1), project(x1, y1, z0), project(x0, y1, z0)],
    right: [project(x1, y0, z1), project(x1, y1, z1), project(x1, y1, z0), project(x1, y0, z0)],
  };
}

export function points(pts: ScreenPoint[]): string {
  return pts.map((p) => `${round(p.sx)},${round(p.sy)}`).join(' ');
}

export function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Orthogonal floor route between two cells, moving only along the grid axes.
 * Splits at the midpoint of the dominant axis so fan-outs read as a bus.
 */
export function orthogonalRoute(a: FloorPoint, b: FloorPoint): FloorPoint[] {
  if (a.x === b.x || a.y === b.y) return [a, b];
  if (Math.abs(b.x - a.x) >= Math.abs(b.y - a.y)) {
    const mx = (a.x + b.x) / 2;
    return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
  }
  const my = (a.y + b.y) / 2;
  return [a, { x: a.x, y: my }, { x: b.x, y: my }, b];
}

function dist(a: FloorPoint, b: FloorPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function polylineLength(pts: FloorPoint[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++)
    total += dist(pts[i - 1] as FloorPoint, pts[i] as FloorPoint);
  return total;
}

/** Point at distance t (in cells) along a floor polyline, clamped to its ends. */
export function pointAlong(pts: FloorPoint[], t: number): FloorPoint {
  let remaining = Math.max(0, t);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1] as FloorPoint;
    const b = pts[i] as FloorPoint;
    const len = dist(a, b);
    if (remaining <= len && len > 0) {
      const k = remaining / len;
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    remaining -= len;
  }
  return pts[pts.length - 1] ?? { x: 0, y: 0 };
}

/** Cuts `start` cells off the beginning and `end` cells off the end of a polyline. */
export function trimPolyline(pts: FloorPoint[], start: number, end: number): FloorPoint[] {
  const total = polylineLength(pts);
  if (start + end >= total) return [pointAlong(pts, total / 2), pointAlong(pts, total / 2)];
  const out: FloorPoint[] = [pointAlong(pts, start)];
  let walked = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    walked += dist(pts[i - 1] as FloorPoint, pts[i] as FloorPoint);
    if (walked > start && walked < total - end) out.push(pts[i] as FloorPoint);
  }
  out.push(pointAlong(pts, total - end));
  return out;
}
