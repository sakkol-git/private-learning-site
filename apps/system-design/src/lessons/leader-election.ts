import type { InfraLesson } from './index';

const NODES = ['n1', 'n2', 'n3'];
const NODE_Y = [2, 6, 10];

const lesson: InfraLesson = {
  slug: 'leader-election',
  chapter: 'Data across machines',
  title: 'Leader election and consensus',
  summary:
    'How a small cluster agrees on exactly one leader, and keeps agreeing when that leader dies.',
  minutes: 10,
  level: 'advanced',
  youWillLearn: [
    { text: 'Why two leaders at once is dangerous', stepId: 'two-leaders' },
    { text: 'How majorities and terms pick one leader', stepId: 'majority' },
    { text: 'What happens while a new leader is elected', stepId: 'leader-dies' },
    { text: 'Why clusters have 3 or 5 members', stepId: 'odd-sizes' },
  ],
  initial: {
    nodes: [
      { id: 'jobs', kind: 'users', label: 'Job clients', x: 0, y: 6 },
      { id: 'api', kind: 'server', label: 'Scheduler API', x: 5, y: 6, capacity: 2000 },
      ...NODES.map((id, i) => ({
        id,
        kind: 'database' as const,
        label: `Node ${i + 1}`,
        x: 10,
        y: NODE_Y[i] ?? 0,
        capacity: 1000,
        ...(i === 0 ? { tag: 'primary' } : {}),
      })),
    ],
    links: [
      { id: 'jobs-api', from: 'jobs', to: 'api' },
      ...NODES.map((id) => ({ id: `api-${id}`, from: 'api', to: id })),
      { id: 'n1-n2', from: 'n1', to: 'n2', style: 'dashed' },
      { id: 'n2-n3', from: 'n2', to: 'n3', style: 'dashed' },
    ],
    metrics: { users: 40, requestsPerSec: 200, p95LatencyMs: 15, errorRatePct: 0, healthy: [1, 1] },
  },
  steps: [
    {
      id: 'two-leaders',
      short: 'Problem',
      tag: 'PROBLEM',
      title: 'Two machines both run the billing job',
      body: [
        'A scheduler must run the nightly billing job exactly once. Two scheduler machines each check "is the other one alive?" A network blip makes each think the other died.',
        'Both run the job. Every customer is charged twice.',
      ],
      keyIdea: 'Deciding "who is in charge" by each machine guessing leads to two leaders.',
      change: {},
    },
    {
      id: 'majority',
      short: 'Majority',
      tag: 'IDEA',
      title: 'A leader needs a majority',
      body: [
        'Use three nodes. To lead, a node must win votes from a <b>majority</b>, 2 of 3. Each election has a numbered <b>term</b>, and a node votes once per term.',
        'Two majorities of the same three nodes always share a node, so two leaders cannot win the same term.',
      ],
      keyIdea: 'Majorities overlap, so at most one leader per term.',
      change: {},
    },
    {
      id: 'cluster',
      short: 'Cluster',
      tag: 'SOLUTION',
      title: 'Writes go through the leader',
      body: [
        'Node 1 won term 7. All 200 scheduler writes a second go to it, and it copies each one to the others. A write counts as done once a majority has stored it.',
        'Node 1 sends heartbeats so the others know it is alive.',
      ],
      keyIdea: 'Consensus: the leader orders writes, and a majority makes them permanent.',
      change: {
        update: {
          nodes: [
            { id: 'n1', sublabel: 'leader · term 7' },
            { id: 'n2', sublabel: 'follower' },
            { id: 'n3', sublabel: 'follower' },
          ],
        },
        flows: [
          { route: ['jobs', 'api', 'n1'], kind: 'request', ratePerSec: 200 },
          { route: ['n1', 'n2'], kind: 'healthCheck', ratePerSec: 1 },
          { route: ['n1', 'n2', 'n3'], kind: 'response', ratePerSec: 200 },
        ],
      },
    },
    {
      id: 'leader-dies',
      short: 'Leader dies',
      tag: 'TRY IT',
      title: 'Kill the leader',
      body: [
        'Predict: how long are writes unavailable when the leader dies?',
        'Press <b>Kill the primary database</b>. Heartbeats stop, and every write fails (<b>100%</b>) while the followers wait out their timeout and vote. After about 4 seconds Node 2 wins term 8, writes go to it, and errors return to 0%.',
      ],
      keyIdea: 'Failover time is the election timeout plus one round of voting.',
      change: {},
      breakActions: ['killDatabase'],
    },
    {
      id: 'timeouts',
      short: 'Timeouts',
      tag: 'TRADE-OFF',
      title: 'How long to wait before electing',
      body: [
        'A short timeout means faster failover. Too short, and a leader that pauses for half a second triggers a needless election.',
        'Each follower picks a slightly random timeout, so usually one asks for votes first and wins, instead of several splitting the vote.',
      ],
      keyIdea: 'Election timeouts trade failover speed against false alarms.',
      change: {},
    },
    {
      id: 'stale-leader',
      short: 'Fencing',
      tag: 'IDEA',
      title: 'The old leader comes back',
      body: [
        'Node 1 was only cut off, not dead. It still thinks it leads term 7. It cannot reach a majority, so its writes never commit, and when it hears of term 8 it steps down.',
        'Storage and other services also check a <b>fencing token</b>, the term number, and reject any request with an older one.',
      ],
      keyIdea: 'Terms and fencing tokens stop an old leader from doing damage.',
      change: {},
    },
    {
      id: 'odd-sizes',
      short: 'Sizes',
      tag: 'IDEA',
      title: 'Why 3 or 5 nodes',
      body: [
        '3 nodes survive 1 failure; 5 survive 2. A fourth node does not help: 4 needs a majority of 3, so it still survives only 1.',
        'More nodes also mean every write waits for more copies, so clusters stay small.',
      ],
      keyIdea: 'A cluster of 2f + 1 nodes tolerates f failures.',
      change: {},
    },
    {
      id: 'use-one',
      short: 'Reuse',
      tag: 'TRADE-OFF',
      title: 'Do not build this yourself',
      body: [
        'Consensus is notoriously hard to get right. Most systems lean on a ready-made coordination service for leader election, locks and small shared config, and keep it off the busy data path.',
      ],
      keyIdea: 'Use a proven consensus service; spend your effort elsewhere.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Exactly one in charge',
      body: [
        'Guessing produced two leaders. Majority votes with numbered terms allow only one. Losing the leader stopped writes for about 4 seconds until a new one was elected, and fencing kept the old one from interfering.',
      ],
      keyIdea: 'Agreement needs a majority, and a short pause when the leader changes.',
      change: {},
    },
  ],
};

export default lesson;
