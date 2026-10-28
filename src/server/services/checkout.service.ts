import type { D1Database } from '@cloudflare/workers-types';
import { getPrismaClient } from '@/lib/prisma';
import { assertPublishedStudioOrderable } from './storefront-order-guard';
import { calculateEffectivePrice, getStorefrontPricingContext } from './pricing.service';
import { adminSettingsDocumentSchema } from '@/contracts/cms/settings';
import { checkoutSelectionSchema, type CheckoutQuote } from '@/contracts/checkout';
import type { ResolvedOrderItem, PriceChangedError } from './order.service';
import { computeShippingFee } from './checkout-shipping-policy';
import { resolveProductWarranty } from '@/lib/product-warranty';

export class CheckoutError extends Error {
  constructor(public code: string, message: string, public status = 400, public details?: unknown) { super(message); }
}
async function readCheckoutSettings(db: D1Database) {
  const row = await db.prepare("SELECT revision, document FROM SiteSettings WHERE id='site'").first<{revision:number;document:string}>();
  if (!row) throw new CheckoutError('CHECKOUT_UNAVAILABLE', 'Cửa hàng chưa cấu hình nhận đơn.', 503);
  const parsed = adminSettingsDocumentSchema.safeParse(JSON.parse(row.document));
  if (!parsed.success) throw new CheckoutError('CHECKOUT_UNAVAILABLE', 'Cấu hình nhận đơn chưa hợp lệ.', 503);
  return {revision:row.revision, document:parsed.data};
}
export async function calculateCheckout(input: unknown, db: D1Database, at = new Date()) {
  const validation = checkoutSelectionSchema.safeParse(input);
  if (!validation.success) throw new CheckoutError('INVALID_CHECKOUT', 'Thông tin giỏ hàng hoặc nhận hàng không hợp lệ.');
  const payload = validation.data;
  const prisma = getPrismaClient(db);
  // 4. Resolve products & variants from D1 with authoritative pricing
  const evaluatedAt = at;
  const now = evaluatedAt.toISOString().replace('Z', '+00:00');
  const evaluatedAtStr = now;

  // Differentiate infrastructure failure from inactive campaign: fail-closed if DB throws
  const settings = await readCheckoutSettings(db);
  const storefrontSettings = await getStorefrontPricingContext(db, evaluatedAt, settings.document);

  const resolvedItems: ResolvedOrderItem[] = [];
  const campaignNotes: string[] = [];
  const changedItems: PriceChangedError['details']['changedItems'] = [];
  let subtotalAmount = 0;
  let expectedSubtotal = 0;
  const warranties: NonNullable<CheckoutQuote['snapshot']['warranties']> = [];

  for (const item of payload.items) {
    if (!item || typeof item !== 'object') {
      throw new Error('INVALID_ITEM');
    }
    const productId = typeof item.productId === 'string' ? item.productId.trim() : '';
    const variantId = typeof item.variantId === 'string' && item.variantId.trim() ? item.variantId.trim() : null;
    const quantity = Number(item.quantity);

    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error('INVALID_ITEM');
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: {
        id: true, name: true, price: true, originalPrice: true, status: true, isFlashSale: true,
        studio: { select: { published: true } },
      },
    });

    if (!product || product.status !== 'ACTIVE') {
      throw new Error('PRODUCT_UNAVAILABLE');
    }

    assertPublishedStudioOrderable(
      { hasStudio: product.studio !== null, published: product.studio?.published },
      variantId
    );

    let basePrice = product.price;
    let originalPrice: number | null = null;
    let sku: string | null = null;
    let variantName: string | null = null;

    if (variantId) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: variantId, productId },
        select: { id: true, sku: true, name: true, price: true, originalPrice: true, status: true },
      });

      if (!variant || variant.status !== 'ACTIVE') {
        throw new Error('VARIANT_UNAVAILABLE');
      }

      basePrice = variant.price;
      // Invariant: Variant NEVER borrows parent's originalPrice!
      originalPrice = variant.originalPrice !== null && variant.originalPrice !== undefined ? variant.originalPrice : null;
      sku = variant.sku;
      variantName = variant.name;
    } else {
      originalPrice = product.originalPrice ?? null;
    }

    // Evaluate authoritative pricing via pricing.service
    const resolvedPricing = calculateEffectivePrice(
      basePrice,
      originalPrice,
      Boolean(product.isFlashSale),
      true,
      storefrontSettings,
      evaluatedAt,
      {
        productId,
        variantId,
        isVariant: Boolean(variantId),
        variantOriginalPrice: variantId ? originalPrice : null,
      }
    );

    const warranty = resolveProductWarranty(product.studio?.published, item.warrantyName);
    if (warranty) warranties.push({ productId, variantId, ...warranty });
    const price = resolvedPricing.effectivePrice + (warranty?.adjustment || 0);

    // Strict 0đ tolerance verification against client expectation if provided
    let expectedItemPrice: number | null = null;
    if (item.expectedPrice !== undefined && item.expectedPrice !== null) {
      expectedItemPrice = Number(item.expectedPrice);
      if (!Number.isFinite(expectedItemPrice)) {
        throw new Error('INVALID_ITEM');
      }
      if (expectedItemPrice !== price) {
        changedItems.push({
          productId,
          variantId,
          productName: variantName ? `${product.name} - ${variantName}` : product.name,
          oldPrice: expectedItemPrice,
          newPrice: price,
          quantity,
          oldLineTotal: expectedItemPrice * quantity,
          newLineTotal: price * quantity,
        });
      }
    }

    const priceForOldSubtotal = expectedItemPrice !== null ? expectedItemPrice : price;
    expectedSubtotal += priceForOldSubtotal * quantity;

    if (resolvedPricing.campaign) {
      campaignNotes.push(`${product.name}: ${resolvedPricing.campaign.name}`);
    }

    const lineTotal = price * quantity;
    subtotalAmount += lineTotal;
    if (![price, lineTotal, subtotalAmount, expectedSubtotal].every(v=>Number.isSafeInteger(v) && v>=0)) {
      throw new CheckoutError('INVALID_CHECKOUT', 'Số tiền không hợp lệ.');
    }

    resolvedItems.push({
      productId,
      variantId,
      warrantyName: warranty?.name || null,
      productName: product.name,
      sku,
      productNameSnapshot: product.name,
      skuSnapshot: sku,
      variantNameSnapshot: [variantName, warranty?.name].filter(Boolean).join(' | ') || null,
      price,
      priceSnapshot: price,
      regularPriceSnapshot: resolvedPricing.regularPrice + (warranty?.adjustment || 0),
      compareAtPriceSnapshot: resolvedPricing.compareAtPrice === null ? null : resolvedPricing.compareAtPrice + (warranty?.adjustment || 0),
      campaignSnapshot: resolvedPricing.campaign ? JSON.stringify(resolvedPricing.campaign) : null,
      pricingEvaluatedAt: evaluatedAtStr,
      quantity,
      lineTotal,
    });
  }


  const config = settings.document;
  const allowedPaymentMethods: CheckoutQuote['allowedPaymentMethods'] = [];
  if (config.codEnabled) allowedPaymentMethods.push('COD');
  if (config.bankTransferEnabled && config.bankAccountInfo.trim()) allowedPaymentMethods.push('BANK_TRANSFER');
  if (!allowedPaymentMethods.length) throw new CheckoutError('CHECKOUT_UNAVAILABLE', 'Cửa hàng đang tạm ngưng nhận đơn. Vui lòng liên hệ để được hỗ trợ.', 503);
  if (payload.paymentMethod && !allowedPaymentMethods.includes(payload.paymentMethod)) throw new CheckoutError('PAYMENT_METHOD_DISABLED', 'Phương thức thanh toán đã ngừng hỗ trợ. Vui lòng chọn lại.');
  // ponytail: only Hanoi supports online pickup; add explicit showroom settings before expanding.
  const showrooms = config.addressHanoi.trim() ? [{id:'hanoi', name:config.storeName + ' Hà Nội', address:config.addressHanoi.trim(), phone:config.storePhone}] : [];
  const showroom = payload.shippingMethod === 'pickup' ? showrooms.find(s => s.id === payload.showroomId) : null;
  if (payload.shippingMethod === 'pickup' && !showroom) throw new CheckoutError('SHOWROOM_UNAVAILABLE', 'Điểm nhận hàng không còn khả dụng. Vui lòng chọn lại.');
  const shippingFee = computeShippingFee({shippingMethod:payload.shippingMethod, subtotal:subtotalAmount, shippingFee:config.shippingFee, freeShippingThreshold:config.freeShippingThreshold});
  if (!Number.isSafeInteger(subtotalAmount + shippingFee)) throw new CheckoutError('INVALID_CHECKOUT', 'Tổng tiền vượt giới hạn.');
  const vietQr =
    payload.paymentMethod === 'BANK_TRANSFER' && config.bankBin.trim() && config.bankAccountNumber.trim()
      ? {
          bankBin: config.bankBin.trim(),
          accountNumber: config.bankAccountNumber.trim(),
          accountName: config.bankAccountName.trim(),
        }
      : undefined;
  const snapshot = {settingsRevision:settings.revision, showroom:showroom || null, bankAccountInfo:payload.paymentMethod === 'BANK_TRANSFER' ? config.bankAccountInfo.trim() : null, ...(vietQr ? {vietQr} : {}), ...(warranties.length ? {warranties} : {})};
  const terms = JSON.stringify({shippingMethod:payload.shippingMethod,paymentMethod:payload.paymentMethod || null,showroom:snapshot.showroom,bankAccountInfo:snapshot.bankAccountInfo, ...(vietQr ? {vietQr} : {}), ...(warranties.length ? {warranties} : {})});
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(terms));
  const termsVersion = Array.from(new Uint8Array(digest), b=>b.toString(16).padStart(2,'0')).join('');
  const quote: CheckoutQuote = {evaluatedAt:at.toISOString(),lines:resolvedItems.map(i=>({productId:i.productId,variantId:i.variantId,warrantyName:i.warrantyName,productName:i.variantNameSnapshot ? i.productName+' - '+i.variantNameSnapshot : i.productName,quantity:i.quantity,price:i.price,lineTotal:i.lineTotal})),subtotal:subtotalAmount,shippingFee,totalAmount:subtotalAmount+shippingFee,shippingMethod:payload.shippingMethod,paymentMethod:payload.paymentMethod || null,allowedPaymentMethods,showrooms,snapshot,termsVersion};
  return {quote,resolvedItems,campaignNotes,changedItems,expectedSubtotal};
}
