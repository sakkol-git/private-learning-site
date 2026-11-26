import type { InfraLesson } from './index';

const GROUPS = ['g1', 'g2', 'g3', 'g4'];
const GROUP_Y = [1.5, 4.5, 7.5, 10.5];

const lesson: InfraLesson = {
  slug: 'back-of-the-envelope',
  chapter: 'Foundations',
  title: 'Back-of-the-envelope maths',
  summary:
    'Turn "ten million users" into requests per second, servers, storage and bandwidth, in a few lines of arithmetic.',
  minutes: 9,
  level: 'beginner',
  youWillLearn: [
    { text: 'How to turn daily users into requests per second', stepId: 'per-second' },
    { text: 'Why you size for the peak, not the average', stepId: 'peak' },
    { text: 'How to estimate servers and storage', stepId: 'storage' },
    { text: 'How to estimate bandwidth and cache memory', stepId: 'cache-size' },
    { text: 'A few numbers worth knowing by heart', stepId: 'numbers' },
  ],
  initial: {
    nodes: [
      { id: 'people', kind: 'users', label: 'Daily users', sublabel: '10 million', x: 0, y: 6 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4.5, y: 6 },
    ],
    links: [{ id: 'people-lb', from: 'people', to: 'lb' }],
    metrics: {
      users: 10_000_000,
      requestsPerSec: 0,
      p95LatencyMs: 0,
      errorRatePct: 0,
      healthy: [0, 0],
    },
  },
  steps: [
    {
      id: 'question',
      short: 'Question',
      tag: 'PROBLEM',
      title: 'How many servers do we need?',
      body: [
        '<b>Pinhole</b>, a photo-sharing app, expects 10 million daily users next year. The team must order hardware and budget storage now.',
        'Nobody knows the exact answer. A rough answer, right to within a factor of two, is enough to decide.',
      ],
      keyIdea: 'Estimates are for decisions: getting the order of magnitude right is the goal.',
      change: {},
    },
    {
      id: 'per-second',
      short: 'Per second',
      tag: 'IDEA',
      title: 'From users per day to requests per second',
      body: [
        'Each user makes about 30 requests a day: 10M × 30 = <b>300M requests a day</b>.',
        'A day has 86,400 seconds, call it 100,000. So on average about <b>3,500 requests per second</b>.',
      ],
      keyIdea: 'Daily total ÷ ~100,000 seconds ≈ average per second.',
      change: { metrics: { requestsPerSec: 3500 } },
    },
    {
      id: 'peak',
      short: 'Peak',
      tag: 'IDEA',
      title: 'Plan for the busiest hour',
      body: [
        'Traffic is not flat. Evenings run about three times the daily average: <b>10,500 requests per second</b> at peak.',
        'A system sized for the average would be overloaded every evening.',
      ],
      keyIdea: 'Size for the peak. Peak ≈ 2–3× average for most consumer apps.',
      change: { metrics: { requestsPerSec: 10500 } },
    },
    {
      id: 'servers',
      short: 'Servers',
      tag: 'SOLUTION',
      title: 'Count the servers',
      body: [
        'Load tests show one server handles about 800 requests per second flat out. Running each at a comfortable 500 means 10,500 ÷ 500 = 21, so <b>24 servers</b> to survive losing a few.',
        'Each block here stands for 6 servers. At peak each block is about <b>55%</b> busy.',
      ],
      keyIdea: 'Servers = peak ÷ comfortable load per server, plus room to lose some.',
      change: {
        add: {
          nodes: GROUPS.map((id, i) => ({
            id,
            kind: 'server' as const,
            label: `Servers ${i * 6 + 1}–${i * 6 + 6}`,
            x: 9,
            y: GROUP_Y[i] ?? 0,
            capacity: 4800,
          })),
          links: GROUPS.map((id) => ({ id: `lb-${id}`, from: 'lb', to: id })),
        },
        flows: GROUPS.map((id) => ({
          route: ['people', 'lb', id],
          kind: 'request' as const,
          ratePerSec: 2625,
        })),
        metrics: { p95LatencyMs: 120, healthy: [24, 24] },
      },
    },
    {
      id: 'storage',
      short: 'Storage',
      tag: 'IDEA',
      title: 'How much disk?',
      body: [
        'Users upload 2 million photos a day at about 2 MB each: <b>4 TB a day</b>, roughly 1.5 PB a year.',
        'Stored three times for safety, that is about 4.4 PB a year. That number decides the storage design more than any feature does.',
      ],
      keyIdea: 'Storage = items per day × size × copies × days kept.',
      change: {
        add: {
          nodes: [
            {
              id: 'photos',
              kind: 'database',
              label: 'Photo storage',
              sublabel: '+4 TB/day',
              x: 14,
              y: 6,
            },
          ],
          links: GROUPS.map((id) => ({ id: `${id}-photos`, from: id, to: 'photos' })),
        },
      },
    },
    {
      id: 'bandwidth',
      short: 'Bandwidth',
      tag: 'IDEA',
      title: 'How much network?',
      body: [
        'About 30% of peak requests download a 200 KB photo: 3,150 × 200 KB ≈ <b>630 MB per second</b>, about 5 gigabits.',
        'That is a lot for your own servers to send. It is a strong hint to serve photos from a CDN.',
      ],
      keyIdea: 'Bandwidth = requests per second × bytes per response.',
      change: {},
    },
    {
      id: 'cache-size',
      short: 'Cache',
      tag: 'IDEA',
      title: 'How much memory for a cache?',
      body: [
        'Most views go to recent photos. Caching details for the hottest 200 million at about 1 KB each needs <b>200 GB</b> of memory.',
        'That fits on a handful of cache servers, so a cache is affordable here.',
      ],
      keyIdea: 'Cache memory = hot items × size per item.',
      change: {},
    },
    {
      id: 'launch-day',
      short: 'Launch',
      tag: 'TRY IT',
      title: 'Launch day is bigger than planned',
      body: [
        'Predict: the plan has about 1.8× headroom at peak. What if a launch brings 5×?',
        'Press <b>Spike traffic 5×</b>. Each block gets 13,125 requests per second for 4,800 of capacity, and roughly <b>63%</b> of requests fail. The estimate covered normal peaks, not a launch.',
      ],
      keyIdea:
        'Estimate the extreme day too, then decide whether to buy for it or scale on demand.',
      change: {},
      breakActions: ['spikeTraffic'],
    },
    {
      id: 'numbers',
      short: 'Numbers',
      tag: 'IDEA',
      title: 'Numbers worth remembering',
      body: [
        'Memory read: ~100 ns. SSD read: ~100 µs. Round trip in one data centre: ~0.5 ms. Across a continent: 30–80 ms; across the world: ~150 ms.',
        'A day ≈ 100,000 seconds. A month ≈ 2.5 million. One server: hundreds to a few thousand simple requests per second.',
      ],
      keyIdea: 'A few rough constants let you check any design in your head.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Rough numbers, good decisions',
      body: [
        '10M users → 3,500 req/s average → 10,500 at peak → 24 servers. 4 TB of photos a day, 5 Gbit/s of downloads, 200 GB of cache.',
        'Each number pointed at a design choice: a load-balanced pool, object storage, a CDN and a cache.',
      ],
      keyIdea: 'Do the arithmetic before drawing boxes; it tells you which boxes you need.',
      change: {},
    },
  ],
};

export default lesson;
