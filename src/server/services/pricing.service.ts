import type { D1Database } from '@cloudflare/workers-types';
import { prisma, type PrismaClient } from '../../lib/prisma';
import { getPublicStorefrontSettings } from './settings.service';
import { resolveActiveCampaigns, type ActiveCampaignResolution } from './campaign.service';
import { mediaEnvironment } from '../media-http';
import type { HomepageProduct } from './catalog.service';

/**
 * Standard VND money normalizer according to catalog rules:
 * - Finite number
 * - Non-negative (>= 0)
 * - Rounded integer VND
 */
export function normalizeVnd(val: unknown, fallback = 0): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) {
    const parsed = Number(val);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.round(parsed));
  }
  return Math.max(0, Math.round(val));
}

export interface PriceEvaluationContext {
  flashSaleEnabled: boolean;
  flashSaleTitle: string;
  flashSaleStartAt: string;
  flashSaleEndAt: string;
  activeCampaign?: {
    campaignId: string;
    campaignName: string;
    startAt: string;
    endAt: string;
    items:
      | Map<
          string,
          {
            salePrice: number;
            regularPrice: number | null;
            campaignId?: string;
            campaignName?: string;
            startAt?: string;
            endAt?: string;
          }
        >
      | Record<
          string,
          {
            salePrice: number;
            regularPrice: number | null;
            campaignId?: string;
            campaignName?: string;
            startAt?: string;
            endAt?: string;
          }
        >;
  } | null;
}

export interface PriceTargetInfo {
  productId?: string;
  variantId?: string | null;
  isVariant?: boolean;
  variantOriginalPrice?: number | null;
}

export interface ResolvePriceInput {
  productId: string;
  variantId?: string | null;
  at?: Date;
  product?: {
    id: string;
    price: number;
    originalPrice?: number | null;
    status: string;
    isFlashSale: boolean;
    variants?: Array<{
      id: string;
      price: number;
      originalPrice?: number | null;
      status: string;
    }>;
  };
  settings?: PriceEvaluationContext | null;
  explicitDb?: D1Database;
  client?: PrismaClient;
}

export interface ResolvedPrice {
  currency: 'VND';
  effectivePrice: number; // Authoritative price to charge / display
  regularPrice: number; // Standard non-sale price
  compareAtPrice: number | null; // Reference / strikethrough price if valid discount exists
  isOnSale: boolean; // True ONLY when a valid discount exists (effectivePrice < compareAtPrice)
  discountPercent: number | null;
  campaign: null | {
    id: string;
    name: string;
    title: string;
    source: 'campaign' | 'site-flash-sale';
    startAt: string;
    endAt: string;
    discountAmount: number;
  };
}

/**
 * Evaluates whether site-wide Flash Sale window is currently active.
 * Strict half-open interval: [startAt, endAt) according to server time.
 */
export function isFlashSaleActive(
  settings?: {
    flashSaleEnabled?: boolean | null;
    flashSaleStartAt?: string | null;
    flashSaleEndAt?: string | null;
  } | null,
  at: Date = new Date()
): boolean {
  if (!settings || !settings.flashSaleEnabled) return false;
  if (!settings.flashSaleEndAt || !settings.flashSaleEndAt.trim()) return false;

  const nowMs = at.getTime();
  const endMs = new Date(settings.flashSaleEndAt).getTime();
  if (Number.isNaN(endMs) || nowMs >= endMs) {
    return false;
  }

  if (settings.flashSaleStartAt && settings.flashSaleStartAt.trim()) {
    const startMs = new Date(settings.flashSaleStartAt).getTime();
    if (!Number.isNaN(startMs) && nowMs < startMs) {
      return false;
    }
  }

  return true;
}

/**
 * Pure, authoritative pricing calculator adhering to R07B.2 contracts:
 *
 * 1. Distinction between regularPrice, compareAtPrice, and campaignPrice.
 * 2. Variants NEVER inherit parent originalPrice (even if parent has originalPrice and variant has null).
 * 3. Variants without explicit campaign item DO NOT inherit base product campaign prices.
 * 4. isOnSale is true ONLY when there is a real, valid discount (effectivePrice < compareAtPrice).
 * 5. Server-enforced immediate expiration: outside [startAt, endAt), campaign prices cease immediately.
 * 6. Explicit Campaign Priority: Variant campaign item > Product campaign item > Legacy Site Flash Sale.
 */
export function calculateEffectivePrice(
  productPrice: number,
  productOriginalPrice: number | null | undefined,
  isProductFlashSale: boolean,
  isProductActive: boolean,
  settings?: PriceEvaluationContext | null,
  at: Date = new Date(),
  target?: PriceTargetInfo
): ResolvedPrice {
  const normPrice = normalizeVnd(productPrice);
  const normOriginal =
    productOriginalPrice !== null && productOriginalPrice !== undefined
      ? normalizeVnd(productOriginalPrice)
      : null;

  // 1. Inactive product handling
  if (!isProductActive) {
    return {
      currency: 'VND',
      effectivePrice: normPrice,
      regularPrice: normPrice,
      compareAtPrice: null,
      isOnSale: false,
      discountPercent: null,
      campaign: null,
    };
  }

  const isVariant = Boolean(target?.isVariant || target?.variantId);

  // Variant isolation invariant: A variant's original price is strictly its own variantOriginalPrice.
  // It NEVER inherits normOriginal (parent originalPrice)!
  const effectiveOriginal = isVariant
    ? target?.variantOriginalPrice !== undefined && target?.variantOriginalPrice !== null
      ? normalizeVnd(target.variantOriginalPrice)
      : null
    : normOriginal;

  // 2. Check Explicit Campaign Items (Priority 1 & 2)
  if (settings?.activeCampaign) {
    const camp = settings.activeCampaign;
    let campItem:
      | {
          salePrice: number;
          regularPrice: number | null;
          campaignId?: string;
          campaignName?: string;
          startAt?: string;
          endAt?: string;
        }
      | undefined;

    const getItem = (key: string) => {
      if (!camp.items) return undefined;
      if (camp.items instanceof Map) return camp.items.get(key);
      return (camp.items as Record<string, any>)[key];
    };

    // Safe Scope Rule:
    // When evaluating a variant, ONLY check the explicit variant item key `${productId}:${variantId}`.
    // NEVER fall back to base product item! Base product item only applies to base product (isVariant === false).
    if (isVariant) {
      if (target?.productId && target?.variantId) {
        campItem = getItem(`${target.productId}:${target.variantId}`);
      }
    } else {
      if (target?.productId) {
        campItem = getItem(target.productId);
      }
    }

    // Exact Server-Enforced Time Window Verification: [startAt, endAt)
    // Checks against `at`, protecting against stale context or merged campaign records.
    if (campItem) {
      const startStr = campItem.startAt || camp.startAt;
      const endStr = campItem.endAt || camp.endAt;
      if (startStr && endStr) {
        const startMs = new Date(startStr).getTime();
        const endMs = new Date(endStr).getTime();
        const atMs = at.getTime();
        if (Number.isNaN(startMs) || Number.isNaN(endMs) || atMs < startMs || atMs >= endMs) {
          campItem = undefined; // Outside [startAt, endAt) half-open interval!
        }
      }
    }

    if (campItem) {
      const salePrice = normalizeVnd(campItem.salePrice);
      const regularPrice = campItem.regularPrice
        ? normalizeVnd(campItem.regularPrice)
        : effectiveOriginal ?? normPrice;

      // Sale price must be strictly less than regular price to be valid
      if (salePrice < regularPrice && salePrice > 0) {
        const discountAmount = regularPrice - salePrice;
        const discountPercent = Math.round((discountAmount / regularPrice) * 100);

        return {
          currency: 'VND',
          effectivePrice: salePrice,
          regularPrice,
          compareAtPrice: regularPrice,
          isOnSale: true,
          discountPercent,
          campaign: {
            id: campItem.campaignId || camp.campaignId,
            name: campItem.campaignName || camp.campaignName,
            title: campItem.campaignName || camp.campaignName,
            source: 'campaign',
            startAt: campItem.startAt || camp.startAt,
            endAt: campItem.endAt || camp.endAt,
            discountAmount,
          },
        };
      }
    }
  }

  // 3. Check Legacy Site-Wide Flash Sale (Priority 3)
  const isSaleActive = isFlashSaleActive(settings, at);

  if (isSaleActive && isProductFlashSale) {
    if (isVariant) {
      // Invariant: Variant without valid sale config retains its own regular price
      // Never inherit parent originalPrice!
      if (effectiveOriginal !== null && effectiveOriginal > normPrice) {
        const discountAmount = effectiveOriginal - normPrice;
        const discountPercent = Math.round((discountAmount / effectiveOriginal) * 100);

        return {
          currency: 'VND',
          effectivePrice: normPrice,
          regularPrice: effectiveOriginal,
          compareAtPrice: effectiveOriginal,
          isOnSale: true,
          discountPercent,
          campaign: {
            id: 'site-flash-sale',
            name: settings?.flashSaleTitle || 'Giá Sốc Giờ Vàng',
            title: settings?.flashSaleTitle || 'Giá Sốc Giờ Vàng',
            source: 'site-flash-sale',
            startAt: settings?.flashSaleStartAt || '',
            endAt: settings?.flashSaleEndAt || '',
            discountAmount,
          },
        };
      } else {
        // Variant does not have valid sale discount; retains regular price and is NOT on sale
        return {
          currency: 'VND',
          effectivePrice: normPrice,
          regularPrice: normPrice,
          compareAtPrice: null,
          isOnSale: false,
          discountPercent: null,
          campaign: null,
        };
      }
    }

    // Base product without variants:
    if (effectiveOriginal !== null && effectiveOriginal > normPrice) {
      const discountAmount = effectiveOriginal - normPrice;
      const discountPercent = Math.round((discountAmount / effectiveOriginal) * 100);

      return {
        currency: 'VND',
        effectivePrice: normPrice,
        regularPrice: effectiveOriginal,
        compareAtPrice: effectiveOriginal,
        isOnSale: true,
        discountPercent,
        campaign: {
          id: 'site-flash-sale',
          name: settings?.flashSaleTitle || 'Giá Sốc Giờ Vàng',
          title: settings?.flashSaleTitle || 'Giá Sốc Giờ Vàng',
          source: 'site-flash-sale',
          startAt: settings?.flashSaleStartAt || '',
          endAt: settings?.flashSaleEndAt || '',
          discountAmount,
        },
      };
    }
  }

  // 4. Inactive Flash Sale Expiration:
  // For legacy products marked isFlashSale with originalPrice > price, outside flash sale
  // they revert to their pre-sale regularPrice (originalPrice).
  // BUT for variants without their own originalPrice, they NEVER borrow parent's originalPrice!
  if (!isSaleActive && isProductFlashSale) {
    if (isVariant) {
      if (effectiveOriginal !== null && effectiveOriginal > normPrice) {
        // Variant had its own regular price before flash sale
        return {
          currency: 'VND',
          effectivePrice: effectiveOriginal,
          regularPrice: effectiveOriginal,
          compareAtPrice: null,
          isOnSale: false,
          discountPercent: null,
          campaign: null,
        };
      } else {
        // Variant has no originalPrice: stays at its own variant.price
        return {
          currency: 'VND',
          effectivePrice: normPrice,
          regularPrice: normPrice,
          compareAtPrice: null,
          isOnSale: false,
          discountPercent: null,
          campaign: null,
        };
      }
    }

    // Base product without variants:
    if (effectiveOriginal !== null && effectiveOriginal > normPrice) {
      return {
        currency: 'VND',
        effectivePrice: effectiveOriginal,
        regularPrice: effectiveOriginal,
        compareAtPrice: null,
        isOnSale: false,
        discountPercent: null,
        campaign: null,
      };
    }
  }

  // 5. Normal Product (No Campaign / Flash Sale Active):
  // According to R07B contract: isOnSale is false when not in valid campaign or flash sale.
  if (effectiveOriginal !== null && effectiveOriginal > normPrice && !isProductFlashSale) {
    return {
      currency: 'VND',
      effectivePrice: normPrice,
      regularPrice: normPrice,
      compareAtPrice: effectiveOriginal,
      isOnSale: false,
      discountPercent: null,
      campaign: null,
    };
  }

  // 6. Standard pricing without discount
  return {
    currency: 'VND',
    effectivePrice: normPrice,
    regularPrice: normPrice,
    compareAtPrice: null,
    isOnSale: false,
    discountPercent: null,
    campaign: null,
  };
}

export class PricingTargetError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.name = 'PricingTargetError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Universal helper that fetches storefront settings and active campaigns at a given evaluation timestamp.
 * FAIL-CLOSED: Does NOT swallow database / infrastructure errors into null.
 */
export async function getStorefrontPricingContext(
  d1?: D1Database,
  at: Date = new Date()
): Promise<PriceEvaluationContext> {
  const db = d1 || (await mediaEnvironment()).DB;
  if (!db) {
    throw new Error('PRICING_DB_UNAVAILABLE: Database connection is required for storefront pricing.');
  }

  const [publicSettings, activeCampaign] = await Promise.all([
    getPublicStorefrontSettings(db),
    resolveActiveCampaigns(at, db),
  ]);

  return {
    flashSaleEnabled: Boolean(publicSettings.flashSaleEnabled),
    flashSaleTitle: publicSettings.flashSaleTitle || 'Giá Sốc Giờ Vàng',
    flashSaleStartAt: publicSettings.flashSaleStartAt || '',
    flashSaleEndAt: publicSettings.flashSaleEndAt || '',
    activeCampaign: activeCampaign || null,
  };
}

/**
 * Asynchronously resolves authoritative pricing for a product or variant.
 * Single source of truth for cards, PDP, cart, checkout, order.
 * STRICT: Rejects missing, deleted, wrong parent, inactive or unorderable targets via PricingTargetError.
 */
export async function resolvePrice(input: ResolvePriceInput): Promise<ResolvedPrice> {
  const at = input.at || new Date();
  let settings = input.settings;

  // 1. Resolve settings if not provided
  if (!settings) {
    let db = input.explicitDb;
    if (!db) {
      try {
        db = (await mediaEnvironment()).DB;
      } catch {}
    }
    if (db) {
      settings = await getStorefrontPricingContext(db, at);
    }
  }

  // 2. Resolve product & variant data
  let basePrice = 0;
  let originalPrice: number | null = null;
  let isFlashSale = false;
  let isProductActive = true;
  let isVariant = Boolean(input.variantId);
  let variantOriginalPrice: number | null = null;

  if (input.product) {
    if (!['ACTIVE', 'active'].includes(input.product.status)) {
      throw new PricingTargetError('Sản phẩm không ở trạng thái mở bán', 'PRODUCT_NOT_AVAILABLE', 400);
    }

    basePrice = input.product.price;
    originalPrice = input.product.originalPrice ?? null;
    isFlashSale = Boolean(input.product.isFlashSale);
    isProductActive = true;

    if (input.variantId) {
      const variants = input.product.variants || [];
      const v = variants.find((item) => item.id === input.variantId);
      if (!v) {
        throw new PricingTargetError('Biến thể không tồn tại hoặc không thuộc sản phẩm', 'VARIANT_NOT_FOUND', 404);
      }
      if (!['ACTIVE', 'active'].includes(v.status)) {
        throw new PricingTargetError('Biến thể không ở trạng thái mở bán', 'VARIANT_NOT_AVAILABLE', 400);
      }

      basePrice = v.price;
      variantOriginalPrice = v.originalPrice !== undefined && v.originalPrice !== null ? v.originalPrice : null;
      originalPrice = variantOriginalPrice;
      isVariant = true;
    }
  } else {
    // Query D1 directly via explicitDb or Prisma
    const db = input.explicitDb;
    if (db) {
      const p = await db
        .prepare('SELECT p.id, p.price, p.originalPrice, p.status, p.isFlashSale, ps.published FROM Product p LEFT JOIN ProductStudio ps ON ps.productId = p.id WHERE p.id = ? AND p.deletedAt IS NULL')
        .bind(input.productId)
        .first<{
          id: string;
          price: number;
          originalPrice: number | null;
          status: string;
          isFlashSale: number | boolean;
          published: string | null;
        }>();

      if (!p) {
        throw new PricingTargetError('Sản phẩm không tồn tại hoặc đã bị xóa', 'PRODUCT_NOT_FOUND', 404);
      }
      if (!['ACTIVE', 'active'].includes(p.status)) {
        throw new PricingTargetError('Sản phẩm không ở trạng thái mở bán', 'PRODUCT_NOT_AVAILABLE', 400);
      }

      // Studio published orderability validation
      if (p.published) {
        try {
          const doc = JSON.parse(p.published);
          if (doc && typeof doc === 'object') {
            if (doc.availability !== 'AVAILABLE' && doc.availability !== 'PREORDER') {
              throw new PricingTargetError('Sản phẩm tạm ngừng nhận đơn', 'PRODUCT_NOT_AVAILABLE', 400);
            }
            if (input.variantId && Array.isArray(doc.variants)) {
              const vDoc = doc.variants.find((item: any) => item && item.id === input.variantId);
              if (!vDoc) {
                throw new PricingTargetError('Biến thể không tồn tại trong bản xuất bản', 'VARIANT_NOT_FOUND', 404);
              }
              if (vDoc.availability && vDoc.availability !== 'AVAILABLE' && vDoc.availability !== 'PREORDER') {
                throw new PricingTargetError('Biến thể tạm ngừng nhận đơn', 'VARIANT_NOT_AVAILABLE', 400);
              }
            }
          }
        } catch (e) {
          if (e instanceof PricingTargetError) throw e;
          throw new PricingTargetError('Sản phẩm chưa có cấu hình xuất bản hợp lệ', 'PRODUCT_NOT_AVAILABLE', 400);
        }
      }

      basePrice = p.price;
      originalPrice = p.originalPrice;
      isFlashSale = Boolean(p.isFlashSale);
      isProductActive = true;

      if (input.variantId) {
        const v = await db
          .prepare('SELECT id, price, originalPrice, status FROM ProductVariant WHERE id = ? AND productId = ?')
          .bind(input.variantId, input.productId)
          .first<{
            id: string;
            price: number;
            originalPrice: number | null;
            status: string;
          }>();

        if (!v) {
          throw new PricingTargetError('Biến thể không tồn tại hoặc không thuộc sản phẩm', 'VARIANT_NOT_FOUND', 404);
        }
        if (!['ACTIVE', 'active'].includes(v.status)) {
          throw new PricingTargetError('Biến thể không ở trạng thái mở bán', 'VARIANT_NOT_AVAILABLE', 400);
        }

        basePrice = v.price;
        variantOriginalPrice = v.originalPrice;
        originalPrice = variantOriginalPrice;
        isVariant = true;
      }
    } else {
      const client = input.client || prisma;
      const p = await client.product.findFirst({
        where: { id: input.productId, deletedAt: null },
        select: {
          id: true,
          price: true,
          originalPrice: true,
          status: true,
          isFlashSale: true,
          studio: { select: { published: true } },
          variants: input.variantId
            ? {
                where: { id: input.variantId, productId: input.productId },
                select: { id: true, price: true, originalPrice: true, status: true },
              }
            : false,
        },
      });

      if (!p) {
        throw new PricingTargetError('Sản phẩm không tồn tại hoặc đã bị xóa', 'PRODUCT_NOT_FOUND', 404);
      }
      if (!['ACTIVE', 'active'].includes(p.status)) {
        throw new PricingTargetError('Sản phẩm không ở trạng thái mở bán', 'PRODUCT_NOT_AVAILABLE', 400);
      }

      if (p.studio?.published) {
        try {
          const doc = JSON.parse(p.studio.published);
          if (doc && typeof doc === 'object') {
            if (doc.availability !== 'AVAILABLE' && doc.availability !== 'PREORDER') {
              throw new PricingTargetError('Sản phẩm tạm ngừng nhận đơn', 'PRODUCT_NOT_AVAILABLE', 400);
            }
            if (input.variantId && Array.isArray(doc.variants)) {
              const vDoc = doc.variants.find((item: any) => item && item.id === input.variantId);
              if (!vDoc) {
                throw new PricingTargetError('Biến thể không tồn tại trong bản xuất bản', 'VARIANT_NOT_FOUND', 404);
              }
              if (vDoc.availability && vDoc.availability !== 'AVAILABLE' && vDoc.availability !== 'PREORDER') {
                throw new PricingTargetError('Biến thể tạm ngừng nhận đơn', 'VARIANT_NOT_AVAILABLE', 400);
              }
            }
          }
        } catch (e) {
          if (e instanceof PricingTargetError) throw e;
          throw new PricingTargetError('Sản phẩm chưa có cấu hình xuất bản hợp lệ', 'PRODUCT_NOT_AVAILABLE', 400);
        }
      }

      basePrice = p.price;
      originalPrice = p.originalPrice;
      isFlashSale = Boolean(p.isFlashSale);
      isProductActive = true;

      if (input.variantId) {
        if (!p.variants || p.variants.length === 0) {
          throw new PricingTargetError('Biến thể không tồn tại hoặc không thuộc sản phẩm', 'VARIANT_NOT_FOUND', 404);
        }
        const v = p.variants[0];
        if (!['ACTIVE', 'active'].includes(v.status)) {
          throw new PricingTargetError('Biến thể không ở trạng thái mở bán', 'VARIANT_NOT_AVAILABLE', 400);
        }

        basePrice = v.price;
        variantOriginalPrice = v.originalPrice;
        originalPrice = variantOriginalPrice;
        isVariant = true;
      }
    }
  }

  return calculateEffectivePrice(
    basePrice,
    originalPrice,
    isFlashSale,
    isProductActive,
    settings,
    at,
    {
      productId: input.productId,
      variantId: input.variantId,
      isVariant,
      variantOriginalPrice: isVariant ? variantOriginalPrice : null,
    }
  );
}

/**
 * Idempotently applies unified pricing to an array of HomepageProduct DTOs.
 * Preserves raw database prices in `rawPrice` and `rawOriginalPrice` so calling this
 * function repeatedly produces clean, non-mutated, idempotent results.
 */
export function applyPricingToHomepageProducts(
  products: HomepageProduct[],
  settings?: PriceEvaluationContext | null,
  at: Date = new Date()
): HomepageProduct[] {
  return products.map((p) => {
    // Preserve raw prices to ensure idempotence across multiple calls
    const rawPrice = (p as { rawPrice?: number }).rawPrice ?? p.price;
    const rawOriginal = (p as { rawOriginalPrice?: number | null }).rawOriginalPrice ?? p.originalPrice ?? p.oldPrice ?? null;
    const isVariant = Boolean(p.variantId);

    const resolved = calculateEffectivePrice(
      rawPrice,
      rawOriginal,
      Boolean(p.isFlashSale),
      true,
      settings,
      at,
      {
        productId: p.id,
        variantId: p.variantId,
        isVariant,
        variantOriginalPrice: isVariant ? rawOriginal : null,
      }
    );

    return {
      ...p,
      rawPrice,
      rawOriginalPrice: rawOriginal,
      price: resolved.effectivePrice,
      originalPrice: resolved.compareAtPrice,
      oldPrice: resolved.compareAtPrice,
      isOnSale: resolved.isOnSale,
      discount: resolved.discountPercent ? `-${resolved.discountPercent}%` : undefined,
    } as HomepageProduct;
  });
}
