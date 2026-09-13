import { NextResponse } from 'next/server';
import { mockUsers } from '@/lib/mock-data';

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tier = searchParams.get('tier');

    if (!hasDatabase) {
      let filtered = [...mockUsers];
      if (tier) filtered = filtered.filter(u => u.tier === tier);
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(u =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone?.includes(q)
        );
      }
      const data = filtered.map(u => ({
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        tier: u.tier, totalSpend: u.totalSpend,
        totalOrders: u.id === 'user-1' ? 5 : u.id === 'user-2' ? 3 : 0,
        lastOrder: new Date(), createdAt: u.createdAt,
      }));
      return NextResponse.json({ success: true, data });
    }

    const { prisma } = await import('@/lib/prisma');
    const where: Record<string, unknown> = {};

    if (tier) where.tier = tier;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, phone: true, tier: true, totalSpend: true, createdAt: true,
        _count: { select: { orders: true } },
        orders: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = users.map((user) => ({
      id: user.id, name: user.name, email: user.email, phone: user.phone,
      tier: user.tier, totalSpend: user.totalSpend,
      totalOrders: user._count.orders, lastOrder: user.orders[0]?.createdAt ?? null,
      createdAt: user.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 });
  }
}
