/** Fixed isometric camera at 30°. */
export const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;
/** Screen pixels per floor grid cell. */
export const UNIT = 26;

export interface ScreenPoint {
  sx: number;
  sy: number;
}

export function project(x: number, y: number, z = 0, unit = UNIT): ScreenPoint {
  return { sx: (x - y) * COS30 * unit, sy: (x + y) * SIN30 * unit - z * unit };
}

/** Screen-space semi-axes of a floor circle of radius r (in cells). */
export function floorEllipse(r: number, unit = UNIT): { rx: number; ry: number } {
  return { rx: r * Math.SQRT2 * COS30 * unit, ry: r * Math.SQRT2 * SIN30 * unit };
}

interface Placed {
  x: number;
  y: number;
  z?: number;
}

/** Back-to-front painter's order: by x + y, then z. Stable for ties. */
export function depthSort<T extends Placed>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (a, b) =>
        a.item.x + a.item.y - (b.item.x + b.item.y) ||
        (a.item.z ?? 0) - (b.item.z ?? 0) ||
        a.index - b.index,
    )
    .map(({ item }) => item);
}
