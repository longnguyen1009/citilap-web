import { NextResponse } from 'next/server';
import { mediaEnvironment } from '@/server/media-http';
import { getStorefrontPricingContext, resolvePrice, PricingTargetError } from '@/server/services/pricing.service';

export const runtime = 'edge';

interface RevalidateCartItem {
  id: string;
  productId: string;
  variantId?: string | null;
  expectedPrice?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { items?: RevalidateCartItem[] } | null;
    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, code: 'INVALID_CART_PAYLOAD', error: 'Dữ liệu giỏ hàng không hợp lệ (cần mảng items).' },
        { status: 400 }
      );
    }

    if (body.items.length === 0) {
      return NextResponse.json({
        success: true,
        evaluatedAt: new Date().toISOString(),
        hasPriceChanges: false,
        items: [],
      });
    }

    // Bounding guard: max 50 items to prevent resource exhaustion
    if (body.items.length > 50) {
      return NextResponse.json(
        { success: false, code: 'TOO_MANY_ITEMS', error: 'Số lượng sản phẩm trong giỏ hàng vượt quá giới hạn (tối đa 50 mục).' },
        { status: 400 }
      );
    }

    // Validate each item shape
    for (let i = 0; i < body.items.length; i++) {
      const it = body.items[i];
      if (!it || typeof it !== 'object' || typeof it.productId !== 'string' || !it.productId.trim()) {
        return NextResponse.json(
          { success: false, code: 'INVALID_CART_ITEM', error: `Mục thứ ${i + 1} không hợp lệ (cần productId).` },
          { status: 400 }
        );
      }
    }

    const env = await mediaEnvironment();
    const evaluatedAt = new Date();
    const pricingContext = await getStorefrontPricingContext(env.DB, evaluatedAt);

    const revalidatedItems = await Promise.all(
      body.items.map(async (item) => {
        try {
          const resolved = await resolvePrice({
            productId: item.productId.trim(),
            variantId: item.variantId && item.variantId.trim() ? item.variantId.trim() : null,
            settings: pricingContext,
            at: evaluatedAt,
            explicitDb: env.DB,
          });

          const expected = typeof item.expectedPrice === 'number' ? item.expectedPrice : null;
          const priceChanged = expected !== null && expected !== resolved.effectivePrice;

          return {
            id: item.id,
            productId: item.productId.trim(),
            variantId: item.variantId || null,
            price: resolved.effectivePrice,
            regularPrice: resolved.regularPrice,
            compareAtPrice: resolved.compareAtPrice,
            isOnSale: resolved.isOnSale,
            discountPercent: resolved.discountPercent,
            priceChanged,
            oldPrice: expected,
            newPrice: resolved.effectivePrice,
            available: true,
          };
        } catch (err: unknown) {
          // If it is a known business pricing target error (missing product/variant or not active/orderable)
          if (err instanceof PricingTargetError) {
            return {
              id: item.id,
              productId: item.productId.trim(),
              variantId: item.variantId || null,
              available: false,
              unavailableReason: err.code,
              priceChanged: false,
            };
          }
          // Infrastructure or database connection error: DO NOT swallow into available: false!
          // Re-throw so the endpoint returns HTTP 500 Infrastructure Error
          throw err;
        }
      })
    );

    const hasAnyChange = revalidatedItems.some((it) => it.priceChanged);

    return NextResponse.json({
      success: true,
      evaluatedAt: evaluatedAt.toISOString(),
      hasPriceChanges: hasAnyChange,
      items: revalidatedItems,
    });
  } catch (error) {
    console.error('[CartRevalidateAPI] Infrastructure error during cart revalidation:', error);
    return NextResponse.json(
      {
        success: false,
        code: 'INFRASTRUCTURE_ERROR',
        error: 'Không thể kết nối cơ sở dữ liệu để xác thực giỏ hàng. Vui lòng thử lại sau.',
      },
      { status: 500 }
    );
  }
}
