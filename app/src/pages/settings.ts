import { mountShell } from '../shared/shell.ts';
import './settings.css';

import { el, fromHtml } from '../shared/dom.ts';
import { sleepingFox } from '../shared/fox.ts';
import {
  forgetAllKeys,
  getModel,
  getProvider,
  hasKey,
  isRemembered,
  KEY_CHANGE_EVENT,
  keyProblem,
  PROVIDERS,
  PROVIDER_IDS,
  saveKey,
  setModel,
  setProvider,
  type Provider,
} from '../shared/key-store.ts';
import {
  getSurfaceTheme,
  getVisualStyle,
  setSurfaceTheme,
  setVisualStyle,
  SURFACE_THEMES,
  SURFACE_THEME_IDS,
  THEME_CHANGE_EVENT,
  VISUAL_STYLES,
  VISUAL_STYLE_IDS,
  type SurfaceTheme,
  type VisualStyle,
} from '../shared/theme.ts';

const main = mountShell('settings');

const hero = el('section', { class: 'tile tile--hero cfg-hero rise', 'aria-labelledby': 'cfg-title' },
  el('div', { class: 'cfg-hero__text' },
    el('p', { class: 'bento__eyebrow' },
      el('span', { class: 'chip chip--ai' }, 'Yae Miko Electro Console'),
      el('span', { class: 'chip' }, 'Browser-local preferences'),
    ),
    el('h1', { id: 'cfg-title' }, 'Settings & Theme Studio'),
    el('p', {},
      'Switch between all three Yae Miko Electro surface themes, pick your Kitsune artwork and animation style, and manage your browser-sealed AI provider keys in one place.'),
  ),
  el('div', { class: 'cfg-hero__art', 'aria-hidden': 'true' }, fromHtml(sleepingFox())),
);

// -- 1. Surface Theme Picker (Options A, B, C) ----------------------------------
const themeCards = SURFACE_THEME_IDS.map((id) => {
  const info = SURFACE_THEMES[id];
  const radio = el('input', {
    type: 'radio',
    name: 'surface-theme',
    value: id,
    checked: getSurfaceTheme() === id,
    'data-testid': `theme-radio-${id}`,
  });
  radio.addEventListener('change', () => {
    if (radio.checked) setSurfaceTheme(id as SurfaceTheme);
  });
  return el('label', { class: 'theme-card' },
    radio,
    el('div', { class: 'theme-card__body' },
      el('div', { class: 'theme-card__top' },
        el('span', { class: 'theme-card__title' }, info.label),
        el('span', { class: 'swatches', 'aria-hidden': 'true' },
          ...info.preview.map((hex) => el('span', { class: 'swatch', style: `background:${hex}` })),
        ),
      ),
      el('p', { class: 'theme-card__desc' }, info.description),
    ),
  );
});

const surfaceSection = el('section', { class: 'tile cfg-section rise', style: '--i:1', 'aria-labelledby': 'surface-title' },
  el('h2', { id: 'surface-title', class: 'cfg-heading' }, 'Surface Theme (Color & Contrast)'),
  el('p', { class: 'cfg-sub' }, 'Switch instantly between Dark Electro Obsidian, Luminous Shrine Tech, and Eclipse Hybrid.'),
  el('div', { class: 'theme-cards' }, ...themeCards),
);

// -- 2. Visual Artwork & Electro Motion Mode (Options A & B) --------------------
const visualCards = VISUAL_STYLE_IDS.map((id) => {
  const info = VISUAL_STYLES[id];
  const radio = el('input', {
    type: 'radio',
    name: 'visual-style',
    value: id,
    checked: getVisualStyle() === id,
    'data-testid': `visual-radio-${id}`,
  });
  radio.addEventListener('change', () => {
    if (radio.checked) setVisualStyle(id as VisualStyle);
  });
  return el('label', { class: 'theme-card' },
    radio,
    el('div', { class: 'theme-card__body' },
      el('div', { class: 'theme-card__top' },
        el('span', { class: 'theme-card__title' }, info.label),
        el('span', { class: 'chip mono' }, info.shortLabel),
      ),
      el('p', { class: 'theme-card__desc' }, info.description),
    ),
  );
});

const visualSection = el('section', { class: 'tile cfg-section rise', style: '--i:2', 'aria-labelledby': 'visual-title' },
  el('h2', { id: 'visual-title', class: 'cfg-heading' }, 'Kitsune Artwork & Electro Motion'),
  el('p', { class: 'cfg-sub' }, 'Choose how the Kitsune emblem and Electro energy render across the home hero and tool headers.'),
  el('div', { class: 'theme-cards' }, ...visualCards),
);

// -- 3. Inline AI Provider & Key Configuration ----------------------------------
const providerRadios = PROVIDER_IDS.map((id) =>
  el('label', { class: 'provider-option' },
    el('input', { type: 'radio', name: 'cfg-provider', value: id }),
    el('span', { class: 'provider-option__name' }, PROVIDERS[id].label),
    el('span', { class: 'provider-option__company' }, PROVIDERS[id].company),
  ),
);

const keyInput = el('input', {
  id: 'cfg-ai-key', class: 'field mono', type: 'password', autocomplete: 'off', spellcheck: 'false',
  autocapitalize: 'off', 'data-1p-ignore': true, 'data-lpignore': 'true', 'aria-describedby': 'cfg-key-status',
});
const showButton = el('button', { type: 'button', class: 'btn btn--quiet', 'aria-pressed': 'false' }, 'Show');
const remember = el('input', { type: 'checkbox', id: 'cfg-remember-key' });
const keyLink = el('a', { class: 'drawer__link', target: '_blank', rel: 'noopener noreferrer' });
const status = el('p', { id: 'cfg-key-status', class: 'drawer__status', role: 'status' });
const saveButton = el('button', { type: 'submit', class: 'btn btn--ink' }, 'Seal key');
const forgetButton = el('button', { type: 'button', class: 'btn btn--quiet' }, 'Forget key');
const modelList = el('datalist', { id: 'cfg-model-options' });
const modelInput = el('input', {
  id: 'cfg-ai-model', class: 'field mono', type: 'text', list: 'cfg-model-options', autocomplete: 'off', spellcheck: 'false',
});
const modelHint = el('p', { class: 'drawer__hint drawer__hint--flush' });

const aiForm = el('form', { novalidate: true },
  el('fieldset', { class: 'provider-pick' }, el('legend', {}, 'Provider'), ...providerRadios),
  el('label', { for: 'cfg-ai-key', class: 'field-label' }, 'API key'),
  el('div', { class: 'key-row' }, keyInput, showButton),
  keyLink,
  el('label', { class: 'check' }, remember, el('span', {}, 'Remember on this device')),
  el('div', { class: 'drawer__actions' }, saveButton, forgetButton),
  status,
  el('label', { for: 'cfg-ai-model', class: 'field-label' }, 'Model'),
  modelInput,
  modelList,
  modelHint,
);

const selectedProvider = (): Provider =>
  (aiForm.querySelector<HTMLInputElement>('input[name="cfg-provider"]:checked')?.value as Provider) ?? 'gemini';

aiForm.addEventListener('change', (event) => {
  const target = event.target as HTMLInputElement;
  if (target.name === 'cfg-provider') {
    setProvider(target.value as Provider);
    keyInput.value = '';
    refreshKeySection();
  }
});
modelInput.addEventListener('change', () => {
  setModel(selectedProvider(), modelInput.value);
  refreshKeySection();
});
showButton.addEventListener('click', () => {
  const showing = keyInput.type === 'text';
  keyInput.type = showing ? 'password' : 'text';
  showButton.textContent = showing ? 'Show' : 'Hide';
  showButton.setAttribute('aria-pressed', String(!showing));
});
aiForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const problem = keyProblem(keyInput.value);
  if (problem) {
    status.textContent = `⚠ ${problem}`;
    status.dataset.tone = 'warn';
    keyInput.focus();
    return;
  }
  saveKey(selectedProvider(), keyInput.value, remember.checked);
  keyInput.value = '';
  refreshKeySection();
  status.textContent = `✓ ${remember.checked ? 'Key sealed on this device.' : 'Key sealed in this tab.'}`;
  status.dataset.tone = 'pass';
});
forgetButton.addEventListener('click', () => {
  forgetAllKeys();
  keyInput.value = '';
  remember.checked = false;
  refreshKeySection();
  status.textContent = '✓ All keys removed from this browser.';
  status.dataset.tone = 'pass';
});

function refreshKeySection(): void {
  const provider = getProvider();
  const info = PROVIDERS[provider];
  const radio = aiForm.querySelector<HTMLInputElement>(`input[name="cfg-provider"][value="${provider}"]`);
  if (radio) radio.checked = true;
  keyInput.placeholder = hasKey(provider) ? 'A key is sealed. Paste a new one to replace it.' : `Paste your ${info.label} key`;
  remember.checked = isRemembered(provider);
  keyLink.href = info.keyPage;
  keyLink.textContent = `Get a ${info.label} key from ${info.company} ↗`;
  forgetButton.disabled = !PROVIDER_IDS.some((id) => hasKey(id));
  modelInput.value = getModel(provider);
  modelList.replaceChildren(...info.models.map((m) => el('option', { value: m })));
  modelHint.textContent = `Default: ${info.defaultModel}. Sent only to ${info.company} when you run an AI check.`;
}
refreshKeySection();

const aiSection = el('section', { class: 'tile cfg-section cfg-section--full rise', style: '--i:3', 'aria-labelledby': 'ai-cfg-title' },
  el('h2', { id: 'ai-cfg-title', class: 'cfg-heading' }, 'AI Provider & Sealed Key'),
  el('p', { class: 'cfg-sub' }, 'Your key stays in this browser (sessionStorage by default; localStorage only if you tick Remember). Never logged or sent anywhere except your chosen provider.'),
  aiForm,
);

window.addEventListener(THEME_CHANGE_EVENT, () => {
  const currentTheme = getSurfaceTheme();
  const currentVisual = getVisualStyle();
  document.querySelectorAll<HTMLInputElement>('input[name="surface-theme"]').forEach((r) => {
    r.checked = r.value === currentTheme;
  });
  document.querySelectorAll<HTMLInputElement>('input[name="visual-style"]').forEach((r) => {
    r.checked = r.value === currentVisual;
  });
});
window.addEventListener(KEY_CHANGE_EVENT, refreshKeySection);

main.append(el('div', { class: 'cfg-grid' }, hero, surfaceSection, visualSection, aiSection));
