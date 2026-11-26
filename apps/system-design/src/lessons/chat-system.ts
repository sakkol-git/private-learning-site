import type { InfraLesson } from './index';

const messages = [
  { route: ['alice', 'gw1', 'chat', 'msgs'], kind: 'request' as const, ratePerSec: 400 },
  { route: ['bob', 'gw2', 'chat', 'msgs'], kind: 'request' as const, ratePerSec: 400 },
  { route: ['chat', 'gw2', 'bob'], kind: 'response' as const, ratePerSec: 400 },
  { route: ['chat', 'gw1', 'alice'], kind: 'response' as const, ratePerSec: 400 },
];

const lesson: InfraLesson = {
  slug: 'chat-system',
  chapter: 'Case studies',
  title: 'Design a chat system',
  summary:
    'Lasting connections, a durable message store, ordering per conversation, and notifications for people who are offline.',
  minutes: 12,
  level: 'advanced',
  youWillLearn: [
    { text: 'How messages travel between two connected users', stepId: 'send-path' },
    { text: 'What happens to messages when a gateway dies', stepId: 'gateway-dies' },
    { text: 'How to keep messages in order', stepId: 'ordering' },
    { text: 'How offline users are notified', stepId: 'push-stops' },
  ],
  initial: {
    nodes: [
      { id: 'alice', kind: 'users', label: 'Senders', sublabel: 'on gateway 1', x: 0, y: 3 },
      { id: 'bob', kind: 'users', label: 'Receivers', sublabel: 'on gateway 2', x: 0, y: 9 },
      { id: 'gw1', kind: 'server', label: 'Gateway 1', x: 4.5, y: 3, capacity: 4000 },
      { id: 'gw2', kind: 'server', label: 'Gateway 2', x: 4.5, y: 9, capacity: 4000 },
      { id: 'chat', kind: 'service', label: 'Chat service', x: 9, y: 6, capacity: 10000 },
      {
        id: 'registry',
        kind: 'cache',
        label: 'Who is where',
        sublabel: 'user → gateway',
        x: 9,
        y: 1,
        capacity: 50000,
      },
      {
        id: 'msgs',
        kind: 'database',
        label: 'Messages',
        sublabel: 'by conversation',
        x: 13.5,
        y: 6,
        capacity: 20000,
      },
    ],
    links: [
      { id: 'alice-gw1', from: 'alice', to: 'gw1' },
      { id: 'bob-gw2', from: 'bob', to: 'gw2' },
      { id: 'gw1-chat', from: 'gw1', to: 'chat' },
      { id: 'gw2-chat', from: 'gw2', to: 'chat' },
      { id: 'chat-registry', from: 'chat', to: 'registry', style: 'dashed' },
      { id: 'chat-msgs', from: 'chat', to: 'msgs' },
    ],
    metrics: {
      users: 2000000,
      requestsPerSec: 800,
      p95LatencyMs: 120,
      errorRatePct: 0,
      healthy: [2, 2],
    },
  },
  steps: [
    {
      id: 'requirements',
      short: 'Needs',
      tag: 'IDEA',
      title: 'What chat needs',
      body: [
        '<b>Parley</b> offers one-to-one and group chats of up to 500 people. Messages to someone online should arrive within half a second, in order, and never be lost. People offline get a notification.',
      ],
      keyIdea: 'Chat needs low latency, strict order per conversation and durability.',
      change: {},
    },
    {
      id: 'connections',
      short: 'Connect',
      tag: 'SOLUTION',
      title: 'Every app keeps a connection open',
      body: [
        'Each app holds a WebSocket to a <b>gateway</b>. When it connects, the gateway records "user → gateway" in a small registry, so the system knows where to deliver.',
        'Two gateways hold the connections here, half the users each.',
      ],
      keyIdea: 'Lasting connections let the server push messages instantly.',
      change: {},
    },
    {
      id: 'send-path',
      short: 'Send',
      tag: 'SOLUTION',
      title: 'From one phone to another',
      body: [
        'A sender’s message goes to Gateway 1, then the chat service, which <b>stores it first</b>, then looks up the receiver’s gateway and pushes it there. 400 messages a second flow each way.',
        'The sender sees one tick when it is stored, two when the receiver’s app confirms delivery.',
      ],
      keyIdea: 'Store, then deliver. Acknowledgements make the state visible.',
      change: { flows: messages },
    },
    {
      id: 'gateway-dies',
      short: 'Lose one',
      tag: 'TRY IT',
      title: 'Gateway 2 dies',
      body: [
        'Predict: half the users are connected to Gateway 2. What happens to their messages?',
        'Press <b>Kill a server</b>. Messages from those users fail for about 3 seconds (<b>50%</b>) and deliveries to them stop. Their apps reconnect to Gateway 1, re-register, and resend anything not yet acknowledged.',
      ],
      keyIdea: 'Connections are lost on a crash; acknowledged messages are not.',
      change: {},
      breakActions: ['killServer'],
    },
    {
      id: 'dedupe',
      short: 'No repeats',
      tag: 'IDEA',
      title: 'Resending without duplicates',
      body: [
        'A resent message might have been stored already. Each app gives every message its own id, and the chat service ignores an id it has seen. The receiver never sees it twice.',
      ],
      keyIdea: 'Client-generated message ids make retries safe.',
      change: {},
    },
    {
      id: 'ordering',
      short: 'Order',
      tag: 'IDEA',
      title: 'Keeping order',
      body: [
        'Phones’ clocks disagree, so timestamps cannot order messages. Instead, each conversation has one owner that assigns a sequence number: 1, 2, 3. Apps show messages in that order and ask for any gap they notice.',
      ],
      keyIdea: 'Order per conversation with a sequence assigned in one place.',
      change: {},
    },
    {
      id: 'offline',
      short: 'Offline',
      tag: 'SOLUTION',
      title: 'Notify people who are offline',
      body: [
        'If the registry has no gateway for the receiver, the chat service puts a notification job on a queue. Push workers send it to the phone’s notification service. When the app opens, it fetches everything after the last sequence number it saw.',
      ],
      keyIdea: 'Offline delivery is a stored message plus a notification.',
      change: {
        add: {
          nodes: [
            { id: 'pushq', kind: 'queue', label: 'Notifications', x: 13.5, y: 10.5, value: 0 },
            {
              id: 'push',
              kind: 'service',
              label: 'Push workers',
              x: 17.5,
              y: 10.5,
              capacity: 500,
              tag: 'worker',
            },
          ],
          links: [
            { id: 'chat-pushq', from: 'chat', to: 'pushq' },
            { id: 'pushq-push', from: 'pushq', to: 'push' },
          ],
        },
        flows: [
          ...messages,
          { route: ['alice', 'gw1', 'chat', 'pushq', 'push'], kind: 'request', ratePerSec: 40 },
        ],
      },
    },
    {
      id: 'push-stops',
      short: 'Push stops',
      tag: 'TRY IT',
      title: 'The push workers stop',
      body: [
        'Predict: notifications stop being sent. Does chat break?',
        'Press <b>Stop the workers</b>. Chat errors stay at <b>0%</b>; online users chat as normal. Notifications wait in the queue, 40 more each second, and offline people hear about messages late, but the messages themselves are safe.',
      ],
      keyIdea: 'Keep secondary paths behind queues so they cannot stall the main one.',
      change: {},
      breakActions: ['stopWorkers'],
    },
    {
      id: 'storage',
      short: 'Storage',
      tag: 'IDEA',
      title: 'Storing billions of messages',
      body: [
        'Messages are written once and read mostly by conversation, newest first. Partition by conversation id and sort by sequence number: a write-friendly store spread across many machines fits well.',
      ],
      keyIdea: 'Partition by conversation; keep each one’s messages together and in order.',
      change: {},
    },
    {
      id: 'groups',
      short: 'Groups',
      tag: 'TRADE-OFF',
      title: 'Big groups',
      body: [
        'A message in a 500-person group means 500 deliveries, many of them notifications. Small groups fan out on write, delivering to each member. Very large channels are read on demand instead, like a feed.',
        'Read receipts in big groups are summarised ("read by 212") to avoid 500 updates per message.',
      ],
      keyIdea: 'Group size decides push or pull, just as follower count does for feeds.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Parley, end to end',
      body: [
        'Gateways hold connections, the chat service stores before delivering, sequence numbers keep order and message ids prevent repeats. A gateway crash cost 3 seconds of 50% errors and no lost messages; stopped push workers only delayed notifications.',
      ],
      keyIdea: 'Durable first, delivered fast, ordered per conversation, notified when offline.',
      change: {},
    },
  ],
};

export default lesson;
