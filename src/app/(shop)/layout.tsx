import { Suspense } from "react";
import Header from "@/components/layout/Header";
import StorefrontProviders from '@/components/layout/StorefrontProviders';
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import FloatingContactWidget from "@/components/layout/FloatingContactWidget";
import {
  getPublishedNavigation,
  getStorefrontSettings,
  getCachedActiveCategories,
  getCachedActiveBrands,
  getCachedCatalogState,
} from "@/server/services/storefront-cms.service";
import PublicPriceRefresh from '@/components/product/PublicPriceRefresh';
import StorefrontMetrics from '@/components/layout/StorefrontMetrics';
import Analytics from '@/components/layout/Analytics';
import NavigationProgress from '@/components/layout/NavigationProgress';

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // eslint-disable-next-line react-hooks/purity -- request-time server clock schedules public campaign refresh
  const serverTime=Date.now();
  const [navigation, settings, boundary, categories, brands] = await Promise.all([
    getPublishedNavigation(),
    getStorefrontSettings(),
    getCachedCatalogState(serverTime).catch((err) => {
      // Never take the storefront down for the refresh signal; the client adopts the first live token.
      console.error("[ShopLayout] Failed to load catalog state from D1:", err);
      return { token: '', nextChange: null, serverTime };
    }),
    getCachedActiveCategories().catch((err) => {
      console.error("[ShopLayout] Failed to load categories from D1:", err);
      return [] as Awaited<ReturnType<typeof getCachedActiveCategories>>;
    }),
    getCachedActiveBrands().catch((err) => {
      console.error("[ShopLayout] Failed to load brands from D1:", err);
      return [] as Awaited<ReturnType<typeof getCachedActiveBrands>>;
    }),
  ]);

  // Strip heavy homepage-only arrays before passing settings/navigation to client shell components
  // so RSC inline payloads stay lean across every storefront page.
  const clientSettings = settings
    ? {
        ...settings,
        reviewVideos: [],
        testimonials: [],
        productBanners: [],
      }
    : null;

  const clientNavigation = navigation
    ? {
        ...navigation,
        collections: [],
        categories: navigation.categories.map((c) => ({
          ...c,
          description: '',
        })),
        menus: {
          main: navigation.menus.main,
          footer: [],
        },
      }
    : null;

  return (
    <StorefrontProviders><div className="storefront-shell flex flex-col min-h-screen min-w-0">
      <a href="#main-content" className="storefront-skip-link">
        Chuyển đến nội dung chính
      </a>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <PublicPriceRefresh nextChange={boundary.nextChange} version={boundary.token} serverTime={serverTime}/>
      <Header categories={categories} brands={brands} navigation={clientNavigation} settings={clientSettings} />
      <main id="main-content" tabIndex={-1} className="storefront-main flex-grow min-w-0">{children}</main>
      <Footer navigation={navigation} settings={settings} />
      <StorefrontMetrics />
      <Analytics />
      <FloatingContactWidget settings={clientSettings} />
      <MobileBottomNav categories={categories} navigation={clientNavigation} settings={clientSettings} />
    </div></StorefrontProviders>
  );
}
