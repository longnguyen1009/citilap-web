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
const MEM_VERSION_TTL_MS = 5_000;
const MEM_DATA_TTL_MS = 15_000;
const MEM_DATA_MAX_ENTRIES = 64;

let memVersion: { value: string; expiresAt: number } | null = null;
const memData = new Map<string, { value: unknown; expiresAt: number }>();

export async function getCacheKv(): Promise<KvLike | null> {
  try {
    const { env } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'cloudflare:workers');
    return ((env as unknown as { VINEXT_KV_CACHE?: KvLike }).VINEXT_KV_CACHE) ?? null;
  } catch {
    return null; // Node dev / tests: no bindings, no cache.
  }
}

export async function cmsVersion(kv?: KvLike | null): Promise<string> {
  const now = Date.now();
  if (memVersion && memVersion.expiresAt > now) {
    return memVersion.value;
  }
  if (!kv) return memVersion?.value ?? '0';
  try {
    const ver = (await kv.get(VERSION_KEY, { type: 'text', cacheTtl: 30 })) ?? '0';
    memVersion = { value: ver, expiresAt: now + MEM_VERSION_TTL_MS };
    return ver;
  } catch {
    return memVersion?.value ?? '0';
  }
}

export async function bumpCmsVersion(kv?: KvLike | null): Promise<void> {
  const next = Date.now().toString(36);
  memVersion = { value: next, expiresAt: Date.now() + MEM_VERSION_TTL_MS };
  memData.clear();
  if (kv) {
    await kv.put(VERSION_KEY, next);
  }
}

function rememberInMemory(key: string, value: unknown, now = Date.now()) {
  if (memData.size >= MEM_DATA_MAX_ENTRIES) {
    const oldest = memData.keys().next().value;
    if (oldest) memData.delete(oldest);
  }
  memData.set(key, { value, expiresAt: now + MEM_DATA_TTL_MS });
}

/** Keep background KV writes alive after the response without making the render wait for them. */
async function runInBackground(task: Promise<unknown>): Promise<void> {
  const guarded = task.catch(() => undefined);
  try {
    const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'cloudflare:workers')) as {
      waitUntil?: (promise: Promise<unknown>) => void;
    };
    if (typeof mod.waitUntil === 'function') {
      mod.waitUntil(guarded);
      return;
    }
  } catch { /* not running in Workers */ }
  void guarded;
}

/** Cache a JSON-serialisable loader result (including `null`) for `ttlSeconds`. */
export async function cachedJson<T>(name: string, ttlSeconds: number, loader: () => Promise<T>): Promise<T> {
  const kv = await getCacheKv();
  if (!kv) return loader();
  const ver = await cmsVersion(kv);
  const key = `citilap:${BUILD_ID}:${ver}:${name}`;
  const memHit = memData.get(key);
  if (memHit && memHit.expiresAt > Date.now()) {
    return memHit.value as T;
  }
  // Note: no cross-request promise sharing here; Workers ties I/O to the request that started it
  // and aborted prefetches would leave other waiters hanging. React `cache()` dedupes per request.
  try {
    const hit = (await kv.get(key, { type: 'json', cacheTtl: 60 })) as { v: T } | null;
    if (hit && 'v' in hit) {
      rememberInMemory(key, hit.v);
      return hit.v;
    }
  } catch { /* fall through to loader */ }
  const value = await loader();
  rememberInMemory(key, value);
  // Cache writes are best effort and must not delay the response.
  await runInBackground(
    kv.put(key, JSON.stringify({ v: value ?? null }), { expirationTtl: Math.max(KV_MIN_TTL_SECONDS, ttlSeconds) }),
  );
  return value;
}

