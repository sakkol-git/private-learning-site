import type { InfraAction, InfraMetrics } from '@ss/diagram-engine';
import type { DiagramLesson } from '@ss/lesson-engine';

/** Product-page reads: `hits` answered by the cache, `misses` fall through to the database. */
const reads = (hits: number, misses: number) => [
  { route: ['users', 'app', 'cache'], kind: 'request' as const, ratePerSec: hits },
  { route: ['users', 'app', 'db'], kind: 'request' as const, ratePerSec: misses },
];

const lesson: DiagramLesson<InfraMetrics, InfraAction> = {
  slug: 'caching',
  chapter: 'Scaling',
  title: 'Caching',
  summary: 'Answer repeat questions from memory, and learn the three ways a cache can bite back.',
  minutes: 9,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How the cache-aside pattern works', stepId: 'cache-aside' },
    { text: 'Why hit rate is the number to watch', stepId: 'hit-rate' },
    { text: 'How TTLs and invalidation keep data fresh', stepId: 'invalidate' },
    { text: 'What a cache stampede is and how to stop one', stepId: 'single-flight' },
  ],
  initial: {
    nodes: [
      { id: 'users', kind: 'users', label: 'Shoppers', x: 0, y: 6 },
      {
        id: 'app',
        kind: 'server',
        label: 'App servers',
        sublabel: '×4',
        x: 5,
        y: 6,
        capacity: 1200,
      },
      { id: 'db', kind: 'database', label: 'Product DB', x: 11, y: 6, capacity: 400 },
    ],
    links: [
      { id: 'users-app', from: 'users', to: 'app' },
      { id: 'app-db', from: 'app', to: 'db' },
    ],
    metrics: {
      users: 3500,
      requestsPerSec: 350,
      p95LatencyMs: 140,
      errorRatePct: 0,
      healthy: [4, 4],
    },
  },
  steps: [
    {
      id: 'db-strain',
      short: 'Strain',
      tag: 'PROBLEM',
      title: 'The database answers the same question all day',
      body: [
        'Every product page runs the same query: name, price, photos, stock. At 350 requests per second the database is <b>88% busy</b>.',
        'The app servers are fine. The database is the bottleneck, and it is the hardest part to scale.',
      ],
      keyIdea: 'When one tier is saturated, adding capacity elsewhere does not help.',
      change: {
        update: { nodes: [{ id: 'db', health: 'degraded' }] },
        flows: [{ route: ['users', 'app', 'db'], kind: 'request', ratePerSec: 350 }],
        metrics: { p95LatencyMs: 420 },
      },
    },
    {
      id: 'repeat-reads',
      short: 'Repeats',
      tag: 'IDEA',
      title: 'Most requests ask for the same few things',
      body: [
        'Look at the logs: 80% of views go to the 200 most popular products. Those rows rarely change.',
        'Reading them from memory takes under a millisecond. Reading them from the database takes 20 to 40.',
      ],
      keyIdea: 'Caching pays off when reads repeat and data changes slowly.',
      change: { update: { nodes: [{ id: 'db', sublabel: 'same 200 rows, again' }] } },
    },
    {
      id: 'cache-aside',
      short: 'Cache-aside',
      tag: 'SOLUTION',
      title: 'Check the cache first',
      body: [
        'Add an in-memory <b>cache</b> beside the app. On each request the app asks the cache first.',
        'On a <b>hit</b>, it answers straight away. On a <b>miss</b>, it reads the database, stores the result in the cache, then answers. This is called cache-aside.',
      ],
      keyIdea:
        'In cache-aside the app owns the logic: read cache, fall back to the database, fill the cache.',
      change: {
        add: {
          nodes: [
            {
              id: 'cache',
              kind: 'cache',
              label: 'Cache',
              sublabel: 'in memory',
              x: 11,
              y: 1.5,
              capacity: 20000,
            },
          ],
          links: [{ id: 'app-cache', from: 'app', to: 'cache' }],
        },
        update: { nodes: [{ id: 'db', health: 'healthy', sublabel: '' }] },
        flows: reads(280, 70),
        metrics: { p95LatencyMs: 70 },
      },
    },
    {
      id: 'hit-rate',
      short: 'Hit rate',
      tag: 'IDEA',
      title: 'Hit rate is the number that matters',
      body: [
        'As the cache warms up, the hit rate climbs from 80% to 96%. The database now sees only 14 requests per second.',
        'Small changes in hit rate are large changes in database load. Going from 90% to 99% cuts misses by a factor of ten.',
      ],
      keyIdea: 'Database load is proportional to misses, so track 1 − hit rate, not hit rate.',
      change: { flows: reads(336, 14), metrics: { p95LatencyMs: 32 } },
    },
    {
      id: 'slow-db',
      short: 'Slow DB',
      tag: 'TRY IT',
      title: 'Slow the database down',
      body: [
        'Press <b>Slow the database</b>. Queries now take almost a second.',
        'p95 hardly moves. Only 4 in 100 requests reach the database, and p95 ignores the slowest 5%. Users with a cache miss still feel it.',
      ],
      keyIdea: 'A good cache hides a slow database from most users, but not from all of them.',
      change: {},
      breakActions: ['slowDatabase', 'spikeTraffic'],
    },
    {
      id: 'ttl',
      short: 'TTL',
      tag: 'TRADE-OFF',
      title: 'Cached data goes stale',
      body: [
        'A price changes in the database. The cache still holds the old price and keeps serving it.',
        'A <b>TTL</b> (time to live) makes each entry expire after, say, 60 seconds. Shorter TTLs mean fresher data and more misses.',
      ],
      keyIdea: 'Every cache trades freshness for speed. The TTL is where you set that trade.',
      change: { update: { nodes: [{ id: 'cache', sublabel: 'TTL 60 s' }] } },
    },
    {
      id: 'invalidate',
      short: 'Invalidate',
      tag: 'SOLUTION',
      title: 'Delete the entry when the data changes',
      body: [
        'When an editor updates a price, the app writes to the database and then <b>deletes</b> that product from the cache.',
        'The next read misses and fetches the new price. Deleting is safer than overwriting: two writes racing to update the cache can leave the older value behind.',
      ],
      keyIdea: 'On write, invalidate. Let the next read refill the cache.',
      change: {
        add: {
          nodes: [{ id: 'editor', kind: 'users', label: 'Editors', x: 1, y: 1.5 }],
          links: [{ id: 'editor-app', from: 'editor', to: 'app' }],
        },
        flows: [
          ...reads(336, 14),
          { route: ['editor', 'app', 'db'], kind: 'request', ratePerSec: 2 },
          { route: ['editor', 'app', 'cache'], kind: 'request', ratePerSec: 2 },
        ],
      },
    },
    {
      id: 'stampede',
      short: 'Stampede',
      tag: 'PROBLEM',
      title: 'A popular entry expires',
      body: [
        'The homepage entry expires at noon. In the next 50 ms, hundreds of requests all miss at once.',
        'Each one queries the database for the same row. The database chokes on a crowd it never normally sees. This is a <b>cache stampede</b>.',
      ],
      keyIdea:
        'A cache protects the database only while it is warm. Mass expiry removes the shield all at once.',
      change: {
        update: {
          nodes: [
            { id: 'cache', sublabel: 'hot key expired' },
            { id: 'db', health: 'degraded' },
          ],
        },
        flows: [
          ...reads(40, 310),
          { route: ['editor', 'app', 'db'], kind: 'request', ratePerSec: 2 },
        ],
        metrics: { p95LatencyMs: 980, errorRatePct: 2.5 },
      },
    },
    {
      id: 'single-flight',
      short: 'Fix it',
      tag: 'SOLUTION',
      title: 'Let one request refill the entry',
      body: [
        'With a short lock, the first miss refills the entry while the others wait a few milliseconds or get the previous value.',
        'Add a little random jitter to each TTL, too, so popular entries do not all expire in the same second.',
      ],
      keyIdea: 'Collapse identical misses into one database read, and spread out expiry times.',
      change: {
        update: {
          nodes: [
            { id: 'cache', sublabel: 'TTL 60 s ± jitter' },
            { id: 'db', health: 'healthy' },
          ],
        },
        flows: [
          ...reads(336, 14),
          { route: ['editor', 'app', 'db'], kind: 'request', ratePerSec: 2 },
        ],
        metrics: { p95LatencyMs: 32, errorRatePct: 0 },
      },
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Fast, mostly fresh, and protected',
      body: [
        'Cache-aside took the database from 88% busy to under 5%, and cut p95 from 420 ms to about 30.',
        'In return you manage staleness with TTLs and invalidation, and guard against stampedes when hot entries expire.',
      ],
      keyIdea:
        'A cache is a copy of data. Every caching problem is a question of when the copy is wrong.',
      change: {},
    },
  ],
};

export default lesson;
