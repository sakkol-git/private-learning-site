import type { InfraLesson } from './index';

const traffic = [
  { route: ['sensors', 'ingest', 'db'], kind: 'request' as const, ratePerSec: 3000 },
  { route: ['viewers', 'query', 'db'], kind: 'request' as const, ratePerSec: 50 },
];

const lesson: InfraLesson = {
  slug: 'storage-engines',
  chapter: 'Storing data',
  title: 'Storage engines',
  summary: 'How a database lays bytes on disk decides whether it is better at writes or reads.',
  minutes: 9,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How a B-tree updates pages in place', stepId: 'b-tree' },
    { text: 'How an LSM tree turns writes into appends', stepId: 'lsm' },
    { text: 'Why LSM reads check several files', stepId: 'read-path' },
    { text: 'What compaction is and what it costs', stepId: 'compaction' },
  ],
  initial: {
    nodes: [
      { id: 'sensors', kind: 'users', label: 'Sensors', sublabel: '3,000 devices', x: 0, y: 9 },
      { id: 'viewers', kind: 'users', label: 'Dashboards', x: 0, y: 3 },
      { id: 'ingest', kind: 'server', label: 'Ingest', x: 5, y: 9, capacity: 10000 },
      { id: 'query', kind: 'server', label: 'Query API', x: 5, y: 3, capacity: 500 },
      {
        id: 'db',
        kind: 'database',
        label: 'Readings DB',
        sublabel: 'B-tree',
        x: 10,
        y: 6,
        capacity: 3500,
      },
    ],
    links: [
      { id: 'sensors-ingest', from: 'sensors', to: 'ingest' },
      { id: 'viewers-query', from: 'viewers', to: 'query' },
      { id: 'ingest-db', from: 'ingest', to: 'db' },
      { id: 'query-db', from: 'query', to: 'db' },
    ],
    metrics: {
      users: 3050,
      requestsPerSec: 3050,
      p95LatencyMs: 250,
      errorRatePct: 0,
      healthy: [2, 2],
    },
  },
  steps: [
    {
      id: 'write-heavy',
      short: 'Writes',
      tag: 'PROBLEM',
      title: 'Three thousand writes a second',
      body: [
        'A greenhouse company stores a reading from each of 3,000 sensors every second. Dashboards query them 50 times a second.',
        'The database disk can do about 3,500 of these writes a second, so it is <b>87% busy</b> and p95 is 250 ms.',
      ],
      keyIdea: 'Write-heavy workloads are limited by how the engine writes to disk.',
      change: { flows: traffic },
    },
    {
      id: 'b-tree',
      short: 'B-tree',
      tag: 'IDEA',
      title: 'B-trees update pages in place',
      body: [
        'A <b>B-tree</b> keeps keys in sorted pages. Each write finds its page and rewrites it, wherever it sits on disk, and sometimes splits it in two.',
        'Writing a 50-byte reading can mean rewriting an 8 KB page: lots of small, scattered writes. Reads are excellent: a few page reads find any key.',
      ],
      keyIdea: 'B-trees are read-friendly; their writes are random and amplified.',
      change: {},
    },
    {
      id: 'lsm',
      short: 'LSM',
      tag: 'SOLUTION',
      title: 'Append now, sort later',
      body: [
        'An <b>LSM tree</b> (log-structured merge tree) appends each write to a log and an in-memory table. When the table fills, it is written out as one sorted file, in a single sequential write.',
        'Sequential writes are far cheaper. The same disk now absorbs about 35,000 writes a second: <b>9% busy</b>, and p95 drops to about 40 ms.',
      ],
      keyIdea: 'LSM engines turn many random writes into a few big sequential ones.',
      change: {
        update: { nodes: [{ id: 'db', sublabel: 'LSM tree', capacity: 35000 }] },
        metrics: { p95LatencyMs: 40 },
      },
    },
    {
      id: 'read-path',
      short: 'Reads',
      tag: 'IDEA',
      title: 'A read may check several files',
      body: [
        'The newest value for a key could be in memory or in any of several files. A read checks them from newest to oldest.',
        'A <b>Bloom filter</b> per file answers "definitely not here" without touching the disk, so most files are skipped.',
      ],
      keyIdea: 'LSM reads trade a little extra work for very fast writes.',
      change: {},
    },
    {
      id: 'compaction',
      short: 'Compaction',
      tag: 'IDEA',
      title: 'Compaction tidies up',
      body: [
        'Files pile up, and old versions of a key waste space. In the background, <b>compaction</b> merges files, keeps the newest value of each key and drops deleted ones.',
      ],
      keyIdea: 'Compaction keeps reads and disk use in check, using disk time to do it.',
      change: {},
    },
    {
      id: 'compaction-stall',
      short: 'Stall',
      tag: 'TRY IT',
      title: 'Compaction falls behind',
      body: [
        'A burst of writes leaves a long queue of files to merge. Compaction now competes with every query for the disk. Predict what dashboards feel.',
        'Press <b>Slow the database</b>. Every request touches this database, so p95 rises from about 40 ms to about <b>940 ms</b>. Nothing fails; everything waits.',
      ],
      keyIdea: 'Background work is still work. Leave the disk room for it.',
      change: {},
      breakActions: ['slowDatabase'],
    },
    {
      id: 'choose',
      short: 'Choose',
      tag: 'TRADE-OFF',
      title: 'Which engine when',
      body: [
        '<b>B-tree</b>: steady, fast reads and in-place updates; the default in most relational databases. <b>LSM</b>: fast writes and good compression, with compaction spikes and more work per read.',
        'For reports over many rows, <b>column-oriented</b> storage keeps each column together, so a sum over one column reads only that column.',
      ],
      keyIdea: 'Pick the engine for your read/write mix and your query shape.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Bytes on disk shape everything',
      body: [
        'Scattered page rewrites held the B-tree to 3,500 writes a second. An LSM engine took the same disk to about 35,000 by appending, at the cost of compaction and slightly harder reads.',
      ],
      keyIdea: 'Know your engine: it decides what is cheap.',
      change: {},
    },
  ],
};

export default lesson;
