import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'observability',
  chapter: 'Staying up',
  title: 'Observability',
  summary: 'Metrics tell you something is wrong, traces tell you where, logs tell you why.',
  minutes: 9,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Which few metrics describe any service', stepId: 'metrics' },
    { text: 'How to read latency and errors as symptoms', stepId: 'slow-db-try' },
    { text: 'How a trace shows where time goes', stepId: 'traces' },
    { text: 'How to alert on what users feel', stepId: 'alerts' },
  ],
  initial: {
    nodes: [
      { id: 'payers', kind: 'users', label: 'Customers', x: 0, y: 6 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4, y: 6 },
      {
        id: 'api',
        kind: 'server',
        label: 'Payments API',
        sublabel: '×2',
        x: 8,
        y: 6,
        capacity: 1000,
      },
      { id: 'fraud', kind: 'service', label: 'Fraud check', x: 12.5, y: 3, capacity: 1000 },
      { id: 'db', kind: 'database', label: 'Payments DB', x: 12.5, y: 9, capacity: 1000 },
    ],
    links: [
      { id: 'payers-lb', from: 'payers', to: 'lb' },
      { id: 'lb-api', from: 'lb', to: 'api' },
      { id: 'api-fraud', from: 'api', to: 'fraud' },
      { id: 'api-db', from: 'api', to: 'db' },
    ],
    metrics: {
      users: 3000,
      requestsPerSec: 300,
      p95LatencyMs: 110,
      errorRatePct: 0,
      healthy: [2, 2],
    },
  },
  steps: [
    {
      id: 'blind',
      short: 'Blind',
      tag: 'PROBLEM',
      title: '"Payments feel slow"',
      body: [
        'Support forwards a complaint: payments feel slow. The team logs into two servers and searches text logs. Nothing obvious. An hour later, it is still a guess.',
        'Each payment calls a fraud check and writes to the database, 150 calls a second to each.',
      ],
      keyIdea: 'You cannot fix what you cannot see, and searching logs by hand does not scale.',
      change: {
        flows: [
          { route: ['payers', 'lb', 'api', 'fraud'], kind: 'request', ratePerSec: 150 },
          { route: ['payers', 'lb', 'api', 'db'], kind: 'request', ratePerSec: 150 },
        ],
      },
    },
    {
      id: 'metrics',
      short: 'Metrics',
      tag: 'IDEA',
      title: 'Rate, errors, duration',
      body: [
        'For every service, track three numbers over time: <b>rate</b> (requests per second), <b>errors</b> (share that fail) and <b>duration</b> (p95 and p99 latency). For every machine: how busy, how full, how much is waiting.',
        'The panel beside this diagram is a tiny dashboard of exactly these.',
      ],
      keyIdea: 'A handful of standard metrics per service answers "is something wrong?"',
      change: {},
    },
    {
      id: 'slow-db-try',
      short: 'Symptom',
      tag: 'TRY IT',
      title: 'Watch a symptom appear',
      body: [
        'Predict: the database disk slows down. Which numbers move: rate, errors or latency?',
        'Press <b>Slow the database</b>. Rate and errors stay flat; p95 climbs from 110 ms to about <b>1,010 ms</b>. That is the shape of "slow, not broken", and an alert on p95 would have caught it before any customer wrote in.',
      ],
      keyIdea: 'Latency moves first. Errors often come later, or never.',
      change: {},
      breakActions: ['slowDatabase'],
    },
    {
      id: 'logs',
      short: 'Logs',
      tag: 'IDEA',
      title: 'Logs you can query',
      body: [
        'Write logs as structured records, such as <code>{"event":"payment_failed","request_id":"r-81f","reason":"card_declined"}</code>, and send them all to one place. Now "every failed payment in the last hour, by reason" is a query, not a search.',
      ],
      keyIdea: 'Structured, centralised logs explain individual events.',
      change: {},
    },
    {
      id: 'traces',
      short: 'Traces',
      tag: 'SOLUTION',
      title: 'Follow one request through',
      body: [
        'Give each request a <b>trace id</b> at the balancer and pass it on every call. Each hop records a timed <b>span</b>. One payment’s trace: balancer 1 ms, API 8 ms, fraud check 60 ms, database 25 ms.',
        'The slowest span is where to look.',
      ],
      keyIdea: 'A trace shows where one request spent its time, across services.',
      change: {
        update: {
          nodes: [
            { id: 'api', sublabel: 'trace r-81f' },
            { id: 'fraud', sublabel: 'span 60 ms' },
            { id: 'db', sublabel: 'span 25 ms' },
          ],
        },
      },
    },
    {
      id: 'fraud-try',
      short: 'Find it',
      tag: 'TRY IT',
      title: 'Find the slow hop',
      body: [
        'Predict: this time the fraud check slows down. Which numbers move, and which span would point at the cause?',
        'Press <b>Slow down a dependency</b>. Now errors rise too, to about <b>33%</b>, because the API runs out of threads waiting. The dashboard says "payments are failing"; the traces say every slow request has a 2-second fraud span.',
      ],
      keyIdea: 'Metrics say something is wrong; traces say where.',
      change: {},
      breakActions: ['slowDependency'],
    },
    {
      id: 'alerts',
      short: 'Alerts',
      tag: 'IDEA',
      title: 'Alert on what users feel',
      body: [
        'Set a target, such as "99.9% of payments succeed in under 400 ms over 30 days". That allows about 43 minutes of misses a month: the <b>error budget</b>.',
        'Page a person when the budget is being spent fast. Do not page for high CPU on one machine if users feel nothing.',
      ],
      keyIdea: 'Alert on symptoms against a target, not on every cause.',
      change: {},
    },
    {
      id: 'cost',
      short: 'Cost',
      tag: 'TRADE-OFF',
      title: 'Seeing costs money',
      body: [
        'Tracing every request and keeping every log line can cost as much as the service. Keep all metrics, sample traces (all slow and failed ones, 1% of the rest), and expire logs after a few weeks.',
        'Avoid metrics labelled by user id: millions of separate series overwhelm the system that stores them.',
      ],
      keyIdea: 'Sample and summarise; keep detail where problems are.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Know before they tell you',
      body: [
        'A slow database showed as p95 jumping to about 1 second with no errors. A slow fraud check showed as 33% errors, and a trace pointed straight at it. Metrics, logs and traces together turn a guess into a diagnosis.',
      ],
      keyIdea: 'Measure rate, errors and duration everywhere; trace requests; alert on user pain.',
      change: {},
    },
  ],
};

export default lesson;
