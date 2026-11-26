import {
  orthogonalRoute,
  pointAlong,
  points,
  polylineLength,
  round,
  trimPolyline,
  type FloorPoint,
} from './geometry';
import { depthSort, project, UNIT } from './iso';
import { buildStepStates, findLinkBetween, initialState } from './model';
import { paletteFor } from './palette';
import { SHAPES } from './shapes';
import { computeLoads, type Scenario, type Scenarios } from './scenario';
import { STAGE_CSS } from './stage-styles';
import type {
  DiagramInitial,
  DiagramLink,
  DiagramNode,
  DiagramState,
  StepChange,
  TrafficFlow,
} from './types';

export interface StageDiagram<M> {
  initial: DiagramInitial<M>;
  /** One diff per lesson step, in order. */
  changes: StepChange<M>[];
}

/** Frame clock; injectable so tests can drive time deterministically. */
export interface Scheduler {
  now(): number;
  request(cb: (time: number) => void): number;
  cancel(id: number): void;
}

export interface StageOptions<M, A extends string> {
  reducedMotion?: boolean;
  scheduler?: Scheduler;
  /** Break-it scenarios this course offers. */
  scenarios?: Partial<Scenarios<M, A>>;
  /** Screen-reader summary of the diagram and its numbers. */
  summarize?: (state: DiagramState<M>, metrics: M) => string;
  /** Text for a node's stat pill when it has a `value` (for example a currency amount). */
  formatValue?: (value: number, node: DiagramNode) => string;
}

type MetricsListener<M> = (metrics: M, summary: string) => void;

interface Inspection {
  kind: 'diagram';
  options: { id: string; label: string }[];
  selected: string;
  detail: string;
}

export interface Stage<M, A extends string> {
  inspect(id: string): void;
  onInspection(cb: (view: Inspection) => void): () => void;
  goToStep(index: number): void;
  play(): void;
  pause(): void;
  replay(): void;
  isPlaying(): boolean;
  /** Runs a break-it scenario on top of the current step. Returns false if it cannot apply. */
  break(action: A): boolean;
  reset(): void;
  onMetrics(cb: MetricsListener<M>): () => void;
  /** The diagram as currently shown, including any break-it scenario. */
  current(): DiagramState<M>;
  setReducedMotion(reduced: boolean): void;
  destroy(): void;
}

const NS = 'http://www.w3.org/2000/svg';
const RISE_MS = 300;
const SINK_MS = 260;
const MOVE_MS = 320;
const DRAW_MS = 340;
const PACKET_SPEED = 6.5; // cells per second
const BOUNCE_MS = 450;
const PACKET_Z = 0.32;
const MAX_PACKETS = 220;

type Attrs = Record<string, string | number>;

function make<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  parent?: Element,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent?.appendChild(node);
  return node;
}

const easeOut = (k: number) => 1 - (1 - k) ** 3;

interface Tween {
  start: number;
  dur: number;
  apply(k: number): void;
  done?(): void;
}

interface NodeView {
  node: DiagramNode;
  pos: FloorPoint;
  rise: number;
  removing: boolean;
  g: SVGGElement;
  inner: SVGGElement;
  label: SVGGElement;
  title: SVGTextElement;
  sub: SVGTextElement;
  pill: SVGGElement;
  pillRect: SVGRectElement;
  pillDot: SVGCircleElement;
  pillText: SVGTextElement;
  badge: SVGGElement;
}

interface LinkView {
  link: DiagramLink;
  removing: boolean;
  drawn: boolean;
  path: SVGPathElement;
  arrow: SVGPolygonElement;
  text: SVGTextElement;
  floor: FloorPoint[];
}

interface Piece {
  pts: FloorPoint[];
  len: number;
  hidden: boolean;
}

interface Packet {
  g: SVGGElement;
  shadow: SVGEllipseElement;
  pieces: Piece[];
  length: number;
  dist: number;
  bounces: boolean;
  phase: 'fly' | 'bounce' | 'done';
  bounceLeft: number;
}

interface Emitter {
  flow: TrafficFlow;
  interval: number;
  acc: number;
  klass: string;
  bounces: boolean;
}

const defaultScheduler: Scheduler = {
  now: () => performance.now(),
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

/** Visual packet rate: logarithmic in the real rate so 5 and 5,000 req/s both read well. */
function visualRate(ratePerSec: number, kind: TrafficFlow['kind']): number {
  if (kind === 'healthCheck') return 0.9;
  return Math.min(4.5, 0.8 + Math.log10(1 + ratePerSec) * 1.1);
}

function listNodes<M>(state: DiagramState<M>): string {
  const parts = state.nodes.map((n) =>
    n.health && n.health !== 'healthy' ? `${n.label} (${n.health})` : n.label,
  );
  return `Diagram: ${parts.join(', ')}.`;
}

export function createStage<M, A extends string = string>(
  svg: SVGSVGElement,
  diagram: StageDiagram<M>,
  options: StageOptions<M, A> = {},
): Stage<M, A> {
  const scheduler = options.scheduler ?? defaultScheduler;
  const summarize = options.summarize ?? listNodes;
  const formatValue = options.formatValue ?? ((value: number) => value.toLocaleString('en-US'));
  let reduced = options.reducedMotion ?? false;
  const start = initialState(diagram.initial);
  const states = buildStepStates(diagram.initial, diagram.changes);

  svg.classList.add('ss-stage');
  svg.setAttribute('role', 'img');
  svg.replaceChildren();
  make('style', {}, svg).textContent = STAGE_CSS;
  const floorLayer = make('g', { class: 'ss-floor' }, svg);
  const linkLayer = make('g', {}, svg);
  const shadowLayer = make('g', {}, svg);
  const blockLayer = make('g', {}, svg);
  const packetLayer = make('g', {}, svg);
  const labelLayer = make('g', {}, svg);

  const nodeViews = new Map<string, NodeView>();
  const linkViews = new Map<string, LinkView>();
  let tweens: Tween[] = [];
  let packets: Packet[] = [];
  let emitters: Emitter[] = [];
  const listeners = new Set<MetricsListener<M>>();

  let stepIndex = -1;
  let shown: DiagramState<M> = start;
  let metrics: M = start.metrics;
  let lastEmitted = '';
  let scenario: Scenario<M> | null = null;
  let scenarioT = 0;
  let scenarioPhase = 0;
  let playing = true;
  let frame = 0;
  let lastTime = 0;
  let destroyed = false;

  let selected = '';
  const inspectionListeners = new Set<(view: Inspection) => void>();
  function updateInspection() {
    const options = shown.nodes.map((n) => ({ id: 'node:' + n.id, label: n.label }));
    const node = shown.nodes.find((n) => 'node:' + n.id === selected);
    let detail = node
      ? [
          node.label,
          node.sublabel,
          node.health ?? 'healthy',
          node.value === undefined ? null : formatValue(node.value, node),
        ]
          .filter(Boolean)
          .join(' · ')
      : '';
    const routeLinks = new Set<string>();
    const routeNodes = new Set<string>();
    if (node) routeNodes.add(node.id);
    for (const flow of shown.flows) {
      const id = JSON.stringify([flow.kind, flow.route]);
      if (options.some((option) => option.id === id)) continue;
      const route = flow.route.map((id) => nodeViews.get(id)?.node.label ?? id).join(' → ');
      options.push({ id, label: flow.kind + ' · ' + route });
      if (id !== selected) continue;
      detail = route;
      flow.route.forEach((id, index) => {
        routeNodes.add(id);
        const previous = flow.route[index - 1];
        const link = previous && findLinkBetween(shown, previous, id);
        if (link) routeLinks.add(link.id);
      });
    }
    if (!options.some((option) => option.id === selected)) selected = '';
    for (const [id, v] of nodeViews) v.label.toggleAttribute('data-inspected', routeNodes.has(id));
    for (const [id, v] of linkViews) v.path.toggleAttribute('data-traced', routeLinks.has(id));
    const view: Inspection = { kind: 'diagram', options, selected, detail };
    for (const cb of inspectionListeners) cb(view);
    return view;
  }
  function inspect(id: string) {
    selected = id;
    updateInspection();
  }
  function pickNode(event: Event) {
    const id = (event.target as Element).closest('[data-node]')?.getAttribute('data-node');
    if (id) inspect('node:' + id);
  }
  svg.addEventListener('click', pickNode);
  drawFloor();

  // ---------- floor & framing ----------

  function drawFloor() {
    const all = [start, ...states].flatMap((s) => s.nodes);
    const extent = (n: DiagramNode) => SHAPES[n.kind];
    const x0 = Math.min(...all.map((n) => n.x - extent(n).hw)) - 1.3;
    const x1 = Math.max(...all.map((n) => n.x + extent(n).hw)) + 1.3;
    const y0 = Math.min(...all.map((n) => n.y - extent(n).hd)) - 1.3;
    const y1 = Math.max(...all.map((n) => n.y + extent(n).hd)) + 1.9;
    const slab = 0.4;
    const top = [project(x0, y0), project(x1, y0), project(x1, y1), project(x0, y1)];
    make(
      'polygon',
      {
        class: 'ss-floor-left',
        points: points([
          project(x0, y1),
          project(x1, y1),
          project(x1, y1, -slab),
          project(x0, y1, -slab),
        ]),
      },
      floorLayer,
    );
    make(
      'polygon',
      {
        class: 'ss-floor-right',
        points: points([
          project(x1, y0),
          project(x1, y1),
          project(x1, y1, -slab),
          project(x1, y0, -slab),
        ]),
      },
      floorLayer,
    );
    make('polygon', { class: 'ss-floor-top', points: points(top) }, floorLayer);
    let grid = '';
    for (let x = Math.ceil(x0); x <= Math.floor(x1); x++) {
      const a = project(x, y0);
      const b = project(x, y1);
      grid += `M${round(a.sx)},${round(a.sy)}L${round(b.sx)},${round(b.sy)}`;
    }
    for (let y = Math.ceil(y0); y <= Math.floor(y1); y++) {
      const a = project(x0, y);
      const b = project(x1, y);
      grid += `M${round(a.sx)},${round(a.sy)}L${round(b.sx)},${round(b.sy)}`;
    }
    make('path', { class: 'ss-floor-grid', d: grid }, floorLayer);

    const tops = all.map((n) => project(n.x, n.y, extent(n).height).sy - 36);
    const minX = project(x0, y1).sx - 12;
    const maxX = project(x1, y0).sx + 12;
    const minY = Math.min(project(x0, y0).sy, ...tops) - 8;
    const maxY = project(x1, y1, -slab).sy + 10;
    svg.setAttribute(
      'viewBox',
      `${round(minX)} ${round(minY)} ${round(maxX - minX)} ${round(maxY - minY)}`,
    );
    svg.dataset.width = String(Math.round(maxX - minX));
  }

  // ---------- frame loop ----------

  function needsFrames(): boolean {
    if (tweens.length > 0) return true;
    if (!playing) return false;
    return scenario !== null || (!reduced && (emitters.length > 0 || packets.length > 0));
  }

  function kick() {
    if (frame || destroyed || !needsFrames()) return;
    lastTime = scheduler.now();
    frame = scheduler.request(tick);
  }

  function tick(time: number) {
    frame = 0;
    const dt = Math.min(250, Math.max(0, time - lastTime));
    lastTime = time;
    runTweens(time);
    if (playing) {
      if (scenario) advanceScenario(dt);
      if (!reduced) advancePackets(dt);
    }
    if (needsFrames()) frame = scheduler.request(tick);
  }

  function tween(dur: number, apply: (k: number) => void, done?: () => void) {
    if (reduced || dur <= 0) {
      apply(1);
      done?.();
      return;
    }
    apply(0);
    tweens.push({ start: scheduler.now(), dur, apply, ...(done ? { done } : {}) });
  }

  function runTweens(time: number) {
    const live: Tween[] = [];
    for (const t of tweens) {
      const k = Math.min(1, (time - t.start) / t.dur);
      t.apply(easeOut(Math.max(0, k)));
      if (k >= 1) t.done?.();
      else live.push(t);
    }
    tweens = live;
  }

  // ---------- nodes ----------

  function createNodeView(node: DiagramNode): NodeView {
    const g = make('g', { class: 'ss-node' }, blockLayer);
    const inner = make('g', {}, g);
    inner.innerHTML = SHAPES[node.kind].draw(node);
    const label = make('g', { class: 'ss-node-label' }, labelLayer);
    const title = make('text', { class: 'ss-label', y: 0 }, label);
    const sub = make('text', { class: 'ss-sublabel', y: 15 }, label);
    const pill = make('g', { class: 'ss-pill' }, labelLayer);
    const pillRect = make('rect', { x: -26, y: -11, width: 52, height: 20, rx: 10 }, pill);
    const pillDot = make('circle', { class: 'dot', cx: -14, cy: -1, r: 3.2 }, pill);
    const pillText = make('text', { x: 5, y: 3.2 }, pill);
    const badge = make('g', { class: 'ss-badge' }, labelLayer);
    make('circle', { r: 9 }, badge);
    make('path', { d: 'M-3.5,-3.5L3.5,3.5M3.5,-3.5L-3.5,3.5' }, badge);
    for (const el of [g, label, pill, badge]) el.setAttribute('data-node', node.id);
    return {
      node,
      pos: { x: node.x, y: node.y },
      rise: 1,
      removing: false,
      g,
      inner,
      label,
      title,
      sub,
      pill,
      pillRect,
      pillDot,
      pillText,
      badge,
    };
  }

  function placeNode(v: NodeView) {
    const shape = SHAPES[v.node.kind];
    const base = project(v.pos.x, v.pos.y, v.node.z ?? 0);
    const drop = v.node.health === 'down' ? 2 : 0;
    v.g.setAttribute('transform', `translate(${round(base.sx)} ${round(base.sy + drop)})`);
    v.inner.setAttribute('transform', `scale(1 ${round(Math.max(0.001, v.rise))})`);
    const front = project(v.pos.x + shape.hw, v.pos.y + shape.hd, v.node.z ?? 0);
    v.label.setAttribute('transform', `translate(${round(base.sx)} ${round(front.sy + 16)})`);
    const topY = base.sy - shape.height * UNIT * v.rise - 16;
    v.pill.setAttribute('transform', `translate(${round(base.sx)} ${round(topY)})`);
    v.badge.setAttribute('transform', `translate(${round(base.sx)} ${round(topY + drop)})`);
  }

  function styleNode(v: NodeView, load: number | undefined) {
    const health = v.node.health ?? 'healthy';
    const p = paletteFor(v.node.kind, health);
    v.g.setAttribute(
      'style',
      `--f-top:${p.top};--f-left:${p.left};--f-right:${p.right};--f-outline:${p.outline};--f-soft:${p.soft}`,
    );
    v.g.setAttribute('class', `ss-node is-${health}`);
    v.title.textContent = v.node.label;
    v.sub.textContent = v.node.sublabel ?? '';
    const text =
      v.node.value !== undefined
        ? formatValue(v.node.value, v.node)
        : load !== undefined
          ? `${Math.round(load * 100)}%`
          : null;
    const showPill = text !== null && health !== 'down';
    v.pill.style.display = showPill ? '' : 'none';
    v.badge.style.display = health === 'down' ? '' : 'none';
    if (showPill) {
      v.pillText.textContent = text;
      const width = Math.max(52, text.length * 7.2 + 26);
      v.pillRect.setAttribute('x', String(round(-width / 2)));
      v.pillRect.setAttribute('width', String(round(width)));
      v.pillDot.setAttribute('cx', String(round(-width / 2 + 12)));
      v.pillText.setAttribute('x', String(5));
      const pct = load !== undefined && v.node.value === undefined ? load * 100 : 0;
      const level =
        health === 'degraded' || pct >= 90
          ? pct >= 100
            ? 'is-fail'
            : 'is-warn'
          : pct >= 75
            ? 'is-warn'
            : '';
      v.pill.setAttribute('class', `ss-pill ${level}`);
    }
  }

  function syncNodes(state: DiagramState<M>, animate: boolean) {
    const next = new Map(state.nodes.map((n) => [n.id, n]));
    const loads = computeLoads(state);
    for (const [id, v] of nodeViews) {
      if (next.has(id) || v.removing) continue;
      v.removing = true;
      const fade = (k: number) => {
        v.rise = 1 - k * 0.85;
        const o = String(1 - k);
        v.g.style.opacity = o;
        v.label.style.opacity = o;
        v.pill.style.opacity = o;
        v.badge.style.opacity = o;
        placeNode(v);
      };
      const remove = () => {
        v.g.remove();
        v.label.remove();
        v.pill.remove();
        v.badge.remove();
        nodeViews.delete(id);
      };
      if (animate) tween(SINK_MS, fade, remove);
      else remove();
    }
    for (const node of state.nodes) {
      let v = nodeViews.get(node.id);
      if (v?.removing) {
        v.g.remove();
        v.label.remove();
        v.pill.remove();
        v.badge.remove();
        nodeViews.delete(node.id);
        v = undefined;
      }
      if (!v) {
        const view = createNodeView(node);
        nodeViews.set(node.id, view);
        styleNode(view, loads.get(node.id));
        if (animate) {
          tween(RISE_MS, (k) => {
            view.rise = k;
            view.label.style.opacity = String(k);
            placeNode(view);
          });
        } else placeNode(view);
        continue;
      }
      const view = v;
      if (
        view.node.kind !== node.kind ||
        view.node.value !== node.value ||
        view.node.capacity !== node.capacity
      ) {
        view.inner.innerHTML = SHAPES[node.kind].draw(node);
      }
      const from = { ...view.pos };
      view.node = node;
      styleNode(view, loads.get(node.id));
      if (from.x !== node.x || from.y !== node.y) {
        const move = (k: number) => {
          view.pos = { x: from.x + (node.x - from.x) * k, y: from.y + (node.y - from.y) * k };
          placeNode(view);
          layoutLinks();
        };
        if (animate) tween(MOVE_MS, move);
        else move(1);
      } else placeNode(view);
    }
    for (const v of depthSort(
      [...nodeViews.values()].map((view) => ({ ...view.pos, z: view.node.z ?? 0, view })),
    )) {
      blockLayer.appendChild(v.view.g);
    }
  }

  // ---------- links ----------

  function linkFloor(link: DiagramLink): FloorPoint[] {
    const a = nodeViews.get(link.from);
    const b = nodeViews.get(link.to);
    if (!a || !b) return [];
    const route = orthogonalRoute(a.pos, b.pos);
    const exit = (v: NodeView, p: FloorPoint, q: FloorPoint) =>
      Math.abs(q.x - p.x) >= Math.abs(q.y - p.y) ? SHAPES[v.node.kind].hw : SHAPES[v.node.kind].hd;
    const first = route[1] ?? b.pos;
    const last = route[route.length - 2] ?? a.pos;
    return trimPolyline(route, exit(a, a.pos, first) + 0.2, exit(b, last, b.pos) + 0.3);
  }

  function failing(link: DiagramLink): boolean {
    return [link.from, link.to].some((id) => nodeViews.get(id)?.node.health === 'down');
  }

  function drawLink(v: LinkView) {
    v.floor = linkFloor(v.link);
    const screen = v.floor.map((p) => project(p.x, p.y));
    v.path.setAttribute(
      'd',
      screen.map((p, i) => `${i ? 'L' : 'M'}${round(p.sx)},${round(p.sy)}`).join(''),
    );
    const tip = screen[screen.length - 1];
    const prev = screen[screen.length - 2];
    if (tip && prev) {
      const ang = Math.atan2(tip.sy - prev.sy, tip.sx - prev.sx);
      const s = 7;
      const back = { sx: tip.sx - Math.cos(ang) * s, sy: tip.sy - Math.sin(ang) * s };
      const nx = -Math.sin(ang) * s * 0.5;
      const ny = Math.cos(ang) * s * 0.5;
      v.arrow.setAttribute(
        'points',
        points([
          { sx: tip.sx + Math.cos(ang) * 2, sy: tip.sy + Math.sin(ang) * 2 },
          { sx: back.sx + nx, sy: back.sy + ny },
          { sx: back.sx - nx, sy: back.sy - ny },
        ]),
      );
    }
    const mid = pointAlong(v.floor, polylineLength(v.floor) / 2);
    const m = project(mid.x, mid.y);
    v.text.setAttribute('x', String(round(m.sx)));
    v.text.setAttribute('y', String(round(m.sy - 6)));
    const fail = failing(v.link);
    v.path.setAttribute(
      'class',
      `ss-link${v.link.style === 'dashed' ? ' is-dashed' : ''}${fail ? ' is-failing' : ''}`,
    );
    v.arrow.setAttribute('class', `ss-arrow${fail ? ' is-failing' : ''}`);
  }

  function layoutLinks() {
    for (const v of linkViews.values()) if (!v.removing) drawLink(v);
  }

  function syncLinks(state: DiagramState<M>, animate: boolean) {
    const next = new Set(state.links.map((l) => l.id));
    for (const [id, v] of linkViews) {
      if (next.has(id) || v.removing) continue;
      v.removing = true;
      const remove = () => {
        v.path.remove();
        v.arrow.remove();
        v.text.remove();
        linkViews.delete(id);
      };
      if (animate) {
        tween(
          SINK_MS,
          (k) => {
            const o = String(1 - k);
            v.path.style.opacity = o;
            v.arrow.style.opacity = o;
            v.text.style.opacity = o;
          },
          remove,
        );
      } else remove();
    }
    for (const link of state.links) {
      const existing = linkViews.get(link.id);
      if (existing && !existing.removing) {
        existing.link = link;
        existing.text.textContent = link.label ?? '';
        drawLink(existing);
        continue;
      }
      if (existing) {
        existing.path.remove();
        existing.arrow.remove();
        existing.text.remove();
      }
      const v: LinkView = {
        link,
        removing: false,
        drawn: false,
        path: make('path', {}, linkLayer),
        arrow: make('polygon', {}, linkLayer),
        text: make('text', { class: 'ss-link-label' }, linkLayer),
        floor: [],
      };
      v.text.textContent = link.label ?? '';
      linkViews.set(link.id, v);
      drawLink(v);
      if (animate) {
        const len = polylineLength(v.floor) * UNIT + 4;
        v.path.style.strokeDasharray = `${len}`;
        tween(
          DRAW_MS,
          (k) => {
            v.path.style.strokeDashoffset = String(len * (1 - k));
            v.arrow.style.opacity = k > 0.85 ? '1' : '0';
            v.text.style.opacity = String(k);
          },
          () => {
            v.path.style.strokeDasharray = '';
            v.path.style.strokeDashoffset = '';
          },
        );
      }
    }
  }

  // ---------- packets ----------

  function flowPieces(flow: TrafficFlow): Piece[] {
    const pieces: Piece[] = [];
    let prevEnd: FloorPoint | undefined;
    for (let i = 1; i < flow.route.length; i++) {
      const a = flow.route[i - 1] as string;
      const b = flow.route[i] as string;
      const link = findLinkBetween(shown, a, b);
      const view = link && linkViews.get(link.id);
      if (!view || view.floor.length < 2) return [];
      const pts = link.from === a ? view.floor : [...view.floor].reverse();
      const first = pts[0] as FloorPoint;
      if (prevEnd)
        pieces.push({ pts: [prevEnd, first], len: polylineLength([prevEnd, first]), hidden: true });
      pieces.push({ pts, len: polylineLength(pts), hidden: false });
      prevEnd = pts[pts.length - 1];
    }
    return pieces;
  }

  function syncFlows(state: DiagramState<M>) {
    emitters = state.flows.map((flow, i) => {
      const target = flow.route[flow.route.length - 1] ?? '';
      const targetDown = state.nodes.find((n) => n.id === target)?.health === 'down';
      const checkFailing = flow.kind === 'healthCheck' && targetDown;
      const interval = 1000 / visualRate(flow.ratePerSec, flow.kind);
      return {
        flow,
        interval,
        acc: interval * (0.2 + ((i * 0.37) % 0.7)),
        klass: checkFailing ? 'k-checkFailing' : `k-${flow.kind}`,
        bounces: flow.kind === 'failed' || checkFailing,
      };
    });
  }

  function spawn(e: Emitter) {
    if (packets.length >= MAX_PACKETS || e.flow.ratePerSec <= 0) return;
    const pieces = flowPieces(e.flow);
    if (pieces.length === 0) return;
    const small = e.flow.kind === 'healthCheck';
    const shadow = make(
      'ellipse',
      { class: 'ss-shadow', rx: small ? 3 : 4.5, ry: small ? 1.5 : 2.2 },
      shadowLayer,
    );
    const g = make('g', { class: `ss-packet ${e.klass}` }, packetLayer);
    make('circle', { class: 'glow', r: small ? 5 : 8 }, g);
    make('circle', { class: 'core', r: small ? 2.6 : 4.2 }, g);
    packets.push({
      g,
      shadow,
      pieces,
      length: pieces.reduce((s, p) => s + p.len, 0),
      dist: 0,
      bounces: e.bounces,
      phase: 'fly',
      bounceLeft: 0,
    });
  }

  function placePacket(p: Packet) {
    let d = p.dist;
    let piece = p.pieces[0] as Piece;
    for (const candidate of p.pieces) {
      piece = candidate;
      if (d <= candidate.len) break;
      d -= candidate.len;
    }
    const at = pointAlong(piece.pts, d);
    const s = project(at.x, at.y);
    const visibility = piece.hidden ? 'hidden' : 'visible';
    p.g.setAttribute('transform', `translate(${round(s.sx)} ${round(s.sy - PACKET_Z * UNIT)})`);
    p.shadow.setAttribute('cx', String(round(s.sx)));
    p.shadow.setAttribute('cy', String(round(s.sy)));
    p.g.style.visibility = visibility;
    p.shadow.style.visibility = visibility;
  }

  function advancePackets(dt: number) {
    for (const e of emitters) {
      e.acc += dt;
      while (e.acc >= e.interval) {
        e.acc -= e.interval;
        spawn(e);
      }
    }
    const step = (PACKET_SPEED * dt) / 1000;
    const live: Packet[] = [];
    for (const p of packets) {
      if (p.phase === 'bounce') {
        p.bounceLeft -= dt;
        p.dist = Math.max(0, p.dist - step * 0.6);
        const k = Math.max(0, p.bounceLeft / BOUNCE_MS);
        p.g.style.opacity = String(k);
        p.shadow.style.opacity = String(k * 0.13);
        if (p.bounceLeft <= 0) p.phase = 'done';
      } else {
        p.dist += step;
        if (p.dist >= p.length) {
          p.dist = p.length;
          p.phase = p.bounces ? 'bounce' : 'done';
          p.bounceLeft = BOUNCE_MS;
        }
      }
      if (p.phase === 'done') {
        p.g.remove();
        p.shadow.remove();
        continue;
      }
      placePacket(p);
      live.push(p);
    }
    packets = live;
  }

  function clearPackets() {
    for (const p of packets) {
      p.g.remove();
      p.shadow.remove();
    }
    packets = [];
  }

  // ---------- state & metrics ----------

  function emit(m: M) {
    metrics = m;
    const summary = summarize(shown, m);
    const key = JSON.stringify(m) + summary;
    if (key === lastEmitted) return;
    lastEmitted = key;
    svg.setAttribute('aria-label', summary);
    for (const cb of listeners) cb(m, summary);
  }

  function render(state: DiagramState<M>, animate: boolean) {
    shown = state;
    syncNodes(state, animate && !reduced);
    syncLinks(state, animate && !reduced);
    const change = scenario ? undefined : diagram.changes[stepIndex];
    const changedNodes = new Set([
      ...(change?.add?.nodes ?? []).map((n) => n.id),
      ...(change?.update?.nodes ?? []).map((n) => n.id),
    ]);
    const changedLinks = new Set(change?.add?.links?.map((link) => link.id));
    for (const [id, view] of nodeViews) {
      view.title.classList.toggle('ss-changed', changedNodes.has(id));
    }
    for (const [id, view] of linkViews) {
      view.path.classList.toggle('ss-changed', changedLinks.has(id));
    }
    syncFlows(state);
    updateInspection();
    kick();
  }

  function advanceScenario(dt: number) {
    if (!scenario) return;
    scenarioT += dt;
    const phase = scenario.phaseAt(scenarioT);
    if (phase !== scenarioPhase) {
      scenarioPhase = phase;
      render(scenario.stateAt(scenarioT), true);
    }
    emit(scenario.metricsAt(scenarioT));
  }

  function stepState(index: number): DiagramState<M> {
    return index < 0 ? start : (states[index] ?? start);
  }

  render(start, false);
  emit(start.metrics);

  return {
    inspect,
    onInspection(cb) {
      cb(updateInspection());
      inspectionListeners.add(cb);
      return () => inspectionListeners.delete(cb);
    },
    goToStep(index) {
      selected = '';
      const target = Math.max(-1, Math.min(states.length - 1, index));
      scenario = null;
      stepIndex = target;
      render(stepState(target), true);
      emit(stepState(target).metrics);
    },
    play() {
      playing = true;
      kick();
    },
    pause() {
      playing = false;
    },
    isPlaying: () => playing,
    replay() {
      scenario = null;
      clearPackets();
      render(stepState(stepIndex - 1), false);
      render(stepState(stepIndex), true);
      emit(stepState(stepIndex).metrics);
    },
    break(action) {
      const factory = options.scenarios?.[action];
      const next = factory ? factory(stepState(stepIndex)) : null;
      if (!next) return false;
      scenario = next;
      scenarioT = 0;
      scenarioPhase = 0;
      playing = true;
      render(next.stateAt(0), true);
      emit(next.metricsAt(0));
      return true;
    },
    reset() {
      scenario = null;
      render(stepState(stepIndex), true);
      emit(stepState(stepIndex).metrics);
    },
    onMetrics(cb) {
      listeners.add(cb);
      cb(metrics, summarize(shown, metrics));
      return () => listeners.delete(cb);
    },
    current: () => ({ ...shown, metrics }),
    setReducedMotion(next) {
      reduced = next;
      if (reduced) {
        runTweens(Number.POSITIVE_INFINITY);
        clearPackets();
      }
      kick();
    },
    destroy() {
      destroyed = true;
      if (frame) scheduler.cancel(frame);
      svg.removeEventListener('click', pickNode);
      inspectionListeners.clear();
      listeners.clear();
      svg.replaceChildren();
    },
  };
}
