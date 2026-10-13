// One small function per AI provider. The visitor's key goes in a request header, straight
// from this browser to the provider they picked, and nowhere else (AGENTS.md rule 4).
// No console output in this file, and error messages never include the key.
// API shapes checked against each provider's docs on 2026-10-13 (Context7).
import { getKey, getModel, getProvider, PROVIDERS, type Provider } from './key-store.ts';

export interface AiRequest {
  system: string;
  prompt: string;
  json?: boolean;          // ask for a JSON object back
  maxTokens?: number;
}

export interface AiReply {
  text: string;
  provider: Provider;
  model: string;
  ms: number;
}

export class AiError extends Error {}

const SAFE_MODEL = /^[\w.-]{1,80}$/;
const TIMEOUT_MS = 90_000;

export function aiReady(provider: Provider = getProvider()): boolean {
  return Boolean(getKey(provider));
}

export async function askAi(request: AiRequest, signal?: AbortSignal): Promise<AiReply> {
  const provider = getProvider();
  const key = getKey(provider);
  const model = getModel(provider);
  const info = PROVIDERS[provider];
  if (!key) throw new AiError('No AI key is set. Open the AI key drawer to add one.');
  if (!SAFE_MODEL.test(model)) throw new AiError('The model name has characters a model name cannot have. Check it in the AI key drawer.');

  const started = performance.now();
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response: Response;
  try {
    response = await send(provider, key, model, request, combined);
  } catch (error) {
    if (timeout.aborted) throw new AiError(`${info.label} did not answer within ${TIMEOUT_MS / 1000} s.`);
    if ((error as Error).name === 'AbortError') throw new AiError('The AI call was stopped.');
    throw new AiError(`Could not reach ${info.company}. Check your connection or an ad blocker.`);
  }
  if (!response.ok) throw new AiError(await explainFailure(response, info.label));
  const body: unknown = await response.json();
  const text = readText(provider, body);
  if (!text) throw new AiError(`${info.label} sent an empty answer. Try again, or try another model.`);
  return { text, provider, model, ms: Math.round(performance.now() - started) };
}

function send(provider: Provider, key: string, model: string, request: AiRequest, signal: AbortSignal): Promise<Response> {
  const maxTokens = request.maxTokens ?? 8192;
  if (provider === 'gemini') {
    return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: request.system }] },
        contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          ...(request.json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    });
  }
  if (provider === 'openai') {
    // Reasoning models take an effort setting; "low" keeps answers quick and cheap.
    const reasoning = /^(gpt-[5-9]|o\d)/.test(model) ? { reasoning: { effort: 'low' } } : {};
    return fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        instructions: request.system,
        input: request.prompt,
        max_output_tokens: maxTokens,
        store: false,
        ...reasoning,
        ...(request.json ? { text: { format: { type: 'json_object' } } } : {}),
      }),
    });
  }
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      // Anthropic requires this header for calls made straight from a browser page.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: request.system,
      messages: [{ role: 'user', content: request.prompt }],
    }),
  });
}

function readText(provider: Provider, body: unknown): string {
  const b = body as Record<string, any>;
  if (provider === 'gemini') {
    return (b?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('').trim();
  }
  if (provider === 'openai') {
    if (typeof b?.output_text === 'string') return b.output_text.trim();
    return (b?.output ?? [])
      .filter((item: { type?: string }) => item.type === 'message')
      .flatMap((item: { content?: { type?: string; text?: string }[] }) => item.content ?? [])
      .filter((part: { type?: string }) => part.type === 'output_text')
      .map((part: { text?: string }) => part.text ?? '')
      .join('')
      .trim();
  }
  return (b?.content ?? [])
    .filter((part: { type?: string }) => part.type === 'text')
    .map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim();
}

async function explainFailure(response: Response, label: string): Promise<string> {
  let detail = '';
  try {
    const body = (await response.json()) as Record<string, any>;
    detail = String(body?.error?.message ?? body?.message ?? '').slice(0, 160);
  } catch {
    // The body was not JSON; the status code is enough.
  }
  const status = response.status;
  // Providers sometimes echo part of a bad key in the message. Never show those.
  if (/key|token|auth/i.test(detail)) detail = '';
  const why = status === 401 || status === 403 ? `${label} did not accept the key. Check it in the AI key drawer.`
    : status === 404 ? `${label} does not know that model. Pick another model in the AI key drawer.`
    : status === 429 ? `${label} says you are over your rate limit or quota. Wait a minute and try again.`
    : status >= 500 ? `${label} had a problem on its side. Try again in a moment.`
    : `${label} refused the request.`;
  return `${why} (HTTP ${status}${detail ? `: ${detail}` : ''})`;
}

/** Pull a JSON object out of an AI answer, even if it came wrapped in ``` fences or prose. */
export function parseAiJson<T>(text: string): T {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)?.[1];
  const source = (fenced ?? text).trim();
  try {
    return JSON.parse(source) as T;
  } catch {
    const start = source.indexOf('{');
    const end = source.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try { return JSON.parse(source.slice(start, end + 1)) as T; } catch { /* reported below */ }
    }
  }
  throw new AiError('The AI answer was not valid JSON. Run it again, or try another model.');
}
