import Header from "@/components/layout/Header";
import StorefrontProviders from '@/components/layout/StorefrontProviders';
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { getActiveCategories, getActiveBrands } from "@/server/services/catalog.service";
import { getPublishedNavigation, getStorefrontSettings } from "@/server/services/storefront-cms.service";
import {mediaEnvironment} from '@/server/media-http';
import PublicPriceRefresh from '@/components/product/PublicPriceRefresh';
import { connection } from 'next/server';
import StorefrontMetrics from '@/components/layout/StorefrontMetrics';

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  let categories: Awaited<ReturnType<typeof getActiveCategories>> = [];
  let brands: Awaited<ReturnType<typeof getActiveBrands>> = [];
  const [navigation, settings] = await Promise.all([
    getPublishedNavigation(),
    getStorefrontSettings(),
  ]);
  // eslint-disable-next-line react-hooks/purity -- request-time server clock schedules public campaign refresh
  const serverTime=Date.now();
  const {DB}=await mediaEnvironment();
  const boundary=await DB.prepare("SELECT min(boundary) AS nextChange FROM (SELECT startAt AS boundary FROM PromotionCampaign WHERE status='PUBLISHED' UNION ALL SELECT endAt FROM PromotionCampaign WHERE status='PUBLISHED') WHERE boundary>?").bind(new Date(serverTime).toISOString()).first<{nextChange:string|null}>();
  const times=[boundary?.nextChange,settings?.flashSaleEnabled?settings.flashSaleStartAt:null,settings?.flashSaleEnabled?settings.flashSaleEndAt:null]
    .filter((value):value is string=>!!value).map(Date.parse).filter(time=>time>serverTime);

  try {
    [categories, brands] = await Promise.all([
      getActiveCategories(),
      getActiveBrands(),
    ]);
  } catch (err) {
    console.error("[ShopLayout] Failed to load categories or brands from D1:", err);
  }

  return (
    <StorefrontProviders><div className="flex flex-col min-h-screen">
      <PublicPriceRefresh nextChange={times.length?Math.min(...times):null} serverTime={serverTime}/>
      <Header categories={categories} brands={brands} navigation={navigation} settings={settings} />
      <main className="flex-grow pb-16 md:pb-0">{children}</main>
      <Footer navigation={navigation} settings={settings} />
      <StorefrontMetrics />
      <MobileBottomNav categories={categories} navigation={navigation} settings={settings} />
    </div></StorefrontProviders>
  );
}
