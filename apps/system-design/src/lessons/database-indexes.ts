import type { InfraLesson } from './index';

const searches = [
  { route: ['agents', 'app', 'db'], kind: 'request' as const, ratePerSec: 40 },
  { route: ['dashboard', 'app', 'db'], kind: 'request' as const, ratePerSec: 5 },
];

const lesson: InfraLesson = {
  slug: 'database-indexes',
  chapter: 'Making reads fast',
  title: 'Database indexes',
  summary:
    'Why a search that reads every row falls over, and how an index finds one row in a few steps.',
  minutes: 9,
  level: 'beginner',
  youWillLearn: [
    { text: 'What a full table scan costs', stepId: 'full-scan' },
    { text: 'How a B-tree index finds rows quickly', stepId: 'b-tree' },
    { text: 'How column order decides which queries a composite index helps', stepId: 'composite' },
    { text: 'What every index costs on writes', stepId: 'write-cost' },
  ],
  initial: {
    nodes: [
      { id: 'agents', kind: 'users', label: 'Support agents', x: 0, y: 4 },
      {
        id: 'dashboard',
        kind: 'users',
        label: 'Ops dashboard',
        sublabel: 'refreshes',
        x: 0,
        y: 9,
        tag: 'noisy',
      },
      { id: 'app', kind: 'server', label: 'Help desk app', x: 5, y: 6, capacity: 1000 },
      {
        id: 'db',
        kind: 'database',
        label: 'Tickets DB',
        sublabel: '2M rows · no index',
        x: 10.5,
        y: 6,
        capacity: 60,
      },
    ],
    links: [
      { id: 'agents-app', from: 'agents', to: 'app' },
      { id: 'dashboard-app', from: 'dashboard', to: 'app' },
      { id: 'app-db', from: 'app', to: 'db' },
    ],
    metrics: {
      users: 120,
      requestsPerSec: 45,
      p95LatencyMs: 900,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'slow-search',
      short: 'Slow search',
      tag: 'PROBLEM',
      title: 'Finding one customer takes a second',
      body: [
        'Agents look up tickets by customer email, 40 times a second. The ops dashboard runs the same search 5 times a second. Each search takes about <b>900 ms</b> at p95.',
        'The database can only do about 60 of these searches a second, so it is already 75% busy.',
      ],
      keyIdea: 'A query that is slow on its own also eats capacity for everyone else.',
      change: { flows: searches },
    },
    {
      id: 'full-scan',
      short: 'Full scan',
      tag: 'IDEA',
      title: 'The database reads every row',
      body: [
        "With no index, the only way to find <code>email = 'ana@example.com'</code> is to check all 2 million rows: a <b>full table scan</b>.",
        'Twice the tickets means twice the work. The search gets slower every week the help desk is used.',
      ],
      keyIdea: 'Without an index, lookup cost grows with the size of the table.',
      change: {},
    },
    {
      id: 'flood',
      short: 'Flood',
      tag: 'TRY IT',
      title: 'The dashboard refreshes too often',
      body: [
        'Predict: someone sets the dashboard to refresh ten times as often. What happens to the agents?',
        'Press <b>One client floods</b>. The dashboard now sends 50 searches a second. With the agents’ 40, that is 90 for a database that can do 60, so about <b>a third</b> of the agents’ searches fail, and the ones that succeed take about <b>4.5 seconds</b>.',
      ],
      keyIdea: 'Expensive queries leave no headroom: a small extra load becomes an outage.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'add-index',
      short: 'Index',
      tag: 'SOLUTION',
      title: 'Add an index on email',
      body: [
        '<code>CREATE INDEX ON tickets (customer_email)</code> builds a sorted structure that points from each email to its rows.',
        'A search now reads 3 or 4 small pages instead of 2 million rows. p95 drops to about <b>30 ms</b>, and the same database can run about 3,000 searches a second.',
      ],
      keyIdea:
        'An index trades some disk and write work for lookups that barely grow with the table.',
      change: {
        update: { nodes: [{ id: 'db', sublabel: 'index on email', capacity: 3000 }] },
        metrics: { p95LatencyMs: 30 },
      },
    },
    {
      id: 'flood-again',
      short: 'Flood again',
      tag: 'TRY IT',
      title: 'Flood it again',
      body: [
        'Predict: same dashboard, same 50 searches a second. Now what?',
        'Press <b>One client floods</b>. The database handles 90 searches a second at 3% busy, and errors stay at <b>0%</b>. The index did not just speed up one query; it gave back the headroom.',
      ],
      keyIdea: 'Cheap queries make the whole system harder to knock over.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'b-tree',
      short: 'B-tree',
      tag: 'IDEA',
      title: 'How the index finds a row',
      body: [
        'Most databases use a <b>B-tree</b>: a short, wide tree of sorted pages. Each page holds hundreds of keys, so three levels cover millions of rows.',
        'Because keys are sorted, the same index also answers ranges and sorting, such as "emails starting with ana". A <b>hash index</b> is faster for exact matches but cannot do ranges.',
      ],
      keyIdea: 'A B-tree turns a search into a few page reads, and keeps keys in order.',
      change: {},
    },
    {
      id: 'composite',
      short: 'Composite',
      tag: 'IDEA',
      title: 'Column order matters',
      body: [
        'Agents also want "latest tickets for this customer". An index on <code>(customer_email, created_at)</code> finds the customer, then reads their tickets already in date order.',
        'It cannot help a query on <code>created_at</code> alone, just as a phone book sorted by surname cannot find everyone named Ana.',
      ],
      keyIdea: 'A composite index serves queries that start with its first column.',
      change: {},
    },
    {
      id: 'write-cost',
      short: 'Writes',
      tag: 'TRADE-OFF',
      title: 'Every index slows every write',
      body: [
        'Each new ticket must be added to the table and to every index on it. Five indexes can make inserts several times slower and take as much disk as the data.',
        'Index the queries you actually run. The query plan (<code>EXPLAIN</code>) shows whether an index is used or the database still scans.',
      ],
      keyIdea: 'Indexes speed reads and tax writes. Keep the ones your queries use.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Find, do not search',
      body: [
        'A full scan made each search cost 900 ms and left the database one bad dashboard away from failing. One index cut p95 to 30 ms and made the same flood harmless.',
      ],
      keyIdea: 'Design indexes around your queries, and check the plan.',
      change: {},
    },
  ],
};

export default lesson;
