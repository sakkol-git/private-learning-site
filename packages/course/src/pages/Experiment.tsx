import { Button } from '@ss/ui';
import { useSearchParams } from 'react-router';
import { useCourse } from '../config';
import type { LessonExperiment } from '@ss/lesson-engine';
import { useState } from 'react';
import styles from './Experiment.module.css';

export function Experiment({ experiment }: { experiment: LessonExperiment }) {
  const { t } = useCourse();
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('frame'));
  const index =
    Number.isInteger(requested) && requested >= 1 && requested <= experiment.frames.length
      ? requested - 1
      : 0;
  const [shared, setShared] = useState<{ url: string; copied: boolean } | null>(null);
  const link = new URL(window.location.pathname, window.location.origin);
  link.searchParams.set('frame', String(index + 1));
  link.hash = 'experiment';
  const url = link.href;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setShared({ url, copied: true });
    } catch {
      setShared({ url, copied: false });
    }
  }
  const frame = experiment.frames[index];
  if (!frame) return null;
  const values = experiment.frames.flatMap((f) => f.rows.map((row) => row.value));
  const min = Math.min(0, ...values);
  const span = Math.max(0, ...values) - min || 1;
  const zero = (-100 * min) / span;
  return (
    <figure id="experiment" className={styles.figure}>
      <figcaption>{experiment.title}</figcaption>
      <label>
        {experiment.control}
        <select
          value={index}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            next.set('frame', String(Number(e.target.value) + 1));
            setShared(null);
            setParams(next, { replace: true, preventScrollReset: true });
          }}
        >
          {experiment.frames.map((f, i) => (
            <option key={f.label} value={i}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <dl>
        {frame.rows.map((row) => (
          <div key={row.label} className={styles.row}>
            <dt>{row.label}</dt>
            <dd>
              {row.value.toLocaleString('en-US', { maximumFractionDigits: 2 })} {experiment.unit}
            </dd>
            <span className={styles.track} aria-hidden="true">
              <i style={{ left: zero + '%' }} />
              <b
                data-negative={row.value < 0}
                style={{
                  left: Math.min(zero, zero + (row.value * 100) / span) + '%',
                  width: (Math.abs(row.value) * 100) / span + '%',
                }}
              />
            </span>
          </div>
        ))}
      </dl>
      <p>{frame.caption}</p>
      <div className={styles.share}>
        <Button size="small" onClick={copy}>
          {t('experiment.copy')}
        </Button>
        <span role="status">
          {shared?.url === url && shared.copied ? t('experiment.copied') : ''}
        </span>
        {shared?.url === url && !shared.copied && (
          <label>
            {t('experiment.manual')}
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
          </label>
        )}
      </div>
    </figure>
  );
}
