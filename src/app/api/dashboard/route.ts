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

    // Single D1 batch executes all dashboard read queries in 1 round-trip instead of 11 sequential queries.
    const [
      orderStatsRes,
      studioStatsRes,
      mediaCountRes,
      lowStockRes,
      recentOrdersRes,
      recentStudioRes,
    ] = await db.batch([
      // 1. Order counts + completed revenue + status breakdown in 1 query
      db.prepare(
        `SELECT status, COUNT(*) AS cnt, COALESCE(SUM(totalAmount), 0) AS revenue
         FROM "Order"
         GROUP BY status`
      ),
      // 2. Draft & published ProductStudio counts in 1 query
      db.prepare(
        `SELECT
           SUM(CASE WHEN published IS NULL THEN 1 ELSE 0 END) AS draftCount,
           SUM(CASE WHEN published IS NOT NULL THEN 1 ELSE 0 END) AS publishedCount
         FROM ProductStudio`
      ),
      // 3. Ready media count (covered by MediaAsset_state_createdAt_idx)
      db.prepare(`SELECT COUNT(*) AS count FROM MediaAsset WHERE state = 'READY'`),
      // 4. Low-stock active products (compute inventory sum once via LEFT JOIN grouped subquery, count + top 5 via window fn)
      db.prepare(
        `WITH inv AS (
           SELECT productId, SUM(onHand - reserved) AS avail
           FROM InventoryBalance
           GROUP BY productId
         ),
         low AS (
           SELECT p.id, p.name, p.slug, COALESCE(inv.avail, p.stock, 0) AS stock, p.price, p.updatedAt
           FROM Product p
           LEFT JOIN ProductStudio s ON s.productId = p.id
           LEFT JOIN inv ON inv.productId = p.id
           WHERE p.status = 'ACTIVE' AND p.deletedAt IS NULL
             AND (s.productId IS NULL OR s.published IS NOT NULL)
             AND COALESCE(inv.avail, p.stock, 0) <= 2
         )
         SELECT id, name, slug, stock, price, (SELECT COUNT(*) FROM low) AS totalLow
         FROM low
         ORDER BY stock ASC, updatedAt DESC
         LIMIT 5`
      ),
      // 5. 6 most recent orders (uses Order_createdAt_idx)
      db.prepare(
        `SELECT id, orderNumber, customerName, customerPhone, totalAmount, status, createdAt
         FROM "Order"
         ORDER BY createdAt DESC
         LIMIT 6`
      ),
      // 6. 5 most recent Studio products (uses ProductStudio_updatedAt_idx; avoids selecting full s.published JSON blob)
      db.prepare(
        `SELECT s.productId, s.revision, (s.published IS NOT NULL) AS isPublished, s.updatedAt,
                p.name AS catalogName, p.slug AS catalogSlug, p.status AS catalogStatus
         FROM ProductStudio s
         JOIN Product p ON p.id = s.productId
         ORDER BY s.updatedAt DESC
         LIMIT 5`
      ),
    ]);

    let pendingOrdersCount = 0;
    let totalOrdersCount = 0;
    let completedRevenue = 0;
    const statusBreakdown: Record<string, number> = {};
    for (const row of (orderStatsRes.results || []) as Array<{ status: string; cnt: number; revenue: number }>) {
      const cnt = Number(row.cnt ?? 0);
      statusBreakdown[row.status] = cnt;
      totalOrdersCount += cnt;
      if (row.status === 'NEW') pendingOrdersCount = cnt;
      if (row.status === 'COMPLETED') completedRevenue = Number(row.revenue ?? 0);
    }

    const studioStats = (studioStatsRes.results?.[0] ?? {}) as { draftCount?: number; publishedCount?: number };
    const draftStudioCount = Number(studioStats.draftCount ?? 0);
    const publishedStudioCount = Number(studioStats.publishedCount ?? 0);

    const mediaCount = Number(((mediaCountRes.results?.[0] ?? {}) as { count?: number }).count ?? 0);

    const lowStockRows = (lowStockRes.results || []) as Array<{
      id: string;
      name: string;
      slug: string;
      stock: number;
      price: number;
      totalLow: number;
    }>;
    const lowStockCount = lowStockRows.length > 0 ? Number(lowStockRows[0].totalLow ?? lowStockRows.length) : 0;
    const lowStockProducts = lowStockRows.map(({ id, name, slug, stock, price }) => ({ id, name, slug, stock, price }));

    const recentStudioProducts = ((recentStudioRes.results || []) as Array<{
      productId: string;
      revision: number;
      isPublished: number;
      updatedAt: string;
      catalogName: string;
      catalogSlug: string;
      catalogStatus: string;
    }>).map((r) => ({
      productId: r.productId,
      revision: r.revision,
      published: r.isPublished ? '1' : null,
      updatedAt: r.updatedAt,
      catalogName: r.catalogName,
      catalogSlug: r.catalogSlug,
      catalogStatus: r.catalogStatus,
    }));

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
          lowStockCount,
          lowStockProducts,
          recentOrders: recentOrdersRes.results || [],
          recentStudioProducts,
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
