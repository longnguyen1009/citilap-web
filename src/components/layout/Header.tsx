"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu, PhoneCall,
  ClipboardCheck, Monitor, ChevronDown, ChevronRight,
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
  const [prevPath, setPrevPath] = useState(pathname);
  const headerRef = useRef<HTMLElement>(null);
  const categoryButtonRef = useRef<HTMLButtonElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const navListRef = useRef<HTMLUListElement>(null);
  const [menuTop, setMenuTop] = useState(0);
  const { wishlistCount } = useWishlist();

  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setMenuOpen(false);
    setHoveredItem(null);
    setHoveredNav(null);
  }

  // Measure rendered header height and expose scoped CSS variable on .storefront-shell
  useEffect(() => {
    const headerEl = headerRef.current;
    if (!headerEl) return;

    const scopeEl = headerEl.closest(".storefront-shell") as HTMLElement | null;
    if (!scopeEl) return;
    const previousHeightVar = scopeEl.style.getPropertyValue("--storefront-header-height");

    const updateHeaderHeightVar = () => {
      const rect = headerEl.getBoundingClientRect();
      if (rect.height > 0) {
        scopeEl.style.setProperty(
          "--storefront-header-height",
          `${Math.round(rect.height)}px`
        );
      }
    };

    updateHeaderHeightVar();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        updateHeaderHeightVar();
      });
      observer.observe(headerEl);
    } else {
      window.addEventListener("resize", updateHeaderHeightVar);
    }

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateHeaderHeightVar);
      if (previousHeightVar) {
        scopeEl.style.setProperty("--storefront-header-height", previousHeightVar);
      } else {
        scopeEl.style.removeProperty("--storefront-header-height");
      }
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
    const syncMenuGeometry = () => {
      if (window.innerWidth < 768) {
        setMenuOpen(false);
      } else {
        setMenuTop(headerRef.current?.getBoundingClientRect().bottom || 0);
      }
    };
    window.addEventListener("resize", syncMenuGeometry);
    window.addEventListener("scroll", syncMenuGeometry, { passive: true });
    return () => {
      window.removeEventListener("resize", syncMenuGeometry);
      window.removeEventListener("scroll", syncMenuGeometry);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [menuOpen]);

  // Keyboard accessibility: Escape closes menus and restores focus if focus was inside closed content
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const activeEl = document.activeElement as HTMLElement | null;

      if (menuOpen) {
        const focusInsideCategory =
          !!activeEl &&
          (categoryDropdownRef.current?.contains(activeEl) ||
            activeEl === categoryButtonRef.current);
        if (focusInsideCategory) {
          categoryButtonRef.current?.focus();
        }
        setMenuOpen(false);
        setHoveredItem(null);
      }

      if (hoveredNav !== null) {
        const openNavLi = navListRef.current?.querySelector<HTMLElement>(
          `[data-nav-index="${hoveredNav}"]`
        );
        const opener = openNavLi?.querySelector<HTMLElement>("[data-nav-opener]");
        const focusInsideNav = !!activeEl && !!openNavLi?.contains(activeEl);
        if (focusInsideNav && opener) {
          opener.focus();
        }
        setHoveredNav(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen, hoveredNav]);

  // Build dynamic dropdown categories from D1 data
  const dynamicCategoryMenu: HeaderCategoryItem[] = navigation
    ? navigation.menus.main.flatMap(item => {
        const cat = navigation.categories.find(cat => cat.href === item.href);
        return cat ? [{ ...cat, name: item.label }] : [];
      }).map(cat => {
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
              href: sub.href || `/${sub.slug}`,
            }))
          : brands.length > 0 && !cat.slug.includes("linh-kien") && !cat.slug.includes("camera")
            ? brands.map((b) => ({
                name: `${cat.name.replace("Laptop ", "")} ${b.name}`,
                href: `${cat.href || `/${cat.slug}`}?brand=${b.slug}`,
              }))
            : undefined;

        return {
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          href: cat.href || `/${cat.slug}`,
          productCount: cat.productCount,
          children,
        };
      })
    : [
        { name: "Laptop Gaming", slug: "laptop-gaming", href: "/laptop-gaming" },
        { name: "Laptop Văn Phòng", slug: "laptop-van-phong", href: "/laptop-van-phong" },
        { name: "Laptop Đồ Họa – Kĩ Thuật", slug: "laptop-do-hoa", href: "/laptop-workstation" },
        { name: "Laptop Like New", slug: "laptop-cu", href: "/laptop-likenew" },
        { name: "Linh Kiện – Phụ Kiện", slug: "linh-kien", href: "/phu-kien" },
      ];

  // 1. Phụ kiện Laptop dropdown items
  const accessoryNavChildren = [
    { name: "Chuột & Bàn phím", href: "/phu-kien?type=mouse-keyboard" },
    { name: "Balo & Túi chống sốc", href: "/phu-kien?type=bag" },
    { name: "Củ sạc GaN & Cáp sạc", href: "/phu-kien?type=charger" },
    { name: "Hub chuyển đổi Type-C", href: "/phu-kien?type=hub" },
    { name: "Đế tản nhiệt & Giá đỡ", href: "/phu-kien?type=stand" },
    { name: "Đèn màn hình & Desk Setup", href: "/phu-kien?type=screenbar" },
    { name: "Tai nghe & Âm thanh", href: "/phu-kien?type=audio" },
    { name: "Nâng cấp RAM & SSD", href: "/phu-kien?type=hardware" },
  ];

  // 2. Về CitiLap dropdown items (gộp Cửa hàng, Giới thiệu và Hỗ trợ)
  const aboutNavChildren = [
    { name: "Giới thiệu CitiLap", href: "/gioi-thieu" },
    { name: "Hệ thống cửa hàng", href: "/he-thong-cua-hang" },
    { name: "Tư vấn chọn Laptop", href: "/chon-laptop" },
    { name: "Câu hỏi thường gặp", href: "/cau-hoi-thuong-gap" },
    { name: "Liên hệ & Hỗ trợ", href: "/lien-he" },
  ];

  // 3. Lọc bỏ "Laptop Like New" (slug: laptop-cu), "Linh kiện", và test temp khỏi danh sách laptop chính
  const laptopNavCategories: HeaderNavItem[] = categories.length > 0
    ? categories
        .filter((cat) => cat.slug !== "laptop-cu" && !cat.slug.includes("linh-kien") && !cat.slug.startsWith("temp-") && !cat.id.startsWith("temp-"))
        .map((cat) => ({
          name: cat.name,
          href: cat.href || `/${cat.slug}`,
          children: brands.length > 0 && !cat.slug.includes("camera")
            ? brands.map((b) => ({
                name: `${cat.name.replace("Laptop ", "").replace("Apple - ", "")} ${b.name}`,
                href: `${cat.href || `/${cat.slug}`}?brand=${b.slug}`,
              }))
            : undefined,
        }))
    : [
        { name: "Laptop Gaming", href: "/laptop-gaming" },
        { name: "Laptop Văn Phòng", href: "/laptop-van-phong" },
        { name: "Laptop Đồ Hoạ", href: "/laptop-workstation" },
        { name: "Apple - MacBook", href: "/macbook" },
      ];

  const legacyNavItems: HeaderNavItem[] = [
    { name: "HOT SALE", href: "/hot-sale", hot: true },
    ...laptopNavCategories,
    {
      name: "PHỤ KIỆN LAPTOP",
      href: "/phu-kien",
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
        children: item.children.length ? item.children.map((child) => ({ name: child.label, href: child.href, children:child.children })) : undefined,
      }))
    : legacyNavItems;

  return (
    <>
      {menuOpen && (
        <button
          type="button"
          aria-label="Đóng danh mục"
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-[49] hidden bg-black/50 backdrop-blur-sm md:block"
        />
      )}
      <header ref={headerRef} className="w-full sticky top-0 z-50 shadow-md">
        {/* Top Header */}
        <div className="bg-[#0b1221] text-white py-2 md:py-2.5">
          <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4 flex items-center justify-between gap-2 md:gap-2.5 lg:gap-4">
            {/* Logo */}
            <Link href="/" prefetch={false} className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {settings?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logoUrl}
                  alt={settings.storeName || "CitiLap"}
                  decoding="async"
                  fetchPriority="high"
                  className="h-auto w-[116px] min-[375px]:w-[132px] md:w-[132px] lg:w-[172px] xl:w-[210px] object-contain"
                />
              ) : (
                <>
                  <Monitor className="w-6 h-6 lg:w-8 lg:h-8 text-blue-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-base sm:text-lg lg:text-xl font-black leading-none tracking-wider text-white">
                      {settings?.storeName || "CITILAP.VN"}
                    </span>
                    <span className="text-[8px] lg:text-[9px] tracking-[0.18em] text-blue-400 font-medium uppercase mt-0.5 hidden lg:block">
                      {settings?.motto || "Một chữ tín - Vạn niềm tin"}
                    </span>
                  </div>
                </>
              )}
            </Link>

            {/* Danh mục & Search */}
            <div className="flex flex-1 min-w-0 max-w-3xl items-center gap-2 md:gap-2.5 lg:gap-3">
              <div className="relative hidden md:block shrink-0">
                {/* Button Danh mục - Click to toggle */}
                <button
                  ref={categoryButtonRef}
                  type="button"
                  id="category-menu-button"
                  aria-expanded={menuOpen}
                  aria-haspopup="true"
                  aria-controls="category-dropdown-menu"
                  aria-label="Danh mục sản phẩm"
                  onClick={() => {
                    const nextOpen = !menuOpen;
                    setMenuOpen(nextOpen);
                    if (nextOpen) {
                      setHoveredItem(Math.max(0, dynamicCategoryMenu.findIndex(item => item.children?.length)));
                      setMenuTop(headerRef.current?.getBoundingClientRect().bottom || 0);
                    }
                  }}
                  className={`min-h-11 flex items-center gap-2 text-white px-4 lg:px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    menuOpen
                      ? "bg-gradient-to-r from-blue-700 to-blue-800 shadow-xl shadow-blue-600/40"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40"
                  }`}
                >
                  {menuOpen ? <X className="w-5 h-5 shrink-0" /> : <Menu className="w-5 h-5 shrink-0" />}
                  <span>Danh mục</span>
                  <ChevronDown className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 shrink-0 ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {menuOpen && (
                  <div
                    ref={categoryDropdownRef}
                    id="category-dropdown-menu"
                    role="region"
                    aria-label="Menu danh mục sản phẩm"
                    style={{ top: menuTop + 8, maxHeight: `calc(100dvh - ${menuTop + 24}px)` }}
                    className="fixed inset-x-0 z-50 mx-auto w-full max-w-[1370px] px-3 md:px-4 pointer-events-none"
                  >
                    <div
                      style={{ maxHeight: `calc(100dvh - ${menuTop + 24}px)` }}
                      className="pointer-events-auto grid grid-cols-[210px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)] gap-2 text-slate-800"
                    >
                      <div className="max-h-full overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                        {dynamicCategoryMenu.map((item, idx) => {
                          const IconComponent = (item.slug && categoryIcons[item.slug]) || Laptop;
                          return (
                            <Link
                              key={`${item.href}-${idx}`}
                              href={item.href}
                              prefetch={false}
                              onMouseEnter={() => setHoveredItem(idx)}
                              onFocus={() => setHoveredItem(idx)}
                              onClick={() => setMenuOpen(false)}
                              className={
                                "min-h-11 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition " +
                                (hoveredItem === idx ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50")
                              }
                            >
                              <IconComponent className="h-5 w-5 shrink-0" />
                              <span className="min-w-0 flex-1">{item.name}</span>
                              <ChevronRight className="h-4 w-4 shrink-0" />
                            </Link>
                          );
                        })}
                      </div>
                      <div className="max-h-full overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-4 lg:p-5 shadow-xl">
                        {(() => {
                          const item = dynamicCategoryMenu[hoveredItem ?? 0];
                          if (!item) return null;
                          return (
                            <>
                              <div className="mb-4 flex items-center justify-between gap-3">
                                <h2 className="text-base lg:text-lg font-extrabold">{item.name}</h2>
                                <Link
                                  href={item.href}
                                  prefetch={false}
                                  onClick={() => setMenuOpen(false)}
                                  className="min-h-11 inline-flex items-center px-2 text-xs font-bold text-blue-700 hover:underline"
                                >
                                  Xem tất cả
                                </Link>
                              </div>
                              <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
                                {(item.children?.length ? item.children : [item]).map((sub, subIdx) => {
                                  const image =
                                    navigation?.collections.find(c => c.href === sub.href)?.image ||
                                    navigation?.categories.find(c => c.href === sub.href)?.image;
                                  return (
                                    <Link
                                      key={`${sub.href}-${subIdx}`}
                                      href={sub.href}
                                      prefetch={false}
                                      onClick={() => setMenuOpen(false)}
                                      className="flex min-h-14 items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 text-xs lg:text-sm font-semibold hover:border-blue-300 hover:bg-blue-50"
                                    >
                                      {image && (
                                        <Image
                                          src={image}
                                          alt=""
                                          width={48}
                                          height={40}
                                          className="h-10 w-12 shrink-0 rounded object-contain"
                                        />
                                      )}
                                      <span className="min-w-0 break-words">{sub.name}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative flex-1 min-w-0">
                <SearchAutocomplete
                  key={pathname}
                  placeholder="Tìm laptop, dòng máy, CPU, GPU..."
                  mobilePlaceholder="Tìm laptop, mã máy..."
                  className="w-full"
                  size="md"
                />
              </div>
            </div>

            {/* Action Links */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3 xl:gap-5 shrink-0">
              <a
                href={settings?.storePhone ? `tel:${settings.storePhone.replace(/\s+/g, "")}` : businessProfile.telHref}
                className="hidden xl:flex items-center gap-2 min-h-11 hover:text-blue-400 transition"
                title={`Gọi Hotline tư vấn ${settings?.storePhone || businessProfile.displayPhone}`}
              >
                <PhoneCall className="w-5 h-5 text-gray-300 shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] text-gray-400">Hotline</span>
                  <span className="text-sm font-bold whitespace-nowrap">{settings?.storePhone || businessProfile.displayPhone}</span>
                </div>
              </a>

              <Link
                href="/order-tracking"
                prefetch={false}
                className="hidden lg:flex items-center gap-1.5 min-h-11 hover:text-blue-400 transition"
              >
                <ClipboardCheck className="w-5 h-5 text-gray-300 shrink-0" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] text-gray-400">Tra cứu</span>
                  <span className="text-xs font-medium whitespace-nowrap">đơn hàng</span>
                </div>
              </Link>

              <Link
                href="/order-tracking"
                prefetch={false}
                className="flex lg:hidden flex-col items-center justify-center bg-[#1f2937] hover:bg-[#374151] rounded min-w-12 min-h-11 h-11 px-2 transition"
              >
                <ClipboardCheck className="w-4 h-4 text-gray-300 mb-0.5 shrink-0" />
                <span className="text-[10px] text-gray-300 whitespace-nowrap">Đơn hàng</span>
              </Link>

              <Link
                href="/wishlist"
                prefetch={false}
                className="flex flex-col items-center justify-center bg-[#1f2937] hover:bg-[#374151] rounded min-w-12 lg:w-16 min-h-11 h-11 px-2 transition relative"
              >
                <Heart className="w-4 h-4 text-gray-300 mb-0.5 shrink-0" />
                <span className="text-[10px] text-gray-300 whitespace-nowrap">Yêu thích</span>
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
          <div className="w-full min-w-0 mx-auto max-w-[1370px] px-3 md:px-4">
            <ul
              ref={navListRef}
              className="flex items-center justify-start lg:justify-between gap-x-3 lg:gap-x-2 xl:gap-x-4 gap-y-0 max-lg:flex-nowrap max-lg:overflow-x-auto hide-scrollbar lg:flex-wrap lg:overflow-visible"
            >
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
                    data-nav-index={index}
                    className="relative shrink-0"
                    onMouseEnter={() => item.children && setHoveredNav(index)}
                    onMouseLeave={() => item.children && setHoveredNav(null)}
                    onFocus={(event) => {
                      if (
                        item.children &&
                        !event.currentTarget.contains(event.relatedTarget as Node | null)
                      ) {
                        setHoveredNav(index);
                      }
                    }}
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setHoveredNav(null);
                      }
                    }}
                  >
                    <Link
                      href={item.href}
                      prefetch={false}
                      data-nav-opener="true"
                      onFocus={(event) => {
                        event.currentTarget.scrollIntoView({
                          block: "nearest",
                          inline: "nearest",
                        });
                      }}
                      aria-expanded={item.children ? hoveredNav === index : undefined}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={`min-h-11 flex items-center gap-1 px-1 py-2.5 text-[13px] xl:text-sm font-bold uppercase whitespace-nowrap transition hover:text-blue-600 ${
                        isActive
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : item.hot
                          ? "text-red-600"
                          : "text-gray-800"
                      }`}
                    >
                      {item.name}
                      {item.children && <ChevronDown className="w-4 h-4 shrink-0" />}
                    </Link>

                    {/* Dropdown */}
                    {item.children && hoveredNav === index && (
                      <div
                        className={`max-lg:fixed max-lg:inset-x-6 max-lg:top-[var(--storefront-header-height,6.5rem)] max-lg:pt-1 lg:absolute lg:top-full ${
                          index >= dynamicNavItems.length / 2 ? "lg:right-0" : "lg:left-0"
                        } lg:pt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150`}
                      >
                        <div
                          className={`bg-white rounded-xl shadow-xl shadow-gray-200/70 border border-gray-200 py-2 max-h-[calc(100dvh-var(--storefront-header-height,6.5rem)-1.5rem)] overflow-y-auto overscroll-contain max-lg:w-full lg:max-w-[calc(100vw-3rem)] ${
                            item.children.length > 5
                              ? "grid grid-cols-2 p-2 gap-1 lg:w-max lg:min-w-[360px]"
                              : "max-lg:grid max-lg:grid-cols-2 max-lg:p-2 max-lg:gap-1 lg:w-max lg:min-w-[210px]"
                          }`}
                        >
                          {item.children.map((sub, sidx) => (
                            <Link
                              key={sidx}
                              href={sub.href}
                              prefetch={false}
                              onClick={() => setHoveredNav(null)}
                              className="min-h-11 flex items-center px-3.5 py-2 text-xs lg:text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium rounded-lg"
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
