import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { getActiveCategories, getActiveBrands } from "@/server/services/catalog.service";
import { getPublishedNavigation, getStorefrontSettings } from "@/server/services/storefront-cms.service";
import {mediaEnvironment} from '@/server/media-http';
import PublicPriceRefresh from '@/components/product/PublicPriceRefresh';
import { connection } from 'next/server';
import Link from 'next/link';
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
    <div className="flex flex-col min-h-screen">
      <PublicPriceRefresh nextChange={times.length?Math.min(...times):null} serverTime={serverTime}/>
      <Header categories={categories} brands={brands} navigation={navigation} settings={settings} />
      <nav aria-label="Hỗ trợ chọn máy" className="border-b border-slate-200 bg-blue-50 px-4 py-2 text-sm text-blue-900"><div className="mx-auto flex max-w-[1370px] flex-wrap items-center gap-x-6 gap-y-2"><Link className="font-semibold underline" href="/chon-laptop">Chọn laptop theo nhu cầu</Link><Link href="/lien-he?intent=appointment">Đặt lịch xem máy</Link><Link href="/news">Cẩm nang mua laptop</Link></div></nav>
      <main className="flex-grow pb-16 md:pb-0">{children}</main>
      <Footer navigation={navigation} settings={settings} />
      <StorefrontMetrics />
      <MobileBottomNav categories={categories} navigation={navigation} settings={settings} />
    </div>
  );
}
