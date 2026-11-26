import { marketOf } from './market';
import { generateSeries } from './series';
import type { AccountState, ChartChange, ChartInitial, ChartState } from './types';

export function initialChartState(init: ChartInitial): ChartState {
  const market = marketOf(init);
  const account: AccountState =
    init.market === 'fx'
      ? { kind: 'fx', ...init.account, startBalance: init.account.balance }
      : { kind: 'stock', ...init.account, startValue: init.account.cash };
  return {
    symbol: init.symbol,
    company: init.market === 'stock' ? init.company : null,
    timeframe: init.timeframe,
    tick: market.tick,
    decimals: market.decimals,
    series: generateSeries(init, init.bars, market),
    others:
      init.market === 'stock'
        ? (init.others ?? []).map((spec) => ({
            symbol: spec.symbol,
            series: generateSeries(spec, init.bars, market),
          }))
        : [],
    reveal: init.reveal,
    style: init.style ?? 'candles',
    spread: init.spread,
    showSpread: false,
    showVolume: false,
    compare: false,
    highlight: null,
    levels: [],
    notes: [],
    indicators: [],
    account,
    position: null,
  };
}

function removeIds<T extends { id: string }>(
  list: T[],
  ids: string[] | undefined,
  what: string,
  issues: string[],
) {
  for (const id of ids ?? [])
    if (!list.some((x) => x.id === id)) issues.push(`removes missing ${what} "${id}"`);
  return list.filter((x) => !ids?.includes(x.id));
}

function addIds<T extends { id: string }>(
  list: T[],
  add: T[] | undefined,
  what: string,
  issues: string[],
) {
  const out = [...list];
  for (const item of add ?? []) {
    if (out.some((x) => x.id === item.id)) issues.push(`adds duplicate ${what} "${item.id}"`);
    else out.push({ ...item });
  }
  return out;
}

function applyAccount(prev: AccountState, change: ChartChange, issues: string[]): AccountState {
  if (prev.kind === 'fx') {
    if (change.cash !== undefined || change.marginPct !== undefined)
      issues.push('cash and marginPct are for stock charts');
    return {
      ...prev,
      leverage: change.leverage ?? prev.leverage,
      balance: change.balance ?? prev.balance,
      startBalance: change.balance ?? prev.startBalance,
    };
  }
  if (change.leverage !== undefined || change.balance !== undefined)
    issues.push('leverage and balance are for forex charts');
  return {
    ...prev,
    cash: change.cash ?? prev.cash,
    startValue: change.cash ?? prev.startValue,
    marginPct: change.marginPct ?? prev.marginPct,
  };
}

/** The series a position trades in. */
export function seriesFor(state: ChartState, symbol: string | undefined) {
  if (!symbol || symbol === state.symbol) return state.series;
  return state.others.find((o) => o.symbol === symbol)?.series ?? null;
}

/** Applies one step diff. Never throws; problems come back as issues for the validator. */
export function applyChartChange(
  prev: ChartState,
  change: ChartChange,
): { state: ChartState; issues: string[] } {
  const issues: string[] = [];
  const reveal = change.reveal ?? prev.reveal;
  if (reveal < 1 || reveal > prev.series.length)
    issues.push(`reveal ${reveal} is outside 1..${prev.series.length}`);
  if (reveal < prev.reveal) issues.push(`reveal goes back from ${prev.reveal} to ${reveal}`);
  const state: ChartState = {
    ...prev,
    reveal: Math.max(1, Math.min(prev.series.length, reveal)),
    style: change.style ?? prev.style,
    spread: change.spread ?? prev.spread,
    showSpread: change.showSpread ?? prev.showSpread,
    showVolume: change.showVolume ?? prev.showVolume,
    compare: change.compare ?? prev.compare,
    highlight: change.highlight === undefined ? prev.highlight : change.highlight,
    account: applyAccount(prev.account, change, issues),
    levels: addIds(
      removeIds(prev.levels, change.remove?.levels, 'level', issues),
      change.add?.levels,
      'level',
      issues,
    ),
    notes: addIds(
      removeIds(prev.notes, change.remove?.notes, 'note', issues),
      change.add?.notes,
      'note',
      issues,
    ),
    indicators: addIds(
      removeIds(prev.indicators, change.remove?.indicators, 'indicator', issues),
      change.add?.indicators,
      'indicator',
      issues,
    ),
    position:
      change.position === undefined ? prev.position : change.position && { ...change.position },
  };
  if (state.compare && state.others.length === 0)
    issues.push('compare needs other series to compare with');
  for (const note of change.add?.notes ?? []) {
    if (note.bar >= state.reveal)
      issues.push(`note "${note.id}" is on bar ${note.bar}, which is not revealed yet`);
  }
  if (state.highlight !== null && state.highlight >= state.reveal) {
    issues.push(`highlight bar ${state.highlight} is not revealed yet`);
  }
  const pos = change.position;
  if (pos) {
    if (pos.openBar >= state.reveal)
      issues.push(`position opens on bar ${pos.openBar}, which is not revealed yet`);
    if (pos.size <= 0) issues.push('position size must be positive');
    if (pos.stop !== undefined && pos.stop <= 0) issues.push('stop distance must be positive');
    if (pos.target !== undefined && pos.target <= 0)
      issues.push('target distance must be positive');
    if (!seriesFor(state, pos.symbol))
      issues.push(`position symbol "${pos.symbol ?? ''}" is not on the chart`);
  }
  return { state, issues };
}

export function buildChartStates(init: ChartInitial, changes: ChartChange[]): ChartState[] {
  const states: ChartState[] = [];
  let state = initialChartState(init);
  for (const change of changes) {
    state = applyChartChange(state, change).state;
    states.push(state);
  }
  return states;
}
