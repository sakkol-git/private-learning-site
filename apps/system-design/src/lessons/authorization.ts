import type { InfraLesson } from './index';

const lesson: InfraLesson = {
  slug: 'authorization',
  chapter: 'Security',
  title: 'Authorization',
  summary:
    'Check, on every request, that this user may do this to this object, and keep those checks fast.',
  minutes: 9,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Why logged in is not the same as allowed', stepId: 'idor' },
    { text: 'Roles, attributes and relationships', stepId: 'models' },
    { text: 'Why a central policy service needs a cache', stepId: 'policy-try' },
    { text: 'What least privilege means in practice', stepId: 'least-privilege' },
  ],
  initial: {
    nodes: [
      { id: 'team', kind: 'users', label: 'Workspace users', x: 0, y: 6 },
      { id: 'api', kind: 'server', label: 'Docs API', x: 5, y: 6, capacity: 1500 },
      { id: 'docs', kind: 'database', label: 'Documents', x: 13, y: 9, capacity: 3000 },
    ],
    links: [
      { id: 'team-api', from: 'team', to: 'api' },
      { id: 'api-docs', from: 'api', to: 'docs' },
    ],
    metrics: {
      users: 3000,
      requestsPerSec: 300,
      p95LatencyMs: 70,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'idor',
      short: 'Problem',
      tag: 'PROBLEM',
      title: 'Change one number, read someone else’s doc',
      body: [
        '<code>GET /docs/1043</code> checks that you are logged in, then returns document 1043. Change it to 1044 and you read another company’s contract.',
        'This is the most common access bug: the check exists, but not for the object.',
      ],
      keyIdea: 'Authenticated is not authorized. Check access to each object.',
      change: { flows: [{ route: ['team', 'api', 'docs'], kind: 'request', ratePerSec: 300 }] },
    },
    {
      id: 'every-request',
      short: 'Every time',
      tag: 'IDEA',
      title: 'Deny unless allowed',
      body: [
        'On every request ask: may <b>this user</b> do <b>this action</b> to <b>this object</b>? If no rule says yes, the answer is no.',
        'Check on the server. Hiding a button in the app is not a permission.',
      ],
      keyIdea: 'Default deny, checked server-side, for every object.',
      change: {},
    },
    {
      id: 'models',
      short: 'Models',
      tag: 'IDEA',
      title: 'Roles, attributes, relationships',
      body: [
        '<b>Roles</b>: viewer, editor, admin; simple, and coarse. <b>Attributes</b>: "same company and not archived". <b>Relationships</b>: "shared with Ana" or "member of a folder that is shared with Ana".',
        'Most products combine them.',
      ],
      keyIdea: 'Pick the simplest model that expresses your sharing rules.',
      change: {},
    },
    {
      id: 'policy',
      short: 'Policy',
      tag: 'SOLUTION',
      title: 'One place for the rules',
      body: [
        'Rules scattered through the code drift apart. A <b>policy service</b> holds them all: every API asks it "may user 7 edit doc 1043?" and it logs each answer for audits.',
        'That is one extra call per request, 300 a second.',
      ],
      keyIdea: 'Centralise policy so every service applies the same rules.',
      change: {
        add: {
          nodes: [
            { id: 'policy', kind: 'service', label: 'Policy service', x: 13, y: 3, capacity: 2000 },
          ],
          links: [{ id: 'api-policy', from: 'api', to: 'policy' }],
        },
        flows: [
          { route: ['team', 'api', 'policy'], kind: 'request', ratePerSec: 300 },
          { route: ['team', 'api', 'docs'], kind: 'request', ratePerSec: 300 },
        ],
      },
    },
    {
      id: 'policy-try',
      short: 'Slow',
      tag: 'TRY IT',
      title: 'The policy service slows down',
      body: [
        'Predict: every request now waits on policy. What if it gets slow?',
        'Press <b>Slow down a dependency</b>. The Docs API waits on each check five times longer, runs out of threads, and <b>half</b> of all requests fail.',
      ],
      keyIdea:
        'A check on every request makes the checker part of every request’s latency and uptime.',
      change: {},
      breakActions: ['slowDependency'],
    },
    {
      id: 'decision-cache',
      short: 'Cache',
      tag: 'SOLUTION',
      title: 'Cache decisions briefly',
      body: [
        'The API keeps recent answers for 60 seconds and asks policy only on a miss, with a short timeout. Rules that rarely change, like a user’s roles, travel in their signed token.',
        'Press <b>Slow down a dependency</b> again: checks are answered from the cache and errors stay at <b>0%</b>.',
      ],
      keyIdea: 'Cache authorization decisions close to where they are used.',
      change: {
        remove: { links: ['api-policy'] },
        add: {
          nodes: [
            {
              id: 'decisions',
              kind: 'shield',
              label: 'Decision cache',
              sublabel: '60 s',
              x: 9,
              y: 3,
            },
          ],
          links: [
            { id: 'api-decisions', from: 'api', to: 'decisions' },
            { id: 'decisions-policy', from: 'decisions', to: 'policy' },
          ],
        },
        flows: [
          { route: ['team', 'api', 'decisions', 'policy'], kind: 'request', ratePerSec: 300 },
          { route: ['team', 'api', 'docs'], kind: 'request', ratePerSec: 300 },
        ],
      },
      breakActions: ['slowDependency'],
    },
    {
      id: 'staleness',
      short: 'Staleness',
      tag: 'TRADE-OFF',
      title: 'Revoked, but still allowed',
      body: [
        'With a 60-second cache, someone removed from a document can still open it for up to a minute. For most documents that is fine. For firing an admin, clear their cached decisions and tokens at once.',
      ],
      keyIdea: 'Caching permissions trades a short window of staleness for speed and uptime.',
      change: {},
    },
    {
      id: 'least-privilege',
      short: 'Least',
      tag: 'IDEA',
      title: 'Least privilege',
      body: [
        'Give people and services only the access they need. The search indexer can read documents but not delete them. Support staff see a customer’s data only with a ticket, and every access is logged.',
      ],
      keyIdea: 'Small permissions keep a mistake or a breach small.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Allowed, per object, every time',
      body: [
        'Checking only login let anyone read any document. A central policy service fixed the rules, but its slowdown failed half of requests until decisions were cached for 60 seconds.',
      ],
      keyIdea: 'Default deny, check each object, centralise rules, cache answers.',
      change: {},
    },
  ],
};

export default lesson;
