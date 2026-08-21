import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { name: true, email: true, phone: true }
        },
        items: {
          include: {
            product: {
              select: { name: true, images: true, category: true }
            }
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error('Failed to fetch order:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    
    // Only allow updating certain fields
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: data.status,
        paymentStatus: data.paymentStatus,
        shippingAddress: data.shippingAddress,
      }
    });

    return NextResponse.json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error('Failed to update order:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 });
  }
}
