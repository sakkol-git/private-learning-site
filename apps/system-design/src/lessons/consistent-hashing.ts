import type { InfraLesson } from './index';

const CACHES = ['c1', 'c2', 'c3', 'c4'];
const CACHE_Y = [1.5, 4.5, 7.5, 10.5];

const hits = (ids: string[]) =>
  ids.map((id) => ({
    route: ['shoppers', 'app', id],
    kind: 'request' as const,
    ratePerSec: 900 / ids.length,
  }));
const misses = { route: ['shoppers', 'app', 'db'], kind: 'request' as const, ratePerSec: 30 };

const lesson: InfraLesson = {
  slug: 'consistent-hashing',
  chapter: 'Data across machines',
  title: 'Consistent hashing',
  summary:
    'Add or remove a machine and move only a small share of keys, instead of nearly all of them.',
  minutes: 9,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Why mod N reshuffles almost every key', stepId: 'add-node' },
    { text: 'How a hash ring assigns keys', stepId: 'ring' },
    { text: 'How many keys move when a node joins', stepId: 'ring-join' },
    { text: 'What virtual nodes fix', stepId: 'virtual-nodes' },
  ],
  initial: {
    nodes: [
      { id: 'shoppers', kind: 'users', label: 'Shoppers', x: 0, y: 6 },
      { id: 'app', kind: 'server', label: 'Shop API', sublabel: '×4', x: 5, y: 6, capacity: 8000 },
      ...CACHES.slice(0, 3).map((id, i) => ({
        id,
        kind: 'cache' as const,
        label: `Cache ${i + 1}`,
        x: 10,
        y: CACHE_Y[i] ?? 0,
        capacity: 2000,
      })),
      { id: 'db', kind: 'database', label: 'Product DB', x: 5, y: 11, capacity: 500 },
    ],
    links: [
      { id: 'shoppers-app', from: 'shoppers', to: 'app' },
      ...CACHES.slice(0, 3).map((id) => ({ id: `app-${id}`, from: 'app', to: id })),
      { id: 'app-db', from: 'app', to: 'db' },
    ],
    metrics: {
      users: 9300,
      requestsPerSec: 930,
      p95LatencyMs: 20,
      errorRatePct: 0,
      healthy: [4, 4],
    },
  },
  steps: [
    {
      id: 'three-caches',
      short: 'Three',
      tag: 'IDEA',
      title: 'Keys spread with mod 3',
      body: [
        'Product details are cached on three nodes. The API sends each key to node <code>hash(key) mod 3</code>.',
        'Of 930 requests a second, 900 are hits, 300 per node. Only 30 misses reach the database, 6% busy.',
      ],
      keyIdea: 'A hash spreads keys evenly over a fixed number of nodes.',
      change: { flows: [...hits(['c1', 'c2', 'c3']), misses] },
    },
    {
      id: 'add-node',
      short: 'Add node',
      tag: 'PROBLEM',
      title: 'A fourth node changes almost everything',
      body: [
        'Before a big sale, a fourth cache node is added. The rule becomes <code>mod 4</code>, and for about three keys in four the answer changes.',
        'Those keys now point at a node that has never seen them. In effect, the whole cache has gone cold.',
      ],
      keyIdea: 'With mod N, changing N remaps roughly (N−1)/N of all keys.',
      change: {
        add: {
          nodes: [
            {
              id: 'c4',
              kind: 'cache',
              label: 'Cache 4',
              sublabel: 'new',
              x: 10,
              y: 10.5,
              capacity: 2000,
              tag: 'expires',
            },
          ],
          links: [{ id: 'app-c4', from: 'app', to: 'c4' }],
        },
        update: {
          nodes: ['c1', 'c2', 'c3'].map((id) => ({ id, tag: 'expires', sublabel: 'keys moved' })),
        },
        flows: [...hits(CACHES), misses],
      },
    },
    {
      id: 'mod-n-try',
      short: 'Try mod N',
      tag: 'TRY IT',
      title: 'Turn on the fourth node',
      body: [
        'Predict: if every remapped key misses, what does a database sized for 30 reads a second see?',
        'Press <b>Expire many keys at once</b>. All 900 hits become misses. The database gets 930 reads a second for 500 of capacity, so errors peak near <b>46%</b> until the caches refill.',
      ],
      keyIdea: 'Resizing a mod-N cluster is a self-inflicted stampede.',
      change: {},
      breakActions: ['expireCache'],
    },
    {
      id: 'ring',
      short: 'Ring',
      tag: 'IDEA',
      title: 'Put nodes and keys on a ring',
      body: [
        'Hash every node to a point on a circle of numbers, and every key too. A key belongs to the first node clockwise from it.',
        'Adding a node puts it at one point on the ring. It takes over only the keys between it and the node before it.',
      ],
      keyIdea: 'On a ring, a joining node takes one arc, not a share of every arc.',
      change: {},
    },
    {
      id: 'ring-join',
      short: 'Join',
      tag: 'SOLUTION',
      title: 'Join the ring',
      body: [
        'With consistent hashing, Cache 4 takes over about a quarter of the keys. Caches 1 to 3 keep everything else and stay warm.',
        'Only the new node’s keys start cold: 225 misses a second instead of 900.',
      ],
      keyIdea: 'Adding the Nth node moves about 1/N of the keys.',
      change: {
        update: {
          nodes: [
            ...['c1', 'c2', 'c3'].map((id) => ({ id, tag: 'warm', sublabel: 'keeps its keys' })),
            { id: 'c4', sublabel: 'took one arc' },
          ],
        },
      },
    },
    {
      id: 'ring-try',
      short: 'Try ring',
      tag: 'TRY IT',
      title: 'Turn on the fourth node again',
      body: [
        'Predict: only Cache 4 is cold this time.',
        'Press <b>Expire many keys at once</b>. 225 hits a second miss, the database sees 255 reads a second, about half its capacity. Errors stay at <b>0%</b>; p95 bumps briefly while Cache 4 warms.',
      ],
      keyIdea: 'Moving few keys keeps the database safe while the cluster grows.',
      change: {},
      breakActions: ['expireCache'],
    },
    {
      id: 'virtual-nodes',
      short: 'Virtual',
      tag: 'IDEA',
      title: 'Virtual nodes',
      body: [
        'With one point each, arcs come out uneven, and a node that leaves dumps all its keys on one neighbour. So each machine gets about 100 <b>virtual nodes</b> spread around the ring.',
        'Load evens out, and a departing machine’s keys spread across all the others.',
      ],
      keyIdea: 'Virtual nodes smooth the ring and share the work of a change.',
      change: {},
    },
    {
      id: 'limits',
      short: 'Limits',
      tag: 'TRADE-OFF',
      title: 'What the ring does not solve',
      body: [
        'A single very hot key still lands on one node. Every client must agree on which nodes are in the ring, or they route the same key differently.',
        'Databases built on rings also store each key on the next two or three nodes clockwise, so a lost node’s data still exists.',
      ],
      keyIdea: 'The ring limits movement. Hot keys and membership still need care.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Grow without going cold',
      body: [
        'Switching from mod 3 to mod 4 sent 900 misses a second to a database built for 500, failing about 46% of requests at peak. On a ring, only Cache 4’s 225 missed, and nothing failed.',
      ],
      keyIdea: 'Use consistent hashing wherever nodes come and go.',
      change: {},
    },
  ],
};

export default lesson;
