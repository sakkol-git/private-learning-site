import en from './en.json';

/** Shared UI strings. Courses override any of them through their config. */
export type Messages = typeof en;
type MessageKey = keyof Messages;
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function createTranslate(overrides: Partial<Messages> = {}): Translate {
  const messages: Messages = { ...en, ...overrides };
  return (key, vars = {}) =>
    messages[key].replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
}
