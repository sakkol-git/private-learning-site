import styles from './MetricsStrip.module.css';

export interface MetricTile {
  key: string;
  label: string;
  value: string;
  unit?: string;
  status: 'ok' | 'warn' | 'fail';
}

/** A row of number tiles. Each course decides what the tiles are and when they turn warn/fail. */
export function MetricsStrip({
  tiles,
  before,
  beforeLabel,
}: {
  tiles: MetricTile[];
  before: MetricTile[];
  beforeLabel: string;
}) {
  return (
    <dl className={styles.strip}>
      {tiles.map((t) => {
        const previous = before.find((tile) => tile.key === t.key);
        return (
          <div
            key={t.key}
            className={[styles.tile, t.status !== 'ok' && styles[t.status]]
              .filter(Boolean)
              .join(' ')}
            data-metric={t.key}
            data-status={t.status}
            data-changed={
              previous &&
              (previous.value !== t.value ||
                previous.status !== t.status ||
                previous.unit !== t.unit)
            }
          >
            <dt className={styles.label}>
              {t.label}
              {previous && (
                <span className={styles.before}>
                  {beforeLabel} {previous.value}
                  {previous.unit}
                </span>
              )}
            </dt>
            <dd className={styles.value}>
              {t.value}
              {t.unit && <span className={styles.unit}>{t.unit}</span>}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
