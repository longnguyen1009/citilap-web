// Import CitiLap articles into 3 post categories + add them to the "Tin tức & Tư vấn" menu.
import { DatabaseSync, backup } from 'node:sqlite';
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const SRC = process.argv[2];
const root = resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');
const file = readdirSync(root).filter((f) => f.endsWith('.sqlite') && f !== 'metadata.sqlite').find((f) => {
  const t = new DatabaseSync(resolve(root, f), { readOnly: true });
  try { return !!t.prepare("SELECT 1 FROM sqlite_master WHERE name='PostStudio'").get(); } finally { t.close(); }
});
const db = new DatabaseSync(resolve(root, file));
mkdirSync('.wrangler/backups', { recursive: true });
await backup(db, resolve('.wrangler/backups', `before-posts-${Date.now()}.sqlite`));

const CATS = [
  { id: 'pc-tin-tuc-cong-nghe', name: 'Tin tức công nghệ', slug: 'tin-tuc-cong-nghe', sortOrder: 1, file: 'posts-tin-tuc-cong-nghe.json' },
  { id: 'pc-tu-van-laptop', name: 'Tư vấn laptop', slug: 'tu-van-laptop', sortOrder: 2, file: 'posts-tu-van-laptop.json' },
  { id: null, name: 'Review laptop', slug: 'review-laptop', sortOrder: 3, file: 'posts-review-laptop.json' },
];
const products = db.prepare(`SELECT p.id, p.name, json_extract(s.published,'$.media[0].assetId') assetId FROM Product p JOIN ProductStudio s ON s.productId=p.id
  WHERE p.deletedAt IS NULL AND json_extract(s.published,'$.template')='LAPTOP'`).all();
const now = new Date().toISOString();
db.exec('PRAGMA foreign_keys=ON; BEGIN IMMEDIATE');
try {
  // Old categories not in the new set -> hidden
  db.prepare(`UPDATE PostCategory SET status='INACTIVE', updatedAt=CURRENT_TIMESTAMP WHERE slug NOT IN (${CATS.map(() => '?').join(',')})`).run(...CATS.map((c) => c.slug));
  let idx = 0;
  for (const c of CATS) {
    const existing = db.prepare('SELECT id FROM PostCategory WHERE slug=?').get(c.slug);
    c.id = existing?.id || c.id;
    if (existing) db.prepare("UPDATE PostCategory SET name=?, sortOrder=?, status='ACTIVE', revision=revision+1, updatedAt=CURRENT_TIMESTAMP WHERE id=?").run(c.name, c.sortOrder, c.id);
    else db.prepare("INSERT INTO PostCategory(id,name,slug,sortOrder,status) VALUES(?,?,?,?,'ACTIVE')").run(c.id, c.name, c.slug, c.sortOrder);
    const posts = JSON.parse(readFileSync(resolve(SRC, c.file), 'utf8'));
    for (const p of posts) {
      const kw = (p.keywords || []).map((k) => k.toLowerCase());
      let related = products.filter((x) => kw.some((k) => x.name.toLowerCase().includes(k)));
      if (!related.length) related = products.slice(idx * 3 % products.length, idx * 3 % products.length + 3);
      const cover = related.find((x) => x.assetId) || products[idx % products.length];
      const slug = p.slug.slice(0, 80);
      if (db.prepare('SELECT 1 FROM Post WHERE slug=?').get(slug)) continue;
      const id = randomUUID();
      const t = new Date(Date.now() - idx * 36e5 * 20).toISOString();
      const doc = {
        schemaVersion: 1, title: p.title, slug, excerpt: p.excerpt.slice(0, 300), contentHtml: p.contentHtml,
        categoryId: c.id, authorName: 'CitiLap', coverImage: { assetId: cover.assetId, alt: p.title },
        isFeatured: idx % 7 === 0, seo: { title: p.title.slice(0, 120), description: p.excerpt.slice(0, 300), ogImageAssetId: cover.assetId },
        relatedProductIds: related.slice(0, 4).map((x) => x.id),
      };
      const json = JSON.stringify(doc);
      db.prepare('INSERT INTO Post(id,slug,categoryId,createdAt,updatedAt) VALUES(?,?,?,?,?)').run(id, slug, c.id, t, t);
      db.prepare('INSERT INTO PostStudio(postId,draft,published,updatedAt) VALUES(?,?,?,?)').run(id, json, json, t);
      db.prepare("INSERT INTO PostStudioRevision(postId,revision,document,action,actor) VALUES(?,1,?,'publish','citilap-content')").run(id, json);
      db.prepare('UPDATE PostStudio SET revision=1,publishedRevision=1,publishedAt=?,publicUpdatedAt=?,updatedAt=? WHERE postId=?').run(t, t, t, id);
      if (cover.assetId) {
        db.prepare("INSERT OR IGNORE INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES(?,?,'POST_REVISION',?,?)").run(randomUUID(), cover.assetId, id, `1:${cover.assetId}`);
      }
      idx++;
    }
  }
  // Menu: Tin tức & Tư vấn -> 3 sub-items
  const nav = db.prepare("SELECT draft, published, revision FROM NavigationStudio WHERE id='site'").get();
  const patch = (raw) => {
    const d = JSON.parse(raw);
    const item = d.menus.main.find((m) => m.id === 'nav-news');
    item.children = CATS.map((c) => ({ id: `nav-news-${c.slug}`, label: c.name, target: { kind: 'path', path: `/news/category/${c.slug}` }, children: [] }));
    return JSON.stringify(d);
  };
  const pub = patch(nav.published), rev = nav.revision + 1;
  db.prepare("INSERT INTO NavigationRevision(revision,document,action,actor) VALUES(?,?,'publish','citilap-content')").run(rev, pub);
  db.prepare("UPDATE NavigationStudio SET draft=?, published=?, revision=?, publishedRevision=?, updatedAt=CURRENT_TIMESTAMP WHERE id='site'").run(patch(nav.draft), pub, rev, rev);
  db.exec('COMMIT');
  console.log('Imported', idx, 'posts');
  console.log(db.prepare("SELECT c.name, count(p.id) n FROM PostCategory c LEFT JOIN Post p ON p.categoryId=c.id AND p.deletedAt IS NULL WHERE c.status='ACTIVE' GROUP BY c.id").all());
} catch (e) { db.exec('ROLLBACK'); throw e; } finally { db.close(); }
