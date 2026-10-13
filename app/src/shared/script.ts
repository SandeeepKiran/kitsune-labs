// Our open test-script format (decision D6: open formats only, nothing vendor-specific).
// A script is the conversation turned into steps: what the user says, and what the bot
// is expected to say back. It is written as .txt, .json or .yaml and can be read back in.
import { formatClock, roleOf, type Role, type Turn } from './transcript.ts';

export const SCRIPT_FORMAT = 'kitsune-test-script/1';

export interface ScriptStep {
  step: number;
  user_says?: string;
  expect_bot: string[];
  at?: string;
}

export interface TestScript {
  format: typeof SCRIPT_FORMAT;
  name: string;
  bot: string;
  steps: ScriptStep[];
  variables?: Record<string, string>;
}

export interface ScriptOptions {
  keepTimes: boolean;
  orderIdVariable: boolean;   // MO-4417 -> {{order_id}}, so one script runs with any order
}

const ORDER_ID = /\bMO-\d{4,}\b/gi;

/** Turn parsed turns into steps. Bot turns before the first user turn become step 0 (the greeting). */
export function toScript(turns: Turn[], name: string, options: ScriptOptions): TestScript {
  const bot = turns.find((t) => t.role === 'bot')?.speaker ?? 'Bot';
  const variables: Record<string, string> = {};
  const clean = (text: string) => {
    let out = text.replace(/\s*\n\s*/g, ' ').trim();
    if (options.orderIdVariable) {
      out = out.replace(ORDER_ID, (id) => {
        variables.order_id ??= id.toUpperCase();
        return '{{order_id}}';
      });
    }
    return out;
  };
  const steps: ScriptStep[] = [];
  let current: ScriptStep = { step: 0, expect_bot: [] };
  for (const turn of turns) {
    if (turn.role === 'customer') {
      if (current.user_says !== undefined || current.expect_bot.length) steps.push(current);
      current = { step: steps.length, user_says: clean(turn.text), expect_bot: [] };
      if (options.keepTimes && turn.seconds !== null) current.at = formatClock(turn.seconds);
    } else {
      current.expect_bot.push(clean(turn.text));
      if (options.keepTimes && turn.seconds !== null && current.at === undefined) current.at = formatClock(turn.seconds);
    }
  }
  if (current.user_says !== undefined || current.expect_bot.length) steps.push(current);
  steps.forEach((s, i) => { s.step = i; });
  return {
    format: SCRIPT_FORMAT, name, bot, steps,
    ...(Object.keys(variables).length ? { variables } : {}),
  };
}

export function scriptToText(script: TestScript): string {
  const lines = [
    `# Test script: ${script.name}`,
    `# Bot: ${script.bot} · ${script.steps.filter((s) => s.user_says !== undefined).length} user steps · format ${script.format}`,
  ];
  if (script.variables) for (const [k, v] of Object.entries(script.variables)) lines.push(`# Variable: {{${k}}} = ${v}`);
  lines.push('');
  for (const step of script.steps) {
    const time = step.at ? `[${step.at}] ` : '';
    if (step.user_says !== undefined) lines.push(`${time}USER: ${step.user_says}`);
    step.expect_bot.forEach((text, i) => lines.push(`${i === 0 && step.user_says === undefined ? time : ''}BOT: ${text}`));
  }
  return `${lines.join('\n')}\n`;
}

export function scriptToJson(script: TestScript): string {
  return `${JSON.stringify(script, null, 2)}\n`;
}

// YAML: every string is written double-quoted with JSON escapes, which YAML reads the
// same way. That avoids every YAML gotcha (yes/no, colons, leading dashes) with no library.
const q = (value: string) => JSON.stringify(value);

export function scriptToYaml(script: TestScript): string {
  const out = [`format: ${q(script.format)}`, `name: ${q(script.name)}`, `bot: ${q(script.bot)}`];
  if (script.variables) {
    out.push('variables:');
    for (const [k, v] of Object.entries(script.variables)) out.push(`  ${k}: ${q(v)}`);
  }
  out.push('steps:');
  for (const step of script.steps) {
    out.push(`  - step: ${step.step}`);
    if (step.at) out.push(`    at: ${q(step.at)}`);
    if (step.user_says !== undefined) out.push(`    user_says: ${q(step.user_says)}`);
    if (step.expect_bot.length) {
      out.push('    expect_bot:');
      for (const text of step.expect_bot) out.push(`      - ${q(text)}`);
    } else {
      out.push('    expect_bot: []');
    }
  }
  return `${out.join('\n')}\n`;
}

// -- reading scripts back --------------------------------------------------------------

type Pair = { speaker: string; text: string; role?: Role };

function makeTurns(pairs: Pair[]): Turn[] {
  return pairs.map((p, i) => ({ index: i + 1, seconds: null, speaker: p.speaker, role: p.role ?? roleOf(p.speaker), text: p.text }));
}

function stepsToTurns(steps: unknown[], bot: string): Turn[] {
  const pairs: Pair[] = [];
  for (const raw of steps) {
    if (typeof raw !== 'object' || raw === null) continue;
    const step = raw as Partial<ScriptStep>;
    if (typeof step.user_says === 'string') pairs.push({ speaker: 'Customer', text: step.user_says, role: 'customer' });
    if (Array.isArray(step.expect_bot)) {
      for (const text of step.expect_bot) if (typeof text === 'string') pairs.push({ speaker: bot, text, role: 'bot' });
    }
  }
  return makeTurns(pairs);
}

/** Turns from a JSON value: our test script ({steps}) or a golden file ({turns: [{speaker, text}]}). */
export function turnsFromJsonValue(value: unknown): Turn[] | null {
  if (typeof value !== 'object' || value === null) return null;
  const obj = value as { steps?: unknown; turns?: unknown; bot?: unknown };
  if (Array.isArray(obj.steps)) return stepsToTurns(obj.steps, typeof obj.bot === 'string' ? obj.bot : 'Bot');
  if (Array.isArray(obj.turns)) {
    const pairs = obj.turns.filter((t): t is { speaker: string; text: string } =>
      typeof t === 'object' && t !== null && typeof t.speaker === 'string' && typeof t.text === 'string');
    return pairs.length ? makeTurns(pairs) : null;
  }
  return null;
}

function yamlScalar(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('"')) {
    try { return JSON.parse(value) as string; } catch { return value.slice(1, -1); }
  }
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

/** Read the YAML this site writes (and hand-written YAML in the same shape). */
export function turnsFromYaml(text: string): Turn[] | null {
  const pairs: Pair[] = [];
  let bot = 'Bot';
  let inExpect = false;
  let pendingSpeaker: string | null = null;
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const keyed = /^\s*(?:-\s+)?([a-z_]+):\s*(.*)$/i.exec(line);
    if (keyed) {
      const [, key, rest] = keyed;
      inExpect = key === 'expect_bot' && rest.trim() === '';
      if (key === 'bot') bot = yamlScalar(rest);
      else if (key === 'user_says') pairs.push({ speaker: 'Customer', text: yamlScalar(rest), role: 'customer' });
      else if (key === 'speaker') pendingSpeaker = yamlScalar(rest);
      else if (key === 'text' && pendingSpeaker) {
        pairs.push({ speaker: pendingSpeaker, text: yamlScalar(rest) });
        pendingSpeaker = null;
      }
      continue;
    }
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && inExpect) pairs.push({ speaker: bot, text: yamlScalar(item[1]), role: 'bot' });
  }
  return pairs.length ? makeTurns(pairs) : null;
}
