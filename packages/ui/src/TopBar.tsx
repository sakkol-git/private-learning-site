import type { ReactNode } from 'react';
import styles from './TopBar.module.css';

export function TopBar({ start, end }: { start: ReactNode; end: ReactNode }) {
  return (
    <header className={styles.bar}>
      {start}
      <span className={styles.spacer} />
      {end}
    </header>
  );
}
