"use client";

import { useState, useLayoutEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Grid3X3,
  ShoppingCart,
  Search,
  User,
  X,
  ChevronRight,
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
  const { cartCount } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef(true);

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
            className={`flex flex-col items-center justify-center gap-0.5 transition ${
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
            className={`flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
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
            className={`flex flex-col items-center justify-center gap-0.5 transition ${
              pathname === "/search" ? "text-brand-primary" : "text-text-secondary"
            }`}
          >
            <Search className="w-5 h-5" strokeWidth={pathname === "/search" ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-tight">Tìm kiếm</span>
          </Link>

          {/* 4. Giỏ hàng */}
          <Link
            href="/cart"
            className={`flex flex-col items-center justify-center gap-0.5 relative transition ${
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
            className={`flex flex-col items-center justify-center gap-0.5 transition ${
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

            {/* Content List */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-2">
              {/* Direct link to All Categories */}
              <Link
                href="/phan-loai"
                onClick={() => closeDrawer(false)}
                className="min-h-11 flex items-center justify-between p-3 rounded-control bg-brand-primary-subtle text-brand-primary font-bold text-body-sm mb-3 border border-brand-primary/20"
              >
                <span>Xem tất cả danh mục</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Category Items */}
              {navigation?.menus.main && navigation.menus.main.length > 0 ? (
                navigation.menus.main.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border-default overflow-hidden">
                    <Link href={item.href} onClick={() => closeDrawer(false)}
                      className="min-h-11 flex items-center justify-between px-3 py-3 text-sm font-semibold text-text-primary hover:text-brand-primary hover:bg-brand-primary-subtle">
                      {item.label}<ChevronRight className="w-4 h-4" />
                    </Link>
                    {item.children.length > 0 && <div className="border-t border-border-default bg-surface-subtle px-3 py-1">
                      {item.children.map((child) => (
                        <Link key={child.id} href={child.href} onClick={() => closeDrawer(false)}
                          className="min-h-10 flex items-center pl-3 py-2 text-sm text-text-secondary hover:text-brand-primary">{child.label}</Link>
                      ))}
                    </div>}
                  </div>
                ))
              ) : (
                categories.map((cat) => {
                  const IconComponent = categoryIconMap[cat.slug] || Laptop;
                  const isSelected = pathname === (cat.href || `/${cat.slug}`);

                  return (
                    <Link
                      key={cat.id}
                      href={cat.href || `/${cat.slug}`}
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
