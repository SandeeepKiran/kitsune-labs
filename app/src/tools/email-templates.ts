// Email Templates: status, critical-issue and meeting emails filled in from real run facts.
// The templates work without a key. AI can polish the wording; the "custom" template is
// written by AI from the visitor's own instructions, so it is the one part that needs a key.
import { parseAiJson } from '../shared/ai.ts';
import { el } from '../shared/dom.ts';
import { baseName, downloadText } from '../shared/export.ts';
import { collectResults, percent, summarise, type RunResults, type Summary } from '../shared/findings-source.ts';
import { checkOption, optionChecks, optionGrid, selectOption, textOption } from '../shared/options.ts';
import { aiChip, rulesChip, section } from '../shared/results.ts';
import { statusChip } from '../shared/status.ts';
import type { AiSession, ToolDefinition } from '../shared/tool-page.ts';

interface Email {
  subject: string;
  body: string;
}

const template = selectOption('template', 'Template', [
  ['daily', 'Daily status'], ['critical', 'Critical issue'], ['meeting', 'Meeting request'], ['custom', 'Custom (AI)'],
]);
const project = textOption('project', 'Project', 'Mousy Assist');
const to = textOption('to-name', 'To', 'Bot team');
const from = textOption('from-name', 'From', 'QA team');
const when = textOption('meet-when', 'Meeting time', 'Thursday, 10:00 (30 min)');
const custom = textOption('custom-prompt', 'Custom instructions', '', true, 'Example: a thank-you note to the bot team for fixing the fallback loop');
const polish = checkOption('ai-polish', 'Polish the wording with AI', true);

const today = () => new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function topLines(results: RunResults, s: Summary, limit = 3): string[] {
  return s.byType.slice(0, limit).map((t, i) => {
    const hit = results.conversations.find((c) => c.findings.some((f) => f.type === t.type));
    return `${i + 1}. ${t.title} (${t.severity}): ${plural(t.conversations, 'conversation')}${hit ? `, e.g. ${hit.id}` : ''}`;
  });
}

function draft(kind: string, results: RunResults, s: Summary): Email {
  const name = project.value || 'the bot';
  const greeting = `Hi ${to.value || 'team'},`;
  const signOff = `Thanks,\n${from.value || 'QA team'}`;
  const top = topLines(results, s);

  if (kind === 'critical') {
    const worst = s.byType.find((t) => t.severity === 'high') ?? s.byType[0];
    if (!worst) {
      return { subject: `${name}: no critical issues in today's run`, body: [greeting, '', `Good news: ${plural(s.conversations, 'conversation')} checked and no critical issue found.`, '', signOff].join('\n') };
    }
    const hit = results.conversations.find((c) => c.findings.some((f) => f.type === worst.type))!;
    const finding = hit.findings.find((f) => f.type === worst.type)!;
    return {
      subject: `Critical: ${worst.title} in ${name}`,
      body: [
        greeting, '',
        `We found a ${worst.severity}-severity issue: ${worst.title.toLowerCase()}.`,
        `It affects ${plural(worst.conversations, 'conversation')} of ${s.conversations} in this run (${percent(worst.conversations, s.conversations)}).`, '',
        'Example:',
        `- Conversation: ${hit.id} (${hit.channel}), turn ${finding.turn}`,
        `- What happened: ${finding.evidence}`,
        finding.fix ? `- Suggested fix: ${finding.fix}` : '', '',
        'Can you confirm an owner and a target date for the fix? We will retest as soon as it is ready.', '',
        signOff,
      ].filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n'),
    };
  }

  if (kind === 'meeting') {
    return {
      subject: `Meeting request: ${name} QA review`,
      body: [
        greeting, '',
        `Can we meet on ${when.value || 'a day that suits you'} to go through the latest QA results for ${name}?`, '',
        'Proposed agenda:',
        `1. Results: ${s.clean} of ${s.conversations} conversations clean (${percent(s.clean, s.conversations)}).`,
        ...s.byType.slice(0, 3).map((t, i) => `${i + 2}. ${t.title}: ${plural(t.conversations, 'conversation')}, owner and fix plan.`),
        `${Math.min(3, s.byType.length) + 2}. Next test run and sign-off.`, '',
        'If that time does not work, reply with one that does.', '',
        signOff,
      ].join('\n'),
    };
  }

  return {
    subject: `Daily QA status: ${name}, ${today()}`,
    body: [
      greeting, '',
      `Here is today's QA status for ${name}.`, '',
      `- Conversations checked: ${s.conversations}`,
      `- Clean: ${s.clean} (${percent(s.clean, s.conversations)})`,
      `- Findings: ${s.findings} (${s.bySeverity.high} high, ${s.bySeverity.medium} medium, ${s.bySeverity.low} low)`, '',
      top.length ? 'Top issues by impact:' : 'No open issues.',
      ...top, '',
      s.bySeverity.high ? 'Next: we retest the high-severity issues as soon as fixes land.' : 'Next: we continue regression testing.', '',
      signOff,
    ].join('\n'),
  };
}

async function aiEmail(ai: AiSession, base: Email | null, s: Summary, instructions: string): Promise<Email> {
  const reply = await ai.ask({
    system: 'You write clear, friendly work emails for a QA team testing a customer-support bot. Keep every number and ID exactly as given. Do not invent facts. Answer with JSON only.',
    prompt: [
      base
        ? `Polish this email: clearer, warmer, shorter where possible. Keep the structure, every fact, number and conversation ID.\nSubject: ${base.subject}\n\n${base.body}`
        : `Write this email: ${instructions}\nProject: ${project.value}. To: ${to.value}. From: ${from.value}.`,
      `Facts you may use: ${JSON.stringify({ conversations: s.conversations, clean: s.clean, findings: s.findings, bySeverity: s.bySeverity, topIssues: s.byType.slice(0, 3) })}`,
      'Return {"subject": "...", "body": "..."} with plain text in body (use \\n for new lines).',
    ].join('\n\n'),
    json: true,
  });
  const parsed = parseAiJson<{ subject?: unknown; body?: unknown }>(reply.text);
  if (typeof parsed.subject !== 'string' || typeof parsed.body !== 'string' || !parsed.body.trim()) throw new Error('The AI answer had no email in it.');
  return { subject: parsed.subject.trim().slice(0, 200), body: parsed.body.trim().slice(0, 6000) };
}

/** A minimal .eml file: it opens as a draft in most mail apps. No real address is put in. */
function toEml(email: Email): string {
  const subject = email.subject.replace(/[\r\n]+/g, ' ');
  return [
    'MIME-Version: 1.0',
    'To: undisclosed-recipients:;',
    `Subject: ${/^[\x20-\x7e]*$/.test(subject) ? subject : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(subject)))}?=`}`,
    'X-Unsent: 1',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    email.body.replace(/\r?\n/g, '\r\n'),
    '',
  ].join('\r\n');
}

async function copy(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export const definition: ToolDefinition = {
  answerLabel: 'Email',
  heroHint: 'Drop run results or transcripts, pick a template, get an email',
  inputLabel: 'Run results or transcripts',
  inputHint: 'answer_key.json, a Bug Finder export, or transcripts. The facts in the email come from this.',
  placeholder: 'Paste a transcript or run results JSON',
  mapping: true,
  aiNote: 'AI polishes the wording, or writes a custom email from your instructions. Facts and IDs stay the same.',
  options: () => el('div', {},
    optionGrid(template.element, project.element, to.element, from.element, when.element),
    custom.element,
    optionChecks('AI', polish),
  ),
  async run({ input, mapping, ai, log }) {
    const results = collectResults(input, mapping);
    const s = summarise(results);
    const kind = template.value;

    if (kind === 'custom' && !ai.ready) {
      return {
        answer: { value: '–', label: 'Email', sub: 'The custom template needs an AI key.' },
        results: el('div', { class: 'key-check', 'data-testid': 'needs-key' },
          statusChip('warn', 'Needs AI key'),
          el('span', {}, 'The custom template is written by AI. Add a key with "Add AI key", or pick another template: they work without a key.')),
        logLine: 'Custom template skipped: no AI key',
        exports: [],
      };
    }

    let email = kind === 'custom' ? null : draft(kind, results, s);
    let usedAi = false;
    if (ai.ready && (kind === 'custom' || polish.checked)) {
      try {
        email = await aiEmail(ai, email, s, custom.value || 'A short QA update for the bot team.');
        usedAi = true;
      } catch (error) {
        if (!email) throw error;
        log.add(`AI polish skipped: ${(error as Error).message} The template email is shown.`, 'warn');
      }
    }
    const final = email!;
    const full = `Subject: ${final.subject}\n\n${final.body}\n`;
    const copyButton = el('button', { type: 'button', class: 'btn btn--small', 'data-testid': 'copy-email' }, 'Copy email');
    copyButton.addEventListener('click', () => {
      copy(full).then(() => { copyButton.textContent = 'Copied'; }, () => { copyButton.textContent = 'Copy failed: select the text instead'; });
    });
    const stem = `${baseName(input.name === 'pasted text' ? 'qa' : input.name)}_${kind}_email`;
    return {
      answer: { value: String(final.body.split(/\s+/).filter(Boolean).length), label: 'Words', sub: final.subject },
      results: el('div', {},
        section('Email', usedAi ? aiChip() : rulesChip('Template · no AI'),
          el('p', { class: 'mono', 'data-testid': 'email-subject' }, `Subject: ${final.subject}`),
          el('pre', { class: 'preview mono', 'data-testid': 'email-preview' }, final.body),
          copyButton),
      ),
      logLine: `Drafted a ${template.input.selectedOptions[0]?.textContent?.toLowerCase() ?? kind} email from ${plural(s.conversations, 'conversation')} (${results.source})`,
      exports: [
        { label: 'Download .txt', run: () => downloadText(`${stem}.txt`, full) },
        { label: 'Download .eml', run: () => downloadText(`${stem}.eml`, toEml(final), 'message/rfc822') },
        { label: 'Copy to clipboard', run: () => copy(full) },
      ],
    };
  },
};
