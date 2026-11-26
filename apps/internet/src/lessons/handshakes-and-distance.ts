import type { CourseLesson } from './index';

const lesson: CourseLesson = {
  slug: 'handshakes-and-distance',
  chapter: 'Making it fast',
  title: 'Handshakes and distance',
  summary:
    'Why a fast connection can still feel slow: light takes time, and every new connection starts with a few round trips.',
  minutes: 7,
  level: 'beginner',
  youWillLearn: [
    { text: 'Why distance adds delay no matter your speed', stepId: 'distance' },
    { text: 'What TCP and TLS handshakes cost', stepId: 'handshakes' },
    { text: 'Why a little packet loss hurts so much', stepId: 'loss' },
    { text: 'How reusing connections saves time', stepId: 'keep-alive' },
  ],
  initial: {
    nodes: [
      { id: 'laptop', kind: 'device', label: 'Your laptop', x: 0, y: 5 },
      { id: 'home', kind: 'router', label: 'Home router', x: 4, y: 5 },
      { id: 'isp', kind: 'router', label: 'Provider', x: 8, y: 5 },
      { id: 'sea', kind: 'router', label: 'Undersea cable', sublabel: '9,000 km', x: 12, y: 5 },
      {
        id: 'web',
        kind: 'server',
        label: 'News site',
        sublabel: 'other continent',
        x: 16,
        y: 5,
        capacity: 500,
      },
    ],
    links: [
      { id: 'laptop-home', from: 'laptop', to: 'home' },
      { id: 'home-isp', from: 'home', to: 'isp' },
      { id: 'isp-sea', from: 'isp', to: 'sea' },
      { id: 'sea-web', from: 'sea', to: 'web' },
    ],
    metrics: { pageLoadMs: 0, roundTripMs: 160, lossPct: 0, okPct: 100, hops: 4 },
  },
  steps: [
    {
      id: 'distance',
      short: 'Distance',
      tag: 'PROBLEM',
      title: 'Light is fast, the world is big',
      body: [
        'The news site is on another continent. Signals in fibre travel about 200 km per millisecond, so a 9,000 km cable takes 45 ms each way, before any router delays.',
        'A round trip here takes about <b>160 ms</b>. A faster plan does not change that: it adds width, not speed of light.',
      ],
      keyIdea: 'Bandwidth is how much fits in the pipe. Latency is how long the pipe is.',
      change: {
        flows: [
          { route: ['laptop', 'home', 'isp', 'sea', 'web'], kind: 'request', ratePerSec: 10 },
          { route: ['web', 'sea', 'isp', 'home', 'laptop'], kind: 'response', ratePerSec: 10 },
        ],
      },
    },
    {
      id: 'handshakes',
      short: 'Handshakes',
      tag: 'IDEA',
      title: 'Three round trips before the page',
      body: [
        'A new connection first agrees to talk (a <b>TCP</b> handshake), then agrees on encryption (<b>TLS</b>), then asks for the page.',
        'Each step is a round trip. Add the page download and it takes about <b>800 ms</b>, mostly waiting.',
      ],
      keyIdea: 'Every round trip pays the full distance.',
      change: { metrics: { pageLoadMs: 800 } },
    },
    {
      id: 'loss',
      short: 'Loss',
      tag: 'TRY IT',
      title: 'A few lost packets',
      body: [
        'Press <b>Packets get lost</b>. A busy router starts dropping about 4% of packets.',
        'Lost packets are only resent after a timeout, and the sender slows down to be safe. The page now takes more than twice as long.',
      ],
      keyIdea: 'Small loss causes big delays, because recovery waits.',
      change: {},
      breakActions: ['packetLoss'],
    },
    {
      id: 'keep-alive',
      short: 'Reuse',
      tag: 'SOLUTION',
      title: 'Keep the connection open',
      body: [
        'Once a connection is set up, browsers keep it open and send the next requests through it. No more handshakes.',
        'The second page from the same site skips two round trips: about <b>480 ms</b>.',
      ],
      keyIdea: 'Reusing a connection is the cheapest speed-up there is.',
      change: {
        update: { nodes: [{ id: 'laptop', sublabel: 'connection kept open' }] },
        metrics: { pageLoadMs: 480 },
      },
    },
    {
      id: 'protocols',
      short: 'Fewer trips',
      tag: 'TRADE-OFF',
      title: 'Newer protocols cut round trips',
      body: [
        'Newer versions of the web’s protocols combine the handshakes, and can even send data on the first trip to a site you visited before.',
        'They help most on long or lossy links. On a short, clean link the difference is small.',
      ],
      keyIdea: 'You cannot shorten the cable, but you can cross it fewer times.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Count the round trips',
      body: [
        'Distance sets the cost of one round trip. Handshakes multiply it, and packet loss makes it unpredictable.',
        'Next: moving the content closer instead.',
      ],
      keyIdea: 'Speed on the web is mostly about round trips.',
      change: {},
    },
  ],
};

export default lesson;
