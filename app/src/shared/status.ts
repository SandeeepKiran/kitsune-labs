// Status is never colour-only: every Pass / Warn / Fail shows an icon and a word.
import { el } from './dom.ts';

export type Status = 'pass' | 'warn' | 'fail';

const ICONS: Record<Status, string> = { pass: '✓', warn: '⚠', fail: '✕' };
const WORDS: Record<Status, string> = { pass: 'Pass', warn: 'Warn', fail: 'Fail' };

export function statusChip(status: Status, word = WORDS[status]): HTMLElement {
  return el('span', { class: `status status--${status}` },
    el('span', { 'aria-hidden': 'true' }, ICONS[status]),
    word,
  );
}
