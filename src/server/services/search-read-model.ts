import type { D1Database } from '@cloudflare/workers-types';
import type { SearchFilterOptions, SearchResult } from './search.service';
import { cachedJson } from '../cache/kv-cache';

const SEARCH_CACHE_TTL_SECONDS = 120;
const LOCAL_MEM_TTL_MS = 30_000;
const LOCAL_MEM_MAX_ENTRIES = 48;

const localSearchCache = new Map<string, { value: SearchResult; expiresAt: number }>();

function readLocalSearchCache(key: string, now: number): SearchResult | null {
  const entry = localSearchCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= now) {
    localSearchCache.delete(key);
    return null;
  }
  return entry.value;
}

function writeLocalSearchCache(key: string, value: SearchResult, now: number) {
  if (localSearchCache.size >= LOCAL_MEM_MAX_ENTRIES) {
    const oldest = localSearchCache.keys().next().value;
    if (oldest) localSearchCache.delete(oldest);
  }
  localSearchCache.set(key, { value, expiresAt: now + LOCAL_MEM_TTL_MS });
}

/**
 * Serves paginated search/category results using isolate memory + Workers KV (`cachedJson`)
 * instead of materializing/evicting rows in D1 `SearchResultSet`/`SearchResultItem`.
 * This avoids D1 write amplification and SQLite primary overload under high crawl/filter traffic.
 */
export async function readSearchPage(
  _db: D1Database,
  options: SearchFilterOptions,
  at: Date,
  compute: () => Promise<SearchResult>,
): Promise<SearchResult> {
  const { page: requestedPage, limit, ...filters } = options;
  const page = Math.max(1, Math.floor(Number(requestedPage) || 1));
  const pageSize = Math.min(48, Math.max(1, Math.floor(Number(limit) || 12)));
  const offset = (page - 1) * pageSize;

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(JSON.stringify(['search-v9', filters])),
  );
  const key = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  const now = at.getTime();

  let fullResult = readLocalSearchCache(key, now);
  if (!fullResult) {
    fullResult = await cachedJson<SearchResult>(
      `search-page:${key}`,
      SEARCH_CACHE_TTL_SECONDS,
      compute,
    );
    writeLocalSearchCache(key, fullResult, now);
  }

  return {
    ...fullResult,
    page,
    pageSize,
    totalPages: Math.ceil(fullResult.totalCount / pageSize),
    products: fullResult.products.slice(offset, offset + pageSize),
  };
}
