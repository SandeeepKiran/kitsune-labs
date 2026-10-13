// One way in for every tool: pasted text, a single file, a spreadsheet or a .zip all become
// a list of conversations. Tools never care where the turns came from.
import { baseName } from './export.ts';
import type { Row, Table, TextFile } from './files.ts';
import { turnsFromJsonValue, turnsFromYaml } from './script.ts';
import { parseTranscript, type Turn } from './transcript.ts';

export type LoadedInput =
  | { kind: 'text'; name: string; text: string }
  | { kind: 'table'; name: string; table: Table }
  | { kind: 'files'; name: string; files: TextFile[] };

export interface Mapping {
  transcript: string;
  id: string;            // '' = number the rows instead
}

export interface Conversation {
  id: string;
  name: string;          // file name or "row 3"; used to name exports
  turns: Turn[];
  row?: Row;             // the spreadsheet row it came from, untouched
}

const looksLikeYaml = (text: string) => /^(format|name|bot|steps|turns):/m.test(text) && /(user_says|expect_bot|speaker):/.test(text);

/** Turns from one piece of text: our transcript lines, a JSON script/golden file, or YAML. */
export function turnsFromText(text: string): Turn[] {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return turnsFromJsonValue(JSON.parse(trimmed)) ?? [];
    } catch {
      // Not valid JSON after all: fall through and read it as transcript lines.
    }
  }
  if (looksLikeYaml(trimmed)) return turnsFromYaml(trimmed) ?? [];
  return parseTranscript(text);
}

/** Pick the transcript and ID columns by name, or by "the column with the longest text". */
export function guessMapping(table: Table): Mapping {
  const byName = (pattern: RegExp) => table.columns.find((c) => pattern.test(c));
  let transcript = byName(/^(transcript|conversation|dialog(ue)?|chat|text|messages?)$/i) ?? byName(/transcript|conversation|dialog/i);
  if (!transcript) {
    const sample = table.rows.slice(0, 20);
    let best = 0;
    for (const column of table.columns) {
      const length = sample.reduce((n, r) => n + (r[column]?.length ?? 0), 0);
      if (length > best) { best = length; transcript = column; }
    }
  }
  const id = byName(/^(conversation_?id|id|session_?id|call_?id|chat_?id)$/i) ?? byName(/(^|_)id$/i) ?? '';
  return { transcript: transcript ?? '', id: id === transcript ? '' : id };
}

const TRANSCRIPT_FILE = /\.(txt|json|ya?ml)$/i;
const NOT_A_CONVERSATION = /(^|\/)(readme|manifest|answer_key|license)[^/]*$/i;

/** Every conversation in the input. Rows or files with no turns are left out. */
export function conversationsFrom(input: LoadedInput, mapping?: Mapping | null): Conversation[] {
  if (input.kind === 'text') {
    const turns = turnsFromText(input.text);
    const name = input.name === 'pasted text' ? 'conversation' : baseName(input.name);
    return turns.length ? [{ id: idFromText(input.text) ?? name, name, turns }] : [];
  }
  if (input.kind === 'files') {
    return input.files
      .filter((f) => TRANSCRIPT_FILE.test(f.name) && !NOT_A_CONVERSATION.test(f.name))
      .map((f) => ({ id: idFromText(f.text) ?? baseName(f.name), name: baseName(f.name), turns: turnsFromText(f.text) }))
      .filter((c) => c.turns.length);
  }
  const map = mapping ?? guessMapping(input.table);
  return input.table.rows
    .map((row, i) => {
      const id = (map.id && row[map.id]?.trim()) || `row-${i + 1}`;
      return { id, name: id, turns: turnsFromText(row[map.transcript] ?? ''), row };
    })
    .filter((c) => c.turns.length);
}

/** A conversation ID written inside JSON or YAML ("conversation_id": "CNV-000001"). */
function idFromText(text: string): string | null {
  return /"?conversation_id"?\s*:\s*"?(CNV-\d+)/.exec(text.slice(0, 2000))?.[1] ?? null;
}

export function describeInput(input: LoadedInput): string {
  if (input.kind === 'text') return input.name;
  if (input.kind === 'table') return `${input.name} · ${input.table.rows.length} rows`;
  return `${input.name} · ${input.files.length} files`;
}
