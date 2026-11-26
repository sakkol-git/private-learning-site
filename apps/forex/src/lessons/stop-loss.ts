import type { ChartLesson } from './index';

const dip = Array.from({ length: 8 }, (_, i) => ({ bar: 30 + i, move: -7 }));
const rally = Array.from({ length: 10 }, (_, i) => ({ bar: 50 + i, move: 9 }));

const lesson: ChartLesson = {
  slug: 'stop-loss',
  chapter: 'Managing risk',
  title: 'Stop-loss and take-profit',
  summary:
    'Decide where you are wrong and where you are right before you enter, and let the plan run.',
  minutes: 8,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Why a trade needs an exit before an entry', stepId: 'no-plan' },
    { text: 'How a stop-loss caps the loss in dollars', stepId: 'stop' },
    { text: 'What a risk-to-reward ratio is', stepId: 'target' },
    { text: 'Why you can win less than half the time and still profit', stepId: 'win-rate' },
  ],
  initial: {
    market: 'fx',
    symbol: 'EUR/USD',
    timeframe: '1H',
    pip: 0.0001,
    seed: 44,
    start: 1.085,
    bars: 90,
    reveal: 30,
    volatility: 3,
    shocks: [...dip, ...rally],
    spread: 1,
    account: { balance: 10_000, leverage: 30 },
  },
  steps: [
    {
      id: 'no-plan',
      short: 'No plan',
      tag: 'PROBLEM',
      title: 'Buy, and hope',
      body: [
        'You buy 1 lot because the chart "looks ready". There is no plan for when you are wrong.',
        'Price falls for eight hours straight. The loss grows past <b>$500</b>, and with no exit there is nothing to stop it growing further.',
      ],
      keyIdea: 'Hope is not an exit. Without one, the market decides how much you lose.',
      change: { position: { side: 'buy', size: 1, openBar: 29 }, reveal: 40 },
    },
    {
      id: 'stop',
      short: 'Stop',
      tag: 'SOLUTION',
      title: 'Decide where you are wrong',
      body: [
        'Start again at the bottom of that fall. Before buying, place a <b>stop-loss</b> 30 pips below the entry.',
        'If price reaches it, the trade closes automatically. 30 pips × $10 = <b>$300</b>: the most this trade should cost. The red zone shows that risk.',
      ],
      keyIdea: 'A stop-loss turns an open-ended loss into a number you chose in advance.',
      change: { position: { side: 'buy', size: 1, openBar: 39, stop: 30 } },
    },
    {
      id: 'target',
      short: 'Target',
      tag: 'SOLUTION',
      title: 'Decide where you are right',
      body: [
        'Add a <b>take-profit</b> 60 pips above the entry. If price gets there, the trade closes with $600.',
        'Risking $300 to make $600 is a <b>1:2 risk-to-reward</b> ratio. The teal zone shows the reward.',
      ],
      keyIdea: 'Plan the exit on both sides before you enter.',
      change: { position: { side: 'buy', size: 1, openBar: 39, stop: 30, target: 60 } },
    },
    {
      id: 'let-it-run',
      short: 'Wait',
      tag: 'IDEA',
      title: 'Let the plan work',
      body: [
        'Price wanders for ten hours, never reaching the stop. Then it rallies.',
        'The target is hit and the trade closes on its own: <b>+$600</b> added to the balance, with no decision made under pressure.',
      ],
      keyIdea: 'Exits placed in advance stop you from changing the plan mid-trade.',
      change: { reveal: 62 },
    },
    {
      id: 'gap',
      short: 'Gap',
      tag: 'TRY IT',
      title: 'When the stop slips',
      body: [
        'A new trade, same plan: 25-pip stop, 50-pip target. It is Friday evening.',
        'Press <b>Weekend gap</b>. Price opens far below the stop on Monday. The plan risked $250; the fill costs about <b>$590</b>. Stops limit risk, but they cannot guarantee the exact price.',
      ],
      keyIdea: 'Stops cap risk in normal markets. Gaps are why you size small anyway.',
      change: {
        reveal: 66,
        balance: 10_600,
        position: { side: 'buy', size: 1, openBar: 65, stop: 25, target: 50 },
      },
      breakActions: ['weekendGap'],
    },
    {
      id: 'win-rate',
      short: 'Win rate',
      tag: 'TRADE-OFF',
      title: 'You can be wrong more often than right',
      body: [
        'With a 1:2 ratio, win 4 trades out of 10: four wins of $600 is $2,400, six losses of $300 is $1,800. You end up <b>$600</b> ahead.',
        'The catch: small targets feel safer but need a very high win rate. Wide stops feel safer but cost more each time.',
      ],
      keyIdea: 'Profit depends on win rate and the size of wins versus losses, together.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Exit first, enter second',
      body: [
        'Every trade gets a stop-loss and a take-profit before it is placed. The stop sets the loss in dollars; the target sets the reward.',
        'Next: why leverage can wipe out an account before any stop is reached.',
      ],
      keyIdea: 'A trade without a stop is a bet without a limit.',
      change: {},
    },
  ],
};

export default lesson;
