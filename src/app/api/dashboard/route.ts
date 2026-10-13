import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { mediaEnvironment } from "@/server/media-http";

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const env = await mediaEnvironment();
    const db = env.DB;

    // 1. Đếm đơn hàng cần xử lý (status PENDING hoặc 'Chờ xác nhận')
    const pendingOrdersRow = await db
      .prepare(`SELECT COUNT(*) as count FROM "Order" WHERE status IN ('PENDING', 'Chờ xác nhận')`)
      .first<{ count: number }>()
      .catch(() => ({ count: 0 }));
    const pendingOrdersCount = pendingOrdersRow?.count ?? 0;

    // 2. Đếm tổng số đơn hàng tiếp nhận
    const totalOrdersRow = await db
      .prepare(`SELECT COUNT(*) as count FROM "Order"`)
      .first<{ count: number }>()
      .catch(() => ({ count: 0 }));
    const totalOrdersCount = totalOrdersRow?.count ?? 0;

    // 3. Đếm sản phẩm đang ở bản nháp Studio (chưa xuất bản)
    const draftStudioRow = await db
      .prepare(`SELECT COUNT(*) as count FROM ProductStudio WHERE published IS NULL`)
      .first<{ count: number }>()
      .catch(() => ({ count: 0 }));
    const draftStudioCount = draftStudioRow?.count ?? 0;

    // 4. Đếm sản phẩm Studio đã xuất bản trên Storefront
    const publishedStudioRow = await db
      .prepare(`SELECT COUNT(*) as count FROM ProductStudio WHERE published IS NOT NULL`)
      .first<{ count: number }>()
      .catch(() => ({ count: 0 }));
    const publishedStudioCount = publishedStudioRow?.count ?? 0;

    // 5. Đếm số file media hoạt động trong Thư viện
    const mediaCountRow = await db
      .prepare(`SELECT COUNT(*) as count FROM MediaAsset WHERE archivedAt IS NULL`)
      .first<{ count: number }>()
      .catch(() => ({ count: 0 }));
    const mediaCount = mediaCountRow?.count ?? 0;

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
      }>()
      .catch(() => ({ results: [] }));

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
      }>()
      .catch(() => ({ results: [] }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          pendingOrders: pendingOrdersCount,
          totalOrders: totalOrdersCount,
          draftStudioCount,
          publishedStudioCount,
          mediaCount,
        },
        recentOrders: recentOrdersResult.results || [],
        recentStudioProducts: recentStudioProductsResult.results || [],
      },
    });
  } catch (error) {
    console.error("[Dashboard API] Error fetching dashboard data from D1:", error);
    return NextResponse.json(
      { success: false, error: "Không thể tải dữ liệu điều hành từ D1." },
      { status: 500 }
    );
  }
}
