// "Tools tried: n / 9". Stored only in this browser; nothing is ever sent anywhere.
import { TOOLS } from './tools.ts';

const STORAGE_KEY = 'kitsune.tried';

export function triedTools(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    const known = new Set(TOOLS.map((t) => t.slug));
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string' && known.has(s)) : [];
  } catch {
    return [];
  }
}

export function markTried(slug: string): void {
  const tried = new Set(triedTools());
  if (tried.has(slug)) return;
  tried.add(slug);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...tried]));
  } catch {
    // Storage can be blocked (private mode). The counter is only a nicety.
  }
}
