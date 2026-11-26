import type { MoneyAction, MoneyMetrics } from '@ss/diagram-engine';
import type { DiagramLesson } from '@ss/lesson-engine';

const spend = (other: number) => [
  { route: ['account', 'rent'], kind: 'request' as const, ratePerSec: 700 },
  { route: ['account', 'food'], kind: 'request' as const, ratePerSec: 400 },
  { route: ['account', 'transport'], kind: 'request' as const, ratePerSec: 200 },
  { route: ['account', 'other'], kind: 'request' as const, ratePerSec: other },
];
const pay = { route: ['job', 'account'], kind: 'request' as const, ratePerSec: 1800 };

const lesson: DiagramLesson<MoneyMetrics, MoneyAction> = {
  slug: 'where-your-money-goes',
  chapter: 'Everyday money',
  title: 'Where your money goes',
  summary: 'Follow one month of pay from payday to the last dollar, and find room to save.',
  minutes: 7,
  level: 'beginner',
  youWillLearn: [
    { text: 'How to see where each dollar goes', stepId: 'follow-the-money' },
    { text: 'The difference between needs and wants', stepId: 'needs-and-wants' },
    { text: 'Why you save first, not last', stepId: 'pay-yourself-first' },
    { text: 'What happens without a buffer', stepId: 'surprise-bill' },
  ],
  initial: {
    nodes: [
      { id: 'job', kind: 'employer', label: 'Employer', x: 0, y: 5 },
      { id: 'account', kind: 'wallet', label: 'Bank account', x: 5, y: 5 },
    ],
    links: [{ id: 'job-account', from: 'job', to: 'account' }],
    metrics: { income: 1800, spending: 0, saved: 1800, debt: 0, netWorth: 400 },
  },
  steps: [
    {
      id: 'gone-by-the-20th',
      short: 'Payday',
      tag: 'PROBLEM',
      title: 'Paid on the 1st, broke by the 20th',
      body: [
        'Your salary of <b>$1,800</b> lands on the 1st. By the 20th the account is almost empty, and you are not sure why.',
        'Nothing big happened. No holiday, no new phone. The money just went.',
      ],
      keyIdea: 'If you cannot say where money went, you cannot decide where it should go.',
      change: {
        add: {
          nodes: [
            { id: 'rent', kind: 'shop', label: 'Rent', x: 10, y: 0.5 },
            { id: 'food', kind: 'shop', label: 'Food', x: 10, y: 3.5 },
            { id: 'transport', kind: 'shop', label: 'Transport', x: 10, y: 6.5 },
            { id: 'other', kind: 'shop', label: 'Everything else', x: 10, y: 9.5 },
          ],
          links: [
            { id: 'account-rent', from: 'account', to: 'rent' },
            { id: 'account-food', from: 'account', to: 'food' },
            { id: 'account-transport', from: 'account', to: 'transport' },
            { id: 'account-other', from: 'account', to: 'other' },
          ],
        },
        flows: [pay, ...spend(500)],
        metrics: { spending: 1800, saved: 0 },
      },
    },
    {
      id: 'follow-the-money',
      short: 'Track',
      tag: 'IDEA',
      title: 'Follow every dollar for one month',
      body: [
        'Write down every payment for 30 days, or read your bank statement line by line, and sort each one into a few groups.',
        'Rent, food and transport are no surprise. The shock is <b>Everything else</b>: $500 made of coffees, delivery fees, top-ups and small online orders.',
      ],
      keyIdea: 'Tracking is not about guilt. It turns a vague feeling into numbers you can change.',
      change: {
        update: {
          nodes: [
            { id: 'rent', value: 700 },
            { id: 'food', value: 400 },
            { id: 'transport', value: 200 },
            { id: 'other', value: 500 },
          ],
        },
      },
    },
    {
      id: 'needs-and-wants',
      short: 'Needs',
      tag: 'IDEA',
      title: 'Split needs from wants',
      body: [
        'A <b>need</b> is something you must pay to live and work: a roof, food, getting to your job.',
        'A <b>want</b> makes life nicer but can shrink for a while. Wants are where your choices are.',
      ],
      keyIdea: 'Needs are hard to cut quickly. Wants are where a budget finds room.',
      change: {
        update: {
          nodes: [
            { id: 'rent', sublabel: 'need' },
            { id: 'food', sublabel: 'need' },
            { id: 'transport', sublabel: 'need' },
            { id: 'other', sublabel: 'want' },
          ],
        },
      },
    },
    {
      id: 'pay-yourself-first',
      short: 'Save first',
      tag: 'SOLUTION',
      title: 'Pay yourself first',
      body: [
        'On payday, move <b>10%</b> into a separate savings jar before spending anything. That is $180.',
        'The wants budget shrinks from $500 to $320. Saving what is left at the end of the month rarely works, because there is rarely anything left.',
      ],
      keyIdea: 'Saving first makes it automatic. Spending adjusts to what remains.',
      change: {
        add: {
          nodes: [
            {
              id: 'savings',
              kind: 'jar',
              label: 'Savings',
              sublabel: 'paid first, on payday',
              x: 5,
              y: 10,
              value: 180,
              capacity: 5400,
            },
          ],
          links: [{ id: 'account-savings', from: 'account', to: 'savings' }],
        },
        update: { nodes: [{ id: 'other', value: 320 }] },
        flows: [
          pay,
          { route: ['account', 'savings'], kind: 'request', ratePerSec: 180 },
          ...spend(320),
        ],
        metrics: { spending: 1620, saved: 180, netWorth: 580 },
      },
    },
    {
      id: 'surprise-bill',
      short: 'Surprise',
      tag: 'TRY IT',
      title: 'A surprise bill arrives',
      body: [
        'Press <b>Surprise bill</b>. A broken tooth costs $2,400.',
        'The savings jar only holds $180. The other $2,220 goes on a credit card, and you owe money for the first time.',
      ],
      keyIdea: 'Surprises are not rare. Something unplanned happens to most people every year.',
      change: {
        add: {
          nodes: [{ id: 'card', kind: 'bank', label: 'Credit card', x: 0, y: 10 }],
          links: [{ id: 'card-account', from: 'card', to: 'account', style: 'dashed' }],
        },
      },
      breakActions: ['surpriseExpense'],
    },
    {
      id: 'small-leaks',
      short: 'Leaks',
      tag: 'TRADE-OFF',
      title: 'Small amounts are not small',
      body: [
        'A $5 drink every working day is about $110 a month, or $1,300 a year.',
        'You do not need to cut every treat. Pick the few that matter to you, and let the rest go on purpose.',
      ],
      keyIdea:
        'Multiply small daily habits by 250 working days before deciding they do not matter.',
      change: { update: { nodes: [{ id: 'other', sublabel: 'want · ~40 small buys' }] } },
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'A plan instead of a mystery',
      body: [
        'You tracked a month, split needs from wants, and moved saving to the start of the month.',
        'The surprise bill showed what the savings jar is really for. That is the next lesson.',
      ],
      keyIdea: 'A budget is a decision made once, on payday, instead of thirty small ones.',
      change: {},
    },
  ],
};

export default lesson;
