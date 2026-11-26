import { describe, expect, it } from 'vitest';
import type { DiagramState } from '../types';
import {
  ATTACK_DELAY_MS,
  RESTORE_MS,
  securityScenarios,
  type SecurityAction,
  type SecurityMetrics,
} from './security';

/** A forum, a shop and a bank share one password; email has its own. */
const base: DiagramState<SecurityMetrics> = {
  nodes: [
    { id: 'forum', kind: 'service', label: 'Old forum', x: 8, y: 0, tag: 'pw1' },
    { id: 'shop', kind: 'service', label: 'Shop', x: 8, y: 3, tag: 'pw1' },
    { id: 'bank', kind: 'service', label: 'Bank', x: 8, y: 6, tag: 'pw1', value: 2000 },
    { id: 'mail', kind: 'inbox', label: 'Email', x: 4, y: 3, tag: 'pw2' },
    { id: 'hacker', kind: 'attacker', label: 'Attacker', x: 12, y: 3 },
    { id: 'laptop', kind: 'device', label: 'Laptop', x: 0, y: 3 },
  ],
  links: [
    { id: 'h-forum', from: 'hacker', to: 'forum' },
    { id: 'h-shop', from: 'hacker', to: 'shop' },
    { id: 'h-bank', from: 'hacker', to: 'bank' },
    { id: 'h-mail', from: 'hacker', to: 'mail' },
    { id: 'mail-shop', from: 'mail', to: 'shop', style: 'dashed' },
    { id: 'mail-bank', from: 'mail', to: 'bank', style: 'dashed' },
    { id: 'h-laptop', from: 'hacker', to: 'laptop' },
  ],
  flows: [],
  metrics: { safe: [3, 3], reused: 3, filesLockedPct: 0, recoveryDays: 0, moneyLost: 0 },
};

const run = (action: SecurityAction, state = base) => {
  const s = securityScenarios[action](state);
  if (!s) throw new Error(`${action} should apply`);
  return s;
};

const later = ATTACK_DELAY_MS + 2000;

describe('security scenarios', () => {
  it('a breach at one site unlocks every account with the same password', () => {
    const s = run('siteBreach');
    expect(s.metricsAt(later)).toMatchObject({ safe: [0, 3], moneyLost: 2000 });
    expect(s.stateAt(later).nodes.find((n) => n.id === 'bank')?.health).toBe('down');
  });

  it('two-factor login on the bank stops the stolen password', () => {
    const guarded: DiagramState<SecurityMetrics> = {
      ...base,
      nodes: [...base.nodes, { id: 'twofa', kind: 'shield', label: '2FA', x: 10, y: 6 }],
      links: [
        ...base.links.filter((l) => l.id !== 'h-bank' && l.id !== 'mail-bank'),
        { id: 'h-2fa', from: 'hacker', to: 'twofa' },
        { id: '2fa-bank', from: 'twofa', to: 'bank' },
      ],
    };
    const s = run('siteBreach', guarded);
    expect(s.metricsAt(later)).toMatchObject({ safe: [1, 3], moneyLost: 0 });
    expect(
      s.stateAt(later).flows.some((f) => f.kind === 'failed' && f.route.at(-1) === 'twofa'),
    ).toBe(true);
  });

  it('unique passwords keep a breach to the site that leaked', () => {
    const unique = {
      ...base,
      nodes: base.nodes.map((n, i) => (n.kind === 'service' ? { ...n, tag: `pw-${i}` } : n)),
    };
    expect(run('siteBreach', unique).metricsAt(later).safe).toEqual([2, 3]);
  });

  it('a phished email password resets the accounts linked to it', () => {
    const m = run('phishingClick').metricsAt(later);
    expect(m.safe).toEqual([1, 3]);
    expect(m.moneyLost).toBe(2000);
  });

  it('ransomware locks files for good without an offline backup', () => {
    const m = run('ransomware').metricsAt(5000);
    expect(m).toMatchObject({ filesLockedPct: 100, recoveryDays: 30 });
    expect(m.moneyLost).toBeGreaterThan(0);
  });

  it('an online backup is encrypted too; an offline one restores everything', () => {
    const withBackup = (tag: string): DiagramState<SecurityMetrics> => ({
      ...base,
      nodes: [...base.nodes, { id: 'disk', kind: 'database', label: 'Backup', x: 0, y: 7, tag }],
      links: [...base.links, { id: 'l-disk', from: 'laptop', to: 'disk', style: 'dashed' }],
    });
    expect(run('ransomware', withBackup('online')).metricsAt(5000).filesLockedPct).toBe(100);
    const offline = run('ransomware', withBackup('offline'));
    expect(offline.metricsAt(1000).filesLockedPct).toBe(100);
    expect(offline.metricsAt(RESTORE_MS + 2000)).toMatchObject({
      filesLockedPct: 0,
      recoveryDays: 1,
    });
    expect(
      offline.stateAt(RESTORE_MS + 100).nodes.find((n) => n.id === 'laptop')?.health,
    ).toBeUndefined();
  });
});
