import { NextResponse } from "next/server";

/* eslint-disable @typescript-eslint/no-var-requires */

const hasDatabase = !!process.env.DATABASE_URL;

export async function PATCH(request: Request) {
  if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
  try {
    const { prisma } = await import("@/lib/prisma");
    const data = await request.json();
    const ids = Array.isArray(data.ids) ? data.ids.map(String) : [];
    if (ids.length === 0) return NextResponse.json({ success: false, error: "Chưa chọn sản phẩm nào" }, { status: 400 });
    const updateData: Record<string, unknown> = {};
    if (data.status === "draft" || data.status === "active" || data.status === "archived") updateData.status = data.status;
    if (typeof data.isFeatured === "boolean") updateData.isFeatured = data.isFeatured;
    if (typeof data.isNewArrival === "boolean") updateData.isNewArrival = data.isNewArrival;
    if (typeof data.isFlashSale === "boolean") updateData.isFlashSale = data.isFlashSale;
    if (typeof data.isBestSeller === "boolean") updateData.isBestSeller = data.isBestSeller;
    if (Object.keys(updateData).length === 0) return NextResponse.json({ success: false, error: "Không có thay đổi nào được gửi" }, { status: 400 });
    const result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: updateData });
    return NextResponse.json({ success: true, updatedCount: result.count, updatedIds: ids });
  } catch (error) {
    console.error("Bulk update metadata failed:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật hàng loạt" }, { status: 500 });
  }
}
