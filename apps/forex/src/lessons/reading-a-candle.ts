import type { ChartLesson } from './index';

const lesson: ChartLesson = {
  slug: 'reading-a-candle',
  chapter: 'Reading the market',
  title: 'Reading a candlestick',
  summary: 'What each candle on a price chart tells you, and why a line chart hides most of it.',
  minutes: 6,
  level: 'beginner',
  youWillLearn: [
    { text: 'What the four prices of a candle are', stepId: 'body' },
    { text: 'What a long wick says about buyers and sellers', stepId: 'wicks' },
    { text: 'How news can stretch a single candle', stepId: 'news' },
    { text: 'Why a moving average smooths the noise', stepId: 'zoom-out' },
  ],
  initial: {
    market: 'fx',
    symbol: 'EUR/USD',
    timeframe: '1H',
    pip: 0.0001,
    seed: 11,
    start: 1.085,
    bars: 72,
    reveal: 36,
    volatility: 5,
    trend: 0.4,
    shocks: [
      { bar: 32, move: 6 },
      { bar: 33, move: 3, wick: -30 },
    ],
    style: 'line',
    spread: 1,
    account: { balance: 10_000, leverage: 30 },
  },
  steps: [
    {
      id: 'line',
      short: 'Line',
      tag: 'PROBLEM',
      title: 'A line only shows where each hour ended',
      body: [
        'This is the euro priced in US dollars, <b>EUR/USD</b>, over 36 hours. Each point is where the price closed at the end of an hour.',
        'It looks calm. But a lot can happen inside an hour, and the line throws all of it away.',
      ],
      keyIdea: 'A line chart joins closing prices. Everything between them is invisible.',
      change: {},
    },
    {
      id: 'candles',
      short: 'Candles',
      tag: 'SOLUTION',
      title: 'One candle per hour',
      body: [
        'A <b>candlestick</b> draws four prices for each hour: where it opened, the highest and lowest it reached, and where it closed.',
        'Same data, same 36 hours. Now you can see how restless each hour was.',
      ],
      keyIdea: 'Each candle summarises one period with four numbers: open, high, low, close.',
      change: { style: 'candles' },
    },
    {
      id: 'body',
      short: 'Body',
      tag: 'IDEA',
      title: 'The body: from open to close',
      body: [
        'The thick part is the <b>body</b>. It runs from the open price to the close price.',
        'A <b>hollow</b> teal body means the hour closed higher than it opened. A <b>filled</b> red body means it closed lower. The highlighted hour rose about 6 pips.',
      ],
      keyIdea: 'Hollow = closed higher. Filled = closed lower. Shape tells you, not only colour.',
      change: {
        highlight: 32,
        add: { notes: [{ id: 'body', bar: 32, text: 'open → close', at: 'high' }] },
      },
    },
    {
      id: 'wicks',
      short: 'Wicks',
      tag: 'IDEA',
      title: 'Wicks: how far price travelled',
      body: [
        'The thin lines are <b>wicks</b>. They reach the highest and lowest prices of the hour.',
        'In the next hour, sellers pushed the price about 30 pips down. Buyers pushed it all the way back before the close. That long lower wick is a record of a fight the line chart never showed.',
      ],
      keyIdea: 'A long wick means price went far and then got rejected.',
      change: {
        highlight: 33,
        remove: { notes: ['body'] },
        add: { notes: [{ id: 'wick', bar: 33, text: 'long lower wick', at: 'low' }] },
      },
    },
    {
      id: 'news',
      short: 'News',
      tag: 'TRY IT',
      title: 'A surprise announcement',
      body: [
        'Press <b>News spike</b>. A central bank surprises the market and new candles start to print.',
        'Watch the first one: about 70 pips from top to bottom in a single hour. Prices like that are when traders get hurt.',
      ],
      keyIdea: 'News can move more in one candle than a quiet day moves in total.',
      change: { highlight: null, remove: { notes: ['wick'] } },
      breakActions: ['newsSpike'],
    },
    {
      id: 'zoom-out',
      short: 'Average',
      tag: 'IDEA',
      title: 'Step back and smooth it out',
      body: [
        'Show 72 hours and add a <b>20-hour moving average</b>: the average close of the last 20 candles, redrawn each hour.',
        'The average ignores single wild candles and shows the general direction. Here it has been drifting gently upward.',
      ],
      keyIdea: 'Candles show the detail. A moving average shows the trend.',
      change: { reveal: 72, add: { indicators: [{ id: 'sma20', kind: 'sma', period: 20 }] } },
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Four prices per candle',
      body: [
        'Every candle is open, high, low and close. The body shows the direction, and the wicks show how far price was pushed and rejected.',
        'Next: what a move of a few pips actually costs you.',
      ],
      keyIdea: 'Read the body for direction and the wicks for the fight behind it.',
      change: {},
    },
  ],
};

export default lesson;
