import { parseSearchParams } from '@/contracts/catalog/search';
import Link from 'next/link';
import { Suspense } from "react";
import type { Metadata } from "next";
import Breadcrumb from "@/components/layout/Breadcrumb";
import SearchListingContainer from "@/components/search/SearchListingContainer";
import {
  searchProducts,
} from "@/server/services/search.service";

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
      alternates: {
        canonical: "https://citilap.vn/search",
      },
      robots: {
        index: false,
        follow: true,
      },
    };
  }

  return {
    title: "Tìm kiếm sản phẩm laptop chính hãng | CitiLap.vn",
    description: "Tìm kiếm laptop gaming, laptop văn phòng, đồ họa và linh kiện giá tốt nhất tại Citilap.vn.",
    alternates: {
      canonical: "https://citilap.vn/search",
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;

  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(sp)) for (const item of Array.isArray(value)?value:value===undefined?[]:[value]) params.append(key,item);
  const parsed = parseSearchParams(params);
  if (!parsed.success) return <div className="container mx-auto p-8"><p role="alert">Bộ lọc không hợp lệ. Kiểm tra khoảng giá, số trang và giá trị đã nhập.</p><Link href="/search">Xóa bộ lọc</Link></div>;
  const options=parsed.data, query=options.query || '';

  const searchResult = await searchProducts(options);

  const breadcrumbItems = [
    { label: "Trang chủ", href: "/" },
    { label: "Tìm kiếm", href: "/search" },
    ...(query ? [{ label: `"${query}"`, href: `/search?q=${encodeURIComponent(query)}` }] : []),
  ];

  return (
    <div className="bg-surface min-h-screen pb-16">
      <Breadcrumb items={breadcrumbItems} />

      <div className="container mx-auto px-4 max-w-[1370px] mt-6">
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
      </div>
    </div>
  );
}
