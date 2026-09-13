import { NextResponse } from "next/server";

const hasDatabase = !!process.env.DATABASE_URL;

function toNullableString(value: unknown): string | null { if (value === undefined || value === null) return null; const text = String(value).trim(); return text || null; }
function toNullableNumber(value: unknown): number | null { if (value === undefined || value === null || value === "") return null; const num = Number(value); return Number.isFinite(num) ? num : null; }
function toBooleanFlag(value: unknown, fallback = false): boolean { if (value === undefined || value === null) return fallback; return Boolean(value); }
function toNullableIso(value: unknown): string | null { const text = toNullableString(value); if (!text) return null; const d = new Date(text); return Number.isNaN(d.getTime()) ? null : d.toISOString(); }

export async function GET(request: Request) {
  if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
  try {
    const { prisma } = await import("@/lib/prisma");
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];
    const products = await prisma.product.findMany({ where: ids.length ? { id: { in: ids } } : {}, select: { id: true, name: true, slug: true, price: true, originalPrice: true, stock: true, status: true, brand: true, model: true, series: true, warranty: true, condition: true, origin: true, seoTitle: true, seoDescription: true, canonicalSlug: true, isFeatured: true, isNewArrival: true, isFlashSale: true, isBestSeller: true, allowBackorder: true, minOrderQty: true, maxOrderQty: true, lowestPrice30d: true, publishAt: true, unpublishAt: true }, orderBy: { updatedAt: "desc" }, take: 500 });
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Failed to export metadata:", error);
    return NextResponse.json({ success: false, error: "Không thể xuất metadata" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!hasDatabase) return NextResponse.json({ success: false, error: "Database not configured" }, { status: 503 });
  try {
    const { prisma } = await import("@/lib/prisma");
    const data = await request.json();
    const rows = Array.isArray(data.rows) ? data.rows : [];
    if (!rows.length) return NextResponse.json({ success: false, error: "Không có dữ liệu cập nhật" }, { status: 400 });
    let updatedCount = 0;
    for (const row of rows) { if (!row?.id) continue; const id = String(row.id); const payload: Record<string, unknown> = {}; if (row.price !== undefined) payload.price = Number(row.price); if (row.originalPrice !== undefined) payload.originalPrice = toNullableNumber(row.originalPrice); if (row.stock !== undefined) payload.stock = Number(row.stock); if (row.status !== undefined) payload.status = row.status; if (row.brand !== undefined) payload.brand = toNullableString(row.brand); if (row.model !== undefined) payload.model = toNullableString(row.model); if (row.series !== undefined) payload.series = toNullableString(row.series); if (row.warranty !== undefined) payload.warranty = toNullableString(row.warranty); if (row.condition !== undefined) payload.condition = toNullableString(row.condition); if (row.origin !== undefined) payload.origin = toNullableString(row.origin); if (row.seoTitle !== undefined) payload.seoTitle = toNullableString(row.seoTitle); if (row.seoDescription !== undefined) payload.seoDescription = toNullableString(row.seoDescription); if (row.canonicalSlug !== undefined) payload.canonicalSlug = toNullableString(row.canonicalSlug); if (row.isFeatured !== undefined) payload.isFeatured = toBooleanFlag(row.isFeatured); if (row.isNewArrival !== undefined) payload.isNewArrival = toBooleanFlag(row.isNewArrival); if (row.isFlashSale !== undefined) payload.isFlashSale = toBooleanFlag(row.isFlashSale); if (row.isBestSeller !== undefined) payload.isBestSeller = toBooleanFlag(row.isBestSeller); if (row.allowBackorder !== undefined) payload.allowBackorder = toBooleanFlag(row.allowBackorder); if (row.minOrderQty !== undefined) payload.minOrderQty = Math.max(1, Number(row.minOrderQty ?? 1)); if (row.maxOrderQty !== undefined) payload.maxOrderQty = toNullableNumber(row.maxOrderQty); if (row.lowestPrice30d !== undefined) payload.lowestPrice30d = toNullableNumber(row.lowestPrice30d); if (row.publishAt !== undefined) payload.publishAt = toNullableIso(row.publishAt); if (row.unpublishAt !== undefined) payload.unpublishAt = toNullableIso(row.unpublishAt); if (Object.keys(payload).length === 0) continue; await prisma.product.update({ where: { id }, data: payload }); updatedCount += 1; }
    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    console.error("Failed to import metadata:", error);
    return NextResponse.json({ success: false, error: "Không thể import metadata" }, { status: 500 });
  }
}
