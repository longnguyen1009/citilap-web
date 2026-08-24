import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalRevenue,
      monthRevenue,
      prevMonthRevenue,
      totalOrders,
      pendingOrders,
      totalCustomers,
      newCustomersThisMonth,
      lowStockProducts,
      recentOrders,
      monthlyRevenue,
      statusCounts,
      topProducts,
    ] = await Promise.all([
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: { not: 'Đã hủy' } },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        _count: { _all: true },
        where: { status: { not: 'Đã hủy' }, createdAt: { gte: startOfMonth } },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          status: { not: 'Đã hủy' },
          createdAt: { gte: startOfPrevMonth, lt: startOfMonth },
        },
      }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'Chờ xác nhận' } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.product.count({ where: { stock: { lte: 5 } } }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      }),
      prisma.order.findMany({
        select: { createdAt: true, totalAmount: true },
        where: {
          status: { not: 'Đã hủy' },
          createdAt: { gte: new Date(now.getFullYear() - 1, now.getMonth() + 1, 1) },
        },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    // Aggregate daily revenue into the last 12 months
    const months: { label: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: `T${monthDate.getMonth() + 1}`,
        revenue: 0,
      });
    }
    for (const row of monthlyRevenue) {
      const d = new Date(row.createdAt);
      const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diff >= 0 && diff <= 11) {
        months[11 - diff].revenue += row.totalAmount;
      }
    }

    const topProductIds = topProducts.map((item) => item.productId);
    const products = topProductIds.length
      ? await prisma.product.findMany({ where: { id: { in: topProductIds } } })
      : [];

    const revenueChange =
      prevMonthRevenue._sum.totalAmount && prevMonthRevenue._sum.totalAmount > 0
        ? ((monthRevenue._sum.totalAmount ?? 0) - prevMonthRevenue._sum.totalAmount) /
          prevMonthRevenue._sum.totalAmount
        : null;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalRevenue: totalRevenue._sum.totalAmount ?? 0,
          monthRevenue: monthRevenue._sum.totalAmount ?? 0,
          monthOrders: monthRevenue._count._all,
          revenueChange,
          totalOrders,
          pendingOrders,
          totalCustomers,
          newCustomersThisMonth,
          lowStockProducts,
        },
        recentOrders: recentOrders.map((order) => ({
          id: order.id,
          customer: order.user?.name || order.user?.email || 'Khách vãng lai',
          product: order.items[0]?.product?.name || '—',
          itemCount: order.items.length,
          date: order.createdAt,
          amount: order.totalAmount,
          status: order.status,
        })),
        monthlyRevenue: months,
        statusCounts: statusCounts.map((row) => ({ status: row.status, count: row._count._all })),
        topProducts: topProducts.map((item) => ({
          id: item.productId,
          name: products.find((p) => p.id === item.productId)?.name ?? item.productId,
          sold: item._sum.quantity ?? 0,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
