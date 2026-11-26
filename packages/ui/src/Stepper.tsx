import type { CSSProperties } from 'react';
import { Icon } from './Icon';
import styles from './Stepper.module.css';

interface StepperProps {
  steps: { id: string; short: string; title: string }[];
  current: number;
  furthest: number;
  countLabel: string;
  goToLabel: (index: number, title: string) => string;
  onSelect: (index: number) => void;
}

export function Stepper({
  steps,
  current,
  furthest,
  countLabel,
  goToLabel,
  onSelect,
}: StepperProps) {
  const pct = steps.length > 1 ? (current / (steps.length - 1)) * 100 : 0;
  const currentStep = steps[current];
  return (
    <div className={styles.wrap}>
      <label className={styles.picker}>
        {countLabel}
        <select value={current} onChange={(e) => onSelect(Number(e.target.value))}>
          {steps.map((s, i) => (
            <option value={i} key={s.id}>
              {i !== current && i <= furthest ? '✓ ' : ''}
              {i + 1} · {s.title}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.rail} style={{ '--k': pct / 100 } as CSSProperties}>
        <span className={styles.track} aria-hidden="true" />
        <span className={styles.fill} aria-hidden="true" />
        <ol className={styles.list}>
          {steps.map((s, i) => {
            const state = i === current ? styles.current : i <= furthest ? styles.visited : '';
            return (
              <li key={s.id} className={styles.item}>
                <button
                  type="button"
                  className={[styles.circle, state].filter(Boolean).join(' ')}
                  aria-label={goToLabel(i, s.title)}
                  aria-current={i === current ? 'step' : undefined}
                  onClick={() => onSelect(i)}
                >
                  {i !== current && i <= furthest ? <Icon name="check" size={16} /> : i + 1}
                </button>
              </li>
            );
          })}
        </ol>
        {currentStep && (
          <span className={styles.caption} aria-hidden="true">
            {currentStep.short}
          </span>
        )}
      </div>
      <span className={styles.count}>{countLabel}</span>
    </div>
  );
}
