import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'redundancy-and-failover',
  chapter: 'Staying up',
  title: 'Redundancy and failover',
  summary:
    'Find every single point of failure, give it a spare, and make switching to the spare automatic.',
  minutes: 10,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How single points of failure multiply downtime', stepId: 'one-of-each' },
    { text: 'How a spare server keeps the site up', stepId: 'second-server' },
    { text: 'How a standby database takes over', stepId: 'db-failover' },
    { text: 'Why spares must fail independently', stepId: 'independent' },
  ],
  initial: {
    nodes: [
      { id: 'riders', kind: 'users', label: 'Riders', x: 0, y: 6 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4, y: 6 },
      { id: 'app1', kind: 'server', label: 'App 1', x: 8.5, y: 3.5, capacity: 600 },
      {
        id: 'db',
        kind: 'database',
        label: 'Bookings DB',
        sublabel: 'primary',
        x: 13,
        y: 3.5,
        capacity: 1000,
        tag: 'primary',
      },
    ],
    links: [
      { id: 'riders-lb', from: 'riders', to: 'lb' },
      { id: 'lb-app1', from: 'lb', to: 'app1' },
      { id: 'app1-db', from: 'app1', to: 'db' },
    ],
    metrics: {
      users: 3000,
      requestsPerSec: 300,
      p95LatencyMs: 90,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'one-of-each',
      short: 'One of each',
      tag: 'PROBLEM',
      title: 'One of everything',
      body: [
        'A ferry-booking site runs one balancer, one app server and one database. Each is up 99.9% of the time, about 9 hours down a year.',
        'The site needs all three, so it is up only 99.9% × 99.9% × 99.9% ≈ <b>99.7%</b>: about 26 hours down a year.',
      ],
      keyIdea: 'In a chain, downtimes add up. Every single point of failure is a full outage.',
      change: {
        flows: [{ route: ['riders', 'lb', 'app1', 'db'], kind: 'request', ratePerSec: 300 }],
      },
    },
    {
      id: 'one-dies',
      short: 'Lose it',
      tag: 'TRY IT',
      title: 'Lose the only server',
      body: [
        'Predict: what happens when App 1 crashes?',
        'Press <b>Kill a server</b>. Errors go to <b>100%</b> and stay there. There is nowhere else to send anyone until a person restarts it.',
      ],
      keyIdea: 'Without a spare, recovery waits for a human.',
      change: {},
      breakActions: ['killServer'],
    },
    {
      id: 'second-server',
      short: 'Spare',
      tag: 'SOLUTION',
      title: 'Run two, each able to carry the load',
      body: [
        'Add App 2. Each takes 150 requests a second, 25% busy, so either one could carry all 300 alone. The balancer checks both every second.',
      ],
      keyIdea: 'A spare only helps if it can carry the full load by itself.',
      change: {
        add: {
          nodes: [{ id: 'app2', kind: 'server', label: 'App 2', x: 8.5, y: 8.5, capacity: 600 }],
          links: [
            { id: 'lb-app2', from: 'lb', to: 'app2' },
            { id: 'app2-db', from: 'app2', to: 'db' },
          ],
        },
        flows: [
          { route: ['riders', 'lb', 'app1', 'db'], kind: 'request', ratePerSec: 150 },
          { route: ['riders', 'lb', 'app2', 'db'], kind: 'request', ratePerSec: 150 },
        ],
        metrics: { healthy: [2, 2] },
      },
    },
    {
      id: 'second-server-try',
      short: 'Lose one',
      tag: 'TRY IT',
      title: 'Lose one of two',
      body: [
        'Predict: the same crash, with two servers.',
        'Press <b>Kill a server</b>. Half the requests (<b>50%</b>) fail for about 3 seconds, until the health check notices. Then App 1 carries everything, 50% busy, and errors return to 0%.',
      ],
      keyIdea: 'Redundancy turns an outage into a blip as long as detection is quick.',
      change: {},
      breakActions: ['killServer'],
    },
    {
      id: 'standby',
      short: 'Standby',
      tag: 'SOLUTION',
      title: 'A standby database',
      body: [
        'The database is still alone. Add a <b>standby</b> that receives every change from the primary and can take over. Both app servers can reach it.',
      ],
      keyIdea: 'Stateful parts need a live copy, not just a spare machine.',
      change: {
        add: {
          nodes: [
            {
              id: 'standby',
              kind: 'database',
              label: 'Standby DB',
              sublabel: 'in sync',
              x: 13,
              y: 8.5,
              capacity: 1000,
            },
          ],
          links: [
            { id: 'db-standby', from: 'db', to: 'standby', style: 'dashed' },
            { id: 'app1-standby', from: 'app1', to: 'standby', style: 'dashed' },
            { id: 'app2-standby', from: 'app2', to: 'standby', style: 'dashed' },
          ],
        },
        flows: [
          { route: ['riders', 'lb', 'app1', 'db'], kind: 'request', ratePerSec: 150 },
          { route: ['riders', 'lb', 'app2', 'db'], kind: 'request', ratePerSec: 150 },
          { route: ['db', 'standby'], kind: 'response', ratePerSec: 150 },
        ],
      },
    },
    {
      id: 'db-failover',
      short: 'Failover',
      tag: 'TRY IT',
      title: 'Lose the primary database',
      body: [
        'Predict: everything depends on the database. How long is the outage?',
        'Press <b>Kill the primary database</b>. Every request fails (<b>100%</b>) while the system confirms the primary is really gone. After about 4 seconds the standby is promoted, both servers switch to it, and errors return to 0%.',
      ],
      keyIdea: 'Failover is automatic but not instant. The gap is detection plus promotion.',
      change: {},
      breakActions: ['killDatabase', 'killServer'],
    },
    {
      id: 'independent',
      short: 'Independent',
      tag: 'IDEA',
      title: 'Spares must not fail together',
      body: [
        'Two servers in the same rack share its power. Two databases in one zone share its network. A bad config pushed everywhere breaks every copy at once.',
        'Put copies in different zones, roll out changes gradually, and the 99.9% parts can add up to well over 99.99%.',
      ],
      keyIdea: 'Redundancy works only when failures are independent.',
      change: {
        update: {
          nodes: [
            { id: 'db', sublabel: 'primary · zone A' },
            { id: 'standby', sublabel: 'standby · zone B' },
          ],
        },
      },
    },
    {
      id: 'active-passive',
      short: 'Modes',
      tag: 'IDEA',
      title: 'Active-active or active-passive',
      body: [
        'The app servers are <b>active-active</b>: both serve all the time, so the spare is always proven to work. The databases are <b>active-passive</b>: the standby waits, which is simpler for data but means the spare is less exercised.',
      ],
      keyIdea: 'Spares that serve traffic are spares you know work.',
      change: {},
    },
    {
      id: 'cost',
      short: 'Cost',
      tag: 'TRADE-OFF',
      title: 'Paying for things that wait',
      body: [
        'Every spare costs money and mostly sits idle. Failover paths also rot unless exercised: teams run planned drills, switching to the standby on purpose, to prove it works.',
      ],
      keyIdea: 'Redundancy costs capacity and practice. Untested failover is a guess.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'No single point of failure',
      body: [
        'One server meant 100% errors until a person stepped in. Two servers turned a crash into 3 seconds of 50% errors. A standby database turned losing the primary into about 4 seconds of downtime.',
      ],
      keyIdea: 'Double what you cannot lose, keep the copies apart, and practise switching.',
      change: {},
    },
  ],
};

export default lesson;
