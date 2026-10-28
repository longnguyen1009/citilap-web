import HotSaleCampaigns from './HotSaleCampaigns';
import ProductTabs from './ProductTabs';
import { getHotSaleCampaigns } from '@/server/services/hot-sale.service';
import { getPublishedHomepage, getStorefrontSettings } from '@/server/services/storefront-cms.service';
import { searchProducts } from '@/server/services/search.service';
import type { PriceEvaluationContext } from '@/server/services/pricing.service';
import type { PublicStorefrontSettings } from '@/contracts/cms/settings';

async function resolveFallbackProductTabs() {
  const home = await getPublishedHomepage().catch(() => null);
  const tabbedSection = home?.sections?.find(
    (s) => s.enabled && s.type === 'product_grid' && s.resolvedTabs && s.resolvedTabs.length > 0
  );
  if (tabbedSection && tabbedSection.resolvedTabs) {
    const sectionTitle =
      (tabbedSection.data as { title?: string })?.title || 'Sản phẩm nổi bật';
    return {
      title: sectionTitle,
      tabs: tabbedSection.resolvedTabs,
    };
  }

  const [newArrivals, newLaptops, likeNewLaptops, clearanceLaptops] = await Promise.all([
    searchProducts({ sort: 'newest', limit: 10 }).catch(() => ({ products: [] })),
    searchProducts({ condition: ['NEW'], sort: 'newest', limit: 10 }).catch(() => ({ products: [] })),
    searchProducts({ condition: ['LIKE_NEW', 'USED'], sort: 'newest', limit: 10 }).catch(() => ({ products: [] })),
    searchProducts({ condition: ['LIQUIDATION', 'REFURBISHED'], sort: 'price-asc', limit: 10 }).catch(() => ({ products: [] })),
  ]);

  return {
    title: 'Sản phẩm nổi bật',
    tabs: [
      { id: 'new-arrivals', label: 'LAPTOP MỚI VỀ', href: '/laptop-moi', products: newArrivals.products },
      { id: 'new-laptops', label: 'LAPTOP MỚI', href: '/laptop-moi', products: newLaptops.products },
      { id: 'likenew', label: 'LAPTOP LIKENEW', href: '/laptop-cu', products: likeNewLaptops.products },
      { id: 'clearance', label: 'XẢ HÀNG GIÁ SỐC', href: '/hot-sale', products: clearanceLaptops.products },
    ],
  };
}

export default async function FlashSaleSection({
  pricingContext,
  evaluatedAt = new Date(),
  showEmpty = false,
  settings: providedSettings,
}: {
  pricingContext?: PriceEvaluationContext;
  evaluatedAt?: Date;
  showEmpty?: boolean;
  settings?: PublicStorefrontSettings | null;
} = {}) {
  const [campaigns, resolvedSettings] = await Promise.all([
    getHotSaleCampaigns(pricingContext, evaluatedAt),
    providedSettings !== undefined
      ? Promise.resolve(providedSettings)
      : getStorefrontSettings().catch(() => null),
  ]);

  const bannerImage = resolvedSettings?.hotSaleBannerImage?.trim() || undefined;
  const bannerLink = resolvedSettings?.hotSaleBannerLink?.trim() || '/hot-sale';
  const bannerAlt = resolvedSettings?.flashSaleTitle || 'HOT SALE';

  const nowMs = evaluatedAt.getTime();
  const hasRunningCampaign = campaigns.some(
    (c) => Date.parse(c.startAt) <= nowMs && Date.parse(c.endAt) > nowMs
  );

  if (!campaigns.length && showEmpty) {
    const fallbackTabs = await resolveFallbackProductTabs();
    return (
      <div className="mb-8 space-y-6">
        <div className="container mx-auto max-w-[1370px] px-4 space-y-4">
          {bannerImage && (
            <div className="overflow-hidden rounded-2xl shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bannerImage} alt={bannerAlt} className="w-full h-auto max-h-[180px] object-cover" />
            </div>
          )}
          <p className="rounded-xl border border-red-100 bg-white p-6 text-center text-sm text-slate-600">
            Chưa có chiến dịch HOT SALE đang chạy hoặc sắp bắt đầu. Khám phá ngay các dòng sản phẩm nổi bật bên dưới:
          </p>
        </div>
        <ProductTabs title={fallbackTabs.title} tabs={fallbackTabs.tabs} />
      </div>
    );
  }

  const fallbackTabsWhenNoRunning =
    showEmpty && !hasRunningCampaign ? await resolveFallbackProductTabs() : null;

  return (
    <>
      <HotSaleCampaigns
        campaigns={campaigns}
        bannerImage={bannerImage}
        bannerLink={bannerLink}
        bannerAlt={bannerAlt}
      />
      {fallbackTabsWhenNoRunning && (
        <ProductTabs
          title={fallbackTabsWhenNoRunning.title}
          tabs={fallbackTabsWhenNoRunning.tabs}
        />
      )}
    </>
  );
}
