import type { CourseLesson } from './index';

const lesson: CourseLesson = {
  slug: 'demand-spikes',
  chapter: 'Planning for trouble',
  title: 'Planning for demand spikes',
  summary:
    'A big sale is only good news if the stock is there. Plan ahead, and beware of over-reacting.',
  minutes: 6,
  level: 'intermediate',
  youWillLearn: [
    { text: 'How a spike turns into lost sales', stepId: 'unprepared' },
    { text: 'How to stock up for a known peak', stepId: 'prepared' },
    { text: 'What the bullwhip effect is', stepId: 'bullwhip' },
  ],
  initial: {
    nodes: [
      { id: 'maker', kind: 'factory', label: 'Bike factory', x: 0, y: 3 },
      { id: 'truck', kind: 'truck', label: 'Delivery truck', x: 4, y: 3 },
      { id: 'wh', kind: 'warehouse', label: 'Warehouse', x: 8.5, y: 3, value: 60 },
      { id: 'shop', kind: 'shop', label: 'Pedal & Co', x: 11.5, y: 7 },
      { id: 'buyers', kind: 'users', label: 'Customers', x: 15, y: 9 },
    ],
    links: [
      { id: 'maker-truck', from: 'maker', to: 'truck' },
      { id: 'truck-wh', from: 'truck', to: 'wh' },
      { id: 'wh-shop', from: 'wh', to: 'shop' },
      { id: 'shop-buyers', from: 'shop', to: 'buyers' },
    ],
    metrics: { stock: 60, filledPct: 100, daysOfStock: 3, cash: 40000, profitPerDay: 500 },
  },
  steps: [
    {
      id: 'sale',
      short: 'Sale',
      tag: 'IDEA',
      title: 'Spring sale next week',
      body: [
        'Pedal & Co plans a five-day spring sale. Last year, sales ran at about two and a half times normal.',
        'Today the warehouse holds three days of normal sales.',
      ],
      keyIdea: 'Some spikes are surprises. Many are on the calendar.',
      change: {
        flows: [
          { route: ['maker', 'truck', 'wh'], kind: 'request', ratePerSec: 20 },
          { route: ['wh', 'shop', 'buyers'], kind: 'request', ratePerSec: 20 },
        ],
      },
    },
    {
      id: 'unprepared',
      short: 'Unready',
      tag: 'TRY IT',
      title: 'The sale with normal stock',
      body: [
        'Press <b>Demand spikes</b>. The first day sells 50 bikes and profit jumps. By day two the warehouse is empty, and for the rest of the sale most customers leave with nothing.',
      ],
      keyIdea: 'A spike you cannot supply becomes disappointed customers.',
      change: {},
      breakActions: ['demandSpike'],
    },
    {
      id: 'prepared',
      short: 'Stock up',
      tag: 'SOLUTION',
      title: 'Build stock before the peak',
      body: [
        'Extra sale demand is about 30 bikes a day for 5 days: 150 bikes. Ordered two weeks early, the warehouse starts the sale with <b>210</b>.',
      ],
      keyIdea: 'Stock for a known peak = extra demand per day × days of the peak.',
      change: {
        update: { nodes: [{ id: 'wh', value: 210, sublabel: 'stocked for the sale' }] },
        metrics: { stock: 210, daysOfStock: 10.5 },
      },
    },
    {
      id: 'prepared-test',
      short: 'Ready',
      tag: 'TRY IT',
      title: 'The same sale, prepared',
      body: [
        'Press <b>Demand spikes</b> again. Every customer gets a bike, and the shop earns about <b>$1,250 a day</b> during the sale instead of $500.',
      ],
      keyIdea: 'Preparation turns a spike into profit.',
      change: {},
      breakActions: ['demandSpike'],
    },
    {
      id: 'bullwhip',
      short: 'Bullwhip',
      tag: 'TRADE-OFF',
      title: 'The bullwhip effect',
      body: [
        'After a stock-out, it is tempting to order far too much "to be safe". The factory sees a huge order and orders extra parts too. Small changes in shop sales grow into wild swings further up the chain.',
        'Sharing real sales numbers with suppliers keeps everyone calmer.',
      ],
      keyIdea: 'Over-reacting to a spike causes the next problem.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Plan the peaks',
      body: [
        'Known peaks need stock built in advance. Unplanned ones need a buffer. And steady, shared forecasts stop the whole chain over-reacting.',
      ],
      keyIdea: 'Forecast, prepare, and share the numbers.',
      change: {},
    },
  ],
};

export default lesson;
