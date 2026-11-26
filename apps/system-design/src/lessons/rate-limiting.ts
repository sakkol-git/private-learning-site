import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'rate-limiting',
  chapter: 'Staying up',
  title: 'Rate limiting',
  summary:
    'Cap how fast each client can call you, so one runaway script cannot starve everyone else.',
  minutes: 9,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How one client can starve the others', stepId: 'flood' },
    { text: 'How a token bucket allows bursts but caps the rate', stepId: 'token-bucket' },
    { text: 'The main limiting algorithms', stepId: 'algorithms' },
    { text: 'How to limit across many servers', stepId: 'distributed' },
  ],
  initial: {
    nodes: [
      { id: 'apps', kind: 'users', label: 'Customer apps', x: 0, y: 3 },
      { id: 'script', kind: 'users', label: 'One customer’s script', x: 0, y: 9, tag: 'noisy' },
      { id: 'api', kind: 'server', label: 'Maps API', sublabel: '×5', x: 8, y: 6, capacity: 1000 },
      { id: 'tiles', kind: 'database', label: 'Map tiles', x: 12.5, y: 6, capacity: 5000 },
    ],
    links: [
      { id: 'apps-api', from: 'apps', to: 'api' },
      { id: 'script-api', from: 'script', to: 'api' },
      { id: 'api-tiles', from: 'api', to: 'tiles' },
    ],
    metrics: {
      users: 6000,
      requestsPerSec: 680,
      p95LatencyMs: 80,
      errorRatePct: 0,
      healthy: [5, 5],
    },
  },
  steps: [
    {
      id: 'shared',
      short: 'Shared',
      tag: 'PROBLEM',
      title: 'Everyone shares one API',
      body: [
        'A maps API serves many customers’ apps, 600 requests a second, plus one customer’s batch script at 80. Together they use 68% of the servers.',
        'Nothing stops any one key from sending as much as it likes.',
      ],
      keyIdea: 'Shared capacity needs a rule for who gets how much.',
      change: {
        flows: [
          { route: ['apps', 'api', 'tiles'], kind: 'request', ratePerSec: 600 },
          { route: ['script', 'api', 'tiles'], kind: 'request', ratePerSec: 80 },
        ],
      },
    },
    {
      id: 'flood',
      short: 'Flood',
      tag: 'TRY IT',
      title: 'The script goes wild',
      body: [
        'Predict: a bug puts the script in a loop, ten times its usual rate. Who notices?',
        'Press <b>One client floods</b>. The servers get 1,400 requests a second for 1,000 of capacity. About <b>29%</b> of other customers’ requests fail and p95 rises from 80 ms to about <b>500 ms</b>, though they changed nothing.',
      ],
      keyIdea: 'Without limits, the heaviest client sets everyone’s experience.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'limits',
      short: 'Limits',
      tag: 'IDEA',
      title: 'A budget per client',
      body: [
        'Give each API key a limit, such as 100 requests a second. Over it, the API answers <code>429 Too Many Requests</code> with a <code>Retry-After</code> header, cheaply and before doing any real work.',
      ],
      keyIdea: 'Reject excess early and cheaply, and tell the client when to come back.',
      change: {},
    },
    {
      id: 'token-bucket',
      short: 'Bucket',
      tag: 'SOLUTION',
      title: 'A token bucket in front',
      body: [
        'Each key has a bucket that holds up to 200 tokens and refills at 100 a second. A request spends one token; an empty bucket means 429.',
        'Short bursts are fine, since the bucket starts full. Sustained floods are capped at the refill rate.',
      ],
      keyIdea: 'Token buckets allow bursts up to the bucket size and cap the long-run rate.',
      change: {
        remove: { links: ['apps-api', 'script-api'] },
        add: {
          nodes: [
            {
              id: 'limiter',
              kind: 'shield',
              label: 'Rate limiter',
              sublabel: 'per key',
              x: 4,
              y: 6,
            },
          ],
          links: [
            { id: 'apps-limiter', from: 'apps', to: 'limiter' },
            { id: 'script-limiter', from: 'script', to: 'limiter' },
            { id: 'limiter-api', from: 'limiter', to: 'api' },
          ],
        },
        flows: [
          { route: ['apps', 'limiter', 'api', 'tiles'], kind: 'request', ratePerSec: 600 },
          { route: ['script', 'limiter', 'api', 'tiles'], kind: 'request', ratePerSec: 80 },
        ],
      },
    },
    {
      id: 'flood-again',
      short: 'Flood again',
      tag: 'TRY IT',
      title: 'The same loop, with a limit',
      body: [
        'Predict: the script loops again.',
        'Press <b>One client floods</b>. The limiter passes the script at about its usual rate and rejects the rest (the red dots at the limiter). Everyone else stays at <b>0%</b> errors.',
      ],
      keyIdea: 'A limit contains the damage to the client causing it.',
      change: {},
      breakActions: ['noisyClient'],
    },
    {
      id: 'algorithms',
      short: 'Algorithms',
      tag: 'IDEA',
      title: 'Four ways to count',
      body: [
        '<b>Fixed window</b>: 100 per calendar second; simple, but allows 200 across a boundary. <b>Sliding window</b>: counts the last 1,000 ms, smoother. <b>Token bucket</b>: allows bursts. <b>Leaky bucket</b>: lets requests out at a steady pace, smoothing bursts away.',
      ],
      keyIdea: 'Choose by whether you want to allow bursts or smooth them.',
      change: {},
    },
    {
      id: 'distributed',
      short: 'Many servers',
      tag: 'TRADE-OFF',
      title: 'Counting across many servers',
      body: [
        'With five limiter servers, each could allow 100 a second, letting 500 through. A shared counter in a fast in-memory store keeps one exact count, at the cost of a lookup per request.',
        'If that store fails, either let everything through (<b>fail open</b>) or reject everything (<b>fail closed</b>). Most public APIs fail open.',
      ],
      keyIdea: 'Exact global limits need shared state; approximate local ones are cheaper.',
      change: {},
    },
    {
      id: 'shedding',
      short: 'Shedding',
      tag: 'IDEA',
      title: 'When everyone is within limits',
      body: [
        'Limits per key do not help if every customer is busy at once. <b>Load shedding</b> rejects the least important work first, such as prefetching, when servers pass about 90% busy, so map views still work.',
      ],
      keyIdea: 'Per-client limits protect fairness; load shedding protects the service.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Fair shares',
      body: [
        'One looping script failed 29% of other customers’ requests. A token bucket per key, in front of the API, held the script near its normal rate and kept everyone else at 0%.',
      ],
      keyIdea: 'Limit every client, reject early, and shed low-value work under pressure.',
      change: {},
    },
  ],
};

export default lesson;
