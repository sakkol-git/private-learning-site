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
  hint: { next: string; replay: string; pause: string };
}

interface StepCardProps<A extends string> {
  step: Step<unknown, A>;
  isFirst: boolean;
  nextShort: string | undefined;
  labels: StepCardLabels;
  onBack: () => void;
  onNext: () => void;
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
  onBack,
  onNext,
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
