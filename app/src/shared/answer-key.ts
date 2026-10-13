// The Mousy answer key: which bugs were planted where. Tools use it for a "check my result"
// panel when the input is a Mousy sample. It is fetched from this site, never from elsewhere.
import { urls } from './config.ts';
import type { Conversation } from './conversations.ts';
import { baseName } from './export.ts';

export interface KeyBug {
  type: string;
  turn: number;
  severity: string;
  evidence: string;
}

export interface KeyConversation {
  conversation_id: string;
  transcript_file?: string;
  channel: string;
  expected_intent: string;
  first_customer_utterance: { turn: number; text: string };
  outcome: string;
  bugs: KeyBug[];
}

export interface AnswerKey {
  bug_types: Record<string, { severity: string; meaning: string }>;
  conversations: KeyConversation[];
}

let cached: Promise<AnswerKey | null> | null = null;

export function loadAnswerKey(): Promise<AnswerKey | null> {
  cached ??= fetch(urls.sampleFile('answer_key.json'))
    .then((r) => (r.ok ? (r.json() as Promise<AnswerKey>) : null))
    .catch(() => null);
  return cached;
}

/** The answer-key entry for a conversation, matched by ID or by transcript file name. */
export function keyEntry(key: AnswerKey | null, conversation: Conversation): KeyConversation | null {
  if (!key) return null;
  return key.conversations.find((c) => c.conversation_id === conversation.id)
    ?? key.conversations.find((c) => c.transcript_file && baseName(c.transcript_file) === conversation.name)
    ?? null;
}

export function isAnswerKey(value: unknown): value is AnswerKey {
  return typeof value === 'object' && value !== null
    && Array.isArray((value as AnswerKey).conversations)
    && typeof (value as AnswerKey).bug_types === 'object';
}
