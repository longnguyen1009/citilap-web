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
    logo: r.logo ? String(r.logo) : null,
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
    logo: row.logo ? String(row.logo) : null,
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

  if (!id) {
    // Insert new
    await db.prepare(`
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
    ).run();
  } else {
    // Update existing
    await db.prepare(`
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
    ).run();

    // Synchronize Product.brand name for all products referencing this brandId
    await db.prepare(`
      UPDATE Product SET brand = ? WHERE brandId = ?
    `).bind(parsed.name, brandId).run();
  }

  // Update MediaUsage for brand logo
  try {
    await db.prepare("DELETE FROM MediaUsage WHERE ownerType='BRAND' AND ownerId=?").bind(brandId).run();
    if (parsed.logo) {
      const match = parsed.logo.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
      const assetId = match ? match[0] : (parsed.logo.length <= 40 ? parsed.logo : null);
      if (assetId) {
        const assetExists = await db.prepare("SELECT id FROM MediaAsset WHERE id=?").bind(assetId).first();
        if (assetExists) {
          await db.prepare("INSERT INTO MediaUsage(id, assetId, ownerType, ownerId, slot) VALUES(?, ?, 'BRAND', ?, 'logo')")
            .bind(crypto.randomUUID(), assetId, brandId).run();
        }
      }
    }
  } catch {
    // Ignore usage tracking errors if table/schema is temporarily unavailable
  }

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

  await db.prepare(`
    UPDATE Brand SET status='INACTIVE', deletedAt=CURRENT_TIMESTAMP, updatedAt=CURRENT_TIMESTAMP WHERE id=?
  `).bind(id).run();

  return { success: true, archived: true, id };
}

/**
 * Public resolver for Brand page with published products.
 */
export async function publicBrandWithProducts(
  db: D1Database,
  slug: string
) {
  const brand = await getBrandDetail(db, slug);
  if (!brand || brand.status !== 'ACTIVE') {
    throw new MediaError('Không tìm thấy thương hiệu hoặc thương hiệu đã tạm ẩn.', 404);
  }

  // Get active published products for this brand
  const productsRows = await db.prepare(`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.price,
      p.originalPrice,
      p.images,
      p.brand,
      p.cpu,
      p.ram,
      p.storage,
      p.condition,
      p.isNewArrival,
      p.isBestSeller,
      s.published
    FROM Product p
    LEFT JOIN ProductStudio s ON s.productId = p.id
    WHERE (p.brandId = ? OR lower(p.brand) = lower(?))
      AND p.status = 'ACTIVE'
      AND p.deletedAt IS NULL
      AND (s.published IS NOT NULL OR s.productId IS NULL)
    ORDER BY p.updatedAt DESC
    LIMIT 40
  `).bind(brand.id, brand.name).all<Record<string, unknown>>();

  const products = (productsRows.results || []).map((r: Record<string, unknown>) => {
    let image = 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?q=80&w=200';
    try {
      const parsed = JSON.parse(String(r.images || '[]'));
      if (Array.isArray(parsed) && parsed[0]) image = parsed[0];
    } catch {
      if (typeof r.images === 'string' && r.images.startsWith('http')) image = r.images;
    }
    return {
      id: String(r.id),
      name: String(r.name),
      slug: String(r.slug),
      price: Number(r.price),
      originalPrice: r.originalPrice ? Number(r.originalPrice) : null,
      image,
      brand: String(r.brand || brand.name),
      cpu: r.cpu ? String(r.cpu) : null,
      ram: r.ram ? String(r.ram) : null,
      condition: String(r.condition || 'NEW'),
      isNewArrival: !!r.isNewArrival,
      isBestSeller: !!r.isBestSeller,
    };
  });

  return {
    brand,
    products,
  };
}
