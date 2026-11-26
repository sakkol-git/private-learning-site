import { SITE_NAME } from '../config';
import styles from './AppShell.module.css';

export function Logo() {
  return (
    <span className={styles.logo}>
      <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path d="M16 4 27 10 16 16 5 10z" fill="var(--accent)" />
        <path d="M5 10v12l11 6V16z" fill="color-mix(in srgb, var(--accent) 88%, #000)" />
        <path d="M27 10v12l-11 6V16z" fill="color-mix(in srgb, var(--accent) 70%, #000)" />
      </svg>
      <span className={styles.wordmark}>{SITE_NAME}</span>
    </span>
  );
}
