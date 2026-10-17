import {
  getFeaturedProducts,
  getNewArrivals,
  getFlashSaleProducts,
  getCategoryProducts,
  getLikeNewProducts,
  getBestSellingProducts,
  type HomepageProduct,
} from "./catalog.service";
import type { ProductCardProduct } from "@/components/product/ProductCard";

import type { PriceEvaluationContext } from "@/server/services/pricing.service";

/**
 * Retrieves section products from Cloudflare D1 via CatalogService.
 * NO SILENT MOCK FALLBACK: Returns D1 data, empty array if no active items, or throws on query failure.
 */
export async function getSectionProducts(
  section: string,
  pricingContext?: PriceEvaluationContext | null,
  at: Date = new Date()
): Promise<ProductCardProduct[]> {
  try {
    let products: HomepageProduct[] = [];

    switch (section) {
      case "flash-sale":
        products = await getFlashSaleProducts(10, pricingContext, at);
        break;
      case "new":
        products = await getNewArrivals(10, pricingContext, at);
        break;
      case "gaming":
        products = await getCategoryProducts("laptop-gaming", 10, pricingContext, at);
        break;
      case "ultrabook":
        products = await getCategoryProducts("laptop-van-phong", 10, pricingContext, at);
        break;
      case "workstation":
        products = await getCategoryProducts("laptop-do-hoa", 10, pricingContext, at);
        break;
      case "best-selling":
        products = await getBestSellingProducts(10, pricingContext, at);
        break;
      case "like-new":
        products = await getLikeNewProducts(10, pricingContext, at);
        break;
      case "accessories":
        products = await getCategoryProducts("linh-kien", 10, pricingContext, at);
        break;
      case "featured":
      default:
        products = await getFeaturedProducts(10, pricingContext, at);
        break;
    }

    return products;
  } catch (error) {
    console.error(`[product-home] Error loading products for section '${section}' from D1:`, error);
    // Explicit error handling: return empty list so the section renders an ErrorState or EmptyState, NEVER mock items.
    throw error;
  }
}
