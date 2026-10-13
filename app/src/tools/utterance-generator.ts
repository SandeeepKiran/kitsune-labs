// Utterance Generator: validation utterances for an intent, single or bulk from Excel.
// Rules build variations of the example utterances (same input = same output, every time).
// AI adds new phrasings, slang and near-miss "should not match" utterances.
import { parseAiJson } from '../shared/ai.ts';
import type { LoadedInput } from '../shared/conversations.ts';
import { el } from '../shared/dom.ts';
import { baseName, downloadCsv, downloadJson } from '../shared/export.ts';
import { downloadWorkbook, type Row } from '../shared/files.ts';
import { checkOption, optionChecks, optionGrid, selectOption } from '../shared/options.ts';
import { aiChip, dataTable, rulesChip, section, stats } from '../shared/results.ts';
import type { AiSession, ToolDefinition } from '../shared/tool-page.ts';

interface Intent {
  name: string;
  description: string;
  examples: string[];
}

interface Utterance {
  intent: string;
  utterance: string;
  style: string;
  should_match: 'yes' | 'no';
  source: 'rules' | 'AI-assisted';
}

const intentPick = selectOption('intent-pick', 'Intent', [['*', 'All intents']]);
const countPick = selectOption('count-pick', 'Utterances per intent', [['10', '10'], ['20', '20'], ['40', '40']], '20');
const STYLES = [
  ['polite', 'Polite'], ['terse', 'Short'], ['question', 'Question'], ['typo', 'Typo'],
  ['voice', 'Voice-style'], ['with_id', 'With order ID'], ['synonym', 'Synonym swap'],
] as const;
const styleChecks = STYLES.map(([id, label]) => ({ id, check: checkOption(`style-${id}`, label, true) }));

// -- reading intents -----------------------------------------------------------------

function intentsFromTable(rows: Row[], columns: string[]): Intent[] {
  const nameCol = columns.find((c) => /^intent(_?name)?$/i.test(c)) ?? columns.find((c) => /intent|name/i.test(c)) ?? columns[0];
  const descCol = columns.find((c) => /desc/i.test(c));
  const exampleCols = columns.filter((c) => /example|utterance|sample|phrase/i.test(c));
  return rows
    .map((r) => ({
      name: (r[nameCol] ?? '').trim(),
      description: descCol ? (r[descCol] ?? '').trim() : '',
      examples: exampleCols.map((c) => (r[c] ?? '').trim()).filter(Boolean),
    }))
    .filter((i) => i.name);
}

/** Text: "intent_name: example" per line, or plain example lines for one intent. */
function intentsFromText(text: string): Intent[] {
  const map = new Map<string, Intent>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([a-z][\w-]{1,60})\s*:\s*(.+)$/i.exec(line);
    const name = match ? match[1] : 'my_intent';
    const said = match ? match[2] : line;
    const intent = map.get(name) ?? { name, description: '', examples: [] };
    intent.examples.push(said);
    map.set(name, intent);
  }
  return [...map.values()];
}

export function intentsFrom(input: LoadedInput | null): Intent[] {
  if (!input) return [];
  if (input.kind === 'table') return intentsFromTable(input.table.rows, input.table.columns);
  if (input.kind === 'text') return intentsFromText(input.text);
  return [];
}

// -- rule-based variations --------------------------------------------------------------

/** Small seeded random numbers, so the same intent always gets the same utterances. */
function seeded(text: string): () => number {
  let seed = 4417;
  for (const ch of text) seed = Math.imul(seed ^ ch.charCodeAt(0), 0x9e3779b1) >>> 0;
  return () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

const SYNONYMS: [RegExp, string][] = [
  [/\border\b/i, 'purchase'], [/\bparcel\b/i, 'package'], [/\bpackage\b/i, 'parcel'], [/\brefund\b/i, 'money back'],
  [/\bcancel\b/i, 'call off'], [/\bbroken\b/i, 'damaged'], [/\bdamaged\b/i, 'broken'], [/\bperson\b/i, 'human'],
  [/\bcard\b/i, 'payment card'], [/\bwhere is\b/i, "where's"], [/\bchange\b/i, 'update'], [/\bcheck\b/i, 'look up'],
];
const STOP = new Set('a an the my i i\'m to for of please can could you is it me want would like need do does on with this that'.split(' '));
const VERB_START = /^(cancel|change|track|check|update|return|send|stop|undo|talk|speak|get|add|redirect|find)\b/i;
const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const bare = (s: string) => s.replace(/[.?!]+$/, '');

function variations(intent: Intent, styles: Set<string>, rand: () => number): { text: string; style: string }[] {
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const out: { text: string; style: string }[] = [];
  const wantsOrder = /order|parcel|refund|address|return/i.test(`${intent.description} ${intent.examples.join(' ')}`);
  for (const example of intent.examples) {
    const e = bare(example);
    if (styles.has('polite')) {
      out.push({ text: `${pick(['please ', 'hi, could you ', 'hello, I would like to ', 'can you help me '])}${lowerFirst(e)}`, style: 'polite' });
      out.push({ text: `${e}${pick([', please', ', thanks', ' please, thank you'])}`, style: 'polite' });
    }
    if (styles.has('terse')) {
      const words = e.split(/\s+/).filter((w) => !STOP.has(w.toLowerCase()));
      if (words.length >= 1 && words.length < e.split(/\s+/).length) out.push({ text: words.slice(0, 4).join(' '), style: 'terse' });
    }
    if (styles.has('question') && VERB_START.test(e)) {
      out.push({ text: `${pick(['can I ', 'how do I ', 'is it possible to '])}${lowerFirst(e)}?`, style: 'question' });
    }
    if (styles.has('typo')) {
      const words = e.split(/\s+/);
      const longest = words.reduce((a, b) => (b.length > a.length ? b : a), '');
      if (longest.length >= 5) {
        const at = 1 + Math.floor(rand() * (longest.length - 3));
        const typo = longest.slice(0, at) + longest[at + 1] + longest[at] + longest.slice(at + 2);
        out.push({ text: e.replace(longest, typo), style: 'typo' });
      }
    }
    if (styles.has('voice')) {
      const spoken = e.toLowerCase()
        .replace(/\bmo-?(\d{4})\b/gi, (_, d: string) => `m o ${[...d].map((n) => DIGITS[Number(n)]).join(' ')}`)
        .replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
      out.push({ text: `${pick(['um, ', 'yeah, ', 'uh, ', ''])}${spoken}`, style: 'voice' });
    }
    if (styles.has('with_id') && wantsOrder && !/\bMO-?\d{4}/i.test(e)) {
      out.push({ text: `${e} ${pick(['for ', 'on order ', ''])}MO-${1000 + Math.floor(rand() * 9000)}`, style: 'with_id' });
    }
    if (styles.has('synonym')) {
      const swap = SYNONYMS.find(([pattern]) => pattern.test(e));
      if (swap) out.push({ text: e.replace(swap[0], swap[1]), style: 'synonym' });
    }
  }
  // Shuffle with the seeded generator so styles mix, then drop duplicates and the originals.
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  const seen = new Set(intent.examples.map(norm));
  return out.filter((u) => {
    const key = norm(u.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// -- AI ----------------------------------------------------------------------------------

async function aiUtterances(ai: AiSession, intents: Intent[], count: number): Promise<Utterance[]> {
  const reply = await ai.ask({
    system: 'You write test utterances for the intent classifier of an online-shop support bot. '
      + 'Write what real customers type or say: varied, natural, some messy. Answer with JSON only.',
    prompt: [
      `For each intent, write ${count} new utterances that SHOULD match it, plus 3 near-miss utterances that look similar but should NOT match it.`,
      'Styles to mix: paraphrase, slang, short, long, typo, voice (spoken, no punctuation), negative (the near-misses).',
      'Do not copy the examples. Do not use real people, real companies or real phone numbers. Order IDs look like MO-4417.',
      'Return {"intents": [{"intent": "<name>", "utterances": [{"text": "", "style": "", "should_match": true}]}]}.',
      ...intents.map((i) => `- ${i.name}: ${i.description || '(no description)'} Examples: ${i.examples.map((e) => `"${e}"`).join(', ')}`),
    ].join('\n'),
    json: true,
    maxTokens: 12000,
  });
  const parsed = parseAiJson<{ intents?: { intent?: string; utterances?: { text?: unknown; style?: unknown; should_match?: unknown }[] }[] }>(reply.text);
  const names = new Set(intents.map((i) => i.name));
  return (parsed.intents ?? []).flatMap((group) => {
    const intent = String(group.intent ?? '');
    if (!names.has(intent)) return [];
    return (group.utterances ?? [])
      .filter((u) => typeof u.text === 'string' && u.text.trim())
      .map((u) => ({
        intent,
        utterance: String(u.text).trim().slice(0, 300),
        style: String(u.style ?? 'paraphrase').slice(0, 30),
        should_match: u.should_match === false || u.style === 'negative' ? 'no' as const : 'yes' as const,
        source: 'AI-assisted' as const,
      }));
  });
}

// -- the tool ----------------------------------------------------------------------------

const COLUMNS: (keyof Utterance)[] = ['intent', 'utterance', 'style', 'should_match', 'source'];
const AI_INTENTS_PER_CALL = 5;

export const definition: ToolDefinition = {
  answerLabel: 'Utterances',
  heroHint: 'Drop an intents .xlsx or .csv, or type "intent: example" lines',
  inputLabel: 'Intents',
  inputHint: 'Spreadsheet columns: intent, description, example_1, example_2 … Or one "intent_name: example" per line.',
  placeholder: 'cancel_order: cancel my order\ncancel_order: I don\'t want my order anymore\ntrack_parcel: where is my parcel',
  aiNote: 'AI writes new phrasings, slang, and near-miss utterances that should NOT match.',
  options: () => el('div', {},
    optionGrid(intentPick.element, countPick.element),
    optionChecks('Rule styles', ...styleChecks.map((s) => s.check)),
  ),
  inputChanged(input) {
    const intents = intentsFrom(input);
    intentPick.setChoices([['*', `All intents${intents.length ? ` (${intents.length})` : ''}`], ...intents.map((i): [string, string] => [i.name, i.name])]);
  },
  async run({ input, ai, log, progress, tick }) {
    const all = intentsFrom(input);
    const intents = intentPick.value === '*' ? all : all.filter((i) => i.name === intentPick.value);
    const target = intents.length ? intents : all;
    if (!target.length) {
      return {
        answer: { value: '0', label: 'Utterances', sub: 'No intents found.' },
        results: el('div', { class: 'empty' }, el('p', { class: 'empty__title' }, 'No intents found.'),
          el('p', {}, 'Use a sheet with an "intent" column and example columns, or "intent_name: example" lines.')),
        logLine: 'Read 0 intents',
        exports: [],
      };
    }
    const count = Number(countPick.value);
    const styles = new Set(styleChecks.filter((s) => s.check.checked).map((s) => s.id));
    const out: Utterance[] = [];
    for (const [i, intent] of target.entries()) {
      const made = variations(intent, styles, seeded(intent.name)).slice(0, count);
      out.push(...made.map((u) => ({ intent: intent.name, utterance: u.text, style: u.style, should_match: 'yes' as const, source: 'rules' as const })));
      progress(i + 1, target.length, `${i + 1} of ${target.length} intents`);
      await tick();
    }

    let aiCount = 0;
    if (ai.ready) {
      try {
        for (let start = 0; start < target.length; start += AI_INTENTS_PER_CALL) {
          const batch = target.slice(start, start + AI_INTENTS_PER_CALL);
          progress(start, target.length, `AI: ${start} of ${target.length} intents`);
          const seen = new Set(out.map((u) => `${u.intent}|${norm(u.utterance)}`));
          for (const u of await aiUtterances(ai, batch, count)) {
            const k = `${u.intent}|${norm(u.utterance)}`;
            if (seen.has(k)) continue;
            seen.add(k);
            out.push(u);
            aiCount += 1;
          }
        }
        progress(target.length, target.length, `${target.length} of ${target.length} intents`);
      } catch (error) {
        log.add(`AI utterances skipped: ${(error as Error).message} Rule-based utterances are shown.`, 'warn');
      }
    }
    out.sort((a, b) => target.findIndex((i) => i.name === a.intent) - target.findIndex((i) => i.name === b.intent));

    const summary = target.map((i) => {
      const mine = out.filter((u) => u.intent === i.name);
      return { intent: i.name, examples_in: i.examples.length, rules: mine.filter((u) => u.source === 'rules').length, ai: mine.filter((u) => u.source !== 'rules').length, should_not_match: mine.filter((u) => u.should_match === 'no').length };
    });
    const stem = baseName(input.name === 'pasted text' ? 'intents' : input.name);
    const rows = out as unknown as Record<string, unknown>[];
    return {
      answer: { value: String(out.length), label: 'Utterances', sub: `for ${target.length} intent${target.length === 1 ? '' : 's'}${aiCount ? ` · ${aiCount} AI-assisted` : ''}` },
      results: el('div', {},
        stats([
          { label: 'Intents', value: target.length },
          { label: 'Rule-based', value: out.length - aiCount },
          { label: 'AI-assisted', value: aiCount },
          { label: 'Should not match', value: out.filter((u) => u.should_match === 'no').length },
        ]),
        section('Per intent', dataTable({ columns: ['intent', 'examples_in', 'rules', 'ai', 'should_not_match'], rows: summary, mono: ['intent'] })),
        section('Utterances', aiCount ? aiChip('Rules + AI') : rulesChip(),
          dataTable({ columns: COLUMNS, rows, maxRows: 150, mono: ['intent', 'style'], testId: 'utterances' })),
      ),
      logLine: `Read ${all.length} intents · made ${out.length} utterances`,
      exports: [
        { label: 'Download .xlsx', run: () => downloadWorkbook(`${stem}_utterances.xlsx`, [{ name: 'utterances', rows, columns: COLUMNS }, { name: 'summary', rows: summary }]) },
        { label: 'Download .csv', run: () => downloadCsv(`${stem}_utterances.csv`, rows, COLUMNS) },
        { label: 'Download .json', run: () => downloadJson(`${stem}_utterances.json`, { generated_by: 'Kitsune Labs Utterance Generator', utterances: out }) },
      ],
    };
  },
};
