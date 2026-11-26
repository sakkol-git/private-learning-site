import type { InfraAction, InfraMetrics } from '@ss/diagram-engine';
import type { DiagramLesson } from '@ss/lesson-engine';

const replicaLag = [40, 120] as const;

const writes = (to: string, rate = 90) => ({
  route: ['users', 'app', to],
  kind: 'request' as const,
  ratePerSec: rate,
});
const reads = (to: string, rate: number) => ({
  route: ['users', 'app', to],
  kind: 'request' as const,
  ratePerSec: rate,
});
const replicate = (from: string, to: string) => ({
  route: [from, to],
  kind: 'response' as const,
  ratePerSec: 90,
});

const lesson: DiagramLesson<InfraMetrics, InfraAction> = {
  slug: 'database-replication',
  chapter: 'Data across machines',
  title: 'Database replication',
  summary: 'Keep copies of your data to serve more reads and survive a dead primary.',
  minutes: 10,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How a primary and its replicas share work', stepId: 'read-scaling' },
    { text: 'What replication lag is and where it bites', stepId: 'read-your-writes' },
    { text: 'How failover promotes a replica', stepId: 'failover' },
    { text: 'Synchronous versus asynchronous replication', stepId: 'sync-async' },
  ],
  initial: {
    nodes: [
      { id: 'users', kind: 'users', label: 'Readers', x: 0, y: 6 },
      {
        id: 'app',
        kind: 'server',
        label: 'App servers',
        sublabel: '×4',
        x: 4,
        y: 6,
        capacity: 2400,
      },
      {
        id: 'primary',
        kind: 'database',
        label: 'Primary',
        sublabel: 'reads + writes',
        x: 9,
        y: 6,
        capacity: 600,
        tag: 'primary',
      },
    ],
    links: [
      { id: 'users-app', from: 'users', to: 'app' },
      { id: 'app-primary', from: 'app', to: 'primary' },
    ],
    metrics: {
      users: 4000,
      requestsPerSec: 400,
      p95LatencyMs: 90,
      errorRatePct: 0,
      healthy: [4, 4],
    },
  },
  steps: [
    {
      id: 'reads-pile-up',
      short: 'Overload',
      tag: 'PROBLEM',
      title: 'One database, 900 queries a second',
      body: [
        'A news site sends every query to one database. Traffic has grown to 900 per second, and <b>nine in ten are reads</b>.',
        'The database is past its limit. Queries queue, and some time out.',
      ],
      keyIdea:
        'Most applications read far more than they write. That imbalance is what replication exploits.',
      change: {
        update: { nodes: [{ id: 'primary', health: 'degraded' }] },
        flows: [reads('primary', 810), writes('primary')],
        metrics: { users: 9000, requestsPerSec: 900, p95LatencyMs: 950, errorRatePct: 3 },
      },
    },
    {
      id: 'copies',
      short: 'Copies',
      tag: 'IDEA',
      title: 'Keep live copies of the data',
      body: [
        'Add two <b>replicas</b>. The primary writes each change to a log and streams that log to them. The darker dots are that stream.',
        'Each replica replays the log and ends up with the same data, a moment later.',
      ],
      keyIdea: 'A replica is a read-only copy kept up to date from the primary’s change log.',
      change: {
        add: {
          nodes: [
            {
              id: 'r1',
              kind: 'database',
              label: 'Replica 1',
              sublabel: 'read only',
              x: 9,
              y: 1.5,
              capacity: 600,
            },
            {
              id: 'r2',
              kind: 'database',
              label: 'Replica 2',
              sublabel: 'read only',
              x: 9,
              y: 10.5,
              capacity: 600,
            },
          ],
          links: [
            { id: 'primary-r1', from: 'primary', to: 'r1', style: 'dashed' },
            { id: 'primary-r2', from: 'primary', to: 'r2', style: 'dashed' },
          ],
        },
        flows: [
          reads('primary', 810),
          writes('primary'),
          replicate('primary', 'r1'),
          replicate('primary', 'r2'),
        ],
      },
    },
    {
      id: 'read-scaling',
      short: 'Split reads',
      tag: 'SOLUTION',
      title: 'Writes to the primary, reads to replicas',
      body: [
        'The app sends every write to the primary and spreads reads across the replicas.',
        'The primary drops to 15% busy. Each replica handles 405 reads per second. Need more reads? Add another replica.',
      ],
      keyIdea: 'Replicas scale reads almost linearly. They do nothing for writes.',
      change: {
        add: {
          links: [
            { id: 'app-r1', from: 'app', to: 'r1' },
            { id: 'app-r2', from: 'app', to: 'r2' },
          ],
        },
        update: { nodes: [{ id: 'primary', health: 'healthy', sublabel: 'writes only' }] },
        flows: [
          reads('r1', 405),
          reads('r2', 405),
          writes('primary'),
          replicate('primary', 'r1'),
          replicate('primary', 'r2'),
        ],
        metrics: { p95LatencyMs: 110, errorRatePct: 0 },
      },
    },
    {
      id: 'lag',
      short: 'Lag',
      tag: 'IDEA',
      title: 'Replicas are always a little behind',
      body: [
        'The primary confirms a write before the replicas have it. The gap is <b>replication lag</b>.',
        'It is usually tens of milliseconds. Under heavy write load, or across regions, it can grow to seconds.',
      ],
      keyIdea: 'Asynchronous replicas show the past. Usually the very recent past.',
      change: {
        update: {
          nodes: [
            { id: 'r1', sublabel: `lag ${replicaLag[0]} ms` },
            { id: 'r2', sublabel: `lag ${replicaLag[1]} ms` },
          ],
        },
      },
    },
    {
      id: 'read-your-writes',
      short: 'Stale read',
      tag: 'PROBLEM',
      title: 'You saved it, but it is not there',
      body: [
        'A reader edits their display name and the page reloads. The write went to the primary. The read went to Replica 2, which has not caught up.',
        'They see the old name and assume the save failed.',
      ],
      keyIdea: 'Lag is harmless until a user reads something they just wrote.',
      change: { update: { nodes: [{ id: 'r2', sublabel: 'still has old name' }] } },
    },
    {
      id: 'route-writers',
      short: 'Fix reads',
      tag: 'SOLUTION',
      title: 'Read your own writes from the primary',
      body: [
        'After a user writes, send <b>their</b> reads to the primary for a few seconds. Everyone else keeps reading from replicas.',
        'A stricter option: remember the log position of the write, and only read from a replica that has reached it.',
      ],
      keyIdea: 'Route by who is asking. Fresh data for writers, cheap reads for everyone else.',
      change: {
        update: { nodes: [{ id: 'r2', sublabel: `lag ${replicaLag[1]} ms` }] },
        flows: [
          reads('r1', 385),
          reads('r2', 385),
          reads('primary', 40),
          writes('primary'),
          replicate('primary', 'r1'),
          replicate('primary', 'r2'),
        ],
      },
    },
    {
      id: 'try-it',
      short: 'Break it',
      tag: 'TRY IT',
      title: 'Push the databases',
      body: [
        'Press <b>Spike traffic</b>. Five times the readers arrive, and both replicas run hot while the primary barely notices.',
        'Reset, then press <b>Slow the database</b>. Every query waits longer, and a busy primary also falls further behind on replication.',
      ],
      keyIdea:
        'Read spikes land on replicas. That is good news: replicas are the easy part to add.',
      change: {},
      breakActions: ['spikeTraffic', 'slowDatabase'],
    },
    {
      id: 'primary-dies',
      short: 'Primary dies',
      tag: 'TRY IT',
      title: 'The primary goes down',
      body: [
        'Predict: if the primary dies, which requests fail, and for how long?',
        'Press <b>Kill the primary database</b>. Reads keep working on the replicas, but every write and every writer’s read fails: 130 of 900 a second, about <b>14%</b>. After about 4 seconds Replica 1 is promoted and errors return to <b>0%</b>, but p95 climbs to about <b>280 ms</b>: one fewer copy is now doing reads and writes.',
      ],
      keyIdea: 'Replicas keep reads alive. Writes wait for a new primary.',
      change: {},
      breakActions: ['killDatabase'],
    },
    {
      id: 'failover',
      short: 'Failover',
      tag: 'SOLUTION',
      title: 'Promote a replica',
      body: [
        'What you just saw is <b>failover</b>: pick the replica that is furthest ahead, Replica 1, and make it the new primary. Point writes at it and re-point the other replica.',
        'A fresh replica is built to replace the lost capacity. With good tooling this takes under a minute.',
      ],
      keyIdea:
        'Failover turns a replica into a primary. Any writes the old primary never shipped are lost.',
      change: {
        remove: { links: ['app-primary', 'primary-r1', 'primary-r2'], nodes: ['primary'] },
        add: {
          nodes: [
            {
              id: 'r3',
              kind: 'database',
              label: 'Replica 3',
              sublabel: 'new',
              x: 13,
              y: 6,
              capacity: 600,
            },
          ],
          links: [
            { id: 'r1-r2', from: 'r1', to: 'r2', style: 'dashed' },
            { id: 'r1-r3', from: 'r1', to: 'r3', style: 'dashed' },
            { id: 'app-r3', from: 'app', to: 'r3' },
          ],
        },
        update: { nodes: [{ id: 'r1', label: 'Primary', sublabel: 'promoted · writes' }] },
        flows: [
          reads('r2', 405),
          reads('r3', 405),
          writes('r1'),
          replicate('r1', 'r2'),
          replicate('r1', 'r3'),
        ],
        metrics: { errorRatePct: 0, p95LatencyMs: 110, healthy: [4, 4] },
      },
    },
    {
      id: 'sync-async',
      short: 'Sync?',
      tag: 'TRADE-OFF',
      title: 'Wait for replicas, or not?',
      body: [
        'With <b>asynchronous</b> replication the primary confirms immediately. Writes are fast, but a crash can lose the last few.',
        'With <b>synchronous</b> replication the primary waits for a replica to confirm. Nothing is lost, but every write pays an extra round trip. Many systems wait for just one replica.',
      ],
      keyIdea:
        'You choose between faster writes and never losing one. Waiting for one replica is a common middle ground.',
      change: {},
    },
    {
      id: 'styles',
      short: 'Styles',
      tag: 'IDEA',
      title: 'One leader, many leaders, or none',
      body: [
        'Everything here used <b>one leader</b>: simple, and every write has one home. <b>Multi-leader</b> setups accept writes in several regions, then must merge conflicting edits. <b>Leaderless</b> stores write to several copies at once and read from several, accepting an answer once enough agree.',
        'Replicas also serve quieter jobs: an analytics replica keeps heavy reports off the primary, and a delayed replica is an undo button for a bad delete.',
      ],
      keyIdea: 'More leaders mean more places to write, and more conflicts to resolve.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'More copies, more choices',
      body: [
        'Replicas multiplied read capacity and kept reads alive when the primary died. Failover restored writes.',
        'The cost is lag. Decide which reads must be fresh, and route those to the primary.',
      ],
      keyIdea: 'Replication buys read scale and resilience. You pay in consistency.',
      change: {},
    },
  ],
};

lesson.experiment = {
  stepId: 'lag',
  title: 'When can each replica serve the new name?',
  control: 'Time after the primary confirms',
  unit: 'ms',
  frames: [0, 20, ...replicaLag].map((time) => ({
    label: time + ' ms',
    rows: [
      { label: 'Replica 1 · wait remaining', value: Math.max(0, replicaLag[0] - time) },
      { label: 'Replica 2 · wait remaining', value: Math.max(0, replicaLag[1] - time) },
    ],
    caption:
      time < replicaLag[0]
        ? 'Both replicas still return the old name. The primary already has the write.'
        : time < replicaLag[1]
          ? 'Replica 1 can serve the new name. Replica 2 still returns the old one.'
          : 'Both replicas have applied the write.',
  })),
};

export default lesson;
