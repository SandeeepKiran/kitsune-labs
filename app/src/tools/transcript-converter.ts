// Transcript Converter: raw chat text in, clean test scripts out (.txt, .json or .yaml).
// Open formats only (decision D6). Many conversations in (.csv, .xlsx, .zip) = one .zip out.
import { conversationsFrom, type Conversation } from '../shared/conversations.ts';
import { el } from '../shared/dom.ts';
import { downloadText } from '../shared/export.ts';
import { downloadZip } from '../shared/files.ts';
import { checkOption, optionChecks, optionGrid, selectOption } from '../shared/options.ts';
import { dataTable, rulesChip, section, stats } from '../shared/results.ts';
import { scriptToJson, scriptToText, scriptToYaml, toScript, type TestScript } from '../shared/script.ts';
import type { ToolDefinition } from '../shared/tool-page.ts';

type Format = 'txt' | 'json' | 'yaml';

const WRITERS: Record<Format, { write: (s: TestScript) => string; mime: string }> = {
  txt: { write: scriptToText, mime: 'text/plain' },
  json: { write: scriptToJson, mime: 'application/json' },
  yaml: { write: scriptToYaml, mime: 'application/yaml' },
};

const format = selectOption('out-format', 'Output format', [
  ['txt', 'Text test script (.txt)'], ['json', 'JSON test script (.json)'], ['yaml', 'YAML test script (.yaml)'],
]);
const keepTimes = checkOption('keep-times', 'Keep timestamps', false);
const orderVariable = checkOption('order-variable', 'Order IDs become {{order_id}}', true);

const safeName = (name: string) => name.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'conversation';

/** One file name per script. A .zip can hold "a/x.txt" and "b/x.json"; without this the second would overwrite the first. */
function uniqueNames(scripts: TestScript[]): string[] {
  const used = new Map<string, number>();
  return scripts.map((s) => {
    const name = safeName(s.name);
    const count = (used.get(name) ?? 0) + 1;
    used.set(name, count);
    return count === 1 ? name : `${name}_${count}`;
  });
}

function convert(conversations: Conversation[]): TestScript[] {
  return conversations.map((c) => toScript(c.turns, c.name, { keepTimes: keepTimes.checked, orderIdVariable: orderVariable.checked }));
}

export const definition: ToolDefinition = {
  answerLabel: 'Test steps',
  heroHint: 'Paste a transcript, or drop .txt, .json, .yaml, .csv, .xlsx or .zip',
  inputHint: 'One conversation, or many in a spreadsheet or .zip. Ctrl+Enter runs.',
  mapping: true,
  options: () => el('div', {},
    optionGrid(format.element),
    optionChecks('Cleaning', keepTimes, orderVariable),
  ),
  run({ input, mapping }) {
    const conversations = conversationsFrom(input, mapping);
    if (!conversations.length) {
      return {
        answer: { value: '0', label: 'Test steps', sub: 'No turns found. Check the line format.' },
        results: el('div', { class: 'empty' },
          el('p', { class: 'empty__title' }, 'No turns found.'),
          el('p', {}, 'Each line should look like "[00:00:02] Mousy Assist: Hi" or "Customer: Hi".')),
        logLine: 'Parsed 0 turns',
        exports: [],
      };
    }
    const fmt = format.value as Format;
    const writer = WRITERS[fmt];
    const scripts = convert(conversations);
    const userSteps = (s: TestScript) => s.steps.filter((step) => step.user_says !== undefined).length;
    const turns = conversations.reduce((n, c) => n + c.turns.length, 0);
    const first = scripts[0];
    const preview = el('pre', { class: 'preview mono', 'data-testid': 'script-preview' }, writer.write(first));
    const header = el('p', { class: 'result-section__title' }, rulesChip('No AI'), `Format: ${first.format}`);

    if (conversations.length === 1) {
      const stem = safeName(first.name);
      return {
        answer: { value: String(userSteps(first)), label: 'Test steps', sub: `customer steps from ${turns} turns${first.steps.length > userSteps(first) ? ` (+${first.steps.length - userSteps(first)} bot-only)` : ''} · .${fmt}` },
        results: el('div', {}, header, preview),
        logLine: `Parsed ${turns} turns · ${userSteps(first)} user steps · .${fmt}`,
        exports: [
          { label: `Download .${fmt}`, run: () => downloadText(`${stem}.${fmt}`, writer.write(first), writer.mime) },
          { label: 'Download all 3 formats (.zip)', run: () => downloadZip(`${stem}_scripts.zip`, allFormats([first])) },
        ],
      };
    }

    const names = uniqueNames(scripts);
    const rows = scripts.map((s, i) => ({
      file: `${names[i]}.${fmt}`, turns: conversations[i].turns.length, user_steps: userSteps(s),
      bot_lines: s.steps.reduce((n, step) => n + step.expect_bot.length, 0),
    }));
    const zipName = `${safeName(input.name.replace(/\.[^.]+$/, ''))}_${fmt}_scripts.zip`;
    return {
      answer: { value: String(scripts.length), label: 'Scripts converted', sub: `${turns} turns · one .${fmt} file each` },
      results: el('div', {},
        stats([
          { label: 'Scripts', value: scripts.length },
          { label: 'Turns', value: turns },
          { label: 'User steps', value: rows.reduce((n, r) => n + r.user_steps, 0) },
        ]),
        section('Files in the .zip', dataTable({ columns: ['file', 'turns', 'user_steps', 'bot_lines'], rows, mono: ['file'], testId: 'converted-files' })),
        section(`Preview: ${rows[0].file}`, preview),
      ),
      logLine: `Converted ${scripts.length} conversations · ${turns} turns · .${fmt}`,
      exports: [
        { label: `Download .zip (${scripts.length} .${fmt} files)`, run: () => downloadZip(zipName, scripts.map((s, i) => ({ name: `${names[i]}.${fmt}`, text: writer.write(s) }))) },
        { label: 'Download all 3 formats (.zip)', run: () => downloadZip(zipName.replace(`_${fmt}_`, '_all_'), allFormats(scripts)) },
      ],
    };
  },
};

function allFormats(scripts: TestScript[]) {
  const names = uniqueNames(scripts);
  return scripts.flatMap((s, i) => (Object.keys(WRITERS) as Format[]).map((f) => ({ name: `${f}/${names[i]}.${f}`, text: WRITERS[f].write(s) })));
}
