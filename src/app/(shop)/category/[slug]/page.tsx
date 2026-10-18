import Link from 'next/link';
import {parseSearchParams} from '@/contracts/catalog/search';
import { notFound } from "next/navigation";
import { type Metadata } from "next";
import Breadcrumb from "@/components/layout/Breadcrumb";
import CategoryListingContainer from "@/components/category/CategoryListingContainer";
import {
  getCategoryBySlug,
  getCategoryFilteredProducts,
  type CategoryFilterOptions,
} from "@/server/services/catalog.service";
import { getAccessoryTypeBySlug } from "@/config/accessory-taxonomy";
import { getPublishedNavigation } from "@/server/services/storefront-cms.service";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const navigation = await getPublishedNavigation();
  if (navigation && !navigation.categories.some((cat) => cat.slug === slug)) return { title: "Danh mục không tồn tại | CitiLap", robots: { index: false } };
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return {
      title: "Không tìm thấy danh mục | CitiLap",
      description: "Danh mục sản phẩm không tồn tại hoặc đã bị gỡ bỏ.",
    };
  }

  const typeParam = typeof sp.type === "string" ? sp.type : undefined;
  const accessoryType = slug === "linh-kien" ? getAccessoryTypeBySlug(typeParam) : undefined;

  const pageTitle = accessoryType
    ? `${accessoryType.name} Chính Hãng - Giá Tốt | CitiLap`
    : slug === "linh-kien"
    ? "Phụ Kiện Laptop & Đồ Chơi Công Nghệ Chính Hãng | CitiLap"
    : `${category.name} Chính Hãng, Giá Tốt | CitiLap`;

  const pageDescription = accessoryType
    ? accessoryType.description
    : slug === "linh-kien"
    ? "Balo, chuột gaming, bàn phím cơ, củ sạc GaN, hub chuyển đổi và phụ kiện setup bàn làm việc chính hãng tuyển chọn tại CitiLap."
    : category.description ||
      `Khám phá các sản phẩm ${category.name} tuyển chọn kỹ lưỡng, chất lượng cao, bảo hành linh hoạt tại CitiLap.`;

  return {
    robots: Object.keys(sp).length ? {index:false,follow:true}:undefined,
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: `https://citilap.vn/category/${category.slug}${accessoryType ? `?type=${accessoryType.slug}` : ""}`,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const navigation = await getPublishedNavigation();
  if (navigation && !navigation.categories.some((cat) => cat.slug === slug)) notFound();
  const sp = await searchParams;

  const paramsQuery=new URLSearchParams();
  for(const [key,value] of Object.entries(sp)) for(const item of Array.isArray(value)?value:value===undefined?[]:[value]) paramsQuery.append(key,item);
  const sort=typeof sp.sort==='string' && ['newest','price-asc','price-desc','featured','best-selling'].includes(sp.sort)?sp.sort as CategoryFilterOptions['sort']:'newest';
  paramsQuery.delete('sort');
  const parsed=parseSearchParams(paramsQuery);
  if(!parsed.success) return <div className="container mx-auto p-8"><p role="alert">Bộ lọc không hợp lệ. Kiểm tra khoảng giá và số trang.</p><Link href={'/category/'+slug}>Xóa bộ lọc</Link></div>;
  const typeParam=typeof sp.type==='string'?sp.type:undefined;
  const accessoryType=slug==='linh-kien'?getAccessoryTypeBySlug(typeParam):undefined;
  const filterOptions:CategoryFilterOptions={...parsed.data,categorySlug:slug,accessoryType:typeParam,type:typeParam,sort};

  // 3. Query Cloudflare D1
  const result = await getCategoryFilteredProducts(filterOptions);

  // 4. Return 404 if category does not exist in D1
  if (!result.category) {
    notFound();
  }

  const category = result.category;

  const displayName = accessoryType
    ? accessoryType.name
    : slug === "linh-kien"
    ? "Phụ Kiện Laptop & Đồ Chơi Công Nghệ"
    : category.name;

  const displayDescription = accessoryType
    ? accessoryType.description
    : slug === "linh-kien"
    ? "Balo, chuột gaming, bàn phím cơ, sạc GaN, hub chuyển đổi và phụ kiện setup bàn làm việc chính hãng tuyển chọn tại CitiLap."
    : category.description;

  const breadcrumbs = [
    { label: "Trang chủ", href: "/" },
    { label: "Danh mục", href: "/category" },
  ];

  if (slug === "linh-kien") {
    breadcrumbs.push({
      label: "Phụ kiện Laptop",
      href: "/category/linh-kien",
    });
    if (accessoryType) {
      breadcrumbs.push({
        label: accessoryType.name,
        href: `/category/linh-kien?type=${accessoryType.slug}`,
      });
    }
  } else {
    breadcrumbs.push({
      label: category.name,
      href: `/category/${category.slug}`,
    });
  }

  return (
    <div className="bg-surface-subtle min-h-screen pb-16">
      {/* Breadcrumb Bar */}
      <div className="bg-surface-card border-b border-border-default">
        <div className="container-shop py-3">
          <Breadcrumb items={breadcrumbs} />
        </div>
      </div>

      <div className="container-shop pt-8">
        {/* Category Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-display font-black text-text-primary tracking-tight">
              {displayName}
            </h1>
            {accessoryType && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Phụ kiện
              </span>
            )}
          </div>
          {displayDescription && (
            <p className="text-body-lg text-text-secondary max-w-3xl leading-relaxed">
              {displayDescription}
            </p>
          )}
        </div>

        {/* Filters, Grid, and Pagination */}
        <CategoryListingContainer initialData={result} />
      </div>
    </div>
  );
}
