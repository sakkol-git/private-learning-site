import type { Health, NodeKind } from './types';

const TOKEN: Record<NodeKind, string> = {
  users: 'users',
  loadBalancer: 'lb',
  server: 'server',
  cache: 'cache',
  database: 'db',
  queue: 'queue',
  cdn: 'cdn',
  service: 'service',
};

export interface Palette {
  top: string;
  left: string;
  right: string;
  outline: string;
  soft: string;
}

const darken = (color: string, pct: number) => `color-mix(in srgb, ${color} ${100 - pct}%, #000)`;

/** Face colours for a node, derived from its kind and health via CSS variables. */
export function paletteFor(kind: NodeKind, health: Health = 'healthy'): Palette {
  let top = `var(--node-${TOKEN[kind]})`;
  let soft = `var(--node-${TOKEN[kind]}-soft)`;
  if (health === 'degraded') {
    top = `color-mix(in srgb, ${top} 50%, var(--warn))`;
    soft = 'var(--warn-soft)';
  }
  if (health === 'down') {
    top = `color-mix(in srgb, ${top} 25%, var(--muted))`;
    soft = `color-mix(in srgb, ${soft} 40%, var(--line))`;
  }
  return { top, left: darken(top, 12), right: darken(top, 22), outline: darken(top, 38), soft };
}
