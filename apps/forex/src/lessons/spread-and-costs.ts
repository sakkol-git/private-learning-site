import type { ChartLesson } from './index';

const lesson: ChartLesson = {
  slug: 'spread-and-costs',
  chapter: 'Reading the market',
  title: 'Spread and slippage',
  summary: 'Why every trade starts at a loss, and how thin markets and gaps make costs jump.',
  minutes: 7,
  level: 'beginner',
  youWillLearn: [
    { text: 'What bid, ask and spread mean', stepId: 'two-prices' },
    { text: 'Why every trade starts slightly negative', stepId: 'start-behind' },
    { text: 'How a spread spike can hit a tight stop', stepId: 'tight-stop' },
    { text: 'What slippage on a gap costs', stepId: 'gap' },
  ],
  initial: {
    market: 'fx',
    symbol: 'EUR/USD',
    timeframe: '1H',
    pip: 0.0001,
    seed: 33,
    start: 1.085,
    bars: 60,
    reveal: 40,
    volatility: 4,
    spread: 1.2,
    account: { balance: 10_000, leverage: 30 },
  },
  steps: [
    {
      id: 'two-prices',
      short: 'Bid/ask',
      tag: 'IDEA',
      title: 'There are always two prices',
      body: [
        'Your broker quotes a <b>bid</b>, the price you can sell at, and an <b>ask</b>, the price you can buy at. The ask is always a little higher.',
        'The gap between them is the <b>spread</b>: here 1.2 pips. It is how the broker gets paid.',
      ],
      keyIdea: 'You buy at the ask and sell at the bid. The spread sits in between.',
      change: { showSpread: true },
    },
    {
      id: 'start-behind',
      short: 'Behind',
      tag: 'IDEA',
      title: 'Every trade starts in the red',
      body: [
        'Buy 1 lot. You pay the ask, but if you closed right away you would sell at the bid.',
        'So the trade opens at <b>−$12</b>: 1.2 pips × $10. Price has to rise 1.2 pips just to break even.',
      ],
      keyIdea: 'The spread is a cost you pay on every trade, win or lose.',
      change: { position: { side: 'buy', size: 1, openBar: 39 } },
    },
    {
      id: 'thin-market',
      short: 'Thin',
      tag: 'PROBLEM',
      title: 'Late at night, spreads widen',
      body: [
        'When big banks close for the day, fewer people are quoting prices. Spreads widen, here to 3 pips.',
        'The same trade opened now starts <b>−$30</b> behind.',
      ],
      keyIdea: 'Spreads are not fixed. They are widest when markets are quiet or nervous.',
      change: { spread: 3 },
    },
    {
      id: 'tight-stop',
      short: 'Spike',
      tag: 'TRY IT',
      title: 'A tight stop meets a wide spread',
      body: [
        'Back to normal hours, with a stop-loss only <b>5 pips</b> below entry.',
        'Press <b>Spread widens</b>. Price barely moves, but the spread jumps to 12 pips for a few hours. The bid falls through your stop and the trade closes about <b>$66</b> down.',
      ],
      keyIdea: 'A stop can be hit by the spread alone. Very tight stops are fragile.',
      change: { spread: 1.2, position: { side: 'buy', size: 1, openBar: 39, stop: 5 } },
      breakActions: ['spreadWidens'],
    },
    {
      id: 'gap',
      short: 'Gap',
      tag: 'TRY IT',
      title: 'Slippage: the stop is not a promise',
      body: [
        'Give the trade a 20-pip stop, so the planned loss is $200. Then press <b>Weekend gap</b>.',
        'The market is closed over the weekend. On Monday it opens 60 pips lower. There was no price at your stop to sell at, so you are filled at the open, for a loss of about <b>$600</b>.',
      ],
      keyIdea: 'A stop becomes a market order. In a gap it fills at the next available price.',
      change: { position: { side: 'buy', size: 1, openBar: 39, stop: 20 } },
      breakActions: ['weekendGap'],
    },
    {
      id: 'costs-add-up',
      short: 'Costs',
      tag: 'TRADE-OFF',
      title: 'Small costs, many trades',
      body: [
        'Ten 1-lot trades a day at 1.2 pips each is $120 a day in spread. Over a month of trading days, that is about <b>$2,400</b>, before a single winning or losing move.',
        'Trading less often, at normal hours, keeps more of your account.',
      ],
      keyIdea: 'Frequent trading turns small costs into a big one.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'You pay to play',
      body: [
        'Every trade crosses the spread. Spreads widen when markets are thin or nervous, and gaps can fill a stop far from where you placed it.',
        'Next: planning exits so a bad trade stays small.',
      ],
      keyIdea: 'Count the costs before counting the profits.',
      change: {},
    },
  ],
};

export default lesson;
