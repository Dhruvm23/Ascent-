import { createHash } from "node:crypto";

/**
 * Tiny in-memory response cache. Identical prompts (e.g. the same diagnostic
 * item set, or a repeated explanation) return instantly without burning a
 * rate-limited free-tier call. On serverless this is per-instance; that's fine
 * as a best-effort efficiency win. Curriculum graphs get a stronger, durable
 * cache in Postgres (CurriculumCache).
 */

type Entry = { value: string; expires: number };

const store = new Map<string, Entry>();
const MAX_ENTRIES = 500;
const DEFAULT_TTL_MS = 1000 * 60 * 60; // 1 hour

export function cacheKey(parts: (string | number | undefined)[]): string {
  const h = createHash("sha256");
  h.update(parts.filter((p) => p !== undefined).join("::"));
  return h.digest("hex");
}

export function getCached(key: string): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expires < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setCached(key: string, value: string, ttlMs = DEFAULT_TTL_MS): void {
  if (store.size >= MAX_ENTRIES) {
    // Evict oldest inserted key (Map preserves insertion order).
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, { value, expires: Date.now() + ttlMs });
}

export function clearCache(): void {
  store.clear();
}
