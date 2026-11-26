import { describe, expect, it } from 'vitest';
import { readThemeMode, resolveTheme } from './theme-mode';

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

describe('theme mode', () => {
  it('defaults to system when nothing is stored', () => {
    expect(readThemeMode(memoryStorage())).toBe('system');
  });

  it('reads a stored override and ignores junk', () => {
    expect(readThemeMode(memoryStorage({ 'ss:theme': 'dark' }))).toBe('dark');
    expect(readThemeMode(memoryStorage({ 'ss:theme': 'purple' }))).toBe('system');
  });

  it('resolves system mode from the media preference', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });
});
