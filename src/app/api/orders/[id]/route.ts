import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminMutation } from '@/lib/auth';
import { getD1Database } from '@/lib/prisma';
import {
  getOrderById,
  getAvailableSerialsForOrder,
  transitionOrderStatus,
  addOrderInternalNote,
  updateOrderBilling,
  assignOrderItemSerial,
  validateOrderConfirmationToken,
  OrderConflictError,
  OrderValidationError,
  OrderStatus,
} from '@/server/services/order.service';

async function GETHandler(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const adminDenied = await requireAdmin(request);
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
              const first = Array.isArray(parsedImages) ? parsedImages[0] : '';
              image = typeof first === 'object' && first !== null ? (first.url || '') : String(first || '');
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

    // Admin view has full access (including events, internalNotes, revision, and available serial units)
    const db = getD1Database();
    const availableSerials = await getAvailableSerialsForOrder(order, db);

    return NextResponse.json(
      { success: true, data: { ...order, availableSerials } },
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

async function PUTHandler(request: Request, props: { params: Promise<{ id: string }> }) {
  const denied = await requireAdminMutation(request);
  if (denied) return denied;

  try {
    const params = await props.params;
    const data = await request.json();

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    // Handle internal note addition shortcut (server enforces SHARED_ADMIN_ACTOR)
    if (data.action === 'ADD_NOTE' && typeof data.content === 'string') {
      const note = await addOrderInternalNote(params.id, data.content);
      return NextResponse.json({ success: true, data: note });
    }

    // Enforce valid integer expectedRevision for all state transitions, billing mutations, and serial assignments
    if (typeof data.expectedRevision !== 'number' || !Number.isSafeInteger(data.expectedRevision) || data.expectedRevision < 0) {
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

    // Handle SerialUnit assignment for an OrderItem
    if (data.action === 'ASSIGN_SERIAL') {
      if (typeof data.orderItemId !== 'string' || !data.orderItemId.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_ORDER_ITEM',
              message: 'orderItemId là bắt buộc và phải là chuỗi hợp lệ',
            },
          },
          { status: 400 }
        );
      }
      if (
        data.serialUnitId !== undefined &&
        data.serialUnitId !== null &&
        typeof data.serialUnitId !== 'string'
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_SERIAL_UNIT',
              message: 'serialUnitId phải là chuỗi hợp lệ hoặc null',
            },
          },
          { status: 400 }
        );
      }

      const updatedOrder = await assignOrderItemSerial({
        orderId: params.id,
        orderItemId: data.orderItemId,
        serialUnitId: typeof data.serialUnitId === 'string' && data.serialUnitId.trim() ? data.serialUnitId.trim() : null,
        expectedRevision: data.expectedRevision,
      });

      return NextResponse.json({ success: true, data: updatedOrder });
    }

    // Handle paymentStatus & shippingFee update
    if (data.action === 'UPDATE_BILLING') {
      const updatedOrder = await updateOrderBilling({
        orderId: params.id,
        expectedRevision: data.expectedRevision,
        paymentStatus: data.paymentStatus,
        shippingFee: data.shippingFee,
      });
      return NextResponse.json({ success: true, data: updatedOrder });
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
    const db = getD1Database();
    const availableSerials = await getAvailableSerialsForOrder(updated, db);

    return NextResponse.json({ success: true, data: { ...updated, availableSerials } });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: 'JSON không hợp lệ' }, { status: 400 });
    }
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

    if (error instanceof OrderValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status }
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

    if (message === 'ORDER_NOT_FOUND' || code === 'ORDER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    if (message === 'ORDER_ITEM_NOT_FOUND' || code === 'ORDER_ITEM_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Order item not found' }, { status: 404 });
    }

    if (message === 'SERIAL_UNIT_NOT_FOUND' || code === 'SERIAL_UNIT_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Serial unit not found' }, { status: 404 });
    }

    console.error('Failed to update order status:', error);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}

export const PATCH = withAdminContext(PUTHandler);

export const GET = withAdminContext(GETHandler);
export const PUT = withAdminContext(PUTHandler);
