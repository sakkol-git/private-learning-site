import type { ReactNode } from 'react';
import styles from './Chip.module.css';

export function Chip({
  tone = 'plain',
  children,
}: {
  tone?: 'plain' | 'accent' | 'warn' | 'fail';
  children: ReactNode;
}) {
  return (
    <span className={[styles.chip, tone !== 'plain' && styles[tone]].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
