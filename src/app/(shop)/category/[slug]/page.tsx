import { notFound } from "next/navigation";
import { type Metadata } from "next";
import Breadcrumb from "@/components/layout/Breadcrumb";
import CategoryListingContainer from "@/components/category/CategoryListingContainer";
import {
  getCategoryBySlug,
  getCategoryFilteredProducts,
  type CategoryFilterOptions,
} from "@/server/services/catalog.service";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Không tìm thấy danh mục | CitiLap",
      description: "Danh mục sản phẩm không tồn tại hoặc đã bị gỡ bỏ.",
    };
  }

  return {
    title: `${category.name} Chính Hãng, Giá Tốt | CitiLap`,
    description:
      category.description ||
      `Khám phá các sản phẩm ${category.name} tuyển chọn kỹ lưỡng, chất lượng cao, bảo hành linh hoạt tại CitiLap.`,
    alternates: {
      canonical: `https://citilap.vn/category/${category.slug}`,
    },
    openGraph: {
      title: `${category.name} | CitiLap.vn`,
      description:
        category.description ||
        `Mua ${category.name} chính hãng chất lượng cao tại CitiLap.`,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  // 1. Helper to extract string or array
  const getStringOrArray = (val: string | string[] | undefined): string[] => {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  };

  const getNumberOrArray = (val: string | string[] | undefined): number[] => {
    if (!val) return [];
    const arr = Array.isArray(val) ? val : [val];
    return arr.map(Number).filter((n) => !isNaN(n));
  };

  // 2. Validate and build filter options
  let minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  let maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;

  // Gracefully resolve pricePreset query parameter if minPrice/maxPrice not provided
  if (typeof sp.pricePreset === "string" && !minPrice && !maxPrice) {
    if (sp.pricePreset === "under-15m") maxPrice = 15_000_000;
    else if (sp.pricePreset === "15m-20m") { minPrice = 15_000_000; maxPrice = 20_000_000; }
    else if (sp.pricePreset === "20m-25m") { minPrice = 20_000_000; maxPrice = 25_000_000; }
    else if (sp.pricePreset === "25m-30m") { minPrice = 25_000_000; maxPrice = 30_000_000; }
    else if (sp.pricePreset === "above-30m") { minPrice = 30_000_000; }
  }

  const filterOptions: CategoryFilterOptions = {
    categorySlug: slug,
    brand: getStringOrArray(sp.brand),
    condition: getStringOrArray(sp.condition),
    minPrice,
    maxPrice,
    cpu: getStringOrArray(sp.cpu),
    gpu: getStringOrArray(sp.gpu),
    ram: getNumberOrArray(sp.ram),
    storage: getNumberOrArray(sp.storage),
    sort: typeof sp.sort === "string" && ["newest", "price-asc", "price-desc", "featured", "best-selling"].includes(sp.sort)
      ? (sp.sort as CategoryFilterOptions["sort"])
      : "newest",
    page: sp.page ? Math.max(1, Number(sp.page)) : 1,
    limit: 12,
  };

  // 3. Query Cloudflare D1
  const result = await getCategoryFilteredProducts(filterOptions);

  // 4. Return 404 if category does not exist in D1
  if (!result.category) {
    notFound();
  }

  const category = result.category;

  return (
    <div className="bg-surface-subtle min-h-screen pb-16">
      {/* Breadcrumb Bar */}
      <div className="bg-surface-card border-b border-border-default">
        <div className="container-shop py-3">
          <Breadcrumb
            items={[
              { label: "Trang chủ", href: "/" },
              { label: "Danh mục", href: "/category" },
              { label: category.name, href: `/category/${category.slug}` },
            ]}
          />
        </div>
      </div>

      <div className="container-shop pt-8">
        {/* Category Header */}
        <div className="mb-8">
          <h1 className="text-display font-black text-text-primary tracking-tight">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-body-lg text-text-secondary mt-2 max-w-3xl leading-relaxed">
              {category.description}
            </p>
          )}
        </div>

        {/* Filters, Grid, and Pagination */}
        <CategoryListingContainer initialData={result} />
      </div>
    </div>
  );
}
