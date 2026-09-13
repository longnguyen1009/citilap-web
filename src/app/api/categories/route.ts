import { NextResponse } from 'next/server';
import { mockCategories } from '@/lib/mock-data';

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
  try {
    if (!hasDatabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 });
    }

    const { prisma } = await import('@/lib/prisma');
    const data = await request.json();

    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        image: data.image || null,
        parentId: data.parentId || null,
      }
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
  }
}
