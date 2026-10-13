import { notFound } from "next/navigation";
import { type Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Tag, ShieldCheck, Laptop } from "lucide-react";
import { Container } from "@/components/ui/Container";
import ProductCard from "@/components/product/ProductCard";
import { mediaEnvironment } from "@/server/media-http";
import { publicBrandWithProducts } from "@/server/services/brand.service";

interface BrandPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { DB } = await mediaEnvironment();
    const data = await publicBrandWithProducts(DB, slug);
    const brand = data.brand;
    const title = brand.seoTitle || `${brand.name} Chính Hãng - Giá Tốt Nhất | CitiLap`;
    const description =
      brand.seoDescription ||
      brand.description ||
      `Khám phá các sản phẩm ${brand.name} chính hãng phân phối tại CitiLap với giá ưu đãi, trả góp 0% và bảo hành uy tín.`;

    return {
      title,
      description,
      alternates: {
        canonical: `https://citilap.vn/brand/${brand.slug}`,
      },
      openGraph: {
        title,
        description,
        images: brand.logo ? [{ url: brand.logo }] : undefined,
      },
    };
  } catch {
    return {
      title: "Thương hiệu | CitiLap",
      description: "Danh sách sản phẩm theo thương hiệu tại CitiLap.",
    };
  }
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;

  let brandData: Awaited<ReturnType<typeof publicBrandWithProducts>> | null = null;
  try {
    const { DB } = await mediaEnvironment();
    brandData = await publicBrandWithProducts(DB, slug);
  } catch {
    notFound();
  }

  if (!brandData) {
    notFound();
  }

  const { brand, products } = brandData;

  return (
    <div className="bg-slate-50/50 min-h-screen pb-16">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="bg-white border-b border-slate-100 py-3 text-xs">
        <Container>
          <ol className="flex items-center space-x-1 sm:space-x-2 text-slate-500 overflow-x-auto whitespace-nowrap">
            <li>
              <Link href="/" className="hover:text-blue-600 transition">
                Trang chủ
              </Link>
            </li>
            <li className="flex items-center">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li>
              <span className="text-slate-500">Thương hiệu</span>
            </li>
            <li className="flex items-center">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </li>
            <li className="font-semibold text-slate-800" aria-current="page">
              {brand.name}
            </li>
          </ol>
        </Container>
      </nav>

      {/* Brand Hero Header */}
      <div className="bg-white border-b border-slate-200/80 py-8 mb-8 shadow-xs">
        <Container>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-slate-200/80 p-3 shadow-xs flex items-center justify-center shrink-0">
              {brand.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logo}
                  alt={brand.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Tag className="w-10 h-10 text-slate-300" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {brand.name}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {products.length} sản phẩm đang mở bán
                </span>
              </div>

              {brand.description ? (
                <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                  {brand.description}
                </p>
              ) : (
                <p className="text-sm text-slate-500">
                  Tất cả các dòng laptop và phụ kiện chính hãng {brand.name} tại CitiLap. Cam kết chất lượng, bảo hành uy tín.
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Bảo hành chính hãng 12-24 tháng
                </span>
                <span className="inline-flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-blue-600" />
                  Bao test 1 đổi 1 trong 15 ngày
                </span>
              </div>
            </div>
          </div>
        </Container>
      </div>

      {/* Product Grid */}
      <Container>
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center max-w-lg mx-auto shadow-xs">
            <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-800">Chưa có sản phẩm nào đang mở bán</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">
              Các sản phẩm của thương hiệu {brand.name} đang được cập nhật thêm. Bạn có thể tham khảo các danh mục khác.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Về trang chủ
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Danh sách sản phẩm {brand.name}
              </h2>
              <span className="text-xs text-slate-500">
                Hiển thị {products.length} sản phẩm
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {products.map((p: {
                id: string;
                name: string;
                slug: string;
                price: number;
                originalPrice: number | null;
                image: string;
                brand: string;
                condition: string;
                isNewArrival: boolean;
                isBestSeller: boolean;
                cpu?: string | null;
                ram?: string | null;
              }) => (
                <ProductCard
                  key={p.id}
                  product={{
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    price: p.price,
                    originalPrice: p.originalPrice,
                    image: p.image,
                    brand: p.brand,
                    condition: p.condition,
                    badge: p.isNewArrival ? 'Mới về' : p.isBestSeller ? 'Bán chạy' : undefined,
                    specs: {
                      cpu: p.cpu || undefined,
                      ram: p.ram || undefined,
                    },
                  }}
                  showSpecs
                />
              ))}
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
