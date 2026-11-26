import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'api-styles',
  chapter: 'Services talking',
  title: 'Designing APIs',
  summary:
    'REST, RPC or GraphQL, and the contract details that keep an API fast and safe: paging, limits, idempotency, versions.',
  minutes: 10,
  level: 'beginner',
  youWillLearn: [
    { text: 'How REST, RPC and GraphQL differ', stepId: 'styles' },
    { text: 'Why every list endpoint needs paging and limits', stepId: 'paging' },
    { text: 'How idempotency keys make retries safe', stepId: 'idempotency' },
    { text: 'How to change an API without breaking clients', stepId: 'versioning' },
  ],
  initial: {
    nodes: [
      { id: 'shoppers', kind: 'users', label: 'Mobile app', x: 0, y: 3 },
      { id: 'partner', kind: 'users', label: 'Partner sync', x: 0, y: 9, tag: 'noisy' },
      { id: 'api', kind: 'server', label: 'Shop API', x: 5, y: 6, capacity: 1000 },
      { id: 'db', kind: 'database', label: 'Orders DB', x: 10, y: 6, capacity: 800 },
    ],
    links: [
      { id: 'shoppers-api', from: 'shoppers', to: 'api' },
      { id: 'partner-api', from: 'partner', to: 'api' },
      { id: 'api-db', from: 'api', to: 'db' },
    ],
    metrics: {
      users: 5000,
      requestsPerSec: 550,
      p95LatencyMs: 70,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'contract',
      short: 'Contract',
      tag: 'IDEA',
      title: 'An API is a promise',
      body: [
        'A shop’s API serves its mobile app, 500 requests a second, and a partner that syncs orders, 50 a second.',
        'Every endpoint promises what it accepts, what it returns, and how it fails. Clients you do not control will rely on every detail, so design it on purpose.',
      ],
      keyIdea: 'An API is a contract that outlives the code behind it.',
      change: {
        flows: [
          { route: ['shoppers', 'api', 'db'], kind: 'request', ratePerSec: 500 },
          { route: ['partner', 'api', 'db'], kind: 'request', ratePerSec: 50 },
        ],
      },
    },
    {
      id: 'styles',
      short: 'Styles',
      tag: 'IDEA',
      title: 'Three common styles',
      body: [
        '<b>REST</b>: resources and verbs, such as <code>GET /orders/42</code>. Plain HTTP, easy to cache. <b>RPC</b>: call a named function, often in a compact binary format; quick between internal services.',
        '<b>GraphQL</b>: the client names exactly the fields it needs in one request, which suits mobile screens. Caching and limiting expensive queries take more work.',
      ],
      keyIdea: 'REST for public resources, RPC between services, GraphQL for screen-shaped reads.',
      change: {},
    },
    {
      id: 'unbounded',
      short: 'Unbounded',
      tag: 'PROBLEM',
      title: 'One call returns everything',
      body: [
        '<code>GET /orders</code> returns every order the partner has ever had, 40,000 rows, each time. It works in testing, with 20 orders.',
        'The partner’s calls already use 50 of the database’s 800 queries a second, and they get heavier every week.',
      ],
      keyIdea: 'An endpoint with no limit has a cost that grows without limit.',
      change: { update: { nodes: [{ id: 'partner', sublabel: 'GET /orders (all)' }] } },
    },
    {
      id: 'unbounded-try',
      short: 'Flood',
      tag: 'TRY IT',
      title: 'The partner syncs more often',
      body: [
        'Predict: the partner switches from hourly to continuous sync, ten times the calls. Who suffers?',
        'Press <b>One client floods</b>. The database gets 1,000 queries a second for 800 of capacity, and <b>20%</b> of the mobile app’s requests fail. The partner’s code never changed shape; the API let it grow.',
      ],
      keyIdea: 'Without limits, one client’s usage becomes everyone’s outage.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'paging',
      short: 'Paging',
      tag: 'SOLUTION',
      title: 'Pages, cursors and limits',
      body: [
        'Return at most 100 orders per call, with a <b>cursor</b> pointing at the next page: <code>GET /orders?after=8f2c&limit=100</code>. Offer <code>updated_since</code> so syncs fetch only changes.',
        'Give each API key a request limit, enforced at the edge of the API.',
      ],
      keyIdea: 'Bound every response, and every client.',
      change: {
        add: {
          nodes: [{ id: 'limits', kind: 'shield', label: 'Per-key limit', x: 2.5, y: 11 }],
          links: [
            { id: 'partner-limits', from: 'partner', to: 'limits' },
            { id: 'limits-api', from: 'limits', to: 'api' },
          ],
        },
        remove: { links: ['partner-api'] },
        update: { nodes: [{ id: 'partner', sublabel: 'paged · 100 per call' }] },
        flows: [
          { route: ['shoppers', 'api', 'db'], kind: 'request', ratePerSec: 500 },
          { route: ['partner', 'limits', 'api', 'db'], kind: 'request', ratePerSec: 50 },
        ],
      },
    },
    {
      id: 'paging-try',
      short: 'Flood again',
      tag: 'TRY IT',
      title: 'Flood it again',
      body: [
        'Predict: the same tenfold sync, now with a per-key limit.',
        'Press <b>One client floods</b>. The limit lets the partner through at a little above its usual rate and answers the rest with <code>429 Too Many Requests</code>. The mobile app’s errors stay at <b>0%</b>.',
      ],
      keyIdea: 'Limits turn overuse into a clear error for one client, not slowness for all.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'idempotency',
      short: 'Retries',
      tag: 'IDEA',
      title: 'Make retries safe',
      body: [
        'A phone sends <code>POST /payments</code>, the connection drops, and the app retries. Did the first one go through? With an <code>Idempotency-Key</code> header, the server stores the result under that key and returns it again instead of charging twice.',
        '<code>GET</code>, <code>PUT</code> and <code>DELETE</code> are naturally safe to repeat; <code>POST</code> needs a key.',
      ],
      keyIdea: 'Any request that can be retried must be safe to run twice.',
      change: {},
    },
    {
      id: 'versioning',
      short: 'Versions',
      tag: 'TRADE-OFF',
      title: 'Change without breaking',
      body: [
        'Old app versions stay installed for years. Adding a field is safe; renaming or removing one breaks someone. Breaking changes go in a new version, such as <code>/v2</code>, and the old one is retired slowly with warnings.',
        'Every version you keep is code you must run and test.',
      ],
      keyIdea: 'Prefer additive changes. Version when you must, and retire on a schedule.',
      change: {},
    },
    {
      id: 'errors',
      short: 'Errors',
      tag: 'IDEA',
      title: 'Errors are part of the contract',
      body: [
        'Use status codes clients can act on: <code>400</code> fix your request, <code>401</code> sign in, <code>404</code> no such thing, <code>429</code> slow down, <code>503</code> try again later. Include a short machine-readable code and a human message.',
      ],
      keyIdea: 'A good error tells the client whether and when to retry.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'A contract that holds up',
      body: [
        'Pick a style that fits the caller. Then bound everything: an unpaged endpoint let one partner fail 20% of mobile requests, and paging plus a per-key limit brought that to 0%. Idempotency keys and careful versioning keep clients safe over time.',
      ],
      keyIdea: 'Design APIs for the worst client you will ever have.',
      change: {},
    },
  ],
};

export default lesson;
