import { NextResponse } from 'next/server';
import { requireAdminMutation } from '@/lib/auth';
import { sanitizeHtml } from '@/lib/sanitize-html';

// Check if DATABASE_URL is configured
const hasDatabase = !!process.env.DATABASE_URL;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const brand = searchParams.get('brand');
    const series = searchParams.get('series');
    const section = searchParams.get('section');
    const limitValue = Number(searchParams.get('limit') || 10);
    if (!Number.isInteger(limitValue) || limitValue < 1 || limitValue > 50) return NextResponse.json({ success: false, error: 'Invalid limit' }, { status: 400 });
    const limit = limitValue;
    if ([category, search, brand, series, section].some((value) => value !== null && value.length > 100)) return NextResponse.json({ success: false, error: 'Filter is too long' }, { status: 400 });

    // If no database, return mock data
    const { createPrismaD1Client } = await import('@/lib/prisma');
    const { mediaEnvironment } = await import('@/server/media-http');
    const prisma = createPrismaD1Client((await mediaEnvironment()).DB);
    const where: Record<string, unknown> = { status: { in: ['ACTIVE', 'active'] } };

    if (category) {
      where.category = { slug: category };
    }

    // Tags are comma-separated, so section/brand filters use contains.
    const nameContains = [search, brand, series].filter(Boolean);
    if (nameContains.length > 0) {
      where.OR = nameContains.map((term) => ({
        name: { contains: term },
      }));
    }
    if (section === 'new') {
      // createdAt ordering below selects newest products.
    } else if (section === 'flash-sale') {
      where.originalPrice = { not: null };
    } else if (section === 'gaming') {
      where.tags = { contains: 'gaming' };
    } else if (section === 'ultrabook') {
      where.tags = { contains: 'ultrabook' };
    } else if (section === 'workstation') {
      where.tags = { contains: 'workstation' };
    } else if (section === 'accessories') {
      where.category = { slug: { in: ['phu-kien', 'chuot-gaming', 'ban-phim-co'] } };
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const data = products.map(({ id, name, slug, description, brand, model, series, warranty, condition, origin, price, originalPrice, images, stock, specs, tags, category }) => ({ id, name, slug, description, brand, model, series, warranty, condition, origin, price, originalPrice, images, stock, specs, tags, category: category ? { id: category.id, name: category.name, slug: category.slug } : null }));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

function toNullableString(value: unknown): string | null { if (value === undefined || value === null) return null; const text = String(value).trim(); return text || null; }
function toNullableNumber(value: unknown): number | null { if (value === undefined || value === null || value === '') return null; const num = Number(value); return Number.isFinite(num) ? num : null; }
function toBooleanFlag(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string' && ['true', '1'].includes(value.trim().toLowerCase())) return true;
  if (typeof value === 'string' && ['false', '0'].includes(value.trim().toLowerCase())) return false;
  throw new Error('INVALID_BOOLEAN');
}
function toNullableIso(value: unknown): string | null { const text = toNullableString(value); if (!text) return null; const d = new Date(text); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }

const PRODUCT_STATUSES = new Set(['ACTIVE', 'DRAFT', 'ARCHIVED', 'INACTIVE', 'OUT_OF_STOCK', 'active', 'draft', 'archived']);

export async function POST(request: Request) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;
  try {
    if (!hasDatabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 });
    }

    const { prisma } = await import('@/lib/prisma');
    const data = await request.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    if (typeof data.categoryId !== 'string' || !data.categoryId.trim()) return NextResponse.json({ success: false, error: 'Category is invalid' }, { status: 400 });
    const name = String(data.name || '').trim().slice(0, 200);
    const slug = String(data.slug || '').trim().slice(0, 220);
    const price = Math.round(Number(data.price));
    const originalPrice = data.originalPrice === null || data.originalPrice === undefined || data.originalPrice === '' ? null : Math.round(Number(data.originalPrice));
    const stock = Number(data.stock ?? 0);
    const status = data.status === undefined ? 'ACTIVE' : String(data.status);
    if (!name || !slug || !PRODUCT_STATUSES.has(status) || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0 || (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < price)) || !data.categoryId || !['isFeatured','isNewArrival','isFlashSale','isBestSeller','allowBackorder'].every((field) => data[field] === undefined || typeof data[field] === 'boolean' || (typeof data[field] === 'string' && ['true','false','1','0'].includes(data[field].trim().toLowerCase())))) {
      return NextResponse.json({ success: false, error: 'Dữ liệu sản phẩm không hợp lệ' }, { status: 400 });
    }
    const category = await prisma.category.findUnique({ where: { id: data.categoryId }, select: { id: true } });
    if (!category) return NextResponse.json({ success: false, error: 'Danh mục không tồn tại' }, { status: 400 });
    const publishAt = toNullableIso(data.publishAt);
    const unpublishAt = toNullableIso(data.unpublishAt);
    if (publishAt && unpublishAt && unpublishAt <= publishAt) {
      return NextResponse.json({ success: false, error: 'Thời gian ẩn phải sau thời gian đăng' }, { status: 400 });
    }

    const minOrderQtyRaw = Number(data.minOrderQty ?? 1);
    if (!Number.isInteger(minOrderQtyRaw) || minOrderQtyRaw < 1) return NextResponse.json({ success: false, error: 'minOrderQty is invalid' }, { status: 400 });
    const minOrderQty = minOrderQtyRaw;
    const maxOrderRaw = toNullableNumber(data.maxOrderQty);
    if (maxOrderRaw !== null && (!Number.isInteger(maxOrderRaw) || maxOrderRaw < minOrderQty)) return NextResponse.json({ success: false, error: 'maxOrderQty is invalid' }, { status: 400 });
    const maxOrderQty = maxOrderRaw;
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: String(data.description || '').slice(0, 2000),
        contentHtml: data.contentHtml == null ? null : sanitizeHtml(String(data.contentHtml)).slice(0, 100000),
        brand: toNullableString(data.brand)?.slice(0, 120) ?? null,
        model: toNullableString(data.model)?.slice(0, 120) ?? null,
        series: toNullableString(data.series)?.slice(0, 120) ?? null,
        warranty: toNullableString(data.warranty)?.slice(0, 200) ?? null,
        condition: toNullableString(data.condition)?.slice(0, 120) || 'NEW',
        origin: toNullableString(data.origin)?.slice(0, 120) ?? null,
        seoTitle: toNullableString(data.seoTitle)?.slice(0, 200) ?? null,
        seoDescription: toNullableString(data.seoDescription)?.slice(0, 300) ?? null,
        canonicalSlug: toNullableString(data.canonicalSlug)?.slice(0, 220) ?? null,
        isFeatured: toBooleanFlag(data.isFeatured),
        isNewArrival: toBooleanFlag(data.isNewArrival),
        isFlashSale: toBooleanFlag(data.isFlashSale),
        isBestSeller: toBooleanFlag(data.isBestSeller),
        allowBackorder: toBooleanFlag(data.allowBackorder),
        minOrderQty,
        maxOrderQty,
        lowestPrice30d: data.lowestPrice30d != null ? Math.round(Number(data.lowestPrice30d)) : null,
        publishAt,
        unpublishAt,
        price,
        originalPrice,
        images: typeof data.images === 'string' ? data.images.slice(0, 5000) : JSON.stringify(data.images || []).slice(0, 5000),
        stock,
        status,
        specs: data.specs ? (typeof data.specs === 'string' ? data.specs.slice(0, 10000) : JSON.stringify(data.specs).slice(0, 10000)) : null,
        tags: String(data.tags || '').slice(0, 500),
        categoryId: String(data.categoryId),
      }
    });

    // Synchronize ProductImage metadata records in D1
    try {
      const rawImages: string[] = Array.isArray(data.images)
        ? data.images
        : typeof data.images === 'string'
        ? (() => { try { const p = JSON.parse(data.images); return Array.isArray(p) ? p : [data.images]; } catch { return [data.images]; } })()
        : [];

      if (rawImages.length > 0) {
        const { extractR2Key, getPublicMediaUrl } = await import('@/infra/cloudflare/r2/storage');
        for (let i = 0; i < rawImages.length; i++) {
          const item = String(rawImages[i]).trim();
          if (!item) continue;
          const key = extractR2Key(item);
          await prisma.productImage.create({
            data: {
              productId: product.id,
              r2Key: key,
              url: getPublicMediaUrl(key),
              sortOrder: i,
              isPrimary: i === 0,
            },
          }).catch((err) => {
            console.warn('Non-fatal productImage sync warning:', err);
          });
        }
      }
    } catch (syncErr) {
      console.warn('ProductImage sync skipped:', syncErr);
    }

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_BOOLEAN') return NextResponse.json({ success: false, error: 'Boolean field is invalid' }, { status: 400 });
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') return NextResponse.json({ success: false, error: 'Product slug already exists' }, { status: 409 });
    console.error('Failed to create product:', error);
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
}
