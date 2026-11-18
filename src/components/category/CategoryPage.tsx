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
import { getCategorySeoMeta, serializeJsonLd } from "@/lib/seo-helpers";
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
  const seoMeta = getCategorySeoMeta(current, page);
  const canonical = businessProfile.canonicalSiteUrl + current.href + (!filtered && page > 1 ? `?page=${page}` : "");
  const ogImage = current.image
    ? current.image.startsWith("http")
      ? current.image
      : `${businessProfile.canonicalSiteUrl}${current.image}`
    : `${businessProfile.canonicalSiteUrl}${businessProfile.bannerAsset}`;

  return {
    title: seoMeta.title,
    description: seoMeta.description,
    alternates: { canonical },
    robots: { index: parsed.success && !filtered, follow: true },
    openGraph: {
      title: seoMeta.titleString,
      description: seoMeta.description,
      url: canonical,
      type: "website",
      siteName: businessProfile.brandName,
      locale: "vi_VN",
      images: [{ url: ogImage, alt: current.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: seoMeta.titleString,
      description: seoMeta.description,
      images: [ogImage],
    },
  };
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const { current, categories } = await resolveCategory('/' + (await params).category.join('/'));
  const query = filterParams(await searchParams);
  const parsed = parseSearchParams(query);
  if (!parsed.success) return <div className="container-shop py-8"><h1 className="text-title font-bold">{current.name}</h1><p role="alert" className="my-4">Bộ lọc không hợp lệ. Kiểm tra khoảng giá, số trang và giá trị đã nhập.</p><Link href={current.href} className="text-brand-primary underline">Xóa bộ lọc</Link></div>;

  const ancestors = categoryAncestors(current, categories);

  // Compute category scope: allow multi-select direct child subcategories at any depth
  let effectiveCategoryScope = [current.id];
  const requestedSubcats = query.getAll("subcat");

  if (requestedSubcats.length > 0) {
    const childCategories = categories.filter(c => c.parentId === current.id);
    const matched = childCategories.filter(s => requestedSubcats.includes(s.slug) || requestedSubcats.includes(s.id));
    if (matched.length > 0) {
      effectiveCategoryScope = matched.map(s => s.id);
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
  const seoMeta = getCategorySeoMeta(current, result.page);
  const enrichedCategory = {
    ...current,
    description: seoMeta.introText,
  };
  const breadcrumbs = [{ label: "Trang chủ", href: "/" }, ...ancestors.map(c => ({ label: c.name, href: c.href }))];
  const canonicalUrl = businessProfile.canonicalSiteUrl + current.href;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbs.map((c, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: c.label,
        item: businessProfile.canonicalSiteUrl + c.href,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${canonicalUrl}#collection`,
      name: current.name,
      description: seoMeta.description,
      url: canonicalUrl,
      isPartOf: { "@id": `${businessProfile.canonicalSiteUrl}/#website` },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: current.name,
      description: seoMeta.description,
      numberOfItems: result.totalCount,
      itemListElement: result.products.map((p, index) => ({
        "@type": "ListItem",
        position: (result.page - 1) * result.pageSize + index + 1,
        url: businessProfile.canonicalSiteUrl + productHref(p),
        name: p.name,
      })),
    },
  ];
  return <div className="min-h-screen bg-surface-subtle pb-16">
    <Breadcrumb items={breadcrumbs} />
    <div className="container-shop py-3 sm:py-4">
      <CategoryCatalog category={enrichedCategory} categories={categories} result={result} facets={facets} brandCounts={brandCounts} params={query} isAccessory={ancestors.some(c => ["phu-kien", "linh-kien"].includes(c.slug))} />
      {seoMeta.description && (
        <section aria-label={`Giới thiệu danh mục ${current.name}`} className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900">{current.name} tại CitiLap</h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">{seoMeta.description}</p>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }} />
    </div>
  </div>;
}
