import type { CourseLesson } from './index';

const lesson: CourseLesson = {
  slug: 'safety-stock',
  chapter: 'Moving goods',
  title: 'Safety stock',
  summary: 'How many days of stock to keep so a late delivery does not empty the shelves.',
  minutes: 6,
  level: 'beginner',
  youWillLearn: [
    { text: 'What "running lean" risks', stepId: 'lean-test' },
    { text: 'How to size safety stock', stepId: 'buffer' },
    { text: 'What safety stock costs', stepId: 'cost' },
  ],
  initial: {
    nodes: [
      { id: 'maker', kind: 'factory', label: 'Bike factory', x: 0, y: 3 },
      { id: 'truck', kind: 'truck', label: 'Delivery truck', x: 4, y: 3 },
      { id: 'wh', kind: 'warehouse', label: 'Warehouse', x: 8.5, y: 3, value: 20 },
      { id: 'shop', kind: 'shop', label: 'Pedal & Co', x: 11.5, y: 7 },
      { id: 'buyers', kind: 'users', label: 'Customers', x: 15, y: 9 },
    ],
    links: [
      { id: 'maker-truck', from: 'maker', to: 'truck' },
      { id: 'truck-wh', from: 'truck', to: 'wh' },
      { id: 'wh-shop', from: 'wh', to: 'shop' },
      { id: 'shop-buyers', from: 'shop', to: 'buyers' },
    ],
    metrics: { stock: 20, filledPct: 100, daysOfStock: 1, cash: 40000, profitPerDay: 500 },
  },
  steps: [
    {
      id: 'lean',
      short: 'Lean',
      tag: 'PROBLEM',
      title: 'Running lean',
      body: [
        'To save money, Pedal & Co keeps only <b>one day</b> of stock: 20 bikes. It works perfectly, as long as every delivery arrives on time.',
      ],
      keyIdea: 'A lean chain is efficient and fragile.',
      change: {
        flows: [
          { route: ['maker', 'truck', 'wh'], kind: 'request', ratePerSec: 20 },
          { route: ['wh', 'shop', 'buyers'], kind: 'request', ratePerSec: 20 },
          { route: ['buyers', 'shop'], kind: 'response', ratePerSec: 8000 },
        ],
      },
    },
    {
      id: 'lean-test',
      short: 'Late',
      tag: 'TRY IT',
      title: 'The factory is six days late',
      body: [
        'Press <b>Supplier is late</b>. A machine breaks and nothing ships for six days.',
        'The shelves are empty after one day. For five days no bikes are sold, and the shop loses about <b>$2,500</b> of profit.',
      ],
      keyIdea: 'With one day of stock, any delay longer than a day stops sales.',
      change: {},
      breakActions: ['supplierDelay'],
    },
    {
      id: 'buffer',
      short: 'Buffer',
      tag: 'SOLUTION',
      title: 'Keep a week in reserve',
      body: [
        'Delays of up to a week happen a few times a year. So the shop builds <b>safety stock</b>: 140 bikes, seven days of sales.',
        'Rule of thumb: keep enough to cover the longest delay you expect, at normal sales.',
      ],
      keyIdea: 'Safety stock = expected delay × daily sales.',
      change: {
        update: { nodes: [{ id: 'wh', value: 140, sublabel: '7 days of stock' }] },
        metrics: { stock: 140, daysOfStock: 7 },
      },
    },
    {
      id: 'buffer-test',
      short: 'Late again',
      tag: 'TRY IT',
      title: 'The same delay, covered',
      body: [
        'Press <b>Supplier is late</b> again. The warehouse drains for six days but never empties. Every customer gets a bike.',
      ],
      keyIdea: 'A buffer turns a supplier problem into a non-event for customers.',
      change: {},
      breakActions: ['supplierDelay'],
    },
    {
      id: 'cost',
      short: 'Cost',
      tag: 'TRADE-OFF',
      title: 'What the buffer costs',
      body: [
        'The extra 120 bikes, at about $300 each from the factory, tie up roughly <b>$36,000</b>: money that sits on a shelf instead of in the bank. Storage space costs rent too.',
        'Businesses weigh that against the profit and goodwill they would lose in a stock-out.',
      ],
      keyIdea: 'Safety stock is insurance, paid for in cash.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Buffer for the delays you expect',
      body: [
        'One day of stock fails at the first delay. A week of stock rides out most delays, at the cost of cash tied up in bikes.',
        'Next: another way to protect supply, a second supplier.',
      ],
      keyIdea: 'Size the buffer to the risk, not to the average day.',
      change: {},
    },
  ],
};

export default lesson;
