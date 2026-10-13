// The visitor's AI key. Rules (AGENTS.md rule 4):
// - kept only in this browser: sessionStorage by default, localStorage only with "remember";
// - sent only to the provider the visitor picked (provider code arrives in M4);
// - never logged, not even partly. Do not add console output in this file.

export type Provider = 'gemini' | 'openai' | 'anthropic';

export interface ProviderInfo {
  label: string;
  company: string;
  keyPage: string;
}

export const PROVIDERS: Record<Provider, ProviderInfo> = {
  gemini: { label: 'Gemini', company: 'Google', keyPage: 'https://aistudio.google.com/apikey' },
  openai: { label: 'ChatGPT', company: 'OpenAI', keyPage: 'https://platform.openai.com/api-keys' },
  anthropic: { label: 'Claude', company: 'Anthropic', keyPage: 'https://console.anthropic.com/settings/keys' },
};

export const PROVIDER_IDS = Object.keys(PROVIDERS) as Provider[];
export const KEY_CHANGE_EVENT = 'kitsune:key-change';

const PROVIDER_ITEM = 'kitsune.ai.provider';
const keyItem = (provider: Provider) => `kitsune.ai.key.${provider}`;

function storage(kind: 'session' | 'local'): Storage | null {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function read(item: string): string | null {
  return storage('session')?.getItem(item) ?? storage('local')?.getItem(item) ?? null;
}

function isProvider(value: string | null): value is Provider {
  return value !== null && (PROVIDER_IDS as string[]).includes(value);
}

export function getProvider(): Provider {
  const stored = read(PROVIDER_ITEM);
  return isProvider(stored) ? stored : 'gemini';
}

export function getKey(provider: Provider = getProvider()): string | null {
  return read(keyItem(provider));
}

export function hasKey(provider: Provider = getProvider()): boolean {
  return Boolean(getKey(provider));
}

export function isRemembered(provider: Provider = getProvider()): boolean {
  return Boolean(storage('local')?.getItem(keyItem(provider)));
}

function announce(): void {
  window.dispatchEvent(new CustomEvent(KEY_CHANGE_EVENT));
}

export function setProvider(provider: Provider): void {
  // Follow the key: if this provider's key is remembered, remember the choice too.
  const target = isRemembered(provider) ? storage('local') : storage('session');
  const other = target === storage('local') ? storage('session') : storage('local');
  other?.removeItem(PROVIDER_ITEM);
  target?.setItem(PROVIDER_ITEM, provider);
  announce();
}

export function saveKey(provider: Provider, key: string, remember: boolean): void {
  const target = storage(remember ? 'local' : 'session');
  const other = storage(remember ? 'session' : 'local');
  if (!target) throw new Error('This browser blocks storage, so the key cannot be kept.');
  other?.removeItem(keyItem(provider));
  other?.removeItem(PROVIDER_ITEM);
  target.setItem(keyItem(provider), key.trim());
  target.setItem(PROVIDER_ITEM, provider);
  announce();
}

/** Remove every key for every provider from both storages. */
export function forgetAllKeys(): void {
  for (const kind of ['session', 'local'] as const) {
    const store = storage(kind);
    for (const provider of PROVIDER_IDS) store?.removeItem(keyItem(provider));
    store?.removeItem(PROVIDER_ITEM);
  }
  announce();
}

/** Light shape check only. The real test is the provider accepting it (M4). */
export function keyProblem(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) return 'Paste a key first.';
  if (/\s/.test(trimmed)) return 'A key has no spaces. Check that you copied only the key.';
  if (trimmed.length < 20) return 'That looks too short for an API key.';
  return null;
}
