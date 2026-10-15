import type { D1Database } from '@cloudflare/workers-types';
import { getPrismaClient, getD1Database } from '@/lib/prisma';

export interface AdminNotificationDto {
  id: string;
  type: string;
  referenceId: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface ListNotificationsOptions {
  onlyUnread?: boolean;
  unreadOnly?: boolean;
  limit?: number;
}

/**
 * Limited reconciliation for missing notifications in the last 24 hours.
 * Uses atomic ON CONFLICT DO NOTHING to guarantee:
 * - No duplicate notifications are created.
 * - Existing isRead / readAt statuses are NEVER reset.
 * - Old historical data is not flooded.
 */
export async function reconcileRecentNotifications(d1Database?: D1Database): Promise<void> {
  const db = d1Database || getD1Database();
  const prisma = getPrismaClient(db);
  // Reconcile window covers active orders and recent records (30 days) without rigid 24h cutoff
  const operationalHorizon = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  if (db) {
    try {
      // Reconcile orders missing notifications: active or within 30-day horizon
      await db.prepare(`
        INSERT INTO "AdminNotification" ("id", "type", "referenceId", "title", "message", "isRead", "createdAt")
        SELECT
          'notif-' || o.id,
          'NEW_ORDER',
          o.id,
          'Đơn hàng mới #' || COALESCE(o.orderNumber, substr(o.id, 1, 8)),
          'Khách hàng ' || o.customerName || ' đã đặt đơn hàng trị giá ' || o.totalAmount || 'đ.',
          0,
          o.createdAt
        FROM "Order" o
        WHERE o.status IN ('NEW', 'CONTACTED', 'CONFIRMED')
          AND o.createdAt >= ?
          AND NOT EXISTS (
            SELECT 1 FROM "AdminNotification" n
            WHERE n.type = 'NEW_ORDER' AND n.referenceId = o.id
          )
        ORDER BY o.createdAt DESC
        LIMIT 50
      `).bind(operationalHorizon.toISOString().replace('Z', '+00:00')).run();

      // Reconcile contact submissions missing notifications: active and within 30-day horizon
      await db.prepare(`
        INSERT INTO "AdminNotification" ("id", "type", "referenceId", "title", "message", "isRead", "createdAt")
        SELECT
          'notif-' || c.id,
          'NEW_CONTACT',
          c.id,
          'Liên hệ mới từ ' || c.name,
          'Khách hàng ' || c.name || ' (' || c.phone || ') đã gửi yêu cầu tư vấn.',
          0,
          c.createdAt
        FROM "ContactSubmission" c
        WHERE c.status IN ('PENDING', 'PROCESSING')
          AND c.createdAt >= ?
          AND NOT EXISTS (
            SELECT 1 FROM "AdminNotification" n
            WHERE n.type = 'NEW_CONTACT' AND n.referenceId = c.id
          )
        ORDER BY c.createdAt DESC
        LIMIT 50
      `).bind(operationalHorizon.toISOString().replace('Z', '+00:00')).run();
    } catch (err) {
      console.error('[NotificationService] D1 reconciliation error:', err);
    }
    return;
  }

  // Fallback via Prisma
  try {
    const unnotifiedOrders = await prisma.order.findMany({
      where: {
        status: { in: ['NEW', 'CONTACTED', 'CONFIRMED'] },
        createdAt: { gte: operationalHorizon },
      },
      select: { id: true, orderNumber: true, customerName: true, totalAmount: true, createdAt: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    for (const order of unnotifiedOrders) {
      const formattedAmount = new Intl.NumberFormat('vi-VN').format(order.totalAmount) + 'đ';
      const orderRef = order.orderNumber || order.id.slice(0, 8);
      await prisma.adminNotification.upsert({
        where: {
          type_referenceId: {
            type: 'NEW_ORDER',
            referenceId: order.id,
          },
        },
        create: {
          id: `notif-${order.id}`,
          type: 'NEW_ORDER',
          referenceId: order.id,
          title: `Đơn hàng mới #${orderRef}`,
          message: `Khách hàng ${order.customerName} đã đặt đơn hàng trị giá ${formattedAmount}.`,
          isRead: false,
          createdAt: order.createdAt,
        },
        update: {}, // DO NOTHING: preserve existing read status!
      });
    }

    const unnotifiedContacts = await prisma.contactSubmission.findMany({
      where: {
        OR: [
          { createdAt: { gte: operationalHorizon } },
          { status: { in: ['PENDING', 'PROCESSING'] } },
        ],
      },
      select: { id: true, name: true, phone: true, createdAt: true },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    for (const contact of unnotifiedContacts) {
      await prisma.adminNotification.upsert({
        where: {
          type_referenceId: {
            type: 'NEW_CONTACT',
            referenceId: contact.id,
          },
        },
        create: {
          id: `notif-${contact.id}`,
          type: 'NEW_CONTACT',
          referenceId: contact.id,
          title: `Liên hệ mới từ ${contact.name}`,
          message: `Khách hàng ${contact.name} (${contact.phone}) đã gửi yêu cầu tư vấn.`,
          isRead: false,
          createdAt: contact.createdAt,
        },
        update: {}, // DO NOTHING: preserve existing read status!
      });
    }
  } catch (err) {
    console.error('[NotificationService] Prisma reconciliation error:', err);
  }
}

/**
 * List recent admin notifications and return unread count.
 * Operational Inbox semantics: "Đã đọc chung" (Shared operational mailbox).
 * Automatically reconciles unnotified records from the last 24h.
 */
export async function listAdminNotifications(
  optionsOrDb?: ListNotificationsOptions | D1Database,
  optionsOrNothing?: ListNotificationsOptions,
  d1Database?: D1Database
): Promise<{ notifications: AdminNotificationDto[]; unreadCount: number }> {
  let db: D1Database | undefined = d1Database;
  let opts: ListNotificationsOptions = {};

  if (optionsOrDb && typeof optionsOrDb === 'object') {
    if ('prepare' in optionsOrDb) {
      db = optionsOrDb as D1Database;
      opts = optionsOrNothing || {};
    } else {
      opts = optionsOrDb as ListNotificationsOptions;
      if (optionsOrNothing && typeof optionsOrNothing === 'object' && 'prepare' in optionsOrNothing) {
        db = optionsOrNothing as unknown as D1Database;
      }
    }
  }

  // Automatic limited reconciliation for recent 24h
  try {
    await reconcileRecentNotifications(db);
  } catch (reconcileErr) {
    console.warn('[NotificationService] Reconcile warning:', reconcileErr);
  }

  const prisma = getPrismaClient(db);
  const limit = Math.min(50, Math.max(1, opts.limit || 20));
  const isUnread = Boolean(opts.onlyUnread || opts.unreadOnly);

  const where: Record<string, unknown> = {};
  if (isUnread) {
    where.isRead = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.adminNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.adminNotification.count({
      where: { isRead: false },
    }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      id: n.id,
      type: n.type,
      referenceId: n.referenceId,
      title: n.title,
      message: n.message,
      isRead: Boolean(n.isRead),
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    })),
    unreadCount,
  };
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(
  id: string,
  d1Database?: D1Database
): Promise<{ success: boolean; notification?: AdminNotificationDto }> {
  const prisma = getPrismaClient(d1Database);

  const existing = await prisma.adminNotification.findUnique({
    where: { id },
  });

  if (!existing) {
    return { success: false };
  }

  const updated = await prisma.adminNotification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    success: true,
    notification: {
      id: updated.id,
      type: updated.type,
      referenceId: updated.referenceId,
      title: updated.title,
      message: updated.message,
      isRead: true,
      readAt: updated.readAt?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

/**
 * Mark all unread notifications as read.
 */
export async function markAllNotificationsAsRead(
  d1Database?: D1Database
): Promise<{ count: number }> {
  const prisma = getPrismaClient(d1Database);

  const result = await prisma.adminNotification.updateMany({
    where: { isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return { count: result.count };
}

/**
 * Idempotently create an admin notification when a new order is placed.
 * Uses (type, referenceId) unique constraint to prevent duplicate alerts on checkout replays.
 * Retries up to 2 times on transient failures.
 */
export async function createOrderNotification(
  orderOrId: string | { id: string; orderNumber: string | null; customerName: string; totalAmount: number },
  orderNumberOrDb?: string | null | D1Database,
  customerName?: string,
  totalAmount?: number,
  d1Database?: D1Database
): Promise<void> {
  let orderId: string;
  let orderRef: string;
  let custName: string;
  let amount: number;
  let db: D1Database | undefined = d1Database;

  if (typeof orderOrId === 'object') {
    orderId = orderOrId.id;
    orderRef = orderOrId.orderNumber || orderOrId.id.slice(0, 8);
    custName = orderOrId.customerName;
    amount = orderOrId.totalAmount;
    if (orderNumberOrDb && typeof orderNumberOrDb === 'object') {
      db = orderNumberOrDb as D1Database;
    }
  } else {
    orderId = orderOrId;
    orderRef = (typeof orderNumberOrDb === 'string' && orderNumberOrDb) ? orderNumberOrDb : orderId.slice(0, 8);
    custName = customerName || 'Khách hàng';
    amount = totalAmount || 0;
  }

  const prisma = getPrismaClient(db);
  const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (db) {
        await db
          .prepare(`
            INSERT INTO "AdminNotification" ("id", "type", "referenceId", "title", "message", "isRead", "createdAt")
            VALUES (?, 'NEW_ORDER', ?, ?, ?, 0, CURRENT_TIMESTAMP)
            ON CONFLICT("type", "referenceId") DO NOTHING
          `)
          .bind(
            `notif-${orderId}`,
            orderId,
            `Đơn hàng mới #${orderRef}`,
            `Khách hàng ${custName} đã đặt đơn hàng trị giá ${formattedAmount}.`
          )
          .run();
        return;
      }

      await prisma.adminNotification.upsert({
        where: {
          type_referenceId: {
            type: 'NEW_ORDER',
            referenceId: orderId,
          },
        },
        create: {
          id: `notif-${orderId}`,
          type: 'NEW_ORDER',
          referenceId: orderId,
          title: `Đơn hàng mới #${orderRef}`,
          message: `Khách hàng ${custName} đã đặt đơn hàng trị giá ${formattedAmount}.`,
          isRead: false,
        },
        update: {},
      });
      return;
    } catch (err) {
      if (attempt === 2) {
        console.error('[NotificationService] Failed to create order notification after retry:', err);
      }
    }
  }
}

/**
 * Idempotently create an admin notification when a new contact inquiry is received.
 * Retries up to 2 times on transient failures.
 */
export async function createContactNotification(
  contactOrId: string | { id: string; name: string; phone: string },
  nameOrDb?: string | D1Database,
  phone?: string,
  d1Database?: D1Database
): Promise<void> {
  let contactId: string;
  let contactName: string;
  let contactPhone: string;
  let db: D1Database | undefined = d1Database;

  if (typeof contactOrId === 'object') {
    contactId = contactOrId.id;
    contactName = contactOrId.name;
    contactPhone = contactOrId.phone;
    if (nameOrDb && typeof nameOrDb === 'object') {
      db = nameOrDb as D1Database;
    }
  } else {
    contactId = contactOrId;
    contactName = typeof nameOrDb === 'string' ? nameOrDb : 'Khách hàng';
    contactPhone = phone || '';
  }

  const prisma = getPrismaClient(db);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      if (db) {
        await db
          .prepare(`
            INSERT INTO "AdminNotification" ("id", "type", "referenceId", "title", "message", "isRead", "createdAt")
            VALUES (?, 'NEW_CONTACT', ?, ?, ?, 0, CURRENT_TIMESTAMP)
            ON CONFLICT("type", "referenceId") DO NOTHING
          `)
          .bind(
            `notif-${contactId}`,
            contactId,
            `Liên hệ mới từ ${contactName}`,
            `Khách hàng ${contactName} (${contactPhone}) đã gửi yêu cầu tư vấn.`
          )
          .run();
        return;
      }

      await prisma.adminNotification.upsert({
        where: {
          type_referenceId: {
            type: 'NEW_CONTACT',
            referenceId: contactId,
          },
        },
        create: {
          id: `notif-${contactId}`,
          type: 'NEW_CONTACT',
          referenceId: contactId,
          title: `Liên hệ mới từ ${contactName}`,
          message: `Khách hàng ${contactName} (${contactPhone}) đã gửi yêu cầu tư vấn.`,
          isRead: false,
        },
        update: {},
      });
      return;
    } catch (err) {
      if (attempt === 2) {
        console.error('[NotificationService] Failed to create contact notification after retry:', err);
      }
    }
  }
}
