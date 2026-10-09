import { NextResponse } from 'next/server';
import { mockCategories } from '@/lib/mock-data';
import { requireAdmin } from '@/lib/auth';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET() {
  try {
    if (!hasDatabase) {
      const data = mockCategories.map((category) => ({
        ...category,
        description: (category as { description?: string | null }).description ?? null,
        image: (category as { image?: string | null }).image ?? null,
        parent: null,
        subCategories: [],
        _count: { products: 0 },
      }));
      return NextResponse.json({ success: true, data });
    }

    const { prisma } = await import('@/lib/prisma');
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        subCategories: true,
        _count: { select: { products: true } }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    if (!hasDatabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 });
    }

    const { prisma } = await import('@/lib/prisma');
    const data = await request.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const name = typeof data.name === 'string' ? data.name.trim().slice(0, 120) : '';
    const slug = typeof data.slug === 'string' ? data.slug.trim().slice(0, 140) : '';
    if (!name || !SLUG_RE.test(slug)) {
      return NextResponse.json({ success: false, error: 'Tên hoặc slug danh mục không hợp lệ' }, { status: 400 });
    }
    const parentId = data.parentId == null || data.parentId === '' ? null : typeof data.parentId === 'string' ? data.parentId.trim() : '__invalid__';
    if (parentId === '__invalid__') return NextResponse.json({ success: false, error: 'Invalid parentId' }, { status: 400 });
    if (parentId) {
      const parent = await prisma.category.findUnique({ where: { id: parentId }, select: { id: true } });
      if (!parent) return NextResponse.json({ success: false, error: 'Danh mục cha không tồn tại' }, { status: 400 });
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: data.description ? String(data.description).slice(0, 500) : null,
        image: data.image ? String(data.image).slice(0, 500) : null,
        parentId,
      }
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Category name or slug already exists' }, { status: 409 });
    }
    console.error('Failed to create category:', error);
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
  }
}
