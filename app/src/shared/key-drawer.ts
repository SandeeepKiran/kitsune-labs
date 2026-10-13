// AI key drawer: slides in from the right. A native <dialog> gives us the focus trap,
// Esc to close and the inert page behind it for free.
import { el } from './dom.ts';
import {
  PROVIDERS, PROVIDER_IDS, type Provider,
  forgetAllKeys, getModel, getProvider, hasKey, isRemembered, keyProblem, saveKey, setModel, setProvider,
} from './key-store.ts';

let drawer: HTMLDialogElement | null = null;

export function openKeyDrawer(): void {
  (drawer ??= buildDrawer()).showModal();
  refresh();
  drawer.querySelector<HTMLInputElement>('input[name="provider"]:checked')?.focus();
}

function buildDrawer(): HTMLDialogElement {
  const dialog = el('dialog', { class: 'drawer', 'aria-labelledby': 'drawer-title', 'data-testid': 'key-drawer' });
  const providerOptions = PROVIDER_IDS.map((id) =>
    el('label', { class: 'provider-option' },
      el('input', { type: 'radio', name: 'provider', value: id }),
      el('span', { class: 'provider-option__name' }, PROVIDERS[id].label),
      el('span', { class: 'provider-option__company' }, PROVIDERS[id].company),
    ),
  );

  const keyInput = el('input', {
    id: 'ai-key', class: 'field mono', type: 'password', autocomplete: 'off', spellcheck: 'false',
    autocapitalize: 'off', 'data-1p-ignore': true, 'data-lpignore': 'true', 'aria-describedby': 'key-status',
  });
  const showButton = el('button', { type: 'button', class: 'btn btn--quiet', 'aria-pressed': 'false' }, 'Show');
  const remember = el('input', { type: 'checkbox', id: 'remember-key' });
  const keyLink = el('a', { class: 'drawer__link', target: '_blank', rel: 'noopener noreferrer' });
  const status = el('p', { id: 'key-status', class: 'drawer__status', role: 'status' });
  const saveButton = el('button', { type: 'submit', class: 'btn btn--ink' }, 'Seal key');
  const forgetButton = el('button', { type: 'button', class: 'btn btn--quiet', 'data-action': 'forget' }, 'Forget key');
  const sendsTo = el('li', { 'data-testid': 'sends-to' });
  const modelList = el('datalist', { id: 'model-options' });
  const modelInput = el('input', {
    id: 'ai-model', class: 'field mono', type: 'text', list: 'model-options', autocomplete: 'off', spellcheck: 'false',
    autocapitalize: 'off', 'aria-describedby': 'model-hint',
  });
  const modelHint = el('p', { id: 'model-hint', class: 'drawer__hint drawer__hint--flush' });
  modelInput.addEventListener('change', () => {
    setModel(selectedProvider(), modelInput.value);
    refresh();
  });

  const form = el('form', { class: 'drawer__panel', novalidate: true },
    el('div', { class: 'drawer__head' },
      el('h2', { id: 'drawer-title' }, 'AI key'),
      el('button', { type: 'button', class: 'btn btn--icon', 'aria-label': 'Close', 'data-action': 'close' }, '✕'),
    ),
    el('p', { class: 'drawer__intro' },
      'Optional. Every tool that can work without AI still works with no key.'),
    el('fieldset', { class: 'provider-pick' }, el('legend', {}, 'Provider'), ...providerOptions),
    el('label', { for: 'ai-key', class: 'field-label' }, 'API key'),
    el('div', { class: 'key-row' }, keyInput, showButton),
    keyLink,
    el('label', { class: 'check' }, remember, el('span', {}, 'Remember on this device')),
    el('p', { class: 'drawer__hint' },
      'Off: the key is kept only in this tab (sessionStorage) and is gone when you close it. ',
      'On: it stays in this browser (localStorage) until you press Forget key.'),
    el('div', { class: 'drawer__actions' }, saveButton, forgetButton),
    status,
    el('label', { for: 'ai-model', class: 'field-label' }, 'Model'),
    modelInput,
    modelList,
    modelHint,
    el('section', { class: 'drawer__privacy', 'aria-labelledby': 'privacy-title' },
      el('h3', { id: 'privacy-title' }, 'Where your key goes'),
      el('ul', {},
        el('li', {}, 'It stays in this browser. This site has no server.'),
        sendsTo,
        el('li', {}, 'No proxy, no analytics, no logs. The key is never shown or printed.'),
      ),
    ),
  );
  dialog.append(form);
  document.body.append(dialog);

  const selectedProvider = (): Provider =>
    (form.querySelector<HTMLInputElement>('input[name="provider"]:checked')?.value as Provider) ?? 'gemini';

  form.addEventListener('change', (event) => {
    const target = event.target as HTMLInputElement;
    if (target.name === 'provider') {
      setProvider(target.value as Provider);
      keyInput.value = '';
      refresh();
    }
  });
  showButton.addEventListener('click', () => {
    const showing = keyInput.type === 'text';
    keyInput.type = showing ? 'password' : 'text';
    showButton.textContent = showing ? 'Show' : 'Hide';
    showButton.setAttribute('aria-pressed', String(!showing));
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const problem = keyProblem(keyInput.value);
    if (problem) {
      setStatus(problem, 'warn');
      keyInput.focus();
      return;
    }
    try {
      saveKey(selectedProvider(), keyInput.value, remember.checked);
    } catch (error) {
      setStatus((error as Error).message, 'warn');
      return;
    }
    keyInput.value = '';
    refresh();
    setStatus(remember.checked ? 'Key sealed on this device.' : 'Key sealed in this tab.', 'pass');
  });
  forgetButton.addEventListener('click', () => {
    forgetAllKeys();
    keyInput.value = '';
    remember.checked = false;
    refresh();
    setStatus('All keys removed from this browser.', 'pass');
  });
  dialog.querySelector('[data-action="close"]')?.addEventListener('click', () => dialog.close());
  // Click on the dimmed backdrop (outside the panel) closes the drawer.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('close', () => {
    keyInput.value = '';
    keyInput.type = 'password';
    showButton.textContent = 'Show';
    status.textContent = '';
  });

  return dialog;

  function setStatus(text: string, tone: 'pass' | 'warn'): void {
    status.textContent = `${tone === 'pass' ? '✓' : '⚠'} ${text}`;
    status.dataset.tone = tone;
  }
}

function refresh(): void {
  if (!drawer) return;
  const provider = getProvider();
  const info = PROVIDERS[provider];
  const radio = drawer.querySelector<HTMLInputElement>(`input[name="provider"][value="${provider}"]`);
  if (radio) radio.checked = true;
  const keyInput = drawer.querySelector<HTMLInputElement>('#ai-key')!;
  keyInput.placeholder = hasKey(provider) ? 'A key is sealed. Paste a new one to replace it.' : `Paste your ${info.label} key`;
  drawer.querySelector<HTMLInputElement>('#remember-key')!.checked = isRemembered(provider);
  const link = drawer.querySelector<HTMLAnchorElement>('.drawer__link')!;
  link.href = info.keyPage;
  link.textContent = `Get a ${info.label} key from ${info.company} ↗`;
  drawer.querySelector('[data-testid="sends-to"]')!.textContent =
    `It is sent only to ${info.company}, and only when you run an AI check.`;
  drawer.querySelector<HTMLButtonElement>('[data-action="forget"]')!.disabled =
    !PROVIDER_IDS.some((id) => hasKey(id));
  drawer.querySelector<HTMLInputElement>('#ai-model')!.value = getModel(provider);
  drawer.querySelector('#model-options')!.replaceChildren(...info.models.map((m) => el('option', { value: m })));
  drawer.querySelector('#model-hint')!.textContent =
    `Default: ${info.defaultModel}. Type another ${info.label} model name to use it. Clear the box to go back.`;
}
