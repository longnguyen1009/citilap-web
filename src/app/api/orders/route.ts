import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      // Basic search on user name or email
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
        user: {
          select: { name: true, email: true, phone: true }
        },
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}
