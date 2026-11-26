import { Fragment, type ReactNode } from 'react';

/**
 * Renders lesson text that may contain <b> and <code> only. Builds React
 * elements from the tags instead of injecting HTML, so nothing else can run.
 */
export function RichText({ text }: { text: string }) {
  const tokens = text.split(/(<\/?(?:b|code)>)/);
  const root: ReactNode[] = [];
  const stack: { tag: 'b' | 'code'; children: ReactNode[] }[] = [];
  const out = () => stack[stack.length - 1]?.children ?? root;
  tokens.forEach((token, i) => {
    const open = token.match(/^<(b|code)>$/);
    const close = token.match(/^<\/(b|code)>$/);
    if (open) stack.push({ tag: open[1] as 'b' | 'code', children: [] });
    else if (close && stack.length > 0) {
      const done = stack.pop();
      if (done) {
        const Tag = done.tag;
        out().push(<Tag key={i}>{done.children}</Tag>);
      }
    } else if (token) out().push(<Fragment key={i}>{token}</Fragment>);
  });
  while (stack.length > 0) {
    const open = stack.pop();
    if (open) out().push(...open.children);
  }
  return <>{root}</>;
}
