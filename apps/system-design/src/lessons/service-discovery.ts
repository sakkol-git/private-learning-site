import type { InfraLesson } from './index';

const STOCK = ['stock1', 'stock2', 'stock3'];
const STOCK_Y = [2, 6, 10];

const calls = STOCK.map((id) => ({
  route: ['shoppers', 'lb', 'api', id],
  kind: 'request' as const,
  ratePerSec: 120,
}));

const heartbeats = STOCK.map((id) => ({
  route: [id, 'registry'],
  kind: 'healthCheck' as const,
  ratePerSec: 1,
}));

const lesson: InfraLesson = {
  slug: 'service-discovery',
  chapter: 'Scaling the web tier',
  title: 'Service discovery',
  summary: 'When servers come and go every hour, how does one service find another?',
  minutes: 8,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Why hard-coded addresses break in a scaling system', stepId: 'moving-target' },
    { text: 'How a registry and heartbeats track live instances', stepId: 'registry' },
    { text: 'Client-side versus server-side discovery', stepId: 'who-looks-up' },
    { text: 'How fast a dead instance is noticed, and why', stepId: 'leases' },
  ],
  initial: {
    nodes: [
      { id: 'shoppers', kind: 'users', label: 'Shoppers', x: 0, y: 6 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4, y: 6 },
      { id: 'api', kind: 'service', label: 'Checkout API', x: 8, y: 6, capacity: 2000 },
      ...STOCK.map((id, i) => ({
        id,
        kind: 'server' as const,
        label: `Stock ${i + 1}`,
        sublabel: `10.0.4.${11 + i}`,
        x: 12.5,
        y: STOCK_Y[i] ?? 0,
        capacity: 200,
      })),
    ],
    links: [
      { id: 'shoppers-lb', from: 'shoppers', to: 'lb' },
      { id: 'lb-api', from: 'lb', to: 'api' },
      ...STOCK.map((id) => ({ id: `api-${id}`, from: 'api', to: id })),
    ],
    metrics: {
      users: 3600,
      requestsPerSec: 360,
      p95LatencyMs: 60,
      errorRatePct: 0,
      healthy: [3, 3],
    },
  },
  steps: [
    {
      id: 'hard-coded',
      short: 'Addresses',
      tag: 'PROBLEM',
      title: 'A list of addresses in a config file',
      body: [
        'The checkout API calls the stock service to reserve items. It finds the three stock servers from a list of addresses in its config file.',
        'Each instance takes 120 calls a second, 60% of what it can handle.',
      ],
      keyIdea: 'A fixed list of addresses works only while nothing moves.',
      change: { flows: calls },
    },
    {
      id: 'moving-target',
      short: 'Moving',
      tag: 'PROBLEM',
      title: 'The addresses keep changing',
      body: [
        'Autoscaling adds instances in the evening and removes them at night. Crashed ones are replaced on new machines with new addresses. A deploy replaces all of them.',
        'Every change means editing the config of every caller. Miss one, and it calls a machine that no longer exists.',
      ],
      keyIdea: 'In an elastic system, instance addresses are temporary facts.',
      change: { update: { nodes: [{ id: 'stock2', sublabel: 'replaced · new address' }] } },
    },
    {
      id: 'registry',
      short: 'Registry',
      tag: 'SOLUTION',
      title: 'A registry of live instances',
      body: [
        'Each instance registers itself in a <b>service registry</b> when it starts, then sends a <b>heartbeat</b> every few seconds: the faint dots.',
        'Callers ask the registry, "where is the stock service?", and get the current list. Nobody edits config files any more.',
      ],
      keyIdea: 'Instances announce themselves; callers look them up by name.',
      change: {
        add: {
          nodes: [
            {
              id: 'registry',
              kind: 'dns',
              label: 'Registry',
              sublabel: 'stock: 3 live',
              x: 17,
              y: 6,
            },
          ],
          links: STOCK.map((id) => ({
            id: `${id}-registry`,
            from: id,
            to: 'registry',
            style: 'dashed' as const,
          })),
        },
        update: { nodes: STOCK.map((id) => ({ id, sublabel: 'registered' })) },
        flows: [...calls, ...heartbeats],
      },
    },
    {
      id: 'who-looks-up',
      short: 'Lookup',
      tag: 'IDEA',
      title: 'Who does the looking up?',
      body: [
        '<b>Client-side discovery</b>: the checkout API fetches the list, caches it, and picks an instance itself. One less hop, but every caller needs the logic.',
        '<b>Server-side discovery</b>: callers send to one stable address, and a load balancer there reads the registry. Simpler callers, one more hop. DNS names with a short TTL are a simple version of this.',
      ],
      keyIdea: 'Either the caller chooses an instance, or a balancer chooses for it.',
      change: {},
    },
    {
      id: 'instance-dies',
      short: 'Lose one',
      tag: 'TRY IT',
      title: 'An instance dies without saying goodbye',
      body: [
        'Predict: how long do calls keep going to a dead instance?',
        'Press <b>Kill a server</b>. Stock 2 stops sending heartbeats, and for about 3 seconds a third of calls fail (<b>33%</b>). Then its registration lapses, callers drop it, and errors return to 0%. The other two now take 180 calls each, 90% busy, so p95 rises from 60 ms to about <b>100 ms</b>.',
      ],
      keyIdea: 'Discovery is only as fresh as its heartbeats.',
      change: {},
      breakActions: ['killServer', 'spikeTraffic'],
    },
    {
      id: 'leases',
      short: 'Leases',
      tag: 'TRADE-OFF',
      title: 'How quickly to give up on an instance',
      body: [
        'A registration is a <b>lease</b>: it expires unless renewed. A 3-second lease removes dead instances quickly, but a short network hiccup can remove healthy ones too.',
        'A 30-second lease is calmer, but sends traffic to a dead machine ten times longer. Callers also retry on another instance to cover the gap.',
      ],
      keyIdea: 'Short leases react fast and flap more; long leases are stable and slow.',
      change: {},
    },
    {
      id: 'ready',
      short: 'Ready',
      tag: 'IDEA',
      title: 'Alive is not the same as ready',
      body: [
        'A new instance may be running but still loading data. It should register only once a <b>readiness</b> check passes, and deregister before it shuts down so callers stop sending first.',
      ],
      keyIdea: 'Register when ready, deregister before stopping.',
      change: {},
    },
    {
      id: 'registry-risk',
      short: 'Risk',
      tag: 'TRADE-OFF',
      title: 'The registry must not be the weak spot',
      body: [
        'If every lookup needs the registry, its outage stops every service. So registries run as 3 or 5 copies that agree through consensus, and callers keep using their last known list if it is unreachable.',
      ],
      keyIdea: 'Replicate the registry, and let callers cache what it told them.',
      change: { update: { nodes: [{ id: 'registry', sublabel: '3 copies · cached' }] } },
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Find services by name',
      body: [
        'Instances register and heartbeat; callers look up live ones by name. Leases decide how quickly a dead instance disappears, and a replicated, cached registry keeps lookups working.',
      ],
      keyIdea: 'Name services, not machines.',
      change: {},
    },
  ],
};

export default lesson;
