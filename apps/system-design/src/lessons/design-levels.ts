import type { InfraLesson } from './index';

const traffic = [
  { route: ['people', 'lb', 'api1', 'cache'], kind: 'request' as const, ratePerSec: 120 },
  { route: ['people', 'lb', 'api2', 'cache'], kind: 'request' as const, ratePerSec: 120 },
  { route: ['people', 'lb', 'api1', 'db'], kind: 'request' as const, ratePerSec: 40 },
  { route: ['people', 'lb', 'api2', 'db'], kind: 'request' as const, ratePerSec: 40 },
];

const lesson: InfraLesson = {
  slug: 'design-levels',
  chapter: 'Foundations',
  title: 'High-level and low-level design',
  summary:
    'Two zoom levels for every system: the boxes and arrows, and what happens inside one box.',
  minutes: 8,
  level: 'beginner',
  youWillLearn: [
    { text: 'What a high-level design decides', stepId: 'the-map' },
    { text: 'What a low-level design decides', stepId: 'inside-a-box' },
    { text: 'How contracts connect the two', stepId: 'contracts' },
    { text: 'How a design session moves between them', stepId: 'top-down' },
  ],
  initial: {
    nodes: [{ id: 'people', kind: 'users', label: 'Readers', x: 0, y: 6 }],
    links: [],
    metrics: {
      users: 50_000,
      requestsPerSec: 0,
      p95LatencyMs: 0,
      errorRatePct: 0,
      healthy: [0, 0],
    },
  },
  steps: [
    {
      id: 'two-levels',
      short: 'Two levels',
      tag: 'IDEA',
      title: 'A map and a floor plan',
      body: [
        'You are designing <b>Shelfmark</b>, a service for saving and searching bookmarks. There are two kinds of question to answer.',
        '<b>High-level design</b> (HLD) picks the boxes and the arrows between them. <b>Low-level design</b> (LLD) decides what happens inside one box.',
      ],
      keyIdea: 'HLD is the city map. LLD is the floor plan of one building.',
      change: {},
    },
    {
      id: 'the-map',
      short: 'The map',
      tag: 'SOLUTION',
      title: 'Draw the boxes',
      body: [
        'Readers reach a load balancer, two stateless API servers, a cache for hot lists and a relational database.',
        'At about 320 requests per second, each API server is 40% busy. Three in four reads are answered by the cache.',
      ],
      keyIdea: 'HLD names the components, their responsibilities, and how data flows between them.',
      change: {
        add: {
          nodes: [
            { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4, y: 6 },
            { id: 'api1', kind: 'server', label: 'API 1', x: 8.5, y: 3.5, capacity: 400 },
            { id: 'api2', kind: 'server', label: 'API 2', x: 8.5, y: 8.5, capacity: 400 },
            {
              id: 'cache',
              kind: 'cache',
              label: 'Cache',
              sublabel: 'hot lists',
              x: 13,
              y: 2.5,
              capacity: 5000,
            },
            { id: 'db', kind: 'database', label: 'Bookmarks DB', x: 13, y: 9, capacity: 500 },
          ],
          links: [
            { id: 'people-lb', from: 'people', to: 'lb' },
            { id: 'lb-api1', from: 'lb', to: 'api1' },
            { id: 'lb-api2', from: 'lb', to: 'api2' },
            { id: 'api1-cache', from: 'api1', to: 'cache' },
            { id: 'api2-cache', from: 'api2', to: 'cache' },
            { id: 'api1-db', from: 'api1', to: 'db' },
            { id: 'api2-db', from: 'api2', to: 'db' },
          ],
        },
        flows: traffic,
        metrics: { requestsPerSec: 320, p95LatencyMs: 60, healthy: [2, 2] },
      },
    },
    {
      id: 'hld-choices',
      short: 'Trade-offs',
      tag: 'TRADE-OFF',
      title: 'HLD decisions are trade-offs',
      body: [
        'Relational or document store? Cache or not? Call the search index directly, or update it through a queue?',
        'Each choice trades speed, consistency, cost and simplicity. The HLD should say which was picked and why.',
      ],
      keyIdea: 'A high-level design is a set of written-down trade-offs, not just a picture.',
      change: {},
    },
    {
      id: 'inside-a-box',
      short: 'Zoom in',
      tag: 'IDEA',
      title: 'Zoom into the API',
      body: [
        'Inside one API box: the endpoints, the table <code>bookmarks(id, user_id, url, title, created_at)</code>, and an index on <code>(user_id, created_at)</code> so "my latest bookmarks" is one quick lookup.',
      ],
      keyIdea: 'LLD chooses schemas, indexes, data structures and algorithms for one component.',
      change: { update: { nodes: [{ id: 'api1', sublabel: 'endpoints · schema' }] } },
    },
    {
      id: 'lld-decisions',
      short: 'Details',
      tag: 'IDEA',
      title: 'Small decisions with big effects',
      body: [
        'Paginate with a cursor (the last <code>created_at</code> seen) rather than page numbers, so new bookmarks do not shift pages. Validate URLs once on write. Return clear error codes.',
      ],
      keyIdea: 'Many performance and correctness problems are LLD decisions made carelessly.',
      change: {},
    },
    {
      id: 'contracts',
      short: 'Contracts',
      tag: 'IDEA',
      title: 'Contracts are where the levels meet',
      body: [
        'Each arrow in the HLD becomes a contract in the LLD: <code>POST /bookmarks</code> returns <code>201</code> with the new id; <code>GET /bookmarks?after=…</code> returns up to 50 items.',
        'Agree contracts early and teams can build boxes in parallel.',
      ],
      keyIdea: 'Arrows become contracts: requests, responses, errors and limits.',
      change: {},
    },
    {
      id: 'capacity-check',
      short: 'Check',
      tag: 'TRY IT',
      title: 'Test an HLD assumption',
      body: [
        'The HLD assumed traffic stays near today’s. Predict what 5× would do to two servers at 40%.',
        'Press <b>Spike traffic 5×</b>. Each server would need to be 200% busy, so <b>half</b> of requests fail and p95 jumps to about <b>720 ms</b>. The database would be next: 5× its 80 reads a second is 80% of its limit. The HLD needs autoscaling or more headroom.',
      ],
      keyIdea: 'A good HLD states its capacity assumptions so they can be tested.',
      change: {},
      breakActions: ['spikeTraffic'],
    },
    {
      id: 'top-down',
      short: 'Top-down',
      tag: 'IDEA',
      title: 'How a design session flows',
      body: [
        'Requirements → rough numbers → HLD → pick the riskiest box → LLD for it → back to the HLD if something changed.',
        'Spend most time where the risk is: here, the API tier under 5× load, with the database close behind.',
      ],
      keyIdea: 'Move between levels: big picture first, then the details that could sink it.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Map first, then floor plans',
      body: [
        'HLD decides components and flows; LLD decides what happens inside them. Contracts join the two, and stated assumptions let you test both.',
      ],
      keyIdea: 'Design at two zoom levels, and keep them consistent.',
      change: {},
    },
  ],
};

export default lesson;
