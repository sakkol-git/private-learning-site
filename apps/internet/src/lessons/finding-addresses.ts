import type { CourseLesson } from './index';

const lookup = (rate: number) => [
  { route: ['laptop', 'home', 'isp', 'dns'], kind: 'request' as const, ratePerSec: rate },
  { route: ['dns', 'isp', 'home', 'laptop'], kind: 'response' as const, ratePerSec: rate },
];
const page = (rate: number) => [
  { route: ['laptop', 'home', 'isp', 'web'], kind: 'request' as const, ratePerSec: rate },
  { route: ['web', 'isp', 'home', 'laptop'], kind: 'response' as const, ratePerSec: rate },
];

const lesson: CourseLesson = {
  slug: 'finding-addresses',
  chapter: 'How data moves',
  title: 'Finding addresses with DNS',
  summary:
    'How a name like shop.example becomes a number your laptop can send packets to, and what breaks when that lookup fails.',
  minutes: 6,
  level: 'beginner',
  youWillLearn: [
    { text: 'Why computers need IP addresses', stepId: 'names' },
    { text: 'How a DNS lookup works', stepId: 'ask-dns' },
    { text: 'How caching makes most lookups instant', stepId: 'caching' },
    { text: 'What a DNS outage really breaks', stepId: 'dns-down' },
  ],
  initial: {
    nodes: [
      { id: 'laptop', kind: 'device', label: 'Your laptop', x: 0, y: 6 },
      { id: 'home', kind: 'router', label: 'Home router', x: 4, y: 6 },
      { id: 'isp', kind: 'router', label: 'Provider', x: 8, y: 6 },
      {
        id: 'web',
        kind: 'server',
        label: 'shop.example',
        sublabel: '203.0.113.7',
        x: 14,
        y: 6,
        capacity: 500,
      },
    ],
    links: [
      { id: 'laptop-home', from: 'laptop', to: 'home' },
      { id: 'home-isp', from: 'home', to: 'isp' },
      { id: 'isp-web', from: 'isp', to: 'web' },
    ],
    metrics: { pageLoadMs: 0, roundTripMs: 35, lossPct: 0, okPct: 100, hops: 3 },
  },
  steps: [
    {
      id: 'names',
      short: 'Names',
      tag: 'PROBLEM',
      title: 'You know the name, not the number',
      body: [
        'You type <code>shop.example</code>. Routers do not understand names; they move packets to numeric <b>IP addresses</b> like <code>203.0.113.7</code>.',
        'Something has to translate the name first.',
      ],
      keyIdea: 'Names are for people. Addresses are for routers.',
      change: {},
    },
    {
      id: 'ask-dns',
      short: 'Lookup',
      tag: 'IDEA',
      title: 'Ask a DNS resolver',
      body: [
        'Your laptop asks a <b>DNS resolver</b>, usually run by your provider: "what is the address of shop.example?"',
        'The resolver finds out (asking other DNS servers if it must) and replies. That costs one round trip before anything else can start.',
      ],
      keyIdea: 'DNS is the internet’s phone book.',
      change: {
        add: {
          nodes: [
            {
              id: 'dns',
              kind: 'dns',
              label: 'DNS resolver',
              sublabel: 'name → address',
              x: 8,
              y: 1.5,
            },
          ],
          links: [{ id: 'isp-dns', from: 'isp', to: 'dns' }],
        },
        flows: lookup(10),
        metrics: { pageLoadMs: 35 },
      },
    },
    {
      id: 'connect',
      short: 'Connect',
      tag: 'IDEA',
      title: 'Then go to the address',
      body: [
        'With the address, your laptop sends its request straight to the shop’s server.',
        'Lookup plus connection plus the page itself: about <b>210 ms</b>.',
      ],
      keyIdea: 'Every new site visit starts with a lookup.',
      change: { flows: [...lookup(10), ...page(10)], metrics: { pageLoadMs: 210 } },
    },
    {
      id: 'caching',
      short: 'Cache',
      tag: 'SOLUTION',
      title: 'Remember the answer',
      body: [
        'Answers come with a <b>TTL</b> (time to live), often minutes or hours. Your laptop and the resolver keep them until then.',
        'Now only 1 request in 6 needs a fresh lookup. The rest skip straight to the server, and pages load in about <b>175 ms</b>.',
      ],
      keyIdea: 'Caching turns most lookups into no lookup at all.',
      change: {
        update: { nodes: [{ id: 'laptop', sublabel: 'remembers answers' }] },
        flows: [...lookup(2), ...page(10)],
        metrics: { pageLoadMs: 175 },
      },
    },
    {
      id: 'dns-down',
      short: 'Outage',
      tag: 'TRY IT',
      title: 'The DNS resolver stops answering',
      body: [
        'Press <b>DNS goes down</b>. The shop’s server is perfectly healthy, yet every request that needs a fresh lookup fails.',
        'Sites you visited recently keep working from the cache. New ones look as if the internet is down.',
      ],
      keyIdea: 'When DNS fails, working servers become unreachable by name.',
      change: {},
      breakActions: ['dnsOutage'],
    },
    {
      id: 'ttl',
      short: 'TTL',
      tag: 'TRADE-OFF',
      title: 'Long memory or fresh answers',
      body: [
        'A long TTL means fewer lookups and more resilience in an outage. A short TTL means a site can move to a new address quickly.',
        'Sites usually lower their TTL a day before moving, then raise it again afterwards.',
      ],
      keyIdea: 'Cache longer for resilience, shorter for flexibility.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Find the address, then the server',
      body: [
        'DNS turns names into addresses. Caching makes most lookups free, and an outage breaks new visits even when every server is fine.',
        'Next: why distance and handshakes decide how fast a page feels.',
      ],
      keyIdea: '"The site is down" is sometimes "the phone book is down".',
      change: {},
    },
  ],
};

export default lesson;
