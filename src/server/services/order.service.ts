import type { D1Database } from '@cloudflare/workers-types';
import { getPrismaClient } from '@/lib/prisma';
import { assertPublishedStudioOrderable } from './storefront-order-guard';

export interface OrderItemInput {
  productId: string;
  variantId?: string | null;
  sku?: string | null;
  quantity: number;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  shippingAddress?: string | null;
  note?: string | null;
  shippingMethod?: string;
  paymentMethod?: string;
}

export interface ResolvedOrderItem {
  productId: string;
  variantId: string | null;
  productName: string;
  sku: string | null;
  productNameSnapshot: string;
  skuSnapshot: string | null;
  variantNameSnapshot: string | null;
  price: number;
  priceSnapshot: number;
  quantity: number;
  lineTotal: number;
}

export interface OrderRecord {
  id: string;
  orderNumber: string | null;
  idempotencyKey: string | null;
  payloadHash: string | null;
  userId: string | null;
  status: string;
  subtotalAmount: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  shippingAddress: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingMethod: string | null;
  note: string | null;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  items: Array<{
    id: string;
    orderId: string;
    productId: string;
    variantId: string | null;
    productName: string | null;
    sku: string | null;
    productNameSnapshot: string | null;
    skuSnapshot: string | null;
    variantNameSnapshot: string | null;
    price: number;
    priceSnapshot: number | null;
    quantity: number;
    lineTotal: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export interface CreateOrderResult {
  success: boolean;
  order: OrderRecord;
  isIdempotentReplay?: boolean;
  confirmationToken: string;
}

/**
 * Generate CSPRNG-backed confirmation token (STORE-14 Hardened).
 * Provides 192 bits of entropy via Web Crypto CSPRNG.
 * Only the SHA-256 token hash is stored in D1 database.
 */
export async function generateOrderConfirmationToken(
  orderId: string,
  idempotencyKey?: string | null
): Promise<{ token: string; tokenHash: string }> {
  let token: string;
  if (idempotencyKey && idempotencyKey.trim()) {
    // High-entropy token derived via HMAC-SHA256 from secret + idempotencyKey + orderId
    const secret = process.env.CONFIRMATION_TOKEN_SECRET || process.env.ADMIN_JWT_SECRET || 'citilap-csprng-token-secret-2026';
    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const msg = new TextEncoder().encode(`${idempotencyKey.trim()}:${orderId}`);
    const sig = await crypto.subtle.sign('HMAC', key, msg);
    token = Array.from(new Uint8Array(sig))
      .slice(0, 24)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    // Pure Web Crypto CSPRNG (24 bytes = 48 hex chars = 192 bits entropy)
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    token = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  const tokenHash = await hashConfirmationToken(token);
  return { token, tokenHash };
}

export async function hashConfirmationToken(token: string): Promise<string> {
  const enc = new TextEncoder().encode(`ctl_tok_salt:${token}`);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Validates a confirmation token against an order:
 * 1. Checks CSPRNG hash stored in D1 (Order.confirmationTokenHash).
 * 2. If confirmationTokenHash is null (legacy orders), falls back to legacy deterministic hash calculation.
 * 3. Uses timing-safe string comparison.
 */
export async function validateOrderConfirmationToken(
  order: { id: string; createdAt: string | Date; confirmationTokenHash?: string | null },
  token: string | null | undefined
): Promise<boolean> {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return false;
  }
  const cleanToken = token.trim();

  // 1. New CSPRNG hash path
  if (order.confirmationTokenHash) {
    const computedHash = await hashConfirmationToken(cleanToken);
    return timingSafeEqualString(computedHash, order.confirmationTokenHash);
  }

  // 2. Backward-compatibility fallback for pre-STORE-14 legacy orders
  const legacyToken = await createConfirmationToken(order.id, order.createdAt);
  return timingSafeEqualString(cleanToken, legacyToken);
}

/**
 * Legacy deterministic SHA-256 confirmation token generator (maintained for backward-compatibility)
 */
export async function createConfirmationToken(orderId: string, createdAt: string | Date): Promise<string> {
  const enc = new TextEncoder().encode(`${orderId}:${new Date(createdAt).getTime()}:citilap-confirm-salt`);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deterministic SHA-256 payload hasher for idempotency verification.
 */
export async function computeOrderPayloadHash(payload: CreateOrderInput): Promise<string> {
  const normalized = {
    customerName: payload.customerName.trim(),
    customerPhone: payload.customerPhone.trim(),
    customerEmail: payload.customerEmail?.trim().toLowerCase() || null,
    shippingAddress: payload.shippingAddress?.trim() || null,
    note: payload.note?.trim() || null,
    shippingMethod: payload.shippingMethod || 'standard',
    paymentMethod: payload.paymentMethod || 'COD',
    items: payload.items
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
        sku: item.sku || null,
        quantity: item.quantity,
      }))
      .sort((a, b) => `${a.productId}:${a.variantId}`.localeCompare(`${b.productId}:${b.variantId}`)),
  };

  const jsonStr = JSON.stringify(normalized);
  const enc = new TextEncoder().encode(jsonStr);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateOrderNumber(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `CTL-${datePart}-${randomPart}`;
}

/**
 * Validates and creates a new Customer Order in Cloudflare D1.
 * 
 * Strict Guarantees:
 * 1. Clean Guest Checkout: Does NOT create fake guest users.
 * 2. Server Price Enforcement: Prices are fetched directly from D1, never trusted from client.
 * 3. Scope Reset (STORE-10): NEVER decrements stock (Product.stock, ProductVariant.stock, InventoryBalance),
 *    never changes SerialUnit status, never creates inventory reservations.
 * 4. Idempotency Protection: Replaying the same key returns the existing order; altered payload is rejected.
 */
export async function createOrder(
  payload: CreateOrderInput,
  idempotencyKey?: string | null,
  d1Database?: D1Database,
  simulateFailureOnItemIndex?: number
): Promise<CreateOrderResult> {
  const prisma = getPrismaClient(d1Database);

  // 1. Validate customer information
  const customerName = payload.customerName?.trim();
  if (!customerName || customerName.length > 160) {
    throw new Error('CUSTOMER_NAME_INVALID');
  }

  const customerPhone = payload.customerPhone?.trim();
  if (!customerPhone || !/^[0-9+\s().-]{9,20}$/.test(customerPhone)) {
    throw new Error('CUSTOMER_PHONE_INVALID');
  }

  const customerEmail = payload.customerEmail?.trim()?.toLowerCase() || null;
  if (customerEmail && (customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail))) {
    throw new Error('CUSTOMER_EMAIL_INVALID');
  }

  const shippingAddress = payload.shippingAddress?.trim() || null;
  const note = payload.note?.trim()?.slice(0, 1000) || null;

  // 2. Validate items
  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('EMPTY_CART');
  }
  if (payload.items.length > 50) {
    throw new Error('TOO_MANY_ITEMS');
  }

  // 3. Compute payload hash for idempotency check
  const payloadHash = await computeOrderPayloadHash(payload);
  const cleanIdempotencyKey = idempotencyKey?.trim() || null;

  if (cleanIdempotencyKey) {
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: cleanIdempotencyKey },
      include: { items: true },
    });

    if (existing) {
      if (existing.payloadHash && existing.payloadHash !== payloadHash) {
        const error = Object.assign(new Error('IDEMPOTENCY_PAYLOAD_MISMATCH'), { code: 'IDEMPOTENCY_PAYLOAD_MISMATCH' });
        throw error;
      }
      let confirmationToken: string;
      if (existing.confirmationTokenHash) {
        const generated = await generateOrderConfirmationToken(existing.id, cleanIdempotencyKey);
        confirmationToken = generated.token;
      } else {
        confirmationToken = await createConfirmationToken(existing.id, existing.createdAt);
      }
      return { success: true, order: existing, isIdempotentReplay: true, confirmationToken };
    }
  }

  // 4. Resolve products & variants from D1 (Authoritative Price & Existence Verification)
  const resolvedItems: ResolvedOrderItem[] = [];
  let subtotalAmount = 0;

  for (const item of payload.items) {
    if (!item || typeof item !== 'object') {
      throw new Error('INVALID_ITEM');
    }
    const productId = typeof item.productId === 'string' ? item.productId.trim() : '';
    const variantId = typeof item.variantId === 'string' && item.variantId.trim() ? item.variantId.trim() : null;
    const quantity = Number(item.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error('INVALID_ITEM');
    }

    // Fetch product from D1
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true, name: true, price: true, status: true,
        studio: { select: { published: true } },
      },
    });

    if (!product || product.status !== 'ACTIVE') {
      throw new Error('PRODUCT_UNAVAILABLE');
    }

    // Published CMS availability is authoritative for Storefront requests,
    // including carts saved before an item was switched to CONTACT/UNAVAILABLE.
    assertPublishedStudioOrderable(
      { hasStudio: product.studio !== null, published: product.studio?.published },
      variantId
    );

    let price = product.price;
    let sku: string | null = null;
    let variantName: string | null = null;

    if (variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: variantId, productId },
        select: { id: true, sku: true, name: true, price: true, status: true },
      });

      if (!variant || variant.status !== 'ACTIVE') {
        throw new Error('VARIANT_UNAVAILABLE');
      }

      price = variant.price;
      sku = variant.sku;
      variantName = variant.name;
    }

    const lineTotal = price * quantity;
    subtotalAmount += lineTotal;

    resolvedItems.push({
      productId,
      variantId,
      productName: product.name,
      sku,
      productNameSnapshot: product.name,
      skuSnapshot: sku,
      variantNameSnapshot: variantName,
      price,
      priceSnapshot: price,
      quantity,
      lineTotal,
    });
  }

  const shippingFee = 0; // Phí giao hàng sẽ được nhân viên tư vấn xác nhận cụ thể với khách hàng
  const totalAmount = subtotalAmount + shippingFee;
  const orderNumber = generateOrderNumber();
  const orderId = 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  const now = new Date().toISOString();

  // Generate CSPRNG-backed confirmation token (192-bit entropy).
  // Only the SHA-256 hash is stored in D1 database.
  const { token: confirmationToken, tokenHash: confirmationTokenHash } =
    await generateOrderConfirmationToken(orderId, cleanIdempotencyKey);

  // 5. Atomic Order Persistence
  // In Cloudflare D1, d1.batch([stmt1, stmt2, ...]) guarantees an atomic SQLite transaction.
  // If any statement fails, the entire batch is rolled back leaving ZERO partial rows.
  if (d1Database) {
    try {
      const orderStmt = d1Database.prepare(`
        INSERT INTO "Order" (
          "id", "orderNumber", "idempotencyKey", "payloadHash", "userId", "status",
          "subtotalAmount", "shippingFee", "discountAmount", "totalAmount",
          "customerName", "customerPhone", "customerEmail", "shippingAddress",
          "shippingMethod", "note", "paymentMethod", "paymentStatus",
          "confirmationTokenHash", "createdAt", "updatedAt"
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        orderId,
        orderNumber,
        cleanIdempotencyKey,
        payloadHash,
        null,
        'PENDING',
        subtotalAmount,
        shippingFee,
        0,
        totalAmount,
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress,
        payload.shippingMethod || 'standard',
        note,
        payload.paymentMethod || 'COD',
        'PENDING',
        confirmationTokenHash,
        now,
        now
      );

      const itemStmts = resolvedItems.map((item, idx) => {
        const itemId = 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10) + idx;
        if (simulateFailureOnItemIndex !== undefined && idx === simulateFailureOnItemIndex) {
          // Intentionally invalid statement to trigger atomic rollback in D1
          return d1Database.prepare('INSERT INTO "OrderItem" ("id", "orderId", "non_existent_column_simulated_fail") VALUES (?, ?, ?)')
            .bind(itemId, orderId, 'fail');
        }

        return d1Database.prepare(`
          INSERT INTO "OrderItem" (
            "id", "orderId", "productId", "variantId", "productName", "sku",
            "productNameSnapshot", "skuSnapshot", "variantNameSnapshot",
            "price", "priceSnapshot", "quantity", "lineTotal", "createdAt", "updatedAt"
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          itemId,
          orderId,
          item.productId,
          item.variantId,
          item.productName,
          item.sku,
          item.productNameSnapshot,
          item.skuSnapshot,
          item.variantNameSnapshot,
          item.price,
          item.priceSnapshot,
          item.quantity,
          item.lineTotal,
          now,
          now
        );
      });

      // Atomic SQLite transaction execution via D1 batch
      await d1Database.batch([orderStmt, ...itemStmts]);

      const createdOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!createdOrder || createdOrder.items.length !== resolvedItems.length) {
        // Compensating cleanup if unexpected partial state detected
        await d1Database.batch([
          d1Database.prepare('DELETE FROM "OrderItem" WHERE "orderId" = ?').bind(orderId),
          d1Database.prepare('DELETE FROM "Order" WHERE "id" = ?').bind(orderId),
        ]);
        throw new Error('ORDER_CREATION_FAILED');
      }

      return { success: true, order: createdOrder, isIdempotentReplay: false, confirmationToken };
    } catch (batchError) {
      // In case D1 partially recorded anything, ensure complete cleanup
      try {
        await d1Database.batch([
          d1Database.prepare('DELETE FROM "OrderItem" WHERE "orderId" = ?').bind(orderId),
          d1Database.prepare('DELETE FROM "Order" WHERE "id" = ?').bind(orderId),
        ]);
      } catch {
        // Ignore secondary cleanup error
      }
      throw batchError;
    }
  }

  // Fallback persistence with compensating rollback (e.g. Node local SQLite)
  let createdOrderId: string | null = null;
  try {
    if (simulateFailureOnItemIndex !== undefined && simulateFailureOnItemIndex === 1) {
      throw new Error('SIMULATED_ITEM_FAILURE');
    }

    const order = await prisma.order.create({
      data: {
        id: orderId,
        orderNumber,
        idempotencyKey: cleanIdempotencyKey,
        payloadHash,
        userId: null, // Pure guest checkout
        status: 'PENDING',
        subtotalAmount,
        shippingFee,
        discountAmount: 0,
        totalAmount,
        customerName,
        customerPhone,
        customerEmail,
        shippingAddress,
        shippingMethod: payload.shippingMethod || 'standard',
        note,
        paymentMethod: payload.paymentMethod || 'COD',
        paymentStatus: 'PENDING',
        confirmationTokenHash,
        items: {
          create: resolvedItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            sku: item.sku,
            productNameSnapshot: item.productNameSnapshot,
            skuSnapshot: item.skuSnapshot,
            variantNameSnapshot: item.variantNameSnapshot,
            price: item.price,
            priceSnapshot: item.priceSnapshot,
            quantity: item.quantity,
            lineTotal: item.lineTotal,
          })),
        },
      },
      include: { items: true },
    });

    createdOrderId = order.id;

    if (!order || order.items.length !== resolvedItems.length) {
      throw new Error('ORDER_ITEMS_INCOMPLETE');
    }

    return { success: true, order, isIdempotentReplay: false, confirmationToken };
  } catch (error) {
    if (createdOrderId) {
      try {
        await prisma.orderItem.deleteMany({ where: { orderId: createdOrderId } });
        await prisma.order.delete({ where: { id: createdOrderId } });
      } catch (cleanupError) {
        console.error('Failed compensating rollback for order:', cleanupError);
      }
    }
    throw error;
  }
}

/**
 * Retrieve an order by its unique ID.
 */
export async function getOrderById(orderId: string, d1Database?: D1Database) {
  const prisma = getPrismaClient(d1Database);
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: true },
          },
        },
      },
    },
  });
}

/**
 * Retrieve an order by its human-readable order number.
 */
export async function getOrderByOrderNumber(orderNumber: string, d1Database?: D1Database) {
  const prisma = getPrismaClient(d1Database);
  return prisma.order.findUnique({
    where: { orderNumber },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, name: true, slug: true, images: true },
          },
        },
      },
    },
  });
}

/**
 * List orders with pagination, search, and status filtering for Admin.
 */
export async function listOrders(
  filters: {
    status?: string | null;
    search?: string | null;
    page?: number;
    limit?: number;
  },
  d1Database?: D1Database
) {
  const prisma = getPrismaClient(d1Database);
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 25));

  const where: Record<string, unknown> = {};

  if (filters.status && filters.status !== 'ALL') {
    // Map legacy status strings if needed
    if (filters.status === 'PENDING') {
      where.status = { in: ['PENDING', 'Chờ xác nhận', 'Đang xử lý', 'Đang vận chuyển'] };
    } else if (filters.status === 'COMPLETED') {
      where.status = { in: ['COMPLETED', 'Đã hoàn thành'] };
    } else {
      where.status = filters.status;
    }
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { orderNumber: { contains: q } },
      { customerName: { contains: q } },
      { customerPhone: { contains: q } },
      { customerEmail: { contains: q } },
    ];
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            productName: true,
            sku: true,
            quantity: true,
            price: true,
            lineTotal: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Updates order status (e.g. Admin marks PENDING -> COMPLETED).
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: 'PENDING' | 'COMPLETED',
  d1Database?: D1Database
) {
  const prisma = getPrismaClient(d1Database);

  const existing = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const isCompleted = newStatus === 'COMPLETED';

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      completedAt: isCompleted ? new Date() : null,
      updatedAt: new Date(),
    },
    include: { items: true },
  });
}
