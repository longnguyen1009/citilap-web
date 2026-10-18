import { mediaEnvironment } from '@/server/media-http';
import { resolveProductsByIds } from './catalog.service';
import { matchLaptop, type AdvisorInput } from '@/contracts/catalog/advisor';

export async function adviseLaptops(input: AdvisorInput) {
  const { DB } = await mediaEnvironment();
  const { results } = await DB.prepare(`SELECT p.id,p.specs,s.published FROM Product p
    LEFT JOIN ProductStudio s ON s.productId=p.id
    WHERE p.status IN ('ACTIVE','active') AND p.deletedAt IS NULL
      AND (s.productId IS NULL OR s.published IS NOT NULL)
      AND (json_extract(s.published,'$.template')='LAPTOP' OR (s.productId IS NULL AND p.cpu IS NOT NULL))
    ORDER BY p.id LIMIT 501`).all<{ id: string; specs: string | null; published: string | null }>();
  // ponytail: cap at 500 laptops; move eligibility to indexed SQL before catalog exceeds this ceiling.
  if (results.length > 500) throw Error('ADVISOR_CATALOG_LIMIT');
  const cards = await resolveProductsByIds(results.map(row => row.id));
  const rows = new Map(results.map(row => [row.id, row]));
  return cards.flatMap(product => {
    const row = rows.get(product.id)!;
    const published = row.published ? JSON.parse(row.published) : null;
    const variant = published?.variants?.find((item: { id: string }) => item.id === product.variantId);
    if (variant?.availability && variant.availability !== 'AVAILABLE') return [];
    if (!published && product.stock <= 0) return [];
    const facts = published ? Object.fromEntries((published.specs || []).map((s: { key: string; value: string }) => [s.key, s.value])) : JSON.parse(row.specs || '{}');
    const match = matchLaptop(input, product, facts);
    return match ? [{ product, ...match }] : [];
  }).sort((a, b) => b.score - a.score || a.product.price - b.product.price || a.product.id.localeCompare(b.product.id)).slice(0, 3);
}
