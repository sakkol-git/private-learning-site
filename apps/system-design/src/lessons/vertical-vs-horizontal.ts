import type { Lesson } from '@ss/lesson-engine';

const APPS = ['app1', 'app2', 'app3', 'app4'];
const APP_Y = [1.5, 4.5, 7.5, 10.5];

const spread = (rate: number) =>
  APPS.map((id) => ({
    route: ['users', 'lb', id, 'db'],
    kind: 'request' as const,
    ratePerSec: rate,
  }));

const lesson: Lesson = {
  slug: 'vertical-vs-horizontal',
  chapter: 'Foundations',
  title: 'Vertical vs horizontal scaling',
  summary: 'Buy a bigger machine, or run more of them? Each answer breaks in a different way.',
  minutes: 8,
  level: 'beginner',
  youWillLearn: [
    { text: 'What scaling up buys you, and its ceiling', stepId: 'bigger-box' },
    { text: 'Why one machine is a single point of failure', stepId: 'one-box-dies' },
    { text: 'How scaling out spreads load and risk', stepId: 'many-boxes' },
    { text: 'Why horizontal scaling needs stateless servers', stepId: 'stateless' },
  ],
  initial: {
    nodes: [
      { id: 'users', kind: 'users', label: 'Visitors', x: 0, y: 6 },
      {
        id: 'app',
        kind: 'server',
        label: 'App server',
        sublabel: '4 vCPU · 8 GB',
        x: 8.5,
        y: 6,
        capacity: 300,
      },
      { id: 'db', kind: 'database', label: 'Database', x: 13, y: 6, capacity: 2500 },
    ],
    links: [
      { id: 'users-app', from: 'users', to: 'app' },
      { id: 'app-db', from: 'app', to: 'db' },
    ],
    metrics: {
      users: 900,
      requestsPerSec: 90,
      p95LatencyMs: 110,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'growth',
      short: 'Growth',
      tag: 'PROBLEM',
      title: 'Traffic tripled this month',
      body: [
        'A newsletter mention brought in new visitors. The app server now handles <b>280 requests per second</b>, close to its limit of 300.',
        'Pages still load, but p95 latency has crept past half a second.',
      ],
      keyIdea: 'As a server nears full use, queues form and latency rises sharply, not gradually.',
      change: {
        flows: [{ route: ['users', 'app', 'db'], kind: 'request', ratePerSec: 280 }],
        metrics: { users: 2800, requestsPerSec: 280, p95LatencyMs: 610 },
      },
    },
    {
      id: 'bigger-box',
      short: 'Scale up',
      tag: 'SOLUTION',
      title: 'Scale up: buy a bigger machine',
      body: [
        '<b>Vertical scaling</b> means more CPU and memory in the same box. Move from 4 to 16 cores, and capacity rises to about 1,000 requests per second.',
        'No code changes. No new moving parts. The server drops to under 30% busy.',
      ],
      keyIdea: 'Scaling up is the simplest fix you will ever ship. Try it first.',
      change: {
        update: { nodes: [{ id: 'app', sublabel: '16 vCPU · 64 GB', capacity: 1000 }] },
        metrics: { p95LatencyMs: 120 },
      },
    },
    {
      id: 'one-box-dies',
      short: 'One box',
      tag: 'TRY IT',
      title: 'Now pull its plug',
      body: [
        'Press <b>Kill a server</b>. There is no second machine to take over.',
        'Every request fails until someone restarts it. Then try <b>Spike traffic</b>: even the big box has a ceiling.',
      ],
      keyIdea: 'One machine, however large, is a single point of failure.',
      change: {},
      breakActions: ['killServer', 'spikeTraffic'],
    },
    {
      id: 'ceiling',
      short: 'Ceiling',
      tag: 'TRADE-OFF',
      title: 'Bigger gets expensive, then impossible',
      body: [
        'Price climbs faster than size. A machine with twice the cores often costs more than twice as much.',
        'Resizing also means a restart, and eventually you reach the largest machine your provider sells.',
      ],
      keyIdea: 'Vertical scaling has a hard top and a growing price.',
      change: {},
    },
    {
      id: 'many-boxes',
      short: 'Scale out',
      tag: 'SOLUTION',
      title: 'Scale out: run many small machines',
      body: [
        '<b>Horizontal scaling</b> means more copies of the same small server. Four 4-core machines replace the big one.',
        'A load balancer in front spreads the 280 requests, so each copy sees about 70. The next chapter covers how it decides.',
      ],
      keyIdea: 'Scaling out turns one big failure into several small, survivable ones.',
      change: {
        remove: { links: ['users-app', 'app-db'], nodes: ['app'] },
        add: {
          nodes: [
            { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4, y: 6 },
            ...APPS.map((id, i) => ({
              id,
              kind: 'server' as const,
              label: `App ${i + 1}`,
              sublabel: '4 vCPU',
              x: 8.5,
              y: APP_Y[i] ?? 0,
              capacity: 300,
            })),
          ],
          links: [
            { id: 'users-lb', from: 'users', to: 'lb' },
            ...APPS.map((id) => ({ id: `lb-${id}`, from: 'lb', to: id })),
            ...APPS.map((id) => ({ id: `${id}-db`, from: id, to: 'db' })),
          ],
        },
        flows: spread(70),
        metrics: { p95LatencyMs: 115, healthy: [4, 4] },
      },
    },
    {
      id: 'lose-one',
      short: 'Lose one',
      tag: 'TRY IT',
      title: 'Lose a machine, keep the site',
      body: [
        'Press <b>Kill a server</b> again. App 2 goes dark, and a quarter of requests fail for a few seconds.',
        'Then the balancer stops sending it traffic. The other three absorb the load and the site stays up.',
      ],
      keyIdea: 'With many copies, a crash costs capacity, not availability.',
      change: {},
      breakActions: ['killServer', 'spikeTraffic'],
    },
    {
      id: 'stateless',
      short: 'Stateless',
      tag: 'TRADE-OFF',
      title: 'Copies must not remember things',
      body: [
        'If App 1 keeps a login session in its own memory, the visitor is logged out the moment their next request lands on App 3.',
        'So session data moves to a shared <b>session store</b>. Any server can now handle any request, and servers become interchangeable.',
      ],
      keyIdea:
        'Horizontal scaling only works when servers are stateless. Push state into shared stores.',
      change: {
        add: {
          nodes: [
            {
              id: 'sessions',
              kind: 'cache',
              label: 'Session store',
              x: 13,
              y: 1.5,
              capacity: 5000,
            },
          ],
          links: APPS.map((id) => ({
            id: `${id}-sessions`,
            from: id,
            to: 'sessions',
            style: 'dashed' as const,
          })),
        },
        update: { nodes: APPS.map((id) => ({ id, sublabel: 'stateless' })) },
      },
    },
    {
      id: 'data-tier',
      short: 'Data tier',
      tag: 'TRADE-OFF',
      title: 'The database is still one machine',
      body: [
        'Stateless servers were easy to copy. The database holds the state, so copying it means keeping copies in agreement.',
        'Most teams scale the database up for a long time, and add read copies when that runs out. That is the replication lesson.',
      ],
      keyIdea:
        'Scale out the stateless tiers. Scale up the data tier until you have to do something harder.',
      change: { update: { nodes: [{ id: 'db', sublabel: 'scaled up · 32 vCPU' }] } },
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Up first, then out',
      body: [
        'Scaling up is quick and simple, but it has a ceiling and leaves a single point of failure.',
        'Scaling out survives crashes and grows almost without limit, as long as your servers keep no state of their own.',
      ],
      keyIdea: 'Real systems do both: big enough machines, and enough of them.',
      change: {},
    },
  ],
};

export default lesson;
