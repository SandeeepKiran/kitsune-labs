import { mountShell } from '../shared/shell.ts';
import './home.css';

import { urls } from '../shared/config.ts';
import { el, fromHtml } from '../shared/dom.ts';
import { sleepingFox } from '../shared/fox.ts';
import { nineTails } from '../shared/nine-tails.ts';
import { AI_LABELS, TOOLS } from '../shared/tools.ts';
import { triedTools } from '../shared/tried.ts';

const main = mountShell('home');
const tried = new Set(triedTools());

const PETALS = [
  { left: 8, duration: 9, delay: -1 }, { left: 22, duration: 11, delay: -6 }, { left: 41, duration: 10, delay: -3 },
  { left: 63, duration: 12, delay: -8 }, { left: 78, duration: 9.5, delay: -4 }, { left: 92, duration: 11.5, delay: -2 },
];

const art = el('div', { class: 'hero-art', 'aria-hidden': 'true' },
  el('div', { class: 'hero-art__moon' }),
);
art.append(fromHtml(sleepingFox('hero-art__fox')));
art.append(
  el('span', { class: 'zz', style: 'left:74%;top:8%;font-size:20px' }, '⚡'),
  el('span', { class: 'zz', style: 'left:81%;top:0;font-size:15px;animation-delay:1.3s' }, '◈'),
);

const petals = el('div', { class: 'petals', 'aria-hidden': 'true' });
for (const p of PETALS) {
  petals.append(el('span', { class: 'petal', style: `left:${p.left}%;animation-duration:${p.duration}s;animation-delay:${p.delay}s` }));
}

const hero = el('section', { class: 'tile tile--hero home-hero', 'aria-labelledby': 'home-title' },
  petals,
  el('div', { class: 'home-hero__text rise' },
    el('p', { class: 'bento__eyebrow' },
      el('span', { class: 'chip chip--ai' }, 'CONVERSATIONAL AI QA SUITE'),
      el('span', { class: 'chip' }, '9 BROWSER TOOLS · ZERO BACKEND'),
    ),
    el('h1', { id: 'home-title' }, 'QA tools for conversational AI, forged in-house.'),
    el('p', { class: 'home-hero__lead' },
      'Nine browser tools for testing chatbots and voice bots. Try each one with the Mousy sample files. ',
      'Add your own AI key only if you want the AI checks.'),
    el('div', { class: 'home-hero__ctas' },
      el('a', { class: 'btn btn--ink btn--big', href: '#tools' }, 'Open the tools'),
      el('a', { class: 'btn btn--big', href: urls.sampleData }, 'Download Mousy samples'),
      el('a', { class: 'btn btn--quiet btn--big', href: urls.settings }, 'Themes & Settings'),
    ),
  ),
  art,
);

const toolList = el('ul', { class: 'tool-grid', role: 'list' });
TOOLS.forEach((tool, index) => {
  const isTried = tried.has(tool.slug);
  toolList.append(el('li', { class: 'rise', style: `--i:${index + 2}` },
    el('a', { class: 'tool-tile', href: urls.tool(tool.slug) },
      el('span', { class: 'tool-tile__name' }, tool.name),
      el('span', { class: 'tool-tile__desc' }, tool.description),
      el('span', { class: 'tool-tile__meta' },
        el('span', { class: `chip${tool.ai === 'none' ? '' : ' chip--ai'}` }, AI_LABELS[tool.ai]),
        isTried ? el('span', { class: 'status status--pass' }, el('span', { 'aria-hidden': 'true' }, '✓'), 'Tried') : null,
      ),
    ),
  ));
});

const triedCount = tried.size;
const tools = el('section', { id: 'tools', class: 'home-tools', 'aria-labelledby': 'tools-title' },
  el('div', { class: 'home-tools__head' },
    el('h2', { id: 'tools-title' }, 'The tools'),
    el('div', { class: 'tried', 'data-testid': 'tools-tried' },
      nineTails(triedCount),
      el('span', {}, 'Tools tried ', el('b', {}, `${triedCount} / ${TOOLS.length}`)),
    ),
  ),
  toolList,
);

const VALUES = [
  ['Runs in your browser', 'No server and no sign-up. Your files never leave this page.'],
  ['Sample files included', 'Mousy Assist conversations, Excel batches and intent lists to try every tool.'],
  ['Your key, your choice', 'Gemini, ChatGPT or Claude. The key stays sealed in this browser.'],
];
const values = el('section', { class: 'home-values', 'aria-label': 'How it works' },
  ...VALUES.map(([title, text], index) =>
    el('div', { class: 'home-value rise', style: `--i:${index + 11}` },
      el('h3', {}, title),
      el('p', {}, text),
    ),
  ),
);

main.append(hero, tools, values);
