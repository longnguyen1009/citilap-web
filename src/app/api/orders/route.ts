import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import {
  createOrder,
  listOrders,
  CreateOrderInput,
  toPublicOrderDto,
  PriceChangedError,
} from '@/server/services/order.service';
import { checkRateLimit, rateLimitExceededResponse, getClientIp } from '@/lib/rate-limiter';
import { verifyTurnstileToken } from '@/lib/turnstile';

function errorResponse(message: string, status: number, code = 'INVALID_REQUEST') {
  return NextResponse.json(
    { success: false, error: { code, message } },
    {
      status,
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    }
  );
}

async function GETHandler(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.min(Math.max(Number(searchParams.get('page') || 1), 1), 10000);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 25), 1), 100);

    if (!Number.isInteger(page) || !Number.isInteger(limit)) {
      return errorResponse('Invalid pagination', 400);
    }

    const result = await listOrders({ status, search, page, limit });

    return NextResponse.json(
      {
        success: true,
        data: result.orders,
        pagination: result.pagination,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}

async function POSTHandler(request: Request) {
  // 1. Rate limiting check (5 submissions per 10 minutes per IP)
  const rateLimit = await checkRateLimit('order', request, 5, 600);
  if (!rateLimit.allowed) {
    return rateLimitExceededResponse(rateLimit.retryAfter);
  }

  const idempotencyKey = request.headers.get('idempotency-key')?.trim() || null;
  if (idempotencyKey && idempotencyKey.length > 200) {
    return errorResponse('Idempotency-Key is too long', 400);
  }

  try {
    const body = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return errorResponse('Invalid request body', 400);
    }

    // 2. Turnstile validation (Fail-closed in Staging/Production if enforced or secret configured)
    const turnstileToken =
      request.headers.get('cf-turnstile-response') ||
      (typeof body.turnstileToken === 'string' ? body.turnstileToken : null);
    const clientIp = getClientIp(request);
    const turnstileCheck = await verifyTurnstileToken(turnstileToken, clientIp, { action: 'order' });
    if (!turnstileCheck.success) {
      return errorResponse(
        turnstileCheck.error || 'Xác thực bảo mật Turnstile không hợp lệ hoặc đã hết hạn.',
        403,
        turnstileCheck.errorCode || 'TURNSTILE_FAILED'
      );
    }

    // 3. Payload size & item quantity constraints
    const rawItems = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length === 0) {
      return errorResponse('Giỏ hàng trống. Vui lòng chọn sản phẩm.', 400, 'EMPTY_CART');
    }
    if (rawItems.length > 10) {
      return errorResponse('Số lượng sản phẩm trong một đơn hàng không được vượt quá 10.', 400, 'TOO_MANY_ITEMS');
    }

    for (const it of rawItems) {
      const q = typeof it?.quantity === 'number' ? it.quantity : Number(it?.quantity);
      if (!Number.isInteger(q) || q < 1 || q > 5) {
        return errorResponse('Số lượng cho mỗi sản phẩm phải là số nguyên từ 1 đến 5.', 400, 'INVALID_ITEM_QUANTITY');
      }
    }

    const items = rawItems.map((it: Record<string, unknown>) => ({
      productId: typeof it.productId === 'string' ? it.productId.trim() : '',
      variantId: typeof it.variantId === 'string' && it.variantId.trim() ? it.variantId.trim() : null,
      sku: typeof it.sku === 'string' ? it.sku.trim() : null,
      quantity: Number(it.quantity),
      expectedPrice: typeof it.expectedPrice === 'number'
        ? it.expectedPrice
        : typeof it.price === 'number'
        ? it.price
        : null,
    }));

    const payload: CreateOrderInput = {
      items,
      customerName: typeof body.customerName === 'string' ? body.customerName.slice(0, 100) : '',
      customerPhone: typeof body.customerPhone === 'string' ? body.customerPhone.slice(0, 20) : '',
      customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail.slice(0, 254) : null,
      shippingAddress: typeof body.shippingAddress === 'string' ? body.shippingAddress.slice(0, 500) : null,
      note: typeof body.note === 'string' ? body.note.slice(0, 1000) : null,
      shippingMethod: typeof body.shippingMethod === 'string' ? body.shippingMethod : 'standard',
      paymentMethod: typeof body.paymentMethod === 'string' ? body.paymentMethod : 'COD',
    };

    const result = await createOrder(payload, idempotencyKey);

    const publicOrder = toPublicOrderDto(result.order);
    return NextResponse.json(
      {
        success: true,
        data: publicOrder,
        orderId: publicOrder.id,
        orderNumber: publicOrder.orderNumber,
        confirmationToken: result.confirmationToken,
        isIdempotentReplay: result.isIdempotentReplay || false,
      },
      {
        status: result.isIdempotentReplay ? 200 : 201,
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; details?: unknown };
    const code = err?.code || (typeof err?.message === 'string' && err.message.startsWith('PRICE_CHANGED') ? 'PRICE_CHANGED' : '');

    if (error instanceof PriceChangedError || code === 'PRICE_CHANGED') {
      const details = error instanceof PriceChangedError ? error.details : (err as { details?: unknown })?.details;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PRICE_CHANGED',
            message: 'Giá sản phẩm đã thay đổi hoặc chương trình khuyến mãi đã kết thúc. Vui lòng xác nhận lại giá mới trước khi hoàn tất đặt hàng.',
            details: details || null,
          },
        },
        {
          status: 409,
          headers: {
            'Cache-Control': 'private, no-store, no-cache, must-revalidate',
          },
        }
      );
    }
    if (code === 'IDEMPOTENCY_PAYLOAD_MISMATCH') {
      return errorResponse('Nội dung đặt hàng không khớp với yêu cầu trước đó của mã Idempotency này.', 422, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
    }
    if (code === 'EMPTY_CART') {
      return errorResponse('Giỏ hàng trống. Vui lòng chọn sản phẩm.', 400, 'EMPTY_CART');
    }
    if (code === 'TOO_MANY_ITEMS') {
      return errorResponse('Số lượng mặt hàng vượt quá giới hạn cho phép (tối đa 50).', 400, 'TOO_MANY_ITEMS');
    }
    if (code === 'CUSTOMER_NAME_INVALID') {
      return errorResponse('Vui lòng nhập họ và tên hợp lệ.', 400, 'CUSTOMER_NAME_INVALID');
    }
    if (code === 'CUSTOMER_PHONE_INVALID') {
      return errorResponse('Vui lòng nhập số điện thoại hợp lệ (9 - 15 chữ số).', 400, 'CUSTOMER_PHONE_INVALID');
    }
    if (code === 'CUSTOMER_EMAIL_INVALID') {
      return errorResponse('Email không hợp lệ.', 400, 'CUSTOMER_EMAIL_INVALID');
    }
    if (code === 'PRODUCT_UNAVAILABLE') {
      return errorResponse('Một hoặc nhiều sản phẩm trong giỏ hàng hiện không khả dụng.', 409, 'PRODUCT_UNAVAILABLE');
    }
    if (code === 'VARIANT_UNAVAILABLE') {
      return errorResponse('Cấu hình sản phẩm đã chọn hiện không khả dụng.', 409, 'VARIANT_UNAVAILABLE');
    }
    if (code === 'INVALID_ITEM') {
      return errorResponse('Thông tin sản phẩm trong giỏ hàng không hợp lệ.', 400, 'INVALID_ITEM');
    }

    console.error('Failed to create order:', error);
    return errorResponse('Không thể tạo đơn hàng. Vui lòng thử lại sau.', 500, 'ORDER_CREATE_FAILED');
  }
}

export const GET = withAdminContext(GETHandler);
export const POST = withAdminContext(POSTHandler);
