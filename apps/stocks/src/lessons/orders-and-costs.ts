import type { StockLesson } from './index';

const lesson: StockLesson = {
  slug: 'orders-and-costs',
  chapter: 'Shares and prices',
  title: 'What a trade really costs',
  summary:
    'The bid, the ask and the fee, why small companies cost more to trade, and why overnight news cannot be stopped.',
  minutes: 7,
  level: 'beginner',
  youWillLearn: [
    { text: 'What bid, ask and spread mean for shares', stepId: 'bid-ask' },
    { text: 'How fees and spread add up on every trade', stepId: 'fees' },
    { text: 'Why small companies are dearer to trade', stepId: 'small-caps' },
    { text: 'Why prices can jump overnight', stepId: 'overnight' },
  ],
  initial: {
    market: 'stock',
    symbol: 'KTL',
    company: 'Kettle Labs',
    timeframe: 'Daily',
    seed: 202,
    start: 48,
    bars: 60,
    reveal: 40,
    volatility: 1.2,
    spread: 2,
    account: { cash: 10_000, marginPct: 100, maintenancePct: 25, commission: 5 },
  },
  steps: [
    {
      id: 'bid-ask',
      short: 'Bid/ask',
      tag: 'IDEA',
      title: 'Two prices for every share',
      body: [
        'The <b>ask</b> is the lowest price anyone will sell to you at. The <b>bid</b> is the highest anyone will pay you. You buy at the ask and sell at the bid.',
        'For a busy company like Kettle Labs the gap, the <b>spread</b>, is only 2 cents.',
      ],
      keyIdea: 'You always buy a little higher than you could sell.',
      change: { showSpread: true },
    },
    {
      id: 'fees',
      short: 'Fees',
      tag: 'IDEA',
      title: 'Every trade starts slightly behind',
      body: [
        'Buy 100 shares. The broker’s fee is $5, and selling straight back would lose the 2-cent spread on each share.',
        'So the trade starts about <b>$7</b> down: $5 fee plus $2 of spread. Selling later costs another $5 fee.',
      ],
      keyIdea: 'Fee + spread is the toll you pay on every round trip.',
      change: { position: { side: 'buy', size: 100, openBar: 39 } },
    },
    {
      id: 'small-caps',
      short: 'Small caps',
      tag: 'PROBLEM',
      title: 'Small companies cost more to trade',
      body: [
        'Shares of small, rarely traded companies can have spreads of 20 or 30 cents, because few people are buying and selling.',
        'With a 30-cent spread, the same 100 shares start about <b>$35</b> behind instead of $7: $30 of spread plus the fee.',
      ],
      keyIdea: 'The fewer people trade a share, the wider its spread.',
      change: { spread: 30 },
    },
    {
      id: 'overnight',
      short: 'Overnight',
      tag: 'TRY IT',
      title: 'News arrives while the market is closed',
      body: [
        'Back to a normal spread. Companies usually announce results after the market closes.',
        'Press <b>Earnings surprise</b>. Results disappoint, and the next morning the shares open about 20% lower. Nobody could sell at the prices in between, because there were none. Your 100 shares lose about <b>$1,050</b> overnight.',
      ],
      keyIdea: 'Shares can open far from yesterday’s close. There is no trading in the gap.',
      change: { spread: 2 },
      breakActions: ['earningsGap'],
    },
    {
      id: 'trading-often',
      short: 'Costs',
      tag: 'TRADE-OFF',
      title: 'Trading often adds up',
      body: [
        'Buying and selling 100 shares every week costs about $12 a round trip in fees and spread: over <b>$600 a year</b>, before any gain or loss.',
        'Fewer, larger, longer-held positions keep more of the return in your account.',
      ],
      keyIdea: 'Every round trip has a cost. Make each one count.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Know the toll before you trade',
      body: [
        'You buy at the ask, sell at the bid, and pay a fee both ways. Thinly traded shares cost more, and overnight news can move a price with no chance to react.',
        'Next: reading where a share has been heading.',
      ],
      keyIdea: 'Costs are certain. Profits are not.',
      change: {},
    },
  ],
};

export default lesson;
