import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from 'next/server';
import { requireAdmin, requireAdminMutation } from '@/lib/auth';
import { getPrismaClient, getD1Database } from '@/lib/prisma';
import { adminActor, adminAuditStatements } from '@/server/admin-context';
import {
  getOrderById,
  transitionOrderStatus,
  addOrderInternalNote,
  validateOrderConfirmationToken,
  OrderConflictError,
  OrderStatus,
  SHARED_ADMIN_ACTOR,
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

    // Admin view has full access (including events, internalNotes, revision, and available serial units)
    const db = getD1Database();
    let availableSerials: Array<{
      id: string;
      productId: string;
      serialNumber: string;
      status: string;
      condition: string;
      warrantyMonths: number;
      warehouseName: string | null;
      publicCode: string | null;
    }> = [];
    if (db && order.items.length > 0) {
      const productIds = Array.from(new Set(order.items.map((it) => it.productId).filter(Boolean)));
      const assignedIds = order.items.map((it) => it.serialUnitId).filter((x): x is string => Boolean(x));
      if (productIds.length > 0) {
        const prodPlaceholders = productIds.map(() => '?').join(',');
        const assignClause =
          assignedIds.length > 0
            ? `OR su.id IN (${assignedIds.map(() => '?').join(',')})`
            : '';
        const rows = await db
          .prepare(
            `SELECT su.id, su.productId, su.serialNumber, su.status, su.condition, su.warrantyMonths,
                    w.name AS warehouseName, pi.publicCode
             FROM SerialUnit su
             LEFT JOIN Warehouse w ON w.id = su.warehouseId
             LEFT JOIN ProductInspection pi ON pi.serialUnitId = su.id
             WHERE su.productId IN (${prodPlaceholders})
               AND (su.status = 'AVAILABLE' ${assignClause})
             ORDER BY su.createdAt DESC`
          )
          .bind(...productIds, ...assignedIds)
          .all<{
            id: string;
            productId: string;
            serialNumber: string;
            status: string;
            condition: string;
            warrantyMonths: number;
            warehouseName: string | null;
            publicCode: string | null;
          }>();
        availableSerials = rows.results || [];
      }
    }

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

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    // Handle internal note addition shortcut (server enforces SHARED_ADMIN_ACTOR)
    if (data.action === 'ADD_NOTE' && typeof data.content === 'string') {
      const note = await addOrderInternalNote(params.id, data.content);
      return NextResponse.json({ success: true, data: note });
    }

    // Handle SerialUnit assignment for an OrderItem
    if (data.action === 'ASSIGN_SERIAL' && typeof data.orderItemId === 'string') {
      const db = getD1Database();
      if (!db) {
        return NextResponse.json({ success: false, error: 'D1 binding required' }, { status: 500 });
      }
      const prisma = getPrismaClient(db);
      const existingOrder = await prisma.order.findUnique({
        where: { id: params.id },
        include: { items: true },
      });
      if (!existingOrder) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      const orderItem = existingOrder.items.find((it) => it.id === data.orderItemId);
      if (!orderItem) {
        return NextResponse.json({ success: false, error: 'Order item not found' }, { status: 404 });
      }

      const nextSerialUnitId =
        typeof data.serialUnitId === 'string' && data.serialUnitId.trim()
          ? data.serialUnitId.trim()
          : null;
      const prevSerialUnitId = orderItem.serialUnitId || null;

      if (nextSerialUnitId !== prevSerialUnitId) {
        const nowIso = new Date().toISOString();
        const stmts = [];

        if (prevSerialUnitId) {
          stmts.push(
            db
              .prepare(`UPDATE SerialUnit SET status = 'AVAILABLE', updatedAt = ? WHERE id = ?`)
              .bind(nowIso, prevSerialUnitId)
          );
        }

        let serialLabel = 'Gỡ gán Serial';
        if (nextSerialUnitId) {
          const targetUnit = await db
            .prepare(
              `SELECT su.id, su.serialNumber, pi.publicCode
               FROM SerialUnit su
               LEFT JOIN ProductInspection pi ON pi.serialUnitId = su.id
               WHERE su.id = ?`
            )
            .bind(nextSerialUnitId)
            .first<{ id: string; serialNumber: string; publicCode: string | null }>();
          if (!targetUnit) {
            return NextResponse.json({ success: false, error: 'Serial unit not found' }, { status: 404 });
          }
          const nextSerialStatus = existingOrder.status === 'COMPLETED' ? 'SOLD' : 'RESERVED';
          stmts.push(
            db
              .prepare(`UPDATE SerialUnit SET status = ?, updatedAt = ? WHERE id = ?`)
              .bind(nextSerialStatus, nowIso, nextSerialUnitId)
          );
          serialLabel = `Gán máy Serial #${targetUnit.serialNumber}${
            targetUnit.publicCode ? ` (Mã kiểm định: ${targetUnit.publicCode})` : ''
          }`;
        }

        stmts.push(
          db
            .prepare(`UPDATE "OrderItem" SET "serialUnitId" = ?, "updatedAt" = ? WHERE "id" = ?`)
            .bind(nextSerialUnitId, nowIso, orderItem.id)
        );

        const eventId = 'e' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
        stmts.push(
          db
            .prepare(
              `INSERT INTO "OrderEvent" ("id", "orderId", "action", "fromStatus", "toStatus", "note", "actor", "createdAt")
               VALUES (?, ?, 'NOTE_ADDED', ?, ?, ?, ?, ?)`
            )
            .bind(
              eventId,
              params.id,
              existingOrder.status,
              existingOrder.status,
              `${serialLabel} cho sản phẩm "${orderItem.productNameSnapshot || orderItem.productName || 'SP'}"`,
              adminActor(SHARED_ADMIN_ACTOR),
              nowIso
            ),
          ...adminAuditStatements(db, 'order.assign_serial', params.id, serialLabel, eventId)
        );

        await db.batch(stmts);
      }

      const freshOrder = await getOrderById(params.id, db);
      const productIds = Array.from(new Set((freshOrder?.items || []).map((it) => it.productId).filter(Boolean)));
      const assignedIds = (freshOrder?.items || []).map((it) => it.serialUnitId).filter((x): x is string => Boolean(x));
      let availableSerials: unknown[] = [];
      if (productIds.length > 0) {
        const prodPlaceholders = productIds.map(() => '?').join(',');
        const assignClause =
          assignedIds.length > 0
            ? `OR su.id IN (${assignedIds.map(() => '?').join(',')})`
            : '';
        const rows = await db
          .prepare(
            `SELECT su.id, su.productId, su.serialNumber, su.status, su.condition, su.warrantyMonths,
                    w.name AS warehouseName, pi.publicCode
             FROM SerialUnit su
             LEFT JOIN Warehouse w ON w.id = su.warehouseId
             LEFT JOIN ProductInspection pi ON pi.serialUnitId = su.id
             WHERE su.productId IN (${prodPlaceholders})
               AND (su.status = 'AVAILABLE' ${assignClause})
             ORDER BY su.createdAt DESC`
          )
          .bind(...productIds, ...assignedIds)
          .all();
        availableSerials = rows.results || [];
      }

      return NextResponse.json({ success: true, data: { ...freshOrder, availableSerials } });
    }

    // Handle paymentStatus & shippingFee update
    if (data.action === 'UPDATE_BILLING') {
      const db = getD1Database();
      if (!db) {
        return NextResponse.json({ success: false, error: 'D1 binding required' }, { status: 500 });
      }
      const prisma = getPrismaClient(db);
      const existing = await prisma.order.findUnique({ where: { id: params.id } });
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }
      const nextPaymentStatus =
        typeof data.paymentStatus === 'string' && ['PENDING', 'PAID', 'REFUNDED'].includes(data.paymentStatus)
          ? data.paymentStatus
          : existing.paymentStatus;
      const nextShippingFee =
        typeof data.shippingFee === 'number' && Number.isInteger(data.shippingFee) && data.shippingFee >= 0
          ? data.shippingFee
          : existing.shippingFee;
      const nextTotalAmount = Math.max(
        0,
        existing.subtotalAmount + nextShippingFee - (existing.discountAmount || 0)
      );
      const nowIso = new Date().toISOString();
      const eventId = 'e' + Date.now().toString(36) + Math.random().toString(36).substring(2, 10);

      const changesDesc: string[] = [];
      if (nextPaymentStatus !== existing.paymentStatus) {
        changesDesc.push(`Thanh toán: ${existing.paymentStatus} → ${nextPaymentStatus}`);
      }
      if (nextShippingFee !== existing.shippingFee) {
        changesDesc.push(
          `Phí ship: ${existing.shippingFee.toLocaleString('vi-VN')}đ → ${nextShippingFee.toLocaleString('vi-VN')}đ`
        );
      }

      if (changesDesc.length > 0) {
        const updateStmt = db
          .prepare(
            `UPDATE "Order" SET "paymentStatus" = ?, "shippingFee" = ?, "totalAmount" = ?, "updatedAt" = ? WHERE "id" = ?`
          )
          .bind(nextPaymentStatus, nextShippingFee, nextTotalAmount, nowIso, params.id);
        const eventStmt = db
          .prepare(
            `INSERT INTO "OrderEvent" ("id", "orderId", "action", "fromStatus", "toStatus", "note", "actor", "createdAt")
             VALUES (?, ?, 'NOTE_ADDED', ?, ?, ?, ?, ?)`
          )
          .bind(
            eventId,
            params.id,
            existing.status,
            existing.status,
            `Cập nhật thanh toán/vận chuyển: ${changesDesc.join(' | ')}`,
            adminActor(SHARED_ADMIN_ACTOR),
            nowIso
          );
        await db.batch([
          updateStmt,
          eventStmt,
          ...adminAuditStatements(db, 'order.billing_update', params.id, changesDesc.join('; '), eventId),
        ]);
      }

      const updatedOrder = await getOrderById(params.id, db);
      return NextResponse.json({ success: true, data: updatedOrder });
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

export const PATCH = withAdminContext(PUTHandler);

export const GET = withAdminContext(GETHandler);
export const PUT = withAdminContext(PUTHandler);
