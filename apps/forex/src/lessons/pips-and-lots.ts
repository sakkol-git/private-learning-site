import type { ChartLesson } from './index';

const lesson: ChartLesson = {
  slug: 'pips-and-lots',
  chapter: 'Reading the market',
  title: 'Pips, lots and what a move costs',
  summary:
    'How a tiny price change turns into dollars, and why trade size matters more than direction.',
  minutes: 7,
  level: 'beginner',
  youWillLearn: [
    { text: 'What a pip is', stepId: 'a-pip' },
    { text: 'How lot size sets the value of each pip', stepId: 'lots' },
    { text: 'Why bigger size means bigger swings both ways', stepId: 'ten-times' },
    { text: 'How fast a move against you adds up', stepId: 'against-you' },
  ],
  initial: {
    pair: 'EUR/USD',
    timeframe: '1H',
    pip: 0.0001,
    seed: 21,
    start: 1.085,
    bars: 80,
    reveal: 30,
    volatility: 4,
    trend: 1.1,
    spread: 1,
    account: { balance: 10_000, leverage: 30 },
  },
  steps: [
    {
      id: 'a-pip',
      short: 'Pip',
      tag: 'IDEA',
      title: 'A pip is the fourth decimal',
      body: [
        'EUR/USD is quoted to five decimals, like <code>1.08500</code>. A move in the fourth decimal, from <code>1.0850</code> to <code>1.0851</code>, is one <b>pip</b>.',
        'Forex prices are measured in pips because the moves are small. A busy hour might move 10 to 20 pips.',
      ],
      keyIdea: 'One pip on EUR/USD is 0.0001.',
      change: { highlight: 29 },
    },
    {
      id: 'lots',
      short: 'Lots',
      tag: 'IDEA',
      title: 'Lot size sets what a pip is worth',
      body: [
        'Trades are sized in <b>lots</b>. One standard lot is 100,000 euros. A mini lot, 0.1, is 10,000.',
        'You buy <b>0.1 lots</b>. Now every pip the price moves is worth <b>$1</b> to you, up or down.',
      ],
      keyIdea: 'On EUR/USD: 1 lot ≈ $10 per pip, 0.1 lot ≈ $1 per pip.',
      change: { highlight: null, position: { side: 'buy', lots: 0.1, openBar: 29 } },
    },
    {
      id: 'it-moves',
      short: 'It moves',
      tag: 'IDEA',
      title: 'Twenty hours later',
      body: [
        'The price drifts up about 27 pips. The <b>Open P&amp;L</b> tile shows what the trade is worth if you closed it now: about <b>+$26</b>.',
        'Pips gained times $1 per pip: that is the whole calculation.',
      ],
      keyIdea: 'Profit = pips moved × value per pip.',
      change: { reveal: 50 },
    },
    {
      id: 'ten-times',
      short: '10× size',
      tag: 'TRADE-OFF',
      title: 'Ten times the size, ten times the swing',
      body: [
        'Same entry, same chart, but <b>1 full lot</b> instead of 0.1. Each pip is now worth $10, and the same move shows <b>+$258</b>.',
        'The profit tile is ten times bigger. So is every loss. The market did not change; only your exposure did.',
      ],
      keyIdea: 'Size multiplies results in both directions.',
      change: { position: { side: 'buy', lots: 1, openBar: 29 } },
    },
    {
      id: 'against-you',
      short: 'Against',
      tag: 'TRY IT',
      title: 'Now let it go the other way',
      body: [
        'Press <b>Price moves against you</b>. Over the next 14 hours the price falls about 90 pips.',
        'At $10 a pip, almost <b>$1,000</b> swings out of equity. The $258 gain becomes a loss of about $710, with no stop to cap it.',
      ],
      keyIdea: 'Without a planned exit, size alone decides how much you can lose.',
      change: {},
      breakActions: ['priceMovesAgainst'],
    },
    {
      id: 'size-decides',
      short: 'Size',
      tag: 'TRADE-OFF',
      title: 'Choose size before direction',
      body: [
        'Beginners spend their energy on "up or down?". The number that decides how much they win or lose is the lot size.',
        'Professional traders pick size first: how many dollars can this trade cost me if I am wrong?',
      ],
      keyIdea: 'Your position size is your real risk decision.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Pips × size = dollars',
      body: [
        'A pip is the fourth decimal. Lot size turns pips into dollars. Ten times the size is ten times the swing.',
        'Next: the costs you pay before price moves at all.',
      ],
      keyIdea: 'Know what one pip is worth to you before you trade.',
      change: {},
    },
  ],
};

export default lesson;
