import { NextResponse } from "next/server";
import { requireAdmin, requireAdminMutation } from "@/lib/auth";

const hasDatabase = !!process.env.DATABASE_URL;
const PRODUCT_STATUSES = new Set(["active", "draft", "archived"]);
const MAX_ROWS = 200;

function fail(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string" && ["true", "1"].includes(value.trim().toLowerCase())) return true;
  if (typeof value === "string" && ["false", "0"].includes(value.trim().toLowerCase())) return false;
  return undefined;
}

function parseDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export async function GET(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  if (!hasDatabase) return fail("Database not configured", 503);
  try {
    const { prisma } = await import("@/lib/prisma");
    const rawIds = new URL(request.url).searchParams.get("ids")?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
    if (rawIds.length > 500) return fail("Too many product IDs", 400);
    const ids = [...new Set(rawIds)];
    const products = await prisma.product.findMany({
      where: ids.length ? { id: { in: ids } } : {},
      select: { id: true, name: true, slug: true, price: true, originalPrice: true, stock: true, status: true, brand: true, model: true, series: true, warranty: true, condition: true, origin: true, seoTitle: true, seoDescription: true, canonicalSlug: true, isFeatured: true, isNewArrival: true, isFlashSale: true, isBestSeller: true, allowBackorder: true, minOrderQty: true, maxOrderQty: true, lowestPrice30d: true, publishAt: true, unpublishAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    });
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Failed to export metadata:", error instanceof Error ? error.message : "unknown error");
    return fail("Failed to export metadata", 500);
  }
}

export async function PATCH(request: Request) {
  const denied = requireAdminMutation(request);
  if (denied) return denied;

  return NextResponse.json(
    {
      success: false,
      code: 'LEGACY_WRITER_DISABLED',
      error: 'Cập nhật metadata legacy đã ngừng hoạt động. Vui lòng sử dụng giao diện quản lý sản phẩm chuẩn tại /admin/products.',
    },
    { status: 409 }
  );
}

