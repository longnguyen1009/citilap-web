import { prisma } from '@/lib/prisma';
import { getCampaignWindows } from '@/lib/campaign-schedule';
import { mapD1ProductToHomepageProduct, getFlashSaleProducts, type ProductDbRow, type HomepageProduct } from './catalog.service';
import { getStorefrontPricingContext, isFlashSaleActive, type PriceEvaluationContext } from './pricing.service';

const ACTIVE_AVAILABILITIES = new Set(['AVAILABLE', 'PREORDER', 'IN_STOCK', 'ACTIVE']);

interface PublishedStudioDoc {
  availability?: string;
  variants?: Array<{ id: string; availability?: string }>;
}

function parsePublishedStudio(raw?: string | null): PublishedStudioDoc | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublishedStudioDoc;
  } catch {
    return null;
  }
}

function isExplicitVariantPublishedAvailable(published: PublishedStudioDoc | null, variantId: string): boolean {
  if (!published) return true;
  return Boolean(
    published.variants?.some((v) => {
      const vAvail = typeof v.availability === 'string' ? v.availability.toUpperCase() : '';
      return v.id === variantId && (!vAvail || ACTIVE_AVAILABILITIES.has(vAvail));
    })
  );
}

function getVariantOrderMap(published: PublishedStudioDoc | null, variants: Array<{ id: string }>): Map<string, number> {
  const order = new Map<string, number>();
  if (published?.variants?.length) {
    published.variants.forEach((v, idx) => {
      if (v.id && !order.has(v.id)) order.set(v.id, idx);
    });
  }
  variants.forEach((v, idx) => {
    if (!order.has(v.id)) order.set(v.id, 10000 + idx);
  });
  return order;
}

function hasConfiguredItemDiscount(
  item: { salePrice: number; regularPrice?: number | null; quantityLimit?: number | null; soldCount?: number | null },
  mapped: HomepageProduct
): boolean {
  if (item.quantityLimit != null && (item.soldCount ?? 0) >= item.quantityLimit) return false;
  const sellingPrice = mapped.rawPrice ?? mapped.price;
  const refRegular = item.regularPrice ?? mapped.rawOriginalPrice ?? sellingPrice;
  return item.salePrice > 0 && item.salePrice < sellingPrice && item.salePrice < refRegular;
}

export async function getHotSaleCampaigns(context?: PriceEvaluationContext, at = new Date()) {
  const pricing = context ?? await getStorefrontPricingContext(undefined, at);
  const campaigns = await prisma.promotionCampaign.findMany({
    where: { status: 'PUBLISHED', endAt: { gt: at } },
    include: { items: true },
    orderBy: { startAt: 'asc' },
  });
  const ids = [...new Set(campaigns.flatMap(c => c.items.map(i => i.productId)))];
  const rows = ids.length ? await prisma.product.findMany({
    where: { id: { in: ids }, status: { in: ['ACTIVE', 'active'] }, deletedAt: null, NOT: { studio: { is: { published: null } } } },
    include: { category: true, brandRel: true, productImages: true, studio: true, variants: { where: { status: { in: ['ACTIVE', 'active'] } } } },
  }) : [];
  const byId = new Map(rows.map(row => [row.id, row]));

  const campaignSlots = campaigns.flatMap(c => getCampaignWindows(c)
    .filter(w => Date.parse(w.endAt) > at.getTime())
    .map(w => ({ ...c, sourceId: c.id, id: c.scheduleJson ? `${c.id}:${w.startAt}` : c.id,
      startAt: new Date(w.startAt), endAt: new Date(w.endAt) })));
  const tabs: { id: string; name: string; startAt: string; endAt: string; products: HomepageProduct[] }[] = campaignSlots.map(campaign => {
    const isRunning = campaign.startAt <= at;
    // Preview this slot's configured prices without changing live checkout pricing.
    const displayAt = isRunning ? at : campaign.startAt;
    const displayPricing: PriceEvaluationContext = {
      ...pricing,
      flashSaleEnabled: false,
      activeCampaign: {
        campaignId: campaign.sourceId,
        campaignName: campaign.name,
        startAt: campaign.startAt.toISOString(),
        endAt: campaign.endAt.toISOString(),
        items: new Map(campaign.items.map(item => [
          item.variantId ? `${item.productId}:${item.variantId}` : item.productId,
          { ...item, campaignId: campaign.sourceId, campaignName: campaign.name,
            startAt: campaign.startAt.toISOString(), endAt: campaign.endAt.toISOString() },
        ])),
      },
    };
    // Collapse multi-variant options belonging to the same productId into 1 card,
    // picking the first option (in Studio variant order) that actually has a discount.
    const itemsByProduct = new Map<string, typeof campaign.items>();
    for (const item of campaign.items) {
      const list = itemsByProduct.get(item.productId);
      if (list) list.push(item);
      else itemsByProduct.set(item.productId, [item]);
    }

    const products: HomepageProduct[] = [];
    for (const [productId, productItems] of itemsByProduct.entries()) {
      const row = byId.get(productId);
      if (!row) continue;

      const published = parsePublishedStudio(row.studio?.published);
      const pubAvail = typeof published?.availability === 'string' ? published.availability.toUpperCase() : '';
      if (published && pubAvail && !ACTIVE_AVAILABILITIES.has(pubAvail)) continue;

      const orderMap = getVariantOrderMap(published, row.variants);
      const orderedItems = productItems
        .map((item, idx) => ({
          item,
          idx,
          rank: item.variantId ? (orderMap.get(item.variantId) ?? 20000 + idx) : 30000 + idx,
        }))
        .sort((a, b) => a.rank - b.rank || a.idx - b.idx)
        .map((entry) => entry.item);

      const candidates: Array<{ mapped: HomepageProduct; hasConfiguredDiscount: boolean }> = [];

      for (const item of orderedItems) {
        if (item.variantId) {
          if (!isExplicitVariantPublishedAvailable(published, item.variantId)) continue;
          const variants = row.variants.filter(v => v.id === item.variantId);
          if (!variants.length) continue;
          const mapped = mapD1ProductToHomepageProduct({ ...row, variants } as unknown as ProductDbRow, undefined, displayPricing, displayAt);
          candidates.push({
            mapped,
            hasConfiguredDiscount: hasConfiguredItemDiscount(item, mapped),
          });
        } else {
          // Product-level item: evaluate variants in Studio order individually so the first discounted option wins.
          const orderedVariants = [...row.variants]
            .sort((a, b) => (orderMap.get(a.id) ?? 99999) - (orderMap.get(b.id) ?? 99999));

          if (orderedVariants.length > 0) {
            const variantCandidates = orderedVariants
              .map(v => mapD1ProductToHomepageProduct({ ...row, variants: [v] } as unknown as ProductDbRow, undefined, displayPricing, displayAt))
              .filter(p => p.availability !== 'UNAVAILABLE');
            const discountedVariant = variantCandidates.find(p => p.saleCampaignId === campaign.sourceId) ?? variantCandidates[0];
            if (discountedVariant) {
              candidates.push({
                mapped: discountedVariant,
                hasConfiguredDiscount: hasConfiguredItemDiscount(item, discountedVariant),
              });
            }
          } else {
            const mapped = mapD1ProductToHomepageProduct({ ...row, variants: [] } as unknown as ProductDbRow, undefined, displayPricing, displayAt);
            candidates.push({
              mapped,
              hasConfiguredDiscount: hasConfiguredItemDiscount(item, mapped),
            });
          }
        }
      }

      if (!candidates.length) continue;

      if (isRunning) {
        const chosen = candidates.find(c => c.mapped.saleCampaignId === campaign.sourceId);
        if (chosen) products.push(chosen.mapped);
      } else {
        const chosen = candidates.find(c => c.hasConfiguredDiscount) ?? candidates[0];
        if (chosen) products.push(chosen.mapped);
      }
    }

    return {
      id: campaign.id,
      name: campaign.name,
      startAt: campaign.startAt.toISOString(),
      endAt: campaign.endAt.toISOString(),
      products,
    };
  }).filter(c => c.products.length);

  if (isFlashSaleActive(pricing, at)) {
    const rawLegacy = await getFlashSaleProducts(50, pricing, at);
    const seenLegacy = new Set<string>();
    const products = rawLegacy.filter(p => {
      if (!p.isOnSale || seenLegacy.has(p.id)) return false;
      seenLegacy.add(p.id);
      return !tabs.some(t => new Date(t.startAt) <= at && t.products.some(item => item.id === p.id));
    });
    // Start time is optional for the site-wide flash sale; an empty value means "already running".
    const startMs = Date.parse(pricing.flashSaleStartAt || '');
    const startAt = Number.isNaN(startMs) ? at.toISOString() : new Date(startMs).toISOString();
    if (products.length) tabs.push({ id: 'site-flash-sale', name: pricing.flashSaleTitle || 'FLASH SALE', startAt, endAt: pricing.flashSaleEndAt, products });
  }
  return tabs.sort((a, b) => Number(new Date(a.startAt) > at) - Number(new Date(b.startAt) > at));
}
