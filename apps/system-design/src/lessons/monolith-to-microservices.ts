import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'monolith-to-microservices',
  chapter: 'Bigger architectures',
  title: 'Monoliths and microservices',
  summary:
    'One deployable app or many small services: what splitting buys, and the bill that comes with it.',
  minutes: 10,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Why a monolith is a good place to start', stepId: 'monolith' },
    { text: 'How one module can hurt everything in a monolith', stepId: 'shared-fate' },
    { text: 'How services with their own data isolate failures', stepId: 'isolated' },
    { text: 'What microservices cost', stepId: 'costs' },
  ],
  initial: {
    nodes: [
      { id: 'diners', kind: 'users', label: 'Diners', x: 0, y: 3 },
      { id: 'staff', kind: 'users', label: 'Restaurant reports', x: 0, y: 9, tag: 'noisy' },
      {
        id: 'mono',
        kind: 'server',
        label: 'Delivery app',
        sublabel: 'one codebase',
        x: 5,
        y: 6,
        capacity: 1000,
      },
      { id: 'db', kind: 'database', label: 'One database', x: 10, y: 6, capacity: 3000 },
    ],
    links: [
      { id: 'diners-mono', from: 'diners', to: 'mono' },
      { id: 'staff-mono', from: 'staff', to: 'mono' },
      { id: 'mono-db', from: 'mono', to: 'db' },
    ],
    metrics: {
      users: 6000,
      requestsPerSec: 660,
      p95LatencyMs: 90,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'monolith',
      short: 'Monolith',
      tag: 'IDEA',
      title: 'One app does everything',
      body: [
        'A food-delivery company runs one app: menus, orders, payments, courier tracking and restaurant reports. One codebase, one deploy, one database.',
        'Calls between features are plain function calls: fast, and they never time out. For a young product with a small team, this is the right design.',
      ],
      keyIdea: 'A monolith is simple to build, test, deploy and debug.',
      change: {
        flows: [
          { route: ['diners', 'mono', 'db'], kind: 'request', ratePerSec: 600 },
          { route: ['staff', 'mono', 'db'], kind: 'request', ratePerSec: 60 },
        ],
      },
    },
    {
      id: 'growing-pains',
      short: 'Pains',
      tag: 'PROBLEM',
      title: 'Forty engineers, one deploy',
      body: [
        'Five teams now change the same app. Every release waits for everyone’s tests, so deploys happen weekly. A memory leak in reports restarts the whole app, orders included.',
      ],
      keyIdea: 'Shared code becomes shared schedules and shared failures.',
      change: {},
    },
    {
      id: 'shared-fate',
      short: 'Month end',
      tag: 'TRY IT',
      title: 'Month-end reports',
      body: [
        'Predict: on the last day of the month, restaurants pull reports ten times as often. Do diners notice?',
        'Press <b>One client floods</b>. Reports and orders share the same servers, now asked for 1,200 requests a second with room for 1,000. About <b>17%</b> of diners’ orders fail because of a reporting feature.',
      ],
      keyIdea: 'In a monolith, every feature shares the same capacity and the same fate.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'split',
      short: 'Split',
      tag: 'SOLUTION',
      title: 'Split by business capability',
      body: [
        'Orders and reports become separate <b>services</b>, each with its own servers and its own data. A gateway routes each request. Reports read a copy of order data, kept up to date by events.',
      ],
      keyIdea: 'A service owns one capability and its data, and is deployed on its own.',
      change: {
        remove: { links: ['diners-mono', 'staff-mono', 'mono-db'], nodes: ['mono', 'db'] },
        add: {
          nodes: [
            { id: 'gw', kind: 'loadBalancer', label: 'Gateway', x: 4, y: 6 },
            { id: 'orders', kind: 'server', label: 'Orders service', x: 8.5, y: 3, capacity: 1000 },
            {
              id: 'reports',
              kind: 'server',
              label: 'Reports service',
              x: 8.5,
              y: 9,
              capacity: 300,
            },
            { id: 'ordersDb', kind: 'database', label: 'Orders DB', x: 13, y: 3, capacity: 3000 },
            {
              id: 'reportsDb',
              kind: 'database',
              label: 'Reports DB',
              sublabel: 'copy of orders',
              x: 13,
              y: 9,
              capacity: 3000,
            },
          ],
          links: [
            { id: 'diners-gw', from: 'diners', to: 'gw' },
            { id: 'staff-gw', from: 'staff', to: 'gw' },
            { id: 'gw-orders', from: 'gw', to: 'orders' },
            { id: 'gw-reports', from: 'gw', to: 'reports' },
            { id: 'orders-db', from: 'orders', to: 'ordersDb' },
            { id: 'reports-db', from: 'reports', to: 'reportsDb' },
            { id: 'orders-copy', from: 'ordersDb', to: 'reportsDb', style: 'dashed' },
          ],
        },
        flows: [
          { route: ['diners', 'gw', 'orders', 'ordersDb'], kind: 'request', ratePerSec: 600 },
          { route: ['staff', 'gw', 'reports', 'reportsDb'], kind: 'request', ratePerSec: 60 },
          { route: ['ordersDb', 'reportsDb'], kind: 'response', ratePerSec: 60 },
        ],
        metrics: { healthy: [2, 2] },
      },
    },
    {
      id: 'isolated',
      short: 'Isolated',
      tag: 'TRY IT',
      title: 'Month-end, split',
      body: [
        'Predict: the same tenfold reports.',
        'Press <b>One client floods</b>. The reports service is swamped, and restaurants wait for their reports. Diners’ orders run on separate servers and data, and their errors stay at <b>0%</b>.',
      ],
      keyIdea: 'Separate services fail separately.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'boundaries',
      short: 'Boundaries',
      tag: 'IDEA',
      title: 'Where to draw the lines',
      body: [
        'Split along business capabilities that change for different reasons: ordering, payments, couriers, reporting. Each service owns its tables; others ask through its API or listen to its events.',
        'Two services sharing one database are still one system, just with more network in between.',
      ],
      keyIdea: 'No shared database. Boundaries follow the business, not the code layers.',
      change: {},
    },
    {
      id: 'costs',
      short: 'Costs',
      tag: 'TRADE-OFF',
      title: 'The bill for splitting',
      body: [
        'Function calls became network calls that can be slow or fail. A change across services needs a distributed transaction or a saga. Debugging needs tracing. Each service needs its own pipeline, alerts and on-call.',
        'Microservices help most when many teams need to ship independently.',
      ],
      keyIdea: 'Microservices trade code complexity for operational complexity.',
      change: {},
    },
    {
      id: 'modular',
      short: 'Middle',
      tag: 'IDEA',
      title: 'A modular monolith',
      body: [
        'A middle path: one deployable app with strict internal modules, each owning its tables and talking through defined interfaces. When one module truly needs to scale or ship alone, it is already easy to lift out.',
      ],
      keyIdea: 'Get the boundaries right first; split the deployment only when it pays.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Split for a reason',
      body: [
        'In the monolith, month-end reports failed 17% of orders. Split into services with their own data, the same load left orders at 0%. The price is network failures, data copies and more to operate.',
      ],
      keyIdea: 'Start simple; split along business lines when teams or failures demand it.',
      change: {},
    },
  ],
};

export default lesson;
