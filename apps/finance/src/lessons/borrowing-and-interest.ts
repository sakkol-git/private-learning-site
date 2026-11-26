import type { MoneyAction, MoneyMetrics } from '@ss/diagram-engine';
import type { DiagramLesson } from '@ss/lesson-engine';

const pay = { route: ['job', 'account'], kind: 'request' as const, ratePerSec: 2200 };
const living = { route: ['account', 'living'], kind: 'request' as const, ratePerSec: 1600 };
const loanPayment = { route: ['account', 'lender'], kind: 'request' as const, ratePerSec: 332 };
const cardPayment = (amount: number) => ({
  route: ['account', 'card'],
  kind: 'request' as const,
  ratePerSec: amount,
});

const lesson: DiagramLesson<MoneyMetrics, MoneyAction> = {
  slug: 'borrowing-and-interest',
  chapter: 'Borrowing and growing',
  title: 'Borrowing and interest',
  summary:
    'What a loan really costs, why minimum payments are a trap, and which debt to clear first.',
  minutes: 9,
  level: 'beginner',
  youWillLearn: [
    { text: 'How interest turns into a monthly payment', stepId: 'interest' },
    { text: 'The total cost of a loan', stepId: 'total-cost' },
    { text: 'Why minimum payments keep you in debt', stepId: 'minimum-payments' },
    { text: 'Which debt to pay off first', stepId: 'most-expensive-first' },
  ],
  initial: {
    nodes: [
      { id: 'job', kind: 'employer', label: 'Employer', x: 0, y: 5 },
      { id: 'account', kind: 'wallet', label: 'Bank account', x: 5, y: 5 },
      { id: 'living', kind: 'shop', label: 'Living costs', x: 10, y: 1.5, value: 1600 },
      { id: 'lender', kind: 'bank', label: 'Bank', x: 10, y: 8.5 },
    ],
    links: [
      { id: 'job-account', from: 'job', to: 'account' },
      { id: 'account-living', from: 'account', to: 'living' },
      { id: 'account-lender', from: 'account', to: 'lender' },
    ],
    metrics: { income: 2200, spending: 1600, saved: 600, debt: 0, netWorth: 3000 },
  },
  steps: [
    {
      id: 'a-loan',
      short: 'A loan',
      tag: 'IDEA',
      title: 'Borrow $10,000 for a car',
      body: [
        'You need a car to reach a better job. The bank lends you <b>$10,000</b> today and you pay it back over three years.',
        'Your net worth does not change yet: you own a $10,000 car and owe $10,000.',
      ],
      keyIdea: 'A loan moves money from your future self to your present self.',
      change: {
        update: { nodes: [{ id: 'lender', value: 10000, sublabel: 'lends $10,000' }] },
        flows: [pay, living, { route: ['lender', 'account'], kind: 'request', ratePerSec: 10000 }],
        metrics: { debt: 10000 },
      },
    },
    {
      id: 'interest',
      short: 'Interest',
      tag: 'IDEA',
      title: 'Interest is the price of borrowing',
      body: [
        'At <b>12% a year</b>, the bank charges about 1% of what you still owe each month.',
        'Spread over 36 months, that works out to a fixed payment of <b>$332</b>. Early on, most of it is interest. Later, most of it repays the loan.',
      ],
      keyIdea: 'Every monthly payment is part interest, part repayment. The mix shifts over time.',
      change: {
        update: { nodes: [{ id: 'lender', sublabel: '12% a year · 36 months' }] },
        flows: [pay, living, loanPayment],
        metrics: { spending: 1932, saved: 268 },
      },
    },
    {
      id: 'total-cost',
      short: 'Total',
      tag: 'IDEA',
      title: 'Add up what you really pay',
      body: [
        '36 payments of $332 come to <b>$11,957</b>. The car cost $10,000. The other $1,957 was the price of having it now.',
        'Compare loans by the total you will repay, not only by the monthly payment.',
      ],
      keyIdea: 'A longer loan lowers the monthly payment and raises the total cost.',
      change: { update: { nodes: [{ id: 'lender', sublabel: 'total repaid $11,957' }] } },
    },
    {
      id: 'minimum-payments',
      short: 'Minimums',
      tag: 'PROBLEM',
      title: 'The minimum payment trap',
      body: [
        'You also owe <b>$3,000</b> on a credit card at 24% a year. The card asks for a minimum of $90 a month.',
        'At the minimum, two thirds of each payment is interest. Clearing the card takes about <b>4½ years</b> and costs nearly $2,000 extra.',
      ],
      keyIdea: 'Minimum payments are designed to keep you paying, not to get you out of debt.',
      change: {
        add: {
          nodes: [
            {
              id: 'card',
              kind: 'bank',
              label: 'Credit card',
              sublabel: '24% · minimum $90',
              x: 5,
              y: 10,
              value: 3000,
            },
          ],
          links: [{ id: 'account-card', from: 'account', to: 'card' }],
        },
        flows: [pay, living, loanPayment, cardPayment(90)],
        metrics: { debt: 13000, spending: 2022, saved: 178 },
      },
    },
    {
      id: 'rates-rise',
      short: 'Rates rise',
      tag: 'TRY IT',
      title: 'What if interest rates go up?',
      body: [
        'Some debts have a <b>variable rate</b> that follows the market.',
        'Press <b>Rates rise 5%</b>. On $13,000 of debt that is about $54 more a month, taken straight out of what you save.',
      ],
      keyIdea: 'Variable-rate debt moves risk from the lender to you.',
      change: {},
      breakActions: ['rateHike'],
    },
    {
      id: 'most-expensive-first',
      short: 'Pay off',
      tag: 'SOLUTION',
      title: 'Pay the most expensive debt first',
      body: [
        'Keep paying the minimum on everything, and put every spare dollar on the debt with the <b>highest rate</b>: the card.',
        'Paying $260 a month clears it in about 13 months for $445 of interest, instead of 4½ years and nearly $2,000.',
      ],
      keyIdea: 'Extra payments save the most on the highest-rate debt.',
      change: {
        update: { nodes: [{ id: 'card', sublabel: '24% · paying $260' }] },
        flows: [pay, living, loanPayment, cardPayment(260)],
        metrics: { spending: 2192, saved: 8 },
      },
    },
    {
      id: 'good-and-bad',
      short: 'Good debt?',
      tag: 'TRADE-OFF',
      title: 'Not all debt is equal',
      body: [
        'Debt that helps you earn more, such as a car for a better job or a course that raises your pay, can be worth its interest.',
        'Debt for things that are used up quickly, like meals, gadgets and holidays, costs interest long after the thing is gone.',
      ],
      keyIdea: 'Before borrowing, ask: will this still be worth it after I add the interest?',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Borrow with your eyes open',
      body: [
        'Interest is the price of having money sooner. Compare loans by total cost, avoid living on minimum payments, and clear the most expensive debt first.',
        'Once high-interest debt is gone, the money that paid it can start growing for you instead.',
      ],
      keyIdea: 'Interest works against you when you borrow. The next lesson makes it work for you.',
      change: {},
    },
  ],
};

export default lesson;
