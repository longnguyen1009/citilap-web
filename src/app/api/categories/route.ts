import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: true,
        subCategories: true,
        _count: {
          select: { products: true }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        parentId: data.parentId || null,
      }
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error('Failed to create category:', error);
    return NextResponse.json({ success: false, error: 'Failed to create category' }, { status: 500 });
  }
}
