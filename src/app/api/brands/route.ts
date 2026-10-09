import { NextResponse } from 'next/server';

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET() {
  try {
    if (!hasDatabase) {
      return NextResponse.json({
        success: true,
        data: [
          { id: 'br-dell', name: 'Dell', slug: 'dell', status: 'ACTIVE' },
          { id: 'br-asus', name: 'Asus', slug: 'asus', status: 'ACTIVE' },
          { id: 'br-lenovo', name: 'Lenovo', slug: 'lenovo', status: 'ACTIVE' },
          { id: 'br-apple', name: 'Apple', slug: 'apple', status: 'ACTIVE' },
          { id: 'br-hp', name: 'HP', slug: 'hp', status: 'ACTIVE' },
          { id: 'br-acer', name: 'Acer', slug: 'acer', status: 'ACTIVE' },
          { id: 'br-msi', name: 'MSI', slug: 'msi', status: 'ACTIVE' },
        ],
      });
    }

    const { prisma } = await import('@/lib/prisma');
    const brands = await prisma.brand.findMany({
      where: { status: 'ACTIVE' },
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: brands });
  } catch (error) {
    console.error('Failed to fetch brands:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch brands' }, { status: 500 });
  }
}
