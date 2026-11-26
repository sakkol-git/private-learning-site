import type { CourseLesson } from './index';

const far = (rate: number) => [
  { route: ['people', 'isp', 'sea', 'origin'], kind: 'request' as const, ratePerSec: rate },
  { route: ['origin', 'sea', 'isp', 'people'], kind: 'response' as const, ratePerSec: rate },
];
const near = (rate: number) => [
  { route: ['people', 'isp', 'edge'], kind: 'request' as const, ratePerSec: rate },
  { route: ['edge', 'isp', 'people'], kind: 'response' as const, ratePerSec: rate },
];

const lesson: CourseLesson = {
  slug: 'content-delivery',
  chapter: 'Making it fast',
  title: 'Content delivery networks',
  summary: 'Keep copies of a site close to its visitors, so most requests never cross the ocean.',
  minutes: 6,
  level: 'intermediate',
  youWillLearn: [
    { text: 'What a CDN edge server is', stepId: 'edge' },
    { text: 'Which content a CDN can serve', stepId: 'what-to-cache' },
    { text: 'How a CDN soaks up attacks', stepId: 'flood' },
    { text: 'The cost of copies: stale content', stepId: 'stale' },
  ],
  initial: {
    nodes: [
      { id: 'people', kind: 'users', label: 'Visitors', sublabel: 'this continent', x: 0, y: 6 },
      { id: 'isp', kind: 'router', label: 'Local network', x: 5, y: 6 },
      { id: 'sea', kind: 'router', label: 'Undersea cable', x: 10, y: 6 },
      {
        id: 'origin',
        kind: 'server',
        label: 'Origin server',
        sublabel: 'other continent',
        x: 15,
        y: 6,
        capacity: 400,
      },
    ],
    links: [
      { id: 'people-isp', from: 'people', to: 'isp' },
      { id: 'isp-sea', from: 'isp', to: 'sea' },
      { id: 'sea-origin', from: 'sea', to: 'origin' },
    ],
    metrics: { pageLoadMs: 1100, roundTripMs: 180, lossPct: 0, okPct: 100, hops: 3 },
  },
  steps: [
    {
      id: 'far-away',
      short: 'Far',
      tag: 'PROBLEM',
      title: 'Every visitor crosses the ocean',
      body: [
        'A shop’s only server is on another continent. Every image, script and page crosses the ocean and back: 180 ms a round trip.',
        'Pages take over a second, and the origin server carries every single request.',
      ],
      keyIdea: 'One faraway server makes everyone far away.',
      change: { flows: far(60) },
    },
    {
      id: 'edge',
      short: 'Edge',
      tag: 'SOLUTION',
      title: 'Put a copy nearby',
      body: [
        'A <b>content delivery network</b> (CDN) runs <b>edge servers</b> in many cities. The nearest one keeps copies of the shop’s files.',
        'Most requests now stop at the edge, 25 ms away. Pages load in about <b>300 ms</b>, and the origin sees a fraction of the traffic.',
      ],
      keyIdea: 'Serve from nearby, and the ocean only matters for what changes.',
      change: {
        add: {
          nodes: [
            {
              id: 'edge',
              kind: 'cdn',
              label: 'CDN edge',
              sublabel: 'same city',
              x: 5,
              y: 1.5,
              capacity: 20000,
            },
          ],
          links: [{ id: 'isp-edge', from: 'isp', to: 'edge' }],
        },
        flows: [...near(50), ...far(10)],
        metrics: { pageLoadMs: 300, roundTripMs: 25 },
      },
    },
    {
      id: 'what-to-cache',
      short: 'What',
      tag: 'IDEA',
      title: 'Copy what everyone sees',
      body: [
        'Images, styles, scripts and videos are the same for every visitor, so the edge can serve them.',
        'Your basket and account page are personal. Those still go to the origin.',
      ],
      keyIdea: 'Static content belongs at the edge; personal content at the origin.',
      change: { update: { nodes: [{ id: 'edge', sublabel: 'images · scripts · video' }] } },
    },
    {
      id: 'flood',
      short: 'Flood',
      tag: 'TRY IT',
      title: 'A flood of fake traffic',
      body: [
        'A botnet attacks the shop, and its traffic reaches the shop through the CDN.',
        'Press <b>DDoS attack</b>. The edge network is built for huge traffic and absorbs the flood. Real visitors barely notice.',
      ],
      keyIdea: 'A big CDN is also a big shield.',
      change: {
        add: {
          nodes: [{ id: 'bots', kind: 'attacker', label: 'Botnet', x: 9.5, y: 0 }],
          links: [{ id: 'bots-edge', from: 'bots', to: 'edge' }],
        },
      },
      breakActions: ['ddos'],
    },
    {
      id: 'stale',
      short: 'Stale',
      tag: 'TRADE-OFF',
      title: 'Copies can be out of date',
      body: [
        'When the shop changes a price image, edges keep the old copy until it expires or is purged.',
        'Sites give files unique names when they change, so the edge never serves an old version by mistake.',
      ],
      keyIdea: 'Every copy needs a plan for going stale.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Bring the content to the people',
      body: [
        'A CDN keeps shared files close to visitors. Pages get faster, the origin does less work, and floods hit the edge instead of the shop.',
        'Next: what happens when an attack has no CDN in the way.',
      ],
      keyIdea: 'Closer is faster, and wider is safer.',
      change: {},
    },
  ],
};

export default lesson;
