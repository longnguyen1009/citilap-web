import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminMutation } from '@/lib/auth';
import { getOrderById, updateOrderStatus, validateOrderConfirmationToken } from '@/server/services/order.service';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const adminDenied = requireAdmin(request);
    const isAdmin = !adminDenied;

    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    // If not admin, verify confirmation token for customer success view
    if (!isAdmin) {
      const isValidToken = await validateOrderConfirmationToken(order, token);
      if (!isValidToken) {
        return NextResponse.json(
          { success: false, error: 'Không có quyền truy cập thông tin đơn hàng này' },
          {
            status: 403,
            headers: {
              'Cache-Control': 'private, no-store, no-cache, must-revalidate',
            },
          }
        );
      }

      // Return sanitized order data for customer (masking sensitive parts)
      const sanitizedPhone = order.customerPhone.length > 4
        ? order.customerPhone.slice(0, 3) + '****' + order.customerPhone.slice(-3)
        : '***';

      return NextResponse.json({
        success: true,
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt,
          customerName: order.customerName,
          customerPhone: sanitizedPhone,
          shippingAddress: order.shippingAddress,
          note: order.note,
          subtotalAmount: order.subtotalAmount,
          shippingFee: order.shippingFee,
          totalAmount: order.totalAmount,
          items: order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            productName: item.productNameSnapshot || item.productName,
            sku: item.skuSnapshot || item.sku,
            price: item.priceSnapshot || item.price,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
            image: item.product ? (Array.isArray(JSON.parse(item.product.images || '[]')) ? JSON.parse(item.product.images || '[]')[0] : '') : '',
          })),
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      });
    }

    // Admin view has full access
    return NextResponse.json(
      { success: true, data: order },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch order:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;

  try {
    const params = await props.params;
    const data = await request.json();

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const rawStatus = String(data.status || '').trim();
    let status: 'PENDING' | 'COMPLETED';

    if (rawStatus === 'COMPLETED' || rawStatus === 'Đã hoàn thành') {
      status = 'COMPLETED';
    } else if (rawStatus === 'PENDING' || rawStatus === 'Chờ xác nhận' || rawStatus === 'Đang xử lý') {
      status = 'PENDING';
    } else {
      return NextResponse.json(
        { success: false, error: 'Trạng thái đơn hàng không hợp lệ. Chỉ chấp nhận PENDING hoặc COMPLETED.' },
        { status: 400 }
      );
    }

    const updated = await updateOrderStatus(params.id, status);

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const err = error as { message?: string };
    if (err?.message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    console.error('Failed to update order:', error);
    return NextResponse.json({ success: false, error: 'Failed to update order' }, { status: 500 });
  }
}

export const PATCH = PUT;
