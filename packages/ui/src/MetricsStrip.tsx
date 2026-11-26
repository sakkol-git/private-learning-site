import type { Metrics } from '@ss/diagram-engine';
import styles from './MetricsStrip.module.css';

export interface MetricsLabels {
  users: string;
  requestsPerSec: string;
  p95: string;
  errorRate: string;
  healthy: string;
  ms: string;
}

type Status = 'ok' | 'warn' | 'fail';

function latencyStatus(ms: number): Status {
  return ms >= 1000 ? 'fail' : ms >= 400 ? 'warn' : 'ok';
}

function errorStatus(pct: number): Status {
  return pct >= 5 ? 'fail' : pct > 0.5 ? 'warn' : 'ok';
}

function healthyStatus([up, total]: [number, number]): Status {
  return total > 0 && up === 0 ? 'fail' : up < total ? 'warn' : 'ok';
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export function MetricsStrip({ metrics, labels }: { metrics: Metrics; labels: MetricsLabels }) {
  const tiles: { key: string; label: string; value: string; unit?: string; status: Status }[] = [
    { key: 'users', label: labels.users, value: fmt(metrics.users), status: 'ok' },
    { key: 'rps', label: labels.requestsPerSec, value: fmt(metrics.requestsPerSec), status: 'ok' },
    {
      key: 'p95',
      label: labels.p95,
      value: fmt(metrics.p95LatencyMs),
      unit: labels.ms,
      status: latencyStatus(metrics.p95LatencyMs),
    },
    {
      key: 'err',
      label: labels.errorRate,
      value: metrics.errorRatePct.toFixed(
        metrics.errorRatePct > 0 && metrics.errorRatePct < 10 ? 1 : 0,
      ),
      unit: '%',
      status: errorStatus(metrics.errorRatePct),
    },
    {
      key: 'healthy',
      label: labels.healthy,
      value: `${metrics.healthy[0]}/${metrics.healthy[1]}`,
      status: healthyStatus(metrics.healthy),
    },
  ];
  return (
    <dl className={styles.strip}>
      {tiles.map((t) => (
        <div
          key={t.key}
          className={[styles.tile, t.status !== 'ok' && styles[t.status]].filter(Boolean).join(' ')}
          data-metric={t.key}
          data-status={t.status}
        >
          <dt className={styles.label}>{t.label}</dt>
          <dd className={styles.value}>
            {t.value}
            {t.unit && <span className={styles.unit}>{t.unit}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
