import styles from './MetricsStrip.module.css';

export interface MetricTile {
  key: string;
  label: string;
  value: string;
  unit?: string;
  status: 'ok' | 'warn' | 'fail';
}

/** A row of number tiles. Each course decides what the tiles are and when they turn warn/fail. */
export function MetricsStrip({ tiles }: { tiles: MetricTile[] }) {
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
