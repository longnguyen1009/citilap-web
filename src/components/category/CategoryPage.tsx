import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumb from "@/components/layout/Breadcrumb";
import CategoryCatalog from "@/components/category/CategoryCatalog";
import { getPublishedNavigation, getCachedActiveCategories } from "@/server/services/storefront-cms.service";
import { cachedJson } from "@/server/cache/kv-cache";
import { searchProducts } from "@/server/services/search.service";
import { parseSearchParams } from "@/contracts/catalog/search";
import { categoryAncestors } from "@/lib/category-paths";
import { businessProfile } from "@/config/business-profile";
import { serializeJsonLd } from "@/lib/seo-helpers";
import { productHref } from "@/lib/product-paths";

type Props = {
  params: Promise<{ category: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const VIRTUAL_LAPTOP_CATEGORIES: Record<string, { id: string; name: string; slug: string; href: string; description: string; image: string | null; alt: string; parentId: string | null; sortOrder: number; productCount: number }> = {
  "/laptop-moi": {
    id: "laptop-moi",
    name: "Laptop Mới 100%",
    slug: "laptop-moi",
    href: "/laptop-moi",
    description: "Laptop mới 100% nguyên seal, chính hãng, đầy đủ cấu hình văn phòng, gaming, đồ họa và MacBook tại CitiLap.",
    image: null,
    alt: "Laptop Mới 100%",
    parentId: null,
    sortOrder: 90,
    productCount: 0,
  },
  "/laptop-likenew": {
    id: "laptop-likenew",
    name: "Laptop Like New",
    slug: "laptop-likenew",
    href: "/laptop-likenew",
    description: "Laptop Like New 99% tuyển chọn kỹ lưỡng, ngoại hình đẹp, hiệu năng ổn định và bảo hành uy tín tại CitiLap.",
    image: null,
    alt: "Laptop Like New",
    parentId: null,
    sortOrder: 91,
    productCount: 0,
  },
  "/laptop-cu": {
    id: "laptop-cu",
    name: "Laptop Cũ & Like New",
    slug: "laptop-cu",
    href: "/laptop-cu",
    description: "Laptop đã qua sử dụng và Like New được kiểm định phần cứng nghiêm ngặt, giá tốt tại CitiLap.",
    image: null,
    alt: "Laptop Cũ & Like New",
    parentId: null,
    sortOrder: 92,
    productCount: 0,
  },
};

const resolveCategory = cache(async (path: string) => {
  const navigation = await getPublishedNavigation();
  const categories = navigation?.categories
    ? [...navigation.categories]
    : (await getCachedActiveCategories()).map(c => ({ ...c, href: c.href!, description: c.description || "", alt: c.name }));
  let current = categories.find(c => c.href === path);
  if (!current && navigation?.categories) {
    const active = (await getCachedActiveCategories()).map(c => ({ ...c, href: c.href!, description: c.description || "", alt: c.name }));
    const fallback = active.find(c => c.href === path);
    if (fallback) {
      categories.push(fallback);
      current = fallback;
    }
  }
  if (!current && VIRTUAL_LAPTOP_CATEGORIES[path]) {
    const virtualCat = VIRTUAL_LAPTOP_CATEGORIES[path];
    categories.push(virtualCat);
    current = virtualCat;
  }
  if (!current) notFound();
  return { current, categories };
});

function filterParams(input: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const key of ["q", "tag", "brand", "subcat", "condition", "cpu", "gpu", "ram", "storage", "connection", "power", "type", "minPrice", "maxPrice", "pricePreset", "sort", "page", "limit", "inStock", "year"]) {
    const value = input[key];
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) if (item.trim()) params.append(key, item);
  }
  if (params.has("minPrice") || params.has("maxPrice")) params.delete("pricePreset");
  return params;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { current } = await resolveCategory('/' + (await params).category.join('/'));
  const query = filterParams(await searchParams);
  const parsed = parseSearchParams(query);
  const filtered = [...query.keys()].some(key => key !== "page");
  const page = parsed.success ? parsed.data.page : 1;
  const title = `${current.name}${page > 1 ? ` – Trang ${page}` : ""} | CitiLap`;
  const description = current.description || `Tìm ${current.name} theo thương hiệu, nhu cầu, giá và cấu hình. So sánh và lưu sản phẩm bạn quan tâm tại CitiLap.`;
  const canonical = businessProfile.canonicalSiteUrl + current.href + (!filtered && page > 1 ? `?page=${page}` : "");
  return { title, description, alternates: { canonical }, robots: { index: parsed.success && !filtered, follow: true }, openGraph: { title, description, url: canonical } };
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const { current, categories } = await resolveCategory('/' + (await params).category.join('/'));
  const query = filterParams(await searchParams);
  const parsed = parseSearchParams(query);
  if (!parsed.success) return <div className="container-shop py-8"><h1 className="text-title font-bold">{current.name}</h1><p role="alert" className="my-4">Bộ lọc không hợp lệ. Kiểm tra khoảng giá, số trang và giá trị đã nhập.</p><Link href={current.href} className="text-brand-primary underline">Xóa bộ lọc</Link></div>;

  const ancestors = categoryAncestors(current, categories);
  const isRoot = ancestors.length === 1;
  const isLevel2 = ancestors.length === 2;

  // Compute category scope: allow multi-select subcategories on level 1, or level 3 on level 2
  let effectiveCategoryScope = [current.id];
  const requestedSubcats = query.getAll("subcat");

  if (requestedSubcats.length > 0) {
    if (isRoot) {
      const level2Categories = categories.filter(c => c.parentId === current.id);
      const matched = level2Categories.filter(s => requestedSubcats.includes(s.slug) || requestedSubcats.includes(s.id));
      if (matched.length > 0) {
        effectiveCategoryScope = matched.map(s => s.id);
      }
    } else if (isLevel2) {
      const level3Categories = categories.filter(c => c.parentId === current.id);
      const matched = level3Categories.filter(s => requestedSubcats.includes(s.slug) || requestedSubcats.includes(s.id));
      if (matched.length > 0) {
        effectiveCategoryScope = matched.map(s => s.id);
      }
    }
  }

  // The route owns category scope; query parameters cannot escape this branch.
  const limitVal = query.has("limit") ? parsed.data.limit : 24;
  const isDefaultView = query.size === 0 || (query.size === 1 && query.has("page"));
  const result = isDefaultView
    ? await cachedJson(
        `public-cat-search:${effectiveCategoryScope.join(",")}:p${parsed.data.page}:l${limitVal}`,
        60,
        () => searchProducts({ ...parsed.data, category: effectiveCategoryScope, limit: limitVal })
      )
    : await searchProducts({ ...parsed.data, category: effectiveCategoryScope, limit: limitVal });
  if (result.page > Math.max(1, result.totalPages)) notFound();
  const facets = query.size ? (await searchProducts({ category: effectiveCategoryScope, limit: 1 })).facets : result.facets;
  const brandCounts = parsed.data.brand?.length
    ? (await searchProducts({ ...parsed.data, category: effectiveCategoryScope, brand: undefined, page: 1, limit: 1 })).facets.brands
    : result.facets.brands;
  const breadcrumbs = [{ label: "Trang chủ", href: "/" }, ...ancestors.map(c => ({ label: c.name, href: c.href }))];
  const jsonLd = [{
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((c, index) => ({ "@type": "ListItem", position: index + 1, name: c.label, item: businessProfile.canonicalSiteUrl + c.href })),
  }, {
    "@context": "https://schema.org", "@type": "ItemList", name: current.name,
    itemListElement: result.products.map((p, index) => ({ "@type": "ListItem", position: (result.page - 1) * result.pageSize + index + 1, url: businessProfile.canonicalSiteUrl + productHref(p), name: p.name })),
  }];
  return <div className="min-h-screen bg-surface-subtle pb-16">
    <Breadcrumb items={breadcrumbs} />
    <div className="container-shop py-3 sm:py-4">
      <CategoryCatalog category={current} categories={categories} result={result} facets={facets} brandCounts={brandCounts} params={query} isAccessory={ancestors.some(c => ["phu-kien", "linh-kien"].includes(c.slug))} />
      {current.description && <p className="mt-6 text-sm text-slate-600">{current.description}</p>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
    </div>
  </div>;
}
