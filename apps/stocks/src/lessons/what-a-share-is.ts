import type { StockLesson } from './index';

const lesson: StockLesson = {
  slug: 'what-a-share-is',
  chapter: 'Shares and prices',
  title: 'What a share is',
  summary:
    'Owning a small slice of a company, what its price means, and how your holding moves with it.',
  minutes: 6,
  level: 'beginner',
  youWillLearn: [
    { text: 'What a share and market value are', stepId: 'a-slice' },
    { text: 'How to read a daily candle and volume', stepId: 'daily-candles' },
    { text: 'What your portfolio value is made of', stepId: 'buying' },
    { text: 'How a market-wide fall reaches your shares', stepId: 'sell-off' },
  ],
  initial: {
    market: 'stock',
    symbol: 'KTL',
    company: 'Kettle Labs',
    timeframe: 'Daily',
    seed: 101,
    start: 46,
    bars: 70,
    reveal: 40,
    volatility: 1.4,
    trend: 0.12,
    style: 'line',
    spread: 2,
    account: { cash: 10_000, marginPct: 100, maintenancePct: 25, commission: 5 },
  },
  steps: [
    {
      id: 'a-slice',
      short: 'A slice',
      tag: 'IDEA',
      title: 'A share is a slice of a company',
      body: [
        '<b>Kettle Labs</b> makes kitchen appliances. It is split into 200 million equal pieces called <b>shares</b>, and anyone can buy them on a stock exchange.',
        'At about $45 a share, the whole company is valued at roughly <b>$9 billion</b>. That figure is its market value, or market capitalisation.',
      ],
      keyIdea:
        'Share price × number of shares = what the market thinks the whole company is worth.',
      change: {},
    },
    {
      id: 'daily-candles',
      short: 'Daily',
      tag: 'IDEA',
      title: 'One candle per trading day',
      body: [
        'Each candle is one day: where trading opened, the high, the low and where it closed. Hollow candles closed higher, filled ones lower.',
        'The bars underneath show <b>volume</b>: how many shares changed hands. Big moves on big volume mean many people agreed.',
      ],
      keyIdea: 'Price shows where people traded. Volume shows how many of them did.',
      change: { style: 'candles', showVolume: true },
    },
    {
      id: 'buying',
      short: 'Buy',
      tag: 'SOLUTION',
      title: 'Buy 100 shares',
      body: [
        'You buy <b>100 shares</b> with part of your $10,000. Your broker charges a $5 fee, and you pay the slightly higher ask price.',
        'Your <b>portfolio value</b> is now the cash left plus what the shares would sell for. It starts a few dollars below $10,000: the fee and the spread.',
      ],
      keyIdea: 'Portfolio value = cash + shares × the price you could sell at.',
      change: { position: { side: 'buy', size: 100, openBar: 39 } },
    },
    {
      id: 'owning',
      short: 'Own it',
      tag: 'IDEA',
      title: 'Your money now moves with the company',
      body: [
        'Four weeks pass and the price edges up about $1.25. Each dollar the share price moves changes your holding by $100, so you are about <b>$118</b> ahead after costs.',
        'Nothing about your cash changed. Only the market’s opinion of Kettle Labs did.',
      ],
      keyIdea: 'Owning shares means your wealth rises and falls with the price, every day.',
      change: { reveal: 60 },
    },
    {
      id: 'sell-off',
      short: 'Sell-off',
      tag: 'TRY IT',
      title: 'When the whole market falls',
      body: [
        'Press <b>Market sell-off</b>. Worries about the economy spread and investors sell almost everything for two weeks.',
        'Kettle Labs did nothing wrong, but its shares fall about 20% anyway. Your portfolio value drops to about <b>$9,220</b>.',
      ],
      keyIdea: 'Even a good company falls when the whole market does.',
      change: {},
      breakActions: ['marketSelloff'],
    },
    {
      id: 'price-and-value',
      short: 'Price',
      tag: 'TRADE-OFF',
      title: 'Price and value are not the same',
      body: [
        'Day to day, prices move on news, fear and excitement. Over many years, they tend to follow how much profit a company makes.',
        'That is why people who buy shares usually plan to hold them for years, not days.',
      ],
      keyIdea: 'In the short run price follows mood. In the long run it follows profits.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'A slice of a business',
      body: [
        'A share is part ownership of a company. Its price times the number of shares is the company’s market value, and your holding moves with it every day.',
        'Next: what it really costs to buy and sell.',
      ],
      keyIdea: 'Buying a share is buying part of a business, with its ups and downs.',
      change: {},
    },
  ],
};

export default lesson;
