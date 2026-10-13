// QA Handbook: a practical guide to testing conversational AI, written new for this site.
// Not a template tool page: it is a guide with a nine-step release checklist (nine tails)
// and a worked example that runs the rules on a Mousy transcript.
import '../shared/tool-page.css';
import './qa-handbook.css';

import { BUG_TYPES, BUG_TYPE_IDS, findBugs, type BugType } from '../shared/analysis.ts';
import { urls } from '../shared/config.ts';
import { el, fromHtml, prefersReducedMotion } from '../shared/dom.ts';
import { downloadText } from '../shared/export.ts';
import { sleepingFox } from '../shared/fox.ts';
import { nineTails, setLit } from '../shared/nine-tails.ts';
import { registerCommands } from '../shared/palette.ts';
import { annotatedTurns, findingList, rulesChip } from '../shared/results.ts';
import { statusChip } from '../shared/status.ts';
import { TOOLS, type ToolInfo } from '../shared/tools.ts';
import { parseTranscript } from '../shared/transcript.ts';
import { markTried } from '../shared/tried.ts';

const MANDATE = [
  ['Understanding', 'The bot works out what the customer means, in the words customers really use.'],
  ['Next step', 'After it understands, the bot does the right thing next: the right flow, the right question.'],
  ['Real data', 'Order numbers, amounts and dates are captured, read back and used correctly.'],
  ['Graceful failure', 'When the bot is lost, it recovers: a fair number of re-prompts, then a clear transfer.'],
  ['Channel fit', 'Voice and chat behave differently. Each channel is tested on its own terms.'],
  ['Evidence', 'Every finding names a conversation, a turn and a severity. No evidence, no bug.'],
];

const LIFECYCLE: { stage: string; what: string; tools: string[] }[] = [
  { stage: 'Review the design', what: 'Read the intents and flows before they are built. Find missing paths, overlapping intents and unclear prompts.', tools: [] },
  { stage: 'Design the tests', what: 'Write utterances for every intent. Turn real-looking conversations into test cases.', tools: ['utterance-generator', 'test-case-generator'] },
  { stage: 'Check the build', what: 'Convert conversations into test scripts. Run them and find where the bot goes wrong.', tools: ['transcript-converter', 'bug-finder'] },
  { stage: 'Regression', what: 'Run the same scripts after every change. Compare core flows with their golden conversations.', tools: ['transcript-converter', 'bug-finder'] },
  { stage: 'Release', what: 'Sign off with a short report that ranks issues by impact, and tell the team.', tools: ['report-builder', 'email-templates'] },
  { stage: 'Monitor', what: 'Sample live conversations every week. Measure them, and learn how customers really open.', tools: ['metrics-extractor', 'first-utterance-finder'] },
];

const PRACTICES = [
  'Test the phrasing customers use, not the phrasing in the design document.',
  'Treat one re-prompt as normal. Treat three in a row as a bug.',
  'Read back every ID the bot captures. Test with IDs that sound alike (36 09 and 36 90).',
  'Test a correction ("no, I mean ...") at every confirmation step.',
  'Test silence: what happens after 10 seconds, 30 seconds and 2 minutes.',
  'Keep separate voice and chat test sets. Callers speak in short fragments.',
  'Set severity by what happens to the customer, not by how hard the fix is.',
  'Keep one golden conversation for every core flow, and compare against it.',
  'Report value over volume: three high-impact findings beat thirty cosmetic ones.',
  'Never test with real customer data. Use invented data, like the Mousy pack.',
];

// Which practice would have caught each bug type (used by the worked example).
const CAUGHT_BY: Record<BugType, number> = {
  misroute: 0, fallback_loop: 1, wrong_order_id: 2, ignored_correction: 3,
  timeout_no_goodbye: 4, premature_escalation: 6, bot_repeats: 7,
};

const SEVERITY_GUIDE = [
  ['high', 'The customer gets the wrong outcome, or is stuck.'],
  ['medium', 'The customer gets there, but with extra effort or a transfer they did not need.'],
  ['low', 'The outcome is right, but the conversation feels clumsy.'],
] as const;

// Nine steps, nine tails. Written in Simplified Technical English: one action per step.
const CHECKLIST = [
  'Run every core test script. Make sure that all of them pass.',
  'Test each intent with 20 or more new utterances.',
  'Test one correction in each confirmation step.',
  'Test the timeout path on voice and on chat.',
  'Make sure that each transfer gives a reason and a wait time.',
  'Read back each ID type with values that sound alike.',
  'Compare each core flow with its golden conversation.',
  'Write the release report. Include each open high-severity bug.',
  'Send the status email to the bot team.',
];

const CHECKLIST_ITEM = 'kitsune.handbook.checklist';
const SAMPLE = 'transcripts/06_gift_card_voice.txt';

function readChecklist(): boolean[] {
  try {
    const saved = JSON.parse(localStorage.getItem(CHECKLIST_ITEM) ?? '[]') as unknown;
    return CHECKLIST.map((_, i) => Array.isArray(saved) && saved[i] === true);
  } catch {
    return CHECKLIST.map(() => false);
  }
}

function saveChecklist(state: boolean[]): void {
  try { localStorage.setItem(CHECKLIST_ITEM, JSON.stringify(state)); } catch { /* storage blocked: the list still works for this visit */ }
}

const tile = (cls: string, i: number, id: string, title: string, ...children: (Node | null)[]) =>
  el('section', { class: `tile ${cls} hb__tile rise`, style: `--i:${i}`, id, 'aria-labelledby': `${id}-title` },
    el('h2', { id: `${id}-title`, class: 'hb__title' }, title), ...children);

export function mount(main: HTMLElement, tool: ToolInfo): void {
  document.title = `${tool.name} · Kitsune Labs`;

  const loadButton = el('button', { type: 'button', class: 'btn btn--ink', 'data-testid': 'load-sample' }, 'Load Mousy sample');
  const hero = el('section', { class: 'tile tile--hero hb__hero rise', style: '--i:0', 'aria-labelledby': 'tool-title' },
    el('div', { class: 'bento__hero-text' },
      el('p', { class: 'bento__eyebrow' }, el('span', { class: 'chip' }, 'No AI'), el('span', { class: 'chip' }, '6 sections · 9-step checklist')),
      el('h1', { id: 'tool-title' }, tool.name),
      el('p', { class: 'bento__desc' }, 'How to test chatbots and voice bots: what QA owns, when to test what, and which tool helps.'),
      el('div', { class: 'hero-bar' }, el('span', {}, 'See the handbook applied to a real-looking call'), loadButton),
    ),
  );
  hero.append(fromHtml(sleepingFox('bento__fox')));

  const sections = [
    ['hb-mandate', 'Mandate'], ['hb-lifecycle', 'Lifecycle'], ['hb-toolkit', 'Toolkit'],
    ['hb-practices', 'Best practices'], ['hb-bugs', 'Bug types'], ['hb-checklist', 'Release checklist'], ['hb-example', 'Worked example'],
  ];
  const toc = el('nav', { class: 'tile tile--lilac hb__toc rise', style: '--i:1', 'aria-label': 'Handbook sections' },
    el('h2', { class: 'tile__title' }, 'Contents'),
    el('ol', {}, ...sections.map(([id, label]) => el('li', {}, el('a', { href: `#${id}` }, label)))));

  const mandate = tile('', 2, 'hb-mandate', 'Mandate: what QA owns',
    el('dl', { class: 'hb__mandate' }, ...MANDATE.flatMap(([term, text]) => [el('dt', {}, term), el('dd', {}, text)])));

  const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug)!;
  const lifecycle = tile('tile--mist', 3, 'hb-lifecycle', 'Lifecycle: when to test what',
    el('ol', { class: 'hb__stages' }, ...LIFECYCLE.map((s) => el('li', {},
      el('strong', {}, s.stage),
      el('p', {}, s.what),
      s.tools.length ? el('p', { class: 'hb__tools' }, ...s.tools.map((slug) => el('a', { class: 'chip', href: urls.tool(slug) }, toolBySlug(slug).name))) : null,
    ))));

  const toolkit = tile('tile--butter', 4, 'hb-toolkit', 'Toolkit',
    el('ul', { class: 'hb__toolkit' }, ...TOOLS.filter((t) => t.slug !== tool.slug).map((t) => el('li', {},
      el('a', { href: urls.tool(t.slug) }, t.name), el('span', {}, t.description)))));

  const practices = tile('', 5, 'hb-practices', 'Best practices',
    el('ol', { class: 'hb__practices' }, ...PRACTICES.map((p, i) => el('li', { id: `hb-practice-${i + 1}` }, p))));

  const bugs = tile('tile--blush', 6, 'hb-bugs', 'Bug types and severity',
    el('div', { class: 'table-wrap' }, el('table', { class: 'data-table' },
      el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Type'), el('th', { scope: 'col' }, 'Severity'), el('th', { scope: 'col' }, 'What happens'), el('th', { scope: 'col' }, 'Fix hint'))),
      el('tbody', {}, ...BUG_TYPE_IDS.map((id) => el('tr', {},
        el('td', { class: 'mono' }, id),
        el('td', {}, statusChip(BUG_TYPES[id].severity === 'high' ? 'fail' : 'warn', BUG_TYPES[id].severity)),
        el('td', {}, BUG_TYPES[id].meaning),
        el('td', {}, BUG_TYPES[id].fix))))),
    ),
    el('dl', { class: 'hb__severity' }, ...SEVERITY_GUIDE.flatMap(([level, text]) => [el('dt', {}, level), el('dd', {}, text)])),
  );

  // -- checklist ------------------------------------------------------------------
  const state = readChecklist();
  const tails = nineTails(state.filter(Boolean).length);
  const counter = el('p', { class: 'mono hb__count', 'data-testid': 'checklist-count', 'aria-live': 'polite' });
  const items = CHECKLIST.map((text, i) => {
    const box = el('input', { type: 'checkbox', id: `hb-check-${i}`, checked: state[i] });
    box.addEventListener('change', () => {
      state[i] = box.checked;
      saveChecklist(state);
      update();
      markTried(tool.slug);
    });
    return el('li', {}, el('label', { class: 'check', for: `hb-check-${i}` }, box, el('span', {}, text)));
  });
  const exportChecklist = el('button', { type: 'button', class: 'btn' }, 'Download checklist (.md)');
  exportChecklist.addEventListener('click', () => downloadText('release_checklist.md', checklistMarkdown(state), 'text/markdown'));
  const resetChecklist = el('button', { type: 'button', class: 'btn btn--quiet' }, 'Clear ticks');
  resetChecklist.addEventListener('click', () => {
    state.fill(false);
    saveChecklist(state);
    items.forEach((li) => { li.querySelector('input')!.checked = false; });
    update();
  });
  const checklist = tile('tile--butter hb__checklist', 7, 'hb-checklist', 'Release checklist',
    el('p', { class: 'bento__hint' }, 'Tick each step as you finish it. Your ticks stay in this browser only.'),
    el('div', { class: 'hb__tails' }, tails, counter),
    el('ol', { class: 'hb__checks' }, ...items),
    el('div', { class: 'bento__exports' }, exportChecklist, resetChecklist),
  );
  function update(): void {
    const done = state.filter(Boolean).length;
    setLit(tails, done);
    counter.textContent = `${done} of 9 steps done`;
  }
  update();

  // -- worked example ---------------------------------------------------------------
  const exampleBody = el('div', { 'data-testid': 'results' },
    el('p', {}, 'Press ', el('strong', {}, 'Load Mousy sample'), ' to run the rules on a short gift-card call and see which practice would have caught each bug.'));
  const example = tile('tile--mist hb__example', 8, 'hb-example', 'Worked example', exampleBody);

  async function loadExample(): Promise<void> {
    try {
      const response = await fetch(urls.sampleFile(SAMPLE));
      if (!response.ok) throw new Error(String(response.status));
      const turns = parseTranscript(await response.text());
      const findings = findBugs(turns);
      exampleBody.replaceChildren(
        el('p', { class: 'result-section__title' }, rulesChip(), el('span', { class: 'mono', 'data-testid': 'source' }, SAMPLE)),
        findingList(findings),
        el('ul', { class: 'hb__caught' }, ...findings.map((f) => {
          const practice = CAUGHT_BY[f.type as BugType];
          return el('li', {}, el('strong', {}, `${f.title} (turn ${f.turn}): `), 'caught by best practice ',
            el('a', { href: `#hb-practice-${practice + 1}` }, `${practice + 1}`), ` · "${PRACTICES[practice]}"`);
        })),
        annotatedTurns(turns, findings),
      );
      markTried(tool.slug);
      // A JS 'smooth' scroll ignores the CSS reduced-motion override, so ask here.
      example.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    } catch {
      exampleBody.replaceChildren(el('p', {}, 'Could not load the sample. Check your connection and try again.'));
    }
  }
  loadButton.addEventListener('click', () => void loadExample());

  registerCommands(() => [
    { id: 'load-sample', label: 'Load Mousy sample into QA Handbook', group: 'This tool', run: () => void loadExample() },
    ...sections.map(([id, label]) => ({ id, label: `Handbook: ${label}`, group: 'This tool', run: () => document.getElementById(id)?.scrollIntoView() })),
  ]);
  if (new URLSearchParams(location.search).has('sample')) void loadExample();

  main.append(el('div', { class: 'hb' }, hero, toc, mandate, lifecycle, toolkit, practices, bugs, checklist, example));
}

function checklistMarkdown(state: boolean[]): string {
  return [
    '# Release checklist',
    '',
    'From the Kitsune Labs QA Handbook.',
    '',
    ...CHECKLIST.map((text, i) => `${i + 1}. [${state[i] ? 'x' : ' '}] ${text}`),
    '',
    `${state.filter(Boolean).length} of 9 steps done.`,
    '',
  ].join('\n');
}
