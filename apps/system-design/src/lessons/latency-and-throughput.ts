import type { InfraLesson } from './index';

const calls = (rate: number, to: string[] = ['api']) =>
  to.flatMap((id) => [
    { route: ['apps', 'lb', id, 'store'], kind: 'request' as const, ratePerSec: rate / to.length },
    { route: ['store', id, 'lb', 'apps'], kind: 'response' as const, ratePerSec: rate / to.length },
  ]);

const lesson: InfraLesson = {
  slug: 'latency-and-throughput',
  chapter: 'Foundations',
  title: 'Latency and throughput',
  summary:
    'How fast one request is, how many you can serve, and why the two pull against each other near the limit.',
  minutes: 9,
  level: 'beginner',
  youWillLearn: [
    { text: 'The difference between latency and throughput', stepId: 'two-numbers' },
    { text: 'Why latency explodes as a server nears 100% busy', stepId: 'hockey-stick' },
    { text: 'What p50, p95 and p99 tell you', stepId: 'percentiles' },
    { text: 'Why distance sets a floor no server can beat', stepId: 'distance' },
    { text: "Little's law, fan-out tails and batching", stepId: 'fan-out' },
  ],
  initial: {
    nodes: [
      { id: 'apps', kind: 'users', label: 'Phone apps', x: 0, y: 6 },
      { id: 'lb', kind: 'loadBalancer', label: 'Front door', x: 4.5, y: 6 },
      {
        id: 'api',
        kind: 'server',
        label: 'Thumbnail API',
        sublabel: '100 req/s max',
        x: 9,
        y: 4,
        capacity: 100,
      },
      { id: 'store', kind: 'database', label: 'Image store', x: 13.5, y: 6, capacity: 2000 },
    ],
    links: [
      { id: 'apps-lb', from: 'apps', to: 'lb' },
      { id: 'lb-api', from: 'lb', to: 'api' },
      { id: 'api-store', from: 'api', to: 'store' },
    ],
    metrics: { users: 200, requestsPerSec: 20, p95LatencyMs: 40, errorRatePct: 0, healthy: [1, 1] },
  },
  steps: [
    {
      id: 'two-numbers',
      short: 'Two numbers',
      tag: 'IDEA',
      title: 'How long, and how many',
      body: [
        'An app asks this API to shrink photos into thumbnails. <b>Latency</b> is how long one request takes: 40 ms here. <b>Throughput</b> is how many requests it handles each second: 20 right now.',
        'The server can do at most 100 per second. At 20 it is 20% busy, and requests almost never wait.',
      ],
      keyIdea: 'Latency is time per request. Throughput is requests per unit of time.',
      change: { flows: calls(20) },
    },
    {
      id: 'busier',
      short: 'Busier',
      tag: 'PROBLEM',
      title: 'Three times the traffic',
      body: [
        'Traffic triples to <b>60 requests per second</b>. The work per request has not changed, yet p95 doubles to <b>80 ms</b>.',
        'Requests now sometimes arrive while the server is still busy with others, and they wait in line.',
      ],
      keyIdea: 'Busier servers do not work slower; requests wait longer.',
      change: { flows: calls(60), metrics: { users: 600, requestsPerSec: 60, p95LatencyMs: 80 } },
    },
    {
      id: 'hockey-stick',
      short: 'Curve',
      tag: 'IDEA',
      title: 'The hockey stick',
      body: [
        'Waiting grows faster than load. For this server: 50% busy → 64 ms, 80% → 160 ms, 90% → 320 ms, 95% → 640 ms.',
        'The last 10% of capacity costs more latency than the first 80%. That is why teams aim to run around 50–70% busy.',
      ],
      keyIdea: 'Latency rises gently, then sharply, as utilisation approaches 100%.',
      change: { update: { nodes: [{ id: 'api', sublabel: 'keep under ~70%' }] } },
    },
    {
      id: 'overload',
      short: 'Overload',
      tag: 'TRY IT',
      title: 'Push it past the limit',
      body: [
        'Predict first: what happens to errors and p95 if 300 requests per second arrive at a server that can do 100?',
        'Press <b>Spike traffic 5×</b>. The server can still only finish 100 a second, so about <b>two thirds</b> of requests fail, and p95 hits <b>640 ms</b> for the ones that get through.',
      ],
      keyIdea:
        'Past 100%, extra load does not raise throughput. It turns into errors and queueing.',
      change: {},
      breakActions: ['spikeTraffic'],
    },
    {
      id: 'percentiles',
      short: 'p95',
      tag: 'IDEA',
      title: 'Averages hide the slow requests',
      body: [
        'Sort a minute of response times. The middle one is <b>p50</b>: 30 ms. The one slower than 95% of the rest is <b>p95</b>: 80 ms. <b>p99</b> is 250 ms.',
        'An average of 38 ms would hide that 1 request in 100 takes a quarter of a second. Heavy users hit p99 many times a day.',
      ],
      keyIdea: 'Track percentiles, not averages. Users feel the slow tail.',
      change: {},
    },
    {
      id: 'more-capacity',
      short: 'Capacity',
      tag: 'SOLUTION',
      title: 'Add a second server',
      body: [
        'A second server splits the 60 requests per second. Each is now 30% busy, and p95 falls back to about <b>46 ms</b>.',
        'More capacity raises throughput and, by cutting waiting, lowers latency too.',
      ],
      keyIdea: 'Spare capacity is what keeps latency low.',
      change: {
        add: {
          nodes: [
            { id: 'api2', kind: 'server', label: 'Thumbnail API 2', x: 9, y: 8.5, capacity: 100 },
          ],
          links: [
            { id: 'lb-api2', from: 'lb', to: 'api2' },
            { id: 'api2-store', from: 'api2', to: 'store' },
          ],
        },
        update: { nodes: [{ id: 'api', sublabel: '' }] },
        flows: calls(60, ['api', 'api2']),
        metrics: { p95LatencyMs: 46, healthy: [2, 2] },
      },
    },
    {
      id: 'distance',
      short: 'Distance',
      tag: 'TRADE-OFF',
      title: 'Servers cannot fix distance',
      body: [
        'For a user on another continent, the round trip alone is about 150 ms. No number of servers changes that.',
        'Throughput problems are solved with more machines. Latency floors are solved by moving closer, or by needing fewer round trips.',
      ],
      keyIdea: 'Distance sets a minimum latency. Capacity only removes the waiting on top.',
      change: {},
    },
    {
      id: 'in-flight',
      short: 'In flight',
      tag: 'IDEA',
      title: "Little's law",
      body: [
        'Requests being worked on at any moment = arrival rate × time each one takes. Here 60 per second × 0.046 s ≈ <b>3 in flight</b>.',
        'If each request suddenly took 2 seconds, 120 would be in flight, and the server would run out of threads long before it ran out of CPU.',
      ],
      keyIdea: 'In flight = rate × latency. Slow requests fill up a server even at low traffic.',
      change: {},
    },
    {
      id: 'fan-out',
      short: 'Fan-out',
      tag: 'TRADE-OFF',
      title: 'Fan-out makes tails common',
      body: [
        'A feed page calls 10 services in parallel and waits for all of them. If each is slow 1% of the time, about <b>1 page in 10</b> is slow (1 − 0.99¹⁰ ≈ 9.6%).',
        '<b>Batching</b> pulls the other way: sending 50 thumbnails in one call raises throughput, but the first image waits for the whole batch.',
      ],
      keyIdea:
        'The more calls a request waits on, the more often it meets someone else’s slow moment.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Watch both numbers',
      body: [
        'Throughput is capacity; latency is experience. Near full capacity, waiting explodes and percentiles reveal it. Distance sets a floor, fan-out multiplies tails, and batching trades one for the other.',
      ],
      keyIdea: 'Run with headroom, measure percentiles, and count round trips.',
      change: {},
    },
  ],
};

export default lesson;
