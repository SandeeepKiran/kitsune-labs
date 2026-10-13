// Nine tails = nine tools. Used as "tools tried n / 9" and as step progress for runs.
import { el, prefersReducedMotion } from './dom.ts';

export function nineTails(lit: number, className = ''): HTMLElement {
  const row = el('span', { class: `tails ${className}`.trim(), 'aria-hidden': 'true' });
  for (let i = 0; i < 9; i += 1) row.append(el('i', { class: i < lit ? 'is-lit' : undefined }));
  return row;
}

export function setLit(row: HTMLElement, lit: number): void {
  row.querySelectorAll('i').forEach((tail, index) => tail.classList.toggle('is-lit', index < lit));
}

/** Light the tails one by one while work runs. Resolves when all nine are lit. */
export async function playTails(row: HTMLElement, stepMs = 70): Promise<void> {
  if (prefersReducedMotion()) {
    setLit(row, 9);
    return;
  }
  for (let lit = 1; lit <= 9; lit += 1) {
    setLit(row, lit);
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
}
