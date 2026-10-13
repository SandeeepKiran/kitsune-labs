// Run log: short lines with real numbers ("Parsed 7 turns · 0 AI calls · 3 ms").
// The list is a polite live region so screen readers hear each new line.
import { el } from './dom.ts';
import type { Status } from './status.ts';

const ICONS: Record<Status | 'info', string> = { info: '·', pass: '✓', warn: '⚠', fail: '✕' };

export interface RunLog {
  element: HTMLElement;
  add: (message: string, tone?: Status | 'info') => void;
  clear: () => void;
}

export function createRunLog(): RunLog {
  const list = el('ol', { class: 'run-log', 'aria-live': 'polite', 'data-testid': 'run-log' });
  const started = performance.now();
  const empty = () => el('li', { class: 'run-log__empty' }, 'Nothing has run yet.');
  list.append(empty());

  return {
    element: list,
    add(message, tone = 'info') {
      list.querySelector('.run-log__empty')?.remove();
      const elapsed = ((performance.now() - started) / 1000).toFixed(1).padStart(5, ' ');
      list.append(el('li', { class: `run-log__line run-log__line--${tone}` },
        el('span', { class: 'run-log__time' }, `${elapsed}s`),
        el('span', { 'aria-hidden': 'true' }, ICONS[tone]),
        el('span', {}, message),
      ));
      list.scrollTop = list.scrollHeight;
    },
    clear() {
      list.replaceChildren(empty());
    },
  };
}
