import { mediaEnvironment } from '@/server/media-http';
import { resolveProductsByIds } from './catalog.service';
import { matchLaptop, type AdvisorInput } from '@/contracts/catalog/advisor';
import { catalogState } from './catalog-state';
import type { D1Database } from '@cloudflare/workers-types';

interface CachedAdvisorResult {
  expires: number;
  data: Array<{ product: Awaited<ReturnType<typeof resolveProductsByIds>>[number]; reasons: string[]; limitation: string; score: number }>;
}

let caches = new WeakMap<D1Database, Map<string, CachedAdvisorResult>>();

export function clearAdvisorCache(): void {
  caches = new WeakMap();
}

export async function adviseLaptops(input: AdvisorInput) {
  const now = Date.now();
  const { DB } = await mediaEnvironment();
  const state = await catalogState(DB, now);
  const cacheKey = `${state.token}:${input.budget}:${input.need}:${input.condition}:${input.portable}`;
  let advisorCache = caches.get(DB);
  if (!advisorCache) { advisorCache = new Map(); caches.set(DB, advisorCache); }
  const expires = Math.min(now + 60_000, state.nextChange ?? Infinity);
  const cached = advisorCache.get(cacheKey);
  if (cached && cached.expires > now) {
    return cached.data;
  }


  // Pre-filter candidate laptops in SQL to avoid scanning and resolving the entire database
  const conditions: string[] = [
    "p.status IN ('ACTIVE','active')",
    "p.deletedAt IS NULL",
    "(s.productId IS NULL OR s.published IS NOT NULL)",
    "(json_extract(s.published,'$.template')='LAPTOP' OR (s.productId IS NULL AND p.cpu IS NOT NULL))",
  ];
  // ponytail: resolve public laptops before budget/condition filtering; add campaign-aware SQL if catalog size demands it.

  const whereSql = conditions.join(" AND ");
  const { results } = await DB.prepare(`SELECT p.id,p.specs,s.published FROM Product p
    LEFT JOIN ProductStudio s ON s.productId=p.id
    WHERE ${whereSql}
    ORDER BY p.id`).all<{ id: string; specs: string | null; published: string | null }>();

  if (results.length === 0) {
    advisorCache.set(cacheKey, { expires, data: [] });
    return [];
  }

  // The shared resolver batches IDs within D1's parameter limit.
  const cards = await resolveProductsByIds(results.map(row => row.id));
  const rows = new Map(results.map(row => [row.id, row]));
  const matchedList = cards.flatMap(product => {
    const row = rows.get(product.id)!;
    const published = row.published ? JSON.parse(row.published) : null;
    const variant = published?.variants?.find((item: { id: string }) => item.id === product.variantId);
    if (variant?.availability && !['AVAILABLE', 'CONTACT'].includes(variant.availability)) return [];
    if (!published && product.stock <= 0) return [];
    const facts = published ? Object.fromEntries((published.specs || []).map((s: { key: string; value: string }) => [s.key, s.value])) : JSON.parse(row.specs || '{}');
    const match = matchLaptop(input, product, facts);
    return match ? [{ product, ...match }] : [];
  }).sort((a, b) => b.score - a.score || a.product.price - b.product.price || a.product.id.localeCompare(b.product.id)).slice(0, 3);

  // Evict expired entries if cache map grows
  if (advisorCache.size > 200) {
    for (const [k, v] of advisorCache) {
      if (v.expires <= now) advisorCache.delete(k);
    }
  }

  if (advisorCache.size >= 200) advisorCache.delete(advisorCache.keys().next().value!);
  advisorCache.set(cacheKey, { expires, data: matchedList });
  return matchedList;
}
