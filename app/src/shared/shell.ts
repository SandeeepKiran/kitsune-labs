// Shared page shell: Apple-minimalist left sidebar with SF-style monoline icons
// (including the Settings gear and Apple Intelligence gradient Sample data pill at the bottom left),
// aligned Spotlight search pill in the top bar, and command palette.
import './fonts.ts';
import './tokens.css';
import './base.css';
import './motion.css';
import './components.css';
import './shell.css';

import { urls } from './config.ts';
import { el, fromHtml } from './dom.ts';
import { foxMark } from './fox.ts';
import { forgetAllKeys, getProvider, hasKey, KEY_CHANGE_EVENT, PROVIDERS, PROVIDER_IDS } from './key-store.ts';
import { openKeyDrawer } from './key-drawer.ts';
import { installPalette, openPalette, registerCommands } from './palette.ts';
import {
  applyThemeAttributes,
  getSurfaceTheme,
  setSurfaceTheme,
  setVisualStyle,
  SURFACE_THEMES,
  SURFACE_THEME_IDS,
  THEME_CHANGE_EVENT,
  VISUAL_STYLES,
  VISUAL_STYLE_IDS,
  type SurfaceTheme,
} from './theme.ts';
import { TOOLS } from './tools.ts';

export type Page = 'home' | 'sample-data' | 'settings' | `tool:${string}`;

// Clean 1.8px monoline icons (SF Symbols style)
const ICONS: Record<string, string> = {
  home: '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>',
  'bug-finder': '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  'test-case-generator': '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
  'utterance-generator': '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  'transcript-converter': '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
  'first-utterance-finder': '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  'metrics-extractor': '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
  'report-builder': '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  'email-templates': '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  'qa-handbook': '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  'sample-data': '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  settings: '<svg class="nav-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  search: '<svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
};

export function mountShell(page: Page): HTMLElement {
  applyThemeAttributes();

  const app = document.querySelector<HTMLDivElement>('#app')!;
  const main = el('main', { id: 'main', tabindex: '-1', class: `page page--${page.split(':')[0]}` });

  const sidebar = buildSidebar(page);
  const topbar = buildTopbar();
  const footer = buildFooter();

  const body = el('div', { class: 'shell-body' },
    sidebar,
    el('div', { class: 'shell-main' }, main, footer),
  );

  app.replaceChildren(
    el('a', { class: 'skip-link', href: '#main' }, 'Skip to content'),
    topbar,
    body,
  );

  // On narrow screens the tool strip scrolls sideways; bring the current tool into view.
  const currentTab = app.querySelector<HTMLElement>('.tool-tabs [aria-current="page"]');
  const tabStrip = currentTab?.parentElement;
  if (currentTab && tabStrip && tabStrip.scrollWidth > tabStrip.clientWidth) {
    tabStrip.scrollLeft = currentTab.offsetLeft - tabStrip.clientWidth / 2 + currentTab.clientWidth / 2;
  }

  installPalette();
  registerCommands(() => [
    { id: 'home', label: 'Home', group: 'Go to', run: () => location.assign(urls.home) },
    ...TOOLS.map((tool) => ({
      id: `tool-${tool.slug}`, label: tool.name, group: 'Tool', keywords: `${tool.tabLabel} ${tool.description}`,
      run: () => location.assign(urls.tool(tool.slug)),
    })),
    { id: 'sample-data', label: 'Sample data', group: 'Go to', keywords: 'mousy files download',
      run: () => location.assign(urls.sampleData) },
    { id: 'settings', label: 'Settings & themes', group: 'Go to', keywords: 'theme daylight silver space black sakura glass api key',
      run: () => location.assign(urls.settings) },
    { id: 'download-all', label: 'Download all sample files (.zip)', group: 'Action', keywords: 'mousy pack',
      run: () => location.assign(urls.sampleFile('mousy_sample_pack.zip')) },
    { id: 'key', label: 'Set AI key', group: 'Action', keywords: 'api gemini chatgpt claude openai anthropic',
      run: openKeyDrawer },
    ...SURFACE_THEME_IDS.map((id) => ({
      id: `theme-${id}`,
      label: `Finish: ${SURFACE_THEMES[id].label}`,
      group: 'Theme',
      keywords: 'color dark light silver space black sakura',
      run: () => setSurfaceTheme(id),
    })),
    ...VISUAL_STYLE_IDS.map((id) => ({
      id: `visual-${id}`,
      label: `Emblem: ${VISUAL_STYLES[id].label}`,
      group: 'Theme',
      keywords: 'fox totem sigil animation',
      run: () => setVisualStyle(id),
    })),
    ...(PROVIDER_IDS.some((id) => hasKey(id))
      ? [{ id: 'forget', label: 'Forget AI key', group: 'Action', keywords: 'remove delete', run: forgetAllKeys }]
      : []),
  ]);
  return main;
}

function buildTopbar(): HTMLElement {
  const brand = el('a', { class: 'brand', href: urls.home, 'aria-label': 'Kitsune Labs home' });
  brand.append(
    fromHtml(foxMark(28)),
    el('span', { class: 'brand__name' }, 'Kitsune Labs'),
  );

  // Bigger Spotlight-style Search pill aligned right after the 216px left sidebar line.
  // The accessible name starts with the visible words (WCAG 2.5.3), so "click Search" works for voice control.
  const paletteButton = el('button', {
    type: 'button', class: 'palette-trigger', 'aria-keyshortcuts': 'Control+K Meta+K',
  },
    fromHtml(ICONS.search),
    el('span', { class: 'palette-trigger__word' }, 'Search'),
    ' ',
    el('kbd', {}, 'Ctrl K'),
    el('span', { class: 'visually-hidden' }, ' to find a tool or action'),
  );
  paletteButton.addEventListener('click', openPalette);

  // Sleek Apple Segmented Pill Switcher for the 3 Finishes
  const SHORT_NAMES: Record<SurfaceTheme, { text: string; dot: string }> = {
    'shrine-tech': { text: 'Silver', dot: '#e8e8ed' },
    'dark-electro': { text: 'Space Black', dot: '#1c1c1e' },
    eclipse: { text: 'Sakura', dot: '#f472b6' },
  };
  const themeButtons = SURFACE_THEME_IDS.map((id) => {
    const btn = el('button', {
      type: 'button',
      role: 'radio',
      class: 'theme-seg__btn',
      'aria-checked': String(id === getSurfaceTheme()),
      'data-theme-id': id,
    },
      el('span', { class: 'theme-seg__dot', style: `background:${SHORT_NAMES[id].dot}`, 'aria-hidden': 'true' }),
      SHORT_NAMES[id].text,
    );
    btn.addEventListener('click', () => setSurfaceTheme(id));
    return btn;
  });
  const themeSeg = el('div', {
    class: 'theme-seg',
    role: 'radiogroup',
    'aria-label': 'Theme finish',
    'data-testid': 'theme-picker',
  }, ...themeButtons);

  const syncThemePickers = () => {
    const active = getSurfaceTheme();
    for (const btn of themeButtons) {
      btn.setAttribute('aria-checked', String(btn.dataset.themeId === active));
    }
  };
  window.addEventListener(THEME_CHANGE_EVENT, syncThemePickers);
  window.addEventListener('storage', syncThemePickers);

  const keyChip = el('button', { type: 'button', class: 'key-chip', 'aria-haspopup': 'dialog', 'data-testid': 'key-chip' });
  keyChip.addEventListener('click', openKeyDrawer);
  const updateChip = () => {
    const sealed = hasKey();
    const label = PROVIDERS[getProvider()].label;
    keyChip.classList.toggle('key-chip--sealed', sealed);
    keyChip.textContent = sealed ? 'Key sealed in this browser' : 'Add AI key';
    keyChip.setAttribute('aria-label', sealed
      ? `Key sealed in this browser (${label}). Open AI key settings.`
      : 'Add AI key. No key is set yet. Open AI key settings.');
  };
  updateChip();
  window.addEventListener(KEY_CHANGE_EVENT, updateChip);
  window.addEventListener('storage', updateChip);

  return el('header', { class: 'shell-header' },
    el('div', { class: 'shell-header__brand-col' }, brand),
    el('div', { class: 'shell-header__main-col' },
      paletteButton,
      el('div', { class: 'shell-actions' },
        themeSeg,
        keyChip,
      ),
    ),
  );
}

function navItem(href: string, label: string, iconKey: string, current: boolean, extraClass = ''): HTMLAnchorElement {
  const link = el('a', {
    class: `tab ${extraClass}`.trim(),
    href,
    'aria-current': current ? 'page' : undefined,
  });
  link.append(fromHtml(ICONS[iconKey] ?? ICONS.home), el('span', { class: 'tab__label' }, label));
  return link;
}

function buildSidebar(page: Page): HTMLElement {
  const nav = el('nav', { class: 'tool-tabs', 'aria-label': 'Tools' });

  nav.append(navItem(urls.home, 'Overview', 'home', page === 'home', 'tab--overview'));

  for (const tool of TOOLS) {
    nav.append(navItem(urls.tool(tool.slug), tool.tabLabel, tool.slug, page === `tool:${tool.slug}`));
  }

  nav.append(
    navItem(urls.sampleData, 'Sample data', 'sample-data', page === 'sample-data', 'tab--sample-pill'),
    navItem(urls.settings, 'Settings', 'settings', page === 'settings', 'tab--settings'),
  );

  return el('aside', { class: 'shell-sidebar', 'aria-label': 'Workspace navigation' }, nav);
}

function buildFooter(): HTMLElement {
  return el('footer', { class: 'shell-footer' },
    el('p', {}, 'All data is invented. Mousy is not a real company.'),
    el('p', {},
      'Kitsune Labs · GPL-3.0 · ',
      el('a', { href: urls.github, rel: 'noopener noreferrer' }, 'Sandeep Kiran on GitHub'),
    ),
  );
}
