import type { InfraAction, InfraMetrics } from '@ss/diagram-engine';
import type { DiagramLesson } from '@ss/lesson-engine';

const lesson: DiagramLesson<InfraMetrics, InfraAction> = {
  slug: 'how-a-request-travels',
  chapter: 'Foundations',
  title: 'How a request travels',
  summary:
    'Follow one page load from the address bar to the database and back, and see where the time goes.',
  minutes: 7,
  level: 'beginner',
  youWillLearn: [
    { text: 'What DNS does before anything else happens', stepId: 'find-address' },
    { text: 'Why opening a connection costs round trips', stepId: 'connect' },
    { text: 'What the server and database each add', stepId: 'query' },
    { text: 'Why one page is really dozens of requests', stepId: 'more-files' },
    { text: 'What a slow query and a distant user each cost', stepId: 'far-away' },
    { text: 'Where the waiting actually comes from', stepId: 'where-time-goes' },
  ],
  initial: {
    nodes: [{ id: 'browser', kind: 'users', label: 'Your browser', x: 0, y: 5 }],
    links: [],
    metrics: { users: 40, requestsPerSec: 12, p95LatencyMs: 0, errorRatePct: 0, healthy: [0, 0] },
  },
  steps: [
    {
      id: 'find-address',
      short: 'DNS',
      tag: 'PROBLEM',
      title: 'First, find the address',
      body: [
        'You type <code>shop.example</code>. Computers do not route by name, so the browser asks a <b>DNS resolver</b> for the matching IP address.',
        'If the answer is cached nearby, this takes a few milliseconds. If not, the resolver asks other servers in turn. Here it costs about 20 ms.',
      ],
      keyIdea:
        'DNS turns a name into an address. Its answers are cached for a set time, called the TTL.',
      change: {
        add: {
          nodes: [
            {
              id: 'dns',
              kind: 'service',
              label: 'DNS resolver',
              sublabel: 'name → IP',
              x: 4,
              y: 1,
            },
          ],
          links: [{ id: 'browser-dns', from: 'browser', to: 'dns' }],
        },
        flows: [{ route: ['browser', 'dns'], kind: 'request', ratePerSec: 12 }],
        metrics: { p95LatencyMs: 20 },
      },
    },
    {
      id: 'connect',
      short: 'Connect',
      tag: 'IDEA',
      title: 'Open a connection',
      body: [
        'With the address in hand, the browser opens a TCP connection to the web server, then sets up encryption with TLS.',
        'Each of those is a <b>round trip</b>: a message there and an answer back. At 30 ms per round trip, the handshakes add about 60 ms before any real work starts.',
      ],
      keyIdea:
        'Distance costs time on every round trip. A connection that is reused skips the handshakes.',
      change: {
        add: {
          nodes: [{ id: 'web', kind: 'server', label: 'Web server', x: 8, y: 5, capacity: 200 }],
          links: [{ id: 'browser-web', from: 'browser', to: 'web' }],
        },
        flows: [{ route: ['browser', 'web'], kind: 'request', ratePerSec: 12 }],
        metrics: { p95LatencyMs: 80, healthy: [1, 1] },
      },
    },
    {
      id: 'server-work',
      short: 'Server',
      tag: 'IDEA',
      title: 'The server runs your code',
      body: [
        'The request arrives as text: a method, a path such as <code>GET /products/42</code>, and some headers.',
        'The server matches the path to a handler, checks the session cookie, and starts building a page. That takes about 25 ms of CPU time.',
      ],
      keyIdea:
        'Server time is usually the smallest slice. It is the part you control most directly.',
      change: {
        update: { nodes: [{ id: 'web', sublabel: 'route · auth · render' }] },
        metrics: { p95LatencyMs: 105 },
      },
    },
    {
      id: 'query',
      short: 'Database',
      tag: 'IDEA',
      title: 'Ask the database',
      body: [
        'The page needs the product name, price and stock. The server sends a query to the <b>database</b> and waits.',
        'An indexed lookup like this takes around 40 ms, including the network hop between the two machines.',
      ],
      keyIdea:
        'Every query is another wait. A page that makes ten queries in a row pays for each one.',
      change: {
        add: {
          nodes: [{ id: 'db', kind: 'database', label: 'Database', x: 13, y: 5, capacity: 300 }],
          links: [{ id: 'web-db', from: 'web', to: 'db' }],
        },
        flows: [{ route: ['browser', 'web', 'db'], kind: 'request', ratePerSec: 12 }],
        metrics: { p95LatencyMs: 145 },
      },
    },
    {
      id: 'respond',
      short: 'Response',
      tag: 'SOLUTION',
      title: 'The answer travels back',
      body: [
        'Rows go back to the server, which fills in the page and sends it to the browser. The darker dots are responses.',
        'The page itself is a few hundred kilobytes, so the last leg adds about 30 ms. The full trip took roughly <b>175 ms</b>.',
      ],
      keyIdea: 'A response retraces the path of the request. Every hop counts twice.',
      change: {
        flows: [
          { route: ['browser', 'web', 'db'], kind: 'request', ratePerSec: 12 },
          { route: ['db', 'web', 'browser'], kind: 'response', ratePerSec: 12 },
        ],
        metrics: { p95LatencyMs: 175 },
      },
    },
    {
      id: 'more-files',
      short: 'More files',
      tag: 'IDEA',
      title: 'One page, thirty more requests',
      body: [
        'The HTML names about <b>30 other files</b>: styles, scripts and images. Each is its own request.',
        'Browsers reuse the open connection and fetch several files at once, so the page is ready after roughly <b>300 ms</b>, not 30 × 175 ms.',
      ],
      keyIdea:
        'A page is many requests. Reusing connections and fetching in parallel is what keeps it fast.',
      change: {
        update: { nodes: [{ id: 'browser', sublabel: 'page + 30 files' }] },
        flows: [
          { route: ['browser', 'web', 'db'], kind: 'request', ratePerSec: 12 },
          { route: ['db', 'web', 'browser'], kind: 'response', ratePerSec: 12 },
          { route: ['browser', 'web'], kind: 'request', ratePerSec: 60 },
          { route: ['web', 'browser'], kind: 'response', ratePerSec: 60 },
        ],
      },
    },
    {
      id: 'slow-db',
      short: 'Slow DB',
      tag: 'TRY IT',
      title: 'What if the database is slow?',
      body: [
        'Press <b>Slow the database</b>. Maybe a missing index, maybe another job is hogging the disk.',
        'Watch p95 latency climb from 175 ms to about <b>1,075 ms</b>. Nothing else in the path changed, but every page now waits on the slowest hop.',
      ],
      keyIdea: 'A request is only as fast as the slowest step it has to wait for.',
      change: {},
      breakActions: ['slowDatabase'],
    },
    {
      id: 'far-away',
      short: 'Far away',
      tag: 'PROBLEM',
      title: 'A visitor on another continent',
      body: [
        'One visitor in ten now connects from far away. Their round trip is <b>150 ms</b> instead of 30 ms.',
        'Lookup, two handshakes and the request are four round trips, so they wait about 480 ms longer. p95 now describes them: about <b>655 ms</b>.',
      ],
      keyIdea:
        'Distance multiplies every round trip. p95 shows the users you would otherwise forget.',
      change: {
        add: {
          nodes: [
            {
              id: 'far',
              kind: 'users',
              label: 'Far visitor',
              sublabel: '150 ms away',
              x: 4,
              y: 10,
            },
          ],
          links: [{ id: 'far-web', from: 'far', to: 'web' }],
        },
        flows: [
          { route: ['browser', 'web', 'db'], kind: 'request', ratePerSec: 12 },
          { route: ['db', 'web', 'browser'], kind: 'response', ratePerSec: 12 },
          { route: ['far', 'web', 'db'], kind: 'request', ratePerSec: 2 },
          { route: ['db', 'web', 'far'], kind: 'response', ratePerSec: 2 },
        ],
        metrics: { users: 44, requestsPerSec: 14, p95LatencyMs: 655 },
      },
    },
    {
      id: 'where-time-goes',
      short: 'Time',
      tag: 'TRADE-OFF',
      title: 'Most of the wait is travel',
      body: [
        'Add it up: about 80 ms of DNS and handshakes, 25 ms of server work, 40 ms of database, 30 ms of transfer.',
        'Nearly half the time was spent before the server did anything, and for the far visitor it was most of it. That is why later lessons move content closer to users and reuse connections.',
      ],
      keyIdea: 'Before optimising code, measure the network. It is often the bigger slice.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'One click, five hops',
      body: [
        'Name lookup, connection, server work, database query, response. Each hop adds time, and each one can fail.',
        'Every other lesson in this course changes one part of this path to make it faster or more reliable.',
      ],
      keyIdea:
        'System design is deciding what sits on this path, and how many copies of each part you run.',
      change: {},
    },
  ],
};

export default lesson;
