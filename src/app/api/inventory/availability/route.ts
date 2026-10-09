import { NextResponse } from "next/server";
import { getSkuAvailability } from "@/server/services/inventory.service";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get("sku")?.trim();
    const warehouseId = searchParams.get("warehouseId")?.trim() || undefined;

    if (!sku) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_SKU",
            message: "SKU parameter is required",
          },
        },
        { status: 400 }
      );
    }

    if (sku.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SKU",
            message: "SKU parameter exceeds maximum length",
          },
        },
        { status: 400 }
      );
    }

    const avail = await getSkuAvailability(sku, warehouseId, prisma);

    // Public sanitized availability contract: never leak serials or cost
    return NextResponse.json(
      {
        success: true,
        data: {
          sku: avail.sku,
          productName: avail.productName,
          available: avail.available,
          inStock: avail.available > 0,
          inventoryType: avail.inventoryType,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        },
      }
    );
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; status?: number };
    const statusCode = err.status || 500;
    return NextResponse.json(
      {
        success: false,
        error: {
          code: err.code || "INVENTORY_ERROR",
          message: err.message || "Failed to retrieve inventory availability",
        },
      },
      { status: statusCode }
    );
  }
}
