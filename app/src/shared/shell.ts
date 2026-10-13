// Shared page shell: header (fox mark, tool tabs, key seal chip, Ctrl+K), footer,
// key drawer and command palette. Every page calls mountShell() first.
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
import { TOOLS } from './tools.ts';

export type Page = 'home' | 'sample-data' | `tool:${string}`;

export function mountShell(page: Page): HTMLElement {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  const main = el('main', { id: 'main', tabindex: '-1', class: `page page--${page.split(':')[0]}` });
  app.replaceChildren(
    el('a', { class: 'skip-link', href: '#main' }, 'Skip to content'),
    buildHeader(page),
    main,
    buildFooter(),
  );
  // On narrow screens the tab strip scrolls sideways; bring the current tool into view.
  const currentTab = app.querySelector<HTMLElement>('.tool-tabs [aria-current="page"]');
  const tabStrip = currentTab?.parentElement;
  if (currentTab && tabStrip) tabStrip.scrollLeft = currentTab.offsetLeft - tabStrip.clientWidth / 2 + currentTab.clientWidth / 2;
  installPalette();
  registerCommands(() => [
    { id: 'home', label: 'Home', group: 'Go to', run: () => location.assign(urls.home) },
    ...TOOLS.map((tool) => ({
      id: `tool-${tool.slug}`, label: tool.name, group: 'Tool', keywords: `${tool.tabLabel} ${tool.description}`,
      run: () => location.assign(urls.tool(tool.slug)),
    })),
    { id: 'sample-data', label: 'Sample data', group: 'Go to', keywords: 'mousy files download',
      run: () => location.assign(urls.sampleData) },
    { id: 'download-all', label: 'Download all sample files (.zip)', group: 'Action', keywords: 'mousy pack',
      run: () => location.assign(urls.sampleFile('mousy_sample_pack.zip')) },
    { id: 'key', label: 'Set AI key', group: 'Action', keywords: 'api gemini chatgpt claude openai anthropic',
      run: openKeyDrawer },
    ...(PROVIDER_IDS.some((id) => hasKey(id))
      ? [{ id: 'forget', label: 'Forget AI key', group: 'Action', keywords: 'remove delete', run: forgetAllKeys }]
      : []),
  ]);
  return main;
}

function buildHeader(page: Page): HTMLElement {
  const brand = el('a', { class: 'brand', href: urls.home, 'aria-label': 'Kitsune Labs home' });
  brand.append(fromHtml(foxMark(28)), el('span', { class: 'brand__name' }, 'Kitsune Labs'));

  const nav = el('nav', { class: 'tool-tabs', 'aria-label': 'Tools' });
  for (const tool of TOOLS) {
    const current = page === `tool:${tool.slug}`;
    nav.append(el('a', {
      class: 'tab', href: urls.tool(tool.slug), 'aria-current': current ? 'page' : undefined,
    }, tool.tabLabel));
  }

  const sampleLink = el('a', {
    class: 'shell-link', href: urls.sampleData, 'aria-current': page === 'sample-data' ? 'page' : undefined,
  }, 'Sample data');
  const paletteButton = el('button', {
    type: 'button', class: 'palette-trigger', 'aria-keyshortcuts': 'Control+K Meta+K', 'aria-label': 'Search tools and actions (Ctrl+K)',
  }, el('span', { 'aria-hidden': 'true' }, 'Search'), el('kbd', { 'aria-hidden': 'true' }, 'Ctrl K'));
  paletteButton.addEventListener('click', openPalette);

  const keyChip = el('button', { type: 'button', class: 'key-chip', 'aria-haspopup': 'dialog', 'data-testid': 'key-chip' });
  keyChip.addEventListener('click', openKeyDrawer);
  const updateChip = () => {
    const sealed = hasKey();
    const label = PROVIDERS[getProvider()].label;
    keyChip.classList.toggle('key-chip--sealed', sealed);
    keyChip.textContent = sealed ? 'Key sealed in this browser' : 'Add AI key';
    keyChip.setAttribute('aria-label', sealed
      ? `${label} key sealed in this browser. Open AI key settings.`
      : 'No AI key set. Open AI key settings.');
  };
  updateChip();
  window.addEventListener(KEY_CHANGE_EVENT, updateChip);
  // Keep tabs in sync when the key changes in another tab of this browser.
  window.addEventListener('storage', updateChip);

  return el('header', { class: 'shell-header' },
    brand,
    page === 'home' ? null : nav,
    el('div', { class: 'shell-actions' }, sampleLink, paletteButton, keyChip),
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
