import { NextResponse } from 'next/server';
import { mediaEnvironment } from '@/server/media-http';
import { listBrands } from '@/server/services/brand.service';

export async function GET() {
  try {
    try {
      const { DB } = await mediaEnvironment();
      const res = await listBrands(DB, { status: 'ACTIVE' });
      return NextResponse.json({ success: true, data: res.items });
    } catch {
      // Fallback for non-workers environments
    }

    if (process.env.DATABASE_URL) {
      const { prisma } = await import('@/lib/prisma');
      const brands = await prisma.brand.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
      });
      return NextResponse.json({ success: true, data: brands });
    }

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
  } catch (error) {
    console.error('Failed to fetch brands:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch brands' }, { status: 500 });
  }
}
