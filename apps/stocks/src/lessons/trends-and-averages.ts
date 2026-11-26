import type { StockLesson } from './index';

/** A slow decline for most of the year, then a steady recovery. */
const down = Array.from({ length: 20 }, (_, i) => ({ bar: 5 + i * 5, move: -2.6 }));
const up = Array.from({ length: 24 }, (_, i) => ({ bar: 132 + i * 5, move: 2.4 }));

const lesson: StockLesson = {
  slug: 'trends-and-averages',
  chapter: 'Reading the chart',
  title: 'Trends and moving averages',
  summary:
    'Zoom out to a year of prices and use two moving averages to see the direction under the noise.',
  minutes: 7,
  level: 'beginner',
  youWillLearn: [
    { text: 'What a 50-day moving average shows', stepId: 'fifty-day' },
    { text: 'What a 200-day moving average shows', stepId: 'two-hundred-day' },
    { text: 'How traders read price against the averages', stepId: 'reading-the-trend' },
    { text: 'Why averages always lag', stepId: 'lag' },
  ],
  initial: {
    market: 'stock',
    symbol: 'KTL',
    company: 'Kettle Labs',
    timeframe: 'Daily',
    seed: 303,
    start: 52,
    bars: 262,
    reveal: 150,
    volatility: 1.1,
    shocks: [...down, ...up],
    style: 'line',
    spread: 2,
    account: { cash: 10_000, marginPct: 100, maintenancePct: 25, commission: 5 },
  },
  steps: [
    {
      id: 'zoom-out',
      short: 'Zoom out',
      tag: 'PROBLEM',
      title: 'Thirty weeks of ups and downs',
      body: [
        'Here are 150 trading days of Kettle Labs as a line. It slid from about $52 to $35, but it zigzags so much day to day that it is hard to see when the fall slowed.',
        'A <b>moving average</b> helps: each day, take the average closing price of the last N days and plot it.',
      ],
      keyIdea: 'Daily prices are noisy. Averages trade detail for direction.',
      change: {},
    },
    {
      id: 'fifty-day',
      short: '50-day',
      tag: 'IDEA',
      title: 'The 50-day average',
      body: [
        'The <b>50-day moving average</b> covers about ten weeks. It sloped down for months, then flattened and began turning up.',
        'When price stays above a rising 50-day average, many traders call that an uptrend.',
      ],
      keyIdea: 'A 50-day average shows the trend of the last couple of months.',
      change: { add: { indicators: [{ id: 'sma50', kind: 'sma', period: 50 }] } },
    },
    {
      id: 'two-hundred-day',
      short: '200-day',
      tag: 'IDEA',
      title: 'The 200-day average',
      body: [
        'Show a full trading year and add the <b>200-day average</b>, roughly ten months. It moves slowly and is widely watched as the long-term trend.',
        'It only appears once there are 200 days to average.',
      ],
      keyIdea: 'The 200-day average is the slow, long-term line.',
      change: { reveal: 262, add: { indicators: [{ id: 'sma200', kind: 'sma', period: 200 }] } },
    },
    {
      id: 'reading-the-trend',
      short: 'Read it',
      tag: 'IDEA',
      title: 'Price, fast line, slow line',
      body: [
        'Now the price is above both averages, and the 50-day has climbed above the 200-day. Traders call that crossing a <b>golden cross</b>; the opposite is a <b>death cross</b>.',
        'These names describe what already happened. They are not promises about tomorrow.',
      ],
      keyIdea:
        'Price above both averages, with the fast one above the slow one, is the usual picture of an uptrend.',
      change: { style: 'candles' },
    },
    {
      id: 'sell-off',
      short: 'Sell-off',
      tag: 'TRY IT',
      title: 'A sudden fall through the lines',
      body: [
        'Press <b>Market sell-off</b>. In two weeks the price drops through the 50-day average while the 200-day barely moves.',
        'The slow line keeps saying "uptrend" for a while after the market has turned.',
      ],
      keyIdea: 'Fast moves outrun slow averages.',
      change: {},
      breakActions: ['marketSelloff'],
    },
    {
      id: 'lag',
      short: 'Lag',
      tag: 'TRADE-OFF',
      title: 'Smooth means late',
      body: [
        'A longer average ignores more noise, but it also turns later. A shorter one reacts quickly, but gives more false signals.',
        'No setting is right for every market. Averages describe the trend; they do not predict it.',
      ],
      keyIdea: 'Every average trades smoothness for delay.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'See the direction, respect the lag',
      body: [
        'The 50-day average shows the recent trend and the 200-day the long one. Price above both, fast above slow, is the textbook uptrend.',
        'Next: what happens when a company reports its results.',
      ],
      keyIdea: 'Averages are a summary of the past, not a forecast.',
      change: {},
    },
  ],
};

export default lesson;
