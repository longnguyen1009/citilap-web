"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import type { CategorySummary } from "@/server/services/catalog.service";
import type { ResolvedNavigation } from "@/contracts/cms/navigation";

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

  // Close drawer on route change
  if (prevPath !== pathname) {
    setPrevPath(pathname);
    setDrawerOpen(false);
  }

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  const isCategoryActive = pathname.startsWith("/category");
  const isProductPage = pathname.startsWith("/product/");

  // On product detail page, allow the dedicated purchase action bar to own the bottom space
  if (isProductPage) {
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
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
              isCategoryActive || drawerOpen ? "text-brand-primary" : "text-text-secondary"
            }`}
            aria-label="Mở danh mục sản phẩm"
            aria-expanded={drawerOpen}
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

          {/* 5. Tài khoản */}
          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center gap-0.5 transition ${
              pathname === "/profile" ? "text-brand-primary" : "text-text-secondary"
            }`}
          >
            <User className="w-5 h-5" strokeWidth={pathname === "/profile" ? 2.5 : 2} />
            <span className="text-[10px] font-medium leading-tight">Tài khoản</span>
          </Link>
        </div>
      </nav>

      {/* Mobile Category Drawer */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Danh mục sản phẩm"
          className="fixed inset-0 z-50 flex md:hidden"
        >
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer Slide-in Panel */}
          <div className="relative mr-auto w-full max-w-xs h-full bg-surface-card shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-250">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-default bg-surface">
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-brand-primary" />
                <h2 className="text-title font-bold text-text-primary">Danh mục sản phẩm</h2>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-control text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition cursor-pointer"
                aria-label="Đóng danh mục"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Direct link to All Categories */}
              <Link
                href="/category"
                onClick={() => setDrawerOpen(false)}
                className="flex items-center justify-between p-3 rounded-control bg-brand-primary-subtle text-brand-primary font-bold text-body-sm mb-3 border border-brand-primary/20"
              >
                <span>Xem tất cả danh mục</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Category Items */}
              {navigation?.menus.main.map((item) => (
                <div key={item.id} className="rounded-lg border border-border-default overflow-hidden">
                  <Link href={item.href} onClick={() => setDrawerOpen(false)}
                    className="flex items-center justify-between px-3 py-3 text-sm font-semibold text-text-primary hover:text-brand-primary hover:bg-brand-primary-subtle">
                    {item.label}<ChevronRight className="w-4 h-4" />
                  </Link>
                  {item.children.length > 0 && <div className="border-t border-border-default bg-surface-subtle px-3 py-1">
                    {item.children.map((child) => (
                      <Link key={child.id} href={child.href} onClick={() => setDrawerOpen(false)}
                        className="block pl-3 py-2 text-sm text-text-secondary hover:text-brand-primary">{child.label}</Link>
                    ))}
                  </div>}
                </div>
              ))}
              {!navigation && categories.map((cat) => {
                const IconComponent = categoryIconMap[cat.slug] || Laptop;
                const isSelected = pathname === `/category/${cat.slug}`;

                return (
                  <Link
                    key={cat.id}
                    href={`/category/${cat.slug}`}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center justify-between p-3 rounded-control transition border ${
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
              })}

              {/* Phụ kiện & Đồ chơi công nghệ nổi bật */}
              {!navigation && <div className="pt-3 border-t border-border-default/60">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider px-1 block mb-2">
                  Phụ kiện & Đồ chơi công nghệ
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/category/linh-kien?type=mouse-keyboard"
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-1.5"
                  >
                    <span>⌨️ Chuột & Phím</span>
                  </Link>
                  <Link
                    href="/category/linh-kien?type=bag"
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-1.5"
                  >
                    <span>🎒 Balo & Túi sốc</span>
                  </Link>
                  <Link
                    href="/category/linh-kien?type=charger"
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-1.5"
                  >
                    <span>⚡ Sạc GaN & Cáp</span>
                  </Link>
                  <Link
                    href="/category/linh-kien?type=hub"
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-1.5"
                  >
                    <span>🔌 Hub Type-C</span>
                  </Link>
                  <Link
                    href="/category/linh-kien?type=screenbar"
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-1.5"
                  >
                    <span>💡 Đèn màn hình</span>
                  </Link>
                  <Link
                    href="/category/linh-kien?type=audio"
                    onClick={() => setDrawerOpen(false)}
                    className="p-2 rounded-lg bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-brand-primary-subtle hover:text-brand-primary transition flex items-center gap-1.5"
                  >
                    <span>🎧 Tai nghe & Loa</span>
                  </Link>
                </div>
              </div>}
            </div>

            {/* Bottom Support Call */}
            <div className="p-4 border-t border-border-default bg-surface-subtle">
              <div className="text-caption text-text-muted text-center">
                Hotline tư vấn: <span className="font-bold text-brand-primary">{settings?.storePhone || "0987.654.321"}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
