import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'encryption-and-secrets',
  chapter: 'Security',
  title: 'Encryption and secrets',
  summary:
    'Encrypt data on the wire and on disk, keep keys in a key service, and keep secrets out of code.',
  minutes: 10,
  level: 'intermediate',
  youWillLearn: [
    { text: 'What TLS protects in transit', stepId: 'in-transit' },
    { text: 'What encryption at rest does and does not protect', stepId: 'at-rest' },
    { text: 'How envelope encryption keeps key calls rare', stepId: 'envelope' },
    { text: 'How to handle secrets and rotation', stepId: 'secrets' },
  ],
  initial: {
    nodes: [
      { id: 'clinicians', kind: 'users', label: 'Clinicians', x: 0, y: 6 },
      { id: 'api', kind: 'server', label: 'Records API', x: 5, y: 6, capacity: 1000 },
      { id: 'records', kind: 'database', label: 'Patient records', x: 13, y: 9, capacity: 3000 },
    ],
    links: [
      { id: 'clinicians-api', from: 'clinicians', to: 'api' },
      { id: 'api-records', from: 'api', to: 'records' },
    ],
    metrics: {
      users: 2000,
      requestsPerSec: 200,
      p95LatencyMs: 80,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'in-transit',
      short: 'In transit',
      tag: 'IDEA',
      title: 'Encrypt everything on the wire',
      body: [
        'A clinic app sends patient records over hospital Wi-Fi. <b>TLS</b> encrypts each connection and the server’s certificate proves it is the real server, so nobody on the network can read or alter the data.',
      ],
      keyIdea: 'TLS gives privacy, integrity and server identity in transit.',
      change: {
        flows: [{ route: ['clinicians', 'api', 'records'], kind: 'request', ratePerSec: 200 }],
      },
    },
    {
      id: 'internal-tls',
      short: 'Inside',
      tag: 'SOLUTION',
      title: 'Inside the network too',
      body: [
        'Traffic between your own services crosses networks you do not fully control. Encrypt it as well, and with <b>mutual TLS</b> each service also proves its identity to the other.',
      ],
      keyIdea: 'Do not trust a network just because it is yours.',
      change: { update: { nodes: [{ id: 'api', sublabel: 'TLS in and out' }] } },
    },
    {
      id: 'at-rest',
      short: 'At rest',
      tag: 'IDEA',
      title: 'Encrypt what is stored',
      body: [
        'Encryption at rest protects disks, backups and snapshots: a lost backup tape is unreadable. It does not protect against a hacked app, which reads data through the normal, decrypting path.',
        'For the most sensitive fields, the app encrypts them itself before storing.',
      ],
      keyIdea: 'At-rest encryption protects media; app-level encryption protects fields.',
      change: { update: { nodes: [{ id: 'records', sublabel: 'encrypted fields' }] } },
    },
    {
      id: 'key-service',
      short: 'Keys',
      tag: 'SOLUTION',
      title: 'Keys live in a key service',
      body: [
        'Keys must not sit next to the data. A <b>key management service</b> holds them; the API sends it each encrypted field to decrypt, 200 calls a second, and every use is logged.',
      ],
      keyIdea: 'Separate keys from data, and log every key use.',
      change: {
        add: {
          nodes: [
            { id: 'kms', kind: 'service', label: 'Key service', x: 13, y: 3, capacity: 1000 },
          ],
          links: [{ id: 'api-kms', from: 'api', to: 'kms' }],
        },
        flows: [
          { route: ['clinicians', 'api', 'kms'], kind: 'request', ratePerSec: 200 },
          { route: ['clinicians', 'api', 'records'], kind: 'request', ratePerSec: 200 },
        ],
      },
    },
    {
      id: 'kms-try',
      short: 'Slow keys',
      tag: 'TRY IT',
      title: 'The key service slows down',
      body: [
        'Predict: every record read waits on the key service. What if it gets slow?',
        'Press <b>Slow down a dependency</b>. Each read waits five times longer for its key, the API runs out of threads, and <b>half</b> of requests fail.',
      ],
      keyIdea: 'Calling the key service per record puts it on every request’s critical path.',
      change: {},
      breakActions: ['slowDependency'],
    },
    {
      id: 'envelope',
      short: 'Envelope',
      tag: 'SOLUTION',
      title: 'Envelope encryption',
      body: [
        'Encrypt records with a <b>data key</b>, and store that data key encrypted by a master key that never leaves the key service. The API asks the key service to unwrap a data key once, then keeps it in memory for 5 minutes.',
        'Press <b>Slow down a dependency</b> again: reads use the cached data key and errors stay at <b>0%</b>.',
      ],
      keyIdea: 'Wrap many data keys with one master key; call the key service rarely.',
      change: {
        remove: { links: ['api-kms'] },
        add: {
          nodes: [
            {
              id: 'datakeys',
              kind: 'shield',
              label: 'Data key cache',
              sublabel: '5 min',
              x: 9,
              y: 3,
            },
          ],
          links: [
            { id: 'api-datakeys', from: 'api', to: 'datakeys' },
            { id: 'datakeys-kms', from: 'datakeys', to: 'kms' },
          ],
        },
        flows: [
          { route: ['clinicians', 'api', 'datakeys', 'kms'], kind: 'request', ratePerSec: 200 },
          { route: ['clinicians', 'api', 'records'], kind: 'request', ratePerSec: 200 },
        ],
      },
      breakActions: ['slowDependency'],
    },
    {
      id: 'secrets',
      short: 'Secrets',
      tag: 'IDEA',
      title: 'Secrets stay out of code',
      body: [
        'Database passwords and API keys never go in source code or config committed to git: repositories get copied and leaked. A <b>secrets manager</b> hands them to services at start-up, and rotates them on a schedule.',
        'Better still are short-lived credentials issued per service, which expire on their own.',
      ],
      keyIdea: 'Store secrets centrally, deliver at runtime, rotate often.',
      change: {},
    },
    {
      id: 'kinds',
      short: 'Hash/encrypt',
      tag: 'TRADE-OFF',
      title: 'Hash, encrypt or sign?',
      body: [
        '<b>Hash</b> what you only need to compare, such as passwords. <b>Encrypt</b> what you must read back. <b>Sign</b> what must not be altered, such as tokens.',
        'Encryption has costs: rotating keys means re-wrapping data, and a lost key means lost data. Keep key backups as carefully as the keys.',
      ],
      keyIdea: 'Use the right tool for each job, and plan for key rotation and loss.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Encrypted, with keys elsewhere',
      body: [
        'TLS protected records on the wire, field encryption protected them on disk. Calling the key service for every read failed half of requests when it slowed; envelope encryption with cached data keys kept errors at 0%.',
      ],
      keyIdea: 'Encrypt in transit and at rest, keep keys in a service, and call it rarely.',
      change: {},
    },
  ],
};

export default lesson;
