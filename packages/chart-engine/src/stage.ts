import { CHART_CSS } from './chart-styles';
import { formatUsd } from './market';
import { fitFrame, frameFor, HEIGHT, renderChart, WIDTH, type Frame } from './render';
import type { ChartScenario } from './scenario';
import { buildChartStates, initialChartState } from './scene';
import type { Evaluation } from './trading';
import type { ChartChange, ChartInitial, ChartState } from './types';

/** Frame clock; injectable so tests can drive time deterministically. */
export interface Scheduler {
  now(): number;
  request(cb: (time: number) => void): number;
  cancel(id: number): void;
}

export interface ChartStageOptions<M, A extends string> {
  /** The market's account maths: forex (evaluateFx) or stocks (evaluateStock). */
  evaluate: (state: ChartState) => Evaluation<M>;
  /** One sentence about the account for screen readers, for example "balance $10,000". */
  describe: (metrics: M) => string;
  scenarios?: Partial<Record<A, (base: ChartState) => ChartScenario | null>>;
  reducedMotion?: boolean;
  scheduler?: Scheduler;
}

export interface ChartStage<M, A extends string> {
  goToStep(index: number): void;
  play(): void;
  pause(): void;
  replay(): void;
  break(action: A): boolean;
  reset(): void;
  onMetrics(cb: (metrics: M, summary: string) => void): () => void;
  /** The chart as currently shown, including any break-it scenario. */
  current(): { state: ChartState; evaluation: Evaluation<M> };
  setReducedMotion(reduced: boolean): void;
  destroy(): void;
}

/** Time between bars when a step reveals new ones. */
const REVEAL_MS = 55;
const MAX_REVEAL_ANIMATION_MS = 1400;

const defaultScheduler: Scheduler = {
  now: () => performance.now(),
  request: (cb) => requestAnimationFrame(cb),
  cancel: (id) => cancelAnimationFrame(id),
};

function summarizeChart<M>(state: ChartState, e: Evaluation<M>, account: string): string {
  const last = state.series[state.reveal - 1];
  const p = (n: number) => n.toFixed(state.decimals);
  const kind = state.compare
    ? `comparison of ${[state.symbol, ...state.others.map((o) => o.symbol)].join(' and ')}`
    : state.style === 'line'
      ? 'line chart'
      : 'candlestick chart';
  const parts = [
    `${state.symbol} ${state.timeframe} ${kind}, ${state.reveal} bars`,
    last ? `last price ${p(last.c)}` : '',
  ];
  if (e.trade && !e.closed) {
    const fx = state.account.kind === 'fx';
    const size = fx ? `${e.trade.units / 100_000} lots` : `${e.trade.units} shares`;
    parts.push(
      `${e.trade.side === 'buy' ? 'bought' : fx ? 'sold' : 'shorted'} ${size} at ${p(e.trade.entry)}` +
        (e.trade.stop !== null ? `, stop ${p(e.trade.stop)}` : '') +
        (e.trade.target !== null ? `, target ${p(e.trade.target)}` : ''),
    );
  }
  if (e.closed) {
    parts.push(
      `trade closed by ${e.closed.reason} at ${p(e.closed.price)}, ${formatUsd(e.closed.pnl, true)}`,
    );
  }
  parts.push(account);
  return `${parts.filter(Boolean).join('. ')}.`;
}

export function createChartStage<M, A extends string = string>(
  svg: SVGSVGElement,
  scene: { initial: ChartInitial; changes: ChartChange[] },
  options: ChartStageOptions<M, A>,
): ChartStage<M, A> {
  const { evaluate, describe } = options;
  const scheduler = options.scheduler ?? defaultScheduler;
  let reduced = options.reducedMotion ?? false;
  const start = initialChartState(scene.initial);
  const states = buildChartStates(scene.initial, scene.changes);
  const items = [start, ...states].map((state) => ({ state, e: evaluate(state) }));
  const priceFrame: Frame = frameFor(items, false);
  const compareFrame: Frame = frameFor(items, true);

  svg.classList.add('cs-stage');
  svg.setAttribute('role', 'img');
  svg.setAttribute('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
  svg.dataset.width = String(WIDTH);
  svg.replaceChildren();
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = CHART_CSS;
  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.append(style, layer);

  const listeners = new Set<(m: M, summary: string) => void>();
  let stepIndex = -1;
  let target: ChartState = start;
  let shownReveal = start.reveal;
  let revealFrom = start.reveal;
  let revealStart = 0;
  let scenario: ChartScenario | null = null;
  let scenarioT = 0;
  let scenarioPhase = 0;
  let playing = true;
  let frame = 0;
  let lastTime = 0;
  let destroyed = false;
  let drawn = '';
  let lastEmitted = '';
  let current: { state: ChartState; evaluation: Evaluation<M> } = {
    state: start,
    evaluation: evaluate(start),
  };

  function draw() {
    const base = scenario ? scenario.stateAt(scenarioT) : target;
    const state = scenario
      ? base
      : { ...base, reveal: Math.min(base.reveal, Math.floor(shownReveal)) };
    const key = `${scenarioPhase}|${state.reveal}|${stepIndex}|${scenario ? 1 : 0}`;
    const e = evaluate(state);
    current = { state, evaluation: e };
    if (key !== drawn) {
      drawn = key;
      layer.innerHTML = renderChart(
        state,
        e,
        fitFrame(state.compare ? compareFrame : priceFrame, state, e),
      );
    }
    const summary = summarizeChart(state, e, describe(e.metrics));
    const emitKey = JSON.stringify(e.metrics) + summary;
    if (emitKey !== lastEmitted) {
      lastEmitted = emitKey;
      svg.setAttribute('aria-label', summary);
      for (const cb of listeners) cb(e.metrics, summary);
    }
  }

  const animating = () => !scenario && shownReveal < target.reveal;
  const needsFrames = () => playing && (animating() || scenario !== null);

  function kick() {
    if (frame || destroyed || !needsFrames()) return;
    lastTime = scheduler.now();
    frame = scheduler.request(tick);
  }

  function tick(time: number) {
    frame = 0;
    const dt = Math.min(250, Math.max(0, time - lastTime));
    lastTime = time;
    if (playing) {
      if (scenario) {
        scenarioT += dt;
        scenarioPhase = scenario.phaseAt(scenarioT);
      } else if (animating()) {
        const span = target.reveal - revealFrom;
        const perBar = Math.min(REVEAL_MS, MAX_REVEAL_ANIMATION_MS / Math.max(1, span));
        shownReveal = Math.min(target.reveal, revealFrom + (time - revealStart) / perBar);
      }
    }
    draw();
    if (needsFrames()) frame = scheduler.request(tick);
  }

  function show(next: ChartState, animate: boolean) {
    scenario = null;
    const from = Math.min(Math.floor(shownReveal), next.reveal);
    target = next;
    if (animate && !reduced && next.reveal > from) {
      revealFrom = from;
      shownReveal = from;
      revealStart = scheduler.now();
    } else {
      shownReveal = next.reveal;
    }
    drawn = '';
    draw();
    kick();
  }

  const stepState = (i: number) => (i < 0 ? start : (states[i] ?? start));

  show(start, false);

  return {
    goToStep(index) {
      stepIndex = Math.max(-1, Math.min(states.length - 1, index));
      show(stepState(stepIndex), true);
    },
    play() {
      if (!playing) {
        revealFrom = Math.floor(shownReveal);
        revealStart = scheduler.now();
      }
      playing = true;
      kick();
    },
    pause() {
      playing = false;
    },
    replay() {
      shownReveal = stepState(stepIndex - 1).reveal;
      show(stepState(stepIndex), true);
    },
    break(action) {
      const factory = options.scenarios?.[action];
      const next = factory ? factory(target) : null;
      if (!next) return false;
      shownReveal = target.reveal;
      scenario = next;
      scenarioT = reduced ? 60_000 : 0;
      scenarioPhase = next.phaseAt(scenarioT);
      playing = true;
      drawn = '';
      draw();
      kick();
      return true;
    },
    reset() {
      show(stepState(stepIndex), false);
    },
    onMetrics(cb) {
      listeners.add(cb);
      cb(
        current.evaluation.metrics,
        summarizeChart(current.state, current.evaluation, describe(current.evaluation.metrics)),
      );
      return () => listeners.delete(cb);
    },
    current: () => current,
    setReducedMotion(next) {
      reduced = next;
      if (reduced) {
        shownReveal = target.reveal;
        draw();
      }
      kick();
    },
    destroy() {
      destroyed = true;
      if (frame) scheduler.cancel(frame);
      listeners.clear();
      svg.replaceChildren();
    },
  };
}

/** The account numbers before the first step, for the page's first paint. */
export function startingMetrics<M>(
  initial: ChartInitial,
  evaluate: (state: ChartState) => Evaluation<M>,
): M {
  return evaluate(initialChartState(initial)).metrics;
}
