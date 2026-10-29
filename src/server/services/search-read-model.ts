import type { D1Database } from '@cloudflare/workers-types';
import type { SearchFilterOptions, SearchResult } from './search.service';

export async function readSearchPage(db: D1Database, options: SearchFilterOptions, at: Date, compute: () => Promise<SearchResult>): Promise<SearchResult> {
  const { page: requestedPage, limit, ...filters } = options;
  const page = Math.max(1, Math.floor(Number(requestedPage) || 1));
  const pageSize = Math.min(48, Math.max(1, Math.floor(Number(limit) || 12)));
  const offset = (page - 1) * pageSize;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(['search-v8', filters])));
  const key = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const now = at.getTime();
  const valid = 's.cacheKey=? AND s.revision=r.revision AND s.createdAt<=? AND s.validUntil>?';
  const load = async (): Promise<SearchResult | null> => {
    // D1 batch reads metadata and page from one transaction, including invalidation.
    const [head, items] = await db.batch([
      db.prepare(`SELECT s.query,s.facets,s.totalCount FROM SearchResultSet s JOIN SearchCatalogRevision r ON r.id=1 WHERE ${valid}`).bind(key, now, now),
      db.prepare(`SELECT i.document FROM SearchResultItem i JOIN SearchResultSet s ON s.cacheKey=i.cacheKey JOIN SearchCatalogRevision r ON r.id=1 WHERE ${valid} AND i.position>=? AND i.position<? ORDER BY i.position LIMIT ?`)
        .bind(key, now, now, offset, offset + pageSize, pageSize),
    ]);
    const row = head.results[0] as { query: string; facets: string; totalCount: number } | undefined;
    if (!row) return null;
    return { query: row.query, facets: JSON.parse(row.facets), totalCount: row.totalCount,
      page, pageSize, totalPages: Math.ceil(row.totalCount / pageSize),
      products: items.results.map(item => JSON.parse((item as { document: string }).document)),
    };
  };
  const hit = await load();
  if (hit) return hit;

  for (let attempt = 0; attempt < 2; attempt++) {
    const version = await db.prepare('SELECT revision FROM SearchCatalogRevision WHERE id=1').first<{ revision: number }>();
    if (!version) throw new Error('Search catalog revision missing');
    const boundaries = await db.prepare(`SELECT startAt,endAt FROM PromotionCampaign WHERE status='PUBLISHED'
      UNION ALL SELECT json_extract(document,'$.flashSaleStartAt'),json_extract(document,'$.flashSaleEndAt') FROM SiteSettings WHERE id='site'`)
      .all<{ startAt: string | null; endAt: string | null }>();
    const next = boundaries.results.flatMap(row => [row.startAt, row.endAt]).filter((v): v is string => !!v)
      .map(Date.parse).filter(time => time > now);
    const validUntil = Math.min(now + 300_000, ...next);
    const result = await compute();
    // ponytail: bound materialization to 2,000 matches / 32 queries; move candidate retrieval into an indexed projection when this ceiling is common.
    if (result.totalCount > 2000) return { ...result, page, pageSize, totalPages: Math.ceil(result.totalCount / pageSize), products: result.products.slice(offset, offset + pageSize) };
    const statements = [
      db.prepare('DELETE FROM SearchResultSet WHERE validUntil<=? OR revision<>(SELECT revision FROM SearchCatalogRevision WHERE id=1)').bind(now),
      db.prepare('DELETE FROM SearchResultSet WHERE cacheKey=?').bind(key),
      db.prepare(`INSERT INTO SearchResultSet(cacheKey,revision,createdAt,validUntil,query,facets,totalCount)
        SELECT ?,revision,?,?,?,?,? FROM SearchCatalogRevision WHERE id=1 AND revision=?`)
        .bind(key, now, validUntil, result.query, JSON.stringify(result.facets), result.totalCount, version.revision),
    ];
    for (let start = 0; start < result.products.length; start += 80) {
      statements.push(db.prepare(`INSERT INTO SearchResultItem(cacheKey,position,document)
        SELECT ?,CAST(j.key AS INTEGER)+?,j.value FROM json_each(?) j WHERE EXISTS(SELECT 1 FROM SearchResultSet WHERE cacheKey=? AND revision=?)`)
        .bind(key, start, JSON.stringify(result.products.slice(start, start + 80)), key, version.revision));
    }
    statements.push(db.prepare('DELETE FROM SearchResultSet WHERE cacheKey IN (SELECT cacheKey FROM SearchResultSet WHERE cacheKey<>? ORDER BY createdAt DESC,cacheKey LIMIT -1 OFFSET 31)').bind(key));
    await db.batch(statements);
    const stored = await load();
    if (stored) return stored;
  }
  // Bulk edits can invalidate both attempts; serve a fresh uncached result.
  const result = await compute();
  return { ...result, page, pageSize, totalPages: Math.ceil(result.totalCount / pageSize), products: result.products.slice(offset, offset + pageSize) };
}
