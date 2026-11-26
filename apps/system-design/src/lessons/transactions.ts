import type { InfraLesson } from './index';

const buys = ['app1', 'app2'].map((id) => ({
  route: ['fans', 'lb', id, 'db'],
  kind: 'request' as const,
  ratePerSec: 150,
}));

const lesson: InfraLesson = {
  slug: 'transactions',
  chapter: 'Storing data',
  title: 'Transactions',
  summary:
    'Group several changes so they all happen or none do, even when two people want the same seat.',
  minutes: 10,
  level: 'intermediate',
  youWillLearn: [
    { text: 'What atomic, consistent, isolated and durable mean', stepId: 'acid' },
    { text: 'Why a crash mid-purchase is safe inside a transaction', stepId: 'crash' },
    { text: 'What isolation levels allow and prevent', stepId: 'isolation' },
    { text: 'Pessimistic locks versus optimistic checks', stepId: 'optimistic' },
  ],
  initial: {
    nodes: [
      { id: 'fans', kind: 'users', label: 'Fans', x: 0, y: 6 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4, y: 6 },
      { id: 'app1', kind: 'server', label: 'Tickets 1', x: 8.5, y: 3.5, capacity: 400 },
      { id: 'app2', kind: 'server', label: 'Tickets 2', x: 8.5, y: 8.5, capacity: 400 },
      { id: 'db', kind: 'database', label: 'Seats DB', x: 13, y: 6, capacity: 1500 },
    ],
    links: [
      { id: 'fans-lb', from: 'fans', to: 'lb' },
      { id: 'lb-app1', from: 'lb', to: 'app1' },
      { id: 'lb-app2', from: 'lb', to: 'app2' },
      { id: 'app1-db', from: 'app1', to: 'db' },
      { id: 'app2-db', from: 'app2', to: 'db' },
    ],
    metrics: {
      users: 3000,
      requestsPerSec: 300,
      p95LatencyMs: 90,
      errorRatePct: 0,
      healthy: [2, 2],
    },
  },
  steps: [
    {
      id: 'double-booked',
      short: 'Problem',
      tag: 'PROBLEM',
      title: 'Two fans, one seat',
      body: [
        'Fans buy concert seats at 300 purchases a second. Two of them click seat 14F at the same moment. Both servers read "14F is free", both charge a card, both write "sold".',
        'One seat, two tickets, one very angry fan at the door.',
      ],
      keyIdea: 'Read, then write, is not safe when two requests overlap.',
      change: { flows: buys },
    },
    {
      id: 'acid',
      short: 'ACID',
      tag: 'IDEA',
      title: 'A transaction is all or nothing',
      body: [
        'A <b>transaction</b> wraps the steps (hold the seat, charge, issue the ticket) into one unit.',
        '<b>Atomic</b>: all steps happen or none. <b>Consistent</b>: rules such as "one owner per seat" hold afterwards. <b>Isolated</b>: overlapping transactions do not see each other’s half-done work. <b>Durable</b>: once committed, it survives a crash.',
      ],
      keyIdea: 'ACID lets you reason about one purchase at a time.',
      change: { update: { nodes: [{ id: 'db', sublabel: 'BEGIN … COMMIT' }] } },
    },
    {
      id: 'crash',
      short: 'Crash',
      tag: 'TRY IT',
      title: 'Crash a server mid-purchase',
      body: [
        'Predict: a server dies halfway through purchases. Are some cards charged for seats that were never booked?',
        'Press <b>Kill a server</b>. Half of purchases (<b>50%</b>) fail for about 3 seconds, then Tickets 1 takes all 300 a second. Each failed purchase was an unfinished transaction, so the database rolled it back: no charge without a seat. Fans simply retry.',
      ],
      keyIdea: 'Atomicity turns a crash into a clean failure that is safe to retry.',
      change: {},
      breakActions: ['killServer'],
    },
    {
      id: 'conditional',
      short: 'Claim',
      tag: 'SOLUTION',
      title: 'Claim the seat in one statement',
      body: [
        "<code>UPDATE seats SET owner = 42 WHERE id = '14F' AND owner IS NULL</code>. The database checks and sets in one step. If it reports 1 row changed, you got the seat; 0 rows, someone beat you.",
        'Or lock the row first with <code>SELECT … FOR UPDATE</code>, so the second buyer waits until the first commits.',
      ],
      keyIdea: 'Let the database do check-and-set atomically, instead of reading then writing.',
      change: {},
    },
    {
      id: 'isolation',
      short: 'Isolation',
      tag: 'IDEA',
      title: 'How isolated is isolated?',
      body: [
        '<b>Read committed</b> hides uncommitted changes but allows lost updates. <b>Snapshot</b> gives each transaction a frozen view, which still allows write skew: two doctors each go off call because each saw the other on call. <b>Serializable</b> behaves as if transactions ran one by one.',
      ],
      keyIdea: 'Weaker isolation is faster and allows specific anomalies. Know which ones.',
      change: {},
    },
    {
      id: 'optimistic',
      short: 'Optimistic',
      tag: 'IDEA',
      title: 'Lock first, or check at the end',
      body: [
        '<b>Pessimistic</b>: lock what you will change, others wait. <b>Optimistic</b>: read a version number, and write only if it is unchanged; otherwise retry.',
        'Optimistic is cheaper when conflicts are rare, such as editing your own profile. Locking is better when they are common.',
      ],
      keyIdea: 'Pick by how often transactions collide.',
      change: {},
    },
    {
      id: 'hot-row',
      short: 'Hot row',
      tag: 'TRADE-OFF',
      title: 'Ten thousand fans, one row',
      body: [
        'When a famous band releases its last 100 seats, thousands of transactions queue on the same few rows. Each waits for the lock ahead of it, and p95 climbs into seconds.',
        'Busy systems put buyers in a waiting room or hand out reservations from a queue, so the database sees a steady line instead of a crowd.',
      ],
      keyIdea:
        'Correctness on a hot row costs waiting. Shape the traffic before it reaches the lock.',
      change: {},
    },
    {
      id: 'durable',
      short: 'Durable',
      tag: 'IDEA',
      title: 'Committed means on disk',
      body: [
        'Before saying "committed", the database appends the change to a <b>write-ahead log</b> and flushes it to disk. After a crash it replays the log.',
        'That flush is often the slowest part of a commit, which is why databases group several commits into one flush.',
      ],
      keyIdea: 'Durability is a log write you wait for.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'One unit of work',
      body: [
        'Transactions made purchases all-or-nothing, so a crash left no half-sold seats. Atomic check-and-set stopped double booking. Isolation level, locking style and hot rows decide how much waiting that safety costs.',
      ],
      keyIdea: 'Use transactions for anything that must not half-happen.',
      change: {},
    },
  ],
};

export default lesson;
