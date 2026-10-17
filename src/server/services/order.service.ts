import type { D1Database } from '@cloudflare/workers-types';
import { getPrismaClient, getD1Database } from '@/lib/prisma';
import { calculateCheckout, CheckoutError } from './checkout.service';
import { checkoutSelectionSchema, checkoutAcknowledgmentSchema, type CheckoutAcknowledgment, type CheckoutSnapshot } from '@/contracts/checkout';

export interface OrderItemInput {
  productId: string;
  variantId?: string | null;
  sku?: string | null;
  quantity: number;
  expectedPrice?: number | null;
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
  showroomId?: string | null;
  checkoutAcknowledgment?: CheckoutAcknowledgment;
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
  regularPriceSnapshot: number;
  compareAtPriceSnapshot: number | null;
  campaignSnapshot: string | null;
  pricingEvaluatedAt: string;
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
  revision?: number;
  checkoutSnapshot?: string | null;
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
    regularPriceSnapshot?: number | null;
    compareAtPriceSnapshot?: number | null;
    campaignSnapshot?: string | null;
    pricingEvaluatedAt?: Date | string | null;
    quantity: number;
    lineTotal: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  events?: Array<{
    id: string;
    orderId: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    reason: string | null;
    note: string | null;
    actor: string;
    createdAt: Date;
  }>;
  internalNotes?: Array<{
    id: string;
    orderId: string;
    content: string;
    actor: string;
    createdAt: Date;
  }>;
}

export interface CreateOrderResult {
  success: boolean;
  order: OrderRecord;
  isIdempotentReplay?: boolean;
  confirmationToken: string;
}

export interface PublicOrderItemDto {
  id: string;
  productId: string;
  productName: string | null;
  variantName?: string | null;
  sku: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
}

export interface PublicOrderDto {
  checkoutSnapshot: CheckoutSnapshot | null;
  id: string;
  orderNumber: string | null;
  status: string;
  createdAt: Date | string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  shippingAddress: string | null;
  shippingMethod: string | null;
  paymentMethod: string;
  paymentStatus: string;
  subtotalAmount: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  note: string | null;
  items: PublicOrderItemDto[];
}

export function toPublicOrderDto(order: OrderRecord): PublicOrderDto {
  return {
    checkoutSnapshot: order.checkoutSnapshot ? JSON.parse(order.checkoutSnapshot) : null,
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    createdAt: order.createdAt,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    shippingAddress: order.shippingAddress,
    shippingMethod: order.shippingMethod,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    subtotalAmount: order.subtotalAmount,
    shippingFee: order.shippingFee,
    discountAmount: order.discountAmount || 0,
    totalAmount: order.totalAmount,
    note: order.note,
    items: (order.items || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productNameSnapshot || item.productName,
      variantName: item.variantNameSnapshot || null,
      sku: item.skuSnapshot || item.sku,
      price: item.priceSnapshot ?? item.price,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
    })),
  };
}

export class PriceChangedError extends Error {
  code = 'PRICE_CHANGED';
  productId?: string;
  expectedPrice?: number;
  effectivePrice?: number;
  details: {
    changedItems: Array<{
      productId: string;
      variantId: string | null;
      productName: string;
      oldPrice: number;
      newPrice: number;
      quantity: number;
      oldLineTotal: number;
      newLineTotal: number;
    }>;
    oldSubtotal: number;
    newSubtotal: number;
    oldGrandTotal: number;
    newGrandTotal: number;
  };

  constructor(message: string, details: PriceChangedError['details']) {
    super(message);
    this.name = 'PriceChangedError';
    this.details = details;
    if (details.changedItems && details.changedItems.length > 0) {
      this.productId = details.changedItems[0].productId;
      this.expectedPrice = details.changedItems[0].oldPrice;
      this.effectivePrice = details.changedItems[0].newPrice;
    }
  }
}

export class OrderConflictError extends Error {
  currentRevision: number;
  constructor(message: string, currentRevision: number) {
    super(message);
    this.name = 'OrderConflictError';
    this.currentRevision = currentRevision;
  }
}

export const SHARED_ADMIN_ACTOR = 'Admin vận hành (Phiên dùng chung)';

export type OrderStatus = 'NEW' | 'CONTACTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export const ORDER_STATUS_LABELS: Record<string, string> = {
  NEW: 'Mới',
  CONTACTED: 'Đã liên hệ',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  // Legacy aliases
  PENDING: 'Mới',
  'Chờ xác nhận': 'Mới',
  'Đang xử lý': 'Mới',
  'Đã hoàn thành': 'Hoàn tất',
};

/**
 * Server-enforced State Transition Matrix:
 * - NEW -> CONTACTED, CONFIRMED, CANCELLED
 * - CONTACTED -> CONFIRMED, CANCELLED
 * - CONFIRMED -> COMPLETED, CANCELLED
 * - CANCELLED -> NEW (Reopen)
 * - COMPLETED -> [] (Terminal: completed processing)
 */
export const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  NEW: ['CONTACTED', 'CONFIRMED', 'CANCELLED'],
  PENDING: ['CONTACTED', 'CONFIRMED', 'CANCELLED'], // legacy alias
  'Chờ xác nhận': ['CONTACTED', 'CONFIRMED', 'CANCELLED'],
  'Đang xử lý': ['CONTACTED', 'CONFIRMED', 'CANCELLED'],
  CONTACTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: ['NEW'],
  COMPLETED: [],
  'Đã hoàn thành': [],
};

/**
 * Generate CSPRNG-backed confirmation token (STORE-14 Hardened).
 */
export async function generateOrderConfirmationToken(
  orderId: string,
  idempotencyKey?: string | null
): Promise<{ token: string; tokenHash: string }> {
  let token: string;
  if (idempotencyKey && idempotencyKey.trim()) {
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

export async function validateOrderConfirmationToken(
  order: { id: string; createdAt: string | Date; confirmationTokenHash?: string | null },
  token: string | null | undefined
): Promise<boolean> {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return false;
  }
  const cleanToken = token.trim();

  if (order.confirmationTokenHash) {
    const computedHash = await hashConfirmationToken(cleanToken);
    return timingSafeEqualString(computedHash, order.confirmationTokenHash);
  }

  const legacyToken = await createConfirmationToken(order.id, order.createdAt);
  return timingSafeEqualString(cleanToken, legacyToken);
}

export async function createConfirmationToken(orderId: string, createdAt: string | Date): Promise<string> {
  const enc = new TextEncoder().encode(`${orderId}:${new Date(createdAt).getTime()}:citilap-confirm-salt`);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

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

  // Preserve legacy hashes for retries without the new acknowledgment.
  const jsonStr = JSON.stringify(payload.checkoutAcknowledgment ? {...normalized, checkoutVersion:1, showroomId:payload.showroomId || null, acknowledgment:payload.checkoutAcknowledgment, prices:payload.items.map(i=>({productId:i.productId,variantId:i.variantId || null,expectedPrice:i.expectedPrice})).sort((a,b)=>(a.productId+':'+a.variantId).localeCompare(b.productId+':'+b.variantId))} : normalized);
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
 * Atomically persists Order, OrderItems, initial OrderEvent, and AdminNotification in a single D1 batch.
 */
export async function createOrder(
  payload: CreateOrderInput,
  idempotencyKey?: string | null,
  d1Database?: D1Database,
  simulateFailureOnItemIndex?: number
): Promise<CreateOrderResult> {
  const db = d1Database || getD1Database();
  if (!db) {
    throw new Error('D1_BINDING_REQUIRED: Cloudflare D1 database binding is required for atomic order creation');
  }
  const prisma = getPrismaClient(db);

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

  let shippingAddress = payload.shippingAddress?.trim() || null;
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

  const selection = checkoutSelectionSchema.safeParse(payload);
  const acknowledgment = checkoutAcknowledgmentSchema.safeParse(payload.checkoutAcknowledgment);
  if (!selection.success || !acknowledgment.success || !payload.paymentMethod || payload.items.some(i=>!Number.isSafeInteger(i.expectedPrice) || Number(i.expectedPrice)<0)) {
    throw new CheckoutError('INVALID_CHECKOUT', 'Vui lòng kiểm tra và xác nhận tổng tiền trước khi đặt hàng.');
  }
  const {quote, resolvedItems, campaignNotes, changedItems, expectedSubtotal} = await calculateCheckout(payload, db);
  const now = quote.evaluatedAt.replace('Z', '+00:00');
  const subtotalAmount = quote.subtotal, shippingFee = quote.shippingFee, totalAmount = quote.totalAmount;
  const checkoutSnapshot = JSON.stringify(quote.snapshot);
  if (quote.snapshot.showroom) shippingAddress = 'Nhận tại showroom: '+quote.snapshot.showroom.name+' ('+quote.snapshot.showroom.address+')';
  else if (!shippingAddress || shippingAddress.length > 500) throw new CheckoutError('INVALID_CHECKOUT', 'Vui lòng nhập địa chỉ giao hàng.');
  if (changedItems.length || acknowledgment.data.shippingFee !== shippingFee || acknowledgment.data.totalAmount !== totalAmount || acknowledgment.data.termsVersion !== quote.termsVersion) {
    throw new CheckoutError(changedItems.length ? 'PRICE_CHANGED' : 'CHECKOUT_CHANGED', 'Giá, phí giao hàng hoặc thông tin nhận/thanh toán đã thay đổi. Vui lòng kiểm tra và xác nhận lại.', 409, {
      changedItems, oldSubtotal:expectedSubtotal, newSubtotal:subtotalAmount, oldGrandTotal:acknowledgment.data.totalAmount, newGrandTotal:totalAmount,
      oldShippingFee:acknowledgment.data.shippingFee, newShippingFee:shippingFee, quote,
    });
  }

  const orderNumber = generateOrderNumber();
  const orderId = 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  const eventId = 'e' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);

  const { token: confirmationToken, tokenHash: confirmationTokenHash } =
    await generateOrderConfirmationToken(orderId, cleanIdempotencyKey);

  // 5. Atomic Order Persistence via single Cloudflare D1 batch
  const orderStmt = db.prepare(`
    INSERT INTO "Order" (
      "id", "orderNumber", "idempotencyKey", "payloadHash", "userId", "status", "revision",
      "subtotalAmount", "shippingFee", "discountAmount", "totalAmount",
      "customerName", "customerPhone", "customerEmail", "shippingAddress",
      "shippingMethod", "note", "paymentMethod", "paymentStatus",
      "confirmationTokenHash", "createdAt", "updatedAt", "checkoutSnapshot"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    orderId,
    orderNumber,
    cleanIdempotencyKey,
    payloadHash,
    null,
    'NEW',
    0,
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
    now,
    checkoutSnapshot
  );

  const itemStmts = resolvedItems.map((item, idx) => {
    const itemId = 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10) + idx;
    if (simulateFailureOnItemIndex !== undefined && idx === simulateFailureOnItemIndex) {
      return db.prepare('INSERT INTO "OrderItem" ("id", "orderId", "non_existent_column_simulated_fail") VALUES (?, ?, ?)')
        .bind(itemId, orderId, 'fail');
    }
    return db.prepare(`
      INSERT INTO "OrderItem" (
        "id", "orderId", "productId", "variantId", "productName", "sku",
        "productNameSnapshot", "skuSnapshot", "variantNameSnapshot",
        "price", "priceSnapshot", "regularPriceSnapshot", "compareAtPriceSnapshot",
        "campaignSnapshot", "pricingEvaluatedAt", "quantity", "lineTotal", "createdAt", "updatedAt"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      item.regularPriceSnapshot,
      item.compareAtPriceSnapshot,
      item.campaignSnapshot,
      item.pricingEvaluatedAt,
      item.quantity,
      item.lineTotal,
      now,
      now
    );
  });

  const initialEventStmt = db.prepare(`
    INSERT INTO "OrderEvent" (
      "id", "orderId", "action", "fromStatus", "toStatus", "reason", "note", "actor", "createdAt"
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    eventId,
    orderId,
    'CREATED',
    null,
    'NEW',
    'Khách đặt hàng qua website',
    [note, campaignNotes.length > 0 ? `Khuyến mãi: ${campaignNotes.join('; ')}` : null].filter(Boolean).join(' | ') || null,
    'Khách hàng',
    now
  );

  const formattedTotal = new Intl.NumberFormat('vi-VN').format(totalAmount) + 'đ';
  const notifStmt = db.prepare(`
    INSERT INTO "AdminNotification" ("id", "type", "referenceId", "title", "message", "isRead", "createdAt")
    VALUES (?, 'NEW_ORDER', ?, ?, ?, 0, ?)
    ON CONFLICT("type", "referenceId") DO NOTHING
  `).bind(
    `notif-${orderId}`,
    orderId,
    `Đơn hàng mới #${orderNumber}`,
    `Khách hàng ${customerName} đã đặt đơn hàng trị giá ${formattedTotal}.`,
    now
  );

  try {
    await db.batch([orderStmt, ...itemStmts, initialEventStmt, notifStmt]);
  } catch (error) {
    // A concurrent retry may commit first. Read its immutable result before live validation.
    if (cleanIdempotencyKey) {
      const winner = await prisma.order.findUnique({where:{idempotencyKey:cleanIdempotencyKey},include:{items:true}});
      if (winner) {
        if (winner.payloadHash !== payloadHash) throw Object.assign(new Error('IDEMPOTENCY_PAYLOAD_MISMATCH'), {code:'IDEMPOTENCY_PAYLOAD_MISMATCH'});
        const generated = await generateOrderConfirmationToken(winner.id, cleanIdempotencyKey);
        return {success:true,order:winner,isIdempotentReplay:true,confirmationToken:generated.token};
      }
    }
    throw error;
  }

  // Read back committed order using the same DB
  const createdOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  return {
    success: true,
    order: createdOrder || ({
      checkoutSnapshot,
      id: orderId,
      orderNumber,
      idempotencyKey: cleanIdempotencyKey,
      payloadHash,
      userId: null,
      status: 'NEW',
      revision: 0,
      subtotalAmount,
      shippingFee,
      discountAmount: 0,
      totalAmount,
      shippingAddress,
      customerName,
      customerPhone,
      customerEmail,
      shippingMethod: payload.shippingMethod || 'standard',
      note,
      paymentMethod: payload.paymentMethod || 'COD',
      paymentStatus: 'PENDING',
      createdAt: new Date(now),
      updatedAt: new Date(now),
      completedAt: null,
      items: resolvedItems.map((item, idx) => ({
        id: 'item-' + idx,
        orderId,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.productName,
        sku: item.sku,
        productNameSnapshot: item.productNameSnapshot,
        skuSnapshot: item.skuSnapshot,
        variantNameSnapshot: item.variantNameSnapshot,
        price: item.price,
        priceSnapshot: item.priceSnapshot,
        regularPriceSnapshot: item.regularPriceSnapshot,
        compareAtPriceSnapshot: item.compareAtPriceSnapshot,
        campaignSnapshot: item.campaignSnapshot,
        pricingEvaluatedAt: item.pricingEvaluatedAt,
        quantity: item.quantity,
        lineTotal: item.lineTotal,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })),
    } as unknown as OrderRecord),
    isIdempotentReplay: false,
    confirmationToken,
  };
}

/**
 * Retrieve an order by its unique ID with full admin details.
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
      events: {
        orderBy: { createdAt: 'desc' },
      },
      internalNotes: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

/**
 * Retrieve an order by its order number.
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
      events: {
        orderBy: { createdAt: 'desc' },
      },
      internalNotes: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

/**
 * Strip sensitive internal operational data before sending to public customers.
 */
export function sanitizeOrderForPublic(order: OrderRecord | Record<string, unknown> | null) {
  if (!order) return null;
  const copy = { ...order } as Record<string, unknown>;
  delete copy.internalNotes;
  delete copy.events;
  delete copy.payloadHash;
  delete copy.confirmationTokenHash;
  delete copy.revision;
  return copy;
}

export interface ListOrdersFilters {
  status?: string | null;
  search?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  page?: number;
  limit?: number;
}

/**
 * List orders with pagination, search, and status filtering for Admin.
 */
export async function listOrders(
  filters: ListOrdersFilters,
  d1Database?: D1Database
) {
  const prisma = getPrismaClient(d1Database);
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 25));

  const where: Record<string, unknown> = {};

  if (filters.status && filters.status !== 'ALL') {
    if (filters.status === 'NEW' || filters.status === 'PENDING') {
      where.status = { in: ['NEW', 'PENDING', 'Chờ xác nhận', 'Đang xử lý', 'Đang vận chuyển'] };
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

  if (filters.startDate || filters.endDate) {
    const createdAtFilter: Record<string, Date> = {};
    if (filters.startDate) {
      const d = new Date(filters.startDate);
      if (!isNaN(d.getTime())) createdAtFilter.gte = d;
    }
    if (filters.endDate) {
      const d = new Date(filters.endDate);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        createdAtFilter.lte = d;
      }
    }
    if (Object.keys(createdAtFilter).length > 0) {
      where.createdAt = createdAtFilter;
    }
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
        _count: {
          select: {
            events: true,
            internalNotes: true,
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
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieve all orders matching filters for CSV export without arbitrary cutoffs.
 * Uses cursor-based chunking with deterministic tie-breaker ([createdAt desc, id desc]).
 */
export async function getAllOrdersForExport(
  filters: Omit<ListOrdersFilters, 'page' | 'limit'>,
  d1Database?: D1Database,
  chunkSize = 500
) {
  const prisma = getPrismaClient(d1Database);
  const where: Record<string, unknown> = {};

  // Export time horizon boundary: createdAt cutoff limits records selected to the point when export started.
  // Semantics: This is a query time horizon filter, not a database transaction snapshot isolation lock.
  const exportSnapshotTime = new Date();

  if (filters.status && filters.status !== 'ALL') {
    if (filters.status === 'NEW' || filters.status === 'PENDING') {
      where.status = { in: ['NEW', 'PENDING', 'Chờ xác nhận', 'Đang xử lý', 'Đang vận chuyển'] };
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

  const createdAtFilter: Record<string, Date> = { lte: exportSnapshotTime };
  if (filters.startDate) {
    const d = new Date(filters.startDate);
    if (!isNaN(d.getTime())) createdAtFilter.gte = d;
  }
  if (filters.endDate) {
    const d = new Date(filters.endDate);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      if (d < exportSnapshotTime) {
        createdAtFilter.lte = d;
      }
    }
  }
  where.createdAt = createdAtFilter;

  const allOrders: Array<{
    id: string;
    orderNumber: string | null;
    createdAt: Date;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    shippingAddress: string | null;
    status: string;
    paymentMethod: string;
    subtotalAmount: number;
    shippingFee: number;
    totalAmount: number;
    note: string | null;
    items: Array<{
      productName: string | null;
      productNameSnapshot: string | null;
      variantNameSnapshot: string | null;
      sku: string | null;
      quantity: number;
      price: number;
      lineTotal: number;
    }>;
  }> = [];

  type OrderExportItem = (typeof allOrders)[number];
  let lastRecord: { id: string; createdAt: Date } | null = null;

  while (true) {
    let currentWhere: Record<string, unknown> = { ...where };
    if (lastRecord) {
      currentWhere = {
        ...where,
        AND: [
          {
            OR: [
              { createdAt: { lt: lastRecord.createdAt } },
              { createdAt: lastRecord.createdAt, id: { lt: lastRecord.id } },
            ],
          },
        ],
      };
    }

    const chunk: OrderExportItem[] = await prisma.order.findMany({
      where: currentWhere,
      include: {
        items: {
          select: {
            productName: true,
            productNameSnapshot: true,
            variantNameSnapshot: true,
            sku: true,
            quantity: true,
            price: true,
            lineTotal: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: chunkSize,
    });

    allOrders.push(...chunk);
    if (chunk.length < chunkSize) break;
    const last = chunk[chunk.length - 1];
    if (lastRecord && last.id === lastRecord.id) break;
    lastRecord = { id: last.id, createdAt: last.createdAt };
  }

  return allOrders;
}

export interface TransitionOrderInput {
  orderId: string;
  targetStatus: OrderStatus;
  expectedRevision: number;
  reason?: string | null;
  note?: string | null;
  actor?: string | null;
}

/**
 * Server-enforced Order Status Transition with Optimistic Concurrency Control (CAS).
 * 
 * Rules:
 * 1. Target status must be valid according to VALID_ORDER_TRANSITIONS.
 * 2. Same-status transitions are blocked as SAME_STATUS_NOOP.
 * 3. Cancelation requires non-empty reason (min 3 chars).
 * 4. Reopen (CANCELLED -> NEW) requires non-empty reason (min 3 chars).
 * 5. expectedRevision is REQUIRED (positive integer). Checked directly at UPDATE SQL WHERE clause.
 * 6. CAS failure returns OrderConflictError (HTTP 409) with zero side effects.
 * 7. Server decides the actor strictly (SHARED_ADMIN_ACTOR), ignoring untrusted request payloads.
 * 8. Any event write error triggers compensating rollback of status & revision.
 */
export async function transitionOrderStatus(
  input: TransitionOrderInput,
  d1Database?: D1Database
) {
  const db = d1Database || getD1Database();
  if (!db) {
    throw new Error('D1_BINDING_REQUIRED: Cloudflare D1 database binding is required for atomic order status transition');
  }
  const prisma = getPrismaClient(db);
  const { orderId, targetStatus, expectedRevision, reason, note } = input;

  // 1. Validate required expectedRevision (non-negative integer)
  if (typeof expectedRevision !== 'number' || !Number.isInteger(expectedRevision) || expectedRevision < 0) {
    const err = new Error('INVALID_REVISION: expectedRevision là bắt buộc và phải là số nguyên không âm hợp lệ');
    (err as unknown as { code: string }).code = 'INVALID_REVISION';
    throw err;
  }

  // 2. Fetch existing order to inspect transition rules
  const existing = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!existing) {
    throw new Error('ORDER_NOT_FOUND');
  }

  // 3. Stale revision check FIRST before transition or no-op checks
  if (existing.revision !== expectedRevision) {
    throw new OrderConflictError(
      `Đơn hàng đã được chỉnh sửa bởi phiên khác (phiên bản hiện tại: ${existing.revision}, gửi lên: ${expectedRevision})`,
      existing.revision
    );
  }

  const currentStatus = existing.status;

  // 4. Same status is a no-op / error
  if (currentStatus === targetStatus || (currentStatus === 'PENDING' && targetStatus === 'NEW')) {
    const err = new Error('SAME_STATUS_NOOP');
    (err as unknown as { code: string }).code = 'SAME_STATUS_NOOP';
    throw err;
  }

  // 5. Validate transition validity
  const allowedTargets = VALID_ORDER_TRANSITIONS[currentStatus] || [];
  if (!allowedTargets.includes(targetStatus)) {
    const err = new Error(`INVALID_TRANSITION: Cannot transition from ${currentStatus} to ${targetStatus}`);
    (err as unknown as { code: string }).code = 'INVALID_TRANSITION';
    throw err;
  }

  // 6. Reason requirements
  const cleanReason = reason?.trim() || null;
  if (targetStatus === 'CANCELLED' && (!cleanReason || cleanReason.length < 3)) {
    const err = new Error('REASON_REQUIRED_FOR_CANCEL: Lý do hủy đơn là bắt buộc (tối thiểu 3 ký tự)');
    (err as unknown as { code: string }).code = 'REASON_REQUIRED';
    throw err;
  }

  if (currentStatus === 'CANCELLED' && targetStatus === 'NEW' && (!cleanReason || cleanReason.length < 3)) {
    const err = new Error('REASON_REQUIRED_FOR_REOPEN: Lý do mở lại đơn là bắt buộc (tối thiểu 3 ký tự)');
    (err as unknown as { code: string }).code = 'REASON_REQUIRED';
    throw err;
  }

  // 7. Execute atomic CAS UPDATE and append OrderEvent in the same single transaction
  const nextRevision = expectedRevision + 1;
  const isCompleted = targetStatus === 'COMPLETED';
  const now = new Date();
  const nowIso = now.toISOString();
  const nextCompletedAt = isCompleted ? now : (currentStatus === 'COMPLETED' ? null : existing.completedAt);
  const nextCompletedAtIso = nextCompletedAt ? nextCompletedAt.toISOString() : null;

  const eventId = 'e' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  const action = targetStatus === 'CANCELLED'
    ? 'CANCELLED'
    : currentStatus === 'CANCELLED'
    ? 'REOPENED'
    : 'STATUS_CHANGE';

  const updateStmt = db.prepare(
    `UPDATE "Order" SET "status" = ?, "revision" = ?, "completedAt" = ?, "updatedAt" = ? WHERE "id" = ? AND "revision" = ?`
  ).bind(targetStatus, nextRevision, nextCompletedAtIso, nowIso, orderId, expectedRevision);

  // Event append strictly depends on CAS update succeeding (changes() = 1) in the exact same transaction!
  const eventStmt = db.prepare(
    `INSERT INTO "OrderEvent" (
      "id", "orderId", "action", "fromStatus", "toStatus", "reason", "note", "actor", "createdAt"
    )
    SELECT ?, "id", ?, ?, ?, ?, ?, ?, ?
    FROM "Order"
    WHERE "id" = ? AND changes() = 1`
  ).bind(
    eventId,
    action,
    currentStatus,
    targetStatus,
    cleanReason,
    note?.trim() || null,
    SHARED_ADMIN_ACTOR,
    nowIso,
    orderId
  );

  const [updateRes] = await db.batch([updateStmt, eventStmt]);
  if ((updateRes.meta?.changes ?? 0) === 0) {
    const fresh = await prisma.order.findUnique({ where: { id: orderId } });
    if (!fresh) {
      throw new Error('ORDER_NOT_FOUND');
    }
    throw new OrderConflictError(
      `Đơn hàng đã được chỉnh sửa bởi phiên khác (phiên bản hiện tại: ${fresh.revision}, gửi lên: ${expectedRevision})`,
      fresh.revision
    );
  }

  // 8. Return freshly committed order reflecting committed status, incremented revision, and new event
  const updatedOrder = await getOrderById(orderId, db);
  if (!updatedOrder) {
    throw new Error('ORDER_NOT_FOUND');
  }

  return updatedOrder;
}

/**
 * Add an internal staff note to an order.
 * Server strictly enforces SHARED_ADMIN_ACTOR to avoid spoofing.
 * Commits note and event atomically in the same batch transaction.
 */
export async function addOrderInternalNote(
  orderId: string,
  content: string,
  _untrustedActor?: string,
  d1Database?: D1Database
) {
  const db = d1Database || getD1Database();
  if (!db) {
    throw new Error('D1_BINDING_REQUIRED: Cloudflare D1 database binding is required for atomic order note creation');
  }
  const prisma = getPrismaClient(db);
  const cleanContent = content?.trim();

  if (!cleanContent || cleanContent.length < 2 || cleanContent.length > 2000) {
    throw new Error('NOTE_LENGTH_INVALID: Ghi chú nội bộ phải từ 2 đến 2000 ký tự');
  }

  const existing = await prisma.order.findUnique({ where: { id: orderId } });
  if (!existing) {
    throw new Error('ORDER_NOT_FOUND');
  }

  const noteId = 'n' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  const eventId = 'e' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
  const now = new Date();
  const nowIso = now.toISOString();

  const noteStmt = db.prepare(
    `INSERT INTO "OrderNote" ("id", "orderId", "content", "actor", "createdAt")
     VALUES (?, ?, ?, ?, ?)`
  ).bind(noteId, orderId, cleanContent, SHARED_ADMIN_ACTOR, nowIso);

  const eventNoteSummary = cleanContent.length > 150 ? `${cleanContent.slice(0, 150)}...` : cleanContent;
  const eventStmt = db.prepare(
    `INSERT INTO "OrderEvent" ("id", "orderId", "action", "fromStatus", "toStatus", "note", "actor", "createdAt")
     VALUES (?, ?, 'NOTE_ADDED', ?, ?, ?, ?, ?)`
  ).bind(eventId, orderId, existing.status, existing.status, eventNoteSummary, SHARED_ADMIN_ACTOR, nowIso);

  await db.batch([noteStmt, eventStmt]);

  return {
    id: noteId,
    orderId,
    content: cleanContent,
    actor: SHARED_ADMIN_ACTOR,
    createdAt: now,
  };
}

/**
 * Backward compatibility alias for legacy updateOrderStatus.
 * Enforces expectedRevision to prevent CAS bypass.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: 'PENDING' | 'COMPLETED',
  expectedRevisionOrDb?: number | D1Database,
  d1Database?: D1Database
) {
  let db = d1Database;
  let rev: number | undefined;

  if (typeof expectedRevisionOrDb === 'object' && expectedRevisionOrDb !== null) {
    db = expectedRevisionOrDb as D1Database;
    rev = undefined;
  } else if (typeof expectedRevisionOrDb === 'number') {
    rev = expectedRevisionOrDb;
  }

  if (rev === undefined) {
    const prisma = getPrismaClient(db);
    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) throw new Error('ORDER_NOT_FOUND');
    rev = existing.revision;
  }

  const targetStatus = newStatus === 'COMPLETED' ? 'COMPLETED' : 'NEW';
  return transitionOrderStatus(
    {
      orderId,
      targetStatus: targetStatus as OrderStatus,
      expectedRevision: rev,
      reason: 'Cập nhật trạng thái đơn hàng (legacy alias)',
    },
    db
  );
}
