export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'ss:theme';

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readThemeMode(storage: Storage | null = safeStorage()): ThemeMode {
  try {
    const value = storage?.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): 'light' | 'dark' {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light';
  return mode;
}

/** Applies a mode to <html> and persists it. "system" clears the override. */
export function applyThemeMode(
  mode: ThemeMode,
  root: HTMLElement = document.documentElement,
  storage: Storage | null = safeStorage(),
): void {
  try {
    if (mode === 'system') storage?.removeItem(STORAGE_KEY);
    else storage?.setItem(STORAGE_KEY, mode);
  } catch {
    /* storage unavailable: the mode still applies for this page view */
  }
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
}
