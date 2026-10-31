import Link from "next/link";
import { Award, ArrowRight } from "lucide-react";

export interface BrandItem {
  id?: string;
  name: string;
  slug?: string;
  logo?: string | null;
  subtitle?: string;
  href?: string;
}

const DEFAULT_BRANDS: BrandItem[] = [
  { name: "ASUS", subtitle: "ROG • TUF • Zenbook", href: "/laptop-gaming?brand=asus" },
  { name: "DELL", subtitle: "XPS • Precision • Inspiron", href: "/laptop-van-phong?brand=dell" },
  { name: "LENOVO", subtitle: "Legion • ThinkPad • Yoga", href: "/laptop-gaming?brand=lenovo" },
  { name: "HP", subtitle: "Omen • Victus • Envy", href: "/laptop-van-phong?brand=hp" },
  { name: "APPLE", subtitle: "MacBook Air • Pro M-Series", href: "/macbook" },
  { name: "ACER", subtitle: "Predator • Nitro • Swift", href: "/laptop-gaming?brand=acer" },
  { name: "MSI", subtitle: "Titan • Raider • Katana", href: "/laptop-gaming?brand=msi" },
  { name: "GIGABYTE", subtitle: "Aorus • G5 Gaming", href: "/laptop-gaming?brand=gigabyte" },
];

export default function BrandSection({
  title,
  subtitle,
  brands: customBrands,
}: {
  title?: string;
  subtitle?: string;
  brands?: BrandItem[];
} = {}) {
  const displayBrands = customBrands && customBrands.length > 0 ? customBrands : DEFAULT_BRANDS;
  const displayTitle = title || "Khám Phá Theo Thương Hiệu";
  const displaySubtitle = subtitle || "Đối tác phân phối laptop và linh kiện chính hãng hàng đầu thị trường";

  return (
    <section className="pb-16" aria-label={displayTitle}>
      <div className="container mx-auto px-4 max-w-[1370px]">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600/30 border border-blue-400/40 p-2 rounded-xl text-blue-400">
                <Award className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black text-white uppercase tracking-wide">
                  {displayTitle}
                </h2>
                <p className="text-xs text-slate-300 hidden sm:block">
                  {displaySubtitle}
                </p>
              </div>
            </div>
            <Link
              href="/phan-loai"
              className="text-xs sm:text-sm font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 transition"
            >
              <span>Xem tất cả danh mục</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="p-4 sm:p-6 md:p-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
            {displayBrands.map((brand) => (
              <Link
                key={brand.name}
                href={brand.href || `/brand/${brand.slug || brand.name.toLowerCase()}`}
                className="flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-50/70 border border-slate-200/80 rounded-xl hover:border-blue-500 hover:bg-white hover:shadow-md active:scale-95 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden group"
              >
                <span className="text-lg sm:text-xl font-black tracking-widest text-slate-800 group-hover:text-blue-600 transition group-hover:scale-105 motion-reduce:group-hover:scale-100">
                  {brand.name}
                </span>
                <span className="text-[11px] text-slate-500 font-medium mt-1 group-hover:text-slate-700 transition text-center line-clamp-1">
                  {brand.subtitle || "Chính hãng"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
