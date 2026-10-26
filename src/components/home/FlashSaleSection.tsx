import HotSaleCampaigns from './HotSaleCampaigns';
import { getHotSaleCampaigns } from '@/server/services/hot-sale.service';
import type { PriceEvaluationContext } from '@/server/services/pricing.service';

export default async function FlashSaleSection({ pricingContext, evaluatedAt = new Date(), showEmpty = false }: { pricingContext?: PriceEvaluationContext; evaluatedAt?: Date; showEmpty?: boolean } = {}) {
  const campaigns = await getHotSaleCampaigns(pricingContext, evaluatedAt);
  if (!campaigns.length && showEmpty) return <p className="mx-4 mb-8 rounded-xl border border-red-100 bg-white p-8 text-center text-slate-600">Chưa có chiến dịch HOT SALE đang chạy hoặc sắp bắt đầu. Ưu đãi mới sẽ được cập nhật tại đây.</p>;
  return <HotSaleCampaigns campaigns={campaigns} />;
}
