// Test Case Generator: transcripts in, structured test cases out. Map the columns of any
// spreadsheet. Rules build a case from each conversation (steps = what the customer says,
// expected = what the bot says, with known bugs flagged). AI rewrites cases as intended behaviour.
import { expectedBehaviour, findBugs, firstRealUtterance, guessIntent, type Finding } from '../shared/analysis.ts';
import { parseAiJson } from '../shared/ai.ts';
import { conversationsFrom, type Conversation } from '../shared/conversations.ts';
import { el } from '../shared/dom.ts';
import { baseName, downloadCsv, downloadJson } from '../shared/export.ts';
import { downloadWorkbook } from '../shared/files.ts';
import { optionGrid, selectOption } from '../shared/options.ts';
import { aiChip, dataTable, rulesChip, section, stats } from '../shared/results.ts';
import type { AiSession, ToolDefinition } from '../shared/tool-page.ts';

interface TestCase {
  test_case_id: string;
  title: string;
  intent: string;
  channel: string;
  priority: 'High' | 'Medium' | 'Low';
  preconditions: string;
  steps: string;
  expected_results: string;
  known_issues: string;
  source: 'rules' | 'AI-assisted';
}

const COLUMNS: (keyof TestCase)[] = ['test_case_id', 'title', 'intent', 'channel', 'priority', 'preconditions', 'steps', 'expected_results', 'known_issues', 'source'];
const AI_PER_CALL = 5;

const aiLimit = selectOption('ai-limit', 'AI rewrites (cost control)', [['5', 'First 5 cases'], ['10', 'First 10 cases'], ['20', 'First 20 cases'], ['all', 'All cases']]);
const priorityRule = selectOption('priority-rule', 'Priority', [['bugs', 'High when a high bug is found'], ['flat', 'Medium for every case']]);

const flat = (text: string) => text.replace(/\s+/g, ' ').trim();
const numberedLines = (lines: string[]) => lines.map((line, i) => `${i + 1}. ${line}`).join('\n');

function channelOf(c: Conversation): string {
  const declared = c.row?.channel?.trim();
  if (declared) return declared;
  return /\bcall(ing)?\b/i.test(c.turns.find((t) => t.role === 'bot')?.text ?? '') ? 'voice' : 'chat';
}

function rulesCase(c: Conversation, findings: Finding[], flatPriority: boolean): TestCase {
  const channel = channelOf(c);
  const verb = channel === 'voice' ? 'Say' : 'Type';
  const bot = c.turns.find((t) => t.role === 'bot');
  const first = firstRealUtterance(c.turns);
  const intent = (first && guessIntent(first.text)) || 'unknown';
  const byTurn = new Map(findings.map((f) => [f.turn, f]));
  const steps: string[] = [];
  const expected: string[] = [];
  let current: string[] = [];
  let started = false;
  const flush = () => {
    if (!started) return;
    expected.push(current.length ? current.join(' ') : 'The bot answers.');
    current = [];
  };
  for (const turn of c.turns) {
    if (turn.role === 'customer') {
      flush();
      started = true;
      steps.push(`${verb}: "${flat(turn.text)}"`);
    } else if (started) {
      const bug = byTurn.get(turn.index);
      current.push(bug
        ? `${expectedBehaviour(bug)} (Known issue at turn ${turn.index}: ${bug.title}. Recorded: "${flat(turn.text)}")`
        : `The bot says: "${flat(turn.text)}"`);
    }
  }
  flush();
  const worst = findings.some((f) => f.severity === 'high') ? 'High' : findings.length ? 'Medium' : 'Low';
  return {
    test_case_id: `TC-${c.id}`,
    title: `Verify ${intent === 'unknown' ? 'the conversation' : intent.replace(/_/g, ' ')}: "${flat(first?.text ?? '').slice(0, 60)}"`,
    intent,
    channel,
    priority: flatPriority ? 'Medium' : worst,
    preconditions: `Start a new ${channel} conversation with ${bot?.speaker ?? 'the bot'}.${bot ? ` The bot greets: "${flat(bot.text)}"` : ''}`,
    steps: numberedLines(steps),
    expected_results: numberedLines(expected),
    known_issues: findings.map((f) => `${f.type}@${f.turn}`).join('; '),
    source: 'rules',
  };
}

interface AiCase { id?: string; title?: string; priority?: string; preconditions?: string; steps?: string[]; expected?: string[] }

async function aiRewrite(ai: AiSession, items: { c: Conversation; tc: TestCase }[]): Promise<Map<string, AiCase>> {
  const reply = await ai.ask({
    system: 'You are a QA engineer who writes test cases for a customer-support bot. Write in Simplified Technical English: '
      + 'short sentences, one action per step, imperative steps, no idioms. Expected results describe the CORRECT behaviour, '
      + 'even when the recorded conversation shows a bug. Answer with JSON only.',
    prompt: [
      'For each conversation, write one test case.',
      'Return {"cases": [{"id": "<id>", "title": "", "priority": "High|Medium|Low", "preconditions": "", "steps": ["..."], "expected": ["..."]}]}.',
      'steps and expected must have the same length: expected[i] is the result of steps[i].',
      ...items.map(({ c, tc }) => [
        `### ${tc.test_case_id}`,
        `Known issues: ${tc.known_issues || 'none'}`,
        ...c.turns.map((t) => `${t.index} [${t.role}] ${flat(t.text)}`),
      ].join('\n')),
    ].join('\n\n'),
    json: true,
  });
  const cases = parseAiJson<{ cases?: AiCase[] }>(reply.text).cases ?? [];
  return new Map(cases.filter((x) => typeof x.id === 'string').map((x) => [x.id!, x]));
}

const strings = (value: unknown) => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string').map((v) => v.slice(0, 400)) : []);

export const definition: ToolDefinition = {
  answerLabel: 'Test cases',
  heroHint: 'Drop a .csv or .xlsx of transcripts, then map the columns',
  inputLabel: 'Spreadsheet or transcript',
  inputHint: 'Pick the transcript and ID columns under the file name. A single pasted transcript works too.',
  mapping: true,
  aiNote: 'AI rewrites each case in Simplified Technical English, with expected results for the correct behaviour.',
  options: () => optionGrid(priorityRule.element, aiLimit.element),
  async run({ input, mapping, ai, log, progress, tick }) {
    const conversations = conversationsFrom(input, mapping);
    const cases: TestCase[] = [];
    for (const [i, c] of conversations.entries()) {
      cases.push(rulesCase(c, findBugs(c.turns), priorityRule.value === 'flat'));
      if (i % 10 === 0) { progress(i + 1, conversations.length, `${i + 1} of ${conversations.length} cases`); await tick(); }
    }

    let rewritten = 0;
    if (ai.ready && cases.length) {
      const limit = aiLimit.value === 'all' ? cases.length : Math.min(cases.length, Number(aiLimit.value));
      try {
        for (let start = 0; start < limit; start += AI_PER_CALL) {
          const batch = conversations.slice(start, Math.min(limit, start + AI_PER_CALL)).map((c, j) => ({ c, tc: cases[start + j] }));
          progress(start, limit, `AI: ${start} of ${limit} cases`);
          const answers = await aiRewrite(ai, batch);
          for (const { tc } of batch) {
            const a = answers.get(tc.test_case_id);
            const steps = strings(a?.steps);
            const expected = strings(a?.expected);
            if (!a || !steps.length) continue;
            tc.title = String(a.title ?? tc.title).slice(0, 160);
            if (a.priority === 'High' || a.priority === 'Medium' || a.priority === 'Low') tc.priority = a.priority;
            tc.preconditions = String(a.preconditions ?? tc.preconditions).slice(0, 400);
            tc.steps = numberedLines(steps);
            tc.expected_results = numberedLines(expected.length ? expected : steps.map(() => 'The bot answers correctly.'));
            tc.source = 'AI-assisted';
            rewritten += 1;
          }
        }
        progress(limit, limit, `AI rewrote ${rewritten} of ${limit} cases`);
      } catch (error) {
        log.add(`AI rewrite stopped: ${(error as Error).message} The other cases stay rule-based.`, 'warn');
      }
    } else {
      progress(cases.length, cases.length, `${cases.length} of ${cases.length} cases`);
    }

    const first = cases[0];
    const stepCount = (tc: TestCase) => (tc.steps ? tc.steps.split('\n').length : 0);
    const tableRows = cases.map((tc) => ({ id: tc.test_case_id, title: tc.title, priority: tc.priority, steps: stepCount(tc), known_issues: tc.known_issues, source: tc.source }));
    const stem = baseName(input.name === 'pasted text' ? 'conversation' : input.name);
    const detail = first ? el('article', { class: 'tc-detail', 'data-testid': 'test-case' },
      el('p', { class: 'result-section__title' }, el('span', { class: 'mono' }, first.test_case_id), first.source === 'AI-assisted' ? aiChip() : rulesChip('Rules')),
      el('h4', { class: 'finding__title' }, first.title),
      el('p', {}, el('strong', {}, 'Preconditions: '), first.preconditions),
      el('div', { class: 'tc-columns' },
        el('div', {}, el('strong', {}, 'Steps'), el('pre', { class: 'preview mono' }, first.steps)),
        el('div', {}, el('strong', {}, 'Expected results'), el('pre', { class: 'preview mono' }, first.expected_results)),
      ),
    ) : null;

    return {
      answer: {
        value: String(cases.length),
        label: cases.length === 1 ? 'Test case' : 'Test cases',
        sub: `${cases.filter((c) => c.priority === 'High').length} high priority${rewritten ? ` · ${rewritten} AI-assisted` : ''}`,
      },
      results: el('div', {},
        stats([
          { label: 'Cases', value: cases.length },
          { label: 'High priority', value: cases.filter((c) => c.priority === 'High').length, tone: 'fail' },
          { label: 'With known issues', value: cases.filter((c) => c.known_issues).length, tone: 'warn' },
          { label: 'AI-assisted', value: rewritten },
        ]),
        section('All cases', rewritten ? aiChip('Some cases AI-assisted') : rulesChip(),
          dataTable({ columns: ['id', 'title', 'priority', 'steps', 'known_issues', 'source'], rows: tableRows, mono: ['id', 'known_issues'], testId: 'test-cases' })),
        detail ? section('First case in full', detail) : null,
      ),
      logLine: `Built ${cases.length} test cases from ${conversations.length} conversations`,
      exports: cases.length ? [
        { label: 'Download .xlsx', run: () => downloadWorkbook(`${stem}_test_cases.xlsx`, [{ name: 'test_cases', rows: cases as unknown as Record<string, unknown>[], columns: COLUMNS }]) },
        { label: 'Download .csv', run: () => downloadCsv(`${stem}_test_cases.csv`, cases as unknown as Record<string, unknown>[], COLUMNS) },
        { label: 'Download .json', run: () => downloadJson(`${stem}_test_cases.json`, { generated_by: 'Kitsune Labs Test Case Generator', cases }) },
      ] : [],
    };
  },
};
