import { NextResponse } from 'next/server';
import { mockOrders, mockProducts, mockUsers } from '@/lib/mock-data';
import { requireAdmin } from '@/lib/auth';

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  try {
    if (!hasDatabase) {
      // Return mock dashboard data
      const totalRevenue = mockOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const now = new Date();
      const months = Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
        return { label: `T${d.getMonth() + 1}`, revenue: Math.floor(Math.random() * 200000000) + 50000000 };
      });

      return NextResponse.json({
        success: true,
        data: {
          stats: {
            totalRevenue,
            monthRevenue: 125000000,
            monthOrders: 23,
            revenueChange: 0.15,
            totalOrders: mockOrders.length,
            pendingOrders: 1,
            totalCustomers: mockUsers.length,
            newCustomersThisMonth: 5,
            lowStockProducts: 2,
          },
          recentOrders: mockOrders.map((order) => ({
            id: order.id,
            customer: mockUsers.find(u => u.id === order.userId)?.name || 'Khách hàng',
            product: 'Laptop mẫu',
            itemCount: 1,
            date: order.createdAt,
            amount: order.totalAmount,
            status: order.status,
          })),
          monthlyRevenue: months,
          statusCounts: [
            { status: 'Chờ xác nhận', count: 1 },
            { status: 'Đang vận chuyển', count: 1 },
            { status: 'Đã hoàn thành', count: 1 },
          ],
          topProducts: mockProducts.slice(0, 5).map(p => ({ id: p.id, name: p.name, sold: Math.floor(Math.random() * 50) + 10 })),
        },
      });
    }

    const { prisma } = await import('@/lib/prisma');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalRevenue, monthRevenue, prevMonthRevenue, totalOrders, pendingOrders,
      totalCustomers, newCustomersThisMonth, lowStockProducts,
      recentOrders, monthlyRevenue, statusCounts, topProducts,
    ] = await Promise.all([
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: 'Đã hủy' } } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, _count: { _all: true }, where: { status: { not: 'Đã hủy' }, createdAt: { gte: startOfMonth } } }),
      prisma.order.aggregate({ _sum: { totalAmount: true }, where: { status: { not: 'Đã hủy' }, createdAt: { gte: startOfPrevMonth, lt: startOfMonth } } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'Chờ xác nhận' } }),
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.product.count({ where: { stock: { lte: 5 } } }),
      prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { user: { select: { name: true, email: true } }, items: { include: { product: { select: { name: true } } } } } }),
      prisma.order.findMany({ select: { createdAt: true, totalAmount: true }, where: { status: { not: 'Đã hủy' }, createdAt: { gte: new Date(now.getFullYear() - 1, now.getMonth() + 1, 1) } } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.orderItem.groupBy({ by: ['productId'], _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
    ]);

    const months: { label: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: `T${monthDate.getMonth() + 1}`, revenue: 0 });
    }
    for (const row of monthlyRevenue) {
      const d = new Date(row.createdAt);
      const diff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (diff >= 0 && diff <= 11) months[11 - diff].revenue += row.totalAmount;
    }

    const topProductIds = topProducts.map((item) => item.productId);
    const products = topProductIds.length ? await prisma.product.findMany({ where: { id: { in: topProductIds } } }) : [];

    const revenueChange = prevMonthRevenue._sum.totalAmount && prevMonthRevenue._sum.totalAmount > 0
      ? ((monthRevenue._sum.totalAmount ?? 0) - prevMonthRevenue._sum.totalAmount) / prevMonthRevenue._sum.totalAmount
      : null;

    return NextResponse.json(
      {
        success: true,
        data: {
          stats: {
          totalRevenue: totalRevenue._sum.totalAmount ?? 0,
          monthRevenue: monthRevenue._sum.totalAmount ?? 0,
          monthOrders: monthRevenue._count._all,
          revenueChange, totalOrders, pendingOrders, totalCustomers, newCustomersThisMonth, lowStockProducts,
        },
        recentOrders: recentOrders.map((order) => ({
          id: order.id, customer: order.user?.name || order.user?.email || 'Khách vãng lai',
          product: order.items[0]?.product?.name || '—', itemCount: order.items.length,
          date: order.createdAt, amount: order.totalAmount, status: order.status,
        })),
        monthlyRevenue: months,
        statusCounts: statusCounts.map((row) => ({ status: row.status, count: row._count._all })),
        topProducts: topProducts.map((item) => ({
          id: item.productId, name: products.find((p) => p.id === item.productId)?.name ?? item.productId,
          sold: item._sum.quantity ?? 0,
        })),
      },
    },
    {
      headers: {
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
      },
    }
  );
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
