import type { MoneyAction, MoneyMetrics } from '@ss/diagram-engine';
import type { DiagramLesson } from '@ss/lesson-engine';

const lesson: DiagramLesson<MoneyMetrics, MoneyAction> = {
  slug: 'spotting-a-scheme',
  chapter: 'Protecting yourself',
  title: 'Spotting a Ponzi scheme',
  summary: 'Follow the money inside a "guaranteed returns" club, and see why it must collapse.',
  minutes: 8,
  level: 'beginner',
  youWillLearn: [
    { text: 'Where the "returns" in a scheme really come from', stepId: 'where-from' },
    { text: 'Why a scheme must keep recruiting', stepId: 'must-grow' },
    { text: 'What happens when new money stops', stepId: 'collapse' },
    { text: 'The warning signs to check before paying', stepId: 'warning-signs' },
  ],
  initial: {
    nodes: [
      { id: 'you', kind: 'person', label: 'You', sublabel: 'your stake', x: 0, y: 5, value: 2000 },
      { id: 'club', kind: 'scheme', label: 'Lucky Star Club', x: 5, y: 5, value: 0 },
    ],
    links: [{ id: 'you-club', from: 'you', to: 'club' }],
    metrics: { income: 1800, spending: 1500, saved: 300, debt: 0, netWorth: 6000 },
  },
  steps: [
    {
      id: 'the-offer',
      short: 'The offer',
      tag: 'PROBLEM',
      title: 'A friend’s club pays 10% a month',
      body: [
        'A friend joined the <b>Lucky Star Club</b> and shows you the payments in their app: 10% every month, "guaranteed".',
        'You put in <b>$2,000</b> of your savings. Your net worth still counts it, because the club says it is yours.',
      ],
      keyIdea: 'Real investments that pay 10% a month, every month, without risk do not exist.',
      change: {
        update: { nodes: [{ id: 'club', value: 2000 }] },
        flows: [{ route: ['you', 'club'], kind: 'request', ratePerSec: 2000 }],
      },
    },
    {
      id: 'it-pays',
      short: 'It pays',
      tag: 'IDEA',
      title: 'At first, it pays exactly as promised',
      body: [
        '$200 arrives every month. The darker dots are those returns. Your friend was right, and it feels like proof.',
        'Early payouts are the scheme’s best advertising. Happy members bring in their friends.',
      ],
      keyIdea: 'Being paid on time proves only that money is moving, not that it is being earned.',
      change: {
        update: { nodes: [{ id: 'you', sublabel: '+$200 every month' }] },
        flows: [{ route: ['club', 'you'], kind: 'response', ratePerSec: 200 }],
      },
    },
    {
      id: 'where-from',
      short: 'Source',
      tag: 'IDEA',
      title: 'Where do the returns come from?',
      body: [
        'Look inside. There is no business, no factory, no loans being repaid. The only money coming in is from <b>new members</b>.',
        'Your $200 a month and the early members’ payouts are paid out of newer members’ deposits.',
      ],
      keyIdea: 'A Ponzi scheme pays old members with new members’ money. Nothing is earned.',
      change: {
        add: {
          nodes: [
            { id: 'new', kind: 'person', label: 'New members', x: 5, y: 10 },
            { id: 'early', kind: 'person', label: 'Early members', x: 10, y: 5, value: 8000 },
          ],
          links: [
            { id: 'new-club', from: 'new', to: 'club' },
            { id: 'club-early', from: 'club', to: 'early' },
          ],
        },
        update: { nodes: [{ id: 'club', value: 40000 }] },
        flows: [
          { route: ['new', 'club'], kind: 'request', ratePerSec: 6000 },
          { route: ['club', 'you'], kind: 'response', ratePerSec: 200 },
          { route: ['club', 'early'], kind: 'response', ratePerSec: 800 },
        ],
      },
    },
    {
      id: 'must-grow',
      short: 'Must grow',
      tag: 'IDEA',
      title: 'It has to keep getting bigger',
      body: [
        'Paying 10% a month means the amount owed roughly <b>doubles every seven months</b>. New deposits must keep up with that.',
        'Within a few years it would need more members than the country has people. Growth always stops.',
      ],
      keyIdea:
        'Promised returns grow on a curve. The number of new people willing to join does not.',
      change: { update: { nodes: [{ id: 'club', sublabel: 'needs ever more members' }] } },
    },
    {
      id: 'collapse',
      short: 'Collapse',
      tag: 'TRY IT',
      title: 'New money stops',
      body: [
        'Press <b>New money stops</b>. Recruiting slows, as it always does.',
        'Payouts drain what is left for a moment, then the club stops paying. Withdrawals bounce, and your $2,000 is gone with everyone else’s.',
      ],
      keyIdea: 'Late joiners lose the most, and most people in a scheme are late joiners.',
      change: {},
      breakActions: ['newMoneyStops'],
    },
    {
      id: 'warning-signs',
      short: 'Signs',
      tag: 'SOLUTION',
      title: 'The warning signs',
      body: [
        'Guaranteed high returns. Pressure to recruit friends or family. A vague answer to "how does it make money?". Withdrawals that get slower or need a fee.',
        'Any one of these is a reason to stop. Together, they describe almost every scheme.',
      ],
      keyIdea: 'If the return is high, steady and guaranteed, assume it is not real.',
      change: { update: { nodes: [{ id: 'club', sublabel: 'guaranteed · recruit · vague' }] } },
    },
    {
      id: 'check-first',
      short: 'Check',
      tag: 'IDEA',
      title: 'Check before you pay',
      body: [
        'Look the company up with your country’s financial regulator. Licensed firms are listed, and regulators publish warnings about known schemes.',
        'Ask a person who gains nothing from your decision. A real opportunity will still be there after a week of checking.',
      ],
      keyIdea: 'Urgency is a sales tool. Time to check is your best protection.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Follow the money',
      body: [
        'The club looked like an investment, but every dollar paid out came from someone newer. When new money stopped, it collapsed.',
        'Ask where returns come from, distrust guarantees, and check registration before handing over savings.',
      ],
      keyIdea: 'If you cannot see how the money is earned, it probably is not.',
      change: {},
    },
  ],
};

export default lesson;
