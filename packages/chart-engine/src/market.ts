import type { ChartInitial } from './types';

/** How a market turns lesson numbers into prices. */
export interface Market {
  tick: number;
  decimals: number;
  /** Price change for a move (pips for forex, percent for stocks) from a given price. */
  delta(price: number, move: number): number;
}

export function marketOf(init: ChartInitial): Market {
  if (init.market === 'fx') {
    return {
      tick: init.pip,
      decimals: Math.max(0, Math.round(-Math.log10(init.pip)) + 1),
      delta: (_price, move) => move * init.pip,
    };
  }
  return { tick: 0.01, decimals: 2, delta: (price, move) => (price * move) / 100 };
}

/** "+$300", "−$1,250". */
export function formatUsd(value: number, signed = false): string {
  const sign = value < 0 ? '−' : signed && value > 0 ? '+' : '';
  return `${sign}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
}
