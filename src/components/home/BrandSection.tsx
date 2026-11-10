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
  viewAllLink,
  brands: customBrands,
}: {
  title?: string;
  subtitle?: string;
  viewAllLink?: string;
  brands?: BrandItem[];
} = {}) {
  const displayBrands = customBrands && customBrands.length > 0 ? customBrands : DEFAULT_BRANDS;
  const displayTitle = title || "Khám Phá Theo Thương Hiệu";
  const displaySubtitle = subtitle || "Đối tác phân phối laptop và linh kiện chính hãng hàng đầu thị trường";

  return (
    <section className="py-4 md:py-6 lg:py-8" aria-label={displayTitle}>
      <div className="w-full min-w-0 mx-auto max-w-7xl px-3 md:px-6">
        <div className="bg-white rounded-xl lg:rounded-2xl shadow-xs border border-slate-200/90 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-3 md:px-5 lg:px-6 py-2.5 md:py-3.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-2.5 min-w-0">
              <div className="bg-blue-600/30 border border-blue-400/40 p-1.5 md:p-2 rounded-lg md:rounded-xl text-blue-400 shrink-0">
                <Award className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[16px] sm:text-[18px] lg:text-[22px] xl:text-[24px] font-black text-white uppercase tracking-wide truncate leading-snug">
                  {displayTitle}
                </h2>
                <p className="text-[12px] text-slate-300 hidden md:block">
                  {displaySubtitle}
                </p>
              </div>
            </div>
            <Link
              href={viewAllLink || "/phan-loai"}
              className="min-h-11 inline-flex items-center gap-1 px-2 -mr-1 rounded-lg text-[12px] md:text-[13px] font-semibold text-blue-400 hover:text-blue-300 transition shrink-0 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:outline-hidden"
            >
              <span className="hidden md:inline">Xem tất cả danh mục</span>
              <span className="md:hidden">Tất cả</span>
              <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
            </Link>
          </div>

          <div className="p-2.5 md:p-4 lg:p-5 grid grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3">
            {displayBrands.map((brand) => (
              <Link
                key={brand.name}
                href={brand.href || `/brand/${brand.slug || brand.name.toLowerCase()}`}
                className="min-h-11 flex flex-col items-center justify-center px-1.5 py-2 md:p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-lg lg:rounded-xl hover:border-blue-500 hover:bg-white hover:shadow-xs active:scale-95 transition duration-200 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden group"
              >
                {brand.logo && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={brand.logo}
                    alt=""
                    loading="lazy"
                    className="h-5 md:h-6 w-auto max-w-[72px] object-contain mb-1"
                  />
                )}
                <span className="text-[12px] md:text-[14px] xl:text-[15px] font-black tracking-wide text-slate-800 group-hover:text-blue-600 transition truncate max-w-full leading-tight">
                  {brand.name}
                </span>
                <span className="text-[10px] md:text-[11px] text-slate-500 font-medium mt-0.5 group-hover:text-slate-700 transition text-center line-clamp-1">
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
