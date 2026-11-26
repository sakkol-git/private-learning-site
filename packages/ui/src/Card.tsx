import type { ReactNode } from 'react';
import styles from './Card.module.css';

interface CardProps {
  title?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
  labelledBy?: string;
}

export function Card({ title, aside, className, children, labelledBy }: CardProps) {
  return (
    <section
      className={[styles.card, className].filter(Boolean).join(' ')}
      aria-labelledby={labelledBy}
    >
      {(title || aside) && (
        <div className={styles.head}>
          {title && (
            <h2 className={styles.title} id={labelledBy}>
              {title}
            </h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}
