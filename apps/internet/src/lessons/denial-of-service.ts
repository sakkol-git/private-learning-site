import type { CourseLesson } from './index';

const lesson: CourseLesson = {
  slug: 'denial-of-service',
  chapter: 'Under attack',
  title: 'Denial-of-service attacks',
  summary:
    'How a flood of fake requests knocks a site offline, and how scrubbing filters it out before it arrives.',
  minutes: 6,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How a botnet floods a server', stepId: 'flood' },
    { text: 'Why a bigger server alone does not fix it', stepId: 'bigger' },
    { text: 'How scrubbing filters attack traffic', stepId: 'scrubbing' },
    { text: 'Why telling real from fake is hard', stepId: 'hard' },
  ],
  initial: {
    nodes: [
      { id: 'people', kind: 'users', label: 'Real visitors', x: 0, y: 3 },
      { id: 'bots', kind: 'attacker', label: 'Botnet', sublabel: 'hijacked devices', x: 0, y: 10 },
      { id: 'net', kind: 'router', label: 'Internet', x: 5, y: 6.5 },
      { id: 'web', kind: 'server', label: 'Ticket site', x: 11, y: 6.5, capacity: 300 },
    ],
    links: [
      { id: 'people-net', from: 'people', to: 'net' },
      { id: 'bots-net', from: 'bots', to: 'net' },
      { id: 'net-web', from: 'net', to: 'web' },
    ],
    metrics: { pageLoadMs: 250, roundTripMs: 30, lossPct: 0, okPct: 100, hops: 2 },
  },
  steps: [
    {
      id: 'normal',
      short: 'Normal',
      tag: 'IDEA',
      title: 'A busy day for a ticket site',
      body: [
        'Concert tickets go on sale. Real visitors send about 150 requests per second, half of what the site can handle.',
        'Elsewhere, thousands of hacked cameras and routers sit in a <b>botnet</b>, waiting for orders.',
      ],
      keyIdea: 'Every server has a limit on requests per second.',
      change: {
        flows: [
          { route: ['people', 'net', 'web'], kind: 'request', ratePerSec: 150 },
          { route: ['web', 'net', 'people'], kind: 'response', ratePerSec: 150 },
        ],
      },
    },
    {
      id: 'flood',
      short: 'Flood',
      tag: 'TRY IT',
      title: 'The flood arrives',
      body: [
        'Press <b>DDoS attack</b>. The botnet sends twenty times more requests than all real visitors combined.',
        'The server cannot tell them apart quickly enough. Fewer than 1 in 10 real visitors get through, and pages take many seconds.',
      ],
      keyIdea: 'A denial-of-service attack does not break in. It crowds out.',
      change: {},
      breakActions: ['ddos'],
    },
    {
      id: 'bigger',
      short: 'Bigger?',
      tag: 'TRADE-OFF',
      title: 'A bigger server is not enough',
      body: [
        'Doubling the server helps a little, but the attacker can rent a bigger botnet far more cheaply than you can buy servers.',
        'The fix has to stop the junk before it reaches you.',
      ],
      keyIdea: 'You cannot out-spend a botnet with servers.',
      change: {},
    },
    {
      id: 'scrubbing',
      short: 'Scrubbing',
      tag: 'SOLUTION',
      title: 'Filter the traffic upstream',
      body: [
        'A <b>scrubbing service</b> sits in front of the site. It has enormous capacity and drops traffic that looks like the attack: same patterns, impossible rates, known bad sources.',
        'Botnet traffic now ends at the filter. Real visitors pass through.',
      ],
      keyIdea: 'Stop attack traffic where there is room to absorb it.',
      change: {
        add: {
          nodes: [
            {
              id: 'scrub',
              kind: 'shield',
              label: 'Scrubbing',
              sublabel: 'filters floods',
              x: 2.5,
              y: 8.5,
            },
          ],
          links: [
            { id: 'bots-scrub', from: 'bots', to: 'scrub' },
            { id: 'scrub-net', from: 'scrub', to: 'net' },
          ],
        },
        remove: { links: ['bots-net'] },
      },
    },
    {
      id: 'filtered',
      short: 'Again',
      tag: 'TRY IT',
      title: 'The same flood, filtered',
      body: [
        'Press <b>DDoS attack</b> again. The red packets now stop at the filter, and every real visitor is still served.',
      ],
      keyIdea: 'With filtering in place, the attack becomes background noise.',
      change: {},
      breakActions: ['ddos'],
    },
    {
      id: 'hard',
      short: 'Hard',
      tag: 'TRADE-OFF',
      title: 'Real or fake?',
      body: [
        'The cleverest attacks look like ordinary visitors loading ordinary pages. Filter too hard and you block real customers; too softly and the flood gets in.',
        'Filters learn from patterns over time, and sites also add queues and limits per visitor.',
      ],
      keyIdea: 'Defence is a balance between blocking attackers and serving people.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Crowd control for the internet',
      body: [
        'A DDoS attack overwhelms a site with junk traffic. Bigger servers do not keep up; filtering upstream, with a CDN or scrubbing service, does.',
      ],
      keyIdea: 'Absorb floods where capacity is huge, before they reach you.',
      change: {},
    },
  ],
};

export default lesson;
