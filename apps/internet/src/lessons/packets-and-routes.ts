import type { CourseLesson } from './index';

const there = (rate: number) => ({
  route: ['laptop', 'home', 'isp', 'a', 'web'],
  kind: 'request' as const,
  ratePerSec: rate,
});
const back = (rate: number) => ({
  route: ['web', 'a', 'isp', 'home', 'laptop'],
  kind: 'response' as const,
  ratePerSec: rate,
});

const lesson: CourseLesson = {
  slug: 'packets-and-routes',
  chapter: 'How data moves',
  title: 'Packets and routes',
  summary:
    'How a web page crosses the world in small pieces, router by router, and finds a new way when one breaks.',
  minutes: 7,
  level: 'beginner',
  youWillLearn: [
    { text: 'Why data is split into packets', stepId: 'packets' },
    { text: 'What a router does with each packet', stepId: 'routers' },
    { text: 'How the network routes around a failure', stepId: 'router-fails' },
    { text: 'Why your own router has no backup', stepId: 'weakest-link' },
  ],
  initial: {
    nodes: [
      { id: 'laptop', kind: 'device', label: 'Your laptop', x: 0, y: 6 },
      {
        id: 'web',
        kind: 'server',
        label: 'Shop server',
        sublabel: 'another country',
        x: 17,
        y: 6,
        capacity: 500,
      },
    ],
    links: [],
    metrics: { pageLoadMs: 0, roundTripMs: 0, lossPct: 0, okPct: 100, hops: 0 },
  },
  steps: [
    {
      id: 'no-single-wire',
      short: 'Far away',
      tag: 'PROBLEM',
      title: 'There is no wire straight to the shop',
      body: [
        'You open an online shop whose server is in another country. Nobody laid a cable from your laptop to it.',
        'Instead, your request hops through a chain of <b>routers</b>: your home router, your internet provider, then routers run by other networks.',
      ],
      keyIdea: 'The internet is a network of networks, joined by routers.',
      change: {
        add: {
          nodes: [
            { id: 'home', kind: 'router', label: 'Home router', x: 4, y: 6 },
            { id: 'isp', kind: 'router', label: 'Provider', sublabel: 'your ISP', x: 8, y: 6 },
            { id: 'a', kind: 'router', label: 'Router A', x: 12.5, y: 2 },
            { id: 'b', kind: 'router', label: 'Router B', x: 11.5, y: 9.5 },
            { id: 'c', kind: 'router', label: 'Router C', x: 15, y: 10.5 },
          ],
          links: [
            { id: 'laptop-home', from: 'laptop', to: 'home' },
            { id: 'home-isp', from: 'home', to: 'isp' },
            { id: 'isp-a', from: 'isp', to: 'a' },
            { id: 'a-web', from: 'a', to: 'web' },
            { id: 'isp-b', from: 'isp', to: 'b' },
            { id: 'b-c', from: 'b', to: 'c' },
            { id: 'c-web', from: 'c', to: 'web' },
          ],
        },
      },
    },
    {
      id: 'packets',
      short: 'Packets',
      tag: 'IDEA',
      title: 'Split it into packets',
      body: [
        'The page is cut into small <b>packets</b> of about 1,500 bytes, each labelled with where it is going.',
        'Here the request takes <b>4 hops</b> and each round trip takes about 40 ms. Loading the page needs several round trips: about <b>320 ms</b> in all.',
      ],
      keyIdea: 'Small packets share the wires fairly and can be resent one by one if lost.',
      change: {
        flows: [there(20), back(20)],
        metrics: { pageLoadMs: 320, roundTripMs: 40, hops: 4 },
      },
    },
    {
      id: 'routers',
      short: 'Routers',
      tag: 'IDEA',
      title: 'Each router only picks the next hop',
      body: [
        'No router knows the whole journey. Each one reads the destination address and passes the packet to the neighbour that is closest to it.',
        'The routers send each other route updates constantly. Today the path through <b>Router A</b> is shortest; B and C are a longer spare path.',
      ],
      keyIdea: 'Routing is many small local decisions, not one big plan.',
      change: { update: { nodes: [{ id: 'a', sublabel: 'shortest path' }] } },
    },
    {
      id: 'router-fails',
      short: 'Failure',
      tag: 'TRY IT',
      title: 'Router A goes dark',
      body: [
        'Press <b>A router fails</b>. For about two seconds packets still head for Router A and are lost; requests go unanswered.',
        'Then the routers agree on a new path through B and C. The page works again, one hop longer and a little slower.',
      ],
      keyIdea: 'The internet survives failures by finding another way, after a short pause.',
      change: {},
      breakActions: ['routerFails'],
    },
    {
      id: 'weakest-link',
      short: 'Weak link',
      tag: 'TRADE-OFF',
      title: 'Your end has no spare path',
      body: [
        'Big networks have many routes between them. Your laptop has one home router and one provider.',
        'If either fails, there is no detour. That is why phones can switch to mobile data when Wi-Fi drops.',
      ],
      keyIdea: 'Redundancy exists in the middle of the internet, not usually at the edges.',
      change: { update: { nodes: [{ id: 'home', sublabel: 'no backup' }] } },
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Small pieces, many paths',
      body: [
        'Your data travels as packets, hop by hop, each router choosing the next step. When a router fails, the others find another path within seconds.',
        'Next: how your laptop finds the shop’s address in the first place.',
      ],
      keyIdea: 'Packets plus many paths make the internet hard to break.',
      change: {},
    },
  ],
};

export default lesson;
