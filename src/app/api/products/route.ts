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

  return NextResponse.json(
    {
      success: false,
      code: 'LEGACY_WRITER_DISABLED',
      error: 'Endpoint này đã ngừng hoạt động để bảo vệ tính toàn vẹn dữ liệu và phiên bản CMS. Vui lòng sử dụng POST /api/admin/products hoặc giao diện Quản lý sản phẩm tại /admin/products/new.',
    },
    { status: 409 }
  );
}
