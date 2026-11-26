import type { StockLesson } from './index';

const lesson: StockLesson = {
  slug: 'margin-and-shorting',
  chapter: 'Managing risk',
  title: 'Margin and short selling',
  summary:
    'Borrowing to buy more, and borrowing shares to bet on a fall, and how both can end in a forced sale.',
  minutes: 9,
  level: 'advanced',
  youWillLearn: [
    { text: 'What buying on margin means', stepId: 'margin' },
    { text: 'How borrowing doubles a fall', stepId: 'margin-sell-off' },
    { text: 'How short selling works', stepId: 'short' },
    { text: 'Why a short squeeze can force you out', stepId: 'squeeze' },
  ],
  initial: {
    market: 'stock',
    symbol: 'KTL',
    company: 'Kettle Labs',
    timeframe: 'Daily',
    seed: 606,
    start: 48,
    bars: 60,
    reveal: 40,
    volatility: 1.3,
    trend: 0.05,
    spread: 2,
    account: { cash: 10_000, marginPct: 100, maintenancePct: 25, commission: 5 },
  },
  steps: [
    {
      id: 'margin',
      short: 'Margin',
      tag: 'IDEA',
      title: 'Borrow to buy more',
      body: [
        'A <b>margin account</b> lets you borrow from the broker. In this example you must pay at least 50% yourself, so $10,000 can buy about $20,000 of shares.',
        'Buy <b>380 shares</b>, about $19,900. The Cash tile goes negative: that is the loan, and it costs interest in real life.',
      ],
      keyIdea: 'Margin is a loan secured by your shares.',
      change: { marginPct: 50, position: { side: 'buy', size: 380, openBar: 39 } },
    },
    {
      id: 'margin-sell-off',
      short: 'Sell-off',
      tag: 'TRY IT',
      title: 'A fall, twice as painful',
      body: [
        'Press <b>Market sell-off</b>. The shares fall about 20%.',
        'Because you hold twice as many shares as your own money could buy, you lose about <b>40% of your own money</b>. The loan still has to be repaid in full.',
      ],
      keyIdea: 'Borrowing multiplies losses as much as gains.',
      change: {},
      breakActions: ['marketSelloff'],
    },
    {
      id: 'short',
      short: 'Short',
      tag: 'IDEA',
      title: 'Short selling: betting on a fall',
      body: [
        'To <b>short</b> a share, you borrow it from the broker, sell it now, and hope to buy it back cheaper later and return it.',
        'Short 100 shares. If the price falls, you profit; if it rises, you lose.',
      ],
      keyIdea: 'A short sells first and buys back later.',
      change: { position: { side: 'sell', size: 100, openBar: 39 } },
    },
    {
      id: 'no-ceiling',
      short: 'No ceiling',
      tag: 'PROBLEM',
      title: 'A short has no ceiling on losses',
      body: [
        'A share you own can at worst fall to zero. A share you are short can keep rising, and you must buy it back at whatever the price is.',
        'Now short <b>200 shares</b>, about $10,500 worth, with the same $10,000 account.',
      ],
      keyIdea: 'Owning risks 100%. Shorting risks more than 100%.',
      change: { position: { side: 'sell', size: 200, openBar: 39 } },
    },
    {
      id: 'squeeze',
      short: 'Squeeze',
      tag: 'TRY IT',
      title: 'The short squeeze',
      body: [
        'Press <b>Short squeeze</b>. Good news lifts the price, short sellers rush to buy back at the same time, and their buying pushes it higher still.',
        'After a rise of about 55% your equity falls below the broker’s 25% minimum, and the position is bought back for you: a loss of about <b>$5,900</b>, well over half the account.',
      ],
      keyIdea: 'Forced buying feeds on itself. That is the squeeze.',
      change: {},
      breakActions: ['shortSqueeze'],
    },
    {
      id: 'most-never-need',
      short: 'Do you?',
      tag: 'TRADE-OFF',
      title: 'Most investors never need either',
      body: [
        'Margin and shorting are tools for specialists who watch positions daily and can absorb sudden losses.',
        'Long-term investors usually buy with their own money and hold. The rules shown here are an example; real limits differ between countries and brokers.',
      ],
      keyIdea: 'If you would not survive a forced sale, do not use borrowed money.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Borrowed money, borrowed time',
      body: [
        'Margin doubles exposure and doubles losses. Shorting bets on a fall and has no limit to how much it can lose. Both can end in a forced sale at the worst moment.',
        'Without leverage, time is on a long-term investor’s side. With it, time can run out.',
      ],
      keyIdea: 'Leverage turns a bad week into a permanent loss.',
      change: {},
    },
  ],
};

export default lesson;
