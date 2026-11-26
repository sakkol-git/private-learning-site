import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'deployments',
  chapter: 'Shipping safely',
  title: 'Deploying safely',
  summary:
    'Rolling, blue-green and canary releases, feature flags and two-step database changes: ship often without big outages.',
  minutes: 10,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How rolling and blue-green deploys work', stepId: 'blue-green' },
    { text: 'How a canary limits the damage of a bad release', stepId: 'canary-try' },
    { text: 'How feature flags separate deploy from release', stepId: 'flags' },
    { text: 'How to change a database schema with no downtime', stepId: 'migrations' },
  ],
  initial: {
    nodes: [
      { id: 'customers', kind: 'users', label: 'Customers', x: 0, y: 6 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4, y: 6 },
      {
        id: 'stable',
        kind: 'server',
        label: 'v41',
        sublabel: 'all servers',
        x: 8.5,
        y: 3.5,
        capacity: 2500,
      },
      { id: 'db', kind: 'database', label: 'Database', x: 13, y: 6, capacity: 5000 },
    ],
    links: [
      { id: 'customers-lb', from: 'customers', to: 'lb' },
      { id: 'lb-stable', from: 'lb', to: 'stable' },
      { id: 'stable-db', from: 'stable', to: 'db' },
    ],
    metrics: {
      users: 10000,
      requestsPerSec: 1000,
      p95LatencyMs: 80,
      errorRatePct: 0,
      healthy: [10, 10],
    },
  },
  steps: [
    {
      id: 'big-bang',
      short: 'Big bang',
      tag: 'PROBLEM',
      title: 'Everything at once, on a Friday',
      body: [
        'A shop deploys by stopping every server, installing the new version and starting them again. A bad release means <b>100%</b> of customers hit it at once, and rolling back means another full deploy.',
      ],
      keyIdea: 'All-at-once deploys turn every bug into a full outage.',
      change: {
        flows: [{ route: ['customers', 'lb', 'stable', 'db'], kind: 'request', ratePerSec: 1000 }],
      },
    },
    {
      id: 'rolling',
      short: 'Rolling',
      tag: 'IDEA',
      title: 'One server at a time',
      body: [
        'A <b>rolling deploy</b> takes one server out of the balancer, lets its open requests finish (<b>draining</b>), updates it, checks it is healthy and puts it back. Then the next.',
        'Old and new versions run side by side for a while, so they must be compatible.',
      ],
      keyIdea: 'Rolling deploys keep capacity up and need versions that can coexist.',
      change: {},
    },
    {
      id: 'blue-green',
      short: 'Blue-green',
      tag: 'IDEA',
      title: 'Two environments, one switch',
      body: [
        '<b>Blue-green</b>: run the new version on a full second set of servers, test it, then switch the balancer over. Rollback is switching back, in seconds.',
        'The cost is running twice the servers during the switch.',
      ],
      keyIdea: 'Blue-green makes rollback instant at the price of double capacity.',
      change: {},
    },
    {
      id: 'canary',
      short: 'Canary',
      tag: 'SOLUTION',
      title: 'Send 10% to the new version',
      body: [
        'A <b>canary</b> release sends a small share of traffic, here 10%, to one server running v42. If its error rate and latency match v41’s, the share grows; if not, it is pulled.',
      ],
      keyIdea: 'Expose a new version to a few users first, and compare.',
      change: {
        add: {
          nodes: [
            {
              id: 'canary',
              kind: 'server',
              label: 'v42',
              sublabel: 'canary · 10%',
              x: 8.5,
              y: 8.5,
              capacity: 400,
            },
          ],
          links: [
            { id: 'lb-canary', from: 'lb', to: 'canary' },
            { id: 'canary-db', from: 'canary', to: 'db' },
          ],
        },
        flows: [
          { route: ['customers', 'lb', 'stable', 'db'], kind: 'request', ratePerSec: 900 },
          { route: ['customers', 'lb', 'canary', 'db'], kind: 'request', ratePerSec: 100 },
        ],
        metrics: { healthy: [11, 11] },
      },
    },
    {
      id: 'canary-try',
      short: 'Bad build',
      tag: 'TRY IT',
      title: 'The new version crashes',
      body: [
        'Predict: v42 has a bug that crashes it under real traffic. How many customers notice?',
        'Press <b>Kill a server</b>. Only the canary’s share, <b>10%</b> of requests, fails, for about 3 seconds. Then the balancer pulls it and v41 carries everyone. With a big-bang deploy that would have been 100%.',
      ],
      keyIdea: 'A canary caps the blast radius of a bad release.',
      change: {},
      breakActions: ['killServer'],
    },
    {
      id: 'auto-rollback',
      short: 'Rollback',
      tag: 'IDEA',
      title: 'Let metrics decide',
      body: [
        'Watch the canary automatically: if its error rate exceeds v41’s by more than half a percentage point, or its p95 is 20% higher, roll back without waiting for a person.',
      ],
      keyIdea: 'Automate the go/no-go from the same metrics you alert on.',
      change: {},
    },
    {
      id: 'flags',
      short: 'Flags',
      tag: 'IDEA',
      title: 'Deploy is not release',
      body: [
        'Ship new code switched off behind a <b>feature flag</b>, then turn it on for staff, then 1% of customers, then everyone. If it misbehaves, turn the flag off in seconds, with no deploy.',
        'Remove old flags once a feature is fully on, or they pile up into confusing code.',
      ],
      keyIdea: 'Flags let you release, and un-release, features independently of deploys.',
      change: {},
    },
    {
      id: 'migrations',
      short: 'Schema',
      tag: 'TRADE-OFF',
      title: 'Changing the database safely',
      body: [
        'During a rolling deploy, old and new code share one database. Renaming a column in one step breaks the old code. Instead, <b>expand then contract</b>: add the new column, write to both, backfill, switch reads, and only then drop the old column, in a later release.',
      ],
      keyIdea: 'Make schema changes in backward-compatible steps across several releases.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Small, watched, reversible',
      body: [
        'A crash in a big-bang deploy hits 100% of customers; in a canary it hit 10% for 3 seconds. Rolling and blue-green deploys keep capacity up, flags make release reversible, and expand-then-contract keeps the database compatible.',
      ],
      keyIdea: 'Ship in small steps you can watch and undo.',
      change: {},
    },
  ],
};

export default lesson;
