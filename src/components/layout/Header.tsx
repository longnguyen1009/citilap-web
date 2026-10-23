"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu, PhoneCall,
  ClipboardCheck, User, Monitor, ChevronDown, ChevronRight,
  Laptop, Gamepad2, Briefcase, Palette, RefreshCw, Cpu,
  Tablet, HardDrive, Camera, Sparkles, X, Heart
} from "lucide-react";
import CartIcon from "./CartIcon";
import { useWishlist } from "@/context/WishlistContext";
import SearchAutocomplete from "@/components/search/SearchAutocomplete";
import type { CategorySummary, BrandSummary } from "@/server/services/catalog.service";
import { businessProfile } from "@/config/business-profile";
import type { ResolvedNavigation } from "@/contracts/cms/navigation";
import type { PublicStorefrontSettings } from "@/contracts/cms/settings";

const categoryIcons: Record<string, React.ElementType> = {
  "laptop-gaming": Gamepad2,
  "Laptop Gaming": Gamepad2,
  "laptop-van-phong": Briefcase,
  "Laptop Văn Phòng": Briefcase,
  "laptop-do-hoa": Palette,
  "Laptop Đồ Họa – Kĩ Thuật": Palette,
  "Laptop Đồ Hoạ - Kỹ Thuật": Palette,
  "laptop-cu": RefreshCw,
  "Laptop Like New": RefreshCw,
  "linh-kien": Cpu,
  "Linh Kiện – Phụ Kiện": Cpu,
  "Linh Kiện - Phụ Kiện": Cpu,
  "laptop-moi": Sparkles,
  "Laptop Mới": Sparkles,
  "macbook": Tablet,
  "pc": HardDrive,
  "camera": Camera,
};

export interface HeaderCategoryItem {
  id?: string;
  name: string;
  slug?: string;
  href: string;
  productCount?: number;
  children?: { name: string; href: string }[];
}

export interface HeaderNavItem {
  name: string;
  href: string;
  hot?: boolean;
  children?: { name: string; href: string }[];
}

export interface HeaderProps {
  categories?: CategorySummary[];
  brands?: BrandSummary[];
  navigation?: ResolvedNavigation | null;
  settings?: PublicStorefrontSettings | null;
}

export default function Header({ categories = [], brands = [], navigation, settings }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [hoveredNav, setHoveredNav] = useState<number | null>(null);
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const [menuTop, setMenuTop] = useState(0);
  const { wishlistCount } = useWishlist();

  useEffect(() => {
    if (!menuOpen) return;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    const resize = () => {
      if (window.innerWidth < 768) setMenuOpen(false);
      else setMenuTop(headerRef.current?.getBoundingClientRect().bottom || 0);
    };
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); document.body.style.overflow = overflow; document.body.style.paddingRight = paddingRight; };
  }, [menuOpen]);

  // Keyboard accessibility: Escape closes menus
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setHoveredItem(null);
        setHoveredNav(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Build dynamic dropdown categories from D1 data
  const dynamicCategoryMenu: HeaderCategoryItem[] = navigation
    ? navigation.categories.filter(cat => !cat.parentId).map(cat => {
        const menu = navigation.menus.main.find(item => item.href === cat.href);
        return {
          id: cat.id, name: cat.name, slug: cat.slug, href: cat.href,
          children: menu?.children.length
            ? menu.children.map(child => ({ name: child.label, href: child.href }))
            : navigation.categories.filter(child => child.parentId === cat.id).map(child => ({ name: child.name, href: child.href })),
        };
      })
    : categories.length > 0
    ? categories.map((cat) => {
        const children = cat.subCategories && cat.subCategories.length > 0
          ? cat.subCategories.map((sub) => ({
              name: sub.name,
              href: `/category/${sub.slug}`,
            }))
          : brands.length > 0 && !cat.slug.includes("linh-kien") && !cat.slug.includes("camera")
            ? brands.map((b) => ({
                name: `${cat.name.replace("Laptop ", "")} ${b.name}`,
                href: `/category/${cat.slug}?brand=${b.slug}`,
              }))
            : undefined;

        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          href: `/category/${cat.slug}`,
          productCount: cat.productCount,
          children,
        };
      })
    : [
        { name: "Laptop Gaming", slug: "laptop-gaming", href: "/category/laptop-gaming" },
        { name: "Laptop Văn Phòng", slug: "laptop-van-phong", href: "/category/laptop-van-phong" },
        { name: "Laptop Đồ Họa – Kĩ Thuật", slug: "laptop-do-hoa", href: "/category/laptop-do-hoa" },
        { name: "Laptop Like New", slug: "laptop-cu", href: "/category/laptop-cu" },
        { name: "Linh Kiện – Phụ Kiện", slug: "linh-kien", href: "/category/linh-kien" },
      ];

  // 1. Phụ kiện Laptop dropdown items
  const accessoryNavChildren = [
    { name: "Chuột & Bàn phím", href: "/category/linh-kien?type=mouse-keyboard" },
    { name: "Balo & Túi chống sốc", href: "/category/linh-kien?type=bag" },
    { name: "Củ sạc GaN & Cáp sạc", href: "/category/linh-kien?type=charger" },
    { name: "Hub chuyển đổi Type-C", href: "/category/linh-kien?type=hub" },
    { name: "Đế tản nhiệt & Giá đỡ", href: "/category/linh-kien?type=stand" },
    { name: "Đèn màn hình & Desk Setup", href: "/category/linh-kien?type=screenbar" },
    { name: "Tai nghe & Âm thanh", href: "/category/linh-kien?type=audio" },
    { name: "Nâng cấp RAM & SSD", href: "/category/linh-kien?type=hardware" },
  ];

  // 2. Về CitiLap dropdown items (gộp Cửa hàng và Giới thiệu)
  const aboutNavChildren = [
    { name: "Giới thiệu CitiLap", href: "/gioi-thieu" },
    { name: "Hệ thống cửa hàng", href: "/he-thong-cua-hang" },
  ];

  // 3. Lọc bỏ "Laptop Like New" (slug: laptop-cu), "Linh kiện", và test temp khỏi danh sách laptop chính
  const laptopNavCategories: HeaderNavItem[] = categories.length > 0
    ? categories
        .filter((cat) => cat.slug !== "laptop-cu" && !cat.slug.includes("linh-kien") && !cat.slug.startsWith("temp-") && !cat.id.startsWith("temp-"))
        .map((cat) => ({
          name: cat.name,
          href: `/category/${cat.slug}`,
          children: brands.length > 0 && !cat.slug.includes("camera")
            ? brands.map((b) => ({
                name: `${cat.name.replace("Laptop ", "").replace("Apple - ", "")} ${b.name}`,
                href: `/category/${cat.slug}?brand=${b.slug}`,
              }))
            : undefined,
        }))
    : [
        { name: "Laptop Gaming", href: "/category/laptop-gaming" },
        { name: "Laptop Văn Phòng", href: "/category/laptop-van-phong" },
        { name: "Laptop Đồ Hoạ", href: "/category/laptop-do-hoa" },
        { name: "Apple - MacBook", href: "/category/macbook" },
      ];

  const legacyNavItems: HeaderNavItem[] = [
    { name: "HOT SALE", href: "/hot-sale", hot: true },
    ...laptopNavCategories,
    {
      name: "PHỤ KIỆN LAPTOP",
      href: "/category/linh-kien",
      children: accessoryNavChildren,
    },
    {
      name: "VỀ CITILAP",
      href: "/gioi-thieu",
      children: aboutNavChildren,
    },
    { name: "TIN TỨC", href: "/news" },
  ];

  const dynamicNavItems: HeaderNavItem[] = navigation
    ? navigation.menus.main.map((item) => ({
        name: item.label, href: item.href,
        hot: item.href === '/hot-sale',
        children: item.children.length ? item.children.map((child) => ({ name: child.label, href: child.href })) : undefined,
      }))
    : legacyNavItems;

  return (
    <>
      {menuOpen && <button type="button" aria-label="Đóng danh mục" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-[49] hidden bg-black/50 backdrop-blur-sm md:block" />}
      <header ref={headerRef} className="w-full sticky top-0 z-50 shadow-md">
      {/* Top Header */}
      <div className="bg-[#0b1221] text-white py-3">
        <div className="container mx-auto px-4 flex items-center justify-between gap-4 max-w-[1370px]">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {settings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logoUrl}
                alt={settings.storeName || "CitiLap"}
                className="h-auto w-[156px] sm:w-[210px] xl:w-[260px] object-contain"
              />
            ) : (
              <>
                <Monitor className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                <div className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-black leading-none tracking-wider text-white">
                    {settings?.storeName || "CITILAP.VN"}
                  </span>
                  <span className="text-[8px] sm:text-[9px] tracking-[0.2em] text-blue-400 font-medium uppercase mt-0.5 sm:mt-1 hidden sm:block">
                    {settings?.motto || "Một chữ tín - Vạn niềm tin"}
                  </span>
                </div>
              </>
            )}
          </Link>

          {/* Danh mục & Search */}
          <div className="flex flex-grow max-w-3xl items-center gap-2 sm:gap-4 ml-2 sm:ml-4">
            <div className="relative hidden md:block">
              {/* Button Danh mục - Click to toggle */}
              <button
                type="button"
                id="category-menu-button"
                aria-expanded={menuOpen}
                aria-haspopup="true"
                aria-controls="category-dropdown-menu"
                aria-label="Danh mục sản phẩm"
                onClick={() => {
                  setMenuOpen(!menuOpen);
                  setHoveredItem(Math.max(0, dynamicCategoryMenu.findIndex(item => item.children?.length)));
                  setMenuTop(headerRef.current?.getBoundingClientRect().bottom || 0);
                }}
                className={`flex items-center gap-2.5 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                  menuOpen
                    ? "bg-gradient-to-r from-blue-700 to-blue-800 shadow-xl shadow-blue-600/40"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5"
                }`}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                <span>Danh mục</span>
                <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-300 ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div id="category-dropdown-menu" role="region" aria-label="Menu danh mục sản phẩm" style={{ top: menuTop + 8, maxHeight: `calc(100dvh - ${menuTop + 24}px)` }} className="fixed inset-x-4 z-50 mx-auto grid max-w-[1338px] grid-cols-[230px_1fr] gap-2 text-slate-800">
                  <div className="overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    {dynamicCategoryMenu.map((item, idx) => {
                      const IconComponent = (item.slug && categoryIcons[item.slug]) || Laptop;
                      return <Link key={item.href} href={item.href} onMouseEnter={() => setHoveredItem(idx)} onFocus={() => setHoveredItem(idx)} onClick={() => setMenuOpen(false)} className={'flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ' + (hoveredItem === idx ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50')}><IconComponent className="h-5 w-5 shrink-0" /><span className="min-w-0 flex-1">{item.name}</span><ChevronRight className="h-4 w-4" /></Link>;
                    })}
                  </div>
                  <div className="overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
                    {(() => {
                      const item = dynamicCategoryMenu[hoveredItem ?? 0];
                      if (!item) return null;
                      return <><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold">{item.name}</h2><Link href={item.href} onClick={() => setMenuOpen(false)} className="text-xs font-bold text-blue-700">Xem tất cả</Link></div><div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{(item.children?.length ? item.children : [item]).map(sub => {
                        const image = navigation?.collections.find(c => c.href === sub.href)?.image || navigation?.categories.find(c => c.href === sub.href)?.image;
                        return <Link key={sub.href} href={sub.href} onClick={() => setMenuOpen(false)} className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold hover:border-blue-300 hover:bg-blue-50">{image && <Image src={image} alt="" width={56} height={48} className="h-12 w-14 shrink-0 rounded object-contain" />}<span>{sub.name}</span></Link>;
                      })}</div></>;
                    })()}
                  </div>
                </div>
              )}
            </div>

            <div className="relative flex-grow">
              <SearchAutocomplete
                placeholder="Bạn cần tìm máy gì..."
                mobilePlaceholder="Tìm laptop, phụ kiện"
                className="w-full"
                size="md"
              />
            </div>
          </div>

          {/* Action Links */}
          <div className="hidden md:flex items-center gap-3 lg:gap-8 ml-2 lg:ml-4 shrink-0">
            <a
              href={settings?.storePhone ? `tel:${settings.storePhone.replace(/\s+/g, "")}` : businessProfile.telHref}
              className="hidden xl:flex items-center gap-2 hover:text-blue-400 transition"
              title={`Gọi Hotline tư vấn ${settings?.storePhone || businessProfile.displayPhone}`}
            >
              <PhoneCall className="w-5 h-5 text-gray-300" />
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400">Hotline</span>
                <span className="text-sm font-bold">{settings?.storePhone || businessProfile.displayPhone}</span>
              </div>
            </a>

            <Link href="/order-tracking" className="hidden lg:flex items-center gap-2 hover:text-blue-400 transition">
              <ClipboardCheck className="w-5 h-5 text-gray-300" />
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-400">Tra cứu</span>
                <span className="text-xs font-medium">đơn hàng</span>
              </div>
            </Link>

            <Link href="/profile" className="flex flex-col items-center justify-center bg-[#1f2937] hover:bg-[#374151] rounded w-14 lg:w-16 h-10 transition">
              <User className="w-4 h-4 text-gray-300 mb-0.5" />
              <span className="text-[10px] text-gray-300">Tài khoản</span>
            </Link>

            <Link href="/wishlist" className="flex flex-col items-center justify-center bg-[#1f2937] hover:bg-[#374151] rounded w-14 lg:w-16 h-10 transition relative">
              <Heart className="w-4 h-4 text-gray-300 mb-0.5" />
              <span className="text-[10px] text-gray-300">Yêu thích</span>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>

            <CartIcon />
          </div>

        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-200 hidden md:block">
        <div className="container mx-auto px-4 max-w-[1370px]">
          <ul className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 py-3 lg:justify-between">
            {dynamicNavItems.map((item, index) => {
              const isChildActive = item.children?.some(
                (c) => pathname === c.href || (c.href !== "/" && pathname.startsWith(c.href + "/"))
              );
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href + "/")) ||
                isChildActive;

              return (
                <li
                  key={index}
                  className="relative"
                  onMouseEnter={() => item.children && setHoveredNav(index)}
                  onMouseLeave={() => item.children && setHoveredNav(null)}
                  onFocus={() => item.children && setHoveredNav(index)}
                  onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHoveredNav(null); }}
                >
                  <Link
                    href={item.href}
                    aria-expanded={item.children ? hoveredNav === index : undefined}
                    className={`flex items-center gap-1 text-sm font-bold uppercase transition hover:text-blue-600 ${
                      isActive
                        ? "text-blue-600 border-b-2 border-blue-600 pb-0.5"
                        : item.hot
                        ? "text-red-600"
                        : "text-gray-800"
                    }`}
                  >
                    {item.name}
                    {item.children && <ChevronDown className="w-4 h-4" />}
                  </Link>

                  {/* Dropdown */}
                  {item.children && hoveredNav === index && (
                    <div className={`absolute top-full ${index >= dynamicNavItems.length / 2 ? 'right-0' : 'left-0'} pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150`}>
                      <div
                        className={`bg-white rounded-xl shadow-xl shadow-gray-200/70 border border-gray-150 py-2 ${
                          item.children.length > 5
                            ? "min-w-[380px] grid grid-cols-2 p-2 gap-1"
                            : "min-w-[210px]"
                        }`}
                      >
                        {item.children.map((sub, sidx) => (
                          <Link
                            key={sidx}
                            href={sub.href}
                            className="block px-3.5 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium rounded-lg"
                          >
                            {sub.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      </header>
    </>
  );
}
