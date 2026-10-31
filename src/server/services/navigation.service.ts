import { cmsMutationBatch } from '../cms-schedule-context';
import { adminActor, adminAuditStatements } from '../admin-context';
import type { D1Database } from '@cloudflare/workers-types';
import { navigationWriteSchema, type NavigationDocument, type NavigationDetail, type NavigationTarget, type ResolvedNavigation } from '../../contracts/cms/navigation';
import { MediaError, getAsset, type MediaEnvironment } from './media-library.service';
import { getPublicMediaUrl } from '../../infra/cloudflare/r2/storage';
import { resolveProductsByIds, resolveProductsByCriteria, type HomepageProduct } from './catalog.service';
import { getStorefrontPricingContext, type PriceEvaluationContext } from './pricing.service';
import { getPrismaClient } from '../../lib/prisma';
import { categoryHref, canonicalCategoryPath } from '../../lib/category-paths';

type Row = { revision: number; draft: string; published: string | null; publishedRevision: number | null };
const publishedNavigationCache = new WeakMap<D1Database, { revision: number; document: NavigationDocument }>();

async function navigationSnapshot(db: D1Database) {
  const cached = publishedNavigationCache.get(db);
  const row = await db.prepare("SELECT publishedRevision, published IS NOT NULL AS available, CASE WHEN publishedRevision = ? THEN NULL ELSE published END AS published FROM NavigationStudio WHERE id='site'")
    .bind(cached?.revision ?? -1).first<{ publishedRevision: number; available: number; published: string | null }>();
  if (!row?.available) {
    publishedNavigationCache.delete(db);
    return null;
  }
  if (cached && cached.revision === row.publishedRevision) return cached;
  const snapshot = { revision: row.publishedRevision, document: JSON.parse(row.published!) as NavigationDocument };
  publishedNavigationCache.set(db, snapshot);
  return snapshot;
}
type CategoryRow = { id: string; name: string; slug: string; description: string | null; parentId: string | null; image: string | null; status: string; sortOrder: number };

const categoryRows = async (db: D1Database) => (await db.prepare('SELECT * FROM Category ORDER BY sortOrder,name').all<CategoryRow>()).results.map(c => ({
  ...c,
  // Existing seed/catalog rows store R2 keys, whereas CMS authoring uses URLs.
  image: c.image && !c.image.startsWith('/') ? getPublicMediaUrl(c.image) : c.image,
}));

export async function navigationDetail(db: D1Database): Promise<NavigationDetail> {
  const row = await db.prepare("SELECT * FROM NavigationStudio WHERE id='site'").first<Row>();
  const rows = await categoryRows(db), productNames: Record<string,string> = {};
  if (row) {
    const document: NavigationDocument = JSON.parse(row.draft), ids = referencedProducts(document);
    for (let i=0;i<ids.length;i+=80) {
      const chunk=ids.slice(i,i+80);
      for (const p of (await db.prepare(`SELECT id,name FROM Product WHERE id IN (${chunk.map(()=>'?').join(',')})`).bind(...chunk).all<{id:string;name:string}>()).results) productNames[p.id]=p.name;
    }
    return { revision:row.revision,publishedRevision:row.publishedRevision,document,productNames,categoryIds:rows.map(c=>c.id) };
  }
  return {
    revision: 0,
    publishedRevision: null,
    productNames,
    categoryIds: rows.map(c => c.id),
    document: {
      schemaVersion: 1,
      categories: rows.map(c => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        parentId: c.parentId,
        visible: c.status === 'ACTIVE',
        image: c.image || '',
        assetId: '',
        alt: c.name
      })),
      collections: [],
      menus: { main: [], footer: [] }
    }
  };
}

export async function navigationProducts(db: D1Database, q = '', page = 1) {
  page = Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10000) : 1;
  const rows = await db.prepare("SELECT id,name,slug,status FROM Product WHERE deletedAt IS NULL AND instr(lower(name),lower(?))>0 ORDER BY name,id LIMIT 26 OFFSET ?").bind(q.slice(0,120), (page-1)*25).all<{id:string;name:string;slug:string;status:string}>();
  return { items: rows.results.slice(0,25), page, hasMore: rows.results.length > 25 };
}

const referencedProducts = (d: NavigationDocument) => [
  ...new Set([
    ...d.collections.flatMap(c => c.productIds || []),
    ...Object.values(d.menus).flatMap(items => items.flatMap(i => [i, ...i.children])).flatMap(i => i.target.kind === 'product' ? [i.target.id] : [])
  ])
];

export async function writeNavigation(env: MediaEnvironment, input: unknown) {
  const { expectedRevision, action, document: d } = navigationWriteSchema.parse(input);
  const db = env.DB;
  const current = await navigationDetail(db);
  if (current.revision !== expectedRevision) throw new MediaError('Nội dung đã được sửa ở nơi khác. Tải lại trước khi lưu.',409);
  if (action === 'publish') {
    const accessoryRoot = d.categories.find(c => !c.parentId && c.slug === 'phu-kien');
    const slugs = d.categories.filter(c => c.visible && c.parentId === accessoryRoot?.id).map(c => c.slug);
    const collision = slugs.length ? await db.prepare("SELECT p.slug FROM Product p LEFT JOIN ProductStudio s ON s.productId=p.id WHERE p.deletedAt IS NULL AND p.status IN ('ACTIVE','active') AND (s.productId IS NULL OR s.published IS NOT NULL) AND COALESCE(json_extract(s.published,'$.template'),CASE WHEN p.categoryId=? THEN 'ACCESSORY' ELSE 'LAPTOP' END)!='LAPTOP' AND p.slug IN (SELECT value FROM json_each(?)) LIMIT 1").bind(accessoryRoot?.id || '', JSON.stringify(slugs)).first<{slug:string}>() : null;
    if (collision) throw new MediaError('Đường dẫn danh mục trùng sản phẩm phụ kiện đã xuất bản: ' + collision.slug, 409);
  }
  for (const c of d.categories.filter(c => !c.parentId)) {
    const page = await db.prepare("SELECT p.id FROM Page p LEFT JOIN PageStudio s ON s.pageId=p.id WHERE p.deletedAt IS NULL AND (p.slug=? OR json_extract(s.draft,'$.slug')=? OR json_extract(s.published,'$.slug')=?)").bind(c.slug,c.slug,c.slug).first();
    if (page) throw new MediaError('Slug phân loại trùng trang CMS: ' + c.slug,409);
  }
  
  // Preserve every existing identity, including categories referenced by older products.
  const existing = await categoryRows(db);
  if (existing.some(c => !d.categories.some(x => x.id === c.id))) throw new MediaError('Không xóa danh mục đã có. Hãy ẩn danh mục để giữ liên kết sản phẩm.');
  
  for (const id of referencedProducts(d)) {
    const p = await db.prepare('SELECT status FROM Product WHERE id=? AND deletedAt IS NULL').bind(id).first<{status:string}>();
    if (!p || (action === 'publish' && !['ACTIVE','active'].includes(p.status))) throw new MediaError('Sản phẩm tham chiếu không tồn tại hoặc chưa xuất bản.');
  }

  for (const c of d.categories.filter(c => c.assetId)) {
    const a = await getAsset(db,c.assetId);
    if (a.kind !== 'IMAGE' || a.state !== 'READY' || !a.storageKey) throw new MediaError('Chọn ảnh sẵn sàng trong Thư viện.');
    if (action === 'publish' && (!c.alt.trim() || !await env.PRODUCT_MEDIA.head(a.storageKey))) throw new MediaError('Ảnh danh mục cần ALT và tệp tồn tại trong R2.');
  }

  const revision = expectedRevision+1, snapshot = JSON.stringify(d);
  const statements = [
    db.prepare("INSERT OR IGNORE INTO NavigationStudio(id,draft) VALUES('site',?)").bind(snapshot),
    db.prepare('INSERT INTO NavigationRevision(revision,document,action,actor) VALUES(?,?,?,?)').bind(revision,snapshot,action,adminActor()),
    db.prepare("UPDATE NavigationStudio SET draft=?,revision=?,published=CASE WHEN ?='publish' THEN ? ELSE published END,publishedRevision=CASE WHEN ?='publish' THEN ? ELSE publishedRevision END,updatedAt=CURRENT_TIMESTAMP WHERE id='site'").bind(snapshot,revision,action,snapshot,action,revision),
  ];

  for (const assetId of new Set(d.categories.map(c => c.assetId).filter(Boolean))) {
    statements.push(db.prepare("INSERT INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES(?,?,'NAVIGATION_REVISION','site',?)").bind(crypto.randomUUID(),assetId,`${revision}:${assetId}`));
  }

  if (action === 'publish') {
    const previous = (await navigationSnapshot(db))?.document;
    for (const old of previous?.categories.filter(c => c.visible) || []) {
      const next = d.categories.find(c => c.id === old.id && c.visible);
      if (!next) continue;
      const source = categoryHref(old, previous!.categories), target = categoryHref(next, d.categories);
      if (source === target) continue;
      const occupied = d.categories.some(c => c.visible && categoryHref(c,d.categories) === source);
      if (occupied) throw new MediaError('Đường dẫn cũ đang thuộc phân loại khác: ' + source,409);
      // Returning to an earlier slug retires its redirect before reversing the edge.
      statements.push(db.prepare('UPDATE CmsRedirect SET enabled=0,revision=revision+1 WHERE source=? AND target=?').bind(target,source));
      statements.push(db.prepare('UPDATE CmsRedirect SET target=?,revision=revision+1 WHERE target IN (?,?) AND source!=?').bind(target,source,'/phan-loai'+source,target));
      statements.push(db.prepare("INSERT INTO CmsRedirect(id,source,target,note) VALUES(?,?,?,'Category path changed') ON CONFLICT(source) DO UPDATE SET target=excluded.target,enabled=1,revision=CmsRedirect.revision+1").bind(crypto.randomUUID(),source,target));
      for (const legacy of ['/category/'+old.slug, '/phan-loai'+source]) {
        statements.push(db.prepare("INSERT INTO CmsRedirect(id,source,target,note) VALUES(?,?,?,'Category legacy URL') ON CONFLICT(source) DO UPDATE SET target=excluded.target,enabled=1,revision=CmsRedirect.revision+1").bind(crypto.randomUUID(),legacy,target));
      }
    }
    // Insert/update identities first, then parents so array order does not affect FK checks.
    for (const [i,c] of d.categories.entries()) {
      statements.push(db.prepare(`INSERT INTO Category(id,name,slug,description,image,sortOrder,status,updatedAt) VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,description=excluded.description,image=excluded.image,sortOrder=excluded.sortOrder,status=excluded.status,updatedAt=CURRENT_TIMESTAMP`).bind(c.id,c.name,c.slug,c.description,c.assetId ? '/api/library/'+c.assetId : c.image || null,i,c.visible?'ACTIVE':'INACTIVE'));
    }
    for (const c of d.categories) {
      statements.push(db.prepare('UPDATE Category SET parentId=? WHERE id=?').bind(c.parentId,c.id));
    }
  }

  try {
    await cmsMutationBatch(db, [...statements, ...adminAuditStatements(db, 'navigation.' + action, 'site', 'CMS mutation',null,'order',{before:expectedRevision,after:revision})]);
  } catch (e) {
    if (e instanceof Error && /NAVIGATION_CONFLICT|UNIQUE constraint|MEDIA_NOT_READY|REDIRECT_CHAIN/.test(e.message)) {
      throw new MediaError('Xung đột phiên bản, tên, slug hoặc ảnh. Tải lại trước khi lưu.',409);
    }
    throw e;
  }
  return navigationDetail(db);
}

export async function resolveNavigation(db: D1Database, d: NavigationDocument, revision: number): Promise<ResolvedNavigation> {
  const categories = d.categories.filter(c => c.visible).map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    parentId: c.parentId,
    image: c.assetId ? '/api/library/'+c.assetId : c.image || null,
    alt: c.alt,
    href: categoryHref(c, d.categories)
  }));

  const collections = d.collections.filter(c => c.visible).map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image || undefined,
    href: '/collection/' + c.slug,
    mode: c.mode,
  }));

  const products = new Map<string, string>();
  const menuProducts = new Set(Object.values(d.menus).flatMap(items => items.flatMap(i => [i, ...i.children])).flatMap(i => i.target.kind === 'product' ? [i.target.id] : []));
  const ids = [...menuProducts];
  for (let offset = 0; offset < ids.length; offset += 80) {
    const chunk = ids.slice(offset, offset + 80);
    const rows = await db.prepare(`SELECT p.id,COALESCE(json_extract(s.published,'$.slug'),p.slug) slug,CASE WHEN COALESCE(json_extract(s.published,'$.template'),CASE WHEN p.categoryId='cat-phu-kien' THEN 'ACCESSORY' ELSE 'LAPTOP' END)='LAPTOP' THEN '/laptop/' ELSE '/phu-kien/' END prefix FROM Product p LEFT JOIN ProductStudio s ON s.productId=p.id WHERE p.id IN (${chunk.map(() => '?').join(',')}) AND p.deletedAt IS NULL AND p.status IN ('ACTIVE','active') AND (s.productId IS NULL OR s.published IS NOT NULL)`)
      .bind(...chunk).all<{ id: string; slug: string; prefix: string }>();
    for (const { id, slug, prefix } of rows.results) products.set(id, prefix + slug);
  }

  const href = (t: NavigationTarget): string | undefined => {
    if (t.kind === 'path') {
      const index = t.path.search(/[?#]/), path = index < 0 ? t.path : t.path.slice(0,index);
      return (canonicalCategoryPath(path, categories) || path) + (index < 0 ? '' : t.path.slice(index));
    }
    if (t.kind === 'category') return categories.find(c => c.id === t.id)?.href;
    if (t.kind === 'collection') return collections.find(c => c.id === t.id)?.href;
    if (t.kind === 'product') return products.get(t.id);
    if (t.kind === 'brand') return '/brand/' + t.id;
    if (t.kind === 'landing') return '/landing/' + t.id;
    if (t.kind === 'page') return '/' + t.id;
    if (t.kind === 'external') return t.url;
    return undefined;
  };

  const menu = (items: NavigationDocument['menus']['main']) =>
    items.flatMap(i => {
      const url = href(i.target);
      return url ? [{
        id: i.id,
        label: i.label,
        href: url,
        children: i.children.flatMap(c => {
          const childUrl = href(c.target);
          return childUrl ? [{ id: c.id, label: c.label, href: childUrl }] : [];
        })
      }] : [];
    });


  return {
    schemaVersion: 1,
    revision,
    categories,
    collections,
    menus: {
      main: menu(d.menus.main),
      footer: menu(d.menus.footer)
    }
  };
}

export async function publicNavigation(db: D1Database) {
  const snapshot = await navigationSnapshot(db);
  if (!snapshot) throw new MediaError('Chưa xuất bản điều hướng.', 404);
  return resolveNavigation(db, snapshot.document, snapshot.revision);
}

export async function publicCollection(db: D1Database, slugOrId: string, pricingContext?:PriceEvaluationContext, at:Date = new Date()) {
  const snapshot = await navigationSnapshot(db);
  const d = snapshot?.document;
  const c = d?.collections.find(c => (c.slug === slugOrId || c.id === slugOrId) && c.visible);
  if (!c) throw new MediaError('Không tìm thấy bộ sưu tập.', 404);

  let products: HomepageProduct[] = [];
  const context = pricingContext || await getStorefrontPricingContext(db, at);
  if (c.mode === 'rule' && c.rule) {
    products = await resolveProductsByCriteria(c.rule, getPrismaClient(db), context, at);
  } else {
    products = await resolveProductsByIds(c.productIds || [], getPrismaClient(db), context, at);
  }

  return {
    schemaVersion: 1,
    revision: snapshot!.revision,
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image || null,
    seo: c.seo ? structuredClone(c.seo) : null,
    mode: c.mode || 'manual',
    products,
  };
}

export async function publicCollectionList(db: D1Database) {
  const d = (await navigationSnapshot(db))?.document;
  if (!d) return [];

  const visibleCollections = d.collections.filter(c => c.visible);
  const at = new Date();
  const context = await getStorefrontPricingContext(db, at);
  return Promise.all(
    visibleCollections.map(async (c) => {
      let productCount = (c.productIds || []).length;
      if (c.mode === 'rule' && c.rule) {
        const matched = await resolveProductsByCriteria(c.rule, getPrismaClient(db), context, at);
        productCount = matched.length;
      }
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image || null,
        href: '/collection/' + c.slug,
        mode: c.mode || 'manual',
        productCount,
      };
    })
  );
}

export async function publicCategories(db: D1Database) {
  const rows = (await categoryRows(db)).filter(c => c.status === 'ACTIVE');
  const counts = (await db.prepare("SELECT categoryId,count(*) AS count FROM Product WHERE deletedAt IS NULL AND status IN ('ACTIVE','active') GROUP BY categoryId").all<{categoryId:string;count:number}>()).results;
  return rows.map(c => ({
    ...c,
    parent: rows.find(p => p.id === c.parentId) || null,
    subCategories: rows.filter(p => p.parentId === c.id),
    _count: { products: counts.find(p => p.categoryId === c.id)?.count || 0 }
  }));
}
