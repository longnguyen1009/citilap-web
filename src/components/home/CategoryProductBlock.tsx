import Link from "next/link";
import Image from "next/image";
import {
  LayoutGrid,
  ChevronRight,
  Store,
  Gamepad2,
  Briefcase,
  Palette,
  Laptop,
  Cpu,
  Keyboard,
  ShoppingBag,
  Usb,
  Fan,
  type LucideIcon,
} from "lucide-react";

export interface CategoryBlockItem {
  id: string;
  name: string;
  href: string;
  image?: string | null;
  alt?: string;
  badge?: string;
  badgeColor?: string;
  icon?: LucideIcon;
}

interface CardTheme {
  surface: string;
  border: string;
  hover: string;
  accentBar: string;
  iconColor: string;
  titleHover: string;
  chevronColor: string;
}

const CARD_THEMES: CardTheme[] = [
  {
    surface: "bg-gradient-to-br from-rose-50 via-red-50/75 to-orange-50/70",
    border: "border-rose-200/80",
    hover: "hover:border-rose-400 hover:shadow-md hover:shadow-rose-500/15",
    accentBar: "from-rose-500 to-orange-500",
    iconColor: "text-rose-600",
    titleHover: "group-hover:text-rose-700",
    chevronColor: "text-rose-500",
  },
  {
    surface: "bg-gradient-to-br from-sky-50 via-blue-50/80 to-indigo-50/60",
    border: "border-sky-200/80",
    hover: "hover:border-blue-400 hover:shadow-md hover:shadow-blue-500/15",
    accentBar: "from-sky-500 to-blue-600",
    iconColor: "text-blue-600",
    titleHover: "group-hover:text-blue-700",
    chevronColor: "text-blue-500",
  },
  {
    surface: "bg-gradient-to-br from-violet-50 via-purple-50/75 to-indigo-50/70",
    border: "border-violet-200/80",
    hover: "hover:border-violet-400 hover:shadow-md hover:shadow-violet-500/15",
    accentBar: "from-violet-500 to-indigo-600",
    iconColor: "text-violet-600",
    titleHover: "group-hover:text-violet-700",
    chevronColor: "text-violet-500",
  },
  {
    surface: "bg-gradient-to-br from-slate-100 via-zinc-50 to-sky-50/75",
    border: "border-slate-300/80",
    hover: "hover:border-slate-500 hover:shadow-md hover:shadow-slate-500/15",
    accentBar: "from-slate-700 to-blue-600",
    iconColor: "text-slate-700",
    titleHover: "group-hover:text-slate-900",
    chevronColor: "text-slate-600",
  },
  {
    surface: "bg-gradient-to-br from-emerald-50 via-teal-50/75 to-cyan-50/60",
    border: "border-emerald-200/80",
    hover: "hover:border-emerald-400 hover:shadow-md hover:shadow-emerald-500/15",
    accentBar: "from-emerald-500 to-teal-500",
    iconColor: "text-emerald-600",
    titleHover: "group-hover:text-emerald-700",
    chevronColor: "text-emerald-500",
  },
  {
    surface: "bg-gradient-to-br from-amber-50 via-orange-50/75 to-yellow-50/70",
    border: "border-amber-200/80",
    hover: "hover:border-amber-400 hover:shadow-md hover:shadow-amber-500/15",
    accentBar: "from-amber-500 to-orange-500",
    iconColor: "text-amber-600",
    titleHover: "group-hover:text-amber-700",
    chevronColor: "text-amber-500",
  },
  {
    surface: "bg-gradient-to-br from-cyan-50 via-sky-50/75 to-teal-50/60",
    border: "border-cyan-200/80",
    hover: "hover:border-cyan-400 hover:shadow-md hover:shadow-cyan-500/15",
    accentBar: "from-cyan-500 to-sky-600",
    iconColor: "text-cyan-600",
    titleHover: "group-hover:text-cyan-700",
    chevronColor: "text-cyan-500",
  },
  {
    surface: "bg-gradient-to-br from-indigo-50 via-blue-50/75 to-slate-50",
    border: "border-indigo-200/80",
    hover: "hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-500/15",
    accentBar: "from-indigo-500 to-blue-600",
    iconColor: "text-indigo-600",
    titleHover: "group-hover:text-indigo-700",
    chevronColor: "text-indigo-500",
  },
  {
    surface: "bg-gradient-to-br from-teal-50 via-emerald-50/70 to-sky-50/70",
    border: "border-teal-200/80",
    hover: "hover:border-teal-400 hover:shadow-md hover:shadow-teal-500/15",
    accentBar: "from-teal-500 to-emerald-500",
    iconColor: "text-teal-600",
    titleHover: "group-hover:text-teal-700",
    chevronColor: "text-teal-500",
  },
  {
    surface: "bg-gradient-to-br from-fuchsia-50 via-purple-50/70 to-pink-50/60",
    border: "border-fuchsia-200/80",
    hover: "hover:border-fuchsia-400 hover:shadow-md hover:shadow-fuchsia-500/15",
    accentBar: "from-fuchsia-500 to-purple-600",
    iconColor: "text-fuchsia-600",
    titleHover: "group-hover:text-fuchsia-700",
    chevronColor: "text-fuchsia-500",
  },
];

function resolveFallbackIcon(item: CategoryBlockItem): LucideIcon {
  if (item.icon) return item.icon;
  const key = `${item.id} ${item.name} ${item.href}`.toLowerCase();
  if (key.includes("gaming")) return Gamepad2;
  if (key.includes("văn phòng") || key.includes("van-phong")) return Briefcase;
  if (key.includes("đồ hoạ") || key.includes("do-hoa") || key.includes("workstation")) return Palette;
  if (key.includes("macbook") || key.includes("apple")) return Laptop;
  if (key.includes("chuột") || key.includes("bàn phím") || key.includes("mouse")) return Keyboard;
  if (key.includes("balo") || key.includes("túi") || key.includes("bag")) return ShoppingBag;
  if (key.includes("hub") || key.includes("type-c")) return Usb;
  if (key.includes("tản nhiệt") || key.includes("stand")) return Fan;
  if (key.includes("ram") || key.includes("ssd") || key.includes("linh kiện")) return Cpu;
  return Store;
}

export default function CategoryProductBlock({
  categories,
  title,
  eagerLimit = 12,
}: {
  categories: CategoryBlockItem[];
  title?: string;
  subtitle?: string;
  viewAllLink?: string;
  eagerLimit?: number;
}) {
  const visibleCategories = (categories || []).slice(0, 12);
  if (visibleCategories.length === 0) return null;

  const heading = title?.trim() || "DANH MỤC SẢN PHẨM";

  return (
    <section className="py-3 md:py-5" aria-label={heading}>
      <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4">
        <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Header Block */}
          <div className="relative bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 px-3.5 md:px-5 py-2.5 md:py-3 flex items-center text-white overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute -right-8 -top-10 w-44 h-44 rounded-full bg-blue-500/15 blur-2xl pointer-events-none"
            />
            <div className="flex items-center gap-2.5 min-w-0 relative z-10">
              <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 border border-white/20 flex items-center justify-center text-white shadow-sm shadow-blue-500/30 shrink-0">
                <LayoutGrid className="w-4.5 h-4.5 md:w-5 md:h-5" />
              </div>
              <h2 className="text-[16px] sm:text-[18px] lg:text-[20px] font-black uppercase tracking-wide text-white truncate leading-tight">
                {heading}
              </h2>
            </div>
          </div>

          {/* Compact 6-col x max 2 rows Cards Grid */}
          <div className="p-2.5 sm:p-3 lg:p-3.5 bg-slate-50/75">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
              {visibleCategories.map((item, index) => {
                const theme = CARD_THEMES[index % CARD_THEMES.length];
                const FallbackIcon = resolveFallbackIcon(item);
                const thumbSrc =
                  item.image &&
                  item.image.startsWith("/api/library/") &&
                  !item.image.includes("?")
                    ? `${item.image}?size=icon&v=2`
                    : item.image;

                return (
                  <Link
                    key={`${item.id}-${index}`}
                    href={item.href || "/search"}
                    prefetch={false}
                    className={`group relative block rounded-xl border overflow-hidden transition-all duration-200 ease-out hover:-translate-y-1 motion-reduce:hover:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-hidden shadow-2xs ${theme.surface} ${theme.border} ${theme.hover}`}
                  >
                    <article className="relative flex items-center gap-2 sm:gap-2.5 px-2 py-2 sm:px-2.5 sm:py-2 min-h-[68px] sm:min-h-[72px] lg:min-h-[76px]">
                      {/* Hover glossy sheen sweep */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 -left-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[360%] motion-reduce:hidden"
                      />

                      {/* Thumbnail with minimal inner padding */}
                      <div className="relative w-[48px] h-[48px] sm:w-[54px] sm:h-[54px] lg:w-[58px] lg:h-[58px] shrink-0 rounded-lg bg-white/95 border border-white shadow-2xs ring-1 ring-slate-900/5 flex items-center justify-center overflow-hidden p-0.5">
                        {thumbSrc ? (
                          <Image
                            src={thumbSrc}
                            alt={item.alt || item.name}
                            width={64}
                            height={64}
                            loading={index < eagerLimit ? "eager" : "lazy"}
                            decoding="async"
                            unoptimized={
                              thumbSrc.includes("size=") ||
                              thumbSrc.startsWith("/brand/")
                            }
                            className="w-full h-full object-contain transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3 motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0 mix-blend-multiply"
                          />
                        ) : (
                          <FallbackIcon
                            className={`w-7 h-7 lg:w-8 lg:h-8 transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100 ${theme.iconColor}`}
                          />
                        )}

                        {item.badge && (
                          <span
                            className={`absolute -top-0.5 -right-0.5 text-[8px] font-black px-1 py-0.2 rounded-full shadow-2xs uppercase tracking-tight leading-tight ${
                              item.badgeColor || "bg-red-500 text-white"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>

                      {/* Title & micro arrow */}
                      <div className="min-w-0 flex-1 flex items-center justify-between gap-1">
                        <h3
                          className={`text-[12.5px] sm:text-[13px] lg:text-[13.5px] font-bold text-slate-800 leading-snug line-clamp-2 transition-colors duration-200 ${theme.titleHover}`}
                        >
                          {item.name.replace(/Type-C/g, "Type\u2011C")}
                        </h3>
                        <ChevronRight
                          aria-hidden="true"
                          className={`hidden sm:block w-3.5 h-3.5 shrink-0 opacity-35 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0 ${theme.chevronColor}`}
                        />
                      </div>

                      {/* Bottom animated accent bar */}
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2.5px] bg-gradient-to-r ${theme.accentBar} origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out motion-reduce:transition-none`}
                      />
                    </article>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
