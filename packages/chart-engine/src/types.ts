export interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
  /** Relative volume, 0..1. */
  v: number;
  /** Spread in pips during this bar, when it differs from the chart's usual spread. */
  spread?: number;
}

/** A scripted move on top of the random walk, so lessons can rely on what happens. */
export interface PriceShock {
  bar: number;
  /** Close-to-close move in pips. */
  pips: number;
  /** Extra wick in pips: positive stretches the high, negative the low. */
  wick?: number;
}

export interface ChartInitial {
  /** For example "EUR/USD". Profits are in the quote currency (USD). */
  pair: string;
  /** Timeframe label, for example "1H". */
  timeframe: string;
  pip: number;
  seed: number;
  start: number;
  /** Bars generated for the whole lesson. */
  bars: number;
  /** Bars shown before the first step. */
  reveal: number;
  /** Typical size of one bar in pips. */
  volatility: number;
  /** Drift in pips per bar. */
  trend?: number;
  shocks?: PriceShock[];
  style?: 'candles' | 'line';
  /** Spread in pips. */
  spread: number;
  account: { balance: number; leverage: number };
}

export interface PriceLine {
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

export interface Indicator {
  id: string;
  kind: 'sma';
  period: number;
}

export interface Position {
  side: 'buy' | 'sell';
  /** 1 lot = 100,000 units. */
  lots: number;
  /** Opens at this bar's close (plus or minus half the spread). */
  openBar: number;
  stopPips?: number;
  targetPips?: number;
}

/** A step is a diff from the previous step. */
export interface ChartChange {
  reveal?: number;
  style?: 'candles' | 'line';
  spread?: number;
  showSpread?: boolean;
  showVolume?: boolean;
  leverage?: number;
  /** Starts a fresh account balance (and drawdown baseline). */
  balance?: number;
  highlight?: number | null;
  /** Opens or replaces the position; null closes it at the current price. */
  position?: Position | null;
  add?: { levels?: PriceLine[]; notes?: ChartNote[]; indicators?: Indicator[] };
  remove?: { levels?: string[]; notes?: string[]; indicators?: string[] };
}

export interface ChartState {
  pair: string;
  timeframe: string;
  pip: number;
  series: Candle[];
  reveal: number;
  style: 'candles' | 'line';
  spread: number;
  showSpread: boolean;
  showVolume: boolean;
  highlight: number | null;
  levels: PriceLine[];
  notes: ChartNote[];
  indicators: Indicator[];
  account: { balance: number; leverage: number; startBalance: number };
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
