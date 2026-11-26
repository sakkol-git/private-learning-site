import { describe, expect, it } from 'vitest';
import { isSearchShortcut, keyToCommand } from './keyboard';

const key = (k: string, extra: Partial<Parameters<typeof keyToCommand>[0]> = {}) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  target: null,
  ...extra,
});

describe('keyboard', () => {
  it('maps arrows, R and Space', () => {
    expect(keyToCommand(key('ArrowRight'))).toBe('next');
    expect(keyToCommand(key('ArrowLeft'))).toBe('prev');
    expect(keyToCommand(key('r'))).toBe('replay');
    expect(keyToCommand(key(' '))).toBe('togglePause');
    expect(keyToCommand(key('x'))).toBeNull();
  });

  it('ignores modified keys and typing in fields', () => {
    expect(keyToCommand(key('ArrowRight', { metaKey: true }))).toBeNull();
    const input = { tagName: 'INPUT', isContentEditable: false } as unknown as EventTarget;
    expect(keyToCommand(key('r', { target: input }))).toBeNull();
  });

  it('leaves Space alone on buttons so they still activate', () => {
    const button = { tagName: 'BUTTON', isContentEditable: false } as unknown as EventTarget;
    expect(keyToCommand(key(' ', { target: button }))).toBeNull();
  });

  it('detects the search shortcut', () => {
    expect(isSearchShortcut({ key: 'k', metaKey: true, ctrlKey: false })).toBe(true);
    expect(isSearchShortcut({ key: 'K', metaKey: false, ctrlKey: true })).toBe(true);
    expect(isSearchShortcut({ key: 'k', metaKey: false, ctrlKey: false })).toBe(false);
  });
});
