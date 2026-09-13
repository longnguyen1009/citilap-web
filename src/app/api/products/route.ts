import { NextResponse } from 'next/server';
import { mockProducts } from '@/lib/mock-data';

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
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 10), 1), 50);

    // If no database, return mock data
    if (!hasDatabase) {
      let filtered = [...mockProducts];
      if (category) filtered = filtered.filter(p => p.categoryId === category);
      if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
      if (brand) filtered = filtered.filter(p => p.name.toLowerCase().includes(brand.toLowerCase()));
      if (series) filtered = filtered.filter(p => p.name.toLowerCase().includes(series.toLowerCase()));
      return NextResponse.json({ success: true, data: filtered });
    }

    const { prisma } = await import('@/lib/prisma');
    const where: Record<string, unknown> = { status: 'active' };

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

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

function toNullableString(value: unknown): string | null { if (value === undefined || value === null) return null; const text = String(value).trim(); return text || null; }
function toNullableNumber(value: unknown): number | null { if (value === undefined || value === null || value === '') return null; const num = Number(value); return Number.isFinite(num) ? num : null; }
function toBooleanFlag(value: unknown, fallback = false): boolean { if (value === undefined || value === null) return fallback; return Boolean(value); }
function toNullableIso(value: unknown): string | null { const text = toNullableString(value); if (!text) return null; const d = new Date(text); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }

export async function POST(request: Request) {
  try {
    if (!hasDatabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 });
    }

    const { prisma } = await import('@/lib/prisma');
    const data = await request.json();
    const name = String(data.name || '').trim();
    const slug = String(data.slug || '').trim();
    const price = Number(data.price);
    const originalPrice = data.originalPrice === null || data.originalPrice === undefined || data.originalPrice === '' ? null : Number(data.originalPrice);
    if (!name || !slug || !Number.isFinite(price) || price < 0 || (originalPrice !== null && (!Number.isFinite(originalPrice) || originalPrice < price)) || !data.categoryId) {
      return NextResponse.json({ success: false, error: 'Dữ liệu sản phẩm không hợp lệ' }, { status: 400 });
    }

    const minOrderQty = Math.max(1, Number(data.minOrderQty ?? 1));
    const maxOrderRaw = toNullableNumber(data.maxOrderQty);
    const maxOrderQty = maxOrderRaw === null ? null : Math.max(minOrderQty, Math.round(maxOrderRaw));
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description: String(data.description || ''),
        contentHtml: toNullableString(data.contentHtml),
        brand: toNullableString(data.brand),
        model: toNullableString(data.model),
        series: toNullableString(data.series),
        warranty: toNullableString(data.warranty),
        condition: toNullableString(data.condition),
        origin: toNullableString(data.origin),
        seoTitle: toNullableString(data.seoTitle),
        seoDescription: toNullableString(data.seoDescription),
        canonicalSlug: toNullableString(data.canonicalSlug),
        isFeatured: toBooleanFlag(data.isFeatured),
        isNewArrival: toBooleanFlag(data.isNewArrival),
        isFlashSale: toBooleanFlag(data.isFlashSale),
        isBestSeller: toBooleanFlag(data.isBestSeller),
        allowBackorder: toBooleanFlag(data.allowBackorder),
        minOrderQty,
        maxOrderQty,
        lowestPrice30d: toNullableNumber(data.lowestPrice30d),
        publishAt: toNullableIso(data.publishAt),
        unpublishAt: toNullableIso(data.unpublishAt),
        price,
        originalPrice,
        images: typeof data.images === 'string' ? data.images : JSON.stringify(data.images || []),
        stock: data.stock || 0,
        status: data.status || 'active',
        specs: data.specs ? (typeof data.specs === 'string' ? data.specs : JSON.stringify(data.specs)) : null,
        tags: data.tags || '',
        categoryId: data.categoryId,
      }
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error('Failed to create product:', error);
    return NextResponse.json({ success: false, error: 'Failed to create product' }, { status: 500 });
  }
}
