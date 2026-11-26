import type { InfraLesson } from './index';

const edgeTraffic = (hits: number, misses: number) => [
  { route: ['viewers', 'edge'], kind: 'request' as const, ratePerSec: hits },
  { route: ['viewers', 'edge', 'origin', 'storage'], kind: 'request' as const, ratePerSec: misses },
];

const lesson: InfraLesson = {
  slug: 'content-delivery',
  chapter: 'Making reads fast',
  title: 'Content delivery networks',
  summary:
    'Copy files to servers near your users, so distance and your origin stop being the bottleneck.',
  minutes: 9,
  level: 'beginner',
  youWillLearn: [
    { text: 'Why distance dominates latency for far-away users', stepId: 'far-origin' },
    { text: 'How an edge cache answers from nearby', stepId: 'edge' },
    { text: 'What happens when the edge goes cold', stepId: 'purge' },
    { text: 'How versioned URLs and TTLs keep files fresh', stepId: 'versioned' },
    { text: 'What a CDN cannot cache', stepId: 'dynamic' },
  ],
  initial: {
    nodes: [
      { id: 'viewers', kind: 'users', label: 'Viewers', sublabel: 'another continent', x: 0, y: 6 },
      { id: 'origin', kind: 'server', label: 'Origin', x: 9.5, y: 6, capacity: 300 },
      { id: 'storage', kind: 'database', label: 'File storage', x: 14, y: 6, capacity: 3000 },
    ],
    links: [
      { id: 'viewers-origin', from: 'viewers', to: 'origin' },
      { id: 'origin-storage', from: 'origin', to: 'storage' },
    ],
    metrics: {
      users: 2500,
      requestsPerSec: 250,
      p95LatencyMs: 420,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'far-origin',
      short: 'Far away',
      tag: 'PROBLEM',
      title: 'Every file crosses an ocean',
      body: [
        '<b>Trailhead</b>, a hiking-guide site, runs one origin server. Most readers are on another continent, 150 ms away per round trip.',
        'A page needs a connection, a TLS handshake and then its files: p95 is <b>420 ms</b> before the browser draws anything. The origin is also 83% busy serving the same photos again and again.',
      ],
      keyIdea: 'For far-away users, round trips cost more than the server work.',
      change: {
        flows: [{ route: ['viewers', 'origin', 'storage'], kind: 'request', ratePerSec: 250 }],
      },
    },
    {
      id: 'edge',
      short: 'Edge',
      tag: 'SOLUTION',
      title: 'Put a copy near the readers',
      body: [
        'A <b>CDN</b> runs edge servers in hundreds of cities. A reader connects to the nearest edge, 10 ms away. If the edge has the file (a hit), it answers at once; if not, it fetches from the origin once and keeps a copy.',
        'Traffic has since doubled to 500 requests a second. Nine in ten are hits, so the origin sees just 50, and p95 falls to about <b>60 ms</b>.',
      ],
      keyIdea: 'A CDN is a cache placed close to users, shared by everyone nearby.',
      change: {
        remove: { links: ['viewers-origin'] },
        add: {
          nodes: [
            {
              id: 'edge',
              kind: 'cdn',
              label: 'CDN edge',
              sublabel: '10 ms away',
              x: 4.5,
              y: 6,
              capacity: 50000,
            },
          ],
          links: [
            { id: 'viewers-edge', from: 'viewers', to: 'edge' },
            { id: 'edge-origin', from: 'edge', to: 'origin' },
          ],
        },
        flows: edgeTraffic(450, 50),
        metrics: { users: 5000, requestsPerSec: 500, p95LatencyMs: 60 },
      },
    },
    {
      id: 'hit-ratio',
      short: 'Hit ratio',
      tag: 'IDEA',
      title: 'Not everything caches equally',
      body: [
        'Photos, scripts and fonts are the same for everyone: they hit about 98% of the time. Article pages change now and then and hit less often. Together they average 90% here.',
        'The origin’s load is the miss rate: 10% of 500 is 50 requests a second.',
      ],
      keyIdea: 'Origin load = total traffic × miss rate.',
      change: { update: { nodes: [{ id: 'edge', sublabel: '90% hits' }] } },
    },
    {
      id: 'purge',
      short: 'Purge',
      tag: 'TRY IT',
      title: 'Empty the edge',
      body: [
        'Someone purges every file from the CDN to fix one typo. Predict: what does the origin, built for 300 requests a second, see next?',
        'Press <b>Expire many keys at once</b>. All 500 requests a second fall through to the origin. Errors peak at about <b>40%</b> and p95 jumps to about <b>1 second</b>, until the edge refills over the next 4 seconds.',
      ],
      keyIdea:
        'Behind a CDN, the origin is sized for misses. A full purge removes that protection.',
      change: {},
      breakActions: ['expireCache'],
    },
    {
      id: 'versioned',
      short: 'Versions',
      tag: 'SOLUTION',
      title: 'Change the name, not the file',
      body: [
        'Give each build its own file name, like <code>app.3f9a.js</code>, and let edges keep it for a year. A new release uses a new name, so nothing needs purging.',
        'Pages that must stay fresh get a short TTL, such as 60 seconds, and only the changed page is purged.',
      ],
      keyIdea: 'Versioned names make long caching safe. Purge narrowly, never everything.',
      change: { update: { nodes: [{ id: 'edge', sublabel: 'files 1 yr · pages 60 s' }] } },
    },
    {
      id: 'dynamic',
      short: 'Dynamic',
      tag: 'TRADE-OFF',
      title: 'Personal pages still go home',
      body: [
        'A reader’s saved trails are different for everyone, so the edge cannot answer them. They still travel to the origin.',
        'The edge still helps: it ends the TLS handshake nearby and keeps a warm connection to the origin, saving two of the long round trips.',
      ],
      keyIdea: 'Cache what is shared. For personal data, the edge can only shorten the trip.',
      change: {},
    },
    {
      id: 'shield',
      short: 'Shield',
      tag: 'IDEA',
      title: 'Many edges, one origin',
      body: [
        'With 200 edge cities, a new file could be fetched 200 times. A mid-tier <b>origin shield</b> sits between the edges and the origin, so a new file is fetched from the origin once and then shared.',
      ],
      keyIdea: 'A shield layer turns many edge misses into one origin request.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Closer and lighter',
      body: [
        'The CDN cut p95 from 420 ms to about 60 and the origin’s load from 250 requests a second to 50, even with traffic doubled. Versioned names keep files fresh without purges, and personal pages still need the origin.',
      ],
      keyIdea: 'Move shared bytes close to users, and size the origin for the misses.',
      change: {},
    },
  ],
};

export default lesson;
