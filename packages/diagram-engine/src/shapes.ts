/**
 * One pure function per node kind. Each returns SVG markup drawn around the
 * node's floor centre at (0, 0); colours come from CSS custom properties set
 * on the wrapping group (see palette.ts), so health changes cross-fade.
 */
import { boxFaces, points, round } from './geometry';
import { floorEllipse, project, UNIT } from './iso';
import type { DiagramNode, NodeKind } from './types';

export interface ShapeSpec {
  /** Half extents of the footprint in cells, along x and y. */
  hw: number;
  hd: number;
  /** Height of the block in cells (where the stat pill floats). */
  height: number;
  draw: (node: DiagramNode) => string;
}

const poly = (cls: string, pts: ReturnType<typeof boxFaces>['top']) =>
  `<polygon class="${cls}" points="${points(pts)}"/>`;

function box(
  cx: number,
  cy: number,
  w: number,
  d: number,
  z0: number,
  h: number,
  [left, right, top]: [string, string, string] = ['fl', 'fr', 'ft'],
): string {
  const f = boxFaces(cx, cy, w, d, z0, h);
  return poly(left, f.left) + poly(right, f.right) + poly(top, f.top);
}

function line(cls: string, a: [number, number, number], b: [number, number, number]): string {
  const p = project(...a);
  const q = project(...b);
  return `<line class="${cls}" x1="${round(p.sx)}" y1="${round(p.sy)}" x2="${round(q.sx)}" y2="${round(q.sy)}"/>`;
}

function cylinder(
  cx: number,
  cy: number,
  r: number,
  z0: number,
  h: number,
  topClass = 'ft',
  sideClasses: [string, string] = ['fl', 'fr'],
): string {
  const { rx, ry } = floorEllipse(r);
  const base = project(cx, cy, z0);
  const ox = round(base.sx);
  const yb = round(base.sy);
  const yt = round(base.sy - h * UNIT);
  const RX = round(rx);
  const RY = round(ry);
  const left = `M${ox - RX},${yt} L${ox - RX},${yb} A${RX} ${RY} 0 0 0 ${ox},${round(yb + RY)} L${ox},${round(yt + RY)} A${RX} ${RY} 0 0 1 ${ox - RX},${yt}Z`;
  const right = `M${ox},${round(yb + RY)} A${RX} ${RY} 0 0 0 ${ox + RX},${yb} L${ox + RX},${yt} A${RX} ${RY} 0 0 1 ${ox},${round(yt + RY)}Z`;
  return (
    `<path class="${sideClasses[0]}" d="${left}"/><path class="${sideClasses[1]}" d="${right}"/>` +
    `<ellipse class="${topClass}" cx="${ox}" cy="${yt}" rx="${RX}" ry="${RY}"/>`
  );
}

const SLAB_H = 0.3;
const SLAB_GAP = 0.07;

function server(): string {
  const w = 1.5;
  let out = '';
  for (let i = 0; i < 3; i++) {
    const z0 = i * (SLAB_H + SLAB_GAP);
    const zm = z0 + SLAB_H / 2;
    out += box(0, 0, w, w, z0, SLAB_H);
    out += line('detail', [-0.5, w / 2, zm], [0.25, w / 2, zm]);
    for (const y of [0.25, 0.5]) {
      const p = project(w / 2, y, zm);
      out += `<circle class="led" cx="${round(p.sx)}" cy="${round(p.sy)}" r="1.7"/>`;
    }
  }
  return out;
}

function loadBalancer(): string {
  const h = 0.5;
  const arrow = (pts: [number, number][]) =>
    `<polyline class="glyph" points="${points(pts.map(([x, y]) => project(x, y, h)))}"/>`;
  return (
    box(0, 0, 2.2, 1.5, 0, h) +
    arrow([
      [-0.8, 0],
      [-0.05, 0],
    ]) +
    arrow([
      [-0.05, 0],
      [0.7, -0.45],
    ]) +
    arrow([
      [-0.05, 0],
      [0.7, 0.45],
    ]) +
    arrow([
      [0.45, -0.45],
      [0.7, -0.45],
      [0.62, -0.2],
    ]) +
    arrow([
      [0.62, 0.2],
      [0.7, 0.45],
      [0.45, 0.45],
    ])
  );
}

function database(): string {
  const r = 0.8;
  const h = 1.1;
  const { rx, ry } = floorEllipse(r);
  let bands = '';
  for (const z of [0.38, 0.74]) {
    const y = round(-z * UNIT);
    bands += `<path class="detail" d="M${round(-rx)},${y} A${round(rx)} ${round(ry)} 0 0 0 ${round(rx)},${y}"/>`;
  }
  return cylinder(0, 0, r, 0, h) + bands;
}

function cache(): string {
  const s = 1.3;
  const bolt: [number, number][] = [
    [0.18, 0.88],
    [-0.2, 0.44],
    [0.02, 0.44],
    [-0.16, 0.1],
    [0.24, 0.56],
    [0.02, 0.56],
  ];
  const pts = bolt.map(([y, z]) => project(s / 2, y, z));
  return box(0, 0, s, s, 0, 1) + `<polygon class="glyph-fill" points="${points(pts)}"/>`;
}

function queue(): string {
  const w = 3;
  const d = 1.1;
  const h = 0.45;
  let out = box(0, 0, w, d, 0, h);
  for (let k = 1; k < 5; k++) {
    const x = -w / 2 + (k * w) / 5;
    out += line('glyph', [x, -d / 2 + 0.12, h], [x, d / 2 - 0.12, h]);
  }
  return out;
}

function cdn(): string {
  const baseH = 0.3;
  const R = 0.72;
  const { rx, ry } = floorEllipse(R);
  const yc = round(-baseH * UNIT);
  const dh = round(R * UNIT * 1.05);
  const RX = round(rx);
  const RY = round(ry);
  const dome = `M${-RX},${yc} A${RX} ${RY} 0 0 0 ${RX},${yc} A${RX} ${dh} 0 0 0 ${-RX},${yc}Z`;
  const shade = `M0,${round(yc + RY)} A${RX} ${RY} 0 0 0 ${RX},${yc} A${RX} ${dh} 0 0 0 0,${round(yc - dh)} Q${round(RX * 0.55)},${yc} 0,${round(yc + RY)}Z`;
  const meridian = `M${-RX},${yc} A${RX} ${round(RY * 0.9)} 0 0 0 ${RX},${yc}`;
  return (
    box(0, 0, 1.6, 1.6, 0, baseH) +
    `<path class="ft" d="${dome}"/><path class="fr" d="${shade}"/>` +
    `<path class="detail" d="${meridian}" transform="translate(0 ${round(-dh * 0.45)})"/>`
  );
}

function users(): string {
  const figures: [number, number][] = [
    [-0.4, -0.25],
    [0.35, -0.35],
    [0, 0.35],
  ];
  let out = cylinder(0, 0, 1, 0, 0.12, 'fs');
  for (const [x, y] of figures.sort((a, b) => a[0] + a[1] - (b[0] + b[1]))) {
    out += cylinder(x, y, 0.17, 0.12, 0.42);
    const head = project(x, y, 0.12 + 0.42 + 0.2);
    out += `<circle class="ft" cx="${round(head.sx)}" cy="${round(head.sy)}" r="${round(0.18 * UNIT)}"/>`;
  }
  return out;
}

function service(): string {
  return box(0, 0, 1.4, 1.4, 0, 1);
}

// ---------- money kinds ----------

function person(): string {
  let out = cylinder(0, 0, 0.6, 0, 0.1, 'fs');
  out += cylinder(0, 0, 0.24, 0.1, 0.55);
  const head = project(0, 0, 0.1 + 0.55 + 0.26);
  return (
    out +
    `<circle class="ft" cx="${round(head.sx)}" cy="${round(head.sy)}" r="${round(0.25 * UNIT)}"/>`
  );
}

function faceWindows(face: 'left' | 'right', w: number, rows: number[], cols: number[]): string {
  let out = '';
  const s = 0.11;
  for (const z of rows) {
    for (const c of cols) {
      const corners: [number, number, number][] =
        face === 'left'
          ? [
              [c - s, w / 2, z + s],
              [c + s, w / 2, z + s],
              [c + s, w / 2, z - s],
              [c - s, w / 2, z - s],
            ]
          : [
              [w / 2, c - s, z + s],
              [w / 2, c + s, z + s],
              [w / 2, c + s, z - s],
              [w / 2, c - s, z - s],
            ];
      out += `<polygon class="window" points="${points(corners.map((p) => project(...p)))}"/>`;
    }
  }
  return out;
}

function employer(): string {
  const w = 1.4;
  const h = 1.7;
  return (
    box(0, 0, w, w, 0, h) +
    faceWindows('left', w, [0.4, 0.8, 1.2], [-0.35, 0.05, 0.42]) +
    faceWindows('right', w, [0.4, 0.8, 1.2], [-0.35, 0.05, 0.42])
  );
}

function bank(): string {
  const roofZ = 0.95;
  let out = box(0, 0, 1.9, 1.5, 0, 0.18);
  out += box(-0.05, -0.2, 1.6, 0.9, 0.18, roofZ - 0.18);
  for (const x of [-0.65, -0.22, 0.22, 0.65]) out += cylinder(x, 0.52, 0.1, 0.18, roofZ - 0.18);
  out += box(0, 0, 2, 1.6, roofZ, 0.14);
  const zb = roofZ + 0.14;
  const ridge = zb + 0.42;
  const x0 = -1;
  const x1 = 1;
  const slope: [number, number, number][] = [
    [x0, 0, ridge],
    [x1, 0, ridge],
    [x1, 0.8, zb],
    [x0, 0.8, zb],
  ];
  const gable: [number, number, number][] = [
    [x1, -0.8, zb],
    [x1, 0.8, zb],
    [x1, 0, ridge],
  ];
  out += `<polygon class="ft" points="${points(slope.map((p) => project(...p)))}"/>`;
  out += `<polygon class="fr" points="${points(gable.map((p) => project(...p)))}"/>`;
  return out;
}

function wallet(): string {
  const w = 1.6;
  const d = 1.1;
  const h = 0.36;
  const clasp = project(w / 2, 0.15, h * 0.55);
  return (
    box(0, 0, w, d, 0, h) +
    box(0.45, 0, 0.36, d + 0.04, h, 0.05, ['fs', 'fs', 'fs']) +
    `<circle class="glyph-fill" cx="${round(clasp.sx)}" cy="${round(clasp.sy)}" r="2.6"/>`
  );
}

/** A savings jar. Coins fill it to value / capacity. */
function jar(node: DiagramNode): string {
  const r = 0.65;
  const h = 1.15;
  const level =
    node.value === undefined
      ? 0.55
      : node.capacity
        ? Math.min(1, Math.max(0, node.value / node.capacity))
        : 0.55;
  let out = '';
  if (level > 0.02) out += cylinder(0, 0, r - 0.07, 0, (h - 0.05) * level);
  out += cylinder(0, 0, r, 0, h, 'glass-top', ['glass', 'glass']);
  out += cylinder(0, 0, r * 0.78, h, 0.16);
  const a = project(-0.22, 0.22, h + 0.16);
  const b = project(0.22, -0.22, h + 0.16);
  return (
    out +
    `<line class="glyph" x1="${round(a.sx)}" y1="${round(a.sy)}" x2="${round(b.sx)}" y2="${round(b.sy)}"/>`
  );
}

function shop(): string {
  const w = 1.5;
  const d = 1.3;
  const h = 0.95;
  let out = box(0, 0, w, d, 0, h);
  const win: [number, number, number][] = [
    [-0.5, d / 2, 0.62],
    [0.15, d / 2, 0.62],
    [0.15, d / 2, 0.2],
    [-0.5, d / 2, 0.2],
  ];
  out += `<polygon class="window" points="${points(win.map((p) => project(...p)))}"/>`;
  const stripes = 5;
  for (let i = 0; i < stripes; i++) {
    const xa = -w / 2 + (i * w) / stripes;
    const xb = -w / 2 + ((i + 1) * w) / stripes;
    const quad: [number, number, number][] = [
      [xa, d / 2, h * 0.96],
      [xb, d / 2, h * 0.96],
      [xb, d / 2 + 0.38, h * 0.7],
      [xa, d / 2 + 0.38, h * 0.7],
    ];
    out += `<polygon class="${i % 2 ? 'fs' : 'ft'}" points="${points(quad.map((p) => project(...p)))}"/>`;
  }
  return out;
}

/** A pyramid, with tier lines: the shape of a scheme that needs ever more people. */
function scheme(): string {
  const b = 0.85;
  const h = 1.5;
  const apex: [number, number, number] = [0, 0, h];
  const left: [number, number, number][] = [[-b, b, 0], [b, b, 0], apex];
  const right: [number, number, number][] = [[b, -b, 0], [b, b, 0], apex];
  let out =
    `<polygon class="fl" points="${points(left.map((p) => project(...p)))}"/>` +
    `<polygon class="fr" points="${points(right.map((p) => project(...p)))}"/>`;
  for (const f of [0.33, 0.62]) {
    const at = (p: [number, number, number]): [number, number, number] => [
      p[0] * (1 - f),
      p[1] * (1 - f),
      h * f,
    ];
    out += line('detail', at([-b, b, 0]), at([b, b, 0]));
    out += line('detail', at([b, -b, 0]), at([b, b, 0]));
  }
  return out;
}

function market(): string {
  let out = box(0, 0, 1.9, 1.4, 0, 0.15);
  const bars: [number, number][] = [
    [-0.55, 0.45],
    [0, 0.8],
    [0.55, 1.2],
  ];
  for (const [x, h] of bars) out += box(x, 0.1, 0.4, 0.6, 0.15, h);
  return out;
}

export const SHAPES: Record<NodeKind, ShapeSpec> = {
  server: { hw: 0.75, hd: 0.75, height: 3 * SLAB_H + 2 * SLAB_GAP, draw: server },
  loadBalancer: { hw: 1.1, hd: 0.75, height: 0.5, draw: loadBalancer },
  database: { hw: 0.8, hd: 0.8, height: 1.1, draw: database },
  cache: { hw: 0.65, hd: 0.65, height: 1, draw: cache },
  queue: { hw: 1.5, hd: 0.55, height: 0.45, draw: queue },
  cdn: { hw: 0.8, hd: 0.8, height: 1.05, draw: cdn },
  users: { hw: 1, hd: 1, height: 0.95, draw: users },
  service: { hw: 0.7, hd: 0.7, height: 1, draw: service },
  person: { hw: 0.6, hd: 0.6, height: 1.2, draw: person },
  employer: { hw: 0.7, hd: 0.7, height: 1.7, draw: employer },
  bank: { hw: 1, hd: 0.8, height: 1.5, draw: bank },
  wallet: { hw: 0.8, hd: 0.55, height: 0.42, draw: wallet },
  jar: { hw: 0.65, hd: 0.65, height: 1.32, draw: jar },
  shop: { hw: 0.75, hd: 0.65, height: 0.95, draw: shop },
  scheme: { hw: 0.85, hd: 0.85, height: 1.5, draw: scheme },
  market: { hw: 0.95, hd: 0.7, height: 1.35, draw: market },
};
