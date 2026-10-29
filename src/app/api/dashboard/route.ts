import { withAdminContext } from '@/server/admin-request-context';
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { mediaEnvironment } from "@/server/media-http";

const NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, no-cache, must-revalidate",
};

async function GETHandler(request: Request) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  try {
    const env = await mediaEnvironment();
    const db = env.DB;

    // 1. Đếm đơn hàng mới chờ xử lý (canonical status: 'NEW')
    const pendingOrdersRow = await db
      .prepare(`SELECT COUNT(*) as count FROM "Order" WHERE status = 'NEW'`)
      .first<{ count: number }>();
    const pendingOrdersCount = Number(pendingOrdersRow?.count ?? 0);

    // 2. Đếm tổng số đơn hàng tiếp nhận
    const totalOrdersRow = await db
      .prepare(`SELECT COUNT(*) as count FROM "Order"`)
      .first<{ count: number }>();
    const totalOrdersCount = Number(totalOrdersRow?.count ?? 0);

    // 3. Đếm sản phẩm đang ở bản nháp Studio (chưa xuất bản)
    const draftStudioRow = await db
      .prepare(`SELECT COUNT(*) as count FROM ProductStudio WHERE published IS NULL`)
      .first<{ count: number }>();
    const draftStudioCount = Number(draftStudioRow?.count ?? 0);

    // 4. Đếm sản phẩm Studio đã xuất bản trên Storefront
    const publishedStudioRow = await db
      .prepare(`SELECT COUNT(*) as count FROM ProductStudio WHERE published IS NOT NULL`)
      .first<{ count: number }>();
    const publishedStudioCount = Number(publishedStudioRow?.count ?? 0);

    // 5. Đếm số file media hoạt động trong Thư viện (canonical state: 'READY')
    const mediaCountRow = await db
      .prepare(`SELECT COUNT(*) as count FROM MediaAsset WHERE state = 'READY'`)
      .first<{ count: number }>();
    const mediaCount = Number(mediaCountRow?.count ?? 0);

    // 5b. Doanh thu đơn hoàn tất & phân bổ trạng thái đơn
    const revenueRow = await db
      .prepare(`SELECT COALESCE(SUM(totalAmount), 0) as rev FROM "Order" WHERE status = 'COMPLETED'`)
      .first<{ rev: number }>();
    const completedRevenue = Number(revenueRow?.rev ?? 0);

    const statusBreakdownResult = await db
      .prepare(`SELECT status, COUNT(*) as count FROM "Order" GROUP BY status`)
      .all<{ status: string; count: number }>();
    const statusBreakdown: Record<string, number> = {};
    for (const row of statusBreakdownResult.results || []) {
      statusBreakdown[row.status] = Number(row.count ?? 0);
    }

    const lowStockResult = await db
      .prepare(
        `SELECT id, name, slug, stock, price
         FROM Product
         WHERE status = 'ACTIVE' AND deletedAt IS NULL AND stock <= 2
         ORDER BY stock ASC, updatedAt DESC
         LIMIT 5`
      )
      .all<{ id: string; name: string; slug: string; stock: number; price: number }>();

    // 6. Danh sách 6 đơn hàng mới nhất cần tiếp nhận & xử lý
    const recentOrdersResult = await db
      .prepare(
        `SELECT id, orderNumber, customerName, customerPhone, totalAmount, status, createdAt
         FROM "Order"
         ORDER BY createdAt DESC
         LIMIT 6`
      )
      .all<{
        id: string;
        orderNumber: string | null;
        customerName: string;
        customerPhone: string;
        totalAmount: number;
        status: string;
        createdAt: string;
      }>();

    // 7. Danh sách 5 sản phẩm Studio gần nhất để tiếp tục biên tập
    const recentStudioProductsResult = await db
      .prepare(
        `SELECT s.productId, s.revision, s.published, s.updatedAt,
                p.name as catalogName, p.slug as catalogSlug, p.status as catalogStatus
         FROM ProductStudio s
         JOIN Product p ON p.id = s.productId
         ORDER BY s.updatedAt DESC
         LIMIT 5`
      )
      .all<{
        productId: string;
        revision: number;
        published: string | null;
        updatedAt: string;
        catalogName: string;
        catalogSlug: string;
        catalogStatus: string;
      }>();

    return NextResponse.json(
      {
        success: true,
        data: {
          summary: {
            pendingOrders: pendingOrdersCount,
            totalOrders: totalOrdersCount,
            draftStudioCount,
            publishedStudioCount,
            mediaCount,
            completedRevenue,
          },
          statusBreakdown,
          lowStockProducts: lowStockResult.results || [],
          recentOrders: recentOrdersResult.results || [],
          recentStudioProducts: recentStudioProductsResult.results || [],
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("[Dashboard API] Error fetching dashboard data from D1:", error);
    return NextResponse.json(
      { success: false, error: "Không thể tải dữ liệu điều hành từ D1." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export const GET = withAdminContext(GETHandler);
