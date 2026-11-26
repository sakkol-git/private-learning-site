import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'files-and-media',
  chapter: 'Storing data',
  title: 'Files and media',
  summary:
    'Keep big files out of servers and databases: object storage, direct uploads and background processing.',
  minutes: 9,
  level: 'beginner',
  youWillLearn: [
    { text: 'Why files do not belong in your database', stepId: 'object-storage' },
    { text: 'How signed URLs let browsers upload directly', stepId: 'direct-upload' },
    { text: 'Why thumbnails are made in the background', stepId: 'thumbnails' },
    { text: 'What to clean up when two stores disagree', stepId: 'two-stores' },
  ],
  initial: {
    nodes: [
      { id: 'people', kind: 'users', label: 'Photographers', x: 0, y: 6 },
      { id: 'api', kind: 'server', label: 'API', x: 5, y: 6, capacity: 400 },
      {
        id: 'meta',
        kind: 'database',
        label: 'Database',
        sublabel: 'photos as blobs',
        x: 10,
        y: 6,
        capacity: 2000,
      },
    ],
    links: [
      { id: 'people-api', from: 'people', to: 'api' },
      { id: 'api-meta', from: 'api', to: 'meta' },
    ],
    metrics: {
      users: 2000,
      requestsPerSec: 320,
      p95LatencyMs: 650,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'through-server',
      short: 'Problem',
      tag: 'PROBLEM',
      title: 'Photos squeezed through the API',
      body: [
        'A photo app streams every 8 MB upload through its API servers and stores the bytes in the database. 20 uploads a second is 160 MB/s through servers built for small JSON requests.',
        'Uploads hold connections open for seconds, so the API is <b>80% busy</b> and p95 is 650 ms. Database backups now take all night.',
      ],
      keyIdea: 'Large files tie up servers and bloat databases built for small rows.',
      change: { flows: [{ route: ['people', 'api', 'meta'], kind: 'request', ratePerSec: 320 }] },
    },
    {
      id: 'object-storage',
      short: 'Objects',
      tag: 'SOLUTION',
      title: 'Put files in object storage',
      body: [
        '<b>Object storage</b> keeps files by key, such as <code>photos/7f3a.jpg</code>, copies each one across machines, and scales to billions of files cheaply.',
        'The database keeps only a small row per photo: key, owner, size, caption.',
      ],
      keyIdea: 'Store bytes in object storage and facts about them in the database.',
      change: {
        add: {
          nodes: [
            {
              id: 'objects',
              kind: 'database',
              label: 'Object storage',
              x: 5,
              y: 1.5,
              capacity: 100000,
            },
          ],
          links: [{ id: 'people-objects', from: 'people', to: 'objects' }],
        },
        update: { nodes: [{ id: 'meta', sublabel: 'photo metadata' }] },
      },
    },
    {
      id: 'direct-upload',
      short: 'Direct',
      tag: 'SOLUTION',
      title: 'Let the browser upload directly',
      body: [
        'The API checks the user may upload, then returns a <b>signed URL</b> that allows one upload to one key for 10 minutes. The browser sends the file straight to object storage.',
        'The API now handles only small requests: about 80 a second, 20% busy, and p95 drops to about 60 ms.',
      ],
      keyIdea: 'Hand out permission, not bandwidth.',
      change: {
        flows: [
          { route: ['people', 'objects'], kind: 'request', ratePerSec: 20 },
          { route: ['people', 'api', 'meta'], kind: 'request', ratePerSec: 80 },
        ],
        metrics: { p95LatencyMs: 60, requestsPerSec: 100 },
      },
    },
    {
      id: 'serving',
      short: 'Serving',
      tag: 'IDEA',
      title: 'Serve and upload large files well',
      body: [
        'Views come through a CDN in front of object storage, using keys that never change so they cache for a long time.',
        'Big videos upload in parts: a failed 5 MB part is retried alone instead of restarting a 2 GB upload.',
      ],
      keyIdea: 'Cache files at the edge; upload big ones in resumable parts.',
      change: {},
    },
    {
      id: 'thumbnails',
      short: 'Thumbnails',
      tag: 'SOLUTION',
      title: 'Make thumbnails in the background',
      body: [
        'Each upload also needs three smaller sizes. Object storage emits an "uploaded" event into a <b>queue</b>, and workers make the thumbnails, 20 jobs a second.',
        'Nobody waits for them: the upload finishes as soon as the file is stored.',
      ],
      keyIdea: 'Slow work that the user need not wait for goes on a queue.',
      change: {
        add: {
          nodes: [
            { id: 'jobs', kind: 'queue', label: 'Upload events', x: 10, y: 1.5, value: 0 },
            {
              id: 'workers',
              kind: 'service',
              label: 'Thumbnail workers',
              x: 14.5,
              y: 1.5,
              capacity: 60,
              tag: 'worker',
            },
          ],
          links: [
            { id: 'objects-jobs', from: 'objects', to: 'jobs' },
            { id: 'jobs-workers', from: 'jobs', to: 'workers' },
          ],
        },
        flows: [
          { route: ['people', 'objects', 'jobs', 'workers'], kind: 'request', ratePerSec: 20 },
          { route: ['people', 'api', 'meta'], kind: 'request', ratePerSec: 80 },
        ],
      },
    },
    {
      id: 'workers-stop',
      short: 'Workers',
      tag: 'TRY IT',
      title: 'The workers stop',
      body: [
        'Predict: a bad deploy stops every thumbnail worker. Do uploads start failing?',
        'Press <b>Stop the workers</b>. Errors stay at <b>0%</b>: uploads still land in object storage. The queue grows by 20 jobs a second instead, to <b>200</b> after 10 seconds, and those photos show a placeholder until the workers return and catch up.',
      ],
      keyIdea: 'A queue turns a broken worker into a delay, not an outage.',
      change: {},
      breakActions: ['stopWorkers'],
    },
    {
      id: 'two-stores',
      short: 'Two stores',
      tag: 'TRADE-OFF',
      title: 'Two stores can disagree',
      body: [
        'If the file uploads but the database row never gets written, the file is an orphan nobody can see. If a row is deleted but the file is not, you keep paying to store it.',
        'A nightly job compares the two and removes leftovers. Deleting a photo marks the row first, then removes the file later.',
      ],
      keyIdea: 'When data lives in two places, plan how they get back in sync.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Bytes, facts and jobs',
      body: [
        'Object storage holds the bytes, the database holds the facts, signed URLs keep uploads off the API (80% → 20% busy), and a queue lets thumbnails fall behind without breaking uploads.',
      ],
      keyIdea: 'Give files their own path through the system.',
      change: {},
    },
  ],
};

export default lesson;
