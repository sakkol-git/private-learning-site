import type { InfraLesson } from './index';

const APIS = ['api1', 'api2'];

const redirects = (withClicks: boolean) =>
  APIS.flatMap((id) => [
    { route: ['people', 'lb', id, 'cache'], kind: 'request' as const, ratePerSec: 1900 },
    { route: ['people', 'lb', id, 'db'], kind: 'request' as const, ratePerSec: 120 },
    ...(withClicks
      ? [
          {
            route: ['people', 'lb', id, 'clicks', 'counter'],
            kind: 'request' as const,
            ratePerSec: 2000,
          },
        ]
      : []),
  ]);

const lesson: InfraLesson = {
  slug: 'url-shortener',
  chapter: 'Case studies',
  title: 'Design a URL shortener',
  summary:
    'Short codes, a read-heavy redirect path, a cache that carries the load, and click analytics off to the side.',
  minutes: 12,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How to size a read-heavy service', stepId: 'estimate' },
    { text: 'How to generate short, unique codes', stepId: 'codes' },
    { text: 'Why the cache becomes load-bearing', stepId: 'cache-restart' },
    { text: 'How to count clicks without slowing redirects', stepId: 'analytics' },
  ],
  initial: {
    nodes: [
      { id: 'people', kind: 'users', label: 'People clicking', x: 0, y: 6 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 3.5, y: 6 },
      { id: 'api1', kind: 'server', label: 'Link API 1', x: 8, y: 2.5, capacity: 12000 },
      { id: 'api2', kind: 'server', label: 'Link API 2', x: 8, y: 9.5, capacity: 12000 },
      { id: 'db', kind: 'database', label: 'Links DB', x: 13.5, y: 12, capacity: 2000 },
    ],
    links: [
      { id: 'people-lb', from: 'people', to: 'lb' },
      ...APIS.map((id) => ({ id: `lb-${id}`, from: 'lb', to: id })),
      ...APIS.map((id) => ({ id: `${id}-db`, from: id, to: 'db' })),
    ],
    metrics: {
      users: 400000,
      requestsPerSec: 4040,
      p95LatencyMs: 30,
      errorRatePct: 0,
      healthy: [2, 2],
    },
  },
  steps: [
    {
      id: 'requirements',
      short: 'Needs',
      tag: 'IDEA',
      title: 'What it must do',
      body: [
        '<b>Snip</b> turns a long URL into a short one, such as <code>snip.example/x7Kp2Qa</code>, and redirects anyone who opens it. Optional: custom names and expiry dates.',
        'Redirects must be fast, under 50 ms, and must never send someone to the wrong page.',
      ],
      keyIdea: 'Start with the functions, then the qualities: speed, correctness, availability.',
      change: {},
    },
    {
      id: 'estimate',
      short: 'Numbers',
      tag: 'IDEA',
      title: 'Read-heavy by a hundred to one',
      body: [
        '100 million new links a month is about 40 writes a second. Each link is opened about 100 times, so about <b>4,000 redirects a second</b>.',
        'At 500 bytes a link, 5 years of links is 100M × 60 months × 500 B = about <b>3 TB</b>. Storage is easy; the read path is the design.',
      ],
      keyIdea: 'A 100:1 read/write ratio means: optimise reads, keep writes simple.',
      change: {},
    },
    {
      id: 'api-design',
      short: 'API',
      tag: 'IDEA',
      title: 'Two endpoints',
      body: [
        '<code>POST /links</code> with <code>{"url": "…"}</code> returns <code>{"code": "x7Kp2Qa"}</code>. <code>GET /x7Kp2Qa</code> answers <code>302 Found</code> with the long URL in the <code>Location</code> header.',
      ],
      keyIdea: 'A tiny API keeps the hot path tiny.',
      change: {},
    },
    {
      id: 'codes',
      short: 'Codes',
      tag: 'IDEA',
      title: 'Short and unique',
      body: [
        'Take a unique 64-bit id, from the unique-IDs lesson, and write it in base 62 (a–z, A–Z, 0–9). Seven characters give 62⁷ ≈ 3.5 trillion codes, enough for thousands of years at this rate.',
        'Scramble the id first, so codes are not guessable one after another. Hashing the URL instead risks collisions that must be checked on every write.',
      ],
      keyIdea: 'Encode a unique id; do not hash and hope.',
      change: {},
    },
    {
      id: 'read-path',
      short: 'Read path',
      tag: 'SOLUTION',
      title: 'Cache the hot links',
      body: [
        'A small share of links gets most clicks. An in-memory cache holds them: 95% of redirects are answered from it, 3,800 a second. Only 200 misses and 40 writes reach the database, 12% busy.',
        'p95 is about 30 ms.',
      ],
      keyIdea: 'Popular links live in memory; the database holds the long tail.',
      change: {
        add: {
          nodes: [
            { id: 'cache', kind: 'cache', label: 'Link cache', x: 13.5, y: 0, capacity: 50000 },
          ],
          links: APIS.map((id) => ({ id: `${id}-cache`, from: id, to: 'cache' })),
        },
        flows: redirects(false),
      },
    },
    {
      id: 'viral',
      short: 'Viral',
      tag: 'TRY IT',
      title: 'A link goes viral',
      body: [
        'Predict: a celebrity shares a Snip link and traffic jumps 5×.',
        'Press <b>Spike traffic 5×</b>. The APIs go from 17% to 84% busy and errors stay at <b>0%</b>; p95 rises to about 160 ms. The viral link is one cache entry, so the cache absorbs it.',
      ],
      keyIdea: 'Hot keys are good news for a read cache.',
      change: {},
      breakActions: ['spikeTraffic'],
    },
    {
      id: 'cache-restart',
      short: 'Restart',
      tag: 'TRY IT',
      title: 'The cache restarts',
      body: [
        'Predict: the cache server restarts during a normal day and comes back empty.',
        'Press <b>Expire many keys at once</b>. All 3,800 hits a second fall to a database sized for 2,000. Errors peak around <b>50%</b> until the cache refills over a few seconds. The cache is now load-bearing.',
      ],
      keyIdea: 'Once a cache carries most reads, losing it is an outage.',
      change: {},
      breakActions: ['expireCache'],
    },
    {
      id: 'cache-ha',
      short: 'Protect',
      tag: 'SOLUTION',
      title: 'Treat the cache like a database',
      body: [
        'Run the cache as a cluster with a replica per shard, so a restart loses one shard’s copy, not everything. Collapse identical misses into one database read, and give the database read replicas sized for a cold start.',
      ],
      keyIdea: 'A load-bearing cache needs redundancy and a plan for going cold.',
      change: { update: { nodes: [{ id: 'cache', sublabel: 'replicated · 3 shards' }] } },
    },
    {
      id: 'analytics',
      short: 'Clicks',
      tag: 'SOLUTION',
      title: 'Count clicks off the hot path',
      body: [
        'Owners want click counts. Writing a counter per redirect would add a database write to every click. Instead, each redirect drops an event in a queue, and a worker adds counts in batches.',
        'Using <code>302</code> rather than <code>301</code> matters here: browsers cache a 301 forever, so repeat clicks would never reach Snip to be counted.',
      ],
      keyIdea: 'Record events asynchronously; keep the redirect a single cache read.',
      change: {
        add: {
          nodes: [
            { id: 'clicks', kind: 'queue', label: 'Click events', x: 13.5, y: 6, value: 0 },
            {
              id: 'counter',
              kind: 'service',
              label: 'Click counter',
              x: 18,
              y: 6,
              capacity: 10000,
              tag: 'worker',
            },
          ],
          links: [
            ...APIS.map((id) => ({ id: `${id}-clicks`, from: id, to: 'clicks' })),
            { id: 'clicks-counter', from: 'clicks', to: 'counter' },
          ],
        },
        flows: redirects(true),
      },
    },
    {
      id: 'abuse',
      short: 'Abuse',
      tag: 'TRADE-OFF',
      title: 'Short links hide where they go',
      body: [
        'Short links are popular with phishing. Check new URLs against block lists, rate-limit link creation per account, and let people preview a link by adding <code>+</code> to it.',
        'Expired or removed links must miss the cache too, so deletes also invalidate.',
      ],
      keyIdea: 'A redirect service is a trust service; build in abuse checks.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Snip, end to end',
      body: [
        '40 writes and 4,000 redirects a second, 3 TB over 5 years. Base-62 codes from unique ids. A cache answers 95% of redirects and shrugged off a 5× viral spike, but an empty cache failed about half of requests, so it is replicated. Clicks are counted through a queue.',
      ],
      keyIdea: 'Estimate, keep the hot path to one cache read, and protect what carries the load.',
      change: {},
    },
  ],
};

export default lesson;
