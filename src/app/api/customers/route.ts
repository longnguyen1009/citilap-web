import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const tier = searchParams.get('tier');

    const where: any = {};
    
    if (tier) {
      where.tier = tier;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const customers = await prisma.user.findMany({
      where,
      include: {
        _count: {
          select: { orders: true }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch customers' }, { status: 500 });
  }
}
