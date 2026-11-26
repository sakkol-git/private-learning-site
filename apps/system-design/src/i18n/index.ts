import en from './en.json';

export type MessageKey = keyof typeof en;
export type Locale = 'en' | 'km';

const messages: Record<MessageKey, string> = en;

/** Looks up a UI string and fills {placeholders}. Khmer will plug in here later. */
export function t(key: MessageKey, vars: Record<string, string | number> = {}): string {
  return messages[key].replace(/\{(\w+)\}/g, (_, name: string) =>
    String(vars[name] ?? `{${name}}`),
  );
}
