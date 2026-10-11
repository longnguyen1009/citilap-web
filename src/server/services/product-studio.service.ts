import type { D1Database } from '@cloudflare/workers-types';
import { blankProduct, studioWriteSchema, type ProductDocument } from '../../contracts/cms/product-studio';
import { sanitizeHtml } from '../../lib/sanitize-html';
import { MediaError, mediaDetail, getAsset, type MediaEnvironment } from './media-library.service';

type Studio = { productId: string; revision: number; draft: string; published: string | null };
export async function studioList(db: D1Database, q = '') {
  const products = await db.prepare(`SELECT p.id,p.name,p.slug,p.status,s.revision,json_extract(s.draft,'$.name') AS draftName FROM Product p LEFT JOIN ProductStudio s ON s.productId=p.id WHERE p.deletedAt IS NULL AND (instr(lower(p.name),lower(?))>0 OR instr(lower(s.draft),lower(?))>0) ORDER BY p.updatedAt DESC LIMIT 100`).bind(q.slice(0, 200), q.slice(0, 200)).all();
  const categories = await db.prepare("SELECT id,name FROM Category WHERE status='ACTIVE' ORDER BY sortOrder,name").all();
  return { items: products.results, categories: categories.results };
}
export async function studioDetail(db: D1Database, id: string) {
  const row = await db.prepare('SELECT * FROM ProductStudio WHERE productId=?').bind(id).first<Studio>();
  if (row) return { id, revision: row.revision, document: JSON.parse(row.draft) as ProductDocument, published: !!row.published };
  const p = await db.prepare('SELECT * FROM Product WHERE id=? AND deletedAt IS NULL').bind(id).first<Record<string, unknown>>();
  if (!p) throw new MediaError('Không tìm thấy sản phẩm.', 404);
  const d = blankProduct();
  for (const k of ['name', 'slug', 'categoryId', 'brand', 'description', 'contentHtml', 'seoTitle', 'seoDescription'] as const) d[k] = String(p[k] || '');
  d.price = Number(p.price); d.originalPrice = p.originalPrice == null ? null : Number(p.originalPrice);
  try { const specs = JSON.parse(String(p.specs || '{}')); if (specs && !Array.isArray(specs)) d.specs = Object.entries(specs).map(([key, value]) => ({ key, value: String(value) })); } catch { /* Old free text is retained on Product. */ }
  const variants = await db.prepare("SELECT * FROM ProductVariant WHERE productId=? AND status='ACTIVE'").bind(id).all<Record<string, unknown>>();
  d.variants = variants.results.map(v => ({ id: String(v.id), sku: String(v.sku), name: String(v.name), price: Number(v.price), condition: 'NEW', ram: String(v.ram || ''), storage: String(v.storage || ''), gpu: String(v.gpu || '') }));
  const media = await db.prepare("SELECT DISTINCT a.id,a.alt FROM MediaUsage u JOIN MediaAsset a ON a.id=u.assetId WHERE u.ownerType='PRODUCT' AND u.ownerId=? AND a.state='READY'").bind(id).all<{ id: string; alt: string }>();
  d.media = media.results.map(a => ({ assetId: a.id, alt: a.alt, variantId: '' }));
  return { id, revision: 0, document: d, published: ['ACTIVE', 'active'].includes(String(p.status)) };
}
export async function writeStudio(env: MediaEnvironment, id: string | null, input: unknown) {
  const { expectedRevision, action, document: d } = studioWriteSchema.parse(input);
  d.contentHtml = sanitizeHtml(d.contentHtml);
  const db = env.DB;
  if (!await db.prepare("SELECT id FROM Category WHERE id=? AND status='ACTIVE'").bind(d.categoryId).first()) throw new MediaError('Danh mục không tồn tại hoặc đã ẩn.');
  const existing = id ? await studioDetail(db, id) : null;
  if ((existing?.revision ?? 0) !== expectedRevision) throw new MediaError('Sản phẩm đã được sửa ở nơi khác. Tải lại trước khi lưu.', 409);
  const productId = id || crypto.randomUUID();
  const assets = [];
  for (const m of d.media) {
    const a = await getAsset(db, m.assetId);
    const detail = await mediaDetail(db, m.assetId);
    if (a.state !== 'READY' || !detail.asset.url) throw new MediaError('Tệp chưa sẵn sàng.');
    if (action === 'publish' && a.kind === 'IMAGE' && (!m.alt.trim() || !a.storageKey || !await env.PRODUCT_MEDIA.head(a.storageKey))) throw new MediaError('Ảnh xuất bản cần mô tả alt và tệp tồn tại trong R2.');
    assets.push({ ...a, url: detail.asset.url, ...m });
  }
  if (action === 'publish' && !assets.some(a => a.kind === 'IMAGE')) throw new MediaError('Thêm ít nhất một ảnh trước khi xuất bản.');
  const version = expectedRevision + 1;
  const snapshot = JSON.stringify(d);
  const statements = [];
  if (!id) statements.push(db.prepare("INSERT INTO Product(id,name,slug,description,price,categoryId,status,updatedAt) VALUES(?,?,?,'',0,?,'DRAFT',CURRENT_TIMESTAMP)").bind(productId, d.name, d.slug, d.categoryId));
  statements.push(db.prepare('INSERT OR IGNORE INTO ProductStudio(productId,draft) VALUES(?,?)').bind(productId, snapshot));
  statements.push(db.prepare('INSERT INTO ProductStudioRevision(productId,revision,document,action) VALUES(?,?,?,?)').bind(productId, version, snapshot, action));
  statements.push(db.prepare(`UPDATE ProductStudio SET draft=?,revision=?,published=CASE WHEN ?='publish' THEN ? WHEN ?='unpublish' THEN NULL ELSE published END,updatedAt=CURRENT_TIMESTAMP WHERE productId=?`).bind(snapshot, version, action, snapshot, action, productId));
  for (const a of assets) statements.push(db.prepare("INSERT INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES(?,?,'PRODUCT_REVISION',?,?)").bind(crypto.randomUUID(), a.id, productId, `${version}:${a.id}`));
  if (action === 'publish') {
    const specs = Object.fromEntries(d.specs.map(s => [s.key, s.value]));
    statements.push(db.prepare(`UPDATE Product SET name=?,slug=?,description=?,contentHtml=?,brand=?,categoryId=?,price=?,originalPrice=?,seoTitle=?,seoDescription=?,images=?,specs=?,cpu=?,gpu=?,ram=?,storage=?,display=?,status='ACTIVE',updatedAt=CURRENT_TIMESTAMP WHERE id=?`).bind(d.name,d.slug,d.description,d.contentHtml,d.brand,d.categoryId,d.price,d.originalPrice,d.seoTitle,d.seoDescription,JSON.stringify(assets.filter(a => a.kind === 'IMAGE').map(a => a.url)),JSON.stringify(specs),specs.CPU||null,specs.GPU||null,specs.RAM||null,specs.SSD||null,specs['Màn hình']||null,productId));
    statements.push(db.prepare("UPDATE ProductVariant SET status='INACTIVE' WHERE productId=?").bind(productId));
    for (const v of d.variants) {
      const owner = await db.prepare('SELECT productId FROM ProductVariant WHERE id=?').bind(v.id).first<{ productId: string }>();
      if (owner && owner.productId !== productId) throw new MediaError('Biến thể thuộc sản phẩm khác.', 409);
      statements.push(db.prepare(`INSERT INTO ProductVariant(id,productId,sku,name,options,price,status,ram,storage,gpu,updatedAt) VALUES(?,?,?,?,?,?,'ACTIVE',?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET sku=excluded.sku,name=excluded.name,options=excluded.options,price=excluded.price,status='ACTIVE',ram=excluded.ram,storage=excluded.storage,gpu=excluded.gpu,updatedAt=CURRENT_TIMESTAMP`).bind(v.id,productId,v.sku,v.name,JSON.stringify({ condition:v.condition }),v.price,v.ram,v.storage,v.gpu));
    }
    statements.push(db.prepare('DELETE FROM ProductImage WHERE productId=?').bind(productId));
    for (const [i,a] of assets.filter(a => a.kind === 'IMAGE').entries()) statements.push(db.prepare('INSERT INTO ProductImage(id,productId,variantId,r2Key,url,alt,sortOrder,isPrimary) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),productId,a.variantId || null,a.storageKey,a.url,a.alt,i,i === 0 ? 1 : 0));
  }
  if (action === 'unpublish') statements.push(db.prepare("UPDATE Product SET status='DRAFT',updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(productId));
  statements.push(db.prepare('INSERT INTO ProductEditLog(id,productId,action,actorName,snapshot) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),productId,`STUDIO_${action.toUpperCase()}`,'admin',snapshot));
  try { await db.batch(statements); } catch (e) {
    if (e instanceof Error && /STUDIO_CONFLICT|UNIQUE constraint|MEDIA_NOT_READY/.test(e.message)) throw new MediaError('Xung đột phiên bản, slug, SKU hoặc trạng thái media. Tải lại và kiểm tra dữ liệu.',409);
    throw e;
  }
  return studioDetail(db, productId);
}
// Public DTO resolves only the published snapshot; drafts/storage keys never leave this boundary.
export async function publicStudio(db: D1Database, slug: string) {
  const row = await db.prepare("SELECT s.published,s.revision FROM ProductStudio s JOIN Product p ON p.id=s.productId WHERE p.slug=? AND p.status='ACTIVE' AND p.deletedAt IS NULL AND s.published IS NOT NULL").bind(slug).first<{ published: string; revision: number }>();
  if (!row) throw new MediaError('Không tìm thấy sản phẩm đã xuất bản.',404);
  const d = JSON.parse(row.published) as ProductDocument;
  const media = [];
  for (const m of d.media) { const { asset } = await mediaDetail(db,m.assetId); media.push({ url:asset.url,kind:asset.kind,alt:m.alt,variantId:m.variantId }); }
  return { ...d, media, canOrder: ['AVAILABLE','PREORDER'].includes(d.availability) };
}
