import { prisma } from '@/lib/prisma';
import { mapD1ProductToHomepageProduct, getFlashSaleProducts, type ProductDbRow, type HomepageProduct } from './catalog.service';
import { getStorefrontPricingContext, isFlashSaleActive, type PriceEvaluationContext } from './pricing.service';

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
  const tabs: { id: string; name: string; startAt: string; endAt: string; products: HomepageProduct[] }[] = campaigns.map(campaign => ({
    id: campaign.id,
    name: campaign.name,
    startAt: campaign.startAt.toISOString(),
    endAt: campaign.endAt.toISOString(),
    products: campaign.items.flatMap(item => {
      const row = byId.get(item.productId);
      if (!row) return [];
      const published = row.studio?.published ? JSON.parse(row.studio.published) : null;
      if (published && !['AVAILABLE', 'PREORDER'].includes(published.availability)) return [];
      if (item.variantId && published && !published.variants?.some((v: { id: string; availability?: string }) => v.id === item.variantId && (!v.availability || ['AVAILABLE', 'PREORDER'].includes(v.availability)))) return [];
      const variants = item.variantId ? row.variants.filter(v => v.id === item.variantId) : row.variants;
      if (item.variantId && !variants.length) return [];
      const product = mapD1ProductToHomepageProduct({ ...row, variants } as unknown as ProductDbRow, undefined, pricing, at);
      // Base campaign prices never apply to variants; only show real offers while active.
      return campaign.startAt <= at && !product.isOnSale ? [] : [product];
    }),
  })).filter(c => c.products.length);
  if (isFlashSaleActive(pricing, at)) {
    const products = (await getFlashSaleProducts(50, pricing, at)).filter(p => p.isOnSale && !tabs.some(t => new Date(t.startAt) <= at && t.products.some(item => item.id === p.id && item.variantId === p.variantId)));
    if (products.length) tabs.push({ id: 'site-flash-sale', name: pricing.flashSaleTitle || 'FLASH SALE', startAt: pricing.flashSaleStartAt, endAt: pricing.flashSaleEndAt, products });
  }
  return tabs.sort((a, b) => Number(new Date(a.startAt) > at) - Number(new Date(b.startAt) > at));
}
