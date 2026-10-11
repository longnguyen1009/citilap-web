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
  if (!hasDatabase) return fail("Database not configured", 503);
  try {
    const data = await request.json();
    if (!data || typeof data !== "object" || !Array.isArray(data.rows) || data.rows.length === 0 || data.rows.length > MAX_ROWS) return fail("rows must contain 1-200 items");
    const rows = data.rows as Array<Record<string, unknown>>;
    const ids = rows.map((row) => typeof row.id === "string" ? row.id.trim() : "");
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) return fail("Each row needs a unique id");
    const { prisma } = await import("@/lib/prisma");

    if (await prisma.productStudio.count({ where: { productId: { in: ids } } })) return NextResponse.json({ success: false, error: 'Use Product Studio to edit this product.' }, { status: 409 });
    const existing = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (existing.length !== ids.length) return fail("One or more products do not exist", 404);
    const updates = rows.map((row) => {
      const update: Record<string, unknown> = {};
      if (row.status !== undefined) {
        if (typeof row.status !== "string" || !PRODUCT_STATUSES.has(row.status)) throw new Error("INVALID_STATUS");
        update.status = row.status;
      }
      for (const field of ["isFeatured", "isNewArrival", "isFlashSale", "isBestSeller", "allowBackorder"]) {
        if (row[field] !== undefined) {
          const value = parseBoolean(row[field]);
          if (value === undefined) throw new Error("INVALID_BOOLEAN");
          update[field] = value;
        }
      }
      for (const field of ["price", "originalPrice", "stock", "lowestPrice30d", "minOrderQty", "maxOrderQty"]) {
        if (row[field] !== undefined) {
          if (row[field] === null && ["originalPrice", "maxOrderQty", "lowestPrice30d"].includes(field)) update[field] = null;
          else {
            const value = Number(row[field]);
            if (!Number.isFinite(value) || value < 0 || (["stock", "minOrderQty", "maxOrderQty"].includes(field) && !Number.isInteger(value))) throw new Error("INVALID_NUMBER");
            update[field] = value;
          }
        }
      }
      for (const field of ["brand", "model", "series", "warranty", "condition", "origin", "seoTitle", "seoDescription", "canonicalSlug"]) {
        if (row[field] !== undefined) update[field] = row[field] == null ? null : String(row[field]).trim().slice(0, 300);
      }
      const publishAt = parseDate(row.publishAt);
      const unpublishAt = parseDate(row.unpublishAt);
      if ((row.publishAt !== undefined && publishAt === undefined) || (row.unpublishAt !== undefined && unpublishAt === undefined)) throw new Error("INVALID_DATE");
      if (publishAt !== undefined) update.publishAt = publishAt;
      if (unpublishAt !== undefined) update.unpublishAt = unpublishAt;
      if (Object.keys(update).length === 0) throw new Error("EMPTY_UPDATE");
      if (typeof update.minOrderQty === "number" && typeof update.maxOrderQty === "number" && update.minOrderQty > update.maxOrderQty) throw new Error("INVALID_RANGE");
      return prisma.product.update({ where: { id: String(row.id) }, data: update });
    });
    const products = await prisma.$transaction(updates);
    return NextResponse.json({ success: true, updatedCount: products.length, data: products });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = { INVALID_STATUS: "Invalid product status", INVALID_BOOLEAN: "Boolean field is invalid", INVALID_NUMBER: "Numeric field is invalid", INVALID_DATE: "Date field is invalid", INVALID_RANGE: "minOrderQty must not exceed maxOrderQty", EMPTY_UPDATE: "Row has no changes" };
    if (messages[code]) return fail(messages[code]);
    console.error("Failed to import metadata:", error instanceof Error ? error.message : "unknown error");
    return fail("Failed to import metadata", 500);
  }
}
