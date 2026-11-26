import type { Step, StepTag } from '@ss/lesson-engine';
import { useEffect, useRef } from 'react';
import { Button } from './Button';
import { Chip } from './Chip';
import { RichText } from './RichText';
import styles from './StepCard.module.css';

export interface StepCardLabels {
  counter: string;
  keyIdea: string;
  back: string;
  next: (short: string) => string;
  finish: string;
  breakIt: string;
  reset: string;
  hint: { next: string; replay: string; pause: string };
  actions: Record<string, string>;
}

interface StepCardProps<A extends string> {
  step: Step<unknown, A>;
  isFirst: boolean;
  nextShort: string | undefined;
  labels: StepCardLabels;
  activeBreak: A | null;
  onBack: () => void;
  onNext: () => void;
  onBreak: (action: A) => void;
  onReset: () => void;
}

const TAG_TONE: Record<StepTag, 'plain' | 'accent' | 'warn' | 'fail'> = {
  PROBLEM: 'fail',
  IDEA: 'plain',
  SOLUTION: 'accent',
  'TRY IT': 'warn',
  'TRADE-OFF': 'plain',
  RECAP: 'accent',
};

export function StepCard<A extends string>({
  step,
  isFirst,
  nextShort,
  labels,
  activeBreak,
  onBack,
  onNext,
  onBreak,
  onReset,
}: StepCardProps<A>) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (document.activeElement === document.body) titleRef.current?.focus({ preventScroll: true });
  }, [step.id]);

  return (
    <article className={styles.card} aria-labelledby={`step-title-${step.id}`}>
      <div className={styles.meta}>
        <span className={styles.counter}>{labels.counter}</span>
        <Chip tone={TAG_TONE[step.tag]}>{step.tag}</Chip>
      </div>
      <h2
        className={styles.title}
        id={`step-title-${step.id}`}
        ref={titleRef}
        tabIndex={-1}
        aria-live="polite"
      >
        {step.title}
      </h2>
      <div className={styles.body}>
        {step.body.map((p) => (
          <p key={p}>
            <RichText text={p} />
          </p>
        ))}
      </div>
      {step.breakActions && step.breakActions.length > 0 && (
        <div className={styles.break} role="group" aria-label={labels.breakIt}>
          <span className={styles.breakLabel}>{labels.breakIt}</span>
          <div className={styles.breakButtons}>
            {step.breakActions.map((action) => (
              <Button
                key={action}
                variant="danger"
                size="small"
                icon="bolt"
                aria-pressed={activeBreak === action}
                onClick={() => onBreak(action)}
              >
                {labels.actions[action] ?? action}
              </Button>
            ))}
            <Button size="small" icon="reset" onClick={onReset} disabled={activeBreak === null}>
              {labels.reset}
            </Button>
          </div>
        </div>
      )}
      {step.keyIdea && (
        <p className={styles.key}>
          <span className={styles.keyLabel}>{labels.keyIdea}</span>
          {step.keyIdea}
        </p>
      )}
      <div className={styles.nav}>
        {!isFirst && (
          <Button icon="arrowLeft" onClick={onBack}>
            {labels.back}
          </Button>
        )}
        <Button variant="primary" onClick={onNext}>
          {nextShort ? labels.next(nextShort) : labels.finish}
        </Button>
      </div>
      <p className={styles.hint} aria-hidden="true">
        <kbd>←</kbd> <kbd>→</kbd> {labels.hint.next} · <kbd>R</kbd> {labels.hint.replay} ·{' '}
        <kbd>Space</kbd> {labels.hint.pause}
      </p>
    </article>
  );
}
