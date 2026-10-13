// First Utterance Finder: the first customer turn that says what they want, per conversation.
// Fillers ("hello?", "um, hi") are skipped. Rules guess the intent; AI can label it too.
import { firstRealUtterance, guessIntent, INTENT_IDS } from '../shared/analysis.ts';
import { keyEntry, loadAnswerKey } from '../shared/answer-key.ts';
import { parseAiJson } from '../shared/ai.ts';
import { conversationsFrom } from '../shared/conversations.ts';
import { el } from '../shared/dom.ts';
import { baseName, downloadCsv, downloadJson } from '../shared/export.ts';
import { downloadWorkbook } from '../shared/files.ts';
import { aiChip, dataTable, rulesChip, section, stats } from '../shared/results.ts';
import { statusChip } from '../shared/status.ts';
import type { ToolDefinition } from '../shared/tool-page.ts';

interface Row {
  conversation_id: string;
  turn: number | '';
  first_utterance: string;
  skipped_fillers: string;
  intent_rules: string;
  intent_ai?: string;
}

const AI_BATCH = 50;

export const definition: ToolDefinition = {
  answerLabel: 'First utterances',
  heroHint: 'Drop a .csv, .xlsx or .zip of transcripts, or paste one',
  inputHint: 'Works on one transcript or a whole batch. Ctrl+Enter runs.',
  mapping: true,
  aiNote: 'AI labels the intent of each first utterance. Rules still find the utterance.',
  async run({ input, mapping, ai, log, progress, tick }) {
    const conversations = conversationsFrom(input, mapping);
    const rows: Row[] = [];
    for (const [i, c] of conversations.entries()) {
      const first = firstRealUtterance(c.turns);
      rows.push({
        conversation_id: c.id,
        turn: first?.turn ?? '',
        first_utterance: first?.text ?? '',
        skipped_fillers: first?.skipped.join(' | ') ?? '',
        intent_rules: (first && guessIntent(first.text)) || '',
      });
      if (i % 25 === 0) { progress(i + 1, conversations.length, `${i + 1} of ${conversations.length} conversations`); await tick(); }
    }
    progress(conversations.length, conversations.length, `${conversations.length} of ${conversations.length} conversations`);

    let aiUsed = false;
    if (ai.ready && rows.some((r) => r.first_utterance)) {
      try {
        for (let start = 0; start < rows.length; start += AI_BATCH) {
          const batch = rows.slice(start, start + AI_BATCH).filter((r) => r.first_utterance);
          const reply = await ai.ask({
            system: 'You label customer messages sent to an online-shop support bot with an intent. Answer with JSON only.',
            prompt: [
              `Known intents: ${INTENT_IDS.join(', ')}. Use "other" if none fits.`,
              'Return {"labels": [{"id": "<id>", "intent": "<intent>"}]} with one entry per message.',
              'Messages:',
              ...batch.map((r) => `${r.conversation_id}: ${r.first_utterance}`),
            ].join('\n'),
            json: true,
          });
          const labels = parseAiJson<{ labels?: { id?: string; intent?: string }[] }>(reply.text).labels ?? [];
          for (const label of labels) {
            const row = rows.find((r) => r.conversation_id === label.id);
            if (row && typeof label.intent === 'string') row.intent_ai = label.intent.slice(0, 60);
          }
        }
        aiUsed = true;
      } catch (error) {
        log.add(`AI labels skipped: ${(error as Error).message}`, 'warn');
      }
    }

    // On Mousy samples, compare with the answer key so the visitor can see the rules are right.
    const key = await loadAnswerKey();
    let checked = 0;
    let matched = 0;
    for (const c of conversations) {
      const entry = keyEntry(key, c);
      if (!entry) continue;
      checked += 1;
      const row = rows.find((r) => r.conversation_id === c.id);
      if (row && row.turn === entry.first_customer_utterance.turn && row.first_utterance === entry.first_customer_utterance.text) matched += 1;
    }

    const found = rows.filter((r) => r.first_utterance).length;
    const withFiller = rows.filter((r) => r.skipped_fillers).length;
    const columns = ['conversation_id', 'turn', 'first_utterance', 'skipped_fillers', 'intent_rules', ...(aiUsed ? ['intent_ai'] : [])];
    const stem = baseName(input.name === 'pasted text' ? 'conversation' : input.name);
    return {
      answer: {
        value: String(found),
        label: 'First utterances',
        sub: `from ${conversations.length} conversation${conversations.length === 1 ? '' : 's'} · ${withFiller} opened with a filler`,
      },
      results: el('div', {},
        checked ? el('div', { class: 'key-check', 'data-testid': 'key-check' },
          statusChip(matched === checked ? 'pass' : 'warn', matched === checked ? 'Matches answer key' : 'Some differ'),
          el('span', {}, `${matched} of ${checked} match the Mousy answer key.`)) : null,
        stats([
          { label: 'Conversations', value: conversations.length },
          { label: 'Found', value: found, tone: found === conversations.length ? 'pass' : 'warn' },
          { label: 'Skipped a filler', value: withFiller },
        ]),
        section('First customer turns', aiUsed ? aiChip('AI-assisted intent labels') : rulesChip(),
          dataTable({ columns, rows: rows as unknown as Record<string, unknown>[], mono: ['conversation_id', 'turn', 'intent_rules', 'intent_ai'], testId: 'first-utterances' })),
      ),
      logLine: `Checked ${conversations.length} conversations · ${found} first utterances · ${withFiller} fillers skipped`,
      exports: [
        { label: 'Download .xlsx', run: () => downloadWorkbook(`${stem}_first_utterances.xlsx`, [{ name: 'first_utterances', rows: rows as unknown as Record<string, unknown>[], columns }]) },
        { label: 'Download .csv', run: () => downloadCsv(`${stem}_first_utterances.csv`, rows as unknown as Record<string, unknown>[], columns) },
        { label: 'Download .json', run: () => downloadJson(`${stem}_first_utterances.json`, { generated_by: 'Kitsune Labs First Utterance Finder', ai_assisted: aiUsed, rows }) },
      ],
    };
  },
};
