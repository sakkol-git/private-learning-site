import type { InfraLesson } from './index';

const PARTS = [
  { id: 'flights', label: 'Flights', y: 2 },
  { id: 'hotels', label: 'Hotels', y: 6 },
  { id: 'payments', label: 'Payments', y: 10 },
];

const lesson: InfraLesson = {
  slug: 'distributed-transactions',
  chapter: 'Bigger architectures',
  title: 'Transactions across services',
  summary:
    'When one booking spans three services with three databases, use two-phase commit or a saga with compensations.',
  minutes: 10,
  level: 'advanced',
  youWillLearn: [
    { text: 'How two-phase commit works and why it blocks', stepId: 'two-phase' },
    { text: 'How a saga replaces one transaction with steps and undos', stepId: 'saga' },
    { text: 'Why sagas tolerate a service being down', stepId: 'saga-try' },
    { text: 'Orchestration versus choreography', stepId: 'styles' },
  ],
  initial: {
    nodes: [
      { id: 'travellers', kind: 'users', label: 'Travellers', x: 0, y: 6 },
      { id: 'booking', kind: 'server', label: 'Booking service', x: 4.5, y: 6, capacity: 800 },
      ...PARTS.map((p) => ({
        id: p.id,
        kind: 'service' as const,
        label: p.label,
        sublabel: 'own database',
        x: 12.5,
        y: p.y,
        capacity: 500,
        ...(p.id === 'hotels' ? { tag: 'worker' } : {}),
      })),
    ],
    links: [
      { id: 'travellers-booking', from: 'travellers', to: 'booking' },
      ...PARTS.map((p) => ({ id: `booking-${p.id}`, from: 'booking', to: p.id })),
    ],
    metrics: {
      users: 1000,
      requestsPerSec: 100,
      p95LatencyMs: 350,
      errorRatePct: 0,
      healthy: [1, 1],
    },
  },
  steps: [
    {
      id: 'three-services',
      short: 'Problem',
      tag: 'PROBLEM',
      title: 'One trip, three databases',
      body: [
        'Booking a trip reserves a seat with Flights, a room with Hotels and charges the card with Payments. Each service has its own database, so no single database transaction covers all three.',
        'A seat without a room, or a charge without a seat, must never be the final state.',
      ],
      keyIdea: 'Across services, "all or nothing" needs a protocol.',
      change: {
        flows: PARTS.map((p) => ({
          route: ['travellers', 'booking', p.id],
          kind: 'request' as const,
          ratePerSec: 100,
        })),
      },
    },
    {
      id: 'two-phase',
      short: '2PC',
      tag: 'IDEA',
      title: 'Two-phase commit',
      body: [
        'A coordinator asks every service "can you commit?" (prepare). Each locks what it needs and says yes. If all say yes, the coordinator says "commit"; otherwise "abort".',
        'Between the phases, everyone holds locks and waits. If the coordinator dies there, they wait until it returns.',
      ],
      keyIdea: '2PC gives true atomicity, and blocks everyone while it waits.',
      change: { update: { nodes: [{ id: 'booking', sublabel: 'coordinator · 2PC' }] } },
    },
    {
      id: 'two-phase-try',
      short: 'Hotels down',
      tag: 'TRY IT',
      title: 'Hotels goes down',
      body: [
        'Predict: the hotel service stops. What happens to bookings under two-phase commit?',
        'Press <b>Stop the workers</b>. Every call to Hotels fails: <b>33%</b> of all calls. Since every trip needs all three, no booking can complete, and flights and payments sit locked, waiting for an answer.',
      ],
      keyIdea:
        'With synchronous all-or-nothing, the whole is only as available as its weakest part.',
      change: {},
      breakActions: ['stopWorkers'],
    },
    {
      id: 'saga',
      short: 'Saga',
      tag: 'SOLUTION',
      title: 'A saga: steps with undo',
      body: [
        'A <b>saga</b> is a series of local transactions, each with a <b>compensation</b>: reserve seat (undo: release seat), reserve room (undo: release room), charge card (undo: refund).',
        'Steps are recorded in a durable log and run one by one. If the charge fails, the saga runs the undos in reverse.',
      ],
      keyIdea: 'Replace one big transaction with small ones that can each be undone.',
      change: {
        remove: { links: PARTS.map((p) => `booking-${p.id}`) },
        add: {
          nodes: [{ id: 'steps', kind: 'queue', label: 'Saga log', x: 8.5, y: 6, value: 0 }],
          links: [
            { id: 'booking-steps', from: 'booking', to: 'steps' },
            ...PARTS.map((p) => ({ id: `steps-${p.id}`, from: 'steps', to: p.id })),
          ],
        },
        update: { nodes: [{ id: 'booking', sublabel: 'orchestrator' }] },
        flows: [
          { route: ['travellers', 'booking', 'steps'], kind: 'request', ratePerSec: 100 },
          ...PARTS.map((p) => ({
            route: ['steps', p.id],
            kind: 'request' as const,
            ratePerSec: 100,
          })),
        ],
        metrics: { p95LatencyMs: 60 },
      },
    },
    {
      id: 'saga-try',
      short: 'Down again',
      tag: 'TRY IT',
      title: 'Hotels goes down again',
      body: [
        'Predict: the same outage, with a saga.',
        'Press <b>Stop the workers</b>. Errors stay at <b>0%</b>. Each trip is accepted as "pending", seat already held, and the hotel step waits in the log, 100 more each second. When Hotels returns, the sagas continue from where they stopped.',
      ],
      keyIdea: 'A saga turns an outage into a delay, as long as steps are durable.',
      change: {},
      breakActions: ['stopWorkers'],
    },
    {
      id: 'compensations',
      short: 'Undo',
      tag: 'IDEA',
      title: 'Undo is a new action',
      body: [
        'A compensation does not erase history: a refund is a new payment going the other way. Compensations must be safe to repeat, since they may run twice.',
        'Some steps cannot be undone, such as sending a confirmation email. Put those last.',
      ],
      keyIdea: 'Design each step with its undo, and order irreversible steps last.',
      change: {},
    },
    {
      id: 'styles',
      short: 'Styles',
      tag: 'IDEA',
      title: 'Conductor or dancers',
      body: [
        '<b>Orchestration</b>: one service, as here, tells each participant what to do next. Easy to follow. <b>Choreography</b>: each service reacts to the previous one’s event. No central piece, but the flow is spread across many services.',
      ],
      keyIdea: 'Orchestrate when the flow is complex; choreograph simple chains.',
      change: {},
    },
    {
      id: 'isolation',
      short: 'Isolation',
      tag: 'TRADE-OFF',
      title: 'Others see the middle',
      body: [
        'A saga has no isolation: for a few seconds a room is held for a trip that may yet be cancelled, and another traveller sees it as taken. The app must show "pending" honestly.',
        'Each step must also update its database and record "done" together, usually with an <b>outbox</b> table written in the same local transaction.',
      ],
      keyIdea: 'Sagas trade isolation for availability; the UI must show in-between states.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Eventually all or nothing',
      body: [
        'Two-phase commit made every booking depend on all three services at once, and one down service stopped them all. A saga with compensations kept accepting trips at 0% errors and finished them when Hotels came back.',
      ],
      keyIdea: 'Across services, prefer sagas with careful undos.',
      change: {},
    },
  ],
};

export default lesson;
