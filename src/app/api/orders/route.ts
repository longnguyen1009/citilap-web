import { NextResponse } from 'next/server';
import { mockOrders, mockUsers } from '@/lib/mock-data';

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (!hasDatabase) {
      let filtered = [...mockOrders];
      if (status) filtered = filtered.filter(o => o.status === status);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(o => {
          const user = mockUsers.find(u => u.id === o.userId);
          return user?.name.toLowerCase().includes(q) || user?.email.toLowerCase().includes(q);
        });
      }
      const data = filtered.map(o => ({
        ...o,
        user: mockUsers.find(u => u.id === o.userId) || null,
        items: [],
      }));
      return NextResponse.json({ success: true, data });
    }

    const { prisma } = await import('@/lib/prisma');
    const where: Record<string, unknown> = {};

    if (status) where.status = status;
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search } },
          { email: { contains: search } }
        ]
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}
