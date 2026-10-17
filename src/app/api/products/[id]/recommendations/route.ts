import { NextResponse } from "next/server";

import { getPrismaClient } from '@/lib/prisma';
import { mediaEnvironment } from '@/server/media-http';
import { getStorefrontPricingContext } from '@/server/services/pricing.service';
import { resolveProductsByIds } from '@/server/services/catalog.service';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { DB } = await mediaEnvironment();
    const prisma = getPrismaClient(DB);
    const at = new Date();
    const context = await getStorefrontPricingContext(DB, at);

    const product = await prisma.product.findFirst({ where: { id, deletedAt: null, status: { in: ['ACTIVE','active'] }, NOT: { studio: { is: { published: null } } } }, select: { categoryId: true, brand: true, series: true, tags: true, price: true } });
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
        status: { in: ['ACTIVE','active'] }, deletedAt: null, NOT: { studio: { is: { published: null } } },
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
        isFlashSale: true,
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
        status: { in: ['ACTIVE','active'] }, deletedAt: null, NOT: { studio: { is: { published: null } } },
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
        isFlashSale: true,
        images: true,
        brand: true,
        stock: true,
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
    });

    const resolved = await resolveProductsByIds([...relatedProducts,...bundleProducts].map(p=>p.id),prisma,context,at);
    const priced = (rows: typeof relatedProducts) => rows.flatMap(p => {
      const card = resolved.find(r=>r.id===p.id);
      return card ? [{...p,price:card.price,originalPrice:card.originalPrice,images:card.image?[card.image]:[]}] : [];
    });
    return NextResponse.json({
      success: true,
      data: {
        related: priced(relatedProducts),
        bundles: priced(bundleProducts),
      },
    });
  } catch (error) {
    console.error("Failed to load recommendations:", error);
    return NextResponse.json({ success: false, error: "Failed to load recommendations" }, { status: 500 });
  }
}
