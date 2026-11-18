"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PhoneCall, ClipboardCheck, Monitor, ChevronDown, Heart, ArrowRight } from "lucide-react";
import CartIcon from "./CartIcon";
import MegaMenuPanel from "./MegaMenuPanel";
import { MenuNodeIcon } from "./menuIcons";
import { useWishlist } from "@/context/WishlistContext";
import SearchAutocomplete from "@/components/search/SearchAutocomplete";
import type { CategorySummary, BrandSummary } from "@/server/services/catalog.service";
import { businessProfile } from "@/config/business-profile";
import type { ResolvedNavigation } from "@/contracts/cms/navigation";
import type { PublicStorefrontSettings } from "@/contracts/cms/settings";

export interface HeaderMenuNode {
  name: string;
  href: string;
  image?: string | null;
  children?: HeaderMenuNode[];
}

export interface HeaderCategoryItem {
  id?: string;
  name: string;
  slug?: string;
  href: string;
  image?: string | null;
  productCount?: number;
  children?: HeaderMenuNode[];
}

export interface HeaderNavItem {
  name: string;
  href: string;
  hot?: boolean;
  children?: HeaderMenuNode[];
}

function buildCategoryMenuTree(
  nav: ResolvedNavigation,
  rawChildren: { label: string; href: string; children?: { label: string; href: string }[] }[],
  parentCategoryId?: string,
): HeaderMenuNode[] {
  const resolveImage = (href: string) =>
    nav.collections.find((c) => c.href === href)?.image ||
    nav.categories.find((c) => c.href === href)?.image ||
    null;

  const mapNode = (
    href: string,
    label: string,
    depth: number,
    explicitChildren?: { label: string; href: string }[],
  ): HeaderMenuNode => {
    const matchedCat = nav.categories.find((c) => c.href === href);
    let subNodes: HeaderMenuNode[] = [];
    if (depth < 2) {
      if (explicitChildren?.length) {
        subNodes = explicitChildren.map((ec) => mapNode(ec.href, ec.label, depth + 1));
      } else if (matchedCat) {
        const directChildren = nav.categories.filter((c) => c.parentId === matchedCat.id);
        subNodes = directChildren.map((dc) => mapNode(dc.href, dc.name, depth + 1));
      }
    }
    return {
      name: label,
      href,
      image: resolveImage(href),
      children: subNodes.length > 0 ? subNodes : undefined,
    };
  };

  if (rawChildren.length > 0) {
    return rawChildren.map((c) => mapNode(c.href, c.label, 1, c.children));
  }
  if (parentCategoryId) {
    return nav.categories
      .filter((c) => c.parentId === parentCategoryId)
      .map((c) => mapNode(c.href, c.name, 1));
  }
  return [];
}

export interface HeaderProps {
  categories?: CategorySummary[];
  brands?: BrandSummary[];
  navigation?: ResolvedNavigation | null;
  settings?: PublicStorefrontSettings | null;
}

export default function Header({ categories = [], brands = [], navigation, settings }: HeaderProps) {
  const [openNav, setOpenNav] = useState<number | null>(null);
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);
  const headerRef = useRef<HTMLElement>(null);
  const navListRef = useRef<HTMLUListElement>(null);
  const { wishlistCount } = useWishlist();

  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setOpenNav(null);
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
    if (openNav === null) return;
    const closeOutside = (event: PointerEvent) => {
      if (!navListRef.current?.contains(event.target as Node)) setOpenNav(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [openNav]);

  // Keyboard accessibility: Escape closes menus and restores focus if focus was inside closed content
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const activeEl = document.activeElement as HTMLElement | null;

      if (openNav !== null) {
        const openNavLi = navListRef.current?.querySelector<HTMLElement>(
          `[data-nav-index="${openNav}"]`
        );
        const opener = openNavLi?.querySelector<HTMLElement>("[data-nav-opener]");
        const focusInsideNav = !!activeEl && !!openNavLi?.contains(activeEl);
        if (focusInsideNav && opener) {
          opener.focus();
        }
        setOpenNav(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openNav]);

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
    ? navigation.menus.main.map((item) => {
        const cat = navigation.categories.find((c) => c.href === item.href);
        const tree = buildCategoryMenuTree(navigation, item.children, cat?.id);
        return {
          name: item.label,
          href: item.href,
          hot: item.href === '/hot-sale',
          children: tree.length > 0 ? tree : undefined,
        };
      })
    : legacyNavItems;

  return (
    <>
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
                  className="h-auto w-[156px] min-[375px]:w-[178px] md:w-[132px] lg:w-[172px] xl:w-[210px] object-contain"
                />
              ) : (
                <>
                  <Monitor className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-lg sm:text-xl font-black leading-none tracking-wider text-white">
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
            <div className="flex flex-1 min-w-0 items-center justify-end gap-2 md:gap-2.5 lg:gap-3">
              <div className="relative flex-1 min-w-0 lg:max-w-[460px] xl:max-w-[540px]">
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
              className="flex flex-wrap items-center justify-center lg:justify-between gap-x-4 lg:gap-x-2 xl:gap-x-4 gap-y-0"
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
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                        setOpenNav(null);
                      }
                    }}
                  >
                    {item.children ? (
                      <button
                        type="button"
                        data-nav-opener="true"
                        aria-expanded={openNav === index}
                        aria-controls={`header-submenu-${index}`}
                        onClick={() => setOpenNav(openNav === index ? null : index)}
                        className={`min-h-11 flex cursor-pointer items-center gap-1 px-1 py-2.5 text-[13px] xl:text-sm font-bold uppercase whitespace-nowrap transition hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 ${isActive || openNav === index ? "text-blue-600" : "text-gray-800"}`}
                      >
                        {item.name}
                        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${openNav === index ? "rotate-180" : ""}`} />
                      </button>
                    ) : (
                      <Link href={item.href} prefetch={false} aria-current={isActive ? "page" : undefined}
                        onClick={() => setOpenNav(null)}
                        className={`min-h-11 flex items-center gap-1 px-1 py-2.5 text-[13px] xl:text-sm font-bold uppercase whitespace-nowrap hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 ${isActive ? "text-blue-600" : item.hot ? "text-red-600" : "text-gray-800"}`}>
                        {item.hot && <MenuNodeIcon name={item.name} className="h-4 w-4 shrink-0 animate-pulse motion-reduce:animate-none" />}
                        {item.name}
                      </Link>
                    )}

                    {/* Pointer: connects the parent item to its dropdown */}
                    {item.children && openNav === index && (
                      <>
                        <span aria-hidden="true" className="pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-blue-600 animate-in fade-in duration-200" />
                        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-full z-[60] mt-[3px] h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-tl-[3px] border-l border-t border-blue-100 bg-white animate-in fade-in slide-in-from-top-2 duration-200 max-lg:hidden" />
                      </>
                    )}

                    {/* Dropdown */}
                    {item.children && openNav === index && (() => {
                      const hasNestedMenu = item.children.some((sub) => sub.children && sub.children.length > 0);
                      return (
                        <div
                          id={`header-submenu-${index}`}
                          className={
                            hasNestedMenu
                              ? `max-lg:fixed max-lg:inset-x-6 max-lg:top-[var(--storefront-header-height,6.5rem)] lg:absolute lg:top-full ${
                                  index >= dynamicNavItems.length / 2 ? "lg:right-0" : "lg:left-0"
                                } z-50 pt-2 lg:w-[680px] origin-top animate-in fade-in zoom-in-95 slide-in-from-top-3 duration-200 ease-out`
                              : `max-lg:fixed max-lg:inset-x-6 max-lg:top-[var(--storefront-header-height,6.5rem)] max-lg:pt-1 lg:absolute lg:top-full ${
                                  index >= dynamicNavItems.length / 2 ? "lg:right-0" : "lg:left-0"
                                } lg:pt-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150`
                          }
                        >
                          {hasNestedMenu ? (
                            <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl shadow-blue-900/20 ring-1 ring-black/5 flex">
                              <MegaMenuPanel key={item.href} title={item.name} href={item.href} nodes={item.children} onNavigate={() => setOpenNav(null)} className="flex-1" />
                            </div>
                          ) : (
                            <div
                              className={`bg-white rounded-xl shadow-xl shadow-gray-200/70 border border-gray-200 py-2 max-h-[calc(100dvh-var(--storefront-header-height,6.5rem)-1.5rem)] overflow-y-auto overscroll-contain max-lg:w-full lg:max-w-[calc(100vw-3rem)] ${
                                item.children.length > 5
                                  ? "grid grid-cols-2 p-2 gap-1 lg:w-max lg:min-w-[360px]"
                                  : "max-lg:grid max-lg:grid-cols-2 max-lg:p-2 max-lg:gap-1 lg:w-max lg:min-w-[210px]"
                              }`}
                            >
                              {[{ name: `Xem tất cả ${item.name}`, href: item.href }, ...item.children].map((sub, sidx) => (
                                <Link
                                  key={sidx}
                                  href={sub.href}
                                  prefetch={false}
                                  onClick={() => setOpenNav(null)}
                                  className={`group min-h-11 flex items-center gap-3 px-3 py-2 text-xs lg:text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors font-medium rounded-lg ${sidx === 0 ? "text-blue-600" : "text-gray-700"}`}
                                >
                                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                                    {sidx === 0 ? <ArrowRight className="h-4 w-4" /> : <MenuNodeIcon name={sub.name} className="h-4 w-4" />}
                                  </span>
                                  {sub.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </header>
      {openNav !== null && dynamicNavItems[openNav]?.children && (
        <div
          aria-hidden="true"
          onClick={() => setOpenNav(null)}
          className="fixed inset-x-0 bottom-0 top-[var(--storefront-header-height,6.5rem)] z-40 hidden bg-slate-900/45 backdrop-blur-[3px] animate-in fade-in duration-200 md:block"
        />
      )}
    </>
  );
}
