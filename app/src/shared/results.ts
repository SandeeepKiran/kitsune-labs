// Building blocks for the Results tile: sortable tables, finding cards, an annotated
// transcript and the answer-key check. All visitor text goes in as text, never as HTML.
import type { KeyConversation } from './answer-key.ts';
import type { Finding } from './analysis.ts';
import { el } from './dom.ts';
import { statusChip, type Status } from './status.ts';
import { formatClock, type Turn } from './transcript.ts';

export const severityStatus = (severity: string): Status => (severity === 'high' ? 'fail' : 'warn');

export function aiChip(text = 'AI-assisted'): HTMLElement {
  return el('span', { class: 'chip chip--ai', 'data-testid': 'ai-label' }, '✦ ', text);
}

export function rulesChip(text = 'Rules · no AI'): HTMLElement {
  return el('span', { class: 'chip' }, text);
}

export function section(title: string, ...children: (Node | string | null | false)[]): HTMLElement {
  return el('section', { class: 'result-section' }, el('h3', { class: 'result-section__title' }, title), ...children);
}

export function stats(items: { label: string; value: string | number; tone?: Status }[]): HTMLElement {
  return el('dl', { class: 'stats' }, ...items.map((item) =>
    el('div', { class: `stats__item${item.tone ? ` stats__item--${item.tone}` : ''}` },
      el('dt', {}, item.label),
      el('dd', {}, String(item.value)),
    )));
}

// -- table -------------------------------------------------------------------------

export interface TableOptions {
  columns: string[];
  rows: Record<string, unknown>[];
  maxRows?: number;
  mono?: string[];          // columns shown in DM Mono (IDs, numbers)
  caption?: string;
  testId?: string;
}

/** A dense table. Click a column header to sort; click again to reverse. */
export function dataTable(options: TableOptions): HTMLElement {
  const { columns, maxRows = 200 } = options;
  let rows = [...options.rows];
  let sortColumn = '';
  let ascending = true;
  const tbody = el('tbody');
  const headerCells = columns.map((column) => {
    const button = el('button', { type: 'button', class: 'th-sort' }, column);
    const th = el('th', { scope: 'col', 'aria-sort': 'none' }, button);
    button.addEventListener('click', () => {
      ascending = sortColumn === column ? !ascending : true;
      sortColumn = column;
      rows = sortRows(rows, column, ascending);
      headerCells.forEach((cell) => cell.setAttribute('aria-sort', 'none'));
      th.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
      fill();
    });
    return th;
  });
  const table = el('table', { class: 'data-table', 'data-testid': options.testId },
    options.caption ? el('caption', { class: 'visually-hidden' }, options.caption) : null,
    el('thead', {}, el('tr', {}, ...headerCells)),
    tbody,
  );
  const note = el('p', { class: 'bento__hint' });
  fill();
  return el('div', { class: 'table-wrap' }, table, note);

  function fill(): void {
    tbody.replaceChildren(...rows.slice(0, maxRows).map((row) => el('tr', {},
      ...columns.map((column) => el('td', { class: options.mono?.includes(column) ? 'mono' : undefined }, cellText(row[column]))))));
    note.textContent = rows.length > maxRows ? `Showing ${maxRows} of ${rows.length} rows. The export has all of them.` : '';
  }
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  return String(value);
}

function sortRows(rows: Record<string, unknown>[], column: string, ascending: boolean): Record<string, unknown>[] {
  const direction = ascending ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[column];
    const y = b[column];
    const nx = Number(x);
    const ny = Number(y);
    if (x !== '' && y !== '' && !Number.isNaN(nx) && !Number.isNaN(ny)) return (nx - ny) * direction;
    return cellText(x).localeCompare(cellText(y)) * direction;
  });
}

// -- findings ----------------------------------------------------------------------

export function findingCard(finding: Finding, stamp = true): HTMLElement {
  const status = severityStatus(finding.severity);
  const card = el('article', { class: `finding finding--${status}`, 'data-testid': 'finding', 'data-type': finding.type },
    el('div', { class: 'finding__head' },
      statusChip(status),
      el('span', { class: 'chip mono' }, `turn ${finding.turn}`),
      el('span', { class: 'chip mono' }, finding.type),
      finding.source === 'ai' ? aiChip() : rulesChip('Rules'),
      finding.confirmed ? aiChip('AI agrees') : null,
    ),
    el('h4', { class: 'finding__title' }, `${finding.title} · ${finding.severity} severity`),
    finding.expected && finding.actual
      ? el('p', { class: 'route' },
          el('span', { class: 'chip mono' }, finding.expected),
          el('span', { class: 'route__arrow', 'aria-label': 'routed to' }, '→'),
          el('span', { class: 'chip mono chip--ink' }, finding.actual))
      : null,
    el('p', { class: 'finding__evidence' }, finding.evidence),
    finding.fix ? el('p', { class: 'finding__fix' }, el('strong', {}, 'Fix hint: '), finding.fix) : null,
  );
  // The hanko stamp marks Fail findings. It slams in once (off under reduced motion).
  if (stamp && status === 'fail') card.append(el('span', { class: 'hanko', 'aria-hidden': 'true' }, 'Fail'));
  return card;
}

export function findingList(findings: Finding[]): HTMLElement {
  if (!findings.length) {
    return el('div', { class: 'finding finding--pass', 'data-testid': 'no-findings' },
      statusChip('pass'), el('p', { class: 'finding__evidence' }, 'No bugs found. This conversation looks clean.'));
  }
  return el('div', { class: 'findings' }, ...findings.map((f) => findingCard(f)));
}

/** The conversation, turn by turn, with each finding marked on its turn. */
export function annotatedTurns(turns: Turn[], findings: Finding[] = []): HTMLElement {
  const byTurn = new Map<number, Finding[]>();
  for (const f of findings) byTurn.set(f.turn, [...(byTurn.get(f.turn) ?? []), f]);
  const list = el('ol', { class: 'turns' });
  for (const turn of turns.slice(0, 400)) {
    const marks = byTurn.get(turn.index) ?? [];
    const worst = marks.some((m) => m.severity === 'high') ? 'fail' : marks.length ? 'warn' : '';
    list.append(el('li', { class: `turn turn--${turn.role}${worst ? ` turn--${worst}` : ''}`, 'data-turn': String(turn.index) },
      el('span', { class: 'turn__time mono' }, turn.seconds === null ? `#${turn.index}` : formatClock(turn.seconds)),
      el('span', { class: 'turn__who' }, turn.speaker),
      el('span', { class: 'turn__text mono' }, turn.text),
      marks.length
        ? el('span', { class: 'turn__marks' }, ...marks.map((m) => statusChip(severityStatus(m.severity), m.title)))
        : null,
    ));
  }
  return list;
}

// -- answer key --------------------------------------------------------------------

/** "Rules found 2 of 2 planted bugs." Only shown when the input is a Mousy sample. */
export function answerKeyCheck(found: Finding[], entry: KeyConversation): HTMLElement {
  const want = entry.bugs.map((b) => `${b.type}@${b.turn}`);
  const got = new Set(found.map((f) => `${f.type}@${f.turn}`));
  const hits = want.filter((w) => got.has(w)).length;
  const extra = found.filter((f) => !want.includes(`${f.type}@${f.turn}`)).length;
  const status: Status = hits === want.length && extra === 0 ? 'pass' : hits === want.length ? 'warn' : 'fail';
  const summary = want.length
    ? `Found ${hits} of ${want.length} planted bug${want.length === 1 ? '' : 's'}${extra ? `, plus ${extra} more` : ''}.`
    : extra ? `The answer key has no planted bugs here, but ${extra} finding${extra === 1 ? '' : 's'} came up.` : 'No planted bugs, and none found.';
  return el('div', { class: 'key-check', 'data-testid': 'key-check' },
    statusChip(status, status === 'pass' ? 'Matches answer key' : status === 'warn' ? 'Extra findings' : 'Missed some'),
    el('span', {}, `${entry.conversation_id}: ${summary}`),
  );
}
