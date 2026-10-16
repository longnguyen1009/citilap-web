import { Suspense } from "react";
import type { Metadata } from "next";
import Breadcrumb from "@/components/layout/Breadcrumb";
import SearchListingContainer from "@/components/search/SearchListingContainer";
import {
  searchProducts,
  type SearchFilterOptions,
} from "@/server/services/search.service";
import { getStorefrontPricingContext } from "@/server/services/pricing.service";

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  if (q) {
    return {
      title: `Tìm kiếm "${q}" | CitiLap.vn`,
      description: `Kết quả tìm kiếm sản phẩm laptop, máy tính và linh kiện cho từ khóa "${q}" tại Citilap.vn. Hàng chính hãng, bảo hành uy tín.`,
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return {
    title: "Tìm kiếm sản phẩm laptop chính hãng | CitiLap.vn",
    description: "Tìm kiếm laptop gaming, laptop văn phòng, đồ họa và linh kiện giá tốt nhất tại Citilap.vn.",
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;

  const getStringOrArray = (val: string | string[] | undefined): string[] => {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  };

  const getNumberOrArray = (val: string | string[] | undefined): number[] => {
    if (!val) return [];
    const arr = Array.isArray(val) ? val : [val];
    return arr.map(Number).filter((n) => !isNaN(n));
  };

  // Price presets
  let minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  let maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;

  if (typeof sp.pricePreset === "string" && !minPrice && !maxPrice) {
    if (sp.pricePreset === "under-15" || sp.pricePreset === "under-15m") maxPrice = 15_000_000;
    else if (sp.pricePreset === "15-20" || sp.pricePreset === "15m-20m") {
      minPrice = 15_000_000;
      maxPrice = 20_000_000;
    } else if (sp.pricePreset === "20-30" || sp.pricePreset === "20m-25m") {
      minPrice = 20_000_000;
      maxPrice = 30_000_000;
    } else if (sp.pricePreset === "over-30" || sp.pricePreset === "above-30m") {
      minPrice = 30_000_000;
    }
  }

  const query = typeof sp.q === "string" ? sp.q.trim() : "";

  const sortValue =
    typeof sp.sort === "string" &&
    ["relevance", "price-asc", "price-desc", "newest"].includes(sp.sort)
      ? (sp.sort as SearchFilterOptions["sort"])
      : query
      ? "relevance"
      : "newest";

  const options: SearchFilterOptions = {
    query,
    brand: getStringOrArray(sp.brand),
    category: getStringOrArray(sp.category),
    condition: getStringOrArray(sp.condition),
    minPrice,
    maxPrice,
    cpu: getStringOrArray(sp.cpu),
    gpu: getStringOrArray(sp.gpu),
    ram: getNumberOrArray(sp.ram),
    storage: getNumberOrArray(sp.storage),
    sort: sortValue,
    page: sp.page ? Math.max(1, Number(sp.page)) : 1,
    limit: 12,
  };

  const pricingContext = await getStorefrontPricingContext().catch(() => null);
  const searchResult = await searchProducts(options, undefined, pricingContext);

  const breadcrumbItems = [
    { label: "Trang chủ", href: "/" },
    { label: "Tìm kiếm", href: "/search" },
    ...(query ? [{ label: `"${query}"`, href: `/search?q=${encodeURIComponent(query)}` }] : []),
  ];

  return (
    <div className="bg-surface min-h-screen pb-16">
      <Breadcrumb items={breadcrumbItems} />

      <main className="container mx-auto px-4 max-w-[1370px] mt-6">
        <Suspense
          fallback={
            <div className="bg-surface-card border border-border-default rounded-card p-12 text-center">
              <div className="w-8 h-8 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-body-sm text-text-muted">Đang tìm kiếm sản phẩm...</p>
            </div>
          }
        >
          <SearchListingContainer initialData={searchResult} />
        </Suspense>
      </main>
    </div>
  );
}
