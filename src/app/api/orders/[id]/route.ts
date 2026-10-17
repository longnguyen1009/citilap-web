import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminMutation } from '@/lib/auth';
import {
  getOrderById,
  transitionOrderStatus,
  addOrderInternalNote,
  validateOrderConfirmationToken,
  OrderConflictError,
  OrderStatus,
} from '@/server/services/order.service';

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

      // Return sanitized order data for customer (masking sensitive parts, completely excluding internal notes and audit events)
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
          shippingMethod: order.shippingMethod,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          checkoutSnapshot: order.checkoutSnapshot ? JSON.parse(order.checkoutSnapshot) : null,
          totalAmount: order.totalAmount,
          items: order.items.map((item) => {
            let image = '';
            try {
              const parsedImages = JSON.parse(item.product?.images || '[]');
              image = Array.isArray(parsedImages) ? parsedImages[0] : '';
            } catch {
              image = '';
            }
            return {
              id: item.id,
              productId: item.productId,
              productName: item.productNameSnapshot || item.productName,
              sku: item.skuSnapshot || item.sku,
              price: item.priceSnapshot ?? item.price,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
              image,
            };
          }),
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      });
    }

    // Admin view has full access (including events, internalNotes, revision)
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

    // Handle internal note addition shortcut (server enforces SHARED_ADMIN_ACTOR)
    if (data.action === 'ADD_NOTE' && typeof data.content === 'string') {
      const note = await addOrderInternalNote(params.id, data.content);
      return NextResponse.json({ success: true, data: note });
    }

    // Enforce valid integer expectedRevision for all state transitions (non-negative integer >= 0)
    if (typeof data.expectedRevision !== 'number' || !Number.isInteger(data.expectedRevision) || data.expectedRevision < 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REVISION',
            message: 'expectedRevision là bắt buộc và phải là số nguyên không âm hợp lệ',
          },
        },
        { status: 400 }
      );
    }

    const rawStatus = String(data.status || '').trim().toUpperCase();
    let targetStatus: OrderStatus;

    if (rawStatus === 'COMPLETED' || rawStatus === 'ĐÃ HOÀN THÀNH') {
      targetStatus = 'COMPLETED';
    } else if (rawStatus === 'NEW' || rawStatus === 'PENDING' || rawStatus === 'CHỜ XÁC NHẬN' || rawStatus === 'ĐANG XỬ LÝ') {
      targetStatus = 'NEW';
    } else if (rawStatus === 'CONTACTED' || rawStatus === 'ĐÃ LIÊN HỆ') {
      targetStatus = 'CONTACTED';
    } else if (rawStatus === 'CONFIRMED' || rawStatus === 'ĐÃ XÁC NHẬN') {
      targetStatus = 'CONFIRMED';
    } else if (rawStatus === 'CANCELLED' || rawStatus === 'ĐÃ HỦY') {
      targetStatus = 'CANCELLED';
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Trạng thái không hợp lệ: "${rawStatus}". Chấp nhận: NEW, CONTACTED, CONFIRMED, COMPLETED, CANCELLED.`,
          },
        },
        { status: 400 }
      );
    }

    const updated = await transitionOrderStatus({
      orderId: params.id,
      targetStatus,
      expectedRevision: data.expectedRevision,
      reason: typeof data.reason === 'string' ? data.reason : null,
      note: typeof data.note === 'string' ? data.note : null,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    if (error instanceof OrderConflictError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONFLICT_REVISION_MISMATCH',
            message: error.message,
            currentRevision: error.currentRevision,
          },
        },
        { status: 409 }
      );
    }

    const err = error as { code?: string; message?: string };
    const code = err?.code || '';
    const message = err?.message || 'Failed to update order';

    if (code === 'SAME_STATUS_NOOP') {
      return NextResponse.json(
        { success: false, error: { code, message: 'Đơn hàng đã ở trạng thái này' } },
        { status: 400 }
      );
    }

    if (code === 'INVALID_TRANSITION' || code === 'REASON_REQUIRED' || code === 'INVALID_REVISION') {
      return NextResponse.json(
        { success: false, error: { code, message } },
        { status: 400 }
      );
    }

    if (message === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    console.error('Failed to update order status:', error);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export const PATCH = PUT;
