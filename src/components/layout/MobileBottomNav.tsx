"use client";

import { useState, useLayoutEffect, useRef, useCallback, useMemo, useId } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Grid3X3,
  ShoppingCart,
  Search,
  User,
  X,
  ChevronRight,
  ChevronDown,
  Gamepad2,
  Briefcase,
  Palette,
  Laptop,
  RefreshCw,
  Cpu,
  ArrowRight,
  Keyboard,
  Zap,
  Cable,
  SunMedium,
  Headphones,
  Phone,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { CategorySummary } from "@/server/services/catalog.service";
import type { ResolvedNavigation } from "@/contracts/cms/navigation";
import { businessProfile } from "@/config/business-profile";

const categoryIconMap: Record<string, React.ElementType> = {
  "laptop-gaming": Gamepad2,
  "laptop-van-phong": Briefcase,
  "laptop-do-hoa": Palette,
  "macbook": Laptop,
  "laptop-cu": RefreshCw,
  "linh-kien": Cpu,
};

import type { PublicStorefrontSettings } from "@/contracts/cms/settings";

interface MobileBottomNavProps {
  categories?: CategorySummary[];
  navigation?: ResolvedNavigation | null;
  settings?: PublicStorefrontSettings | null;
}

export default function MobileBottomNav({ categories = [], navigation, settings }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchInputId = useId();
  const { cartCount } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState("");
  const [openTopId, setOpenTopId] = useState<string | null>("nav-cat-gaming");
  const [openBrandId, setOpenBrandId] = useState<string | null>(null);
  const [prevPath, setPrevPath] = useState(pathname);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(true);

  const normalizeText = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase();

  const navCategories = useMemo(() => navigation?.categories ?? [], [navigation]);
  const childrenOf = useCallback(
    (parentHref: string) => {
      const cat = navCategories.find((c) => c.href === parentHref);
      return cat ? navCategories.filter((c) => c.parentId === cat.id) : [];
    },
    [navCategories]
  );
  const drawerHits = useMemo(() => {
    const q = normalizeText(drawerQuery.trim());
    if (!q) return [];
    const byId = new Map(navCategories.map((c) => [c.id, c]));
    return navCategories
      .map((c) => {
        const trail: string[] = [];
        let cur = c.parentId ? byId.get(c.parentId) : undefined;
        while (cur) {
          trail.unshift(cur.name);
          cur = cur.parentId ? byId.get(cur.parentId) : undefined;
        }
        return { cat: c, trail };
      })
      .filter((item) => normalizeText([...item.trail, item.cat.name].join(" ")).includes(q))
      .slice(0, 30);
  }, [drawerQuery, navCategories]);

  const closeDrawer = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus;
    const dialog = dialogRef.current;
    if (dialog?.open) {
      dialog.close();
    }
    setDrawerOpen(false);
  }, []);

  // Close drawer on route change
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setDrawerOpen(false);
  }

  // Open native modal dialog, lock body scroll, manage focus, and close across md breakpoint
  useLayoutEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const trigger = triggerButtonRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    closeButtonRef.current?.focus();

    const mq = window.matchMedia("(min-width: 768px)");
    const handleViewportChange = () => {
      if (mq.matches || window.innerWidth >= 768) {
        closeDrawer(false);
      }
    };
    mq.addEventListener("change", handleViewportChange);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      mq.removeEventListener("change", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
      if (dialog?.open) {
        dialog.close();
      }
      document.body.style.overflow = previousOverflow;
      if (
        restoreFocusRef.current &&
        trigger &&
        window.getComputedStyle(trigger).display !== "none"
      ) {
        trigger.focus();
      }
    };
  }, [drawerOpen, closeDrawer]);

  const isCategoryActive = pathname.startsWith("/phan-loai") || !!navigation?.categories.some(c => c.href === pathname);
  const isProductPage = /^\/(?:laptop|phu-kien|san-pham)\/[^/]+$/.test(pathname);
  const isCheckoutPage = pathname.startsWith("/checkout");

  // On product detail and checkout pages, allow dedicated action bars to own the bottom space
  if (isProductPage || isCheckoutPage) {
    return null;
  }

  return (
    <>
      {/* Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Điều hướng di động"
        className="fixed bottom-0 left-0 right-0 z-40 bg-surface-card border-t border-border-default md:hidden safe-area-bottom shadow-lg"
      >
        <div className="grid grid-cols-5 h-14">
          {/* 1. Trang chủ */}
          <Link
            href="/"
            prefetch={false}
            aria-current={pathname === "/" ? "page" : undefined}
            className={`min-h-11 min-w-11 flex flex-col items-center justify-center gap-0.5 transition ${
              pathname === "/" ? "text-brand-primary" : "text-text-secondary"
            }`}
          >
            <Home className="w-5 h-5" strokeWidth={pathname === "/" ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-tight">Trang chủ</span>
          </Link>

          {/* 2. Danh mục Button (Mở drawer) */}
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={() => {
              restoreFocusRef.current = true;
              setDrawerOpen(true);
            }}
            className={`min-h-11 min-w-11 flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
              isCategoryActive || drawerOpen ? "text-brand-primary" : "text-text-secondary"
            }`}
            aria-label="Mở danh mục sản phẩm"
            aria-expanded={drawerOpen}
            aria-haspopup="dialog"
          >
            <Grid3X3
              className="w-5 h-5"
              strokeWidth={isCategoryActive || drawerOpen ? 2.5 : 2}
            />
            <span className="text-[10px] font-medium leading-tight">Danh mục</span>
          </button>

          {/* 3. Tìm kiếm */}
          <Link
            href="/search"
            prefetch={false}
            aria-current={pathname === "/search" ? "page" : undefined}
            className={`min-h-11 min-w-11 flex flex-col items-center justify-center gap-0.5 transition ${
              pathname === "/search" ? "text-brand-primary" : "text-text-secondary"
            }`}
          >
            <Search className="w-5 h-5" strokeWidth={pathname === "/search" ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-tight">Tìm kiếm</span>
          </Link>

          {/* 4. Giỏ hàng */}
          <Link
            href="/cart"
            prefetch={false}
            aria-current={pathname === "/cart" ? "page" : undefined}
            className={`min-h-11 min-w-11 flex flex-col items-center justify-center gap-0.5 relative transition ${
              pathname === "/cart" ? "text-brand-primary" : "text-text-secondary"
            }`}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5" strokeWidth={pathname === "/cart" ? 2.5 : 2} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-price-current text-text-inverse text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium leading-tight">Giỏ hàng</span>
          </Link>

          {/* 5. Tra cứu & Hỗ trợ */}
          <Link
            href="/profile"
            prefetch={false}
            aria-current={pathname === "/profile" ? "page" : undefined}
            className={`min-h-11 min-w-11 flex flex-col items-center justify-center gap-0.5 transition ${
              pathname === "/profile" || pathname.startsWith("/order-tracking") ? "text-brand-primary" : "text-text-secondary"
            }`}
          >
            <User className="w-5 h-5" strokeWidth={pathname === "/profile" || pathname.startsWith("/order-tracking") ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-tight">Hỗ trợ</span>
          </Link>
        </div>
      </nav>

      {/* Mobile Category Drawer */}
      {drawerOpen && (
        <dialog
          ref={dialogRef}
          aria-modal="true"
          aria-label="Danh mục sản phẩm"
          onCancel={(e) => {
            e.preventDefault();
            closeDrawer(true);
          }}
          onClose={() => {
            if (drawerOpen) {
              closeDrawer(restoreFocusRef.current);
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeDrawer(true);
            }
          }}
          className="fixed inset-0 z-50 m-0 flex h-dvh max-h-none w-screen max-w-none bg-transparent p-0 overscroll-contain backdrop:bg-black/60 backdrop:backdrop-blur-xs md:hidden"
        >
          {/* Backdrop click target inside dialog */}
          <div
            onClick={() => closeDrawer(true)}
            aria-hidden="true"
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer Slide-in Panel */}
          <div className="relative mr-auto w-full max-w-xs h-full bg-surface-card shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250 motion-reduce:animate-none">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-brand-primary shrink-0" />
                <h2 className="text-title font-bold text-text-primary">Danh mục sản phẩm</h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => closeDrawer(true)}
                className="w-11 h-11 flex items-center justify-center rounded-control text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition cursor-pointer focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-hidden"
                aria-label="Đóng danh mục"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search bar inside drawer */}
            <div className="px-4 py-2.5 border-b border-border-default bg-surface-subtle/60">
              <label htmlFor={searchInputId} className="sr-only">Tìm nhanh danh mục hoặc dòng máy</label>
              <div className="relative flex items-center">
                <Search className="pointer-events-none absolute left-3 w-4 h-4 text-text-muted" aria-hidden="true" />
                <input
                  id={searchInputId}
                  type="text"
                  inputMode="search"
                  value={drawerQuery}
                  onChange={(e) => setDrawerQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                    if (e.key === "Enter" && drawerHits.length > 0) {
                      e.preventDefault();
                      closeDrawer(false);
                      router.push(drawerHits[0].cat.href);
                    }
                  }}
                  placeholder="Tìm nhanh: Legion, TUF, ThinkPad, ZBook..."
                  className="h-10 w-full rounded-xl border border-border-default bg-white pl-9 pr-9 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                />
                {drawerQuery && (
                  <button
                    type="button"
                    onClick={() => setDrawerQuery("")}
                    aria-label="Xóa từ khóa tìm danh mục"
                    className="absolute right-1.5 flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-subtle hover:text-text-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2.5">
              {drawerQuery.trim() ? (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-text-muted" aria-live="polite">
                    {drawerHits.length === 0
                      ? `Không có phân loại khớp “${drawerQuery}”.`
                      : `Tìm thấy ${drawerHits.length} phân loại`}
                  </p>
                  {drawerHits.map(({ cat, trail }) => (
                    <Link
                      key={cat.id}
                      href={cat.href}
                      prefetch={false}
                      onClick={() => closeDrawer(false)}
                      className="flex min-h-12 flex-col justify-center rounded-xl border border-border-default bg-white px-3 py-2 hover:border-brand-primary hover:bg-brand-primary-subtle"
                    >
                      <span className="text-sm font-bold text-text-primary">{cat.name}</span>
                      {trail.length > 0 && (
                        <span className="truncate text-[11px] text-text-muted">{trail.join(" › ")}</span>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <>
                  {/* Direct link to All Categories */}
                  <Link
                    href="/phan-loai"
                    aria-current={pathname === "/phan-loai" ? "page" : undefined}
                    onClick={() => closeDrawer(false)}
                    className="min-h-11 flex items-center justify-between p-3 rounded-control bg-brand-primary-subtle text-brand-primary font-bold text-body-sm border border-brand-primary/20"
                  >
                    <span>Xem tất cả danh mục</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  {/* Product group, then brand and series links. */}
                  {navigation?.menus.main && navigation.menus.main.length > 0 ? (
                    navigation.menus.main.map((item) => {
                      const hasChildren = item.children.length > 0;
                      const isTopExpanded = openTopId === item.id;
                      return (
                        <div key={item.id} className="rounded-xl border border-border-default bg-white overflow-hidden">
                          <div className="flex items-center">
                            <Link
                              href={item.href}
                              prefetch={false}
                              aria-current={pathname === item.href ? "page" : undefined}
                              onClick={() => closeDrawer(false)}
                              className={`min-h-11 flex-1 flex items-center px-3 py-2.5 text-sm font-bold ${
                                pathname === item.href ? "text-brand-primary" : "text-text-primary hover:text-brand-primary"
                              }`}
                            >
                              {item.label}
                            </Link>
                            {hasChildren && (
                              <button
                                type="button"
                                aria-expanded={isTopExpanded}
                                aria-label={`${isTopExpanded ? "Thu gọn" : "Mở rộng"} ${item.label}`}
                                onClick={() => setOpenTopId(isTopExpanded ? null : item.id)}
                                className="flex h-11 w-11 items-center justify-center border-l border-border-default text-text-secondary hover:bg-surface-subtle"
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform ${isTopExpanded ? "rotate-180" : ""}`} />
                              </button>
                            )}
                          </div>
                          {hasChildren && isTopExpanded && (
                            <div className="border-t border-border-default bg-surface-subtle/70 p-2 space-y-1">
                              {item.children.map((brand) => {
                                const seriesList = childrenOf(brand.href);
                                const isBrandExpanded = openBrandId === brand.id;
                                return (
                                  <div key={brand.id} className="rounded-lg bg-white border border-border-default/70 overflow-hidden">
                                    <div className="flex items-center">
                                      <Link
                                        href={brand.href}
                                        prefetch={false}
                                        onClick={() => closeDrawer(false)}
                                        className="min-h-10 flex-1 flex items-center px-2.5 py-1.5 text-xs font-bold text-text-primary hover:text-brand-primary"
                                      >
                                        {brand.label}
                                      </Link>
                                      {seriesList.length > 0 && (
                                        <button
                                          type="button"
                                          aria-expanded={isBrandExpanded}
                                          aria-label={`${isBrandExpanded ? "Thu gọn" : "Xem dòng máy"} ${brand.label}`}
                                          onClick={() => setOpenBrandId(isBrandExpanded ? null : brand.id)}
                                          className="flex h-10 w-10 items-center justify-center border-l border-border-default/70 text-text-muted"
                                        >
                                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isBrandExpanded ? "rotate-180" : ""}`} />
                                        </button>
                                      )}
                                    </div>
                                    {seriesList.length > 0 && isBrandExpanded && (
                                      <div className="border-t border-border-default/70 bg-surface-subtle px-2.5 py-2 space-y-1.5">
                                        {seriesList.map((series) => {
                                          const brandName = brand.label.trim().split(/\s+/)[0];
                                          return (
                                            <div key={series.id}>
                                              <Link
                                                href={series.href}
                                                prefetch={false}
                                                onClick={() => closeDrawer(false)}
                                                className="flex min-h-11 items-center text-sm font-semibold text-text-primary hover:text-brand-primary"
                                              >
                                                {series.name.toLowerCase().startsWith(`${brandName.toLowerCase()} `) ? series.name.slice(brandName.length).trim() : series.name}
                                              </Link>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                categories.map((cat) => {
                  const IconComponent = categoryIconMap[cat.slug] || Laptop;
                  const isSelected = pathname === (cat.href || `/${cat.slug}`);

                  return (
                    <Link
                      key={cat.id}
                      href={cat.href || `/${cat.slug}`}
                      aria-current={isSelected ? "page" : undefined}
                      onClick={() => closeDrawer(false)}
                      className={`min-h-11 flex items-center justify-between p-3 rounded-control transition border ${
                        isSelected
                          ? "bg-brand-primary text-text-inverse border-brand-primary font-bold"
                          : "bg-surface-card hover:bg-surface-subtle text-text-primary border-border-default hover:border-brand-primary"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-control flex items-center justify-center ${
                            isSelected ? "bg-white/20 text-white" : "bg-brand-primary-subtle text-brand-primary"
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-body-sm font-semibold">{cat.name}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-caption ${
                            isSelected ? "text-text-inverse/80" : "text-text-muted"
                          }`}
                        >
                          {cat.productCount}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 ${
                            isSelected ? "text-text-inverse" : "text-text-muted"
                          }`}
                        />
                      </div>
                    </Link>
                  );
                })
              )}
                </>
              )}

              {/* Phụ kiện & Đồ chơi công nghệ nổi bật */}
              {(!navigation || !navigation.menus.main || navigation.menus.main.length === 0) && <div className="pt-3 border-t border-border-default/60">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1 block mb-2">
                  Phụ kiện & Đồ chơi công nghệ
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/phu-kien?type=mouse-keyboard"
                    onClick={() => closeDrawer(false)}
                    className="min-h-11 p-2.5 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-2"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>Chuột & Phím</span>
                  </Link>
                  <Link
                    href="/phu-kien?type=bag"
                    onClick={() => closeDrawer(false)}
                    className="min-h-11 p-2.5 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-2"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>Balo & Túi chống sốc</span>
                  </Link>
                  <Link
                    href="/phu-kien?type=charger"
                    onClick={() => closeDrawer(false)}
                    className="min-h-11 p-2.5 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>Sạc GaN & Cáp</span>
                  </Link>
                  <Link
                    href="/phu-kien?type=hub"
                    onClick={() => closeDrawer(false)}
                    className="min-h-11 p-2.5 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-2"
                  >
                    <Cable className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>Hub Type-C</span>
                  </Link>
                  <Link
                    href="/phu-kien?type=screenbar"
                    onClick={() => closeDrawer(false)}
                    className="min-h-11 p-2.5 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-2"
                  >
                    <SunMedium className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>Đèn màn hình</span>
                  </Link>
                  <Link
                    href="/phu-kien?type=audio"
                    onClick={() => closeDrawer(false)}
                    className="min-h-11 p-2.5 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-2"
                  >
                    <Headphones className="w-3.5 h-3.5 text-brand-primary shrink-0" />
                    <span>Tai nghe & Loa</span>
                  </Link>
                </div>
              </div>}
            </div>

            {/* Bottom Support Call */}
            <div className="p-3 border-t border-border-default bg-surface-subtle">
              <a
                href={`tel:${(settings?.storePhone || businessProfile.displayPhone).replace(/\s+/g, "")}`}
                className="min-h-11 flex items-center justify-center gap-1.5 text-caption text-text-muted hover:text-brand-primary transition"
              >
                <Phone className="w-3.5 h-3.5 text-brand-primary" />
                <span>Hotline tư vấn:</span>
                <span className="font-bold text-brand-primary">{settings?.storePhone || businessProfile.displayPhone}</span>
              </a>
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
