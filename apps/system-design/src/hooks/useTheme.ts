import { applyThemeMode, readThemeMode, resolveTheme } from '@ss/theme';
import { useCallback, useSyncExternalStore } from 'react';

const query = '(prefers-color-scheme: dark)';
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia(query);
  mq.addEventListener('change', cb);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener('change', cb);
  };
}

const snapshot = () => resolveTheme(readThemeMode(), window.matchMedia(query).matches);

/** Follows the system until the learner toggles; the choice is saved. */
export function useTheme(): ['light' | 'dark', () => void] {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'light' as const);
  const toggle = useCallback(() => {
    applyThemeMode(snapshot() === 'dark' ? 'light' : 'dark');
    for (const cb of listeners) cb();
  }, []);
  return [theme, toggle];
}
