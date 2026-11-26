/**
 * Business operations preset: stock moving through a supply chain, and cash.
 * Time is compressed: one simulated day passes per DAY_MS of scenario time.
 *
 * Conventions in lessons:
 * - Request flows carry goods, in units per day. Flows ending at the `warehouse` fill it;
 *   flows starting there empty it (sales). The warehouse `value` is units in stock.
 * - Suppliers are `factory` nodes where incoming goods start. A supplier's `capacity` is the
 *   most it could send per day, which a backup supplier uses when another is late.
 * - Response flows are money arriving, in dollars per day.
 */
import { easeOut, withNodes, type ActionNeeds, type Scenario, type Scenarios } from '../scenario';
import type { DiagramNode, DiagramState, TrafficFlow } from '../types';

export interface BusinessMetrics {
  /** Units in the warehouse. */
  stock: number;
  /** Share of customer orders delivered, in percent. */
  filledPct: number;
  /** How many days current stock lasts at current sales. */
  daysOfStock: number;
  cash: number;
  /** Profit per day. */
  profitPerDay: number;
}

export type BusinessAction = 'supplierDelay' | 'demandSpike' | 'latePayments';

type State = DiagramState<BusinessMetrics>;
type Sc = Scenario<BusinessMetrics>;

export const DAY_MS = 1000;
/** Days a delayed supplier sends nothing. */
const DELAY_DAYS = 6;
const SPIKE_DAYS = 5;
const SPIKE_FACTOR = 2.5;
const LATE_DAYS = 10;
/** Days each scenario plays out. */
const HORIZON = 12;

const goods = (state: State) => state.flows.filter((f) => f.kind === 'request');
const sum = (flows: TrafficFlow[]) => flows.reduce((s, f) => s + f.ratePerSec, 0);
const last = (f: TrafficFlow) => f.route[f.route.length - 1] ?? '';

interface Chain {
  warehouse: DiagramNode;
  inflows: TrafficFlow[];
  outflows: TrafficFlow[];
}

function chain(state: State): Chain | null {
  const warehouse = state.nodes.find((n) => n.kind === 'warehouse');
  if (!warehouse) return null;
  return {
    warehouse,
    inflows: goods(state).filter((f) => last(f) === warehouse.id),
    outflows: goods(state).filter((f) => f.route[0] === warehouse.id),
  };
}

/**
 * Plays stock day by day: `inflow(day)` arrives, `demand(day)` is ordered, and sales are
 * capped by what is on the shelf. Returns stock and fill rate at the start of each day.
 */
function simulate(start: number, inflow: (day: number) => number, demand: (day: number) => number) {
  const days: { stock: number; filled: number; sold: number }[] = [];
  let stock = start;
  for (let day = 0; day <= HORIZON; day++) {
    const want = demand(day);
    const available = stock + inflow(day);
    const sold = Math.min(want, available);
    days.push({ stock, filled: want > 0 ? sold / want : 1, sold });
    stock = available - sold;
  }
  return days;
}

/** Shared playback: one diagram phase per day, metrics eased between days. */
function playDays(
  base: State,
  c: Chain,
  days: ReturnType<typeof simulate>,
  stateFor: (day: number, filled: number) => State,
  cashFor: (day: number) => number,
  profitFor: (day: number) => number,
  demandFor: (day: number) => number,
): Sc {
  const at = (t: number) => Math.min(HORIZON, Math.floor(t / DAY_MS));
  return {
    phaseAt: at,
    stateAt: (t) => {
      const day = at(t);
      const d = days[day] ?? days[days.length - 1];
      const s = stateFor(day, d?.filled ?? 1);
      return withNodes(
        s,
        (n) => (n.id === c.warehouse.id ? { ...n, value: Math.round(d?.stock ?? 0) } : n),
        s.flows,
      );
    },
    metricsAt: (t) => {
      const day = at(t);
      const d = days[day] ?? days[days.length - 1];
      const stock = Math.round(d?.stock ?? 0);
      const demand = demandFor(day);
      return {
        stock,
        filledPct: Math.round((d?.filled ?? 1) * 100),
        daysOfStock: demand > 0 ? Math.round((stock / demand) * 10) / 10 : 99,
        cash: Math.round(base.metrics.cash + cashFor(day) * easeOut(Math.min(1, t / 400))),
        profitPerDay: Math.round(profitFor(day)),
      };
    },
  };
}

/** Orders that cannot be filled bounce back from the shop in red. */
function shortages(c: Chain, filled: number): TrafficFlow[] {
  if (filled >= 0.999) return [];
  return c.outflows.map((f) => ({
    ...f,
    kind: 'failed' as const,
    ratePerSec: f.ratePerSec * (1 - filled),
  }));
}

const supplierDelay = (base: State): Sc | null => {
  const c = chain(base);
  if (!c) return null;
  const isSupplier = (id: string) => base.nodes.some((n) => n.id === id && n.kind === 'factory');
  const late = c.inflows.find((f) => isSupplier(f.route[0] ?? ''));
  const lateId = late?.route[0];
  if (!late || !lateId) return null;
  const lateRate = sum(c.inflows.filter((f) => f.route[0] === lateId));
  // Other suppliers send up to their capacity while one is late.
  const backups = base.nodes.filter((n) => n.kind === 'factory' && n.id !== lateId && n.capacity);
  const backupNow = sum(c.inflows.filter((f) => backups.some((b) => b.id === f.route[0])));
  const backupMax = backups.reduce((s, b) => s + (b.capacity ?? 0), 0);
  const spare = Math.max(0, backupMax - backupNow);
  const normalIn = sum(c.inflows);
  const demand = sum(c.outflows);
  const delayed = (day: number) => day < DELAY_DAYS;
  const days = simulate(
    c.warehouse.value ?? 0,
    (day) => (delayed(day) ? normalIn - lateRate + Math.min(spare, lateRate) : normalIn),
    () => demand,
  );
  const m = base.metrics;
  const lostProfit = (day: number) => m.profitPerDay * (1 - (days[day]?.filled ?? 1));
  return playDays(
    base,
    c,
    days,
    (day, filled) => {
      const flows = base.flows.flatMap((f) => {
        if (!delayed(day)) return [f];
        if (f.route[0] === lateId && f.kind === 'request') return [];
        const boost = backups.find((b) => b.id === f.route[0]);
        return boost && f.kind === 'request'
          ? [{ ...f, ratePerSec: f.ratePerSec + Math.min(spare, lateRate) }]
          : [f];
      });
      return withNodes(
        base,
        (n) => (n.id === lateId && delayed(day) ? { ...n, health: 'down' } : n),
        [...flows, ...shortages(c, filled)],
      );
    },
    (day) => -days.slice(0, day + 1).reduce((s, _, i) => s + lostProfit(i), 0),
    (day) => m.profitPerDay - lostProfit(day),
    () => demand,
  );
};

const demandSpike = (base: State): Sc | null => {
  const c = chain(base);
  if (!c) return null;
  const normal = sum(c.outflows);
  const spiking = (day: number) => day < SPIKE_DAYS;
  const demand = (day: number) => (spiking(day) ? normal * SPIKE_FACTOR : normal);
  const days = simulate(c.warehouse.value ?? 0, () => sum(c.inflows), demand);
  const m = base.metrics;
  const perUnit = normal > 0 ? m.profitPerDay / normal : 0;
  return playDays(
    base,
    c,
    days,
    (day, filled) => {
      const flows = base.flows.map((f) =>
        spiking(day) && c.outflows.includes(f)
          ? { ...f, ratePerSec: f.ratePerSec * SPIKE_FACTOR }
          : f,
      );
      const busy = { ...base, flows };
      const extra = spiking(day)
        ? shortages(
            {
              ...c,
              outflows: c.outflows.map((f) => ({ ...f, ratePerSec: f.ratePerSec * SPIKE_FACTOR })),
            },
            filled,
          )
        : [];
      return withNodes(
        busy,
        (n) => (n.id === c.warehouse.id && filled < 1 ? { ...n, health: 'degraded' } : n),
        [...flows, ...extra],
      );
    },
    (day) => days.slice(0, day + 1).reduce((s, d) => s + (d.sold - normal) * perUnit, 0),
    (day) => (days[day]?.sold ?? normal) * perUnit,
    demand,
  );
};

const latePayments = (base: State): Sc | null => {
  const money = base.flows.filter((f) => f.kind === 'response');
  if (money.length === 0) return null;
  const c = chain(base);
  const revenue = sum(money);
  const m = base.metrics;
  const late = (day: number) => day < LATE_DAYS;
  const bank = base.nodes.find((n) => n.kind === 'bank');
  /** Cash still missing on a given day; the backlog is paid once customers catch up. */
  const owed = (day: number) => (late(day) ? -revenue * (day + 1) : 0);
  const stateFor = (day: number) =>
    withNodes(
      base,
      (n) =>
        bank && n.id === bank.id && late(day) && m.cash - revenue * (day + 1) < 0
          ? { ...n, health: 'degraded' }
          : n,
      base.flows.map((f) =>
        late(day) && money.includes(f) ? { ...f, kind: 'failed' as const } : f,
      ),
    );
  if (!c) {
    const at = (t: number) => Math.min(HORIZON, Math.floor(t / DAY_MS));
    return {
      phaseAt: at,
      stateAt: (t) => stateFor(at(t)),
      metricsAt: (t) => ({ ...m, cash: Math.round(m.cash + owed(at(t))) }),
    };
  }
  const days = simulate(
    c.warehouse.value ?? 0,
    () => sum(c.inflows),
    () => sum(c.outflows),
  );
  return playDays(
    base,
    c,
    days,
    (day) => stateFor(day),
    owed,
    () => m.profitPerDay,
    () => sum(c.outflows),
  );
};

export const businessScenarios: Scenarios<BusinessMetrics, BusinessAction> = {
  supplierDelay,
  demandSpike,
  latePayments,
};

export const BUSINESS_ACTION_NEEDS: ActionNeeds<BusinessAction> = {
  supplierDelay: ['factory'],
  demandSpike: ['warehouse'],
  latePayments: ['shop'],
};

export function summarizeBusiness(state: State, m: BusinessMetrics): string {
  const parts = state.nodes.map((n) => {
    const v = n.value !== undefined ? ` ${n.value} units` : '';
    const h = n.health && n.health !== 'healthy' ? ` (${n.health})` : '';
    return `${n.label}${v}${h}`;
  });
  return (
    `Diagram: ${parts.join(', ')}. ${m.stock} units in stock, ${m.filledPct}% of orders filled, ` +
    `${m.daysOfStock} days of stock, cash $${m.cash}, profit $${m.profitPerDay} a day.`
  );
}
