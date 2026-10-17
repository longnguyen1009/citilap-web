import { cmsMutationBatch } from '../cms-schedule-context';
import { adminActor, adminAuditStatements } from '../admin-context';
import type { D1Database } from '@cloudflare/workers-types';
import { blankProduct, studioWriteSchema, type ProductDocument } from '../../contracts/cms/product-studio';
import { sanitizeHtml } from '../../lib/sanitize-html';
import { MediaError, mediaDetail, getAsset, type MediaEnvironment } from './media-library.service';

export type ProductKind = 'LAPTOP' | 'ACCESSORY' | 'MOUSE' | 'TECH' | 'OTHER';

export interface CatalogListOptions {
  q?: string;
  kind?: string;
  categoryId?: string;
  brand?: string;
  publicationStatus?: 'ALL' | 'PUBLISHED' | 'DRAFT' | 'UNPUBLISHED';
  availability?: 'ALL' | 'AVAILABLE' | 'PREORDER' | 'CONTACT' | 'UNAVAILABLE';
  minPrice?: number | null;
  maxPrice?: number | null;
  page?: number;
  limit?: number;
  sort?: 'updatedAt' | 'name' | 'price' | 'status';
  order?: 'asc' | 'desc';
}

export interface CatalogItem {
  id: string;
  name: string;
  publicName: string;
  slug: string;
  price: number;
  publicPrice: number;
  originalPrice: number | null;
  productStatus: string;
  revision: number;
  isPublished: boolean;
  isDraftOnly: boolean;
  hasUnpublishedDraft: boolean;
  availability: string;
  kind: ProductKind;
  category: { id: string; name: string; slug?: string } | null;
  brand: string;
  brandId?: string | null;
  condition?: string;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  image: string;
  updatedAt: string;
  hasStudio: boolean;
}

export interface CatalogListResult {
  items: CatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: { id: string; name: string; slug: string }[];
  brands: { id: string; name: string }[];
}

type Studio = { productId: string; revision: number; draft: string; published: string | null };

function parseSpecMetrics(specs: Record<string, string>) {
  let ramGb: number | null = null;
  const ramMatch = (specs.RAM || specs.ram || '').match(/(\d+)\s*(?:GB|G)/i);
  if (ramMatch) ramGb = parseInt(ramMatch[1], 10);

  let storageGb: number | null = null;
  const tbMatch = (specs.SSD || specs['Ổ cứng'] || specs.storage || '').match(/(\d+)\s*(?:TB|T)/i);
  if (tbMatch) {
    storageGb = parseInt(tbMatch[1], 10) * 1024;
  } else {
    const gbMatch = (specs.SSD || specs['Ổ cứng'] || specs.storage || '').match(/(\d+)\s*(?:GB|G)/i);
    if (gbMatch) storageGb = parseInt(gbMatch[1], 10);
  }

  let screenSize: number | null = null;
  let refreshRate: number | null = null;
  const displayStr = specs['Màn hình'] || specs.display || '';
  const sizeMatch = displayStr.match(/(\d+(?:\.\d+)?)\s*(?:inch|"|'')/i);
  if (sizeMatch) screenSize = parseFloat(sizeMatch[1]);
  const hzMatch = displayStr.match(/(\d+)\s*Hz/i);
  if (hzMatch) refreshRate = parseInt(hzMatch[1], 10);

  return { ramGb, storageGb, screenSize, refreshRate };
}

/**
 * Server-paginated, multi-filter catalog query.
 * Replaces hardcoded LIMIT 100 with scalable, index-friendly pagination and stable tie-breaker.
 */
export async function catalogList(db: D1Database, opts: CatalogListOptions = {}): Promise<CatalogListResult> {
  const page = Math.max(1, Math.floor(Number(opts.page) || 1));
  const limit = Math.min(100, Math.max(1, Math.floor(Number(opts.limit) || 20)));
  const offset = (page - 1) * limit;
  const q = String(opts.q || '').trim().slice(0, 200);
  const kind = String(opts.kind || 'ALL').toUpperCase();
  const categoryId = String(opts.categoryId || '').trim();
  const brand = String(opts.brand || '').trim();
  const publicationStatus = String(opts.publicationStatus || 'ALL').toUpperCase();
  const availability = String(opts.availability || 'ALL').toUpperCase();
  const minPrice = opts.minPrice != null && Number.isFinite(opts.minPrice) ? Number(opts.minPrice) : null;
  const maxPrice = opts.maxPrice != null && Number.isFinite(opts.maxPrice) ? Number(opts.maxPrice) : null;

  const whereClauses: string[] = ['p.deletedAt IS NULL'];
  const params: (string | number)[] = [];

  // Search filter (name, slug, id, model, draft name, or variant SKU)
  if (q) {
    whereClauses.push(`(
      instr(lower(p.name), lower(?)) > 0
      OR instr(lower(p.slug), lower(?)) > 0
      OR p.id = ?
      OR instr(lower(COALESCE(p.model, '')), lower(?)) > 0
      OR instr(lower(COALESCE(json_extract(s.draft, '$.name'), '')), lower(?)) > 0
      OR EXISTS (SELECT 1 FROM ProductVariant pv WHERE pv.productId = p.id AND instr(lower(pv.sku), lower(?)) > 0)
    )`);
    params.push(q, q, q, q, q, q);
  }

  // Kind filter: LAPTOP vs ACCESSORY vs ALL
  if (kind === 'LAPTOP') {
    whereClauses.push(`(
      json_extract(s.draft, '$.template') = 'LAPTOP'
      OR (s.draft IS NULL AND (
        p.cpu IS NOT NULL
        OR p.categoryId IN ('cat-gaming', 'cat-van-phong', 'cat-do-hoa', 'cat-macbook', 'cat-like-new')
        OR instr(lower(COALESCE(c.name, '')), 'laptop') > 0
      ))
    )`);
  } else if (kind === 'ACCESSORY') {
    whereClauses.push(`(
      json_extract(s.draft, '$.template') IN ('ACCESSORY', 'MOUSE', 'TECH')
      OR (s.draft IS NULL AND (
        p.categoryId = 'cat-phu-kien'
        OR c.slug IN ('linh-kien', 'phu-kien', 'chuot-gaming', 'ban-phim-co')
        OR instr(lower(COALESCE(c.name, '')), 'phụ kiện') > 0
        OR instr(lower(COALESCE(c.name, '')), 'linh kiện') > 0
      ))
    )`);
  }

  // Category filter
  if (categoryId) {
    whereClauses.push('p.categoryId = ?');
    params.push(categoryId);
  }

  // Brand filter
  if (brand) {
    whereClauses.push('(lower(p.brand) = lower(?) OR lower(COALESCE(json_extract(s.draft, "$.brand"), "")) = lower(?))');
    params.push(brand, brand);
  }

  // Publication status filter
  if (publicationStatus === 'PUBLISHED') {
    whereClauses.push(`((s.published IS NOT NULL AND p.status IN ('ACTIVE', 'active')) OR (s.productId IS NULL AND p.status IN ('ACTIVE', 'active')))`);
  } else if (publicationStatus === 'DRAFT') {
    whereClauses.push(`((s.draft IS NOT NULL AND s.published IS NULL) OR (s.productId IS NULL AND p.status IN ('DRAFT', 'draft')))`);
  } else if (publicationStatus === 'UNPUBLISHED') {
    whereClauses.push(`((s.draft IS NOT NULL AND s.published IS NULL AND p.status IN ('DRAFT', 'draft')) OR p.status IN ('ARCHIVED', 'archived', 'INACTIVE', 'inactive'))`);
  } else if (publicationStatus === 'ARCHIVED') {
    whereClauses.push(`p.status IN ('ARCHIVED', 'archived')`);
  }

  // Availability filter (e.g. AVAILABLE, PREORDER, CONTACT, UNAVAILABLE)
  if (availability && availability !== 'ALL') {
    whereClauses.push(`(
      COALESCE(json_extract(s.published, '$.availability'), json_extract(s.draft, '$.availability')) = ?
      OR (s.draft IS NULL AND ? = 'AVAILABLE' AND p.status IN ('ACTIVE', 'active'))
    )`);
    params.push(availability, availability);
  }

  // Price range filters
  if (minPrice !== null) {
    whereClauses.push('COALESCE(json_extract(s.draft, "$.price"), p.price) >= ?');
    params.push(minPrice);
  }
  if (maxPrice !== null) {
    whereClauses.push('COALESCE(json_extract(s.draft, "$.price"), p.price) <= ?');
    params.push(maxPrice);
  }

  const whereSql = whereClauses.join(' AND ');

  // Allowlist sort with tie-breaker
  const sortCol = opts.sort === 'name' ? 'p.name' : opts.sort === 'price' ? 'p.price' : opts.sort === 'status' ? 'p.status' : 'p.updatedAt';
  const sortOrder = opts.order === 'asc' ? 'ASC' : 'DESC';
  const orderSql = `ORDER BY ${sortCol} ${sortOrder}, p.id DESC`;

  // 1. Total count query
  const countSql = `SELECT count(*) AS total FROM Product p LEFT JOIN ProductStudio s ON s.productId = p.id LEFT JOIN Category c ON c.id = p.categoryId WHERE ${whereSql}`;
  const countStmt = db.prepare(countSql);
  const countRow = await (params.length ? countStmt.bind(...params) : countStmt).first<{ total: number }>();
  const total = countRow?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // 2. Rows query
  const itemsSql = `
    SELECT
      p.id,
      p.name,
      p.slug,
      p.price,
      p.originalPrice,
      p.status AS productStatus,
      p.images,
      p.brand,
      p.brandId,
      p.condition,
      p.isNewArrival,
      p.isBestSeller,
      p.isFeatured,
      p.isFlashSale,
      p.cpu,
      p.categoryId,
      c.name AS categoryName,
      c.slug AS categorySlug,
      s.productId AS studioId,
      s.revision,
      s.draft,
      s.published,
      p.updatedAt,
      json_extract(s.draft, '$.template') AS draftTemplate,
      json_extract(s.draft, '$.name') AS draftName,
      json_extract(s.draft, '$.price') AS draftPrice,
      json_extract(s.draft, '$.availability') AS draftAvailability,
      json_extract(s.published, '$.availability') AS publishedAvailability
    FROM Product p
    LEFT JOIN ProductStudio s ON s.productId = p.id
    LEFT JOIN Category c ON c.id = p.categoryId
    WHERE ${whereSql}
    ${orderSql}
    LIMIT ? OFFSET ?
  `;
  const itemsStmt = db.prepare(itemsSql);
  const itemsParams = [...params, limit, offset];
  const itemsRows = await itemsStmt.bind(...itemsParams).all<Record<string, unknown>>();

  // 3. Populate categories & brands for filter selectors
  const categoriesRes = await db.prepare("SELECT id, name, slug FROM Category WHERE status='ACTIVE' ORDER BY sortOrder, name").all<{ id: string; name: string; slug: string }>();
  const brandsRes = await db.prepare("SELECT DISTINCT COALESCE(b.name, p.brand) AS name, COALESCE(b.id, p.brand) AS id FROM Product p LEFT JOIN Brand b ON b.id = p.brandId WHERE p.deletedAt IS NULL AND (p.brand IS NOT NULL OR b.name IS NOT NULL) ORDER BY name").all<{ id: string; name: string }>();

  const items: CatalogItem[] = (itemsRows.results || []).map((r: Record<string, unknown>) => {
    const isPublished = (!!r.published && ['ACTIVE', 'active'].includes(String(r.productStatus))) || (r.studioId == null && ['ACTIVE', 'active'].includes(String(r.productStatus)));
    const isDraftOnly = r.published == null && r.draft != null;
    const hasUnpublishedDraft = !!r.published && !!r.draft && r.draft !== r.published;

    const draftTemplate = String(r.draftTemplate || '');
    const categoryId = String(r.categoryId || '');
    const categoryName = String(r.categoryName || '');
    const categorySlug = String(r.categorySlug || '');

    let resolvedKind: ProductKind = 'OTHER';
    if (draftTemplate === 'LAPTOP') resolvedKind = 'LAPTOP';
    else if (['ACCESSORY', 'MOUSE', 'KEYBOARD', 'HEADPHONE', 'CHARGER', 'HUB', 'BAG', 'MONITOR', 'TECH'].includes(draftTemplate)) resolvedKind = 'ACCESSORY';
    else if (r.cpu || ['cat-gaming', 'cat-van-phong', 'cat-do-hoa', 'cat-macbook', 'cat-like-new'].includes(categoryId) || (categoryName && /laptop/i.test(categoryName))) resolvedKind = 'LAPTOP';
    else if (categoryId === 'cat-phu-kien' || ['linh-kien', 'phu-kien'].includes(categorySlug) || (categoryName && /phụ kiện|linh kiện/i.test(categoryName))) resolvedKind = 'ACCESSORY';
    else resolvedKind = 'LAPTOP';

    let image = 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=200';
    try {
      const parsed = JSON.parse(String(r.images || '[]'));
      if (Array.isArray(parsed) && parsed[0]) image = parsed[0];
    } catch {
      if (typeof r.images === 'string' && r.images.startsWith('http')) image = r.images;
    }

    return {
      id: String(r.id),
      name: String(r.draftName || r.name),
      publicName: String(r.name),
      slug: String(r.slug),
      price: Number(r.draftPrice ?? r.price),
      publicPrice: Number(r.price),
      originalPrice: r.originalPrice == null ? null : Number(r.originalPrice),
      productStatus: String(r.productStatus),
      revision: Number(r.revision ?? 0),
      isPublished,
      isDraftOnly,
      hasUnpublishedDraft,
      availability: String(r.publishedAvailability || r.draftAvailability || (isPublished ? 'AVAILABLE' : 'CONTACT')),
      kind: resolvedKind,
      category: r.categoryName ? { id: String(r.categoryId), name: String(r.categoryName), slug: String(r.categorySlug || '') } : null,
      brand: String(r.brand || ''),
      brandId: r.brandId ? String(r.brandId) : null,
      condition: String(r.condition || 'NEW'),
      isNewArrival: !!r.isNewArrival,
      isBestSeller: !!r.isBestSeller,
      isFeatured: !!r.isFeatured,
      isFlashSale: !!r.isFlashSale,
      image,
      updatedAt: String(r.updatedAt),
      hasStudio: r.studioId != null,
    };
  });

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    categories: categoriesRes.results || [],
    brands: (brandsRes.results || []).filter(b => !!b.name),
  };
}

/**
 * Backward compatibility wrapper for studioList.
 */
export async function studioList(db: D1Database, q = '') {
  const res = await catalogList(db, { q, limit: 100 });
  return {
    items: res.items.map(it => ({
      id: it.id,
      name: it.publicName,
      draftName: it.name,
      status: it.isPublished ? 'ACTIVE' : 'DRAFT',
      revision: it.revision,
    })),
    categories: res.categories,
  };
}

/**
 * Retrieves editorial detail for a product.
 * Adopts legacy products into standard ProductDocument on-read without mutating DB.
 */
export async function studioDetail(db: D1Database, id: string) {
  const row = await db.prepare('SELECT * FROM ProductStudio WHERE productId=?').bind(id).first<Studio>();
  if (row) {
    const document = JSON.parse(row.draft) as ProductDocument;
    if (document.isFlashSale === undefined) {
      document.isFlashSale = false;
    }
    return { id, revision: row.revision, document, published: !!row.published };
  }

  const p = await db.prepare('SELECT * FROM Product WHERE id=? AND deletedAt IS NULL').bind(id).first<Record<string, unknown>>();
  if (!p) throw new MediaError('Không tìm thấy sản phẩm.', 404);

  const d = blankProduct();
  for (const k of ['name', 'slug', 'categoryId', 'brand', 'description', 'contentHtml', 'seoTitle', 'seoDescription'] as const) {
    d[k] = String(p[k] || '');
  }
  d.price = Number(p.price);
  d.originalPrice = p.originalPrice == null ? null : Number(p.originalPrice);

  // Determine template from category or specs
  if (p.categoryId === 'cat-phu-kien') {
    d.template = 'ACCESSORY';
  } else {
    d.template = 'LAPTOP';
  }

  // Parse specs
  try {
    const rawSpecs = JSON.parse(String(p.specs || '{}'));
    if (rawSpecs && typeof rawSpecs === 'object' && !Array.isArray(rawSpecs)) {
      d.specs = Object.entries(rawSpecs).map(([key, value]) => ({ key, value: String(value) }));
    }
  } catch {
    // If specs wasn't JSON, extract from column fields
    const specEntries: { key: string; value: string }[] = [];
    if (p.cpu) specEntries.push({ key: 'CPU', value: String(p.cpu) });
    if (p.gpu) specEntries.push({ key: 'GPU', value: String(p.gpu) });
    if (p.ram) specEntries.push({ key: 'RAM', value: String(p.ram) });
    if (p.storage) specEntries.push({ key: 'SSD', value: String(p.storage) });
    if (p.display) specEntries.push({ key: 'Màn hình', value: String(p.display) });
    if (specEntries.length > 0) d.specs = specEntries;
  }

  const isLegacyActive = ['ACTIVE', 'active'].includes(String(p.status));
  d.availability = isLegacyActive ? 'AVAILABLE' : 'CONTACT';
  d.brandId = p.brandId ? String(p.brandId) : null;
  d.condition = (p.condition as ProductDocument['condition']) || 'NEW';
  d.isNewArrival = !!p.isNewArrival;
  d.isBestSeller = !!p.isBestSeller;
  d.isFeatured = !!p.isFeatured;
  d.isFlashSale = !!p.isFlashSale;

  // Variants
  const variants = await db.prepare("SELECT * FROM ProductVariant WHERE productId=? AND status='ACTIVE'").bind(id).all<Record<string, unknown>>();
  if (variants.results.length > 0) {
    d.variants = variants.results.map(v => {
      let optionsObj: Record<string, string> = {};
      if (typeof v.options === 'string' && v.options.startsWith('{')) {
        try { optionsObj = JSON.parse(v.options); } catch { optionsObj = {}; }
      }
      return {
        id: String(v.id),
        sku: String(v.sku),
        name: String(v.name),
        price: Number(v.price),
        condition: 'NEW',
        originalPrice: v.originalPrice != null ? Number(v.originalPrice) : null,
        availability: 'AVAILABLE',
        ram: String(v.ram || ''),
        storage: String(v.storage || ''),
        gpu: String(v.gpu || ''),
        options: optionsObj,
        image: '',
      };
    });
  } else {
    d.variants = [{
      id: crypto.randomUUID(),
      name: 'Tiêu chuẩn',
      sku: String(p.slug || id).toUpperCase().slice(0, 50),
      condition: 'NEW',
      price: d.price,
      originalPrice: null,
      availability: 'AVAILABLE',
      ram: '',
      storage: '',
      gpu: '',
      options: {},
      image: '',
    }];
  }

  // Media
  const media = await db.prepare("SELECT DISTINCT a.id, a.alt FROM MediaUsage u JOIN MediaAsset a ON a.id=u.assetId WHERE u.ownerType='PRODUCT' AND u.ownerId=? AND a.state='READY'").bind(id).all<{ id: string; alt: string }>();
  d.media = media.results.map(a => ({ assetId: a.id, alt: a.alt || '', variantId: '' }));

  return { id, revision: 0, document: d, published: isLegacyActive };
}

/**
 * Standardized single authoring writer.
 * Handles concurrency, asset validation, atomic SQL projection, and legacy product adoption.
 * Critical invariant: first draft save of a legacy active product does NOT unpublish or hide it from the website!
 */
export async function writeStudio(env: MediaEnvironment, id: string | null, input: unknown) {
  const { expectedRevision, action, document: d } = studioWriteSchema.parse(input);
  d.contentHtml = sanitizeHtml(d.contentHtml);
  const db = env.DB;

  if (!await db.prepare("SELECT id FROM Category WHERE id=? AND status='ACTIVE'").bind(d.categoryId).first()) {
    throw new MediaError('Danh mục không tồn tại hoặc đã ẩn.');
  }

  const existing = id ? await studioDetail(db, id) : null;
  if ((existing?.revision ?? 0) !== expectedRevision) {
    throw new MediaError('Sản phẩm đã được sửa ở nơi khác. Tải lại trước khi lưu.', 409);
  }

  // Check if ProductStudio record already existed in DB
  const existingStudioRow = id
    ? await db.prepare('SELECT revision, published FROM ProductStudio WHERE productId=?').bind(id).first<{ revision: number; published: string | null }>()
    : null;

  const productId = id || crypto.randomUUID();
  const assets = [];
  for (const m of d.media) {
    const a = await getAsset(db, m.assetId);
    const detail = await mediaDetail(db, m.assetId);
    if (a.state !== 'READY' || !detail.asset.url) throw new MediaError('Tệp chưa sẵn sàng.');
    if (action === 'publish' && a.kind === 'IMAGE' && (!m.alt.trim() || !a.storageKey || !await env.PRODUCT_MEDIA.head(a.storageKey))) {
      throw new MediaError('Ảnh xuất bản cần mô tả alt và tệp tồn tại trong R2.');
    }
    assets.push({ ...a, url: detail.asset.url, ...m });
  }

  if (action === 'publish' && !assets.some(a => a.kind === 'IMAGE')) {
    throw new MediaError('Thêm ít nhất một ảnh trước khi xuất bản.');
  }

  d.contentHtml = sanitizeHtml(d.contentHtml || '');
  const version = expectedRevision + 1;
  const snapshot = JSON.stringify(d);
  const statements = [];

  if (!id) {
    statements.push(db.prepare("INSERT INTO Product(id,name,slug,description,price,categoryId,status,updatedAt) VALUES(?,?,?,'',0,?,'DRAFT',CURRENT_TIMESTAMP)").bind(productId, d.name, d.slug, d.categoryId));
  }

  // LEGACY ADOPTION GUARD:
  // If this product was a legacy ACTIVE product adopting into Studio for the first time:
  // Preserving initialPublishedSnapshot ensures that saving a draft does NOT unpublish the active item!
  const isFirstTimeLegacyActive = !existingStudioRow && id && existing?.published;
  const initialPublishedSnapshot = isFirstTimeLegacyActive ? JSON.stringify(existing.document) : null;

  statements.push(db.prepare('INSERT OR IGNORE INTO ProductStudio(productId,draft,published) VALUES(?,?,?)').bind(
    productId,
    snapshot,
    action === 'publish' ? snapshot : initialPublishedSnapshot
  ));
  statements.push(db.prepare('INSERT INTO ProductStudioRevision(productId,revision,document,action) VALUES(?,?,?,?)').bind(productId, version, snapshot, action));

  statements.push(db.prepare(`
    UPDATE ProductStudio
    SET draft = ?,
        revision = ?,
        published = CASE
          WHEN ? = 'publish' THEN ?
          WHEN ? = 'unpublish' THEN NULL
          ELSE published
        END,
        publishedRevision = CASE WHEN ?='publish' THEN ? WHEN ?='unpublish' THEN NULL ELSE publishedRevision END,
        updatedAt = CURRENT_TIMESTAMP
    WHERE productId = ?
  `).bind(snapshot, version, action, snapshot, action, action, version, action, productId));

  for (const a of assets) {
    statements.push(db.prepare("INSERT INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES(?,?,'PRODUCT_REVISION',?,?)").bind(crypto.randomUUID(), a.id, productId, `${version}:${a.id}`));
  }

  // Track MediaUsage for images embedded in rich content
  const htmlAssetMatches = [...(d.contentHtml || '').matchAll(/\/api\/media\/([a-f0-9-]{36})/gi)];
  const htmlAssetIds = [...new Set(htmlAssetMatches.map(m => m[1]))];
  for (const htmlAssetId of htmlAssetIds) {
    statements.push(db.prepare("INSERT INTO MediaUsage(id,assetId,ownerType,ownerId,slot) VALUES(?,?,'PRODUCT_CONTENT',?,?)").bind(crypto.randomUUID(), htmlAssetId, productId, `${version}:${htmlAssetId}`));
  }

  if (action === 'publish') {
    const specs = Object.fromEntries(d.specs.map(s => [s.key, s.value]));
    const { ramGb, storageGb, screenSize, refreshRate } = parseSpecMetrics(specs);

    statements.push(db.prepare(`
      UPDATE Product SET
        name = ?,
        slug = ?,
        description = ?,
        contentHtml = ?,
        brand = ?,
        brandId = ?,
        condition = ?,
        isNewArrival = ?,
        isBestSeller = ?,
        isFeatured = ?,
        isFlashSale = ?,
        categoryId = ?,
        price = ?,
        originalPrice = ?,
        seoTitle = ?,
        seoDescription = ?,
        images = ?,
        specs = ?,
        cpu = ?,
        gpu = ?,
        ram = ?,
        storage = ?,
        display = ?,
        ramGb = ?,
        storageGb = ?,
        screenSize = ?,
        refreshRate = ?,
        status = 'ACTIVE',
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      d.name, d.slug, d.description, d.contentHtml, d.brand, d.brandId || null,
      d.condition || 'NEW', d.isNewArrival ? 1 : 0, d.isBestSeller ? 1 : 0, d.isFeatured ? 1 : 0, d.isFlashSale ? 1 : 0,
      d.categoryId,
      d.price, d.originalPrice, d.seoTitle, d.seoDescription,
      JSON.stringify(assets.filter(a => a.kind === 'IMAGE').map(a => a.url)), JSON.stringify(specs),
      specs.CPU || null, specs.GPU || null, specs.RAM || null, specs.SSD || specs['Ổ cứng'] || null, specs['Màn hình'] || null,
      ramGb, storageGb, screenSize, refreshRate,
      productId
    ));

    statements.push(db.prepare("UPDATE ProductVariant SET status='INACTIVE' WHERE productId=?").bind(productId));
    for (const v of d.variants) {
      const owner = await db.prepare('SELECT productId FROM ProductVariant WHERE id=?').bind(v.id).first<{ productId: string }>();
      if (owner && owner.productId !== productId) throw new MediaError('Biến thể thuộc sản phẩm khác.', 409);
      statements.push(db.prepare(`
        INSERT INTO ProductVariant(id,productId,sku,name,options,price,originalPrice,status,ram,storage,gpu,updatedAt)
        VALUES(?,?,?,?,?,?,?,'ACTIVE',?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          sku = excluded.sku,
          name = excluded.name,
          options = excluded.options,
          price = excluded.price,
          originalPrice = excluded.originalPrice,
          status = 'ACTIVE',
          ram = excluded.ram,
          storage = excluded.storage,
          gpu = excluded.gpu,
          updatedAt = CURRENT_TIMESTAMP
      `).bind(
        v.id,
        productId,
        v.sku,
        v.name,
        JSON.stringify({ condition: v.condition, ...(v.options || {}) }),
        v.price,
        v.originalPrice ?? null,
        v.ram || null,
        v.storage || null,
        v.gpu || null
      ));
    }

    statements.push(db.prepare('DELETE FROM ProductImage WHERE productId=?').bind(productId));
    for (const [i, a] of assets.filter(a => a.kind === 'IMAGE').entries()) {
      statements.push(db.prepare('INSERT INTO ProductImage(id,productId,variantId,r2Key,url,alt,sortOrder,isPrimary) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(), productId, a.variantId || null, a.storageKey, a.url, a.alt, i, i === 0 ? 1 : 0));
    }
  }

  if (action === 'unpublish') {
    statements.push(db.prepare("UPDATE Product SET status='DRAFT',updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(productId));
  }

  statements.push(db.prepare('INSERT INTO ProductEditLog(id,productId,action,actorName,snapshot) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(), productId, `STUDIO_${action.toUpperCase()}`, adminActor(), snapshot));

  try {
    await cmsMutationBatch(db, [...statements, ...adminAuditStatements(db, 'product.' + action, productId, 'CMS mutation', null, 'order', { before: expectedRevision, after: version })]);
  } catch (e) {
    if (e instanceof Error && /STUDIO_CONFLICT|UNIQUE constraint|MEDIA_NOT_READY/.test(e.message)) {
      throw new MediaError('Xung đột phiên bản, slug, SKU hoặc trạng thái media. Tải lại và kiểm tra dữ liệu.', 409);
    }
    throw e;
  }

  return studioDetail(db, productId);
}

/**
 * Safely archives or soft-deletes a product without breaking historical order snapshots.
 */
export async function archiveProduct(db: D1Database, id: string) {
  const p = await db.prepare('SELECT id, status FROM Product WHERE id=? AND deletedAt IS NULL').bind(id).first<{ id: string; status: string }>();
  if (!p) throw new MediaError('Không tìm thấy sản phẩm.', 404);

  const orderCount = await db.prepare('SELECT count(*) AS cnt FROM OrderItem WHERE productId=?').bind(id).first<{ cnt: number }>();

  await db.batch([
    db.prepare("UPDATE Product SET status='ARCHIVED', updatedAt=CURRENT_TIMESTAMP WHERE id=?").bind(id),
    db.prepare("UPDATE ProductStudio SET published=NULL,publishedRevision=NULL, updatedAt=CURRENT_TIMESTAMP WHERE productId=?").bind(id),
    db.prepare("INSERT INTO ProductEditLog(id,productId,action,actorName) VALUES(?,?,'ARCHIVE',?)").bind(crypto.randomUUID(), id, adminActor()),
    ...adminAuditStatements(db, 'product.archive', id, 'Product archived'),
    db.prepare("UPDATE CmsSchedule SET state='CANCELLED',leaseUntil=NULL WHERE entityType='product' AND entityId=? AND state IN ('PENDING','RUNNING')").bind(id),
  ]);

  return { success: true, archived: true, id, orderReferenced: (orderCount?.cnt ?? 0) > 0 };
}

/**
 * Lists all revisions for a product (ProductStudioRevision + audit logs).
 */
export async function listProductRevisions(db: D1Database, productId: string) {
  const studio = await db.prepare('SELECT revision, published, draft FROM ProductStudio WHERE productId=?').bind(productId).first<{ revision: number; published: string | null; draft: string }>();
  
  const studioRevs = await db.prepare(`
    SELECT revision, action, createdAt, document
    FROM ProductStudioRevision
    WHERE productId=?
    ORDER BY revision DESC
  `).bind(productId).all<{ revision: number; action: string; createdAt: string; document: string }>();

  const logs = await db.prepare(`
    SELECT action, actorName, createdAt
    FROM ProductEditLog
    WHERE productId=?
    ORDER BY createdAt DESC
  `).bind(productId).all<{ action: string; actorName: string; createdAt: string }>();

  const currentRevision = studio?.revision ?? 0;
  const isPublished = !!studio?.published;

  const revisions = (studioRevs.results || []).map(r => {
    let summary = '';
    try {
      const doc = JSON.parse(r.document);
      summary = `${doc.name} · ${new Intl.NumberFormat('vi-VN').format(doc.price)}đ`;
    } catch {
      summary = 'Bản ghi revision';
    }
    const matchingLog = logs.results?.find(l => Math.abs(new Date(l.createdAt).getTime() - new Date(r.createdAt).getTime()) < 10000);
    return {
      revision: r.revision,
      action: r.action,
      createdAt: r.createdAt,
      actorName: matchingLog?.actorName || 'admin',
      summary,
      isCurrent: r.revision === currentRevision,
      isPublished: isPublished && r.revision === currentRevision,
      isLegacy: false,
    };
  });

  return {
    productId,
    currentRevision,
    isPublished,
    revisions,
  };
}

/**
 * Gets specific revision snapshot document.
 */
export async function getProductRevisionSnapshot(db: D1Database, productId: string, revision: number) {
  const rev = await db.prepare(`
    SELECT revision, action, createdAt, document
    FROM ProductStudioRevision
    WHERE productId=? AND revision=?
  `).bind(productId, revision).first<{ revision: number; action: string; createdAt: string; document: string }>();

  if (!rev) {
    throw new MediaError('Không tìm thấy phiên bản yêu cầu.', 404);
  }

  let doc: ProductDocument;
  try {
    doc = JSON.parse(rev.document) as ProductDocument;
  } catch {
    throw new MediaError('Dữ liệu phiên bản bị lỗi hoặc không hợp lệ.', 500);
  }

  return {
    productId,
    revision: rev.revision,
    action: rev.action,
    createdAt: rev.createdAt,
    document: doc,
  };
}

/**
 * Restores a past revision as a new draft revision.
 * INVARIANT: Does NOT overwrite the public published content!
 * Public content on website remains untouched until the operator explicitly clicks Publish!
 */
export async function restoreProductRevision(
  env: MediaEnvironment,
  productId: string,
  targetRevision: number,
  expectedRevision: number
) {
  const snapshot = await getProductRevisionSnapshot(env.DB, productId, targetRevision);
  
  // Canonical restore writes a new draft and its audit atomically; public stays unchanged.
  const writeResult = await writeStudio(env, productId, {
    expectedRevision,
    action: 'restore',
    document: snapshot.document,
  });

  return {
    success: true,
    message: `Đã khôi phục phiên bản #${targetRevision} thành bản nháp mới (rev #${writeResult.revision}). Nội dung trên website chưa thay đổi cho đến khi bạn xuất bản.`,
    restoredFromRevision: targetRevision,
    newRevision: writeResult.revision,
    document: snapshot.document,
  };
}

/**
 * Public DTO resolver: resolves strictly the published snapshot. Drafts never leave this boundary.
 */
export async function publicStudio(db: D1Database, slug: string) {
  const row = await db.prepare("SELECT s.published,s.revision FROM ProductStudio s JOIN Product p ON p.id=s.productId WHERE p.slug=? AND p.status='ACTIVE' AND p.deletedAt IS NULL AND s.published IS NOT NULL").bind(slug).first<{ published: string; revision: number }>();
  if (!row) throw new MediaError('Không tìm thấy sản phẩm đã xuất bản.', 404);
  const d = JSON.parse(row.published) as ProductDocument;
  const media = [];
  for (const m of d.media) {
    const { asset } = await mediaDetail(db, m.assetId);
    media.push({ url: asset.url, kind: asset.kind, alt: m.alt, variantId: m.variantId });
  }
  return { ...d, media, canOrder: ['AVAILABLE', 'PREORDER'].includes(d.availability) };
}
