import { adminAuditStatements } from '../admin-context';
import { resolveProductsByIds } from './catalog.service';
import { getPrismaClient } from '../../lib/prisma';
import { getStorefrontPricingContext, type PriceEvaluationContext } from './pricing.service';
import type { D1Database } from '@cloudflare/workers-types';
import { z } from 'zod';
import { MediaError, type MediaEnvironment } from './media-library.service';

export const brandSchema = z.object({
  name: z.string().trim().min(1, 'Tên thương hiệu không được để trống').max(100),
  slug: z.string().trim().min(1, 'Đường dẫn slug không được để trống').max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang'),
  logo: z.string().trim().nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  seoTitle: z.string().trim().max(200).nullable().optional(),
  seoDescription: z.string().trim().max(400).nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

export type BrandInput = z.infer<typeof brandSchema>;

export interface BrandDto {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BrandListOptions {
  q?: string;
  status?: string; // 'ALL' | 'ACTIVE' | 'INACTIVE'
  page?: number;
  limit?: number;
}

function normalizeBrandLogo(logo: unknown): string | null {
  if (!logo) return null;
  const s = String(logo).trim();
  if (!s) return null;
  if (s.startsWith('/') || s.startsWith('http://') || s.startsWith('https://')) return s;
  return `/${s}`;
}

/**
 * List brands with product count from Cloudflare D1.
 */
export async function listBrands(
  db: D1Database,
  options: BrandListOptions = {}
): Promise<{ items: BrandDto[]; total: number }> {
  const q = (options.q || '').trim().toLowerCase();
  const status = options.status || 'ALL';

  const whereClauses: string[] = ['b.deletedAt IS NULL'];
  const params: unknown[] = [];

  if (q) {
    whereClauses.push('(lower(b.name) LIKE ? OR lower(b.slug) LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }

  if (status !== 'ALL') {
    whereClauses.push('b.status = ?');
    params.push(status);
  }

  const whereSql = whereClauses.join(' AND ');

  const sql = `
    SELECT
      b.id,
      b.name,
      b.slug,
      b.logo,
      b.description,
      COALESCE(b.seoTitle, '') AS seoTitle,
      COALESCE(b.seoDescription, '') AS seoDescription,
      b.status,
      b.createdAt,
      b.updatedAt,
      count(p.id) AS productCount
    FROM Brand b
    LEFT JOIN Product p ON p.brandId = b.id AND p.deletedAt IS NULL
    WHERE ${whereSql}
    GROUP BY b.id
    ORDER BY b.name ASC
  `;

  const stmt = db.prepare(sql);
  const rows = await (params.length ? stmt.bind(...params) : stmt).all<Record<string, unknown>>();

  const items: BrandDto[] = (rows.results || []).map((r: Record<string, unknown>) => ({
    id: String(r.id),
    name: String(r.name),
    slug: String(r.slug),
    logo: normalizeBrandLogo(r.logo),
    description: r.description ? String(r.description) : null,
    seoTitle: r.seoTitle ? String(r.seoTitle) : null,
    seoDescription: r.seoDescription ? String(r.seoDescription) : null,
    status: (r.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
    productCount: Number(r.productCount || 0),
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt),
  }));

  return {
    items,
    total: items.length,
  };
}

/**
 * Get brand detail by ID or Slug.
 */
export async function getBrandDetail(db: D1Database, idOrSlug: string): Promise<BrandDto | null> {
  const row = await db.prepare(`
    SELECT
      b.id,
      b.name,
      b.slug,
      b.logo,
      b.description,
      COALESCE(b.seoTitle, '') AS seoTitle,
      COALESCE(b.seoDescription, '') AS seoDescription,
      b.status,
      b.createdAt,
      b.updatedAt,
      count(p.id) AS productCount
    FROM Brand b
    LEFT JOIN Product p ON p.brandId = b.id AND p.deletedAt IS NULL
    WHERE (b.id = ? OR b.slug = ?) AND b.deletedAt IS NULL
    GROUP BY b.id
  `).bind(idOrSlug, idOrSlug).first<Record<string, unknown>>();

  if (!row) return null;

  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    logo: normalizeBrandLogo(row.logo),
    description: row.description ? String(row.description) : null,
    seoTitle: row.seoTitle ? String(row.seoTitle) : null,
    seoDescription: row.seoDescription ? String(row.seoDescription) : null,
    status: (row.status as 'ACTIVE' | 'INACTIVE') || 'ACTIVE',
    productCount: Number(row.productCount || 0),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

/**
 * Canonical writer for creating or updating Brand.
 */
export async function writeBrand(
  env: MediaEnvironment,
  id: string | null,
  input: unknown
): Promise<BrandDto> {
  const parsed = brandSchema.parse(input);
  const db = env.DB;

  // Check unique name and slug
  const conflict = await db.prepare(`
    SELECT id, name, slug FROM Brand
    WHERE (lower(name) = lower(?) OR lower(slug) = lower(?))
      AND id != ?
      AND deletedAt IS NULL
  `).bind(parsed.name, parsed.slug, id || '').first<{ id: string; name: string; slug: string }>();

  if (conflict) {
    if (conflict.name.toLowerCase() === parsed.name.toLowerCase()) {
      throw new MediaError(`Tên thương hiệu "${parsed.name}" đã tồn tại. Vui lòng chọn tên khác.`, 409);
    }
    throw new MediaError(`Đường dẫn slug "${parsed.slug}" đã tồn tại. Vui lòng chọn slug khác.`, 409);
  }

  const brandId = id || crypto.randomUUID();

  const guard = crypto.randomUUID();
  const statements = id ? [db.prepare('INSERT INTO AdminMutationGuard(id,allowed) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM Brand WHERE id=? AND deletedAt IS NULL) THEN 1 ELSE 0 END').bind(guard,id)] : [];
  if (!id) {
    // Insert new
    statements.push(db.prepare(`
      INSERT INTO Brand (id, name, slug, logo, description, seoTitle, seoDescription, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      brandId,
      parsed.name,
      parsed.slug,
      parsed.logo || null,
      parsed.description || null,
      parsed.seoTitle || null,
      parsed.seoDescription || null,
      parsed.status
    ));
  } else {
    // Update existing
    statements.push(db.prepare(`
      UPDATE Brand SET
        name = ?,
        slug = ?,
        logo = ?,
        description = ?,
        seoTitle = ?,
        seoDescription = ?,
        status = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ? AND deletedAt IS NULL
    `).bind(
      parsed.name,
      parsed.slug,
      parsed.logo || null,
      parsed.description || null,
      parsed.seoTitle || null,
      parsed.seoDescription || null,
      parsed.status,
      brandId
    ));

    // Synchronize Product.brand name for all products referencing this brandId
    statements.push(db.prepare(`
      UPDATE Product SET brand = ? WHERE brandId = ?
    `).bind(parsed.name, brandId));
  }

  statements.push(db.prepare("DELETE FROM MediaUsage WHERE ownerType='BRAND' AND ownerId=?").bind(brandId));
  if (parsed.logo) {
    const match = parsed.logo.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    const assetId = match?.[0] ?? parsed.logo;
    statements.push(db.prepare("INSERT INTO MediaUsage(id,assetId,ownerType,ownerId,slot) SELECT ?,id,'BRAND',?,'logo' FROM MediaAsset WHERE id=?").bind(crypto.randomUUID(),brandId,assetId));
  }
  await db.batch([...statements, ...adminAuditStatements(db, id ? 'brand.update' : 'brand.create', brandId, 'Brand mutation'), db.prepare('DELETE FROM AdminMutationGuard WHERE id=?').bind(guard)]);

  const updated = await getBrandDetail(db, brandId);
  if (!updated) throw new MediaError('Không thể tải lại thông tin thương hiệu sau khi lưu.', 500);
  return updated;
}

/**
 * Safely archive/delete brand, preventing deletion if products actively reference it.
 */
export async function archiveBrand(
  db: D1Database,
  id: string
): Promise<{ success: boolean; archived: boolean; id: string }> {
  const brand = await db.prepare('SELECT id, name FROM Brand WHERE id=? AND deletedAt IS NULL').bind(id).first<{ id: string; name: string }>();
  if (!brand) throw new MediaError('Không tìm thấy thương hiệu.', 404);

  const productCount = await db.prepare(`
    SELECT count(*) AS cnt FROM Product WHERE brandId=? AND deletedAt IS NULL
  `).bind(id).first<{ cnt: number }>();

  if (productCount && productCount.cnt > 0) {
    throw new MediaError(
      `Không thể xóa thương hiệu "${brand.name}" vì đang có ${productCount.cnt} sản phẩm liên kết. Vui lòng chuyển trạng thái sang Ẩn (INACTIVE) nếu không muốn hiển thị trên website.`,
      400
    );
  }

  const [result] = await db.batch([db.prepare(`UPDATE Brand SET status='INACTIVE', deletedAt=CURRENT_TIMESTAMP, updatedAt=CURRENT_TIMESTAMP WHERE id=? AND deletedAt IS NULL AND NOT EXISTS(SELECT 1 FROM Product WHERE brandId=? AND deletedAt IS NULL)`).bind(id,id), ...adminAuditStatements(db, 'brand.archive', id, 'Brand archived', null, 'order', { changed: true })]);

  if (!result.meta.changes) throw new MediaError('Thương hiệu đã thay đổi hoặc có sản phẩm liên kết.', 409);
  return { success: true, archived: true, id };
}

/**
 * Public resolver for Brand page with published products.
 */
export async function publicBrandWithProducts(
  db: D1Database,
  slug: string,
  pricingContext?: PriceEvaluationContext,
  at: Date = new Date()
) {
  const brand = await getBrandDetail(db, slug);
  if (!brand || brand.status !== 'ACTIVE') {
    throw new MediaError('Không tìm thấy thương hiệu hoặc thương hiệu đã tạm ẩn.', 404);
  }

  const context = pricingContext || await getStorefrontPricingContext(db, at);
  const rows = await db.prepare(`SELECT p.id FROM Product p LEFT JOIN ProductStudio s ON s.productId=p.id
    WHERE (p.brandId=? OR lower(p.brand)=lower(?)) AND p.status='ACTIVE' AND p.deletedAt IS NULL
      AND (s.productId IS NULL OR s.published IS NOT NULL) ORDER BY p.updatedAt DESC LIMIT 40`)
    .bind(brand.id,brand.name).all<{id:string}>();
  const products = await resolveProductsByIds(rows.results.map(p=>p.id),getPrismaClient(db),context,at);
  return {
    brand,
    products,
  };
}
