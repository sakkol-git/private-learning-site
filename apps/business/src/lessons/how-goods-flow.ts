import type { CourseLesson } from './index';

const goods = [
  { route: ['maker', 'truck', 'wh'], kind: 'request' as const, ratePerSec: 20 },
  { route: ['wh', 'shop', 'buyers'], kind: 'request' as const, ratePerSec: 20 },
];
const money = { route: ['buyers', 'shop'], kind: 'response' as const, ratePerSec: 8000 };

const lesson: CourseLesson = {
  slug: 'how-goods-flow',
  chapter: 'Moving goods',
  title: 'How goods flow',
  summary: 'Follow a bike from the factory to a customer, and the money back the other way.',
  minutes: 6,
  level: 'beginner',
  youWillLearn: [
    { text: 'The steps of a simple supply chain', stepId: 'chain' },
    { text: 'What stock and days of stock mean', stepId: 'stock' },
    { text: 'How money flows back', stepId: 'money' },
    { text: 'What happens when demand outruns supply', stepId: 'rush' },
  ],
  initial: {
    nodes: [
      { id: 'maker', kind: 'factory', label: 'Bike factory', sublabel: 'supplier', x: 0, y: 3 },
      { id: 'buyers', kind: 'users', label: 'Customers', x: 15, y: 9 },
    ],
    links: [],
    metrics: { stock: 60, filledPct: 100, daysOfStock: 3, cash: 40000, profitPerDay: 0 },
  },
  steps: [
    {
      id: 'chain',
      short: 'Chain',
      tag: 'IDEA',
      title: 'From factory to front door',
      body: [
        '<b>Pedal & Co</b> sells city bikes. A factory builds them, a truck brings them to a warehouse, and the shop sells them to customers.',
        'Each step is a link in a <b>supply chain</b>.',
      ],
      keyIdea: 'A supply chain is every step between making a thing and selling it.',
      change: {
        add: {
          nodes: [
            { id: 'truck', kind: 'truck', label: 'Delivery truck', x: 4, y: 3 },
            { id: 'wh', kind: 'warehouse', label: 'Warehouse', x: 8.5, y: 3, value: 60 },
            { id: 'shop', kind: 'shop', label: 'Pedal & Co', sublabel: 'bike shop', x: 11.5, y: 7 },
          ],
          links: [
            { id: 'maker-truck', from: 'maker', to: 'truck' },
            { id: 'truck-wh', from: 'truck', to: 'wh' },
            { id: 'wh-shop', from: 'wh', to: 'shop' },
            { id: 'shop-buyers', from: 'shop', to: 'buyers' },
          ],
        },
      },
    },
    {
      id: 'stock',
      short: 'Stock',
      tag: 'IDEA',
      title: 'Twenty bikes in, twenty bikes out',
      body: [
        'Every day the factory ships <b>20 bikes</b> and the shop sells about 20. The warehouse holds <b>60</b>: three days of sales.',
        '"Days of stock" is how long the shelves would last if deliveries stopped.',
      ],
      keyIdea: 'Stock is a buffer between supply and demand.',
      change: { flows: goods, metrics: { stock: 60, daysOfStock: 3 } },
    },
    {
      id: 'money',
      short: 'Money',
      tag: 'IDEA',
      title: 'Money flows the other way',
      body: [
        'Each bike sells for $400. Customers pay about <b>$8,000 a day</b> in total.',
        'Most of it goes back to the factory, the truck, rent and wages. The shop keeps about <b>$500 a day</b> as profit.',
      ],
      keyIdea: 'Goods flow towards customers; money flows back towards suppliers.',
      change: { flows: [...goods, money], metrics: { profitPerDay: 500 } },
    },
    {
      id: 'rush',
      short: 'Rush',
      tag: 'TRY IT',
      title: 'A sunny week',
      body: [
        'Press <b>Demand spikes</b>. The weather turns and two and a half times more people want bikes for five days.',
        'The first day earns more. Then the warehouse runs dry and customers leave empty-handed until supply catches up.',
      ],
      keyIdea: 'You can only sell what you have on the shelf.',
      change: {},
      breakActions: ['demandSpike'],
    },
    {
      id: 'holding',
      short: 'Holding',
      tag: 'TRADE-OFF',
      title: 'Stock is money on a shelf',
      body: [
        'More stock would have caught the rush. But every bike in the warehouse was paid for and earns nothing until it sells, and storage costs rent.',
      ],
      keyIdea: 'Too little stock loses sales; too much ties up cash.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Goods one way, money the other',
      body: [
        'Products move from factory to customer through a chain of steps, and money flows back. Stock in between absorbs surprises, up to a point.',
        'Next: how much stock is enough.',
      ],
      keyIdea: 'Watch days of stock, not just units.',
      change: {},
    },
  ],
};

export default lesson;
