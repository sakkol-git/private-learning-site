import type { MoneyAction, MoneyMetrics } from '@ss/diagram-engine';
import type { Lesson } from '@ss/lesson-engine';

const lesson: Lesson<MoneyMetrics, MoneyAction> = {
  slug: 'growing-money',
  chapter: 'Borrowing and growing',
  title: 'Growing money over time',
  summary:
    'How small, steady investing compounds, why starting early matters most, and how to sit through a crash.',
  minutes: 8,
  level: 'beginner',
  youWillLearn: [
    { text: 'What compounding means', stepId: 'growth-on-growth' },
    { text: 'Why time matters more than amount', stepId: 'starting-late' },
    { text: 'What a market crash does to a long plan', stepId: 'crash' },
    { text: 'Why spreading risk beats picking winners', stepId: 'risk' },
  ],
  initial: {
    nodes: [
      { id: 'job', kind: 'employer', label: 'Employer', x: 0, y: 5 },
      { id: 'account', kind: 'wallet', label: 'Bank account', x: 5, y: 5 },
      { id: 'living', kind: 'shop', label: 'Living costs', x: 5, y: 0.5, value: 1800 },
      {
        id: 'fund',
        kind: 'market',
        label: 'Index fund',
        sublabel: 'thousands of companies',
        x: 10,
        y: 5,
        value: 0,
      },
    ],
    links: [
      { id: 'job-account', from: 'job', to: 'account' },
      { id: 'account-living', from: 'account', to: 'living' },
      { id: 'account-fund', from: 'account', to: 'fund' },
    ],
    metrics: { income: 2000, spending: 1800, saved: 200, debt: 0, netWorth: 0 },
  },
  steps: [
    {
      id: 'start',
      short: 'Start',
      tag: 'IDEA',
      title: 'Invest $200 every month',
      body: [
        'Your emergency fund is full and your expensive debt is gone. Now $200 a month goes into an <b>index fund</b>, which owns small pieces of thousands of companies.',
        'This course assumes an average return of 7% a year. After one year you have put in $2,400 and the fund is worth about <b>$2,476</b>.',
      ],
      keyIdea:
        'Investing means owning things that tend to grow in value: here, slices of many businesses.',
      change: {
        update: { nodes: [{ id: 'fund', value: 2476 }] },
        flows: [
          { route: ['job', 'account'], kind: 'request', ratePerSec: 2000 },
          { route: ['account', 'living'], kind: 'request', ratePerSec: 1800 },
          { route: ['account', 'fund'], kind: 'request', ratePerSec: 200 },
        ],
        metrics: { netWorth: 2476 },
      },
    },
    {
      id: 'growth-on-growth',
      short: 'Compound',
      tag: 'IDEA',
      title: 'Growth on top of growth',
      body: [
        'The fund’s gains stay invested, so next year they earn gains of their own. This is <b>compounding</b>.',
        'After 10 years you have put in $24,000. The fund is worth about <b>$34,210</b>. Over $10,000 came from growth, not from your pay.',
      ],
      keyIdea: 'Compounding means your returns start earning returns.',
      change: {
        update: { nodes: [{ id: 'fund', value: 34210, sublabel: 'gains reinvested' }] },
        metrics: { netWorth: 34210 },
      },
    },
    {
      id: 'time',
      short: '30 years',
      tag: 'IDEA',
      title: 'Time does most of the work',
      body: [
        'Keep going for 30 years. You put in $72,000. The fund grows to about <b>$233,900</b>.',
        'More than two thirds of the final amount is growth. Most of it arrives in the last ten years.',
      ],
      keyIdea:
        'Compounding is slow at first and fast at the end. The hard part is staying in long enough.',
      change: {
        update: { nodes: [{ id: 'fund', value: 233891, sublabel: '30 years of $200' }] },
        metrics: { netWorth: 233891 },
      },
    },
    {
      id: 'starting-late',
      short: 'Late start',
      tag: 'PROBLEM',
      title: 'Starting ten years later',
      body: [
        'A friend invests the same $200 a month at the same rate, but starts ten years later.',
        'They put in $48,000 and end with about <b>$101,500</b>, less than half of your total. Those first ten years were worth over $130,000.',
      ],
      keyIdea: 'Starting early with a little usually beats starting late with more.',
      change: {
        add: {
          nodes: [
            {
              id: 'late',
              kind: 'market',
              label: 'Friend’s fund',
              sublabel: 'started 10 years later',
              x: 10,
              y: 10.5,
              value: 101507,
            },
          ],
        },
      },
    },
    {
      id: 'crash',
      short: 'Crash',
      tag: 'TRY IT',
      title: 'The market falls by a third',
      body: [
        'Press <b>Market crash</b>. Your fund drops about 35% in weeks, and more than $80,000 vanishes on screen.',
        'Then keep watching. In this example the market recovers and ends higher than before. People who sold at the bottom locked in the loss.',
      ],
      keyIdea: 'A fall is only a loss if you sell. Long plans are built to wait out crashes.',
      change: {},
      breakActions: ['marketDrop'],
    },
    {
      id: 'risk',
      short: 'Risk',
      tag: 'TRADE-OFF',
      title: 'Higher returns come with bumps',
      body: [
        'The 7% is an average over long periods, not a promise. Some years lose money, and real recoveries can take years, not months.',
        'Owning thousands of companies through one fund means no single failure can sink you. Picking a few hot stocks removes that protection.',
      ],
      keyIdea:
        'Spread your risk, invest money you will not need for years, and expect bad years along the way.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Small, steady, and early',
      body: [
        'A modest monthly amount, reinvested for decades, grew into far more than was paid in. Starting late cost more than any crash did.',
        'The order still matters: a safety net first, expensive debt cleared, then investing for the long run.',
      ],
      keyIdea: 'Time in the market matters more than timing the market.',
      change: {},
    },
  ],
};

export default lesson;
