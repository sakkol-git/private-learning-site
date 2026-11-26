import type { MoneyAction, MoneyMetrics } from '@ss/diagram-engine';
import type { DiagramLesson } from '@ss/lesson-engine';

const month = [
  { route: ['job', 'account'], kind: 'request' as const, ratePerSec: 2000 },
  { route: ['account', 'bills'], kind: 'request' as const, ratePerSec: 1700 },
  { route: ['account', 'savings'], kind: 'request' as const, ratePerSec: 300 },
];

const lesson: DiagramLesson<MoneyMetrics, MoneyAction> = {
  slug: 'safety-net',
  chapter: 'Everyday money',
  title: 'Building a safety net',
  summary: 'Why an emergency fund comes before almost everything else, and how big it should be.',
  minutes: 7,
  level: 'beginner',
  youWillLearn: [
    { text: 'What happens when income stops with no savings', stepId: 'no-buffer-test' },
    { text: 'How to build a fund one month at a time', stepId: 'start-small' },
    { text: 'How many months of costs to aim for', stepId: 'how-big' },
    { text: 'Where an emergency fund should live', stepId: 'where-to-keep-it' },
  ],
  initial: {
    nodes: [
      { id: 'job', kind: 'employer', label: 'Employer', x: 0, y: 5 },
      { id: 'account', kind: 'wallet', label: 'Bank account', x: 5, y: 5 },
      { id: 'bills', kind: 'shop', label: 'Monthly costs', x: 10, y: 5, value: 1700 },
      {
        id: 'savings',
        kind: 'jar',
        label: 'Emergency fund',
        sublabel: 'goal: 3 months',
        x: 5,
        y: 10,
        value: 0,
        capacity: 5100,
      },
    ],
    links: [
      { id: 'job-account', from: 'job', to: 'account' },
      { id: 'account-bills', from: 'account', to: 'bills' },
      { id: 'account-savings', from: 'account', to: 'savings' },
    ],
    metrics: { income: 2000, spending: 1700, saved: 300, debt: 0, netWorth: 0 },
  },
  steps: [
    {
      id: 'no-buffer',
      short: 'No buffer',
      tag: 'PROBLEM',
      title: 'Everything works, until it doesn’t',
      body: [
        'You earn $2,000 a month and spend $1,700. You have just started putting $300 aside, so the fund is still empty.',
        'Life is fine as long as the salary keeps arriving on time.',
      ],
      keyIdea: 'A plan that only works while nothing goes wrong is not a plan yet.',
      change: { flows: month },
    },
    {
      id: 'no-buffer-test',
      short: 'Job loss',
      tag: 'TRY IT',
      title: 'What if the salary stops?',
      body: [
        'Press <b>Lose your income</b>. Each second is one month.',
        'With nothing saved, every bill from the first month on is paid with borrowed money. The red dots are payments you cannot cover.',
      ],
      keyIdea: 'Without savings, any gap in income turns straight into debt.',
      change: {},
      breakActions: ['loseIncome'],
    },
    {
      id: 'start-small',
      short: 'One month',
      tag: 'SOLUTION',
      title: 'Start with one month',
      body: [
        'Six months of saving $300 gives you <b>$1,800</b>: one full month of costs.',
        'One month is enough to absorb most car repairs, doctor visits and late paychecks without borrowing.',
      ],
      keyIdea: 'The first month of savings does the most work. Start there, not at the final goal.',
      change: {
        update: { nodes: [{ id: 'savings', value: 1800, sublabel: 'one month covered' }] },
        metrics: { netWorth: 1800 },
      },
    },
    {
      id: 'how-big',
      short: 'How big',
      tag: 'IDEA',
      title: 'Aim for three to six months',
      body: [
        'Finding a new job often takes a few months, so a common target is <b>three to six months</b> of essential costs.',
        'Here that is $5,100 for three months. At $300 a month it takes about a year and a half, so most people get there in stages.',
      ],
      keyIdea: 'Size the fund by your essential costs, not by your income.',
      change: {
        update: { nodes: [{ id: 'savings', value: 5100, sublabel: 'three months covered' }] },
        metrics: { netWorth: 5100 },
      },
    },
    {
      id: 'test-again',
      short: 'Test again',
      tag: 'TRY IT',
      title: 'Lose the job again, with a full fund',
      body: [
        'Press <b>Lose your income</b> again. Watch the jar drain month by month instead of debt piling up.',
        'Three months is time to find new work calmly. Reset, then try <b>Surprise bill</b>: the jar takes the hit and debt stays at zero.',
      ],
      keyIdea: 'An emergency fund buys time, and time is what you need most in a crisis.',
      change: {},
      breakActions: ['loseIncome', 'surpriseExpense'],
    },
    {
      id: 'where-to-keep-it',
      short: 'Where',
      tag: 'TRADE-OFF',
      title: 'Keep it boring and close',
      body: [
        'Keep the fund in a <b>separate savings account</b> you can reach within a day, but not on your everyday card.',
        'Do not invest it. Markets can fall right when you lose your job, which is exactly when you would need to sell.',
      ],
      keyIdea: 'Emergency money should be safe and available. Earning interest comes second.',
      change: { update: { nodes: [{ id: 'savings', sublabel: 'separate account' }] } },
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'A cushion between you and debt',
      body: [
        'Without a fund, losing income became debt in the first month. With three months saved, it became a manageable drawdown.',
        'Build one month first, then grow toward three to six, and keep it somewhere safe and separate.',
      ],
      keyIdea: 'Save for emergencies before you invest for growth.',
      change: {},
    },
  ],
};

export default lesson;
