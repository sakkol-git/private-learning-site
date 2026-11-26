import type { InfraAction, InfraMetrics } from '@ss/diagram-engine';
import type { Lesson } from '@ss/lesson-engine';

const toServers = (a: number, b: number, c: number) => [
  { route: ['users', 'lb', 'a', 'db'], kind: 'request' as const, ratePerSec: a },
  { route: ['users', 'lb', 'b', 'db'], kind: 'request' as const, ratePerSec: b },
  { route: ['users', 'lb', 'c', 'db'], kind: 'request' as const, ratePerSec: c },
];

const healthChecks = ['a', 'b', 'c'].map((id) => ({
  route: ['lb', id],
  kind: 'healthCheck' as const,
  ratePerSec: 1,
}));

const lesson: Lesson<InfraMetrics, InfraAction> = {
  slug: 'load-balancing',
  chapter: 'Scaling',
  title: 'Load balancing',
  summary: 'Spread traffic across many servers, and keep going when one of them dies.',
  minutes: 9,
  level: 'beginner',
  youWillLearn: [
    { text: 'Why extra servers need a front door', stepId: 'front-door' },
    { text: 'How health checks route around a dead server', stepId: 'pull-the-plug' },
    { text: 'Round robin versus least connections', stepId: 'least-connections' },
    { text: 'What sticky sessions cost you', stepId: 'sticky-sessions' },
    { text: 'The difference between L4 and L7 balancers', stepId: 'l4-vs-l7' },
    { text: 'Why the balancer itself needs a backup', stepId: 'single-point' },
  ],
  initial: {
    nodes: [
      { id: 'users', kind: 'users', label: 'Shoppers', x: 0, y: 6.5 },
      { id: 'a', kind: 'server', label: 'Server A', x: 9, y: 3, capacity: 400 },
      { id: 'db', kind: 'database', label: 'Orders DB', x: 13.5, y: 6.5, capacity: 1500 },
    ],
    links: [
      { id: 'users-a', from: 'users', to: 'a' },
      { id: 'a-db', from: 'a', to: 'db' },
    ],
    metrics: {
      users: 1200,
      requestsPerSec: 120,
      p95LatencyMs: 95,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'too-busy',
      short: 'Overload',
      tag: 'PROBLEM',
      title: 'One server, too many shoppers',
      body: [
        'A sale goes live. Traffic jumps from 120 to <b>520 requests per second</b>.',
        'Server A can handle about 400. The extra requests wait in a queue, and some time out.',
      ],
      keyIdea:
        'A single server has a hard ceiling. Past it, latency climbs fast and errors follow.',
      change: {
        update: { nodes: [{ id: 'a', health: 'degraded' }] },
        flows: [{ route: ['users', 'a', 'db'], kind: 'request', ratePerSec: 520 }],
        metrics: { users: 5200, requestsPerSec: 520, p95LatencyMs: 1850, errorRatePct: 9 },
      },
    },
    {
      id: 'more-servers',
      short: 'More boxes',
      tag: 'IDEA',
      title: 'Buy two more servers',
      body: [
        'Servers B and C come online, each running the same code as A.',
        'Nothing improves. Every shopper still types the same address, and that address points at Server A.',
      ],
      keyIdea: 'Extra capacity is useless until traffic can actually reach it.',
      change: {
        add: {
          nodes: [
            { id: 'b', kind: 'server', label: 'Server B', x: 9, y: 6.5, capacity: 400 },
            { id: 'c', kind: 'server', label: 'Server C', x: 9, y: 10, capacity: 400 },
          ],
          links: [
            { id: 'b-db', from: 'b', to: 'db' },
            { id: 'c-db', from: 'c', to: 'db' },
          ],
        },
        metrics: { healthy: [3, 3] },
      },
    },
    {
      id: 'front-door',
      short: 'Front door',
      tag: 'SOLUTION',
      title: 'Put a load balancer in front',
      body: [
        'The public address now points at a <b>load balancer</b>. It holds no business logic. Its only job is to pass each request to a server.',
        'With three servers sharing 520 requests, each one sees about 173 per second, well under its limit.',
      ],
      keyIdea: 'Clients talk to one stable address. The servers behind it can change freely.',
      change: {
        add: {
          nodes: [{ id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4.5, y: 6.5 }],
          links: [
            { id: 'users-lb', from: 'users', to: 'lb' },
            { id: 'lb-a', from: 'lb', to: 'a' },
            { id: 'lb-b', from: 'lb', to: 'b' },
            { id: 'lb-c', from: 'lb', to: 'c' },
          ],
        },
        remove: { links: ['users-a'] },
        update: { nodes: [{ id: 'a', health: 'healthy' }] },
        flows: toServers(174, 173, 173),
        metrics: { p95LatencyMs: 140, errorRatePct: 0 },
      },
    },
    {
      id: 'health-checks',
      short: 'Health checks',
      tag: 'IDEA',
      title: 'Ask each server: are you alive?',
      body: [
        'Every few seconds the balancer calls <code>GET /health</code> on each server. The grey dots are those checks.',
        'A server that fails several checks in a row is taken out of rotation. When it passes again, it is put back.',
      ],
      keyIdea:
        'The balancer only sends traffic to servers that have recently proved they are healthy.',
      change: {
        flows: [...toServers(174, 173, 173), ...healthChecks],
      },
    },
    {
      id: 'pull-the-plug',
      short: 'Pull the plug',
      tag: 'TRY IT',
      title: 'Pull the plug on Server B',
      body: [
        'Press <b>Kill a server</b> and watch closely.',
        'For about three seconds the balancer has not noticed. A third of requests still go to B and fail.',
        'Then the health check fails, B leaves the rotation, and errors drop back to zero. A and C each take more load, so latency rises a little.',
      ],
      keyIdea:
        'Health checks turn a hard crash into a short blip. The check interval sets how long that blip lasts.',
      change: {},
      breakActions: ['killServer', 'spikeTraffic'],
    },
    {
      id: 'round-robin',
      short: 'Round robin',
      tag: 'PROBLEM',
      title: 'Round robin ignores how busy a server is',
      body: [
        'So far the balancer has used <b>round robin</b>: A, then B, then C, then A again.',
        'Server C is an older machine that tops out near 220 requests per second. It gets the same share as the others and runs hot.',
      ],
      keyIdea: 'Round robin is simple and fair in count, but not in effort.',
      change: {
        update: {
          nodes: [{ id: 'c', sublabel: 'older machine', capacity: 220, health: 'degraded' }],
        },
        metrics: { p95LatencyMs: 410 },
      },
    },
    {
      id: 'least-connections',
      short: 'Least conn.',
      tag: 'SOLUTION',
      title: 'Send work to whoever is least busy',
      body: [
        'With <b>least connections</b>, the balancer counts open requests per server and picks the server with the fewest.',
        'Slow servers hold connections longer, so they naturally receive less. C settles at about 110 requests per second.',
      ],
      keyIdea:
        'Least connections adapts to uneven servers and uneven requests with no extra setup.',
      change: {
        update: { nodes: [{ id: 'c', health: 'healthy' }] },
        flows: [...toServers(205, 205, 110), ...healthChecks],
        metrics: { p95LatencyMs: 135 },
      },
    },
    {
      id: 'sticky-sessions',
      short: 'Sticky',
      tag: 'TRADE-OFF',
      title: 'Sticky sessions: convenient, then lopsided',
      body: [
        'Suppose each server keeps shopping carts in its own memory. A shopper must keep returning to the same server, so the balancer pins them with a cookie.',
        'Pinning breaks the even spread. A crowd that landed on Server A stays there, and if A dies, their carts die with it.',
      ],
      keyIdea:
        'Keep servers stateless. Put sessions in a shared store, and any server can handle any request.',
      change: {
        update: { nodes: [{ id: 'a', sublabel: 'holds 60% of carts' }] },
        flows: [...toServers(290, 140, 90), ...healthChecks],
        metrics: { p95LatencyMs: 175 },
      },
    },
    {
      id: 'l4-vs-l7',
      short: 'L4 vs L7',
      tag: 'IDEA',
      title: 'How much should the balancer read?',
      body: [
        'An <b>L4</b> balancer sees only addresses and ports. It forwards bytes without opening them, which makes it very fast.',
        'An <b>L7</b> balancer reads the HTTP request. It can send <code>/images/*</code> to a separate image service, terminate TLS, and retry failed calls.',
      ],
      keyIdea:
        'L4 is cheaper and faster. L7 is smarter. Many systems use an L4 tier in front of an L7 tier.',
      change: {
        add: {
          nodes: [
            { id: 'img', kind: 'service', label: 'Image service', x: 4.5, y: 10.5, capacity: 300 },
          ],
          links: [{ id: 'lb-img', from: 'lb', to: 'img', label: '/images/*' }],
        },
        update: {
          nodes: [
            { id: 'lb', sublabel: 'L7 · routes by path' },
            { id: 'a', sublabel: '' },
          ],
        },
        flows: [
          ...toServers(175, 175, 100),
          { route: ['users', 'lb', 'img'], kind: 'request', ratePerSec: 90 },
          ...healthChecks,
        ],
        metrics: { requestsPerSec: 540, p95LatencyMs: 120 },
      },
    },
    {
      id: 'single-point',
      short: 'Backup',
      tag: 'TRADE-OFF',
      title: 'Now the balancer is the weak spot',
      body: [
        'Every request passes through one balancer. If it fails, all servers are healthy and nobody can reach them.',
        'The usual fix is a standby pair. Both share a floating IP address and send each other heartbeats. If the active one goes quiet, the standby takes over the address within seconds.',
      ],
      keyIdea: 'Any component that every request touches needs a backup of its own.',
      change: {
        add: {
          nodes: [{ id: 'lb2', kind: 'loadBalancer', label: 'Standby balancer', x: 4.5, y: 2.5 }],
          links: [{ id: 'lb-lb2', from: 'lb', to: 'lb2', label: 'heartbeat', style: 'dashed' }],
        },
        update: { nodes: [{ id: 'lb', label: 'Active balancer' }] },
      },
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'What you built',
      body: [
        'One public address, a balancer pair, and a pool of stateless servers it checks every few seconds.',
        'You can add a server to handle a sale, lose a server without an outage, and send different paths to different services.',
      ],
      keyIdea: 'Load balancing is how one system becomes many machines without users noticing.',
      change: {},
    },
  ],
};

export default lesson;
