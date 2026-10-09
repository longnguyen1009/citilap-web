import { NextResponse } from "next/server";

const hasDatabase = !!process.env.DATABASE_URL;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!hasDatabase) return NextResponse.json({ success: true, data: { related: [], bundles: [] } });
    const { prisma } = await import("@/lib/prisma");

    const product = await prisma.product.findUnique({ where: { id }, select: { categoryId: true, brand: true, series: true, tags: true, price: true } });
    if (!product) return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });

    // Related products: same category, same brand, or similar tags, excluding current product
    const relatedConditions: Array<Record<string, unknown>> = [
      { id: { not: id }, status: "active" },
    ];

    // Same category products
    if (product.categoryId) {
      relatedConditions.push({ categoryId: product.categoryId });
    }

    // Same brand products
    if (product.brand) {
      relatedConditions.push({ brand: product.brand });
    }

    const relatedProducts = await prisma.product.findMany({
      where: {
        id: { not: id },
        status: "active",
        OR: [
          ...(product.categoryId ? [{ categoryId: product.categoryId }] : []),
          ...(product.brand ? [{ brand: product.brand }] : []),
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        originalPrice: true,
        images: true,
        brand: true,
        stock: true,
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
    });

    // Bundle suggestions: products in similar price range or complementary categories
    const priceRange = product.price * 0.3; // ±30% price range
    const bundleProducts = await prisma.product.findMany({
      where: {
        id: { not: id },
        status: "active",
        price: {
          gte: Math.max(0, product.price - priceRange),
          lte: product.price + priceRange,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        originalPrice: true,
        images: true,
        brand: true,
        stock: true,
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        related: relatedProducts.map((p) => ({ ...p, images: typeof p.images === "string" ? (() => { try { return JSON.parse(p.images); } catch { return p.images ? p.images.split(",") : []; } })() : p.images })),
        bundles: bundleProducts.map((p) => ({ ...p, images: typeof p.images === "string" ? (() => { try { return JSON.parse(p.images); } catch { return p.images ? p.images.split(",") : []; } })() : p.images })),
      },
    });
  } catch (error) {
    console.error("Failed to load recommendations:", error);
    return NextResponse.json({ success: false, error: "Failed to load recommendations" }, { status: 500 });
  }
}
