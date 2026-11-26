import type { InfraLesson } from './index';

const plays = { route: ['listeners', 'api', 'db'], kind: 'request' as const, ratePerSec: 400 };

const lesson: InfraLesson = {
  slug: 'batch-and-stream',
  chapter: 'Bigger architectures',
  title: 'Batch and stream processing',
  summary:
    'Crunch yesterday’s data in big batches, or update answers as events arrive, without hurting the live app.',
  minutes: 10,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Why heavy reports should not run on the live database', stepId: 'report-try' },
    { text: 'How batch jobs split, retry and re-run work', stepId: 'batch' },
    { text: 'How stream processing keeps numbers fresh', stepId: 'stream' },
    { text: 'When to choose batch, stream or both', stepId: 'both' },
  ],
  initial: {
    nodes: [
      { id: 'listeners', kind: 'users', label: 'Listeners', x: 0, y: 3 },
      { id: 'job', kind: 'users', label: 'Nightly royalty job', x: 0, y: 9, tag: 'noisy' },
      { id: 'api', kind: 'server', label: 'Music API', x: 5, y: 3, capacity: 2000 },
      { id: 'db', kind: 'database', label: 'Plays DB', x: 10, y: 6, capacity: 600 },
    ],
    links: [
      { id: 'listeners-api', from: 'listeners', to: 'api' },
      { id: 'api-db', from: 'api', to: 'db' },
      { id: 'job-db', from: 'job', to: 'db' },
    ],
    metrics: {
      users: 40000,
      requestsPerSec: 440,
      p95LatencyMs: 70,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'two-needs',
      short: 'Two needs',
      tag: 'IDEA',
      title: 'Two kinds of question',
      body: [
        'A music service records every play. Once a month it pays artists by play count: big, exact, can wait. On the home screen it shows "trending now": small, approximate, must be fresh.',
      ],
      keyIdea:
        'Batch answers big questions about the past; streams answer small questions about now.',
      change: {
        flows: [plays, { route: ['job', 'db'], kind: 'request', ratePerSec: 40 }],
      },
    },
    {
      id: 'on-prod',
      short: 'On prod',
      tag: 'PROBLEM',
      title: 'The report runs on the live database',
      body: [
        'The royalty job reads the plays table on the same database that serves listeners, 40 heavy queries a second, at night when it is quiet.',
        'The database is 73% busy at night. Month-end needs much more.',
      ],
      keyIdea: 'Analytics on the live database competes with users for the same disk.',
      change: {},
    },
    {
      id: 'report-try',
      short: 'Month end',
      tag: 'TRY IT',
      title: 'The month-end run',
      body: [
        'Predict: the month-end job does ten times the work. Do listeners notice?',
        'Press <b>One client floods</b>. The database gets 800 queries a second for 600 of capacity, and about <b>25%</b> of listeners’ requests fail.',
      ],
      keyIdea: 'Never let reports and users share a database at their peaks.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'batch',
      short: 'Batch',
      tag: 'SOLUTION',
      title: 'Batch on a copy',
      body: [
        'Each night, the day’s plays are copied to a <b>warehouse</b> built for big scans. The job splits the month into chunks (one per day per region), processes them in parallel, retries any chunk that fails, and writes totals.',
        'A bug in the maths? Fix it and re-run the whole month from the raw data.',
      ],
      keyIdea: 'Batch: read a fixed input, split it, retry pieces, and re-run when needed.',
      change: {
        remove: { links: ['job-db'] },
        add: {
          nodes: [
            {
              id: 'warehouse',
              kind: 'database',
              label: 'Warehouse',
              sublabel: 'nightly copy',
              x: 14.5,
              y: 9,
              capacity: 2000,
            },
          ],
          links: [
            { id: 'db-warehouse', from: 'db', to: 'warehouse', style: 'dashed' },
            { id: 'job-warehouse', from: 'job', to: 'warehouse' },
          ],
        },
        flows: [
          plays,
          { route: ['job', 'warehouse'], kind: 'request', ratePerSec: 40 },
          { route: ['db', 'warehouse'], kind: 'response', ratePerSec: 40 },
        ],
      },
    },
    {
      id: 'batch-try',
      short: 'Month end',
      tag: 'TRY IT',
      title: 'Month-end on the warehouse',
      body: [
        'Predict: the same tenfold month-end run.',
        'Press <b>One client floods</b>. The warehouse does the heavy lifting and listeners stay at <b>0%</b> errors.',
      ],
      keyIdea: 'Separate stores for serving and for analysis.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'stream',
      short: 'Stream',
      tag: 'SOLUTION',
      title: 'Count plays as they happen',
      body: [
        'For "trending now", the API also writes each play to an <b>event log</b>. A <b>stream processor</b> reads it and keeps a count per song over the last 10 minutes, updated every second.',
        'It saves its position in the log regularly, a <b>checkpoint</b>, so after a crash it resumes instead of starting over.',
      ],
      keyIdea: 'Stream processing updates small answers continuously from an event log.',
      change: {
        add: {
          nodes: [
            { id: 'log', kind: 'queue', label: 'Play events', x: 10, y: 0, value: 0 },
            {
              id: 'proc',
              kind: 'service',
              label: 'Stream processor',
              sublabel: 'trending now',
              x: 14.5,
              y: 0,
              capacity: 1000,
              tag: 'worker',
            },
          ],
          links: [
            { id: 'api-log', from: 'api', to: 'log' },
            { id: 'log-proc', from: 'log', to: 'proc' },
          ],
        },
        flows: [
          plays,
          { route: ['listeners', 'api', 'log', 'proc'], kind: 'request', ratePerSec: 400 },
          { route: ['job', 'warehouse'], kind: 'request', ratePerSec: 40 },
          { route: ['db', 'warehouse'], kind: 'response', ratePerSec: 40 },
        ],
      },
    },
    {
      id: 'stream-try',
      short: 'Stop it',
      tag: 'TRY IT',
      title: 'The processor stops',
      body: [
        'Predict: the stream processor crashes. Do plays fail?',
        'Press <b>Stop the workers</b>. Errors stay at <b>0%</b>. Unread events pile up in the log, 400 a second, and "trending now" goes stale. When the processor restarts from its checkpoint, it catches up.',
      ],
      keyIdea: 'A durable log lets a stream consumer stop and resume without losing events.',
      change: {},
      breakActions: ['stopWorkers'],
    },
    {
      id: 'windows',
      short: 'Windows',
      tag: 'IDEA',
      title: 'Time is tricky in streams',
      body: [
        'A phone offline on a train sends its plays 20 minutes late. Should they count toward "the last 10 minutes"? Streams group events into <b>windows</b> by when they happened, and wait a little for late arrivals before closing each window.',
      ],
      keyIdea: 'Group by event time, and decide how long to wait for stragglers.',
      change: {},
    },
    {
      id: 'both',
      short: 'Both',
      tag: 'TRADE-OFF',
      title: 'Fresh or exact, or both',
      body: [
        'Batch is simple to reason about and easy to re-run, but answers are hours old. Streams are fresh but harder to build and to correct.',
        'Many teams use both: the stream gives fast approximate numbers, and the nightly batch produces the exact ones that money depends on.',
      ],
      keyIdea: 'Use streams for freshness and batch for correctness.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Right tool, right time',
      body: [
        'On the live database, month-end failed 25% of listeners’ requests. On a warehouse it failed none. A stream processor kept trending fresh, and when it stopped, the log held the events until it caught up.',
      ],
      keyIdea: 'Keep analysis off the serving path, batch for exact, stream for now.',
      change: {},
    },
  ],
};

export default lesson;
