"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, PhoneCall,
  ClipboardCheck, User, Monitor, ChevronDown, ChevronRight,
  Laptop, Gamepad2, Briefcase, Palette, RefreshCw, Cpu,
  Tablet, HardDrive, Camera, Sparkles, ArrowRight, X, Heart
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
  const menuRef = useRef<HTMLDivElement>(null);
  const { wishlistCount } = useWishlist();

  // Đóng menu khi click bên ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setHoveredItem(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Đóng menu khi scroll
  useEffect(() => {
    function handleScroll() {
      setMenuOpen(false);
      setHoveredItem(null);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
    ? navigation.categories.filter((cat) => !cat.parentId).map((cat) => ({
        id: cat.id, name: cat.name, slug: cat.slug, href: cat.href,
        children: navigation.categories.filter((child) => child.parentId === cat.id)
          .map((child) => ({ name: child.name, href: child.href })),
      }))
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
    <header className="w-full sticky top-0 z-50 shadow-md">
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
                className="h-8 sm:h-10 w-auto max-w-[160px] object-contain rounded"
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
            <div className="relative hidden md:block" ref={menuRef}>
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
                  setHoveredItem(null);
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

              {/* Dropdown Menu */}
              {menuOpen && (
                <div
                  id="category-dropdown-menu"
                  role="region"
                  aria-label="Menu danh mục sản phẩm"
                  className="absolute top-full left-0 pt-3 w-[280px] z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/60 py-2 text-sm text-gray-700 relative border border-gray-100/80">
                    {/* Decorative top gradient */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-t-2xl"></div>

                    {dynamicCategoryMenu.map((item, idx) => {
                      const IconComponent = (item.slug && categoryIcons[item.slug]) || categoryIcons[item.name] || Laptop;
                      const hasChildren = !!item.children && item.children.length > 0;
                      const isHovered = hoveredItem === idx;

                      return (
                        <div
                          key={idx}
                          className="relative"
                          onMouseEnter={() => hasChildren && setHoveredItem(idx)}
                          onMouseLeave={() => hasChildren && setHoveredItem(null)}
                        >
                          <Link
                            href={item.href}
                            onClick={() => !hasChildren && setMenuOpen(false)}
                            className={`flex items-center justify-between px-5 py-3 border-l-[3px] transition-all duration-200 font-medium ${
                              isHovered
                                ? "border-blue-500 text-blue-600 bg-gradient-to-r from-blue-50/80 to-transparent"
                                : "border-transparent hover:border-blue-500 hover:text-blue-600 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-transparent"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                                isHovered ? "bg-blue-100" : "bg-gray-100"
                              }`}>
                                <IconComponent className={`w-4 h-4 transition-colors duration-200 ${
                                  isHovered ? "text-blue-600" : "text-gray-400"
                                }`} />
                              </div>
                              <span className="truncate">{item.name}</span>
                            </div>
                            {hasChildren && (
                              <ChevronRight className={`w-4 h-4 transition-all duration-200 ${
                                isHovered ? "text-blue-500 translate-x-0.5" : "text-gray-300"
                              }`} />
                            )}
                          </Link>

                          {/* Sub-menu (Level 2) - Mega Menu */}
                          {hasChildren && isHovered && (
                            <>
                              {/* Mega Menu - sát ngay bên phải menu chính */}
                              <div className="absolute top-0 left-full w-[420px] z-50">
                                <div className="bg-white shadow-2xl shadow-gray-200/80 rounded-xl border border-gray-100/80 overflow-hidden">
                                  {/* Compact header */}
                                  <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <IconComponent className="w-4 h-4 text-white" />
                                      <span className="font-bold text-xs text-white">{item.name}</span>
                                    </div>
                                    <span className="text-[10px] text-blue-100 uppercase tracking-wider font-semibold">Theo thương hiệu</span>
                                  </div>

                                  {/* Compact brand list */}
                                  <div className="p-3 grid grid-cols-2 gap-2">
                                    {item.children!.map((sub, sidx) => (
                                      <Link
                                        key={sidx}
                                        href={sub.href}
                                        onClick={() => setMenuOpen(false)}
                                        className="group/link flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 text-gray-700 hover:text-blue-600 transition-all duration-150 text-sm font-medium"
                                      >
                                        <ChevronRight className="w-3 h-3 text-gray-300 group-hover/link:text-blue-500 transition-colors" />
                                        <span className="truncate">{sub.name}</span>
                                      </Link>
                                    ))}
                                  </div>

                                  {/* Compact view all */}
                                  <div className="px-3 pb-3">
                                    <Link
                                      href={item.href}
                                      onClick={() => setMenuOpen(false)}
                                      className="flex items-center justify-center gap-1 w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-150 text-xs font-bold"
                                    >
                                      Xem tất cả
                                      <ArrowRight className="w-3 h-3" />
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Footer */}
                    <div className="mt-2 px-5 py-3 border-t border-gray-100 bg-gradient-to-b from-gray-50/50 to-transparent">
                      <Link
                        href="/category"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-all duration-200 font-bold text-xs"
                      >
                        Xem tất cả danh mục
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
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
          <ul className="flex items-center justify-between py-3">
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
  );
}
