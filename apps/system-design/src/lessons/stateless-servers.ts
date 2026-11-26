import type { InfraLesson } from './index';

const SERVERS = ['s1', 's2', 's3'];
const SERVER_Y = [2, 6, 10];

const visits = (withSessions: boolean) =>
  SERVERS.flatMap((id) => [
    {
      route: ['shoppers', 'lb', id, 'db'],
      kind: 'request' as const,
      ratePerSec: withSessions ? 50 : 150,
    },
    ...(withSessions
      ? [{ route: ['shoppers', 'lb', id, 'sessions'], kind: 'request' as const, ratePerSec: 100 }]
      : []),
  ]);

const lesson: InfraLesson = {
  slug: 'stateless-servers',
  chapter: 'Scaling the web tier',
  title: 'Stateless servers',
  summary:
    'Why servers that remember nothing between requests are the ones you can add, remove and lose freely.',
  minutes: 8,
  level: 'beginner',
  youWillLearn: [
    { text: 'What counts as state on a server', stepId: 'what-is-state' },
    { text: 'Why a crash loses in-memory sessions', stepId: 'crash' },
    { text: 'How a shared session store fixes it', stepId: 'shared-store' },
    { text: 'When signed tokens replace the store', stepId: 'tokens' },
  ],
  initial: {
    nodes: [
      { id: 'shoppers', kind: 'users', label: 'Shoppers', x: 0, y: 6 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', sublabel: 'sticky', x: 4, y: 6 },
      ...SERVERS.map((id, i) => ({
        id,
        kind: 'server' as const,
        label: `Server ${i + 1}`,
        sublabel: 'carts in memory',
        x: 8.5,
        y: SERVER_Y[i] ?? 0,
        capacity: 300,
      })),
      { id: 'db', kind: 'database', label: 'Orders DB', x: 13, y: 6, capacity: 2000 },
    ],
    links: [
      { id: 'shoppers-lb', from: 'shoppers', to: 'lb' },
      ...SERVERS.map((id) => ({ id: `lb-${id}`, from: 'lb', to: id })),
      ...SERVERS.map((id) => ({ id: `${id}-db`, from: id, to: 'db' })),
    ],
    metrics: {
      users: 4500,
      requestsPerSec: 450,
      p95LatencyMs: 90,
      errorRatePct: 0,
      healthy: [3, 3],
    },
  },
  steps: [
    {
      id: 'carts',
      short: 'Carts',
      tag: 'PROBLEM',
      title: 'Each server remembers its shoppers',
      body: [
        'A shop keeps every shopping cart in the memory of whichever server first saw that shopper. The balancer is <b>sticky</b>: it keeps sending each shopper to the same server.',
        'Three servers share 450 requests a second, 150 each. It works, as long as nothing changes.',
      ],
      keyIdea: 'Memory on one server is fast, but only that server can see it.',
      change: { flows: visits(false) },
    },
    {
      id: 'crash',
      short: 'Crash',
      tag: 'TRY IT',
      title: 'Lose the server holding the carts',
      body: [
        'Predict: when Server 2 crashes, what happens to its shoppers?',
        'Press <b>Kill a server</b>. For about 3 seconds a third of requests fail (<b>33%</b>). Then the balancer sends those shoppers to Servers 1 and 3, which answer fine, but have never seen their carts. Every cart on Server 2 is gone.',
      ],
      keyIdea: 'The site recovers; the state on the dead server does not.',
      change: {},
      breakActions: ['killServer'],
    },
    {
      id: 'what-is-state',
      short: 'State',
      tag: 'IDEA',
      title: 'What counts as state',
      body: [
        'State is anything a server remembers between requests: logins, carts, half-finished uploads on its local disk, counters held in memory.',
        'A <b>stateless</b> server keeps none of it. Each request carries or fetches everything needed to answer it.',
      ],
      keyIdea: 'Stateless does not mean no state. It means the state lives somewhere shared.',
      change: {},
    },
    {
      id: 'shared-store',
      short: 'Store',
      tag: 'SOLUTION',
      title: 'Move sessions to a shared store',
      body: [
        'Carts and logins move to a <b>session store</b>, an in-memory database every server can reach. Two in three requests now read or update it; the rest go to the orders database.',
        'The balancer no longer needs to be sticky. Any server can answer any shopper.',
      ],
      keyIdea: 'Put state in a shared store, and servers become interchangeable.',
      change: {
        add: {
          nodes: [
            {
              id: 'sessions',
              kind: 'cache',
              label: 'Session store',
              x: 13,
              y: 1.5,
              capacity: 20000,
            },
          ],
          links: SERVERS.map((id) => ({ id: `${id}-sessions`, from: id, to: 'sessions' })),
        },
        update: {
          nodes: [
            { id: 'lb', sublabel: 'any server' },
            ...SERVERS.map((id) => ({ id, sublabel: 'stateless' })),
          ],
        },
        flows: visits(true),
      },
    },
    {
      id: 'crash-again',
      short: 'Crash again',
      tag: 'TRY IT',
      title: 'Crash a server again',
      body: [
        'Predict: is this crash different from the last one?',
        'Press <b>Kill a server</b>. The numbers look the same: 33% errors for about 3 seconds, then 0%. The difference is what you cannot see in the numbers: the next server reads each cart from the store, so nobody loses one.',
      ],
      keyIdea: 'With stateless servers, a crash costs a few retries, not customer data.',
      change: {},
      breakActions: ['killServer', 'spikeTraffic'],
    },
    {
      id: 'tokens',
      short: 'Tokens',
      tag: 'IDEA',
      title: 'Or let the request carry it',
      body: [
        'For logins you can skip the store: give the browser a <b>signed token</b> that says who they are and when it expires. Any server checks the signature with no lookup at all.',
        'The catch: a token cannot easily be taken back before it expires. Keep lifetimes short, around 15 minutes, and refresh them.',
      ],
      keyIdea: 'Signed tokens move small, read-mostly state into the request itself.',
      change: {},
    },
    {
      id: 'store-cost',
      short: 'Cost',
      tag: 'TRADE-OFF',
      title: 'The store is a new dependency',
      body: [
        'Each request now makes an extra network hop, about 1 ms. And if the session store goes down, every shopper is logged out at once.',
        'So the store gets its own replicas. You moved the hard part to one place, which is where you want it.',
      ],
      keyIdea: 'Stateless servers concentrate state in a few stores that must be made reliable.',
      change: { update: { nodes: [{ id: 'sessions', sublabel: 'replicated' }] } },
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Servers you can throw away',
      body: [
        'In-memory carts vanished with their server. A shared session store, or signed tokens, made every server the same, so crashes, deploys and autoscaling stop hurting users.',
      ],
      keyIdea: 'Keep servers stateless and keep state in stores built to hold it.',
      change: {},
    },
  ],
};

export default lesson;
