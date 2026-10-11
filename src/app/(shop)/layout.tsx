import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import { getActiveCategories, getActiveBrands } from "@/server/services/catalog.service";
import { getPublishedNavigation } from "@/server/services/storefront-cms.service";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let categories: Awaited<ReturnType<typeof getActiveCategories>> = [];
  let brands: Awaited<ReturnType<typeof getActiveBrands>> = [];
  const navigation = await getPublishedNavigation();

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
      <Header categories={categories} brands={brands} navigation={navigation} />
      <main className="flex-grow pb-16 md:pb-0">{children}</main>
      <Footer navigation={navigation} />
      <MobileBottomNav categories={categories} navigation={navigation} />
    </div>
  );
}
