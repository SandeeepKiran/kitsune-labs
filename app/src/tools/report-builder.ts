// Report Builder: a QA summary report from run results (the Mousy answer key, a Bug Finder
// export, or transcripts checked by the rules on the spot). Issues are ranked by impact,
// not by count ("value over volume"). AI can write the executive summary from the numbers.
import { BUG_TYPES, type BugType } from '../shared/analysis.ts';
import { parseAiJson } from '../shared/ai.ts';
import { el } from '../shared/dom.ts';
import { baseName, downloadJson, downloadText } from '../shared/export.ts';
import { collectResults, percent, summarise, type RunResults, type Summary } from '../shared/findings-source.ts';
import { checkOption, optionChecks, optionGrid, selectOption, textOption } from '../shared/options.ts';
import { aiChip, rulesChip, stats } from '../shared/results.ts';
import type { AiSession, ToolDefinition } from '../shared/tool-page.ts';

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'table'; columns: string[]; rows: (string | number)[][] };

interface ReportSection {
  title: string;
  blocks: Block[];
  ai?: boolean;
}

interface Report {
  title: string;
  subtitle: string;
  sections: ReportSection[];
}

const title = textOption('report-title', 'Report title', 'QA summary: Mousy Assist');
const audience = selectOption('audience', 'Audience', [['team', 'Bot team (detailed)'], ['leaders', 'Leadership (short)']]);
const withExamples = checkOption('with-examples', 'Evidence examples', true);
const withFixes = checkOption('with-fixes', 'Recommendations', true);

function buildReport(results: RunResults, s: Summary, aiSummary: string | null): Report {
  const short = audience.value === 'leaders';
  const top = s.byType.slice(0, 3);
  const passRate = percent(s.clean, s.conversations);
  const sections: ReportSection[] = [];

  sections.push({
    title: 'Executive summary',
    ai: Boolean(aiSummary),
    blocks: [{
      kind: 'p',
      text: aiSummary ?? [
        `${s.conversations} conversations reviewed; ${s.clean} were clean (${passRate}).`,
        `${s.findings} findings: ${s.bySeverity.high} high, ${s.bySeverity.medium} medium, ${s.bySeverity.low} low severity.`,
        top.length ? `The biggest risk is ${top[0].title.toLowerCase()} (${top[0].conversations} conversation${top[0].conversations === 1 ? '' : 's'}).` : 'No open issues.',
      ].join(' '),
    }],
  });

  sections.push({
    title: 'Top issues (value over volume)',
    blocks: [
      { kind: 'p', text: 'Issues are ranked by impact: severity weight (high 5, medium 3, low 1) times the number of conversations hit. A rare high-severity bug can outrank a common cosmetic one.' },
      {
        kind: 'table',
        columns: ['Rank', 'Issue', 'Severity', 'Conversations', 'Findings', 'Impact'],
        rows: (short ? top : s.byType).map((t, i) => [i + 1, t.title, t.severity, t.conversations, t.count, t.impact]),
      },
    ],
  });

  if (!short) {
    sections.push({
      title: 'By intent',
      blocks: [{ kind: 'table', columns: ['Intent', 'Conversations', 'With bugs', 'Bug rate'], rows: s.byIntent.map((r) => [r.intent, r.conversations, r.withBugs, percent(r.withBugs, r.conversations)]) }],
    });
    sections.push({
      title: 'By channel and outcome',
      blocks: [
        { kind: 'table', columns: ['Channel', 'Conversations', 'With bugs', 'Bug rate'], rows: s.byChannel.map((r) => [r.channel, r.conversations, r.withBugs, percent(r.withBugs, r.conversations)]) },
        { kind: 'list', items: Object.entries(s.outcomes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v} (${percent(v, s.conversations)})`) },
      ],
    });
  }

  if (withExamples.checked && top.length) {
    const items = top.map((t) => {
      const hit = results.conversations.find((c) => c.findings.some((f) => f.type === t.type));
      const f = hit?.findings.find((x) => x.type === t.type);
      return `${t.title}: ${hit?.id ?? '?'}, turn ${f?.turn ?? '?'}. ${f?.evidence ?? ''}`.trim();
    });
    sections.push({ title: 'Evidence', blocks: [{ kind: 'list', items }] });
  }

  if (withFixes.checked && top.length) {
    sections.push({
      title: 'Recommendations',
      blocks: [{ kind: 'list', items: top.map((t) => `${t.title}: ${BUG_TYPES[t.type as BugType]?.fix ?? 'Investigate and add a regression test.'}`) }],
    });
  }

  sections.push({
    title: 'About this report',
    blocks: [{ kind: 'p', text: `Source: ${results.source}. Built with Kitsune Labs Report Builder${aiSummary ? '; executive summary AI-assisted' : ''}. All Mousy data is invented.` }],
  });

  return {
    title: title.value || 'QA summary',
    subtitle: `${s.conversations} conversations · ${s.findings} findings · pass rate ${passRate}`,
    sections,
  };
}

async function aiExecutiveSummary(ai: AiSession, s: Summary): Promise<string> {
  // Only the totals go to the AI, never transcripts: cheaper, and nothing private to send.
  const reply = await ai.ask({
    system: 'You write short executive summaries of QA results for a customer-support bot. Plain English, no hype, no bullet points. Answer with JSON only.',
    prompt: [
      `Audience: ${audience.value === 'leaders' ? 'leadership, 2-3 sentences' : 'the bot team, 3-5 sentences'}.`,
      'Say what is working, the biggest risk, and the one thing to fix first. Use only these numbers:',
      JSON.stringify({ conversations: s.conversations, clean: s.clean, findings: s.findings, bySeverity: s.bySeverity, topIssues: s.byType.slice(0, 5), byChannel: s.byChannel }),
      'Return {"summary": "..."}.',
    ].join('\n'),
    json: true,
  });
  const text = parseAiJson<{ summary?: unknown }>(reply.text).summary;
  if (typeof text !== 'string' || !text.trim()) throw new Error('The AI answer had no summary.');
  return text.trim().slice(0, 1200);
}

// -- three renderings of one report ----------------------------------------------------------

function toDom(report: Report): HTMLElement {
  return el('article', { class: 'report', 'data-testid': 'report' },
    el('h3', { class: 'report__title' }, report.title),
    el('p', { class: 'report__sub' }, report.subtitle),
    ...report.sections.map((sec) => el('section', { class: 'report__section' },
      el('h4', { class: 'result-section__title' }, sec.title, sec.ai ? aiChip() : null),
      ...sec.blocks.map((b) => {
        if (b.kind === 'p') return el('p', {}, b.text);
        if (b.kind === 'list') return el('ul', {}, ...b.items.map((i) => el('li', {}, i)));
        return el('div', { class: 'table-wrap' }, el('table', { class: 'data-table' },
          el('thead', {}, el('tr', {}, ...b.columns.map((c) => el('th', { scope: 'col' }, c)))),
          el('tbody', {}, ...b.rows.map((r) => el('tr', {}, ...r.map((cell) => el('td', {}, String(cell))))))));
      }))));
}

function toMarkdown(report: Report): string {
  const cell = (v: string | number) => String(v).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const out = [`# ${report.title}`, '', `_${report.subtitle}_`, ''];
  for (const sec of report.sections) {
    out.push(`## ${sec.title}${sec.ai ? ' (AI-assisted)' : ''}`, '');
    for (const b of sec.blocks) {
      if (b.kind === 'p') out.push(b.text, '');
      else if (b.kind === 'list') out.push(...b.items.map((i) => `- ${i}`), '');
      else out.push(`| ${b.columns.map(cell).join(' | ')} |`, `|${b.columns.map(() => ' --- ').join('|')}|`, ...b.rows.map((r) => `| ${r.map(cell).join(' | ')} |`), '');
    }
  }
  return out.join('\n');
}

const esc = (v: string | number) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function toHtml(report: Report): string {
  const body = report.sections.map((sec) => [
    `<h2>${esc(sec.title)}${sec.ai ? ' <span class="ai">✦ AI-assisted</span>' : ''}</h2>`,
    ...sec.blocks.map((b) => {
      if (b.kind === 'p') return `<p>${esc(b.text)}</p>`;
      if (b.kind === 'list') return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
      return `<table><thead><tr>${b.columns.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    }),
  ].join('\n')).join('\n');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(report.title)}</title>
<style>
body{margin:0;padding:40px 20px;background:#f4f0fb;color:#3a2a5a;font:15px/1.6 system-ui,'Segoe UI',sans-serif}
main{max-width:860px;margin:auto;background:#fff;border-radius:26px;padding:32px 36px;box-shadow:inset 0 0 0 1.5px #d4a84a}
h1{margin:0;font-size:30px}h2{margin:28px 0 8px;font-size:18px}.sub{color:#6b5a86;margin:4px 0 0}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{padding:7px 10px;text-align:left;border-bottom:1px solid #ece6f7}
.ai{color:#7c3aed;font-size:13px}footer{margin-top:28px;color:#6b5a86;font-size:13px}
</style></head><body><main>
<h1>${esc(report.title)}</h1><p class="sub">${esc(report.subtitle)}</p>
${body}
<footer>Kitsune Labs · All Mousy data is invented. Mousy is not a real company.</footer>
</main></body></html>
`;
}

export const definition: ToolDefinition = {
  answerLabel: 'Pass rate',
  heroHint: 'Drop answer_key.json, a Bug Finder export, or transcripts (.csv, .xlsx, .zip)',
  inputLabel: 'Run results or transcripts',
  inputHint: 'JSON results are read as they are. Transcripts are checked by the rules first.',
  placeholder: '{ "conversations": [ { "conversation_id": "CNV-000001", "bugs": [ … ] } ] }',
  mapping: true,
  aiNote: 'AI writes the executive summary from the totals only. No transcript is sent.',
  options: () => el('div', {}, optionGrid(title.element, audience.element), optionChecks('Include', withExamples, withFixes)),
  async run({ input, mapping, ai, log }) {
    const results = collectResults(input, mapping);
    if (!results.conversations.length) {
      return {
        answer: { value: '–', label: 'Pass rate', sub: 'No results found.' },
        results: el('div', { class: 'empty' }, el('p', { class: 'empty__title' }, 'No results found.'),
          el('p', {}, 'Load answer_key.json, a Bug Finder .json export, or a file of transcripts.')),
        logLine: 'Read 0 conversations',
        exports: [],
      };
    }
    const s = summarise(results);
    let aiSummary: string | null = null;
    if (ai.ready) {
      try {
        aiSummary = await aiExecutiveSummary(ai, s);
      } catch (error) {
        log.add(`AI summary skipped: ${(error as Error).message} The rule-based summary is shown.`, 'warn');
      }
    }
    const report = buildReport(results, s, aiSummary);
    const stem = baseName(input.name === 'pasted text' ? 'qa' : input.name);
    return {
      answer: { value: percent(s.clean, s.conversations), label: 'Pass rate', sub: `${s.clean} of ${s.conversations} conversations clean · ${s.bySeverity.high} high-severity findings` },
      results: el('div', {},
        el('p', { class: 'result-section__title' }, aiSummary ? aiChip('Summary AI-assisted') : rulesChip(), `Source: ${results.source}`),
        stats([
          { label: 'Conversations', value: s.conversations },
          { label: 'Clean', value: s.clean, tone: 'pass' },
          { label: 'High', value: s.bySeverity.high, tone: 'fail' },
          { label: 'Medium', value: s.bySeverity.medium, tone: 'warn' },
          { label: 'Low', value: s.bySeverity.low, tone: 'warn' },
        ]),
        toDom(report),
      ),
      logLine: `Read ${s.conversations} conversations from the ${results.source} · ${s.findings} findings · ${s.byType.length} issue types`,
      exports: [
        { label: 'Download .md', run: () => downloadText(`${stem}_report.md`, toMarkdown(report), 'text/markdown') },
        { label: 'Download .html', run: () => downloadText(`${stem}_report.html`, toHtml(report), 'text/html') },
        { label: 'Download .json', run: () => downloadJson(`${stem}_report.json`, { generated_by: 'Kitsune Labs Report Builder', summary: s, report }) },
      ],
    };
  },
};
