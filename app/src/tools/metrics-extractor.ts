// Metrics Extractor: adds metric columns to a transcript spreadsheet. No AI.
// New columns start with "metric_" (computed from the transcript) or "cm_" (unpacked from a
// custom-metrics JSON column), so they never overwrite a column that is already there.
import { measure, type ConversationMetrics } from '../shared/analysis.ts';
import { conversationsFrom } from '../shared/conversations.ts';
import { el } from '../shared/dom.ts';
import { baseName, downloadCsv } from '../shared/export.ts';
import { downloadWorkbook } from '../shared/files.ts';
import { checkOption, optionChecks } from '../shared/options.ts';
import { dataTable, rulesChip, section, stats } from '../shared/results.ts';
import { statusChip } from '../shared/status.ts';
import type { ToolDefinition } from '../shared/tool-page.ts';

type Key = keyof ConversationMetrics;

const GROUPS: { id: string; label: string; keys: Key[]; on: boolean }[] = [
  { id: 'm-turns', label: 'Turns', keys: ['turns', 'bot_turns', 'customer_turns', 'avg_customer_words'], on: true },
  { id: 'm-duration', label: 'Duration', keys: ['duration_sec'], on: true },
  { id: 'm-fallbacks', label: 'Fallbacks', keys: ['fallbacks', 'reprompts', 'max_fallback_streak'], on: true },
  { id: 'm-escalation', label: 'Escalation', keys: ['escalated', 'escalation_turn'], on: true },
  { id: 'm-ending', label: 'Ending', keys: ['ending'], on: true },
  { id: 'm-first', label: 'First utterance + intent', keys: ['first_utterance', 'first_utterance_turn', 'intent_guess'], on: true },
  { id: 'm-ids', label: 'Order IDs', keys: ['order_ids'], on: false },
  { id: 'm-flags', label: 'Rule findings', keys: ['rule_findings', 'rule_flags'], on: true },
];
const checks = GROUPS.map((g) => ({ group: g, check: checkOption(g.id, g.label, g.on) }));
const expandCustom = checkOption('m-custom', 'Unpack custom_metrics JSON into cm_ columns', true);

const CUSTOM_COLUMN = /^(custom_?metrics|metrics|cm)$/i;

export const definition: ToolDefinition = {
  answerLabel: 'Metric columns',
  heroHint: 'Drop a .csv or .xlsx of conversations (one transcript per row)',
  inputLabel: 'Spreadsheet or transcript',
  inputHint: 'Each row needs a transcript column. A single pasted transcript works too.',
  mapping: true,
  options: () => el('div', {},
    optionChecks('Metrics to add', ...checks.map((c) => c.check)),
    optionChecks('Existing data', expandCustom),
  ),
  async run({ input, mapping, progress, tick }) {
    const conversations = conversationsFrom(input, mapping);
    const keys = checks.filter((c) => c.check.checked).flatMap((c) => c.group.keys);
    const metricColumns = keys.map((k) => `metric_${k}`);
    const originalColumns = input.kind === 'table' ? input.table.columns : ['conversation_id'];
    const customColumn = input.kind === 'table' ? input.table.columns.find((c) => CUSTOM_COLUMN.test(c)) : undefined;
    const customKeys: string[] = [];
    let customBad = 0;

    const rows: Record<string, unknown>[] = [];
    const all: ConversationMetrics[] = [];
    for (const [i, c] of conversations.entries()) {
      const m = measure(c.turns);
      all.push(m);
      const out: Record<string, unknown> = c.row ? { ...c.row } : { conversation_id: c.id };
      for (const k of keys) out[`metric_${k}`] = m[k] ?? '';
      if (expandCustom.checked && customColumn && c.row?.[customColumn]) {
        try {
          const parsed = JSON.parse(c.row[customColumn]) as Record<string, unknown>;
          for (const [k, v] of Object.entries(parsed)) {
            const name = `cm_${k}`;
            if (!customKeys.includes(name)) customKeys.push(name);
            out[name] = typeof v === 'object' ? JSON.stringify(v) : v;
          }
        } catch {
          customBad += 1;
        }
      }
      rows.push(out);
      if (i % 20 === 0) { progress(i + 1, conversations.length, `${i + 1} of ${conversations.length} rows`); await tick(); }
    }
    progress(conversations.length, conversations.length, `${conversations.length} of ${conversations.length} rows`);

    const added = [...metricColumns, ...customKeys];
    const columns = [...originalColumns, ...added];
    const n = all.length || 1;
    const escalated = all.filter((m) => m.escalated).length;
    const timeouts = all.filter((m) => m.ending === 'timeout').length;
    const avgTurns = Math.round((all.reduce((s, m) => s + m.turns, 0) / n) * 10) / 10;
    const withFallback = all.filter((m) => m.fallbacks > 0).length;

    // QA cross-check: if the sheet already says which rows escalated, compare with what the transcript shows.
    let crossCheck: HTMLElement | null = null;
    const sourceEscalated = input.kind === 'table' ? input.table.columns.find((c) => /^escalated$/i.test(c)) : undefined;
    if (sourceEscalated) {
      const agree = conversations.filter((c, i) => /^(true|yes|1)$/i.test(c.row?.[sourceEscalated] ?? '') === all[i].escalated).length;
      crossCheck = el('div', { class: 'key-check', 'data-testid': 'cross-check' },
        statusChip(agree === conversations.length ? 'pass' : 'warn', agree === conversations.length ? 'Agrees' : 'Differs'),
        el('span', {}, `Escalation from the transcript agrees with the "${sourceEscalated}" column on ${agree} of ${conversations.length} rows.`));
    }

    const preview = rows.map((r) => Object.fromEntries([['id', r.conversation_id ?? ''], ...added.map((c) => [c.replace(/^metric_/, ''), r[c]])]));
    const stem = baseName(input.name === 'pasted text' ? 'conversation' : input.name);
    return {
      answer: { value: String(added.length), label: 'Metric columns added', sub: `on ${rows.length} row${rows.length === 1 ? '' : 's'}${customBad ? ` · ${customBad} custom_metrics cells were not JSON` : ''}` },
      results: el('div', {},
        crossCheck,
        stats([
          { label: 'Rows', value: rows.length },
          { label: 'Avg turns', value: avgTurns },
          { label: 'Had a fallback', value: withFallback, tone: withFallback ? 'warn' : 'pass' },
          { label: 'Escalated', value: escalated },
          { label: 'Timed out', value: timeouts, tone: timeouts ? 'warn' : 'pass' },
        ]),
        section('New columns', rulesChip(),
          dataTable({ columns: Object.keys(preview[0] ?? { id: '' }), rows: preview, maxRows: 100, mono: ['id'], testId: 'metrics-table' })),
      ),
      logLine: `Measured ${rows.length} conversations · ${added.length} columns added`,
      exports: [
        { label: 'Download .xlsx', run: () => downloadWorkbook(`${stem}_with_metrics.xlsx`, [{ name: 'conversations', rows, columns }]) },
        { label: 'Download .csv', run: () => downloadCsv(`${stem}_with_metrics.csv`, rows, columns) },
      ],
    };
  },
};
