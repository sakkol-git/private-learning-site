import type { InfraLesson } from './index';

const FIRST = ['b', 'c'];
const ADDED = ['a', 'd'];
const ALL = ['a', 'b', 'c', 'd'];
const Y: Record<string, number> = { a: 1.5, b: 4.5, c: 7.5, d: 10.5 };

const server = (id: string) => ({
  id,
  kind: 'server' as const,
  label: `Invoice ${id.toUpperCase()}`,
  x: 8.5,
  y: Y[id] ?? 0,
  capacity: 1250,
});

const spread = (ids: string[]) =>
  ids.map((id) => ({
    route: ['load', 'lb', id, 'db'],
    kind: 'request' as const,
    ratePerSec: 800 / ids.length,
  }));

const lesson: InfraLesson = {
  slug: 'testing-strategies',
  chapter: 'Shipping safely',
  title: 'Testing a system',
  summary:
    'Unit, integration, contract, load and failure tests: each catches a different kind of problem before users do.',
  minutes: 9,
  level: 'beginner',
  youWillLearn: [
    { text: 'What the test pyramid balances', stepId: 'pyramid' },
    { text: 'How contract tests protect service boundaries', stepId: 'contracts' },
    { text: 'How a load test finds the limit', stepId: 'load-test' },
    { text: 'Why teams break things on purpose', stepId: 'chaos' },
  ],
  initial: {
    nodes: [
      {
        id: 'load',
        kind: 'users',
        label: 'Test traffic',
        sublabel: 'launch-day model',
        x: 0,
        y: 6,
      },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4, y: 6 },
      ...FIRST.map(server),
      { id: 'db', kind: 'database', label: 'Invoices DB', x: 13, y: 6, capacity: 10000 },
    ],
    links: [
      { id: 'load-lb', from: 'load', to: 'lb' },
      ...FIRST.map((id) => ({ id: `lb-${id}`, from: 'lb', to: id })),
      ...FIRST.map((id) => ({ id: `${id}-db`, from: id, to: 'db' })),
    ],
    metrics: {
      users: 8000,
      requestsPerSec: 800,
      p95LatencyMs: 90,
      errorRatePct: 0,
      healthy: [2, 2],
    },
  },
  steps: [
    {
      id: 'bug',
      short: 'Bug',
      tag: 'PROBLEM',
      title: 'Totals were wrong for a day',
      body: [
        'An invoicing service shipped a refactor. Invoices with discounts added tax twice. Nobody noticed until customers did.',
        'The fix took ten minutes. Finding it took a day of angry emails. A test would have caught it in seconds.',
      ],
      keyIdea: 'The cheapest bug is the one a test catches before release.',
      change: { flows: spread(FIRST) },
    },
    {
      id: 'pyramid',
      short: 'Pyramid',
      tag: 'IDEA',
      title: 'Many small tests, few big ones',
      body: [
        '<b>Unit tests</b> check one function, such as the tax maths, in milliseconds: have thousands. <b>Integration tests</b> check the service with a real database: hundreds. <b>End-to-end tests</b> click through the whole product: a few dozen, because they are slow and brittle.',
      ],
      keyIdea: 'Push checks down to the fastest test that can catch the bug.',
      change: {},
    },
    {
      id: 'contracts',
      short: 'Contracts',
      tag: 'IDEA',
      title: 'Test the agreements between services',
      body: [
        'The billing team renamed a field the mobile app reads. Each side’s tests passed. A <b>contract test</b> records what each consumer expects from the API, and runs against the provider before it deploys.',
      ],
      keyIdea: 'Contract tests catch breaking API changes without full end-to-end runs.',
      change: {},
    },
    {
      id: 'load-test',
      short: 'Load test',
      tag: 'TRY IT',
      title: 'Load-test the launch',
      body: [
        'Marketing expects 5× normal traffic on launch day. Predict: can two servers at 32% handle it?',
        'Press <b>Spike traffic 5×</b> to run the load test. Each server would need to be 160% busy, so about <b>38%</b> of requests fail and p95 jumps to about <b>1.2 seconds</b>. Better to learn this today than on launch day.',
      ],
      keyIdea: 'Load tests find the limit with fake users instead of real ones.',
      change: {},
      breakActions: ['spikeTraffic'],
    },
    {
      id: 'scale',
      short: 'Add servers',
      tag: 'SOLUTION',
      title: 'Plan from the result',
      body: [
        'Four servers split the same 800 requests a second, 16% busy each. At 5×, each would be 80% busy.',
      ],
      keyIdea: 'Size from measured limits, with headroom.',
      change: {
        add: {
          nodes: ADDED.map(server),
          links: [
            ...ADDED.map((id) => ({ id: `lb-${id}`, from: 'lb', to: id })),
            ...ADDED.map((id) => ({ id: `${id}-db`, from: id, to: 'db' })),
          ],
        },
        flows: spread(ALL),
        metrics: { p95LatencyMs: 50, healthy: [4, 4] },
      },
    },
    {
      id: 'load-test-again',
      short: 'Re-test',
      tag: 'TRY IT',
      title: 'Run the load test again',
      body: [
        'Predict: same 5× test, four servers.',
        'Press <b>Spike traffic 5×</b>. Errors stay at <b>0%</b>. p95 rises to about 210 ms, slower but acceptable for one day.',
      ],
      keyIdea: 'Re-run the test after every capacity change.',
      change: {},
      breakActions: ['spikeTraffic'],
    },
    {
      id: 'chaos',
      short: 'Chaos',
      tag: 'TRY IT',
      title: 'Break it on purpose',
      body: [
        'Predict: one of four servers dies mid-test. Does the system recover by itself?',
        'Press <b>Kill a server</b>. <b>25%</b> of requests fail for about 3 seconds, then the balancer routes around it. Running failures like this on purpose, called <b>chaos testing</b>, proves the recovery path works.',
      ],
      keyIdea: 'Test failure handling by causing failures, in a controlled way.',
      change: {},
      breakActions: ['killServer'],
    },
    {
      id: 'limits',
      short: 'Limits',
      tag: 'TRADE-OFF',
      title: 'What tests cannot tell you',
      body: [
        'A test environment never quite matches production: less data, fewer users, different timing. Flaky tests that fail at random teach people to ignore failures.',
        'So the last line of defence is releasing carefully: small steps, watched closely, easy to undo. That is the next lesson.',
      ],
      keyIdea: 'Tests reduce risk; careful releases handle what tests miss.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Test each kind of risk',
      body: [
        'Unit tests catch logic bugs, contract tests catch broken agreements, a load test showed two servers would fail 38% of launch traffic, and a chaos test proved four recover from a crash in about 3 seconds.',
      ],
      keyIdea: 'Match each risk with the cheapest test that finds it.',
      change: {},
    },
  ],
};

export default lesson;
