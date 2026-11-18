// Crawl full laptopnew.vn catalog via Bizweb /products.json pagination.
import { writeFileSync, mkdirSync } from 'node:fs';
const DIR = '.wrangler/laptopnew-crawl';
mkdirSync(DIR, { recursive: true });
const all = new Map();
for (let page = 1; page < 60; page++) {
  const r = await fetch(`https://laptopnew.vn/products.json?limit=250&page=${page}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} page ${page}`);
  const { products = [] } = await r.json();
  if (!products.length) break;
  let added = 0;
  for (const p of products) if (!all.has(p.id)) { all.set(p.id, p); added++; }
  console.log(`page ${page}: ${products.length} (+${added}) total ${all.size}`);
  if (!added) break;
}
writeFileSync(`${DIR}/products-all.json`, JSON.stringify([...all.values()]));
console.log('saved', all.size);
