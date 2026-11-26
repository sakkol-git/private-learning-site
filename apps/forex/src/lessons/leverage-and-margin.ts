import type { ChartLesson } from './index';

const lesson: ChartLesson = {
  slug: 'leverage-and-margin',
  chapter: 'Managing risk',
  title: 'Leverage and margin calls',
  summary:
    'How a small deposit controls a large position, and how fast high leverage can empty an account.',
  minutes: 9,
  level: 'intermediate',
  youWillLearn: [
    { text: 'What leverage and margin are', stepId: 'leverage' },
    { text: 'How to read the margin level', stepId: 'margin-level' },
    { text: 'What a margin call does to an account', stepId: 'margin-call' },
    { text: 'How to size a trade from risk, not leverage', stepId: 'size-from-risk' },
  ],
  initial: {
    pair: 'EUR/USD',
    timeframe: '1H',
    pip: 0.0001,
    seed: 55,
    start: 1.085,
    bars: 60,
    reveal: 30,
    volatility: 3,
    spread: 1,
    account: { balance: 1000, leverage: 30 },
  },
  steps: [
    {
      id: 'leverage',
      short: 'Leverage',
      tag: 'IDEA',
      title: 'A small deposit, a large position',
      body: [
        'You have <b>$1,000</b>. Buying 0.1 lots of EUR/USD means controlling about $10,850 of currency.',
        'With <b>30:1 leverage</b>, the broker only locks up 1/30 of that as <b>margin</b>: about $360. The rest is effectively borrowed.',
      ],
      keyIdea: 'Leverage lets a small deposit control a much larger position.',
      change: { position: { side: 'buy', lots: 0.1, openBar: 29 } },
    },
    {
      id: 'margin-level',
      short: 'Margin %',
      tag: 'IDEA',
      title: 'Margin level: your safety gauge',
      body: [
        '<b>Margin level</b> is your equity divided by the margin in use. Here it is about 275%.',
        'If it falls to <b>50%</b>, the broker closes your positions automatically. That is a <b>margin call</b>, or stop-out.',
      ],
      keyIdea: 'The lower the margin level, the closer you are to a forced exit.',
      change: { reveal: 34 },
    },
    {
      id: 'max-leverage',
      short: '500:1',
      tag: 'PROBLEM',
      title: 'Some brokers offer 500:1',
      body: [
        'At <b>500:1</b>, the same $1,000 can open 4 lots: over $430,000 of currency for about $870 of margin.',
        'Each pip is now worth <b>$40</b>. The margin level starts barely above 100%.',
      ],
      keyIdea: 'More leverage does not add money. It removes the room for being wrong.',
      change: { leverage: 500, position: { side: 'buy', lots: 4, openBar: 33 } },
    },
    {
      id: 'margin-call',
      short: 'Margin call',
      tag: 'TRY IT',
      title: 'A normal move, a wiped account',
      body: [
        'Press <b>Price moves against you</b>. A move of about a dozen pips is ordinary on EUR/USD.',
        'Margin level drops to 50% within a couple of hours and the broker closes the trade. About <b>$566</b> of the $1,000 is gone, and no stop-loss was ever reached.',
      ],
      keyIdea: 'With high leverage, ordinary noise is enough to trigger a margin call.',
      change: {},
      breakActions: ['priceMovesAgainst'],
    },
    {
      id: 'size-from-risk',
      short: 'Size right',
      tag: 'SOLUTION',
      title: 'Size the trade from the risk',
      body: [
        'Decide the loss you accept first: <b>1% of $1,000 = $10</b>. Place the stop 20 pips away. $10 ÷ 20 pips = $0.50 a pip, which is <b>0.05 lots</b>.',
        'Leverage no longer matters much: the stop, not the broker, decides the worst case.',
      ],
      keyIdea: 'Risk per trade ÷ stop distance = position size.',
      change: { leverage: 30, position: { side: 'buy', lots: 0.05, openBar: 33, stopPips: 20 } },
    },
    {
      id: 'same-move',
      short: 'Retest',
      tag: 'TRY IT',
      title: 'The same move, a small loss',
      body: [
        'Press <b>Price moves against you</b> again. The stop is reached and the trade closes about <b>$10</b> down.',
        'You can be wrong many times in a row and still be trading next week.',
      ],
      keyIdea: 'Survival comes from small, planned losses.',
      change: {},
      breakActions: ['priceMovesAgainst'],
    },
    {
      id: 'most-lose',
      short: 'The odds',
      tag: 'TRADE-OFF',
      title: 'Why most retail traders lose',
      body: [
        'In many countries, brokers must publish the share of their retail clients who lose money on leveraged trading. It is usually well over half.',
        'Costs, high leverage and trading too often are the common causes. Simulated practice, small size and a written plan are the usual defences.',
      ],
      keyIdea:
        'The default outcome of leveraged trading is a loss. Plan as if you are the default.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Leverage is a tool with no safety catch',
      body: [
        'Leverage lets a little money control a lot. Margin level shows how close you are to a forced exit, and high leverage turns small moves into margin calls.',
        'Size every trade from the loss you accept, and let the stop, not the broker, end bad trades.',
      ],
      keyIdea: 'Pick the dollar risk first. Size and stop follow from it.',
      change: {},
    },
  ],
};

export default lesson;
