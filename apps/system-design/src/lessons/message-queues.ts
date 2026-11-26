import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'message-queues',
  chapter: 'Services talking',
  title: 'Message queues',
  summary:
    'Hand slow work to a queue, so a slow or broken worker delays it instead of failing your users.',
  minutes: 10,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How a slow downstream service breaks a synchronous caller', stepId: 'sync-try' },
    { text: 'How producers, queues and workers fit together', stepId: 'queue' },
    { text: 'Why at-least-once delivery needs idempotent workers', stepId: 'delivery' },
    { text: 'How to watch a queue so it does not hide problems', stepId: 'backlog' },
  ],
  initial: {
    nodes: [
      { id: 'shoppers', kind: 'users', label: 'Shoppers', x: 0, y: 6 },
      { id: 'api', kind: 'server', label: 'Checkout API', x: 4.5, y: 6, capacity: 600 },
      { id: 'mailer', kind: 'service', label: 'Email provider', x: 14, y: 6, capacity: 1000 },
    ],
    links: [
      { id: 'shoppers-api', from: 'shoppers', to: 'api' },
      { id: 'api-mailer', from: 'api', to: 'mailer' },
    ],
    metrics: {
      users: 3000,
      requestsPerSec: 300,
      p95LatencyMs: 480,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'sync',
      short: 'Waiting',
      tag: 'PROBLEM',
      title: 'Checkout waits for an email',
      body: [
        'After each order, the checkout API calls an email provider to send the receipt, and waits for it. 300 checkouts a second, each holding a connection for the 400 ms the provider takes.',
        'Shoppers wait for an email they will read later: p95 is <b>480 ms</b>.',
      ],
      keyIdea: 'If the user does not need the result now, they should not wait for it.',
      change: {
        flows: [{ route: ['shoppers', 'api', 'mailer'], kind: 'request', ratePerSec: 300 }],
      },
    },
    {
      id: 'sync-try',
      short: 'Slow mail',
      tag: 'TRY IT',
      title: 'The email provider slows down',
      body: [
        'Predict: the provider starts taking 2 seconds per email. What happens to checkout?',
        'Press <b>Slow down a dependency</b>. Each checkout now holds a worker thread five times longer, so the API can only finish about 120 a second. About <b>60%</b> of checkouts fail, and the rest take nearly <b>5 seconds</b>, because of a receipt email.',
      ],
      keyIdea:
        'A synchronous call makes the caller exactly as reliable as the slowest thing it waits on.',
      change: {},
      breakActions: ['slowDependency'],
    },
    {
      id: 'queue',
      short: 'Queue',
      tag: 'IDEA',
      title: 'Write it down and move on',
      body: [
        'A <b>message queue</b> holds jobs until someone takes them. The API (the <b>producer</b>) adds "send receipt for order 812" and answers the shopper at once. <b>Workers</b> (the consumers) take jobs and send emails at their own pace.',
      ],
      keyIdea: 'A queue separates accepting work from doing it.',
      change: {},
    },
    {
      id: 'decouple',
      short: 'Decouple',
      tag: 'SOLUTION',
      title: 'Put a queue between them',
      body: [
        'Checkout now writes a message and returns. Workers send the 300 emails a second behind the queue.',
        'p95 for checkout drops to about <b>80 ms</b>.',
      ],
      keyIdea: 'Move slow, non-urgent work behind a queue.',
      change: {
        remove: { links: ['api-mailer'] },
        add: {
          nodes: [
            { id: 'jobs', kind: 'queue', label: 'Receipt jobs', x: 7.5, y: 6, value: 0 },
            {
              id: 'workers',
              kind: 'service',
              label: 'Email workers',
              x: 10.75,
              y: 6,
              capacity: 600,
              tag: 'worker',
            },
          ],
          links: [
            { id: 'api-jobs', from: 'api', to: 'jobs' },
            { id: 'jobs-workers', from: 'jobs', to: 'workers' },
            { id: 'workers-mailer', from: 'workers', to: 'mailer' },
          ],
        },
        flows: [
          {
            route: ['shoppers', 'api', 'jobs', 'workers', 'mailer'],
            kind: 'request',
            ratePerSec: 300,
          },
        ],
        metrics: { p95LatencyMs: 80 },
      },
    },
    {
      id: 'workers-stop',
      short: 'Stop',
      tag: 'TRY IT',
      title: 'Stop every worker',
      body: [
        'Predict: all email workers crash. Does checkout fail now?',
        'Press <b>Stop the workers</b>. Checkout errors stay at <b>0%</b>. The queue fills instead, by 300 jobs a second, to <b>3,000</b> after 10 seconds. When workers return they drain the backlog and receipts arrive late, not never.',
      ],
      keyIdea: 'Behind a queue, a broken worker becomes a backlog, not an outage.',
      change: {},
      breakActions: ['stopWorkers'],
    },
    {
      id: 'delivery',
      short: 'Delivery',
      tag: 'IDEA',
      title: 'At least once, maybe twice',
      body: [
        'A worker takes a job, sends the email, then <b>acknowledges</b> it. If it crashes after sending but before the ack, the queue hands the job to another worker, and the email goes twice.',
        'So workers are made <b>idempotent</b>: they record each job id they finish and skip repeats.',
      ],
      keyIdea: 'Queues usually deliver at least once. Make consumers safe to repeat.',
      change: {},
    },
    {
      id: 'dead-letters',
      short: 'Poison',
      tag: 'IDEA',
      title: 'Jobs that always fail',
      body: [
        'An order with a broken email address fails every time. Without a limit, it is retried forever and blocks others. After 5 attempts, with growing waits between them, it moves to a <b>dead-letter queue</b> for a person to look at.',
      ],
      keyIdea: 'Retry with backoff, then park poison messages.',
      change: {},
    },
    {
      id: 'backlog',
      short: 'Backlog',
      tag: 'TRADE-OFF',
      title: 'Queues can hide trouble',
      body: [
        'A queue that grows slowly for days looks healthy from the API. Alert on the <b>age of the oldest message</b>, and add workers when the backlog grows.',
        'Ordering is limited too: most queues keep order only within one partition or key. Work that must happen in order needs the same key.',
      ],
      keyIdea: 'Watch backlog age, scale on depth, and do not assume global order.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Accept now, work later',
      body: [
        'Waiting on email made a slow provider fail 60% of checkouts. With a queue, checkout answered in 80 ms and stayed at 0% errors even with every worker down, while 3,000 jobs waited safely.',
      ],
      keyIdea: 'Use queues to absorb bursts and failures in work users do not wait for.',
      change: {},
    },
  ],
};

export default lesson;
