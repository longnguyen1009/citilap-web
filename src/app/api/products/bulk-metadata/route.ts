import { NextResponse } from "next/server";
import { requireAdminMutation } from "@/lib/auth";

const hasDatabase = !!process.env.DATABASE_URL;
const BULK_STATUSES = new Set(["active", "draft", "archived"]);

export async function PATCH(request: Request) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;
  if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
  try {
    const { prisma } = await import("@/lib/prisma");
    const data = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
    const rawIds = Array.isArray(data.ids) ? data.ids : [];
    if (rawIds.length > 200) return NextResponse.json({ success: false, error: "Too many product IDs" }, { status: 400 });
    const ids = rawIds.filter((id: unknown): id is string => typeof id === "string").map((id: string) => id.trim()).filter(Boolean);
    if (ids.length !== rawIds.length) return NextResponse.json({ success: false, error: "Product IDs are invalid" }, { status: 400 });
    if (new Set(ids).size !== ids.length) return NextResponse.json({ success: false, error: "Duplicate product IDs" }, { status: 400 });
    if (ids.length === 0) return NextResponse.json({ success: false, error: "Chưa chọn sản phẩm nào" }, { status: 400 });
    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) {
      if (!BULK_STATUSES.has(String(data.status))) return NextResponse.json({ success: false, error: "Invalid product status" }, { status: 400 });
      updateData.status = String(data.status);
    }
    if (typeof data.isFeatured === "boolean") updateData.isFeatured = data.isFeatured;
    if (typeof data.isNewArrival === "boolean") updateData.isNewArrival = data.isNewArrival;
    if (typeof data.isFlashSale === "boolean") updateData.isFlashSale = data.isFlashSale;
    if (typeof data.isBestSeller === "boolean") updateData.isBestSeller = data.isBestSeller;
    if (Object.keys(updateData).length === 0) return NextResponse.json({ success: false, error: "Không có thay đổi nào được gửi" }, { status: 400 });

    if (await prisma.productStudio.count({ where: { productId: { in: ids } } })) return NextResponse.json({ success: false, error: 'Use Product Studio to edit this product.' }, { status: 409 });
    const existing = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (existing.length !== ids.length) return NextResponse.json({ success: false, error: "One or more products do not exist" }, { status: 404 });
    const result = await prisma.product.updateMany({ where: { id: { in: ids } }, data: updateData });
    return NextResponse.json({ success: true, updatedCount: result.count, updatedIds: ids });
  } catch (error) {
    console.error("Bulk update metadata failed:", error);
    return NextResponse.json({ success: false, error: "Không thể cập nhật hàng loạt" }, { status: 500 });
  }
}
