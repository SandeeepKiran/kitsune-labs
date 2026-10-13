// Ctrl+K (Cmd+K on a Mac) command palette: jump to any tool or action from the keyboard.
// ARIA pattern: a combobox input that controls a listbox of options.
import { el } from './dom.ts';

export interface Command {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  run: () => void;
}

type CommandSource = () => Command[];

let dialog: HTMLDialogElement | null = null;
const sources: CommandSource[] = [];

export function registerCommands(source: CommandSource): void {
  sources.push(source);
}

export function installPalette(): void {
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (dialog?.open) dialog.close();
      else openPalette();
    }
  });
}

export function openPalette(): void {
  (dialog ??= buildPalette()).showModal();
  const input = dialog.querySelector('input')!;
  input.value = '';
  render('');
  input.focus();
}

function allCommands(): Command[] {
  return sources.flatMap((source) => source());
}

function matches(command: Command, query: string): boolean {
  const haystack = `${command.label} ${command.group} ${command.keywords ?? ''}`.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => haystack.includes(word));
}

let visible: Command[] = [];
let active = 0;

function buildPalette(): HTMLDialogElement {
  const input = el('input', {
    class: 'palette__input', type: 'text', role: 'combobox', 'aria-expanded': 'true',
    'aria-controls': 'palette-list', 'aria-autocomplete': 'list', 'aria-label': 'Search tools and actions',
    placeholder: 'Jump to a tool or action…', autocomplete: 'off', spellcheck: 'false',
  });
  const list = el('ul', { id: 'palette-list', class: 'palette__list', role: 'listbox', 'aria-label': 'Results' });
  const box = el('dialog', { class: 'palette', 'aria-label': 'Command palette', 'data-testid': 'palette' },
    el('div', { class: 'palette__panel' },
      input,
      list,
      el('p', { class: 'palette__help' }, '↑ ↓ to move · Enter to open · Esc to close'),
    ),
  );
  document.body.append(box);

  input.addEventListener('input', () => render(input.value));
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!visible.length) return;
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length;
      highlight();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(visible[active]);
    }
  });
  list.addEventListener('click', (event) => {
    const option = (event.target as HTMLElement).closest<HTMLElement>('[role="option"]');
    if (option) choose(visible[Number(option.dataset.index)]);
  });
  box.addEventListener('click', (event) => {
    if (event.target === box) box.close();
  });
  return box;
}

function render(query: string): void {
  if (!dialog) return;
  const list = dialog.querySelector('ul')!;
  visible = allCommands().filter((command) => matches(command, query));
  active = 0;
  list.replaceChildren(
    ...visible.map((command, index) =>
      el('li', { id: `cmd-${command.id}`, role: 'option', class: 'palette__option', 'data-index': String(index) },
        el('span', {}, command.label),
        el('span', { class: 'palette__group' }, command.group),
      ),
    ),
  );
  if (!visible.length) list.append(el('li', { class: 'palette__empty' }, 'No match. Try a tool name.'));
  highlight();
}

function highlight(): void {
  if (!dialog) return;
  const input = dialog.querySelector('input')!;
  dialog.querySelectorAll<HTMLElement>('[role="option"]').forEach((option, index) => {
    const selected = index === active;
    option.setAttribute('aria-selected', String(selected));
    if (selected) option.scrollIntoView({ block: 'nearest' });
  });
  if (visible[active]) input.setAttribute('aria-activedescendant', `cmd-${visible[active].id}`);
  else input.removeAttribute('aria-activedescendant');
}

function choose(command: Command | undefined): void {
  if (!command || !dialog) return;
  dialog.close();
  command.run();
}
