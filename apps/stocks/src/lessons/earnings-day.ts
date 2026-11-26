import type { StockLesson } from './index';

const lesson: StockLesson = {
  slug: 'earnings-day',
  chapter: 'Reading the chart',
  title: 'Earnings day and position size',
  summary:
    'Companies report results a few times a year. Learn to size a position so a bad surprise stays survivable.',
  minutes: 7,
  level: 'intermediate',
  youWillLearn: [
    { text: 'Why results days move prices so much', stepId: 'results-due' },
    { text: 'How a stop-loss sets your risk in dollars', stepId: 'stop' },
    { text: 'How to size a position from that risk', stepId: 'size-from-risk' },
    { text: 'Why a gap can blow straight past a stop', stepId: 'surprise' },
  ],
  initial: {
    market: 'stock',
    symbol: 'KTL',
    company: 'Kettle Labs',
    timeframe: 'Daily',
    seed: 404,
    start: 47,
    bars: 60,
    reveal: 40,
    volatility: 1.2,
    trend: 0.1,
    spread: 2,
    account: { cash: 10_000, marginPct: 100, maintenancePct: 25, commission: 5 },
  },
  steps: [
    {
      id: 'results-due',
      short: 'Results',
      tag: 'PROBLEM',
      title: 'Results are due tonight',
      body: [
        'Four times a year, Kettle Labs reports its sales and profits. The next report comes out tonight, after the market closes.',
        'If the numbers beat or miss what investors expected, the price can jump 10–20% by the next morning.',
      ],
      keyIdea: 'Results days bundle months of news into one overnight move.',
      change: { add: { notes: [{ id: 'due', bar: 39, text: 'Results after close', at: 'high' }] } },
    },
    {
      id: 'stop',
      short: 'Stop',
      tag: 'SOLUTION',
      title: 'Plan the exit first',
      body: [
        'Buy 100 shares with a <b>stop-loss 8%</b> below the entry. If the price falls there, the shares are sold automatically.',
        'About $3.70 a share times 100 shares: the planned risk is roughly <b>$370</b>, plus fees.',
      ],
      keyIdea: 'A stop turns "how bad could it get?" into a number.',
      change: { position: { side: 'buy', size: 100, openBar: 39, stop: 8 } },
    },
    {
      id: 'size-from-risk',
      short: 'Size',
      tag: 'SOLUTION',
      title: 'Size the position from the risk',
      body: [
        'A common rule is to risk at most <b>1% of the account</b> on one idea: $100 here. With a $3.70 stop distance, that is 26 shares.',
        'Same company, same stop, a quarter of the size. The chart looks identical; the stakes do not.',
      ],
      keyIdea: 'Shares to buy = money you accept to lose ÷ stop distance per share.',
      change: { position: { side: 'buy', size: 26, openBar: 39, stop: 8 } },
    },
    {
      id: 'surprise',
      short: 'Surprise',
      tag: 'TRY IT',
      title: 'The results disappoint',
      body: [
        'Press <b>Earnings surprise</b>. The shares open about 20% lower. The stop was 8% away, but there was no trading in between, so it sells at the open.',
        'The planned $100 loss becomes about <b>$260</b>. With 100 shares it would have been nearly $1,000.',
      ],
      keyIdea: 'Gaps skip stops. Small size is what keeps a gap survivable.',
      change: {},
      breakActions: ['earningsGap'],
    },
    {
      id: 'through-results',
      short: 'Choices',
      tag: 'TRADE-OFF',
      title: 'Hold through results, or not?',
      body: [
        'Some investors trim positions before results to limit gap risk. Others hold for the long term and accept the jumps.',
        'Either way, decide before the report, not the morning after.',
      ],
      keyIdea: 'Known risky days deserve a deliberate decision.',
      change: {},
    },
    {
      id: 'recap',
      short: 'Recap',
      tag: 'RECAP',
      title: 'Size for the gap, not just the stop',
      body: [
        'A stop sets your planned loss, and position size sets how much a surprise can really cost. Results days are when the two differ most.',
        'Next: why owning one company is riskier than owning many.',
      ],
      keyIdea: 'Risk per trade decides the size. The gap decides the worst case.',
      change: {},
    },
  ],
};

export default lesson;
