/**
 * Financial education preset: household money metrics and life-event scenarios.
 * Time is compressed: one simulated month passes per MONTH_MS of scenario time.
 */
import { findLinkBetween } from '../model';
import {
  easeOut,
  lerp,
  withNodes,
  type ActionNeeds,
  type Scenario,
  type Scenarios,
} from '../scenario';
import type { DiagramNode, DiagramState, TrafficFlow } from '../types';

export interface MoneyMetrics {
  /** Per month. */
  income: number;
  /** Per month. */
  spending: number;
  /** Per month; negative means drawing down savings or borrowing. */
  saved: number;
  debt: number;
  netWorth: number;
}

export type MoneyAction =
  'surpriseExpense' | 'loseIncome' | 'rateHike' | 'marketDrop' | 'newMoneyStops';

export const MONTH_MS = 1000;
const MAX_MONTHS = 12;

type State = DiagramState<MoneyMetrics>;

/** A flow from one node to a neighbour, only if they are linked. */
function flowIfLinked(
  state: State,
  from: string,
  to: string,
  kind: TrafficFlow['kind'],
): TrafficFlow[] {
  return findLinkBetween(state, from, to) ? [{ route: [from, to], kind, ratePerSec: 3 }] : [];
}

function neighbour(state: State, id: string, kind: DiagramNode['kind']): DiagramNode | undefined {
  return state.nodes.find(
    (n) => n.kind === kind && n.id !== id && findLinkBetween(state, id, n.id) !== undefined,
  );
}

function loseIncome(base: State): Scenario<MoneyMetrics> | null {
  const employer = base.nodes.find((n) => n.kind === 'employer' && n.health !== 'down');
  if (!employer) return null;
  const m = base.metrics;
  const spend = Math.max(1, m.spending);
  const jar = base.nodes.find((n) => n.kind === 'jar');
  const savings = jar?.value ?? 0;
  const wallet = base.nodes.find((n) => n.kind === 'wallet');
  const draw = jar && wallet ? flowIfLinked(base, jar.id, wallet.id, 'request') : [];
  const others = base.flows.filter((f) => !f.route.includes(employer.id));
  const monthAt = (t: number) => Math.min(MAX_MONTHS, Math.floor(t / MONTH_MS));

  return {
    phaseAt: monthAt,
    stateAt: (t) => {
      const left = Math.max(0, savings - spend * monthAt(t));
      const broke = left <= 0;
      const flows = broke
        ? others.map((f) =>
            wallet && f.route[0] === wallet.id ? { ...f, kind: 'failed' as const } : f,
          )
        : [...others, ...draw];
      return withNodes(
        base,
        (n) => {
          if (n.id === employer.id) return { ...n, health: 'down' };
          if (jar && n.id === jar.id)
            return { ...n, value: left, health: left < spend ? 'degraded' : 'healthy' };
          if (wallet && n.id === wallet.id && broke) return { ...n, health: 'degraded' };
          return n;
        },
        flows,
      );
    },
    metricsAt: (t) => {
      const months = Math.min(MAX_MONTHS, t / MONTH_MS);
      const drawn = spend * months;
      return {
        ...m,
        income: 0,
        saved: -spend,
        debt: Math.round(m.debt + Math.max(0, drawn - savings)),
        netWorth: Math.round(m.netWorth - drawn),
      };
    },
  };
}

function surpriseExpense(base: State): Scenario<MoneyMetrics> | null {
  const wallet = base.nodes.find((n) => n.kind === 'wallet');
  if (!wallet) return null;
  const m = base.metrics;
  const bill = Math.max(500, Math.round((m.spending * 1.5) / 100) * 100);
  const jar = base.nodes.find((n) => n.kind === 'jar');
  const savings = jar?.value ?? 0;
  const covered = Math.min(bill, savings);
  const short = bill - covered;
  const lender = neighbour(base, wallet.id, 'bank');
  const inflows = [
    ...(jar && covered > 0 ? flowIfLinked(base, jar.id, wallet.id, 'request') : []),
    ...(lender && short > 0 ? flowIfLinked(base, lender.id, wallet.id, 'failed') : []),
  ];
  const settle = (n: DiagramNode, hit: boolean): DiagramNode => {
    if (jar && n.id === jar.id) {
      const left = savings - covered;
      return { ...n, value: left, health: left < m.spending ? 'degraded' : 'healthy' };
    }
    if (hit && n.id === wallet.id) return { ...n, health: 'degraded' };
    return n;
  };
  const during = withNodes(base, (n) => settle(n, true), [...base.flows, ...inflows]);
  const after = withNodes(base, (n) => settle(n, false), base.flows);
  return {
    phaseAt: (t) => (t < 1500 ? 0 : 1),
    stateAt: (t) => (t < 1500 ? during : after),
    metricsAt: (t) => {
      const k = easeOut(t / 800);
      return {
        ...m,
        debt: Math.round(m.debt + short * k),
        netWorth: Math.round(m.netWorth - bill * k),
      };
    },
  };
}

/** Extra yearly interest on variable-rate debt when rates rise. */
const RATE_RISE = 0.05;

function rateHike(base: State): Scenario<MoneyMetrics> | null {
  const bank = base.nodes.find((n) => n.kind === 'bank');
  if (!bank) return null;
  const m = base.metrics;
  const extra = Math.round((m.debt * RATE_RISE) / 12);
  const flows = base.flows.map((f) =>
    f.route[f.route.length - 1] === bank.id && f.kind !== 'failed'
      ? { ...f, ratePerSec: f.ratePerSec * 1.6 }
      : f,
  );
  const state = withNodes(
    base,
    (n) => (n.id === bank.id ? { ...n, health: 'degraded' } : n),
    flows,
  );
  return {
    phaseAt: () => 0,
    stateAt: () => state,
    metricsAt: (t) => {
      const k = easeOut(t / 800);
      return {
        ...m,
        spending: Math.round(m.spending + extra * k),
        saved: Math.round(m.saved - extra * k),
      };
    },
  };
}

const CRASH_MS = 600;
const BOTTOM_MS = 2000;
const RECOVERY_MS = 8 * MONTH_MS;

/** Share of the market value left at time t: a fast fall, a wait, a slow recovery past the start. */
export function marketFactor(t: number): number {
  if (t < CRASH_MS) return lerp(1, 0.65, easeOut(t / CRASH_MS));
  if (t < BOTTOM_MS) return 0.65;
  return lerp(0.65, 1.12, easeOut((t - BOTTOM_MS) / RECOVERY_MS));
}

function marketDrop(base: State): Scenario<MoneyMetrics> | null {
  const market = base.nodes.find((n) => n.kind === 'market');
  if (!market) return null;
  const m = base.metrics;
  const value = market.value ?? 0;
  const tick = 400;
  return {
    phaseAt: (t) => Math.min(Math.floor(t / tick), Math.ceil((BOTTOM_MS + RECOVERY_MS) / tick)),
    stateAt: (t) => {
      const f = marketFactor(t);
      return withNodes(
        base,
        (n) =>
          n.id === market.id
            ? { ...n, value: Math.round(value * f), health: f < 0.9 ? 'degraded' : 'healthy' }
            : n,
        base.flows,
      );
    },
    metricsAt: (t) => ({ ...m, netWorth: Math.round(m.netWorth + value * (marketFactor(t) - 1)) }),
  };
}

const COLLAPSE_MS = 2000;

/** The learner's own stake in a scheme sits on the node with this id. */
const LEARNER_ID = 'you';

function newMoneyStops(base: State): Scenario<MoneyMetrics> | null {
  const scheme = base.nodes.find((n) => n.kind === 'scheme');
  if (!scheme) return null;
  const m = base.metrics;
  const held = scheme.value ?? 0;
  const payouts = base.flows.filter((f) => f.route[0] === scheme.id);
  const unrelated = base.flows.filter((f) => !f.route.includes(scheme.id));
  const stranded = base.nodes.filter(
    (n) => n.kind === 'person' && findLinkBetween(base, n.id, scheme.id) !== undefined,
  );
  const stake = base.nodes.find((n) => n.id === LEARNER_ID)?.value ?? 0;
  const withdrawals: TrafficFlow[] = stranded.map((n) => ({
    route: [n.id, scheme.id],
    kind: 'failed',
    ratePerSec: 2,
  }));
  const tick = 250;

  return {
    phaseAt: (t) => (t < COLLAPSE_MS ? Math.floor(t / tick) : COLLAPSE_MS / tick),
    stateAt: (t) => {
      if (t < COLLAPSE_MS) {
        const left = Math.round(held * (1 - t / COLLAPSE_MS));
        return withNodes(
          base,
          (n) => (n.id === scheme.id ? { ...n, value: left, health: 'degraded' } : n),
          [...unrelated, ...payouts],
        );
      }
      return withNodes(
        base,
        (n) => {
          if (n.id === scheme.id) return { ...n, value: 0, health: 'down' };
          if (stranded.some((s) => s.id === n.id)) {
            return { ...n, health: 'degraded', ...(n.value !== undefined ? { value: 0 } : {}) };
          }
          return n;
        },
        [...unrelated, ...withdrawals],
      );
    },
    metricsAt: (t) => ({
      ...m,
      netWorth: Math.round(
        m.netWorth - (t < COLLAPSE_MS ? 0 : stake * easeOut((t - COLLAPSE_MS) / 600)),
      ),
    }),
  };
}

export const moneyScenarios: Scenarios<MoneyMetrics, MoneyAction> = {
  surpriseExpense,
  loseIncome,
  rateHike,
  marketDrop,
  newMoneyStops,
};

export const MONEY_ACTION_NEEDS: ActionNeeds<MoneyAction> = {
  surpriseExpense: ['wallet'],
  loseIncome: ['employer'],
  rateHike: ['bank'],
  marketDrop: ['market'],
  newMoneyStops: ['scheme'],
};

/** "$1,250", "$12.5k", "−$300". */
export function formatMoney(value: number): string {
  const sign = value < 0 ? '−' : '';
  const abs = Math.abs(value);
  if (abs >= 100_000) return `${sign}$${Math.round(abs / 1000)}k`;
  if (abs >= 10_000) return `${sign}$${Math.round(abs / 100) / 10}k`;
  return `${sign}$${Math.round(abs).toLocaleString('en-US')}`;
}

export function summarizeMoney(state: State, m: MoneyMetrics): string {
  const parts = state.nodes.map((n) => {
    const amount = n.value !== undefined ? ` ${formatMoney(n.value)}` : '';
    const health = n.health && n.health !== 'healthy' ? ` (${n.health})` : '';
    return `${n.label}${amount}${health}`;
  });
  return (
    `Diagram: ${parts.join(', ')}. Income ${formatMoney(m.income)} a month, spending ${formatMoney(m.spending)}, ` +
    `saving ${formatMoney(m.saved)} a month, debt ${formatMoney(m.debt)}, net worth ${formatMoney(m.netWorth)}.`
  );
}
