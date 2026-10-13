// "Run results" for Report Builder and Email Templates. Three ways in:
// 1. the Mousy answer key, 2. a Bug Finder JSON export (same shape), 3. any transcripts,
// which the rules check on the spot.
import { BUG_TYPES, endingOf, findBugs, firstRealUtterance, guessIntent, type BugType, type Finding, type Severity } from './analysis.ts';
import { conversationsFrom, type LoadedInput, type Mapping } from './conversations.ts';

export interface ResultConversation {
  id: string;
  channel: string;
  intent: string;
  outcome: string;
  findings: Finding[];
}

export interface RunResults {
  source: 'answer key' | 'Bug Finder export' | 'rules';
  conversations: ResultConversation[];
}

interface RawBug { type?: unknown; turn?: unknown; severity?: unknown; evidence?: unknown; source?: unknown; title?: unknown; fix?: unknown }
interface RawConversation { conversation_id?: unknown; channel?: unknown; expected_intent?: unknown; intent?: unknown; outcome?: unknown; bugs?: unknown }

const SEVERITIES: Severity[] = ['high', 'medium', 'low'];

function fromJson(value: unknown): RunResults | null {
  if (typeof value !== 'object' || value === null) return null;
  const list = (value as { conversations?: unknown }).conversations;
  if (!Array.isArray(list) || !list.every((c) => typeof c === 'object' && c !== null && Array.isArray((c as RawConversation).bugs))) return null;
  const generatedBy = String((value as { generated_by?: unknown }).generated_by ?? '');
  return {
    source: /bug finder/i.test(generatedBy) ? 'Bug Finder export' : 'answer key',
    conversations: (list as RawConversation[]).map((c, i) => ({
      id: String(c.conversation_id ?? `conversation-${i + 1}`),
      channel: String(c.channel ?? 'unknown'),
      intent: String(c.expected_intent ?? c.intent ?? 'unknown'),
      outcome: String(c.outcome ?? 'unknown'),
      findings: (c.bugs as RawBug[]).map((b) => {
        const type = String(b.type ?? 'other');
        const info = BUG_TYPES[type as BugType];
        const severity = SEVERITIES.includes(b.severity as Severity) ? (b.severity as Severity) : info?.severity ?? 'medium';
        return {
          type, severity,
          turn: Number(b.turn) || 0,
          title: String(b.title ?? info?.title ?? type),
          evidence: String(b.evidence ?? ''),
          fix: String(b.fix ?? info?.fix ?? ''),
          source: b.source === 'ai' ? 'ai' : 'rules',
        } satisfies Finding;
      }),
    })),
  };
}

const OUTCOME_OF_ENDING: Record<string, string> = {
  goodbye: 'resolved', transfer: 'escalated', timeout: 'abandoned', 'hang-up': 'abandoned', open: 'unknown',
};

export function collectResults(input: LoadedInput, mapping?: Mapping | null): RunResults {
  if (input.kind === 'text' && /^\s*\{/.test(input.text)) {
    try {
      const parsed = fromJson(JSON.parse(input.text));
      if (parsed) return parsed;
    } catch {
      // Not JSON results; read it as a transcript below.
    }
  }
  const conversations = conversationsFrom(input, mapping).map((c) => {
    const first = firstRealUtterance(c.turns);
    const firstBot = c.turns.find((t) => t.role === 'bot')?.text ?? '';
    return {
      id: c.id,
      channel: c.row?.channel || (/\bcall(ing)?\b/i.test(firstBot) ? 'voice' : 'chat'),
      intent: (first && guessIntent(first.text)) || 'unknown',
      outcome: c.row?.outcome || OUTCOME_OF_ENDING[endingOf(c.turns)],
      findings: findBugs(c.turns),
    };
  });
  return { source: 'rules', conversations };
}

export interface Summary {
  conversations: number;
  clean: number;
  findings: number;
  bySeverity: Record<Severity, number>;
  byType: { type: string; title: string; severity: Severity; count: number; conversations: number; impact: number }[];
  byIntent: { intent: string; conversations: number; withBugs: number }[];
  byChannel: { channel: string; conversations: number; withBugs: number }[];
  outcomes: Record<string, number>;
}

const WEIGHT: Record<Severity, number> = { high: 5, medium: 3, low: 1 };

/** Totals and rankings. Types are ranked by impact (severity weight x conversations hit), not raw count. */
export function summarise(results: RunResults): Summary {
  const all = results.conversations.flatMap((c) => c.findings.map((f) => ({ ...f, conversation: c.id })));
  const bySeverity: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  for (const f of all) bySeverity[f.severity] += 1;
  const types = new Map<string, { title: string; severity: Severity; count: number; hit: Set<string> }>();
  for (const f of all) {
    const entry = types.get(f.type) ?? { title: f.title, severity: f.severity, count: 0, hit: new Set<string>() };
    entry.count += 1;
    entry.hit.add(f.conversation);
    types.set(f.type, entry);
  }
  const group = (key: (c: ResultConversation) => string) => {
    const map = new Map<string, { conversations: number; withBugs: number }>();
    for (const c of results.conversations) {
      const k = key(c);
      const entry = map.get(k) ?? { conversations: 0, withBugs: 0 };
      entry.conversations += 1;
      if (c.findings.length) entry.withBugs += 1;
      map.set(k, entry);
    }
    return [...map.entries()].sort((a, b) => b[1].withBugs - a[1].withBugs || b[1].conversations - a[1].conversations);
  };
  const outcomes: Record<string, number> = {};
  for (const c of results.conversations) outcomes[c.outcome] = (outcomes[c.outcome] ?? 0) + 1;
  return {
    conversations: results.conversations.length,
    clean: results.conversations.filter((c) => !c.findings.length).length,
    findings: all.length,
    bySeverity,
    byType: [...types.entries()]
      .map(([type, t]) => ({ type, title: t.title, severity: t.severity, count: t.count, conversations: t.hit.size, impact: WEIGHT[t.severity] * t.hit.size }))
      .sort((a, b) => b.impact - a.impact || b.count - a.count),
    byIntent: group((c) => c.intent).map(([intent, v]) => ({ intent, ...v })),
    byChannel: group((c) => c.channel).map(([channel, v]) => ({ channel, ...v })),
    outcomes,
  };
}

export const percent = (part: number, whole: number) => (whole ? `${Math.round((100 * part) / whole)}%` : '–');
