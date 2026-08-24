import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/../generated/prisma/client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: Prisma.ProductWhereInput = {};
    
    if (category) {
      where.category = { slug: category };
    }
    
    if (search) {
      where.name = { contains: search };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description || '',
        price: data.price,
        originalPrice: data.originalPrice,
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
