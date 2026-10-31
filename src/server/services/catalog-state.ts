import type { D1Database } from '@cloudflare/workers-types';

export async function catalogState(db: D1Database, now = Date.now()) {
  const [version, boundaries] = await db.batch<{ revision?: number; startAt?: string; endAt?: string }>([
    db.prepare('SELECT revision FROM SearchCatalogRevision WHERE id=1'),
    db.prepare(`SELECT startAt,endAt FROM PromotionCampaign WHERE status='PUBLISHED'
      UNION ALL SELECT json_extract(document,'$.flashSaleStartAt'),json_extract(document,'$.flashSaleEndAt')
      FROM SiteSettings WHERE id='site' AND json_extract(document,'$.flashSaleEnabled')=1`),
  ]);
  const revision = Number(version.results[0]?.revision);
  if (!Number.isFinite(revision)) throw new Error('Catalog revision missing');
  const times = boundaries.results.flatMap(row => [row.startAt, row.endAt])
    .filter((v): v is string => typeof v === 'string').map(Date.parse).filter(Number.isFinite);
  const next = times.filter(time => time > now);
  return { token: `${revision}:${Math.max(0, ...times.filter(time => time <= now))}`,
    nextChange: next.length ? Math.min(...next) : null, serverTime: now };
}
