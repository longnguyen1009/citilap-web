// Rewrite every product description in CitiLap voice (local D1). Usage: node scripts/rewrite-product-copy.mjs
import { DatabaseSync, backup } from 'node:sqlite';
import { readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildCitiLapContent, productKind } from './lib/citilap-copy.mjs';

const root = resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const file = readdirSync(root).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite').find((f) => {
  const t = new DatabaseSync(resolve(root, f), { readOnly: true });
  try { return !!t.prepare("SELECT 1 FROM sqlite_master WHERE name='ProductStudio'").get(); } finally { t.close(); }
});
const db = new DatabaseSync(resolve(root, file));
mkdirSync('.wrangler/backups', { recursive: true });
await backup(db, resolve('.wrangler/backups', `before-copy-rewrite-${Date.now()}.sqlite`));

const cats = new Map(db.prepare('SELECT id,name,slug,parentId FROM Category').all().map((c) => [c.id, c]));
const chain = (id) => { const out = []; let c = cats.get(id); while (c) { out.unshift(c); c = c.parentId ? cats.get(c.parentId) : null; } return out; };
const rows = db.prepare('SELECT p.id, s.draft, s.published, s.revision FROM Product p JOIN ProductStudio s ON s.productId=p.id WHERE p.deletedAt IS NULL').all();
db.exec('BEGIN IMMEDIATE');
try {
  for (const r of rows) {
    const doc = JSON.parse(r.published || r.draft);
    const path = chain(doc.categoryId);
    const html = buildCitiLapContent({
      name: doc.name, brand: doc.brand, specs: doc.specs,
      kind: productKind(path[0]?.id, doc.template),
      catPath: '/' + path.map((c) => c.slug).join('/'), catName: path.at(-1)?.name || 'Laptop',
      variantCount: (doc.variants || []).length,
    });
    doc.contentHtml = html;
    const json = JSON.stringify(doc), rev = r.revision + 1;
    db.prepare("INSERT INTO ProductStudioRevision(productId,revision,document,action,actor) VALUES(?,?,?,'publish','copy-rewrite')").run(r.id, rev, json);
    db.prepare('UPDATE ProductStudio SET draft=?,published=?,revision=?,publishedRevision=?,updatedAt=CURRENT_TIMESTAMP WHERE productId=?').run(json, json, rev, rev, r.id);
    db.prepare('UPDATE Product SET contentHtml=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?').run(html, r.id);
  }
  db.exec('COMMIT');
  console.log('Rewrote', rows.length, 'product descriptions');
} catch (e) { db.exec('ROLLBACK'); throw e; } finally { db.close(); }
