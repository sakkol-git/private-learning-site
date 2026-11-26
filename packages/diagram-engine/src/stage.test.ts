// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createStage, type Scheduler, type StageDiagram } from './stage';
import { formatMoney, type MoneyMetrics } from './presets/money';
import { infraScenarios, summarizeInfra, type InfraMetrics } from './presets/infra';

function manualScheduler() {
  let now = 0;
  let queue = new Map<number, (t: number) => void>();
  let id = 0;
  const scheduler: Scheduler = {
    now: () => now,
    request(cb) {
      queue.set(++id, cb);
      return id;
    },
    cancel(handle) {
      queue.delete(handle);
    },
  };
  return {
    scheduler,
    advance(ms: number, frameMs = 50) {
      for (let t = 0; t < ms; t += frameMs) {
        now += frameMs;
        const due = queue;
        queue = new Map();
        for (const cb of due.values()) cb(now);
      }
    },
  };
}

const diagram: StageDiagram<InfraMetrics> = {
  initial: {
    nodes: [
      { id: 'users', kind: 'users', label: 'Users', x: 0, y: 4 },
      { id: 'a', kind: 'server', label: 'Server A', x: 6, y: 4, capacity: 400 },
    ],
    links: [{ id: 'u-a', from: 'users', to: 'a' }],
    metrics: {
      users: 1000,
      requestsPerSec: 300,
      p95LatencyMs: 200,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  changes: [
    {
      add: {
        nodes: [
          { id: 'lb', kind: 'loadBalancer', label: 'LB', x: 4, y: 4 },
          { id: 'b', kind: 'server', label: 'Server B', x: 9, y: 2, capacity: 400 },
        ],
        links: [{ id: 'lb-b', from: 'lb', to: 'b' }],
      },
      metrics: { healthy: [2, 2] },
    },
    {
      add: {
        links: [
          { id: 'u-lb', from: 'users', to: 'lb' },
          { id: 'lb-a', from: 'lb', to: 'a' },
        ],
      },
      remove: { links: ['u-a'] },
      flows: [
        { route: ['users', 'lb', 'a'], kind: 'request', ratePerSec: 150 },
        { route: ['users', 'lb', 'b'], kind: 'request', ratePerSec: 150 },
      ],
      metrics: { p95LatencyMs: 90 },
    },
  ],
};

function setup(reducedMotion = false) {
  const clock = manualScheduler();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  document.body.appendChild(svg);
  const stage = createStage(svg, diagram, {
    reducedMotion,
    scheduler: clock.scheduler,
    scenarios: infraScenarios,
    summarize: summarizeInfra,
  });
  const seen: InfraMetrics[] = [];
  stage.onMetrics((m) => seen.push(m));
  return { stage, svg, clock, seen };
}

describe('stage', () => {
  it('renders an accessible SVG with a text summary', () => {
    const { svg } = setup();
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain('Users, Server A');
  });

  it('applies steps 0..n and evolves the node set', () => {
    const { stage, clock } = setup();
    stage.goToStep(1);
    clock.advance(500);
    expect(stage.current().nodes.map((n) => n.id)).toEqual(['users', 'a', 'lb', 'b']);
    expect(stage.current().links.map((l) => l.id)).toEqual(['lb-b', 'u-lb', 'lb-a']);
    expect(stage.current().metrics).toMatchObject({ healthy: [2, 2], p95LatencyMs: 90 });
  });

  it('kill a server: errors rise, then fall to zero after the health check', () => {
    const { stage, clock, seen } = setup(true);
    stage.goToStep(1);
    expect(stage.break('killServer')).toBe(true);
    clock.advance(1000);
    expect(stage.current().metrics.errorRatePct).toBeGreaterThan(40);
    expect(stage.current().nodes.find((n) => n.id === 'b')?.health).toBe('down');
    clock.advance(4000);
    expect(stage.current().metrics.errorRatePct).toBe(0);
    expect(stage.current().metrics.p95LatencyMs).toBeGreaterThan(90);
    expect(Math.max(...seen.map((m) => m.errorRatePct))).toBeGreaterThan(40);
  });

  it('pausing freezes the scenario clock', () => {
    const { stage, clock } = setup(true);
    stage.goToStep(1);
    stage.break('killServer');
    clock.advance(500);
    stage.pause();
    clock.advance(5000);
    expect(stage.current().metrics.errorRatePct).toBeGreaterThan(40);
  });

  it('reset() restores the step state', () => {
    const { stage, clock } = setup();
    stage.goToStep(1);
    clock.advance(500);
    const before = stage.current();
    stage.break('spikeTraffic');
    clock.advance(2000);
    expect(stage.current().metrics.requestsPerSec).toBeGreaterThan(before.metrics.requestsPerSec);
    stage.reset();
    clock.advance(500);
    expect(stage.current()).toEqual(before);
  });

  it('removed nodes sink and leave the DOM', () => {
    const { stage, svg, clock } = setup();
    stage.goToStep(1);
    clock.advance(500);
    stage.goToStep(-1);
    clock.advance(500);
    expect(svg.querySelectorAll('.ss-node')).toHaveLength(2);
  });

  it('emits packets along flows when motion is allowed', () => {
    const { stage, svg, clock } = setup();
    stage.goToStep(1);
    clock.advance(1500);
    expect(svg.querySelectorAll('.ss-packet').length).toBeGreaterThan(0);
  });

  it('draws no packets with reduced motion', () => {
    const { stage, svg, clock } = setup(true);
    stage.goToStep(1);
    clock.advance(1500);
    expect(svg.querySelectorAll('.ss-packet')).toHaveLength(0);
  });

  it('shows formatted values in stat pills and fills jars', () => {
    const clock = manualScheduler();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const money: StageDiagram<MoneyMetrics> = {
      initial: {
        nodes: [
          { id: 'jar', kind: 'jar', label: 'Savings', x: 0, y: 0, value: 1250, capacity: 5000 },
        ],
        links: [],
        metrics: { income: 0, spending: 0, saved: 0, debt: 0, netWorth: 1250 },
      },
      changes: [{ update: { nodes: [{ id: 'jar', value: 0 }] } }],
    };
    const stage = createStage(svg, money, { scheduler: clock.scheduler, formatValue: formatMoney });
    expect(svg.querySelector('.ss-pill text')?.textContent).toBe('$1,250');
    const filled = svg.querySelectorAll('.ss-node .ft').length;
    stage.goToStep(0);
    expect(svg.querySelector('.ss-pill text')?.textContent).toBe('$0');
    expect(svg.querySelectorAll('.ss-node .ft').length).toBeLessThan(filled);
  });

  it('ignores actions the course does not offer', () => {
    const { stage } = setup();
    stage.goToStep(1);
    expect(stage.break('slowDatabase')).toBe(false);
  });
});

it('inspects nodes and traces the selected flow without animation', () => {
  const { stage, svg } = setup(true);
  stage.goToStep(1);
  let route = '';
  let detail = '';
  stage.onInspection((view) => {
    route = view.options.find((o) => o.label.includes('Users → LB → Server A'))?.id ?? '';
    detail = view.detail;
  });
  stage.inspect('node:a');
  expect(detail).toContain('Server A');
  stage.inspect(route);
  expect(svg.querySelectorAll('[data-traced]')).toHaveLength(2);
  stage.goToStep(0);
  expect(svg.querySelectorAll('[data-traced]')).toHaveLength(0);
});
