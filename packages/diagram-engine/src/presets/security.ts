/**
 * Cybersecurity preset: accounts, files and the attacks that reach them.
 *
 * Conventions in lessons:
 * - Your online accounts are `service` nodes. Accounts with the same `tag` share a password.
 * - The attacker is an `attacker` node. A `shield` (two-factor login) on the path blocks it.
 * - Your email is the `inbox`: password resets for linked accounts go through it.
 * - Backups are `database` nodes linked to a `device`; `tag: 'offline'` means unplugged.
 */
import { routeAround } from '../model';
import { easeOut, withNodes, type ActionNeeds, type Scenario, type Scenarios } from '../scenario';
import type { DiagramNode, DiagramState, TrafficFlow } from '../types';

export interface SecurityMetrics {
  /** [safe, total] accounts. */
  safe: [number, number];
  /** How many accounts share a password with another. */
  reused: number;
  filesLockedPct: number;
  /** Days to get back to normal after an attack. */
  recoveryDays: number;
  moneyLost: number;
}

export type SecurityAction = 'siteBreach' | 'phishingClick' | 'ransomware';

type State = DiagramState<SecurityMetrics>;
type Sc = Scenario<SecurityMetrics>;

/** How long the attacker takes to try the stolen password elsewhere. */
export const ATTACK_DELAY_MS = 1200;
/** How long restoring from a backup takes, in scenario time. */
export const RESTORE_MS = 2500;
/** Ransom demanded when there is nothing to restore from (paying is no guarantee). */
const RANSOM = 1500;

const isKind = (state: State, id: string, kind: DiagramNode['kind']) =>
  state.nodes.some((n) => n.id === id && n.kind === kind);

interface Takeover {
  taken: DiagramNode[];
  attack: TrafficFlow[];
}

/** Tries each target from `from`; a shield on the way blocks it, otherwise the account is taken. */
function attempt(state: State, from: string, targets: DiagramNode[]): Takeover {
  const taken: DiagramNode[] = [];
  const attack: TrafficFlow[] = [];
  for (const target of targets) {
    const path = routeAround(state, from, target.id);
    if (!path) continue;
    const shield = path.find((id) => isKind(state, id, 'shield'));
    if (shield) {
      attack.push({
        route: path.slice(0, path.indexOf(shield) + 1),
        kind: 'failed',
        ratePerSec: 2,
      });
    } else {
      attack.push({ route: path, kind: 'request', ratePerSec: 2 });
      taken.push(target);
    }
  }
  return { taken, attack };
}

function takeoverScenario(base: State, first: DiagramNode, result: Takeover): Sc {
  const m = base.metrics;
  const takenIds = new Set(result.taken.map((n) => n.id));
  const lost = result.taken.reduce((sum, n) => sum + (n.value ?? 0), 0);
  const firstHit = withNodes(
    base,
    (n) => (n.id === first.id ? { ...n, health: 'degraded' } : n),
    base.flows,
  );
  const after = withNodes(
    base,
    (n) =>
      takenIds.has(n.id)
        ? { ...n, health: 'down', ...(n.value !== undefined ? { value: 0 } : {}) }
        : n.id === first.id
          ? { ...n, health: 'degraded' }
          : n,
    [...base.flows, ...result.attack],
  );
  const services = result.taken.filter((n) => n.kind === 'service').length;
  return {
    phaseAt: (t) => (t < ATTACK_DELAY_MS ? 0 : 1),
    stateAt: (t) => (t < ATTACK_DELAY_MS ? firstHit : after),
    metricsAt: (t) => {
      if (t < ATTACK_DELAY_MS) return m;
      const k = easeOut((t - ATTACK_DELAY_MS) / 500);
      return {
        ...m,
        safe: [Math.max(0, m.safe[0] - Math.round(services * k)), m.safe[1]],
        moneyLost: Math.round(m.moneyLost + lost * k),
        recoveryDays: m.recoveryDays + (services > 0 ? 2 * services : 0),
      };
    },
  };
}

/** Another site leaks its passwords; the attacker tries the same password everywhere. */
const siteBreach = (base: State): Sc | null => {
  const attacker = base.nodes.find((n) => n.kind === 'attacker');
  const leaked = base.nodes.find((n) => n.kind === 'service' && n.tag !== undefined);
  if (!attacker || !leaked) return null;
  const sameLock = base.nodes.filter(
    (n) => n.kind === 'service' && n.id !== leaked.id && n.tag === leaked.tag,
  );
  const tries = attempt(base, attacker.id, sameLock);
  // The leaking site's own account is exposed whatever else happens.
  return takeoverScenario(base, leaked, { ...tries, taken: [leaked, ...tries.taken] });
};

/** You type your email password into a fake page; the attacker resets everything linked to it. */
const phishingClick = (base: State): Sc | null => {
  const attacker = base.nodes.find((n) => n.kind === 'attacker');
  const inbox = base.nodes.find((n) => n.kind === 'inbox');
  if (!attacker || !inbox) return null;
  const entry = attempt(base, attacker.id, [inbox]);
  if (entry.taken.length === 0) return takeoverScenario(base, inbox, entry);
  const linked = base.nodes.filter(
    (n) =>
      n.kind === 'service' && routeAround(base, inbox.id, n.id, new Set([attacker.id])) !== null,
  );
  const reset = attempt(base, inbox.id, linked);
  return takeoverScenario(base, inbox, {
    taken: [inbox, ...reset.taken],
    attack: [...entry.attack, ...reset.attack],
  });
};

/** Files on the device are encrypted; an offline backup brings them back. */
const ransomware = (base: State): Sc | null => {
  const devices = base.nodes.filter((n) => n.kind === 'device');
  if (devices.length === 0) return null;
  const m = base.metrics;
  const deviceIds = new Set(devices.map((d) => d.id));
  const backups = base.nodes.filter(
    (n) => n.kind === 'database' && devices.some((d) => routeAround(base, d.id, n.id) !== null),
  );
  const survivors = backups.filter((b) => b.tag === 'offline');
  const attacker = base.nodes.find((n) => n.kind === 'attacker');
  const attack: TrafficFlow[] = attacker
    ? devices.flatMap((d) => {
        const path = routeAround(base, attacker.id, d.id);
        return path ? [{ route: path, kind: 'request' as const, ratePerSec: 2 }] : [];
      })
    : [];
  const locked = withNodes(
    base,
    (n) =>
      deviceIds.has(n.id) || (n.kind === 'database' && backups.includes(n) && n.tag !== 'offline')
        ? { ...n, health: 'down' }
        : n,
    [...base.flows, ...attack],
  );
  const restore: TrafficFlow[] = survivors.flatMap((b) =>
    devices.flatMap((d) => {
      const path = routeAround(base, b.id, d.id);
      return path ? [{ route: path, kind: 'response' as const, ratePerSec: 3 }] : [];
    }),
  );
  const restored = withNodes(
    base,
    (n) =>
      n.kind === 'database' && backups.includes(n) && n.tag !== 'offline'
        ? { ...n, health: 'down' }
        : n,
    [...base.flows, ...restore],
  );
  const canRestore = survivors.length > 0;
  return {
    phaseAt: (t) => (canRestore && t >= RESTORE_MS ? 1 : 0),
    stateAt: (t) => (canRestore && t >= RESTORE_MS ? restored : locked),
    metricsAt: (t) => {
      const hit = easeOut(t / 400);
      if (!canRestore) {
        return {
          ...m,
          filesLockedPct: Math.round(100 * hit),
          recoveryDays: 30,
          moneyLost: Math.round(m.moneyLost + RANSOM * hit),
        };
      }
      const back = t < RESTORE_MS ? 0 : easeOut((t - RESTORE_MS) / 800);
      return { ...m, filesLockedPct: Math.round(100 * hit * (1 - back)), recoveryDays: 1 };
    },
  };
};

export const securityScenarios: Scenarios<SecurityMetrics, SecurityAction> = {
  siteBreach,
  phishingClick,
  ransomware,
};

export const SECURITY_ACTION_NEEDS: ActionNeeds<SecurityAction> = {
  siteBreach: ['attacker'],
  phishingClick: ['inbox'],
  ransomware: ['device'],
};

export function summarizeSecurity(state: State, m: SecurityMetrics): string {
  const parts = state.nodes.map((n) =>
    n.health === 'down'
      ? `${n.label} (compromised)`
      : n.health === 'degraded'
        ? `${n.label} (at risk)`
        : n.label,
  );
  return (
    `Diagram: ${parts.join(', ')}. ${m.safe[0]} of ${m.safe[1]} accounts safe, ${m.reused} sharing a password, ` +
    `${m.filesLockedPct}% of files locked, ${m.recoveryDays} days to recover, $${m.moneyLost} lost.`
  );
}
