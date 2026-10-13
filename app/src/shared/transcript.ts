// Our open transcript format: one line per turn, "[hh:mm:ss] Speaker: text".
// Also accepts "Speaker: text" with no time. Lines that match neither are treated as
// a continuation of the turn above (people paste wrapped text).

export type Role = 'bot' | 'customer' | 'other';

export interface Turn {
  index: number;          // 1-based, as QA people count turns
  seconds: number | null; // from conversation start
  speaker: string;
  role: Role;
  text: string;
}

const TIMED = /^\s*\[(\d{1,2}):(\d{2}):(\d{2})\]\s*([^:]{1,40}):\s?(.*)$/;
const UNTIMED = /^\s*([A-Za-z][\w .'-]{0,39}):\s?(.*)$/;

export function roleOf(speaker: string): Role {
  if (/assist|bot|virtual|system/i.test(speaker)) return 'bot';
  if (/customer|user|caller|visitor|guest/i.test(speaker)) return 'customer';
  return 'other';
}

export function parseTranscript(text: string): Turn[] {
  const turns: Turn[] = [];
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const timed = TIMED.exec(line);
    const untimed = timed ? null : UNTIMED.exec(line);
    if (timed) {
      const [, h, m, s, speaker, said] = timed;
      push(Number(h) * 3600 + Number(m) * 60 + Number(s), speaker, said);
    } else if (untimed) {
      push(null, untimed[1], untimed[2]);
    } else if (turns.length) {
      turns[turns.length - 1].text += `\n${line.trim()}`;
    }
  }
  return turns;

  function push(seconds: number | null, speaker: string, said: string): void {
    const name = speaker.trim();
    turns.push({ index: turns.length + 1, seconds, speaker: name, role: roleOf(name), text: said.trim() });
  }
}

export function formatClock(seconds: number | null): string {
  if (seconds === null) return '--:--:--';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

export function toTranscriptText(turns: Turn[]): string {
  return turns.map((t) => `[${formatClock(t.seconds)}] ${t.speaker}: ${t.text.replace(/\n/g, ' ')}`).join('\n');
}

/** The golden JSON files hold {turns: [{speaker, text}]}. Turn them into transcript text. */
export function transcriptFromJson(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const turns = (value as { turns?: unknown }).turns;
  if (!Array.isArray(turns)) return null;
  const lines = turns
    .filter((t): t is { speaker: string; text: string } =>
      typeof t === 'object' && t !== null && typeof t.speaker === 'string' && typeof t.text === 'string')
    .map((t) => `${t.speaker}: ${t.text}`);
  return lines.length ? lines.join('\n') : null;
}
