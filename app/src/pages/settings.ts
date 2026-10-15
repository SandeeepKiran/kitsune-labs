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
    el('h1', { id: 'cfg-title' }, 'Settings'),
    el('p', {},
      'Choose your appearance finish, emblem style, and browser-sealed AI provider key.'),
  ),
  el('div', { class: 'cfg-hero__art', 'aria-hidden': 'true' }, fromHtml(sleepingFox())),
);

// Mini macOS-style window preview colors for each finish
const PREVIEW_STYLES: Record<SurfaceTheme, { bg: string; side: string; sheet: string; ink: string; cta: string }> = {
  'shrine-tech': { bg: '#f5f5f7', side: '#fbfbfd', sheet: '#ffffff', ink: '#1d1d1f', cta: '#be185d' },
  'dark-electro': { bg: '#000000', side: '#141416', sheet: '#1c1c1e', ink: '#f5f5f7', cta: '#be185d' },
  eclipse: { bg: '#faf5f8', side: '#fdfafc', sheet: '#ffffff', ink: '#831843', cta: '#be185d' },
};

// -- 1. Appearance Finish Picker (macOS System Settings 3-up cards) -------------
const themeCards = SURFACE_THEME_IDS.map((id) => {
  const info = SURFACE_THEMES[id];
  const p = PREVIEW_STYLES[id];
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
  const miniWindow = el('div', { class: 'theme-preview', style: `background:${p.bg}`, 'aria-hidden': 'true' },
    el('div', { class: 'theme-preview__side', style: `background:${p.side}` },
      el('span', { class: 'theme-preview__bar', style: `background:${p.ink};width:80%` }),
      el('span', { class: 'theme-preview__bar', style: `background:${p.cta};width:95%;opacity:0.9` }),
      el('span', { class: 'theme-preview__bar', style: `background:${p.ink};width:70%` }),
    ),
    el('div', { class: 'theme-preview__main' },
      el('div', { class: 'theme-preview__top' },
        el('span', { class: 'theme-preview__title', style: `background:${p.ink}` }),
        el('span', { class: 'theme-preview__cta', style: `background:${p.cta}` }),
      ),
      el('div', { class: 'theme-preview__sheet', style: `background:${p.sheet}` }),
    ),
  );
  return el('label', { class: 'theme-card' },
    radio,
    miniWindow,
    el('div', { class: 'theme-card__body' },
      el('div', { class: 'theme-card__top' },
        el('span', { class: 'theme-card__title' }, info.shortLabel),
      ),
      el('p', { class: 'theme-card__desc' }, info.description),
    ),
  );
});

const surfaceSection = el('section', { class: 'tile cfg-section rise', style: '--i:1', 'aria-labelledby': 'surface-title' },
  el('h2', { id: 'surface-title', class: 'cfg-heading' }, 'Appearance'),
  el('p', { class: 'cfg-sub' }, 'Switch between Daylight Silver, Space Black, and Sakura Glass.'),
  el('div', { class: 'theme-cards' }, ...themeCards),
);

// -- 2. Kitsune Emblem Style ----------------------------------------------------
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
      ),
      el('p', { class: 'theme-card__desc' }, info.description),
    ),
  );
});

const visualSection = el('section', { class: 'tile cfg-section rise', style: '--i:2', 'aria-labelledby': 'visual-title' },
  el('h2', { id: 'visual-title', class: 'cfg-heading' }, 'Emblem Style'),
  el('p', { class: 'cfg-sub' }, 'Choose how the decorative emblem renders on the home hero and empty states.'),
  el('div', { class: 'theme-cards theme-cards--two' }, ...visualCards),
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

const aiSection = el('section', { class: 'tile cfg-section rise', style: '--i:3', 'aria-labelledby': 'ai-cfg-title' },
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
