import { generateSeries } from './series';
import { evaluate } from './trading';
import type { ChartChange, ChartInitial, ChartState, ForexMetrics } from './types';

export function initialChartState(init: ChartInitial): ChartState {
  return {
    pair: init.pair,
    timeframe: init.timeframe,
    pip: init.pip,
    series: generateSeries(init),
    reveal: init.reveal,
    style: init.style ?? 'candles',
    spread: init.spread,
    showSpread: false,
    showVolume: false,
    highlight: null,
    levels: [],
    notes: [],
    indicators: [],
    account: { ...init.account, startBalance: init.account.balance },
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
    highlight: change.highlight === undefined ? prev.highlight : change.highlight,
    account: {
      leverage: change.leverage ?? prev.account.leverage,
      balance: change.balance ?? prev.account.balance,
      startBalance: change.balance ?? prev.account.startBalance,
    },
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
    if (pos.lots <= 0) issues.push('position lots must be positive');
    if (pos.stopPips !== undefined && pos.stopPips <= 0) issues.push('stopPips must be positive');
    if (pos.targetPips !== undefined && pos.targetPips <= 0)
      issues.push('targetPips must be positive');
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

/** The account numbers before the first step. */
export function startingMetrics(init: ChartInitial): ForexMetrics {
  return evaluate(initialChartState(init)).metrics;
}
