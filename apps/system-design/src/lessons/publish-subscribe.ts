import type { InfraLesson } from './index';

const SUBS = [
  { id: 'analytics', label: 'Analytics', y: 10 },
  { id: 'inventory', label: 'Inventory', y: 2 },
  { id: 'email', label: 'Email', y: 6 },
];

const lesson: InfraLesson = {
  slug: 'publish-subscribe',
  chapter: 'Services talking',
  title: 'Publish and subscribe',
  summary:
    'Announce that something happened once, and let any number of services react on their own.',
  minutes: 9,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How direct calls couple one service to all the others', stepId: 'coupling' },
    { text: 'How topics deliver one event to every subscriber', stepId: 'topic' },
    { text: 'The difference between a queue and a topic', stepId: 'queue-vs-topic' },
    { text: 'What events cost in tracing and consistency', stepId: 'costs' },
  ],
  initial: {
    nodes: [
      { id: 'shoppers', kind: 'users', label: 'Shoppers', x: 0, y: 6 },
      { id: 'orders', kind: 'server', label: 'Orders service', x: 4.5, y: 6, capacity: 1000 },
      ...SUBS.map((s) => ({
        id: s.id,
        kind: 'service' as const,
        label: s.label,
        x: 12,
        y: s.y,
        capacity: 1000,
      })),
    ],
    links: [
      { id: 'shoppers-orders', from: 'shoppers', to: 'orders' },
      ...SUBS.map((s) => ({ id: `orders-${s.id}`, from: 'orders', to: s.id })),
    ],
    metrics: {
      users: 2000,
      requestsPerSec: 200,
      p95LatencyMs: 150,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'direct',
      short: 'Direct',
      tag: 'PROBLEM',
      title: 'One order, three calls',
      body: [
        'Each of 200 orders a second makes the orders service call inventory, email and analytics in turn, and wait for all three. That is 600 calls a second, 60% of what it can handle.',
      ],
      keyIdea: 'Direct calls make the caller responsible for every reaction.',
      change: {
        flows: SUBS.map((s) => ({
          route: ['shoppers', 'orders', s.id],
          kind: 'request' as const,
          ratePerSec: 200,
        })),
      },
    },
    {
      id: 'direct-try',
      short: 'Slow one',
      tag: 'TRY IT',
      title: 'Analytics has a bad day',
      body: [
        'Predict: analytics, the least important of the three, gets slow. Does ordering care?',
        'Press <b>Slow down a dependency</b>. The orders service waits five times longer on every order, so it can finish only a fifth as many calls. About <b>two thirds</b> of calls fail. A reporting tool has broken checkout.',
      ],
      keyIdea:
        'With direct calls, the least important service can take down the most important one.',
      change: {},
      breakActions: ['slowDependency'],
    },
    {
      id: 'coupling',
      short: 'Coupling',
      tag: 'IDEA',
      title: 'The caller knows too much',
      body: [
        'The orders service knows every service that cares about an order. Adding a fourth, say loyalty points, means changing and redeploying orders.',
      ],
      keyIdea: 'Every new consumer should not be a change to the producer.',
      change: {},
    },
    {
      id: 'topic',
      short: 'Topic',
      tag: 'SOLUTION',
      title: 'Publish one event',
      body: [
        'The orders service publishes <b>"order placed"</b> to a <b>topic</b> and moves on. Each subscriber gets its own copy and reads it at its own pace.',
        'Orders now does one cheap publish per order, 20% busy. Adding loyalty points means subscribing, with no change to orders.',
      ],
      keyIdea: 'Producers announce facts; subscribers decide what to do about them.',
      change: {
        remove: { links: SUBS.map((s) => `orders-${s.id}`) },
        add: {
          nodes: [
            { id: 'topic', kind: 'queue', label: 'order placed', sublabel: 'topic', x: 8, y: 6 },
          ],
          links: [
            { id: 'orders-topic', from: 'orders', to: 'topic' },
            ...SUBS.map((s) => ({ id: `topic-${s.id}`, from: 'topic', to: s.id })),
          ],
        },
        flows: [
          { route: ['shoppers', 'orders', 'topic'], kind: 'request', ratePerSec: 200 },
          ...SUBS.map((s) => ({
            route: ['topic', s.id],
            kind: 'request' as const,
            ratePerSec: 200,
          })),
        ],
        metrics: { p95LatencyMs: 40 },
      },
    },
    {
      id: 'topic-try',
      short: 'Slow again',
      tag: 'TRY IT',
      title: 'Slow analytics again',
      body: [
        'Predict: analytics slows down exactly as before.',
        'Press <b>Slow down a dependency</b>. Errors stay at <b>0%</b>. Nobody waits on analytics any more: its copy of each event waits in the topic until it catches up.',
      ],
      keyIdea: 'Pub/sub isolates subscribers from each other and from the producer.',
      change: {},
      breakActions: ['slowDependency'],
    },
    {
      id: 'queue-vs-topic',
      short: 'Queue/topic',
      tag: 'IDEA',
      title: 'Queue or topic?',
      body: [
        'A <b>queue</b> gives each message to one of several workers: they share the work. A <b>topic</b> gives each message to every subscribing group: they each react.',
        'Within a group, workers often share a topic like a queue, so email can run five workers that split the emails.',
      ],
      keyIdea: 'Queue: one of many does the job. Topic: each interested party hears about it.',
      change: {},
    },
    {
      id: 'event-design',
      short: 'Events',
      tag: 'IDEA',
      title: 'What goes in an event',
      body: [
        'Name it as a past fact, "order placed", not a command. Include what most subscribers need (order id, customer, total) so they need not call back. Add fields, never rename them; old subscribers keep reading.',
        'If order matters, such as "placed" before "cancelled", give related events the same key so they stay in sequence.',
      ],
      keyIdea: 'Events are facts with a stable shape.',
      change: {},
    },
    {
      id: 'costs',
      short: 'Costs',
      tag: 'TRADE-OFF',
      title: 'Looser, and harder to follow',
      body: [
        'Inventory may update a second after the order: the system is eventually consistent. "What happened to order 812?" now spans several services, so every event carries a trace id.',
        'And subscribers may get an event twice, so they must handle repeats.',
      ],
      keyIdea: 'Pub/sub trades immediate consistency and easy tracing for independence.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Announce, do not call',
      body: [
        'Direct calls let a slow analytics service fail two thirds of order calls. Publishing one event to a topic kept errors at 0%, cut the orders service to one publish per order, and made new subscribers free to add.',
      ],
      keyIdea: 'Use events for reactions that need not finish before you answer.',
      change: {},
    },
  ],
};

export default lesson;
