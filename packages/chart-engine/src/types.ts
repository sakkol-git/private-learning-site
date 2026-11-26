export interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
  /** Relative volume, 0..1. */
  v: number;
  /** Spread in ticks during this bar, when it differs from the chart's usual spread. */
  spread?: number;
}

/**
 * A scripted move on top of the random walk, so lessons can rely on what happens.
 * Moves are in the market's move unit: pips for forex, percent for stocks.
 */
interface PriceShock {
  bar: number;
  /** Close-to-close move. */
  move: number;
  /** Extra wick: positive stretches the high, negative the low. */
  wick?: number;
}

/** How one price series is generated. */
export interface SeriesSpec {
  symbol: string;
  seed: number;
  start: number;
  /** Typical size of one bar, in move units. */
  volatility: number;
  /** Drift per bar, in move units. */
  trend?: number;
  shocks?: PriceShock[];
}

interface ChartBase extends SeriesSpec {
  /** Timeframe label, for example "1H" or "Daily". */
  timeframe: string;
  /** Bars generated for the whole lesson. */
  bars: number;
  /** Bars shown before the first step. */
  reveal: number;
  style?: 'candles' | 'line';
  /** Usual spread, in ticks (pips for forex, cents for stocks). */
  spread: number;
}

export interface FxInitial extends ChartBase {
  market: 'fx';
  /** Size of one pip, for example 0.0001. Profits are in the quote currency (USD). */
  pip: number;
  account: { balance: number; leverage: number };
}

interface StockAccount {
  cash: number;
  /** Share of a purchase you must pay yourself: 100 for a cash account, 50 for a typical margin account. */
  marginPct: number;
  /** Equity ÷ position value below which the broker closes the position. */
  maintenancePct: number;
  /** Fee per trade, charged when opening and again when closing. */
  commission: number;
}

export interface StockInitial extends ChartBase {
  market: 'stock';
  /** Company name shown next to the ticker. */
  company: string;
  /** More tickers (an index, other companies) generated alongside, for comparison. */
  others?: SeriesSpec[];
  account: StockAccount;
}

export type ChartInitial = FxInitial | StockInitial;

interface PriceLine {
  id: string;
  price: number;
  label: string;
}

export interface ChartNote {
  id: string;
  bar: number;
  text: string;
  at?: 'high' | 'low';
}

interface Indicator {
  id: string;
  kind: 'sma';
  period: number;
}

export interface Position {
  side: 'buy' | 'sell';
  /** Lots for forex (1 lot = 100,000 units), shares for stocks. */
  size: number;
  /** Opens at this bar's close, plus or minus half the spread. */
  openBar: number;
  /** Stop distance from entry, in move units (pips or percent). */
  stop?: number;
  /** Target distance from entry, in move units (pips or percent). */
  target?: number;
  /** Which series the trade is in; defaults to the main symbol. */
  symbol?: string;
}

/** A step is a diff from the previous step. */
export interface ChartChange {
  reveal?: number;
  style?: 'candles' | 'line';
  spread?: number;
  showSpread?: boolean;
  showVolume?: boolean;
  /** Plot every series as percent change from the first bar, to compare them fairly. */
  compare?: boolean;
  highlight?: number | null;
  /** Opens or replaces the position; null closes it. */
  position?: Position | null;
  /** Forex: change leverage. */
  leverage?: number;
  /** Forex: start a fresh balance (and drawdown baseline). */
  balance?: number;
  /** Stocks: start with this much cash (and a fresh baseline). */
  cash?: number;
  /** Stocks: switch between a cash account (100) and a margin account. */
  marginPct?: number;
  add?: { levels?: PriceLine[]; notes?: ChartNote[]; indicators?: Indicator[] };
  remove?: { levels?: string[]; notes?: string[]; indicators?: string[] };
}

export type AccountState =
  | { kind: 'fx'; balance: number; leverage: number; startBalance: number }
  | ({ kind: 'stock'; startValue: number } & StockAccount);

export interface ChartState {
  symbol: string;
  /** Company name shown in the title, when there is one. */
  company: string | null;
  timeframe: string;
  /** Smallest price step used for spreads and price labels. */
  tick: number;
  decimals: number;
  series: Candle[];
  others: { symbol: string; series: Candle[] }[];
  reveal: number;
  style: 'candles' | 'line';
  spread: number;
  showSpread: boolean;
  showVolume: boolean;
  compare: boolean;
  highlight: number | null;
  levels: PriceLine[];
  notes: ChartNote[];
  indicators: Indicator[];
  account: AccountState;
  position: Position | null;
}

export interface ForexMetrics {
  balance: number;
  equity: number;
  openPnl: number;
  /** Equity ÷ margin used, in percent; null with no open position. */
  marginLevelPct: number | null;
  /** Fall of equity below the starting balance, in percent. */
  drawdownPct: number;
}

export interface StockMetrics {
  /** Cash plus the market value of holdings, minus what is owed on shorts. */
  value: number;
  /** Negative when you have borrowed on margin. */
  cash: number;
  /** value − starting value. */
  pnl: number;
  returnPct: number;
  drawdownPct: number;
}
