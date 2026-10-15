// Shared page shell: persistent left sidebar (Home, all 9 tools, Sample data, Settings),
// top telemetry bar (quick theme switcher, visual mode switcher, Ctrl+K search, key seal chip),
// footer, key drawer and command palette. Every page calls mountShell() first.
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
} from './theme.ts';
import { AI_LABELS, TOOLS } from './tools.ts';

export type Page = 'home' | 'sample-data' | 'settings' | `tool:${string}`;

export function mountShell(page: Page): HTMLElement {
  applyThemeAttributes();

  const app = document.querySelector<HTMLDivElement>('#app')!;
  const main = el('main', { id: 'main', tabindex: '-1', class: `page page--${page.split(':')[0]}` });

  const sidebar = buildSidebar(page);
  const topbar = buildTopbar(page);
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
    { id: 'settings', label: 'Settings & themes', group: 'Go to', keywords: 'theme electro shrine eclipse totem sigil api key',
      run: () => location.assign(urls.settings) },
    { id: 'download-all', label: 'Download all sample files (.zip)', group: 'Action', keywords: 'mousy pack',
      run: () => location.assign(urls.sampleFile('mousy_sample_pack.zip')) },
    { id: 'key', label: 'Set AI key', group: 'Action', keywords: 'api gemini chatgpt claude openai anthropic',
      run: openKeyDrawer },
    ...SURFACE_THEME_IDS.map((id) => ({
      id: `theme-${id}`,
      label: `Theme: ${SURFACE_THEMES[id].label}`,
      group: 'Theme',
      keywords: 'color dark light electro shrine eclipse',
      run: () => setSurfaceTheme(id),
    })),
    ...VISUAL_STYLE_IDS.map((id) => ({
      id: `visual-${id}`,
      label: `Visual mode: ${VISUAL_STYLES[id].label}`,
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

function buildTopbar(page: Page): HTMLElement {
  const brand = el('a', { class: 'brand', href: urls.home, 'aria-label': 'Kitsune Labs home' });
  brand.append(
    fromHtml(foxMark(28)),
    el('span', { class: 'brand__text' },
      el('span', { class: 'brand__name' }, 'Kitsune Labs'),
      el('span', { class: 'brand__tag mono', 'aria-hidden': 'true' }, 'ELECTRO QA CONSOLE'),
    ),
  );

  // Quick 1-click surface theme select in header
  const themeSelect = el('select', {
    class: 'shell-select',
    'aria-label': 'Theme surface style',
    'data-testid': 'theme-picker',
  },
    ...SURFACE_THEME_IDS.map((id) =>
      el('option', { value: id, selected: id === getSurfaceTheme() }, `Theme: ${SURFACE_THEMES[id].shortLabel}`),
    ),
  );
  themeSelect.addEventListener('change', () => setSurfaceTheme(themeSelect.value as SurfaceTheme));

  // Quick 1-click visual mode select in header
  const visualSelect = el('select', {
    class: 'shell-select',
    'aria-label': 'Visual artwork mode',
    'data-testid': 'visual-picker',
  },
    ...VISUAL_STYLE_IDS.map((id) =>
      el('option', { value: id, selected: id === getVisualStyle() }, `Art: ${VISUAL_STYLES[id].shortLabel}`),
    ),
  );
  visualSelect.addEventListener('change', () => setVisualStyle(visualSelect.value as VisualStyle));

  const syncThemePickers = () => {
    themeSelect.value = getSurfaceTheme();
    visualSelect.value = getVisualStyle();
  };
  window.addEventListener(THEME_CHANGE_EVENT, syncThemePickers);
  window.addEventListener('storage', syncThemePickers);

  const sampleLink = el('a', {
    class: 'shell-link', href: urls.sampleData, 'aria-current': page === 'sample-data' ? 'page' : undefined,
  }, 'Sample data');

  const settingsLink = el('a', {
    class: 'shell-link', href: urls.settings, 'aria-current': page === 'settings' ? 'page' : undefined,
    'data-testid': 'settings-link',
  }, 'Settings');

  // The accessible name starts with the visible words (WCAG 2.5.3), so "click Search" works for voice control.
  const paletteButton = el('button', {
    type: 'button', class: 'palette-trigger', 'aria-keyshortcuts': 'Control+K Meta+K',
  }, el('span', { class: 'palette-trigger__word' }, 'Search'), ' ', el('kbd', {}, 'Ctrl K'), el('span', { class: 'visually-hidden' }, ' to find a tool or action'));
  paletteButton.addEventListener('click', openPalette);

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
    brand,
    el('div', { class: 'shell-actions' },
      themeSelect,
      visualSelect,
      sampleLink,
      settingsLink,
      paletteButton,
      keyChip,
    ),
  );
}

function buildSidebar(page: Page): HTMLElement {
  const nav = el('nav', { class: 'tool-tabs', 'aria-label': 'Tools' });

  nav.append(
    el('a', {
      class: 'tab tab--overview',
      href: urls.home,
      'aria-current': page === 'home' ? 'page' : undefined,
    },
      el('span', { class: 'tab__label' }, 'Overview'),
      el('span', { class: 'tab__badge mono', 'aria-hidden': 'true' }, 'HOME'),
    ),
  );

  for (const tool of TOOLS) {
    const current = page === `tool:${tool.slug}`;
    nav.append(el('a', {
      class: 'tab',
      href: urls.tool(tool.slug),
      'aria-current': current ? 'page' : undefined,
    },
      el('span', { class: 'tab__label' }, tool.tabLabel),
      el('span', { class: 'tab__badge mono', 'aria-hidden': 'true' }, AI_LABELS[tool.ai] === 'No AI' ? 'RULES' : 'AI'),
    ));
  }

  nav.append(
    el('a', {
      class: 'tab tab--meta',
      href: urls.sampleData,
      'aria-current': page === 'sample-data' ? 'page' : undefined,
    },
      el('span', { class: 'tab__label' }, 'Mousy pack'),
      el('span', { class: 'tab__badge mono', 'aria-hidden': 'true' }, 'DATA'),
    ),
    el('a', {
      class: 'tab tab--meta',
      href: urls.settings,
      'aria-current': page === 'settings' ? 'page' : undefined,
    },
      el('span', { class: 'tab__label' }, 'Settings'),
      el('span', { class: 'tab__badge mono', 'aria-hidden': 'true' }, 'CFG'),
    ),
  );

  return el('aside', { class: 'shell-sidebar', 'aria-label': 'Workspace navigation' },
    el('p', { class: 'sidebar-heading mono', 'aria-hidden': 'true' }, 'QA WORKBENCH · 9 TOOLS'),
    nav,
  );
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
