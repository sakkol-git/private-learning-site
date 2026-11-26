import type { InfraLesson } from './index';

const APPS = ['app1', 'app2'];

const orders = (rate: number) =>
  APPS.map((id) => ({
    route: ['buyers', 'lb', id, 'orders'],
    kind: 'request' as const,
    ratePerSec: rate,
  }));
const tickets = APPS.map((id) => ({
  route: ['buyers', 'lb', id, 'ticket'],
  kind: 'request' as const,
  ratePerSec: 300,
}));

const lesson: InfraLesson = {
  slug: 'unique-ids',
  chapter: 'Storing data',
  title: 'Unique IDs at scale',
  summary: 'When many machines create records at once, who hands out the numbers?',
  minutes: 8,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Why auto-increment breaks across databases', stepId: 'collide' },
    { text: 'Why a central ID server becomes a bottleneck', stepId: 'ticket-spike' },
    { text: 'What random UUIDs cost', stepId: 'uuid' },
    { text: 'How time-ordered IDs are built', stepId: 'time-ids' },
  ],
  initial: {
    nodes: [
      { id: 'buyers', kind: 'users', label: 'Buyers', x: 0, y: 6 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4, y: 6 },
      { id: 'app1', kind: 'server', label: 'Orders API 1', x: 8.5, y: 3.5, capacity: 4000 },
      { id: 'app2', kind: 'server', label: 'Orders API 2', x: 8.5, y: 8.5, capacity: 4000 },
      {
        id: 'orders',
        kind: 'database',
        label: 'Orders',
        sublabel: '4 shards',
        x: 13,
        y: 8.5,
        capacity: 5000,
      },
    ],
    links: [
      { id: 'buyers-lb', from: 'buyers', to: 'lb' },
      ...APPS.map((id) => ({ id: `lb-${id}`, from: 'lb', to: id })),
      ...APPS.map((id) => ({ id: `${id}-orders`, from: id, to: 'orders' })),
    ],
    metrics: {
      users: 6000,
      requestsPerSec: 600,
      p95LatencyMs: 50,
      errorRatePct: 0,
      healthy: [2, 2],
    },
  },
  steps: [
    {
      id: 'collide',
      short: 'Collide',
      tag: 'PROBLEM',
      title: 'Two orders numbered 1042',
      body: [
        'Orders used to get ids from one database’s auto-increment counter. The orders table is now split across 4 database shards, and each shard counts on its own.',
        'Shard 1 and shard 3 both create order 1042. Support cannot tell which is which.',
      ],
      keyIdea: 'A counter is unique only inside the one place that keeps it.',
      change: { flows: orders(300) },
    },
    {
      id: 'ticket-server',
      short: 'Ticket',
      tag: 'SOLUTION',
      title: 'One server hands out numbers',
      body: [
        'A small <b>ticket server</b> keeps one counter. Every new order asks it for the next number first.',
        'Numbers are unique and in order. But all 600 orders a second now wait on one machine that can do about 800: 75% busy.',
      ],
      keyIdea: 'Central counters are simple, and every create depends on them.',
      change: {
        add: {
          nodes: [
            {
              id: 'ticket',
              kind: 'server',
              label: 'Ticket server',
              sublabel: 'next id',
              x: 13,
              y: 1.5,
              capacity: 800,
            },
          ],
          links: APPS.map((id) => ({ id: `${id}-ticket`, from: id, to: 'ticket' })),
        },
        flows: [...orders(300), ...tickets],
        metrics: { healthy: [3, 3] },
      },
    },
    {
      id: 'ticket-spike',
      short: 'Spike',
      tag: 'TRY IT',
      title: 'A flash sale',
      body: [
        'Predict: orders jump 5×. The APIs have plenty of room. Does the ticket server?',
        'Press <b>Spike traffic 5×</b>. The ticket server would need to be 375% busy, so about <b>73%</b> of orders fail and p95 rises to about <b>250 ms</b>. The APIs could have handled it; the counter could not.',
      ],
      keyIdea: 'Any shared step on the write path caps how fast you can create things.',
      change: {},
      breakActions: ['spikeTraffic'],
    },
    {
      id: 'uuid',
      short: 'UUID',
      tag: 'IDEA',
      title: 'Random IDs need no one',
      body: [
        'A <b>UUID</b> is 128 random bits. Any server can make one, and a clash is so unlikely you can ignore it.',
        'The costs: 36 characters long, no order, and random keys land all over a B-tree index, splitting pages and slowing inserts.',
      ],
      keyIdea: 'Random IDs remove coordination but lose ordering.',
      change: {},
    },
    {
      id: 'time-ids',
      short: 'Time IDs',
      tag: 'SOLUTION',
      title: 'Time, machine, sequence',
      body: [
        'Build a 64-bit id from 41 bits of milliseconds since a start date, 10 bits of machine number and a 12-bit sequence. Each machine can make 4,096 ids per millisecond on its own.',
        'Ids sort by creation time, fit in a normal integer column, and the ticket server is gone.',
      ],
      keyIdea: 'Time-ordered IDs are unique without asking anyone, and still sort.',
      change: {
        remove: { links: APPS.map((id) => `${id}-ticket`), nodes: ['ticket'] },
        update: { nodes: APPS.map((id) => ({ id, sublabel: 'makes its own ids' })) },
        flows: orders(300),
        metrics: { healthy: [2, 2] },
      },
    },
    {
      id: 'spike-again',
      short: 'Spike again',
      tag: 'TRY IT',
      title: 'The same flash sale',
      body: [
        'Predict: same 5× spike, no ticket server.',
        'Press <b>Spike traffic 5×</b>. Each API goes from under 10% to under 40% busy and errors stay at <b>0%</b>. p95 rises a little, to about 75 ms, but nothing waits on a single counter any more.',
      ],
      keyIdea: 'Remove the shared step and creates scale with the servers.',
      change: {},
      breakActions: ['spikeTraffic'],
    },
    {
      id: 'clocks',
      short: 'Clocks',
      tag: 'TRADE-OFF',
      title: 'Now clocks matter',
      body: [
        'If a machine’s clock jumps backwards, it could repeat ids, so it must wait until time catches up. Machine numbers must be unique, usually assigned at start-up.',
        'Ids also leak information: anyone can read when an order was made, and roughly how many you sell.',
      ],
      keyIdea: 'Coordination-free IDs depend on sane clocks and unique machine numbers.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Unique without a bottleneck',
      body: [
        'Per-shard counters collided. A ticket server was unique but failed 73% of a flash sale. Time-ordered ids let every server create its own, sorted and collision-free.',
      ],
      keyIdea: 'Generate IDs where the records are created.',
      change: {},
    },
  ],
};

export default lesson;
