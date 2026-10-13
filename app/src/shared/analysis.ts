// Rule-based conversation checks. No AI, no page code: this file only reads turns.
// Bug Finder, Metrics Extractor, First Utterance Finder, Test Case Generator, Report Builder
// and Email Templates all use it, so a visitor without an API key still gets real findings.
// The rules are tuned to the seven bug types in the Mousy answer key, but they read plain
// transcripts and work on any bot that talks in a similar way.
import type { Turn } from './transcript.ts';

export type Severity = 'high' | 'medium' | 'low';
export type BugType =
  | 'misroute' | 'fallback_loop' | 'premature_escalation' | 'timeout_no_goodbye'
  | 'bot_repeats' | 'wrong_order_id' | 'ignored_correction';

export interface BugTypeInfo {
  title: string;
  severity: Severity;
  meaning: string;
  fix: string;
}

export const BUG_TYPES: Record<BugType, BugTypeInfo> = {
  misroute: {
    title: 'Wrong intent', severity: 'high',
    meaning: 'The bot sent the customer down the wrong intent.',
    fix: 'Add this phrasing to the training examples of the right intent and check it for overlap with the intent the bot picked.',
  },
  fallback_loop: {
    title: 'Fallback loop', severity: 'high',
    meaning: 'The bot re-prompted 3 or more times in a row without progress.',
    fix: 'Cap fallbacks at 2, then offer choices or a transfer. Add the rephrasings to the training data.',
  },
  premature_escalation: {
    title: 'Early transfer', severity: 'medium',
    meaning: 'The bot transferred to a person before trying the self-service flow.',
    fix: 'Start the self-service flow first. Transfer only after it fails or when the customer asks for a person.',
  },
  timeout_no_goodbye: {
    title: 'No goodbye after silence', severity: 'low',
    meaning: 'The customer went quiet and the conversation closed with no closing message.',
    fix: 'After the "still there?" prompt, send a closing message before the session ends.',
  },
  bot_repeats: {
    title: 'Bot repeats itself', severity: 'low',
    meaning: 'The bot sent the same information twice.',
    fix: 'Check the flow for a duplicate response node or a loop back to the same answer.',
  },
  wrong_order_id: {
    title: 'Wrong order ID', severity: 'high',
    meaning: 'The bot read back or used a different order ID than the customer gave.',
    fix: 'Check the number capture and read-back. Compare the slot value with what the customer said.',
  },
  ignored_correction: {
    title: 'Correction ignored', severity: 'high',
    meaning: 'The customer corrected the bot and the bot carried on with the old value.',
    fix: 'Handle "no, I mean ..." in every confirmation step and overwrite the slot with the new value.',
  },
};

export const BUG_TYPE_IDS = Object.keys(BUG_TYPES) as BugType[];

const EXPECTED: Record<BugType, string> = {
  misroute: 'The bot starts the flow that the customer asked for.',
  fallback_loop: 'The bot understands the request, or offers choices or a transfer after 2 fallbacks.',
  premature_escalation: 'The bot tries the self-service flow before it transfers.',
  timeout_no_goodbye: 'The bot sends a closing message before it ends the conversation.',
  bot_repeats: 'The bot gives each piece of information one time.',
  wrong_order_id: 'The bot reads back the order ID that the customer gave.',
  ignored_correction: 'The bot uses the corrected value.',
};

/** What the bot should have done instead, as one plain sentence (for bug reports and test cases). */
export function expectedBehaviour(finding: Pick<Finding, 'type' | 'expected'>): string {
  if (finding.type === 'misroute' && finding.expected) return `The bot starts the ${finding.expected} flow.`;
  return EXPECTED[finding.type as BugType] ?? 'The bot handles this turn correctly.';
}

export interface Finding {
  type: BugType | string;   // AI findings may use a type outside the seven
  turn: number;
  severity: Severity;
  title: string;
  evidence: string;
  fix: string;
  source: 'rules' | 'ai';
  expected?: string;        // misroute: the intent the customer wanted
  actual?: string;          // misroute: the intent the bot took
  confirmed?: boolean;      // a rules finding the AI reported too
}

// -- intents ----------------------------------------------------------------------

export const INTENT_IDS = [
  'cancel_order', 'refund_status', 'change_delivery_address', 'billing_dispute', 'track_parcel',
  'gift_card_balance', 'return_damaged_item', 'talk_to_human', 'update_payment_method', 'product_question',
] as const;

// Order matters: the first match wins, so the more specific patterns come first
// ("gift card" before "card", "charge on my card" before "update my card").
const CUSTOMER_INTENT_RULES: [string, RegExp][] = [
  ['gift_card_balance', /gift ?card/],
  ['refund_status', /refund|money back/],
  ['return_damaged_item', /damaged|broken|crushed|cracked|smashed|return (a|an|the|my|this)/],
  ['cancel_order', /cancel|don'?t want (my|the|this) order|stop (an|my|the) order|undo my/],
  ['change_delivery_address', /address|redirect|send it to|where my order is going|i moved/],
  ['billing_dispute', /bill(ed|ing)?|charge|twice|two times|overcharg/],
  ['track_parcel', /track|where('?s| is) my (package|parcel|order)|parcel|package|has(n'?t| not) (come|arrived)|still has(n'?t| not)/],
  ['update_payment_method', /payment|card (expired|on my account)|update my card|new card|add a new one/],
  ['talk_to_human', /\b(person|human|agent|representative|someone|operator|real people)\b/],
  ['product_question', /warranty|dishwasher|made of|\bsafe\b|how do i (clean|use)/],
];

/** Best guess at what a customer wants, from keywords. Null if nothing matches. */
export function guessIntent(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [intent, pattern] of CUSTOMER_INTENT_RULES) if (pattern.test(lower)) return intent;
  return null;
}

// Which intent a bot reply has started. Only clear routing phrases count, so ordinary
// questions ("What's the order number?") never look like a route.
const BOT_ROUTE_RULES: [string, RegExp][] = [
  ['gift_card_balance', /gift card/],
  ['refund_status', /\brefund/],
  ['cancel_order', /\bcancel/],
  ['track_parcel', /\btrack (your|the|my)/],
  ['change_delivery_address', /new delivery address|change (the|your) address/],
];

function botRoute(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [intent, pattern] of BOT_ROUTE_RULES) if (pattern.test(lower)) return intent;
  return null;
}

// -- phrase detectors --------------------------------------------------------------

const FALLBACK = /didn'?t (quite )?(catch|get|understand)|say it another way|having trouble understanding|rephrase|not sure i (understood|follow)/i;
const REPROMPT = /\b(say|type|enter) (the|your|it) .*again|please repeat/i;
const ESCALATION = /transfer you|transferring|connect(ing)? you|passing (this|you) to|put you through|hand you over/i;
const STILL_THERE = /are you still there|still with me|haven'?t heard (back|from you)\??$/i;
const GOODBYE = /goodbye|bye\b|have a (lovely|great|good|nice) day|thanks for (calling|chatting|contacting)/i;
const OFFER = /anything else|would you like|could you rate|text you a summary/i;
const ASKED_FOR_PERSON = /\b(person|human|agent|representative|someone|operator|real people)\b/i;
const FILLER = /^(hello|hi|hey|hiya|um+|uh+|er+|erm|yes|yeah|yep|ok|okay|so|hi there|hello there|good (morning|afternoon|evening))$/;

export const isFallback = (text: string) => FALLBACK.test(text);
export const isEscalation = (text: string) => ESCALATION.test(text);

/** "um, hi" and "hello?" are fillers; "hi, I want to cancel" is not. */
export function isFiller(text: string): boolean {
  const words = text.toLowerCase().replace(/[^a-z' ]+/g, ' ').trim();
  if (!words) return true;
  const parts = words.split(/\s+/);
  // Every word must be a filler word on its own, or the whole phrase must be one.
  return FILLER.test(words) || parts.every((w) => FILLER.test(w));
}

export interface FirstUtterance {
  turn: number;
  text: string;
  skipped: string[];   // the customer turns we stepped over (fillers)
}

/** The first customer turn that says what they want (skips "hello?", "um, hi"). */
export function firstRealUtterance(turns: Turn[]): FirstUtterance | null {
  const skipped: string[] = [];
  for (const turn of turns) {
    if (turn.role !== 'customer') continue;
    if (isFiller(turn.text)) {
      skipped.push(turn.text);
      continue;
    }
    return { turn: turn.index, text: turn.text, skipped };
  }
  return null;
}

// -- order IDs ---------------------------------------------------------------------

const DIGIT_WORDS: Record<string, string> = {
  zero: '0', oh: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9',
};
const WRITTEN_ID = /\bMO-?\s?(\d{4,})\b/gi;
const SPOKEN_ID = /\bM\s?O\s+((?:zero|oh|one|two|three|four|five|six|seven|eight|nine)(?:[\s,-]+(?:zero|oh|one|two|three|four|five|six|seven|eight|nine))*)/gi;

/** Order IDs in a turn, written ("MO-4417") or spoken ("M O four four one seven"). */
export function orderIds(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(WRITTEN_ID)) found.push(`MO-${match[1]}`);
  for (const match of text.matchAll(SPOKEN_ID)) {
    const digits = match[1].toLowerCase().split(/[\s,-]+/).map((w) => DIGIT_WORDS[w] ?? '').join('');
    if (digits.length >= 4) found.push(`MO-${digits}`);
  }
  return found;
}

// -- correction helpers ------------------------------------------------------------

const STOPWORDS = new Set((
  'a an and are as at be but by can could did do does done for from get got had has have hi i i\'m i\'ve if in ' +
  'is it it\'s its just let let\'s like me mean my no not now of oh ok okay on one or our please should so ' +
  'sorry sure than thanks thank that that\'s the their then there they this to up us wait was we what ' +
  'what\'s which will with would yes you your you\'re actually right now instead'
).split(' '));

function contentWords(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').split(/[\s-]+/)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter((w) => w.length > 1 && !STOPWORDS.has(w)));
}

const CORRECTION = /^(no|nope|wait|sorry|actually)\b|\bi mean\b|\bnot (a|an|the|it)\b|\bthat'?s (not|wrong)\b/i;
const POLITE_NO = /^(no|nope),?\s*(thanks|thank you|that'?s (all|it|fine)|i'?m (good|fine)|that'?ll be all)/i;

function isCorrection(text: string): boolean {
  return CORRECTION.test(text.trim()) && !POLITE_NO.test(text.trim());
}

// -- the checks --------------------------------------------------------------------

function finding(type: BugType, turn: number, evidence: string, extra: Partial<Finding> = {}): Finding {
  const info = BUG_TYPES[type];
  return { type, turn, severity: info.severity, title: info.title, evidence, fix: info.fix, source: 'rules', ...extra };
}

const quote = (text: string, max = 80) => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return `"${flat.length > max ? `${flat.slice(0, max - 1)}…` : flat}"`;
};

/** Run every rule. Findings come back sorted by turn. */
export function findBugs(turns: Turn[]): Finding[] {
  const findings: Finding[] = [];
  const bots = turns.filter((t) => t.role === 'bot');
  const first = firstRealUtterance(turns);

  // Misroute: the bot's first reply to the real request starts a different intent.
  if (first) {
    const wanted = guessIntent(first.text);
    const reply = turns.find((t) => t.role === 'bot' && t.index > first.turn);
    const routed = reply ? botRoute(reply.text) : null;
    if (reply && wanted && routed && routed !== wanted) {
      findings.push(finding('misroute', reply.index,
        `Customer asked ${quote(first.text)} (${wanted}); the bot replied with ${routed}.`,
        { expected: wanted, actual: routed }));
    }
  }

  // Fallback loop: 3 or more fallbacks in a row (customer turns in between are fine).
  let streak = 0;
  for (const turn of bots) {
    streak = isFallback(turn.text) ? streak + 1 : 0;
    if (streak === 3) findings.push(finding('fallback_loop', turn.index, 'Three fallback prompts in a row with no progress.'));
  }

  // Early transfer: the bot hands over before asking a single self-service question,
  // the customer never asked for a person, and there was no fallback loop first.
  const escalation = bots.find((t) => isEscalation(t.text));
  if (escalation && first && escalation.index > first.turn) {
    const between = turns.filter((t) => t.index > first.turn && t.index < escalation.index);
    const askedQuestion = between.some((t) => t.role === 'bot' && t.text.includes('?') && !isFallback(t.text));
    const fallbacks = between.filter((t) => t.role === 'bot' && isFallback(t.text)).length;
    const wantedPerson = turns.some((t) => t.role === 'customer' && t.index < escalation.index && ASKED_FOR_PERSON.test(t.text));
    if (!askedQuestion && !wantedPerson && fallbacks < 3) {
      findings.push(finding('premature_escalation', escalation.index,
        `Transfer at turn ${escalation.index} with no self-service step after ${quote(first.text)}.`));
    }
  }

  // No goodbye: the last thing in the conversation is a "still there?" prompt.
  const last = turns.at(-1);
  if (last && last.role === 'bot' && STILL_THERE.test(last.text.trim())) {
    findings.push(finding('timeout_no_goodbye', last.index, `Last turn is ${quote(last.text)}; no closing message follows.`));
  }

  // Repeats: the same informative bot message twice (fallbacks and offers do not count).
  const seen = new Map<string, number>();
  for (const turn of bots) {
    if (isFallback(turn.text) || REPROMPT.test(turn.text) || OFFER.test(turn.text) || STILL_THERE.test(turn.text)) continue;
    const key = turn.text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (key.split(' ').length < 5) continue;
    const earlier = seen.get(key);
    if (earlier === undefined) seen.set(key, turn.index);
    else if (earlier > 0) {
      findings.push(finding('bot_repeats', turn.index, `Same message as turn ${earlier}: ${quote(turn.text, 60)}`));
      seen.set(key, -1);   // report each repeated message once
    }
  }

  // Wrong order ID: the bot says a different ID than the customer last gave.
  let given: string | null = null;
  const reported = new Set<string>();
  for (const turn of turns) {
    const ids = orderIds(turn.text);
    if (!ids.length) continue;
    if (turn.role === 'customer') {
      given = ids.at(-1)!;
    } else if (turn.role === 'bot' && given) {
      const wrong = ids.find((id) => id !== given);
      if (wrong && !reported.has(`${given}>${wrong}`)) {
        reported.add(`${given}>${wrong}`);
        findings.push(finding('wrong_order_id', turn.index, `Customer gave ${given}; the bot used ${wrong}.`));
      }
    }
  }

  // Ignored correction: the customer says "no, I mean ..." and the bot either falls back,
  // or carries on with the old value and never mentions the new one.
  for (let i = 1; i < turns.length; i += 1) {
    const said = turns[i];
    if (said.role !== 'customer' || !isCorrection(said.text)) continue;
    const before = [...turns.slice(0, i)].reverse().find((t) => t.role === 'bot');
    const after = turns.slice(i + 1).find((t) => t.role === 'bot');
    if (!before || !after || OFFER.test(before.text)) continue;
    let ignored = isFallback(after.text);
    if (!ignored) {
      const prior = contentWords(before.text);
      const correction = contentWords(said.text);
      const reply = contentWords(after.text);
      const oldValue = [...prior].filter((w) => !correction.has(w));
      const newValue = [...correction].filter((w) => !prior.has(w));
      ignored = newValue.length > 0
        && oldValue.some((w) => reply.has(w))
        && !newValue.some((w) => reply.has(w));
    }
    if (ignored) {
      findings.push(finding('ignored_correction', after.index,
        `Customer corrected the bot at turn ${said.index} (${quote(said.text, 50)}); the bot did not use the correction.`));
    }
  }

  return findings.sort((a, b) => a.turn - b.turn);
}

// -- metrics -----------------------------------------------------------------------

export type Ending = 'goodbye' | 'transfer' | 'timeout' | 'hang-up' | 'open';

export interface ConversationMetrics {
  turns: number;
  bot_turns: number;
  customer_turns: number;
  duration_sec: number | null;
  fallbacks: number;
  reprompts: number;
  max_fallback_streak: number;
  escalated: boolean;
  escalation_turn: number | null;
  ending: Ending;
  first_utterance: string;
  first_utterance_turn: number | null;
  intent_guess: string;
  avg_customer_words: number;
  order_ids: string;
  rule_findings: number;
  rule_flags: string;
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

export function endingOf(turns: Turn[]): Ending {
  const last = turns.at(-1);
  if (!last || last.role !== 'bot') return 'open';
  const text = last.text.trim();
  if (STILL_THERE.test(text) || /haven'?t heard (back|from you)/i.test(text)) return 'timeout';
  if (isEscalation(text)) return 'transfer';
  if (GOODBYE.test(text)) return 'goodbye';
  if (text.endsWith('?')) return 'hang-up';
  return 'open';
}

export function measure(turns: Turn[], findings = findBugs(turns)): ConversationMetrics {
  const bots = turns.filter((t) => t.role === 'bot');
  const customers = turns.filter((t) => t.role === 'customer');
  let streak = 0;
  let maxStreak = 0;
  for (const turn of bots) {
    streak = isFallback(turn.text) ? streak + 1 : 0;
    maxStreak = Math.max(maxStreak, streak);
  }
  const escalation = bots.find((t) => isEscalation(t.text));
  const first = firstRealUtterance(turns);
  const timed = turns.filter((t) => t.seconds !== null);
  const ids = [...new Set(turns.flatMap((t) => orderIds(t.text)))];
  return {
    turns: turns.length,
    bot_turns: bots.length,
    customer_turns: customers.length,
    duration_sec: timed.length ? (timed.at(-1)!.seconds! - timed[0].seconds!) : null,
    fallbacks: bots.filter((t) => isFallback(t.text)).length,
    reprompts: bots.filter((t) => REPROMPT.test(t.text)).length,
    max_fallback_streak: maxStreak,
    escalated: Boolean(escalation),
    escalation_turn: escalation?.index ?? null,
    ending: endingOf(turns),
    first_utterance: first?.text ?? '',
    first_utterance_turn: first?.turn ?? null,
    intent_guess: (first && guessIntent(first.text)) ?? '',
    avg_customer_words: customers.length ? Math.round((customers.reduce((n, t) => n + words(t.text), 0) / customers.length) * 10) / 10 : 0,
    order_ids: ids.join(' '),
    rule_findings: findings.length,
    rule_flags: [...new Set(findings.map((f) => f.type))].join(';'),
  };
}
