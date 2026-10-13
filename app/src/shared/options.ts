// Small labelled form controls for the tool settings area under the input.
import { el } from './dom.ts';

export interface Select {
  element: HTMLElement;
  input: HTMLSelectElement;
  readonly value: string;
  setChoices: (choices: [string, string][], keep?: boolean) => void;
}

export function selectOption(id: string, label: string, choices: [string, string][], value = choices[0]?.[0] ?? ''): Select {
  const input = el('select', { id, class: 'field field--compact', 'data-testid': id });
  const setChoices = (list: [string, string][], keep = true) => {
    const previous = input.value;
    input.replaceChildren(...list.map(([v, text]) => el('option', { value: v }, text)));
    if (keep && list.some(([v]) => v === previous)) input.value = previous;
  };
  setChoices(choices, false);
  input.value = value;
  return {
    element: el('label', { class: 'option', for: id }, label, input),
    input,
    get value() { return input.value; },
    setChoices,
  };
}

export interface Check {
  element: HTMLElement;
  input: HTMLInputElement;
  readonly checked: boolean;
}

export function checkOption(id: string, label: string, checked = false): Check {
  const input = el('input', { type: 'checkbox', id, checked, 'data-testid': id });
  return {
    element: el('label', { class: 'check' }, input, el('span', {}, label)),
    input,
    get checked() { return input.checked; },
  };
}

export interface Text {
  element: HTMLElement;
  input: HTMLInputElement | HTMLTextAreaElement;
  readonly value: string;
}

export function textOption(id: string, label: string, value = '', multiline = false, placeholder = ''): Text {
  const input = multiline
    ? el('textarea', { id, class: 'field field--compact', rows: '3', placeholder, 'data-testid': id })
    : el('input', { id, class: 'field field--compact', type: 'text', value, placeholder, 'data-testid': id });
  if (multiline) input.value = value;
  return {
    element: el('label', { class: 'option', for: id }, label, input),
    input,
    get value() { return input.value.trim(); },
  };
}

export function optionGrid(...children: (Node | null)[]): HTMLElement {
  return el('div', { class: 'option-grid' }, ...children);
}

export function optionChecks(title: string, ...checks: Check[]): HTMLElement {
  return el('fieldset', { class: 'option-fieldset' },
    el('legend', { class: 'option-title' }, title),
    el('div', { class: 'option-checks' }, ...checks.map((c) => c.element)));
}
