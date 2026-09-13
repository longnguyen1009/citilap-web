import { NextResponse } from 'next/server';
import { mockOrders, mockUsers } from '@/lib/mock-data';

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;

    if (!hasDatabase) {
      const order = mockOrders.find(o => o.id === params.id);
      if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      const user = mockUsers.find(u => u.id === order.userId);
      return NextResponse.json({ success: true, data: { ...order, user, items: [] } });
    }

    const { prisma } = await import('@/lib/prisma');
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: { include: { product: { select: { name: true, images: true, category: true } } } }
      }
    });

    if (!order) return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Failed to fetch order:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });

    const { prisma } = await import('@/lib/prisma');
    const data = await request.json();

    await prisma.order.update({
      where: { id: params.id },
      data: { status: data.status, paymentStatus: data.paymentStatus, shippingAddress: data.shippingAddress }
    });

    const updatedOrder = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: { include: { product: { select: { name: true, images: true, category: true } } } },
      },
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 });
  }
}
