export type StepCommand = 'next' | 'prev' | 'replay' | 'togglePause';

interface KeyLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  target: EventTarget | null;
}

function isTyping(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== 'string') return false;
  const el = target as HTMLElement;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/** Maps a key press to a lesson command: ← → step, R replays, Space pauses. */
export function keyToCommand(e: KeyLike): StepCommand | null {
  if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return null;
  switch (e.key) {
    case 'ArrowRight':
      return 'next';
    case 'ArrowLeft':
      return 'prev';
    case 'r':
    case 'R':
      return 'replay';
    case ' ':
      return (e.target as HTMLElement | null)?.tagName === 'BUTTON' ? null : 'togglePause';
    default:
      return null;
  }
}

/** True for ⌘K / Ctrl K. */
export function isSearchShortcut(e: Pick<KeyLike, 'key' | 'metaKey' | 'ctrlKey'>): boolean {
  return (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
}
