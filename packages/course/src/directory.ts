const ports = {
  'system-design': 5173,
  finance: 5174,
  forex: 5175,
  stocks: 5176,
  internet: 5177,
  security: 5178,
  business: 5179,
} as const;

export type CourseId = keyof typeof ports;

export function courseDirectory(setting: string | undefined, developmentHost?: string) {
  let configured: Record<string, unknown> = {};
  if (setting) {
    const parsed: unknown = JSON.parse(setting);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('VITE_COURSE_ORIGINS must be a JSON object keyed by course ID');
    }
    configured = parsed as Record<string, unknown>;
  }
  return (Object.keys(ports) as CourseId[]).flatMap((id) => {
    const value = configured[id];
    if (value === undefined) {
      return developmentHost ? [{ id, origin: `http://${developmentHost}:${ports[id]}` }] : [];
    }
    if (typeof value !== 'string') throw new Error(`Invalid course origin for ${id}`);
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      throw new Error(`Expected an HTTP(S) origin for ${id}`);
    }
    return [{ id, origin: url.origin }];
  });
}

type Destination = { course: CourseId; slug: string; title: string };
const pairs: [Destination, Destination][] = [
  [
    { course: 'system-design', slug: 'caching', title: 'Caching' },
    { course: 'internet', slug: 'finding-addresses', title: 'Finding addresses with DNS' },
  ],
  [
    { course: 'system-design', slug: 'database-replication', title: 'Database replication' },
    { course: 'security', slug: 'ransomware-and-backups', title: 'Ransomware and backups' },
  ],
  [
    { course: 'finance', slug: 'safety-net', title: 'Building a safety net' },
    { course: 'business', slug: 'cash-flow', title: 'Cash flow' },
  ],
  [
    { course: 'forex', slug: 'spread-and-costs', title: 'Spread and slippage' },
    { course: 'stocks', slug: 'orders-and-costs', title: 'What a trade really costs' },
  ],
  [
    { course: 'stocks', slug: 'earnings-day', title: 'Earnings day and position size' },
    { course: 'forex', slug: 'stop-loss', title: 'Stop-loss and take-profit' },
  ],
];

export function relatedDestinations(course: CourseId, slug: string) {
  return pairs.flatMap(([a, b]) =>
    a.course === course && a.slug === slug
      ? [b]
      : b.course === course && b.slug === slug
        ? [a]
        : [],
  );
}
