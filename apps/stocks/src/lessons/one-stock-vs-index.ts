import type { StockLesson } from './index';

const lesson: StockLesson = {
  slug: 'one-stock-vs-index',
  chapter: 'Managing risk',
  title: 'One stock vs the whole index',
  summary:
    'Compare betting everything on one company with owning a slice of hundreds, then watch one company fail.',
  minutes: 8,
  level: 'beginner',
  youWillLearn: [
    { text: 'What a stock market index is', stepId: 'an-index' },
    { text: 'Why one company can fail completely', stepId: 'collapse' },
    { text: 'How an index fund spreads that risk', stepId: 'own-the-index' },
    { text: 'What diversification gives up', stepId: 'trade-off' },
  ],
  initial: {
    market: 'stock',
    symbol: 'KTL',
    company: 'Kettle Labs',
    timeframe: 'Daily',
    seed: 505,
    start: 48,
    bars: 80,
    reveal: 60,
    volatility: 1.6,
    trend: 0.06,
    others: [{ symbol: 'GLX', seed: 506, start: 100, volatility: 0.7, trend: 0.04 }],
    spread: 2,
    account: { cash: 10_000, marginPct: 100, maintenancePct: 25, commission: 5 },
  },
  steps: [
    {
      id: 'an-index',
      short: 'Index',
      tag: 'IDEA',
      title: 'An index is a basket of companies',
      body: [
        '<b>GLX</b>, the Global Leaders index, tracks 500 large companies at once. An <b>index fund</b> lets you buy all of them in one purchase.',
        'Both lines start at 0% so you can compare. The single stock swings more; the index moves more gently.',
      ],
      keyIdea: 'An index averages many companies, so single surprises matter less.',
      change: { compare: true },
    },
    {
      id: 'all-in',
      short: 'All in',
      tag: 'PROBLEM',
      title: 'Everything in one company',
      body: [
        'You like Kettle Labs, so you put almost all your money into it: <b>190 shares</b>, about $9,500.',
        'If Kettle Labs does well, you do well. If it does badly, there is nothing else to soften the blow.',
      ],
      keyIdea: 'One company means one set of risks you cannot spread.',
      change: { position: { side: 'buy', size: 190, openBar: 59 } },
    },
    {
      id: 'collapse',
      short: 'Collapse',
      tag: 'TRY IT',
      title: 'The company collapses',
      body: [
        'Press <b>Company collapses</b>. An investigation finds the accounts were false. The shares lose almost 90% in a week.',
        'Your $9,500 holding shrinks to about $1,100. The index, where Kettle Labs was one company of 500, barely moves.',
      ],
      keyIdea: 'Companies can and do fail. A single stock can go to nearly zero.',
      change: {},
      breakActions: ['companyCollapse'],
    },
    {
      id: 'own-the-index',
      short: 'Index fund',
      tag: 'SOLUTION',
      title: 'Own the whole index instead',
      body: [
        'Rewind. This time the same money buys <b>93 units of a GLX index fund</b>.',
        'Kettle Labs is still in there, but only as one small part of 500.',
      ],
      keyIdea: 'Diversification: own many companies so no single one can sink you.',
      change: { position: { side: 'buy', size: 93, openBar: 59, symbol: 'GLX' } },
    },
    {
      id: 'collapse-again',
      short: 'Again',
      tag: 'TRY IT',
      title: 'Same collapse, different result',
      body: [
        'Press <b>Company collapses</b> again. Kettle Labs still falls almost 90%, but your index holding dips less than 1%.',
        'Then try <b>Market sell-off</b>. Diversification does not stop the whole market falling: the index drops about 11%, less than the 19% of a single stock.',
      ],
      keyIdea:
        'An index protects you from one company. It cannot protect you from the whole market.',
      change: {},
      breakActions: ['companyCollapse', 'marketSelloff'],
    },
    {
      id: 'trade-off',
      short: 'Give up',
      tag: 'TRADE-OFF',
      title: 'You also give up the jackpot',
      body: [
        'If Kettle Labs had tripled, the index would have barely noticed that either. Owning everything means you get the average.',
        'Over long periods, the average has beaten most people who try to pick winners, partly because picking costs time and fees.',
      ],
      keyIdea: 'Diversification trades the chance of a big win for protection from a big loss.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Do not bet the account on one name',
      body: [
        'A single stock can lose almost everything. An index spreads the same money across hundreds of companies, so one failure becomes a small dip.',
        'Next: borrowing to buy more, and betting on prices falling.',
      ],
      keyIdea: 'Own the haystack, not the needle.',
      change: {},
    },
  ],
};

export default lesson;
