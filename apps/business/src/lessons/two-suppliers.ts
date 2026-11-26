import type { CourseLesson } from './index';

const lesson: CourseLesson = {
  slug: 'two-suppliers',
  chapter: 'Planning for trouble',
  title: 'A second supplier',
  summary:
    'Relying on one supplier is a single point of failure. A backup supplier keeps goods arriving when the main one stops.',
  minutes: 6,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Why one supplier is a single point of failure', stepId: 'one-source' },
    { text: 'How a backup supplier with spare capacity helps', stepId: 'backup' },
    { text: 'What a second supplier costs', stepId: 'cost' },
  ],
  initial: {
    nodes: [
      { id: 'maker', kind: 'factory', label: 'Main factory', x: 0, y: 2 },
      { id: 'wh', kind: 'warehouse', label: 'Warehouse', x: 7, y: 5, value: 60 },
      { id: 'shop', kind: 'shop', label: 'Pedal & Co', x: 11, y: 8.5 },
      { id: 'buyers', kind: 'users', label: 'Customers', x: 15, y: 10 },
    ],
    links: [
      { id: 'maker-wh', from: 'maker', to: 'wh' },
      { id: 'wh-shop', from: 'wh', to: 'shop' },
      { id: 'shop-buyers', from: 'shop', to: 'buyers' },
    ],
    metrics: { stock: 60, filledPct: 100, daysOfStock: 3, cash: 40000, profitPerDay: 500 },
  },
  steps: [
    {
      id: 'one-source',
      short: 'One source',
      tag: 'PROBLEM',
      title: 'Every bike from one factory',
      body: [
        'All 20 bikes a day come from one factory. It is cheap and simple, but if that factory stops, so does Pedal & Co.',
      ],
      keyIdea: 'Any step with no alternative is a single point of failure.',
      change: {
        flows: [
          { route: ['maker', 'wh'], kind: 'request', ratePerSec: 20 },
          { route: ['wh', 'shop', 'buyers'], kind: 'request', ratePerSec: 20 },
        ],
      },
    },
    {
      id: 'one-source-test',
      short: 'Stop',
      tag: 'TRY IT',
      title: 'The factory stops',
      body: [
        'Press <b>Supplier is late</b>. Three days of stock run out, and for three days nothing sells.',
      ],
      keyIdea: 'A buffer only buys time; it cannot replace a missing supplier.',
      change: {},
      breakActions: ['supplierDelay'],
    },
    {
      id: 'backup',
      short: 'Backup',
      tag: 'SOLUTION',
      title: 'Add a second, smaller supplier',
      body: [
        'Pedal & Co now buys 5 bikes a day from a second factory, and 15 from the first. The second factory has room to make up to <b>25 a day</b> if asked.',
      ],
      keyIdea: 'A backup supplier is most useful if it already knows you and has spare capacity.',
      change: {
        add: {
          nodes: [
            {
              id: 'backup',
              kind: 'factory',
              label: 'Second factory',
              sublabel: 'can make 25/day',
              x: 0,
              y: 8,
              capacity: 25,
            },
          ],
          links: [{ id: 'backup-wh', from: 'backup', to: 'wh' }],
        },
        flows: [
          { route: ['maker', 'wh'], kind: 'request', ratePerSec: 15 },
          { route: ['backup', 'wh'], kind: 'request', ratePerSec: 5 },
          { route: ['wh', 'shop', 'buyers'], kind: 'request', ratePerSec: 20 },
        ],
      },
    },
    {
      id: 'backup-test',
      short: 'Covered',
      tag: 'TRY IT',
      title: 'The main factory stops again',
      body: [
        'Press <b>Supplier is late</b>. The second factory steps up to 25 bikes a day, more than the shop sells. Shelves stay stocked and every order is filled.',
      ],
      keyIdea: 'Two sources turn a shutdown into a busy week for the other one.',
      change: {},
      breakActions: ['supplierDelay'],
    },
    {
      id: 'cost',
      short: 'Cost',
      tag: 'TRADE-OFF',
      title: 'Paying for a spare',
      body: [
        'Smaller orders from two factories usually cost more per bike than one big order, and managing two relationships takes time.',
        'Many businesses accept a slightly higher price as the cost of staying open.',
      ],
      keyIdea: 'Resilience costs a little every day so it can save a lot on a bad day.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Never depend on one door',
      body: [
        'A single supplier is a single point of failure. A second supplier with spare capacity keeps goods flowing when the first stops.',
      ],
      keyIdea: 'Spread supply like you spread risk.',
      change: {},
    },
  ],
};

export default lesson;
