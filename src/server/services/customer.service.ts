import type { D1Database } from '@cloudflare/workers-types';
import { getPrismaClient } from '@/lib/prisma';

export interface CustomerSummaryDto {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  tier: string;
  nonCancelledTotal: number; // Tổng giá trị đơn không huỷ (status != 'CANCELLED')
  totalSpend: number; // Tương thích ngược với UI và code cũ (= nonCancelledTotal)
  totalOrders: number;
  lastOrder: string | null;
  createdAt: string;
  source: 'REGISTERED' | 'GUEST_ORDER';
  sourceLabel: string;
  orderNumber?: string | null; // Mã đơn tương ứng cho khách vãng lai
}

export interface CustomerDetailDto extends CustomerSummaryDto {
  orders: Array<{
    id: string;
    orderNumber: string | null;
    status: string;
    totalAmount: number;
    createdAt: string;
    itemsCount: number;
  }>;
  suggestedOrders?: Array<{
    id: string;
    orderNumber: string | null;
    customerName: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    itemsCount: number;
  }>;
  suggestedContacts: Array<{
    id: string;
    name: string;
    message: string | null;
    status: string;
    createdAt: string;
  }>;
  contacts?: Array<{
    id: string;
    message: string | null;
    status: string;
    createdAt: string;
  }>;
}

export interface ListCustomersFilters {
  search?: string | null;
  tier?: string | null;
  source?: string | null; // ALL, REGISTERED, GUEST_ORDER
  page?: number;
  limit?: number;
}

/**
 * List real customers from D1 database.
 * Explicitly separates registered User accounts and guest order customers.
 * Does NOT auto-merge or create fake accounts.
 * Calculates honest "Tổng giá trị đơn không hủy" (status != CANCELLED).
 * Does not clamp at 500 records.
 */
export async function listCustomers(
  filters: ListCustomersFilters,
  d1Database?: D1Database
): Promise<{
  customers: CustomerSummaryDto[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  const prisma = getPrismaClient(d1Database);
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 25));
  const skip = (page - 1) * limit;

  const registeredWhere: Record<string, unknown> = {
    role: 'USER',
  };

  if (filters.tier && filters.tier !== 'ALL') {
    if (filters.tier === 'Khách vãng lai') {
      // Khách vãng lai không thuộc User
      registeredWhere.id = '__NEVER_MATCH__';
    } else if (['Vàng', 'Bạc', 'Mới'].includes(filters.tier)) {
      registeredWhere.tier = filters.tier;
    }
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    registeredWhere.OR = [
      { name: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  const guestOrderWhere: Record<string, unknown> = {
    userId: null,
  };

  if (filters.tier && filters.tier !== 'ALL') {
    if (['Vàng', 'Bạc', 'Mới'].includes(filters.tier)) {
      // Khách vãng lai không có hạng Vàng/Bạc/Mới
      guestOrderWhere.id = '__NEVER_MATCH__';
    }
  }

  if (filters.search?.trim()) {
    const q = filters.search.trim();
    guestOrderWhere.OR = [
      { customerName: { contains: q } },
      { customerPhone: { contains: q } },
      { customerEmail: { contains: q } },
      { orderNumber: { contains: q } },
    ];
  }

  const shouldFetchRegistered = filters.source !== 'GUEST_ORDER' && registeredWhere.id !== '__NEVER_MATCH__';
  const shouldFetchGuest = filters.source !== 'REGISTERED' && guestOrderWhere.id !== '__NEVER_MATCH__';

  const [countReg, countGuest] = await Promise.all([
    shouldFetchRegistered ? prisma.user.count({ where: registeredWhere }) : Promise.resolve(0),
    shouldFetchGuest ? prisma.order.count({ where: guestOrderWhere }) : Promise.resolve(0),
  ]);

  const total = countReg + countGuest;
  const customers: CustomerSummaryDto[] = [];

  if (shouldFetchRegistered && !shouldFetchGuest) {
    // Only registered
    const users = await prisma.user.findMany({
      where: registeredWhere,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        tier: true,
        createdAt: true,
        orders: {
          select: { status: true, totalAmount: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    for (const u of users) {
      const nonCancelledTotal = u.orders
        .filter((o) => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + o.totalAmount, 0);

      customers.push({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        tier: u.tier,
        nonCancelledTotal,
        totalSpend: nonCancelledTotal,
        totalOrders: u.orders.length,
        lastOrder: u.orders[0]?.createdAt ? u.orders[0].createdAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        source: 'REGISTERED',
        sourceLabel: 'Tài khoản đăng ký',
      });
    }
  } else if (!shouldFetchRegistered && shouldFetchGuest) {
    // Only guests
    const orders = await prisma.order.findMany({
      where: guestOrderWhere,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    for (const o of orders) {
      const nonCancelledTotal = o.status !== 'CANCELLED' ? o.totalAmount : 0;
      customers.push({
        id: `guest-${o.id}`,
        name: o.customerName,
        email: o.customerEmail,
        phone: o.customerPhone,
        tier: 'Khách vãng lai',
        nonCancelledTotal,
        totalSpend: nonCancelledTotal,
        totalOrders: 1,
        lastOrder: o.createdAt.toISOString(),
        createdAt: o.createdAt.toISOString(),
        source: 'GUEST_ORDER',
        sourceLabel: 'Khách vãng lai (Đơn hàng)',
        orderNumber: o.orderNumber,
      });
    }
  } else if (shouldFetchRegistered && shouldFetchGuest) {
    // Both registered and guest: dual stream keyset/offset pagination
    if (skip < countReg) {
      const takeReg = Math.min(limit, countReg - skip);
      const users = await prisma.user.findMany({
        where: registeredWhere,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          tier: true,
          createdAt: true,
          orders: {
            select: { status: true, totalAmount: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: takeReg,
      });

      for (const u of users) {
        const nonCancelledTotal = u.orders
          .filter((o) => o.status !== 'CANCELLED')
          .reduce((sum, o) => sum + o.totalAmount, 0);

        customers.push({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          tier: u.tier,
          nonCancelledTotal,
          totalSpend: nonCancelledTotal,
          totalOrders: u.orders.length,
          lastOrder: u.orders[0]?.createdAt ? u.orders[0].createdAt.toISOString() : null,
          createdAt: u.createdAt.toISOString(),
          source: 'REGISTERED',
          sourceLabel: 'Tài khoản đăng ký',
        });
      }

      const takeGuest = limit - takeReg;
      if (takeGuest > 0) {
        const orders = await prisma.order.findMany({
          where: guestOrderWhere,
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            customerEmail: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: takeGuest,
        });

        for (const o of orders) {
          const nonCancelledTotal = o.status !== 'CANCELLED' ? o.totalAmount : 0;
          customers.push({
            id: `guest-${o.id}`,
            name: o.customerName,
            email: o.customerEmail,
            phone: o.customerPhone,
            tier: 'Khách vãng lai',
            nonCancelledTotal,
            totalSpend: nonCancelledTotal,
            totalOrders: 1,
            lastOrder: o.createdAt.toISOString(),
            createdAt: o.createdAt.toISOString(),
            source: 'GUEST_ORDER',
            sourceLabel: 'Khách vãng lai (Đơn hàng)',
            orderNumber: o.orderNumber,
          });
        }
      }
    } else {
      // skip >= countReg
      const guestSkip = skip - countReg;
      const orders = await prisma.order.findMany({
        where: guestOrderWhere,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: guestSkip,
        take: limit,
      });

      for (const o of orders) {
        const nonCancelledTotal = o.status !== 'CANCELLED' ? o.totalAmount : 0;
        customers.push({
          id: `guest-${o.id}`,
          name: o.customerName,
          email: o.customerEmail,
          phone: o.customerPhone,
          tier: 'Khách vãng lai',
          nonCancelledTotal,
          totalSpend: nonCancelledTotal,
          totalOrders: 1,
          lastOrder: o.createdAt.toISOString(),
          createdAt: o.createdAt.toISOString(),
          source: 'GUEST_ORDER',
          sourceLabel: 'Khách vãng lai (Đơn hàng)',
          orderNumber: o.orderNumber,
        });
      }
    }
  }

  return {
    customers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Fetch all matching customers for export via stable keyset pagination.
 * Defines clear snapshot scope (createdAt <= exportSnapshotTime) and deterministic tie-breaker ([createdAt desc, id desc]).
 * Never uses offset on mutating datasets; eliminates duplicates and skips.
 */
export async function getAllCustomersForExport(
  filters: { search?: string | null; tier?: string | null; source?: string | null },
  d1Database?: D1Database
): Promise<CustomerSummaryDto[]> {
  const prisma = getPrismaClient(d1Database);
  const chunkSize = 200;
  const exportSnapshotTime = new Date();
  const all: CustomerSummaryDto[] = [];

  const shouldIncludeRegistered = !filters.source || filters.source === 'ALL' || filters.source === 'REGISTERED';
  const shouldIncludeGuests =
    (!filters.source || filters.source === 'ALL' || filters.source === 'GUEST_ORDER') &&
    (!filters.tier || filters.tier === 'ALL' || filters.tier === 'Khách vãng lai');

  // Stream 1: Registered users with keyset pagination
  if (shouldIncludeRegistered) {
    const userWhere: Record<string, unknown> = {
      createdAt: { lte: exportSnapshotTime },
    };
    if (filters.tier && filters.tier !== 'ALL') {
      userWhere.tier = filters.tier;
    }
    if (filters.search?.trim()) {
      const s = filters.search.trim();
      userWhere.OR = [
        { name: { contains: s } },
        { email: { contains: s } },
        { phone: { contains: s } },
      ];
    }

    let lastUser: { id: string; createdAt: Date } | null = null;
    while (true) {
      let currentWhere: Record<string, unknown> = { ...userWhere };
      if (lastUser) {
        currentWhere = {
          ...userWhere,
          AND: [
            {
              OR: [
                { createdAt: { lt: lastUser.createdAt } },
                { createdAt: lastUser.createdAt, id: { lt: lastUser.id } },
              ],
            },
          ],
        };
      }

      const userChunk = await prisma.user.findMany({
        where: currentWhere,
        include: {
          orders: {
            select: { id: true, totalAmount: true, status: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: chunkSize,
      });

      for (const u of userChunk) {
        const nonCancelledTotal = u.orders
          .filter((o) => o.status !== 'CANCELLED')
          .reduce((sum, o) => sum + o.totalAmount, 0);

        all.push({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || 'Chưa cập nhật',
          tier: u.tier,
          nonCancelledTotal,
          totalSpend: nonCancelledTotal,
          totalOrders: u.orders.length,
          lastOrder: u.orders[0]?.createdAt ? u.orders[0].createdAt.toISOString() : null,
          createdAt: u.createdAt.toISOString(),
          source: 'REGISTERED',
          sourceLabel: 'Tài khoản đăng ký',
        });
      }

      if (userChunk.length < chunkSize) break;
      const last = userChunk[userChunk.length - 1];
      if (lastUser && last.id === lastUser.id) break;
      lastUser = { id: last.id, createdAt: last.createdAt };
    }
  }

  // Stream 2: Guest orders with keyset pagination
  if (shouldIncludeGuests) {
    const guestWhere: Record<string, unknown> = {
      userId: null,
      createdAt: { lte: exportSnapshotTime },
    };
    if (filters.search?.trim()) {
      const s = filters.search.trim();
      guestWhere.OR = [
        { customerName: { contains: s } },
        { customerEmail: { contains: s } },
        { customerPhone: { contains: s } },
        { orderNumber: { contains: s } },
      ];
    }

    let lastOrder: { id: string; createdAt: Date } | null = null;
    while (true) {
      let currentWhere: Record<string, unknown> = { ...guestWhere };
      if (lastOrder) {
        currentWhere = {
          ...guestWhere,
          AND: [
            {
              OR: [
                { createdAt: { lt: lastOrder.createdAt } },
                { createdAt: lastOrder.createdAt, id: { lt: lastOrder.id } },
              ],
            },
          ],
        };
      }

      const orderChunk = await prisma.order.findMany({
        where: currentWhere,
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: chunkSize,
      });

      for (const o of orderChunk) {
        const nonCancelledTotal = o.status !== 'CANCELLED' ? o.totalAmount : 0;
        all.push({
          id: `guest-${o.id}`,
          name: o.customerName,
          email: o.customerEmail,
          phone: o.customerPhone,
          tier: 'Khách vãng lai',
          nonCancelledTotal,
          totalSpend: nonCancelledTotal,
          totalOrders: 1,
          lastOrder: o.createdAt.toISOString(),
          createdAt: o.createdAt.toISOString(),
          source: 'GUEST_ORDER',
          sourceLabel: 'Khách vãng lai (Đơn hàng)',
          orderNumber: o.orderNumber,
        });
      }

      if (orderChunk.length < chunkSize) break;
      const last = orderChunk[orderChunk.length - 1];
      if (lastOrder && last.id === lastOrder.id) break;
      lastOrder = { id: last.id, createdAt: last.createdAt };
    }
  }

  return all;
}

/**
 * Get detailed customer profile with order history and contact requests.
 * Preserves guest record per-order, presenting any other orders with the same phone
 * as suggested/related (unverified identity), without merging records.
 */
export async function getCustomerDetail(
  customerId: string,
  d1Database?: D1Database
): Promise<CustomerDetailDto | null> {
  const prisma = getPrismaClient(d1Database);

  if (customerId.startsWith('guest-')) {
    const rawOrderId = customerId.replace('guest-', '');
    const referenceOrder = await prisma.order.findUnique({
      where: { id: rawOrderId },
      include: { _count: { select: { items: true } } },
    });
    if (!referenceOrder) return null;

    const nonCancelledTotal = referenceOrder.status !== 'CANCELLED' ? referenceOrder.totalAmount : 0;

    let suggestedOrders: Array<{
      id: string;
      orderNumber: string | null;
      customerName: string;
      status: string;
      totalAmount: number;
      createdAt: string;
      itemsCount: number;
    }> = [];

    if (referenceOrder.customerPhone) {
      const otherOrders = await prisma.order.findMany({
        where: {
          customerPhone: referenceOrder.customerPhone,
          userId: null,
          id: { not: referenceOrder.id },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { _count: { select: { items: true } } },
      });

      suggestedOrders = otherOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        status: o.status,
        totalAmount: o.totalAmount,
        createdAt: o.createdAt.toISOString(),
        itemsCount: o._count.items,
      }));
    }

    let suggestedContacts: Array<{
      id: string;
      name: string;
      message: string | null;
      status: string;
      createdAt: string;
    }> = [];

    if (referenceOrder.customerPhone) {
      const contacts = await prisma.contactSubmission.findMany({
        where: { phone: referenceOrder.customerPhone },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      suggestedContacts = contacts.map((c) => ({
        id: c.id,
        name: c.name,
        message: c.message,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
      }));
    }

    return {
      id: customerId,
      name: referenceOrder.customerName,
      email: referenceOrder.customerEmail,
      phone: referenceOrder.customerPhone,
      tier: 'Khách vãng lai',
      nonCancelledTotal,
      totalSpend: nonCancelledTotal,
      totalOrders: 1,
      lastOrder: referenceOrder.createdAt.toISOString(),
      createdAt: referenceOrder.createdAt.toISOString(),
      source: 'GUEST_ORDER',
      sourceLabel: 'Khách vãng lai (Đơn hàng)',
      orderNumber: referenceOrder.orderNumber,
      orders: [
        {
          id: referenceOrder.id,
          orderNumber: referenceOrder.orderNumber,
          status: referenceOrder.status,
          totalAmount: referenceOrder.totalAmount,
          createdAt: referenceOrder.createdAt.toISOString(),
          itemsCount: referenceOrder._count.items,
        },
      ],
      suggestedOrders,
      suggestedContacts,
      contacts: suggestedContacts,
    };
  }

  // Registered user
  const user = await prisma.user.findUnique({
    where: { id: customerId },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { items: true } },
        },
      },
    },
  });

  if (!user) return null;

  const nonCancelledTotal = user.orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  let suggestedContacts: Array<{
    id: string;
    name: string;
    message: string | null;
    status: string;
    createdAt: string;
  }> = [];

  const contactOr: Array<{ phone?: string; email?: string }> = [];
  if (user.phone) contactOr.push({ phone: user.phone });
  if (user.email) contactOr.push({ email: user.email });

  if (contactOr.length > 0) {
    const contacts = await prisma.contactSubmission.findMany({
      where: { OR: contactOr },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    suggestedContacts = contacts.map((c) => ({
      id: c.id,
      name: c.name,
      message: c.message,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    tier: user.tier,
    nonCancelledTotal,
    totalSpend: nonCancelledTotal,
    totalOrders: user.orders.length,
    lastOrder: user.orders[0]?.createdAt ? user.orders[0].createdAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    source: 'REGISTERED',
    sourceLabel: 'Tài khoản đăng ký',
    orders: user.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: o.totalAmount,
      createdAt: o.createdAt.toISOString(),
      itemsCount: o._count.items,
    })),
    suggestedContacts,
    contacts: suggestedContacts,
  };
}
