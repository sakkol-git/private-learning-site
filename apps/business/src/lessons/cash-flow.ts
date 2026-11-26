import { buildStepStates, businessScenarios, DAY_MS } from '@ss/diagram-engine';
import { experimentState } from '@ss/lesson-engine';
import type { CourseLesson } from './index';

const lesson: CourseLesson = {
  slug: 'cash-flow',
  chapter: 'Money',
  title: 'Cash flow',
  summary: 'A business can be profitable and still run out of money. Watch cash, not just profit.',
  minutes: 7,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Why profit and cash are different', stepId: 'profit-vs-cash' },
    { text: 'What late payments do to cash', stepId: 'late' },
    { text: 'How a cash buffer keeps you going', stepId: 'buffer' },
  ],
  initial: {
    nodes: [
      { id: 'maker', kind: 'factory', label: 'Bike factory', x: 0, y: 3 },
      { id: 'wh', kind: 'warehouse', label: 'Warehouse', x: 5, y: 3, value: 60 },
      { id: 'shop', kind: 'shop', label: 'Pedal & Co', x: 9.5, y: 6 },
      {
        id: 'buyers',
        kind: 'users',
        label: 'Business customers',
        sublabel: 'pay by invoice',
        x: 15,
        y: 6,
      },
      { id: 'bank', kind: 'bank', label: 'Bank', x: 9.5, y: 11 },
    ],
    links: [
      { id: 'maker-wh', from: 'maker', to: 'wh' },
      { id: 'wh-shop', from: 'wh', to: 'shop' },
      { id: 'shop-buyers', from: 'shop', to: 'buyers' },
      { id: 'shop-bank', from: 'shop', to: 'bank', style: 'dashed' },
    ],
    metrics: { stock: 60, filledPct: 100, daysOfStock: 3, cash: 40000, profitPerDay: 500 },
  },
  steps: [
    {
      id: 'profit-vs-cash',
      short: 'Profit',
      tag: 'IDEA',
      title: 'Profit is not cash',
      body: [
        'Pedal & Co now sells bikes to delivery companies, who pay invoices later. The factory, rent and wages must be paid now.',
        'On paper the shop makes <b>$500 a day</b>. In the bank, money arrives only when customers actually pay: about $8,000 a day.',
      ],
      keyIdea: 'Profit is earned when you sell. Cash arrives when you get paid.',
      change: {
        flows: [
          { route: ['maker', 'wh'], kind: 'request', ratePerSec: 20 },
          { route: ['wh', 'shop', 'buyers'], kind: 'request', ratePerSec: 20 },
          { route: ['buyers', 'shop'], kind: 'response', ratePerSec: 8000 },
        ],
      },
    },
    {
      id: 'late',
      short: 'Late',
      tag: 'TRY IT',
      title: 'Customers start paying late',
      body: [
        'Press <b>Customers pay late</b>. For ten days, no payments arrive, but bills keep going out.',
        'Cash falls by about $8,000 a day. Starting from $40,000, it hits zero after five days and goes negative on day six: the shop must ask the bank for a loan or stop paying its own suppliers.',
      ],
      keyIdea: 'Late payments drain cash even while sales and profit look fine.',
      change: {},
      breakActions: ['latePayments'],
    },
    {
      id: 'buffer',
      short: 'Buffer',
      tag: 'SOLUTION',
      title: 'Keep a cash buffer',
      body: [
        'The owner keeps more cash in reserve, <b>$100,000</b>, and arranges a credit line with the bank before it is needed.',
        'Rule of thumb: enough cash to cover the longest gap you expect between paying out and getting paid.',
      ],
      keyIdea: 'Cash reserves buy time when money is late.',
      change: { metrics: { cash: 100000 } },
    },
    {
      id: 'buffer-test',
      short: 'Covered',
      tag: 'TRY IT',
      title: 'The same late payments, covered',
      body: [
        'Press <b>Customers pay late</b> again. Cash dips to about <b>$20,000</b> but never goes negative, and recovers when the invoices are paid.',
      ],
      keyIdea: 'With a buffer, a payment delay is a dip, not a crisis.',
      change: {},
      breakActions: ['latePayments'],
    },
    {
      id: 'terms',
      short: 'Terms',
      tag: 'TRADE-OFF',
      title: 'Payment terms are a lever',
      body: [
        'Asking for deposits, sending invoices promptly and chasing late payers all speed up cash. Paying your own suppliers on longer terms slows the outflow.',
        'But push too hard and customers or suppliers go elsewhere.',
      ],
      keyIdea: 'When you get paid matters as much as how much.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Watch the bank balance',
      body: [
        'Many failing businesses are profitable on paper. Late payments, bills due now and stock bought in advance all drain cash. A buffer and good payment terms keep the doors open.',
      ],
      keyIdea: 'Cash is the oxygen of a business.',
      change: {},
    },
  ],
};

const thin = businessScenarios.latePayments(experimentState(lesson, 'late', buildStepStates));
const buffered = businessScenarios.latePayments(
  experimentState(lesson, 'buffer-test', buildStepStates),
);
if (!thin || !buffered) throw new Error('Late payments requires customer receipts');
lesson.experiment = {
  stepId: 'buffer-test',
  title: 'Can the shop cover the same payment delay?',
  control: 'Payment timeline',
  unit: 'USD',
  frames: [1, 5, 9, 10, 11].map((day) => {
    const time = day * DAY_MS - 1; // End of the selected simulated day.
    return {
      label: 'Day ' + day,
      rows: [
        { label: 'Cash with the original reserve', value: thin.metricsAt(time).cash },
        { label: 'Cash with the larger reserve', value: buffered.metricsAt(time).cash },
      ],
      caption:
        day < 11
          ? 'Customers still owe the shop. A bar to the left of zero means bills exceed available cash.'
          : 'The customers pay their overdue invoices. Both balances include the collected cash.',
    };
  }),
};

export default lesson;
