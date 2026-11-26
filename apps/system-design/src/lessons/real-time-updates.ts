import type { InfraLesson } from './index';

const GATES = ['gw1', 'gw2'];
const GATE_Y = [3.5, 8.5];

const lesson: InfraLesson = {
  slug: 'real-time-updates',
  chapter: 'Services talking',
  title: 'Real-time updates',
  summary:
    'Polling, long polling, server-sent events and WebSockets: how a server tells clients something changed.',
  minutes: 9,
  level: 'intermediate',
  youWillLearn: [
    { text: 'What polling costs at scale', stepId: 'polling' },
    { text: 'How push connections change the load', stepId: 'push' },
    { text: 'What happens when a connection server dies', stepId: 'gateway-dies' },
    { text: 'Which technique fits which feature', stepId: 'choose' },
  ],
  initial: {
    nodes: [
      { id: 'fans', kind: 'users', label: 'Fans', sublabel: '50,000 watching', x: 0, y: 6 },
      { id: 'lb', kind: 'loadBalancer', label: 'Load balancer', x: 4, y: 6 },
      {
        id: 'api',
        kind: 'server',
        label: 'Score API',
        sublabel: '×10',
        x: 8.5,
        y: 6,
        capacity: 30000,
      },
      { id: 'scores', kind: 'cache', label: 'Live scores', x: 13, y: 6, capacity: 100000 },
    ],
    links: [
      { id: 'fans-lb', from: 'fans', to: 'lb' },
      { id: 'lb-api', from: 'lb', to: 'api' },
      { id: 'api-scores', from: 'api', to: 'scores' },
    ],
    metrics: {
      users: 50000,
      requestsPerSec: 25000,
      p95LatencyMs: 120,
      errorRatePct: 0,
      healthy: [10, 10],
    },
  },
  steps: [
    {
      id: 'polling',
      short: 'Polling',
      tag: 'PROBLEM',
      title: 'Any news? Any news? Any news?',
      body: [
        'A sports app asks "has the score changed?" every 2 seconds. 50,000 fans make <b>25,000 requests a second</b>, and almost every answer is "no".',
        'Goals still reach fans about a second late on average, and the servers are 83% busy doing nothing useful.',
      ],
      keyIdea: 'Polling costs are set by clients × frequency, not by how often things change.',
      change: {
        flows: [{ route: ['fans', 'lb', 'api', 'scores'], kind: 'request', ratePerSec: 25000 }],
      },
    },
    {
      id: 'polling-try',
      short: 'Kick-off',
      tag: 'TRY IT',
      title: 'The final starts',
      body: [
        'Predict: five times the fans tune in for the final. What happens to a polling design?',
        'Press <b>Spike traffic 5×</b>. 125,000 polls a second hit servers built for 30,000, and about <b>76%</b> fail, at the very moment people care most.',
      ],
      keyIdea: 'Polling load grows with the audience, even when nothing happens.',
      change: {},
      breakActions: ['spikeTraffic'],
    },
    {
      id: 'long-polling',
      short: 'Long poll',
      tag: 'IDEA',
      title: 'Hold the question open',
      body: [
        '<b>Long polling</b>: the server holds each request until there is news, or 30 seconds pass, then the client asks again. Far fewer empty answers, and news arrives at once.',
        'It works everywhere plain HTTP works, but every update still costs a new request.',
      ],
      keyIdea: 'Long polling waits for news instead of repeating the question.',
      change: {},
    },
    {
      id: 'push',
      short: 'Push',
      tag: 'SOLUTION',
      title: 'Keep a connection, push changes',
      body: [
        'Each app opens one lasting connection to a <b>connection gateway</b>, using server-sent events or a WebSocket. The gateway pushes a message only when the score changes.',
        'The load is now a small keep-alive from each fan every 30 seconds plus updates, about 1,700 messages a second in each direction: 6% busy.',
      ],
      keyIdea: 'Push makes cost follow changes, not clients × frequency.',
      change: {
        remove: { links: ['lb-api', 'api-scores'], nodes: ['api'] },
        add: {
          nodes: GATES.map((id, i) => ({
            id,
            kind: 'server' as const,
            label: `Gateway ${i + 1}`,
            sublabel: '25,000 connections',
            x: 8.5,
            y: GATE_Y[i] ?? 0,
            capacity: 15000,
          })),
          links: [
            ...GATES.map((id) => ({ id: `lb-${id}`, from: 'lb', to: id })),
            ...GATES.map((id) => ({
              id: `${id}-scores`,
              from: id,
              to: 'scores',
              style: 'dashed' as const,
            })),
          ],
        },
        flows: GATES.flatMap((id) => [
          { route: ['fans', 'lb', id], kind: 'request' as const, ratePerSec: 850 },
          { route: ['scores', id, 'lb', 'fans'], kind: 'response' as const, ratePerSec: 850 },
        ]),
        metrics: { requestsPerSec: 1700, p95LatencyMs: 40, healthy: [2, 2] },
      },
    },
    {
      id: 'push-try',
      short: 'Final',
      tag: 'TRY IT',
      title: 'The final, with push',
      body: [
        'Predict: the same 5× crowd.',
        'Press <b>Spike traffic 5×</b>. The gateways go from 6% to under 30% busy and errors stay at <b>0%</b>.',
      ],
      keyIdea: 'Push designs survive audience spikes that would flatten polling.',
      change: {},
      breakActions: ['spikeTraffic'],
    },
    {
      id: 'gateway-dies',
      short: 'Lose one',
      tag: 'TRY IT',
      title: 'A gateway dies',
      body: [
        'Predict: Gateway 2 holds 25,000 open connections. What happens when it crashes?',
        'Press <b>Kill a server</b>. Half the traffic (<b>50%</b>) fails for about 3 seconds, then those fans reconnect to Gateway 1. Each app waits a random 0 to 5 seconds first, so 25,000 reconnects do not arrive in the same instant.',
      ],
      keyIdea: 'Connections are state: losing a server means a reconnect wave. Spread it out.',
      change: {},
      breakActions: ['killServer'],
    },
    {
      id: 'fan-out',
      short: 'Fan-out',
      tag: 'TRADE-OFF',
      title: 'Every gateway must hear the goal',
      body: [
        'A goal must reach fans on every gateway, so gateways subscribe to a shared stream of score changes. One goal becomes 50,000 messages within a second.',
        'Long-lived connections also complicate deploys: a gateway is drained by asking clients to reconnect elsewhere before it stops.',
      ],
      keyIdea: 'Push needs a fan-out layer and careful handling of connection state.',
      change: {},
    },
    {
      id: 'choose',
      short: 'Choose',
      tag: 'IDEA',
      title: 'Which one when',
      body: [
        '<b>Polling</b>: rare changes, few clients, simplest. <b>Long polling</b>: when nothing else gets through. <b>Server-sent events</b>: one-way server to client, such as scores and feeds. <b>WebSockets</b>: two-way, such as chat and games. Mobile <b>push notifications</b> reach apps that are closed.',
      ],
      keyIdea: 'Match the channel to the direction and frequency of updates.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Tell them when it changes',
      body: [
        'Polling spent 25,000 requests a second on "no news" and failed 76% of the final. Push gateways carried the same fans with 1,700 messages a second, survived the spike, and handled a crash with a spread-out reconnect.',
      ],
      keyIdea: 'Push changes to clients; do not make clients keep asking.',
      change: {},
    },
  ],
};

export default lesson;
