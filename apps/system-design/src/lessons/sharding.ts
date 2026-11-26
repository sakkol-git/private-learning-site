import type { InfraLesson } from './index';

const SHARDS = ['s1', 's2', 's3'];
const SHARD_Y = [2, 6, 10];

const posts = SHARDS.map((id) => ({
  route: ['people', 'app', id],
  kind: 'request' as const,
  ratePerSec: 500,
}));

const lesson: InfraLesson = {
  slug: 'sharding',
  chapter: 'Data across machines',
  title: 'Sharding',
  summary: 'When one database cannot take the writes, split the data so each machine owns a slice.',
  minutes: 10,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Why replicas do not help with too many writes', stepId: 'too-many-writes' },
    { text: 'How a shard key decides where data lives', stepId: 'shard-key' },
    { text: 'What a hot key does to one shard', stepId: 'hot-key' },
    { text: 'Why cross-shard queries and resharding are hard', stepId: 'cross-shard' },
  ],
  initial: {
    nodes: [
      { id: 'people', kind: 'users', label: 'Members', x: 0, y: 4 },
      { id: 'fans', kind: 'users', label: 'Fans of one star', x: 0, y: 9, tag: 'noisy' },
      {
        id: 'app',
        kind: 'server',
        label: 'Posts API',
        sublabel: '×6',
        x: 4.5,
        y: 6,
        capacity: 20000,
      },
      { id: 'db', kind: 'database', label: 'Posts DB', x: 10, y: 6, capacity: 1200 },
    ],
    links: [
      { id: 'people-app', from: 'people', to: 'app' },
      { id: 'fans-app', from: 'fans', to: 'app' },
      { id: 'app-db', from: 'app', to: 'db' },
    ],
    metrics: {
      users: 150000,
      requestsPerSec: 1500,
      p95LatencyMs: 1800,
      errorRatePct: 20,
      healthy: [6, 6],
    },
  },
  steps: [
    {
      id: 'too-many-writes',
      short: 'Too many',
      tag: 'PROBLEM',
      title: 'Writes outgrew the biggest machine',
      body: [
        'A community app stores posts, likes and comments: 1,500 writes a second. Its database, already the largest size on offer, manages about 1,200.',
        'One in five writes fails. Read replicas would not help: every replica must apply every write too.',
      ],
      keyIdea: 'Replication scales reads. Only splitting the data scales writes.',
      change: {
        update: { nodes: [{ id: 'db', health: 'degraded' }] },
        flows: [{ route: ['people', 'app', 'db'], kind: 'request', ratePerSec: 1500 }],
      },
    },
    {
      id: 'split',
      short: 'Split',
      tag: 'IDEA',
      title: 'Give each machine a slice',
      body: [
        '<b>Sharding</b> splits one big table into pieces, each on its own database. Every row belongs to exactly one shard, chosen from a <b>shard key</b>.',
        'Three shards that each manage 800 writes a second can take 2,400 together.',
      ],
      keyIdea: 'Shards divide both data and write load.',
      change: {},
    },
    {
      id: 'shard-key',
      short: 'Shard key',
      tag: 'SOLUTION',
      title: 'Shard by member id',
      body: [
        'The API computes <code>hash(member_id) mod 3</code> and sends each write to that shard. A member’s posts, likes and comments all live together.',
        'Each shard takes 500 writes a second, 63% busy. Errors drop to 0% and p95 to about 90 ms.',
      ],
      keyIdea: 'A good shard key spreads load evenly and keeps related data together.',
      change: {
        remove: { links: ['app-db'], nodes: ['db'] },
        add: {
          nodes: SHARDS.map((id, i) => ({
            id,
            kind: 'database' as const,
            label: `Shard ${i + 1}`,
            sublabel: `hash mod 3 = ${i}`,
            x: 10,
            y: SHARD_Y[i] ?? 0,
            capacity: 800,
          })),
          links: SHARDS.map((id) => ({ id: `app-${id}`, from: 'app', to: id })),
        },
        flows: [...posts, { route: ['fans', 'app', 's2'], kind: 'request', ratePerSec: 80 }],
        metrics: { p95LatencyMs: 90, errorRatePct: 0 },
      },
    },
    {
      id: 'routing',
      short: 'Routing',
      tag: 'IDEA',
      title: 'Someone must know where things live',
      body: [
        'Here the API holds the rule. Larger systems use a small <b>routing layer</b> or a lookup table, so shards can be moved without redeploying every caller.',
        'One star with a big following lives on Shard 2. Their fans read it 80 times a second, and it is now 73% busy.',
      ],
      keyIdea: 'Routing turns a key into a shard. Keep that rule in one place.',
      change: { update: { nodes: [{ id: 's2', sublabel: 'holds the star' }] } },
    },
    {
      id: 'hot-key',
      short: 'Hot key',
      tag: 'TRY IT',
      title: 'The star posts something big',
      body: [
        'Predict: fans pile in at ten times the usual rate. Do all shards suffer?',
        'Press <b>One client floods</b>. Shard 2 now gets 1,300 requests a second for 800 of capacity. Shards 1 and 3 are untouched, yet about <b>13%</b> of everyone else’s writes fail: the ones whose members happen to share Shard 2.',
      ],
      keyIdea: 'Sharding spreads keys, not popularity. One hot key can overload its shard.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'hot-fix',
      short: 'Cache it',
      tag: 'SOLUTION',
      title: 'Take hot reads off the shard',
      body: [
        'Popular posts are read far more than written, so the API caches them. Fan reads now go to the cache and never reach Shard 2.',
        'Press <b>One client floods</b> again: 800 fan reads a second land on the cache and errors stay at <b>0%</b>. For a hot key that is written a lot, such as a like counter, split it into several sub-keys and add them up on read.',
      ],
      keyIdea: 'Cache hot reads; split hot writes.',
      change: {
        add: {
          nodes: [
            { id: 'hot', kind: 'cache', label: 'Hot posts cache', x: 4.5, y: 11, capacity: 50000 },
          ],
          links: [{ id: 'app-hot', from: 'app', to: 'hot' }],
        },
        update: { nodes: [{ id: 's2', sublabel: 'hash mod 3 = 1' }] },
        flows: [...posts, { route: ['fans', 'app', 'hot'], kind: 'request', ratePerSec: 80 }],
      },
      breakActions: ['noisyClient'],
    },
    {
      id: 'cross-shard',
      short: 'Across',
      tag: 'TRADE-OFF',
      title: 'Queries that span shards',
      body: [
        '"Trending posts from everyone" now asks all three shards and merges the answers, so it is as slow as the slowest shard. A transaction that touches two members on different shards needs extra coordination.',
        'Pick the shard key so the queries you run most stay on one shard.',
      ],
      keyIdea: 'Every shard key makes some queries cheap and others scatter.',
      change: {},
    },
    {
      id: 'resharding',
      short: 'Reshard',
      tag: 'TRADE-OFF',
      title: 'Adding a fourth shard',
      body: [
        'With <code>mod 3</code> changed to <code>mod 4</code>, three in four members map to a different shard. Moving that much data while serving traffic is a project of weeks.',
        'Schemes such as consistent hashing, or many small fixed slices assigned to machines, make growth move far less data.',
      ],
      keyIdea: 'Plan for resharding before you need it.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Split by key',
      body: [
        'One database failed 20% of 1,500 writes a second. Three shards took them at 63% busy. A hot key still overloaded its shard until hot reads moved to a cache. Cross-shard queries and resharding are the price.',
      ],
      keyIdea: 'Shard when writes demand it, and choose the key with care.',
      change: {},
    },
  ],
};

export default lesson;
