// Crawl all products from https://trieubom.com via WooCommerce Store API.
import { mkdirSync, writeFileSync } from 'node:fs';

const DIR = '.wrangler/trieubom-crawl';
mkdirSync(DIR, { recursive: true });

const all = [];
for (let page = 1; page <= 20; page++) {
  const url = `https://trieubom.com/wp-json/wc/store/v1/products?per_page=100&page=${page}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    if (res.status === 400) break;
    throw new Error(`HTTP ${res.status} on page ${page}`);
  }
  const items = await res.json();
  if (!Array.isArray(items) || items.length === 0) break;
  all.push(...items);
  console.log(`Page ${page}: ${items.length} items (total ${all.length})`);
  const totalPages = Number(res.headers.get('x-wp-totalpages') || 0);
  if (totalPages && page >= totalPages) break;
}

writeFileSync(`${DIR}/products.json`, JSON.stringify(all));
console.log('Saved', all.length, 'products to', `${DIR}/products.json`);
