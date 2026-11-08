/**
 * Small Workers-KV cache for public (storefront) reads.
 *
 * - Keys carry the build id, so cached data/HTML can never outlive the deploy that produced it
 *   (cached HTML references hashed chunk file names).
 * - Keys also carry a "CMS version". Any successful admin mutation bumps it (see `bumpCmsVersion`,
 *   called from the Worker), which invalidates every cached entry at once.
 *   KV is eventually consistent, so other edge locations may keep serving the previous version for up to
 *   ~60s after a publish; entries also expire on their own TTL.
 * - Every failure falls back to the loader: caching must never break a page.
 */

declare const __BUILD_ID__: string;

export const BUILD_ID: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

export interface KvLike {
  get(key: string, options: { type: 'json'; cacheTtl?: number }): Promise<unknown>;
  get(key: string, options?: { type?: 'text'; cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

const VERSION_KEY = 'citilap:cms-version';
const KV_MIN_TTL_SECONDS = 60;

export async function getCacheKv(): Promise<KvLike | null> {
  try {
    const { env } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'cloudflare:workers');
    return ((env as unknown as { VINEXT_KV_CACHE?: KvLike }).VINEXT_KV_CACHE) ?? null;
  } catch {
    return null; // Node dev / tests: no bindings, no cache.
  }
}

export async function cmsVersion(kv: KvLike): Promise<string> {
  try {
    return (await kv.get(VERSION_KEY, { type: 'text', cacheTtl: 30 })) ?? '0';
  } catch {
    return '0';
  }
}

export async function bumpCmsVersion(kv: KvLike): Promise<void> {
  await kv.put(VERSION_KEY, Date.now().toString(36));
}

/** Cache a JSON-serialisable loader result (including `null`) for `ttlSeconds`. */
export async function cachedJson<T>(name: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const kv = await getCacheKv();
  if (!kv) return loader();
  const key = `citilap:${BUILD_ID}:${await cmsVersion(kv)}:${name}`;
  try {
    const hit = (await kv.get(key, { type: 'json', cacheTtl: 60 })) as { v: T } | null;
    if (hit && 'v' in hit) return hit.v;
  } catch { /* fall through to loader */ }
  const value = await loader();
  try {
    await kv.put(key, JSON.stringify({ v: value ?? null }), { expirationTtl: Math.max(KV_MIN_TTL_SECONDS, ttlSeconds) });
  } catch { /* cache write is best effort */ }
  return value;
}

